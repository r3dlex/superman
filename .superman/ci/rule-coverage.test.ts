// These are callback-boundary tests, not a replacement for the pinned-engine process fixtures.
import assert from "node:assert/strict";
import { globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";
import { pathToFileURL } from "node:url";

const ruleFiles = {
  "GEN-001": "GEN-001-adr-source.rules.ts",
  "SUP-001": "SUP-001-zero-runtime-deps.rules.ts",
  "SUP-002": "SUP-002-exec-boundary.rules.ts",
  "SUP-003": "SUP-003-no-sh-py.rules.ts",
  "SUP-004": "SUP-004-skill-size.rules.ts",
  "SUP-005": "SUP-005-no-inline-suppression.rules.ts",
  "SUP-006": "SUP-006-tsrs-typecheck.rules.ts",
  "SUP-007": "SUP-007-no-trivy-ignore.rules.ts",
  "SUP-008": "SUP-008-tests-through-superman.rules.ts",
  "SUP-009": "SUP-009-no-sensitive-knowledge.rules.ts",
} as const;
type Adr = keyof typeof ruleFiles;
type Language = "typescript" | "javascript";

interface Finding {
  message: string;
  file?: string;
  line?: number;
  fix?: string;
}

interface LiteralFixture {
  regex?: { pattern?: unknown; flags?: unknown };
}

interface AstFixture {
  language: Language;
  literals: LiteralFixture[];
  error?: string;
}

interface ExternalContext {
  scopedFiles: string[];
  readFile(file: string): Promise<string>;
  readJSON(file: string): Promise<unknown>;
  readYAML(file: string): Promise<{ frontmatter: Record<string, unknown> | null }>;
  glob(pattern: string): Promise<string[]>;
  grep(file: string, pattern: RegExp): Promise<{ file: string; line: number; column: number; content: string }[]>;
  ast(file: string, language: Language): Promise<AstFixture>;
  findAstNodes(tree: AstFixture, type: string): LiteralFixture[];
  report: { violation(finding: Finding): void };
}

interface ExternalRuleSet {
  rules: Record<string, { check(ctx: ExternalContext): Promise<void> }>;
}

interface CheckOptions {
  scopedFiles?: string[];
  frontmatter?: Record<string, Record<string, unknown> | null>;
  ast?: Record<string, AstFixture>;
}

function fixture(t: TestContext, initial: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "superman-rule-callback-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = new Set<string>();
  function write(file: string, text: string) {
    files.add(file);
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  for (const [file, text] of Object.entries(initial)) write(file, text);
  return {
    write,
    async check(adr: Adr, rule: string, options: CheckOptions = {}): Promise<Finding[]> {
      // A computed URL keeps the engine's ambient RuleSet declarations out of the bootstrap typecheck.
      const url = pathToFileURL(resolve(import.meta.dirname, "../../.archgate/adrs", ruleFiles[adr]));
      const loaded: { default: ExternalRuleSet } = await import(url.href);
      const definition = loaded.default.rules[rule];
      assert.ok(definition, `${adr}/${rule} must be an exported rule`);
      const findings: Finding[] = [];
      const ctx: ExternalContext = {
        scopedFiles: options.scopedFiles ?? [...files],
        async readFile(file) {
          return readFileSync(join(root, file), "utf8");
        },
        async readJSON(file) {
          return JSON.parse(await ctx.readFile(file));
        },
        async readYAML(file) {
          assert.ok(options.frontmatter && Object.hasOwn(options.frontmatter, file), `Unplanned YAML read: ${file}`);
          return { frontmatter: options.frontmatter[file] };
        },
        async glob(pattern) {
          return globSync(pattern, { cwd: root }).sort();
        },
        async grep(file, pattern) {
          return (await ctx.readFile(file)).split(/\r?\n/u).flatMap((content, index) => {
            const match = new RegExp(pattern.source, pattern.flags).exec(content);
            return match ? [{ file, line: index + 1, column: match.index + 1, content }] : [];
          });
        },
        // These are controlled external-parser responses for the specific source fixtures below.
        async ast(file, language) {
          const tree = options.ast?.[file];
          assert.ok(tree, `Unplanned AST read: ${file}`);
          assert.equal(language, tree.language, `Parser language for ${file}`);
          if (tree.error) throw new Error(tree.error);
          return tree;
        },
        findAstNodes(tree, type) {
          assert.equal(type, "Literal");
          return tree.literals;
        },
        report: { violation: (finding) => findings.push(finding) },
      };
      await definition.check(ctx);
      return findings;
    },
  };
}

function diagnostics(findings: Finding[]) {
  return findings.map(({ message, file, line }) => ({ message, file, line }));
}

function assertSuppressions(findings: Finding[], file: string, lines: (number | number[])[]) {
  assert.deepEqual(
    findings.map((finding) => finding.message),
    lines.map((line) => {
      const location = Array.isArray(line) ? `one of ${line.map((n) => `${file}:${n}`).join(", ")}` : `${file}:${line}`;
      return `Inline suppression is forbidden at ${location}`;
    }),
  );
  for (const finding of findings) {
    assert.equal(Object.hasOwn(finding, "file"), false, "SUP-005 must not be suppressible by file directives");
    assert.equal(Object.hasOwn(finding, "line"), false);
    assert.match(finding.fix ?? "", /Remove the directive/u);
  }
}

function inlineFixture(t: TestContext) {
  const repo = fixture(t);
  return async (file: string, text: string, ast: AstFixture = { language: "typescript", literals: [] }) => {
    repo.write(file, text);
    return repo.check("SUP-005", "no-inline-suppression", { scopedFiles: [file], ast: { [file]: ast } });
  };
}

test("GEN-001 accepts existing source decisions with and without CRLF frontmatter", async (t) => {
  const target = "docs/adr/0002-two-adr-tiers.md";
  const repo = fixture(t, {
    [target]: "# Decision\n",
    ".archgate/adrs/with-frontmatter.md": `---\r\nid: GEN-001\r\n---\r\n\r\nSource: ${target}\r\n\r\nBody\r\n`,
    ".archgate/adrs/without-frontmatter.md": `\n  Source: ${target}  \nBody\n`,
  });
  assert.deepEqual(
    await repo.check("GEN-001", "source-link", {
      scopedFiles: [".archgate/adrs/with-frontmatter.md", ".archgate/adrs/without-frontmatter.md"],
    }),
    [],
  );
});

test("GEN-001 distinguishes missing or malformed first lines from dangling links", async (t) => {
  const repo = fixture(t, {
    "empty.md": "---\nid: GEN-001\n---\n\n",
    "late.md": "# Context\nSource: docs/adr/0002-two-adr-tiers.md\n",
    "malformed.md": "Source: ../docs/adr/0002-two-adr-tiers.md\n",
    "dangling.md": "Source: docs/adr/9999-missing.md\n",
  });
  const findings = await repo.check("GEN-001", "source-link");
  assert.deepEqual(
    findings.map((finding) => finding.file),
    ["empty.md", "late.md", "malformed.md", "dangling.md"],
  );
  for (const finding of findings.slice(0, 3)) {
    assert.equal(finding.message, "First body line must be `Source: docs/adr/NNNN-slug.md`");
    assert.match(finding.fix ?? "", /right below the frontmatter/u);
  }
  assert.equal(findings[3].message, "Source points to a missing file: docs/adr/9999-missing.md");
  assert.match(findings[3].fix ?? "", /Create the docs\/adr decision first/u);
  assert.deepEqual(await repo.check("GEN-001", "source-link", { scopedFiles: [] }), []);
});

test("file and JSON boundary errors propagate rather than becoming clean rule verdicts", async (t) => {
  const repo = fixture(t, { "package.json": "{broken" });
  await assert.rejects(repo.check("GEN-001", "source-link", { scopedFiles: ["missing.md"] }), { code: "ENOENT" });
  await assert.rejects(repo.check("SUP-001", "no-runtime-deps"), SyntaxError);
});

test("SUP-001 permits absent or empty runtime fields and skips an out-of-scope package", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-001", "no-runtime-deps"), []);
  for (const pkg of [
    { devDependencies: { tsrs: "0.20.1-ts7.1.0-beta" } },
    { dependencies: {}, optionalDependencies: {}, peerDependencies: {} },
  ]) {
    repo.write("package.json", JSON.stringify(pkg));
    assert.deepEqual(await repo.check("SUP-001", "no-runtime-deps"), []);
  }
  repo.write("package.json", "not JSON");
  assert.deepEqual(await repo.check("SUP-001", "no-runtime-deps", { scopedFiles: ["README.md"] }), []);
});

test("SUP-001 reports every runtime dependency and invalid field value", async (t) => {
  const repo = fixture(t, {
    "package.json": JSON.stringify({
      dependencies: { first: "1.0.0", second: "2.0.0" },
      optionalDependencies: null,
      peerDependencies: "latest",
    }),
  });
  const findings = await repo.check("SUP-001", "no-runtime-deps");
  assert.deepEqual(
    findings.map((finding) => finding.message),
    [
      'Runtime dependency "first" in dependencies',
      'Runtime dependency "second" in dependencies',
      'Runtime dependency "<invalid>" in optionalDependencies',
      'Runtime dependency "<invalid>" in peerDependencies',
    ],
  );
  for (const finding of findings) {
    assert.equal(finding.file, "package.json");
    assert.match(finding.fix ?? "", /node: built-in/u);
  }
});

test("SUP-002 catches static, require and dynamic child-process imports except in exec.ts", async (t) => {
  const imports = [
    'import { spawn } from "node:child_process";',
    "export { spawn } from 'child_process';",
    'const child = require("child_process");',
    "const nodeChild = require( 'node:child_process' );",
    'const dynamic = await import("node:child_process");',
    "const bareDynamic = import( 'child_process' );",
  ];
  const repo = fixture(t, {
    "src/exec.ts": `${imports.join("\n")}\n`,
    "src/unsafe.ts": `${imports.join("\n")}\n`,
    "src/safe.ts": 'import { readFile } from "node:fs";\nconst label = "child_process";\n',
  });
  const findings = await repo.check("SUP-002", "child-process-only-in-exec");
  assert.deepEqual(
    findings.map(({ file, line }) => [file, line]),
    imports.map((_, i) => ["src/unsafe.ts", i + 1]),
  );
  for (const finding of findings) {
    assert.equal(finding.message, "child_process imported outside src/exec.ts");
    assert.match(finding.fix ?? "", /spawn helper/u);
  }
});

test("SUP-002 forbids shell true even within the approved exec boundary", async (t) => {
  const repo = fixture(t, {
    "src/exec.ts": "spawn(cmd, args, { shell: true });\nspawn(cmd, args, { shell: false });\n",
    "src/other.ts": "const opts = { shell : true };\nconst safe = { shell: trueish, noshell: true };\n",
  });
  assert.deepEqual(diagnostics(await repo.check("SUP-002", "no-shell-true")), [
    { file: "src/exec.ts", line: 1, message: "shell: true is not allowed" },
    { file: "src/other.ts", line: 1, message: "shell: true is not allowed" },
  ]);
});

test("SUP-003 forbids shell and Python paths but checks only hooks for the exact Node shebang", async (t) => {
  const repo = fixture(t, {
    "tool.sh": "#!/bin/sh\n",
    "tool.py": "print('fixture')\n",
    "src/tool.ts": "export {};\n",
    ".superman/hooks/pre-commit": "#!/usr/bin/env node\r\nconsole.log('fixture');\r\n",
    ".superman/hooks/pre-push": "#!/bin/sh\n",
    ".superman/hooks/empty": "",
    ".superman/hooks/flags": "#!/usr/bin/env node --flag\n",
  });
  const extensions = await repo.check("SUP-003", "no-sh-py-files");
  assert.deepEqual(
    extensions.map((finding) => finding.file),
    ["tool.sh", "tool.py"],
  );
  assert.ok(extensions.every((finding) => finding.message === "Shell and Python files are not allowed"));
  const hooks = await repo.check("SUP-003", "node-hooks");
  assert.deepEqual(
    hooks.map(({ file, line }) => [file, line]),
    [
      [".superman/hooks/pre-push", 1],
      [".superman/hooks/empty", 1],
      [".superman/hooks/flags", 1],
    ],
  );
  assert.ok(hooks.every((finding) => finding.message === "Hook must start with #!/usr/bin/env node"));
});

const budgets = [
  ["ship", 150],
  ["adr-rule", 80],
  ["plan-critic", 60],
  ["wiki-ingest", 100],
  ["wiki-lint", 80],
] as const;
function skillText(lines: number, finalNewline = true) {
  const text = `---\ndisable-model-invocation: true\n---\n${"Step.\n".repeat(lines - 3)}`;
  return finalNewline ? text : text.slice(0, -1);
}

test("SUP-004 accepts all five individual limits at exactly the 470-line combined limit", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-004", "skill-budget"), []);
  const frontmatter: Record<string, Record<string, unknown>> = {};
  for (const [name, lines] of budgets) {
    const file = `skills/${name}/SKILL.md`;
    repo.write(file, skillText(lines, name !== "wiki-lint"));
    frontmatter[file] = { "disable-model-invocation": true };
  }
  assert.deepEqual(await repo.check("SUP-004", "skill-budget", { frontmatter }), []);
});

test("SUP-004 reports individual overages and the independent aggregate overage", async (t) => {
  const repo = fixture(t);
  const frontmatter: Record<string, Record<string, unknown>> = {};
  for (const [name, lines] of budgets) {
    const file = `skills/${name}/SKILL.md`;
    repo.write(file, skillText(lines + 1));
    frontmatter[file] = { "disable-model-invocation": true };
  }
  const findings = await repo.check("SUP-004", "skill-budget", { frontmatter });
  assert.deepEqual(
    findings.map((finding) => finding.message),
    [
      ...budgets.map(([name, lines]) => `${name} has ${lines + 1} lines; the budget is ${lines}`),
      "Overlay skills total 475 lines; the budget is 470",
    ],
  );
  assert.equal(findings.at(-1)?.file, undefined, "Aggregate findings must not blame a single skill");
});

test("SUP-004 rejects unknown names before parsing their frontmatter", async (t) => {
  const repo = fixture(t, { "skills/sixth/SKILL.md": "Unknown overlay\n" });
  const findings = await repo.check("SUP-004", "skill-budget");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "skills/sixth/SKILL.md");
  assert.match(
    findings[0].message,
    /Unknown overlay skill "sixth"; only ship, adr-rule, plan-critic, wiki-ingest, wiki-lint are allowed/u,
  );
  assert.match(findings[0].fix ?? "", /spec PR/u);
});

test("SUP-004 requires a boolean true invocation flag, not a missing, false or string value", async (t) => {
  const repo = fixture(t, { "skills/ship/SKILL.md": "Step." });
  for (const parsed of [null, {}, { "disable-model-invocation": false }, { "disable-model-invocation": "true" }]) {
    const findings = await repo.check("SUP-004", "skill-budget", { frontmatter: { "skills/ship/SKILL.md": parsed } });
    assert.deepEqual(diagnostics(findings), [
      { file: "skills/ship/SKILL.md", line: 1, message: "Overlay skills must set disable-model-invocation: true" },
    ]);
  }
});

test("SUP-005 enforces Archgate raw-line directives independently of source-language quoting", async (t) => {
  const check = inlineFixture(t);
  const directive = "# archgate-ignore-file SUP-099/always-block reason";
  for (const [file, text, line] of [
    ["policy.txt", "\t// archgate-ignore SUP-001/no-runtime-deps fixture reason\n", 1],
    ["policy.sql", `${directive}\nSELECT 1;\n`, 1],
    ["policy.ts", `const value = \`\n// archgate-ignore-file SUP-099/always-block reason\n\`;\n`, 2],
    ["config.jsonc", `/*\n// archgate-ignore-file SUP-099/always-block reason\n*/\n{}\n`, 2],
    ["quoted.yml", `quoted: "first\n  ${directive}\n  last"\n`, 2],
    ["literal.yaml", `literal: |\n  ${directive}\n`, 2],
    ["main.tf", `locals {\n example = <<-EXAMPLE\n  ${directive}\n EXAMPLE\n}\n`, 3],
    ["notes.md", "<!-- archgate-ignore-file SUP-099/always-block reason -->\n", 1],
  ] as const) {
    assertSuppressions(await check(file, text), file, [line]);
  }
});

test("SUP-005 permits genuinely inert Archgate examples, reasonless directives and fenced Markdown", async (t) => {
  const check = inlineFixture(t);
  const directive = "// archgate-ignore-file SUP-099/always-block reason";
  for (const [file, text] of [
    ["policy.ts", `export const text = ${JSON.stringify(directive)};\n`],
    ["policy.ts", `export const text = \`example: ${directive}\`;\n`],
    ["config.json", JSON.stringify({ example: `first\n${directive}\nlast` })],
    ["quoted.yml", `quoted: ${JSON.stringify(directive)}\n`],
    ["notes.md", `\`\`\`ts\n${directive}\n\`\`\`\n`],
    ["notes.mdx", "~~~md\n<!-- archgate-ignore-file SUP-099/always-block reason -->\n~~~\n"],
    ["notes.txt", "<!-- archgate-ignore-file SUP-099/always-block reason -->\n"],
    ["policy.ts", "// archgate-ignore SUP-099/always-block\n// archgate-ignore-file SUP-099/always-block   \n"],
  ])
    assert.deepEqual(await check(file, text), [], `${file}: ${text}`);
  assertSuppressions(await check("notes.md", `\`\`\`ts\n${directive}\n\`\`\`\n${directive}\n`), "notes.md", [4]);
});

test("SUP-005 detects stacked self-suppressions without attaching a suppressible file location", async (t) => {
  const check = inlineFixture(t);
  const text = [
    "// archgate-ignore-file SUP-005/no-inline-suppression fixture reason",
    "// archgate-ignore SUP-005/no-inline-suppression another reason",
    "// biome-ignore lint: fixture reason",
    "debugger;",
  ].join("\n");
  assertSuppressions(await check("policy.ts", text), "policy.ts", [1, 2, 3]);
});

test("SUP-005 recognizes Biome line, file, range, category and block-comment forms", async (t) => {
  const check = inlineFixture(t);
  for (const directive of [
    "biome-ignore lint/suspicious/noDebugger: reason",
    "biome-ignore-all assist/source/organizeImports: reason",
    "biome-ignore-start syntax: reason",
    "biome-ignore-end parse: reason",
    "BIOME_IGNORE-ALL format:reason",
    "biome-ignore lint(suspicious/noDebugger) format: reason",
  ]) {
    assertSuppressions(await check("policy.ts", `// ${directive}\nexport {};\n`), "policy.ts", [1]);
    assertSuppressions(
      await check("config.jsonc", `/**\n * ordinary documentation\n ** ${directive}\n */\n{}\n`),
      "config.jsonc",
      [3],
    );
  }
});

test("SUP-005 permits non-directive mentions and malformed Biome or Trivy lookalikes", async (t) => {
  const check = inlineFixture(t);
  assert.deepEqual(
    await check(
      "policy.ts",
      [
        "// biome-ignore documentation: see the manual",
        "// biome-ignore-next lint: not a supported directive",
        "// biome-ignore lint:",
        "// biome-ignore lint((nested)): not a supported category",
        "// Mention trivy:ignore without a rule ID.",
        "/* archgate-ignore SUP-005/no-inline-suppression unsupported block form */",
        "export const value = 1; // archgate-ignore SUP-001/no-runtime-deps unsupported inline form",
      ].join("\n"),
    ),
    [],
  );
  assert.deepEqual(await check("infra.yml", "#trivy:ignore:\n# nottrivy:ignore:AVD-001\n"), []);
});

test("SUP-005 checks every supported JS and TS extension with the correct external parser language", async (t) => {
  const check = inlineFixture(t);
  for (const [extension, language] of [
    ["ts", "typescript"],
    ["mts", "typescript"],
    ["cts", "typescript"],
    ["tsx", "typescript"],
    ["js", "javascript"],
    ["mjs", "javascript"],
    ["cjs", "javascript"],
    ["jsx", "javascript"],
  ] as const) {
    const file = `policy.${extension}`;
    assertSuppressions(
      await check(file, "// biome-ignore lint: reason\nexport {};\n", { language, literals: [] }),
      file,
      [1],
    );
  }
});

test("SUP-005 leaves quoted JSON and escaped JavaScript strings inert", async (t) => {
  const check = inlineFixture(t);
  for (const file of ["config.json", "config.jsonc"]) {
    assert.deepEqual(
      await check(
        file,
        JSON.stringify({ value: "/* biome-ignore lint: inert */", escaped: '\\" // biome-ignore lint: inert' }),
      ),
      [],
    );
    assertSuppressions(await check(file, '{"value": 1}\n// biome-ignore lint: reason'), file, [2]);
  }
  assert.deepEqual(
    await check(
      "policy.ts",
      [
        String.raw`const double = "\" // biome-ignore lint: inert";`,
        String.raw`const single = '\' /* biome-ignore lint: inert */';`,
        "const example = `\\` // biome-ignore lint: inert`;",
        "/* ordinary comment */",
      ].join("\n"),
    ),
    [],
  );
});

test("SUP-005 follows nested template expressions, braces and nested templates to real comments", async (t) => {
  const check = inlineFixture(t);
  const text = [
    "export const value = `raw // biome-ignore lint: inert ${(() => {",
    "  const nested = `nested ${(() => {",
    "    const object = { child: { value: 1 } };",
    "    // biome-ignore lint/suspicious/noDebugger: reason",
    "    debugger; return object;",
    "  })()}`;",
    "  return nested;",
    "})()}`;",
  ].join("\n");
  assertSuppressions(await check("policy.ts", text), "policy.ts", [4]);
});

test("SUP-005 preserves JavaScript line numbers across every supported line terminator", async (t) => {
  const check = inlineFixture(t);
  for (const separator of ["\n", "\r\n", "\r", "\u2028", "\u2029"]) {
    assertSuppressions(
      await check("policy.ts", ["// ordinary", "// biome-ignore lint: reason", "debugger;"].join(separator)),
      "policy.ts",
      [2],
    );
    assertSuppressions(
      await check("policy.ts", `/**${separator} * biome-ignore lint: reason${separator} */`),
      "policy.ts",
      [2],
    );
    assert.deepEqual(
      await check("policy.ts", `export const example = \`value${separator}// biome-ignore lint: inert\`;`),
      [],
    );
  }
});

test("SUP-005 trusts supplied regex spellings, not comment-looking bytes inside a literal", async (t) => {
  const check = inlineFixture(t);
  for (const pattern of ["`", "[/*]", "[/* biome-ignore lint: inert */]"]) {
    const ast: AstFixture = { language: "typescript", literals: [{ regex: { pattern, flags: "g" } }] };
    assert.deepEqual(await check("policy.ts", `const pattern = /${pattern}/g;\n`, ast), []);
    assertSuppressions(
      await check("policy.ts", `const pattern = /${pattern}/g;\n// biome-ignore lint: reason\ndebugger;`, ast),
      "policy.ts",
      [2],
    );
  }
});

test("SUP-005 reconciles repeated and overlapping regex spellings and ignores non-regex literals", async (t) => {
  const check = inlineFixture(t);
  const literals: LiteralFixture[] = [
    {},
    { regex: {} },
    { regex: { pattern: 7, flags: "" } },
    { regex: { pattern: "unused", flags: false } },
    { regex: { pattern: "fixture", flags: "g" } },
    { regex: { pattern: "fixture", flags: "gi" } },
    { regex: { pattern: "fixture", flags: "g" } },
  ];
  assert.deepEqual(
    await check("policy.ts", "const first = /fixture/gi, second = /fixture/g, third = /fixture/g;\n", {
      language: "typescript",
      literals,
    }),
    [],
  );
});

test("SUP-005 inspects extra identical regex spellings as division and reports alternative source locations", async (t) => {
  const check = inlineFixture(t);
  const raw = "/[/* biome-ignore lint: fixture reason */]/g";
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
    const text = [`const example = ${raw};`, "let value = 6, g = 2;", `export const quotient = ${value}${raw};`].join(
      "\n",
    );
    assertSuppressions(
      await check("policy.ts", text, {
        language: "typescript",
        literals: [{ regex: { pattern: "[/* biome-ignore lint: fixture reason */]", flags: "g" } }],
      }),
      "policy.ts",
      [[1, 3]],
    );
  }
  assert.deepEqual(
    await check("policy.ts", "const literal = /value/g; const division = value/value/g;", {
      language: "typescript",
      literals: [{ regex: { pattern: "value", flags: "g" } }],
    }),
    [],
  );
});

test("SUP-005 fails closed on external parser errors and unreconciled AST regex counts", async (t) => {
  const check = inlineFixture(t);
  await assert.rejects(
    check("policy.ts", "not valid source", {
      language: "typescript",
      literals: [],
      error: "fixture parser rejected the source",
    }),
    /fixture parser rejected the source/u,
  );
  for (const text of ["const value = 1;", "const quoted = '/missing/g';"]) {
    await assert.rejects(
      check("policy.ts", text, {
        language: "typescript",
        literals: [{ regex: { pattern: "missing", flags: "g" } }],
      }),
      /Cannot reconcile AST regex literals with source; inspection is incomplete/u,
    );
  }
});

test("SUP-005 distinguishes JSX raw text, fragments, names and attributes from active JS comments", async (t) => {
  const check = inlineFixture(t);
  for (const expression of [
    "<div>don't panic /* biome-ignore lint: inert */ // biome-ignore lint: inert</div>",
    '<section title="/* biome-ignore lint: inert */"><span>don\'t panic</span>{"// biome-ignore lint: inert"}</section>',
    "<Widget disabled title='// biome-ignore lint: inert' count={1} {...{label: 'fixture'}} />",
    '<><UI.Widget data-id="fixture" aria:label={"text"}>text<Child /></UI.Widget></>',
    "<Container icon=<Child />></Container   >",
    "(<Widget />)",
  ]) {
    const prefix = `export const view = ${expression};\n`;
    assert.deepEqual(await check("policy.tsx", prefix), []);
    assertSuppressions(
      await check("policy.tsx", `${prefix}// biome-ignore lint: reason\ndebugger;`),
      "policy.tsx",
      [2],
    );
  }
  assert.deepEqual(
    await check("policy.jsx", "<Widget />; function render() { return <Widget />; }", {
      language: "javascript",
      literals: [],
    }),
    [],
  );
});

test("SUP-005 finds effective comments in JSX expression containers and spread attributes", async (t) => {
  const check = inlineFixture(t);
  for (const text of [
    ["const view = <div>{(() => {", " // biome-ignore lint: reason", " debugger; return {};", "})()}</div>;"].join(
      "\n",
    ),
    ["const view = <div {...{", " /* biome-ignore lint: reason */", " value: 1", "}} />;"].join("\n"),
    ["const view = <div count={(() => {", " // biome-ignore lint: reason", " return 1;", "})()} />;"].join("\n"),
  ])
    assertSuppressions(await check("policy.tsx", text), "policy.tsx", [2]);
});

test("SUP-005 rejects ambiguous JSX angles and type-parameter contexts instead of declaring them clean", async (t) => {
  const check = inlineFixture(t);
  for (const [source, diagnostic] of [
    ["const order = first<second>third;", /Ambiguous JSX\/angle expression/u],
    ["const identity = <T,>(value: T) => value;", /Cannot inspect JSX name/u],
    ["const identity = <T extends object>(value: T) => value;", /Ambiguous JSX\/type-parameter syntax/u],
    ["const identity = <T>(value: T) => value;", /Ambiguous JSX\/type-parameter syntax/u],
    ["const identity = <const T>(value: T) => value;", /Ambiguous JSX\/type-parameter syntax/u],
    ["const identity = <in T>(value: T) => value;", /Ambiguous JSX\/type-parameter syntax/u],
    ["const identity = <out T>(value: T) => value;", /Ambiguous JSX\/type-parameter syntax/u],
  ] as const)
    await assert.rejects(check("policy.tsx", source), diagnostic);
});

test("SUP-005 fails closed when controlled external AST/source responses cannot reconcile JSX markup", async (t) => {
  const check = inlineFixture(t);
  // These deliberately inconsistent source/AST responses exercise reconciliation, not parser acceptance.
  for (const [source, diagnostic] of [
    ['const view = <div title="unclosed', /Unclosed JSX attribute/u],
    ["const view = <div role=button />;", /Cannot inspect JSX attribute value/u],
    ["const view = <div></span>;", /Cannot reconcile JSX closing tag/u],
    ["const view = <div></div", /Cannot reconcile JSX closing tag/u],
    ["const view = <div>unclosed", /Unclosed or ambiguous JSX element/u],
  ] as const)
    await assert.rejects(check("policy.tsx", source), diagnostic);
});

test("SUP-005 distinguishes YAML comments from quotes, anchors, collections and block scalars", async (t) => {
  const check = inlineFixture(t);
  const inert = [
    String.raw`double: "escaped \" #trivy:ignore:AVD-KSV-0014"`,
    "single: 'don''t #trivy:ignore:AVD-KSV-0014'",
    'anchored: &example "#trivy:ignore:AVD-KSV-0014"',
    'collection: ["#trivy:ignore:AVD-KSV-0014", {value: "#trivy:ignore:AVD-KSV-0014"}]',
    "list:",
    " - '#trivy:ignore:AVD-KSV-0014'",
    'multiline: "first',
    " #trivy:ignore:AVD-KSV-0014",
    ' last"',
    "literal: |2- # ordinary header comment",
    "  #trivy:ignore:AVD-KSV-0014",
    "",
    "folded: >-",
    "  #trivy:ignore:AVD-KSV-0014",
    "url: example#trivy:ignore:AVD-KSV-0014",
    "# ordinary comment",
  ].join("\n");
  assert.deepEqual(await check("examples.yaml", inert), []);
  for (const quote of ['"', "'"]) {
    const text = `quoted: &example ${quote}example # literal${quote} #trivy:ignore:AVD-KSV-0014\n`;
    assertSuppressions(await check("anchored.yml", text), "anchored.yml", [1]);
  }
  assertSuppressions(
    await check("examples.yaml", `${inert}\nkind: Pod #trivy:ignore:AVD-KSV-0014\n`),
    "examples.yaml",
    [17],
  );
});

test("SUP-005 reports YAML directive locations after dedented scalars and multiline single quotes", async (t) => {
  const check = inlineFixture(t);
  const text = [
    "single: 'first",
    " #trivy:ignore:AVD-KSV-0014",
    " don''t end'",
    "literal: |",
    "  #trivy:ignore:AVD-KSV-0014",
    "",
    "#trivy:ignore:AVD-KSV-0014",
    "unquoted: don't # ordinary trivy:ignore:AVD-KSV-0014",
    "",
  ].join("\r\n");
  assertSuppressions(await check("examples.yml", text), "examples.yml", [7, 8]);
  await assert.rejects(check("examples.yml", "value: &\n"), /Cannot inspect YAML anchor; inspection is incomplete/u);
});

test("SUP-005 checks HCL hash, slash and block comments while preserving quoted and heredoc examples", async (t) => {
  const check = inlineFixture(t);
  for (const file of ["main.tf", "main.tfvars", "main.hcl"]) {
    assertSuppressions(
      await check(
        file,
        [
          "#trivy:ignore:AVD-AWS-0086:exp:2099-01-01",
          'bucket = "fixture" // trivy:ignore:AVD-AWS-*',
          "/**",
          " * trivy:ignore:AVD-AWS-0086",
          " */",
        ].join("\n"),
      ),
      file,
      [1, 2, 4],
    );
    for (const marker of ["EXAMPLE", "-EXAMPLE"]) {
      const text = [
        "locals {",
        String.raw` example = "escaped \" #trivy:ignore:AVD-AWS-0086"`,
        ` documented = <<${marker}`,
        "#trivy:ignore:AVD-AWS-0086",
        marker.startsWith("-") ? "  EXAMPLE" : "EXAMPLE",
        "}",
        "#trivy:ignore:AVD-AWS-0086",
      ].join("\r\n");
      assertSuppressions(await check(file, text), file, [7]);
    }
  }
});

test("SUP-005 recognizes Dockerfile naming forms and only full-line Trivy comments", async (t) => {
  const check = inlineFixture(t);
  for (const file of ["Dockerfile", "docker/Dockerfile.dev", "service.dockerfile", "docker/SERVICE.DOCKERFILE"]) {
    const text = [
      "FROM fixture:1",
      'RUN echo "# trivy:ignore:AVD-DS-0002"',
      "# ordinary",
      "  # trivy:ignore:AVD-DS-0002",
      "",
    ].join("\n");
    assertSuppressions(await check(file, text), file, [4]);
  }
});

test("SUP-006 accepts absent or exact tool pins, including the reviewed prerelease", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-006", "exact-pin"), []);
  for (const pkg of [
    {},
    { devDependencies: {} },
    { devDependencies: { tsrs: "0.20.1-ts7.1.0-beta", typescript: "7.1.0-beta" } },
    { devDependencies: { tsrs: "1.2.3" } },
  ]) {
    repo.write("package.json", JSON.stringify(pkg));
    assert.deepEqual(await repo.check("SUP-006", "exact-pin"), []);
  }
});

test("SUP-006 rejects floating, tagged, ranged and malformed versions with actionable diagnostics", async (t) => {
  const repo = fixture(t);
  for (const version of ["^1.2.3", "~1.2.3", "latest", "1.2", "1.2.3 || 2.0.0"]) {
    repo.write("package.json", JSON.stringify({ devDependencies: { tsrs: version, typescript: version } }));
    const findings = await repo.check("SUP-006", "exact-pin");
    assert.deepEqual(
      findings.map((finding) => finding.message),
      ["tsrs", "typescript"].map((name) => `devDependencies.${name} is "${version}", not an exact version`),
    );
    assert.ok(findings.every((finding) => finding.file === "package.json" && finding.fix?.includes("exact version")));
  }
});

test("SUP-006 blocks fast flags and environment variables only in governed gate files", async (t) => {
  const repo = fixture(t, {
    "package.json": '"TSRS_FAST": "1"\n',
    "docs/example.md": "tsrs --fast\n",
    ".github/workflows/nested/not-a-workflow.yml": "tsrs --fast\n",
    ".github/workflows/ci.yml": "run: tsrs --fast\nenv: TSRS_FAST=0\nrun: tsrs --faster\n",
    ".github/workflows/drift.yaml": "run: tsrs --fast=false\nrun: tsrs --fast false\nrun: tsrs --fast true\n",
    "superman.config.json": '["tsrs", "--fast", "false"]\n["tsrs", "--fast"]\n',
  });
  const findings = await repo.check("SUP-006", "no-fast-in-gates");
  assert.deepEqual(
    findings.map(({ file, line }) => [file, line]),
    [
      [".github/workflows/ci.yml", 1],
      [".github/workflows/ci.yml", 2],
      [".github/workflows/drift.yaml", 3],
      ["superman.config.json", 2],
    ],
  );
  assert.ok(findings.every((finding) => finding.message === "tsrs fast mode is not allowed in CI or gates"));
});

test("SUP-006 requires both tsrs and noEmit in an argv array when config is scoped", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-006", "typecheck-uses-tsrs"), []);
  for (const config of [
    {},
    { gates: {} },
    { gates: { typecheck: "tsrs --noEmit" } },
    { gates: { typecheck: ["tsc", "--noEmit"] } },
    { gates: { typecheck: ["tsrs"] } },
  ]) {
    repo.write("superman.config.json", JSON.stringify(config));
    const findings = await repo.check("SUP-006", "typecheck-uses-tsrs");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, "superman.config.json");
    assert.equal(findings[0].message, "gates.typecheck must run the pinned tsrs with --noEmit");
  }
  repo.write("superman.config.json", JSON.stringify({ gates: { typecheck: ["pnpm", "exec", "tsrs", "--noEmit"] } }));
  assert.deepEqual(await repo.check("SUP-006", "typecheck-uses-tsrs"), []);
});

test("SUP-007 rejects each scoped Trivy ignore or config file and permits an absent inventory", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-007", "no-trivy-ignore"), []);
  const names = [
    ".trivyignore",
    ".trivyignore.yaml",
    "trivy.yaml",
    "trivy.yml",
    "nested/.trivyignore",
    "nested/trivy.yml",
  ];
  for (const name of names) repo.write(name, "");
  const findings = await repo.check("SUP-007", "no-trivy-ignore");
  assert.deepEqual(
    findings.map((finding) => finding.file),
    names,
  );
  assert.ok(
    findings.every(
      (finding) =>
        finding.message === "Trivy ignore and config files are waivers and are not allowed" &&
        finding.fix?.startsWith("Delete it;"),
    ),
  );
});

test("SUP-008 remains inactive before adoption and ignores comment-only superman invocations", async (t) => {
  const repo = fixture(t, {
    ".github/workflows/ci.yml": "# superman gate ci\nrun: vitest run # fixture\n\n",
  });
  assert.deepEqual(await repo.check("SUP-008", "tests-only-through-superman"), []);
  assert.deepEqual(await repo.check("SUP-008", "nightly-full-run"), []);
});

test("SUP-008 inventories both workflow extensions and rejects each governed direct tool after adoption", async (t) => {
  const commands = [
    "vitest run",
    "jest",
    "stryker run",
    "jscpd src",
    "knip",
    "pytest",
    "biome check",
    "biome ci",
    "biome lint",
    "biome format",
    "archgate check",
    "mix test",
    "mix muex",
    "cargo test",
    "cargo nextest",
    "dotnet test",
    "cabal test",
    "stack test",
    "go test",
    "npm test",
    "pnpm run test",
    "yarn test",
    "bun run test",
    "nx affected",
    "nx run-many",
    "moon run",
    "moon ci",
    "turbo run",
  ];
  const repo = fixture(t, {
    ".github/workflows/adoption.yaml": "run: superman gate ci\nrun: tsc --noEmit\nrun: tsrs --noEmit\n# run: vitest\n",
    ".github/workflows/ci.yml": commands.map((command) => `run: ${command} # governed command`).join("\n"),
    ".github/workflows/nested/ignored.yml": "run: vitest\n",
  });
  const findings = await repo.check("SUP-008", "tests-only-through-superman", { scopedFiles: [] });
  assert.deepEqual(
    findings.map(({ file, line }) => [file, line]),
    commands.map((_, i) => [".github/workflows/ci.yml", i + 1]),
  );
  assert.ok(
    findings.every(
      (finding) =>
        finding.message === "Tests and change-scoped gates run only through `superman gate` (SUP-008)" &&
        finding.fix?.includes("gate argv"),
    ),
  );
});

test("SUP-008 accepts a scheduled full nightly run alongside affected CI and unrelated disabled jobs", async (t) => {
  const repo = fixture(t, {
    ".github/workflows/ci.yml": "run: superman gate ci --affected\nif: false\n",
    ".github/workflows/nightly.yaml":
      "on:\n  schedule:\n    - cron: '0 0 * * *'\njobs:\n  full:\n    if: true\n    run: superman gate nightly\n# if: false\n",
  });
  assert.deepEqual(await repo.check("SUP-008", "tests-only-through-superman"), []);
  assert.deepEqual(await repo.check("SUP-008", "nightly-full-run"), []);
});

test("SUP-008 requires the schedule and nightly command in the same inventoried workflow", async (t) => {
  const repo = fixture(t, { ".github/workflows/ci.yml": "run: superman gate ci --affected\n" });
  for (const nightly of [undefined, "run: superman gate nightly\n"]) {
    if (nightly) {
      repo.write(".github/workflows/nightly.yaml", nightly);
      repo.write(".github/workflows/unrelated.yml", "schedule:\nrun: echo fixture\n");
    }
    const findings = await repo.check("SUP-008", "nightly-full-run");
    assert.deepEqual(diagnostics(findings), [
      {
        file: ".github/workflows/ci.yml",
        line: 1,
        message: "`--affected` is used but no scheduled workflow runs `superman gate nightly`",
      },
    ]);
  }
});

test("SUP-008 rejects affected nightlies and both literal and expression disabled jobs or steps", async (t) => {
  const repo = fixture(t, {
    ".github/workflows/nightly.yml": `schedule:\nrun: superman gate nightly --affected\nif: false\n- if: \${{ false }}\n# if: false\n`,
  });
  const findings = await repo.check("SUP-008", "nightly-full-run");
  assert.deepEqual(
    findings.map((finding) => finding.line),
    [2, 3, 4],
  );
  assert.equal(findings[0].message, "`superman gate nightly` must run the full suite, never --affected");
  assert.ok(findings.slice(1).every((finding) => finding.message.includes("may not disable jobs or steps")));
});

test("SUP-009 rejects generated credential families without exposing their values", async (t) => {
  const repo = fixture(t);
  const credentials = [
    ...["p", "o", "u", "s", "r"].map((family) => `gh${family}_${"A".repeat(36)}`),
    `github_pat_${"A".repeat(30)}`,
    `sk-${"A".repeat(24)}`,
    `AKIA${"A".repeat(16)}`,
    `ASIA${"A".repeat(16)}`,
    ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
    ["-----BEGIN", "RSA PRIVATE KEY-----"].join(" "),
    "https://fixture:credential@example.invalid/",
  ];
  for (const credential of credentials) {
    const file = ".superman/vault/raw/source.md";
    repo.write(file, `# Public source\n${credential}\n`);
    const findings = await repo.check("SUP-009", "no-sensitive-knowledge");
    assert.deepEqual(diagnostics(findings), [
      { file, line: 2, message: "Credential material is forbidden in wiki/vault" },
    ]);
    assert.ok(!JSON.stringify(findings).includes(credential));
    assert.match(findings[0].fix ?? "", /revoke live credentials/u);
  }
});

test("SUP-009 recognizes unprefixed credential fields and gives credentials precedence over personal data", async (t) => {
  const repo = fixture(t);
  for (const field of ["password", "api_key", "api-key", "apiKey", "access_token", "client-secret", "secret_key"]) {
    const file = ".superman/vault/candidates/lesson.md";
    repo.write(file, `{"${field}": "plain-sensitive-fixture-value", "email": "person@example.invalid"}\n`);
    const findings = await repo.check("SUP-009", "no-sensitive-knowledge");
    assert.deepEqual(diagnostics(findings), [
      { file, line: 1, message: "Credential material is forbidden in wiki/vault" },
    ]);
    assert.ok(!JSON.stringify(findings).includes("plain-sensitive-fixture-value"));
    assert.ok(!JSON.stringify(findings).includes("person@example.invalid"));
  }
});

test("SUP-009 blocks email, SSN and structured personal fields across all knowledge roots", async (t) => {
  const repo = fixture(t);
  const personal = [
    "person@example.invalid",
    "123-45-6789",
    "phone: +1 202 555 0100",
    "telephone=fixture",
    "e-mail: fixture",
    '"email": "fixture"',
    "ssn: fixture",
    "date_of_birth: fixture",
    "dob: fixture",
    "home_address: fixture",
  ];
  for (const file of ["wiki/people.md", ".superman/vault/raw/contact.md", ".superman/vault/vault.json"]) {
    repo.write(file, `Public heading\r\n${personal.join("\r\n")}\r\n`);
    const findings = await repo.check("SUP-009", "no-sensitive-knowledge", { scopedFiles: [file] });
    assert.deepEqual(
      findings.map(({ line, message }) => [line, message]),
      personal.map((_, i) => [i + 2, "Personal data is forbidden in wiki/vault"]),
    );
    assert.ok(findings.every((finding) => finding.file === file));
    for (const value of personal) assert.ok(!JSON.stringify(findings).includes(value));
  }
});

test("SUP-009 permits ordinary public concepts, budget policy, empty fields and long harmless source lines", async (t) => {
  const repo = fixture(t);
  assert.deepEqual(await repo.check("SUP-009", "no-sensitive-knowledge"), []);
  for (const [file, text] of [
    ["wiki/lesson.md", "---\ntype: note\n---\nSee [[design]] and the reviewed source.\npassword:   \nphone:\n"],
    [".superman/vault/vault.json", '{"version":1,"budgets":{"conceptBytes":16384}}\n'],
    [".superman/vault/raw/long-line.md", `${"a".repeat(512 * 1024)}\n${"a-a-".repeat(64 * 1024)}\n`],
  ])
    repo.write(file, text);
  assert.deepEqual(await repo.check("SUP-009", "no-sensitive-knowledge"), []);
});
