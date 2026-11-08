// Public process suite for the Deno operational root's path and process
// safety boundary.
//
// The suite is Node-hosted on purpose: it drives the pinned Deno runtime as a
// child and compares what the Deno sibling observes against what the Node
// original observes for the same fixture. Every fixture writes to a
// `mkdtempSync` root; nothing is written into the repository tree.
//
// The two boundaries below are the ones a single mutation can turn into a run
// that never ends: the receipt's parent walk and the owned child's bound.
// Both are proven the way the Node original's critical case proves them — the
// shipped source runs, the observable outcome is asserted, and every run is
// bounded, so a walk that never ends is a failed expectation rather than a
// hung suite.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runOwned } from "../../ci/replay.ts";
import { denoPermissions } from "../exec.ts";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const denoRoot = join(repository, ".superman/deno-bootstrap");

/** The explicit runtime identity. An implicit PATH lookup is not a launch. */
function explicitDeno(): string {
  const binary = process.env.SUPERMAN_DENO_BIN;
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  return binary;
}

/** Whether a process is still running. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Wait for a process to disappear, and report whether it did. */
async function gone(pid: number, milliseconds = 5_000): Promise<boolean> {
  const deadline = Date.now() + milliseconds;
  while (alive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  return !alive(pid);
}

/**
 * The twin's own `safeReceipt` declaration, read out of the shipped module.
 *
 * The declaration is module-private, so the fixture lifts it out of the
 * module's own source text and runs it against a chosen existence test. The
 * walk's stopping point is then observable, which is the property the walk
 * has to carry.
 */
function safeReceiptSource(): string {
  const source = readFileSync(join(denoRoot, "raw-gates.ts"), "utf8");
  const start = source.indexOf("function safeReceipt(");
  if (start < 0) throw new Error("the twin's safeReceipt declaration was not found");
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error("the twin's safeReceipt declaration has no closing brace");
  const declaration = source.slice(start, end + 3);
  if (!declaration.includes("existsSync(parent)")) {
    throw new Error("the twin's safeReceipt declaration no longer walks its parents by existence");
  }
  return declaration;
}

/**
 * The probe that runs the twin's declaration against a chosen existence test.
 *
 * The probe records every path the existence test is asked about, so the
 * walk's stopping point is the last path it asked about. The receipt path
 * itself is asked about after the walk, so it is not part of the walk.
 */
const PROBE = `import { existsSync as nodeExistsSync, lstatSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const walked: string[] = [];
const mode = process.argv[3];
const requested = resolve(process.argv[2]);

function existsSync(path: string): boolean {
  if (path !== requested) walked.push(path);
  if (mode === "no-ancestor") return false;
  if (mode === "inverted") return !nodeExistsSync(path);
  return nodeExistsSync(path);
}
function realpathSync(path: string): string {
  return path;
}
function git(_args: string[]): string {
  return "/probe/git";
}

DECLARATION

let outcome: Record<string, unknown>;
try {
  outcome = { destination: safeReceipt(requested) };
} catch (error) {
  outcome = { message: error instanceof Error ? error.message : String(error) };
}
console.log(JSON.stringify({ outcome, walked }));
`;

/**
 * The paths the twin's receipt walk asked its existence test about.
 *
 * The walk runs in a child, so a walk that never ends is a bounded failure
 * rather than a hung suite. The probe reports the paths it asked about, and
 * the walk's stopping point is the last of them.
 */
function walkProbe(mode: "no-ancestor" | "inverted"): string[] {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-walk-"));
  try {
    const receipt = join(root, "receipt.json");
    writeFileSync(receipt, "{}\n");
    const probe = join(root, "probe.mts");
    writeFileSync(probe, PROBE.replace("DECLARATION", safeReceiptSource()));
    const result = runOwned(process.execPath, [probe, receipt, mode], {
      cwd: root,
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
    });
    assert.equal(result.error, undefined, `the walk probe did not finish: ${result.error?.message ?? ""}`);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const report = JSON.parse(result.stdout.trim()) as { walked: string[] };
    return report.walked;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The grandchild that outlives its parent unless the group is killed. */
const GRANDCHILD = `await Deno.writeTextFile(Deno.args[1]!, String(Deno.pid));
await new Promise((resolve) => setTimeout(resolve, 30000));
await Deno.writeTextFile(Deno.args[0]!, "alive");
`;

/** The middle child that owns the grandchild. */
const MIDDLE = `import { denoPermissions, spawn } from "SEAM_URL";
const root = Deno.env.get("SUPERMAN_DRIVER_ROOT")!;
const deno = Deno.env.get("SUPERMAN_DRIVER_DENO")!;
spawn(deno, ["run", ...denoPermissions({ write: [root] }), root + "/grandchild.ts", root + "/descendant.txt", root + "/grandchild.pid"], {
  stdio: ["ignore", "pipe", "pipe"],
});
await new Promise(() => {});
`;

/** The driver that runs the twin's own owned-child helper. */
const DRIVER = `import { denoPermissions } from "SEAM_URL";
import { runOwned } from "REPLAY_URL";

const root = Deno.env.get("SUPERMAN_DRIVER_ROOT")!;
const deno = Deno.env.get("SUPERMAN_DRIVER_DENO")!;
const result = await runOwned(deno, ["run", ...denoPermissions({ write: [root], env: true, run: [deno] }), root + "/middle.ts"], { timeout: 3000 });
console.log(JSON.stringify({
  code: result.error?.code,
  message: result.error?.message,
  signal: result.signal,
  status: result.status,
}));
`;

test("the receipt's parent walk stops at the filesystem root when no ancestor exists", () => {
  const walked = walkProbe("no-ancestor");
  assert.ok(walked.length > 1, `the walk did not climb: ${JSON.stringify(walked)}`);
  const stop = walked.at(-1) ?? "";
  assert.equal(dirname(stop), stop, `the walk stopped at ${stop}, not at the filesystem root`);
  assert.equal(stop, parse(stop).root, `the walk stopped at ${stop}, not at the filesystem root`);
});

test("the receipt's parent walk stops at the filesystem root when the existence test is inverted", () => {
  const walked = walkProbe("inverted");
  assert.ok(walked.length > 1, `the walk did not climb: ${JSON.stringify(walked)}`);
  const stop = walked.at(-1) ?? "";
  assert.equal(dirname(stop), stop, `the walk stopped at ${stop}, not at the filesystem root`);
  assert.equal(stop, parse(stop).root, `the walk stopped at ${stop}, not at the filesystem root`);
});

test("an owned child that outlives its timeout is killed with its whole process group", async () => {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-owned-"));
  try {
    const seam = `file://${join(denoRoot, "exec.ts")}`;
    writeFileSync(join(root, "grandchild.ts"), GRANDCHILD);
    writeFileSync(join(root, "middle.ts"), MIDDLE.replaceAll("SEAM_URL", seam));
    const driver = join(root, "driver.ts");
    writeFileSync(
      driver,
      DRIVER.replaceAll("SEAM_URL", seam).replaceAll("REPLAY_URL", `file://${join(denoRoot, "replay.ts")}`),
    );
    const result = runOwned(
      explicitDeno(),
      ["run", ...denoPermissions({ write: [root], env: true, run: [] }), driver],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          HOME: root,
          TMPDIR: root,
          SUPERMAN_DRIVER_DENO: explicitDeno(),
          SUPERMAN_DRIVER_ROOT: root,
        },
        encoding: "utf8",
        shell: false,
        timeout: 60_000,
      },
    );
    assert.equal(result.error, undefined, `the owned-child driver did not finish: ${result.error?.message ?? ""}`);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const observed = JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "") as {
      code?: string;
      signal?: string;
      status: number | null;
    };
    // The bounded process ends at its timeout and says so.
    assert.equal(observed.status, null, JSON.stringify(observed));
    assert.equal(observed.signal, "SIGKILL", JSON.stringify(observed));
    assert.equal(observed.code, "ETIMEDOUT", JSON.stringify(observed));
    // And nothing it started outlives it.
    const pid = Number(readFileSync(join(root, "grandchild.pid"), "utf8"));
    assert.ok(pid > 0, "the grandchild did not report its pid");
    assert.equal(await gone(pid), true, "the grandchild outlived the cancelled child");
    assert.equal(
      existsSync(join(root, "descendant.txt")),
      false,
      "the descendant of a cancelled child outlived the cancellation",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
