// Public process suite for the Deno operational root's launch boundary and its
// policy process foundation.
//
// The suite is Node-hosted on purpose: it drives the pinned Deno runtime as an
// owned child and compares what the Deno runtime observes against what the Node
// originals observe for the same input. Every expectation is the Node
// original's observed output, never a hardcoded literal, so a divergence in
// the seam's failure shapes fails the fixture. Every fixture writes to a
// `mkdtempSync` root; nothing is written into the repository tree.
//
// SUP-002 forbids the Node child-process module and a direct runtime spawn
// inside the operational Deno root, so the harness reaches the Node graph's
// owned-child idiom instead. That is the same seam the Node-hosted candidate
// measurement host uses, and it is harness code: the modules under test never
// see it.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixture } from "../../ci/raw-fixture.ts";
import { ownedSnapshot, runOwned } from "../../ci/replay.ts";
import { DENO_LAUNCH_FLAGS, denoPermissions } from "../exec.ts";

const repository = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const seam = join(repository, ".superman/deno-bootstrap/exec.ts");

/** An owned temporary root for the harness's own fixtures. */
function repoRoot(): string {
  return mkdtempSync(join(tmpdir(), "superman-node-env-"));
}

/** The explicit runtime identity. An implicit PATH lookup is not a launch. */
function explicitDeno(): string {
  const binary = process.env.SUPERMAN_DENO_BIN;
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  return binary;
}

/**
 * The reviewed permission profile of the driver.
 *
 * The grants are explicit and narrow: the pinned runtime, the environment
 * printer and the version control tool. There is no blanket grant, so the
 * driver itself cannot widen what it may run. The profile is the exec
 * seam's own builder, so the harness and the module it drives grant the
 * same capabilities from one source of truth. This profile is narrower than
 * the operational one on purpose: the driver reads no path, and it writes
 * only inside its own fixture root.
 */
function driverProfile(root: string): string[] {
  // The coverage directory, when the collector asks for one, is a written
  // output of the driver, so it is granted explicitly.
  const coverage = process.env.DENO_COVERAGE_DIR;
  return [
    ...DENO_LAUNCH_FLAGS,
    ...denoPermissions({
      write: [root, ...(coverage ? [coverage] : [])],
      env: true,
      run: [],
    }),
  ];
}

/** The grandchild that outlives its parent unless the group is killed. */
const GRANDCHILD_SOURCE = `await new Promise((resolve) => setTimeout(resolve, 3000));
await Deno.writeTextFile(Deno.args[0]!, "alive");
`;

/** The middle child that owns the grandchild. */
const MIDDLE_SOURCE = `import { denoPermissions, spawn } from "SEAM_URL";
const root = Deno.env.get("SUPERMAN_DRIVER_ROOT")!;
const deno = Deno.env.get("SUPERMAN_DRIVER_DENO")!;
spawn(deno, ["run", ...denoPermissions({ write: [root] }), root + "/grandchild.ts", root + "/descendant.txt"], {
  stdio: ["ignore", "pipe", "pipe"],
});
await new Promise(() => {});
`;

const DRIVER = `import { denoPermissions, execFileSync, runOwned, spawn } from "SEAM_URL";
import { writeFileSync } from "node:fs";

const mode = Deno.args[0]!;
const root = Deno.env.get("SUPERMAN_DRIVER_ROOT")!;
const deno = Deno.env.get("SUPERMAN_DRIVER_DENO")!;
const report = (value: unknown) => console.log(JSON.stringify(value));

if (mode === "env") {
  // The seam replaces the child environment instead of merging the parent's.
  const replaced = execFileSync("/usr/bin/env", [], { env: { ONLY: "1" } });
  const inherited = execFileSync("/usr/bin/env", []);
  report({
    replaced: replaced.trim().split("\\n").sort(),
    inheritedHasParentOnly: inherited.includes("PARENT_ONLY=parentvalue"),
  });
} else if (mode === "enoent") {
  const result = await spawn("definitely-not-a-real-binary-xyz", []);
  report({ code: result.error?.code, message: result.error?.message, status: result.status, signal: result.signal });
} else if (mode === "fail") {
  // The same failing command the Node original runs, so the failure shapes
  // are compared over one input.
  try {
    execFileSync(
      "git",
      ["-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", "clone", "--quiet", "--no-checkout", "--no-hardlinks", "--", root + "/absent-root", root + "/absent-clone"],
      { cwd: root, env: { PATH: Deno.env.get("PATH") }, encoding: "utf8", shell: false },
    );
    report({ threw: false });
  } catch (error) {
    const failure = error as { status?: number; message: string; stdout?: string; stderr?: string };
    report({ threw: true, status: failure.status, message: failure.message, stdout: failure.stdout, stderr: failure.stderr });
  }
} else if (mode === "bounds") {
  const result = await spawn(deno, ["eval", "console.log('x'.repeat(200000))"], { maxBuffer: 1024 });
  report({ code: result.error?.code, message: result.error?.message });
} else if (mode === "cwd") {
  // A relative executable resolves against the directory the child is
  // spawned into, never against the parent's directory.
  const result = await spawn("./bin/tool", [], { cwd: root + "/child" });
  report({
    code: result.error?.code,
    message: result.error?.message,
    status: result.status,
    stdout: result.stdout.trim(),
  });
} else if (mode === "timeout") {
  // The middle child owns a descendant that outlives it. The seam must cancel
  // the middle child and take its descendant with it.
  const marker = root + "/descendant.txt";
  const grandchild = root + "/grandchild.ts";
  const middle = root + "/middle.ts";
  writeFileSync(grandchild, GRANDCHILD);
  writeFileSync(middle, MIDDLE);
  const result = await runOwned(deno, ["run", ...denoPermissions({ env: true, run: [deno] }), middle], { timeout: 400 });
  report({
    code: result.error?.code,
    message: result.error?.message,
    signal: result.signal,
    status: result.status,
    stderr: result.stderr,
    marker,
  });
} else if (mode === "concurrent") {
  const results = await Promise.all(
    [1, 2, 3].map((n) => runOwned(deno, ["eval", "console.log(" + n + ")"])),
  );
  report({ results: results.map((result) => result.stdout.trim()) });
} else {
  throw new Error("unknown driver mode: " + mode);
}
`;

/**
 * The seam driver runs in an owned temporary root as an owned child of the
 * pinned Deno runtime, with an explicit permission profile and no ambient
 * configuration discovery.
 */
function drive(mode: string): Record<string, unknown> {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-seam-"));
  try {
    const driver = join(root, "driver.ts");
    // The program a relative executable resolves to lives in the directory
    // the child is spawned into. The parent's own directory has no such
    // program, so a resolution against the parent would fail.
    mkdirSync(join(root, "child", "bin"), { recursive: true });
    writeFileSync(join(root, "child", "bin", "tool"), '#!/usr/bin/env node\nconsole.log("child-tool");\n', {
      mode: 0o755,
    });
    const seamUrl = `file://${seam}`;
    writeFileSync(
      driver,
      DRIVER.replaceAll("SEAM_URL", seamUrl)
        .replaceAll("GRANDCHILD", JSON.stringify(GRANDCHILD_SOURCE))
        .replaceAll("MIDDLE", JSON.stringify(MIDDLE_SOURCE.replaceAll("SEAM_URL", seamUrl))),
    );
    const result = runOwned(explicitDeno(), ["run", ...driverProfile(root), driver, mode], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: root,
        TMPDIR: root,
        PARENT_ONLY: "parentvalue",
        SUPERMAN_DRIVER_DENO: explicitDeno(),
        SUPERMAN_DRIVER_ROOT: root,
        ...(process.env.DENO_COVERAGE_DIR ? { DENO_COVERAGE_DIR: process.env.DENO_COVERAGE_DIR } : {}),
      },
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const line = result.stdout.trim().split("\n").at(-1) ?? "";
    return JSON.parse(line) as Record<string, unknown>;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The Node original's own observed failure for the same input.
 *
 * The Node graph's owned-child idiom is the Node originals' `spawnSync`
 * surface, so its result is what the Node original reports — not a literal
 * written into this fixture.
 */
function nodeSpawnObservation(command: string, args: string[]) {
  const result = runOwned(command, args, { encoding: "utf8", shell: false, timeout: 60_000 });
  return {
    code: (result.error as { code?: string } | undefined)?.code,
    message: result.error?.message,
    status: result.status,
    signal: result.signal,
  };
}

test("the exec seam replaces the child environment instead of merging it", () => {
  const observed = drive("env") as { replaced: string[]; inheritedHasParentOnly: boolean };
  const node = runOwned("/usr/bin/env", [], { env: { ONLY: "1" }, encoding: "utf8", shell: false, timeout: 60_000 });
  assert.equal(node.status, 0);
  assert.deepEqual(observed.replaced, node.stdout.trim().split("\n").sort());
  const inherited = runOwned("/usr/bin/env", [], {
    env: { PATH: process.env.PATH, HOME: repoRoot(), TMPDIR: repoRoot(), PARENT_ONLY: "parentvalue" },
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.equal(observed.inheritedHasParentOnly, inherited.stdout.includes("PARENT_ONLY=parentvalue"));
});

test("the exec seam reports a missing executable exactly as the Node original does", () => {
  const observed = drive("enoent");
  const node = nodeSpawnObservation("definitely-not-a-real-binary-xyz", []);
  assert.deepEqual(observed, node);
});

test("the exec seam reports a failed command exactly as the Node original does", () => {
  const observed = drive("fail") as { threw: boolean; status?: number; message?: string };
  // The Node original's own `execFileSync` failure for the same command.
  const root = mkdtempSync(join(tmpdir(), "superman-node-exec-"));
  let nodeFailure: { status?: number; message?: string; stdout?: string; stderr?: string } | undefined;
  try {
    ownedSnapshot(join(root, "absent-root"), root, "absent-clone", "HEAD", { PATH: process.env.PATH });
  } catch (error) {
    nodeFailure = error as { status?: number; message?: string; stdout?: string; stderr?: string };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  assert.ok(nodeFailure, "the Node original did not fail as expected");
  assert.equal(observed.threw, true);
  assert.equal(observed.status, nodeFailure.status);
  assert.match(String(observed.message), /^Command failed: /u);
  assert.equal(
    String(observed.message).startsWith("Command failed: "),
    String(nodeFailure.message).startsWith("Command failed: "),
  );
});

test("the exec seam bounds the child's output exactly as the Node original does", () => {
  const observed = drive("bounds");
  const node = runOwned(explicitDeno(), ["eval", "console.log('x'.repeat(200000))"], {
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024,
    timeout: 60_000,
  });
  const nodeObserved = {
    code: (node.error as { code?: string } | undefined)?.code,
    message: node.error?.message,
  };
  assert.deepEqual(observed, nodeObserved);
});

test("the exec seam cancels a timed out child and cleans up its descendants", async () => {
  const observed = drive("timeout");
  // The same executable, so the failure message names the same command.
  const node = runOwned(explicitDeno(), ["eval", "await new Promise((resolve) => setTimeout(resolve, 10000))"], {
    encoding: "utf8",
    shell: false,
    timeout: 400,
    killSignal: "SIGKILL",
  });
  const nodeObserved = {
    code: (node.error as { code?: string } | undefined)?.code,
    message: node.error?.message,
    status: node.status,
  };
  assert.equal(observed.code, nodeObserved.code, JSON.stringify(observed));
  assert.equal(observed.message, nodeObserved.message, JSON.stringify(observed));
  assert.equal(observed.status, nodeObserved.status, JSON.stringify(observed));
  const marker = String(observed.marker);
  await new Promise((resolve) => setTimeout(resolve, 4000));
  assert.equal(existsSync(marker), false, "the descendant of a cancelled child outlived the cancellation");
});

test("the exec seam cleans up a descendant the way the Node original's owned child does", async () => {
  const root = mkdtempSync(join(tmpdir(), "superman-node-owned-"));
  try {
    const grandchild = join(root, "grandchild.ts");
    const middle = join(root, "middle.ts");
    const marker = join(root, "descendant.txt");
    writeFileSync(grandchild, GRANDCHILD_SOURCE);
    writeFileSync(middle, MIDDLE_SOURCE.replaceAll("SEAM_URL", `file://${seam}`));
    // The Node original's own owned-child idiom over the same scenario.
    const result = runOwned(explicitDeno(), ["run", ...denoPermissions({ env: true, run: [explicitDeno()] }), middle], {
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
      timeout: 400,
      killSignal: "SIGKILL",
    });
    assert.equal(result.status, null, "the Node original's owned child did not time out");
    await new Promise((resolve) => setTimeout(resolve, 4000));
    assert.equal(existsSync(marker), false, "the Node original's group cleanup left the descendant behind");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the exec seam runs concurrent fixtures independently", () => {
  const observed = drive("concurrent") as { results: string[] };
  const node = [1, 2, 3].map((n) =>
    runOwned(process.execPath, ["-e", `console.log(${n})`], {
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    }).stdout.trim(),
  );
  assert.deepEqual(observed.results, node);
});

test("a relative executable resolves inside the directory the child is spawned into", () => {
  const observed = drive("cwd") as { code?: string; message?: string; status: number | null; stdout: string };
  assert.equal(observed.code, undefined, JSON.stringify(observed));
  assert.equal(observed.status, 0, JSON.stringify(observed));
  // The program that ran is the one in the child's own directory: the
  // parent's directory has no such program, so a resolution against the
  // parent would have failed instead.
  assert.equal(observed.stdout, "child-tool");
});

test("the Deno pr-policy decides protected paths exactly as the Node original does", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  repo.write("biome.json", '{ "changed": true }\n');
  const headSha = repo.commit();
  const environment = {
    PATH: process.env.PATH,
    HOME: repo.root,
    TMPDIR: repo.root,
    HEAD_REF: "ticket/demo-01",
    HEAD_SHA: headSha,
    BASE_SHA: repo.baseSha,
  };
  const node = runOwned(process.execPath, [join(repository, ".superman/ci/pr-policy.ts")], {
    cwd: repo.root,
    env: environment,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  const deno = runOwned(
    explicitDeno(),
    ["run", ...driverProfile(repo.root), join(repository, ".superman/deno-bootstrap/pr-policy.ts")],
    {
      cwd: repo.root,
      env: environment,
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    },
  );
  assert.equal(deno.status, node.status, `${node.stdout}${node.stderr}`);
  assert.equal(deno.stdout, node.stdout);
});
