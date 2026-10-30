// Bootstrap process fixtures; no product runtime or third-party test dependency.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";

const policy = join(import.meta.dirname, "pr-policy.ts");
const isolated = fixtureEnvironment();

function fixture(t: TestContext, branch: string, kind = "behavior") {
  const root = mkdtempSync(join(tmpdir(), "superman-pr-policy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync("git", [
    "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args,
  ], { cwd: root, env: isolated, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
    root, write, git,
    check() {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "-m", "candidate");
      const result = spawnSync(process.execPath, [policy], {
        cwd: root, env: { ...isolated, HEAD_REF: branch, BASE_REF: "main" }, encoding: "utf8",
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
  for (const file of ["lefthook.yml", ".lefthook.local.json", ".config/lefthook.toml", ".config/lefthook/policy.yml", ".npmrc", "pnpm-workspace.yaml"]) {
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
  for (const file of [".mcp.json", ".codex/config.toml", "opencode.json", "opencode.jsonc", "pnpm-lock.yaml", ".github/hooks/lefthook.json"]) {
    const repo = fixture(t, "ticket/demo-01");
    repo.write(file, "changed policy\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: ticket PRs may not touch protected paths/u);
  }
});

test("content-only ticket scope cannot be used for code, policy or self-reclassification", (t) => {
  for (const file of ["src/feature.ts", "test/feature.test.ts", "superman.ratchet.json", ".superman/vault/vault.json", ".superman/vault/raw/source.md", "package.json", "superman.lock.json", ".scratch/demo/issues/01-knowledge.md"]) {
    const repo = fixture(t, "ticket/demo-01", "knowledge");
    repo.write(file, file.endsWith("01-knowledge.md") ? "# Fixture\n\n**Status:** resolved\n\n**Kind:** behavior\n" : "changed\n");
    const result = repo.check();
    assert.equal(result.status, 1, `${file}\n${result.output}`);
    assert.match(result.output, /G4: knowledge tickets may only change/u);
  }
});

test("wiki chores cannot change code, raw sources, policy, lock or tracker files", (t) => {
  for (const file of ["src/feature.ts", ".superman/vault/raw/source.md", ".superman/vault/vault.json", "superman.lock.json", "lefthook.yml", ".github/workflows/ci.yml", ".scratch/demo/issues/01-knowledge.md"]) {
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
  const childEnv = { ...isolated, GIT_DIR: join(external.root, ".git"), GIT_WORK_TREE: external.root };
  delete childEnv.NODE_TEST_CONTEXT; // Otherwise Node suppresses recursive test runners.
  const result = spawnSync(process.execPath, ["--test", "--test-name-pattern", "ticket PRs can carry proposed", join(import.meta.dirname, "pr-policy.test.ts")], {
    cwd: import.meta.dirname,
    env: childEnv,
    encoding: "utf8",
  });
  assert.ifError(result.error);
  const after = [external.git("rev-parse", "HEAD"), external.git("status", "--porcelain"), external.git("show-ref")];
  assert.deepEqual(after, before, "Fixture must not mutate the caller repository");
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /ticket PRs can carry proposed candidate memories/u);
});
