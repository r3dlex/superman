// Bootstrap rejection/applicability evidence through the approved raw process seam.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { test } from "node:test";
import { fixture, interceptPnpm } from "./raw-fixture.ts";

type Repo = ReturnType<typeof fixture>;

function bootstrap(repo: Repo) {
  return JSON.parse(readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8"));
}

function approve(repo: Repo) {
  repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
}

function regression(repo: Repo) {
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test("behavior", () => expect(value).toBe(1));\n',
  );
}

function integration(repo: Repo) {
  const branch = repo.git("branch", "--show-current").trim();
  repo.write("README.md", "proposed documentation\n");
  const head = repo.commit();
  repo.git("switch", "--quiet", "main");
  repo.write("base.md", "independently advanced base\n");
  const base = repo.commit();
  repo.git("update-ref", "refs/remotes/origin/main", base);
  repo.git("merge", "--quiet", "--no-ff", "-m", "test integration", branch);
  return { branch, head, base, merge: repo.git("rev-parse", "HEAD").trim() };
}

function trivy(repo: Repo, version: string) {
  const binary = join(repo.root, ".tools/trivy");
  const scan = join(repo.root, ".git/trivy-scan.json");
  writeFileSync(
    binary,
    `#!${process.execPath}
import { writeFileSync } from "node:fs";
if (process.argv.includes("--version")) console.log(${JSON.stringify(version)});
else writeFileSync(${JSON.stringify(scan)}, JSON.stringify({
  argv: process.argv.slice(2),
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("TRIVY_"))),
}));
`,
    { mode: 0o755 },
  );
  return { binary, scan };
}

test("direct gates reject an invalid reviewed bootstrap schema before probing tools", async (t) => {
  for (const invalid of [{ version: 2 }, { tools: null }, { test: { files: [] } }]) {
    await t.test(JSON.stringify(invalid), (t) => {
      const repo = fixture(t, "spec/bootstrap");
      repo.write(".superman/ci/bootstrap.json", JSON.stringify({ ...bootstrap(repo), ...invalid }));
      repo.commit();
      const result = repo.runGate("G7");
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Invalid bootstrap tool\/test policy/u);
      assert.equal(result.receipt.policyPreflight.status, "pass");
      assert.deepEqual(result.receipt.tools, {});
    });
  }
});

test("direct gates refuse Node drift and even an empty TSRS_FAST setting", async (t) => {
  for (const scenario of ["Node mismatch", "empty TSRS_FAST", "enabled TSRS_FAST"]) {
    await t.test(scenario, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      if (scenario === "Node mismatch") {
        const policy = bootstrap(repo);
        policy.tools.node = "999";
        repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
      }
      repo.commit();
      const result = repo.runGate(
        "G7",
        [],
        scenario === "Node mismatch" ? {} : { TSRS_FAST: scenario === "empty TSRS_FAST" ? "" : "1" },
      );
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, scenario === "Node mismatch" ? /Node pin mismatch/u : /TSRS_FAST must be unset/u);
      assert.deepEqual(result.receipt.tools, {});
    });
  }
});

test("direct gates compare pnpm policy with the real executable version", (t) => {
  const repo = fixture(t, "spec/bootstrap");
  const policy = bootstrap(repo);
  policy.tools.pnpm = "0.0.0";
  repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
  repo.commit();
  const result = repo.runGate("G7");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /pnpm pin expected 0\.0\.0, actual 12\.16\.1/u);
  assert.equal(result.receipt.tools.node.status, "pass");
  assert.equal(result.receipt.tools.pnpm, undefined);
});

test("G2 checks executable identity after package pins agree", (t) => {
  const repo = fixture(t, "spec/bootstrap");
  repo.commit();
  interceptPnpm(
    repo.root,
    'if (args[0] === "exec" && args[1] === "tsrs" && args.includes("--version")) result.stdout = "tsrs 0.0.0\\n";',
  );
  const result = repo.runGate("G2");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /tsrs executable version mismatch: tsrs 0\.0\.0/u);
  assert.equal(result.receipt.tools.pnpm.status, "pass");
  assert.equal(result.receipt.tools.tsrs, undefined);
});

test("G2 distinguishes a bootstrap-only tree from product source without tests", async (t) => {
  for (const product of [true, false]) {
    await t.test(product ? "untested product" : "bootstrap only", (t) => {
      const repo = fixture(t, "spec/bootstrap");
      if (!product) {
        rmSync(join(repo.root, "src/value.ts"));
        repo.write("test/support.ts", "export {};\n");
      }
      approve(repo);
      const result = repo.runGate("G2");
      assert.equal(result.status, product ? 1 : 0, result.output);
      assert.equal(result.receipt.tools.tsrs.status, "pass");
      assert.equal(result.receipt.tools.typescript.status, "pass");
      if (product) assert.match(result.output, /product source exists without a test suite/u);
      else assert.match(result.receipt.results[0].tests, /n\/a \(no product source\/tests/u);
    });
  }
});

test("G7 distinguishes selected Claude plugins from unrelated or absent selections", async (t) => {
  for (const plugin of ["pocock@reviewed", "superman@reviewed", "unrelated@catalog", undefined]) {
    await t.test(plugin ?? "no enabledPlugins", (t) => {
      const repo = fixture(t, "spec/bootstrap");
      repo.write(".claude/settings.json", JSON.stringify(plugin ? { enabledPlugins: { [plugin]: true } } : {}));
      repo.commit();
      const active = plugin !== undefined && plugin !== "unrelated@catalog";
      const result = repo.runGate("G7");
      assert.equal(result.status, active ? 1 : 0, result.output);
      assert.equal(result.receipt.results[0].status, active ? "fail" : "n/a");
      assert.match(result.output, active ? /active skill lock\/catalog/u : /G7: n\/a/u);
      assert.equal(result.receipt.behaviorReplay, undefined);
    });
  }
});

test("G11 refuses a tree without the reviewed dependency lock", (t) => {
  const repo = fixture(t, "spec/bootstrap");
  rmSync(join(repo.root, "pnpm-lock.yaml"));
  repo.commit();
  // Native pnpm's version probe provisions a missing lock. This version-only
  // command fake isolates the scanner prerequisite without changing caller inputs.
  const pnpm = join(repo.root, ".tools/pnpm");
  rmSync(pnpm, { force: true });
  writeFileSync(
    pnpm,
    `#!${process.execPath}\nif (process.argv.slice(2).join(" ") !== "--version") throw new Error("Unexpected pnpm execution");\nconsole.log("12.16.1");\n`,
    { mode: 0o755 },
  );
  const result = repo.runGate("G11");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G11: dependency scan requires the reviewed lockfile/u);
  assert.equal(result.receipt.tools.trivy, undefined);
  assert.equal(result.receipt.inputIntegrity.status, "pass");
  assert.equal(existsSync(join(repo.root, "pnpm-lock.yaml")), false);
});

test("G11 rejects ignore files and each supported Trivy config extension", async (t) => {
  for (const file of [".trivyignore", ".trivyignore.yaml", "trivy.yaml", "trivy.yml", "trivy.json", "trivy.toml"]) {
    await t.test(file, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      repo.write(file, "{}\n");
      approve(repo);
      const result = repo.runGate("G11");
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /G11: Trivy ignore\/config files are forbidden/u);
      assert.equal(result.receipt.tools.trivy, undefined);
    });
  }
});

test("G11 refuses wrong or unrecognizable tool versions without scanning", async (t) => {
  for (const version of ["Version: 0.0.0", "unknown Trivy build"]) {
    await t.test(version, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      const tool = trivy(repo, version);
      repo.commit();
      const result = repo.runGate("G11", [], { TRIVY_BIN: tool.binary });
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Trivy pin expected 0\.76\.1, actual (?:0\.0\.0|undefined)/u);
      assert.equal(existsSync(tool.scan), false);
      assert.equal(result.receipt.tools.trivy, undefined);
    });
  }
});

test("G11 routes PATH Trivy with fixed scanner policy and only its cache environment", (t) => {
  const repo = fixture(t, "spec/bootstrap");
  const tool = trivy(repo, "Version: 0.76.1");
  repo.commit();
  const cache = join(repo.root, ".tools/trivy-cache");
  const result = repo.runGate("G11", [], {
    TRIVY_BIN: undefined,
    TRIVY_CACHE_DIR: cache,
    TRIVY_SEVERITY: "LOW",
    TRIVY_SKIP_DIRS: ".",
    TRIVY_EXIT_CODE: "0",
  });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "pass");
  assert.equal(result.receipt.tools.trivy.actual, "0.76.1");
  assert.deepEqual(JSON.parse(readFileSync(tool.scan, "utf8")), {
    argv: [
      "fs",
      "--scanners",
      "vuln,secret,misconfig",
      "--severity",
      "HIGH,CRITICAL",
      "--include-dev-deps",
      "--exit-code",
      "1",
      ".",
    ],
    env: { TRIVY_CACHE_DIR: cache },
  });
});

test("raw CI requires pull-request event evidence before applying a gate", async (t) => {
  for (const scenario of ["missing event path", "non-PR event"]) {
    await t.test(scenario, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      repo.commit();
      const result = repo.runGate(
        "G9",
        [],
        scenario === "missing event path"
          ? { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request" }
          : { GITHUB_EVENT_PATH: join(repo.root, ".git/event.json"), GITHUB_EVENT_NAME: "push" },
      );
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /missing CI pull-request identity evidence/u);
      assert.equal(result.receipt.policyPreflight, undefined);
      assert.equal(result.receipt.behaviorReplay, undefined);
    });
  }
});

test("raw CI rejects missing or mismatched H/B/M evidence even for a spec-kind gate", async (t) => {
  const repo = fixture(t, "spec/bootstrap");
  const tuple = integration(repo);
  const event = join(repo.root, ".git/event.json");
  for (const scenario of ["no PR", "missing head", "wrong base", "wrong branch", "wrong checkout", "wrong merge"]) {
    await t.test(scenario, () => {
      repo.write(
        ".git/event.json",
        JSON.stringify({
          pull_request:
            scenario === "no PR"
              ? undefined
              : {
                  head:
                    scenario === "missing head"
                      ? undefined
                      : { sha: tuple.head, ref: scenario === "wrong branch" ? "spec/other" : tuple.branch },
                  base: { sha: scenario === "wrong base" ? repo.baseSha : tuple.base },
                  merge_commit_sha: scenario === "wrong merge" ? tuple.head : tuple.merge,
                },
        }),
      );
      const result = repo.runGate("G9", [], {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: event,
        GITHUB_SHA: scenario === "wrong checkout" ? tuple.head : tuple.merge,
      });
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /CI H\/B\/M identity mismatch/u);
      assert.equal(result.receipt.policyPreflight, undefined);
      assert.equal(result.receipt.testedMergeSha, undefined);
    });
  }
});

test("raw CI verifies both merge-parent count and base/head order", async (t) => {
  for (const scenario of ["single-parent checkout", "reversed parent evidence"]) {
    await t.test(scenario, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      const tuple =
        scenario === "single-parent checkout"
          ? {
              branch: "spec/bootstrap",
              base: repo.baseSha,
              head: repo.commit(),
              merge: repo.git("rev-parse", "HEAD").trim(),
            }
          : integration(repo);
      const base = scenario === "reversed parent evidence" ? tuple.head : tuple.base;
      const head = scenario === "reversed parent evidence" ? tuple.base : tuple.head;
      repo.write(
        ".git/event.json",
        JSON.stringify({
          pull_request: { head: { sha: head, ref: tuple.branch }, base: { sha: base }, merge_commit_sha: tuple.merge },
        }),
      );
      const result = repo.runGate("G9", ["--base", base], {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: join(repo.root, ".git/event.json"),
        GITHUB_SHA: tuple.merge,
      });
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /tested merge is not the recorded base\/head integration/u);
      assert.equal(result.receipt.testedMergeSha, undefined);
    });
  }
});

test("raw bootstrap rejects an unknown gate selector rather than silently omitting it", (t) => {
  const repo = fixture(t, "spec/bootstrap");
  repo.commit();
  const result = repo.runGate("G12");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Unknown raw gate selector/u);
  assert.equal(result.receipt.results[0].gate, "G12");
  assert.equal(result.receipt.policyPreflight, undefined);
});

test("raw byte/mode binding detects hidden aliases, missing inputs and executable changes", async (t) => {
  for (const scenario of [
    "file alias",
    "replaced symlink",
    "retargeted symlink",
    "added executable",
    "removed executable",
    "missing file",
  ]) {
    await t.test(scenario, (t) => {
      const repo = fixture(t, "spec/bootstrap");
      repo.write("src/same.ts", "export const value = 0;\n");
      const symbolic = scenario === "replaced symlink" || scenario === "retargeted symlink";
      const file = symbolic ? "src/alias.ts" : "src/value.ts";
      const path = join(repo.root, file);
      if (symbolic) symlinkSync("value.ts", path);
      if (scenario === "removed executable") chmodSync(path, 0o755);
      const head = repo.commit();
      repo.git("update-index", "--assume-unchanged", file);
      if (scenario === "added executable") chmodSync(path, 0o755);
      else if (scenario === "removed executable") chmodSync(path, 0o644);
      else {
        rmSync(path);
        if (scenario === "replaced symlink") repo.write(file, "export const value = 0;\n");
        else if (scenario !== "missing file") symlinkSync("same.ts", path);
      }
      assert.equal(repo.git("status", "--porcelain"), "", "Git status must miss this hidden input change");
      const snapshot = () => ({
        index: readFileSync(join(repo.root, ".git/index")),
        refs: repo.git("show-ref"),
        mode: existsSync(path) ? lstatSync(path).mode : undefined,
        bytes: !existsSync(path)
          ? undefined
          : lstatSync(path).isSymbolicLink()
            ? readlinkSync(path)
            : readFileSync(path),
      });
      const before = snapshot();
      const result = repo.runGate("G7");
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /dirty inputs/u);
      assert.equal(result.receipt.evaluatedSha, head);
      assert.equal(result.receipt.policyPreflight, undefined);
      assert.deepEqual(snapshot(), before, "Never repair caller inputs or index flags to manufacture a clean result");
    });
  }
});

test("G9 requires one explicit approved-base Kind, never an inferred or duplicated one", async (t) => {
  for (const declaration of ["", "Kind: behavior\nKind: behavior\n"]) {
    await t.test(declaration ? "duplicate Kind" : "missing Kind", (t) => {
      const repo = fixture(t);
      repo.write(".scratch/demo/issues/01-feature.md", `# Reviewed ticket\n\n${declaration}`);
      approve(repo);
      repo.commit();
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.equal(result.receipt.policyPreflight.status, "pass");
      assert.match(result.output, /missing or unknown approved-base Kind/u);
      assert.equal(result.receipt.behaviorReplay, undefined);
    });
  }
});

test("G9 rejects incomplete replay policy and unsafe declared test paths", async (t) => {
  for (const scenario of ["missing required policy", "parent-relative test path"]) {
    await t.test(scenario, (t) => {
      const repo = fixture(t);
      const policy = bootstrap(repo);
      if (scenario === "missing required policy") policy.policyInputs = ["tsconfig.json"];
      else policy.test.files = ["../test/**/*.test.ts"];
      repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
      approve(repo);
      regression(repo);
      repo.commit();
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.equal(result.receipt.policyPreflight.status, "pass");
      assert.match(result.output, /G9: invalid bootstrap configuration/u);
    });
  }
});

test("G9 independently rejects Node, pnpm and missing-symbol compiler pin drift", async (t) => {
  for (const tool of ["node", "pnpm", "tsrs"]) {
    await t.test(tool, (t) => {
      const repo = fixture(t);
      const policy = bootstrap(repo);
      policy.tools[tool] = "0.0.0";
      repo.write(".superman/ci/bootstrap.json", JSON.stringify(policy));
      approve(repo);
      if (tool === "tsrs") {
        repo.write("src/value.ts", "export const value = 0; export function newValue() { return 1; }\n");
        repo.write(
          "test/value.test.ts",
          'import { expect, test } from "vitest"; import { newValue } from "../src/value.ts"; test("new export", () => expect(newValue()).toBe(1));\n',
        );
      } else regression(repo);
      repo.commit();
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /G9: (?:Node pin expected|pnpm pin expected|tsrs pin mismatch)/u);
      assert.equal(result.receipt.tools[tool].status, "fail");
      assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "blocked");
    });
  }
});

test("G9 rejects incomplete or contradictory artifacts after real Vitest execution", async (t) => {
  const scenarios = [
    { name: "stderr", change: 'result.stderr += "unexpected runner warning";', expected: /stderr\/unhandled error/u },
    { name: "stdout", change: 'result.stdout += "unexpected runner output";', expected: /unknown tool output/u },
    {
      name: "missing completion",
      change: "rmSync(process.env.SUPERMAN_REPLAY_COMPLETION);",
      expected: /missing completion evidence/u,
    },
    { name: "missing test file", change: "report.testResults = [];", expected: /incomplete test files/u },
    {
      name: "file error",
      change: 'report.testResults[0].message = "unclassified file error";',
      expected: /setup\/import failure or unknown test file/u,
    },
    {
      name: "invalid identity",
      change: 'report.testResults[0].assertionResults[0].fullName = "different from its title";',
      expected: /unknown report test identity/u,
    },
    {
      name: "file status",
      change: 'report.testResults[0].status = "passed";',
      expected: /inconsistent report file status/u,
    },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, (t) => {
      const repo = fixture(t);
      regression(repo);
      repo.commit();
      interceptPnpm(
        repo.root,
        `if (args.includes('--outputFile')) {
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          ${scenario.change}
          writeFileSync(reportPath, JSON.stringify(report));
        }`,
      );
      const result = repo.run();
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, scenario.expected);
      assert.equal(result.receipt.behaviorReplay.baseOutcome.status, "blocked");
      assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "infrastructure");
      assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "blocked");
    });
  }
});

test("G9 refuses real base/candidate test-name drift even when assertion outcomes look valid", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test(value === 0 ? "old identity" : "new identity", () => expect(value).toBe(1));\n',
  );
  repo.commit();
  const result = repo.run();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /base\/candidate test identities differ/u);
  assert.equal(result.receipt.behaviorReplay.baseOutcome.category, "assertion");
  assert.equal(result.receipt.behaviorReplay.candidateOutcome.status, "pass");
});

test("G11 lockfile and Trivy config rejections do not require a developer pnpm store", (t) => {
  const home = mkdtempSync(join(tmpdir(), "superman-empty-home-"));
  const bin = mkdtempSync(join(tmpdir(), "superman-pnpm-path-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  const probe = spawnSync("pnpm", ["--version"], { encoding: "utf8" });
  const stored = [
    join(homedir(), ".local/share/pnpm/.tools/pnpm/12.16.1/node_modules/@pnpm/exe.darwin-arm64/pnpm"),
    join(homedir(), ".local/share/pnpm/.tools/pnpm/12.16.1/node_modules/pnpm/bin/pnpm.mjs"),
  ].find((path) => existsSync(path));
  const pnpm =
    probe.stdout?.trim() === "12.16.1" ? execFileSync("which", ["pnpm"], { encoding: "utf8" }).trim() : stored;
  if (!pnpm) throw new Error("G11 store-independent fixture requires pnpm 12.16.1 on PATH");
  symlinkSync(pnpm, join(bin, "pnpm"));
  const result = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-reporter=tap",
      "--test-name-pattern",
      "G11 refuses a tree without the reviewed dependency lock|G11 rejects ignore files and each supported Trivy config extension",
      join(import.meta.dirname, "bootstrap-coverage.test.ts"),
    ],
    {
      cwd: join(import.meta.dirname, "../.."),
      env: {
        PATH: `${bin}${delimiter}${dirname(process.execPath)}${delimiter}/usr/bin:/bin`,
        HOME: home,
        TMPDIR: tmpdir(),
        LANG: "en_US.UTF-8",
      },
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /ok \d+ - G11 refuses a tree without the reviewed dependency lock/u);
  assert.match(output, /ok \d+ - G11 rejects ignore files and each supported Trivy config extension/u);
  assert.doesNotMatch(output, /ENOENT/u);
});
