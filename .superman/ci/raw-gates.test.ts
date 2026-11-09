// Bootstrap process seam; these tests depend on all product source (src/**).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve, sep } from "node:path";
import { type TestContext, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fixtureEnvironment } from "./fixture-env.ts";
import { fixture, GATE_CHILD_TIMEOUT, interceptPnpm } from "./raw-fixture.ts";

/** The reviewed repository, whose rule sources a fixture copies. */
const repository = resolve(import.meta.dirname, "../..");

test("spec-kind G9 is explicitly inapplicable and records evaluated revisions", (t) => {
  const repo = fixture(t, "spec/demo");
  const candidateSha = repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.verdict, "partial-feedback");
  assert.equal(result.receipt.satisfiesFullBar, false);
  assert.equal(result.receipt.baseSha, repo.baseSha);
  assert.equal(result.receipt.evaluatedSha, candidateSha);
  assert.deepEqual(result.receipt.results, [{ gate: "G9", status: "n/a", reason: "spec-kind" }]);
  assert.equal(result.receipt.behaviorReplay, undefined);
});

test("G9 replays an assertion regression through the pinned real Vitest process", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest';\nimport { value } from '../src/value.ts';\ntest('new behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  const candidateSha = repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  const replay = result.receipt.behaviorReplay;
  assert.equal(replay.baseSha, repo.baseSha);
  assert.equal(replay.candidateSha, candidateSha);
  assert.deepEqual(replay.tests, ["test/value.test.ts"]);
  assert.match(replay.testInputsHash, /^[a-f0-9]{64}$/u);
  assert.equal(replay.baseOutcome.status, "fail");
  assert.equal(replay.baseOutcome.category, "assertion");
  assert.equal(replay.candidateOutcome.status, "pass");
  assert.equal(replay.candidateOutcome.testsCompleted, 1);
});

test("G9 knowledge applicability comes from the approved-base ticket for content-only work", (t) => {
  const repo = fixture(t, "ticket/demo-01", "knowledge");
  repo.write("wiki/lesson.md", "# Proposed knowledge\n\nContent follows the approved-base Kind.\n");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.receipt.results, [{ gate: "G9", status: "n/a", reason: "knowledge-only ticket" }]);
  assert.equal(result.receipt.behaviorReplay, undefined);
});

test("standalone G9 cannot bypass G4 by reclassifying its approved-base knowledge ticket", (t) => {
  const repo = fixture(t, "ticket/demo-01", "knowledge");
  repo.write(".scratch/demo/issues/01-feature.md", "# Ticket\n\n**Kind:** behavior\n");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.verdict, "fail");
  assert.match(result.output, /G4:/u);
  assert.match(result.output, /knowledge|Status/u);
  assert.equal(result.receipt.behaviorReplay, undefined);
});

test("G9 refuses dirty inputs instead of claiming committed revisions tested the checkout", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("src/value.ts", "export const value = 9; // uncommitted\n");
  const before = repo.git("status", "--porcelain=v1");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty/u);
  assert.equal(result.receipt.verdict, "fail");
  assert.equal(repo.git("status", "--porcelain=v1"), before);
});

test("an uncommitted document does not fail a run whose measurement it cannot affect", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("GLOSSARY.md", "# Glossary\n\nAn uncommitted term.\n");
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.inputIntegrity.status, "pass");
  assert.equal(result.receipt.inputIntegrity.scope, "gate-inputs");
});

test("a modified document does not fail a run whose measurement it cannot affect", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write("GLOSSARY.md", "# Glossary\n\nA committed term.\n");
  repo.commit();
  repo.write("GLOSSARY.md", "# Glossary\n\nAn edited term.\n");
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.inputIntegrity.status, "pass");
});

test("the CI leg refuses a tree it did not commit, document or not", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  const head = repo.commit();
  repo.git("switch", "--quiet", "main");
  repo.write("README.md", "new approved base\n");
  const base = repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", base);
  repo.git("merge", "--quiet", "--no-ff", "-m", "test integration", "ticket/demo-01");
  const merge = repo.git("rev-parse", "HEAD").trim();
  const eventPath = join(repo.root, ".git/event.json");
  writeFileSync(
    eventPath,
    JSON.stringify({
      pull_request: {
        head: { sha: head, ref: "ticket/demo-01" },
        base: { sha: base, ref: "main" },
        merge_commit_sha: merge,
      },
    }),
  );
  repo.write("GLOSSARY.md", "# An uncommitted document\n");
  const result = repo.run([], {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_SHA: merge,
  });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inputs changed during raw checks/u);
  assert.equal(result.receipt.inputIntegrity.status, "fail");
  assert.equal(result.receipt.inputIntegrity.scope, "whole-tree");
});

test("a run whose gate reads the whole tree binds the whole tree", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("GLOSSARY.md", "# An uncommitted document\n");
  const result = repo.runGate("G1");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.equal(result.receipt.inputIntegrity.scope, "whole-tree");
});

test("a staged file the commit does not hold fails the run that would read it", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("src/staged.ts", "export const staged = 1;\n");
  repo.git("add", "src/staged.ts");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /src\/staged\.ts/u);
});

test("an untracked source file fails the run that would measure it", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("src/extra.ts", "export const extra = 1;\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /src\/extra\.ts/u);
});

test("an uncommitted policy input fails the run that would measure it", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write("tsconfig.json", '{"compilerOptions":{"strict":false}}\n');
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /tsconfig\.json/u);
});

test("an uncommitted test file fails the run that would replay it", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(2));\n",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /test\/value\.test\.ts/u);
});

test("an uncommitted ignore rule fails the run it would measure", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  repo.write(".gitignore", "node_modules\n.tools/\nsrc/\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /\.gitignore/u);
});

test("an uncommitted rule source fails the run it would judge with", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(".archgate/adrs/SUP-001-rule.md", "# Reviewed rule\n");
  repo.commit();
  repo.write(".archgate/adrs/SUP-001-rule.md", "# Edited rule\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /dirty inputs/u);
  assert.match(result.output, /SUP-001-rule\.md/u);
});

test("raw checks reject hidden worktree bytes while preserving caller index flags", (t) => {
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    const repo = fixture(t);
    repo.write("src/value.ts", "export const value = 9;\n");
    repo.write(
      "test/value.test.ts",
      'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test("committed behavior", () => expect(value).toBe(1));\n',
    );
    const head = repo.commit();
    repo.git("update-index", flag, "src/value.ts");
    repo.write("src/value.ts", "export const value = 1;\n");
    assert.equal(repo.git("status", "--porcelain"), "", "Git status alone must miss this fixture");
    const index = readFileSync(join(repo.root, ".git/index"));
    const result = repo.runGate("G2");
    assert.equal(result.status, 1, `${flag}\n${result.output}`);
    assert.equal(result.receipt.verdict, "fail");
    assert.match(result.output, /dirty inputs|committed snapshot/u);
    assert.equal(readFileSync(join(repo.root, "src/value.ts"), "utf8"), "export const value = 1;\n");
    assert.equal(repo.git("rev-parse", "HEAD").trim(), head);
    assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index);
  }
});

/** The file the Trivy and Archgate stand-ins report as a finding when the tree they read holds it. */
const plantedFinding = "planted-finding.txt";

/** The calls a stand-in logged, one JSON object per line; none when it never ran. */
function readCalls<T>(path: string): T[] {
  return existsSync(path)
    ? readFileSync(path, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line): T => JSON.parse(line))
    : [];
}

/**
 * A stand-in for the pinned Trivy binary that reports one HIGH finding
 * whenever the tree it is pointed at holds the planted file. It logs every
 * call and the tree each scan read, so a case can see which tree G11 scanned
 * and whether the scanner ran at all.
 */
function scanRootTrivy(repo: { root: string }) {
  const binary = join(repo.root, ".git/trivy-stand-in");
  const calls = join(repo.root, ".git/trivy-calls.log");
  writeFileSync(
    binary,
    `#!${process.execPath}
import { appendFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
const args = process.argv.slice(2);
if (args.includes("--version")) {
  appendFileSync(${JSON.stringify(calls)}, "{}\\n");
  console.log("Version: 0.76.1");
  process.exit(0);
}
const root = resolve(args.at(-1) ?? ".");
appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ root }) + "\\n");
const found = existsSync(join(root, ${JSON.stringify(plantedFinding)}));
const results = found ? [{ Target: ${JSON.stringify(plantedFinding)}, Vulnerabilities: [{ Severity: "HIGH", VulnerabilityID: "TEST-0002" }] }] : [];
console.log(JSON.stringify({ CreatedAt: new Date().toISOString(), Results: results }));
process.exit(found ? 1 : 0);
`,
    { mode: 0o755 },
  );
  const logged = () => readCalls<{ root?: string }>(calls);
  return {
    binary,
    /** Whether the scanner ran at all, its version probe included. */
    ran: () => existsSync(calls),
    /** The trees the scanner was pointed at, in order. */
    roots: () => logged().flatMap((call) => (call.root ? [call.root] : [])),
  };
}

/**
 * A stand-in for the pinned Archgate binary that reports one violation
 * whenever the directory it runs in holds the planted file. It logs every call
 * with its working directory, so a case can see which tree G1 judged and
 * whether Archgate ran at all.
 */
function markerArchgate(repo: { root: string }) {
  const binary = join(repo.root, ".git/archgate-stand-in");
  const calls = join(repo.root, ".git/archgate-calls.log");
  writeFileSync(
    binary,
    `#!${process.execPath}
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ cwd: process.cwd(), args }) + "\\n");
if (args.includes("--version")) {
  console.log("0.61.0");
  process.exit(0);
}
const found = existsSync(join(process.cwd(), ${JSON.stringify(plantedFinding)}));
const results = found ? [{ adrId: "TEST-001", violations: [{ message: "planted finding in the judged tree" }] }] : [];
console.log(JSON.stringify({ pass: !found, results }));
process.exit(found ? 1 : 0);
`,
    { mode: 0o755 },
  );
  const logged = () => readCalls<{ cwd: string; args: string[] }>(calls);
  return {
    binary,
    /** Whether Archgate ran at all, its version probe included. */
    ran: () => existsSync(calls),
    /** The directories Archgate ran in, in order. */
    directories: () => logged().map((call) => call.cwd),
    /** The directories Archgate ran its checks in, its version probe left out. */
    checks: () => logged().flatMap((call) => (call.args[0] === "check" ? [call.cwd] : [])),
  };
}

/**
 * A reviewed module tree whose Archgate package is a stand-in, so a case can
 * see where `pnpm exec archgate` found the command and where it ran it. Every
 * other package and command is the reviewed tree's own, linked.
 */
function standInArchgateModules(t: TestContext) {
  const reviewed = join(repository, "node_modules");
  const modules = mkdtempSync(join(tmpdir(), "superman-raw-modules-"));
  t.after(() => rmSync(modules, { recursive: true, force: true }));
  const calls = join(modules, "archgate-calls.log");
  for (const item of readdirSync(reviewed))
    if (!item.startsWith(".") && item !== "archgate")
      symlinkSync(realpathSync(join(reviewed, item)), join(modules, item), "dir");
  mkdirSync(join(modules, ".bin"));
  for (const command of readdirSync(join(reviewed, ".bin")))
    if (command !== "archgate")
      symlinkSync(realpathSync(join(reviewed, ".bin", command)), join(modules, ".bin", command));
  mkdirSync(join(modules, "archgate/bin"), { recursive: true });
  writeFileSync(
    join(modules, "archgate/package.json"),
    JSON.stringify({ name: "archgate", version: "0.61.0", bin: { archgate: "bin/archgate.mjs" } }),
  );
  writeFileSync(
    join(modules, "archgate/bin/archgate.mjs"),
    `#!${process.execPath}
import { appendFileSync, realpathSync } from "node:fs";
import { delimiter, dirname } from "node:path";
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify({
  cwd: process.cwd(),
  args,
  command: realpathSync(dirname(process.argv[1])),
  pathHead: realpathSync((process.env.PATH ?? "").split(delimiter)[0]),
}) + "\\n");
if (args.includes("--version")) {
  console.log("archgate 0.61.0 (stand-in)");
  process.exit(0);
}
console.log(JSON.stringify({ pass: true, results: [] }));
`,
    { mode: 0o755 },
  );
  symlinkSync(join(modules, "archgate/bin/archgate.mjs"), join(modules, ".bin/archgate"));
  return {
    modules,
    /** Every Archgate call: where it ran, the command directory pnpm found it in and PATH's first entry. */
    calls: () => readCalls<{ cwd: string; args: string[]; command: string; pathHead: string }>(calls),
  };
}

/**
 * A full local pre-PR run over a fixture: every gate selected, no `--gate`,
 * in the fixture's own environment and under its child bound.
 */
function runPrePr(
  repo: { root: string; receiptPath: string; git: (...args: string[]) => string },
  extraEnv: Record<string, string | undefined>,
) {
  const result = spawnSync(
    process.execPath,
    [join(import.meta.dirname, "raw-gates.ts"), "--stage", "pre-pr", "--receipt", repo.receiptPath],
    {
      cwd: repo.root,
      env: {
        ...fixtureEnvironment(),
        PATH: `${join(repo.root, ".tools")}${delimiter}${process.env.PATH}`,
        HEAD_REF: repo.git("branch", "--show-current").trim(),
        ...extraEnv,
      },
      encoding: "utf8",
      shell: false,
      timeout: GATE_CHILD_TIMEOUT,
    },
  );
  assert.ifError(result.error);
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    receipt: existsSync(repo.receiptPath) ? JSON.parse(readFileSync(repo.receiptPath, "utf8")) : undefined,
  };
}

/**
 * Plant a finding the commit does not hold, ignored by the caller's own
 * exclude file: the exclude file is the clone's and is never committed.
 */
function plantIgnoredFinding(repo: { root: string; write: (path: string, content: string) => void }): void {
  mkdirSync(join(repo.root, ".git/info"), { recursive: true });
  writeFileSync(join(repo.root, ".git/info/exclude"), `${plantedFinding}\n`, { flag: "a" });
  repo.write(plantedFinding, "a finding the commit does not hold\n");
}

/** A temporary directory handed to the run as its own, so what the run leaves there is visible. */
function runTemporary(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), "superman-raw-run-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** A temporary directory that does not exist, so no owned snapshot can be built in it. */
function absentTemporary(t: TestContext): string {
  return join(runTemporary(t), "absent");
}

/** Whether a path lies outside a directory: neither the directory itself nor anything inside it. */
function outside(directory: string, path: string): boolean {
  return path !== directory && !path.startsWith(`${directory}${sep}`);
}

/**
 * Record what a run must leave as the caller had it, the working tree with its
 * ignored files, the index bytes, HEAD and the refs, and return the check that
 * it did.
 */
function callerStateKept(repo: { root: string; git: (...args: string[]) => string }): () => void {
  const status = () => repo.git("status", "--porcelain=v1", "--ignored", "--untracked-files=all");
  const refs = () => repo.git("for-each-ref", "--format=%(refname) %(objectname)");
  // Git status may refresh the caller's own index, so it runs before the index
  // bytes are read and after they are compared.
  const tree = status();
  const index = readFileSync(join(repo.root, ".git/index"));
  const head = repo.git("rev-parse", "HEAD").trim();
  const references = refs();
  return () => {
    assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index, "the run rewrote the caller's index");
    assert.equal(repo.git("rev-parse", "HEAD").trim(), head, "the run moved the caller's HEAD");
    assert.equal(refs(), references, "the run changed the caller's refs");
    assert.equal(status(), tree, "the run changed the caller's working tree");
  };
}

test("a local G11 run scans an owned snapshot of the commit, not a file the checkout ignores", (t) => {
  const repo = fixture(t);
  repo.commit();
  const trivy = scanRootTrivy(repo);
  plantIgnoredFinding(repo);
  const temporary = runTemporary(t);
  const kept = callerStateKept(repo);
  const result = repo.runGate("G11", [], { TRIVY_BIN: trivy.binary, TMPDIR: temporary });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "pass");
  const scanned = new Set(trivy.roots());
  assert.notEqual(scanned.size, 0, "the scanner never scanned");
  for (const root of scanned) {
    assert.ok(outside(realpathSync(repo.root), root), `the scan read ${root}, inside the caller's repository`);
    assert.equal(existsSync(root), false, "the owned snapshot outlived its run");
  }
  assert.deepEqual(readdirSync(temporary), [], "the run left files in its temporary directory");
  kept();
});

test("a local G11 run whose owned snapshot cannot be built fails with the cause and never scans", (t) => {
  const repo = fixture(t);
  repo.commit();
  const trivy = scanRootTrivy(repo);
  const absent = absentTemporary(t);
  const result = repo.runGate("G11", [], { TRIVY_BIN: trivy.binary, TMPDIR: absent });
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.error, undefined, "the run failed as a whole instead of as G11's own result");
  assert.equal(result.receipt.results.length, 1);
  const [g11] = result.receipt.results;
  assert.equal(g11.gate, "G11");
  assert.equal(g11.status, "fail");
  assert.equal(g11.kind, "skipped-required-work");
  assert.match(g11.reason, /ENOENT/u);
  assert.ok(g11.reason.includes(absent), g11.reason);
  assert.equal(trivy.ran(), false, "the scanner ran although its owned snapshot could not be built");
});

test("a committed finding still fails a local G11 run, which leaves no owned snapshot behind", (t) => {
  const repo = fixture(t);
  repo.write(plantedFinding, "a finding the commit holds\n");
  repo.commit();
  const trivy = scanRootTrivy(repo);
  const temporary = runTemporary(t);
  const kept = callerStateKept(repo);
  const result = repo.runGate("G11", [], { TRIVY_BIN: trivy.binary, TMPDIR: temporary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.receipt.results[0].reason, /Trivy reported 1 HIGH\/CRITICAL finding/u);
  assert.deepEqual(readdirSync(temporary), [], "the run left files in its temporary directory");
  kept();
});

test("the CI and nightly legs' G11 still reads the checkout and builds no owned snapshot", async (t) => {
  for (const stage of ["ci", "nightly"]) {
    await t.test(stage, (t) => {
      const repo = fixture(t);
      // The nightly runs on main and compares it with the main before it.
      if (stage === "nightly") repo.git("switch", "--quiet", "main");
      repo.commit();
      const trivy = scanRootTrivy(repo);
      plantIgnoredFinding(repo);
      const result = repo.runGate("G11", ["--stage", stage], {
        TRIVY_BIN: trivy.binary,
        // A leg that tried to build an owned snapshot would fail on this
        // directory instead of scanning.
        TMPDIR: absentTemporary(t),
        ...(stage === "nightly" ? { HEAD_REF: "main" } : {}),
      });
      assert.equal(result.status, 1, result.output);
      assert.match(result.receipt.results[0].reason, /Trivy reported 1 HIGH\/CRITICAL finding/u);
      assert.deepEqual([...new Set(trivy.roots())], [realpathSync(repo.root)]);
    });
  }
});

test("a local G1 run judges an owned snapshot of the commit, not a file the checkout ignores", (t) => {
  const repo = fixture(t);
  repo.commit();
  const archgate = markerArchgate(repo);
  plantIgnoredFinding(repo);
  const temporary = runTemporary(t);
  const kept = callerStateKept(repo);
  const result = repo.runGate("G1", [], { ARCHGATE_BIN: archgate.binary, TMPDIR: temporary });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "pass");
  const judged = new Set(archgate.checks());
  assert.notEqual(judged.size, 0, "Archgate never checked a tree");
  for (const root of judged) {
    assert.ok(outside(realpathSync(repo.root), root), `Archgate judged ${root}, inside the caller's repository`);
    assert.equal(existsSync(root), false, "the owned snapshot outlived its run");
  }
  assert.deepEqual(readdirSync(temporary), [], "the run left files in its temporary directory");
  kept();
});

test("a local G1 run leaves Archgate's regenerated rule declarations out of the caller's checkout", (t) => {
  const repo = fixture(t, "spec/demo");
  for (const file of [
    ".archgate/config.json",
    ".archgate/adrs/SUP-005-no-inline-suppression.md",
    ".archgate/adrs/SUP-005-no-inline-suppression.rules.ts",
  ])
    repo.write(file, readFileSync(join(repository, file), "utf8"));
  repo.write("docs/adr/0004-no-waivers.md", "# Reviewed policy\n");
  // Archgate regenerates its rule declarations on every run; they are not a
  // tracked input, exactly as the reviewed repository ignores them.
  repo.write(".gitignore", "node_modules\n.tools/\n.archgate/rules.d.ts\n");
  repo.commit();
  const result = repo.runGate("G1");
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "pass");
  assert.equal(
    existsSync(join(repo.root, ".archgate/rules.d.ts")),
    false,
    "Archgate wrote its rule declarations into the caller's checkout",
  );
});

test("a local G1 run resolves pnpm's archgate inside the owned snapshot", (t) => {
  const archgate = standInArchgateModules(t);
  const repo = fixture(t, "ticket/demo-01", "behavior", archgate.modules);
  repo.commit();
  const result = repo.runGate("G1", [], { ARCHGATE_BIN: undefined, TMPDIR: runTemporary(t) });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.tools.archgate.executableVersion, "archgate 0.61.0 (stand-in)");
  const calls = archgate.calls();
  assert.ok(
    calls.some((call) => call.args[0] === "check"),
    "pnpm never ran Archgate's checks",
  );
  for (const call of calls) {
    assert.ok(
      outside(realpathSync(repo.root), call.cwd),
      `pnpm ran Archgate in ${call.cwd}, inside the caller's repository`,
    );
    assert.equal(
      call.command,
      join(call.cwd, "node_modules", ".bin"),
      "pnpm found archgate outside the snapshot's commands",
    );
    assert.equal(call.pathHead, join(call.cwd, "node_modules", ".bin"), "pnpm led PATH with another command directory");
    assert.equal(existsSync(call.cwd), false, "the owned snapshot outlived its run");
  }
});

test("a local pre-PR run's G1 and G11 read one owned snapshot", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.commit();
  const archgate = markerArchgate(repo);
  const trivy = scanRootTrivy(repo);
  const result = runPrePr(repo, {
    ARCHGATE_BIN: archgate.binary,
    TRIVY_BIN: trivy.binary,
    TMPDIR: runTemporary(t),
  });
  assert.ok(result.receipt, result.output);
  for (const gate of ["G1", "G11"])
    assert.equal(
      result.receipt.results.find((entry: { gate: string }) => entry.gate === gate)?.status,
      "pass",
      `${gate} did not pass\n${result.output}`,
    );
  // Both tools ran, and they read the same trees: Archgate's set and Trivy's
  // set are one and the same owned snapshot.
  const judged = new Set(archgate.directories());
  const scanned = new Set(trivy.roots());
  assert.notEqual(judged.size, 0, "Archgate never ran");
  assert.deepEqual(judged, scanned, "G1 and G11 read different trees");
  assert.equal(judged.size, 1, `G1 and G11 read ${[...judged].join(", ")}`);
  const [root] = judged;
  assert.ok(outside(realpathSync(repo.root), root), `G1 and G11 read ${root}, inside the caller's repository`);
  assert.equal(existsSync(root), false, "the owned snapshot outlived its run");
});

test("a local G1 run whose owned snapshot cannot be built fails with the cause and never runs Archgate", (t) => {
  const repo = fixture(t);
  repo.commit();
  const archgate = markerArchgate(repo);
  const absent = absentTemporary(t);
  const result = repo.runGate("G1", [], { ARCHGATE_BIN: archgate.binary, TMPDIR: absent });
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.error, undefined, "the run failed as a whole instead of as G1's own result");
  assert.equal(result.receipt.results.length, 1);
  const [g1] = result.receipt.results;
  assert.equal(g1.gate, "G1");
  assert.equal(g1.status, "fail");
  assert.equal(g1.kind, "skipped-required-work");
  assert.match(g1.reason, /ENOENT/u);
  assert.ok(g1.reason.includes(absent), g1.reason);
  assert.equal(archgate.ran(), false, "Archgate ran although its owned snapshot could not be built");
});

test("the CI and nightly legs' G1 still judges the checkout and builds no owned snapshot", async (t) => {
  for (const stage of ["ci", "nightly"]) {
    await t.test(stage, (t) => {
      const repo = fixture(t);
      // The nightly runs on main and compares it with the main before it.
      if (stage === "nightly") repo.git("switch", "--quiet", "main");
      repo.commit();
      const archgate = markerArchgate(repo);
      plantIgnoredFinding(repo);
      const result = repo.runGate("G1", ["--stage", stage], {
        ARCHGATE_BIN: archgate.binary,
        // A leg that tried to build an owned snapshot would fail on this
        // directory instead of running Archgate.
        TMPDIR: absentTemporary(t),
        ...(stage === "nightly" ? { HEAD_REF: "main" } : {}),
      });
      assert.equal(result.status, 1, result.output);
      assert.match(result.receipt.results[0].reason, /planted finding in the judged tree/u);
      assert.deepEqual([...new Set(archgate.directories())], [realpathSync(repo.root)]);
    });
  }
});

test("G9 reports failure when the new test already passes on the approved base", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('old behavior', () => expect(value).toBe(0));\n",
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /no behavior regression/u);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.status, "pass");
  assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "pass");
  assert.equal(result.receipt.results[0].status, "fail");
});

test("G9 verifies the real Vitest pin and reports mismatches before replay", (t) => {
  const repo = fixture(t);
  const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
  config.tools.vitest = "0.0.0";
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Vitest pin.*0\.0\.0.*5\.0\.5/u);
  assert.equal(result.receipt.tools.vitest.status, "fail");
});

test("G9 accepts a missing product export only with real compiler corroboration and a green candidate", (t) => {
  const repo = fixture(t);
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest';\nimport { newValue } from '../src/value.ts';\ntest('new export', () => expect(newValue()).toBe(1));\n",
  );
  repo.write("src/value.ts", "export const value = 0;\nexport function newValue() { return 1; }\n");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "missing-symbol");
  assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "pass");
});

test("G9 classifies a real Vitest base syntax failure as blocked infrastructure, not regression evidence", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = ; // approved-base syntax failure\n");
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.status, "blocked");
  assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "infrastructure");
  assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "blocked");
});

test("G9 independently validates suite counters in the real Vitest JSON report", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('--outputFile')) { const report = JSON.parse(readFileSync(reportPath, 'utf8')); report.numTotalTestSuites = 99; writeFileSync(reportPath, JSON.stringify(report)); }",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /report.*counter/u);
});

test("G9 refuses an otherwise valid assertion replay with an unrelated real Vitest base error", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    `import { expect, test } from 'vitest';
import { value } from '../src/value.ts';
test('behavior', async () => {
  if (value === 0) setTimeout(() => { throw new Error('unrelated base error'); }, 0);
  await new Promise((done) => setTimeout(done, 20));
  expect(value).toBe(1);
});\n`,
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "infrastructure");
  assert.match(result.output, /unhandled|stderr|unrelated base error/iu);
});

test("G9 does not mistake an assertion in a failing beforeEach fixture for behavior evidence", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    `import { beforeEach, expect, test } from 'vitest';
import { value } from '../src/value.ts';
beforeEach(() => expect(value).toBe(1));
test('never reaches its assertion', () => expect(true).toBe(true));\n`,
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /fixture|hook/u);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "infrastructure");
});

test("G9 records independently checked Node and pnpm pins", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.receipt.tools.node, { expected: "26", actual: process.versions.node, status: "pass" });
  assert.deepEqual(result.receipt.tools.pnpm, { expected: "12.16.1", actual: "12.16.1", status: "pass" });
});

test("G9 checks reported test identities against independent real runner completion evidence", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('--outputFile')) { const report = JSON.parse(readFileSync(reportPath, 'utf8')); const assertion = report.testResults[0].assertionResults[0]; assertion.title = assertion.fullName = 'not actually executed'; writeFileSync(reportPath, JSON.stringify(report)); }",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /identit|completion/u);
});

test("G9 replays deleted declared test-support inputs without changing the base implementation", (t) => {
  const repo = fixture(t);
  repo.write("test/legacy.txt", "obsolete fixture\n");
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  rmSync(join(repo.root, "test/legacy.txt"));
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    `import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { value } from '../src/value.ts';
test('behavior with new support', () => {
  if (existsSync('test/legacy.txt')) throw new Error('obsolete test support was not removed');
  expect(value).toBe(1);
});\n`,
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.receipt.behaviorReplay.testInputs, ["test/legacy.txt", "test/value.test.ts"]);
});

test("G9 preserves caller indexes and repositories even under inherited Git overrides", (t) => {
  const repo = fixture(t);
  const external = fixture(t);
  external.write("caller.txt", "staged caller work\n");
  external.git("add", "caller.txt");
  external.write("caller.txt", "unstaged caller work\n");
  const externalIndex = readFileSync(join(external.root, ".git/index"));
  const externalHead = external.git("rev-parse", "HEAD");
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  utimesSync(join(repo.root, "src/value.ts"), new Date(), new Date(Date.now() + 10_000));
  const index = readFileSync(join(repo.root, ".git/index"));
  const head = repo.git("rev-parse", "HEAD");
  const refs = repo.git("show-ref");
  const result = repo.run([], {
    GIT_DIR: join(external.root, ".git"),
    GIT_WORK_TREE: external.root,
    GIT_INDEX_FILE: join(external.root, ".git/index"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/not-a-real-hooks-directory",
  });
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index, "caller index bytes changed");
  assert.equal(repo.git("rev-parse", "HEAD"), head);
  assert.equal(repo.git("show-ref"), refs);
  assert.deepEqual(readFileSync(join(external.root, ".git/index")), externalIndex);
  assert.equal(external.git("rev-parse", "HEAD"), externalHead);
  assert.equal(readFileSync(join(external.root, "caller.txt"), "utf8"), "unstaged caller work\n");
});

test("G9 records the real CI head, base and tested merge without confusing H with M", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  const head = repo.commit();
  repo.git("switch", "--quiet", "main");
  repo.write("README.md", "new approved base\n");
  const base = repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", base);
  repo.git("merge", "--quiet", "--no-ff", "-m", "test integration", "ticket/demo-01");
  const merge = repo.git("rev-parse", "HEAD").trim();
  const eventPath = join(repo.root, ".git/event.json");
  writeFileSync(
    eventPath,
    JSON.stringify({
      pull_request: {
        head: { sha: head, ref: "ticket/demo-01" },
        base: { sha: base, ref: "main" },
        merge_commit_sha: merge,
      },
    }),
  );
  const result = repo.run([], {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_SHA: merge,
  });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.headSha, head);
  assert.equal(result.receipt.baseSha, base);
  assert.equal(result.receipt.testedMergeSha, merge);
  assert.equal(result.receipt.evaluatedSha, merge);
  assert.equal(result.receipt.behaviorReplay.candidateSha, head);
});

test("G9 rejects a fabricated local HEAD_REF rather than turning behavior work into spec n/a", (t) => {
  const repo = fixture(t);
  repo.commit();
  const result = repo.run([], { HEAD_REF: "spec/demo" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /HEAD_REF.*branch/u);
});

test("G9 refuses candidate-owned test policy instead of replaying with unreviewed configs", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.write("vitest.config.ts", "export default { test: { include: ['test/**/*.test.ts'], testTimeout: 900 } };\n");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /vitest\.config\.ts/u);
  assert.match(result.output, /reviewed policy|G4: ticket PRs may not touch protected paths/u);
});

test("G9 fails closed on an unknown Vitest reporter schema", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('--outputFile')) { const report = JSON.parse(readFileSync(reportPath, 'utf8')); report.unknownSchemaField = true; writeFileSync(reportPath, JSON.stringify(report)); }",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /unknown.*schema/u);
});

test("receipt output cannot overwrite a tracked product input", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.commit();
  const before = readFileSync(join(repo.root, "src/value.ts"), "utf8");
  const result = repo.run(["--receipt", "src/value.ts"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /receipt.*tracked/iu);
  assert.equal(readFileSync(join(repo.root, "src/value.ts"), "utf8"), before);
});

test("G9 requires regular test-support inputs rather than replaying filesystem aliases", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  symlinkSync("../src/value.ts", join(repo.root, "test/alias.ts"));
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /regular.*test.support|test.support.*regular/u);
});

test("reviewed chore kinds report G9 code replay explicitly inapplicable", (t) => {
  for (const branch of ["chore/wiki-refresh", "chore/skills-refresh"]) {
    const repo = fixture(t, branch);
    repo.commit();
    const result = repo.run();
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(result.receipt.results, [{ gate: "G9", status: "n/a", reason: "chore-kind" }]);
    assert.equal(result.receipt.behaviorReplay, undefined);
  }
});

// Safety coverage of rejection paths introduced in the red/green slices above.
test("G9 never promotes incomplete or infrastructure failures to replay evidence", async (t) => {
  for (const scenario of [
    "candidate failure",
    "test syntax",
    "config failure",
    "setup failure",
    "missing dependency",
    "missing report",
    "tool failure",
    "test timeout",
    "skipped test",
    "no tests",
    "refactor history unavailable",
    "unknown Kind",
  ]) {
    await t.test(scenario, (t) => {
      const repo = fixture(
        t,
        "ticket/demo-01",
        scenario === "refactor history unavailable"
          ? "refactor"
          : scenario === "unknown Kind"
            ? "invented"
            : "behavior",
      );
      if (scenario === "config failure" || scenario === "setup failure") {
        repo.write(
          "vitest.config.ts",
          scenario === "config failure"
            ? "throw new Error('broken reviewed config');\n"
            : "export default {test:{include:['test/**/*.test.ts'],setupFiles:['./test/setup.ts']}};\n",
        );
        if (scenario === "setup failure") repo.write("test/setup.ts", "export {};\n");
        repo.commit();
        repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
      }
      if (scenario !== "no tests") {
        repo.write("src/value.ts", `export const value = ${scenario === "candidate failure" ? 2 : 1};\n`);
        repo.write(
          "test/value.test.ts",
          "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
        );
      }
      if (scenario === "test syntax")
        repo.write("test/value.test.ts", "import { test } from 'vitest'; test('bad syntax', () => { const x = ; });\n");
      if (scenario === "setup failure") repo.write("test/setup.ts", "throw new Error('broken setup fixture');\n");
      if (scenario === "missing dependency")
        repo.write(
          "test/value.test.ts",
          "import './nonexistent-fixture.ts'; import { test } from 'vitest'; test('never runs', () => {});\n",
        );
      if (scenario === "test timeout")
        repo.write(
          "test/value.test.ts",
          "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', async () => { if (value === 0) await new Promise(() => {}); expect(value).toBe(1); });\n",
        );
      if (scenario === "skipped test")
        repo.write(
          "test/value.test.ts",
          "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1)); test.skip('not completed', () => {});\n",
        );
      repo.commit();
      if (scenario === "missing report")
        interceptPnpm(repo.root, "if (args.includes('--outputFile')) rmSync(reportPath);");
      if (scenario === "tool failure")
        interceptPnpm(
          repo.root,
          "if (args.includes('--outputFile')) { rmSync(reportPath); result.status = 127; result.stderr = 'tool failed'; }",
        );
      const result = repo.run();
      assert.equal(result.status, 1, `${scenario}\n${result.output}`);
      assert.equal(result.receipt.verdict, "fail");
      assert.equal(result.receipt.results[0].status, "fail");
      if (scenario === "candidate failure") {
        assert.equal(result.receipt.behaviorReplay.baseOutcome.status, "fail");
        assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "fail");
      } else if (scenario === "refactor history unavailable")
        assert.match(result.output, /refactor blocked.*every-commit/u);
      else if (scenario === "no tests") assert.match(result.output, /no added or changed test files/u);
      else if (scenario === "unknown Kind")
        assert.match(result.output, /unknown approved-base Kind|Kind must be behavior, refactor or knowledge/u);
      else assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "infrastructure", result.output);
    });
  }
});

test("G9 process timeouts terminate the owned runner process group", async (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    "import { expect, test } from 'vitest'; import { value } from '../src/value.ts'; test('behavior', () => expect(value).toBe(1));\n",
  );
  repo.commit();
  const pidPath = join(repo.root, ".tools/child-pid.json");
  t.after(() => {
    if (!existsSync(pidPath)) return;
    const pid = JSON.parse(readFileSync(pidPath, "utf8"));
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* Already reaped. */
    }
  });
  interceptPnpm(
    repo.root,
    `if (args.includes('--outputFile')) {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', shell: false });
    writeFileSync(${JSON.stringify(pidPath)}, JSON.stringify(child.pid));
    await new Promise(() => { setInterval(() => {}, 1000); });
  }`,
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /timed? ?out|ETIMEDOUT/iu);
  const pid = JSON.parse(readFileSync(pidPath, "utf8"));
  await delay(100);
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" }, "owned runner child survived its timeout");
});

test("raw receipts have deterministic sorted keys", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(Object.keys(result.receipt), Object.keys(result.receipt).sort());
  assert.deepEqual(Object.keys(result.receipt.results[0]), Object.keys(result.receipt.results[0]).sort());
});
