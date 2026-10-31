// Bootstrap process fixtures; no product runtime or third-party test dependency.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { type TestContext, test } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";

const policy = join(import.meta.dirname, "pr-policy.ts");
const isolated = fixtureEnvironment();

function fixture(t: TestContext, branch: string, kind = "behavior") {
  const root = mkdtempSync(join(tmpdir(), "superman-pr-policy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const write = (file: string, text: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Policy Fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(".scratch/demo/spec.md", "# Approved fixture spec\n");
  write(".scratch/demo/issues/01-knowledge.md", `# Fixture\n\n**Status:** ready-for-agent\n\n**Kind:** ${kind}\n`);
  write(".superman/vault/vault.json", "{}\n");
  write(".superman/vault/raw/source.md", "Reviewed source\n");
  write("wiki/index.md", "# Index\n");
  write("wiki/log.md", "# Log\n");
  write("package.json", JSON.stringify({ name: "fixture", devDependencies: { lefthook: "2.2.2" } }));
  git("add", "--all");
  git("commit", "--quiet", "-m", "approved base");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("switch", "--quiet", "-c", branch);
  return {
    root,
    write,
    git,
    check(commit = true, extraEnv: NodeJS.ProcessEnv = {}) {
      if (commit) {
        git("add", "--all");
        git("commit", "--quiet", "--allow-empty", "-m", "candidate");
      }
      const result = spawnSync(process.execPath, [policy], {
        cwd: root,
        env: { ...isolated, HEAD_REF: branch, BASE_REF: "main", ...extraEnv },
        encoding: "utf8",
      });
      assert.ifError(result.error);
      return { status: result.status, output: `${result.stdout}${result.stderr}` };
    },
  };
}

test("ticket PRs can carry proposed candidate memories", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".superman/vault/candidates/lesson.md", "---\ntype: note\nstatus: pending\n---\nProposed memory.\n");
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /pr-policy: pass/u);
});

test("wiki maintenance PRs can change wiki, candidates and their log", (t) => {
  const repo = fixture(t, "chore/wiki-refresh");
  repo.write("wiki/lesson.md", "---\ntype: note\n---\nReviewed memory.\n");
  repo.write("wiki/log.md", "# Log\n\n## 2026-10-30\n\nPR #42: reviewed a memory.\n");
  repo.write(".superman/vault/candidates/pending.md", "Pending source review.\n");
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /G9 test-first: n\/a/u);
});

test("ticket PRs cannot change discovered Lefthook or lifecycle policy", (t) => {
  for (const file of [
    "lefthook.yml",
    ".lefthook.local.json",
    ".config/lefthook.toml",
    ".config/lefthook/policy.yml",
    ".npmrc",
    "pnpm-workspace.yaml",
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "policy: changed\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("knowledge write permissions never allow a symlink into policy", (t) => {
  const repo = fixture(t, "chore/wiki-refresh");
  symlinkSync("../.superman/vault/vault.json", join(repo.root, "wiki/redirect.md"));
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Knowledge paths must be regular files/u);
});

test("quoted and newline filenames cannot escape raw-source protection", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".superman/vault/raw/unusual\nsource.md", "Replacement source\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("Gate-1-declared knowledge tickets carry content and Status without code replay", (t) => {
  const repo = fixture(t, "ticket/demo-01", "knowledge");
  repo.write("wiki/lesson.md", "---\ntype: note\n---\nReviewed memory.\n");
  repo.write(".scratch/demo/issues/01-knowledge.md", "# Fixture\n\n**Status:** resolved\n\n**Kind:** knowledge\n");
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /G9 test-first: n\/a \(knowledge-only ticket\)/u);
});

test("spec and skill-maintenance PRs can carry their required wiki log", (t) => {
  for (const branch of ["spec/demo", "chore/skills-refresh"]) {
    const repo = fixture(t, branch);
    repo.write("wiki/log.md", "# Log\n\n## 2026-10-30\n\nPR #42: maintenance reviewed.\n");
    const result = repo.check();
    assert.equal(result.status, 0, `${branch}\n${result.output}`);
  }
});

test("ticket PRs cannot change the Lefthook pin or package lifecycle policy", (t) => {
  for (const pkg of [
    { name: "fixture", devDependencies: { lefthook: "2.2.3" } },
    { name: "fixture", devDependencies: { lefthook: "2.2.2" }, scripts: { postinstall: "lefthook install" } },
    { name: "fixture", devDependencies: { lefthook: "2.2.2" }, pnpm: { onlyBuiltDependencies: ["lefthook"] } },
    { name: "fixture", devDependencies: { lefthook: "2.2.2" }, scripts: { preprepare: "lefthook install" } },
    { name: "fixture", devDependencies: { lefthook: "2.2.2" }, scripts: { postprepare: "lefthook install" } },
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("package.json", JSON.stringify(pkg));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Lefthook pin or lifecycle policy/u);
  }
});

test("ticket PRs cannot add or replace the primary compiler pin", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "package.json",
    JSON.stringify({
      name: "fixture",
      devDependencies: { lefthook: "2.2.2", tsrs: "0.20.0" },
    }),
  );
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Protected package field \/devDependencies\/tsrs/u);
});

test("compiler and quality configs are protected at the root and in nested projects", (t) => {
  for (const file of [
    "tsconfig.json",
    "packages/demo/tsconfig.build.json",
    "vitest.config.ts",
    "packages/demo/stryker.config.json",
    "knip.json",
    ".jscpd.json",
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "{}\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("moving compiler policy to an arbitrary referenced file does not make it ticket-writable", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("tsconfig.json", '{"extends":"./settings/shared.json"}\n');
  repo.write("settings/shared.json", '{"extends":"./strict.json"}\n');
  repo.write("settings/strict.json", '{"compilerOptions":{"strict":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved effective compiler policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/strict.json", '{"compilerOptions":{"strict":false}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("the writable-knowledge exception cannot become a policy input exception", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("biome.json", '{"extends":["./wiki/policy.md"]}\n');
  repo.write("wiki/policy.md", '{"linter":{"enabled":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "referenced policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("wiki/policy.md", '{"linter":{"enabled":false}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("configured JSON pointers protect additions, removals and escaped object keys", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "superman.config.json",
    JSON.stringify({
      paths: {
        protectedFields: [{ file: "settings/values.json", pointers: ["/compiler/options~1strict", "/future"] }],
      },
    }),
  );
  repo.write("settings/values.json", '{"compiler":{"options/strict":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved field policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/values.json", '{"compiler":{},"future":false}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Protected field \/compiler\/options~1strict/u);
  assert.match(result.output, /G4: Protected field \/future/u);
});

test("case-colliding committed knowledge identities are rejected even on a case-insensitive host", (t) => {
  const repo = fixture(t, "chore/wiki-refresh");
  const blob = repo.git("rev-parse", "HEAD:wiki/index.md").trim();
  repo.git("update-index", "--add", "--cacheinfo", `100644,${blob},wiki/INDEX.md`);
  repo.git("commit", "--quiet", "-m", "ambiguous knowledge identity");
  const result = repo.check(false);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Case\/Unicode path collision/u);
});

test("package overrides cannot replace tools while leaving their declared pins unchanged", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "package.json",
    JSON.stringify({
      name: "fixture",
      devDependencies: { lefthook: "2.2.2" },
      overrides: { tsrs: "0.20.0" },
      resolutions: { vitest: "4.0.0" },
    }),
  );
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Protected package field \/overrides/u);
});

test("JSONC extends and executable config imports protect their transitive local inputs", (t) => {
  for (const [file, config] of [
    ["tsconfig.json", '{ // reviewed comment\n "extends":"./settings/shared.json",\n}\n'],
    ["vitest.config.ts", 'import shared from "./settings/shared.json";\nexport default shared;\n'],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, config);
    repo.write("settings/shared.json", '{"strict":true}\n');
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved config input");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/shared.json", '{"strict":false}\n');
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("unknown dynamic or hook-remote policy inputs block rather than yielding optimistic coverage", (t) => {
  for (const [file, config] of [
    ["vitest.config.ts", "const name = process.env.CONFIG;\nexport default await import(name);\n"],
    ["lefthook.yml", "remotes:\n  - git_url: https://example.invalid/policy.git\n"],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, config);
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unmodeled policy fixture");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("src/change.ts", "export const value = 1;\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Cannot establish effective policy/u);
  }
});

test("referenced compiler policy cannot be a symlink", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.write("tsconfig.json", '{"extends":"./settings/shared.json"}\n');
  repo.write("settings/real.json", "{}\n");
  symlinkSync("real.json", join(repo.root, "settings/shared.json"));
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Effective policy inputs must exist as regular files/u);
});

test("policy evaluates event head H rather than accidentally substituting checked-out integration M", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.write("README.md", "# Reviewed candidate\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "head H");
  const head = repo.git("rev-parse", "HEAD").trim();
  repo.write("src/integration-only.ts", "export const integration = true;\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "different integration tree M");
  const result = repo.check(false, { HEAD_SHA: head });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /changed files: 1/u);
});

test("the reviewed bootstrap policy-input inventory protects nonstandard config names", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".superman/ci/bootstrap.json", '{"policyInputs":["settings/compiler.json"]}\n');
  repo.write("settings/compiler.json", '{"strict":true}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved input inventory");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/compiler.json", '{"strict":false}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("JSONC comments after trailing commas do not make valid effective policy unreadable", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("tsconfig.json", '{"extends":"./settings/shared.json", // reviewed policy\n}\n');
  repo.write("settings/shared.json", '{"compilerOptions":{"strict":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved JSONC policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("src/change.ts", "export const value = 1;\n");
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("wiki maintenance cannot weaken policy referenced from a writable knowledge root", (t) => {
  const repo = fixture(t, "chore/wiki-refresh");
  repo.write("biome.json", '{"extends":["./wiki/policy.md"]}\n');
  repo.write("wiki/policy.md", '{"linter":{"enabled":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "misplaced policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("wiki/policy.md", '{"linter":{"enabled":false}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Governing policy cannot live under writable knowledge roots/u);
});

test("multiline and literal dynamic config imports remain part of the protected-input closure", (t) => {
  for (const config of [
    'import {\n  shared\n} from "./settings/shared.ts";\nexport default shared;\n',
    'export default (await import("./settings/shared.ts")).shared;\n',
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("vitest.config.ts", config);
    repo.write("settings/shared.ts", "export const shared = {};\n");
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved imported config");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/shared.ts", "export const shared = { test: { passWithNoTests: true } };\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("protected JSON fields cannot be replaced by a symlink whose target name mimics the JSON", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "superman.config.json",
    JSON.stringify({
      paths: {
        protectedFields: [{ file: "settings/values.json", pointers: ["/strict"] }],
      },
    }),
  );
  repo.write("settings/values.json", '{"strict":true}');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved field");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write('settings/{"strict":true}', '{"strict":false}');
  rmSync(join(repo.root, "settings/values.json"));
  symlinkSync('{"strict":true}', join(repo.root, "settings/values.json"));
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Protected-field files must be regular files/u);
});

test("ticket PRs cannot change effective Git ignore policy used by the quality tools", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".gitignore", "src/**\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("fixture subprocesses do not inherit the workflow's event commit identities", () => {
  const env: NodeJS.ProcessEnv = {
    ...isolated,
    HEAD_SHA: "f".repeat(40),
    BASE_SHA: "e".repeat(40),
    GITHUB_SHA: "d".repeat(40),
    GITHUB_ACTIONS: "true",
  };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-name-pattern", "ticket PRs can carry proposed", join(import.meta.dirname, "pr-policy.test.ts")],
    {
      cwd: import.meta.dirname,
      env,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

test("a spec PR cannot reclassify product src as policy to authorize its own implementation", (t) => {
  const repo = fixture(t, "spec/demo");
  repo.write(".superman/ci/bootstrap.json", '{"policyInputs":["src/cli.ts"]}\n');
  repo.write("src/cli.ts", 'console.log("unauthorized product implementation");\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /spec-kind PRs may not change this path/u);
});

test("package metadata stops being unrelated when an effective config imports it as policy", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  const pkg = { name: "fixture", devDependencies: { lefthook: "2.2.2" }, testPolicy: { passWithNoTests: false } };
  repo.write("package.json", JSON.stringify(pkg));
  repo.write("vitest.config.ts", 'import pkg from "./package.json";\nexport default pkg.testPolicy;\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved package policy import");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  pkg.testPolicy.passWithNoTests = true;
  repo.write("package.json", JSON.stringify(pkg));
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("package-local import aliases are not mistaken for lockfile-frozen external policy", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "package.json",
    JSON.stringify({
      name: "fixture",
      imports: { "#test-policy": "./settings/shared.ts" },
      devDependencies: { lefthook: "2.2.2" },
    }),
  );
  repo.write("vitest.config.ts", 'import shared from "#test-policy";\nexport default shared;\n');
  repo.write("settings/shared.ts", "export default {};\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved local alias");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/shared.ts", "export default { test: { passWithNoTests: true } };\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Cannot establish effective policy.*[Ll]ocal.*alias/u);
});

test("built-in package field protection rejects a JSON-looking symlink manifest", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  const original = JSON.stringify({ name: "fixture", devDependencies: { lefthook: "2.2.2" } });
  repo.write(
    original,
    JSON.stringify({ devDependencies: { lefthook: "2.2.3" }, scripts: { postinstall: "unapproved" } }),
  );
  rmSync(join(repo.root, "package.json"));
  symlinkSync(original, join(repo.root, "package.json"));
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Package policy must be a regular file/u);
});

test("pnpm provisioning hooks and their static local helpers are protected policy", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".pnpmfile.mjs", 'export { hooks } from "./settings/package-policy.mjs";\n');
  repo.write("settings/package-policy.mjs", "export const hooks = { updateConfig: config => config };\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved provisioning hook");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(
    "settings/package-policy.mjs",
    "export const hooks = { updateConfig: config => ({ ...config, color: false }) };\n",
  );
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("a static import immediately after a closing brace is protected policy", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "vitest.config.ts",
    'function setup() {} import shared from "./policy.mts"; export default { ...shared, setup };\n',
  );
  repo.write("policy.mts", "export default { test: { exclude: [] } };\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved brace import");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("policy.mts", 'export default { test: { exclude: ["**/*"] } };\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("multiple static imports on one config line all participate in policy closure", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "vitest.config.ts",
    'import "./settings/noop.ts"; import shared from "./settings/shared.ts"; export default shared;\n',
  );
  repo.write("settings/noop.ts", "export {};\n");
  repo.write("settings/shared.ts", "export default {};\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved same-line imports");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/shared.ts", "export default { test: { passWithNoTests: true } };\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
});

test("knowledge-only tickets cannot hide executable files inside wiki paths", (t) => {
  const repo = fixture(t, "ticket/demo-01", "knowledge");
  repo.write("wiki/runner.ts", "throw new Error('not knowledge');\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: knowledge tickets may only change/u);
});

test("skill maintenance edits canonical overlays and thin manifests", (t) => {
  const repo = fixture(t, "chore/skills-refresh");
  repo.write("skills/wiki-ingest/SKILL.md", "---\nname: wiki-ingest\ndisable-model-invocation: true\n---\n");
  repo.write(".claude-plugin/plugin.json", '{"name":"superman"}\n');
  repo.write(".codex-plugin/plugin.json", '{"name":"superman"}\n');
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("external context configs and hook-tool lock data need Gate 1", (t) => {
  for (const file of [
    ".mcp.json",
    ".codex/config.toml",
    "opencode.json",
    "opencode.jsonc",
    "pnpm-lock.yaml",
    ".github/hooks/lefthook.json",
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "changed policy\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("content-only ticket scope cannot be used for code, policy or self-reclassification", (t) => {
  for (const file of [
    "src/feature.ts",
    "test/feature.test.ts",
    "superman.ratchet.json",
    ".superman/vault/vault.json",
    ".superman/vault/raw/source.md",
    "package.json",
    "superman.lock.json",
    ".scratch/demo/issues/01-knowledge.md",
  ]) {
    const repo = fixture(t, "ticket/demo-01", "knowledge");
    repo.write(
      file,
      file.endsWith("01-knowledge.md") ? "# Fixture\n\n**Status:** resolved\n\n**Kind:** behavior\n" : "changed\n",
    );
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: knowledge tickets may only change/u);
  }
});

test("wiki chores cannot change code, raw sources, policy, lock or tracker files", (t) => {
  for (const file of [
    "src/feature.ts",
    ".superman/vault/raw/source.md",
    ".superman/vault/vault.json",
    "superman.lock.json",
    "lefthook.yml",
    ".github/workflows/ci.yml",
    ".scratch/demo/issues/01-knowledge.md",
  ]) {
    const repo = fixture(t, "chore/wiki-refresh");
    repo.write(file, "changed\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: chore\/wiki-\* PRs may only change/u);
  }
});

test("raw imports and vault policy remain spec-only, while ordinary package metadata stays editable", (t) => {
  const spec = fixture(t, "spec/demo");
  spec.write(".superman/vault/raw/source.md", "Explicitly proposed reviewed import\n");
  spec.write(".superman/vault/vault.json", '{"version":1}\n');
  const imported = spec.check();
  assert.equal(imported.status, 0, imported.output);
  for (const file of [".superman/vault/raw/source.md", ".superman/vault/vault.json"]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "changed\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
  const ticket = fixture(t, "ticket/demo-01");
  ticket.write("package.json", JSON.stringify({ name: "renamed-fixture", devDependencies: { lefthook: "2.2.2" } }));
  const metadata = ticket.check();
  assert.equal(metadata.status, 0, metadata.output);
});

test("skill chores cannot edit copied installations or arbitrary wiki concepts", (t) => {
  for (const file of [".claude/skills/wiki-ingest/SKILL.md", ".agents/skills/wiki-ingest/SKILL.md", "wiki/lesson.md"]) {
    const repo = fixture(t, "chore/skills-refresh");
    repo.write(file, "changed\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /chore\/skills-\* PRs may only change canonical skills/u);
  }
});

test("fixture subprocesses cannot follow inherited Git repository overrides", (t) => {
  const external = fixture(t, "ticket/demo-01");
  external.write("uncommitted.txt", "Caller work must stay uncommitted.\n");
  const before = [external.git("rev-parse", "HEAD"), external.git("status", "--porcelain"), external.git("show-ref")];
  const childEnv: NodeJS.ProcessEnv = {
    ...isolated,
    GIT_DIR: join(external.root, ".git"),
    GIT_WORK_TREE: external.root,
  };
  delete childEnv.NODE_TEST_CONTEXT; // Otherwise Node suppresses recursive test runners.
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-name-pattern", "ticket PRs can carry proposed", join(import.meta.dirname, "pr-policy.test.ts")],
    {
      cwd: import.meta.dirname,
      env: childEnv,
      encoding: "utf8",
    },
  );
  assert.ifError(result.error);
  const after = [external.git("rev-parse", "HEAD"), external.git("status", "--porcelain"), external.git("show-ref")];
  assert.deepEqual(after, before, "Fixture must not mutate the caller repository");
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /ticket PRs can carry proposed candidate memories/u);
});

test("aliased filesystem reads cannot make dynamic policy inputs look like frozen package imports", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "vitest.config.ts",
    'import { readFileSync as load } from "node:fs";\nexport default JSON.parse(load(new URL("./settings/test-policy.json", import.meta.url), "utf8"));\n',
  );
  repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":false}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "unmodeled aliased filesystem config fixture");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":true}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Cannot establish effective policy.*[Ff]ilesystem/u);
});

test("aliased module loaders cannot hide governing inputs from policy discovery", (t) => {
  for (const module of ["node:module", "module"]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(
      "vitest.config.ts",
      `import { createRequire as loader } from "${module}";\nconst load = loader(import.meta.url);\nexport default load("./settings/test-policy.json");\n`,
    );
    repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":false}}\n');
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unmodeled aliased module loader");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/test-policy.json", '{"test":{"passWithNoTests":true}}\n');
    const result = repo.check();
    assert.equal(result.status, 1, `${module}\n${result.output}`);
    assert.match(result.output, /G4: Cannot establish effective policy.*[Mm]odule/u);
  }
});

test("absolute and URL policy imports are not mistaken for lockfile-frozen packages", (t) => {
  for (const url of [false, true]) {
    const repo = fixture(t, "ticket/demo-01");
    const input = `${url ? "file://" : ""}${join(repo.root, "settings/shared.ts")}`;
    repo.write("vitest.config.ts", `import shared from ${JSON.stringify(input)};\nexport default shared;\n`);
    repo.write("settings/shared.ts", "export default {};\n");
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unmodeled absolute policy import");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/shared.ts", "export default { test: { passWithNoTests: true } };\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${input}\n${result.output}`);
    assert.match(result.output, /G4: Cannot establish effective policy/u);
  }
});

test("unsupported regex and template policy cannot mask local-import comments", (t) => {
  for (const config of [
    'const example = /"/g;\n/* policy */ import shared from "./settings/shared.ts";\nexport default shared;\n',
    'const example = /"/g; /* policy */ import shared from "./settings/shared.ts"; export default shared;\n',
    "const before = `'`;\nimport shared from /* policy */ \"./settings/shared.ts\";\nconst after = `'`;\nexport default shared;\n",
    "const before = `'`; import shared from /* policy */ \"./settings/shared.ts\"; const after = `'`; export default shared;\n",
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("vitest.config.ts", config);
    repo.write("settings/shared.ts", "export default {};\n");
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unmodeled lexical policy context");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/shared.ts", "export default { test: { passWithNoTests: true } };\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${config}\n${result.output}`);
    assert.match(result.output, /G4: Cannot establish effective policy/u);
  }
});

test("escaped local module identities are not treated as frozen package imports", (t) => {
  for (const input of ['"\\x2e/settings/shared.ts"', '"\\u002e/settings/shared.ts"']) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("vitest.config.ts", `import shared from ${input};\nexport default shared;\n`);
    repo.write("settings/shared.ts", "export default {};\n");
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unmodeled escaped policy identity");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("settings/shared.ts", "export default { test: { passWithNoTests: true } };\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${input}\n${result.output}`);
    assert.match(result.output, /G4: Cannot establish effective policy/u);
  }
});

test("coverage tool pins and its protected entrypoint require Gate 1", (t) => {
  for (const change of [
    { devDependencies: { lefthook: "2.2.2", c8: "12.0.0" } },
    { devDependencies: { lefthook: "2.2.2", "@vitest/coverage-v8": "5.0.5" } },
    { devDependencies: { lefthook: "2.2.2" }, scripts: { coverage: "node other-checker.ts" } },
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("package.json", JSON.stringify({ name: "fixture", ...change }));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Protected package field/u);
  }
});

test("policy gaps: JSONC project references protect local inputs without corrupting quoted comment markers", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  const config = {
    references: [{ path: "settings/compiler" }, { path: "./settings/compiler.json" }],
    note: 'https://example.invalid/"/* quoted data */',
  };
  repo.write("tsconfig.json", `/* Reviewed compiler policy */\n${JSON.stringify(config)}\n`);
  repo.write("settings/compiler.json", '{"compilerOptions":{"strict":true}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved project references");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/compiler.json", '{"compilerOptions":{"strict":false}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /file=settings\/compiler\.json::G4: ticket PRs may not touch protected paths/u);
  assert.doesNotMatch(result.output, /Cannot establish effective policy/u);
});

test("policy gaps: malformed JSONC policy blocks unrelated ticket changes", (t) => {
  for (const [config, diagnostic] of [
    ["null", "Expected a policy object"],
    ["[]", "Expected a policy object"],
    ['{"extends":[42]}', "Invalid policy extends"],
    ['{"references":[null]}', "Invalid compiler reference"],
    ['{"references":[{"path":42}]}', "Invalid compiler reference"],
    ["{} /* unclosed reviewed policy", "Unterminated policy comment"],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("tsconfig.json", config);
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unreadable approved compiler policy");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("README.md", "# Unrelated ticket documentation\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${config}\n${result.output}`);
    assert.ok(result.output.includes(`G4: Cannot establish effective policy: ${diagnostic}`), result.output);
  }
});

test("policy gaps: escaped and unresolved local config references fail closed", (t) => {
  for (const [reference, diagnostic] of [
    ["../../outside.json", "Policy input escapes the repository"],
    ["./settings/missing.json", "Unresolved local policy input ./settings/missing.json"],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("tsconfig.json", JSON.stringify({ extends: reference }));
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unresolved approved compiler input");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("README.md", "# Unrelated ticket documentation\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(`G4: Cannot establish effective policy: ${diagnostic}`), result.output);
  }
});

test("policy gaps: invalid configured protected paths cannot silently remove protection", (t) => {
  for (const config of ["{", '{"paths":{"protected":"settings/**"}}', '{"paths":{"protected":[42]}}']) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.config.json", config);
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "unreadable approved path policy");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("README.md", "# Unrelated ticket documentation\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Cannot establish configured protected paths/u);
  }
});

test("policy gaps: configured path globs protect nested inputs and literal punctuation", (t) => {
  for (const [pattern, file] of [
    ["packages/*/guard-*.json", "packages/demo/guard-build.json"],
    ["settings/policy(+).json", "settings/policy(+).json"],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.config.json", JSON.stringify({ paths: { protected: [pattern] } }));
    repo.write(file, '{"strict":true}\n');
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved additional path protection");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write(file, '{"strict":false}\n');
    const result = repo.check();
    assert.equal(result.status, 1, `${pattern}\n${result.output}`);
    assert.ok(result.output.includes(`file=${file}::G4: ticket PRs may not touch protected paths`), result.output);
  }
});

test("policy gaps: malformed protected-field declarations block unrelated ticket edits", (t) => {
  for (const protectedFields of [
    {},
    [null],
    [{ file: "../outside.json", pointers: ["/strict"] }],
    [{ file: "/outside.json", pointers: ["/strict"] }],
    [{ file: "settings/values.json", pointers: "/strict" }],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.config.json", JSON.stringify({ paths: { protectedFields } }));
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "invalid approved field declaration");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("README.md", "# Unrelated ticket documentation\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Cannot verify protected fields; invalid declaration or referenced JSON/u);
  }
});

test("policy gaps: invalid JSON pointers never become an unprotected-field fallback", (t) => {
  for (const pointer of ["strict", "/strict~2", 7]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(
      "superman.config.json",
      JSON.stringify({ paths: { protectedFields: [{ file: "settings/values.json", pointers: [pointer] }] } }),
    );
    repo.write("settings/values.json", '{"strict":true}\n');
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "invalid approved JSON pointer");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("README.md", "# Unrelated ticket documentation\n");
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Cannot verify protected fields; invalid declaration or referenced JSON/u);
  }
});

test("policy gaps: the root JSON pointer protects the complete document", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "superman.config.json",
    JSON.stringify({ paths: { protectedFields: [{ file: "settings/values.json", pointers: [""] }] } }),
  );
  repo.write("settings/values.json", '{"strict":true,"nested":{"budget":1}}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved whole-document field protection");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/values.json", '{"strict":true,"nested":{"budget":2}}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /file=settings\/values\.json::G4: Protected field {2}added, removed or changed/u);
});

test("policy gaps: creating or deleting a JSON file cannot evade its protected fields", (t) => {
  for (const create of [true, false]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(
      "superman.config.json",
      JSON.stringify({ paths: { protectedFields: [{ file: "settings/values.json", pointers: ["/strict"] }] } }),
    );
    if (!create) repo.write("settings/values.json", '{"strict":true}\n');
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved field protection before file change");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    if (create) repo.write("settings/values.json", '{"strict":true}\n');
    else rmSync(join(repo.root, "settings/values.json"));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /G4: Protected field \/strict added, removed or changed/u);
    assert.doesNotMatch(result.output, /Cannot verify protected fields/u);
  }
});

test("policy gaps: unrelated JSON values stay editable while an absent protected field remains absent", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "superman.config.json",
    JSON.stringify({ paths: { protectedFields: [{ file: "settings/values.json", pointers: ["/compiler/strict"] }] } }),
  );
  repo.write("settings/values.json", '{"compiler":null,"name":"before"}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved absent optional field");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/values.json", '{"compiler":false,"name":"after"}\n');
  const unrelated = repo.check();
  assert.equal(unrelated.status, 0, unrelated.output);
  repo.write("settings/values.json", '{"compiler":{"strict":true},"name":"after"}\n');
  const added = repo.check();
  assert.equal(added.status, 1, added.output);
  assert.match(added.output, /G4: Protected field \/compiler\/strict added, removed or changed/u);
});

test("policy gaps: invalid referenced JSON blocks field comparison rather than skipping it", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(
    "superman.config.json",
    JSON.stringify({ paths: { protectedFields: [{ file: "settings/values.json", pointers: ["/strict"] }] } }),
  );
  repo.write("settings/values.json", '{"strict":true}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved JSON field policy");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("settings/values.json", "{ invalid JSON\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G4: Cannot verify protected fields; invalid declaration or referenced JSON/u);
});

test("policy gaps: absent or malformed package manifests cannot erase protected pin checks", (t) => {
  const pinned = JSON.stringify({ name: "fixture", devDependencies: { lefthook: "2.2.2" } });
  for (const [before, after, diagnostic] of [
    [null, pinned, "G4: Lefthook pin or lifecycle policy /devDependencies/lefthook"],
    [pinned, null, "G4: Lefthook pin or lifecycle policy /devDependencies/lefthook"],
    ["{", pinned, "G4: Cannot verify Lefthook pin or lifecycle policy in invalid package JSON"],
    [pinned, "{", "G4: Cannot verify Lefthook pin or lifecycle policy in invalid package JSON"],
  ] as const) {
    const repo = fixture(t, "ticket/demo-01");
    if (before === null) rmSync(join(repo.root, "package.json"));
    else repo.write("package.json", before);
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "--allow-empty", "-m", "approved manifest state");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    if (after === null) rmSync(join(repo.root, "package.json"));
    else repo.write("package.json", after);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(diagnostic), result.output);
  }
});

test("policy gaps: creating or deleting the ratchet requires a spec-kind PR", (t) => {
  for (const create of [true, false]) {
    const repo = fixture(t, "ticket/demo-01");
    if (!create) {
      repo.write("superman.ratchet.json", '{"mutationScore":82,"jscpdPct":2}\n');
      repo.git("add", "--all");
      repo.git("commit", "--quiet", "-m", "approved ratchet");
      repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    }
    if (create) repo.write("superman.ratchet.json", '{"mutationScore":82,"jscpdPct":2}\n');
    else rmSync(join(repo.root, "superman.ratchet.json"));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Creating or deleting the ratchet file needs a spec-kind PR/u);
  }
});

test("policy gaps: malformed ratchet JSON on either revision blocks ticket comparisons", (t) => {
  for (const [before, after] of [
    ["{", '{"mutationScore":83}'],
    ['{"mutationScore":82}', "{"],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.ratchet.json", before);
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved ratchet input");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("superman.ratchet.json", after);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Ratchet file is not valid JSON/u);
  }
});

test("policy gaps: ratchet keys cannot be added, removed, made nonnumeric or given a new scope", (t) => {
  for (const [before, after] of [
    [{ mutationScore: 82 }, { mutationScore: 82, jscpdPct: 2 }],
    [{ mutationScore: 82, jscpdPct: 2 }, { mutationScore: 82 }],
    [{ mutationScore: 82 }, { mutationScore: "83" }],
    [
      { mutationScore: 82, scope: "src/**" },
      { mutationScore: 82, scope: "lib/**" },
    ],
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.ratchet.json", JSON.stringify(before));
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved metric identity and scope");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("superman.ratchet.json", JSON.stringify(after));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Ratchet key ".*" added, removed or not numeric: needs a spec-kind PR/u);
  }
});

test("policy gaps: lowering mutation or raising duplication is forbidden ratchet weakening", (t) => {
  for (const [metric, before, after, diagnostic] of [
    ["mutationScore", 82, 81, "ticket PRs may only raise it"],
    ["jscpdPct", 2, 3, "ticket PRs may only lower it"],
  ] as const) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.ratchet.json", JSON.stringify({ [metric]: before }));
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved quality baseline");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("superman.ratchet.json", JSON.stringify({ [metric]: after }));
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(diagnostic), result.output);
  }
});

test("policy gaps: ticket ratchets may tighten or preserve existing values without changing scope", (t) => {
  const before = { mutationScore: 82, jscpdPct: 2, scope: "src/**", futureMetric: 10 };
  for (const after of [before, { ...before, mutationScore: 83, jscpdPct: 1 }]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write("superman.ratchet.json", JSON.stringify(before));
    repo.git("add", "--all");
    repo.git("commit", "--quiet", "-m", "approved quality baseline");
    repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
    repo.write("superman.ratchet.json", `${JSON.stringify(after, null, 2)}\n`);
    const result = repo.check();
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /pr-policy: pass/u);
  }
});

test("policy gaps: changing an unknown numeric ratchet metric still requires Gate 1", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("superman.ratchet.json", '{"futureMetric":90}\n');
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved additional metric");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("superman.ratchet.json", '{"futureMetric":91}\n');
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Unknown ratchet key "futureMetric" changed: needs a spec-kind PR/u);
});

test("policy gaps: event revisions must be full commit SHAs rather than Git revision expressions", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  for (const key of ["HEAD_SHA", "BASE_SHA"]) {
    const result = repo.check(false, { [key]: "HEAD" });
    assert.equal(result.status, 1, `${key}\n${result.output}`);
    assert.match(result.output, /Event revisions must be full commit SHAs/u);
    assert.doesNotMatch(result.output, /pr-policy: pass/u);
  }
});

test("policy gaps: traceability uses the event base SHA rather than a moved remote-tracking ref", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  const approvedBase = repo.git("rev-parse", "origin/main").trim();
  repo.git("switch", "--quiet", "main");
  repo.git("rm", "--", ".scratch/demo/spec.md", ".scratch/demo/issues/01-knowledge.md");
  repo.git("commit", "--quiet", "-m", "later base without the ticket");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.git("switch", "--quiet", "ticket/demo-01");
  repo.write("README.md", "# Candidate based on the recorded event base\n");
  const eventBase = repo.check(true, { BASE_SHA: approvedBase });
  assert.equal(eventBase.status, 0, eventBase.output);
  const movedRef = repo.check(false);
  assert.equal(movedRef.status, 1, movedRef.output);
  assert.match(movedRef.output, /G8: .*spec\.md does not exist on origin\/main/u);
  assert.match(movedRef.output, /G8: expected exactly one .* on origin\/main, found 0/u);
});

test("policy gaps: adding a spec and ticket only on the candidate cannot supply base traceability", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.git("rm", "--", ".scratch/demo/spec.md", ".scratch/demo/issues/01-knowledge.md");
  repo.git("commit", "--quiet", "-m", "base without approved planning artifacts");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(".scratch/demo/spec.md", "# Candidate-only spec\n");
  repo.write(".scratch/demo/issues/01-knowledge.md", "# Candidate-only ticket\n\n**Kind:** behavior\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G8: \.scratch\/demo\/spec\.md does not exist on origin\/main/u);
  assert.match(result.output, /G8: expected exactly one \.scratch\/demo\/issues\/01-\*\.md on origin\/main, found 0/u);
});

test("policy gaps: duplicate approved ticket numbers are ambiguous rather than first-match traceability", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".scratch/demo/issues/01-duplicate.md", "# Another approved ticket\n\n**Kind:** behavior\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "ambiguous approved ticket number");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write("README.md", "# Unrelated ticket documentation\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /G8: expected exactly one \.scratch\/demo\/issues\/01-\*\.md on origin\/main, found 2/u);
});

test("policy gaps: a ticket without Kind defaults to behavior and may edit only its own Status", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write(".scratch/demo/issues/01-knowledge.md", "# Fixture\n\nStatus: ready-for-agent\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "approved ticket with default kind");
  repo.git("update-ref", "refs/remotes/origin/main", "HEAD");
  repo.write(".scratch/demo/issues/01-knowledge.md", "# Fixture\n\nStatus: resolved\n");
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Kind: behavior \(default\)/u);
  assert.match(result.output, /G9 test-first: delegated to raw-gates\.ts/u);
});

test("policy gaps: ticket work cannot rewrite its own body, another ticket or the approved spec", (t) => {
  for (const file of [
    ".scratch/demo/issues/01-knowledge.md",
    ".scratch/demo/issues/02-other.md",
    ".scratch/demo/spec.md",
  ]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "# Candidate rewrites approved planning content\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: ticket PRs may only edit the Status line of their own ticket/u);
  }
});

test("policy gaps: missing or unsupported branch kinds cannot receive a policy pass", (t) => {
  const repo = fixture(t, "feature/demo");
  repo.write("README.md", "# Unclassified candidate\n");
  const unknown = repo.check();
  assert.equal(unknown.status, 1, unknown.output);
  assert.match(unknown.output, /Unknown PR kind for branch "feature\/demo"/u);
  const missing = repo.check(false, { HEAD_REF: undefined });
  assert.equal(missing.status, 1, missing.output);
  assert.match(missing.output, /Unknown PR kind for branch ""/u);
});
