// Approved raw-gates process seam; coverage depends on all product source src/**.
import assert from "node:assert/strict";
import { readFileSync, renameSync, rmSync, symlinkSync, utimesSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";
import { introducedSurvivors, qualityGate } from "./quality.ts";
import { fixture, interceptPnpm } from "./raw-fixture.ts";

test("the critical survivor rule compares identities, not counts", () => {
  // The counterexample a count comparison misses: the approved base had one
  // survivor, the candidate killed it and a different mutant survived. The
  // counts match, so a count comparison reports nothing — and an introduced
  // critical survivor goes unreported.
  const base = [{ file: "src/critical.ts", identity: "ArithmeticOperator:a + b->a - b" }];
  const candidate = [{ file: "src/critical.ts", identity: "ArithmeticOperator:a * b->a / b" }];
  assert.equal(introducedSurvivors(base, candidate).length, 1);
  assert.equal(introducedSurvivors(base, candidate)[0]?.identity, "ArithmeticOperator:a * b->a / b");
  // The same survivor on both sides is not introduced.
  assert.equal(introducedSurvivors(base, base).length, 0);
  // With no approved base, every survivor is introduced.
  assert.equal(introducedSurvivors([], candidate).length, 1);
});

function qualityFixture(t: TestContext, branch = "ticket/demo-01", setup?: (repo: ReturnType<typeof fixture>) => void) {
  const repo = fixture(t, branch);
  const root = resolve(import.meta.dirname, "../..");
  for (const file of [".jscpd.json", "stryker.config.json", "pnpm-lock.yaml", ".npmrc"])
    repo.write(file, readFileSync(join(root, file), "utf8"));
  const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
  config.policyInputs.push(".jscpd.json", "stryker.config.json");
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  repo.write(
    "package.json",
    JSON.stringify({
      name: "quality-fixture",
      type: "module",
      packageManager: pkg.packageManager,
      engines: pkg.engines,
      devDependencies: pkg.devDependencies,
    }),
  );
  repo.write(".gitignore", "node_modules\n.tools/\n.superman-ci/\n.stryker-tmp/\nstryker-setup-*.js\n");
  rmSync(join(repo.root, "src/value.ts"));
  setup?.(repo);
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  return repo;
}

function repeatedSource() {
  return `export function repetitive(value: number) {\n${Array.from({ length: 15 }, (_, i) => `  value = value + ${i + 1};`).join("\n")}\n  return value;\n}\n`;
}

function reviewedMutationFixture(t: TestContext) {
  const repo = qualityFixture(t);
  repo.write(
    "src/classify.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write("src/weak.ts", "export function unused(value: number) { return value > 10 ? 'high' : 'low'; }\n");
  repo.write(
    "test/classify.test.ts",
    "import { test, expect } from 'vitest'; import { classify } from '../src/classify.ts'; import { unused } from '../src/weak.ts'; test('boundary and both sides', () => { expect(typeof unused).toBe('function'); expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
  );
  repo.commit();
  const measured = repo.runGate("G6");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results[0];
  assert.ok(initial.metrics.mutationScore > 0 && initial.metrics.mutationScore < 100);
  assert.ok(initial.metrics.counts.NoCoverage > 0);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: initial.metrics.mutationScore,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  return { ...repo, initial };
}

function measuredCandidate(t: TestContext, gate: string, mismatchedDeclaration?: string) {
  const repo = qualityFixture(t);
  if (mismatchedDeclaration) {
    const pkg = JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
    pkg.devDependencies[mismatchedDeclaration] = "0.0.0";
    repo.write("package.json", JSON.stringify(pkg));
    repo.commit();
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  }
  if (gate === "G5") repo.write("src/clone-a.ts", repeatedSource());
  else {
    repo.write(
      "src/classify.ts",
      "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
    );
    repo.write(
      "test/classify.test.ts",
      "import { test, expect } from 'vitest'; import { classify } from '../src/classify.ts'; test('boundary', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
    );
  }
  repo.commit();
  return repo;
}

test("raw quality gates explicitly report no source as n/a without invented metrics", (t) => {
  const repo = qualityFixture(t);
  repo.commit();
  for (const gate of ["G5", "G6"]) {
    const result = repo.runGate(gate);
    assert.equal(result.status, 0, `${gate}\n${result.output}\n${repo.git("status", "--short")}`);
    const outcome = result.receipt.results.find((entry: { gate: string }) => entry.gate === gate);
    assert.equal(outcome.status, "n/a");
    assert.match(outcome.reason, /no .*source/u);
    assert.equal(outcome.metrics, undefined);
  }
});

test("G5 measures a real first-source corpus as initialization, not an invented zero baseline", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results.find((entry: { gate: string }) => entry.gate === "G5");
  assert.equal(outcome.status, "pass");
  assert.match(outcome.reason, /measured initialization/u);
  assert.equal(outcome.metrics.jscpdPct, 50);
  assert.equal(outcome.metrics.clones, 1);
  assert.equal(outcome.metrics.sources, 2);
  assert.deepEqual(outcome.evidence.files, ["src/clone-a.ts", "src/clone-b.ts"]);
  assert.match(outcome.evidence.qualityInputsHash, /^[a-f0-9]{64}$/u);
  assert.equal(outcome.evidence.baseline, undefined);
});

test("G5 clone locations are repository-relative and stable across owned snapshots", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const first = repo.runGate("G5");
  const second = repo.runGate("G5");
  assert.equal(first.status, 0, first.output);
  assert.equal(second.status, 0, second.output);
  const a = first.receipt.results[0];
  const b = second.receipt.results[0];
  assert.deepEqual(a.metrics, b.metrics);
  assert.deepEqual(a.evidence.clones, b.evidence.clones);
  assert.equal(a.evidence.clones.length, 1);
  assert.deepEqual([a.evidence.clones[0].firstFile.name, a.evidence.clones[0].secondFile.name].sort(), [
    "src/clone-a.ts",
    "src/clone-b.ts",
  ]);
});

test("G6 measures first-source mutants with real pinned Stryker and leaves caller source untouched", (t) => {
  const repo = qualityFixture(t);
  const source = "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n";
  repo.write("src/classify.ts", source);
  repo.write(
    "src/classify.test.ts",
    "import { test, expect } from 'vitest'; import { classify } from './classify.ts'; test('boundary and both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
  );
  const head = repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results.find((entry: { gate: string }) => entry.gate === "G6");
  assert.match(outcome.reason, /measured initialization/u);
  assert.equal(outcome.metrics.mutationScore, 100);
  assert.equal(outcome.metrics.totalMutants, 7);
  assert.equal(outcome.metrics.counts.Killed, 7);
  assert.deepEqual(outcome.metrics.survivors, []);
  assert.deepEqual(outcome.evidence.files, ["src/classify.ts"]);
  assert.equal(outcome.evidence.restored, true);
  assert.match(outcome.evidence.qualityInputsHash, /^[a-f0-9]{64}$/u);
  assert.equal(readFileSync(join(repo.root, "src/classify.ts"), "utf8"), source);
  assert.equal(repo.git("rev-parse", "HEAD").trim(), head);
  assert.equal(repo.git("status", "--porcelain"), "");
});

test("a spec-kind follow-up can commit the exact measured duplication baseline", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results[0];
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.git("switch", "--quiet", "-c", "spec/baseline-init");
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  const followUp = repo.runGate("G5", [], { HEAD_REF: "spec/baseline-init" });
  assert.equal(followUp.status, 0, followUp.output);
  const outcome = followUp.receipt.results[0];
  assert.match(outcome.reason, /verified first-baseline initialization/u);
  assert.equal(outcome.metrics.jscpdPct, initial.metrics.jscpdPct);
  assert.equal(outcome.evidence.baseline.jscpdPct, initial.metrics.jscpdPct);
  assert.equal(outcome.evidence.baseline.qualityInputsHash, initial.evidence.qualityInputsHash);
});

function measuredDuplication(t: TestContext) {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results[0];
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  return { repo, initial };
}

test("forged baseline metrics and hashes are rejected before they become the ratchet", (t) => {
  const forgedHash = measuredDuplication(t);
  forgedHash.repo.git("switch", "--quiet", "-c", "spec/forged-hash");
  forgedHash.repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: forgedHash.initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: "0".repeat(64),
    }),
  );
  forgedHash.repo.commit();
  const hash = forgedHash.repo.runGate("G5", [], { HEAD_REF: "spec/forged-hash" });
  assert.equal(hash.status, 1, hash.output);
  assert.match(hash.output, /forged qualityInputsHash/u);

  const forgedMetric = measuredDuplication(t);
  forgedMetric.repo.git("switch", "--quiet", "-c", "spec/forged-metric");
  forgedMetric.repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: forgedMetric.initial.evidence.qualityInputsHash,
    }),
  );
  forgedMetric.repo.commit();
  const metric = forgedMetric.repo.runGate("G5", [], { HEAD_REF: "spec/forged-metric" });
  assert.equal(metric.status, 1, metric.output);
  assert.match(metric.output, /forged baseline metric/u);
});

test("the corpus lane measures the whole declared scope, not only the change", (t) => {
  // The nightly's lane is the uncached full run: it measures the whole
  // declared scope, where every other lane measures the change alone. The
  // difference is visible in what the measurement covers.
  const repo = reviewedMutationFixture(t);
  const head = repo.git("rev-parse", "HEAD").trim();
  const outcome = qualityGate("G6", repo.root, head, head, fixtureEnvironment(), {
    scope: "full",
    changedFiles: [],
    mutation: "corpus",
  });
  assert.equal(outcome.status, "pass", JSON.stringify(outcome));
  const metrics = outcome.metrics as { comparison?: { files: string[]; candidate: { totalMutants: number } } };
  assert.deepEqual(metrics.comparison?.files, ["src/classify.ts", "src/weak.ts"]);
  assert.equal(metrics.comparison?.candidate.totalMutants > 0, true);
});

test("a candidate that drops a reviewed measurement input is refused by name", (t) => {
  // The measured inputs are the candidate's own: a candidate that does not
  // carry one of them cannot be measured against the recorded identity, and
  // the refusal names the input rather than reporting a mismatch.
  const repo = qualityFixture(t);
  const base = repo.git("rev-parse", "HEAD").trim();
  repo.git("rm", "--quiet", ".jscpd.json");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const candidate = repo.git("rev-parse", "HEAD").trim();
  assert.throws(
    () => qualityGate("G5", repo.root, base, candidate, fixtureEnvironment()),
    /quality policy input is missing from the candidate: \.jscpd\.json/u,
  );
});

test("a first-baseline follow-up cannot change measurement inputs", (t) => {
  const { repo, initial } = measuredDuplication(t);
  repo.git("switch", "--quiet", "-c", "spec/changed-inputs");
  const jscpd = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
  jscpd.minTokens = 40;
  repo.write(".jscpd.json", JSON.stringify(jscpd));
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  const result = repo.runGate("G5", [], { HEAD_REF: "spec/changed-inputs" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /changed measurement inputs/u);
});

test("a first-baseline follow-up may change a measurement input when it records the candidate's own identity", (t) => {
  // The Gate-1 baseline refresh is the one change a spec-kind pull request
  // may make to the measurement inputs themselves. What it may not do is
  // record the identity from before the change: the recorded identity must
  // be the candidate's own measured one, and the gate names that identity
  // when the recorded one is not it.
  const { repo, initial } = measuredDuplication(t);
  repo.git("switch", "--quiet", "-c", "spec/changed-input");
  const tsconfig = JSON.parse(readFileSync(join(repo.root, "tsconfig.json"), "utf8"));
  tsconfig.compilerOptions.noImplicitOverride = true;
  repo.write("tsconfig.json", JSON.stringify(tsconfig));
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: "0".repeat(64),
    }),
  );
  repo.commit();
  const refused = repo.runGate("G5", [], { HEAD_REF: "spec/changed-input" });
  assert.equal(refused.status, 1, refused.output);
  const identity = /actual ([a-f0-9]{64})/u.exec(refused.output)?.[1];
  assert.ok(identity, refused.output);
  assert.notEqual(identity, initial.evidence.qualityInputsHash);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: identity,
    }),
  );
  repo.commit();
  const accepted = repo.runGate("G5", [], { HEAD_REF: "spec/changed-input" });
  assert.equal(accepted.status, 0, accepted.output);
  assert.match(accepted.receipt.results[0].reason, /verified first-baseline initialization/u);
});

test("ordinary ticket work cannot initialize the baseline even with exact measured values", (t) => {
  const { repo, initial } = measuredDuplication(t);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Creating or deleting the ratchet file needs a spec-kind PR/u);
});

test("an initialized duplication ratchet still rejects a later regression", (t) => {
  const { repo, initial } = measuredDuplication(t);
  repo.git("switch", "--quiet", "-c", "spec/initialize-ratchet");
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: initial.metrics.jscpdPct,
      mutationScore: 0,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  const initialized = repo.runGate("G5", [], { HEAD_REF: "spec/initialize-ratchet" });
  assert.equal(initialized.status, 0, initialized.output);
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.git("switch", "--quiet", "-C", "ticket/demo-01");
  repo.write("src/clone-c.ts", repeatedSource());
  repo.commit();
  const regression = repo.runGate("G5");
  assert.equal(regression.status, 1, regression.output);
  assert.match(regression.output, /duplication regression/u);
});

test("a spec-kind follow-up can commit the exact measured mutation baseline and rejects a forged score", (t) => {
  const source = "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n";
  const testFile =
    "import { test, expect } from 'vitest'; import { classify } from '../src/classify.ts'; test('boundary and both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n";
  const measure = () => {
    const repo = qualityFixture(t);
    repo.write("src/classify.ts", source);
    repo.write("test/classify.test.ts", testFile);
    repo.commit();
    const measured = repo.runGate("G6");
    assert.equal(measured.status, 0, measured.output);
    const initial = measured.receipt.results[0];
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    return { repo, initial };
  };
  const exact = measure();
  exact.repo.git("switch", "--quiet", "-c", "spec/mutation-baseline");
  exact.repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: exact.initial.metrics.mutationScore,
      qualityInputsHash: exact.initial.evidence.qualityInputsHash,
    }),
  );
  exact.repo.commit();
  const followUp = exact.repo.runGate("G6", [], { HEAD_REF: "spec/mutation-baseline" });
  assert.equal(followUp.status, 0, followUp.output);
  assert.match(followUp.receipt.results[0].reason, /verified first-baseline initialization/u);
  assert.equal(followUp.receipt.results[0].metrics.mutationScore, exact.initial.metrics.mutationScore);

  const forged = measure();
  forged.repo.git("switch", "--quiet", "-c", "spec/forged-mutation");
  forged.repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: forged.initial.evidence.qualityInputsHash,
    }),
  );
  forged.repo.commit();
  const rejected = forged.repo.runGate("G6", [], { HEAD_REF: "spec/forged-mutation" });
  assert.equal(rejected.status, 1, rejected.output);
  assert.match(rejected.output, /forged baseline metric/u);
});

test("later source work is blocked until the measured baseline has been reviewed on base", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/value.ts", repeatedSource());
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/value.ts", `${repeatedSource()}\nexport const changed = 1;\n`);
  repo.commit();
  for (const gate of ["G5", "G6"]) {
    const result = repo.runGate(gate);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /reviewed.*superman\.ratchet\.json.*missing/u);
  }
});

test("G5 enforces the reviewed measured percentage over the real full corpus", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results.find((entry: { gate: string }) => entry.gate === "G5");
  assert.equal(initial.metrics.jscpdPct, 0);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({ jscpdPct: 0, mutationScore: 0, qualityInputsHash: initial.evidence.qualityInputsHash }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("README.md", "later change, no duplicate source\n");
  repo.commit();
  const control = repo.runGate("G5");
  assert.equal(control.status, 0, control.output);
  assert.equal(control.receipt.results[0].metrics.jscpdPct, 0);
  assert.equal(control.receipt.results[0].evidence.baseline.jscpdPct, 0);
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const regression = repo.runGate("G5");
  assert.equal(regression.status, 1, regression.output);
  assert.match(regression.output, /duplication regression.*50.*0/u);
  assert.equal(regression.receipt.verdict, "fail");
});

test("G6 compares equivalent changed-existing scope, not a global floor, and measures new files separately", (t) => {
  const repo = reviewedMutationFixture(t);
  repo.write(
    "src/weak.ts",
    "// existing file changed, without inventing new coverage\nexport function unused(value: number) { return value > 10 ? 'high' : 'low'; }\n",
  );
  repo.write("src/new.ts", "export function added(value: number) { return value > 20 ? 'yes' : 'no'; }\n");
  repo.write(
    "test/new.test.ts",
    "import { test, expect } from 'vitest'; import { added } from '../src/new.ts'; test('new API is exported', () => expect(typeof added).toBe('function'));\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.deepEqual(outcome.metrics.comparison.files, ["src/weak.ts"]);
  assert.equal(outcome.metrics.comparison.base.mutationScore, 0);
  assert.equal(outcome.metrics.comparison.candidate.mutationScore, 0);
  assert.ok(repo.initial.metrics.mutationScore > outcome.metrics.comparison.candidate.mutationScore);
  assert.deepEqual(outcome.metrics.initialization.files, ["src/new.ts"]);
  assert.equal(outcome.metrics.initialization.mutationScore, 0);
  assert.ok(outcome.metrics.initialization.survivors.length > 0);
  assert.match(outcome.reason, /new files.*measured initialization/u);
});

test("G5 rejects unknown JSON schemas even when real jscpd exits successfully", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('jscpd') && args.includes('--config')) { const path = process.cwd() + '/.superman-ci/duplication/jscpd-report.json'; const report = JSON.parse(readFileSync(path, 'utf8')); report.unknownSchema = 2; writeFileSync(path, JSON.stringify(report)); }",
  );
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /unknown jscpd.*schema/u);
});

test("quality snapshots never treat source aliases as owned mutation or scan inputs", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  symlinkSync(join(repo.root, "src/clone-a.ts"), join(repo.root, "src/alias.ts"));
  repo.commit();
  const before = readFileSync(join(repo.root, "src/clone-a.ts"), "utf8");
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /regular committed source/u);
  assert.equal(readFileSync(join(repo.root, "src/clone-a.ts"), "utf8"), before);
});

test("G6 rejects actual comparable-scope regression even when the candidate exceeds the global floor", (t) => {
  const repo = reviewedMutationFixture(t);
  repo.write(
    "src/classify.ts",
    "// changed existing file\nexport function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  const originalTests = readFileSync(join(repo.root, "test/classify.test.ts"), "utf8");
  repo.write("test/classify.test.ts", originalTests.replace("expect(classify(0)).toBe('other');", ""));
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /comparable-scope mutation regression 85\.714/u);
  assert.match(result.output, /Survived/u);
  assert.match(result.output, /src\/classify\.ts/u);
  assert.ok(repo.initial.metrics.mutationScore < 85);
});

test("G6 keeps caller work and indexes intact under inherited Git overrides and withholds runner credentials", (t) => {
  const repo = reviewedMutationFixture(t);
  const external = fixture(t);
  external.write("caller.txt", "staged work\n");
  external.git("add", "caller.txt");
  external.write("caller.txt", "unstaged work\n");
  const externalIndex = readFileSync(join(external.root, ".git/index"));
  const externalHead = external.git("rev-parse", "HEAD");
  repo.write(
    "src/classify.ts",
    "// changed existing file\nexport function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/classify.test.ts",
    `${readFileSync(join(repo.root, "test/classify.test.ts"), "utf8")}\ntest('runner receives no credentials', () => expect(process.env.QUALITY_SECRET_TOKEN).toBeUndefined());\n`,
  );
  const head = repo.commit();
  utimesSync(join(repo.root, "src/classify.ts"), new Date(), new Date(Date.now() + 10_000));
  const index = readFileSync(join(repo.root, ".git/index"));
  const refs = repo.git("show-ref");
  const source = readFileSync(join(repo.root, "src/classify.ts"), "utf8");
  const result = repo.runGate("G6", [], {
    GIT_DIR: join(external.root, ".git"),
    GIT_WORK_TREE: external.root,
    GIT_INDEX_FILE: join(external.root, ".git/index"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/not-real",
    QUALITY_SECRET_TOKEN: "must-not-reach-project-tests",
  });
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index);
  assert.equal(repo.git("rev-parse", "HEAD").trim(), head);
  assert.equal(repo.git("show-ref"), refs);
  assert.equal(readFileSync(join(repo.root, "src/classify.ts"), "utf8"), source);
  assert.deepEqual(readFileSync(join(external.root, ".git/index")), externalIndex);
  assert.equal(external.git("rev-parse", "HEAD"), externalHead);
  assert.equal(readFileSync(join(external.root, "caller.txt"), "utf8"), "unstaged work\n");
});

test("G6 rejects unknown mutant schemas in a real successful Stryker report", (t) => {
  const repo = qualityFixture(t);
  repo.write(
    "src/classify.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/classify.test.ts",
    "import { test, expect } from 'vitest'; import { classify } from '../src/classify.ts'; test('boundary', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
  );
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('stryker') && args.includes('run')) { const path = process.cwd() + '/.superman-ci/mutation.json'; const report = JSON.parse(readFileSync(path, 'utf8')); report.files['src/classify.ts'].mutants[0].unknownSchema = true; writeFileSync(path, JSON.stringify(report)); }",
  );
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /unknown or invalid Stryker mutant.*schema/u);
});

test("G6 does not silently promote an unmeasured whole-repo ratchet tightening", (t) => {
  const repo = reviewedMutationFixture(t);
  const baseline = JSON.parse(readFileSync(join(repo.root, "superman.ratchet.json"), "utf8"));
  baseline.mutationScore = 100;
  repo.write("superman.ratchet.json", JSON.stringify(baseline));
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /whole-repo mutation ratchet.*below.*100/u);
});

test("malformed real quality reports identify unavailable JSON evidence", (t) => {
  for (const gate of ["G5", "G6"]) {
    const repo = measuredCandidate(t, gate);
    const tool = gate === "G5" ? "jscpd" : "stryker";
    const suffix = gate === "G5" ? "/.superman-ci/duplication/jscpd-report.json" : "/.superman-ci/mutation.json";
    const marker = gate === "G5" ? "--config" : "run";
    interceptPnpm(
      repo.root,
      `if (args.includes('${tool}') && args.includes('${marker}')) writeFileSync(process.cwd() + '${suffix}', '{invalid json');`,
    );
    const result = repo.runGate(gate);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /invalid .* report JSON/u);
  }
});

test("reviewed tool/config/scope identity changes require a fresh Gate 1 baseline", (t) => {
  const repo = measuredCandidate(t, "G5");
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  const config = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
  config.minTokens = 51;
  repo.write(".jscpd.json", JSON.stringify(config));
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("README.md", "later work under changed quality policy\n");
  repo.commit();
  for (const gate of ["G5", "G6"]) {
    const result = repo.runGate(gate);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /qualityInputsHash scope\/tool\/config mismatch.*Gate 1/u);
  }
});

test("a mutation ratchet tightening is accepted only after a real whole-repo measurement", (t) => {
  const repo = reviewedMutationFixture(t);
  const baseline = JSON.parse(readFileSync(join(repo.root, "superman.ratchet.json"), "utf8"));
  baseline.mutationScore = 100;
  repo.write("superman.ratchet.json", JSON.stringify(baseline));
  repo.write(
    "test/classify.test.ts",
    `${readFileSync(join(repo.root, "test/classify.test.ts"), "utf8")}\ntest('previously uncovered boundaries', () => { expect(unused(11)).toBe('high'); expect(unused(10)).toBe('low'); expect(unused(9)).toBe('low'); });\n`,
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.metrics.ratchetTightening.mutationScore, 100);
  assert.deepEqual(outcome.metrics.ratchetTightening.files, ["src/classify.ts", "src/weak.ts"]);
  assert.equal(outcome.metrics.comparison, undefined);
  assert.match(outcome.reason, /whole-repo mutation ratchet tightening measured/u);
});

test("nonempty quality scopes verify declared package pins and actual executable versions", async (t) => {
  for (const [gate, name, tool] of [
    ["G5", "jscpd", "jscpd"],
    ["G6", "@stryker-mutator/core", "stryker"],
    ["G6", "@stryker-mutator/vitest-runner", ""],
    ["G6", "vitest", "vitest"],
    ["G6", "typescript", "tsc"],
  ]) {
    await t.test(`${gate} declared ${name}`, (t) => {
      const repo = measuredCandidate(t, gate, name);
      const result = repo.runGate(gate);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /pin mismatch/u);
    });
    if (tool)
      await t.test(`${gate} executable ${tool}`, (t) => {
        const repo = measuredCandidate(t, gate);
        interceptPnpm(
          repo.root,
          `if (args.includes('${tool}') && args.includes('--version')) result.stdout = 'wrong executable 0.0.0';`,
        );
        const result = repo.runGate(gate);
        assert.equal(result.status, 1, result.output);
        assert.match(result.output, /executable pin mismatch/u);
      });
  }
});

// These rejection paths were introduced in the preceding red/green slices.
// Each corruption is applied after the real pinned tool process has run.
test("quality gates fail closed on tool failures, missing reports and inconsistent counters/statuses", async (t) => {
  const cases = [
    ["G5", "missing report", "rmSync(path);"],
    ["G5", "tool exit", "result.status = 2;"],
    [
      "G5",
      "counters",
      "const report = JSON.parse(readFileSync(path, 'utf8')); report.statistics.total.sources = 99; writeFileSync(path, JSON.stringify(report));",
    ],
    ["G6", "missing report", "rmSync(path);"],
    ["G6", "tool exit", "result.status = 2;"],
    [
      "G6",
      "counters",
      "const report = JSON.parse(readFileSync(path, 'utf8')); report.files['src/classify.ts'].mutants.pop(); writeFileSync(path, JSON.stringify(report));",
    ],
    [
      "G6",
      "zero mutants",
      "const report = JSON.parse(readFileSync(path, 'utf8')); report.files['src/classify.ts'].mutants = []; writeFileSync(path, JSON.stringify(report));",
    ],
    [
      "G6",
      "unknown status",
      "const report = JSON.parse(readFileSync(path, 'utf8')); report.files['src/classify.ts'].mutants[0].status = 'UnknownStatus'; writeFileSync(path, JSON.stringify(report));",
    ],
    [
      "G6",
      "pending execution",
      "const report = JSON.parse(readFileSync(path, 'utf8')); const mutant = report.files['src/classify.ts'].mutants[0]; mutant.status = 'Pending'; mutant.testsCompleted = 0; delete mutant.coveredBy; delete mutant.killedBy; writeFileSync(path, JSON.stringify(report));",
    ],
  ];
  for (const [gate, scenario, action] of cases)
    await t.test(`${gate} ${scenario}`, (t) => {
      const repo = measuredCandidate(t, gate);
      const tool = gate === "G5" ? "jscpd" : "stryker";
      const suffix = gate === "G5" ? "/.superman-ci/duplication/jscpd-report.json" : "/.superman-ci/mutation.json";
      const marker = gate === "G5" ? "--config" : "run";
      interceptPnpm(
        repo.root,
        `if (args.includes('${tool}') && args.includes('${marker}')) { const path = process.cwd() + '${suffix}'; ${action} }`,
      );
      const result = repo.runGate(gate);
      assert.equal(result.status, 1, result.output);
      assert.equal(result.receipt.verdict, "fail");
      assert.match(result.output, /quality tool failed|missing|counter|unknown|ambiguous/iu);
    });
});

test("quality identities refuse unlisted local compiler inputs instead of silently omitting their contents", (t) => {
  const repo = qualityFixture(t);
  const compiler = JSON.parse(readFileSync(join(repo.root, "tsconfig.json"), "utf8"));
  compiler.extends = "./settings/strict.json";
  repo.write("tsconfig.json", JSON.stringify(compiler));
  repo.write("settings/strict.json", '{"compilerOptions":{"strict":true}}\n');
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /unmodeled quality policy input.*Gate 1/u);
});

test("explicit local policy inputs are hashed transitively and changes invalidate the reviewed baseline", (t) => {
  const repo = qualityFixture(t);
  const compiler = JSON.parse(readFileSync(join(repo.root, "tsconfig.json"), "utf8"));
  compiler.extends = "./settings/strict.json";
  repo.write("tsconfig.json", JSON.stringify(compiler));
  repo.write("settings/strict.json", '{"compilerOptions":{"strict":true}}\n');
  const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
  config.policyInputs.push("settings/strict.json");
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  repo.write("settings/strict.json", '{"compilerOptions":{"strict":false}}\n');
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /qualityInputsHash scope\/tool\/config mismatch/u);
});

test("G5 scans all tracked source even when a tracked path matches gitignore", (t) => {
  const repo = qualityFixture(t);
  repo.write(".gitignore", `${readFileSync(join(repo.root, ".gitignore"), "utf8")}src/clone-b.ts\n`);
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.git("add", "-f", "src/clone-b.ts");
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].metrics.sources, 2);
  assert.equal(result.receipt.results[0].metrics.jscpdPct, 50);
});

test("G6 does not silently reclassify an existing mutation scope as new through a rename", (t) => {
  const repo = reviewedMutationFixture(t);
  renameSync(join(repo.root, "src/classify.ts"), join(repo.root, "src/moved.ts"));
  repo.write(
    "test/classify.test.ts",
    readFileSync(join(repo.root, "test/classify.test.ts"), "utf8")
      .replace("../src/classify.ts", "../src/moved.ts")
      .replace("expect(classify(0)).toBe('other');", ""),
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /scope relocation.*Gate 1/u);
});

test("removing the final reviewed source scope reports n/a, not fabricated zero or perfect scores", (t) => {
  const repo = measuredCandidate(t, "G5");
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  rmSync(join(repo.root, "src/clone-a.ts"));
  repo.commit();
  for (const gate of ["G5", "G6"]) {
    const result = repo.runGate(gate);
    assert.equal(result.status, 0, result.output);
    const outcome = result.receipt.results[0];
    assert.equal(outcome.status, "n/a");
    assert.equal(outcome.metrics, undefined);
    assert.deepEqual(outcome.evidence.removed, ["src/clone-a.ts"]);
  }
});

test("G5 full-corpus scans cannot silently omit source above jscpd's default size cutoff", (t) => {
  const repo = qualityFixture(t);
  const source = `/* ${"padding".repeat(160_000)} */\n${repeatedSource()}`;
  repo.write("src/large-a.ts", source);
  repo.write("src/large-b.ts", source);
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].metrics.sources, 2);
  assert.ok(result.receipt.results[0].metrics.clones > 0);
  assert.ok(result.receipt.results[0].metrics.jscpdPct > 0);
});

test("G5 rejects source-level jscpd exclusions instead of accepting a hidden duplication regression", (t) => {
  const repo = measuredCandidate(t, "G5");
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(
    "src/clone-b.ts",
    `// jscpd:ignore-start\n${repeatedSource()}// jscpd:ignore-end\nexport const distinct = 2;\n`,
  );
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G5: source-level jscpd ignore range is forbidden/u);
});

test("G5 distinguishes inert directive names from effective block-comment exclusion ranges", (t) => {
  const repo = measuredCandidate(t, "G5");
  repo.write(
    "src/names.ts",
    `${repeatedSource()}export const examples = ["jscpd:ignore-start", "jscpd:ignore-end"];\n`,
  );
  repo.commit();
  const inert = repo.runGate("G5");
  assert.equal(inert.status, 0, inert.output);
  repo.write("src/clone-b.ts", `/* jscpd:ignore-start */\n${repeatedSource()}/* jscpd:ignore-end */\n`);
  repo.commit();
  const effective = repo.runGate("G5");
  assert.equal(effective.status, 1, effective.output);
  assert.match(effective.output, /G5: source-level jscpd ignore range is forbidden/u);
});

test("an empty source base does not erase the retained reviewed duplication baseline", (t) => {
  const repo = measuredCandidate(t, "G5");
  const measured = repo.runGate("G5");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 0,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  rmSync(join(repo.root, "src/clone-a.ts"));
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /duplication regression 50 > approved 0/u);
});

test("G5 never reports a partial real scan as a full declared corpus", (t) => {
  const repo = measuredCandidate(t, "G5");
  repo.write("src/small.ts", "export const small = 1;\n");
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G5: incomplete jscpd corpus counters.*expected 2.*actual 1/u);
});

test("quality n/a cannot hide an unmodeled aliased filesystem policy input", (t) => {
  const repo = qualityFixture(t);
  repo.write(
    "vitest.config.ts",
    'import { readFileSync as load } from "node:fs";\nexport default JSON.parse(load(new URL("./settings/test-policy.json", import.meta.url), "utf8"));\n',
  );
  repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":false}}\n');
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":true}}\n');
  repo.commit();
  for (const gate of ["G5", "G6"]) {
    const result = repo.runGate(gate);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Cannot establish effective policy.*Filesystem/u);
    assert.equal(result.receipt.results[0].metrics, undefined);
  }
});

test("a retained mutation baseline cannot silently restart after its whole source scope was removed", (t) => {
  const repo = measuredCandidate(t, "G6");
  const measured = repo.runGate("G6");
  assert.equal(measured.status, 0, measured.output);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: 100,
      qualityInputsHash: measured.receipt.results[0].evidence.qualityInputsHash,
    }),
  );
  const source = readFileSync(join(repo.root, "src/classify.ts"), "utf8");
  rmSync(join(repo.root, "src/classify.ts"));
  rmSync(join(repo.root, "test/classify.test.ts"));
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/classify.ts", source);
  repo.write(
    "test/classify.test.ts",
    'import { test, expect } from "vitest"; import { classify } from "../src/classify.ts"; test("export", () => expect(typeof classify).toBe("function"));\n',
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /retained mutation baseline.*empty base scope/u);
});

// --- Row 10: full-corpus G5 and fresh critical G6 evidence ------------------

test("G5 refuses a reviewed profile that raises the >5-line clone floor", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
    profile.minLines = 10;
    repo.write(".jscpd.json", JSON.stringify(profile));
  });
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /does not declare the reviewed clone floors \(50 tokens, 5 lines\)/u);
});

test("G5 refuses a reviewed profile that owns the duplication threshold", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
    profile.threshold = 100;
    repo.write(".jscpd.json", JSON.stringify(profile));
  });
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /must not own a duplication threshold/u);
});

test("G5 refuses a reviewed profile that ignores sources", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
    profile.ignore = ["**/clone-*.ts"];
    repo.write(".jscpd.json", JSON.stringify(profile));
  });
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /must not ignore sources/u);
});

test("G5 cannot be reduced to a changed-only scan", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.write("src/clone-c.ts", repeatedSource());
  repo.commit();
  const captured = join(repo.root, ".git/jscpd-argv.json");
  interceptPnpm(
    repo.root,
    `if (args.includes('jscpd')) writeFileSync(${JSON.stringify(captured)}, JSON.stringify(args));`,
  );
  const result = repo.runGate("G5");
  assert.equal(result.status, 0, result.output);
  const argv = JSON.parse(readFileSync(captured, "utf8")) as string[];
  // The scan names every file of the declared corpus explicitly. There is no
  // changed-only switch to reach for and no way to narrow the corpus: the
  // invocation itself is the proof that a changed-only scan is impossible.
  assert.ok(argv.includes("./src/clone-a.ts"));
  assert.ok(argv.includes("./src/clone-b.ts"));
  assert.ok(argv.includes("./src/clone-c.ts"));
  assert.equal(
    argv.some((argument) => argument.startsWith("--changed")),
    false,
    "the declared corpus is explicit; a changed-only switch must never appear",
  );
});

test("G5 refuses a scan that covered fewer sources than the declared corpus", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  // A changed-only scan covers fewer sources than the declared corpus. The
  // corpus-completeness guard refuses it by name, whatever produced it.
  interceptPnpm(
    repo.root,
    "if (args.includes('jscpd') && args.includes('--config')) { const path = process.cwd() + '/.superman-ci/duplication/jscpd-report.json'; const report = JSON.parse(readFileSync(path, 'utf8')); report.statistics.total.sources = 1; writeFileSync(path, JSON.stringify(report)); }",
  );
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G5: incomplete jscpd corpus counters.*expected 2.*actual 1/u);
});

test("G5 refuses a clipped duplication percentage", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  interceptPnpm(
    repo.root,
    "if (args.includes('jscpd') && args.includes('--config')) { const path = process.cwd() + '/.superman-ci/duplication/jscpd-report.json'; const report = JSON.parse(readFileSync(path, 'utf8')); report.statistics.total.percentage = 0; report.statistics.formats.typescript.percentage = 0; writeFileSync(path, JSON.stringify(report)); }",
  );
  const result = repo.runGate("G5");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /clipped duplication percentage 0 does not match the measured 50/u);
});

test("G6 blocks a missing critical case", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        scope: ["src/**/*.ts", "!src/**/*.test.ts"],
        critical: [
          {
            id: "critical-classification",
            module: "src/critical.ts",
            case: "test/critical.test.ts",
            runner: "vitest",
          },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "src/critical.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /missing critical case test\/critical\.test\.ts/u);
});

test("G6 blocks a missing critical module", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        scope: ["src/**/*.ts", "!src/**/*.test.ts"],
        critical: [
          {
            id: "critical-classification",
            module: "src/absent.ts",
            case: "test/critical.test.ts",
            runner: "vitest",
          },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "src/critical.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); });\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /missing critical module src\/absent\.ts/u);
});

function criticalMutationFixture(t: TestContext) {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        scope: ["src/**/*.ts", "!src/**/*.test.ts"],
        critical: [
          {
            id: "critical-classification",
            module: "src/critical.ts",
            case: "test/critical.test.ts",
            runner: "vitest",
          },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "src/critical.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
  );
  repo.write("src/other.ts", "export function other(value: number) { return value > 10 ? 'high' : 'low'; }\n");
  repo.write(
    "test/other.test.ts",
    "import { expect, test } from 'vitest'; import { other } from '../src/other.ts'; test('other', () => { expect(other(11)).toBe('high'); expect(other(9)).toBe('low'); });\n",
  );
  repo.commit();
  const measured = repo.runGate("G6");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results[0];
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: initial.metrics.mutationScore,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  return { repo, initial };
}

test("G6 blocks an introduced critical survivor even when the aggregate improves", (t) => {
  const { repo, initial } = criticalMutationFixture(t);
  // The comparable scope improves: the non-critical module gains a boundary
  // assertion and a fully covered export.
  repo.write(
    "src/other.ts",
    "export function other(value: number) { return value > 10 ? 'high' : 'low'; }\nexport function doubled(value: number) { return value * 2; }\n",
  );
  repo.write(
    "test/other.test.ts",
    "import { expect, test } from 'vitest'; import { doubled, other } from '../src/other.ts'; test('other', () => { expect(other(11)).toBe('high'); expect(other(9)).toBe('low'); }); test('doubled', () => { expect(doubled(2)).toBe(4); });\n",
  );
  // The critical case loses an assertion: the critical module gains a survivor.
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); });\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /introduced critical survivor in src\/critical\.ts/u);
  assert.equal(result.receipt.results[0].kind, "critical-survivor");
  assert.ok(initial.metrics.counts.Survived + initial.metrics.counts.NoCoverage > 0);
});

test("G6 blocks a critical module the candidate deleted", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        scope: ["src/**/*.ts", "!src/**/*.test.ts"],
        critical: [
          { id: "critical-classification", module: "src/critical.ts", case: "test/critical.test.ts", runner: "vitest" },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "src/critical.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); });\n",
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  // The candidate deletes the declared critical module.
  rmSync(join(repo.root, "src/critical.ts"));
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /missing critical module src\/critical\.ts/u);
  assert.equal(result.receipt.results[0].kind, "skipped-required-work");
});

test("G6 executes the declared critical case fresh and blocks a failing case", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        scope: ["src/**/*.ts", "!src/**/*.test.ts"],
        critical: [
          { id: "critical-classification", module: "src/critical.ts", case: "test/critical.test.ts", runner: "vitest" },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "src/critical.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); });\n",
  );
  repo.commit();
  // The declared case fails at the candidate: it exists, and it does not pass.
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../src/critical.ts'; test('both sides', () => { expect(classify(1)).toBe('negative'); });\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /declared critical case critical-classification failed/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("G6 measures a declared critical module outside src/ and blocks its introduced survivor", (t) => {
  const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
    const config = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
    config.quality = {
      mutation: {
        // The declared scope is the applied scope: it reaches outside
        // `src/`, so a declared critical module outside `src/` is measured.
        scope: ["src/**/*.ts", "lib/**/*.ts", "!**/*.test.ts"],
        critical: [
          {
            id: "critical-classification",
            module: "lib/critical-module.ts",
            case: "test/critical.test.ts",
            runner: "vitest",
          },
        ],
      },
    };
    repo.write(".superman/ci/bootstrap.json", JSON.stringify(config));
  });
  repo.write(
    "lib/critical-module.ts",
    "export function classify(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../lib/critical-module.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); expect(classify(0)).toBe('other'); expect(classify(-1)).toBe('other'); });\n",
  );
  repo.commit();
  const measured = repo.runGate("G6");
  assert.equal(measured.status, 0, measured.output);
  const initial = measured.receipt.results[0];
  // The declared case covers the module completely: the base has no survivor.
  assert.equal(initial.metrics.counts.Survived + initial.metrics.counts.NoCoverage, 0);
  assert.deepEqual(initial.evidence.criticalCases, [
    {
      id: "critical-classification",
      case: "test/critical.test.ts",
      runner: "vitest",
      status: "pass",
    },
  ]);
  repo.write(
    "superman.ratchet.json",
    JSON.stringify({
      jscpdPct: 0,
      mutationScore: initial.metrics.mutationScore,
      qualityInputsHash: initial.evidence.qualityInputsHash,
    }),
  );
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  // The declared case loses an assertion: the declared critical module gains
  // a survivor, and the rule fires on it.
  repo.write(
    "test/critical.test.ts",
    "import { expect, test } from 'vitest'; import { classify } from '../lib/critical-module.ts'; test('both sides', () => { expect(classify(1)).toBe('positive'); });\n",
  );
  repo.commit();
  const result = repo.runGate("G6");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /introduced critical survivor in lib\/critical-module\.ts/u);
  assert.equal(result.receipt.results[0].kind, "critical-survivor");
});

// --- The staged (pre-commit) form of G5 -------------------------------------

/**
 * The environment the driver hands the quality module: the fixture's pinned
 * pnpm on PATH and no inherited Git state.
 */
function stagedEnvironment(root: string): NodeJS.ProcessEnv {
  const isolated = fixtureEnvironment();
  return { ...isolated, PATH: `${join(root, ".tools")}${delimiter}${isolated.PATH ?? ""}` };
}

/** The approved base a staged run compares against. */
function approvedBase(repo: ReturnType<typeof fixture>): string {
  return repo.git("rev-parse", "refs/remotes/origin/main").trim();
}

/**
 * The staged scope's G5, called the way the driver calls it: the scope the
 * stage declared and the changed files the index carries.
 */
function stagedG5(repo: ReturnType<typeof fixture>, changedFiles: string[]) {
  return qualityGate(
    "G5",
    repo.root,
    approvedBase(repo),
    repo.git("rev-parse", "HEAD").trim(),
    stagedEnvironment(repo.root),
    { scope: "staged", changedFiles, mutation: "full" },
  );
}

test("a staged change with no corpus file staged reports n/a, not an invented pass", (t) => {
  const repo = qualityFixture(t);
  repo.write("README.md", "staged documentation\n");
  repo.git("add", "README.md");
  const result = stagedG5(repo, ["README.md"]);
  assert.equal(result.status, "n/a");
  assert.equal(result.scope, "staged");
  assert.match(result.reason ?? "", /no changed file.*declared duplication corpus/u);
  assert.equal(result.metrics, undefined);
  assert.equal(result.evidence, undefined);
  // The result says what it did not check, so a partial result is never read
  // as the merge bar.
  assert.match(result.notChecked ?? "", /merge bar/u);
});

test("a staged change that introduces a clone fails and names the clone", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  // The base owns clone-a alone. The staged change gives it a partner.
  repo.write("src/clone-a.ts", `${repeatedSource()}\nexport const extra = 1;\n`);
  repo.write("src/clone-b.ts", repeatedSource());
  repo.git("add", "src/clone-a.ts", "src/clone-b.ts");
  assert.throws(
    () => stagedG5(repo, ["src/clone-a.ts", "src/clone-b.ts"]),
    /introduce 1 duplicate clone.*src\/clone-a\.ts <-> src\/clone-b\.ts/u,
  );
});

test("a staged change whose clone already existed at the base passes", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  // Both files move on, but the pair they clone with was already at the base.
  repo.write("src/clone-a.ts", `${repeatedSource()}\nexport const extraA = 1;\n`);
  repo.write("src/clone-b.ts", `${repeatedSource()}\nexport const extraB = 2;\n`);
  repo.git("add", "src/clone-a.ts", "src/clone-b.ts");
  const result = stagedG5(repo, ["src/clone-a.ts", "src/clone-b.ts"]);
  assert.equal(result.status, "pass");
  assert.equal(result.scope, "staged");
  assert.equal(result.metrics?.clones, 1);
  assert.deepEqual(result.evidence?.files, ["src/clone-a.ts", "src/clone-b.ts"]);
  assert.equal(result.evidence?.preexistingClones, 1);
  assert.equal(result.evidence?.baseClones, 1);
  assert.deepEqual(result.evidence?.introduced, []);
});

test("the staged scope refuses a gate that declares no staged form", (t) => {
  const repo = qualityFixture(t);
  assert.throws(
    () =>
      qualityGate(
        "G6",
        repo.root,
        approvedBase(repo),
        repo.git("rev-parse", "HEAD").trim(),
        stagedEnvironment(repo.root),
        { scope: "staged", changedFiles: [], mutation: "full" },
      ),
    /the staged scope declares no form of this gate/u,
  );
});

test("the staged scope refuses a changed-file list that is not a list of paths", (t) => {
  const repo = qualityFixture(t);
  assert.throws(
    () =>
      qualityGate(
        "G5",
        repo.root,
        approvedBase(repo),
        repo.git("rev-parse", "HEAD").trim(),
        stagedEnvironment(repo.root),
        { scope: "staged", changedFiles: [42] as unknown as string[], mutation: "full" },
      ),
    /the staged scope needs the changed file paths/u,
  );
});

test("the staged scope refuses a reviewed profile that is not the reviewed measurement profile", async (t) => {
  const cases: [string, (profile: Record<string, unknown>) => void, RegExp][] = [
    [
      "raised clone floors",
      (profile) => {
        profile.minTokens = 40;
      },
      /does not declare the reviewed clone floors \(50 tokens, 5 lines\)/u,
    ],
    [
      "an owned threshold",
      (profile) => {
        profile.threshold = 100;
      },
      /must not own a duplication threshold/u,
    ],
    [
      "ignored sources",
      (profile) => {
        profile.ignore = ["**/clone-*.ts"];
      },
      /must not ignore sources/u,
    ],
  ];
  for (const [name, mutate, expected] of cases)
    await t.test(name, (t) => {
      const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
        const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
        mutate(profile);
        repo.write(".jscpd.json", JSON.stringify(profile));
      });
      repo.write("src/clone-a.ts", repeatedSource());
      repo.git("add", "src/clone-a.ts");
      assert.throws(() => stagedG5(repo, ["src/clone-a.ts"]), expected);
    });
  await t.test("an unreadable profile", (t) => {
    const repo = qualityFixture(t, "ticket/demo-01", (repo) => {
      repo.write(".jscpd.json", "{ not json");
    });
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
    assert.throws(() => stagedG5(repo, ["src/clone-a.ts"]), /no readable reviewed jscpd profile/u);
  });
  await t.test("a base without a reviewed profile", (t) => {
    const repo = qualityFixture(t);
    // The fixture's approved base predates the reviewed profile.
    repo.git("update-ref", "refs/remotes/origin/main", repo.baseSha);
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
    assert.throws(() => stagedG5(repo, ["src/clone-a.ts"]), /no regular reviewed jscpd profile/u);
  });
});

test("the staged scope refuses a staged jscpd profile that differs from the reviewed base profile", (t) => {
  const repo = qualityFixture(t);
  const profile = JSON.parse(readFileSync(join(repo.root, ".jscpd.json"), "utf8"));
  profile.minTokens = 40;
  repo.write(".jscpd.json", JSON.stringify(profile));
  repo.git("add", ".jscpd.json");
  repo.write("src/clone-a.ts", repeatedSource());
  repo.git("add", "src/clone-a.ts");
  assert.throws(
    () => stagedG5(repo, [".jscpd.json", "src/clone-a.ts"]),
    /the staged jscpd profile differs from the reviewed base profile/u,
  );
});

test("the staged scope verifies the declared package pins and the actual executable version", async (t) => {
  await t.test("a declared pin mismatch", (t) => {
    const repo = qualityFixture(t);
    const pkg = JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
    pkg.devDependencies.jscpd = "0.0.0";
    repo.write("package.json", JSON.stringify(pkg));
    repo.git("add", "package.json");
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
    assert.throws(() => stagedG5(repo, ["package.json", "src/clone-a.ts"]), /jscpd pin mismatch/u);
  });
  await t.test("an executable pin mismatch", (t) => {
    const repo = qualityFixture(t);
    repo.write("src/clone-a.ts", repeatedSource());
    repo.git("add", "src/clone-a.ts");
    interceptPnpm(
      repo.root,
      "if (args.includes('jscpd') && args.includes('--version')) result.stdout = 'wrong executable 0.0.0';",
    );
    assert.throws(() => stagedG5(repo, ["src/clone-a.ts"]), /jscpd executable pin mismatch/u);
  });
});

test("the staged scope refuses a staged source-level jscpd exclusion", (t) => {
  const repo = qualityFixture(t);
  repo.write(
    "src/clone-a.ts",
    `// jscpd:ignore-start\n${repeatedSource()}// jscpd:ignore-end\nexport const distinct = 2;\n`,
  );
  repo.git("add", "src/clone-a.ts");
  assert.throws(() => stagedG5(repo, ["src/clone-a.ts"]), /source-level jscpd ignore range is forbidden/u);
});

test("the staged scope refuses an unknown jscpd report schema", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.git("add", "src/clone-a.ts", "src/clone-b.ts");
  interceptPnpm(
    repo.root,
    "if (args.includes('jscpd') && args.includes('--config')) { const path = process.cwd() + '/.superman-ci/duplication/jscpd-report.json'; const report = JSON.parse(readFileSync(path, 'utf8')); report.unknownSchema = 2; writeFileSync(path, JSON.stringify(report)); }",
  );
  assert.throws(() => stagedG5(repo, ["src/clone-a.ts", "src/clone-b.ts"]), /unknown jscpd reporter schema/u);
});

test("the staged scope materialises the index without writing into the repository", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.git("add", "src/clone-a.ts");
  const index = readFileSync(join(repo.root, ".git/index"));
  const status = repo.git("status", "--porcelain");
  const result = stagedG5(repo, ["src/clone-a.ts"]);
  assert.equal(result.status, "pass");
  assert.deepEqual(readFileSync(join(repo.root, ".git/index")), index);
  assert.equal(repo.git("status", "--porcelain"), status);
});

test("the full-scope G5 needs no scope argument and keeps its result shape", (t) => {
  const repo = qualityFixture(t);
  repo.write("src/clone-a.ts", repeatedSource());
  repo.write("src/clone-b.ts", repeatedSource());
  repo.commit();
  const result = qualityGate(
    "G5",
    repo.root,
    approvedBase(repo),
    repo.git("rev-parse", "HEAD").trim(),
    stagedEnvironment(repo.root),
  );
  assert.equal(result.status, "pass");
  assert.equal(result.scope, undefined);
  assert.equal(result.checked, undefined);
  assert.equal(result.notChecked, undefined);
  assert.equal(result.metrics?.jscpdPct, 50);
  assert.deepEqual(result.evidence?.files, ["src/clone-a.ts", "src/clone-b.ts"]);
});
