// Critical case: policy-selection-and-result-completeness.
// Declared critical module: .superman/ci/raw-gates.ts
//
// The raw driver selects the gates a stage may run and records exactly one
// result per selected gate. Two false greens live here: a scoped run that
// claims the full bar, and a policy preflight that fails while the remaining
// gates are still reported as anything other than failed. The driver is a
// process, so the case runs it in-process against a fixture repository and
// reads the receipt it wrote.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/**
 * The Git and forge identity a raw driver must not inherit from the caller,
 * plus the branch this run is about. The returned function puts the caller's
 * environment back.
 */
function isolate(values: Record<string, string>): () => void {
  const saved = new Map<string, string | undefined>();
  const apply = (key: string, value: string | undefined) => {
    if (!saved.has(key)) saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  for (const key of Object.keys(process.env)) if (/^(?:GIT_|GITHUB_|GH_)/u.test(key)) apply(key, undefined);
  for (const [key, value] of Object.entries(values)) apply(key, value);
  return () => {
    for (const [key, value] of saved) apply(key, value);
  };
}

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

/** What the raw driver decided about a fixture revision. */
type Decision = {
  exitCode: number | string | null | undefined;
  output: string;
  receipt: Record<string, unknown> | undefined;
};

/** The receipt the driver published, if it published one. */
function readReceipt(path: string): Record<string, unknown> | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>) : undefined;
}

/** Run the raw driver over a fixture revision and capture its verdict and receipt. */
async function drive(repo: { root: string; receiptPath: string }, branch: string, gate: string): Promise<Decision> {
  if (!canChangeDirectory()) {
    const result = spawnSync(
      process.execPath,
      [new URL("../raw-gates.ts", import.meta.url).pathname, "--gate", gate, "--receipt", repo.receiptPath],
      {
        cwd: repo.root,
        env: { ...fixtureEnvironment(), HEAD_REF: branch, ...{} },
        encoding: "utf8",
        shell: false,
        timeout: 120_000,
      },
    );
    return {
      exitCode: result.status,
      output: `${result.stdout}${result.stderr}`,
      // Only the driver's own receipt location is read back; a refused
      // receipt path publishes nothing there.
      receipt: readReceipt(repo.receiptPath),
    };
  }
  const previousCwd = process.cwd();
  const previousArgv = process.argv;
  const previousExitCode = process.exitCode;
  const restoreEnv = isolate({ HEAD_REF: branch });
  const lines: string[] = [];
  const record = (...args: unknown[]) => lines.push(args.map((value) => String(value)).join(" "));
  const out = vi.spyOn(console, "log").mockImplementation(record);
  const err = vi.spyOn(console, "error").mockImplementation(record);
  try {
    process.chdir(repo.root);
    process.argv = [
      process.execPath,
      new URL("../raw-gates.ts", import.meta.url).pathname,
      "--gate",
      gate,
      "--receipt",
      repo.receiptPath,
    ];
    vi.resetModules();
    await import("../raw-gates.ts");
    return {
      exitCode: process.exitCode ?? 0,
      output: lines.join("\n"),
      receipt: existsSync(repo.receiptPath)
        ? (JSON.parse(readFileSync(repo.receiptPath, "utf8")) as Record<string, unknown>)
        : undefined,
    };
  } finally {
    out.mockRestore();
    err.mockRestore();
    process.chdir(previousCwd);
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
    restoreEnv();
  }
}

describe("the selected gate inventory", () => {
  test("a scoped run records one result for its one selected gate and never claims the full bar", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.commit();

    const decision = await drive(repo, "spec/demo", "G9");

    expect(decision.exitCode).toBe(0);
    expect(decision.receipt?.scope).toEqual(["G9"]);
    expect(decision.receipt?.results).toEqual([{ gate: "G9", status: "n/a", reason: "spec-kind" }]);
    expect(decision.receipt?.satisfiesFullBar).toBe(false);
    expect(decision.receipt?.verdict).toBe("partial-feedback");
  }, 120_000);

  test("the receipt binds the revisions the run actually evaluated", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const headSha = repo.commit();

    const decision = await drive(repo, "spec/demo", "G9");

    expect(decision.receipt?.baseSha).toBe(repo.baseSha);
    expect(decision.receipt?.evaluatedSha).toBe(headSha);
    expect(decision.receipt?.headSha).toBe(headSha);
    expect(decision.receipt?.branch).toBe("spec/demo");
    expect(decision.receipt?.inputIntegrity).toEqual({ status: "pass", scope: "gate-inputs" });
    expect(decision.receipt?.behaviorReplay).toBeUndefined();
  }, 120_000);
});

describe("a policy preflight that fails", () => {
  test("every selected gate is failed with the refusal that blocked it", async () => {
    const repo = fixture(fixtureContext(), "ticket/demo-01");
    repo.write(
      "tsconfig.json",
      '{"compilerOptions":{"strict":true,"target":"ESNext","module":"NodeNext","noEmit":true,"allowImportingTsExtensions":true,"types":["node"]},"include":["src/**/*.ts","test/**/*.ts",".superman/ci/**/*.ts"]}\n',
    );
    repo.commit();

    const decision = await drive(repo, "ticket/demo-01", "G9");

    expect(decision.exitCode).toBe(1);
    expect(decision.receipt?.verdict).toBe("fail");
    expect(decision.receipt?.policyPreflight).toMatchObject({ gate: "G4", status: "fail" });
    const results = decision.receipt?.results as { gate: string; status: string }[] | undefined;
    expect(results).toHaveLength(1);
    expect(results?.[0]).toMatchObject({
      gate: "G9",
      status: "fail",
      blockedBy: "G4/G8 policy preflight",
    });
  }, 120_000);
});
