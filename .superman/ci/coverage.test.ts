// Approved coverage-command process seam; real collectors, owned tiny repositories.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";

const source = resolve(import.meta.dirname, "../..");
const isolated = fixtureEnvironment();

// The binding point both carried coverage floors share: the merge-bound
// cutover, when the Deno root becomes the required evaluator. André settled
// both floors there on 2026-11-04, so the Node gate and the Deno collector
// name the same point.
const MERGE_BOUND_BINDING = "the merge-bound cutover, when the Deno root becomes the required evaluator";

function fixture(t: TestContext) {
  // The coverage command measures from realpathSync(process.cwd()); the fixture
  // root must be canonical too, or a symlinked TMPDIR (macOS /var) mismatches.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "superman-coverage-fixture-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, text: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
  for (const file of [".superman/ci/coverage.json", ".superman/ci/bootstrap.json", "vitest.config.ts"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(source, file), join(root, file));
  }
  // The fixture repository owns no candidate surface, no candidate host and
  // no Deno surface: the candidate and Deno scopes stay declared, and their
  // inventories are exercised by the dedicated candidate and Deno tests.
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/coverage.json"), "utf8"));
  policy.candidate.members = [];
  policy.candidate.suites = [];
  policy.deno.members = [];
  policy.tests = [".superman/ci/**/*.test.ts"];
  writeFileSync(join(root, ".superman/ci/coverage.json"), JSON.stringify(policy));
  mkdirSync(join(root, policy.candidate.root), { recursive: true });
  mkdirSync(join(root, policy.deno.root), { recursive: true });
  write("package.json", readFileSync(join(source, "package.json"), "utf8"));
  write(".gitignore", "node_modules\n.superman-ci/\n");
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Coverage Fixture");
  git("config", "user.email", "fixture@example.invalid");
  symlinkSync(join(source, "node_modules"), join(root, "node_modules"), "dir");
  return {
    root,
    write,
    run(args: string[] = []) {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "-m", "coverage fixture");
      const result = spawnSync(process.execPath, [join(source, ".superman/ci/coverage.ts"), ...args], {
        cwd: root,
        env: { ...isolated, HEAD_REF: "spec/coverage" },
        encoding: "utf8",
        shell: false,
        timeout: 120_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      assert.ifError(result.error);
      const output = `${result.stdout}${result.stderr}`;
      return { status: result.status, output, directory: /^Coverage reports: (.+)$/mu.exec(output)?.[1] };
    },
  };
}

test("coverage command rejects passing tests when real overall coverage is below 90 percent", (t) => {
  const repo = fixture(t);
  repo.write(
    ".superman/ci/subject.ts",
    "export function sign(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\nexport function untested() {\n  return 'uncovered';\n}\n",
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("positive", () => assert.equal(sign(1), "positive"));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage below 90%/u);
  assert.match(result.output, /functions|branches/u);
});

function coveredBootstrap(t: TestContext) {
  const repo = fixture(t);
  repo.write(
    ".superman/ci/subject.ts",
    "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); });\n',
  );
  return repo;
}

test("coverage command also measures product source with real pinned Vitest coverage", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    "src/subject.ts",
    "export function sign(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\nexport function untested() {\n  return 'uncovered';\n}\n",
  );
  repo.write(
    "test/subject.test.ts",
    'import { expect, test } from "vitest"; import { sign } from "../src/subject.ts"; test("positive", () => expect(sign(1)).toBe("positive"));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage below 90%/u);
});

test("fully covered real code passes and reports exclude hidden-directory test code", (t) => {
  const repo = coveredBootstrap(t);
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
  assert.deepEqual(Object.keys(report), [join(repo.root, ".superman/ci/subject.ts")]);
  const summary = JSON.parse(readFileSync(join(result.directory, "coverage-summary.json"), "utf8")).total;
  for (const name of ["lines", "statements", "branches", "functions"]) assert.equal(summary[name].pct, 100);
});

test("the overall floor accepts an actual exact 90 percent measurement", (t) => {
  const repo = fixture(t);
  repo.write(
    ".superman/ci/subject.ts",
    Array.from({ length: 10 }, (_, i) => `export function item${i}() { return ${i}; }\n`).join(""),
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { test } from "node:test"; import * as subject from "./subject.ts";\ntest("nine of ten", () => { ${Array.from({ length: 9 }, (_, i) => `assert.equal(subject.item${i}(), ${i});`).join(" ")} });\n`,
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const summary = JSON.parse(readFileSync(join(result.directory, "coverage-summary.json"), "utf8")).total;
  assert.equal(summary.functions.pct, 90);
  assert.equal(summary.lines.pct, 90);
});

test("renaming runtime bytes to a test filename cannot drop them from measurement", (t) => {
  const bytes = "export function runtime(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\n";
  const measure = (name: string) => {
    const repo = fixture(t);
    repo.write(`.superman/ci/${name}`, bytes);
    repo.write(
      ".superman/ci/app.ts",
      `import { runtime } from "./${name}";\nexport function use(value: number) { return runtime(value); }\n`,
    );
    repo.write(
      ".superman/ci/app.test.ts",
      'import assert from "node:assert/strict"; import { test } from "node:test"; import { use } from "./app.ts"; test("positive", () => assert.equal(use(1), "positive"));\n',
    );
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage below 90%/u);
    assert.ok(result.directory);
    const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
    assert.ok(report[join(repo.root, `.superman/ci/${name}`)], result.output);
    return report;
  };
  measure("runtime.ts");
  measure("runtime.test.ts");
});

test("runtime reached through an intermediate import cannot hide behind a test filename", (t) => {
  const repo = fixture(t);
  repo.write(
    ".superman/ci/runtime.test.ts",
    "export function runtime(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\n",
  );
  repo.write(
    ".superman/ci/mid.test.ts",
    'import { runtime } from "./runtime.test.ts";\nexport function forward(value: number) { return runtime(value); }\n',
  );
  repo.write(
    ".superman/ci/app.ts",
    'import { forward } from "./mid.test.ts";\nexport function use(value: number) { return forward(value); }\n',
  );
  repo.write(
    ".superman/ci/app.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { use } from "./app.ts"; test("positive", () => assert.equal(use(1), "positive"));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.ok(result.directory);
  const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
  assert.ok(report[join(repo.root, ".superman/ci/runtime.test.ts")]);
  assert.ok(report[join(repo.root, ".superman/ci/mid.test.ts")]);
});

test("a side-effect import cannot hide runtime behind a test filename", (t) => {
  const hidden =
    "export function runtime(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\n";
  const reached = fixture(t);
  reached.write(".superman/ci/runtime.test.ts", hidden);
  reached.write(
    ".superman/ci/app.ts",
    'import "./runtime.test.ts";\nexport function use(value: number) { return value > 0 ? "positive" : "other"; }\n',
  );
  reached.write(
    ".superman/ci/app.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { use } from "./app.ts"; test("both sides", () => { assert.equal(use(1), "positive"); assert.equal(use(0), "other"); });\n',
  );
  const measured = reached.run();
  assert.equal(measured.status, 1, measured.output);
  assert.match(measured.output, /Coverage below 90%/u);
  assert.ok(measured.directory);
  const report = JSON.parse(readFileSync(join(measured.directory, "coverage-final.json"), "utf8"));
  assert.ok(report[join(reached.root, ".superman/ci/runtime.test.ts")]);

  const unmodeled = coveredBootstrap(t);
  unmodeled.write("tools/runtime.test.ts", hidden);
  unmodeled.write(
    ".superman/ci/subject.ts",
    'import "../../tools/runtime.test.ts";\nexport function sign(value: number) { return value > 0 ? "positive" : "other"; }\n',
  );
  const blocked = unmodeled.run();
  assert.equal(blocked.status, 1, blocked.output);
  assert.match(
    blocked.output,
    /Coverage scope does not model runtime-reachable excluded module: tools\/runtime\.test\.ts/u,
  );
  assert.equal(blocked.directory, undefined, "Unknown runtime ownership cannot publish manufactured coverage");
});

test("subprocess execution cannot hide runtime behind a test filename", (t) => {
  const hidden =
    "export function runtime(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\nconsole.log(runtime(1));\n";
  const reached = coveredBootstrap(t);
  reached.write(".superman/ci/runtime.test.ts", hidden);
  reached.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, [".superman/ci/runtime.test.ts"], { encoding: "utf8", shell: false }).trim(), "positive"); });\n',
  );
  const measured = reached.run();
  assert.equal(measured.status, 1, measured.output);
  assert.match(measured.output, /Coverage below 90%/u);
  assert.ok(measured.directory);
  const report = JSON.parse(readFileSync(join(measured.directory, "coverage-final.json"), "utf8"));
  assert.ok(report[join(reached.root, ".superman/ci/runtime.test.ts")]);

  const unmodeled = coveredBootstrap(t);
  unmodeled.write("tools/runtime.test.ts", hidden);
  unmodeled.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["tools/runtime.test.ts"], { encoding: "utf8", shell: false }).trim(), "positive"); });\n',
  );
  const blocked = unmodeled.run();
  assert.equal(blocked.status, 1, blocked.output);
  assert.match(
    blocked.output,
    /Coverage scope does not model runtime-reachable excluded module: tools\/runtime\.test\.ts/u,
  );
  assert.equal(blocked.directory, undefined, "Unknown runtime ownership cannot publish manufactured coverage");
});

test("an eval subprocess cannot hide runtime behind a test filename", (t) => {
  const hidden =
    "export function runtime(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\nconsole.log(runtime(1));\n";
  const reached = coveredBootstrap(t);
  reached.write(".superman/ci/runtime.test.ts", hidden);
  reached.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and eval subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["--input-type=commonjs", "--eval", ${JSON.stringify('require("./.superman/ci/runtime.test.ts")')}], { encoding: "utf8", shell: false }).trim(), "positive"); });\n`,
  );
  const measured = reached.run();
  assert.equal(measured.status, 1, measured.output);
  assert.match(measured.output, /Coverage below 90%/u);
  assert.ok(measured.directory);
  const report = JSON.parse(readFileSync(join(measured.directory, "coverage-final.json"), "utf8"));
  assert.ok(report[join(reached.root, ".superman/ci/runtime.test.ts")]);

  const unmodeled = coveredBootstrap(t);
  unmodeled.write("tools/runtime.test.ts", hidden);
  unmodeled.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and eval subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["--input-type=commonjs", "--eval", ${JSON.stringify('require("./tools/runtime.test.ts")')}], { encoding: "utf8", shell: false }).trim(), "positive"); });\n`,
  );
  const blocked = unmodeled.run();
  assert.equal(blocked.status, 1, blocked.output);
  assert.match(
    blocked.output,
    /Coverage scope does not model runtime-reachable excluded module: tools\/runtime\.test\.ts/u,
  );
  assert.equal(blocked.directory, undefined, "Unknown runtime ownership cannot publish manufactured coverage");
});

test("a test-only helper remains excludable when no measured module imports it", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    ".superman/ci/helper.test.ts",
    "export function helper() {\n  if (false) return 'hidden';\n  return 'helper';\n}\n",
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { sign } from "./subject.ts"; import { helper } from "./helper.test.ts"; test("both sides", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(helper(), "helper"); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
  assert.deepEqual(Object.keys(report), [join(repo.root, ".superman/ci/subject.ts")]);
});

test("unexecuted source files count as uncovered rather than disappearing", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(".superman/ci/unloaded.ts", "export function untested() {\n  return 'never imported';\n}\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage below 90%/u);
  assert.ok(result.directory);
  const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
  assert.ok(report[join(repo.root, ".superman/ci/unloaded.ts")]);
});

test("branch coverage independently blocks a fully called function on a fully executed line", (t) => {
  const repo = fixture(t);
  repo.write(".superman/ci/subject.ts", "export function choose(flag: boolean) { return flag ? 'yes' : 'no'; }\n");
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { choose } from "./subject.ts"; test("true", () => assert.equal(choose(true), "yes"));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage below 90%: branches/u);
  assert.ok(result.directory);
  const summary = JSON.parse(readFileSync(join(result.directory, "coverage-summary.json"), "utf8")).total;
  assert.equal(summary.functions.pct, 100);
  assert.equal(summary.lines.pct, 100);
  assert.ok(summary.branches.pct < 90);
});

test("coverage cannot be raised through source-level ignore directives", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    ".superman/ci/subject.ts",
    "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n/* c8 ignore next 3 */\nexport function untested() {\n  return 'uncovered';\n}\n",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage suppression is forbidden/u);
});

test("coverage cannot silently omit repository runtime code outside the modeled roots", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("tools/unmodeled.ts", "export function untested() { return 'outside the measured roots'; }\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage scope does not model.*tools\/unmodeled\.ts/u);
});

test("coverage rejects a source file that no declared scope models and names its path", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("tools/unmodeled.ts", "export function untested() { return 'outside every declared scope'; }\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage scope does not model source file: tools\/unmodeled\.ts/u);
});

function candidateFixture(t: TestContext) {
  const repo = fixture(t);
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
  policy.candidate = {
    root: ".superman/ci",
    patterns: [".superman/ci/deno-*.ts"],
    members: [".superman/ci/deno-subject.ts"],
    suites: [{ kind: "test", file: ".superman/ci/deno-subject.test.ts", pattern: "^candidate subject$" }],
  };
  repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
  repo.write(
    ".superman/ci/subject.ts",
    "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); });\n',
  );
  repo.write(".superman/ci/deno-subject.ts", "export function subject() { return 'candidate'; }\n");
  repo.write(
    ".superman/ci/deno-subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { subject } from "./deno-subject.ts"; test("candidate subject", () => assert.equal(subject(), "candidate"));\n',
  );
  return repo;
}

test("the runtime-reachable-excluded-module guard covers the candidate scope", (t) => {
  const repo = candidateFixture(t);
  repo.write("tools/hidden.test.ts", "export function hidden() { return 'hidden'; }\n");
  repo.write(
    ".superman/ci/deno-subject.ts",
    'import "../../tools/hidden.test.ts";\nexport function subject() { return "candidate"; }\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Coverage scope does not model runtime-reachable excluded module: tools\/hidden\.test\.ts/u,
  );
});

test("a runtime-reachable excluded file matching the candidate scope cannot enlarge the declared inventory", (t) => {
  const repo = candidateFixture(t);
  repo.write(".superman/ci/deno-hidden.test.ts", "export function hidden() { return 'hidden'; }\n");
  repo.write(
    ".superman/ci/deno-subject.ts",
    'import "./deno-hidden.test.ts";\nexport function subject() { return "candidate"; }\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Coverage candidate inventory does not match its manifest: resolved 2 of 1 declared members/u,
  );
  assert.equal(result.directory, undefined, "An enlarged inventory cannot publish measurements");
});

test("a candidate file with a real source map directive is rejected", (t) => {
  const repo = candidateFixture(t);
  repo.write(
    ".superman/ci/deno-subject.ts",
    "export function subject() { return 'candidate'; }\n//# sourceMappingURL=data:application/json;base64,e30=\n",
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Coverage source maps require reviewed input modeling: \.superman\/ci\/deno-subject\.ts/u,
  );
});

test("a candidate inventory below the floors is a carried obligation, not a run failure", (t) => {
  const repo = candidateFixture(t);
  repo.write(
    ".superman/ci/deno-subject.ts",
    "export function subject() { return 'candidate'; }\nexport function untested() { return 'never imported'; }\n",
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  // The floors bind the shipped inventories; the candidate's shortfall is
  // measured, reported and carried, not silently ignored and not a run failure.
  assert.equal(receipt.verdict, "pass");
  assert.equal(receipt.carriedObligations.length, 1);
  assert.equal(receipt.carriedObligations[0].inventory, "candidate");
  // The binding point is the settled one, in full: André settled both carried
  // coverage floors at the merge-bound cutover on 2026-11-04. Exact equality,
  // so a regression to the superseded wording fails here.
  assert.equal(receipt.carriedObligations[0].binds, MERGE_BOUND_BINDING);
  assert.ok(receipt.carriedObligations[0].metrics.functions);
  assert.match(result.output, /Coverage carried obligation \(candidate\)/u);
  assert.equal(receipt.inventories.candidate.total.functions.covered, 1);
});

test("the candidate inventory is measured and reported separately from the node inventory", (t) => {
  const repo = candidateFixture(t);
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  assert.deepEqual(Object.keys(receipt.inventories).sort(), ["candidate", "node"]);
  assert.equal(receipt.inventories.candidate.files, 1);
  assert.equal(receipt.inventories.candidate.total.functions.covered, 1);
  assert.equal(receipt.inventories.node.files, 1);
  assert.equal(receipt.total.functions.covered, 2);
  // The candidate inventory is measured by another process: its receipt binds
  // the suites that measured it, their outcomes and the host's identity.
  assert.equal(receipt.candidateMeasurement.suites.length, 1);
  assert.equal(receipt.candidateMeasurement.suites[0].file, ".superman/ci/deno-subject.test.ts");
  assert.equal(receipt.candidateMeasurement.suites[0].outcome, "pass");
  assert.equal(receipt.candidateMeasurement.candidateRuntime, "not executed");
  assert.match(receipt.candidateMeasurement.host.sha256, /^[a-f0-9]{64}$/u);
  const candidate = JSON.parse(readFileSync(join(result.directory, "candidate/coverage-summary.json"), "utf8"));
  assert.deepEqual(
    Object.keys(candidate).filter((key) => key !== "total"),
    [join(repo.root, ".superman/ci/deno-subject.ts")],
  );
});

test("a declared candidate inventory that is incomplete fails visibly instead of shrinking the aggregate", async (t) => {
  const cases = [
    {
      name: "the declared root is missing",
      declaration: {
        root: ".superman/ci/deno-candidate",
        patterns: [".superman/ci/deno-*.ts"],
        members: [".superman/ci/deno-subject.ts"],
      },
      expected: /Coverage candidate inventory is missing its declared root/u,
    },
    {
      name: "a declared member matches no scope",
      declaration: {
        root: ".superman/ci",
        patterns: [".superman/ci/deno-*.ts"],
        members: ["tools/deno-subject.ts"],
      },
      expected: /Coverage candidate inventory member matches no declared scope: tools\/deno-subject\.ts/u,
    },
    {
      name: "the scope resolves to fewer files than the manifest declares",
      declaration: {
        root: ".superman/ci",
        patterns: [".superman/ci/deno-*.ts"],
        members: [".superman/ci/deno-absent.ts"],
      },
      expected: /Coverage candidate inventory is missing a declared member: \.superman\/ci\/deno-absent\.ts/u,
    },
    {
      name: "the scope resolves to more files than the manifest declares",
      declaration: {
        root: ".superman/ci",
        patterns: [".superman/ci/deno-*.ts"],
        members: [],
      },
      expected: /Coverage candidate inventory does not match its manifest: resolved 1 of 0 declared members/u,
    },
  ];
  for (const item of cases) {
    await t.test(item.name, (t) => {
      const repo = coveredBootstrap(t);
      repo.write(".superman/ci/deno-subject.ts", "export function subject() { return 'candidate'; }\n");
      repo.write("tools/deno-subject.ts", "export function subject() { return 'candidate'; }\n");
      const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
      policy.candidate = item.declaration;
      repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, item.expected);
      assert.equal(result.directory, undefined, "An incomplete inventory cannot publish measurements");
    });
  }
});

const denoMembers = [".superman/deno-bootstrap/coverage.ts", ".superman/deno-bootstrap/subject.ts"];

const denoCounts = {
  lines: { covered: 40, total: 100 },
  statements: { covered: 30, total: 100 },
  branches: { covered: 20, total: 100 },
  functions: { covered: 4, total: 10 },
};

function denoFixture(t: TestContext, declaration?: Record<string, unknown>) {
  const repo = fixture(t);
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
  policy.deno = {
    root: ".superman/deno-bootstrap",
    patterns: [".superman/deno-bootstrap/**/*.ts"],
    members: denoMembers,
    collector: ".superman/deno-bootstrap/coverage.ts",
    receipt: ".superman-ci/coverage-deno-*/coverage-receipt.json",
    ...declaration,
  };
  repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
  repo.write(".superman/deno-bootstrap/subject.ts", "export function subject() { return 'deno'; }\n");
  repo.write(".superman/deno-bootstrap/coverage.ts", "export const collector = 'deno collector';\n");
  repo.write(
    ".superman/ci/subject.ts",
    "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n",
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); });\n',
  );
  return repo;
}

// The Deno collector's own receipt, as the Deno collector writes it.
function denoReceipt(
  repo: { root: string },
  sources: string[],
  counts: Record<string, { covered: number; total: number }>,
) {
  const total = Object.fromEntries(
    Object.entries(counts).map(([name, value]) => [
      name,
      { total: value.total, covered: value.covered, skipped: 0, pct: (value.covered * 100) / value.total },
    ]),
  );
  return {
    schema: "superman.coverage/1",
    mergeAuthority: "none",
    requestedMode: "full",
    execution: "full",
    cachedFiles: 0,
    fallbackReason: null,
    evaluatedSha: "0".repeat(40),
    platform: "darwin-arm64",
    minimum: { lines: 90, statements: 90, branches: 90, functions: 90 },
    target: 100,
    inputsHash: "0".repeat(64),
    sources,
    // The collector that wrote the receipt, by file and digest: the gate
    // binds a receipt to the collector revision that produced it.
    collector: {
      file: ".superman/deno-bootstrap/coverage.ts",
      sha256: createHash("sha256")
        .update(readFileSync(join(repo.root, ".superman/deno-bootstrap/coverage.ts")))
        .digest("hex"),
    },
    tools: {
      node: "v26.5.0",
      c8: "12.0.0",
      vitest: "5.0.5",
      coverageV8: "5.0.5",
      conversion: "ast-v8-to-istanbul (locked, Node conversion host)",
    },
    inventories: { deno: { files: sources.length, total } },
    total,
    carriedObligations: [
      {
        inventory: "deno",
        metrics: Object.fromEntries(
          Object.entries(counts).map(([name, value]) => [name, `${value.covered}/${value.total}`]),
        ),
        binds: "the merge-bound cutover, when the Deno root becomes the required evaluator",
      },
    ],
    // The measurement misses the floor, so the verdict is the truth about it.
    verdict: "fail",
  };
}

test("the Deno operational surface is measured by the Deno collector's receipt, not by the Node host", (t) => {
  const repo = denoFixture(t);
  repo.write(
    ".superman-ci/coverage-deno-fixture/coverage-receipt.json",
    JSON.stringify(denoReceipt(repo, denoMembers, denoCounts)),
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  // The Deno surface is bound from the Deno collector's own receipt: the
  // collector's identity, the receipt that carries it, the declared members
  // and the four metrics with their covered/total tuples.
  assert.equal(receipt.denoMeasurement.collector.file, ".superman/deno-bootstrap/coverage.ts");
  assert.match(receipt.denoMeasurement.collector.sha256, /^[a-f0-9]{64}$/u);
  assert.equal(receipt.denoMeasurement.receipt, ".superman-ci/coverage-deno-fixture/coverage-receipt.json");
  assert.match(receipt.denoMeasurement.receiptSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(receipt.denoMeasurement.members, denoMembers);
  assert.deepEqual(receipt.denoMeasurement.metrics, denoCounts);
  // The Deno surface is reported on its own and is never folded into the Node
  // or product inventories.
  assert.equal(receipt.inventories.deno.files, 2);
  assert.equal(receipt.inventories.deno.total.lines.covered, 40);
  assert.equal(receipt.inventories.node.files, 1);
  assert.ok(!receipt.sources.includes(".superman/deno-bootstrap/subject.ts"));
  // Its floor is a carried obligation, not a pass and not a run failure.
  assert.equal(receipt.verdict, "pass");
  const obligation = receipt.carriedObligations.find((entry: { inventory: string }) => entry.inventory === "deno");
  assert.deepEqual(obligation.metrics, {
    lines: "40/100",
    statements: "30/100",
    branches: "20/100",
    functions: "4/10",
  });
  // The Deno floor's binding point is the Deno collector's own recorded one,
  // carried forward verbatim: it is the same string the candidate floor names,
  // so the Node gate and the Deno collector say one thing.
  assert.equal(obligation.binds, MERGE_BOUND_BINDING);
  assert.match(result.output, /Coverage carried obligation \(deno\)/u);
});

test("a declared Deno inventory that is incomplete fails visibly instead of shrinking the aggregate", async (t) => {
  const cases = [
    {
      name: "the declared root is missing",
      declaration: { root: ".superman/deno-bootstrap-absent" },
      expected: /Coverage Deno inventory is missing its declared root/u,
    },
    {
      name: "a declared member matches no scope",
      declaration: { members: ["tools/deno-subject.ts"] },
      expected: /Coverage Deno inventory member matches no declared scope: tools\/deno-subject\.ts/u,
    },
    {
      name: "the scope resolves to fewer files than the manifest declares",
      declaration: { members: [".superman/deno-bootstrap/absent.ts"] },
      expected: /Coverage Deno inventory is missing a declared member: \.superman\/deno-bootstrap\/absent\.ts/u,
    },
    {
      name: "the scope resolves to more files than the manifest declares",
      declaration: { members: [] },
      expected: /Coverage Deno inventory does not match its manifest: resolved 2 of 0 declared members/u,
    },
  ];
  for (const item of cases) {
    await t.test(item.name, (t) => {
      const repo = denoFixture(t, item.declaration);
      repo.write("tools/deno-subject.ts", "export function subject() { return 'deno'; }\n");
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, item.expected);
      assert.equal(result.directory, undefined, "An incomplete inventory cannot publish measurements");
    });
  }
});

test("the Deno surface cannot be measured without the Deno collector's receipt", (t) => {
  const repo = denoFixture(t);
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage Deno measurement receipt is absent/u);
  assert.equal(result.directory, undefined, "An unmeasured Deno surface cannot publish measurements");
});

test("a Deno receipt that does not bind every declared member is refused", (t) => {
  const repo = denoFixture(t);
  repo.write(
    ".superman-ci/coverage-deno-fixture/coverage-receipt.json",
    JSON.stringify(denoReceipt(repo, [denoMembers[0]], denoCounts)),
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Coverage Deno measurement receipt does not bind every declared member: \.superman\/deno-bootstrap\/subject\.ts/u,
  );
  assert.equal(result.directory, undefined, "A partial Deno measurement cannot publish measurements");
});

test("a Deno receipt from a collector revision that no longer exists is refused", (t) => {
  const repo = denoFixture(t);
  const receipt = denoReceipt(repo, denoMembers, denoCounts);
  // The receipt names a collector that is not the collector in the tree, so
  // the measurement cannot be attributed to a collector revision.
  receipt.collector.sha256 = "0".repeat(64);
  repo.write(".superman-ci/coverage-deno-fixture/coverage-receipt.json", JSON.stringify(receipt));
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage Deno measurement receipt does not bind the current collector/u);
  assert.equal(result.directory, undefined, "An unattributable Deno measurement cannot publish measurements");
});

test("the Deno measurement binds the receipt the current collector wrote", (t) => {
  const repo = denoFixture(t);
  // The receipt the collector in the tree wrote, and a stale receipt from
  // another collector revision that was written afterwards. The gate binds
  // the attributed one, not the newest.
  repo.write(
    ".superman-ci/coverage-deno-fixture/coverage-receipt.json",
    JSON.stringify(denoReceipt(repo, denoMembers, denoCounts)),
  );
  const stale = denoReceipt(repo, denoMembers, denoCounts);
  stale.collector.sha256 = "0".repeat(64);
  repo.write(".superman-ci/coverage-deno-stale/coverage-receipt.json", JSON.stringify(stale));
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  assert.equal(receipt.denoMeasurement.receipt, ".superman-ci/coverage-deno-fixture/coverage-receipt.json");
});

test("a Deno receipt that claims a pass while its metrics miss the floor is refused", (t) => {
  const repo = denoFixture(t);
  const receipt = denoReceipt(repo, denoMembers, denoCounts);
  // The measurement misses the floor, so a receipt that claims a pass is a
  // false green.
  receipt.verdict = "pass";
  repo.write(".superman-ci/coverage-deno-fixture/coverage-receipt.json", JSON.stringify(receipt));
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage Deno measurement receipt verdict does not match its metrics: pass/u);
  assert.equal(result.directory, undefined, "A false Deno verdict cannot publish measurements");
});

test("coverage rejects an unmodeled extensionless Node program instead of reporting false 100 percent", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    "bin/helper",
    `#!/usr/bin/env node\n${Array.from({ length: 100 }, (_, i) => `function missed${i}(flag) { return flag ? ${i} : -${i}; }`).join("\n")}\nconsole.log("ok");\n`,
  );
  chmodSync(join(repo.root, "bin/helper"), 0o755);
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and Node subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["bin/helper"], { encoding: "utf8", shell: false }).trim(), "ok"); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage scope does not model.*bin\/helper/u);
  assert.equal(result.directory, undefined, "An incomplete inventory cannot publish passing measurements");
});

test("coverage never drops unmodeled Node programs without shebangs", async (t) => {
  for (const [file, executable, executed] of [
    ["bin/helper", true, true],
    ["bin/helper", false, false],
    ["bin/helper.data", false, true],
  ] as const) {
    await t.test(`${file}, executable=${executable}, executed=${executed}`, (t) => {
      const repo = coveredBootstrap(t);
      repo.write(
        file,
        `${Array.from({ length: 100 }, (_, i) => `function missed${i}(flag) { return flag ? ${i} : -${i}; }`).join("\n")}\nconsole.log("ok");\n`,
      );
      if (executable) chmodSync(join(repo.root, file), 0o755);
      if (executed)
        repo.write(
          ".superman/ci/subject.test.ts",
          `import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and Node subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["--input-type=commonjs", "--eval", ${JSON.stringify(`require("./${file}")`)}], { encoding: "utf8", shell: false }).trim(), "ok"); });\n`,
        );
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Coverage scope does not model repository runtime code/u);
      assert.ok(result.output.includes(file), result.output);
      assert.equal(result.directory, undefined, "Unmodeled runtime cannot publish passing measurements");
    });
  }
});

test("coverage cannot hide observed runtime behind a preserved symlink identity", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    "bin/body.data",
    `${Array.from({ length: 100 }, (_, i) => `function missed${i}(flag) { return flag ? ${i} : -${i}; }`).join("\n")}\nconsole.log("ok");\n`,
  );
  symlinkSync("body.data", join(repo.root, "bin/helper.data"));
  repo.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { execFileSync } from "node:child_process"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides and symlinked Node subprocess", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); assert.equal(execFileSync(process.execPath, ["--preserve-symlinks", "--input-type=commonjs", "--eval", ${JSON.stringify('require("./bin/helper.data")')}], { encoding: "utf8", shell: false }).trim(), "ok"); });\n`,
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage scope does not model repository runtime code: bin\/helper\.data/u);
  assert.equal(result.directory, undefined, "An observed alias cannot publish passing measurements");
});

test("coverage policy cannot add an exclusion for untested runtime code", (t) => {
  for (const change of ["add", "drop"]) {
    const repo = coveredBootstrap(t);
    repo.write(".superman/ci/unloaded.ts", "export function untested() { return 'hidden by policy'; }\n");
    const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
    if (change === "add") policy.exclude.push(".superman/ci/unloaded.ts");
    else policy.exclude = policy.exclude.filter((entry: string) => entry !== "**/*.d.ts");
    repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage exclusions require reviewed test-only modeling/u);
  }
});

test("coverage rejects a test-time source change instead of certifying different bytes", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    ".superman/ci/subject.test.ts",
    'import assert from "node:assert/strict"; import { readFileSync, writeFileSync } from "node:fs"; import { test } from "node:test"; import { sign } from "./subject.ts"; test("both sides then mutate", () => { assert.equal(sign(1), "positive"); assert.equal(sign(0), "other"); const path = ".superman/ci/subject.ts"; writeFileSync(path, readFileSync(path, "utf8").replace("positive", "tampered")); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage inputs changed/u);
  assert.match(readFileSync(join(repo.root, ".superman/ci/subject.ts"), "utf8"), /tampered/u);
});

test("incremental requests fall back to full coverage and nightly always remeasures the whole scope", (t) => {
  for (const mode of ["incremental", "nightly"]) {
    const repo = coveredBootstrap(t);
    const result = repo.run(["--mode", mode]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Coverage execution:.*uncached full/u);
    assert.ok(result.directory);
    const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
    assert.equal(receipt.requestedMode, mode);
    assert.equal(receipt.execution, "full");
    assert.equal(receipt.cachedFiles, 0);
    assert.equal(receipt.target, 100);
    assert.deepEqual(receipt.minimum, { lines: 90, statements: 90, branches: 90, functions: 90 });
    if (mode === "incremental") assert.match(receipt.fallbackReason, /incremental.*not.*activated/u);
  }
});

test("coverage rejects unknown modes and caller-selected thresholds instead of ignoring options", (t) => {
  const repo = coveredBootstrap(t);
  for (const args of [
    ["--mode", "affected"],
    ["--mode"],
    ["--mode", "full", "--mode", "nightly"],
    ["--branches", "0"],
  ]) {
    const result = repo.run(args);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Usage: coverage\.ts/u);
    assert.equal(result.directory, undefined);
  }
});

test("coverage thresholds compare measured counts rather than truncated display percentages", (t) => {
  const repo = fixture(t);
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
  policy.minimum.functions = 90.905;
  repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
  repo.write(
    ".superman/ci/subject.ts",
    Array.from({ length: 11 }, (_, i) => `export function item${i}() { return ${i}; }\n`).join(""),
  );
  repo.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { test } from "node:test"; import * as subject from "./subject.ts";\ntest("ten of eleven", () => { ${Array.from({ length: 10 }, (_, i) => `assert.equal(subject.item${i}(), ${i});`).join(" ")} });\n`,
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const summary = JSON.parse(readFileSync(join(result.directory, "coverage-summary.json"), "utf8")).total;
  assert.equal(summary.functions.covered, 10);
  assert.equal(summary.functions.total, 11);
});

test("Vitest configuration cannot remove uncovered class methods from the overall result", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("vitest.config.ts", "export default { test: { coverage: { ignoreClassMethods: ['missed'] } } };\n");
  repo.write("src/subject.ts", "export class Subject { called() { return 1; } missed() { return 2; } }\n");
  repo.write(
    "test/subject.test.ts",
    'import { expect, test } from "vitest"; import { Subject } from "../src/subject.ts"; test("called", () => expect(new Subject().called()).toBe(1));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage below 90%:.*functions/u);
});

test("effective JSDoc and pinned-c8 alternate ignore syntax cannot inflate coverage", (t) => {
  for (const backend of ["node", "product"]) {
    const repo = coveredBootstrap(t);
    if (backend === "node") {
      repo.write(
        ".superman/ci/subject.ts",
        "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n/* |8 ignore start */\nexport function missed() { return 1; }\n/* |8 ignore stop */\n",
      );
    } else {
      repo.write(
        "src/subject.ts",
        "export function called() { return 1; }\n/** v8 ignore next */\nexport function missed() { return 2; }\n",
      );
      repo.write(
        "test/subject.test.ts",
        'import { expect, test } from "vitest"; import { called } from "../src/subject.ts"; test("called", () => expect(called()).toBe(1));\n',
      );
    }
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage suppression is forbidden/u);
  }
});

test("coverage policy rejects missing metrics, lower floors and a weakened target", (t) => {
  for (const change of [
    { minimum: { lines: 90, statements: 90, branches: 90 } },
    { minimum: { lines: 90, statements: 90, branches: 89, functions: 90 } },
    { minimum: { lines: 90, statements: 90, branches: null, functions: 90 } },
    { target: 99 },
    { version: 2 },
  ]) {
    const repo = coveredBootstrap(t);
    const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
    repo.write(".superman/ci/coverage.json", JSON.stringify({ ...policy, ...change }));
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage policy requires at least 90%/u);
  }
});

test("coverage tool declarations and bootstrap pins must match the installed collectors", (t) => {
  for (const [name, pin, version] of [
    ["c8", "c8", "11.0.0"],
    ["vitest", "vitest", "5.0.4"],
    ["@vitest/coverage-v8", "coverageV8", "5.0.4"],
  ]) {
    for (const file of ["package.json", ".superman/ci/bootstrap.json"]) {
      const repo = coveredBootstrap(t);
      repo.write("src/subject.ts", "export const value = 1;\n");
      repo.write(
        "test/subject.test.ts",
        'import { expect, test } from "vitest"; import { value } from "../src/subject.ts"; test("value", () => expect(value).toBe(1));\n',
      );
      const data = JSON.parse(readFileSync(join(repo.root, file), "utf8"));
      if (file === "package.json") data.devDependencies[name] = version;
      else data.tools[pin] = version;
      repo.write(file, JSON.stringify(data));
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Coverage .*pin mismatch/u);
    }
  }
});

test("fully covered product and bootstrap code combine into one exact-inventory result", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("src/subject.ts", "export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n");
  repo.write(
    "test/subject.test.ts",
    'import { expect, test } from "vitest"; import { sign } from "../src/subject.ts"; test("both sides", () => { expect(sign(1)).toBe("positive"); expect(sign(0)).toBe("other"); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const report = JSON.parse(readFileSync(join(result.directory, "coverage-final.json"), "utf8"));
  assert.deepEqual(Object.keys(report).sort(), [
    join(repo.root, ".superman/ci/subject.ts"),
    join(repo.root, "src/subject.ts"),
  ]);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  assert.equal(receipt.verdict, "pass");
  assert.equal(receipt.mergeAuthority, "none");
  assert.match(receipt.inputsHash, /^[a-f0-9]{64}$/u);
  assert.equal(receipt.tools.coverageV8, "5.0.5");
  for (const name of ["lines", "statements", "branches", "functions"]) assert.equal(receipt.total[name].pct, 100);
});

test("a failed process test cannot produce a passing coverage receipt", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    ".superman/ci/failure.test.ts",
    'import assert from "node:assert/strict"; import { test } from "node:test"; test("failure", () => assert.fail("actual assertion"));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage process tests failed/u);
  assert.equal(result.directory, undefined);
});

test("missing product tests cannot silently exempt existing product source", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("src/subject.ts", "export const value = 1;\n");
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage product source exists without tests/u);
});

test("the floor is overall rather than a per-file requirement", (t) => {
  const repo = fixture(t);
  repo.write(
    ".superman/ci/subject.ts",
    Array.from({ length: 19 }, (_, i) => `export function item${i}() { return ${i}; }\n`).join(""),
  );
  repo.write(".superman/ci/unloaded.ts", "export function missed() { return 1; }\n");
  repo.write(
    ".superman/ci/subject.test.ts",
    `import assert from "node:assert/strict"; import { test } from "node:test"; import * as subject from "./subject.ts"; test("nineteen covered", () => { ${Array.from({ length: 19 }, (_, i) => `assert.equal(subject.item${i}(), ${i});`).join(" ")} });\n`,
  );
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.ok(result.directory);
  const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
  assert.equal(receipt.total.functions.pct, 95);
});

test("source and output aliases are rejected without overwriting their targets", (t) => {
  for (const alias of ["source", "output"]) {
    const repo = coveredBootstrap(t);
    repo.write("sentinel.txt", "preserve these caller bytes\n");
    if (alias === "source") symlinkSync("../../sentinel.txt", join(repo.root, ".superman/ci/alias.ts"));
    else symlinkSync(".superman", join(repo.root, ".superman-ci"), "dir");
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage (?:source must be a regular file|output cannot be an alias)/u);
    assert.equal(readFileSync(join(repo.root, "sentinel.txt"), "utf8"), "preserve these caller bytes\n");
  }
});

test("coverage report publication preserves caller files when a test aliases the output directory", (t) => {
  const repo = coveredBootstrap(t);
  repo.write("coverage-final.json", "caller-owned sentinel\n");
  repo.write(
    ".superman/ci/alias.test.ts",
    'import { readdirSync, symlinkSync } from "node:fs"; import { join } from "node:path"; import { test } from "node:test"; test("alias report directory", () => { const directory = readdirSync(".superman-ci").find(name => name.startsWith("coverage-")); symlinkSync(process.cwd(), join(".superman-ci", directory, "node"), "dir"); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.equal(readFileSync(join(repo.root, "coverage-final.json"), "utf8"), "caller-owned sentinel\n");
  assert.match(result.output, /Coverage output cannot be an alias/u);
});

test("coverage rejects a test-time revision change even when source bytes are identical", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(
    ".superman/ci/revision.test.ts",
    'import { execFileSync } from "node:child_process"; import { test } from "node:test"; test("change revision", () => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "--quiet", "--allow-empty", "-m", "caller revision change"], { shell: false }));\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage inputs changed/u);
});

test("coverage refuses a Node version outside the bootstrap tool identity", (t) => {
  const repo = coveredBootstrap(t);
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
  policy.tools.node = "0";
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage Node pin mismatch/u);
});

test("incremental and nightly modes reject new under-floor results despite an older perfect report", (t) => {
  for (const mode of ["incremental", "nightly"]) {
    const repo = coveredBootstrap(t);
    const previous = repo.run();
    assert.equal(previous.status, 0, previous.output);
    repo.write(".superman/ci/unloaded.ts", "export function missed() { return 1; }\n");
    const result = repo.run(["--mode", mode]);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage below 90%/u);
    assert.ok(result.directory);
    assert.notEqual(result.directory, previous.directory);
    const receipt = JSON.parse(readFileSync(join(result.directory, "coverage-receipt.json"), "utf8"));
    assert.equal(receipt.verdict, "fail");
    assert.equal(receipt.cachedFiles, 0);
    assert.equal(receipt.requestedMode, mode);
  }
});

test("source maps cannot replace inventoried source with a smaller covered program", (t) => {
  const repo = coveredBootstrap(t);
  const map = {
    version: 3,
    file: "subject.ts",
    sources: ["subject.ts"],
    sourcesContent: ["export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\n"],
    names: [],
    mappings: "AAAA",
  };
  repo.write(
    ".superman/ci/subject.ts",
    `export function sign(value: number) { return value > 0 ? 'positive' : 'other'; }\nexport function missed() { return 1; }\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString("base64")}\n`,
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage source maps require reviewed input modeling/u);
});

test("every function and branch in an unexecuted module contributes to overall denominators", (t) => {
  for (const imported of [false, true]) {
    const repo = fixture(t);
    repo.write(
      ".superman/ci/subject.ts",
      Array.from({ length: 19 }, (_, i) => `export function item${i}() { return ${i}; }\n`).join(""),
    );
    repo.write(
      ".superman/ci/unloaded.ts",
      Array.from({ length: 100 }, (_, i) => `export function missed${i}(flag: boolean) { return flag ? 1 : 0; }`).join(
        " ",
      ),
    );
    repo.write(
      ".superman/ci/subject.test.ts",
      `import assert from "node:assert/strict"; import { test } from "node:test"; import * as subject from "./subject.ts"; ${imported ? 'import "./unloaded.ts";' : ""} test("nineteen covered", () => { ${Array.from({ length: 19 }, (_, i) => `assert.equal(subject.item${i}(), ${i});`).join(" ")} });\n`,
    );
    const result = repo.run();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Coverage below 90%/u);
    assert.ok(result.directory);
    const summary = JSON.parse(readFileSync(join(result.directory, "coverage-summary.json"), "utf8")).total;
    assert.equal(summary.functions.total, 119);
    assert.equal(summary.functions.covered, 19);
    assert.equal(summary.branches.total, 200);
    assert.equal(summary.branches.covered, 0);
  }
});

test("Vitest coverage publication cannot overwrite protected policy through a test-created alias", (t) => {
  const repo = coveredBootstrap(t);
  const before = readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8");
  repo.write("src/subject.ts", "export function called() { return 1; }\n");
  repo.write(
    "test/subject.test.ts",
    'import { readdirSync, symlinkSync } from "node:fs"; import { join } from "node:path"; import { expect, test } from "vitest"; import { called } from "../src/subject.ts"; test("covered and aliased", () => { expect(called()).toBe(1); const directory = readdirSync(".superman-ci").find(name => name.startsWith("coverage-")); symlinkSync(join(process.cwd(), ".superman/ci/coverage.json"), join(".superman-ci", directory, "product/coverage-final.json")); });\n',
  );
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.equal(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"), before);
  assert.match(result.output, /Coverage output cannot be an alias/u);
});
