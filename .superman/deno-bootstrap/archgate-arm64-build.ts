#!/usr/bin/env deno
// The operational Deno root's Archgate linux-arm64 candidate build.
//
// This carries the reviewed self-build workflow's steps over to the Deno
// runtime unchanged: the platform assertion, the checksum-verified Bun and
// Node downloads, the Bun archive extraction, the pinned Archgate source
// checkout, the frozen install, the test run, the compiled binary, the
// version assertion and the release archive.
//
// The plan is the workflow's own command sequence, with the same arguments
// and the same assertions. The two workflow steps that are shell pipelines
// are carried as the argv-array commands they are made of: the platform
// assertion is `uname -m` compared with `aarch64`, and each download is
// checked against the sum its published sums file declares, selected into
// its own checksum file. The Bun archive extraction is the workflow's own
// Node script, unchanged, run by the Node binary the plan downloads.
//
// What the plan does not contain: the workflow's shell, the runner's
// environment and the upload of the release archive. The command runner and
// the acquisition are injected, so the module states and checks the build
// without performing a real build, and no publication follows from it. The
// external runtime identities — Bun v1.4.3, Node v26.13.0, Archgate v0.61.0
// at the pinned commit, the bun-linux-arm64 target and the archive members —
// are the declared ones, unchanged.
import { join } from "node:path";

/** The declared external runtime identities of the candidate build. */
export const BUILD_IDENTITIES = {
  bun: {
    version: "1.4.3",
    archive: "bun-linux-aarch64.zip",
    url: "https://github.com/oven-sh/bun/releases/download/bun-v1.4.3/bun-linux-aarch64.zip",
    sums: "https://github.com/oven-sh/bun/releases/download/bun-v1.4.3/SHASUMS256.txt",
  },
  node: {
    version: "26.13.0",
    archive: "node-v26.13.0-linux-arm64.tar.gz",
    url: "https://nodejs.org/dist/v26.13.0/node-v26.13.0-linux-arm64.tar.gz",
    sums: "https://nodejs.org/dist/v26.13.0/SHASUMS256.txt",
  },
  archgate: {
    version: "0.61.0",
    repository: "https://github.com/archgate/cli.git",
    branch: "v0.61.0",
    commit: "f65d99f56d02757cca94d53f6d717333770e0170",
    target: "bun-linux-arm64",
    compileExecArgv: "--use-system-ca",
  },
  archive: "archgate-linux-arm64.tar.gz",
  members: ["archgate", "LICENSE.md"],
} as const;

/**
 * The workflow's own Bun archive extraction, unchanged.
 *
 * The workflow runs this script inline, with the Node binary it downloaded
 * for the build, and the plan runs the same script with the same arguments.
 */
const BUN_ARCHIVE_EXTRACTION = `import { inflateRawSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const data = readFileSync("bun-linux-aarch64.zip");
let eocd = -1;
for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
  if (data.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
if (eocd < 0) throw new Error("Bun zip has no end-of-central-directory");
const count = data.readUInt16LE(eocd + 10);
let offset = data.readUInt32LE(eocd + 16);
for (let n = 0; n < count; n++) {
  if (data.readUInt32LE(offset) !== 0x02014b50) throw new Error("Bun zip central directory is invalid");
  const method = data.readUInt16LE(offset + 10);
  const compSize = data.readUInt32LE(offset + 20);
  const nameLen = data.readUInt16LE(offset + 28);
  const extraLen = data.readUInt16LE(offset + 30);
  const commentLen = data.readUInt16LE(offset + 32);
  const localOff = data.readUInt32LE(offset + 42);
  const name = data.subarray(offset + 46, offset + 46 + nameLen).toString();
  const start = localOff + 30 + data.readUInt16LE(localOff + 26) + data.readUInt16LE(localOff + 28);
  const compressed = data.subarray(start, start + compSize);
  const bytes = method === 0 ? compressed : inflateRawSync(compressed);
  if (name.endsWith("/")) mkdirSync(name, { recursive: true });
  else { mkdirSync(dirname(name), { recursive: true }); writeFileSync(name, bytes); }
  offset += 46 + nameLen + extraLen + commentLen;
}
`;

/** One step of the build: the command, its arguments and its expectation. */
export type BuildStep = {
  command: string;
  args: string[];
  /** The working directory the step runs in, when it is not the run's root. */
  cwd?: string;
  /** The exact standard output the step must produce, when it has one. */
  stdout?: string;
  /** A fragment the step's standard output must contain, when it has one. */
  contains?: string;
};

/** The result of one executed step. */
export type StepResult = { command: string; args: string[]; status: number | null; stdout: string; stderr: string };

/**
 * The runner that executes a build step. The caller supplies it.
 *
 * The runner receives the step's working directory, so a step that runs in
 * the pinned source checkout is executed there and not in the run's root.
 */
export type CommandRunner = (command: string, args: string[], cwd?: string) => Promise<StepResult>;

/**
 * The ordered build plan.
 *
 * The plan is the workflow's own command sequence, with the same arguments
 * and the same assertions. The directory is the run's temporary directory.
 */
export function archgateArm64BuildPlan(directory: string): BuildStep[] {
  const identities = BUILD_IDENTITIES;
  const nodeBinary = join(directory, `node-v${identities.node.version}-linux-arm64/bin/node`);
  return [
    // The workflow asserts the platform before it downloads anything.
    { command: "uname", args: ["-m"], stdout: "aarch64" },
    { command: "curl", args: ["-fsSL", "-o", identities.bun.archive, identities.bun.url] },
    { command: "curl", args: ["-fsSL", "-o", "SHASUMS256.txt", identities.bun.sums] },
    {
      // The workflow's `grep ' bun-linux-aarch64.zip$' SHASUMS256.txt |
      // sha256sum -c`: the published sum is selected into its own file, and
      // the downloaded archive is checked against that file.
      command: "awk",
      args: [`$2 == "${identities.bun.archive}" { print > "${identities.bun.archive}.sha256" }`, "SHASUMS256.txt"],
    },
    {
      command: "sha256sum",
      args: ["-c", `${identities.bun.archive}.sha256`],
      contains: identities.bun.archive,
    },
    { command: "curl", args: ["-fsSL", "-o", identities.node.archive, identities.node.url] },
    { command: "curl", args: ["-fsSL", "-o", "node-SHASUMS256.txt", identities.node.sums] },
    {
      command: "awk",
      args: [
        `$2 == "${identities.node.archive}" { print > "${identities.node.archive}.sha256" }`,
        "node-SHASUMS256.txt",
      ],
    },
    {
      command: "sha256sum",
      args: ["-c", `${identities.node.archive}.sha256`],
      contains: identities.node.archive,
    },
    { command: "tar", args: ["-xzf", identities.node.archive] },
    {
      // The workflow's own Bun archive extraction: the archive is unpacked
      // into the run's root, which is where the install step reads it from.
      command: nodeBinary,
      args: ["--input-type=module", "--eval", BUN_ARCHIVE_EXTRACTION],
    },
    { command: "install", args: ["-m", "755", "bun-linux-aarch64/bun", join(directory, "bun")] },
    {
      command: "git",
      args: [
        "clone",
        "--depth",
        "1",
        "--branch",
        identities.archgate.branch,
        identities.archgate.repository,
        "archgate-src",
      ],
    },
    { command: "git", args: ["-C", "archgate-src", "fetch", "--depth", "1", "origin", identities.archgate.commit] },
    { command: "git", args: ["-C", "archgate-src", "checkout", "--detach", identities.archgate.commit] },
    {
      command: "git",
      args: ["-C", "archgate-src", "rev-parse", "HEAD"],
      stdout: identities.archgate.commit,
    },
    {
      command: join(directory, "bun"),
      args: ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd: "archgate-src",
    },
    { command: join(directory, "bun"), args: ["run", "test"], cwd: "archgate-src" },
    {
      command: join(directory, "bun"),
      args: [
        "build",
        "src/cli.ts",
        "--compile",
        "--bytecode",
        `--compile-exec-argv=${identities.archgate.compileExecArgv}`,
        "--minify",
        `--target=${identities.archgate.target}`,
        `--outfile=${join(directory, "archgate")}`,
      ],
      cwd: "archgate-src",
    },
    {
      command: join(directory, "archgate"),
      args: ["--version"],
      stdout: identities.archgate.version,
      cwd: "archgate-src",
    },
    { command: "mkdir", args: ["-p", join(directory, "release")], cwd: "archgate-src" },
    {
      command: "install",
      args: ["-m", "755", join(directory, "archgate"), join(directory, "release/archgate")],
      cwd: "archgate-src",
    },
    { command: "cp", args: ["LICENSE.md", join(directory, "release/LICENSE.md")], cwd: "archgate-src" },
    {
      command: "tar",
      args: ["-czf", join(directory, identities.archive), "-C", join(directory, "release"), ...identities.members],
      cwd: "archgate-src",
    },
    {
      command: "sha256sum",
      args: [join(directory, "archgate"), join(directory, identities.archive)],
      contains: identities.archive,
      cwd: "archgate-src",
    },
  ];
}

/** The outcome of a checked build. */
export type BuildOutcome = {
  version: string;
  archive: string;
  digest: string | null;
  steps: StepResult[];
};

/**
 * Run the build plan through the supplied runner and check every assertion.
 *
 * A step that fails, or whose output does not match its expectation, stops
 * the build. Nothing is published by this module.
 */
export async function runArchgateArm64Build(options: {
  plan: BuildStep[];
  runner: CommandRunner;
  directory: string;
  /** The digest the release archive has, when the caller observed one. */
  digest?: string | null;
}): Promise<BuildOutcome> {
  const { plan, runner, directory, digest = null } = options;
  const steps: StepResult[] = [];
  for (const step of plan) {
    // The step's working directory is part of the step: a runner that
    // ignores it would run the pinned source checkout's steps in the run's
    // root, where `src/cli.ts` and `LICENSE.md` do not exist.
    const result = await runner(step.command, step.args, step.cwd);
    steps.push(result);
    if (result.status !== 0)
      throw new Error(`${step.command} failed (${result.status}): ${result.stderr.trim() || result.stdout.trim()}`);
    if (step.stdout !== undefined && result.stdout.trim() !== step.stdout)
      throw new Error(`${step.command} expected ${step.stdout}, actual ${result.stdout.trim()}`);
    if (step.contains !== undefined && !result.stdout.includes(step.contains))
      throw new Error(`${step.command} output does not contain ${step.contains}`);
  }
  return {
    version: BUILD_IDENTITIES.archgate.version,
    archive: join(directory, BUILD_IDENTITIES.archive),
    digest,
    steps,
  };
}
