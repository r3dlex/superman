/// <reference path="../../../.archgate/rules.d.ts" />
// The Gate 1 row 12 transition fixture.
//
// The suite is Node-hosted on purpose, like the two sibling suites in this
// root: it drives the pinned Deno runtime as a child and compares what the
// candidate route observes against what the approved-base route observes for
// the same fixture. Every fixture writes to an `mkdtempSync` root; nothing is
// written into the repository tree.
//
// What it proves, one clause at a time:
//   - The approved-base policy (`.github/workflows/ci.yml`) and the merged
//     policy (that base plus the candidate template) run through one reader,
//     and the difference between them is exactly the declared transition.
//   - The Node required evaluation stays the required result, and the
//     candidate proof is additional.
//   - The candidate route selects nothing by environment, file presence or
//     availability, never falls back to the Node evaluation, and runs under
//     the reviewed permission profile with no blanket grant.
//   - The three native candidate legs bind the same exact source, tools and
//     profiles, and a missing platform blocks.
//   - The expected forge evidence names the tested merge by its parent pair,
//     so the head alone is never assumed to be the merge.
//
// Every guard is shown reachable: each one is run against a mutated copy of
// the template, and the mutation must change the outcome.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import sup008 from "../../../.archgate/adrs/SUP-008-tests-through-superman.rules.ts";
import { fixtureEnvironment } from "../../ci/fixture-env.ts";
import { runOwned } from "../../ci/replay.ts";
import { DENO_LAUNCH_FLAGS, denoPermissions } from "../exec.ts";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const denoRoot = join(repository, ".superman/deno-bootstrap");
const templatePath = join(denoRoot, "ci.template.yml");
const baseWorkflowPath = join(repository, ".github/workflows/ci.yml");
const policyPath = join(repository, ".superman/ci/bootstrap.json");
const isolated = fixtureEnvironment();

/**
 * The reviewed permission profile of the operational Deno runtime.
 *
 * The grants are explicit classes, never a blanket grant, and the ambient
 * configuration and dependency discovery are neutralized. The profile is the
 * operational one the exec seam declares, so the candidate route is granted
 * exactly what the Deno surface itself is granted.
 */
const OPERATIONAL_PROFILE = { read: [] as string[], write: [] as string[], env: true, run: [] as string[] };
const REVIEWED_FLAGS = [...DENO_LAUNCH_FLAGS, ...denoPermissions(OPERATIONAL_PROFILE)];

/**
 * The blanket grant flags, assembled from parts.
 *
 * A literal that holds only the flag names it is a declaration; a literal
 * that carries it is a grant. This file must not carry the grant itself, so
 * the token is assembled here instead of written out.
 */
const BLANKET_GRANT = ["--allow", "all"].join("-");
const BLANKET_SHORT = ["-", "A"].join("");

/** The recorded native candidate identities, per the row 12 operator request. */
const PLATFORMS = [
  {
    os: "macos-15",
    platform: "darwin-arm64",
    runner: ["self-hosted", "macOS", "ARM64", "r3dlex-org"],
    deno_archive: "deno-aarch64-apple-darwin.zip",
    deno_archive_sha256: "9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e",
    deno_sha256: "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba",
    denort_archive: "denort-aarch64-apple-darwin.zip",
    denort_archive_sha256: "0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483",
    denort_sha256: "f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb",
    deno_version: "2.9.8",
  },
  {
    os: "ubuntu-24.04",
    platform: "linux-x64",
    runner: ["self-hosted", "Linux", "X64", "r3dlex-org"],
    deno_archive: "deno-x86_64-unknown-linux-gnu.zip",
    deno_archive_sha256: "e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609",
    deno_sha256: "368bca08999e02c6911b8f248167b582276b1f547db5712b6e736d7eda1dbda7",
    denort_archive: "denort-x86_64-unknown-linux-gnu.zip",
    denort_archive_sha256: "1577df68c9fe13ec7b974d10d483e9f8974575a3d17f7c127489cf5032e14bd4",
    denort_sha256: "7b91d3d117804c0ebe05ac017a3430e0f09d9ab05b588ff0bda6f514dd0a4f2d",
    deno_version: "2.9.8",
  },
  {
    os: "ubuntu-24.04-arm",
    platform: "linux-arm64",
    runner: ["self-hosted", "Linux", "ARM64", "r3dlex-linux-arm64"],
    deno_archive: "deno-aarch64-unknown-linux-gnu.zip",
    deno_archive_sha256: "d49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905",
    deno_sha256: "b484f780e5149ca05c673f1f79f7fb466f12a2295933bdad917af4a8a5c020e8",
    denort_archive: "denort-aarch64-unknown-linux-gnu.zip",
    denort_archive_sha256: "1cf6a3b3e8c1f364c2b89fd08605e5c2d16ed1c670fed330fb5e370c2dbf6b3d",
    denort_sha256: "bab7bc2f98ff656f335712f064b97bdedfa243d4a59ada40bd30b48e268db01b",
    deno_version: "2.9.8",
  },
];

/**
 * The reviewed Archgate digest the darwin-arm64 preparation recorded.
 *
 * The Deno runtime's digest is read from the policy for the platform the
 * test runs on — the three platforms carry different executables — while the
 * Archgate *executable's* digest is registered per platform only as an
 * archive digest, so the local assertion is the pinned version the gates
 * bind, not a digest of one platform's binary.
 */
const REVIEWED_ARCHGATE_VERSION = "0.61.0";

/** The explicit runtime identity. An implicit PATH lookup is not a launch. */
function explicitDeno(): string {
  const binary = process.env.SUPERMAN_DENO_BIN;
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  return binary;
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * A GitHub Actions expression.
 *
 * The expression is a workflow value, not a template placeholder, so it is
 * assembled from its parts rather than written as one.
 */
function expression(body: string): string {
  return `\${{ ${body} }}`;
}

// ---------------------------------------------------------------------------
// The workflow reader.
//
// The reader is line-oriented on purpose: it reads the same way the row 9
// workflow rule reads, so the fixture sees a workflow the way the rule that
// will judge it does.
// ---------------------------------------------------------------------------

type SourceLine = { indent: number; text: string; blank: boolean };

type WorkflowStep = {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with: Record<string, string>;
  env: Record<string, string>;
};

type WorkflowJob = {
  id: string;
  name?: string;
  runsOn?: string;
  if?: string;
  env: Record<string, string>;
  legs: Record<string, string>[];
  steps: WorkflowStep[];
};

type WorkflowPolicy = {
  name?: string;
  triggers: string[];
  env: Record<string, string>;
  jobs: WorkflowJob[];
};

function sourceLines(source: string): SourceLine[] {
  return source.split(/\r?\n/u).map((raw) => {
    const text = raw.trim();
    return { indent: raw.length - raw.trimStart().length, text, blank: text.length === 0 };
  });
}

function splitKey(text: string): { key: string; value: string } | undefined {
  const match = /^([A-Za-z0-9_.$-]+):(?:\s+(.*))?$/u.exec(text);
  if (!match) return undefined;
  return { key: match[1], value: (match[2] ?? "").trim() };
}

function readBlock(lines: SourceLine[], from: number, indent: number): { lines: SourceLine[]; next: number } {
  const collected: SourceLine[] = [];
  let index = from;
  while (index < lines.length) {
    const line = lines[index];
    if (line.blank) {
      collected.push(line);
      index++;
      continue;
    }
    if (line.indent < indent) break;
    collected.push(line);
    index++;
  }
  return { lines: collected, next: index };
}

function readMapping(lines: SourceLine[], indent: number): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of lines) {
    if (line.blank || line.indent !== indent) continue;
    const split = splitKey(line.text);
    if (split) values[split.key] = split.value;
  }
  return values;
}

function readMatrixLegs(lines: SourceLine[]): Record<string, string>[] {
  const legs: Record<string, string>[] = [];
  let current: Record<string, string> | undefined;
  for (const line of lines) {
    if (line.blank) continue;
    if (line.indent === 10 && line.text.startsWith("- ")) {
      current = {};
      legs.push(current);
      const split = splitKey(line.text.slice(2));
      if (split) current[split.key] = split.value;
      continue;
    }
    if (line.indent === 12 && current) {
      const split = splitKey(line.text);
      if (split) current[split.key] = split.value;
    }
  }
  return legs;
}

function parseStep(lines: SourceLine[]): WorkflowStep {
  const step: WorkflowStep = { with: {}, env: {} };
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.blank) {
      index++;
      continue;
    }
    const split = splitKey(line.text);
    if (!split) {
      index++;
      continue;
    }
    if (split.key === "run" && (split.value === "|" || split.value === ">" || split.value === "|-")) {
      const content: string[] = [];
      let scan = index + 1;
      while (scan < lines.length && (lines[scan].blank || lines[scan].indent > 8)) {
        if (!lines[scan].blank) content.push(lines[scan].text);
        scan++;
      }
      step.run = content.join("\n");
      index = scan;
      continue;
    }
    if (split.key === "with" || split.key === "env") {
      const target = split.key === "with" ? step.with : step.env;
      let scan = index + 1;
      while (scan < lines.length) {
        const inner = lines[scan];
        if (inner.blank) {
          scan++;
          continue;
        }
        if (inner.indent <= 8) break;
        const innerSplit = splitKey(inner.text);
        if (!innerSplit) {
          scan++;
          continue;
        }
        if (innerSplit.value === "|" || innerSplit.value === ">" || innerSplit.value === "|-") {
          const content: string[] = [];
          let contentScan = scan + 1;
          while (contentScan < lines.length && (lines[contentScan].blank || lines[contentScan].indent > 8)) {
            if (!lines[contentScan].blank) content.push(lines[contentScan].text);
            contentScan++;
          }
          target[innerSplit.key] = content.join("\n");
          scan = contentScan;
          continue;
        }
        target[innerSplit.key] = innerSplit.value;
        scan++;
      }
      index = scan;
      continue;
    }
    if (split.key === "name") step.name = split.value;
    else if (split.key === "uses") step.uses = split.value;
    else if (split.key === "if") step.if = split.value;
    index++;
  }
  return step;
}

function readSteps(lines: SourceLine[]): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.blank) {
      index++;
      continue;
    }
    if (line.indent !== 6) {
      index++;
      continue;
    }
    if (!line.text.startsWith("- ")) {
      index++;
      continue;
    }
    const block = readBlock(lines, index + 1, 8);
    steps.push(parseStep([{ indent: 6, text: line.text.slice(2), blank: false }, ...block.lines]));
    index = block.next;
  }
  return steps;
}

function parseJob(id: string, block: SourceLine[]): WorkflowJob {
  const job: WorkflowJob = { id, env: {}, legs: [], steps: [] };
  let index = 0;
  while (index < block.length) {
    const line = block[index];
    if (line.blank) {
      index++;
      continue;
    }
    if (line.indent !== 4) {
      index++;
      continue;
    }
    const split = splitKey(line.text);
    if (!split) {
      index++;
      continue;
    }
    if (split.key === "name") {
      job.name = split.value;
      index++;
      continue;
    }
    if (split.key === "runs-on") {
      job.runsOn = split.value;
      index++;
      continue;
    }
    if (split.key === "if") {
      job.if = split.value;
      index++;
      continue;
    }
    if (split.key === "env") {
      const inner = readBlock(block, index + 1, 6);
      job.env = readMapping(inner.lines, 6);
      index = inner.next;
      continue;
    }
    if (split.key === "strategy") {
      const inner = readBlock(block, index + 1, 6);
      job.legs = readMatrixLegs(inner.lines);
      index = inner.next;
      continue;
    }
    if (split.key === "steps") {
      const inner = readBlock(block, index + 1, 6);
      job.steps = readSteps(inner.lines);
      index = inner.next;
      continue;
    }
    index++;
  }
  return job;
}

function parseWorkflow(source: string): WorkflowPolicy {
  const lines = sourceLines(source);
  const policy: WorkflowPolicy = { triggers: [], env: {}, jobs: [] };
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.blank) {
      index++;
      continue;
    }
    if (line.indent !== 0) {
      index++;
      continue;
    }
    if (line.text === "jobs:") {
      index++;
      break;
    }
    const split = splitKey(line.text);
    if (!split) {
      index++;
      continue;
    }
    if (split.key === "name") {
      policy.name = split.value;
      index++;
      continue;
    }
    if (split.key === "on") {
      const block = readBlock(lines, index + 1, 2);
      policy.triggers = block.lines.filter((entry) => !entry.blank).map((entry) => entry.text);
      index = block.next;
      continue;
    }
    if (split.key === "env") {
      const block = readBlock(lines, index + 1, 2);
      policy.env = readMapping(block.lines, 2);
      index = block.next;
      continue;
    }
    index++;
  }
  while (index < lines.length) {
    const line = lines[index];
    if (line.blank) {
      index++;
      continue;
    }
    if (line.indent < 2) break;
    if (line.indent > 2) {
      index++;
      continue;
    }
    const header = /^([A-Za-z0-9_-]+):\s*$/u.exec(line.text);
    if (!header) {
      index++;
      continue;
    }
    const block = readBlock(lines, index + 1, 4);
    policy.jobs.push(parseJob(header[1], block.lines));
    index = block.next;
  }
  return policy;
}

// ---------------------------------------------------------------------------
// The policy surface: what a workflow makes the forge produce.
// ---------------------------------------------------------------------------

type Producer = {
  workflow: string;
  job: string;
  jobId: string;
  os: string;
  platform: string;
  runner: string[];
};

type RequiredCheck = { workflow: string; job: string; app: string; appId: number };

function renderName(template: string | undefined, leg: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\$\{\{\s*matrix\.([A-Za-z0-9_]+)\s*\}\}/gu, (_all, key: string) => leg[key] ?? "");
}

/** The runner label set. A single-quoted JSON array is read as the array it is. */
function parseRunner(value: string | undefined): string[] {
  if (!value) return [];
  let text = value.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"')))
    text = text.slice(1, -1);
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
}

function producersOf(workflowPath: string, workflow: WorkflowPolicy): Producer[] {
  const producers: Producer[] = [];
  for (const job of workflow.jobs) {
    for (const leg of job.legs.length ? job.legs : [{}]) {
      producers.push({
        workflow: workflowPath,
        job: renderName(job.name, leg),
        jobId: job.id,
        os: leg.os ?? "",
        platform: leg.platform ?? "",
        runner: parseRunner(leg.runner),
      });
    }
  }
  return producers;
}

function producerKey(producer: Producer): string {
  return `${producer.workflow}::${producer.job}`;
}

function sameProducer(before: Producer, after: Producer): boolean {
  return (
    before.workflow === after.workflow &&
    before.job === after.job &&
    before.jobId === after.jobId &&
    before.os === after.os &&
    before.platform === after.platform &&
    JSON.stringify(before.runner) === JSON.stringify(after.runner)
  );
}

/** The declared transition: what the merged policy adds, removes and changes. */
function transition(
  before: Producer[],
  after: Producer[],
): {
  added: Producer[];
  removed: Producer[];
  changed: { before: Producer; after: Producer }[];
} {
  const beforeByKey = new Map(before.map((producer) => [producerKey(producer), producer]));
  const afterByKey = new Map(after.map((producer) => [producerKey(producer), producer]));
  const added = after.filter((producer) => !beforeByKey.has(producerKey(producer)));
  const removed = before.filter((producer) => !afterByKey.has(producerKey(producer)));
  const changed: { before: Producer; after: Producer }[] = [];
  for (const [key, producer] of beforeByKey) {
    const counterpart = afterByKey.get(key);
    if (counterpart && !sameProducer(producer, counterpart)) changed.push({ before: producer, after: counterpart });
  }
  return { added, removed, changed };
}

// ---------------------------------------------------------------------------
// The guards. Each one answers one question about the candidate route.
// ---------------------------------------------------------------------------

/** The shell command lines of a job. A heredoc body is data, not shell. */
function commandLines(job: WorkflowJob): string[] {
  const lines: string[] = [];
  for (const step of job.steps) {
    if (!step.run) continue;
    let inHeredoc = false;
    for (const line of step.run.split("\n")) {
      if (inHeredoc) {
        if (/^[A-Z_]+$/u.test(line)) inHeredoc = false;
        continue;
      }
      if (/<<-?\s*['"]?[A-Z_]+['"]?/u.test(line)) {
        inHeredoc = true;
        continue;
      }
      lines.push(line);
    }
  }
  return lines;
}

/** Every text of a job: the names, the conditions, the environment and the commands. */
function jobText(job: WorkflowJob): string {
  const parts: string[] = [job.id, job.name ?? "", job.runsOn ?? "", job.if ?? ""];
  for (const [key, value] of Object.entries(job.env)) parts.push(`${key}=${value}`);
  for (const step of job.steps) {
    parts.push(step.name ?? "", step.uses ?? "", step.if ?? "", step.run ?? "");
    for (const [key, value] of Object.entries(step.with)) parts.push(`${key}=${value}`);
    for (const [key, value] of Object.entries(step.env)) parts.push(`${key}=${value}`);
  }
  return parts.join("\n");
}

/** The conditions that decide whether something runs. */
function conditionsOf(job: WorkflowJob): string[] {
  const conditions: string[] = [];
  if (job.if) conditions.push(job.if);
  for (const step of job.steps) if (step.if) conditions.push(step.if);
  return conditions;
}

const ENVIRONMENT_CONDITION = /\benv\.[A-Za-z_]/u;
const FILE_PRESENCE_CONDITION = /\b(?:hashFiles|fileExists)\(/u;
const OUTCOME_CONDITION = /\b(?:success|failure|cancelled)\(/u;
const AVAILABILITY_PROBE = /\b(?:command -v|type -p)\s|\bwhich\s+[A-Za-z_]/u;
const FILE_PRESENCE_PROBE = /\btest\s+-[ef]\s|\[\s+-[ef]\s/u;
const ENVIRONMENT_BRANCH = /\btest\s+-[nz]\s+"?\$\{|\[\s+-[nz]\s+"?\$\{/u;

/** The candidate route selects nothing by environment, file presence or availability. */
function switchFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  for (const condition of conditionsOf(job)) {
    if (ENVIRONMENT_CONDITION.test(condition))
      findings.push(`the candidate route selects on an environment variable: ${condition}`);
    if (FILE_PRESENCE_CONDITION.test(condition))
      findings.push(`the candidate route selects on file presence: ${condition}`);
    if (OUTCOME_CONDITION.test(condition))
      findings.push(`the candidate route selects on a previous outcome: ${condition}`);
  }
  for (const line of commandLines(job)) {
    if (AVAILABILITY_PROBE.test(line)) findings.push(`the candidate route probes tool availability: ${line}`);
    if (FILE_PRESENCE_PROBE.test(line)) findings.push(`the candidate route probes file presence: ${line}`);
    if (ENVIRONMENT_BRANCH.test(line)) findings.push(`the candidate route branches on an environment value: ${line}`);
  }
  return findings;
}

/** The Node evaluation surface. A candidate route that reaches it is a fallback. */
const NODE_EVALUATION_SURFACE = [
  ".superman/ci/raw-gates.ts",
  ".superman/ci/coverage.ts",
  ".superman/ci/pr-policy.ts",
  ".superman/ci/quality.ts",
  ".superman/ci/direct-gates.ts",
];

/** The candidate route never falls back to the Node evaluation. */
function fallbackFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  for (const line of commandLines(job)) {
    for (const surface of NODE_EVALUATION_SURFACE)
      if (line.includes(surface)) findings.push(`the candidate route evaluates the Node surface: ${line}`);
    if (line.includes("||")) findings.push(`the candidate route carries a fallback operator: ${line}`);
  }
  return findings;
}

/** No blanket grant. */
function blanketFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  const text = jobText(job);
  if (text.includes(BLANKET_GRANT)) findings.push(`the candidate route grants every capability with ${BLANKET_GRANT}`);
  const short = new RegExp(`(?<![\\w-])${BLANKET_SHORT}(?![\\w-])`, "u");
  if (short.test(text)) findings.push(`the candidate route grants every capability with ${BLANKET_SHORT}`);
  return findings;
}

/** The Deno invocations of the candidate route, with the flags they carry. */
function denoInvocations(job: WorkflowJob): { line: string; flags: string[] }[] {
  const invocations: { line: string; flags: string[] }[] = [];
  for (const line of commandLines(job)) {
    const match = /(?:^|\s)(?:"?\$\{?DENO_BIN\}?"?|deno)\s+run\s+(.+)$/u.exec(line);
    if (!match) continue;
    // The flags are the leading run of options; the subject and its own
    // arguments follow them and are not permission grants.
    const flags: string[] = [];
    for (const token of match[1].split(/\s+/u)) {
      if (!token.startsWith("--")) break;
      flags.push(token);
    }
    invocations.push({ line, flags });
  }
  return invocations;
}

/** The candidate route runs under the reviewed permission profile. */
function permissionProfileFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  const invocations = denoInvocations(job);
  if (!invocations.length) findings.push("the candidate route runs no Deno subject");
  for (const invocation of invocations) {
    if (JSON.stringify(invocation.flags) === JSON.stringify(REVIEWED_FLAGS)) continue;
    findings.push(`the candidate route does not carry the reviewed permission profile: ${invocation.flags.join(" ")}`);
  }
  return findings;
}

/**
 * The row 9 rule's banned command family.
 *
 * The runtime may be named explicitly, so the family is matched under every
 * spelling the candidate route can use: the rule's own pattern would not see
 * a banned subcommand behind an explicit runtime path.
 */
const DIRECT_DENO = /(?:\bdeno|"?\$\{?DENO_BIN\}?"?)\s+(?:run\s+)?(?:test|lint|fmt|coverage|task)\b/u;

/** The candidate route calls no banned Deno subcommand. */
function directDenoFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  for (const line of commandLines(job))
    if (DIRECT_DENO.test(line)) findings.push(`the candidate route calls a banned Deno subcommand: ${line}`);
  return findings;
}

/** The candidate route covers exactly the three recorded native platforms. */
function platformFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  const recorded = new Map(PLATFORMS.map((entry) => [entry.os, entry]));
  if (job.legs.length !== recorded.size)
    findings.push(`the candidate route covers ${job.legs.length} platforms, not ${recorded.size}`);
  for (const leg of job.legs) {
    const expected = recorded.get(leg.os ?? "");
    if (!expected) {
      findings.push(`the candidate route covers an unrecorded platform: ${leg.os ?? "(unnamed)"}`);
      continue;
    }
    if ((leg.platform ?? "") !== expected.platform)
      findings.push(`the candidate route binds ${leg.os} to ${leg.platform}, not ${expected.platform}`);
    const runner = parseRunner(leg.runner);
    if (JSON.stringify(runner) !== JSON.stringify(expected.runner))
      findings.push(`the candidate route runs ${leg.os} on ${runner.join(", ")}, not ${expected.runner.join(", ")}`);
  }
  return findings;
}

/** The candidate route binds the recorded tool identities. */
function toolIdentityFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  const recorded = new Map(PLATFORMS.map((entry) => [entry.os, entry]));
  for (const leg of job.legs) {
    const expected = recorded.get(leg.os ?? "");
    if (!expected) continue;
    const bindings: [string, string | undefined, string][] = [
      ["deno_archive", leg.deno_archive, expected.deno_archive],
      ["deno_archive_sha256", leg.deno_archive_sha256, expected.deno_archive_sha256],
      ["deno_sha256", leg.deno_sha256, expected.deno_sha256],
      ["denort_archive", leg.denort_archive, expected.denort_archive],
      ["denort_archive_sha256", leg.denort_archive_sha256, expected.denort_archive_sha256],
      ["denort_sha256", leg.denort_sha256, expected.denort_sha256],
      ["deno_version", leg.deno_version, expected.deno_version],
    ];
    for (const [name, actual, wanted] of bindings)
      if (actual !== wanted) findings.push(`the candidate route binds ${leg.os} ${name} to ${actual}, not ${wanted}`);
  }
  return findings;
}

/**
 * The contexts a level may name. GitHub rejects a workflow that names a
 * context its level does not have, and it rejects the whole file: the run
 * never starts, no job is created, and the only report is that the
 * workflow file has an issue.
 */
const LEVEL_CONTEXTS: Record<string, string[]> = {
  workflow: ["github", "inputs", "vars", "secrets"],
  job: ["github", "inputs", "vars", "secrets", "needs", "strategy", "matrix"],
  step: ["github", "inputs", "vars", "secrets", "needs", "strategy", "matrix", "runner", "env", "job", "steps"],
};

function contextFindings(entries: Record<string, string>, level: string): string[] {
  const allowed = LEVEL_CONTEXTS[level] ?? [];
  const findings: string[] = [];
  for (const [key, value] of Object.entries(entries))
    for (const match of value.matchAll(/\$\{\{\s*([A-Za-z_][A-Za-z0-9_]*)/gu))
      if (!allowed.includes(match[1]))
        findings.push(`the ${level} environment ${key} names ${match[1]}, which that level does not have`);
  return findings;
}

/**
 * The raw per-process coverage dumps are not evidence: the receipt, the
 * merged report and the summary are. An artifact that carries the dumps
 * carries hundreds of megabytes that no receipt names and no reviewer
 * reads.
 */
function rawDumpFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  for (const step of job.steps) {
    if (!(step.uses ?? "").startsWith("actions/upload-artifact@")) continue;
    const path = step.with?.path ?? "";
    if (!/!.*v8/u.test(path))
      findings.push(`the artifact ${step.with?.name ?? "(unnamed)"} uploads the raw coverage dumps`);
  }
  return findings;
}

/** The candidate route records its artifacts in the candidate namespace. */
function artifactFindings(job: WorkflowJob): string[] {
  const findings: string[] = [];
  const uploads = job.steps.filter((step) => (step.uses ?? "").startsWith("actions/upload-artifact@"));
  if (uploads.length !== 1) {
    findings.push(`the candidate route uploads ${uploads.length} artifacts, not one per platform`);
    return findings;
  }
  const upload = uploads[0];
  if ((upload.with.name ?? "") !== `deno-candidate-${expression("matrix.platform")}`)
    findings.push(`the candidate artifact is named ${upload.with.name}, not the recorded candidate name`);
  const path = upload.with.path ?? "";
  if (!path.includes(".superman-ci/deno-bootstrap/"))
    findings.push(`the candidate artifact is collected from ${path}, not the candidate namespace`);
  const receiptDir = job.env.CANDIDATE_RECEIPT_DIR ?? "";
  if (receiptDir !== `.superman-ci/deno-bootstrap/${expression("matrix.platform")}`)
    findings.push(`the candidate receipt is written to ${receiptDir}, not the candidate namespace`);
  return findings;
}

/** The candidate route binds the exact source under test. */
function sourceBindingFindings(workflow: WorkflowPolicy, job: WorkflowJob): string[] {
  const findings: string[] = [];
  const checkout = job.steps.find((step) => (step.uses ?? "").startsWith("actions/checkout@"));
  if (!checkout) findings.push("the candidate route does not check the source out");
  else if ((checkout.with["fetch-depth"] ?? "") !== "0")
    findings.push(`the candidate route checks out a shallow history: fetch-depth ${checkout.with["fetch-depth"]}`);
  if ((workflow.env.HEAD_SHA ?? "") !== expression("github.event.pull_request.head.sha"))
    findings.push(`the candidate route binds HEAD_SHA to ${workflow.env.HEAD_SHA}, not the pull-request head commit`);
  if ((workflow.env.BASE_SHA ?? "") !== expression("github.event.pull_request.base.sha"))
    findings.push(`the candidate route binds BASE_SHA to ${workflow.env.BASE_SHA}, not the pull-request base commit`);
  if ("GITHUB_SHA" in workflow.env) findings.push("the candidate route overrides GITHUB_SHA");
  if ("GITHUB_REF" in workflow.env) findings.push("the candidate route overrides GITHUB_REF");
  for (const [key, value] of Object.entries(workflow.env))
    if (key.endsWith("_REF") && key !== "HEAD_REF" && key !== "BASE_REF")
      findings.push(`the candidate route binds ${key} to a ref: ${value}`);
  return findings;
}

/**
 * The run profile a host's receipt binds: the driver it executed, the
 * reviewed tool pins and the reviewed quality policy with the stage's
 * declared inventory.
 */
type RunProfile = { driver?: string; tools?: string; policy?: string };

/**
 * The two hosts must bind the same profile shape, the same reviewed policy
 * and tool identity, and each host's own driver identity.
 *
 * The comparison is against the Node original's own receipt. A fixture that
 * compared the candidate with a formula it computed itself could not see a
 * change in the Node original: it agreed with a port that had drifted the
 * same way, and the drift passed. This one compares two hosts' observations.
 */
function profileFindings(node: RunProfile | undefined, candidate: RunProfile | undefined): string[] {
  const findings: string[] = [];
  if (!node || !candidate) return ["a host's receipt binds no run profile"];
  const nodeKeys = Object.keys(node).sort();
  const candidateKeys = Object.keys(candidate).sort();
  if (JSON.stringify(nodeKeys) !== JSON.stringify(candidateKeys))
    findings.push(`the profile shapes differ: ${candidateKeys.join(", ")} against ${nodeKeys.join(", ")}`);
  if (candidate.tools !== node.tools)
    findings.push(`the reviewed tool identity differs: ${candidate.tools} against ${node.tools}`);
  if (candidate.policy !== node.policy)
    findings.push(`the reviewed policy identity differs: ${candidate.policy} against ${node.policy}`);
  if (candidate.driver === node.driver) findings.push("the two hosts bind the same driver identity");
  return findings;
}

// ---------------------------------------------------------------------------
// The fixtures.
// ---------------------------------------------------------------------------

/** A disposable repository with a base, a head and a real merge of the two. */
function repositoryFixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "superman-transition-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const git = (...args: string[]) => {
    const result = runOwned("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      shell: false,
    });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Transition Fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(".gitignore", "node_modules\n");
  write("package.json", `${JSON.stringify({ name: "transition-fixture", type: "module" })}\n`);
  write(
    ".superman/ci/bootstrap.json",
    `${JSON.stringify({
      version: 1,
      tools: { node: "26" },
      stages: {
        // A partial stage declares the staged scope: partial feedback is
        // staged feedback, and a declaration that claims a partial result
        // over the whole repository is refused.
        "pre-pr": { feedback: "partial", scope: "staged", gates: ["G4"] },
        ci: { feedback: "partial", scope: "staged", gates: ["G4"] },
      },
    })}\n`,
  );
  git("add", "--all");
  git("commit", "--quiet", "-m", "approved base");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("switch", "--quiet", "-c", "ticket/demo-01");
  write("README.md", "proposed documentation\n");
  git("add", "--all");
  git("commit", "--quiet", "-m", "candidate");
  const head = git("rev-parse", "HEAD");
  git("switch", "--quiet", "main");
  write("base.md", "independently advanced base\n");
  git("add", "--all");
  git("commit", "--quiet", "-m", "advanced base");
  const base = git("rev-parse", "HEAD");
  git("update-ref", "refs/remotes/origin/main", base);
  git("merge", "--quiet", "--no-ff", "-m", "test integration", "ticket/demo-01");
  const merge = git("rev-parse", "HEAD");
  return { root, git, write, base, head, merge };
}

/**
 * The environment both routes are driven with.
 *
 * The Node test runner marks its own children with `NODE_TEST_CONTEXT`, and a
 * child that inherits the marker reports as a test child instead of running
 * its case, so the marker is removed before any route is spawned — the Node
 * collector removes it for the same reason. The coverage marker is removed
 * too: the transition fixture is a policy fixture, not a measurement, and it
 * does not contribute to the Deno scope's coverage numbers.
 */
function childEnvironment(repo: ReturnType<typeof repositoryFixture>, githubSha: string) {
  const eventPath = join(repo.root, ".git", "event.json");
  writeFileSync(
    eventPath,
    `${JSON.stringify({
      pull_request: {
        head: { sha: repo.head, ref: "ticket/demo-01" },
        base: { sha: repo.base },
        merge_commit_sha: repo.merge,
      },
    })}\n`,
  );
  const environment: Record<string, string | undefined> = {
    ...isolated,
    HEAD_REF: "ticket/demo-01",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_SHA: githubSha,
  };
  delete environment.NODE_TEST_CONTEXT;
  delete environment.DENO_COVERAGE_DIR;
  return environment;
}

/**
 * Run one route's raw gates over the fixture and read its receipt.
 *
 * The event names the head, the base and the merge. The measured commit is
 * the one the checkout is at, which is what decides whether the tested tree
 * is the integration of the head with the base or only the head.
 */
function runRoute(
  repo: ReturnType<typeof repositoryFixture>,
  route: { command: string; args: string[]; receipt: string },
  environment: Record<string, string | undefined>,
) {
  const receiptPath = join(repo.root, ".git", route.receipt);
  const result = runOwned(route.command, [...route.args, "--receipt", receiptPath], {
    cwd: repo.root,
    env: environment,
    encoding: "utf8",
    shell: false,
    timeout: 600_000,
  });
  assert.ifError(result.error);
  return {
    status: result.status,
    receipt: existsSync(receiptPath) ? (JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>) : {},
  };
}

/**
 * Run both routes over the same tree, with the same environment.
 *
 * The approved-base Node route and the candidate Deno route are driven over
 * one fixture, so the two receipts are comparable: the candidate is measured
 * against the Node original's own observation, never against a formula this
 * fixture computes.
 */
function runBothRoutes(repo: ReturnType<typeof repositoryFixture>, githubSha: string) {
  const environment = childEnvironment(repo, githubSha);
  const node = runRoute(
    repo,
    {
      command: process.execPath,
      args: [join(repository, ".superman/ci/raw-gates.ts"), "--gate", "G4"],
      receipt: "receipt-node.json",
    },
    environment,
  );
  const candidate = runRoute(
    repo,
    {
      command: explicitDeno(),
      args: ["run", ...REVIEWED_FLAGS, join(denoRoot, "raw-gates.ts"), "--gate", "G4"],
      receipt: "receipt-deno.json",
    },
    environment,
  );
  return { environment, node, candidate };
}

/** The published workflows, read the way the row 9 rule reads them. */
async function publishedViolations(source: string, path: string): Promise<string[]> {
  const violations: string[] = [];
  const context = {
    projectRoot: repository,
    scopedFiles: [path],
    changedFiles: [path],
    glob: async (pattern: string) => (pattern === ".github/workflows/*.yml" ? [path] : []),
    readFile: async (file: string) => (file === path ? source : ""),
    report: {
      violation: (detail: { message: string; file?: string; line?: number }) =>
        violations.push(`${detail.file ?? path}:${detail.line ?? 0}: ${detail.message}`),
      warning: () => {},
      info: () => {},
    },
  } as unknown as RuleContext;
  for (const rule of Object.values(sup008.rules)) await rule.check(context);
  return violations;
}

/** A copy of the template with one line replaced. */
function mutate(source: string, from: string, to: string): string {
  assert.ok(source.includes(from), `the mutation target is absent from the template: ${from}`);
  return source.replace(from, to);
}

/** The recorded required-check policy. */
function readRequiredChecks(): RequiredCheck[] {
  const policy = JSON.parse(readFileSync(policyPath, "utf8")) as { requiredChecks: RequiredCheck[] };
  return policy.requiredChecks;
}

/** The template, parsed. */
function readTemplate(): { source: string; workflow: WorkflowPolicy; job: WorkflowJob } {
  const source = readFileSync(templatePath, "utf8");
  const workflow = parseWorkflow(source);
  const job = workflow.jobs.find((entry) => entry.id === "deno-candidate");
  assert.ok(job, "the candidate template declares no deno-candidate job");
  return { source, workflow, job };
}

/** The approved-base policy, parsed. */
function readBase(): { source: string; workflow: WorkflowPolicy; producers: Producer[] } {
  const source = readFileSync(baseWorkflowPath, "utf8");
  const workflow = parseWorkflow(source);
  return { source, workflow, producers: producersOf(".github/workflows/ci.yml", workflow) };
}

// ---------------------------------------------------------------------------
// The tests.
// ---------------------------------------------------------------------------

test("the approved-base policy produces exactly the recorded required check producers", () => {
  const base = readBase();
  const required = readRequiredChecks();
  assert.deepEqual(base.producers.map((producer) => producer.job).sort(), required.map((check) => check.job).sort());
  for (const check of required) {
    assert.equal(check.workflow, ".github/workflows/ci.yml");
    assert.equal(check.app, "github-actions");
    assert.equal(check.appId, 15368);
    assert.ok(base.producers.some((producer) => producer.job === check.job));
  }
  const arm = base.producers.find((producer) => producer.job === "bootstrap (ubuntu-24.04-arm)");
  assert.deepEqual(arm?.runner, ["self-hosted", "Linux", "ARM64", "r3dlex-linux-arm64"]);
});

test("the approved-base workflow and the recorded required checks are the approved base", () => {
  // The transition is measured against the approved base, so the base workflow
  // and the required-check policy must be untouched by this slice.
  const workflow = runOwned("git", ["diff", "--quiet", "HEAD", "--", ".github/workflows/ci.yml"], {
    cwd: repository,
    env: isolated,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(workflow.status, 0, "the approved-base workflow is not the approved base");
  const recorded = runOwned("git", ["show", "HEAD:.superman/ci/bootstrap.json"], {
    cwd: repository,
    env: isolated,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(recorded.status, 0);
  const approved = JSON.parse(recorded.stdout) as { requiredChecks: RequiredCheck[] };
  assert.deepEqual(readRequiredChecks(), approved.requiredChecks);
});

test("the merged policy differs from the approved base by exactly the declared transition", () => {
  const base = readBase();
  const candidate = readTemplate();
  const merged = [...base.producers, ...producersOf(".superman/deno-bootstrap/ci.template.yml", candidate.workflow)];
  const delta = transition(base.producers, merged);
  assert.deepEqual(delta.added.map((producer) => producer.job).sort(), [
    "deno-candidate (macos-15)",
    "deno-candidate (ubuntu-24.04)",
    "deno-candidate (ubuntu-24.04-arm)",
  ]);
  assert.deepEqual(delta.removed, []);
  assert.deepEqual(delta.changed, []);
});

test("the Node-side result stays the required result across the transition", () => {
  const base = readBase();
  const candidate = readTemplate();
  const required = readRequiredChecks();
  const merged = [...base.producers, ...producersOf(".superman/deno-bootstrap/ci.template.yml", candidate.workflow)];
  const requiredJobs = required.map((check) => check.job).sort();
  const requiredProducers = merged.filter((producer) => requiredJobs.includes(producer.job));
  assert.deepEqual(requiredProducers.map((producer) => producer.job).sort(), requiredJobs);
  assert.equal(requiredProducers.length, requiredJobs.length);
  const additional = merged.filter((producer) => !requiredJobs.includes(producer.job));
  assert.equal(additional.length, 3);
  for (const producer of additional)
    assert.ok(
      !requiredJobs.includes(producer.job),
      `the candidate proof ${producer.job} is promoted to a required check`,
    );
});

test("promoting a candidate result to a required check is refused", () => {
  const base = readBase();
  const candidate = readTemplate();
  const merged = [...base.producers, ...producersOf(".superman/deno-bootstrap/ci.template.yml", candidate.workflow)];
  const required = readRequiredChecks();
  const requiredJobs = required.map((check) => check.job);
  const requiredCount = merged.filter((producer) => requiredJobs.includes(producer.job)).length;
  const promoted = merged.map((producer) =>
    producer.job.startsWith("deno-candidate") ? { ...producer, job: "bootstrap (macos-15)" } : producer,
  );
  const promotedCount = promoted.filter((producer) => requiredJobs.includes(producer.job)).length;
  // The promoted name collides with a required producer, so the required set
  // no longer identifies one producer per required check.
  assert.equal(requiredCount, requiredJobs.length);
  assert.equal(promotedCount, requiredJobs.length + 3);
});

test("the candidate route selects nothing by environment, file presence or availability", () => {
  const { job } = readTemplate();
  assert.deepEqual(switchFindings(job), []);
  const byEnvironment = mutate(
    readTemplate().source,
    `    runs-on: ${expression("fromJSON(matrix.runner)")}`,
    `    runs-on: ${expression("fromJSON(matrix.runner)")}\n    if: env.DENO_CANDIDATE == 'true'`,
  );
  const environmentFindings = switchFindings(parseWorkflow(byEnvironment).jobs[0]);
  assert.equal(environmentFindings.length, 1);
  assert.match(environmentFindings[0], /environment variable/u);
  const byAvailability = mutate(
    readTemplate().source,
    "          set -euo pipefail\n          node --input-type=module <<'NODE'",
    "          set -euo pipefail\n          command -v deno\n          node --input-type=module <<'NODE'",
  );
  const availabilityFindings = switchFindings(parseWorkflow(byAvailability).jobs[0]);
  assert.equal(availabilityFindings.length, 1);
  assert.match(availabilityFindings[0], /availability/u);
});

test("the candidate route never falls back to the Node evaluation", () => {
  const { job } = readTemplate();
  assert.deepEqual(fallbackFindings(job), []);
  const fallback = mutate(
    readTemplate().source,
    '          mkdir -p "$CANDIDATE_RECEIPT_DIR"',
    '          node .superman/ci/raw-gates.ts --receipt .superman-ci/bootstrap.json\n          mkdir -p "$CANDIDATE_RECEIPT_DIR"',
  );
  const findings = fallbackFindings(parseWorkflow(fallback).jobs[0]);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /Node surface/u);
});

test("the candidate route carries the reviewed permission profile and no blanket grant", () => {
  const { job } = readTemplate();
  assert.deepEqual(permissionProfileFindings(job), []);
  assert.deepEqual(blanketFindings(job), []);
  const narrowed = mutate(
    readTemplate().source,
    "--allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/pr-policy.ts",
    "--allow-read --allow-write --allow-env .superman/deno-bootstrap/pr-policy.ts",
  );
  const narrowedFindings = permissionProfileFindings(parseWorkflow(narrowed).jobs[0]);
  assert.equal(narrowedFindings.length, 1);
  assert.match(narrowedFindings[0], /reviewed permission profile/u);
  const widened = mutate(
    readTemplate().source,
    "--allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/pr-policy.ts",
    `--allow-read --allow-write --allow-env --allow-run ${BLANKET_GRANT} .superman/deno-bootstrap/pr-policy.ts`,
  );
  const widenedFindings = blanketFindings(parseWorkflow(widened).jobs[0]);
  assert.equal(widenedFindings.length, 1);
  assert.equal(widenedFindings[0], `the candidate route grants every capability with ${BLANKET_GRANT}`);
});

test("the candidate route calls no banned Deno subcommand", () => {
  const { job } = readTemplate();
  assert.deepEqual(directDenoFindings(job), []);
  const banned = mutate(
    readTemplate().source,
    '          mkdir -p "$CANDIDATE_RECEIPT_DIR"',
    '          "$DENO_BIN" test .superman/deno-bootstrap/tests\n          mkdir -p "$CANDIDATE_RECEIPT_DIR"',
  );
  const findings = directDenoFindings(parseWorkflow(banned).jobs[0]);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /banned Deno subcommand/u);
});

test("the candidate route covers exactly the three recorded native platforms", () => {
  const { job } = readTemplate();
  assert.deepEqual(platformFindings(job), []);
  const narrowed = mutate(
    readTemplate().source,
    "          - os: ubuntu-24.04-arm\n            platform: linux-arm64",
    "          - os: ubuntu-24.04-arm-narrowed\n            platform: linux-arm64",
  );
  const findings = platformFindings(parseWorkflow(narrowed).jobs[0]);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /unrecorded platform/u);
  const regrouped = mutate(
    readTemplate().source,
    'runner: \'["self-hosted","Linux","ARM64","r3dlex-linux-arm64"]\'',
    'runner: \'["self-hosted","Linux","ARM64","r3dlex-org"]\'',
  );
  const regroupedFindings = platformFindings(parseWorkflow(regrouped).jobs[0]);
  assert.equal(regroupedFindings.length, 1);
  assert.match(regroupedFindings[0], /r3dlex-linux-arm64/u);
});

test("the candidate route binds the recorded tool identities", () => {
  const { job } = readTemplate();
  assert.deepEqual(toolIdentityFindings(job), []);
  const swapped = mutate(
    readTemplate().source,
    "deno_sha256: d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba",
    "deno_sha256: 0000000000000000000000000000000000000000000000000000000000000000",
  );
  const findings = toolIdentityFindings(parseWorkflow(swapped).jobs[0]);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /deno_sha256/u);
});

test("a published workflow names only the contexts its level has", () => {
  // The published candidate workflow is GitHub's own parser's input, and the
  // runner context is a step context: a job-level environment that names it
  // is rejected whole, and the run never starts.
  for (const source of [
    readFileSync(join(repository, ".github/workflows/deno-candidate.yml"), "utf8"),
    readTemplate().source,
  ]) {
    const policy = parseWorkflow(source);
    assert.deepEqual(contextFindings(policy.env, "workflow"), []);
    for (const job of policy.jobs) {
      assert.deepEqual(contextFindings(job.env, "job"), []);
      for (const step of job.steps) assert.deepEqual(contextFindings(step.env, "step"), []);
    }
  }
});

test("neither route uploads the raw coverage dumps", () => {
  // The hosted route and the candidate route both publish evidence; neither
  // publishes the per-process dumps the collectors merge and leave behind.
  const hosted = parseWorkflow(readFileSync(join(repository, ".github/workflows/ci.yml"), "utf8"));
  const candidate = parseWorkflow(readFileSync(templatePath, "utf8"));
  assert.deepEqual(rawDumpFindings(hosted.jobs[0]), []);
  assert.deepEqual(rawDumpFindings(candidate.jobs[0]), []);
});

test("the candidate route binds the artifacts to the candidate namespace", () => {
  const { job } = readTemplate();
  assert.deepEqual(artifactFindings(job), []);
  const renamed = mutate(
    readTemplate().source,
    `          name: deno-candidate-${expression("matrix.platform")}`,
    `          name: bootstrap-${expression("matrix.platform")}`,
  );
  const findings = artifactFindings(parseWorkflow(renamed).jobs[0]);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /recorded candidate name/u);
  const moved = mutate(
    readTemplate().source,
    `      CANDIDATE_RECEIPT_DIR: .superman-ci/deno-bootstrap/${expression("matrix.platform")}`,
    "      CANDIDATE_RECEIPT_DIR: .superman-ci/bootstrap",
  );
  const movedFindings = artifactFindings(parseWorkflow(moved).jobs[0]);
  assert.equal(movedFindings.length, 1);
  assert.match(movedFindings[0], /candidate namespace/u);
});

test("the candidate route binds the exact source under test", () => {
  const { workflow, job } = readTemplate();
  assert.deepEqual(sourceBindingFindings(workflow, job), []);
  const shallow = mutate(readTemplate().source, "          fetch-depth: 0", "          fetch-depth: 1");
  const shallowWorkflow = parseWorkflow(shallow);
  const shallowFindings = sourceBindingFindings(shallowWorkflow, shallowWorkflow.jobs[0]);
  assert.equal(shallowFindings.length, 1);
  assert.match(shallowFindings[0], /shallow history/u);
  const byRef = mutate(
    readTemplate().source,
    `  HEAD_SHA: ${expression("github.event.pull_request.head.sha")}`,
    `  HEAD_SHA: ${expression("github.head_ref")}`,
  );
  const refWorkflow = parseWorkflow(byRef);
  const refFindings = sourceBindingFindings(refWorkflow, refWorkflow.jobs[0]);
  assert.equal(refFindings.length, 1);
  assert.match(refFindings[0], /pull-request head commit/u);
});

test("the template stays outside workflow discovery", () => {
  assert.ok(!templatePath.startsWith(join(repository, ".github/workflows")));
  assert.ok(templatePath.startsWith(denoRoot));
  for (const file of readdirSync(join(repository, ".github/workflows"))) {
    const text = readFileSync(join(repository, ".github/workflows", file), "utf8");
    assert.ok(!text.includes("ci.template.yml"), `${file} references the candidate template`);
  }
});

test("the template satisfies the row 9 rules when it is published as a workflow", async () => {
  const { source } = readTemplate();
  const published = ".github/workflows/deno-candidate.yml";
  assert.deepEqual(await publishedViolations(source, published), []);
  // The rule is live only when the workflow calls the gate; the template is
  // checked in that form too, so a later gate call cannot make it non-compliant.
  const activated = mutate(
    source,
    "      - run: pnpm install",
    "      - run: superman gate ci\n      - run: pnpm install",
  );
  assert.deepEqual(await publishedViolations(activated, published), []);
  const offending = mutate(activated, "      - run: pnpm install", "      - run: deno test\n      - run: pnpm install");
  const violations = await publishedViolations(offending, published);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /SUP-008/u);
});

test("the local result binds the exact source, the tool identities and the permission profile identity", () => {
  const head = runOwned("git", ["rev-parse", "HEAD"], {
    cwd: repository,
    env: isolated,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(head.status, 0);
  const source = head.stdout.trim();
  assert.match(source, /^[a-f0-9]{40}$/u);
  const assets = JSON.parse(readFileSync(join(repository, ".superman/ci/tool-assets.json"), "utf8"));
  const platform = `${process.platform}-${process.arch}`;
  const expectedDeno = assets.deno?.[platform]?.binarySha256;
  assert.ok(expectedDeno, `the pinned deno digest for ${platform} is not registered`);
  assert.equal(sha256(readFileSync(explicitDeno())), expectedDeno);
  const archgate = process.env.ARCHGATE_BIN;
  assert.ok(archgate, "an explicit archgate path is required");
  // The Archgate executable's digest is registered per platform only as an
  // archive digest, so the local assertion is the identity the gates bind —
  // the pinned version the binary reports.
  const archgateVersion = runOwned(archgate, ["--version"], {
    cwd: repository,
    env: isolated,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(archgateVersion.status, 0, archgateVersion.stderr);
  assert.match(archgateVersion.stdout, new RegExp(`\\b${REVIEWED_ARCHGATE_VERSION}\\b`, "u"));
  // The permission profile identity is the template's own flags against the
  // seam's reviewed profile: the two digests are equal only when the template
  // carries exactly the reviewed grants.
  const { job } = readTemplate();
  const invocations = denoInvocations(job);
  assert.ok(invocations.length > 0);
  assert.equal(sha256(invocations[0].flags.join("\n")), sha256(REVIEWED_FLAGS.join("\n")));
  // The unpinned archgate in the repository is not the reviewed one: the
  // identity check changes the outcome when the tool is not the recorded one.
  const unpinned = join(repository, "node_modules/.bin/archgate");
  if (existsSync(unpinned)) {
    // The versions differ, and that is what "not the reviewed one" means:
    // each platform's reviewed executable has its own digest.
    const unpinnedVersion = runOwned(unpinned, ["--version"], {
      cwd: repository,
      env: isolated,
      encoding: "utf8",
      shell: false,
    });
    assert.doesNotMatch(unpinnedVersion.stdout, new RegExp(`\\b${REVIEWED_ARCHGATE_VERSION}\\b`, "u"));
  }
});

test("the expected forge evidence names the tested merge, never the head alone", (t) => {
  const repo = repositoryFixture(t);
  assert.deepEqual(repo.git("rev-list", "--parents", "-n", "1", repo.merge).split(" "), [
    repo.merge,
    repo.base,
    repo.head,
  ]);
  const tested = runBothRoutes(repo, repo.merge);
  assert.equal(tested.candidate.receipt.baseSha, repo.base);
  assert.equal(tested.candidate.receipt.headSha, repo.head);
  assert.equal(tested.candidate.receipt.evaluatedSha, repo.merge);
  assert.equal(tested.candidate.receipt.testedMergeSha, repo.merge);
  assert.equal(tested.candidate.receipt.eventMergeSha, repo.merge);
  assert.equal(tested.candidate.receipt.error, undefined);
  // The Node original reaches the same conclusion over the same tree.
  assert.equal(tested.node.receipt.baseSha, repo.base);
  assert.equal(tested.node.receipt.headSha, repo.head);
  assert.equal(tested.node.receipt.evaluatedSha, repo.merge);
  assert.equal(tested.node.receipt.testedMergeSha, repo.merge);
  assert.equal(tested.node.receipt.error, undefined);
  // The run profile is compared against the Node original's own receipt: the
  // same shape, the same reviewed policy and tool identity, and each host's
  // own driver identity.
  const nodeProfile = tested.node.receipt.profile as RunProfile | undefined;
  const candidateProfile = tested.candidate.receipt.profile as RunProfile | undefined;
  assert.deepEqual(profileFindings(nodeProfile, candidateProfile), []);

  // The head alone is not the merge: the candidate route refuses it.
  repo.git("switch", "--quiet", "--detach", repo.head);
  const headOnly = runBothRoutes(repo, repo.head);
  assert.match(String(headOnly.candidate.receipt.error), /tested merge is not the recorded base\/head integration/u);
  assert.equal(headOnly.candidate.receipt.testedMergeSha, undefined);
  assert.match(String(headOnly.node.receipt.error), /tested merge is not the recorded base\/head integration/u);
  assert.equal(headOnly.node.receipt.testedMergeSha, undefined);
});

test("the profile comparison sees a candidate that drifted from the Node original", (t) => {
  const repo = repositoryFixture(t);
  const tested = runBothRoutes(repo, repo.merge);
  const nodeProfile = tested.node.receipt.profile as RunProfile | undefined;
  const candidateProfile = tested.candidate.receipt.profile as RunProfile | undefined;
  assert.deepEqual(profileFindings(nodeProfile, candidateProfile), []);
  // The profile the candidate port bound before row 11's re-sync: the shape
  // the Node original no longer has, without the driver identity, and the
  // pre-correction policy formula. A comparison against the Node original's
  // own receipt sees it; a comparison against a formula this fixture
  // computed agreed with it, which is how the drift passed.
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8")) as {
    tools: unknown;
    stages: unknown;
    quality: unknown;
  };
  const preCorrection = {
    tools: sha256(JSON.stringify(policy.tools ?? null)),
    policy: sha256(JSON.stringify({ stages: policy.stages ?? null, quality: policy.quality ?? null })),
  };
  const findings = profileFindings(nodeProfile, preCorrection);
  assert.equal(findings.length, 2);
  assert.match(findings[0], /profile shapes differ/u);
  assert.match(findings[1], /reviewed policy identity differs/u);
  // A drifted tool identity is seen too.
  const drifted = { ...candidateProfile, tools: sha256("drifted") };
  assert.deepEqual(profileFindings(nodeProfile, drifted), [
    `the reviewed tool identity differs: ${drifted.tools} against ${nodeProfile?.tools}`,
  ]);
  // Two hosts that bind one driver identity are not two hosts.
  assert.deepEqual(profileFindings(nodeProfile, { ...candidateProfile, driver: nodeProfile?.driver }), [
    "the two hosts bind the same driver identity",
  ]);
});

test("the child environment carries no test-runner context", (t) => {
  const repo = repositoryFixture(t);
  const environment = childEnvironment(repo, repo.merge);
  assert.equal(environment.NODE_TEST_CONTEXT, undefined);
  // The marker the test runner sets in this process is what a child would
  // inherit, and a child that inherits it reports as a test child instead of
  // running its case.
  assert.ok(process.env.NODE_TEST_CONTEXT, "the test runner marks its children");
  const root = mkdtempSync(join(tmpdir(), "superman-transition-context-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "case.test.ts"),
    'import { test } from "node:test";\ntest("the case runs", () => {\n  console.log("CASE-RAN");\n});\n',
  );
  const inherited = runOwned(process.execPath, ["--test", "case.test.ts"], {
    cwd: root,
    env: { ...isolated },
    encoding: "utf8",
    shell: false,
  });
  const cleaned = runOwned(process.execPath, ["--test", "case.test.ts"], {
    cwd: root,
    env: { ...isolated, NODE_TEST_CONTEXT: undefined },
    encoding: "utf8",
    shell: false,
  });
  assert.ok(!inherited.stdout.includes("CASE-RAN"), "a child that inherits the marker reports as a test child");
  assert.ok(cleaned.stdout.includes("CASE-RAN"), "a child without the marker runs its case");
});
