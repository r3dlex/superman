// Bootstrap process seam; these tests depend on all product source (src/**).
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fixture, interceptPnpm } from "./raw-fixture.ts";

test("spec-kind G9 is explicitly inapplicable and records evaluated revisions", (t) => {
  const repo = fixture(t, "spec/demo");
  const candidateSha = repo.commit();
  const result = repo.run();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.verdict, "pass");
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
