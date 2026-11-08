// Public process suite for the operational Deno root's gate, replay, quality
// and helper boundary.
//
// The suite is Node-hosted on purpose: it drives the pinned Deno runtime as a
// child and compares what the Deno sibling observes against what the Node
// original observes for the same fixture. Every fixture writes to a
// `mkdtempSync` root; nothing is written into the repository tree.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixtureEnvironment } from "../../ci/fixture-env.ts";
import { fixture } from "../../ci/raw-fixture.ts";
import { runOwned } from "../../ci/replay.ts";
import { DENO_LAUNCH_FLAGS, DENO_PERMISSIONS } from "../exec.ts";
import { parseNodeVersion } from "../replay.ts";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const denoRoot = join(repository, ".superman/deno-bootstrap");
const isolated = fixtureEnvironment();

/** The explicit runtime identity. An implicit PATH lookup is not a launch. */
function explicitDeno(): string {
  const binary = process.env.SUPERMAN_DENO_BIN;
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  return binary;
}

/**
 * The reviewed permission profile of the collector and the gates.
 *
 * The grants are explicit classes, never a blanket grant, and the ambient
 * configuration and dependency discovery are neutralized. The profile is the
 * operational one the exec seam declares, so the harness and the module it
 * drives grant exactly the same capabilities.
 */
function denoProfile(): string[] {
  return [...DENO_LAUNCH_FLAGS, ...DENO_PERMISSIONS];
}

/** The environment the fixture's own tools are found through. */
function fixtureEnv(root: string, branch: string, extra: Record<string, string | undefined> = {}) {
  return {
    ...isolated,
    PATH: `${join(root, ".tools")}${delimiter}${isolated.PATH}`,
    HEAD_REF: branch,
    // The test runner's own context is not part of the environment the gate
    // runs in: a child that inherits it reports as a test child instead of
    // running the case, and the declared critical cases would never execute.
    NODE_TEST_CONTEXT: undefined,
    ...(process.env.DENO_COVERAGE_DIR ? { DENO_COVERAGE_DIR: process.env.DENO_COVERAGE_DIR } : {}),
    ...extra,
  };
}

/** The sibling's own raw-gates entry point. */
const siblingEntry = join(denoRoot, "raw-gates.ts");

/** What one run of the Deno sibling needs. */
type DenoRun = {
  /** The entry the sibling runs: its own, or a copy of its own. */
  entry?: string;
  /** The gate the run selects. */
  gate: string;
  /** The branch the run is over. */
  branch: string;
  /** The environment the run adds to the fixture's own. */
  extra?: Record<string, string | undefined>;
  /** The arguments the run adds to the gate selection. */
  args?: string[];
  /** What runs before the receipt is read. */
  perturb?: (path: string) => void;
};

/**
 * Run the Deno sibling's raw gates over the fixture.
 *
 * The entry is the sibling's own entry point or a copy of it: a copy's G2
 * checks the copy's own operational graph, which is how a broken graph is
 * reached. The receipt is read before the next run overwrites it, so the Node
 * and the Deno receipts can be compared.
 */
function runDenoGate(repo: { root: string }, run: DenoRun) {
  const receiptPath = join(repo.root, ".git", "receipt-deno.json");
  const result = runOwned(
    explicitDeno(),
    [
      "run",
      ...denoProfile(),
      run.entry ?? siblingEntry,
      "--gate",
      run.gate,
      "--receipt",
      receiptPath,
      ...(run.args ?? []),
    ],
    {
      cwd: repo.root,
      env: fixtureEnv(repo.root, run.branch, run.extra ?? {}),
      encoding: "utf8",
      shell: false,
      timeout: 600_000,
    },
  );
  assert.ifError(result.error);
  // The perturbation runs before the receipt is read, so a guard can prove
  // that the comparison sees the sibling's own receipt.
  run.perturb?.(receiptPath);
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    receipt: existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, "utf8")) : undefined,
  };
}

/** What each host observed for the same fixture. */
type Observed = {
  node: { status: number | null; output: string };
  nodeEvidence: Record<string, unknown> | undefined;
  deno: { status: number | null; output: string };
  denoEvidence: Record<string, unknown> | undefined;
};

/** Run both hosts over the same fixture and collect what each observed. */
function observe(
  repo: ReturnType<typeof fixture>,
  gate: string,
  branch: string,
  extra: Record<string, string | undefined> = {},
  perturb?: (path: string) => void,
): Observed {
  // Both hosts get the same environment: a comparison over two different
  // environments would compare two different runs.
  const node = repo.runGate(gate, [], { NODE_TEST_CONTEXT: undefined, ...extra });
  const nodeEvidence = nodeReceipt(repo);
  const deno = runDenoGate(repo, { gate, branch, extra, perturb });
  // The sibling's own receipt, not the Node original's: comparing the Node
  // receipt with itself would pass for every divergence.
  const denoEvidence = deno.receipt;
  return { node, nodeEvidence, deno, denoEvidence };
}

/** The receipt fields both hosts must agree on. */
const PARITY_FIELDS = [
  "results",
  "scope",
  "feedback",
  "satisfiesFullBar",
  "verdict",
  "inputIntegrity",
  "tools",
  "behaviorReplay",
  "policyPreflight",
];

/** The parity assertion every gate comparison shares. */
function assertParity(observed: Observed): void {
  assert.equal(observed.deno.status, observed.node.status, observed.deno.output);
  for (const field of PARITY_FIELDS)
    assert.deepEqual(
      observed.denoEvidence?.[field],
      observed.nodeEvidence?.[field],
      `${field} differs between the Node original and the Deno sibling`,
    );
}

/** What the Deno sibling's G2 records about its own graph check. */
type DenoCheck = {
  runtime?: { executable?: string; version?: string };
  entryPoints?: string[];
  modules?: string[];
  scope?: string;
};

/** One gate result of a receipt. */
function gateResult(receipt: Record<string, unknown> | undefined, index = 0) {
  const results = receipt?.results;
  if (!Array.isArray(results))
    return {} as { gate?: string; status?: string; reason?: string; kind?: string; denoCheck?: DenoCheck };
  return (results[index] ?? {}) as {
    gate?: string;
    status?: string;
    reason?: string;
    kind?: string;
    denoCheck?: DenoCheck;
  };
}

/** The Node original's receipt for the same fixture, read before the Deno run. */
function nodeReceipt(repo: { root: string; receiptPath: string }) {
  return existsSync(repo.receiptPath) ? JSON.parse(readFileSync(repo.receiptPath, "utf8")) : undefined;
}

/** A candidate change that fails at the approved base and passes at the head. */
function regression(repo: { write: (file: string, content: string) => void }) {
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test("behavior", () => expect(value).toBe(1));\n',
  );
}

/** A candidate change whose base is missing a product symbol the test calls. */
function missingSymbol(repo: { write: (file: string, content: string) => void }) {
  repo.write("src/value.ts", "export const value = 0; export function newValue() { return 1; }\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { newValue } from "../src/value.ts"; test("new export", () => expect(newValue()).toBe(1));\n',
  );
}

test("the Deno replay reads the Node runtime's version the way the runtime reports it", () => {
  assert.equal(parseNodeVersion("v26.5.0\n"), "26.5.0");
  // A version-manager shim can print its own log line on stdout before the
  // version, and the pin check must still read the runtime's own value.
  assert.equal(parseNodeVersion('{"level":"info","msg":"installing node"}\nv26.5.0\n'), "26.5.0");
  assert.equal(parseNodeVersion("v26.5.0\nv26.5.0\n"), "26.5.0");
  assert.throws(() => parseNodeVersion(""), /did not report a version/u);
});

test("the Deno raw gates keep the applicability decision the Node original makes", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.commit();
  const observed = observe(repo, "G9", "spec/demo");
  assertParity(observed);
  assert.equal(gateResult(observed.denoEvidence).status, "n/a");
  assert.equal(gateResult(observed.denoEvidence).reason, "spec-kind");
  assert.equal(observed.denoEvidence?.verdict, observed.nodeEvidence?.verdict);
});

test("the Deno raw gates distinguish zero, one and two outcomes the Node original distinguishes", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.commit();
  // Zero failures: the protected-input preflight passes.
  const passed = observe(repo, "G4", "ticket/demo-01");
  assertParity(passed);
  assert.equal(gateResult(passed.denoEvidence).status, "pass");
  // One failure, and the failure kind is the tool-failure distinction.
  const failed = observe(repo, "G11", "ticket/demo-01", {
    TRIVY_BIN: join(repo.root, ".tools", "absent-trivy"),
  });
  assertParity(failed);
  assert.equal(gateResult(failed.denoEvidence).status, "fail");
  assert.equal(gateResult(failed.denoEvidence).kind, "missing-tool");
});

test("the Deno raw gates record a complete receipt for every selected gate", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.commit();
  const observed = observe(repo, "G4", "ticket/demo-01");
  assertParity(observed);
  const scope = observed.denoEvidence?.scope;
  const results = observed.denoEvidence?.results;
  assert.ok(Array.isArray(scope));
  assert.ok(Array.isArray(results));
  assert.equal(results.length, scope.length);
  assert.equal(observed.denoEvidence?.feedback, observed.nodeEvidence?.feedback);
  assert.equal(observed.denoEvidence?.satisfiesFullBar, observed.nodeEvidence?.satisfiesFullBar);
  assert.deepEqual(observed.denoEvidence?.inputIntegrity, observed.nodeEvidence?.inputIntegrity);
  assert.deepEqual(observed.denoEvidence?.tools, observed.nodeEvidence?.tools);
  // The run profile is what two hosts compare: the same shape, the same
  // reviewed policy and tool identity, and each host's own driver identity.
  const denoProfile = observed.denoEvidence?.profile as Record<string, string> | undefined;
  const nodeProfile = observed.nodeEvidence?.profile as Record<string, string> | undefined;
  assert.ok(denoProfile && nodeProfile);
  assert.deepEqual(Object.keys(denoProfile).sort(), Object.keys(nodeProfile).sort());
  assert.equal(denoProfile.tools, nodeProfile.tools);
  assert.equal(denoProfile.policy, nodeProfile.policy);
  assert.notEqual(denoProfile.driver, nodeProfile.driver);
});

test("the Deno replay distinguishes a completed behavior assertion from an approval", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  regression(repo);
  repo.commit();
  const observed = observe(repo, "G9", "ticket/demo-01");
  assertParity(observed);
  const replay = observed.denoEvidence?.behaviorReplay as
    | { baseOutcome?: unknown; candidateOutcome?: unknown }
    | undefined;
  assert.deepEqual(replay?.baseOutcome, {
    status: "fail",
    category: "assertion",
    testsCompleted: 1,
  });
  assert.deepEqual(replay?.candidateOutcome, { status: "pass", testsCompleted: 1 });
});

test("the Deno replay confirms a missing product symbol with the compiler evidence", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  missingSymbol(repo);
  repo.commit();
  const observed = observe(repo, "G9", "ticket/demo-01");
  assertParity(observed);
  const replay = observed.denoEvidence?.behaviorReplay as
    | { baseOutcome?: { status?: string; category?: string }; candidateOutcome?: { status?: string } }
    | undefined;
  assert.equal(replay?.baseOutcome?.status, "fail");
  assert.equal(replay?.baseOutcome?.category, "missing-symbol");
  assert.equal(replay?.candidateOutcome?.status, "pass");
});

test("the parity harness rejects a diverged Deno receipt", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.commit();
  // The sibling's own receipt is diverged on disk. A parity assertion that
  // compares the Node receipt with itself cannot see this, so the guard
  // fails: the harness has to read the sibling's receipt to be a parity
  // assertion at all.
  const diverge = (path: string) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    receipt.feedback = "DIVERGED";
    writeFileSync(path, JSON.stringify(receipt));
  };
  assert.throws(
    () => assertParity(observe(repo, "G4", "ticket/demo-01", {}, diverge)),
    /DIVERGED/u,
    "the parity assertion accepted a diverged Deno receipt",
  );
});

/**
 * The version the pinned Deno reports.
 *
 * The gate binds the runtime it runs under, so the expectation is the
 * runtime's own version and not a literal that could drift.
 */
function denoVersion(): string {
  const result = runOwned(explicitDeno(), ["--version"], { encoding: "utf8", shell: false, timeout: 60_000 });
  assert.ifError(result.error);
  return /^deno (\d+\.\d+\.\d+)/mu.exec(result.stdout)?.[1] ?? "";
}

/** The green test the G2 fixture runs: the product source and its test. */
const GREEN_TEST =
  'import { expect, test } from "vitest";\nimport { value } from "../src/value.ts";\ntest("behavior", () => expect(value).toBe(0));\n';

/**
 * A fixture whose Deno root is a copy of the sibling's own.
 *
 * The copy is the sibling's own source root, so the copy's G2 checks the
 * copy's own operational graph. The copy lives outside the fixture's
 * repository, so the fixture stays the committed tree the gate reads.
 */
function denoRootFixture(t: TestContext, prepare?: (copy: string) => void) {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("test/value.test.ts", GREEN_TEST);
  repo.commit();
  const directory = mkdtempSync(join(tmpdir(), "superman-deno-root-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const copy = join(directory, "deno-bootstrap");
  cpSync(denoRoot, copy, { recursive: true });
  prepare?.(copy);
  return { repo, copy };
}

test("the Deno sibling's G2 runs the Deno check over the whole operational graph", (t) => {
  // The input that reaches the guard: a G2 run over a green fixture. The
  // outcome it produces: the gate checked the Deno operational graph and
  // reported it, and the receipt names every module the check covered.
  const repo = fixture(t, "ticket/demo-01");
  repo.write("test/value.test.ts", GREEN_TEST);
  repo.commit();
  const observed = runDenoGate(repo, { gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 0, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "pass");
  const check = result.denoCheck;
  assert.ok(check, "the G2 result does not report the Deno check");
  // The graph is complete: every operational module of the Deno root is
  // named, and the entry points are the modules no sibling module imports.
  assert.deepEqual(check.modules, [
    "archgate-arm64-build.ts",
    "archgate-linux-arm64-wizard.ts",
    "coverage.ts",
    "direct-gates.ts",
    "exec.ts",
    "fixture-env.ts",
    "pr-policy.ts",
    "provision-tools.ts",
    "quality.ts",
    "raw-gates.ts",
    "replay.ts",
  ]);
  assert.deepEqual(check.entryPoints, [
    "archgate-arm64-build.ts",
    "archgate-linux-arm64-wizard.ts",
    "coverage.ts",
    "pr-policy.ts",
    "provision-tools.ts",
    "raw-gates.ts",
  ]);
  assert.equal(check.scope, "the whole Deno operational graph");
  // The runtime identity is bound in the receipt, and the pin it was
  // compared against is the one the Deno root itself declares.
  const tools = observed.receipt?.tools as Record<string, { expected?: string; actual?: string; executable?: string }>;
  assert.equal(tools.deno?.expected, denoVersion());
  assert.equal(tools.deno?.actual, denoVersion());
  assert.equal(tools.deno?.executable, explicitDeno());
});

test("a failing Deno check fails the Deno sibling's G2 with the tool's own output", (t) => {
  // The input that reaches the guard: a type error in a module no entry
  // point imports, so only a complete-graph check finds it. The outcome it
  // produces: the gate fails with the checker's own diagnostic.
  const { repo, copy } = denoRootFixture(t, (root) => {
    const replay = join(root, "replay.ts");
    writeFileSync(replay, `${readFileSync(replay, "utf8")}\nexport const broken: string = 42;\n`);
  });
  const observed = runDenoGate(repo, { entry: join(copy, "raw-gates.ts"), gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "failed-command", observed.output);
  assert.match(result.reason ?? "", /TS2322/u);
  assert.match(result.reason ?? "", /Type 'number' is not assignable to type 'string'/u);
});

test("the Deno sibling refuses a Deno runtime whose version disagrees with the reviewed pin", (t) => {
  // The input that reaches the guard: a Deno root whose CI template declares
  // another pinned version. The outcome it produces: the gate refuses the
  // runtime instead of checking the graph under an unreviewed one.
  const { repo, copy } = denoRootFixture(t, (root) => {
    const template = join(root, "ci.template.yml");
    writeFileSync(
      template,
      readFileSync(template, "utf8").replace(/deno_version: \d+\.\d+\.\d+/gu, "deno_version: 9.9.9"),
    );
  });
  const observed = runDenoGate(repo, { entry: join(copy, "raw-gates.ts"), gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "policy-refusal", observed.output);
  assert.match(result.reason ?? "", /Deno pin expected 9\.9\.9, actual \d+\.\d+\.\d+/u);
});

test("the Deno sibling refuses a Deno root that declares no pinned version", (t) => {
  // The input that reaches the guard: a Deno root whose CI template is
  // gone, so no reviewed pin is declared. The outcome it produces: the gate
  // refuses to guess the pinned version.
  const { repo, copy } = denoRootFixture(t, (root) => {
    rmSync(join(root, "ci.template.yml"), { force: true });
  });
  const observed = runDenoGate(repo, { entry: join(copy, "raw-gates.ts"), gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "policy-refusal", observed.output);
  assert.match(result.reason ?? "", /the Deno root declares no CI template/u);
});

test("the Deno sibling refuses a Deno root that declares two pinned versions", (t) => {
  // The input that reaches the guard: a Deno root whose CI template declares
  // two different pinned versions. The outcome it produces: the gate refuses
  // the declaration instead of picking one of them.
  const { repo, copy } = denoRootFixture(t, (root) => {
    const template = join(root, "ci.template.yml");
    const declared = readFileSync(template, "utf8").replace(/deno_version: \d+\.\d+\.\d+/u, "deno_version: 9.9.9");
    writeFileSync(template, declared);
  });
  const observed = runDenoGate(repo, { entry: join(copy, "raw-gates.ts"), gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "policy-refusal", observed.output);
  assert.match(result.reason ?? "", /declares 2 pinned Deno versions/u);
});

test("the Deno sibling refuses a runtime that is not a Deno", (t) => {
  // The input that reaches the guard: an environment that names a binary
  // which is not a Deno runtime. The outcome it produces: the gate reports
  // the failed identity probe instead of a check it could not run.
  const repo = fixture(t, "ticket/demo-01");
  repo.write("test/value.test.ts", GREEN_TEST);
  repo.commit();
  const observed = runDenoGate(repo, {
    gate: "G2",
    branch: "ticket/demo-01",
    extra: { SUPERMAN_DENO_BIN: process.execPath },
  });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "failed-command", observed.output);
  assert.match(result.reason ?? "", /the Deno runtime did not report a version/u);
});

test("the Deno sibling refuses a missing pinned Deno runtime", (t) => {
  // The input that reaches the guard: an environment that names a Deno
  // binary which is not there. The outcome it produces: the gate reports a
  // missing tool instead of a check it could not run.
  const repo = fixture(t, "ticket/demo-01");
  repo.write("test/value.test.ts", GREEN_TEST);
  repo.commit();
  const observed = runDenoGate(repo, {
    gate: "G2",
    branch: "ticket/demo-01",
    extra: { SUPERMAN_DENO_BIN: join(repo.root, ".tools", "absent-deno") },
  });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "missing-tool");
});

test("the Deno sibling refuses an operational graph it cannot cover", (t) => {
  // The input that reaches the guard: two modules that import each other, so
  // no entry point reaches them. The outcome it produces: the gate refuses
  // the graph instead of checking it in part.
  const { repo, copy } = denoRootFixture(t, (root) => {
    writeFileSync(join(root, "cycle-a.ts"), 'import "./cycle-b.ts";\nexport const a = 1;\n');
    writeFileSync(join(root, "cycle-b.ts"), 'import "./cycle-a.ts";\nexport const b = 1;\n');
  });
  const observed = runDenoGate(repo, { entry: join(copy, "raw-gates.ts"), gate: "G2", branch: "ticket/demo-01" });
  assert.equal(observed.status, 1, observed.output);
  const result = gateResult(observed.receipt);
  assert.equal(result.status, "fail");
  assert.equal(result.kind, "policy-refusal", observed.output);
  assert.match(result.reason ?? "", /the Deno operational graph does not cover cycle-a\.ts, cycle-b\.ts/u);
});

/**
 * A fixture whose approved base carries the given quality policy.
 *
 * The reviewed policy is committed at the approved base, so the gate reads the
 * declared policy from the base tree, exactly as the Node original does.
 */
function qualityFixture(t: TestContext, quality: Record<string, unknown>, extra?: Record<string, string>) {
  const repo = fixture(t, "ticket/demo-01");
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8")) as Record<
    string,
    unknown
  >;
  policy.quality = quality;
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
  for (const [file, content] of Object.entries(extra ?? {})) repo.write(file, content);
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.commit();
  return repo;
}

/** The decision both hosts made for one gate: the status and the failure kind. */
function decisions(receipt: Record<string, unknown> | undefined): { gate?: string; status?: string; kind?: string }[] {
  const results = receipt?.results;
  if (!Array.isArray(results)) return [];
  return results as { gate?: string; status?: string; kind?: string }[];
}

test("the Deno quality gate keeps the corrected clone-floor decision the Node original makes", (t) => {
  // A lowered clone floor is refused: the reviewed floors never move.
  const lowered = qualityFixture(t, { duplication: { corpus: "src/**/*.ts", minTokens: 20, minLines: 5 } });
  const loweredObserved = observe(lowered, "G5", "ticket/demo-01");
  assertParity(loweredObserved);
  assert.match(loweredObserved.deno.output, /G5: the declared clone floors changed/u);
  assert.equal(decisions(loweredObserved.denoEvidence)[0]?.kind, "policy-refusal");
  assert.equal(decisions(loweredObserved.denoEvidence)[0]?.status, "fail");
  // The reviewed floors are accepted, and the gate moves on to the next
  // decision instead: the same input with the reviewed floors refuses the
  // missing reviewed baseline.
  const reviewed = qualityFixture(t, { duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 } });
  const reviewedObserved = observe(reviewed, "G5", "ticket/demo-01");
  assertParity(reviewedObserved);
  assert.match(reviewedObserved.deno.output, /G5: reviewed superman\.ratchet\.json is missing/u);
  assert.equal(decisions(reviewedObserved.denoEvidence)[0]?.kind, "policy-refusal");
});

test("the Deno quality gate keeps the corrected critical-case decisions the Node original makes", (t) => {
  // A declared critical case must declare its runner.
  const runnerless = qualityFixture(t, {
    mutation: { critical: [{ id: "absent", module: "src/value.ts", case: "test/value.test.ts" }] },
  });
  const runnerlessObserved = observe(runnerless, "G6", "ticket/demo-01");
  assertParity(runnerlessObserved);
  assert.match(runnerlessObserved.deno.output, /G6: declared critical case absent must declare its runner/u);
  assert.equal(decisions(runnerlessObserved.denoEvidence)[0]?.kind, "policy-refusal");
  // A critical module the candidate deleted fails: it is a missing module,
  // not a surviving one.
  const deleted = qualityFixture(t, {
    mutation: { critical: [{ id: "gone", module: "src/gone.ts", case: "test/gone.test.ts", runner: "node-test" }] },
  });
  const deletedObserved = observe(deleted, "G6", "ticket/demo-01");
  assertParity(deletedObserved);
  assert.match(deletedObserved.deno.output, /G6: missing critical module src\/gone\.ts/u);
  assert.equal(decisions(deletedObserved.denoEvidence)[0]?.kind, "skipped-required-work");
  // A declared critical case executes fresh with its declared runner, and a
  // failing case blocks. The two hosts reach the same decision; the reason
  // carries the runner's own output, which is not byte-stable.
  const failing = qualityFixture(
    t,
    {
      mutation: {
        critical: [{ id: "live", module: "src/value.ts", case: "test/critical.test.ts", runner: "node-test" }],
      },
    },
    {
      "test/critical.test.ts":
        'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("the declared critical case fails", () => {\n  assert.equal(1, 2);\n});\n',
    },
  );
  const failingObserved = observe(failing, "G6", "ticket/demo-01");
  assert.equal(failingObserved.deno.status, failingObserved.node.status);
  assert.deepEqual(
    decisions(failingObserved.denoEvidence).map((result) => [result.gate, result.status, result.kind]),
    decisions(failingObserved.nodeEvidence).map((result) => [result.gate, result.status, result.kind]),
  );
  assert.match(
    failingObserved.deno.output,
    /G6: declared critical case live failed \(test\/critical\.test\.ts, node-test\)/u,
  );
  assert.equal(decisions(failingObserved.denoEvidence)[0]?.kind, "failed-command");
});

test("the Deno coverage collector refuses a missing and an extra inventory member", (t) => {
  const root = join(tmpdir(), `superman-deno-inventory-${Date.now()}`);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // A tree with the collector's own inputs and a copy of the Deno root.
  mkdirSync(join(root, ".superman/ci"), { recursive: true });
  for (const file of [".superman/ci/coverage.json", ".superman/ci/bootstrap.json", "package.json", "pnpm-lock.yaml"])
    cpSync(join(repository, file), join(root, file));
  cpSync(denoRoot, join(root, ".superman/deno-bootstrap"), { recursive: true });
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "dir");
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
    return result.stdout;
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Inventory Fixture");
  git("config", "user.email", "fixture@example.invalid");
  const collect = () =>
    runOwned(explicitDeno(), ["run", ...denoProfile(), join(root, ".superman/deno-bootstrap/coverage.ts")], {
      cwd: root,
      env: fixtureEnv(root, "ticket/demo-01"),
      encoding: "utf8",
      shell: false,
      timeout: 600_000,
    });
  // An extra member in the root is refused by name.
  writeFileSync(join(root, ".superman/deno-bootstrap/extra.ts"), "export const extra = 1;\n");
  git("add", "--all");
  git("commit", "--quiet", "-m", "extra member");
  const extra = collect();
  assert.equal(extra.status, 1, `${extra.stdout}${extra.stderr}`);
  assert.match(
    `${extra.stdout}${extra.stderr}`,
    /Coverage scope does not model source file: \.superman\/deno-bootstrap\/extra\.ts/u,
  );
  // A missing member is refused by name.
  rmSync(join(root, ".superman/deno-bootstrap/extra.ts"));
  rmSync(join(root, ".superman/deno-bootstrap/archgate-linux-arm64-wizard.ts"));
  git("add", "--all");
  git("commit", "--quiet", "-m", "missing member");
  const missing = collect();
  assert.equal(missing.status, 1, `${missing.stdout}${missing.stderr}`);
  assert.match(
    `${missing.stdout}${missing.stderr}`,
    /Coverage Deno inventory is missing a declared member: \.superman\/deno-bootstrap\/archgate-linux-arm64-wizard\.ts/u,
  );
});

const HELPER_DRIVER = `import { provisionTools } from "PROVISION_URL";
import { archgateArm64BuildPlan, runArchgateArm64Build } from "BUILD_URL";
import { readFileSync } from "node:fs";

const root = Deno.env.get("SUPERMAN_DRIVER_ROOT")!;
const archive = Deno.env.get("SUPERMAN_DRIVER_ARCHIVE")!;
const digest = Deno.env.get("SUPERMAN_DRIVER_DIGEST")!;
const version = Deno.env.get("SUPERMAN_DRIVER_VERSION")!;
const report = (value: unknown) => console.log(JSON.stringify(value));

const policy = {
  archgate: {
    version,
    "darwin-arm64": { url: "https://github.com/archgate/cli/releases/download/v0.61.0/archgate-darwin-arm64.tar.gz", sha256: digest },
  },
};
const authority = { environment: root + "/github-env", path: root + "/github-path" };

try {
  const provisioned = await provisionTools({
    expected: "darwin-arm64",
    platform: "darwin-arm64",
    tools: ["archgate"],
    policy,
    acquire: async () => readFileSync(archive),
    directory: root + "/tools",
    authority,
    env: { PATH: Deno.env.get("PATH") },
  });
  report({ provisioned, environment: readFileSync(authority.environment, "utf8"), path: readFileSync(authority.path, "utf8") });
} catch (error) {
  report({ error: error instanceof Error ? error.message : String(error) });
}

try {
  await provisionTools({
    expected: "darwin-arm64",
    platform: "darwin-arm64",
    tools: ["archgate"],
    policy: {
      archgate: {
        version,
        "darwin-arm64": { url: "https://github.com/archgate/cli/releases/download/v0.61.0/archgate-darwin-arm64.tar.gz", sha256: "0".repeat(64) },
      },
    },
    acquire: async () => readFileSync(archive),
    directory: root + "/tools-mismatch",
    env: { PATH: Deno.env.get("PATH") },
  });
  report({ mismatch: "accepted" });
} catch (error) {
  report({ mismatch: error instanceof Error ? error.message : String(error) });
}

try {
  // The CI step reads the binary's version and prints it; it does not refuse
  // a version that differs from the declared one, and neither does this port.
  const other = await provisionTools({
    expected: "darwin-arm64",
    platform: "darwin-arm64",
    tools: ["archgate"],
    policy: {
      archgate: {
        version: "9.9.9",
        "darwin-arm64": {
          url: "https://github.com/archgate/cli/releases/download/v0.61.0/archgate-darwin-arm64.tar.gz",
          sha256: digest,
        },
      },
    },
    acquire: async () => readFileSync(archive),
    directory: root + "/tools-version",
    env: { PATH: Deno.env.get("PATH") },
  });
  report({ otherVersion: other });
} catch (error) {
  report({ otherVersion: error instanceof Error ? error.message : String(error) });
}

try {
  await provisionTools({
    expected: "linux-arm64",
    platform: "linux-arm64",
    tools: ["archgate"],
    policy,
    acquire: async () => readFileSync(archive),
    directory: root + "/tools-missing",
    env: { PATH: Deno.env.get("PATH") },
  });
  report({ missing: "accepted" });
} catch (error) {
  report({ missing: error instanceof Error ? error.message : String(error) });
}

const plan = archgateArm64BuildPlan(root + "/build");
const commands = plan.map((step) => step.command + " " + step.args.join(" "));
try {
  const observed: { command: string; args: string[]; cwd: string | null }[] = [];
  const outcome = await runArchgateArm64Build({
    plan,
    runner: async (command, args, cwd) => {
      const step = plan.find((entry) => entry.command === command && entry.args.join(" ") === args.join(" "));
      observed.push({ command, args, cwd: cwd ?? null });
      return { command, args, status: 0, stdout: step?.stdout ?? step?.contains ?? "", stderr: "" };
    },
    directory: root + "/build",
    digest: "0".repeat(64),
  });
  report({
    build: outcome.version,
    archive: outcome.archive,
    digest: outcome.digest,
    commands: commands.length,
    steps: observed,
  });
} catch (error) {
  report({ build: error instanceof Error ? error.message : String(error) });
}

try {
  await runArchgateArm64Build({
    plan,
    runner: async (command, args) => {
      const step = plan.find((entry) => entry.command === command && entry.args.join(" ") === args.join(" "));
      const stdout =
        step?.stdout === "f65d99f56d02757cca94d53f6d717333770e0170"
          ? "0000000000000000000000000000000000000000"
          : (step?.stdout ?? step?.contains ?? "");
      return { command, args, status: 0, stdout, stderr: "" };
    },
    directory: root + "/build-wrong",
  });
  report({ wrongCommit: "accepted" });
} catch (error) {
  report({ wrongCommit: error instanceof Error ? error.message : String(error) });
}
`;

/**
 * The helper modules are driven under the pinned Deno runtime with fake
 * authority and fake tool fixtures, so no tool is installed, no build runs and
 * nothing is published.
 */
function driveHelpers(): Record<string, unknown>[] {
  const root = join(tmpdir(), `superman-deno-helpers-${Date.now()}`);
  try {
    const toolDirectory = join(root, "tool");
    mkdirSync(toolDirectory, { recursive: true });
    const binary = join(toolDirectory, "archgate");
    writeFileSync(
      binary,
      `#!${process.execPath}\nconsole.log(process.argv.includes("--version") ? ${JSON.stringify("0.61.0")} : "");\n`,
      { mode: 0o755 },
    );
    const archive = join(root, "archgate.tar.gz");
    const archived = runOwned("tar", ["-czf", archive, "-C", toolDirectory, "archgate"], {
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    });
    assert.ifError(archived.error);
    assert.equal(archived.status, 0, archived.stderr);
    const digest = createHash("sha256").update(readFileSync(archive)).digest("hex");
    const driver = join(root, "driver.ts");
    writeFileSync(
      driver,
      HELPER_DRIVER.replaceAll("PROVISION_URL", `file://${join(denoRoot, "provision-tools.ts")}`).replaceAll(
        "BUILD_URL",
        `file://${join(denoRoot, "archgate-arm64-build.ts")}`,
      ),
    );
    const result = runOwned(explicitDeno(), ["run", ...denoProfile(), driver], {
      cwd: root,
      env: {
        PATH: isolated.PATH,
        HOME: root,
        TMPDIR: root,
        SUPERMAN_DRIVER_ROOT: root,
        SUPERMAN_DRIVER_ARCHIVE: archive,
        ...(process.env.DENO_COVERAGE_DIR ? { DENO_COVERAGE_DIR: process.env.DENO_COVERAGE_DIR } : {}),
        SUPERMAN_DRIVER_DIGEST: digest,
        SUPERMAN_DRIVER_VERSION: "0.61.0",
      },
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    return result.stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A tree both collectors can measure.
 *
 * The Deno root is copied in with its own suites replaced by one trivial
 * process test, the Node scope gets one trivial module and test, and the
 * reviewed coverage policy is used with an empty candidate scope. The tree is
 * a temporary root, so neither collector writes into the repository.
 */
function collectorTree(t: { after: (fn: () => void) => void }): string {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-collectors-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".superman/ci"), { recursive: true });
  mkdirSync(join(root, ".scratch/empty"), { recursive: true });
  cpSync(denoRoot, join(root, ".superman/deno-bootstrap"), { recursive: true });
  rmSync(join(root, ".superman/deno-bootstrap/tests"), { recursive: true, force: true });
  mkdirSync(join(root, ".superman/deno-bootstrap/tests"), { recursive: true });
  writeFileSync(
    join(root, ".superman/deno-bootstrap/tests/fixture.test.ts"),
    'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("the collector fixture measures a process test", () => {\n  assert.equal(1, 1);\n});\n',
  );
  writeFileSync(join(root, ".superman/ci/module.ts"), "export const measured = 1;\n");
  writeFileSync(
    join(root, ".superman/ci/fixture.test.ts"),
    'import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { measured } from "./module.ts";\ntest("the collector fixture measures a process test", () => {\n  assert.equal(measured, 1);\n});\n',
  );
  // The reviewed policy, with the candidate scope emptied: the candidate
  // surface is measured by its own suites and is not part of this comparison.
  const policy = JSON.parse(readFileSync(join(repository, ".superman/ci/coverage.json"), "utf8")) as Record<
    string,
    unknown
  >;
  policy.candidate = { root: ".scratch/empty", patterns: [".scratch/empty/**/*.ts"], members: [], suites: [] };
  writeFileSync(join(root, ".superman/ci/coverage.json"), JSON.stringify(policy));
  cpSync(join(repository, ".superman/ci/bootstrap.json"), join(root, ".superman/ci/bootstrap.json"));
  cpSync(join(repository, "package.json"), join(root, "package.json"));
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "dir");
  // The collectors write their own output directory; it is ignored so that
  // the measured input set does not change under the run.
  writeFileSync(join(root, ".gitignore"), ".superman-ci/\n");
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
    return result.stdout;
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Collector Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", "--all");
  git("commit", "--quiet", "-m", "measured tree");
  return root;
}

/**
 * A tree the Deno collector measures above every floor.
 *
 * The measured scope is a narrow directory inside the Deno root: the
 * collector and the modules it imports sit outside the scope, so the
 * measured surface is one module. The scope's own process suite runs that
 * module under the Deno runtime, which is where the native V8 evidence comes
 * from, so the module is measured completely. Every floor is met, so the run
 * is green. The tree is a temporary root, so neither collector writes into
 * the repository.
 */
function passingTree(t: { after: (fn: () => void) => void }): string {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-passing-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".superman/ci"), { recursive: true });
  cpSync(denoRoot, join(root, ".superman/deno-bootstrap"), { recursive: true });
  mkdirSync(join(root, ".superman/deno-bootstrap/scope/tests"), { recursive: true });
  writeFileSync(
    join(root, ".superman/deno-bootstrap/scope/measured.ts"),
    "export function measured(value: number): number {\n  return value > 0 ? value : -value;\n}\n\nconsole.log(measured(2), measured(-2));\n",
  );
  writeFileSync(
    join(root, ".superman/deno-bootstrap/scope/tests/measured.test.ts"),
    `import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runOwned } from "../../../ci/replay.ts";

test("the scope module is exercised completely", () => {
  const deno = process.env.SUPERMAN_DENO_BIN;
  assert.ok(deno, "the pinned Deno is required");
  const scope = dirname(dirname(fileURLToPath(import.meta.url)));
  const result = runOwned(
    deno,
    [
      "run",
      "--no-prompt",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-run",
      join(scope, "measured.ts"),
    ],
    { cwd: scope, env: { ...process.env }, encoding: "utf8", shell: false, timeout: 600_000 },
  );
  assert.equal(result.status, 0, \`\${result.stdout}\${result.stderr}\`);
});
`,
  );
  for (const file of [
    ".superman/ci/coverage.json",
    ".superman/ci/bootstrap.json",
    ".superman/ci/replay.ts",
    "package.json",
  ])
    cpSync(join(repository, file), join(root, file));
  // The policy declares the scope, so the collector measures the declared
  // surface: one module its own suite exercises completely.
  const policy = JSON.parse(readFileSync(join(repository, ".superman/ci/coverage.json"), "utf8")) as {
    deno: Record<string, unknown>;
  };
  policy.deno = {
    root: ".superman/deno-bootstrap/scope",
    patterns: [".superman/deno-bootstrap/scope/**/*.ts"],
    members: [".superman/deno-bootstrap/scope/measured.ts"],
    collector: ".superman/deno-bootstrap/coverage.ts",
    receipt: ".superman-ci/coverage-deno-*/coverage-receipt.json",
  };
  writeFileSync(join(root, ".superman/ci/coverage.json"), JSON.stringify(policy));
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "dir");
  // The collectors write their own output directory; it is ignored so that
  // the measured input set does not change under the run.
  writeFileSync(join(root, ".gitignore"), ".superman-ci/\n");
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
    return result.stdout;
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Passing Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", "--all");
  git("commit", "--quiet", "-m", "measured tree");
  return root;
}

/**
 * Run the Deno collector over a fixture tree and read its receipt.
 *
 * The receipt is the collector's own measurement: the run's status, the
 * output it printed and the receipt it wrote.
 */
function collectDeno(root: string): { status: number | null; output: string; receipt?: Record<string, unknown> } {
  const result = runOwned(
    explicitDeno(),
    ["run", ...denoProfile(), join(root, ".superman/deno-bootstrap/coverage.ts")],
    {
      cwd: root,
      env: fixtureEnv(root, "ticket/demo-01"),
      encoding: "utf8",
      shell: false,
      timeout: 600_000,
    },
  );
  const output = `${result.stdout}${result.stderr}`;
  const directories = existsSync(join(root, ".superman-ci"))
    ? readdirSync(join(root, ".superman-ci")).filter((entry) => entry.startsWith("coverage-deno-"))
    : [];
  const receipt = directories.length
    ? (JSON.parse(
        readFileSync(join(root, ".superman-ci", directories[directories.length - 1], "coverage-receipt.json"), "utf8"),
      ) as Record<string, unknown>)
    : undefined;
  return { status: result.status, output, receipt };
}

/** Commit the fixture's tree, so the collector's inventory sees the change. */
function commitTree(root: string, message: string): void {
  for (const args of [
    ["add", "--all"],
    ["commit", "--quiet", "-m", message],
  ]) {
    const result = runOwned("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
  }
}

test("the coverage receipts have the same shape in both hosts", (t) => {
  const root = collectorTree(t);
  // The Deno collector runs first: the Node collector carries the Deno
  // inventory's measurement from the Deno collector's own receipt.
  const deno = runOwned(explicitDeno(), ["run", ...denoProfile(), join(root, ".superman/deno-bootstrap/coverage.ts")], {
    cwd: root,
    env: fixtureEnv(root, "ticket/demo-01"),
    encoding: "utf8",
    shell: false,
    timeout: 600_000,
  });
  assert.equal(deno.status, 1, `${deno.stdout}${deno.stderr}`);
  const node = runOwned(process.execPath, [join(repository, ".superman/ci/coverage.ts")], {
    cwd: root,
    env: isolated,
    encoding: "utf8",
    shell: false,
    timeout: 600_000,
  });
  const nodeOutput = `${node.stdout}${node.stderr}`;
  // The Node gate reads the receipt the Deno collector wrote, never the
  // collector's exit status: a red Deno run still leaves a receipt, and the
  // gate still binds it and still carries the obligation.
  assert.equal(node.status, 0, nodeOutput);
  const reports = readdirSync(join(root, ".superman-ci")).filter((entry) => entry.startsWith("coverage-"));
  const receipts = reports.flatMap((entry) => {
    const path = join(root, ".superman-ci", entry, "coverage-receipt.json");
    return existsSync(path) ? [JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>] : [];
  });
  assert.equal(
    receipts.length,
    2,
    `the two collectors did not both write a receipt: ${nodeOutput}${deno.stdout}${deno.stderr}`,
  );
  type CoverageReceipt = {
    schema?: string;
    inventories?: { node?: unknown };
    collector?: { file?: string };
    total?: Record<string, Record<string, unknown>>;
    tools?: object;
    denoMeasurement?: unknown;
    carriedObligations?: unknown;
  };
  const nodeReceipt = receipts.find(
    (receipt) => receipt.schema === "superman.coverage/1" && (receipt as CoverageReceipt).inventories?.node,
  ) as CoverageReceipt | undefined;
  const denoReceipt = receipts.find(
    (receipt) =>
      receipt.schema === "superman.coverage/1" &&
      (receipt as CoverageReceipt).collector?.file?.endsWith("deno-bootstrap/coverage.ts"),
  ) as CoverageReceipt | undefined;
  assert.ok(nodeReceipt, "the Node collector wrote no Node receipt");
  assert.ok(denoReceipt, "the Deno collector wrote no Deno receipt");
  // The two receipts are distinct: a comparison of one receipt with itself
  // would pass for every divergence.
  assert.notEqual(nodeReceipt, denoReceipt, "the comparison would compare one receipt with itself");
  assert.deepEqual(Object.keys(denoReceipt).sort(), Object.keys(nodeReceipt).sort());
  assert.deepEqual(Object.keys(denoReceipt.tools as object).sort(), Object.keys(nodeReceipt.tools as object).sort());
  for (const metric of ["lines", "statements", "branches", "functions"]) {
    const denoCounts: Record<string, unknown> | undefined = denoReceipt.total?.[metric];
    const nodeCounts: Record<string, unknown> | undefined = nodeReceipt.total?.[metric];
    assert.deepEqual(Object.keys(denoCounts ?? {}).sort(), Object.keys(nodeCounts ?? {}).sort());
  }
  assert.deepEqual(
    Object.keys(Object.values(denoReceipt.inventories as object)[0] as object).sort(),
    Object.keys(Object.values(nodeReceipt.inventories as object)[0] as object).sort(),
  );
  // The gate bound the Deno receipt the red run left behind: the collector
  // that wrote it, its verdict, and the four metrics it measured.
  const measurement = nodeReceipt.denoMeasurement as {
    collector: { file: string; sha256: string };
    metrics: Record<string, { covered: number; total: number }>;
    verdict: string;
  };
  assert.ok(measurement, "the Node gate did not bind the Deno measurement");
  assert.equal(measurement.collector.file, ".superman/deno-bootstrap/coverage.ts");
  assert.equal(measurement.verdict, "fail");
  const denoTotal = denoReceipt.total as Record<string, { covered: number; total: number }>;
  for (const metric of ["lines", "statements", "branches", "functions"]) {
    assert.equal(measurement.metrics[metric]?.covered, denoTotal[metric]?.covered);
    assert.equal(measurement.metrics[metric]?.total, denoTotal[metric]?.total);
  }
  // The gate still carries the Deno floor as an obligation that binds at the
  // merge-bound cutover.
  const obligations = nodeReceipt.carriedObligations as Array<{ inventory: string; binds: string }>;
  const obligation = obligations.find((entry) => entry.inventory === "deno");
  assert.ok(obligation, "the Node gate did not carry the Deno floor obligation");
  assert.match(obligation.binds, /merge-bound cutover/u);
});

test("the Deno coverage collector reports the shortfall it measured", (t) => {
  const root = collectorTree(t);
  const collected = collectDeno(root);
  // The fixture's Deno root is barely covered, so the receipt's verdict is
  // the truth about the measurement: the floor is missed, the verdict is a
  // failure, and the output never claims a pass it did not achieve.
  //
  // The exit status says the same thing about the run. The receipt is
  // written first and stays complete, because the gate binds the receipt and
  // never the exit status: a red run that left no receipt behind would be a
  // red run with nothing left to bind.
  assert.equal(collected.status, 1, collected.output);
  assert.ok(collected.receipt, "the collector exited non-zero without writing a receipt");
  assert.equal(collected.receipt?.verdict, "fail");
  assert.doesNotMatch(collected.output, /Coverage: pass/u);
  assert.match(collected.output, /Coverage below 90%/u);
  // The receipt is still complete and attributable: the collector that wrote
  // it, the source it evaluated, the inputs it hashed, the inventory it
  // measured and the four metrics with their covered/total tuples.
  const receipt = collected.receipt;
  assert.equal((receipt.collector as { file?: string }).file, ".superman/deno-bootstrap/coverage.ts");
  assert.match(String(receipt.evaluatedSha), /^[0-9a-f]{40}$/u);
  assert.match(String(receipt.inputsHash), /^[0-9a-f]{64}$/u);
  const sources = receipt.sources as string[];
  assert.equal((receipt.inventories as { deno: { files: number } }).deno.files, sources.length);
  const total = receipt.total as Record<string, { covered: number; total: number }>;
  for (const metric of ["lines", "statements", "branches", "functions"]) {
    assert.equal(typeof total[metric]?.covered, "number");
    assert.equal(typeof total[metric]?.total, "number");
  }
  // The floor is a carried obligation and binds at the merge-bound cutover,
  // not here: the run reports the shortfall and the obligation names where
  // it binds.
  const obligations = collected.receipt?.carriedObligations as Array<{ inventory: string; binds: string }>;
  assert.equal(obligations[0]?.inventory, "deno");
  assert.match(obligations[0]?.binds ?? "", /merge-bound cutover/u);
});

test("the Deno coverage collector exits zero when every floor is met", (t) => {
  const root = passingTree(t);
  const collected = collectDeno(root);
  // The measured scope meets every floor, so the exit status is the truth
  // about that measurement: zero. The receipt says the same thing, and the
  // run claims no shortfall it did not measure.
  assert.equal(collected.status, 0, collected.output);
  assert.ok(collected.receipt, "the collector wrote no receipt");
  assert.equal(collected.receipt?.verdict, "pass");
  assert.match(collected.output, /Coverage: pass/u);
  assert.doesNotMatch(collected.output, /Coverage below 90%/u);
  assert.deepEqual(collected.receipt?.carriedObligations, []);
  // The floor was met by a measurement, not by an empty denominator: every
  // metric has a total and every total is covered.
  const total = collected.receipt?.total as Record<string, { covered: number; total: number }>;
  for (const metric of ["lines", "statements", "branches", "functions"]) {
    assert.ok((total[metric]?.total ?? 0) > 0, `${metric} measured an empty denominator`);
    assert.equal(total[metric]?.covered, total[metric]?.total);
  }
});

test("the Deno coverage receipt names the collector that wrote it", (t) => {
  const root = collectorTree(t);
  const collected = collectDeno(root);
  // The run is red, and the receipt that names the collector that wrote it is
  // still on disk: the exit status comes after the receipt, not instead of
  // it.
  assert.equal(collected.status, 1, collected.output);
  assert.ok(collected.receipt, "the collector exited non-zero without writing a receipt");
  const collector = collected.receipt?.collector as { file?: string; sha256?: string } | undefined;
  assert.equal(collector?.file, ".superman/deno-bootstrap/coverage.ts");
  assert.equal(
    collector?.sha256,
    createHash("sha256")
      .update(readFileSync(join(root, ".superman/deno-bootstrap/coverage.ts")))
      .digest("hex"),
  );
});

test("the Deno coverage collector takes its scope from the reviewed policy", (t) => {
  const root = collectorTree(t);
  // The policy's declaration is the scope: a member it drops is an
  // undeclared source file and is refused by name, and a member it adds is
  // measured. A collector that kept its own list would refuse the added
  // member instead, and the two declarations would drift silently.
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/coverage.json"), "utf8")) as {
    deno: { members: string[] };
  };
  const dropped = ".superman/deno-bootstrap/replay.ts";
  const added = ".superman/deno-bootstrap/added.ts";
  writeFileSync(join(root, added), "export const added = 1;\n");
  policy.deno.members = [...policy.deno.members.filter((member) => member !== dropped), added];
  writeFileSync(join(root, ".superman/ci/coverage.json"), JSON.stringify(policy));
  commitTree(root, "the policy is the scope");
  const collected = collectDeno(root);
  assert.equal(collected.status, 1, collected.output);
  assert.match(collected.output, /Coverage scope does not model source file: \.superman\/deno-bootstrap\/replay\.ts/u);
});

test("the Deno helpers provision, refuse and plan with fake authority and tool fixtures", () => {
  const [provisioned, mismatch, otherVersion, missing, build, wrongCommit] = driveHelpers();
  assert.equal(provisioned?.provisioned === undefined, false, JSON.stringify(provisioned));
  const provisionedTools = (provisioned?.provisioned ?? []) as { version: string }[];
  assert.match(String(provisionedTools[0]?.version), /^0\.61\.0$/u);
  assert.match(String(provisioned?.environment), /^ARCHGATE_BIN=/mu);
  assert.match(String(provisioned?.path), /superman-archgate/u);
  assert.equal(mismatch?.mismatch, "archgate checksum mismatch");
  const other = otherVersion?.otherVersion as { version: string; expected: string | null }[] | undefined;
  assert.equal(other?.[0]?.version, "0.61.0");
  assert.equal(other?.[0]?.expected, "9.9.9");
  assert.match(
    String(missing?.missing),
    /Gate 1 blocked: archgate has no reviewed, published linux-arm64 asset\/checksum/u,
  );
  assert.equal(build?.build, "0.61.0");
  assert.equal(build?.digest, "0".repeat(64));
  assert.match(String(wrongCommit?.wrongCommit), /git expected f65d99f56d02757cca94d53f6d717333770e0170/u);
  // The plan carries the workflow's platform assertion and the Bun archive
  // extraction, and every step the workflow runs inside the pinned source
  // checkout carries that working directory.
  const steps = build?.steps as { command: string; args: string[]; cwd: string | null }[] | undefined;
  assert.ok(Array.isArray(steps), JSON.stringify(build));
  assert.ok(
    steps.some((step) => step.command === "uname" && step.args.join(" ") === "-m"),
    "the plan has no platform assertion",
  );
  assert.ok(
    steps.some((step) => step.args.some((argument) => argument.includes("end-of-central-directory"))),
    "the plan has no Bun archive extraction",
  );
  assert.ok(
    steps.filter((step) => step.cwd === "archgate-src").length >= 8,
    "the plan's source-checkout steps carry no working directory",
  );
  assert.ok(
    steps.some((step) => step.command === "cp" && step.cwd === "archgate-src"),
    "the plan copies the license file outside the source checkout",
  );
});

test("the Deno wizard keeps the manual helper's stage order and saved values", (t) => {
  const root = join(tmpdir(), `superman-deno-wizard-${Date.now()}`);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const envFile = join(root, ".env");
  mkdirSync(root, { recursive: true });
  // The operator answers "no" at the first confirmation, so the helper stops
  // before anything is published.
  const result = runOwned(explicitDeno(), ["run", ...denoProfile(), join(denoRoot, "archgate-linux-arm64-wizard.ts")], {
    cwd: root,
    env: {
      PATH: isolated.PATH,
      HOME: root,
      TMPDIR: root,
      ENV_FILE: envFile,
    },
    input: "n\n",
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
  });
  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /Stage 1\/7 · Commit the candidate workflow/u);
  assert.match(result.stdout, /Stop here\. Dispatch needs the workflow on the branch\./u);
  assert.equal(existsSync(envFile), false);
});

test("the Deno wizard clears the terminal with the Node original's escape sequence", () => {
  // The sequence is written as the escape sequence, the way the Node
  // original writes it: a raw byte in the source is invisible in the source
  // and in every diff.
  const sequence = '"\\u001b[2J\\u001b[3J\\u001b[H"';
  const denoSource = readFileSync(join(denoRoot, "archgate-linux-arm64-wizard.ts"), "utf8");
  const nodeSource = readFileSync(join(repository, ".superman/ci/archgate-linux-arm64-wizard.ts"), "utf8");
  assert.ok(nodeSource.includes(sequence), "the Node original does not write the escape sequence");
  assert.ok(denoSource.includes(sequence), "the Deno wizard does not write the Node original's escape sequence");
  assert.equal(denoSource.includes("\u001b"), false, "the Deno wizard writes a raw escape byte");
});
