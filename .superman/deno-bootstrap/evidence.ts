// The files a run reads as inputs, and the check that binds them to a commit.
//
// The Deno sibling of the Node original. Every spawn goes through the exec
// seam, and the rule is the Node original's: a receipt claims that its gates
// ran against a committed snapshot. What that claim covers depends on what the
// gates read: the gates that measure a snapshot of the commit read the commit,
// so the checkout cannot change their result, and the gates that read the
// checkout itself bind what they read. The whole tree is bound when a gate
// reads the whole tree. None does on the local merge-candidate run, where G1
// and G11 read an owned snapshot of the commit; the staged stage binds its
// index and the CI leg the whole tree, each by its own rule.

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { join, matchesGlob } from "node:path";
import { execFileSync } from "./exec.ts";
import { fixtureEnvironment } from "./fixture-env.ts";

const sourceExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"];

/** A file the gates read as code: the source inventory every quality gate sees. */
export function isSourceFile(file: string): boolean {
  return sourceExtensions.some((extension) => file.endsWith(extension));
}

/**
 * The reviewed policy every run reads: the gate configuration, the dependency
 * lock, the install policy and the tool declarations.
 */
const policyFiles = [".superman/ci/bootstrap.json", "pnpm-lock.yaml", ".npmrc", "package.json"];

/** The Archgate rule sources: the rules that judge the tree, and the ADRs they come from. */
const ruleDirectory = ".archgate/";

/**
 * The gates that read the whole tree.
 *
 * None does. The set decides only the local merge-candidate run's binding,
 * and there G1's Archgate checks and G11's Trivy scan read an owned snapshot
 * of the commit (§5.4), so a file the commit does not hold cannot reach them.
 * The whole-tree binding remains, naming no gate, for a future gate that
 * genuinely reads the checkout (§5.4).
 */
const wholeTreeGates: readonly string[] = [];

/** Whether a run of these gates binds the whole tree rather than their inputs. */
export function bindsWholeTree(gates: string[]): boolean {
  return gates.some((gate) => wholeTreeGates.includes(gate));
}

/**
 * The scope a run binds.
 *
 * `whole-tree` is the checkout as it stands: the run read files the commit
 * does not hold. `gate-inputs` is the inputs the selected gates read, which
 * is a conservative superset of them: the check binds more than the gate
 * needs, so it refuses more often, never less.
 */
type BindingScope = "whole-tree" | "gate-inputs";

type TreeEntry = { mode: string; type: string; hash: string };
type EvidencePolicy = { globs: string[]; declared: Set<string> };

function gitIn(root: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    env: { ...fixtureEnvironment(), GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
    shell: false,
  }).trim();
}

/** The object format the repository hashes with, and the receipt's blob identity. */
function objectFormat(root: string): string {
  const format = gitIn(root, "rev-parse", "--show-object-format");
  if (!["sha1", "sha256"].includes(format)) throw new Error("Unknown Git object format");
  return format;
}

/**
 * Whether the checkout records the executable bit, which decides whether a
 * mode change is a change. The setting is read with the caller's own
 * configuration, because that is the configuration the gates run under.
 */
function tracksFileMode(root: string): boolean {
  try {
    const format = execFileSync("git", ["config", "--get", "core.fileMode"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    }).trim();
    return format !== "false";
  } catch {
    return true;
  }
}

/** The declared policy: the test files a replay runs and the reviewed inputs. */
function readPolicy(root: string): EvidencePolicy {
  const path = join(root, ".superman/ci/bootstrap.json");
  let policy: { test?: { files?: unknown; support?: unknown }; policyInputs?: unknown };
  try {
    policy = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `The declared policy is unreadable: ${path} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const declared = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item: unknown): item is string => typeof item === "string") : [];
  return {
    globs: [...declared(policy.test?.files), ...declared(policy.test?.support)],
    declared: new Set([...policyFiles, ...declared(policy.policyInputs)]),
  };
}

/**
 * Whether a file is an input the run reads.
 *
 * The source inventory is what the model and the lint read, the declared test
 * files are what a replay runs, the reviewed policy decides the tools and the
 * scopes, the Archgate rule sources judge the tree, and the ignore rules
 * decide which files exist at all. The JSON files are what the linter reads
 * when the linter runs, and the skill catalog is what the skill gate reads
 * when it runs.
 */
function isEvidenceInput(file: string, policy: EvidencePolicy, gates: string[]): boolean {
  return (
    isSourceFile(file) ||
    (gates.includes("G10") && (file.endsWith(".json") || file.endsWith(".jsonc"))) ||
    policy.globs.some((glob) => matchesGlob(file, glob)) ||
    policy.declared.has(file) ||
    file.startsWith(ruleDirectory) ||
    matchesGlob(file, "**/.gitignore") ||
    matchesGlob(file, "**/.ignore")
  );
}

/** Every blob a commit holds, by path. */
function commitTree(root: string, sha: string): Map<string, TreeEntry> {
  const tree = new Map<string, TreeEntry>();
  for (const entry of gitIn(root, "ls-tree", "-r", "-z", sha).split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t");
    const [mode, type, hash] = entry.slice(0, tab).split(" ");
    tree.set(entry.slice(tab + 1), { mode, type, hash });
  }
  return tree;
}

/**
 * Whether the working tree holds the bytes a commit records for a path.
 *
 * The comparison is the blob the commit names: kind, mode and bytes. A path
 * the commit does not hold, and a path the working tree lost, do not match.
 * A submodule is not a file the gates read, so its recorded commit is not
 * compared with the checkout's copy.
 */
function blobMatches(
  root: string,
  file: string,
  entry: TreeEntry | undefined,
  format: string,
  fileMode: boolean,
): boolean {
  if (!entry) return false;
  if (entry.type === "commit") return true;
  if (entry.type !== "blob") return false;
  const path = join(root, file);
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return false;
  if (entry.mode === "120000" ? !stat.isSymbolicLink() : !stat.isFile()) return false;
  if (fileMode && entry.mode !== "120000" && ((stat.mode & 0o111) !== 0) !== (entry.mode === "100755")) return false;
  const bytes = entry.mode === "120000" ? Buffer.from(readlinkSync(path)) : readFileSync(path);
  return createHash(format).update(`blob ${bytes.length}\0`).update(bytes).digest("hex") === entry.hash;
}

/**
 * The paths the index holds that the commit does not.
 *
 * The gates' file inventory is the index, not the commit: a staged addition
 * is a file the gates read and the commit never held.
 */
function stagedPaths(root: string, sha: string): string[] {
  return gitIn(root, "diff", "--cached", "--name-only", "-z", sha).split("\0").filter(Boolean);
}

/** The paths the checkout holds that no revision recorded. */
function untrackedPaths(root: string): string[] {
  return gitIn(root, "ls-files", "-z", "--full-name", "--others", "--exclude-standard").split("\0").filter(Boolean);
}

/**
 * Whether every file the commit holds is the file the working tree holds.
 *
 * The whole-tree rule belongs to the CI leg, where the checkout is the commit.
 */
export function committedTreeMatches(root: string, sha: string): boolean {
  const format = objectFormat(root);
  const fileMode = tracksFileMode(root);
  const tree = commitTree(root, sha);
  return [...tree].every(([file, entry]) => blobMatches(root, file, entry, format, fileMode));
}

/**
 * The inputs a local run could not bind to the commit.
 *
 * An input is listed when the working tree does not hold the committed bytes
 * of it, when the index holds a path the commit does not, and when the
 * checkout holds a file no revision recorded. The scope says what was bound,
 * so a reader can tell a run that bound the measured inputs from one that
 * bound the whole tree.
 */
export function changedEvidenceInputs(
  root: string,
  sha: string,
  gates: string[],
  wholeTree = bindsWholeTree(gates),
): { scope: BindingScope; files: string[] } {
  const format = objectFormat(root);
  const fileMode = tracksFileMode(root);
  const tree = commitTree(root, sha);
  const policy = readPolicy(root);
  const bound = (file: string): boolean => wholeTree || isEvidenceInput(file, policy, gates);
  const changed = [...tree]
    .filter(([file]) => bound(file))
    .filter(([file, entry]) => !blobMatches(root, file, entry, format, fileMode))
    .map(([file]) => file);
  const staged = stagedPaths(root, sha).filter(bound);
  const untracked = untrackedPaths(root).filter(bound);
  return {
    scope: wholeTree ? "whole-tree" : "gate-inputs",
    files: [...new Set([...changed, ...staged, ...untracked])].sort(),
  };
}
