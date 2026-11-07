// Critical case: coverage-inventory-and-floor-safety.
// Declared critical module: .superman/ci/coverage.ts
//
// The collector owns the reviewed coverage policy: the independent floor for
// every metric, the reviewed exclusion list, and the complete inventory of
// runtime code. A defect here lets uncovered runtime disappear from the
// denominator or lets the floor be lowered. The collector is a process, so the
// case runs it in-process against a fixture repository and reads what it
// decided.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/** The repository this case is written against. */
const repository = resolve(import.meta.dirname, "../../..");

/**
 * The Git and forge identity a collector process must not inherit from the
 * caller. The returned function puts the caller's environment back.
 */
function isolate(): () => void {
  const saved = new Map<string, string | undefined>();
  for (const key of Object.keys(process.env)) {
    if (!/^(?:GIT_|GITHUB_|GH_)/u.test(key)) continue;
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

/** The reviewed coverage policy of a fixture repository. */
function coveragePolicy(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    minimum: { lines: 90, statements: 90, branches: 90, functions: 90 },
    target: 100,
    node: [".superman/ci/**/*.ts"],
    product: ["src/value.ts"],
    candidate: { root: ".scratch/demo", patterns: [".scratch/demo/**/*.ts"], members: [], suites: [] },
    deno: {
      root: ".superman/ci",
      patterns: [".superman/ci/**/*.ts"],
      members: [],
      collector: ".superman/ci/coverage.ts",
      receipt: ".superman-ci/coverage-deno-*/coverage-receipt.json",
    },
    // The reviewed exclusion list comes from the repository's own policy, so
    // reviewing a new test-only exclusion does not silently break this case.
    exclude: JSON.parse(readFileSync(join(repository, ".superman/ci/coverage.json"), "utf8")).exclude,
    tests: [".superman/ci/*.test.ts"],
    ...overrides,
  });
}

/** The pinned tools the collector verifies before it measures anything. */
function bootstrap(): string {
  return JSON.stringify({
    version: 1,
    tools: { node: "26", c8: "12.0.0", vitest: "5.0.5", coverageV8: "5.0.5" },
    policyInputs: ["tsconfig.json", "vitest.config.ts"],
    test: { files: ["test/**/*.test.ts"], support: ["test/**"] },
  });
}

/** What the coverage collector decided about a fixture repository. */
type Decision = { exitCode: number | string | null | undefined; output: string };

/**
 * Whether this worker may resolve the module's inputs against a working
 * directory. A worker pool that cannot change the working directory runs the
 * module in its own process instead.
 */
function canChangeDirectory(): boolean {
  try {
    process.chdir(process.cwd());
    return true;
  } catch {
    return false;
  }
}

/** Run the coverage collector over a fixture repository and capture its verdict. */
async function measure(repo: { root: string }): Promise<Decision> {
  if (!canChangeDirectory()) {
    const result = spawnSync(process.execPath, [new URL("../coverage.ts", import.meta.url).pathname], {
      cwd: repo.root,
      env: fixtureEnvironment(),
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    });
    return { exitCode: result.status, output: `${result.stdout}${result.stderr}` };
  }
  const previousCwd = process.cwd();
  const previousArgv = process.argv;
  const previousExitCode = process.exitCode;
  const restoreEnv = isolate();
  const lines: string[] = [];
  const record = (...args: unknown[]) => lines.push(args.map((value) => String(value)).join(" "));
  const out = vi.spyOn(console, "log").mockImplementation(record);
  const err = vi.spyOn(console, "error").mockImplementation(record);
  try {
    process.chdir(repo.root);
    process.argv = [process.execPath, new URL("../coverage.ts", import.meta.url).pathname];
    vi.resetModules();
    await import("../coverage.ts");
    return { exitCode: process.exitCode, output: lines.join("\n") };
  } finally {
    out.mockRestore();
    err.mockRestore();
    process.chdir(previousCwd);
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
    restoreEnv();
  }
}

describe("the independent coverage floor", () => {
  test("a floor below ninety percent in any metric is refused", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".superman/ci/bootstrap.json", bootstrap());
    repo.write(
      ".superman/ci/coverage.json",
      coveragePolicy({ minimum: { lines: 89, statements: 90, branches: 90, functions: 90 } }),
    );
    repo.write("src/unmodeled.ts", "export const unmodeled = 1;\n");
    repo.commit();

    const decision = await measure(repo);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Coverage policy requires at least 90% in every metric and a 100% target");
  }, 120_000);

  test("a target below one hundred percent is refused", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".superman/ci/bootstrap.json", bootstrap());
    repo.write(".superman/ci/coverage.json", coveragePolicy({ target: 90 }));
    repo.write("src/unmodeled.ts", "export const unmodeled = 1;\n");
    repo.commit();

    const decision = await measure(repo);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Coverage policy requires at least 90% in every metric and a 100% target");
  }, 120_000);
});

describe("the reviewed coverage inventory", () => {
  test("an exclusion list that is not the reviewed one is refused", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".superman/ci/bootstrap.json", bootstrap());
    repo.write(".superman/ci/coverage.json", coveragePolicy({ exclude: ["**/*.test.ts"] }));
    repo.write("src/unmodeled.ts", "export const unmodeled = 1;\n");
    repo.commit();

    const decision = await measure(repo);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Coverage exclusions require reviewed test-only modeling");
  }, 120_000);

  test("a source file no declared scope models is refused by name", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".superman/ci/bootstrap.json", bootstrap());
    repo.write(".superman/ci/coverage.json", coveragePolicy());
    repo.write("src/unmodeled.ts", "export const unmodeled = 1;\n");
    repo.commit();

    const decision = await measure(repo);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Coverage scope does not model source file: src/unmodeled.ts");
  }, 120_000);
});
