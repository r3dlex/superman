// Approved raw-gates process seam; coverage depends on all product source src/**.
import assert from "node:assert/strict";
import { readFileSync, renameSync, rmSync, symlinkSync, utimesSync } from "node:fs";
import { join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fixture, interceptPnpm } from "./raw-fixture.ts";

function qualityFixture(t: TestContext) {
  const repo = fixture(t);
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
