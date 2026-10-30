// Invoke the real pinned rule engine; fixture content is generated, never vendored.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test, type TestContext } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";

const source = resolve(import.meta.dirname, "../..");
const binary = process.env.ARCHGATE_BIN;
const launcher = binary ? [] : [join(source, "node_modules/archgate/shims/npm/archgate.cjs")];
const env = { ...fixtureEnvironment(), ARCHGATE_TELEMETRY: "0" };

function fixture(t: TestContext, adr: string, slug: string, why: string) {
  const root = mkdtempSync(join(tmpdir(), "superman-archgate-policy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, text: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  const git = (...args: string[]) => execFileSync("git", [
    "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args,
  ], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  write(".archgate/config.json", JSON.stringify({ domains: { superman: "SUP" }, strict: true }));
  write(".archgate/adrs/.keep", "");
  write(`docs/adr/${why}`, "# Fixture rationale\n");
  for (const suffix of ["md", "rules.ts"]) {
    const file = `.archgate/adrs/${adr}-${slug}.${suffix}`;
    copyFileSync(join(source, file), join(root, file));
  }
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Policy Fixture");
  git("config", "user.email", "fixture@example.invalid");
  return {
    write, git,
    check(args: string[] = []) {
      const command = binary ?? process.execPath;
      const version = spawnSync(command, [...launcher, "--version"], { env, encoding: "utf8" });
      assert.equal(version.status, 0, version.stderr);
      assert.equal(version.stdout.trim(), "0.61.0", "Use a verified 0.61.0 binary via ARCHGATE_BIN; the npm shim may reuse an old shared cache");
      const result = spawnSync(command, [...launcher, "check", "--adr", adr, "--strict", "--output", "json", ...args], {
        cwd: root, env, encoding: "utf8", timeout: 5_000,
      });
      assert.ifError(result.error);
      return { status: result.status, output: `${result.stdout}${result.stderr}` };
    },
  };
}

function skill(name: string, lines: number) {
  const header = `---\nname: ${name}\ndescription: Fixture skill.\ndisable-model-invocation: true\n---\n`;
  return header + "Step.\n".repeat(lines - 5);
}

test("the five reviewed overlay names fit their individual and total budgets", (t) => {
  const repo = fixture(t, "SUP-004", "skill-size", "0007-overlay-context-budget.md");
  for (const [name, lines] of [["ship", 150], ["adr-rule", 80], ["plan-critic", 60], ["wiki-ingest", 100], ["wiki-lint", 80]] as const) {
    repo.write(`skills/${name}/SKILL.md`, skill(name, lines));
  }
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("changed-file checks still inventory unchanged overlay budgets", (t) => {
  const repo = fixture(t, "SUP-004", "skill-size", "0007-overlay-context-budget.md");
  repo.write("skills/wiki-ingest/SKILL.md", skill("wiki-ingest", 101));
  repo.write("skills/adr-rule/SKILL.md", skill("adr-rule", 6));
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "base with oversized skill");
  repo.write("skills/adr-rule/SKILL.md", skill("adr-rule", 7));
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "change another skill");
  const result = repo.check(["--base", "HEAD~1"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /wiki-ingest has 101 lines; the budget is 100/u);
});

test("secret-bearing candidate memories fail without echoing the credential", (t) => {
  const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
  const credential = `ghp_${"A".repeat(36)}`;
  repo.write(".superman/vault/candidates/lesson.md", `# Candidate\nCredential: ${credential}\n`);
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Credential material is forbidden/u);
  assert.ok(!result.output.includes(credential), "Diagnostics must not disclose the matched value");
});

test("personal-data patterns are forbidden in wiki, raw sources and vault policy", (t) => {
  for (const file of ["wiki/people.md", ".superman/vault/raw/contact.md", ".superman/vault/vault.json"]) {
    const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
    const address = "person@example.invalid";
    repo.write(file, `Contact ${address}\nphone: +1 202 555 0100\n`);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Personal data is forbidden/u);
    assert.ok(!result.output.includes(address), "Do not echo personal data");
  }
});

test("unprefixed secrets in explicit credential fields are also blocked", (t) => {
  const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
  repo.write("wiki/settings.md", "api_key: plain-sensitive-fixture-value\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Credential material is forbidden/u);
});

test("non-sensitive concepts, sources and protected budget policy pass", (t) => {
  const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
  repo.write("wiki/lesson.md", "---\ntype: note\n---\nSee [[design]] and the reviewed source.\n");
  repo.write(".superman/vault/raw/source.md", "Non-sensitive public design source.\n");
  repo.write(".superman/vault/vault.json", '{"version":1,"budgets":{"conceptBytes":16384}}\n');
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("private-key headers and common token families fail in raw sources", (t) => {
  for (const text of [
    "-----BEGIN " + "PRIVATE KEY-----", `sk-${"A".repeat(24)}`,
    `github_pat_${"A".repeat(30)}`, `AKIA${"A".repeat(16)}`, "https://fixture:credential@example.invalid/",
  ]) {
    const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
    repo.write(".superman/vault/raw/source.md", `${text}\n`);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Credential material is forbidden/u);
    assert.ok(!result.output.includes(text), "Do not echo sensitive source material");
  }
});

test("a sixth overlay, oversized wiki skills or missing invocation flags fail", (t) => {
  for (const [name, content, expected] of [
    ["sixth", skill("sixth", 6), /Unknown overlay skill/u],
    ["wiki-ingest", skill("wiki-ingest", 101), /wiki-ingest has 101 lines/u],
    ["wiki-lint", skill("wiki-lint", 81), /wiki-lint has 81 lines/u],
    ["ship", skill("ship", 6).replace("disable-model-invocation: true", "disable-model-invocation: false"), /must set disable-model-invocation: true/u],
  ] as const) {
    const repo = fixture(t, "SUP-004", "skill-size", "0007-overlay-context-budget.md");
    repo.write(`skills/${name}/SKILL.md`, content);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, expected);
  }
});

test("long permitted raw-source lines do not cause quadratic scans", (t) => {
  for (const text of ["a".repeat(512 * 1024), "a-a-".repeat(64 * 1024)]) {
    const repo = fixture(t, "SUP-009", "no-sensitive-knowledge", "0012-governed-vault-and-okf-wiki.md");
    repo.write(".superman/vault/raw/long-line.md", text);
    const result = repo.check();
    assert.equal(result.status, 0, result.output);
  }
});
