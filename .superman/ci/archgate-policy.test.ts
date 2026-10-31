// Invoke the real pinned rule engine; fixture content is generated, never vendored.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
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
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
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
    write,
    git,
    check(args: string[] = [], selectedAdr: string | null = adr) {
      const command = binary ?? process.execPath;
      const version = spawnSync(command, [...launcher, "--version"], { env, encoding: "utf8" });
      assert.equal(version.status, 0, version.stderr);
      assert.equal(
        version.stdout.trim(),
        "0.61.0",
        "Use a verified 0.61.0 binary via ARCHGATE_BIN; the npm shim may reuse an old shared cache",
      );
      const selection = selectedAdr === null ? [] : ["--adr", selectedAdr];
      const result = spawnSync(command, [...launcher, "check", ...selection, "--strict", "--output", "json", ...args], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 5_000,
      });
      assert.ifError(result.error);
      return { status: result.status, stdout: result.stdout, output: `${result.stdout}${result.stderr}` };
    },
    biomeLint(file: string) {
      const shim = join(source, "node_modules/@biomejs/biome/bin/biome");
      const version = spawnSync(process.execPath, [shim, "--version"], { cwd: root, env, encoding: "utf8" });
      assert.equal(version.status, 0, version.stderr);
      assert.equal(version.stdout.trim(), "Version: 2.6.4");
      const result = spawnSync(
        process.execPath,
        [shim, "lint", "--only=suspicious/noDebugger", "--error-on-warnings", file],
        {
          cwd: root,
          env,
          encoding: "utf8",
          timeout: 5_000,
        },
      );
      assert.ifError(result.error);
      return { status: result.status, output: `${result.stdout}${result.stderr}` };
    },
  };
}

function skill(name: string, lines: number) {
  const header = `---\nname: ${name}\ndescription: Fixture skill.\ndisable-model-invocation: true\n---\n`;
  return header + "Step.\n".repeat(lines - 5);
}

function plantBlockingRule(repo: ReturnType<typeof fixture>, file: string) {
  repo.write(
    ".archgate/adrs/SUP-099-planted.md",
    [
      "---",
      "id: SUP-099",
      "title: Planted blocking rule",
      "domain: superman",
      "rules: true",
      `files: [${JSON.stringify(file)}]`,
      "---",
      "",
    ].join("\n"),
  );
  repo.write(
    ".archgate/adrs/SUP-099-planted.rules.ts",
    [
      '/// <reference path="../rules.d.ts" />',
      'export default { rules: { "always-block": { description: "Planted blocking rule", async check(ctx) {',
      `ctx.report.violation({ message: "Planted finding must remain blocking", file: ${JSON.stringify(file)}, line: 1 });`,
      "} } } } satisfies RuleSet;",
      "",
    ].join("\n"),
  );
}

test("the five reviewed overlay names fit their individual and total budgets", (t) => {
  const repo = fixture(t, "SUP-004", "skill-size", "0007-overlay-context-budget.md");
  for (const [name, lines] of [
    ["ship", 150],
    ["adr-rule", 80],
    ["plan-critic", 60],
    ["wiki-ingest", 100],
    ["wiki-lint", 80],
  ] as const) {
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
    ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
    `sk-${"A".repeat(24)}`,
    `github_pat_${"A".repeat(30)}`,
    `AKIA${"A".repeat(16)}`,
    "https://fixture:credential@example.invalid/",
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
    [
      "ship",
      skill("ship", 6).replace("disable-model-invocation: true", "disable-model-invocation: false"),
      /must set disable-model-invocation: true/u,
    ],
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

test("SUP-005 rejects an Archgate next-line suppression comment", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write("policy.ts", "// archgate-ignore SUP-001/no-runtime-deps fixture reason\nexport const value = 1;\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inline suppression is forbidden.*policy\.ts:1/u);
});

test("SUP-005 rejects a Biome suppression comment", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write("policy.ts", "// biome-ignore lint/suspicious/noDebugger: fixture reason\ndebugger;\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inline suppression is forbidden.*policy\.ts:1/u);
});

test("SUP-005 rejects Biome file, range and block-comment variants across JS and TS", (t) => {
  for (const [file, text] of [
    ["policy.js", "// biome-ignore-all lint: fixture reason\ndebugger;\n"],
    ["policy.mts", "// biome-ignore-start lint: fixture reason\ndebugger;\n// biome-ignore-end lint: fixture reason\n"],
    ["policy.cts", "/**\n * biome-ignore lint(suspicious/noDebugger) format: fixture reason\n */\ndebugger;\n"],
    ["policy.jsx", "export const element = <div>{/* biome-ignore lint: fixture reason */}fixture</div>;\n"],
    [
      "policy.tsx",
      "/* biome-ignore-all assist/source/organizeImports: fixture reason */\nexport const element = <div />;\n",
    ],
    ["policy.mjs", "// BIOME_IGNORE-ALL lint: fixture reason\ndebugger;\n"],
    ["policy.cjs", "/* biome-ignore format: fixture reason */\nmodule.exports = 1;\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, text);
    const result = repo.check();
    assert.equal(result.status, 1, `${file}: ${result.output}`);
    assert.match(result.output, /Inline suppression is forbidden/u);
  }
});

test("SUP-005 rejects a Trivy suppression in YAML", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write("infra.yaml", "#trivy:ignore:AVD-KSV-0014:exp:2099-01-01\napiVersion: v1\nkind: Pod\n");
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inline suppression is forbidden.*infra\.yaml:1/u);
});

test("SUP-005 permits inert YAML quoted and block scalars", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(
    "examples.yaml",
    [
      'quoted: "#trivy:ignore:AVD-KSV-0014"',
      "single: '# archgate-ignore SUP-001/no-runtime-deps example'",
      "literal: |",
      "  #trivy:ignore:AVD-KSV-0014",
      "folded: >-",
      "  #trivy:ignore:AVD-KSV-0014",
      "",
    ].join("\n"),
  );
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("SUP-005 distinguishes YAML comments from multiline quotes and commented scalar headers", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  const examples = [
    'double: "first',
    "  #trivy:ignore:AVD-KSV-0014",
    '  last"',
    "single: 'first",
    "  #trivy:ignore:AVD-KSV-0014",
    "  don''t end'",
    "literal: |2- # ordinary header comment",
    "  #trivy:ignore:AVD-KSV-0014",
    "",
  ].join("\n");
  repo.write("examples.yml", examples);
  const inert = repo.check();
  assert.equal(inert.status, 0, inert.output);
  repo.write("examples.yml", `${examples}kind: "Pod # literal" #trivy:ignore:AVD-KSV-0014\n`);
  const active = repo.check();
  assert.equal(active.status, 1, active.output);
  assert.match(active.output, /Inline suppression is forbidden.*examples\.yml:9/u);
});

test("SUP-005 cannot suppress itself with file or stacked next-line directives", (t) => {
  for (const [file, text] of [
    [
      "policy.ts",
      "// archgate-ignore-file SUP-005/no-inline-suppression fixture reason\n// biome-ignore lint: fixture reason\ndebugger;\n",
    ],
    [
      "policy.ts",
      "// archgate-ignore SUP-005/no-inline-suppression fixture reason\n// archgate-ignore SUP-005/no-inline-suppression another reason\n// biome-ignore lint: fixture reason\ndebugger;\n",
    ],
    ["infra.yml", "# archgate-ignore-file SUP-005/no-inline-suppression fixture reason\nkind: Pod\n"],
    ["README.md", "<!-- archgate-ignore-file SUP-005/no-inline-suppression fixture reason -->\n# Example\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, text);
    const result = repo.check();
    assert.equal(result.status, 1, `${file}: ${result.output}`);
    assert.match(result.output, /Inline suppression is forbidden/u);
    assert.equal(JSON.parse(result.output).suppressed, 0, result.output);
  }
});

test("SUP-005 permits generated negative fixture strings and documented examples", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(
    ".superman/ci/generated.test.ts",
    [
      'const quoted = "// biome-ignore lint: example";',
      "const single = '#trivy:ignore:AVD-KSV-0014';",
      "const generated = `",
      "example: // archgate-ignore-file SUP-005/no-inline-suppression example",
      "// biome-ignore-all lint: example",
      "#trivy:ignore:AVD-KSV-0014",
      "`;",
      "// Documentation mentions biome-ignore and trivy:ignore, not directives.",
      "/* archgate-ignore SUP-005/no-inline-suppression unsupported block form */",
      "export const value = 1; // archgate-ignore SUP-001/no-runtime-deps unsupported inline form",
      "",
    ].join("\n"),
  );
  repo.write(
    "README.md",
    [
      "The `archgate-ignore`, `biome-ignore` and `trivy:ignore` names are documentation.",
      "```ts",
      "// archgate-ignore SUP-005/no-inline-suppression example",
      "// biome-ignore lint: example",
      "```",
      "~~~md",
      "<!-- archgate-ignore-file SUP-005/no-inline-suppression example -->",
      "~~~",
      "",
    ].join("\n"),
  );
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("SUP-005 checks JSON comments without treating string values as directives", (t) => {
  for (const [file, directive] of [
    ["config.jsonc", "// biome-ignore-all lint: fixture reason"],
    ["config.json", "/**\n * biome-ignore lint/suspicious/noDuplicateObjectKeys: fixture reason\n */"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, `${directive}\n{"value":1}\n`);
    const active = repo.check();
    assert.equal(active.status, 1, active.output);
    assert.match(active.output, /Inline suppression is forbidden/u);
    repo.write(file, JSON.stringify({ value: directive, escaped: '\\" // biome-ignore lint: inert' }));
    const inert = repo.check();
    assert.equal(inert.status, 0, inert.output);
  }
});

test("SUP-005 finds effective comments inside template expressions", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(
    "policy.ts",
    [
      "export const value = `outer ${(() => {",
      "  // biome-ignore lint/suspicious/noDebugger: fixture reason",
      "  debugger;",
      "  return 1;",
      "})()}`;",
      "",
    ].join("\n"),
  );
  const result = repo.check();
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Inline suppression is forbidden.*policy\.ts:2/u);
});

test("SUP-005 distinguishes regex literals from comments and division", (t) => {
  for (const expression of [
    "const tick = /`/;",
    "const stars = /[/*]/;",
    'if (true) /`/.test("`");',
    "const quotient = 6 / 2;",
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write("policy.ts", `${expression}\n// biome-ignore lint: fixture reason\ndebugger;\n`);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Inline suppression is forbidden.*policy\.ts:2/u);
    repo.write("policy.ts", "const example = /[/* biome-ignore lint: inert */]/;\n");
    const inert = repo.check();
    assert.equal(inert.status, 0, inert.output);
  }
});

test("SUP-005 does not mistake division containing a real comment for an identical regex", (t) => {
  for (const value of [
    "value",
    "6",
    "value++",
    "({})",
    "[]",
    "{}",
    "`value`",
    "'value'",
    "function(){}",
    "class{}",
    "class extends Object{}",
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(
      "policy.ts",
      [
        "const example = /[/* biome-ignore lint: fixture reason */]/g;",
        "let value = 6, g = 2;",
        `export const quotient = ${value}/[/* biome-ignore lint: fixture reason */]/g;`,
        "",
      ].join("\n"),
    );
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Inline suppression is forbidden.*policy\.ts:3/u);
  }
});

test("SUP-005 rejects Trivy IaC comments but permits quoted and heredoc examples", (t) => {
  for (const [file, text] of [
    ["main.tf", '#trivy:ignore:AVD-AWS-0086:exp:2099-01-01\nresource "aws_s3_bucket" "fixture" {}\n'],
    ["main.tfvars", 'bucket = "fixture" // trivy:ignore:AVD-AWS-*\n'],
    ["Dockerfile", "# trivy:ignore:AVD-DS-0002\nFROM fixture:1\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, text);
    const active = repo.check();
    assert.equal(active.status, 1, active.output);
    assert.match(active.output, /Inline suppression is forbidden/u);
  }
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(
    "main.tf",
    [
      "locals {",
      '  example = "#trivy:ignore:AVD-AWS-0086"',
      "  documented = <<-EXAMPLE",
      "    #trivy:ignore:AVD-AWS-0086",
      "  EXAMPLE",
      "}",
      "",
    ].join("\n"),
  );
  repo.write("Dockerfile", 'FROM fixture:1\nRUN echo "# trivy:ignore:AVD-DS-0002"\n');
  const inert = repo.check();
  assert.equal(inert.status, 0, inert.output);
});

test("SUP-005 rejects Archgate's line directives outside compiler-owned source files", (t) => {
  for (const [file, text] of [
    ["policy.txt", "# archgate-ignore-file SUP-005/no-inline-suppression fixture reason\n"],
    ["script.sh", "#!/bin/sh\n# archgate-ignore-file SUP-003/no-sh-py fixture reason\n"],
    ["policy.sql", "// archgate-ignore SUP-001/no-runtime-deps fixture reason\nSELECT 1;\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, text);
    const result = repo.check();
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Inline suppression is forbidden/u);
    assert.equal(JSON.parse(result.output).suppressed, 0, result.output);
  }
});

test("SUP-005 permits non-directive mentions and malformed lookalikes", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(
    "examples.ts",
    [
      "// biome-ignore documentation: see the manual, not a suppression category",
      "// biome-ignore-next lint: not a valid directive",
      "// archgate-ignore SUP-005/no-inline-suppression",
      "// archgate-ignore-other SUP-005/no-inline-suppression not a directive",
      "// Mention trivy:ignore without a rule ID.",
      "export const value = 1;",
      "",
    ].join("\n"),
  );
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("SUP-005 recognizes JavaScript line terminators without turning strings into comments", (t) => {
  for (const separator of ["\u2028", "\u2029", "\r", "\r\n"]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(
      "policy.ts",
      ["// ordinary comment", "// biome-ignore lint: fixture reason", "debugger;"].join(separator),
    );
    const active = repo.check();
    assert.equal(active.status, 1, active.output);
    assert.match(active.output, /Inline suppression is forbidden.*policy\.ts:2/u);
    repo.write("policy.ts", `export const example = \`value${separator}// biome-ignore lint: inert\`;`);
    const inert = repo.check();
    assert.equal(inert.status, 0, inert.output);
  }
});

test("SUP-005 includes hidden policy files in base and staged checks", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  repo.write(".superman/ci/policy.ts", "export const value = 1;\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "clean base");
  repo.write(".superman/ci/policy.ts", "// biome-ignore lint: fixture reason\ndebugger;\n");
  repo.git("add", "--all");
  repo.git("commit", "--quiet", "-m", "candidate with directive");
  const base = repo.check(["--base", "HEAD~1"]);
  assert.equal(base.status, 1, base.output);
  assert.match(base.output, /Inline suppression is forbidden.*\.superman\/ci\/policy\.ts:1/u);
  repo.write(".superman/ci/policy.ts", "// biome-ignore-all lint: fixture reason\ndebugger;\n");
  repo.git("add", "--all");
  const staged = repo.check(["--staged"]);
  assert.equal(staged.status, 1, staged.output);
  assert.match(staged.output, /Inline suppression is forbidden.*\.superman\/ci\/policy\.ts:1/u);
});

test("SUP-005 does not rescan long harmless comment whitespace quadratically", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  for (const file of ["policy.ts", "config.jsonc"]) {
    repo.write(
      file,
      `/*${" ".repeat(128 * 1024)}*/\n${file.endsWith(".ts") ? "export const value = 1;" : '{"value":1}'}\n`,
    );
  }
  const result = repo.check();
  assert.equal(result.status, 0, result.output);
});

test("SUP-005 blocks raw template directives that actually suppress a planted Archgate finding", (t) => {
  const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
  plantBlockingRule(repo, "policy.ts");
  repo.write("policy.ts", "const text = `\nordinary example\n`;\n");
  const baseline = repo.check([], "SUP-099");
  assert.equal(baseline.status, 1, baseline.output);
  assert.equal(JSON.parse(baseline.stdout).suppressed, 0, baseline.output);
  assert.match(baseline.output, /Planted finding must remain blocking/u);

  repo.write("policy.ts", "const text = `\n// archgate-ignore-file SUP-099/always-block reason\n`;\n");
  const suppressed = repo.check([], "SUP-099");
  assert.equal(suppressed.status, 0, suppressed.output);
  assert.equal(JSON.parse(suppressed.stdout).suppressed, 1, suppressed.output);
  const enforced = repo.check([], null);
  assert.equal(
    enforced.status,
    1,
    `Planted rule: baseline exit ${baseline.status}; raw template exit ${suppressed.status}, suppressed 1\n${enforced.output}`,
  );
  assert.match(enforced.output, /Inline suppression is forbidden.*policy\.ts:2/u);
});

test("SUP-005 follows Archgate's raw parser through other existing quoted and scalar forms", (t) => {
  const directive = "# archgate-ignore-file SUP-099/always-block reason";
  for (const [file, text] of [
    ["policy.js", 'const text = "\\\n// archgate-ignore-file SUP-099/always-block reason\\\n";\n'],
    ["policy.ts", "/*\n// archgate-ignore-file SUP-099/always-block reason\n*/\nexport const value = 1;\n"],
    ["config.jsonc", "/*\n// archgate-ignore-file SUP-099/always-block reason\n*/\n{}\n"],
    ["quoted.yml", `quoted: "first\n  ${directive}\n  last"\n`],
    ["literal.yaml", `literal: |\n  ${directive}\n`],
    ["folded.yaml", `folded: >-\n  ${directive}\n`],
    ["main.tf", `locals {\n  example = <<-EXAMPLE\n    ${directive}\n  EXAMPLE\n}\n`],
    ["notes.md", "<!-- archgate-ignore-file SUP-099/always-block reason -->\nExample\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    plantBlockingRule(repo, file);
    repo.write(file, text);
    const native = repo.check([], "SUP-099");
    assert.equal(native.status, 0, `${file}: ${native.output}`);
    assert.equal(JSON.parse(native.stdout).suppressed, 1, native.output);
    const enforced = repo.check([], null);
    assert.equal(enforced.status, 1, `${file}: ${enforced.output}`);
    assert.match(enforced.output, /Inline suppression is forbidden/u);
  }
});

test("SUP-005 retains examples that are genuinely inert to Archgate's pinned parser", (t) => {
  const directive = "// archgate-ignore-file SUP-099/always-block reason";
  for (const [file, text] of [
    ["policy.ts", `export const example = ${JSON.stringify(directive)};\n`],
    ["policy.ts", `export const example = \`example: ${directive}\`;\n`],
    ["config.json", JSON.stringify({ example: `first\n${directive}\nlast` })],
    ["quoted.yaml", `quoted: ${JSON.stringify(directive)}\n`],
    ["notes.md", `\`\`\`ts\n${directive}\n\`\`\`\n`],
    ["notes.mdx", "~~~md\n<!-- archgate-ignore-file SUP-099/always-block reason -->\n~~~\n"],
    ["policy.txt", "<!-- archgate-ignore-file SUP-099/always-block reason -->\n"],
    ["policy.ts", "// archgate-ignore-file SUP-099/always-block   \nexport const value = 1;\n"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    plantBlockingRule(repo, file);
    repo.write(file, text);
    const native = repo.check([], "SUP-099");
    assert.equal(native.status, 1, `${file}: ${native.output}`);
    assert.equal(JSON.parse(native.stdout).suppressed, 0, native.output);
    const inert = repo.check();
    assert.equal(inert.status, 0, `${file}: ${inert.output}`);
  }
});

test("SUP-005 inspects real comments after JSX raw text and permits inert JSX text", (t) => {
  for (const file of ["policy.tsx", "policy.jsx"]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    const prefix = "export const view = <div>don't panic</div>;\n";
    repo.write(file, `${prefix}debugger;\n`);
    const baseline = repo.biomeLint(file);
    assert.equal(baseline.status, 1, baseline.output);
    assert.match(baseline.output, /lint\/suspicious\/noDebugger/u);
    repo.write(file, `${prefix}// biome-ignore lint/suspicious/noDebugger: fixture reason\ndebugger;\n`);
    const suppressed = repo.biomeLint(file);
    assert.equal(suppressed.status, 0, suppressed.output);
    const enforced = repo.check();
    assert.equal(
      enforced.status,
      1,
      `Biome baseline exit ${baseline.status}; suppressed exit ${suppressed.status}; ${file}: ${enforced.output}`,
    );
    assert.match(enforced.output, /Inline suppression is forbidden/u);

    for (const text of [
      "don't panic /* biome-ignore lint: example */",
      "/* biome-ignore lint: example */",
      "// biome-ignore lint: example",
    ]) {
      repo.write(file, `export const view = <div>${text}</div>;\n`);
      const native = repo.biomeLint(file);
      assert.equal(native.status, 0, native.output);
      const inert = repo.check();
      assert.equal(inert.status, 0, `${file}: ${inert.output}`);
    }
    repo.write(
      file,
      'export const view = <section title="/* biome-ignore lint: example */"><span>don\'t panic</span>{"// biome-ignore lint: string"}</section>;\n',
    );
    assert.equal(repo.biomeLint(file).status, 0);
    const attributes = repo.check();
    assert.equal(attributes.status, 0, attributes.output);
    const expression = ["export const view = <div>{(() => {", "  debugger;", '  return "ok";', "})()}</div>;", ""].join(
      "\n",
    );
    repo.write(file, expression);
    const expressionBaseline = repo.biomeLint(file);
    assert.equal(expressionBaseline.status, 1, expressionBaseline.output);
    repo.write(
      file,
      expression.replace("  debugger;", "  // biome-ignore lint/suspicious/noDebugger: fixture reason\n  debugger;"),
    );
    const expressionSuppressed = repo.biomeLint(file);
    assert.equal(expressionSuppressed.status, 0, expressionSuppressed.output);
    const container = repo.check();
    assert.equal(container.status, 1, container.output);
    assert.match(container.output, /Inline suppression is forbidden/u);
  }
});

test("SUP-005 preserves anchored YAML quoted scalars but rejects comments after their quotes", (t) => {
  for (const quote of ['"', "'"]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write("anchored.yaml", `quoted: &example ${quote}example #trivy:ignore:AVD-KSV-0014${quote}\n`);
    const inert = repo.check();
    assert.equal(inert.status, 0, inert.output);
    repo.write("anchored.yaml", `quoted: &example ${quote}example # literal${quote} #trivy:ignore:AVD-KSV-0014\n`);
    const active = repo.check();
    assert.equal(active.status, 1, active.output);
    assert.match(active.output, /Inline suppression is forbidden.*anchored\.yaml:1/u);
  }
});

test("SUP-005 fails closed on JSX/type-parameter or angle contexts it cannot inspect", (t) => {
  for (const [file, expression] of [
    ["policy.tsx", "const identity = <T,>(value: T) => value;"],
    ["policy.tsx", "const identity = <T extends object>(value: T) => value;"],
    ["policy.jsx", "const first = 1, second = 2, third = 3; const order = first<second>third;"],
  ]) {
    const repo = fixture(t, "SUP-005", "no-inline-suppression", "0004-no-waivers.md");
    repo.write(file, `${expression}\n// biome-ignore lint/suspicious/noDebugger: fixture reason\ndebugger;\n`);
    const native = repo.biomeLint(file);
    assert.equal(native.status, 0, native.output);
    const unready = repo.check();
    assert.equal(unready.status, 2, unready.output);
    assert.equal(JSON.parse(unready.stdout).ruleErrors, 1, unready.output);
    assert.match(unready.output, /inspection is incomplete/u);
  }
});
