// The staged scope parity suite for the Deno sibling.
//
// The Node original gained a staged scope for the pre-commit stage, so the
// pre-commit run checks the staged files instead of the whole repository and a
// partial stage can never claim the full bar. This suite runs both hosts over
// one fixture and compares what each observed: the staged precondition, the
// staged gate forms, the receipt shape and the refusal codes. Every
// expectation is one host's observed output compared with the other's, so a
// divergence in either fails the fixture.
//
// Every guard is shown reachable: each test names the input that reaches it
// and the outcome it produces.
//
// Every fixture writes to a `mkdtempSync` root; nothing is written into the
// repository tree.
//
// SUP-002 forbids the Node child-process module inside the operational Deno
// root, so the harness reaches the Node graph's owned-child idiom instead. That
// is harness code: the modules under test never see it.
import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixtureEnvironment } from "../../ci/fixture-env.ts";
import { runOwned } from "../../ci/replay.ts";
import { DENO_LAUNCH_FLAGS, DENO_PERMISSIONS } from "../exec.ts";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const denoRoot = join(repository, ".superman/deno-bootstrap");
const nodeRoot = join(repository, ".superman/ci");
const isolated = fixtureEnvironment();

/** The explicit runtime identity. An implicit PATH lookup is not a launch. */
function explicitDeno(): string {
  const binary = process.env.SUPERMAN_DENO_BIN;
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  return binary;
}

/** The reviewed permission profile of the operational Deno runtime. */
function denoProfile(): string[] {
  return [...DENO_LAUNCH_FLAGS, ...DENO_PERMISSIONS];
}

/** One host's observation of a run over the fixture. */
type Observed = {
  status: number | null;
  output: string;
  receipt: Record<string, unknown> | undefined;
};

/** The TypeScript policy the reviewed pre-commit model is checked against. */
const cleanTypeScriptPolicy = `{
  "compilerOptions": {
    "target": "ES2025",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "skipLibCheck": false
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
`;

/**
 * A repository complete enough for the pre-commit stage, which §5.4 gives G1
 * (archgate), G2 (typecheck and tests), G3 (knip), G4 (protected paths) and
 * G10 (biome). The tool pins G1 and G2 compare are declared, the product
 * source has the test G2 requires, the Archgate rule directory G1 reads is
 * present, and the Knip model accounts for all of it.
 *
 * The declared stage inventory is the reviewed one: the pre-commit stage is a
 * staged scope with partial feedback, the pre-PR and CI stages are whole
 * repository scopes with full feedback.
 */
function preCommitModel(root: string, write: (file: string, content: string) => void) {
  // The Knip model and the test are written as literals, not re-serialised: the
  // G10 gate runs Biome over the fixture, so these must already be in the
  // formatter's output shape.
  write(
    "knip.json",
    `{
  "$schema": "https://unpkg.com/knip@6.43.0/schema.json",
  "entry": ["src/cli.ts", "test/value.test.ts"],
  "project": ["src/**/*.ts", "test/**/*.ts"],
  "ignore": ["ignored/**/*.ts", "vitest.config.ts"],
  "ignoreDependencies": ["archgate", "tsrs", "typescript"]
}
`,
  );
  write(
    "package.json",
    `${JSON.stringify(
      {
        name: "superman-ai",
        type: "module",
        packageManager: "pnpm@12.16.1",
        engines: { node: ">=26" },
        scripts: { lint: "biome ci", knip: "knip" },
        devDependencies: {
          "@biomejs/biome": "2.6.4",
          knip: "6.43.0",
          vitest: "5.0.5",
          archgate: "0.61.0",
          tsrs: "0.20.1-ts7.1.0-beta",
          typescript: "7.1.0-beta",
        },
      },
      null,
      2,
    )}\n`,
  );
  write("tsconfig.json", cleanTypeScriptPolicy);
  write("src/cli.ts", 'import { helper } from "./helper.ts";\n\nexport const cli = helper;\n');
  write("src/helper.ts", "export const helper = 1;\n");
  write("ignored/tooling.ts", "export const tooling = 1;\n");
  write(
    "test/value.test.ts",
    'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("behavior", () => expect(cli).toBe(1));\n',
  );
  for (const file of [
    ".archgate/config.json",
    ".archgate/adrs/SUP-005-no-inline-suppression.md",
    ".archgate/adrs/SUP-005-no-inline-suppression.rules.ts",
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(repository, file), join(root, file));
  }
  write("docs/adr/0004-no-waivers.md", "# Reviewed policy\n");
}

/** The reviewed policy the staged G9 reads. */
type StagedPolicy = {
  tools: Record<string, string>;
  test: { files: string[] };
  stages: Record<string, { gates: string[]; feedback: string; scope: string }>;
};

/**
 * The pre-commit stage as the staged G9 round declares it: the staged scope
 * with G9 in its inventory. The gate under test runs on its own, so a failure
 * is G9's own and not another gate's. One reviewed policy field may be
 * changed, so the guards that refuse a policy can be reached.
 */
function stagedG9Stage(
  root: string,
  write: (file: string, content: string) => void,
  change?: (policy: StagedPolicy) => void,
): void {
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8")) as StagedPolicy;
  policy.stages["pre-commit"].gates = ["G9"];
  change?.(policy);
  write(".superman/ci/bootstrap.json", `${JSON.stringify(policy, null, 2)}\n`);
}

/**
 * The pre-commit stage as the staged G5 round declares it: the staged scope
 * with G5 in its inventory. The gate under test runs on its own, so a failure
 * is G5's own and not another gate's. The inventory is a parameter so a gate
 * that declares no staged form can be reached at the same scope.
 */
function stagedG5Stage(root: string, write: (file: string, content: string) => void, gates = ["G5"]): void {
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8")) as StagedPolicy;
  policy.stages["pre-commit"].gates = gates;
  write(".superman/ci/bootstrap.json", `${JSON.stringify(policy, null, 2)}\n`);
  // The staged G5 verifies the declared, the installed and the executable
  // jscpd pin before it scans, so the reviewed policy must declare the pin
  // the gate verifies.
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.devDependencies.jscpd = "5.4.2";
  write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * A source with a repeated block: fifteen identical statements, so the block
 * is over the reviewed clone floors (50 tokens, 5 lines) and two files that
 * carry it are an exact clone of one another.
 */
function repeatedSource(): string {
  const statements = Array.from({ length: 15 }, (_, index) => `  value = value + ${index + 1};`);
  return `export function repetitive(value: number) {\n${statements.join("\n")}\n  return value;\n}\n`;
}

/** A staged test file whose staged content is green. */
const greenStagedTest =
  'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("staged behavior", () => expect(cli).toBe(1));\n';

/** A staged test file whose staged content is not green. */
const redStagedTest =
  'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("staged behavior", () => expect(cli).toBe(2));\n';

/**
 * A pnpm that answers the version probes the staged G9 makes and refuses
 * every other invocation.
 *
 * The staged G9 stops at the version probe it refuses, so this program never
 * has to run a real tool. A program that answered the probe and then failed
 * would report a different failure, and the parity comparison would show it.
 */
const pnpmVersionShim = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("12.16.1\\n");
  process.exit(0);
}
if (args[0] === "exec" && args[1] === "vitest" && args[2] === "--version") {
  process.stdout.write("vitest/0.0.0 darwin-arm64 node-v26.5.0\\n");
  process.exit(0);
}
process.stderr.write("this pnpm answers the version probes only\\n");
process.exit(1);
`;

/**
 * The toolchain the fixture's gates run through.
 *
 * The pinned pnpm is the one the reviewed policy names, and the toolchain's
 * Node runtime is the very binary the harness runs: a version manager's shim
 * prints its own log lines on standard output, and the recorded Node identity
 * must be the version alone. Both are links, not wrappers, so the fixture adds
 * no program of its own to the reviewed toolchain.
 */
function toolchain(root: string) {
  const pinned =
    process.env.SUPERMAN_TEST_PNPM ??
    join(homedir(), ".local/share/pnpm/.tools/pnpm/12.16.1/node_modules/pnpm/bin/pnpm.mjs");
  const pnpm = existsSync(pinned) ? pinned : whichPnpm();
  symlinkSync(pnpm, join(root, ".tools/pnpm"));
  symlinkSync(process.execPath, join(root, ".tools/node"));
}

/** The package manager on the caller's PATH, when the pinned one is absent. */
function whichPnpm(): string {
  const result = runOwned("which", ["pnpm"], { env: isolated, encoding: "utf8", shell: false, timeout: 60_000 });
  assert.ifError(result.error);
  return result.stdout.trim();
}

/**
 * A disposable repository with a reviewed base, a candidate head and the
 * reviewed stage inventory the gate reads.
 */
function fixture(
  t: TestContext,
  setup?: (repo: { root: string; write: (file: string, content: string) => void }) => void,
) {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-staged-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  const git = (...args: string[]) => {
    const result = runOwned("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  for (const file of [
    "pnpm-lock.yaml",
    ".npmrc",
    "vitest.config.ts",
    "biome.json",
    ".jscpd.json",
    "stryker.config.json",
    ".superman/ci/bootstrap.json",
    ".superman/ci/coverage.json",
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(repository, file), join(root, file));
  }
  // The fixture's own ignore list: the toolchain's links and the rules
  // Archgate generates are not tracked inputs, so a whole-repository run sees
  // the clean tree the precondition requires.
  write(".gitignore", `${readFileSync(join(repository, ".gitignore"), "utf8")}.tools/\n`);
  write(".scratch/demo/spec.md", "# Approved spec\n");
  write(".scratch/demo/issues/01-feature.md", "# Feature\n\n**Kind:** behavior\n");
  preCommitModel(root, write);
  setup?.({ root, write });
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Staged Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", "--all");
  git("commit", "--quiet", "-m", "reviewed tool policy");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("switch", "--quiet", "-c", "ticket/demo-01");
  // The candidate head is a commit of its own, so the recorded base and the
  // evaluated head name different revisions over one reviewed tree.
  git("commit", "--quiet", "--allow-empty", "-m", "candidate");
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "dir");
  mkdirSync(join(root, ".tools"));
  toolchain(root);
  return { root, write, git };
}

/**
 * The environment both hosts are driven with.
 *
 * The Node test runner marks its own children with `NODE_TEST_CONTEXT`, and a
 * child that inherits the marker reports as a test child instead of running
 * its case, so the marker is removed before any host is spawned.
 */
function childEnvironment(root: string, extra: Record<string, string | undefined> = {}) {
  return {
    ...isolated,
    PATH: `${join(root, ".tools")}${delimiter}${isolated.PATH}`,
    NODE_TEST_CONTEXT: undefined,
    ...extra,
  };
}

/** The receipt a host published, read before the next host overwrites it. */
function readReceipt(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink()) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Run the Node original's raw gates over the fixture. */
function runNode(repo: { root: string }, args: string[], extra: Record<string, string | undefined>): Observed {
  const receipt = join(repo.root, ".git/receipt-node.json");
  rmSync(receipt, { force: true });
  const result = runOwned(process.execPath, [join(nodeRoot, "raw-gates.ts"), ...args, "--receipt", receipt], {
    cwd: repo.root,
    env: childEnvironment(repo.root, extra),
    encoding: "utf8",
    shell: false,
    timeout: 600_000,
  });
  assert.ifError(result.error);
  return { status: result.status, output: `${result.stdout}${result.stderr}`, receipt: readReceipt(receipt) };
}

/** Run the Deno sibling's raw gates over the same fixture. */
function runDeno(repo: { root: string }, args: string[], extra: Record<string, string | undefined>): Observed {
  const receipt = join(repo.root, ".git/receipt-deno.json");
  rmSync(receipt, { force: true });
  const result = runOwned(
    explicitDeno(),
    ["run", ...denoProfile(), join(denoRoot, "raw-gates.ts"), ...args, "--receipt", receipt],
    {
      cwd: repo.root,
      env: childEnvironment(repo.root, extra),
      encoding: "utf8",
      shell: false,
      timeout: 600_000,
    },
  );
  assert.ifError(result.error);
  return { status: result.status, output: `${result.stdout}${result.stderr}`, receipt: readReceipt(receipt) };
}

/**
 * Run both hosts over one fixture.
 *
 * The preparation runs once, before the first host, so both hosts see the same
 * tree and the same index: a comparison over two different inputs would
 * compare two different runs.
 */
function runBoth(
  repo: { root: string },
  args: string[],
  extra: Record<string, string | undefined> = {},
  prepare?: () => void,
): { node: Observed; deno: Observed } {
  prepare?.();
  const node = runNode(repo, args, extra);
  const deno = runDeno(repo, args, extra);
  return { node, deno };
}

/** The receipt fields both hosts must agree on for a staged run. */
const PARITY_FIELDS = [
  "branch",
  "stage",
  "scope",
  "feedback",
  "inputScope",
  "satisfiesFullBar",
  "stagedInputsId",
  "verdict",
  "results",
  "inputIntegrity",
];

/**
 * The results both hosts must agree on.
 *
 * Each host typechecks its own graph: the Node original's G2 keeps the
 * pinned `tsrs --noEmit` over the Node graph, and the Deno sibling's G2
 * adds the Deno graph check. The decision the G2 entry carries is compared;
 * the host-specific evidence is not, because the two hosts legitimately
 * observe different graphs.
 */
function comparableResults(receipt: Record<string, unknown> | undefined): unknown {
  const results = receipt?.results;
  if (!Array.isArray(results)) return results;
  return results.map((result) => {
    const entry = { ...(result as Record<string, unknown>) };
    if (entry.gate === "G2") delete entry.denoCheck;
    return entry;
  });
}

/** The parity assertion every staged-scope comparison shares. */
function assertParity(observed: { node: Observed; deno: Observed }, except: string[] = []): void {
  assert.equal(observed.deno.status, observed.node.status, observed.deno.output);
  for (const field of PARITY_FIELDS.filter((field) => !except.includes(field))) {
    if (field === "results") {
      assert.deepEqual(
        comparableResults(observed.deno.receipt),
        comparableResults(observed.node.receipt),
        "results differ between the Node original and the Deno sibling",
      );
      continue;
    }
    assert.deepEqual(
      observed.deno.receipt?.[field],
      observed.node.receipt?.[field],
      `${field} differs between the Node original and the Deno sibling`,
    );
  }
}

/** One gate result of a receipt. */
function gateResult(receipt: Record<string, unknown> | undefined, gate: string) {
  const results = receipt?.results;
  if (!Array.isArray(results))
    return {} as {
      status?: string;
      scope?: string;
      reason?: string;
      kind?: string;
      checked?: string;
      notChecked?: string;
      stagedTests?: string[];
      metrics?: Record<string, unknown>;
      evidence?: Record<string, unknown>;
      denoCheck?: { scope?: string; modules?: string[]; entryPoints?: string[] };
    };
  return (results.find((result) => (result as { gate?: string }).gate === gate) ?? {}) as {
    status?: string;
    scope?: string;
    reason?: string;
    kind?: string;
    checked?: string;
    notChecked?: string;
    stagedTests?: string[];
    metrics?: Record<string, unknown>;
    evidence?: Record<string, unknown>;
    denoCheck?: { scope?: string; modules?: string[]; entryPoints?: string[] };
  };
}

/**
 * The command a failure names and the status it failed with.
 *
 * A test runner's own output carries its timings, so two runs of the same
 * command do not report the same bytes. The line that names the command and
 * the status it failed with does.
 */
function failureLine(reason: string | undefined): string {
  return (reason ?? "").split("\n")[0];
}

/**
 * The terminal's colour escapes, removed.
 *
 * A test runner that writes to a terminal colours its output, so the same
 * failure text arrives with escape codes between the words on a runner and
 * without them in a captured pipe. The text is the claim; the colour is the
 * terminal's.
 */
function stripAnsi(text: string): string {
  return text.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu"), "");
}

test("a staged run refuses a tracked modification that was not staged", (t) => {
  // The input that reaches the guard: a tracked file the working tree carries
  // a modification of and the index does not. The outcome it produces: the
  // staged checks are refused before they run.
  const repo = fixture(t, ({ write }) => {
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
  });
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /unstaged changes present/u);
  assertParity(observed);
  assert.match(observed.deno.output, /unstaged changes present/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged run evaluates a staged modification of a tracked file", (t) => {
  // The input that reaches the guards: a tracked file whose modification is
  // staged. The outcome it produces: the staged checks run over the index and
  // the receipt names the staged scope.
  const repo = fixture(t, ({ write }) => {
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
    repo.git("add", ".scratch/demo/note.md");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(observed.deno.receipt?.inputScope, "staged");
  assert.equal(observed.deno.receipt?.verdict, "partial-feedback");
  assert.equal(observed.deno.receipt?.satisfiesFullBar, false);
  assert.equal(typeof observed.deno.receipt?.stagedInputsId, "string");
});

test("a local full run refuses a pull-request reference that names another branch", (t) => {
  // The input that reaches the guard: a pull-request reference that names a
  // branch other than the checked out one. The outcome it produces: the
  // whole-repository run is refused.
  const repo = fixture(t);
  const observed = runBoth(repo, ["--stage", "pre-pr"], { HEAD_REF: "ticket/demo-99" });
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /HEAD_REF does not match the local branch/u);
  assertParity(observed);
  assert.match(observed.deno.output, /HEAD_REF does not match the local branch/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a local full run binds the local branch when no pull-request reference names one", (t) => {
  // The input that reaches the guard: a local run with no pull-request
  // reference at all. The outcome it produces: the run binds the branch it is
  // on, and the reference mismatch guard does not fire.
  const repo = fixture(t);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G4"]);
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(observed.deno.receipt?.branch, "ticket/demo-01");
  assert.doesNotMatch(observed.deno.output, /HEAD_REF does not match/u);
});

test("a local full run refuses a tree it did not commit", (t) => {
  // The input that reaches the guard: a whole-repository run over a tree that
  // carries an uncommitted change to a file the gates read. The outcome it
  // produces: the run is refused, because the evidence would not bind a
  // committed snapshot.
  const repo = fixture(t, ({ write }) => {
    write("src/value.ts", "export const value = 1;\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-pr"], {}, () => {
    repo.write("src/value.ts", "export const value = 9;\n");
  });
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /dirty inputs; commit or preserve them before replay: src\/value\.ts/u);
  assertParity(observed);
  assert.match(observed.deno.output, /dirty inputs; commit or preserve them before replay: src\/value\.ts/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a local scoped run accepts a document it did not commit", (t) => {
  // The input that reaches the guard: a scoped run over a tree that carries an
  // uncommitted document. The outcome it produces: the run binds the snapshot
  // it measures, because a document is not a file the gates read.
  const repo = fixture(t, ({ write }) => {
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G4"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assert.doesNotMatch(observed.node.output, /dirty inputs/u);
  assertParity(observed);
  assert.doesNotMatch(observed.deno.output, /dirty inputs/u);
  assert.equal(observed.node.receipt?.inputIntegrity.status, "pass");
  assert.equal(observed.deno.receipt?.inputIntegrity.status, "pass");
});

test("a local full run accepts a document it did not commit", (t) => {
  // The input that reaches the binding: a full local pre-PR run over a tree
  // whose only difference from the commit is an uncommitted document. The
  // outcome it produces: both hosts bind the inputs their gates read and pass
  // input integrity, so the document refuses nothing.
  const repo = fixture(t);
  const archgate = markerArchgate(repo);
  const trivy = scanRootTrivy(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-pr"],
    { ARCHGATE_BIN: archgate.binary, TRIVY_BIN: trivy.binary, TMPDIR: runTemporary(t) },
    () => repo.write(".scratch/demo/note.md", "# An uncommitted note\n"),
  );
  for (const host of [observed.node, observed.deno]) {
    assert.deepEqual(host.receipt?.inputIntegrity, { scope: "gate-inputs", status: "pass" }, host.output);
    assert.doesNotMatch(host.output, /dirty inputs/u);
  }
  assertParity(observed);
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
 * call and the tree each scan read, so a case can see which tree each host's
 * G11 scanned and whether a scanner ran at all.
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
    /** Whether any host ran the scanner, its version probe included. */
    ran: () => existsSync(calls),
    /** The trees the scanner was pointed at, in order. */
    roots: () => logged().flatMap((call) => (call.root ? [call.root] : [])),
  };
}

/**
 * A stand-in for the pinned Archgate binary that reports one violation
 * whenever the directory it runs in holds the planted file. It logs every call
 * with its working directory, so a case can see which tree each host's G1
 * judged and whether Archgate ran at all.
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
    /** Whether any host ran Archgate, its version probe included. */
    ran: () => existsSync(calls),
    /** The directories Archgate ran in, in order. */
    directories: () => logged().map((call) => call.cwd),
    /** The directories Archgate ran its checks in, its version probe left out. */
    checks: () => logged().flatMap((call) => (call.args[0] === "check" ? [call.cwd] : [])),
  };
}

/**
 * A reviewed module tree whose Archgate package is a stand-in, so a case can
 * see where each host's `pnpm exec archgate` found the command and where it
 * ran it. Every other package and command is the reviewed tree's own, linked.
 */
function standInArchgateModules(t: TestContext) {
  const reviewed = join(repository, "node_modules");
  const modules = mkdtempSync(join(tmpdir(), "superman-deno-modules-"));
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
 * Plant a finding the commit does not hold, ignored by the caller's own
 * exclude file: the exclude file is the clone's and is never committed.
 */
function plantIgnoredFinding(repo: { root: string; write: (file: string, content: string) => void }): void {
  writeIgnored(repo, plantedFinding, "a finding the commit does not hold\n");
}

/** Write a file the commit does not hold, ignored by the caller's own exclude file, which is never committed. */
function writeIgnored(
  repo: { root: string; write: (file: string, content: string) => void },
  file: string,
  content: string,
): void {
  mkdirSync(join(repo.root, ".git/info"), { recursive: true });
  writeFileSync(join(repo.root, ".git/info/exclude"), `${file}\n`, { flag: "a" });
  repo.write(file, content);
}

/** A temporary directory handed to both hosts as their own, so what a run leaves there is visible. */
function runTemporary(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), "superman-deno-run-"));
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
 * Record what both hosts must leave as the caller had it, the working tree
 * with its ignored files, the index bytes, HEAD and the refs, and return the
 * check that they did.
 */
function callerStateKept(repo: { root: string; git: (...args: string[]) => string }): () => void {
  const status = () => repo.git("status", "--porcelain=v1", "--ignored", "--untracked-files=all");
  const refs = () => repo.git("for-each-ref", "--format=%(refname) %(objectname)");
  // Git status may refresh the caller's own index, so it runs before the index
  // bytes are read and after they are compared.
  const tree = status();
  const index = readFileSync(join(repo.root, ".git/index"));
  const head = repo.git("rev-parse", "HEAD");
  const references = refs();
  return () => {
    assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index, "a host rewrote the caller's index");
    assert.equal(repo.git("rev-parse", "HEAD"), head, "a host moved the caller's HEAD");
    assert.equal(refs(), references, "a host changed the caller's refs");
    assert.equal(status(), tree, "a host changed the caller's working tree");
  };
}

test("a local G11 run scans an owned snapshot of the commit, not a file the checkout ignores", (t) => {
  // The input that reaches the scan: a local scoped G11 run over a checkout
  // that holds a finding the commit does not, ignored by the caller's own
  // exclude file. The outcome it produces: both hosts scan an owned snapshot
  // of the commit outside the caller's repository, pass, remove the snapshot
  // when the run ends and leave the caller's state as it was.
  const repo = fixture(t);
  const trivy = scanRootTrivy(repo);
  const temporary = runTemporary(t);
  plantIgnoredFinding(repo);
  const kept = callerStateKept(repo);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G11"], {
    TRIVY_BIN: trivy.binary,
    TMPDIR: temporary,
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(gateResult(observed.deno.receipt, "G11").status, "pass");
  const scanned = new Set(trivy.roots());
  assert.notEqual(scanned.size, 0, "no host scanned");
  for (const root of scanned) {
    assert.ok(outside(realpathSync(repo.root), root), `a host scanned ${root}, inside the caller's repository`);
    assert.equal(existsSync(root), false, "an owned snapshot outlived its run");
  }
  assert.deepEqual(readdirSync(temporary), [], "a host left files in its temporary directory");
  kept();
});

test("a local G11 run whose owned snapshot cannot be built fails with the cause in both hosts", (t) => {
  // The input that reaches the guard: a temporary directory that does not
  // exist, so no owned snapshot can be built. The outcome it produces: G11
  // fails as its own result, naming the cause, and neither host runs the
  // scanner against the checkout.
  const repo = fixture(t);
  const trivy = scanRootTrivy(repo);
  const absent = absentTemporary(t);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G11"], { TRIVY_BIN: trivy.binary, TMPDIR: absent });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  assert.equal(
    observed.deno.receipt?.error,
    undefined,
    "the Deno run failed as a whole instead of as G11's own result",
  );
  const g11 = gateResult(observed.deno.receipt, "G11");
  assert.equal(g11.status, "fail");
  assert.ok(g11.reason?.includes(absent), g11.reason);
  assert.equal(trivy.ran(), false, "a host ran the scanner although its owned snapshot could not be built");
});

test("a local G11 run whose owned snapshot fails midway fails with the cause and removes it in both hosts", (t) => {
  // The input that reaches the guard: a checkout without installed modules,
  // so the owned snapshot fails after its clone, where the modules are linked
  // in. The outcome it produces: G11 fails as its own result in both hosts,
  // neither host runs the scanner, and the partial snapshot is removed. The
  // cause is each runtime's own error text, so it is compared by what it
  // names rather than byte for byte: Node's readdir reports `scandir` where
  // Deno's reports `readdir`.
  const repo = fixture(t);
  // The fixture's link to the reviewed modules: unlinking it removes the link,
  // never the modules it points at.
  unlinkSync(join(repo.root, "node_modules"));
  const trivy = scanRootTrivy(repo);
  const temporary = runTemporary(t);
  const kept = callerStateKept(repo);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G11"], {
    TRIVY_BIN: trivy.binary,
    TMPDIR: temporary,
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed, ["results"]);
  const modules = join(realpathSync(repo.root), "node_modules");
  for (const receipt of [observed.node.receipt, observed.deno.receipt]) {
    assert.equal(receipt?.error, undefined, "a run failed as a whole instead of as G11's own result");
    const g11 = gateResult(receipt, "G11");
    assert.equal(g11.status, "fail");
    assert.equal(g11.kind, "skipped-required-work");
    assert.ok(g11.reason?.includes(modules), g11.reason);
  }
  assert.equal(trivy.ran(), false, "a host ran the scanner although its owned snapshot could not be built");
  assert.deepEqual(readdirSync(temporary), [], "a host left a partial owned snapshot behind");
  kept();
});

test("a committed finding fails a local G11 run in both hosts", (t) => {
  // The input that reaches the scan: a finding the commit holds. The outcome
  // it produces: both hosts fail G11 on it, leave nothing in the temporary
  // directory they were given and leave the caller's state as it was.
  const repo = fixture(t, ({ write }) => {
    write(plantedFinding, "a finding the commit holds\n");
  });
  const trivy = scanRootTrivy(repo);
  const temporary = runTemporary(t);
  const kept = callerStateKept(repo);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G11"], {
    TRIVY_BIN: trivy.binary,
    TMPDIR: temporary,
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  assert.match(gateResult(observed.deno.receipt, "G11").reason ?? "", /Trivy reported 1 HIGH\/CRITICAL finding/u);
  assert.deepEqual(readdirSync(temporary), [], "a host left files in its temporary directory");
  kept();
});

test("the CI and nightly legs' G11 still read the checkout in both hosts", async (t) => {
  // The input that reaches the scan: a CI or nightly G11 run over a checkout
  // that holds an ignored finding, with no temporary directory an owned
  // snapshot could be built in. The outcome it produces: both hosts scan the
  // checkout itself and fail on the finding.
  for (const stage of ["ci", "nightly"]) {
    await t.test(stage, (t) => {
      const repo = fixture(t);
      if (stage === "nightly") {
        // The nightly runs on main and compares it with the main before it.
        repo.git("switch", "--quiet", "main");
        repo.git("commit", "--quiet", "--allow-empty", "-m", "nightly candidate");
      }
      const trivy = scanRootTrivy(repo);
      const observed = runBoth(
        repo,
        ["--stage", stage, "--gate", "G11"],
        { TRIVY_BIN: trivy.binary, TMPDIR: absentTemporary(t) },
        () => plantIgnoredFinding(repo),
      );
      assert.equal(observed.node.status, 1, observed.node.output);
      assertParity(observed);
      assert.match(gateResult(observed.deno.receipt, "G11").reason ?? "", /Trivy reported 1 HIGH\/CRITICAL finding/u);
      assert.deepEqual([...new Set(trivy.roots())], [realpathSync(repo.root)]);
      // The CI and nightly legs keep the whole-tree rule, whatever the host.
      assert.equal(observed.node.receipt?.inputIntegrity.scope, "whole-tree");
    });
  }
});

test("a scoped pre-commit G11 still reads the checkout in both hosts", (t) => {
  // The input that reaches the scan: a scoped G11 run of the staged
  // pre-commit stage over a checkout that holds an ignored finding. The
  // outcome it produces: the staged stage keeps the live checkout, so both
  // hosts scan it and fail on the finding.
  const repo = fixture(t);
  const trivy = scanRootTrivy(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-commit", "--gate", "G11"],
    { TRIVY_BIN: trivy.binary, TMPDIR: absentTemporary(t) },
    () => plantIgnoredFinding(repo),
  );
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  assert.match(gateResult(observed.deno.receipt, "G11").reason ?? "", /Trivy reported 1 HIGH\/CRITICAL finding/u);
  assert.deepEqual([...new Set(trivy.roots())], [realpathSync(repo.root)]);
  // The staged stage binds its index, even for a scoped G11 run.
  assert.equal(observed.node.receipt?.inputIntegrity.scope, "index");
});

test("a local G1 run judges an owned snapshot of the commit, not a file the checkout ignores", (t) => {
  // The input that reaches Archgate: a local scoped G1 run over a checkout
  // that holds a finding the commit does not, ignored by the caller's own
  // exclude file. The outcome it produces: both hosts run Archgate's checks
  // in an owned snapshot of the commit outside the caller's repository, pass,
  // remove the snapshot when the run ends and leave the caller's state as it
  // was.
  const repo = fixture(t);
  const archgate = markerArchgate(repo);
  const temporary = runTemporary(t);
  plantIgnoredFinding(repo);
  const kept = callerStateKept(repo);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G1"], {
    ARCHGATE_BIN: archgate.binary,
    TMPDIR: temporary,
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(gateResult(observed.deno.receipt, "G1").status, "pass");
  const judged = new Set(archgate.checks());
  assert.notEqual(judged.size, 0, "no host ran Archgate's checks");
  for (const root of judged) {
    assert.ok(outside(realpathSync(repo.root), root), `a host judged ${root}, inside the caller's repository`);
    assert.equal(existsSync(root), false, "an owned snapshot outlived its run");
  }
  assert.deepEqual(readdirSync(temporary), [], "a host left files in its temporary directory");
  kept();
});

test("a local G1 run leaves Archgate's regenerated rule declarations out of the caller's checkout in both hosts", (t) => {
  // The input that reaches Archgate: a local scoped G1 run under the real
  // pinned Archgate, which regenerates its rule declarations on every run.
  // The outcome it produces: both hosts pass, and the declarations land in
  // the owned snapshot rather than in the caller's checkout.
  const repo = fixture(t);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G1"]);
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(gateResult(observed.deno.receipt, "G1").status, "pass");
  assert.equal(
    existsSync(join(repo.root, ".archgate/rules.d.ts")),
    false,
    "a host wrote Archgate's rule declarations into the caller's checkout",
  );
});

test("a local G1 run resolves pnpm's archgate inside the owned snapshot in both hosts", (t) => {
  // The input that reaches pnpm: a local scoped G1 run with no explicit
  // Archgate binary, whose reviewed modules carry a stand-in Archgate
  // package. The outcome it produces: each host's pnpm finds archgate in its
  // own snapshot's commands, leads PATH with them, runs every Archgate call
  // inside that snapshot, and records the stand-in's executable version.
  const archgate = standInArchgateModules(t);
  const repo = fixture(t);
  // The fixture's link to the reviewed modules, pointed at the stand-in
  // tree instead; unlinking removes the link, never the modules.
  unlinkSync(join(repo.root, "node_modules"));
  symlinkSync(archgate.modules, join(repo.root, "node_modules"), "dir");
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G1"], {
    ARCHGATE_BIN: undefined,
    TMPDIR: runTemporary(t),
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  for (const receipt of [observed.node.receipt, observed.deno.receipt])
    assert.equal(
      (receipt?.tools as { archgate?: { executableVersion?: string } } | undefined)?.archgate?.executableVersion,
      "archgate 0.61.0 (stand-in)",
    );
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
    assert.equal(existsSync(call.cwd), false, "an owned snapshot outlived its run");
  }
});

test("a local pre-PR run's G1 and G11 read one owned snapshot in each host", (t) => {
  // The input that reaches both gates: a full local pre-PR run with Archgate
  // and Trivy stand-ins that record the tree they read. The outcome it
  // produces: each host's G1 and G11 pass after reading one owned snapshot
  // outside the caller's repository, gone after the run, and both hosts
  // decide G1 and G11 alike. The full run's other gates are not this case's
  // subject, so it compares G1's and G11's results rather than every parity
  // field.
  const repo = fixture(t);
  const archgate = markerArchgate(repo);
  const trivy = scanRootTrivy(repo);
  const observed = runBoth(repo, ["--stage", "pre-pr"], {
    ARCHGATE_BIN: archgate.binary,
    TRIVY_BIN: trivy.binary,
    TMPDIR: runTemporary(t),
  });
  for (const gate of ["G1", "G11"]) {
    assert.equal(
      gateResult(observed.node.receipt, gate).status,
      "pass",
      `${gate} did not pass\n${observed.node.output}`,
    );
    assert.deepEqual(
      gateResult(observed.deno.receipt, gate),
      gateResult(observed.node.receipt, gate),
      `${gate} differs`,
    );
  }
  // Both tools ran in both hosts and read the same trees: each host's one
  // owned snapshot, so Archgate's set and Trivy's set are equal and hold one
  // directory per host.
  const judged = new Set(archgate.directories());
  const scanned = new Set(trivy.roots());
  assert.deepEqual(judged, scanned, "G1 and G11 read different trees");
  assert.equal(judged.size, 2, `the two hosts read ${[...judged].join(", ")}`);
  for (const root of judged) {
    assert.ok(outside(realpathSync(repo.root), root), `a host read ${root}, inside the caller's repository`);
    assert.equal(existsSync(root), false, "an owned snapshot outlived its run");
  }
});

test("a committed suppression fails a local G1 run under the real pinned Archgate in both hosts", (t) => {
  // The input that reaches Archgate: a commit that adds an inline
  // suppression, judged by the real pinned Archgate in each host's owned
  // snapshot. The outcome it produces: both hosts fail G1 on SUP-005, the two
  // reasons agree once Archgate's own timing is set aside, and neither names
  // the snapshot it judged.
  const repo = fixture(t);
  repo.write(
    "src/value.ts",
    "// biome-ignore lint/suspicious/noExplicitAny: forbidden fixture\nexport const value: any = 1;\n",
  );
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "a committed suppression");
  const temporary = runTemporary(t);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G1"], { TMPDIR: temporary });
  assert.equal(observed.node.status, 1, observed.node.output);
  // Archgate reports how long it took, so the reasons are compared with that
  // one number set aside.
  assertParity(observed, ["results"]);
  const untimed = (receipt: Record<string, unknown> | undefined) => {
    const g1 = gateResult(receipt, "G1");
    return { ...g1, reason: g1.reason?.replace(/"durationMs":\s*[\d.]+/gu, '"durationMs": 0') };
  };
  assert.deepEqual(
    untimed(observed.deno.receipt),
    untimed(observed.node.receipt),
    "G1 differs beyond Archgate's timing",
  );
  for (const receipt of [observed.node.receipt, observed.deno.receipt]) {
    const reason = gateResult(receipt, "G1").reason ?? "";
    assert.match(reason, /Inline suppression is forbidden/u);
    assert.ok(
      !reason.includes(temporary) && !reason.includes(realpathSync(temporary)),
      "a G1 reason names the owned snapshot it judged",
    );
  }
});

test("a local G1 run whose owned snapshot cannot be built fails with the cause in both hosts", (t) => {
  // The input that reaches the guard: a temporary directory that does not
  // exist, so no owned snapshot can be built. The outcome it produces: G1
  // fails as its own result, naming the cause, and neither host runs
  // Archgate, not even its version probe.
  const repo = fixture(t);
  const archgate = markerArchgate(repo);
  const absent = absentTemporary(t);
  const observed = runBoth(repo, ["--stage", "pre-pr", "--gate", "G1"], {
    ARCHGATE_BIN: archgate.binary,
    TMPDIR: absent,
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  assert.equal(observed.deno.receipt?.error, undefined, "the Deno run failed as a whole instead of as G1's own result");
  const g1 = gateResult(observed.deno.receipt, "G1");
  assert.equal(g1.status, "fail");
  assert.ok(g1.reason?.includes(absent), g1.reason);
  assert.equal(archgate.ran(), false, "a host ran Archgate although its owned snapshot could not be built");
});

test("the CI and nightly legs' G1 still judge the checkout in both hosts", async (t) => {
  // The input that reaches Archgate: a CI or nightly G1 run over a checkout
  // that holds an ignored finding, with no temporary directory an owned
  // snapshot could be built in. The outcome it produces: both hosts run
  // Archgate in the checkout itself and fail on the finding.
  for (const stage of ["ci", "nightly"]) {
    await t.test(stage, (t) => {
      const repo = fixture(t);
      if (stage === "nightly") {
        // The nightly runs on main and compares it with the main before it.
        repo.git("switch", "--quiet", "main");
        repo.git("commit", "--quiet", "--allow-empty", "-m", "nightly candidate");
      }
      const archgate = markerArchgate(repo);
      const observed = runBoth(
        repo,
        ["--stage", stage, "--gate", "G1"],
        { ARCHGATE_BIN: archgate.binary, TMPDIR: absentTemporary(t) },
        () => plantIgnoredFinding(repo),
      );
      assert.equal(observed.node.status, 1, observed.node.output);
      assertParity(observed);
      assert.match(gateResult(observed.deno.receipt, "G1").reason ?? "", /planted finding in the judged tree/u);
      assert.deepEqual([...new Set(archgate.directories())], [realpathSync(repo.root)]);
      // The CI and nightly legs keep the whole-tree rule, whatever the host.
      assert.equal(observed.node.receipt?.inputIntegrity.scope, "whole-tree");
    });
  }
});

test("a scoped pre-commit G1 still judges the checkout in both hosts", (t) => {
  // The input that reaches Archgate: a scoped G1 run of the staged pre-commit
  // stage over a checkout that holds an ignored finding. The outcome it
  // produces: the staged stage keeps the live checkout, so both hosts run
  // Archgate's whole-repository form there and fail on the finding.
  const repo = fixture(t);
  const archgate = markerArchgate(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-commit", "--gate", "G1"],
    { ARCHGATE_BIN: archgate.binary, TMPDIR: absentTemporary(t) },
    () => plantIgnoredFinding(repo),
  );
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  assert.match(gateResult(observed.deno.receipt, "G1").reason ?? "", /planted finding in the judged tree/u);
  assert.deepEqual([...new Set(archgate.directories())], [realpathSync(repo.root)]);
  // The staged stage binds its index, even for a scoped G1 run.
  assert.equal(observed.node.receipt?.inputIntegrity.scope, "index");
});

test("a local scoped G1 run binds the inputs its gates read and judges the commit in both hosts", (t) => {
  // The input that reaches the binding: a scoped G1 run over a tree that
  // carries an uncommitted edit of a document. The outcome it produces: both
  // hosts bind the inputs their gates read, pass input integrity, and run
  // Archgate's checks in an owned snapshot of the commit.
  const repo = fixture(t, ({ write }) => {
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const archgate = markerArchgate(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-pr", "--gate", "G1"],
    { ARCHGATE_BIN: archgate.binary, TMPDIR: runTemporary(t) },
    () => repo.write(".scratch/demo/note.md", "# Edited note\n"),
  );
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.deepEqual(observed.node.receipt?.inputIntegrity, { scope: "gate-inputs", status: "pass" });
  const judged = new Set(archgate.checks());
  assert.notEqual(judged.size, 0, "no host ran Archgate's checks");
  for (const root of judged)
    assert.ok(outside(realpathSync(repo.root), root), `a host judged ${root}, inside the caller's repository`);
});

test("a local G11 run scans the commit, not a file the checkout holds untracked, in both hosts", (t) => {
  // The input that reaches the scan: a local scoped G11 run over a checkout
  // that holds a finding neither committed nor ignored. The outcome it
  // produces: the file refuses nothing, and both hosts scan an owned snapshot
  // of the commit that does not hold it.
  const repo = fixture(t);
  const trivy = scanRootTrivy(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-pr", "--gate", "G11"],
    { TRIVY_BIN: trivy.binary, TMPDIR: runTemporary(t) },
    () => repo.write(plantedFinding, "a finding the commit does not hold, neither committed nor ignored\n"),
  );
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.deepEqual(observed.node.receipt?.inputIntegrity, { scope: "gate-inputs", status: "pass" });
  const scanned = new Set(trivy.roots());
  assert.notEqual(scanned.size, 0, "no host scanned");
  for (const root of scanned)
    assert.ok(outside(realpathSync(repo.root), root), `a host scanned ${root}, inside the caller's repository`);
});

test("a local G11 run refuses a Trivy config or ignore file the commit holds, though the checkout deleted it, in both hosts", async (t) => {
  // The input that reaches SUP-007's refusal: a Trivy config or ignore file
  // the commit holds and the caller's working copy deleted. The outcome it
  // produces: both hosts refuse it from the root the scan reads, as a policy
  // refusal, before any scanner runs.
  for (const file of ["trivy.yaml", ".trivyignore"]) {
    await t.test(file, (t) => {
      const repo = fixture(t, ({ write }) => {
        write(file, "{}\n");
      });
      const trivy = scanRootTrivy(repo);
      const observed = runBoth(
        repo,
        ["--stage", "pre-pr", "--gate", "G11"],
        { TRIVY_BIN: trivy.binary, TMPDIR: runTemporary(t) },
        () => rmSync(join(repo.root, file)),
      );
      assert.equal(observed.node.status, 1, observed.node.output);
      // Each host's own output names how it decided, so a host that was
      // refused as a whole, or that passed, says so.
      for (const host of [observed.node, observed.deno]) {
        assert.equal(host.receipt?.error, undefined, host.output);
        const g11 = gateResult(host.receipt, "G11");
        assert.equal(g11.kind, "policy-refusal", host.output);
        assert.match(g11.reason ?? "", /G11: Trivy ignore\/config files are forbidden/u);
      }
      assertParity(observed);
      assert.equal(trivy.ran(), false, "a host ran the scanner over a commit that holds a Trivy config or ignore file");
    });
  }
});

test("a local G11 run refuses a commit without the reviewed lockfile, though the checkout holds one, in both hosts", (t) => {
  // The input that reaches the lockfile precondition: a commit without the
  // reviewed lockfile, whose caller's checkout holds a copy the caller's own
  // exclude file ignores. The outcome it produces: both hosts refuse it from
  // the root the scan reads, as a policy refusal, before any scanner runs.
  const repo = fixture(t, ({ root, write }) => {
    rmSync(join(root, "pnpm-lock.yaml"));
    // The G4 preflight resolves vitest.config.ts's package import only against
    // the reviewed lockfile, so a commit without the lockfile stops there
    // while its policy declares that file. This commit's policy declares no
    // Vitest configuration, which G11 never reads; the raw-gates fixture's
    // configuration imports no package.
    rmSync(join(root, "vitest.config.ts"));
    const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    policy.policyInputs = policy.policyInputs.filter((file: string) => file !== "vitest.config.ts");
    write(".superman/ci/bootstrap.json", `${JSON.stringify(policy, null, 2)}\n`);
  });
  const trivy = scanRootTrivy(repo);
  const observed = runBoth(
    repo,
    ["--stage", "pre-pr", "--gate", "G11"],
    { TRIVY_BIN: trivy.binary, TMPDIR: runTemporary(t) },
    () => writeIgnored(repo, "pnpm-lock.yaml", readFileSync(join(repository, "pnpm-lock.yaml"), "utf8")),
  );
  assert.equal(observed.node.status, 1, observed.node.output);
  for (const host of [observed.node, observed.deno]) {
    assert.equal(host.receipt?.error, undefined, host.output);
    const g11 = gateResult(host.receipt, "G11");
    assert.equal(g11.kind, "policy-refusal", host.output);
    assert.match(g11.reason ?? "", /G11: dependency scan requires the reviewed lockfile/u);
  }
  assertParity(observed);
  assert.equal(trivy.ran(), false, "a host ran the scanner over a commit without the reviewed lockfile");
});

test("a declared partial stage may not declare a whole-repository scope", (t) => {
  // The input that reaches the guard: a partial stage that declares the
  // whole-repository scope. The outcome it produces: the declaration is
  // refused, because partial feedback is staged feedback.
  const repo = fixture(t, ({ root, write }) => {
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages["pre-commit"].scope = "full";
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"]);
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /partial feedback must be staged/u);
  assertParity(observed);
  assert.match(observed.deno.output, /partial feedback must be staged/u);
  assert.equal(observed.deno.receipt?.errorKind, "skipped-required-work");
});

test("a declared stage must declare a scope", (t) => {
  // The input that reaches the guard: a stage declaration with no scope at
  // all. The outcome it produces: the declaration is refused as incomplete.
  const repo = fixture(t, ({ root, write }) => {
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    delete bootstrap.stages["pre-commit"].scope;
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"]);
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /invalid scope/u);
  assertParity(observed);
  assert.match(observed.deno.output, /invalid scope/u);
  assert.equal(observed.deno.receipt?.errorKind, "incomplete-report");
});

test("a pre-commit run executes the staged forms and a pre-pr run executes the whole-repository forms", (t) => {
  // The input that reaches the staged branches: a pre-commit stage, whose
  // declared scope is the staged one. The outcome it produces: G1 and G10 run
  // their staged forms, and a pre-PR stage runs the whole-repository ones.
  const staged = fixture(t);
  const stagedRun = runBoth(staged, ["--stage", "pre-commit"]);
  assert.equal(stagedRun.node.status, 0, stagedRun.node.output);
  assertParity(stagedRun);
  assert.equal(stagedRun.deno.receipt?.inputScope, "staged");
  // The staged stage binds its index, in both hosts.
  assert.equal(stagedRun.node.receipt?.inputIntegrity.scope, "index");
  for (const gate of ["G1", "G10"]) {
    assert.equal(
      gateResult(stagedRun.deno.receipt, gate).scope,
      "staged",
      `${gate} did not run its staged form in the Deno sibling`,
    );
  }
  const full = fixture(t);
  const fullRun = runBoth(full, ["--stage", "pre-pr"]);
  assert.equal(fullRun.deno.receipt?.inputScope, "full");
  for (const gate of ["G1", "G10"]) {
    assert.equal(
      gateResult(fullRun.deno.receipt, gate).scope,
      "full",
      `${gate} did not run its whole-repository form in the Deno sibling`,
    );
  }
});

test("each host typechecks its own graph in G2", (t) => {
  // The input that reaches the guard: a staged run over a green fixture. The
  // outcome it produces: the Node original's G2 keeps its own graph check and
  // the Deno sibling's G2 adds the Deno graph check, and the two receipts
  // still agree on every other decision.
  const repo = fixture(t);
  const observed = runBoth(repo, ["--stage", "pre-commit"]);
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  assert.equal(gateResult(observed.node.receipt, "G2").denoCheck, undefined);
  const denoCheck = gateResult(observed.deno.receipt, "G2").denoCheck;
  assert.ok(denoCheck, "the Deno sibling's G2 does not report the Deno check");
  assert.equal(denoCheck.scope, "the whole Deno operational graph");
  assert.ok((denoCheck.modules?.length ?? 0) > 1, "the Deno check covered a single module");
});

test("a staged G9 passes when the staged test file is green", (t) => {
  // The input that reaches the staged G9: a staged test file whose staged
  // content is green. The outcome it produces: both hosts pass, and the two
  // receipts agree field for field.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.scope, "staged");
  assert.deepEqual(outcome.stagedTests, ["test/value.test.ts"]);
  assert.match(outcome.checked ?? "", /staged test files were run against the staged content/u);
  assert.match(outcome.notChecked ?? "", /red-on-base/u);
  assert.equal(observed.deno.receipt?.verdict, "partial-feedback");
  assert.equal(
    observed.deno.receipt?.behaviorReplay,
    undefined,
    "The staged scope never claims the red-on-base replay",
  );
  assert.deepEqual(
    observed.deno.receipt?.tools,
    observed.node.receipt?.tools,
    "the pinned tool identities differ between the Node original and the Deno sibling",
  );
});

test("the parity assertion reads the tool's text, not the terminal's colour", () => {
  // The captured output of a test runner that wrote to a terminal: the same
  // failure text, with the terminal's colour escape interleaved. A CI runner
  // gives its steps a terminal, so this is the shape the assertion really
  // meets there — and the shape that must still match.
  const coloured = "AssertionError\u001b[22m: expected 1 to be 2";
  assert.doesNotMatch(coloured, /AssertionError: expected 1 to be 2/u);
  assert.match(stripAnsi(coloured), /AssertionError: expected 1 to be 2/u);
});

test("a staged G9 fails when the staged test file is red", (t) => {
  // The input that reaches the staged G9: a staged test file whose staged
  // content is red. The outcome it produces: both hosts fail with the same
  // failure kind and name the same command; the test runner's own output
  // carries its timings, so only the line that names the command is compared.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", redStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed, ["results"]);
  const node = gateResult(observed.node.receipt, "G9");
  const deno = gateResult(observed.deno.receipt, "G9");
  assert.equal(deno.status, "fail");
  assert.equal(deno.kind, "failed-command");
  assert.equal(deno.kind, node.kind);
  assert.equal(deno.scope, "staged");
  assert.deepEqual(deno.stagedTests, ["test/value.test.ts"]);
  assert.deepEqual(deno.stagedTests, node.stagedTests);
  assert.match(deno.checked ?? "", /staged test files were run against the staged content/u);
  assert.equal(failureLine(deno.reason), failureLine(node.reason));
  assert.match(failureLine(deno.reason), /vitest run .* failed \(1\)/u);
  assert.match(stripAnsi(observed.deno.output), /AssertionError: expected 1 to be 2/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 reports n/a when no staged file is a test file", (t) => {
  // The input that reaches the staged G9: a staged change that is not a test
  // file. The outcome it produces: both hosts report the gate inapplicable
  // with the same reason.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write);
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Staged note\n");
    repo.git("add", ".scratch/demo/note.md");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "n/a");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /no staged file is a test file/u);
  assert.equal(outcome.stagedTests, undefined);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.match(outcome.notChecked ?? "", /red-on-base/u);
  assert.equal(observed.deno.receipt?.verdict, "partial-feedback");
});

test("a staged G9 refuses a staged test file that is not a regular file", (t) => {
  // The input that reaches the guard: a staged test file that is a symlink.
  // The outcome it produces: both hosts refuse it, because the bytes a
  // symlinked test would run are not the staged bytes.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    symlinkSync("../src/cli.ts", join(repo.root, "test/alias.test.ts"));
    repo.git("add", "test/alias.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /staged test file must be a regular file: test\/alias\.test\.ts/u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 refuses a Node pin the reviewed policy does not declare", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a Node
  // pin the runtime does not have. The outcome it produces: both hosts refuse
  // the run instead of testing under an undeclared runtime.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write, (policy) => {
      policy.tools.node = "0.0";
    });
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /Node pin expected 0\.0, actual /u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 refuses a pnpm pin the reviewed policy does not declare", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a pnpm
  // pin the installed pnpm does not have. The outcome it produces: both hosts
  // refuse the run instead of testing under an undeclared package manager.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write, (policy) => {
      policy.tools.pnpm = "0.0.0";
    });
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /pnpm pin expected 0\.0\.0, actual /u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 refuses a Vitest pin the declared and installed versions do not match", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a
  // Vitest pin the declared and installed Vitest do not have. The outcome it
  // produces: both hosts refuse the run instead of testing under an
  // undeclared test runner.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write, (policy) => {
      policy.tools.vitest = "0.0.0";
    });
    // The reviewed Vitest resolution profile is a policy input: the fixture
    // declares its own Vitest configuration so the gate under test, not the
    // policy preflight, refuses the mismatched pin.
    write("vitest.config.ts", 'export default { test: { include: ["test/**/*.test.ts", "src/**/*.test.ts"] } };\n');
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /vitest pin expected 0\.0\.0, declared 5\.0\.5, installed 5\.0\.5/u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 refuses a Vitest executable that reports another version", (t) => {
  // The input that reaches the guard: a pnpm whose `exec vitest --version`
  // reports a version the reviewed policy does not declare. The outcome it
  // produces: both hosts refuse the run instead of testing under an
  // undeclared executable.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    rmSync(join(repo.root, ".tools/pnpm"), { force: true });
    writeFileSync(join(repo.root, ".tools/pnpm"), pnpmVersionShim, { mode: 0o755 });
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /vitest executable version mismatch: vitest\/0\.0\.0/u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G9 refuses a bootstrap policy with no declared test files", (t) => {
  // The input that reaches the guard: a reviewed policy that declares no test
  // file pattern. The outcome it produces: both hosts refuse the run instead
  // of selecting test files from an undeclared inventory.
  const repo = fixture(t, ({ root, write }) => {
    stagedG9Stage(root, write, (policy) => {
      policy.test.files = [];
    });
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "incomplete-report");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason ?? "", /invalid bootstrap tool\/test policy/u);
  assert.match(outcome.checked ?? "", /no staged test file was checked/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G5 reports n/a when no staged file is in the duplication corpus", (t) => {
  // The input that reaches the staged G5: a staged change that is not a
  // corpus file. The outcome it produces: both hosts report the gate
  // inapplicable with the same reason, and neither invents a pass.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Staged note\n");
    repo.git("add", ".scratch/demo/note.md");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G5");
  assert.equal(outcome.status, "n/a");
  assert.equal(outcome.scope, "staged");
  assert.match(
    outcome.reason ?? "",
    /no changed file is a regular source file in the declared duplication corpus \(src\/\*\*\/\*\.ts\); nothing was scanned/u,
  );
  assert.match(outcome.checked ?? "", /none of them is in it, so no file was scanned/u);
  // The result says what it did not check, so a partial result is never read
  // as the merge bar.
  assert.match(outcome.notChecked ?? "", /merge bar/u);
  assert.equal(outcome.metrics, undefined);
  assert.equal(outcome.evidence, undefined);
  assert.equal(observed.deno.receipt?.verdict, "partial-feedback");
});

test("a staged G5 refuses a staged change that introduces a clone", (t) => {
  // The input that reaches the staged G5: a staged change that gives a corpus
  // file a partner it duplicates. The outcome it produces: both hosts fail
  // with the same failure kind and name the same clone pair.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
    write("src/clone-a.ts", repeatedSource());
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("src/clone-a.ts", `${repeatedSource()}\nexport const extra = 1;\n`);
    repo.write("src/clone-b.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts", "src/clone-b.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const node = gateResult(observed.node.receipt, "G5");
  const deno = gateResult(observed.deno.receipt, "G5");
  assert.equal(deno.status, "fail");
  assert.equal(deno.kind, "policy-refusal");
  assert.equal(deno.kind, node.kind);
  assert.equal(deno.reason, node.reason);
  assert.match(deno.reason ?? "", /introduce 1 duplicate clone\(s\) the approved base does not have/u);
  assert.match(deno.reason ?? "", /src\/clone-a\.ts <-> src\/clone-b\.ts \(18 line\(s\), 103 token\(s\)\)/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G5 passes when the clone already existed at the approved base", (t) => {
  // The input that reaches the staged G5: a staged change that moves both
  // members of a pair the approved base already cloned. The outcome it
  // produces: both hosts pass, because a clone the base already has is the
  // base's, not this change's.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
    write("src/clone-a.ts", repeatedSource());
    write("src/clone-b.ts", repeatedSource());
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("src/clone-a.ts", `${repeatedSource()}\nexport const extraA = 1;\n`);
    repo.write("src/clone-b.ts", `${repeatedSource()}\nexport const extraB = 2;\n`);
    repo.git("add", "src/clone-a.ts", "src/clone-b.ts");
  });
  assert.equal(observed.node.status, 0, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G5");
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.scope, "staged");
  assert.equal(outcome.metrics?.clones, 1);
  assert.equal(outcome.metrics?.sources, 2);
  assert.equal(typeof outcome.metrics?.changedFilesPct, "number");
  assert.equal(outcome.metrics?.jscpdPct, undefined);
  assert.deepEqual(outcome.evidence?.files, ["src/clone-a.ts", "src/clone-b.ts"]);
  assert.equal(outcome.evidence?.preexistingClones, 1);
  assert.equal(outcome.evidence?.baseClones, 1);
  assert.deepEqual(outcome.evidence?.introduced, []);
  assert.equal(outcome.evidence?.candidate, "the staged index");
  assert.match(outcome.checked ?? "", /the changed files in the declared duplication corpus/u);
  assert.match(outcome.notChecked ?? "", /merge bar/u);
  assert.equal(observed.deno.receipt?.verdict, "partial-feedback");
});

test("a staged G5 refuses a staged jscpd profile that differs from the reviewed base profile", (t) => {
  // The input that reaches the guard: a staged jscpd profile whose clone
  // floors differ from the reviewed base profile. The outcome it produces:
  // both hosts refuse it, because the measurement policy is not the change's
  // to alter.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
    profile.minTokens = 40;
    repo.write(".jscpd.json", `${JSON.stringify(profile, null, 2)}\n`);
    repo.git("add", ".jscpd.json");
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G5");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(
    outcome.reason ?? "",
    /the staged jscpd profile differs from the reviewed base profile; the measurement policy is not the change's to alter/u,
  );
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G5 refuses a reviewed profile that is not the reviewed measurement profile", (t) => {
  // The input that reaches the guard: a reviewed base whose jscpd profile
  // lowers the reviewed clone floors. The outcome it produces: both hosts
  // refuse the run instead of measuring under a profile the base lowered.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
    const profile = JSON.parse(readFileSync(join(root, ".jscpd.json"), "utf8"));
    profile.minTokens = 40;
    write(".jscpd.json", `${JSON.stringify(profile, null, 2)}\n`);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G5");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(
    outcome.reason ?? "",
    /the reviewed jscpd profile does not declare the reviewed clone floors \(50 tokens, 5 lines\)/u,
  );
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged G5 refuses a staged source-level jscpd exclusion", (t) => {
  // The input that reaches the guard: a staged corpus file that carries a
  // source-level jscpd ignore range. The outcome it produces: both hosts
  // refuse it, because a source may not exclude itself from the scan.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"], {}, () => {
    repo.write(
      "src/clone-a.ts",
      `// jscpd:ignore-start\n${repeatedSource()}// jscpd:ignore-end\nexport const distinct = 2;\n`,
    );
    repo.git("add", "src/clone-a.ts");
  });
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G5");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.reason ?? "", /source-level jscpd ignore range is forbidden: src\/clone-a\.ts/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});

test("a staged scope refuses a gate that declares no staged form", (t) => {
  // The input that reaches the guard: a staged stage whose inventory names
  // G6, the gate that owns no staged form. The outcome it produces: both
  // hosts refuse it, because the full scope owns that gate.
  const repo = fixture(t, ({ root, write }) => {
    stagedG5Stage(root, write, ["G6"]);
  });
  const observed = runBoth(repo, ["--stage", "pre-commit"]);
  assert.equal(observed.node.status, 1, observed.node.output);
  assertParity(observed);
  const outcome = gateResult(observed.deno.receipt, "G6");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.reason ?? "", /the staged scope declares no form of this gate; the full scope owns it/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
});
