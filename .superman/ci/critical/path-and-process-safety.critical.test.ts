// Critical case: path-and-process-safety.
// Declared critical module: .superman/ci/replay.ts
//
// The replay module owns the two boundaries a run can escape through: the
// child process it starts and the paths it writes. §8.3 requires fresh owned
// run/worker output paths, bounded processes and cleanup on
// failure/cancellation/timeout, and §5.4 requires a failed command to be
// rejected rather than absorbed. A defect here leaves a runaway process
// behind, writes into the repository the run is supposed to leave alone, or
// turns an unprovable replay into a quiet pass. Every expectation below is
// the reviewed policy's own wording, not a restatement of the implementation.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { describe, expect, onTestFinished, test } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { ownedIndexSnapshot, ownedSnapshot, replayBehavior, runOwned } from "../replay.ts";
import { fixtureContext } from "./fixture-context.ts";

/** Whether a process is still running. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for a process to disappear, and report whether it did.
 *
 * The wait is a second, not the suite's whole timeout. The group kill is
 * issued before the child returns, so a kill that works ends the grandchild
 * within milliseconds — six of them on an idle machine — and the wait only
 * ever runs out when the kill did not happen at all. That is the assertion
 * failing, and the mutant that removes the kill is killed for it; the wait
 * before that verdict is what the mutation budget of this case is spent on.
 * A longer wait buys nothing except the timeout it causes.
 */
async function gone(pid: number, milliseconds = 1_000): Promise<boolean> {
  const deadline = Date.now() + milliseconds;
  while (alive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  return !alive(pid);
}

/** End a process that is still running, whoever started it. */
function reap(pid: number): void {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process is already gone, which is the state this is called for.
  }
}

describe("the owned child process", () => {
  test("a child that outlives its timeout is killed with its whole process group", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const pidPath = join(repo.root, ".tools/grandchild.json");
    const script = join(repo.root, ".tools/hang.mjs");
    // The child leaves a grandchild behind in its own process group and then
    // never returns. Only a group-wide cleanup ends the grandchild.
    writeFileSync(
      script,
      'import { spawn } from "node:child_process";\n' +
        'import { writeFileSync } from "node:fs";\n' +
        'const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", shell: false });\n' +
        `writeFileSync(${JSON.stringify(pidPath)}, JSON.stringify(child.pid));\n` +
        "setInterval(() => {}, 1000);\n",
    );

    // The bound is short because the case costs what the bound costs: the
    // child has to hang long enough to be killed, and the whole point is
    // that the group kill ends it. A longer bound proves the same thing
    // more slowly — and the mutation budget this case's mutants are given
    // is derived from how long these tests take.
    const result = runOwned(process.execPath, [script], {
      cwd: repo.root,
      env: fixtureEnvironment(),
      encoding: "utf8",
      shell: false,
      timeout: 2_000,
    });

    // The grandchild is reaped whatever the assertion finds, and the
    // registration comes before the first assertion that can fail. A run in
    // which the group kill does not work would otherwise leave the process
    // behind for the rest of the measurement, and a machine full of them
    // measures more slowly than one without — which turns a slow run into a
    // timeout in a place that has nothing to do with the mutant under test.
    onTestFinished(() => {
      try {
        reap(Number(JSON.parse(readFileSync(pidPath, "utf8"))));
      } catch {
        // The pid was never written, so there is no grandchild to end.
      }
    });

    // The bounded process ends at its timeout and says so.
    expect(result.status).toBeNull();
    expect(result.signal).toBe("SIGKILL");
    expect((result.error as NodeJS.ErrnoException | undefined)?.code).toBe("ETIMEDOUT");
    // And nothing it started outlives it.
    const pid = Number(JSON.parse(readFileSync(pidPath, "utf8")));
    expect(pid).toBeGreaterThan(0);
    expect(await gone(pid)).toBe(true);
  }, 120_000);
});

describe("the owned snapshot paths", () => {
  test("an owned snapshot is materialised outside the repository and leaves the caller's index and refs untouched", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const temporary = mkdtempSync(join(tmpdir(), "superman-critical-"));
    onTestFinished(() => rmSync(temporary, { recursive: true, force: true }));
    const index = readFileSync(join(repo.root, ".git/index"), "utf8");
    const refs = repo.git("show-ref");

    const snapshot = ownedSnapshot(repo.root, temporary, "base", repo.baseSha, fixtureEnvironment());

    expect(snapshot).toBe(join(temporary, "base"));
    expect(snapshot.startsWith(`${temporary}${sep}`)).toBe(true);
    expect(snapshot.startsWith(`${repo.root}${sep}`)).toBe(false);
    expect(readFileSync(join(snapshot, "src/value.ts"), "utf8")).toBe("export const value = 0;\n");
    expect(readFileSync(join(repo.root, ".git/index"), "utf8")).toBe(index);
    expect(repo.git("show-ref")).toBe(refs);
    expect(repo.git("status", "--porcelain")).toBe("");
  }, 120_000);

  test("the staged snapshot is materialised outside the repository from the index, and the caller's index is untouched", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write("src/value.ts", "export const value = 1;\n");
    repo.git("add", "src/value.ts");
    const temporary = mkdtempSync(join(tmpdir(), "superman-critical-"));
    onTestFinished(() => rmSync(temporary, { recursive: true, force: true }));
    const index = readFileSync(join(repo.root, ".git/index"), "utf8");
    const refs = repo.git("show-ref");

    const snapshot = ownedIndexSnapshot(repo.root, temporary, "candidate", fixtureEnvironment());

    expect(snapshot).toBe(join(temporary, "candidate"));
    expect(snapshot.startsWith(`${temporary}${sep}`)).toBe(true);
    expect(snapshot.startsWith(`${repo.root}${sep}`)).toBe(false);
    expect(readFileSync(join(snapshot, "src/value.ts"), "utf8")).toBe("export const value = 1;\n");
    expect(readFileSync(join(repo.root, ".git/index"), "utf8")).toBe(index);
    expect(repo.git("show-ref")).toBe(refs);
  }, 120_000);
});

describe("a replay that cannot be proven", () => {
  test("an invalid bootstrap policy is refused by name", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const reviewed = readFileSync(join(repo.root, ".superman/ci/bootstrap.json"), "utf8");
    repo.write(
      ".superman/ci/bootstrap.json",
      JSON.stringify({
        version: 1,
        tools: { node: "26" },
        policyInputs: [],
        test: { files: ["test/**/*.test.ts"], support: ["test/**"] },
      }),
    );
    const brokenBase = repo.commit();
    repo.write(".superman/ci/bootstrap.json", reviewed);
    const headSha = repo.commit();
    const evidence: Record<string, unknown> = {};

    expect(() => replayBehavior(repo.root, brokenBase, headSha, fixtureEnvironment(), evidence, {})).toThrow(
      "G9: invalid bootstrap configuration",
    );
    expect(evidence.baseOutcome).toBeUndefined();
    expect(evidence.candidateOutcome).toBeUndefined();
  }, 120_000);

  test("a replay with no changed test file is refused, and its outcome is recorded as blocked", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write("README.md", "# Not a test file\n");
    const headSha = repo.commit();
    const evidence: Record<string, unknown> = {};

    expect(() => replayBehavior(repo.root, repo.baseSha, headSha, fixtureEnvironment(), evidence, {})).toThrow(
      "G9: no added or changed test files",
    );
    expect(evidence.tests).toEqual([]);
    expect(evidence.baseOutcome).toEqual({ status: "blocked" });
    expect(evidence.candidateOutcome).toEqual({ status: "blocked" });
  }, 120_000);
});
