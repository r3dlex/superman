// Approved coverage-command process seam; real collectors, owned tiny repositories.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
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

test("coverage policy cannot add an exclusion for untested runtime code", (t) => {
  const repo = coveredBootstrap(t);
  repo.write(".superman/ci/unloaded.ts", "export function untested() { return 'hidden by policy'; }\n");
  const policy = JSON.parse(readFileSync(join(repo.root, ".superman/ci/coverage.json"), "utf8"));
  policy.exclude.push(".superman/ci/unloaded.ts");
  repo.write(".superman/ci/coverage.json", JSON.stringify(policy));
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Coverage exclusions require reviewed test-only modeling/u);
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
