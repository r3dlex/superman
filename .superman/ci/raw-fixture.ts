// Shared fixtures exercise only the protected raw-gates process seam.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
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
import { fixtureEnvironment } from "./fixture-env.ts";

const entrypoint = join(import.meta.dirname, "raw-gates.ts");
const modules = resolve(import.meta.dirname, "../../node_modules");
const isolated = fixtureEnvironment();
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

export function fixture(t: TestContext, branch = "ticket/demo-01", kind = "behavior") {
  const root = mkdtempSync(join(tmpdir(), "superman-raw-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      env: isolated,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Raw Gate Fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(".gitignore", "node_modules\n.tools/\n");
  // Native pnpm 12's offline version probe also needs the provisioning lock.
  write("pnpm-lock.yaml", readFileSync(resolve(import.meta.dirname, "../../pnpm-lock.yaml"), "utf8"));
  write(".scratch/demo/spec.md", "# Approved spec\n");
  write(".scratch/demo/issues/01-feature.md", `# Ticket\n\n**Kind:** ${kind}\n`);
  write(
    "package.json",
    JSON.stringify({
      type: "module",
      packageManager: "pnpm@12.16.1",
      devDependencies: JSON.parse(readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf8"))
        .devDependencies,
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
  const baseSha = git("rev-parse", "HEAD").trim();
  git("switch", "--quiet", "-c", branch);
  symlinkSync(modules, join(root, "node_modules"), "dir");
  const pnpmCli =
    process.env.SUPERMAN_TEST_PNPM ??
    join(homedir(), ".local/share/pnpm/.tools/pnpm/12.16.1/node_modules/pnpm/bin/pnpm.mjs");
  if (existsSync(pnpmCli)) {
    mkdirSync(join(root, ".tools"));
    writeFileSync(
      join(root, ".tools/pnpm-real"),
      `#!${process.execPath}\nimport { spawnSync } from 'node:child_process';\nconst result = spawnSync(process.execPath, [${JSON.stringify(pnpmCli)}, ...process.argv.slice(2)], {env:process.env,stdio:'inherit',shell:false});\nif (result.error) throw result.error;\nprocess.exit(result.status ?? 1);\n`,
      { mode: 0o755 },
    );
    symlinkSync(join(root, ".tools/pnpm-real"), join(root, ".tools/pnpm"));
  }
  const receiptPath = join(root, ".git", "receipt.json");
  const runGate = (
    gate: string,
    args: string[] = [],
    extraEnv: Record<string, string | undefined> = {},
    timeout = 600_000,
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
