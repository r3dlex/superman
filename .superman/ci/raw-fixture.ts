// Shared fixtures exercise only the protected raw-gates process seam.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { fixtureEnvironment } from "./fixture-env.ts";

// The fixture's own directory, read the way both runtimes read it: the
// Deno twin loads this module too, and under Deno the dirname is optional.
// The value is the same one the Node idiom names.
const here = dirname(fileURLToPath(import.meta.url));
const entrypoint = join(here, "raw-gates.ts");
const modules = resolve(here, "../../node_modules");
const isolated = fixtureEnvironment();
/**
 * The bound a fixture's gate child runs under. It is below the suite's own
 * timeout on purpose: a child that outlives the suite makes the suite time
 * out, and a timeout is an ambiguous mutation outcome that the gate refuses.
 */
export const GATE_CHILD_TIMEOUT = 45_000;

const pins = {
  archgate: "0.61.0",
  tsrs: "0.20.1-ts7.1.0-beta",
  typescript: "7.1.0-beta",
  biome: "2.6.4",
  trivy: "0.76.1",
  pnpm: "12.16.1",
  node: "26",
  vitest: "5.0.5",
  knip: "6.43.0",
  jscpd: "5.4.2",
  stryker: "10.1.1",
};

/**
 * The approved-base repository a fixture starts from.
 *
 * Every fixture begins from the same repository: the approved base commit, its
 * files and its Git identity. It is built once per ticket kind and copied into
 * each fixture, so a fixture costs a copy and a branch instead of a Git
 * process for every step of its setup. The copy is exact — the same commit,
 * the same tree and the same identity — under a fresh working directory.
 */
type Template = { root: string; baseSha: string };
const templates = new Map<string, Template>();
const templateRoots: string[] = [];
process.on("exit", () => {
  for (const root of templateRoots) rmSync(root, { recursive: true, force: true });
});

/** Write a file into a repository root, creating the directories it needs. */
function writeIn(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

/**
 * Run a Git command in a repository root.
 *
 * The fixture's Git identity and its empty template directory are given to
 * every invocation. A commit needs an author, and an empty template keeps
 * `git init` from copying sample hooks the fixture never runs, so neither
 * costs a process of its own.
 *
 * The repository the command belongs to travels in the arguments, not only in
 * the working directory: `--git-dir` and `--work-tree` name the fixture's own
 * repository whichever directory the process happens to be in. A command that
 * lost its working directory would otherwise write into the repository under
 * test, which is the one repository a fixture must never touch.
 */
function gitIn(root: string, ...args: string[]): string {
  const repository = join(root, ".git");
  return execFileSync(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "init.templateDir=",
      "-c",
      "user.name=Raw Gate Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "--git-dir",
      repository,
      "--work-tree",
      root,
      ...args,
    ],
    {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    },
  );
}

/** Build the approved-base repository a fixture of this ticket kind starts from. */
function buildTemplate(kind: string): Template {
  const root = mkdtempSync(join(tmpdir(), "superman-raw-template-"));
  templateRoots.push(root);
  const write = (path: string, content: string) => writeIn(root, path, content);
  const git = (...args: string[]) => gitIn(root, ...args);
  git("init", "--quiet", "--initial-branch=main");
  // The identity belongs to the repository, not to the commands the fixture
  // runs: a commit made inside a fixture by any other means needs an author
  // too, and it finds one here.
  git("config", "user.name", "Raw Gate Fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(".gitignore", "node_modules\n.tools/\n");
  // The fixture's node_modules is the reviewed tree's, reached by a symlink.
  // A pnpm command that installed would rewrite that tree through the link,
  // so the fixture installs nothing: the reviewed tree's own script and
  // pnpmfile settings, and the dependency check that would start an install.
  write(".npmrc", "ignore-scripts=true\nignore-pnpmfile=true\nverify-deps-before-run=false\n");
  // Native pnpm 12's offline version probe also needs the provisioning lock.
  write("pnpm-lock.yaml", readFileSync(resolve(here, "../../pnpm-lock.yaml"), "utf8"));
  write(".scratch/demo/spec.md", "# Approved spec\n");
  write(".scratch/demo/issues/01-feature.md", `# Ticket\n\n**Kind:** ${kind}\n`);
  write(
    "package.json",
    JSON.stringify({
      type: "module",
      packageManager: "pnpm@12.16.1",
      devDependencies: JSON.parse(readFileSync(resolve(here, "../../package.json"), "utf8")).devDependencies,
    }),
  );
  write(
    "tsconfig.json",
    '{"compilerOptions":{"strict":true,"target":"ESNext","module":"NodeNext","noEmit":true,"allowImportingTsExtensions":true,"types":["node"]},"include":["src/**/*.ts","test/**/*.ts"]}\n',
  );
  write(
    "vitest.config.ts",
    "export default { test: { include: ['test/**/*.test.ts', 'src/**/*.test.ts'], testTimeout: 1000 } };\n",
  );
  write(
    ".superman/ci/bootstrap.json",
    JSON.stringify({
      version: 1,
      tools: pins,
      policyInputs: ["tsconfig.json", "vitest.config.ts"],
      test: { files: ["test/**/*.test.ts", "src/**/*.test.ts"], support: ["test/**"] },
    }),
  );
  write("src/value.ts", "export const value = 0;\n");
  git("add", "--all");
  git("commit", "--quiet", "-m", "approved base");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  const built: Template = { root, baseSha: git("rev-parse", "HEAD").trim() };
  templates.set(kind, built);
  return built;
}

export function fixture(t: TestContext, branch = "ticket/demo-01", kind = "behavior", modulesDir = modules) {
  // The template is built once per ticket kind and kept for the rest of the
  // run. A miss builds it and stores it, so the second fixture of a kind
  // copies a repository instead of building one.
  const template = templates.get(kind) ?? buildTemplate(kind);
  const root = mkdtempSync(join(tmpdir(), "superman-raw-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // The copy is the approved base: the same commit, the same tree and the
  // same identity, under this fixture's own working directory.
  cpSync(template.root, root, { recursive: true, verbatimSymlinks: true });
  const write = (path: string, content: string) => writeIn(root, path, content);
  const git = (...args: string[]) => gitIn(root, ...args);
  const baseSha = template.baseSha;
  git("switch", "--quiet", "-c", branch);
  symlinkSync(modulesDir, join(root, "node_modules"), "dir");
  // A developer store is optional. CI puts the pinned pnpm on PATH; skipping the
  // shim left .tools absent and G11 died on ENOENT instead of the gate refusal.
  const preferred =
    process.env.SUPERMAN_TEST_PNPM ??
    join(homedir(), ".local/share/pnpm/.tools/pnpm/12.16.1/node_modules/pnpm/bin/pnpm.mjs");
  const pnpmCli = existsSync(preferred)
    ? preferred
    : execFileSync("which", ["pnpm"], { env: isolated, encoding: "utf8", shell: false }).trim();
  mkdirSync(join(root, ".tools"));
  const launch = pnpmCli.endsWith(".mjs")
    ? `spawnSync(process.execPath, [${JSON.stringify(pnpmCli)}, ...process.argv.slice(2)], {env:process.env,stdio:'inherit',shell:false})`
    : `spawnSync(${JSON.stringify(pnpmCli)}, process.argv.slice(2), {env:process.env,stdio:'inherit',shell:false})`;
  writeFileSync(
    join(root, ".tools/pnpm-real"),
    `#!${process.execPath}\nimport { spawnSync } from 'node:child_process';\nconst result = ${launch};\nif (result.error) throw result.error;\nprocess.exit(result.status ?? 1);\n`,
    { mode: 0o755 },
  );
  symlinkSync(join(root, ".tools/pnpm-real"), join(root, ".tools/pnpm"));
  const receiptPath = join(root, ".git", "receipt.json");
  const runGate = (
    gate: string,
    args: string[] = [],
    extraEnv: Record<string, string | undefined> = {},
    timeout = GATE_CHILD_TIMEOUT,
  ) => {
    const result = spawnSync(process.execPath, [entrypoint, "--gate", gate, "--receipt", receiptPath, ...args], {
      cwd: root,
      env: { ...isolated, PATH: `${join(root, ".tools")}${delimiter}${isolated.PATH}`, HEAD_REF: branch, ...extraEnv },
      encoding: "utf8",
      shell: false,
      timeout,
    });
    assert.ifError(result.error);
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
      receipt: existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, "utf8")) : undefined,
    };
  };
  return {
    root,
    write,
    git,
    baseSha,
    receiptPath,
    runGate,
    commit() {
      git("add", "--all");
      git("commit", "--quiet", "--allow-empty", "-m", "candidate");
      return git("rev-parse", "HEAD").trim();
    },
    run(args: string[] = [], extraEnv: Record<string, string | undefined> = {}) {
      return runGate("G9", args, extraEnv, 30_000);
    },
  };
}

export function interceptPnpm(root: string, afterRun: string) {
  const executable = join(root, ".tools/pnpm");
  const actual = existsSync(executable)
    ? realpathSync(executable)
    : execFileSync("which", ["pnpm"], { env: isolated, encoding: "utf8" }).trim();
  rmSync(executable, { force: true });
  mkdirSync(dirname(executable), { recursive: true });
  writeFileSync(
    executable,
    `#!${process.execPath}\nimport { spawnSync } from 'node:child_process';\nimport { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';\nconst args = process.argv.slice(2);\nconst result = spawnSync(${JSON.stringify(actual.endsWith(".mjs") ? process.execPath : actual)}, ${actual.endsWith(".mjs") ? `[${JSON.stringify(actual)}, ...args]` : "args"}, { env: process.env, encoding: 'utf8', shell: false });\nif (result.error) throw result.error;\nconst reportPath = args[args.indexOf('--outputFile') + 1];\n${afterRun}\nprocess.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); process.exit(result.status ?? 1);\n`,
    { mode: 0o755 },
  );
}
