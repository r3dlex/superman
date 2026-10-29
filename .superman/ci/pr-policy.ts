#!/usr/bin/env node
// M1 interim PR policy (G4 path policy, G8 traceability, G9 placeholder).
// Runs on Node 26 type stripping, no dependencies. Ticket 06 (M7) replaces it
// with `superman gate ci`. Protected path: changes only in spec-kind PRs.
import { execFileSync } from "node:child_process";

const PROTECTED = [
  ".archgate/**",
  "docs/adr/**",
  ".claude/settings.json",
  "superman.lock.json",
  "superman.*.json",
  ".github/workflows/**",
  "CODEOWNERS",
  ".superman/**",
];
// Spec-kind (Gate 1) PRs: specs, decisions, rules, glossary, config, CI and the
// rest of the protected list, plus the npm setup files. Never source code.
const SPEC_EXTRA = [
  "GLOSSARY.md",
  "CONTEXT.md",
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  ".gitignore",
];
const CHORE_SKILLS = [
  "superman.lock.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  ".claude/skills/**",
  ".agents/skills/**",
];
const RATCHET = "superman.ratchet.json";

type Finding = { file?: string; message: string };

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024 });
}

function gitOk(args: string[]): boolean {
  try {
    execFileSync("git", args, { stdio: "ignore", shell: false });
    return true;
  } catch {
    return false;
  }
}

function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      out += ".*";
      i++;
    } else if (c === "*") {
      out += "[^/]*";
    } else {
      out += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(file));
}

function readAt(rev: string, file: string): string | null {
  try {
    return git(["show", `${rev}:${file}`]);
  } catch {
    return null;
  }
}

function checkRatchet(base: string): Finding[] {
  const before = readAt(base, RATCHET);
  const after = readAt("HEAD", RATCHET);
  if (before === null || after === null) {
    return [{ file: RATCHET, message: "Creating or deleting the ratchet file needs a spec-kind PR" }];
  }
  const findings: Finding[] = [];
  let a: Record<string, unknown>;
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(before) as Record<string, unknown>;
    a = JSON.parse(after) as Record<string, unknown>;
  } catch {
    return [{ file: RATCHET, message: "Ratchet file is not valid JSON" }];
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const was = b[key];
    const now = a[key];
    if (was === now) continue;
    if (typeof was !== "number" || typeof now !== "number") {
      findings.push({ file: RATCHET, message: `Ratchet key "${key}" added, removed or not numeric: needs a spec-kind PR` });
    } else if (key.startsWith("mutationScore") && now < was) {
      findings.push({ file: RATCHET, message: `${key} lowered ${was} -> ${now}; ticket PRs may only raise it` });
    } else if (key.startsWith("jscpd") && now > was) {
      findings.push({ file: RATCHET, message: `${key} raised ${was} -> ${now}; ticket PRs may only lower it` });
    } else if (!key.startsWith("mutationScore") && !key.startsWith("jscpd")) {
      findings.push({ file: RATCHET, message: `Unknown ratchet key "${key}" changed: needs a spec-kind PR` });
    }
  }
  return findings;
}

function onlyStatusLineChanged(base: string, file: string): boolean {
  const diff = git(["diff", "-U0", "--no-renames", `${base}...HEAD`, "--", file]);
  const changed = diff
    .split("\n")
    .filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"));
  return changed.length > 0 && changed.every((l) => /^[+-](\*\*)?Status:(\*\*)?\s/.test(l));
}

function main(): number {
  const headRef = process.env.HEAD_REF ?? "";
  const baseRef = process.env.BASE_REF || "main";
  const base = `origin/${baseRef}`;
  const files = git(["diff", "--name-only", "--no-renames", `${base}...HEAD`])
    .split("\n")
    .filter((f) => f !== "");
  const findings: Finding[] = [];
  const notes: string[] = [];

  const spec = /^spec\/([a-z0-9][a-z0-9-]*)$/.exec(headRef);
  const ticket = /^ticket\/([a-z0-9][a-z0-9-]*)-(\d{2,})$/.exec(headRef);
  const chore = /^chore\/skills-[a-z0-9-]+$/.test(headRef);

  if (spec) {
    const allowed = [`.scratch/${spec[1]}/**`, ...PROTECTED, ...SPEC_EXTRA];
    for (const f of files) {
      if (!matchesAny(f, allowed)) findings.push({ file: f, message: "spec-kind PRs may not change this path (no source code at Gate 1)" });
    }
    notes.push(`kind: spec (${spec[1]})`, "G8 traceability: n/a (spec-kind)", "G9 test-first: n/a (spec-kind)");
  } else if (ticket) {
    const [, slug, nn] = ticket;
    const ticketDir = `.scratch/${slug}/issues/`;
    const onBase = git(["ls-tree", "--name-only", base, ticketDir])
      .split("\n")
      .filter((f) => f.startsWith(`${ticketDir}${nn}-`) && f.endsWith(".md"));
    // G8: the ticket and its spec exist on the base branch.
    if (!gitOk(["cat-file", "-e", `${base}:.scratch/${slug}/spec.md`])) {
      findings.push({ message: `G8: .scratch/${slug}/spec.md does not exist on ${base}` });
    }
    if (onBase.length !== 1) {
      findings.push({ message: `G8: expected exactly one ${ticketDir}${nn}-*.md on ${base}, found ${onBase.length}` });
    }
    const ticketFile = onBase[0];
    // G4: no protected paths; ratchet may only tighten; only the own ticket's Status line.
    for (const f of files) {
      if (f === RATCHET) {
        findings.push(...checkRatchet(base));
      } else if (matchesAny(f, PROTECTED)) {
        findings.push({ file: f, message: "G4: ticket PRs may not touch protected paths (use a spec-kind follow-up PR)" });
      } else if (f.startsWith(".scratch/")) {
        if (f !== ticketFile || !onlyStatusLineChanged(base, f)) {
          findings.push({ file: f, message: "G4: ticket PRs may only edit the Status line of their own ticket" });
        }
      }
    }
    let kind = "behavior";
    if (ticketFile) {
      const text = readAt(base, ticketFile) ?? "";
      const m = /^(\*\*)?Kind:(\*\*)?\s*(\S+)/m.exec(text);
      if (m && m[3] !== "behavior" && m[3] !== "refactor") {
        findings.push({ file: ticketFile, message: `Kind must be behavior or refactor, found "${m[3]}"` });
      }
      kind = m ? m[3] : "behavior (default)";
    }
    notes.push(`kind: ticket (${slug} #${nn}, Kind: ${kind})`, "G9 test-first: n/a (raw check lands with ticket 01, enforced by superman from ticket 05)");
  } else if (chore) {
    for (const f of files) {
      if (!matchesAny(f, CHORE_SKILLS)) findings.push({ file: f, message: "chore/skills-* PRs may only change the lock and the skill catalogs" });
    }
    notes.push("kind: chore/skills", "G8 traceability: n/a (chore)", "G9 test-first: n/a (chore)");
  } else {
    findings.push({ message: `Unknown PR kind for branch "${headRef}"; use spec/<slug>, ticket/<slug>-<nn> or chore/skills-<name>` });
  }

  for (const n of notes) console.log(n);
  console.log(`changed files: ${files.length}`);
  for (const f of findings) {
    const where = f.file ? ` file=${f.file}` : "";
    console.log(`::error${where}::${f.message}`);
  }
  console.log(findings.length === 0 ? "pr-policy: pass" : `pr-policy: fail (${findings.length})`);
  return findings.length === 0 ? 0 : 1;
}

process.exitCode = main();
