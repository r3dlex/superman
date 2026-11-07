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

function fixture(
  t: TestContext,
  setup?: (tools: { root: string; write: (file: string, content: string) => void }) => void,
) {
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
  setup?.({ root, write });
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
    run(gate?: string, extraEnv: NodeJS.ProcessEnv = {}, args: string[] = [], prepare?: () => void) {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "-m", "candidate");
      prepare?.();
      const receipt = join(root, ".git/receipt.json");
      const result = spawnSync(
        process.execPath,
        [join(checkout, ".superman/ci/raw-gates.ts"), ...(gate ? ["--gate", gate] : []), ...args, "--receipt", receipt],
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

/**
 * A complete Knip model: one declared entry, one project member reachable
 * from it, and files the model explicitly ignores.
 */
/**
 * The terminal's colour escapes, removed.
 *
 * A test runner that writes to a terminal colours its output, so the same
 * failure text arrives with escape codes between the words on a runner and
 * without them in a captured pipe. The text is the claim; the colour is the
 * terminal's.
 */
function stripAnsi(text: string): string {
  return text.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu"), "");
}

function completeKnipModel({ write }: { write: (file: string, content: string) => void }) {
  write(
    "knip.json",
    `{
  "$schema": "https://unpkg.com/knip@6.43.0/schema.json",
  "entry": ["src/cli.ts"],
  "project": ["src/**/*.ts"],
  "ignore": ["ignored/**/*.ts", "vitest.config.ts"]
}
`,
  );
  write(
    "package.json",
    `{
  "name": "superman-ai",
  "type": "module",
  "packageManager": "pnpm@12.16.1",
  "engines": {
    "node": ">=26"
  },
  "scripts": {
    "lint": "biome ci",
    "knip": "knip"
  },
  "devDependencies": {
    "@biomejs/biome": "2.6.4",
    "knip": "6.43.0",
    "vitest": "5.0.5"
  }
}
`,
  );
  write("src/cli.ts", 'import { helper } from "./helper.ts";\n\nexport const cli = helper;\n');
  write("src/helper.ts", "export const helper = 1;\n");
  write("ignored/tooling.ts", "export const tooling = 1;\n");
}

/**
 * A repository complete enough for the pre-commit stage, which §5.4 gives G1
 * (archgate), G2 (typecheck and tests), G3 (knip), G4 (protected paths) and
 * G10 (biome). The tool pins G1 and G2 compare are declared, the product source
 * has the test G2 requires, the Archgate rule directory G1 reads is present, and
 * the Knip model accounts for all of it.
 */
function completePreCommitModel({ root, write }: { root: string; write: (file: string, content: string) => void }) {
  completeKnipModel({ write });
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.devDependencies = {
    ...pkg.devDependencies,
    archgate: "0.61.0",
    tsrs: "0.20.1-ts7.1.0-beta",
    typescript: "7.1.0-beta",
  };
  write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  // The Knip model and the test are written as literals, not re-serialised: the
  // G10 gate runs Biome over the fixture, so these must already be in the
  // formatter's output shape.
  write(
    "knip.json",
    `{
  "$schema": "https://unpkg.com/knip@6.43.0/schema.json",
  "entry": ["src/cli.ts", "test/value.test.ts"],
  "project": ["src/**/*.ts", "test/**/*.ts"],
  "ignore": ["ignored/**/*.ts", "vitest.config.ts"],
  "ignoreDependencies": ["archgate", "tsrs", "typescript"]
}
`,
  );
  write(
    "test/value.test.ts",
    'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("behavior", () => expect(cli).toBe(1));\n',
  );
  for (const file of [
    ".archgate/config.json",
    ".archgate/adrs/SUP-005-no-inline-suppression.md",
    ".archgate/adrs/SUP-005-no-inline-suppression.rules.ts",
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(checkout, file), join(root, file));
  }
  write("docs/adr/0004-no-waivers.md", "# Reviewed policy\n");
}

/**
 * The pre-commit stage as the staged G9 round declares it: the staged scope
 * with G9 in its inventory. The gate under test runs on its own, so a failure
 * is G9's own and not another gate's.
 */
function stagedG9Stage({ root, write }: { root: string; write: (file: string, content: string) => void }) {
  const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  bootstrap.stages["pre-commit"].gates = ["G9"];
  write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
}

/** A staged test file whose staged content is green. */
const greenStagedTest =
  'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("staged behavior", () => expect(cli).toBe(1));\n';

/** A staged test file whose staged content is not green. */
const redStagedTest =
  'import { expect, test } from "vitest";\n\nimport { cli } from "../src/cli.ts";\n\ntest("staged behavior", () => expect(cli).toBe(2));\n';

/**
 * A pnpm shim that answers the version probes the staged G9 makes with the
 * values the test needs and delegates every other invocation to the real
 * pinned pnpm.
 */
function pnpmShim(repo: { root: string }, reports: { pnpm?: string; vitest?: string }): string {
  const directory = join(repo.root, ".git/pnpm-shim");
  mkdirSync(directory, { recursive: true });
  const real = execFileSync("which", ["pnpm"], { env, encoding: "utf8", shell: false }).trim();
  writeFileSync(
    join(directory, "pnpm"),
    `#!${process.execPath}\nimport { spawnSync } from "node:child_process";\nconst args = process.argv.slice(2);\nif (args.length === 1 && args[0] === "--version") { console.log(${JSON.stringify(reports.pnpm ?? "12.16.1")}); process.exit(0); }\nif (args[0] === "exec" && args[1] === "vitest" && args[2] === "--version") { console.log(${JSON.stringify(reports.vitest ?? "vitest/5.0.5 darwin-arm64 node-v26.5.0")}); process.exit(0); }\nconst result = spawnSync(${JSON.stringify(real)}, args, { stdio: "inherit", shell: false });\nprocess.exit(result.status ?? 1);\n`,
    { mode: 0o755 },
  );
  return directory;
}

/**
 * A PATH that resolves git and nothing else. The pinned pnpm is absent, so a
 * tool invocation fails as a missing tool rather than as a tool failure.
 */
function gitOnlyPath(repo: { root: string }): string {
  const directory = join(repo.root, ".git/git-only");
  mkdirSync(directory, { recursive: true });
  const real = execFileSync("which", ["git"], { env, encoding: "utf8", shell: false }).trim();
  symlinkSync(real, join(directory, "git"), "file");
  return directory;
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
  const repo = fixture(t, completeKnipModel);
  repo.write("src/unused.ts", "export const unused = 1;\n");
  const result = repo.run("G3");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /declared project member is not a member of the dependency model: src\/unused\.ts/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
  assert.equal(result.receipt.tools.knip.actual, "6.43.0");
});

test("raw G3 proves every source file is an entry, a project member or explicitly ignored", (t) => {
  const repo = fixture(t, completeKnipModel);
  const result = repo.run("G3");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.model.entry, 1);
  assert.equal(outcome.model.projectMembers, 1);
  assert.equal(outcome.model.explicitlyIgnored, 2);
  assert.deepEqual(outcome.model.ignored, ["ignored/**/*.ts", "vitest.config.ts"]);
});

test("raw G3 refuses a declared entry that does not resolve", (t) => {
  const repo = fixture(t, ({ write }) => {
    completeKnipModel({ write });
    write(
      "knip.json",
      `${JSON.stringify(
        { entry: ["src/missing.ts"], project: ["src/**/*.ts"], ignore: ["ignored/**/*.ts", "vitest.config.ts"] },
        null,
        2,
      )}\n`,
    );
  });
  const result = repo.run("G3");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /declared Knip entry does not resolve: src\/missing\.ts/u);
  assert.equal(result.receipt.results[0].kind, "incomplete-report");
});

test("raw G3 refuses a declared project member the dependency model does not reach", (t) => {
  const repo = fixture(t, completeKnipModel);
  repo.write("src/unreachable.ts", "export const unreachable = 1;\n");
  const result = repo.run("G3");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /not a member of the dependency model: src\/unreachable\.ts/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("raw G3 refuses a knip issue that is not an unused file", (t) => {
  const repo = fixture(t, completeKnipModel);
  repo.write("src/helper.ts", "export const helper = 1;\nexport const unused = 2;\n");
  repo.write("src/cli.ts", 'import { helper } from "./helper.ts";\nexport const cli = helper;\n');
  const result = repo.run("G3");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /knip reported \d+ issue\(s\) the model does not account for: exports in/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("raw G3 scopes the model to the surfaces it declares and ignores the rest", (t) => {
  const repo = fixture(t, completeKnipModel);
  // A source surface the declared model never claims is outside its scope:
  // it is neither an entry, a member nor an ignored file, so it is not the
  // model's business. The Deno operational root is treated exactly this way.
  repo.write("loose/tooling.ts", "export const loose = 1;\n");
  const result = repo.run("G3");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.model.entry, 1);
  assert.equal(outcome.model.projectMembers, 1);
  assert.equal(outcome.model.explicitlyIgnored, 2);
});

const cleanTypeScriptPolicy = `{
  "compilerOptions": {
    "target": "ES2025",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "skipLibCheck": false
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
`;

/** A source file that trips the reviewed 15/50/4 advisory calibration only. */
function advisorySource(): string {
  const lines = [
    "export function manyParameters(first: number, second: number, third: number, fourth: number, fifth: number): number {",
    "  return first + second + third + fourth + fifth;",
    "}",
    "",
    "export function complex(value: number): string {",
    "  if (value > 0) {",
    "    for (let index = 0; index < 3; index++) {",
    "      if (index % 2 === 0) {",
    "        if (value > index) {",
    "          if (index > 1) {",
    "            if (value > 10) {",
    '              return "deep";',
    "            }",
    "          }",
    "        }",
    "      }",
    "    }",
    "  }",
    '  return "other";',
    "}",
    "",
    "export function longBody(): number {",
    "  let total = 0;",
  ];
  for (let index = 1; index <= 52; index++) lines.push(`  total += ${index};`);
  lines.push("  return total;", "}", "");
  return lines.join("\n");
}

test("raw G10 reports the 15/50/4 advisories separately and never blocks on them", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    write("src/advisory.ts", advisorySource());
    write(".superman/ci/advisory.ts", advisorySource());
    write("test/advisory.test.ts", advisorySource());
  });
  const result = repo.run("G10");
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.advisories.blocking, false);
  assert.equal(outcome.advisories.total, 9);
  assert.deepEqual(outcome.advisories.byCohort["product-runtime"], {
    noExcessiveCognitiveComplexity: 1,
    noExcessiveLinesPerFunction: 1,
    useMaxParams: 1,
  });
  assert.deepEqual(outcome.advisories.byCohort["bootstrap-rules"], {
    noExcessiveCognitiveComplexity: 1,
    noExcessiveLinesPerFunction: 1,
    useMaxParams: 1,
  });
  assert.deepEqual(outcome.advisories.byCohort["tests-fixtures"], {
    noExcessiveCognitiveComplexity: 1,
    noExcessiveLinesPerFunction: 1,
    useMaxParams: 1,
  });
});

test("raw G10 fails an explicit Biome correctness error", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    write("src/unsafe.ts", "export const unsafe: any = 1;\n");
  });
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /biome ci failed/u);
  assert.match(result.output, /noExplicitAny/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("raw G10 fails an explicit Biome correctness error for a forbidden suppression", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    write("src/suppressed.ts", "// @ts-ignore\nexport const suppressed: string = 1;\n");
  });
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /biome ci failed/u);
  assert.match(result.output, /noTsIgnore/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("raw G10 fails an explicit Biome correctness error for a resolved import cycle", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    write("src/cycle-a.ts", 'import { b } from "./cycle-b.ts";\nexport const a = () => b;\n');
    write("src/cycle-b.ts", 'import { a } from "./cycle-a.ts";\nexport const b = () => a;\n');
  });
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /biome ci failed/u);
  assert.match(result.output, /noImportCycles/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("raw G10 refuses an advisory promoted to a blocking cap", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    const biome = JSON.parse(readFileSync(join(checkout, "biome.json"), "utf8"));
    biome.linter.rules.complexity.noExcessiveLinesPerFunction.level = "error";
    write("biome.json", `${JSON.stringify(biome, null, 2)}\n`);
  });
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /advisory noExcessiveLinesPerFunction must stay advisory/u);
});

test("raw G10 refuses a changed advisory threshold", (t) => {
  const repo = fixture(t, ({ write }) => {
    write("tsconfig.json", cleanTypeScriptPolicy);
    const biome = JSON.parse(readFileSync(join(checkout, "biome.json"), "utf8"));
    biome.linter.rules.complexity.useMaxParams.options.max = 3;
    write("biome.json", `${JSON.stringify(biome, null, 2)}\n`);
  });
  const result = repo.run("G10");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /advisory useMaxParams threshold must stay 4/u);
  assert.equal(result.receipt.results[0].kind, "policy-refusal");
});

test("raw G10 refuses a changed advisory counting semantic", (t) => {
  for (const option of ["skipBlankLines", "skipIifes"]) {
    const repo = fixture(t, ({ write }) => {
      write("tsconfig.json", cleanTypeScriptPolicy);
      const biome = JSON.parse(readFileSync(join(checkout, "biome.json"), "utf8"));
      biome.linter.rules.complexity.noExcessiveLinesPerFunction.options[option] = true;
      write("biome.json", `${JSON.stringify(biome, null, 2)}\n`);
    });
    const result = repo.run("G10");
    assert.equal(result.status, 1, `${option}\n${result.output}`);
    assert.match(
      result.output,
      new RegExp(`advisory noExcessiveLinesPerFunction counting semantics ${option} must stay false`, "u"),
    );
    assert.equal(result.receipt.results[0].kind, "policy-refusal");
  }
});

test("a declared full stage that omits required work fails the full result", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages["pre-pr"].gates = ["G1", "G2"];
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /declared full but omits G3, G4, G5, G6, G7, G8, G9, G10, G11/u);
  assert.equal(result.receipt.errorKind, "skipped-required-work");
  assert.equal(result.receipt.verdict, "fail");
});

test("the nightly stage compares main against the previous main and replays nothing", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages.nightly = {
      feedback: "full",
      scope: "full",
      gates: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11"],
    };
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  // The nightly is a post-merge run: it is on main, and it compares main
  // with the main before it, which is the parent it is checked out against.
  const parent = repo.git("rev-parse", "HEAD").trim();
  repo.git("switch", "--quiet", "main");
  const result = repo.run(undefined, { HEAD_REF: "main" }, ["--stage", "nightly"]);
  // The receipt carries the nightly's facts whatever the gates decided.
  assert.equal(result.receipt.branch, "main");
  assert.equal(result.receipt.baseSha, parent);
  const g9 = result.receipt.results.find((entry: { gate: string }) => entry.gate === "G9");
  assert.equal(g9.status, "n/a");
  assert.match(String(g9.reason), /nightly on main/u);
  // The nightly's G6 is the critical acceptance, not a mutation measurement.
  const g6 = result.receipt.results.find((entry: { gate: string }) => entry.gate === "G6");
  assert.match(String(g6.reason), /declared critical cases executed fresh/u);
});

test("the nightly stage refuses a branch that is not main", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages.nightly = {
      feedback: "full",
      scope: "full",
      gates: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11"],
    };
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "nightly"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /the nightly stage runs on main, not ticket\/demo-01/u);
});

test("the nightly stage refuses a pull-request event", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages.nightly = {
      feedback: "full",
      scope: "full",
      gates: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11"],
    };
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  repo.git("switch", "--quiet", "main");
  const binary = trivyFixture(repo, emptyTrivyReport);
  const result = repo.run(
    undefined,
    { HEAD_REF: "main", GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request", TRIVY_BIN: binary },
    ["--stage", "nightly"],
  );
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /the nightly stage runs on the schedule event/u);
});

test("the full local pre-PR run and the CI run share one tool profile and gate inventory", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
  });
  const binary = trivyFixture(repo, emptyTrivyReport);
  const local = repo.run(undefined, { TRIVY_BIN: binary }, ["--stage", "pre-pr"]);
  const remote = repo.run(undefined, { TRIVY_BIN: binary }, ["--stage", "ci"]);
  assert.equal(local.receipt.stage, "pre-pr");
  assert.equal(remote.receipt.stage, "ci");
  assert.equal(local.receipt.feedback, "full");
  assert.equal(remote.receipt.feedback, "full");
  assert.equal(local.receipt.satisfiesFullBar, true);
  assert.equal(remote.receipt.satisfiesFullBar, true);
  assert.deepEqual(local.receipt.scope, remote.receipt.scope);
  assert.deepEqual(local.receipt.profile, remote.receipt.profile);
  // The Trivy scan is delegated to the required linux-x64 CI leg, so on that
  // leg the CI run scans and on every other platform it is delegated. The
  // delegation is the platform's, and the assertion follows it.
  const g11 = remote.receipt.results.find((item: { gate: string }) => item.gate === "G11");
  if (process.platform === "linux" && process.arch === "x64") {
    assert.equal(g11.status, "pass");
  } else {
    assert.equal(g11.status, "n/a");
    assert.match(String(g11.reason), /delegated/u);
  }
});

test("a partial pre-commit result is labeled partial feedback and never satisfies the full bar", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"]);
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.stage, "pre-commit");
  assert.equal(result.receipt.feedback, "partial");
  assert.equal(result.receipt.satisfiesFullBar, false);
  assert.equal(result.receipt.verdict, "partial-feedback");
  // §5.4's local column gives G5 and G9 a local behaviour, so the pre-commit
  // stage declares them beside the five checks §5.2 names.
  assert.deepEqual(result.receipt.scope, ["G1", "G2", "G3", "G4", "G5", "G9", "G10"]);
  assert.equal(result.receipt.inputScope, "staged");
});

test("a pre-commit run executes the staged forms and a pre-pr run executes the whole-repository forms", (t) => {
  const staged = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
  });
  const stagedRun = staged.run(undefined, {}, ["--stage", "pre-commit"]);
  assert.equal(stagedRun.status, 0, stagedRun.output);
  assert.equal(stagedRun.receipt.inputScope, "staged");
  for (const gate of ["G1", "G10"]) {
    const result = stagedRun.receipt.results.find((entry: { gate: string }) => entry.gate === gate);
    assert.equal(result?.scope, "staged", `${gate} did not run its staged form`);
  }
  const full = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
  });
  const fullRun = full.run(undefined, {}, ["--stage", "pre-pr"]);
  assert.equal(fullRun.receipt.inputScope, "full");
  for (const gate of ["G1", "G10"]) {
    const result = fullRun.receipt.results.find((entry: { gate: string }) => entry.gate === gate);
    assert.equal(result?.scope, "full", `${gate} did not run its whole-repository form`);
  }
});

test("a staged run refuses a tracked modification that was not staged", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
  });
  assert.notEqual(result.status, 0);
  assert.match(result.output, /unstaged changes present/u);
});

test("a staged run evaluates a staged modification of a tracked file", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    write(".scratch/demo/note.md", "# Reviewed note\n");
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write(".scratch/demo/note.md", "# Edited note\n");
    repo.git("add", ".scratch/demo/note.md");
  });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.receipt.inputScope, "staged");
  assert.equal(result.receipt.verdict, "partial-feedback");
});

test("a staged G9 passes when the staged test file is green", (t) => {
  // The input that reaches the staged G9: a staged test file whose staged
  // content is green. The outcome it produces: the gate passes and names the
  // staged scope it checked.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.gate, "G9");
  assert.equal(outcome.status, "pass");
  assert.equal(outcome.scope, "staged");
  assert.deepEqual(outcome.stagedTests, ["test/value.test.ts"]);
  assert.match(outcome.checked, /staged test files were run against the staged content/u);
  assert.match(outcome.notChecked, /red-on-base/u);
  assert.equal(result.receipt.inputScope, "staged");
  assert.equal(result.receipt.verdict, "partial-feedback");
  assert.equal(result.receipt.behaviorReplay, undefined, "The staged scope never claims the red-on-base replay");
});

test("a staged G9 fails and reports the tool's own failure when the staged test file is red", (t) => {
  // The input that reaches the staged G9: a staged test file whose staged
  // content is red. The outcome it produces: the gate fails and the test
  // runner's own failure is reported, not swallowed.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", redStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.gate, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.scope, "staged");
  assert.equal(outcome.kind, "failed-command");
  assert.deepEqual(outcome.stagedTests, ["test/value.test.ts"]);
  assert.match(outcome.checked, /staged test files were run against the staged content/u);
  assert.match(outcome.reason, /vitest run .* failed/u);
  assert.match(stripAnsi(result.output), /AssertionError: expected 1 to be 2/u);
  assert.equal(result.receipt.verdict, "fail");
});

test("a staged G9 reports n/a when no staged file is a test file", (t) => {
  // The input that reaches the staged G9: a staged change that is not a test
  // file. The outcome it produces: the gate is inapplicable, with the reason
  // naming the fact that nothing staged is a test file.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write(".scratch/demo/note.md", "# Staged note\n");
    repo.git("add", ".scratch/demo/note.md");
  });
  assert.equal(result.status, 0, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.gate, "G9");
  assert.equal(outcome.status, "n/a");
  assert.equal(outcome.scope, "staged");
  assert.match(outcome.reason, /no staged file is a test file/u);
  assert.equal(outcome.stagedTests, undefined);
  assert.match(outcome.checked, /no staged test file was checked/u);
  assert.match(outcome.notChecked, /red-on-base/u);
  assert.equal(result.receipt.verdict, "partial-feedback");
});

test("the full scope's G9 still runs the red-on-base replay and never the staged form", (t) => {
  // The input that reaches the full-scope G9: a ticket branch whose commit
  // carries no changed test file. The outcome it produces: the full scope
  // still attempts the red-on-base replay and reports no staged scope.
  const repo = fixture(t);
  const result = repo.run("G9");
  assert.equal(result.status, 1, result.output);
  assert.equal(result.receipt.inputScope, "full");
  const outcome = result.receipt.results[0];
  assert.equal(outcome.gate, "G9");
  assert.equal(outcome.scope, undefined, "The full scope must not report the staged form");
  assert.equal(outcome.status, "fail");
  assert.match(outcome.reason, /no added or changed test files/u);
  assert.deepEqual(result.receipt.behaviorReplay.tests, []);
});

test("a staged G9 refuses a staged test file that is not a regular file", (t) => {
  // The input that reaches the guard: a staged test file that is a symlink.
  // The outcome it produces: the gate refuses it, because the bytes a
  // symlinked test would run are not the staged bytes.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    symlinkSync("../src/cli.ts", join(repo.root, "test/alias.test.ts"));
    repo.git("add", "test/alias.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.checked, /no staged test file was checked/u);
  assert.match(outcome.reason, /staged test file must be a regular file: test\/alias\.test\.ts/u);
});

test("a staged G9 refuses a Node pin the reviewed policy does not declare", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a Node
  // pin the runtime does not have. The outcome it produces: the staged G9
  // refuses the run instead of testing under an undeclared runtime.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.tools.node = "0.0";
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.gate, "G9");
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.scope, "staged");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.reason, /Node pin expected 0\.0, actual /u);
});

test("a staged G9 refuses a pnpm pin the reviewed policy does not declare", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a pnpm
  // pin the installed pnpm does not have. The outcome it produces: the staged
  // G9 refuses the run instead of testing under an undeclared package manager.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.tools.pnpm = "0.0.0";
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.reason, /pnpm pin expected 0\.0\.0, actual /u);
});

test("a staged G9 refuses a Vitest pin the declared and installed versions do not match", (t) => {
  // The input that reaches the guard: a reviewed policy that declares a Vitest
  // pin the declared and installed Vitest do not have. The outcome it
  // produces: the staged G9 refuses the run instead of testing under an
  // undeclared test runner.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
    // The reviewed Vitest resolution profile is a policy input: the fixture
    // declares its own Vitest configuration so the gate under test, not the
    // policy preflight, refuses the mismatched pin.
    write("vitest.config.ts", 'export default { test: { include: ["test/**/*.test.ts", "src/**/*.test.ts"] } };\n');
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.tools.vitest = "0.0.0";
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.checked, /no staged test file was checked/u);
  assert.match(outcome.reason, /vitest pin expected 0\.0\.0, declared 5\.0\.5, installed 5\.0\.5/u);
});

test("a staged G9 refuses a Vitest executable that reports another version", (t) => {
  // The input that reaches the guard: a pnpm whose `exec vitest --version`
  // reports a version the reviewed policy does not declare. The outcome it
  // produces: the staged G9 refuses the run instead of testing under an
  // undeclared executable.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const shim = pnpmShim(repo, { vitest: "vitest/0.0.0 darwin-arm64 node-v26.5.0" });
  const result = repo.run(undefined, { PATH: `${shim}:${env.PATH}` }, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "policy-refusal");
  assert.match(outcome.reason, /vitest executable version mismatch: vitest\/0\.0\.0/u);
});

test("a staged G9 refuses a bootstrap policy with no declared test files", (t) => {
  // The input that reaches the guard: a reviewed policy that declares no test
  // file pattern. The outcome it produces: the staged G9 refuses the run
  // instead of selecting test files from an undeclared inventory.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.test.files = [];
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "incomplete-report");
  assert.match(outcome.reason, /invalid bootstrap tool\/test policy/u);
});

test("a staged G9 reports a missing tool instead of a pass", (t) => {
  // The input that reaches the guard: a PATH without the pinned pnpm. The
  // outcome it produces: the staged G9 reports the missing tool and fails.
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    stagedG9Stage({ root, write });
  });
  const result = repo.run(undefined, { PATH: gitOnlyPath(repo) }, ["--stage", "pre-commit"], () => {
    repo.write("test/value.test.ts", greenStagedTest);
    repo.git("add", "test/value.test.ts");
  });
  assert.equal(result.status, 1, result.output);
  const outcome = result.receipt.results[0];
  assert.equal(outcome.status, "fail");
  assert.equal(outcome.kind, "missing-tool");
  assert.match(outcome.reason, /missing tool: pnpm/u);
});

test("a local full run refuses a pull-request reference that names another branch", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
  });
  const result = repo.run(undefined, { HEAD_REF: "ticket/demo-99" }, ["--stage", "pre-pr"]);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /HEAD_REF does not match the local branch/u);
});

test("a declared partial stage may not declare a whole-repository scope", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages["pre-commit"].scope = "full";
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"]);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /partial feedback must be staged/u);
});

test("a declared stage must declare a scope", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    delete bootstrap.stages["pre-commit"].scope;
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"]);
  assert.notEqual(result.status, 0);
  assert.match(result.output, /invalid scope/u);
});

test("a stage without a reviewed declaration never yields the full bar", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    // The policy declares no stage inventory at all: the built-in inventory
    // is the fallback, and the fallback is never a full bar.
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    delete bootstrap.stages;
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const binary = trivyFixture(repo, emptyTrivyReport);
  const result = repo.run(undefined, { TRIVY_BIN: binary }, ["--stage", "pre-commit"]);
  assert.equal(result.receipt.stage, "pre-commit");
  assert.equal(result.receipt.feedback, "partial");
  assert.equal(result.receipt.satisfiesFullBar, false);
  assert.notEqual(result.receipt.verdict, "pass");
});

test("the full local pre-PR run and the CI run must declare one gate inventory", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    // The CI stage declares a different inventory from the local pre-PR
    // stage: one policy, two hosts, is a refusal, not a pass.
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages.ci.gates = ["G1", "G2"];
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const binary = trivyFixture(repo, emptyTrivyReport);
  const local = repo.run(undefined, { TRIVY_BIN: binary }, ["--stage", "pre-pr"]);
  assert.equal(local.status, 1, local.output);
  assert.match(local.output, /must declare one gate inventory/u);
  assert.equal(local.receipt.errorKind, "policy-refusal");
  const remote = repo.run(undefined, { TRIVY_BIN: binary }, ["--stage", "ci"]);
  assert.equal(remote.status, 1, remote.output);
  assert.match(remote.output, /declared full but omits G3, G4, G5, G6, G7, G8, G9, G10, G11/u);
  assert.equal(remote.receipt.errorKind, "skipped-required-work");
  // The two hosts' profiles differ exactly because their declarations do.
  assert.notEqual(local.receipt.profile.policy, remote.receipt.profile.policy);
  assert.equal(local.receipt.profile.driver, remote.receipt.profile.driver);
  assert.equal(local.receipt.profile.tools, remote.receipt.profile.tools);
});

test("a stage inventory that names a gate twice fails complete result accounting", (t) => {
  const repo = fixture(t, ({ root, write }) => {
    completePreCommitModel({ root, write });
    write("tsconfig.json", cleanTypeScriptPolicy);
    const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    bootstrap.stages["pre-commit"].gates = ["G3", "G3"];
    write(".superman/ci/bootstrap.json", `${JSON.stringify(bootstrap, null, 2)}\n`);
  });
  const result = repo.run(undefined, {}, ["--stage", "pre-commit"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Incomplete result accounting: 2 result\(s\) for 2 selected gate\(s\)/u);
  assert.equal(result.receipt.errorKind, "incomplete-report");
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

/**
 * A stand-in for the pinned Trivy binary. The scan policy is untouched; only
 * the reported outcome varies, so each failure mode is exercised in isolation.
 */
function trivyFixture(
  repo: { root: string },
  scan: (argv: string[]) => { report: string; status: number; stderr?: string },
) {
  const binary = join(repo.root, ".git/trivy-fixture");
  writeFileSync(
    binary,
    `#!${process.execPath}\nimport { writeFileSync } from "node:fs";\nif (process.argv.includes("--version")) { console.log("Version: 0.76.1"); process.exit(0); }\nconst outcome = (${scan.toString()})(process.argv.slice(2));\nif (outcome.report) console.log(outcome.report);\nif (outcome.stderr) console.error(outcome.stderr);\nprocess.exit(outcome.status);\n`,
    { mode: 0o755 },
  );
  return binary;
}

const emptyTrivyReport = () => ({
  report: JSON.stringify({ CreatedAt: new Date().toISOString(), Results: [] }),
  status: 0,
});

test("raw G11 routes every required scanner and propagates a finding", (t) => {
  const repo = fixture(t);
  const binary = trivyFixture(repo, () => ({
    report: JSON.stringify({
      CreatedAt: new Date().toISOString(),
      Results: [{ Target: ".", Vulnerabilities: [{ Severity: "CRITICAL", VulnerabilityID: "TEST-0001" }] }],
    }),
    status: 1,
    stderr: "planted security finding",
  }));
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /planted security finding/u);
  assert.match(result.output, /Trivy reported 1 HIGH\/CRITICAL finding/u);
  assert.equal(result.receipt.tools.trivy.actual, "0.76.1");
  assert.equal(result.receipt.results[0].kind, "failed-command");
});

test("a missing local tool fails the full result instead of counting as success", (t) => {
  const repo = fixture(t);
  const result = repo.run("G11", { TRIVY_BIN: join(repo.root, ".git/absent-trivy") });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /missing tool/u);
  assert.equal(result.receipt.results[0].kind, "missing-tool");
  assert.equal(result.receipt.verdict, "fail");
});

test("an ignored tool failure fails the full result", (t) => {
  const repo = fixture(t);
  const binary = trivyFixture(repo, () => ({
    report: JSON.stringify({ CreatedAt: new Date().toISOString(), Results: [] }),
    status: 3,
    stderr: "planted tool failure",
  }));
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /trivy fs failed \(3\)/u);
  assert.equal(result.receipt.results[0].kind, "failed-command");
  assert.equal(result.receipt.verdict, "fail");
});

test("an incomplete report fails the full result", (t) => {
  const repo = fixture(t);
  const binary = trivyFixture(repo, () => ({ report: "not a report", status: 0 }));
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Trivy produced no readable JSON report/u);
  assert.equal(result.receipt.results[0].kind, "incomplete-report");
  assert.equal(result.receipt.verdict, "fail");
});

test("a stale report fails the full result", (t) => {
  const repo = fixture(t);
  const binary = trivyFixture(repo, () => ({
    report: JSON.stringify({ CreatedAt: "2020-01-01T00:00:00.000Z", Results: [] }),
    status: 0,
  }));
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Trivy report is stale/u);
  assert.equal(result.receipt.results[0].kind, "stale-report");
  assert.equal(result.receipt.verdict, "fail");
});

test("a full local scan reports its findings instead of a bare pass", (t) => {
  const repo = fixture(t);
  const binary = trivyFixture(repo, emptyTrivyReport);
  const result = repo.run("G11", { TRIVY_BIN: binary });
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.receipt.results[0].findings, { total: 0, bySeverity: {} });
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
  assert.equal(JSON.parse(readFileSync(receipt, "utf8")).verdict, "partial-feedback");
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
