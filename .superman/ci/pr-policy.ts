#!/usr/bin/env node
// M1 interim PR policy (G4 path policy, G8 traceability, G9 placeholder).
// Runs on Node 26 type stripping, no dependencies. Ticket 06 (M7) replaces it
// with `superman gate ci`. Protected path: changes only in spec-kind PRs.
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const PROTECTED = [
  ".archgate/**",
  "docs/adr/**",
  ".claude/settings.json",
  "superman.lock.json",
  "superman.*.json",
  ".github/workflows/**",
  ".github/hooks/**",
  "CODEOWNERS",
  ".superman/**",
  ".superman/vault/vault.json",
  ".superman/vault/raw/**",
  "biome.json",
  "biome.jsonc",
  "lefthook*",
  ".lefthook*",
  ".config/lefthook*",
  ".config/lefthook/**",
  ".npmrc",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  ".mcp.json",
  ".codex/config.toml",
  "opencode.json",
  "opencode.jsonc",
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
  "skills/**",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "wiki/log.md",
];
const RATCHET = "superman.ratchet.json";
// Content only, never a carve-out for vault policy or raw source imports.
const KNOWLEDGE = ["wiki/**.md", ".superman/vault/candidates/**.md"];

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
      out += "[\\s\\S]*";
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

function checkHookToolPolicy(base: string): Finding[] {
  const fields = [
    ["devDependencies", "lefthook"], ["dependencies", "lefthook"],
    ["optionalDependencies", "lefthook"], ["packageManager"], ["pnpm"],
    ...["preinstall", "install", "postinstall", "preprepare", "prepare", "postprepare", "prepublish"].map((name) => ["scripts", name]),
  ];
  try {
    const before: unknown = JSON.parse(readAt(base, "package.json") ?? "{}");
    const after: unknown = JSON.parse(readAt("HEAD", "package.json") ?? "{}");
    const field = (value: unknown, path: string[]): unknown => path.reduce<unknown>((item, key) =>
      item !== null && typeof item === "object" ? (item as Record<string, unknown>)[key] : undefined, value);
    return fields.filter((path) => !isDeepStrictEqual(field(before, path), field(after, path)))
      .map((path) => ({ file: "package.json", message: `G4: Lefthook pin or lifecycle policy /${path.join("/")} needs a spec-kind PR` }));
  } catch {
    return [{ file: "package.json", message: "G4: Cannot verify Lefthook pin or lifecycle policy in invalid package JSON" }];
  }
}

function main(): number {
  const headRef = process.env.HEAD_REF ?? "";
  const baseRef = process.env.BASE_REF || "main";
  const base = `origin/${baseRef}`;
  const files = git(["diff", "--name-only", "-z", "--no-renames", `${base}...HEAD`])
    .split("\0")
    .filter((f) => f !== "");
  const findings: Finding[] = [];
  const notes: string[] = [];
  // Inspect the committed tree, not the checkout's possibly followed symlinks.
  for (const entry of git(["ls-tree", "-r", "-z", "HEAD", "--", "wiki", ".superman/vault/candidates"]).split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    if (!/^100(644|755) /u.test(entry)) {
      findings.push({ file: entry.slice(tab + 1), message: "G4: Knowledge paths must be regular files, never symlinks or submodules" });
    }
  }

  const spec = /^spec\/([a-z0-9][a-z0-9-]*)$/.exec(headRef);
  const ticket = /^ticket\/([a-z0-9][a-z0-9-]*)-(\d{2,})$/.exec(headRef);
  const chore = /^chore\/skills-[a-z0-9-]+$/.test(headRef);
  const wikiChore = /^chore\/wiki-[a-z0-9-]+$/.test(headRef);

  if (spec) {
    const allowed = [`.scratch/${spec[1]}/**`, ...PROTECTED, ...SPEC_EXTRA, ...KNOWLEDGE];
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
    let kind = "behavior";
    if (ticketFile) {
      const text = readAt(base, ticketFile) ?? "";
      const m = /^(\*\*)?Kind:(\*\*)?\s*(\S+)/m.exec(text);
      if (m && !["behavior", "refactor", "knowledge"].includes(m[3])) {
        findings.push({ file: ticketFile, message: `Kind must be behavior, refactor or knowledge, found "${m[3]}"` });
      }
      kind = m ? m[3] : "behavior (default)";
    }
    // G4: no protected paths; ratchet may only tighten; only the own ticket's Status line.
    for (const f of files) {
      if (kind === "knowledge" && !matchesAny(f, KNOWLEDGE) && !(f === ticketFile && onlyStatusLineChanged(base, f))) {
        findings.push({ file: f, message: "G4: knowledge tickets may only change wiki/candidate content and their own Status line" });
      } else if (f === RATCHET) {
        findings.push(...checkRatchet(base));
      } else if (f === "package.json") {
        findings.push(...checkHookToolPolicy(base));
      } else if (matchesAny(f, PROTECTED) && !matchesAny(f, KNOWLEDGE)) {
        findings.push({ file: f, message: "G4: ticket PRs may not touch protected paths (use a spec-kind follow-up PR)" });
      } else if (f.startsWith(".scratch/")) {
        if (f !== ticketFile || !onlyStatusLineChanged(base, f)) {
          findings.push({ file: f, message: "G4: ticket PRs may only edit the Status line of their own ticket" });
        }
      }
    }
    notes.push(`kind: ticket (${slug} #${nn}, Kind: ${kind})`, kind === "knowledge"
      ? "G9 test-first: n/a (knowledge-only ticket)"
      : "G9 test-first: n/a (raw check lands with ticket 01, enforced by superman from ticket 05)");
  } else if (chore) {
    for (const f of files) {
      if (!matchesAny(f, CHORE_SKILLS)) findings.push({ file: f, message: "chore/skills-* PRs may only change canonical skills, thin manifests/catalogs, lock and wiki/log.md" });
    }
    notes.push("kind: chore/skills", "G8 traceability: n/a (chore)", "G9 test-first: n/a (chore)");
  } else if (wikiChore) {
    for (const f of files) {
      if (!matchesAny(f, KNOWLEDGE)) findings.push({ file: f, message: "G4: chore/wiki-* PRs may only change wiki and candidate content" });
    }
    notes.push("kind: chore/wiki", "G8 traceability: n/a (chore)", "G9 test-first: n/a (knowledge-only chore)");
  } else {
    findings.push({ message: `Unknown PR kind for branch "${headRef}"; use spec/<slug>, ticket/<slug>-<nn>, chore/skills-<name> or chore/wiki-<name>` });
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
