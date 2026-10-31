// Exercise direct bootstrap tool routing, not private scheduler helpers.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";

const checkout = resolve(import.meta.dirname, "../..");
const env = fixtureEnvironment();

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "superman-routing-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
  for (const file of [
    "package.json",
    "pnpm-lock.yaml",
    ".gitignore",
    ".npmrc",
    "tsconfig.json",
    "vitest.config.ts",
    "biome.json",
    "knip.json",
    ".jscpd.json",
    "stryker.config.json",
    ".superman/ci/bootstrap.json",
    ".superman/ci/coverage.json",
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(checkout, file), join(root, file));
  }
  write(".scratch/demo/spec.md", "# Approved spec\n");
  write(".scratch/demo/issues/01-feature.md", "# Feature\n\n**Kind:** behavior\n");
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Routing Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", "--all");
  git("commit", "--quiet", "-m", "reviewed tool policy");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("switch", "--quiet", "-c", "ticket/demo-01");
  symlinkSync(join(checkout, "node_modules"), join(root, "node_modules"), "dir");
  return {
    root,
    write,
    git,
    run(gate?: string, extraEnv: NodeJS.ProcessEnv = {}) {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "-m", "candidate");
      const receipt = join(root, ".git/receipt.json");
      const result = spawnSync(
        process.execPath,
        [join(checkout, ".superman/ci/raw-gates.ts"), ...(gate ? ["--gate", gate] : []), "--receipt", receipt],
        {
          cwd: root,
          env: { ...env, HEAD_REF: "ticket/demo-01", ...extraEnv },
          encoding: "utf8",
          shell: false,
          timeout: 30_000,
        },
      );
      assert.ifError(result.error);
      return {
        status: result.status,
        output: `${result.stdout}${result.stderr}`,
        receipt:
          existsSync(receipt) && !lstatSync(receipt).isSymbolicLink()
            ? JSON.parse(readFileSync(receipt, "utf8"))
            : undefined,
      };
    },
  };
}

test("raw G2 executes the pinned real compiler and full Vitest suite", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest";\nimport { value } from "../src/value.ts";\ntest("behavior", () => expect(value).toBe(1));\n',
  );
  const result = repo.run("G2");
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].gate, "G2");
  assert.equal(result.receipt.results[0].status, "pass");
  assert.equal(result.receipt.tools.tsrs.actual, "0.20.1-ts7.1.0-beta");
});

test("raw G10 executes real Biome and blocks unformatted input", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value={  a:1};\n");
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /biome ci failed/u);
  assert.equal(result.receipt.tools.biome.actual, "2.6.4");
});

test("raw G3 executes real knip and rejects unused source", (t) => {
  const repo = fixture(t);
  repo.write("src/unused.ts", "export const unused = 1;\n");
  const result = repo.run("G3");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /knip --no-progress failed/u);
  assert.equal(result.receipt.tools.knip.actual, "6.43.0");
});

test("raw G4 rejects changed tool policy before any package-manager execution", (t) => {
  const repo = fixture(t);
  repo.write(".superman/ci/bootstrap.json", "{}\n");
  const result = repo.run("G4");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /pr-policy\.ts failed/u);
  assert.deepEqual(result.receipt.tools, {});
});

test("raw G1 executes strict pinned Archgate and rejects an effective suppression", (t) => {
  const repo = fixture(t);
  for (const file of [
    ".archgate/config.json",
    ".archgate/adrs/SUP-005-no-inline-suppression.md",
    ".archgate/adrs/SUP-005-no-inline-suppression.rules.ts",
  ]) {
    mkdirSync(dirname(join(repo.root, file)), { recursive: true });
    copyFileSync(join(checkout, file), join(repo.root, file));
  }
  repo.write("docs/adr/0004-no-waivers.md", "# Reviewed policy\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved rule policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(
    "src/value.ts",
    "// biome-ignore lint/suspicious/noExplicitAny: forbidden fixture\nexport const value: any = 1;\n",
  );
  const result = repo.run("G1");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inline suppression is forbidden/u);
  assert.equal(result.receipt.tools.archgate.actual, "0.61.0");
});

test("raw G7 reports unactivated project skills as inapplicable, never verified", (t) => {
  const repo = fixture(t);
  const result = repo.run("G7");
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "n/a");
  assert.match(result.receipt.results[0].reason, /not activated/u);
});

test("raw G11 routes every required scanner and propagates a finding", (t) => {
  const repo = fixture(t);
  const binary = join(repo.root, ".git/trivy-fixture");
  writeFileSync(
    binary,
    `#!${process.execPath}\nimport { writeFileSync } from "node:fs";\nif (process.argv.includes("--version")) console.log("Version: 0.76.1");\nelse { writeFileSync(${JSON.stringify(join(repo.root, ".git/scan-args.json"))}, JSON.stringify(process.argv.slice(2))); console.error("planted security finding"); process.exit(1); }\n`,
    { mode: 0o755 },
  );
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /planted security finding/u);
  assert.equal(result.receipt.tools.trivy.actual, "0.76.1");
  assert.deepEqual(JSON.parse(readFileSync(join(repo.root, ".git/scan-args.json"), "utf8")), [
    "fs",
    "--scanners",
    "vuln,secret,misconfig",
    "--severity",
    "HIGH,CRITICAL",
    "--include-dev-deps",
    "--exit-code",
    "1",
    ".",
  ]);
});

test("the default driver records every raw gate even when independent checks fail", (t) => {
  const repo = fixture(t);
  const result = repo.run(undefined, { TRIVY_BIN: "/missing/required/trivy" });
  assert.equal(result.status, 1, result.output);
  assert.deepEqual(
    result.receipt.results.map((item: { gate: string }) => item.gate),
    Array.from({ length: 11 }, (_, i) => `G${i + 1}`),
  );
  assert.equal(result.receipt.results.find((item: { gate: string }) => item.gate === "G2").status, "pass");
  assert.equal(result.receipt.results.find((item: { gate: string }) => item.gate === "G9").status, "fail");
  assert.equal(result.receipt.verdict, "fail");
});

test("successful tools cannot claim the committed snapshot after mutating checked inputs", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { writeFileSync } from "node:fs";\nimport { expect, test } from "vitest";\nimport { value } from "../src/value.ts";\ntest("behavior", () => { writeFileSync("src/value.ts", "export const value = 9;\\n"); expect(value).toBe(1); });\n',
  );
  const result = repo.run("G2");
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.inputIntegrity.status, "fail");
  assert.match(result.output, /inputs changed/iu);
  assert.equal(
    readFileSync(join(repo.root, "src/value.ts"), "utf8"),
    "export const value = 9;\n",
    "Never revert caller work to manufacture a clean result",
  );
});

test("raw compiler checks bind the reference TypeScript pin as well as tsrs", (t) => {
  const repo = fixture(t);
  const pkg = JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
  pkg.devDependencies.typescript = "7.0.0";
  repo.write("package.json", JSON.stringify(pkg));
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "mismatched reviewed compiler pin fixture");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test("behavior", () => expect(value).toBe(1));\n',
  );
  const result = repo.run("G2");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /typescript pin expected 7\.1\.0-beta, declared 7\.0\.0/u);
});

test("raw G2 propagates a real compiler error rather than accepting a test-only pass", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value: string = 1;\n");
  const result = repo.run("G2");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /TS2322/u);
  assert.equal(result.receipt.verdict, "fail");
});

test("raw G2 propagates a real failing test after a green compile", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, test } from "vitest"; import { value } from "../src/value.ts"; test("behavior", () => expect(value).toBe(2));\n',
  );
  const result = repo.run("G2");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /vitest run .* failed/u);
});

test("raw G7 never treats an active but unverifiable lock as a pass or inapplicable", (t) => {
  const repo = fixture(t);
  repo.write("superman.lock.json", "{}\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "unverifiable active lock fixture");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  const result = repo.run("G7");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G7: active skill lock\/catalog/u);
  assert.equal(result.receipt.results[0].status, "fail");
});

test("raw G7 blocks unsupported OpenCode registrations instead of claiming inactive skills", (t) => {
  for (const file of ["opencode.json", "opencode.jsonc"]) {
    const repo = fixture(t);
    repo.write(file, '{"skills":["./skills"]}\n');
    repo.write("skills/project/SKILL.md", "---\nname: project\n---\nUnverified project skill.\n");
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unverifiable OpenCode activation");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    const result = repo.run("G7");
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G7: active skill lock\/catalog/u);
    assert.equal(result.receipt.results[0].status, "fail");
  }
});

test("receipt publication rejects an alias created by a tool after initial validation", (t) => {
  const repo = fixture(t);
  repo.write("src/value.ts", "export const value = 1;\n");
  repo.write(
    "test/value.test.ts",
    'import { symlinkSync } from "node:fs";\nimport { expect, test } from "vitest";\nimport { value } from "../src/value.ts";\ntest("behavior", () => { symlinkSync("../src/value.ts", ".git/receipt.json"); expect(value).toBe(1); });\n',
  );
  const result = repo.run("G2");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /receipt.*alias|alias.*receipt/iu);
  assert.equal(readFileSync(join(repo.root, "src/value.ts"), "utf8"), "export const value = 1;\n");
});

test("receipt output cannot overwrite a linked worktree's Git marker", (t) => {
  const repo = fixture(t);
  const linked = mkdtempSync(join(tmpdir(), "superman-linked-"));
  t.after(() => rmSync(linked, { recursive: true, force: true }));
  repo.git("worktree", "add", "--quiet", "-b", "spec/linked", linked, "HEAD");
  const marker = readFileSync(join(linked, ".git"), "utf8");
  const result = spawnSync(
    process.execPath,
    [join(checkout, ".superman/ci/raw-gates.ts"), "--gate", "G9", "--receipt", ".git"],
    {
      cwd: linked,
      env: { ...env, HEAD_REF: "spec/linked" },
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  assert.match(`${result.stdout}${result.stderr}`, /receipt.*Git metadata/iu);
  assert.equal(readFileSync(join(linked, ".git"), "utf8"), marker);
  execFileSync("git", ["rev-parse", "--git-dir"], { cwd: linked, env, shell: false });
});

test("a linked worktree can publish inside its resolved receipt namespace", (t) => {
  const repo = fixture(t);
  const linked = mkdtempSync(join(tmpdir(), "superman-linked-safe-"));
  t.after(() => rmSync(linked, { recursive: true, force: true }));
  repo.git("worktree", "add", "--quiet", "-b", "spec/linked-safe", linked, "HEAD");
  const marker = readFileSync(join(linked, ".git"), "utf8");
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
    cwd: linked,
    env,
    encoding: "utf8",
    shell: false,
  }).trim();
  const receipt = join(gitDir, "superman/receipts/verified.json");
  const result = spawnSync(
    process.execPath,
    [join(checkout, ".superman/ci/raw-gates.ts"), "--gate", "G9", "--receipt", receipt],
    {
      cwd: linked,
      env: { ...env, HEAD_REF: "spec/linked-safe" },
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(JSON.parse(readFileSync(receipt, "utf8")).verdict, "pass");
  assert.equal(readFileSync(join(linked, ".git"), "utf8"), marker);
});

test("postflight Git errors invalidate the verdict instead of retaining a tool pass", (t) => {
  const repo = fixture(t);
  const directory = join(repo.root, ".git/test-bin");
  mkdirSync(directory);
  const realGit = execFileSync("which", ["git"], { env, encoding: "utf8", shell: false }).trim();
  const counter = join(repo.root, ".git/postflight-count");
  writeFileSync(
    join(directory, "git"),
    `#!${process.execPath}\nimport { existsSync, readFileSync, writeFileSync } from "node:fs";\nimport { spawnSync } from "node:child_process";\nconst args = process.argv.slice(2);\nif (args.includes("HEAD^{commit}") && args.includes("--verify")) { const count = existsSync(${JSON.stringify(counter)}) ? Number(readFileSync(${JSON.stringify(counter)}, "utf8")) + 1 : 1; writeFileSync(${JSON.stringify(counter)}, String(count)); if (count === 2) { console.error("planted postflight Git failure"); process.exit(1); } }\nconst result = spawnSync(${JSON.stringify(realGit)}, args, { env: process.env, stdio: "inherit", shell: false }); process.exit(result.status ?? 1);\n`,
    { mode: 0o755 },
  );
  const result = repo.run("G4", { PATH: `${directory}:${env.PATH}` });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /planted postflight Git failure/u);
  assert.equal(result.receipt.verdict, "fail");
});

test("selected G9 cannot accept a policy-helper change as product regression evidence", (t) => {
  const repo = fixture(t);
  repo.write("settings/test-policy.ts", "export const flag = false;\n");
  repo.write(
    "vitest.config.ts",
    'import { flag } from "./settings/test-policy.ts";\nexport default { test: { include: ["test/**/*.test.ts"], provide: { flag } } };\n',
  );
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "reviewed transitive test policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/test-policy.ts", "export const flag = true;\n");
  repo.write(
    "test/value.test.ts",
    'import { expect, inject, test } from "vitest";\ntest("configuration is not implementation", () => expect(inject("flag" as never)).toBe(true));\n',
  );
  const result = repo.run("G9");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  assert.equal(result.receipt.behaviorReplay, undefined, "Do not execute replay with changed governing policy");
});

test("raw G8 reports spec-kind ticket traceability as inapplicable, not passed", (t) => {
  const repo = fixture(t);
  repo.git("switch", "--quiet", "-c", "spec/demo");
  const result = repo.run("G8", { HEAD_REF: "spec/demo" });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.results[0].status, "n/a");
  assert.match(result.receipt.results[0].reason, /no ticket traceability/u);
  assert.equal(result.receipt.policyPreflight.status, "pass");
});

test("selected G9 blocks comment-separated policy imports before replay", (t) => {
  for (const statement of [
    '/* policy */ import { flag } from "./settings/test-policy.ts";',
    'import/* policy */ { flag } from "./settings/test-policy.ts";',
    'import { flag } from /* policy */ "./settings/test-policy.ts";',
  ]) {
    const repo = fixture(t);
    repo.write("settings/test-policy.ts", "export const flag = false;\n");
    repo.write(
      "vitest.config.ts",
      `${statement}\nexport default { test: { include: ["test/**/*.test.ts"], provide: { flag } } };\n`,
    );
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "reviewed commented test policy");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/test-policy.ts", "export const flag = true;\n");
    repo.write(
      "test/value.test.ts",
      'import { expect, inject, test } from "vitest";\ntest("policy is not behavior", () => expect(inject("flag" as never)).toBe(true));\n',
    );
    const result = repo.run("G9");
    assert.equal(result.status, 1, `${statement}\n${result.output}`);
    assert.match(result.output, /G4: Cannot establish effective policy/u);
    assert.equal(result.receipt.behaviorReplay, undefined);
  }
});
