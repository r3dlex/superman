#!/usr/bin/env node
// Tight loop for the superman Gate 1 preparation circle.
//
// RED   = the most recent attempts produced no measured checker evidence.
// GREEN = the most recent attempt produced measured checker evidence.
//
// The signal is the receipt-level fact in .superman/ci/bootstrap-evidence.md: did a
// checker actually report a diagnostic? A "measured" attempt carries TS#### codes;
// a "stopped" attempt carries zero. Version calls, approvals, identity comparisons
// and pre-use reviews are preparation, not measurement.
//
// Usage: node .scratch/superman-v0/gate1-loop-check.mjs [--prep P] [--evidence P] [--json]
// Exit:  0 green, 1 red, 2 usage error.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PREP = resolve(HERE, "gate1-preparation.md");
const DEFAULT_EVIDENCE = resolve(HERE, "../../.superman/ci/bootstrap-evidence.md");

const args = process.argv.slice(2);
let prepPath = DEFAULT_PREP;
let evidencePath = DEFAULT_EVIDENCE;
let asJson = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--prep") {
    prepPath = resolve(args[++i]);
  } else if (args[i] === "--evidence") {
    evidencePath = resolve(args[++i]);
  } else if (args[i] === "--json") {
    asJson = true;
  } else {
    console.error(`unknown argument: ${args[i]}`);
    process.exit(2);
  }
}

// A checker-side obligation is a named unit of unfinished Gate 1 work. The vocabulary
// is fixed and the patterns are deliberately tolerant, so that a reworded sentence
// still matches the same obligation.
const CHECKER_OBLIGATIONS = [
  ["D1-transformation", /100[-\s](?:rewritten[-\s])?edge|39[-\s]target/i],
  ["binding-preservation", /type\/value binding|per[-\s]use binding|per[-\s]use bindings/i],
  ["published-global", /published[-\s]global|global precision|global\/export/i],
  ["computed-export", /computed[-\s](?:export|Node\/Undici)|\bexport\b/i],
  ["fallback-precision", /fallback|non[-\s]Deno precision/i],
  ["API-CLI-correspondence", /API[-\s]to[-\s]CLI|API correspondence/i],
  ["native-content-provenance", /resolved[-\s]content|native content/i],
  ["injected-input", /injected[-\s]input/i],
  ["embedded-body", /embedded[-\s]body|body (?:reconciliation|coverage)/i],
  ["other-platform", /other[-\s]platform|Linux x64\/arm64/i],
];

// A recovery-side obligation is work the attempt itself created: the next packet it
// says is required, and the harness work that packet implies.
const RECOVERY_OBLIGATIONS = [
  ["recorder-contract", /recorder|host lifecycle/i],
  ["version-output-contract", /version[-\s]output/i],
  ["capsule", /capsule/i],
  ["pre-use-review", /pre[-\s]use/i],
  ["host-lifecycle-evidence", /lifecycle|custody|orphan|TERM grace/i],
];

function read(path) {
  return readFileSync(path, "utf8");
}

// A record is found by heading text and runs until the next heading of the same or a
// higher level. Level-agnostic on purpose: the preparation record's history headings
// are demoted, so a fixed heading level would silently stop matching.
function blockFor(text, headingNeedle) {
  const lines = text.split("\n");
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(#{1,6}) (.+)$/.exec(lines[i]);
    if (m?.[2].includes(headingNeedle)) {
      start = i;
      level = m[1].length;
      break;
    }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const m = /^(#{1,6}) /.exec(lines[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return { heading: lines[start].replace(/^#{1,6} /, "").trim(), body: lines.slice(start + 1, end).join("\n") };
}

function sentences(body) {
  return body
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+(?=[A-Z*`[])/)
    .map((s) => s.trim());
}

function sentencesMatching(body, patterns) {
  return sentences(body).filter((s) => patterns.some((p) => p.test(s)));
}

function statusLine(body) {
  const line = body.split("\n").find((l) => l.trim().startsWith("**"));
  return line ? line.replace(/^\*\*|\*\*$/g, "").trim() : "";
}

function largestByteCount(body) {
  const matches = [...body.matchAll(/(\d{1,3}(?:,\d{3})*)[-\s]bytes?\b/g)].map((m) => Number(m[1].replace(/,/g, "")));
  return matches.length ? Math.max(...matches) : null;
}

function matchVocabulary(text, vocabulary) {
  return vocabulary.filter(([, re]) => re.test(text)).map(([name]) => name);
}

function parseAttempt(heading, body) {
  const id = heading.match(/S3-B2-(A[0-9]+(?:-R)?)/);
  if (!id) return null;
  const diagnostics = (body.match(/TS[0-9]{4}/g) ?? []).length;
  const unreached = body.match(
    /(\d+)\s+(?:remaining top-level |ordered top-level )?commands?\s+(?:are|is)\s+(?:recorded|retained) as unreached/i,
  );
  const openText = sentencesMatching(body, [/Still blocked/i, /remain(?:s)? unproved/i, /remain(?:s)? outstanding/i]);
  const nextText = sentencesMatching(body, [/next dependency-ready/i, /next action/i, /is next\b/i]);
  return {
    id: id[1],
    heading,
    diagnostics,
    measured: diagnostics > 0,
    unreachedCommands: unreached ? Number(unreached[1]) : null,
    capsuleBytes: /capsule/i.test(body) ? largestByteCount(body) : null,
    outcome: statusLine(body),
    openText: openText.join(" "),
    nextText: nextText.join(" "),
    openObligations: matchVocabulary(openText.join(" "), CHECKER_OBLIGATIONS),
    recoveryObligations: matchVocabulary(nextText.join(" "), RECOVERY_OBLIGATIONS),
    body,
  };
}

const evidenceText = read(evidencePath);
const prepText = read(prepPath);

// Every heading that names an attempt, in document order.
function attemptHeadings(text) {
  return text
    .split("\n")
    .map((line, index) => {
      const m = /^(#{1,6}) (.+)$/.exec(line);
      return m && /S3-B2-A[0-9]/.test(m[2]) ? { heading: m[2].trim(), index } : null;
    })
    .filter(Boolean);
}

const evidenceAttempts = attemptHeadings(evidenceText).map((h) => {
  const block = blockFor(evidenceText, h.heading);
  return block ? parseAttempt(block.heading, block.body) : null;
});

const attempts = evidenceAttempts.filter(Boolean).map((attempt) => {
  const prep = blockFor(prepText, `S3-B2-${attempt.id}`);
  const prepBody = prep ? prep.body : "";
  const prepOpen = sentencesMatching(prepBody, [
    /Still blocked/i,
    /remain(?:s)? unproved/i,
    /remain(?:s)? outstanding/i,
  ]);
  const prepNext = sentencesMatching(prepBody, [/next dependency-ready/i, /next action/i, /is next\b/i]);
  const openText = [attempt.openText, ...prepOpen].join(" ");
  const nextText = [attempt.nextText, ...prepNext].join(" ");
  return {
    ...attempt,
    openText,
    nextText,
    openObligations: matchVocabulary(openText, CHECKER_OBLIGATIONS),
    recoveryObligations: matchVocabulary(nextText, RECOVERY_OBLIGATIONS),
    capsuleBytes: attempt.capsuleBytes ?? (/capsule/i.test(prepBody) ? largestByteCount(prepBody) : null),
  };
});

const stops = attempts.filter((a) => !a.measured);
const lastMeasured = attempts.filter((a) => a.measured).at(-1);
const sinceLastMeasured = lastMeasured ? attempts.slice(attempts.indexOf(lastMeasured) + 1) : attempts;

// The loop is red when the last CIRCUIT_THRESHOLD attempts produced no measured
// checker evidence. The threshold is the repo's own circuit-breaker rule (>= 3
// attempts without resolution), so the verdict does not depend on any earlier record.
const CIRCUIT_THRESHOLD = 3;
const recent = attempts.slice(-CIRCUIT_THRESHOLD);
const RED = attempts.length >= CIRCUIT_THRESHOLD && recent.every((a) => !a.measured);

// Obligations that every stop still carried: none of them was retired by any stop.
const neverRetired =
  stops.length > 0
    ? stops.map((a) => a.openObligations).reduce((acc, list) => acc.filter((o) => list.includes(o)))
    : [];

// Obligations each stop introduced that no earlier attempt had raised.
const seen = new Set();
const introduced = [];
for (const attempt of stops) {
  const all = [...attempt.openObligations, ...attempt.recoveryObligations];
  introduced.push({ id: attempt.id, introduced: all.filter((o) => !seen.has(o)) });
  for (const o of all) seen.add(o);
}

const report = {
  verdict: RED ? "RED" : "GREEN",
  symptom: RED
    ? `${recent.length} consecutive preparation attempts produced zero measured checker evidence`
    : "the most recent attempt produced measured checker evidence",
  lastMeasuredAttempt: lastMeasured ? lastMeasured.id : null,
  attemptsSinceLastMeasured: sinceLastMeasured.map((a) => a.id),
  neverRetired,
  introduced,
  attempts,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`verdict: ${report.verdict} — ${report.symptom}`);
  console.log(`last measured attempt: ${report.lastMeasuredAttempt ?? "none"}`);
  console.log("");
  console.log("attempt  measured  TS####  unreached-cmds  capsule-bytes  recovery-side obligations  outcome");
  for (const a of attempts) {
    console.log(
      [
        a.id.padEnd(8),
        (a.measured ? "yes" : "NO").padEnd(9),
        String(a.diagnostics).padEnd(7),
        String(a.unreachedCommands ?? "-").padEnd(16),
        String(a.capsuleBytes ?? "-").padEnd(15),
        (a.recoveryObligations.join(",") || "-").padEnd(26),
        a.outcome.slice(0, 52),
      ].join(" "),
    );
  }
  console.log("");
  console.log(`checker-side obligations carried by every stop (none retired): ${neverRetired.join(", ")}`);
  for (const entry of introduced) {
    console.log(`  ${entry.id} introduced: [${entry.introduced.join(", ")}]`);
  }
}

process.exit(RED ? 1 : 0);
