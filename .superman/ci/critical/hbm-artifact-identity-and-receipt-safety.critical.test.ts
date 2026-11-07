// Critical case: hbm-artifact-identity-and-receipt-safety.
// Declared critical module: .superman/ci/raw-gates.ts
//
// A continuous-integration run is only evidence about the head it claims to
// have tested when the forge's head/base identity matches the resolved
// revisions and the tested merge is the recorded base/head integration. The
// receipt is the only artifact the run publishes, so it must not be able to
// overwrite tracked input or Git metadata. The driver is a process, so the
// case runs it in-process against a fixture repository.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/**
 * The Git and forge identity a raw driver must not inherit from the caller,
 * plus the branch and pull-request identity this run is about. The returned
 * function puts the caller's environment back.
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

/** What a raw driver run is about. */
type Run = { branch: string; gate: string; env?: Record<string, string>; receiptPath?: string };

/** The receipt the driver published, if it published one. */
function readReceipt(path: string): Record<string, unknown> | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>) : undefined;
}

/** Run the driver in its own process, for a pool that cannot change directories. */
function driveAsProcess(repo: { root: string; receiptPath: string }, run: Run): Decision {
  const result = spawnSync(
    process.execPath,
    [
      new URL("../raw-gates.ts", import.meta.url).pathname,
      "--gate",
      run.gate,
      "--receipt",
      run.receiptPath ?? repo.receiptPath,
    ],
    {
      cwd: repo.root,
      env: { ...fixtureEnvironment(), HEAD_REF: run.branch, ...(run.env ?? {}) },
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

/** Run the raw driver over a fixture revision and capture its verdict and receipt. */
async function drive(repo: { root: string; receiptPath: string }, run: Run): Promise<Decision> {
  const { branch, gate } = run;
  const receiptPath = run.receiptPath ?? repo.receiptPath;
  if (!canChangeDirectory()) return driveAsProcess(repo, run);
  const previousCwd = process.cwd();
  const previousArgv = process.argv;
  const previousExitCode = process.exitCode;
  const restoreEnv = isolate({ HEAD_REF: branch, ...run.env });
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
      receiptPath,
    ];
    vi.resetModules();
    await import("../raw-gates.ts");
    return {
      exitCode: process.exitCode ?? 0,
      output: lines.join("\n"),
      // Only the driver's own receipt location is read back; a refused
      // receipt path publishes nothing there.
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

/** The pull-request payload a forge publishes for a synchronize event. */
function pullRequest(headSha: string, ref: string, baseSha: string): string {
  return JSON.stringify({ pull_request: { head: { sha: headSha, ref }, base: { sha: baseSha } } });
}

describe("the head/base/merge identity a continuous-integration run is bound to", () => {
  test("a payload whose base is not the resolved base is refused by name", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const headSha = repo.commit();
    const foreignBase = "0".repeat(40);
    const eventPath = join(repo.root, "event.json");
    writeFileSync(eventPath, pullRequest(headSha, "spec/demo", foreignBase));

    const decision = await drive(repo, {
      branch: "spec/demo",
      gate: "G9",
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: headSha,
      },
    });

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain(`G9: CI H/B/M identity mismatch: base.sha=${foreignBase} != ${repo.baseSha}`);
    const results = decision.receipt?.results as { gate: string; status: string }[] | undefined;
    expect(decision.receipt?.verdict).toBe("fail");
    expect(results).toHaveLength(1);
    expect(results?.[0]).toMatchObject({ gate: "G9", status: "fail" });
  }, 120_000);

  test("a tested merge that is not the recorded base/head integration is refused", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const headSha = repo.commit();
    // A merge whose parents are the head and then the base: the integration
    // the run tested is not the recorded base/head one.
    const tree = repo.git("rev-parse", `${headSha}^{tree}`).trim();
    const mergeSha = repo.git("commit-tree", tree, "-p", headSha, "-p", repo.baseSha, "-m", "wrong order").trim();
    repo.git("update-ref", "HEAD", mergeSha);
    const eventPath = join(repo.root, "event.json");
    writeFileSync(eventPath, pullRequest(headSha, "spec/demo", repo.baseSha));

    const decision = await drive(repo, {
      branch: "spec/demo",
      gate: "G9",
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: mergeSha,
      },
    });

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("G9: tested merge is not the recorded base/head integration");
    expect(decision.receipt?.verdict).toBe("fail");
  }, 120_000);
});

describe("receipt safety", () => {
  test("a receipt may not overwrite a tracked input of the repository", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.commit();

    const decision = await drive(repo, {
      branch: "spec/demo",
      gate: "G9",
      receiptPath: join(repo.root, "package.json"),
    });

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Receipt cannot overwrite tracked inputs, Git metadata or aliases");
    expect(decision.receipt).toBeUndefined();
  }, 120_000);

  test("a receipt may not overwrite the Git metadata of the repository", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.commit();

    const decision = await drive(repo, { branch: "spec/demo", gate: "G9", receiptPath: join(repo.root, ".git") });

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("Receipt cannot overwrite tracked inputs, Git metadata or aliases");
    expect(decision.receipt).toBeUndefined();
  }, 120_000);
});
