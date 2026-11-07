// Protected raw G5/G6 implementation; no product behavior or caller writes.
//
// The Deno sibling of the Node original. The measured corpus, the reviewed
// floors, the failure taxonomy, the receipt shape and the decisions are
// unchanged; the spawns go through the exec seam and the owned children are
// cleaned up as process groups.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, matchesGlob, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { GateFailure, type StageScope } from "./direct-gates.ts";
import { execFileSync } from "./exec.ts";
import { ownedIndexSnapshot, ownedSnapshot, type ProcessEnv, runOwned } from "./replay.ts";

/** This module's own location, resolved from its module URL. */
const self = fileURLToPath(import.meta.url);
const here = dirname(self);

type QualityResult = {
  gate: string;
  status: "pass" | "n/a";
  reason?: string;
  metrics?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  /** The scope the result covers; the full scope's result carries none. */
  scope?: StageScope;
  /** What the run checked. */
  checked?: string;
  /** What the run did not check, so a partial result is never read as the whole gate. */
  notChecked?: string;
};

/**
 * What a quality run knows about the scope it evaluates: the scope the stage
 * declared and, for the staged scope, the changed files it covers.
 */
export type QualityScope = {
  scope: StageScope;
  changedFiles: string[];
};

function knownKeys(value: unknown, required: string[], optional: string[] = []): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  );
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readReport(path: string, gate: string, tool: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new GateFailure(
      "incomplete-report",
      `${gate}: invalid ${tool} report JSON; measurement evidence unavailable`,
    );
  }
}

type CriticalCase = { id: string; module: string; case: string; runner: "node-test" | "vitest" };

/**
 * The owner-governed critical mutation cases and their module mappings.
 * Each case declares the runner that executes it fresh: the enforcement core
 * runs under the Node test runner, product cases under Vitest.
 */
function declaredCriticalCases(value: unknown, gate: string): CriticalCase[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new GateFailure("policy-refusal", `${gate}: invalid declared critical cases`);
  return value.map((entry) => {
    if (!entry || typeof entry !== "object")
      throw new GateFailure("policy-refusal", `${gate}: invalid declared critical case`);
    const {
      id,
      module,
      case: caseFile,
      runner,
    } = entry as {
      id?: unknown;
      module?: unknown;
      case?: unknown;
      runner?: unknown;
    };
    if (
      typeof id !== "string" ||
      !id ||
      typeof module !== "string" ||
      !module ||
      typeof caseFile !== "string" ||
      !caseFile
    )
      throw new GateFailure("policy-refusal", `${gate}: invalid declared critical case`);
    if (runner !== "node-test" && runner !== "vitest")
      throw new GateFailure(
        "policy-refusal",
        `${gate}: declared critical case ${id} must declare its runner as node-test or vitest`,
      );
    return { id, module, case: caseFile, runner };
  });
}

/**
 * A declared critical case and its module must both exist in the candidate.
 * A missing one blocks: an unresolved critical case is never a pass. A module
 * that the candidate deleted fails as well: a deleted critical module is a
 * missing critical module, not a surviving one.
 */
function assertCriticalCases(
  declared: unknown,
  gate: string,
  git: (...args: string[]) => string,
  headSha: string,
): CriticalCase[] {
  const critical = declaredCriticalCases(declared, gate);
  const candidateFiles = git("ls-tree", "-r", "--name-only", "-z", headSha).split("\0").filter(Boolean);
  for (const entry of critical) {
    if (!candidateFiles.includes(entry.module))
      throw new GateFailure("skipped-required-work", `${gate}: missing critical module ${entry.module}`);
    if (!candidateFiles.includes(entry.case))
      throw new GateFailure("skipped-required-work", `${gate}: missing critical case ${entry.case}`);
  }
  return critical;
}

/**
 * The scope a declared pattern list covers. A `!` pattern removes what an
 * earlier pattern included; the order is the declaration's order.
 */
function inScope(path: string, patterns: string[]): boolean {
  let included = false;
  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      if (matchesGlob(path, pattern.slice(1))) included = false;
    } else if (matchesGlob(path, pattern)) included = true;
  }
  return included;
}

/**
 * The Git environment a quality run reads the repository with: no caller's Git
 * configuration, no caller's index, and no lock the run may take.
 */
function hermeticGitEnv(env: ProcessEnv): ProcessEnv {
  return {
    ...Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

/** The Git reader a quality run uses: the repository's own history and index. */
function hermeticGit(root: string, gitEnv: ProcessEnv) {
  return (...args: string[]) =>
    execFileSync("git", args, { cwd: root, env: gitEnv, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024 });
}

/**
 * The environment a quality tool runs under: no caller's home, no caller's Git
 * configuration, and a scratch HOME of its own. Both scopes run their tools
 * under it, so neither can measure with a different environment.
 */
function hermeticEnvironment(temporary: string, env: ProcessEnv): ProcessEnv {
  const home = join(temporary, "home");
  mkdirSync(home);
  return {
    PATH: env.PATH,
    HOME: home,
    TMPDIR: temporary,
    TEMP: temporary,
    TMP: temporary,
    CI: "true",
    PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
    PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: "false",
    PNPM_CONFIG_IGNORE_SCRIPTS: "true",
    PNPM_CONFIG_IGNORE_PNPMFILE: "true",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
  };
}

/**
 * The owned pnpm seam a quality tool runs through.
 *
 * Both scopes run their tools through this one seam, so neither can measure
 * with a different environment or a different command shape.
 */
function qualityRunner(gate: string, runnerEnv: ProcessEnv) {
  return async (args: string[], cwd: string): Promise<string> => {
    const result = await runOwned("pnpm", ["exec", ...args], {
      cwd,
      env: runnerEnv,
      encoding: "utf8",
      shell: false,
      timeout: args.includes("--version") ? 10_000 : 120_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || result.signal || result.status !== 0)
      throw new GateFailure(
        "failed-command",
        `${gate}: quality tool failed (${result.status ?? result.signal}): ${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
      );
    return result.stdout;
  };
}

type JscpdLocation = {
  name: string;
  start: number;
  end: number;
  startLoc: { column: number; line: number; position: number };
  endLoc: { column: number; line: number; position: number };
};

type JscpdClone = {
  firstFile: JscpdLocation;
  secondFile: JscpdLocation;
  format: string;
  fragment: string;
  isNew: boolean;
  kind: string;
  lines: number;
  tokens: number;
};

type JscpdScan = {
  /** The validated clones, with repository-relative file names. */
  clones: JscpdClone[];
  /** The report's total counters. */
  total: Record<string, number>;
};

/**
 * The jscpd report of one scan, validated against the file list the scan
 * covered: the same schema, the same counters, the same source count and the
 * same clipped-percentage refusal the full scope refuses. A clone that names
 * a file outside the scanned list is a refusal, never a silent report.
 */
function readJscpdScan(
  gate: string,
  snapshot: string,
  files: string[],
  reportPath: string,
  corpusLabel: string,
): JscpdScan {
  if (!existsSync(reportPath)) throw new GateFailure("incomplete-report", `${gate}: missing jscpd report`);
  const report = readReport(reportPath, gate, "jscpd");
  const total = report.statistics?.total;
  const counters = [
    "clones",
    "duplicatedLines",
    "duplicatedTokens",
    "lines",
    "newClones",
    "newDuplicatedLines",
    "sources",
    "tokens",
  ];
  const fields = [...counters, "percentage", "percentageTokens"];
  if (
    !knownKeys(report, ["duplicates", "statistics"]) ||
    !knownKeys(report.statistics, ["detectionDate", "formats", "total"]) ||
    typeof report.statistics.detectionDate !== "string" ||
    !Number.isFinite(Date.parse(report.statistics.detectionDate)) ||
    !knownKeys(total, fields) ||
    !knownKeys(report.statistics.formats, ["typescript"]) ||
    !knownKeys(report.statistics.formats.typescript, fields)
  )
    throw new GateFailure("incomplete-report", `${gate}: unknown jscpd reporter schema`);
  if (total.sources !== files.length) {
    throw new GateFailure(
      "incomplete-report",
      `${gate}: incomplete jscpd corpus counters: expected ${files.length} sources, actual ${total.sources}; filters or undersized files require reviewed policy modeling`,
    );
  }
  // A percentage below its own measured identity is a clipped percentage,
  // never a smaller duplication result.
  if (
    Number.isSafeInteger(total?.duplicatedLines) &&
    Number.isSafeInteger(total?.lines) &&
    (total?.lines ?? 0) > 0 &&
    typeof total?.percentage === "number" &&
    Number.isFinite(total.percentage)
  ) {
    const measuredPercentage = (100 * total.duplicatedLines) / total.lines;
    if (total.percentage < measuredPercentage - 0.0051)
      throw new GateFailure(
        "incomplete-report",
        `${gate}: clipped duplication percentage ${total.percentage} does not match the measured ${measuredPercentage}`,
      );
  }
  if (
    !Array.isArray(report.duplicates) ||
    !total ||
    !Number.isSafeInteger(total.sources) ||
    total.sources <= 0 ||
    !Number.isSafeInteger(total.lines) ||
    total.lines <= 0 ||
    !Number.isSafeInteger(total.tokens) ||
    total.tokens <= 0 ||
    !Number.isSafeInteger(total.duplicatedLines) ||
    total.duplicatedLines < 0 ||
    total.duplicatedLines > total.lines ||
    total.clones !== report.duplicates.length ||
    typeof total.percentage !== "number" ||
    !Number.isFinite(total.percentage) ||
    !counters.every((key) => nonnegativeInteger(total[key])) ||
    total.duplicatedTokens > total.tokens ||
    total.newClones !== 0 ||
    total.newDuplicatedLines !== 0 ||
    !fields.every((key) => report.statistics.formats.typescript[key] === total[key]) ||
    typeof total.percentageTokens !== "number" ||
    !Number.isFinite(total.percentageTokens) ||
    Math.abs(total.percentageTokens - (100 * total.duplicatedTokens) / total.tokens) > 0.0051 ||
    Math.abs(total.percentage - (100 * total.duplicatedLines) / total.lines) > 0.0051
  )
    throw new GateFailure("incomplete-report", `${gate}: invalid or ambiguous jscpd report counters`);
  for (const clone of report.duplicates) {
    if (
      !knownKeys(clone, ["firstFile", "secondFile", "format", "fragment", "isNew", "kind", "lines", "tokens"]) ||
      clone.format !== "typescript" ||
      clone.kind !== "exact" ||
      clone.isNew !== false ||
      typeof clone.fragment !== "string" ||
      !clone.fragment ||
      !nonnegativeInteger(clone.lines) ||
      clone.lines < 1 ||
      !nonnegativeInteger(clone.tokens) ||
      clone.tokens < 1 ||
      clone.tokens > total.tokens
    )
      throw new GateFailure("incomplete-report", `${gate}: unknown jscpd clone schema`);
    for (const location of [clone.firstFile, clone.secondFile]) {
      if (
        !knownKeys(location, ["name", "start", "end", "startLoc", "endLoc"]) ||
        typeof location.name !== "string" ||
        !isAbsolute(location.name) ||
        !nonnegativeInteger(location.start) ||
        location.start < 1 ||
        !nonnegativeInteger(location.end) ||
        location.end < location.start
      )
        throw new GateFailure("incomplete-report", `${gate}: invalid jscpd clone file identity`);
      const file = relative(realpathSync(snapshot), realpathSync(location.name));
      if (!files.includes(file))
        throw new GateFailure("policy-refusal", `${gate}: jscpd clone escaped the selected ${corpusLabel} corpus`);
      const source = readFileSync(join(snapshot, file));
      for (const point of [location.startLoc, location.endLoc]) {
        if (
          !knownKeys(point, ["column", "line", "position"]) ||
          !nonnegativeInteger(point.column) ||
          !nonnegativeInteger(point.line) ||
          point.line < 1 ||
          point.line > source.toString("utf8").split("\n").length ||
          !nonnegativeInteger(point.position) ||
          point.position > source.length
        )
          throw new GateFailure("incomplete-report", `${gate}: invalid jscpd clone location`);
      }
      location.name = file;
    }
  }
  return { clones: report.duplicates as JscpdClone[], total: total as Record<string, number> };
}

/**
 * One jscpd scan over an explicit file list, in an owned snapshot, under the
 * hermetic runner environment. The full scope scans the whole declared
 * corpus; the staged scope scans the changed corpus files. Both use this
 * argv, so neither can drift into a changed-only scan or into a profile that
 * owns the threshold or the exclusions.
 */
async function jscpdScan(
  gate: string,
  snapshot: string,
  files: string[],
  output: string,
  corpusLabel: string,
  runner: (args: string[], cwd: string) => Promise<string>,
): Promise<JscpdScan> {
  for (const file of files) {
    // Match jscpd 5.4.2's raw find_ignore_ranges, not JS comment semantics:
    // its slash-comment scan can make literal text effective too.
    let ignored = false;
    for (const [comment] of readFileSync(join(snapshot, file), "utf8").matchAll(
      /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/gu,
    )) {
      if (comment.includes("jscpd:ignore-start")) ignored = true;
      else if (ignored && comment.includes("jscpd:ignore-end")) {
        throw new GateFailure("policy-refusal", `G5: source-level jscpd ignore range is forbidden: ${file}`);
      }
    }
  }
  // A scan must not inherit jscpd's silent one-megabyte file exclusion.
  const largestSourceBytes = Math.max(1, ...files.map((path) => readFileSync(join(snapshot, path)).length));
  await runner(
    [
      "jscpd",
      "--config",
      ".jscpd.json",
      "--reporters",
      "json",
      "--output",
      output,
      "--absolute",
      "--no-gitignore",
      "--max-size",
      String(largestSourceBytes),
      ...files.map((path) => `./${path}`),
    ],
    snapshot,
  );
  return readJscpdScan(gate, snapshot, files, join(output, "jscpd-report.json"), corpusLabel);
}

/**
 * The staged form of G5: the changed files in the declared duplication corpus.
 *
 * §5.4's pre-commit cell for G5 is "changed files, partial feedback". The
 * staged scan covers the changed corpus files only, and it draws the same line
 * the merge bar draws: a clone whose file pair already existed at the approved
 * base is the base's, not this change's. A clone the base does not have is
 * introduced, and it fails.
 */
async function stagedDuplicationGate(
  gate: string,
  root: string,
  baseSha: string,
  headSha: string,
  env: ProcessEnv,
  changedFiles: string[],
): Promise<QualityResult> {
  if (!Array.isArray(changedFiles) || changedFiles.some((file) => typeof file !== "string" || !file))
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the staged scope needs the changed file paths; the list it was given is invalid`,
    );
  const gitEnv = hermeticGitEnv(env);
  const git = hermeticGit(root, gitEnv);
  const config = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const declared = config.quality?.duplication ?? {};
  const corpus = declared.corpus ?? "src/**/*.ts";
  const corpusLabel = `the declared duplication corpus (${corpus})`;
  const notChecked =
    "the merge bar — the complete approved corpus and its total-percentage baseline — is a different check; this partial feedback over the changed files does not replace it";
  // The scanned set: the changed files the declared corpus covers. The index
  // decides what a staged path is: a regular file is source, a symlink or a
  // submodule is not.
  const inCorpus = [...new Set(changedFiles.filter((file) => inScope(file, [corpus])))].sort();
  const modes = new Map<string, string>();
  for (const entry of git("ls-files", "--stage", "-z").split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t");
    modes.set(entry.slice(tab + 1), entry.slice(0, tab).split(" ")[0]);
  }
  const files = inCorpus.filter((file) => ["100644", "100755"].includes(modes.get(file) ?? ""));
  if (!files.length)
    return {
      gate,
      status: "n/a",
      scope: "staged",
      reason: `no changed file is a regular source file in ${corpusLabel}; nothing was scanned`,
      checked: `the changed files were checked against ${corpusLabel}; none of them is in it, so no file was scanned`,
      notChecked,
    };
  // The reviewed profile is the base's. The staged content must not own the
  // measurement's own configuration, so a staged profile that differs from the
  // reviewed one is a refusal, not a scan under a policy the change chose.
  const reviewed = git("ls-tree", "-z", baseSha, "--", ".jscpd.json");
  const reviewedBlob = /^100(?:644|755) blob ([a-f0-9]+)\t/u.exec(reviewed)?.[1];
  if (!reviewedBlob)
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the approved base has no regular reviewed jscpd profile; the measurement profile is required`,
    );
  let profile: {
    minTokens?: unknown;
    minLines?: unknown;
    threshold?: unknown;
    ignore?: unknown;
    ignorePattern?: unknown;
  };
  try {
    profile = JSON.parse(git("show", `${baseSha}:.jscpd.json`));
  } catch {
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the approved base has no readable reviewed jscpd profile; the measurement profile is required`,
    );
  }
  const stagedBlob = /^100(?:644|755) ([a-f0-9]+) 0\t/u.exec(
    git("ls-files", "--stage", "-z", "--", ".jscpd.json"),
  )?.[1];
  if (!stagedBlob || stagedBlob !== reviewedBlob)
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the staged jscpd profile differs from the reviewed base profile; the measurement policy is not the change's to alter`,
    );
  if (profile.minTokens !== 50 || profile.minLines !== 5)
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the reviewed jscpd profile does not declare the reviewed clone floors (50 tokens, 5 lines)`,
    );
  if (profile.threshold !== undefined)
    throw new GateFailure("policy-refusal", `${gate}: the reviewed jscpd profile must not own a duplication threshold`);
  if (profile.ignore !== undefined || profile.ignorePattern !== undefined)
    throw new GateFailure("policy-refusal", `${gate}: the reviewed jscpd profile must not ignore sources`);
  const temporary = mkdtempSync(join(tmpdir(), "superman-quality-staged-"));
  try {
    const runnerEnv = hermeticEnvironment(temporary, env);
    const runner = qualityRunner(gate, runnerEnv);
    const binaries: Record<string, string> = { jscpd: "jscpd/run-jscpd.js" };
    const snapshot = ownedIndexSnapshot(root, temporary, "candidate", gitEnv, binaries);
    const expected = config.tools.jscpd;
    const declaredTool = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies?.jscpd;
    const installed = JSON.parse(readFileSync(join(root, "node_modules/jscpd/package.json"), "utf8")).version;
    if (expected !== "5.4.2" || expected !== declaredTool || expected !== installed)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: jscpd pin mismatch: expected ${expected}, declared ${declaredTool}, installed ${installed}`,
      );
    const executableVersion = (await runner(["jscpd", "--version"], snapshot)).trim();
    if (executableVersion !== `jscpd ${expected}`)
      throw new GateFailure("policy-refusal", `${gate}: jscpd executable pin mismatch: ${executableVersion}`);
    const scan = await jscpdScan(
      gate,
      snapshot,
      files,
      join(snapshot, ".superman-ci", "duplication"),
      "staged",
      runner,
    );
    // The base scan covers the same file names at the approved base. A file
    // the base does not have contributes no base clone, so every clone that
    // involves it is introduced.
    const baseFiles = files.filter((file) => /^100(?:644|755) blob /u.test(git("ls-tree", "-z", baseSha, "--", file)));
    const baseSnapshot = baseFiles.length
      ? ownedSnapshot(root, temporary, "base", baseSha, gitEnv, binaries)
      : undefined;
    const baseScan = baseSnapshot
      ? await jscpdScan(
          gate,
          baseSnapshot,
          baseFiles,
          join(baseSnapshot, ".superman-ci", "duplication"),
          "base",
          runner,
        )
      : undefined;
    // The stable identity of a clone across two versions of the same files is
    // its file pair: the line ranges shift, the pair does not.
    const pair = (clone: JscpdClone) => [clone.firstFile.name, clone.secondFile.name].sort().join("\u0000");
    const basePairs = new Set((baseScan?.clones ?? []).map(pair));
    const introduced = scan.clones.filter((clone) => !basePairs.has(pair(clone)));
    if (introduced.length)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: the changed files introduce ${introduced.length} duplicate clone(s) the approved base does not have: ${introduced
          .map(
            (clone) =>
              `${clone.firstFile.name} <-> ${clone.secondFile.name} (${clone.lines} line(s), ${clone.tokens} token(s))`,
          )
          .join("; ")}`,
      );
    return {
      gate,
      status: "pass",
      scope: "staged",
      reason: "no duplicate clone the approved base does not already have",
      metrics: {
        changedFilesPct: scan.total.percentage,
        clones: scan.total.clones,
        sources: scan.total.sources,
        lines: scan.total.lines,
        tokens: scan.total.tokens,
      },
      evidence: {
        baseSha,
        headSha,
        candidate: "the staged index",
        files,
        clones: scan.clones,
        introduced: [],
        preexistingClones: scan.clones.length,
        baseClones: baseScan?.clones.length ?? 0,
        tools: { jscpd: { expected, declared: declaredTool, installed, executableVersion } },
      },
      checked: `the changed files in ${corpusLabel}: ${files.map((file) => `./${file}`).join(", ")} scanned for exact clones`,
      notChecked,
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/**
 * The declared critical cases are executed fresh, outside affected selection
 * and result caches. A case that does not pass blocks: a declared critical
 * case is an execution, not an existence check.
 */
async function executeCriticalCases(
  critical: CriticalCase[],
  gate: string,
  root: string,
  env: ProcessEnv,
): Promise<{ id: string; case: string; runner: string; status: string }[]> {
  const outcomes: { id: string; case: string; runner: string; status: string }[] = [];
  for (const entry of critical) {
    // A case that runs the gates must not run the declared cases again.
    if (env.SUPERMAN_CRITICAL_CASE_CHILD === "1") {
      outcomes.push({
        id: entry.id,
        case: entry.case,
        runner: entry.runner,
        status: "delegated to the parent run",
      });
      continue;
    }
    // A `node-test` case is a Node test file and runs under the Node test
    // runner. The Deno runtime has no `process.execPath` for Node, so the
    // Node runtime is named by the same PATH the Node original's environment
    // provides; the runner, the arguments and the outcome are unchanged.
    const argv =
      entry.runner === "node-test"
        ? ["node", "--test", "--test-concurrency=1", entry.case]
        : ["pnpm", "exec", "vitest", "run", "--config", "vitest.config.ts", "--no-cache", entry.case];
    const result = await runOwned(argv[0], argv.slice(1), {
      cwd: root,
      env: {
        ...env,
        SUPERMAN_CRITICAL_CASE_CHILD: "1",
        ARCHGATE_TELEMETRY: "0",
        PNPM_CONFIG_IGNORE_SCRIPTS: "true",
        PNPM_CONFIG_IGNORE_PNPMFILE: "true",
        PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
        PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: "false",
      },
      encoding: "utf8",
      shell: false,
      timeout: 600_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || result.signal || result.status !== 0)
      throw new GateFailure(
        "failed-command",
        `${gate}: declared critical case ${entry.id} failed (${entry.case}, ${entry.runner}): ${result.status ?? result.signal}\n${result.stderr ?? ""}`,
      );
    outcomes.push({ id: entry.id, case: entry.case, runner: entry.runner, status: "pass" });
  }
  return outcomes;
}

/**
 * A mutant's identity, derived from the source it mutates.
 *
 * The identity has to survive a change elsewhere in the same file, so it
 * cannot be the mutant's line number or its index. It is the mutator, the
 * source text the mutant replaced and the replacement itself: an unrelated
 * edit above the mutant shifts its position but not its text, and a mutant
 * whose own source changed is a different mutant, which is exactly what
 * "introduced" has to mean.
 */
function mutantIdentity(
  mutant: {
    mutatorName: string;
    replacement: string;
    location: { start: { line: number; column: number }; end: { line: number; column: number } };
  },
  source: string,
): string {
  const lines = source.split("\n");
  const at = (line: number) => lines[line - 1] ?? "";
  const { start, end } = mutant.location;
  const first = at(start.line).slice(start.column - 1);
  const last = at(end.line).slice(0, end.column - 1);
  const original = start.line === end.line ? first : [first, ...lines.slice(start.line, end.line - 1), last].join("\n");
  return `${mutant.mutatorName}:${original}->${mutant.replacement}`;
}

/**
 * The candidate survivors the approved base does not already have.
 *
 * The comparison is on identities, not on counts. A count comparison lets a
 * new survivor hide behind one the base had and the candidate killed: the
 * numbers match, so nothing blocks, and an introduced critical survivor goes
 * unreported.
 */
export function introducedSurvivors(
  base: { identity?: string }[],
  candidate: { identity?: string }[],
): { identity: string; file?: string }[] {
  const known = new Set(base.map((survivor) => survivor.identity ?? ""));
  return candidate
    .filter((survivor) => !known.has(survivor.identity ?? ""))
    .map((survivor) => ({ identity: survivor.identity ?? "", file: (survivor as { file?: string }).file }));
}

export async function qualityGate(
  gate: string,
  root: string,
  baseSha: string,
  headSha: string,
  env: ProcessEnv,
  scope: QualityScope = { scope: "full", changedFiles: [] },
): Promise<QualityResult> {
  if (!["G5", "G6"].includes(gate)) throw new GateFailure("policy-refusal", `Unsupported quality gate ${gate}`);
  if (scope.scope === "staged") {
    // §5.4's pre-commit cell for G5 is "changed files, partial feedback". Only
    // G5 declares a staged form; the mutation gate is off at the staged scope.
    if (gate !== "G5")
      throw new GateFailure(
        "policy-refusal",
        `${gate}: the staged scope declares no form of this gate; the full scope owns it`,
      );
    return await stagedDuplicationGate(gate, root, baseSha, headSha, env, scope.changedFiles);
  }
  const gitEnv = hermeticGitEnv(env);
  const git = hermeticGit(root, gitEnv);
  // The reviewed policy is read from the evaluated candidate, in one place:
  // the driver reads the same file. The approved base must carry the same
  // policy bytes, and the measurement-input check below refuses a policy
  // that differs, so the declared cases, corpus and scope are the approved
  // ones.
  const config = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const declaredQuality = config.quality ?? {};
  const declaredDuplication = declaredQuality.duplication ?? {};
  const declaredMutation = declaredQuality.mutation ?? {};
  // The reviewed clone floors stay pinned: a floor is never lowered. The
  // corpus and the mutation scope are the declared ones and the declared
  // ones are applied; a change to either is a change to the measurement
  // inputs, and the reviewed baseline hash below is what refuses it.
  const corpus = declaredDuplication.corpus ?? "src/**/*.ts";
  const minTokens = declaredDuplication.minTokens ?? 50;
  const minLines = declaredDuplication.minLines ?? 5;
  const mutationScope = declaredMutation.scope ?? ["src/**/*.ts", "!src/**/*.test.ts"];
  if (minTokens !== 50 || minLines !== 5)
    throw new GateFailure(
      "policy-refusal",
      `${gate}: the declared clone floors changed (${minTokens} tokens, ${minLines} lines); Gate 1 baseline refresh required`,
    );
  const duplicationPatterns = [corpus];
  const mutationPatterns = mutationScope;
  const sources = (sha: string, patterns: string[]) =>
    git("ls-tree", "-r", "--name-only", "-z", sha)
      .split("\0")
      .filter((path) => path && inScope(path, patterns))
      .sort();
  const before = sources(baseSha, gate === "G5" ? duplicationPatterns : mutationPatterns);
  const after = sources(headSha, gate === "G5" ? duplicationPatterns : mutationPatterns);
  for (const [sha, files] of [
    [baseSha, before],
    [headSha, after],
  ] as const) {
    for (const file of files) {
      if (!/^100(?:644|755) blob /u.test(git("ls-tree", "-z", sha, "--", file)))
        throw new GateFailure(
          "policy-refusal",
          `${gate}: quality scopes require regular committed source files: ${file}`,
        );
    }
  }
  // The declared critical cases are owner-governed policy: a missing case or
  // module blocks before any baseline or measurement decision is taken.
  const critical = gate === "G6" ? assertCriticalCases(declaredMutation.critical, gate, git, headSha) : [];
  const criticalCases = critical.length ? await executeCriticalCases(critical, gate, root, env) : [];
  if (!before.length && !after.length) {
    return {
      gate,
      status: "n/a",
      reason: "no TypeScript source",
      ...(criticalCases.length ? { evidence: { criticalCases } } : {}),
    };
  }
  let baseline: { jscpdPct: number; mutationScore: number; qualityInputsHash: string } | undefined;
  let proposed: { jscpdPct: number; mutationScore: number; qualityInputsHash: string } | undefined;
  const validBaseline = (value: { jscpdPct: number; mutationScore: number; qualityInputsHash: string }): boolean =>
    !!value &&
    Object.keys(value).every((key) => ["jscpdPct", "mutationScore", "qualityInputsHash"].includes(key)) &&
    [value.jscpdPct, value.mutationScore].every(
      (metric) => typeof metric === "number" && Number.isFinite(metric) && metric >= 0 && metric <= 100,
    ) &&
    /^[a-f0-9]{64}$/u.test(value.qualityInputsHash);
  const baselineEntry = git("ls-tree", "-z", baseSha, "--", "superman.ratchet.json");
  if (before.length || baselineEntry) {
    if (!/^100(?:644|755) blob /u.test(baselineEntry)) {
      const candidateEntry = git("ls-tree", "-z", headSha, "--", "superman.ratchet.json");
      if (!/^100(?:644|755) blob /u.test(candidateEntry))
        throw new GateFailure(
          "policy-refusal",
          `${gate}: reviewed superman.ratchet.json is missing; first-source baseline follow-up required`,
        );
      if (!/^spec\/[a-z0-9][a-z0-9-]*$/u.test(Deno.env.get("HEAD_REF") ?? ""))
        throw new GateFailure(
          "policy-refusal",
          `${gate}: ordinary work cannot initialize the baseline; spec-kind follow-up required`,
        );
      try {
        proposed = JSON.parse(git("show", `${headSha}:superman.ratchet.json`));
        if (!proposed || !validBaseline(proposed)) throw new GateFailure("policy-refusal", "invalid baseline fields");
      } catch {
        throw new GateFailure(
          "policy-refusal",
          `${gate}: invalid reviewed superman.ratchet.json; Gate 1 baseline refresh required`,
        );
      }
    } else {
      try {
        baseline = JSON.parse(git("show", `${baseSha}:superman.ratchet.json`));
        if (!baseline || !validBaseline(baseline)) throw new GateFailure("policy-refusal", "invalid baseline fields");
      } catch {
        throw new GateFailure(
          "policy-refusal",
          `${gate}: invalid reviewed superman.ratchet.json; Gate 1 baseline refresh required`,
        );
      }
    }
  }
  if (
    config.version !== 1 ||
    !config.tools ||
    !Array.isArray(config.policyInputs) ||
    config.policyInputs.some(
      (path: unknown) => typeof path !== "string" || path.startsWith("/") || path.split("/").includes(".."),
    )
  )
    throw new GateFailure("policy-refusal", `${gate}: invalid reviewed quality policy`);
  const ignoreInputs = [baseSha, headSha].flatMap((sha) =>
    git("ls-tree", "-r", "--name-only", "-z", sha)
      .split("\0")
      .filter((path) => matchesGlob(path, "**/.gitignore") || matchesGlob(path, "**/.ignore")),
  );
  const policies = [
    ...new Set([
      ".superman/ci/bootstrap.json",
      "pnpm-lock.yaml",
      ".npmrc",
      ".jscpd.json",
      "stryker.config.json",
      "vitest.config.ts",
      "tsconfig.json",
      ...ignoreInputs,
      ...config.policyInputs,
    ]),
  ].sort();
  const identities = policies.map((path) => {
    const approved = git("ls-tree", "-z", baseSha, "--", path);
    if (!/^100(?:644|755) blob /u.test(approved) || approved !== git("ls-tree", "-z", headSha, "--", path))
      throw new GateFailure(
        "policy-refusal",
        proposed
          ? `${gate}: changed measurement inputs; quality policy changed or unavailable: ${path}`
          : `${gate}: quality policy changed or unavailable; Gate 1 baseline refresh required: ${path}`,
      );
    // G4 owns general discovery. This narrower hash profile accepts only exact,
    // explicitly inventoried local includes, not a second optimistic resolver.
    const text = git("show", `${baseSha}:${path}`);
    const refs: string[] = [];
    try {
      if (/\.jsonc?$/u.test(path)) {
        const data = JSON.parse(text);
        if (data.extends !== undefined) refs.push(...(Array.isArray(data.extends) ? data.extends : [data.extends]));
        if (data.references !== undefined) {
          if (!Array.isArray(data.references)) throw new GateFailure("policy-refusal", "unknown references");
          for (const ref of data.references)
            refs.push(typeof ref.path === "string" && !ref.path.startsWith(".") ? `./${ref.path}` : ref.path);
        }
      } else if (/\.[cm]?[jt]sx?$/u.test(path)) {
        for (const match of text.matchAll(
          /(?:^|[;\n])\s*(?:import\s+(?:[^;]*?\sfrom\s*)?|export\s+[^;]*?\sfrom\s*)["']([^"']+)["']|\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/gu,
        ))
          refs.push(match[1] ?? match[2]);
        if (/\b(?:import|require)\s*\(\s*[^\s"']|\b(?:readFile(?:Sync)?|readdir(?:Sync)?|globSync)\s*\(/u.test(text))
          throw new GateFailure("policy-refusal", "dynamic policy input");
      }
      for (const ref of refs) {
        if (
          typeof ref !== "string" ||
          ref.startsWith("/") ||
          ref.startsWith("#") ||
          (ref.includes(":") && !ref.startsWith("node:")) ||
          (ref.startsWith(".") && !policies.includes(posix.normalize(posix.join(posix.dirname(path), ref))))
        )
          throw new GateFailure("policy-refusal", "unlisted local policy reference");
      }
    } catch {
      throw new GateFailure(
        "policy-refusal",
        `${gate}: unmodeled quality policy input in ${path}; declare exact includes and refresh the baseline at Gate 1`,
      );
    }
    return [path, approved];
  });
  const qualityInputsHash = createHash("sha256")
    .update(
      JSON.stringify({
        schema: "superman.bootstrap-quality/1",
        tools: config.tools,
        policies: identities,
        scopes: { duplication: duplicationPatterns, mutation: mutationPatterns },
        execution: { duplication: "jscpd explicit full corpus", mutation: "stryker inPlace force explicit files" },
        critical: declaredMutation.critical ?? [],
        checker: createHash("sha256").update(readFileSync(self)).digest("hex"),
        snapshotRunner: createHash("sha256")
          .update(readFileSync(join(here, "replay.ts")))
          .digest("hex"),
      }),
    )
    .digest("hex");
  if (baseline && baseline.qualityInputsHash !== qualityInputsHash)
    throw new GateFailure(
      "policy-refusal",
      `${gate}: qualityInputsHash scope/tool/config mismatch (expected ${baseline.qualityInputsHash}, actual ${qualityInputsHash}); Gate 1 baseline refresh required`,
    );
  if (proposed) {
    if (proposed.qualityInputsHash !== qualityInputsHash)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: forged qualityInputsHash (recorded ${proposed.qualityInputsHash}, actual ${qualityInputsHash}); Gate 1 baseline refresh required`,
      );
    // The first-baseline follow-up must record the measured scope unchanged.
    // The scope is the declared one, not a hard-coded path.
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new GateFailure(
        "policy-refusal",
        `${gate}: changed measurement inputs; the first-baseline follow-up must record the measured source unchanged`,
      );
  }
  if (gate === "G6" && baseline && !before.length) {
    throw new GateFailure(
      "policy-refusal",
      "G6: retained mutation baseline has an empty base scope; Gate 1 scope review and baseline refresh required",
    );
  }
  let candidateBaseline = baseline;
  if (baseline) {
    try {
      candidateBaseline = JSON.parse(git("show", `${headSha}:superman.ratchet.json`));
      if (
        !candidateBaseline ||
        candidateBaseline.qualityInputsHash !== baseline.qualityInputsHash ||
        ![candidateBaseline.jscpdPct, candidateBaseline.mutationScore].every(
          (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100,
        ) ||
        candidateBaseline.jscpdPct > baseline.jscpdPct ||
        candidateBaseline.mutationScore < baseline.mutationScore
      )
        throw new GateFailure("policy-refusal", "invalid ratchet change");
    } catch {
      throw new GateFailure(
        "policy-refusal",
        `${gate}: candidate baseline missing, loosened or re-scoped; Gate 1 baseline refresh required`,
      );
    }
  }
  if (!after.length) {
    if (
      baseline &&
      candidateBaseline &&
      (baseline.jscpdPct !== candidateBaseline.jscpdPct || baseline.mutationScore !== candidateBaseline.mutationScore)
    )
      throw new GateFailure(
        "policy-refusal",
        `${gate}: empty source scope cannot prove ratchet tightening; Gate 1 baseline refresh required`,
      );
    return {
      gate,
      status: "n/a",
      reason: "no candidate TypeScript source; reviewed source scope removed",
      evidence: { baseSha, headSha, qualityInputsHash, baseline, removed: before },
    };
  }
  const temporary = mkdtempSync(join(tmpdir(), "superman-quality-"));
  try {
    const runnerEnv = hermeticEnvironment(temporary, env);
    const binaries: Record<string, string> =
      gate === "G5"
        ? { jscpd: "jscpd/run-jscpd.js" }
        : { stryker: "@stryker-mutator/core/bin/stryker.js", vitest: "vitest/vitest.mjs", tsc: "typescript/bin/tsc" };
    const snapshot = ownedSnapshot(root, temporary, "candidate", headSha, gitEnv, binaries);
    const runner = qualityRunner(gate, runnerEnv);
    const execute = (args: string[], cwd = snapshot): Promise<string> => runner(args, cwd);
    if (gate === "G6") {
      const tools: Record<string, unknown> = {};
      for (const [name, key, command, format] of [
        ["@stryker-mutator/core", "stryker", "stryker", "plain"],
        ["@stryker-mutator/vitest-runner", "stryker", "", "plugin"],
        ["vitest", "vitest", "vitest", "vitest"],
        ["typescript", "typescript", "tsc", "typescript"],
      ]) {
        const expected = config.tools[key];
        const declared = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies?.[name];
        const installed = JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")).version;
        if (
          typeof expected !== "string" ||
          !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(expected) ||
          declared !== expected ||
          installed !== expected
        )
          throw new GateFailure(
            "policy-refusal",
            `${gate}: ${name} pin mismatch: expected ${expected}, declared ${declared}, installed ${installed}`,
          );
        const executableVersion = command ? (await execute([command, "--version"])).trim() : undefined;
        if (
          (format === "plain" && executableVersion !== expected) ||
          (format === "vitest" && !executableVersion?.startsWith(`vitest/${expected} `)) ||
          (format === "typescript" && executableVersion !== `Version ${expected}`)
        )
          throw new GateFailure("incomplete-report", `${gate}: ${name} executable pin mismatch: ${executableVersion}`);
        tools[name] = {
          expected,
          declared,
          installed,
          ...(command ? { executableVersion } : { kind: "Stryker plugin; no standalone executable" }),
        };
      }
      if (config.tools.stryker !== "10.1.1" || config.tools.vitest !== "5.0.5")
        throw new GateFailure("incomplete-report", `${gate}: unsupported pinned mutation reporter schema`);
      const mutate = async (snapshot: string, after: string[]) => {
        const declared = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies;
        if (Object.entries(tools).some(([name, pin]) => declared?.[name] !== (pin as { expected: string }).expected))
          throw new GateFailure("policy-refusal", `${gate}: snapshot tool declarations differ from reviewed pins`);
        if (after.some((file) => /[,?*[\]{}!:\\\r\n]/u.test(file)))
          throw new GateFailure("policy-refusal", `${gate}: mutation scope contains unsupported glob or range syntax`);
        const originals = new Map(after.map((file) => [file, readFileSync(join(snapshot, file), "utf8")]));
        const path = join(snapshot, ".superman-ci/mutation.json");
        rmSync(path, { force: true });
        const output = await execute(
          [
            "stryker",
            "run",
            "stryker.config.json",
            "--inPlace",
            "--force",
            "--allowConsoleColors",
            "false",
            "--mutate",
            after.join(","),
          ],
          snapshot,
        );
        if (after.some((file) => readFileSync(join(snapshot, file), "utf8") !== originals.get(file)))
          throw new GateFailure("incomplete-report", `${gate}: Stryker did not restore owned snapshot inputs`);
        if (!existsSync(path)) throw new GateFailure("incomplete-report", `${gate}: missing Stryker mutation report`);
        const report = readReport(path, gate, "Stryker");
        const keys = ["files", "schemaVersion", "thresholds", "testFiles", "projectRoot", "config", "framework"];
        if (
          !report ||
          typeof report !== "object" ||
          keys.some((key) => !Object.hasOwn(report, key)) ||
          Object.keys(report).some((key) => ![...keys, "performance", "system"].includes(key)) ||
          report.schemaVersion !== "1.0" ||
          report.framework?.name !== "StrykerJS" ||
          report.framework.version !== config.tools.stryker ||
          report.framework.dependencies?.typescript !== config.tools.typescript ||
          report.projectRoot !== realpathSync(snapshot) ||
          !report.files ||
          Array.isArray(report.files) ||
          JSON.stringify(Object.keys(report.files).sort()) !== JSON.stringify([...after].sort()) ||
          report.config?.inPlace !== true ||
          report.config.force !== true ||
          report.config.incremental !== false ||
          report.config.dryRunOnly !== false ||
          report.config.testRunner !== "vitest" ||
          JSON.stringify(report.config.mutate) !== JSON.stringify(after)
        )
          throw new GateFailure("incomplete-report", `${gate}: unknown Stryker schema or mismatched execution/scope`);
        if (
          !knownKeys(report.thresholds, ["high", "low", "break"]) ||
          ![report.thresholds.high, report.thresholds.low].every(
            (value) => nonnegativeInteger(value) && value <= 100,
          ) ||
          report.thresholds.low > report.thresholds.high ||
          report.thresholds.break !== null ||
          !report.testFiles ||
          typeof report.testFiles !== "object" ||
          Array.isArray(report.testFiles)
        )
          throw new GateFailure(
            "incomplete-report",
            `${gate}: unknown Stryker threshold/test schema or unsupported global break floor`,
          );
        const testIds = new Set<string>();
        for (const file of Object.values(report.testFiles) as { tests: { id: string; name: string }[] }[]) {
          if (!knownKeys(file, ["tests"], ["source"]) || !Array.isArray(file.tests))
            throw new GateFailure("incomplete-report", `${gate}: invalid Stryker test identities`);
          for (const test of file.tests) {
            if (
              !knownKeys(test, ["id", "name"], ["location"]) ||
              typeof test.id !== "string" ||
              typeof test.name !== "string" ||
              !test.name ||
              testIds.has(test.id)
            )
              throw new GateFailure("incomplete-report", `${gate}: invalid Stryker test identities`);
            testIds.add(test.id);
          }
        }
        if (!testIds.size)
          throw new GateFailure("incomplete-report", `${gate}: missing Stryker test completion identities`);
        const counts: Record<string, number> = {
          Killed: 0,
          Survived: 0,
          NoCoverage: 0,
          CompileError: 0,
          RuntimeError: 0,
          Timeout: 0,
          Ignored: 0,
          Pending: 0,
        };
        const ids = new Set<string>();
        const mutants: Record<string, unknown>[] = [];
        for (const file of after) {
          const entry = report.files[file];
          if (
            !knownKeys(entry, ["language", "source", "mutants"]) ||
            entry.language !== "typescript" ||
            entry.source !== originals.get(file) ||
            !Array.isArray(entry.mutants)
          )
            throw new GateFailure("incomplete-report", `${gate}: invalid Stryker file identity/source`);
          for (const mutant of entry.mutants) {
            if (
              !knownKeys(
                mutant,
                ["id", "mutatorName", "location", "status", "replacement"],
                ["coveredBy", "description", "duration", "killedBy", "static", "statusReason", "testsCompleted"],
              ) ||
              typeof mutant.id !== "string" ||
              !mutant.id ||
              ids.has(mutant.id) ||
              !Object.hasOwn(counts, mutant.status) ||
              typeof mutant.mutatorName !== "string" ||
              !mutant.mutatorName ||
              typeof mutant.replacement !== "string" ||
              !knownKeys(mutant.location, ["start", "end"])
            )
              throw new GateFailure(
                "incomplete-report",
                `${gate}: unknown or invalid Stryker mutant status/schema: ${file} ${JSON.stringify(mutant)}`,
              );
            ids.add(mutant.id);
            for (const position of [mutant.location.start, mutant.location.end]) {
              if (
                !knownKeys(position, ["line", "column"]) ||
                !Number.isSafeInteger(position.line) ||
                position.line < 1 ||
                !Number.isSafeInteger(position.column) ||
                position.column < 1 ||
                position.line > entry.source.split("\n").length ||
                position.column > entry.source.split("\n")[position.line - 1].length + 1
              )
                throw new GateFailure("incomplete-report", `${gate}: invalid Stryker mutant location`);
            }
            if (
              mutant.location.end.line < mutant.location.start.line ||
              (mutant.location.end.line === mutant.location.start.line &&
                mutant.location.end.column < mutant.location.start.column) ||
              (mutant.testsCompleted !== undefined &&
                (!nonnegativeInteger(mutant.testsCompleted) || mutant.testsCompleted > testIds.size)) ||
              (mutant.duration !== undefined &&
                (typeof mutant.duration !== "number" || !Number.isFinite(mutant.duration) || mutant.duration < 0)) ||
              (mutant.static !== undefined && typeof mutant.static !== "boolean") ||
              (mutant.statusReason !== undefined && typeof mutant.statusReason !== "string") ||
              (mutant.description !== undefined && typeof mutant.description !== "string")
            )
              throw new GateFailure("incomplete-report", `${gate}: invalid Stryker mutant completion metadata`);
            for (const key of ["coveredBy", "killedBy"])
              if (
                mutant[key] !== undefined &&
                (!Array.isArray(mutant[key]) ||
                  new Set(mutant[key]).size !== mutant[key].length ||
                  mutant[key].some((id: string) => !testIds.has(id)))
              )
                throw new GateFailure("incomplete-report", `${gate}: inconsistent Stryker test identities`);
            if (
              mutant.status === "Killed" &&
              (!Array.isArray(mutant.killedBy) ||
                !mutant.killedBy.length ||
                mutant.killedBy.some((id: string) => !testIds.has(id)) ||
                !Number.isSafeInteger(mutant.testsCompleted) ||
                mutant.testsCompleted < 1)
            )
              throw new GateFailure("policy-refusal", `${gate}: missing mutant completion/kill evidence`);
            if (
              (mutant.status === "Survived" &&
                (!nonnegativeInteger(mutant.testsCompleted) || mutant.testsCompleted < 1)) ||
              (mutant.status !== "Killed" && mutant.killedBy?.length) ||
              (mutant.status === "NoCoverage" && mutant.coveredBy?.length)
            )
              throw new GateFailure(
                "incomplete-report",
                `${gate}: inconsistent Stryker mutant status/completion evidence`,
              );
            counts[mutant.status]++;
            const { duration: _duration, ...stable } = mutant;
            mutants.push({ file, identity: mutantIdentity(mutant, entry.source), ...stable });
          }
        }
        const instrumented = /Instrumented (\d+) source file\(s\) with (\d+) mutant\(s\)/u.exec(output);
        if (
          !ids.size ||
          !instrumented ||
          Number(instrumented[1]) !== after.length ||
          Number(instrumented[2]) !== ids.size
        )
          throw new GateFailure(
            "incomplete-report",
            `${gate}: zero mutants or inconsistent Stryker instrumented counters`,
          );
        if (["CompileError", "RuntimeError", "Timeout", "Ignored", "Pending"].some((status) => counts[status]))
          throw new GateFailure(
            "policy-refusal",
            `${gate}: incomplete or ambiguous mutation outcomes: ${JSON.stringify({ counts, mutants })}`,
          );
        const survivors = mutants.filter((mutant) => mutant.status === "Survived" || mutant.status === "NoCoverage");
        return {
          files: after,
          mutationScore: (100 * counts.Killed) / ids.size,
          totalMutants: ids.size,
          counts,
          survivors,
          mutants,
          restored: true,
        };
      };
      if (proposed) {
        const { files, mutants, restored, ...metrics } = await mutate(snapshot, after);
        if (metrics.mutationScore !== proposed.mutationScore)
          throw new GateFailure(
            "policy-refusal",
            `${gate}: forged baseline metric; recorded mutationScore ${proposed.mutationScore} does not match measured ${metrics.mutationScore}`,
          );
        return {
          gate,
          status: "pass",
          reason: "verified first-baseline initialization",
          metrics,
          evidence: {
            baseSha,
            headSha,
            qualityInputsHash,
            files,
            mutants,
            restored,
            baseline: proposed,
            tools,
            criticalCases,
          },
        };
      }
      if (!baseline) {
        const { files, mutants, restored, ...metrics } = await mutate(snapshot, after);
        return {
          gate,
          status: "pass",
          reason: "measured initialization; no approved-base source comparison",
          metrics,
          evidence: { baseSha, headSha, qualityInputsHash, files, mutants, restored, tools, criticalCases },
        };
      }
      // The change model is the declared scope's, not a hard-coded path: a
      // declared scope that reaches outside `src/` has its own changed files.
      const changed = new Set(
        git("diff", "--name-only", "-z", "--no-renames", baseSha, headSha)
          .split("\0")
          .filter((path) => path && inScope(path, mutationPatterns)),
      );
      const existing = after.filter((file) => before.includes(file) && changed.has(file));
      const added = after.filter((file) => !before.includes(file));
      const removed = before.filter((file) => !after.includes(file));
      if (removed.length && added.length)
        throw new GateFailure(
          "policy-refusal",
          `${gate}: ambiguous mutation scope relocation; Gate 1 reviewed mapping and baseline refresh required: ${JSON.stringify({ removed, added })}`,
        );
      const evidence = {
        baseSha,
        headSha,
        qualityInputsHash,
        baseline,
        candidateBaseline,
        tools,
        removed,
        criticalCases,
      };
      const tightening = candidateBaseline && candidateBaseline.mutationScore > baseline.mutationScore;
      let baseSnapshot: string | undefined;
      const ownedBase = () => {
        baseSnapshot ??= ownedSnapshot(root, temporary, "base", baseSha, gitEnv, binaries);
        return baseSnapshot;
      };
      // A declared critical module is measured at the approved base and at the
      // candidate whenever the applied scope covers it. The scope is the
      // declared one, so a declared module outside `src/` is measured too.
      const criticalModules = [...new Set(critical.map((entry) => entry.module))].filter(
        (module) => inScope(module, mutationPatterns) && after.includes(module),
      );
      let criticalOutcome:
        | {
            modules: string[];
            base: Record<string, number>;
            candidate: Record<string, number>;
            introduced: Record<string, string[]>;
          }
        | undefined;
      if (criticalModules.length) {
        const measuredBase = criticalModules.filter((module) => before.includes(module));
        const baseCritical = measuredBase.length ? await mutate(ownedBase(), measuredBase) : undefined;
        const candidateCritical = await mutate(snapshot, criticalModules);
        const baseSurvivors: Record<string, number> = {};
        const candidateSurvivors: Record<string, number> = {};
        const introduced: Record<string, string[]> = {};
        for (const module of criticalModules) {
          const baseRecords = (baseCritical?.survivors ?? []).filter((survivor) => survivor.file === module);
          const candidateRecords = candidateCritical.survivors.filter((survivor) => survivor.file === module);
          baseSurvivors[module] = baseRecords.length;
          candidateSurvivors[module] = candidateRecords.length;
          const new_ = introducedSurvivors(baseRecords, candidateRecords);
          introduced[module] = new_.map((survivor) => survivor.identity);
          if (new_.length)
            throw new GateFailure(
              "critical-survivor",
              `${gate}: introduced critical survivor in ${module}: ${new_.length} survivor(s) the approved base does not have: ${new_.map((survivor) => survivor.identity).join(" | ")}`,
            );
        }
        criticalOutcome = { modules: criticalModules, base: baseSurvivors, candidate: candidateSurvivors, introduced };
      }
      if (!existing.length && !added.length && !tightening)
        return { gate, status: "n/a", reason: "no changed-existing or new product mutation scope", evidence };
      let comparison:
        | {
            files: string[];
            base: Awaited<ReturnType<typeof mutate>>;
            candidate: Awaited<ReturnType<typeof mutate>>;
          }
        | undefined;
      if (existing.length) {
        comparison = {
          files: existing,
          base: await mutate(ownedBase(), existing),
          candidate: await mutate(snapshot, existing),
        };
        if (
          comparison.candidate.counts.Killed * comparison.base.totalMutants <
          comparison.base.counts.Killed * comparison.candidate.totalMutants
        )
          throw new GateFailure(
            "policy-refusal",
            `${gate}: comparable-scope mutation regression ${comparison.candidate.mutationScore} < base ${comparison.base.mutationScore}; ${JSON.stringify(comparison)}`,
          );
      }
      const initialization = added.length ? await mutate(snapshot, added) : undefined;
      const ratchetTightening = tightening ? await mutate(snapshot, after) : undefined;
      if (ratchetTightening && candidateBaseline && ratchetTightening.mutationScore < candidateBaseline.mutationScore)
        throw new GateFailure(
          "policy-refusal",
          `${gate}: whole-repo mutation ratchet ${ratchetTightening.mutationScore} is below proposed ${candidateBaseline.mutationScore}; ${JSON.stringify(ratchetTightening)}`,
        );
      return {
        gate,
        status: "pass",
        reason: added.length
          ? "equivalent existing scope nonregressing; new files have measured initialization"
          : tightening
            ? "whole-repo mutation ratchet tightening measured"
            : "equivalent existing mutation scope nonregressing",
        metrics: {
          ...(comparison ? { comparison } : {}),
          ...(initialization ? { initialization } : {}),
          ...(ratchetTightening ? { ratchetTightening } : {}),
          ...(criticalOutcome ? { critical: criticalOutcome } : {}),
        },
        evidence,
      };
    }
    const expected = config.tools.jscpd;
    const declared = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies?.jscpd;
    const installed = JSON.parse(readFileSync(join(root, "node_modules/jscpd/package.json"), "utf8")).version;
    if (expected !== "5.4.2" || expected !== declared || expected !== installed)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: jscpd pin mismatch: expected ${expected}, declared ${declared}, installed ${installed}`,
      );
    // The reviewed tool profile keeps the corpus and the clone floors explicit.
    // A threshold would re-base the percentage; an ignore list would re-scope
    // the corpus. Neither may appear in the reviewed profile.
    const profile = JSON.parse(git("show", `${baseSha}:.jscpd.json`));
    if (profile.minTokens !== minTokens || profile.minLines !== minLines)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: the reviewed jscpd profile does not declare the reviewed clone floors (${minTokens} tokens, ${minLines} lines)`,
      );
    if (profile.threshold !== undefined)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: the reviewed jscpd profile must not own a duplication threshold`,
      );
    if (profile.ignore !== undefined || profile.ignorePattern !== undefined)
      throw new GateFailure("policy-refusal", `${gate}: the reviewed jscpd profile must not ignore sources`);
    const executableVersion = (await execute(["jscpd", "--version"])).trim();
    if (executableVersion !== `jscpd ${expected}`)
      throw new GateFailure("policy-refusal", `${gate}: jscpd executable pin mismatch: ${executableVersion}`);
    const scan = await jscpdScan(gate, snapshot, after, join(snapshot, ".superman-ci", "duplication"), "full", execute);
    const total = scan.total;
    const metrics = {
      jscpdPct: total.percentage,
      clones: total.clones,
      sources: total.sources,
      lines: total.lines,
      tokens: total.tokens,
    };
    if (proposed && total.percentage !== proposed.jscpdPct)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: forged baseline metric; recorded jscpdPct ${proposed.jscpdPct} does not match measured ${total.percentage}`,
      );
    const threshold = candidateBaseline?.jscpdPct;
    if (threshold !== undefined && total.percentage > threshold)
      throw new GateFailure(
        "policy-refusal",
        `${gate}: duplication regression ${total.percentage} > approved ${threshold}; ${JSON.stringify({ metrics, files: after, clones: scan.clones })}`,
      );
    return {
      gate,
      status: "pass",
      reason: proposed
        ? "verified first-baseline initialization"
        : baseline
          ? "full corpus satisfies reviewed duplication baseline"
          : "measured initialization; no approved-base source comparison",
      metrics,
      evidence: {
        baseSha,
        headSha,
        qualityInputsHash,
        files: after,
        clones: scan.clones,
        ...(baseline || proposed ? { baseline: baseline ?? proposed } : {}),
        tools: { jscpd: { expected, declared, installed, executableVersion } },
      },
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
