#!/usr/bin/env node
// M1 bootstrap PR policy (G4 path policy and G8 traceability).
// G9 replay is evaluated separately by raw-gates.ts, never waived here.
// Runs on Node 26 type stripping, no dependencies. Ticket 06 (M7) replaces it
// with `superman gate ci`. Protected path: changes only in spec-kind PRs.
import { execFileSync } from "node:child_process";
import { posix } from "node:path";
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
  "**/.pnpmfile.*",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "**/.gitignore",
  ".mcp.json",
  ".codex/config.toml",
  "opencode.json",
  "opencode.jsonc",
  "**/tsconfig*.json",
  "**/vitest.config.*",
  "**/stryker.config.*",
  "**/knip.json",
  "**/.jscpd.json",
  ".claude-plugin/**",
  ".codex-plugin/**",
  ".agents/plugins/**",
];
// Spec-kind (Gate 1) PRs: specs, decisions, rules, glossary, config, CI and the
// rest of the protected list, plus the npm setup files. Never source code.
const SPEC_EXTRA = ["GLOSSARY.md", "CONTEXT.md", "README.md", "package.json", "pnpm-lock.yaml", ".gitignore"];
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
const candidate = process.env.HEAD_SHA || "HEAD";

type Finding = { file?: string; message: string };

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
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
      if (glob[i + 2] === "/") {
        out += "(?:[\\s\\S]*/)?";
        i += 2;
      } else {
        out += "[\\s\\S]*";
        i++;
      }
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

// JSONC policy is parsed without treating comment markers inside strings as comments.
function readJSONC(text: string): Record<string, unknown> {
  let cleaned = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      cleaned += c;
      if (c === "\\") cleaned += text[++i] ?? "";
      else if (c === '"') quoted = false;
    } else if (c === '"') {
      quoted = true;
      cleaned += c;
    } else if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
      cleaned += "\n";
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) throw new Error("Unterminated policy comment");
      cleaned += " ";
      i = end + 1;
    } else {
      if (c === "}" || c === "]") cleaned = cleaned.replace(/,\s*$/u, "");
      cleaned += c;
    }
  }
  const value: unknown = JSON.parse(cleaned);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a policy object");
  return value as Record<string, unknown>;
}

function effectivePolicy(base: string): { paths: Set<string>; findings: Finding[]; globs: string[] } {
  const paths = new Set<string>();
  const findings: Finding[] = [];
  const globs = [...PROTECTED];
  const configName =
    /(^|\/)(?:tsconfig[^/]*\.json|biome\.jsonc?|vitest\.config\.[^/]+|stryker\.config\.[^/]+|knip\.jsonc?|\.jscpd\.json|\.pnpmfile\.[cm]?js|\.?lefthook[^/]*\.(?:ya?ml|toml|json))$/u;
  for (const revision of [base, candidate]) {
    const tree = new Map(
      git(["ls-tree", "-r", "-z", revision])
        .split("\0")
        .filter(Boolean)
        .map((entry) => {
          const tab = entry.indexOf("\t");
          return [entry.slice(tab + 1), entry.slice(0, tab)] as const;
        }),
    );
    const visited = new Set<string>();
    const visit = (file: string): void => {
      if (visited.has(file)) return;
      visited.add(file);
      paths.add(file);
      if (matchesAny(file, KNOWLEDGE)) {
        findings.push({ file, message: "G4: Governing policy cannot live under writable knowledge roots" });
      }
      if (!/^100(?:644|755) /u.test(tree.get(file) ?? "")) {
        findings.push({
          file,
          message: "G4: Effective policy inputs must exist as regular files, not aliases or symlinks",
        });
        return;
      }
      const text = readAt(revision, file) ?? "";
      const refs: string[] = [];
      try {
        if (/\.jsonc?$/u.test(file)) {
          const data = readJSONC(text);
          if (data.extends !== undefined) {
            const values = Array.isArray(data.extends) ? data.extends : [data.extends];
            if (!values.every((ref) => typeof ref === "string")) throw new Error("Invalid policy extends");
            refs.push(...(values as string[]));
          }
          if (Array.isArray(data.references))
            for (const ref of data.references) {
              if (!ref || typeof ref.path !== "string") throw new Error("Invalid compiler reference");
              refs.push(ref.path.startsWith(".") ? ref.path : `./${ref.path}`);
            }
        } else if (/\.[cm]?[jt]sx?$/u.test(file)) {
          // Static config imports form a conservative closure. Dynamic file loading
          // needs reviewed explicit modeling, never an optimistic ticket-time guess.
          if (
            [...text.matchAll(/"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'|[/`]/gu)].some(
              ([token]) => token === "/" || token === "`",
            )
          )
            throw new Error(
              "Executable policy comments, slash expressions and templates require reviewed lexical modeling",
            );
          for (const match of text.matchAll(
            /(?:^|[;\n])\s*(?:import\s+(?:[^;]*?\sfrom\s*)?|export\s+[^;]*?\sfrom\s*)["']([^"']+)["']|\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/gu,
          ))
            refs.push(match[1] ?? match[2]);
          if (
            /\b(?:import|require)\s*\(\s*[^\s"']|\b(?:readFile(?:Sync)?|readdir(?:Sync)?|globSync)\s*\(/u.test(text)
          ) {
            throw new Error("Dynamic policy input loading is not modeled by the bootstrap");
          }
        } else {
          // No hook configuration is installed at bootstrap. Refuse unknown include
          // syntax rather than claiming a complete TOML/YAML/remote resolver.
          if (/\b(?:extends|include|configs?|remotes?)\s*[:=]/u.test(text))
            throw new Error("Hook include/remote closure requires reviewed activation");
        }
        for (const ref of refs) {
          if (ref.includes("\\")) throw new Error("Escaped policy identities require reviewed input modeling");
          if (/^(?:node:)?fs(?:\/promises)?$/u.test(ref)) {
            throw new Error("Filesystem policy loading requires reviewed input modeling, including aliased reads");
          }
          if (/^(?:node:)?module$/u.test(ref))
            throw new Error("Module-loader policy inputs require reviewed modeling, including aliased loaders");
          if (posix.isAbsolute(ref) || (ref.includes(":") && !ref.startsWith("node:")))
            throw new Error("Absolute/URL policy inputs require reviewed input modeling");
          const packageName = JSON.parse(readAt(revision, "package.json") ?? "{}").name;
          if (
            ref.startsWith("#") ||
            (typeof packageName === "string" && (ref === packageName || ref.startsWith(`${packageName}/`)))
          ) {
            throw new Error("Local package policy aliases require reviewed input modeling");
          }
          if (!ref.startsWith(".")) continue; // Package inputs are frozen by the protected lockfile.
          const relative = posix.normalize(posix.join(posix.dirname(file), ref));
          if (relative.startsWith("../") || posix.isAbsolute(relative))
            throw new Error("Policy input escapes the repository");
          const resolved = [
            relative,
            `${relative}.json`,
            `${relative}.ts`,
            `${relative}.js`,
            `${relative}/tsconfig.json`,
            `${relative}/index.ts`,
          ].find((path) => tree.has(path));
          if (!resolved) throw new Error(`Unresolved local policy input ${ref}`);
          visit(resolved);
        }
      } catch (error) {
        findings.push({
          file,
          message: `G4: Cannot establish effective policy: ${error instanceof Error ? error.message : "invalid config"}`,
        });
      }
    };
    for (const file of tree.keys()) if (configName.test(file)) visit(file);
    const inventory = readAt(revision, ".superman/ci/bootstrap.json");
    if (inventory !== null) {
      try {
        const declared = JSON.parse(inventory).policyInputs;
        if (
          !Array.isArray(declared) ||
          !declared.every(
            (file) => typeof file === "string" && !file.startsWith("/") && !file.split("/").includes(".."),
          )
        )
          throw new Error("Invalid policy input inventory");
        for (const file of declared) visit(file);
      } catch {
        findings.push({
          file: ".superman/ci/bootstrap.json",
          message: "G4: Cannot establish reviewed policy input inventory",
        });
      }
    }
    const configured = readAt(revision, "superman.config.json");
    if (configured !== null) {
      try {
        const data = JSON.parse(configured);
        const extra = data.paths?.protected ?? [];
        if (!Array.isArray(extra) || !extra.every((item) => typeof item === "string"))
          throw new Error("Invalid paths.protected");
        globs.push(...extra);
      } catch {
        findings.push({ file: "superman.config.json", message: "G4: Cannot establish configured protected paths" });
      }
    }
  }
  return { paths, findings, globs };
}

function checkRatchet(base: string): Finding[] {
  const before = readAt(base, RATCHET);
  const after = readAt(candidate, RATCHET);
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
      findings.push({
        file: RATCHET,
        message: `Ratchet key "${key}" added, removed or not numeric: needs a spec-kind PR`,
      });
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
  const diff = git(["diff", "-U0", "--no-renames", `${base}...${candidate}`, "--", file]);
  const changed = diff
    .split("\n")
    .filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"));
  return changed.length > 0 && changed.every((l) => /^[+-](\*\*)?Status:(\*\*)?\s/.test(l));
}

function checkHookToolPolicy(base: string): Finding[] {
  for (const rev of [base, candidate]) {
    const mode = git(["ls-tree", rev, "--", "package.json"]);
    if (mode && !/^100(?:644|755) /u.test(mode)) {
      return [{ file: "package.json", message: "G4: Package policy must be a regular file, never a symlink" }];
    }
  }
  const fields = [
    ["devDependencies", "lefthook"],
    ["dependencies", "lefthook"],
    ["optionalDependencies", "lefthook"],
    ["packageManager"],
    ["pnpm"],
    ...["preinstall", "install", "postinstall", "preprepare", "prepare", "postprepare", "prepublish"].map((name) => [
      "scripts",
      name,
    ]),
  ];
  const gateFields = [
    ["engines", "node"],
    ["scripts", "coverage"],
    ["overrides"],
    ["resolutions"],
    ...["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].flatMap((section) =>
      [
        "archgate",
        "tsrs",
        "typescript",
        "@biomejs/biome",
        "vitest",
        "@vitest/coverage-v8",
        "c8",
        "knip",
        "jscpd",
        "@stryker-mutator/core",
        "@stryker-mutator/vitest-runner",
        "@types/node",
      ].map((name) => [section, name]),
    ),
  ];
  try {
    const before: unknown = JSON.parse(readAt(base, "package.json") ?? "{}");
    const after: unknown = JSON.parse(readAt(candidate, "package.json") ?? "{}");
    const field = (value: unknown, path: string[]): unknown =>
      path.reduce<unknown>(
        (item, key) => (item !== null && typeof item === "object" ? (item as Record<string, unknown>)[key] : undefined),
        value,
      );
    return [...fields, ...gateFields]
      .filter((path) => !isDeepStrictEqual(field(before, path), field(after, path)))
      .map((path) => ({
        file: "package.json",
        message: fields.includes(path)
          ? `G4: Lefthook pin or lifecycle policy /${path.join("/")} needs a spec-kind PR`
          : `G4: Protected package field /${path.join("/")} needs a spec-kind PR`,
      }));
  } catch {
    return [
      { file: "package.json", message: "G4: Cannot verify Lefthook pin or lifecycle policy in invalid package JSON" },
    ];
  }
}

function checkConfiguredFields(base: string): Finding[] {
  const findings: Finding[] = [];
  for (const revision of [base, candidate]) {
    const text = readAt(revision, "superman.config.json");
    if (text === null) continue;
    try {
      const entries = JSON.parse(text).paths?.protectedFields ?? [];
      if (!Array.isArray(entries)) throw new Error("Expected protectedFields array");
      for (const entry of entries) {
        if (
          !entry ||
          typeof entry.file !== "string" ||
          !Array.isArray(entry.pointers) ||
          entry.file.startsWith("/") ||
          entry.file.split("/").includes("..")
        )
          throw new Error("Invalid protected field declaration");
        for (const rev of [base, candidate]) {
          const mode = git(["ls-tree", rev, "--", entry.file]);
          if (mode && !/^100(?:644|755) /u.test(mode)) {
            findings.push({
              file: entry.file,
              message: "G4: Protected-field files must be regular files, never symlinks",
            });
          }
        }
        const before = readAt(base, entry.file);
        const after = readAt(candidate, entry.file);
        const a: unknown = before === null ? undefined : JSON.parse(before);
        const b: unknown = after === null ? undefined : JSON.parse(after);
        for (const pointer of entry.pointers) {
          if (typeof pointer !== "string" || (pointer !== "" && !pointer.startsWith("/")) || /~(?![01])/u.test(pointer))
            throw new Error("Invalid JSON pointer");
          const keys =
            pointer === ""
              ? []
              : pointer
                  .slice(1)
                  .split("/")
                  .map((key: string) => key.replace(/~1/gu, "/").replace(/~0/gu, "~"));
          const select = (value: unknown) =>
            keys.reduce(
              (item: unknown, key: string): unknown =>
                item !== null && typeof item === "object" && Object.hasOwn(item, key)
                  ? (item as Record<string, unknown>)[key]
                  : undefined,
              value,
            );
          if (!isDeepStrictEqual(select(a), select(b)))
            findings.push({
              file: entry.file,
              message: `G4: Protected field ${pointer} added, removed or changed; needs a spec-kind PR`,
            });
        }
      }
    } catch {
      findings.push({
        file: "superman.config.json",
        message: "G4: Cannot verify protected fields; invalid declaration or referenced JSON",
      });
    }
  }
  return findings;
}

function main(): number {
  const headRef = process.env.HEAD_REF ?? "";
  const baseRef = process.env.BASE_REF || "main";
  const base = process.env.BASE_SHA || `origin/${baseRef}`;
  for (const sha of [process.env.HEAD_SHA, process.env.BASE_SHA]) {
    if (sha && !/^[a-f0-9]{40}$/u.test(sha)) throw new Error("Event revisions must be full commit SHAs");
  }
  const files = git(["diff", "--name-only", "-z", "--no-renames", `${base}...${candidate}`])
    .split("\0")
    .filter((f) => f !== "");
  const findings: Finding[] = [];
  const notes: string[] = [];
  const policy = effectivePolicy(base);
  findings.push(...policy.findings);
  // Inspect the committed tree, not the checkout's possibly followed symlinks.
  const identities = new Map<string, string>();
  for (const entry of git(["ls-tree", "-r", "-z", candidate]).split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    const file = entry.slice(tab + 1);
    const identity = file.normalize("NFC").toLowerCase();
    if (identities.has(identity))
      findings.push({ file, message: `G4: Case/Unicode path collision with ${identities.get(identity)}` });
    identities.set(identity, file);
    if (matchesAny(identity, PROTECTED) && !matchesAny(file, PROTECTED)) {
      findings.push({ file, message: "G4: Case/Unicode alias of a protected policy path" });
    }
    if (/^(?:wiki(?:\/|$)|\.superman\/vault\/candidates(?:\/|$))/u.test(identity) && !/^100(644|755) /u.test(entry)) {
      findings.push({ file, message: "G4: Knowledge paths must be regular files, never symlinks or submodules" });
    }
  }

  const spec = /^spec\/([a-z0-9][a-z0-9-]*)$/.exec(headRef);
  const ticket = /^ticket\/([a-z0-9][a-z0-9-]*)-(\d{2,})$/.exec(headRef);
  const chore = /^chore\/skills-[a-z0-9-]+$/.test(headRef);
  const wikiChore = /^chore\/wiki-[a-z0-9-]+$/.test(headRef);

  if (!spec) findings.push(...checkConfiguredFields(base));

  if (spec) {
    const allowed = [`.scratch/${spec[1]}/**`, ...policy.globs, ...policy.paths, ...SPEC_EXTRA, ...KNOWLEDGE];
    for (const f of files) {
      if (f === "src" || f.startsWith("src/") || !matchesAny(f, allowed))
        findings.push({ file: f, message: "spec-kind PRs may not change this path (no source code at Gate 1)" });
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
        findings.push({
          file: f,
          message: "G4: knowledge tickets may only change wiki/candidate content and their own Status line",
        });
      } else if (f === RATCHET) {
        findings.push(...checkRatchet(base));
      } else if (f === "package.json" && !policy.paths.has(f)) {
        findings.push(...checkHookToolPolicy(base));
      } else if (policy.paths.has(f) || (matchesAny(f, policy.globs) && !matchesAny(f, KNOWLEDGE))) {
        findings.push({
          file: f,
          message: "G4: ticket PRs may not touch protected paths (use a spec-kind follow-up PR)",
        });
      } else if (f.startsWith(".scratch/")) {
        if (f !== ticketFile || !onlyStatusLineChanged(base, f)) {
          findings.push({ file: f, message: "G4: ticket PRs may only edit the Status line of their own ticket" });
        }
      }
    }
    notes.push(
      `kind: ticket (${slug} #${nn}, Kind: ${kind})`,
      kind === "knowledge"
        ? "G9 test-first: n/a (knowledge-only ticket)"
        : "G9 test-first: delegated to raw-gates.ts (not evaluated by pr-policy)",
    );
  } else if (chore) {
    for (const f of files) {
      if (!matchesAny(f, CHORE_SKILLS))
        findings.push({
          file: f,
          message: "chore/skills-* PRs may only change canonical skills, thin manifests/catalogs, lock and wiki/log.md",
        });
    }
    notes.push("kind: chore/skills", "G8 traceability: n/a (chore)", "G9 test-first: n/a (chore)");
  } else if (wikiChore) {
    for (const f of files) {
      if (!matchesAny(f, KNOWLEDGE))
        findings.push({ file: f, message: "G4: chore/wiki-* PRs may only change wiki and candidate content" });
    }
    notes.push("kind: chore/wiki", "G8 traceability: n/a (chore)", "G9 test-first: n/a (knowledge-only chore)");
  } else {
    findings.push({
      message: `Unknown PR kind for branch "${headRef}"; use spec/<slug>, ticket/<slug>-<nn>, chore/skills-<name> or chore/wiki-<name>`,
    });
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
