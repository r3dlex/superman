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
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
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
  // carries an uncommitted change. The outcome it produces: the run is
  // refused, because the evidence would not bind a committed snapshot.
  const repo = fixture(t, ({ write }) => {
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const observed = runBoth(repo, ["--stage", "pre-pr"], {}, () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
  });
  assert.notEqual(observed.node.status, 0);
  assert.match(observed.node.output, /dirty inputs; commit or preserve them before replay/u);
  assertParity(observed);
  assert.match(observed.deno.output, /dirty inputs; commit or preserve them before replay/u);
  assert.equal(observed.deno.receipt?.verdict, "fail");
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
