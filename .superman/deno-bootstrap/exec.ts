// The operational Deno root's exec seam.
//
// ADR 0016 makes `Deno.Command` the only spawn API for the Deno runtime, and
// SUP-002 rejects `node:child_process` anywhere in this root, so every spawn
// under `.superman/deno-bootstrap/` goes through this module. The observable
// result and failure shapes match the Node originals' `child_process` surface
// so that a receipt written under either runtime carries the same codes,
// messages and statuses.
//
// The cancellation contract is explicit, because the seam offers both shapes:
// `spawn` kills the direct child on a timeout and leaves the child's own
// descendants to the caller, and `runOwned` puts the child in its own
// process group and removes the whole group, so a descendant cannot outlive
// a cancelled run. This is the Node original's `spawnSync` behaviour, which
// also killed only the direct child; the group guarantee lives in the owned
// path alone.
import { resolve } from "node:path";

/** The Node default: one mebibyte per stream. */
export const DEFAULT_MAX_BUFFER = 1024 * 1024;

/** A child stdio mode. `pipe` captures, `inherit` passes through, `ignore` drops. */
export type Stdio = "pipe" | "inherit" | "ignore";

export type ExecOptions = {
  /** The child's working directory. */
  cwd?: string;
  /**
   * The child's environment. This replaces the parent's environment outright,
   * exactly as the Node originals' spawn does; a key whose value is undefined
   * is dropped rather than passed.
   */
  env?: Record<string, string | undefined>;
  /** Milliseconds before the child is killed with `killSignal`. */
  timeout?: number;
  /** The signal used for the timeout kill and for the group cleanup. */
  killSignal?: "SIGTERM" | "SIGKILL";
  /** The per-stream byte ceiling. */
  maxBuffer?: number;
  /** Give the child its own process group, so a group kill reaches its descendants. */
  detached?: boolean;
  /**
   * The Node originals' guard against a shell. `Deno.Command` never uses one,
   * so this is accepted only to reject it: a shell spawn is refused outright.
   */
  shell?: boolean;
  /**
   * The Node originals' text encoding. The seam always decodes as UTF-8, so
   * this is accepted only to reject an encoding the seam cannot honour.
   */
  encoding?: "utf8";
  /**
   * The child's stdio, in the order stdin, stdout, stderr. A single mode
   * applies to all three streams. The default captures stdout and stderr,
   * which is what the Node originals' `spawnSync` does.
   */
  stdio?: Stdio | [Stdio, Stdio, Stdio];
};

export type ExecError = Error & {
  code?: string;
  status?: number | null;
  signal?: string | null;
  stdout?: string;
  stderr?: string;
};

export type ExecResult = {
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  error?: ExecError;
  pid?: number;
};

/**
 * A Deno permission profile: the capability classes a launch grants.
 *
 * Every class is explicit and never a blanket grant: ADR 0016 rejects the
 * all-capabilities form, and no network, foreign-function or
 * system-inspection capability is granted at all. A class that is absent
 * grants nothing; a class with an empty scope is that class's unscoped
 * grant; a class with paths grants exactly those paths.
 */
export type PermissionProfile = {
  /** The paths the process may read. */
  read?: string[];
  /** The paths the process may write. */
  write?: string[];
  /** Whether the process may read the environment. */
  env?: boolean;
  /** The programs the process may run. */
  run?: string[];
};

/**
 * The flags of one capability class.
 *
 * An absent class grants nothing, an empty scope is that class's unscoped
 * grant, and a scope with paths grants exactly those paths.
 */
function classGrants(flag: string, paths: string[] | undefined): string[] {
  if (!paths) return [];
  if (!paths.length) return [flag];
  return paths.map((path) => (path ? `${flag}=${path}` : flag));
}

/**
 * The permission flags of a reviewed profile.
 *
 * This is the one place a profile is turned into flags, so every call site
 * grants the classes it declares and nothing else. The class order is the
 * review order: read, write, environment, run.
 */
export function denoPermissions(profile: PermissionProfile): string[] {
  return [
    ...classGrants("--allow-read", profile.read),
    ...classGrants("--allow-write", profile.write),
    ...(profile.env ? ["--allow-env"] : []),
    ...classGrants("--allow-run", profile.run),
  ];
}

/**
 * The reviewed permission profile of the operational Deno runtime.
 *
 * It is an explicit list of capability classes, never a blanket grant: ADR
 * 0016 rejects the all-capabilities form, and no network, foreign-function or
 * system-inspection capability is granted at all.
 *
 * The run class is unscoped because the owned-child cleanup signals a whole
 * process group, and the runtime admits a group signal only under the
 * unscoped run class. The group cleanup is what keeps a cancelled run from
 * leaving descendants behind, so the narrower grant is not available.
 *
 * The harnesses' profiles are this builder with narrower scopes, declared
 * where they are used: the process-suite harness drives the operational
 * surface over the repository and needs the read, write and run classes, and
 * the launch harness's driver may only write inside its own fixture root.
 */
export const DENO_PERMISSIONS = denoPermissions({ read: [], write: [], env: true, run: [] });

/** The flags that neutralize ambient configuration and dependency discovery. */
export const DENO_LAUNCH_FLAGS = ["--no-prompt", "--no-config", "--no-lock", "--no-npm", "--no-remote"] as const;

function stdioModes(stdio: ExecOptions["stdio"]): [Stdio, Stdio, Stdio] {
  if (!stdio) return ["ignore", "pipe", "pipe"];
  if (typeof stdio === "string") return [stdio, stdio, stdio];
  return stdio;
}

function childEnvironment(env: Record<string, string | undefined> | undefined): Record<string, string> | undefined {
  if (!env) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) if (value !== undefined) result[key] = value;
  return result;
}

function execFailure(code: string, message: string): ExecError {
  const error = new Error(message) as ExecError;
  error.code = code;
  error.status = null;
  return error;
}

/** A shell spawn is refused: the seam always passes an argv array. */
function rejectShell(options: ExecOptions): void {
  if (options.shell) throw new Error("a shell spawn is refused; the seam passes an argv array");
  if (options.encoding && options.encoding !== "utf8") {
    throw new Error(`unsupported encoding: ${options.encoding}`);
  }
}

/** The command line as the Node originals' failure messages render it. */
function commandLine(file: string, args: string[]): string {
  return [file, ...args].join(" ");
}

/**
 * The executable identity a child is spawned with.
 *
 * A bare name is resolved by the runtime against the *child* environment's
 * `PATH`, and a path is resolved against the *child's* working directory —
 * the same directory the child is spawned into, so the two never disagree.
 * This is the Node originals' resolution order, so the explicit environment
 * decides which tool runs: there is no ambient fallback that could
 * substitute a different executable for the missing one.
 */
export function executableIdentity(file: string, cwd?: string): string {
  // The base is the directory the child is spawned into, made absolute so
  // that a relative executable resolves inside the child's directory and
  // never against the parent's.
  const directory = cwd === undefined ? Deno.cwd() : resolve(cwd);
  return file.includes("/") ? resolve(directory, file) : file;
}

function denoStdio(mode: Stdio): "piped" | "inherit" | "null" {
  if (mode === "pipe") return "piped";
  if (mode === "inherit") return "inherit";
  return "null";
}

/**
 * Run a command to completion and report what happened.
 *
 * The result carries the same fields the Node originals read: the exit
 * status, the terminating signal, the captured streams and the failure. A
 * failed spawn reports `ENOENT`, an exceeded output bound reports `ENOBUFS`
 * and a cancelled run reports `ETIMEDOUT`, each with the Node message.
 *
 * A timeout kills the direct child only, exactly as the Node originals'
 * `spawnSync` does; a descendant the child left behind is the caller's to
 * remove. `runOwned` is the shape that guarantees the removal.
 */
export async function spawn(file: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  rejectShell(options);
  const [stdinMode, stdoutMode, stderrMode] = stdioModes(options.stdio);
  const limit = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const killSignal = options.killSignal ?? "SIGTERM";
  const environment = childEnvironment(options.env);
  const command = new Deno.Command(executableIdentity(file, options.cwd), {
    args,
    cwd: options.cwd,
    env: environment,
    clearEnv: environment !== undefined,
    stdin: denoStdio(stdinMode),
    stdout: denoStdio(stdoutMode),
    stderr: denoStdio(stderrMode),
    detached: options.detached ?? false,
  });
  let child: Deno.ChildProcess;
  try {
    child = command.spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return {
        status: null,
        signal: null,
        stdout: "",
        stderr: "",
        error: execFailure("ENOENT", `spawnSync ${file} ENOENT`),
      };
    }
    throw error;
  }
  let timedOut = false;
  let overflowed = false;
  const kill = () => {
    try {
      child.kill(killSignal);
    } catch {
      // The child already exited; its status carries the outcome.
    }
  };
  const timer = options.timeout
    ? setTimeout(() => {
        timedOut = true;
        kill();
      }, options.timeout)
    : undefined;
  const read = async (stream: ReadableStream<Uint8Array> | undefined) => {
    if (!stream) return "";
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    const chunks: string[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) {
        overflowed = true;
        kill();
        break;
      }
      chunks.push(decoder.decode(next.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  };
  const [stdout, stderr, status] = await Promise.all([
    read(stdoutMode === "pipe" ? child.stdout : undefined),
    read(stderrMode === "pipe" ? child.stderr : undefined),
    child.status,
  ]);
  if (timer) clearTimeout(timer);
  const result: ExecResult = {
    status: status.signal ? null : status.code,
    signal: status.signal,
    stdout,
    stderr,
    pid: child.pid,
  };
  if (timedOut) {
    result.error = execFailure("ETIMEDOUT", `spawnSync ${file} ETIMEDOUT`);
    result.signal = killSignal;
  } else if (overflowed) {
    result.error = execFailure("ENOBUFS", `spawnSync ${file} ENOBUFS`);
  }
  return result;
}

/**
 * Run a command and return its standard output, synchronously.
 *
 * This is the counterpart of the Node originals' `execFileSync`, so a ported
 * module keeps the synchronous shape where the original had one. The Node
 * option `timeout` has no synchronous counterpart under Deno, so a caller that
 * needs a cancellation window uses the owned asynchronous path instead.
 */
export function execFileSync(file: string, args: string[], options: ExecOptions = {}): string {
  rejectShell(options);
  const [stdinMode, stdoutMode, stderrMode] = stdioModes(options.stdio);
  const limit = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const environment = childEnvironment(options.env);
  let output: Deno.CommandOutput;
  try {
    output = new Deno.Command(executableIdentity(file, options.cwd), {
      args,
      cwd: options.cwd,
      env: environment,
      clearEnv: environment !== undefined,
      stdin: denoStdio(stdinMode),
      // Both streams are always collected, because the runtime cannot report a
      // result for an unpiped stream. The requested mode decides afterwards
      // what happens to the collected bytes.
      stdout: "piped",
      stderr: "piped",
    }).outputSync();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) throw execFailure("ENOENT", `spawnSync ${file} ENOENT`);
    throw error;
  }
  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);
  // Node's `execFileSync` writes the child's stderr to the parent's stderr
  // unless the caller chose a stdio of its own, and it reports the child's
  // stdout on the returned value. The captured text is kept for the failure
  // message either way.
  if (stdoutMode === "inherit") Deno.stdout.writeSync(output.stdout);
  if (stderrMode === "inherit" || (!options.stdio && stderrMode === "pipe")) Deno.stderr.writeSync(output.stderr);
  if (stdout.length > limit || stderr.length > limit) {
    throw execFailure("ENOBUFS", `spawnSync ${file} ENOBUFS`);
  }
  if (output.signal) {
    const failure = execFailure("ETIMEDOUT", `spawnSync ${file} ETIMEDOUT`);
    failure.signal = output.signal;
    throw failure;
  }
  if (output.code !== 0) {
    const error = new Error(`Command failed: ${commandLine(file, args)}\n${stderr}`) as ExecError;
    error.status = output.code;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return stdoutMode === "ignore" ? "" : stdout;
}

/**
 * Run an owned child: its own process group, killed as a group when it ends.
 *
 * A descendant that outlives its parent is removed with the group, so a
 * cancelled run leaves nothing behind. This is the Deno counterpart of the
 * Node originals' owned-child idiom, and it is the only shape here that
 * guarantees the descendant cleanup.
 */
export async function runOwned(file: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  const result = await spawn(file, args, {
    ...options,
    detached: options.detached ?? true,
    killSignal: options.killSignal ?? "SIGKILL",
  });
  if (result.pid !== undefined) {
    try {
      Deno.kill(-result.pid, "SIGKILL");
    } catch (error) {
      // The group kill is a best-effort sweep of a group the child owned. The
      // child and its descendants run as this user, so ESRCH means the group
      // is already gone and EPERM means the id now names a group this user
      // does not own — the recycled-id case, where nothing of ours survives.
      // Neither is actionable, and neither may turn a successful tool run
      // into a failed gate.
      const code = (error as { code?: string }).code;
      if (code !== "ESRCH" && code !== "EPERM" && !(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return result;
}
