#!/usr/bin/env deno
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, matchesGlob, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import {
  ALL_GATES,
  assertFullStage,
  directGate,
  execute as executeTool,
  type FailureKind,
  failureKind,
  type GateContext,
  GateFailure,
  type GateResult,
  mutationLane,
  runProfile,
  type StageScope,
  stagePolicy,
} from "./direct-gates.ts";
import { bindsWholeTree, changedEvidenceInputs, committedTreeMatches } from "./evidence.ts";
// Protected bootstrap entrypoint; ticket 06 may replace it only after parity.
//
// The Deno sibling of the Node original. The receipt shape, the gate
// inventory, the failure kinds and the publication rules are unchanged.
import { execFileSync } from "./exec.ts";
import { fixtureEnvironment } from "./fixture-env.ts";
import { qualityGate } from "./quality.ts";
import { nodeRuntimeVersion, replayBehavior } from "./replay.ts";

const { values } = parseArgs({
  options: {
    gate: { type: "string" },
    base: { type: "string", default: "origin/main" },
    receipt: { type: "string" },
    stage: { type: "string" },
  },
});
const env = { ...fixtureEnvironment(), GIT_OPTIONAL_LOCKS: "0" };
const git = (...args: string[]) => execFileSync("git", args, { env, encoding: "utf8", shell: false }).trim();
function gitOptional(...args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { env, encoding: "utf8", shell: false }).trim();
  } catch {
    return undefined;
  }
}
/**
 * The identity of the staged snapshot: every index entry's mode, blob and path.
 * A staged run's input is the index, so this is what must not change while the
 * checks run.
 */
function stagedInputsId(): string {
  return createHash("sha256")
    .update(git("ls-files", "--stage", "-z"))
    .digest("hex");
}

/** True when a tracked file has an unstaged modification. */
function unstagedChanges(): boolean {
  try {
    execFileSync("git", ["diff", "--quiet"], { env, encoding: "utf8", shell: false });
    return false;
  } catch {
    return true;
  }
}
/**
 * A staged gate result. The staged scope reports the scope it checked and the
 * half of the gate it did not, so a staged result can never be read as the
 * whole gate.
 */
type StagedGateResult = {
  gate: string;
  status: "pass" | "n/a" | "fail";
  reason?: string;
  kind?: FailureKind;
  [key: string]: unknown;
};

/**
 * The pinned tools a staged test run binds.
 *
 * The declared, installed and executable versions of every tool the run uses
 * must agree before a test runs, exactly as the full scope's gates require.
 * The Node runtime that executes the toolchain is the toolchain's own Node
 * runtime, so the recorded identity is the one that will actually run the
 * tools — the Node original's own value on the same host.
 */
async function stagedToolIdentities(ctx: GateContext, tools: Record<string, unknown>): Promise<void> {
  const root = ctx.root;
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const nodeVersion = nodeRuntimeVersion(ctx.env);
  if (policy.tools.node !== nodeVersion && policy.tools.node !== nodeVersion.split(".")[0])
    throw new GateFailure("policy-refusal", `G9: Node pin expected ${policy.tools.node}, actual ${nodeVersion}`);
  tools.node = { expected: policy.tools.node, actual: nodeVersion, status: "pass" };
  const pnpm = (await executeTool(ctx, ["pnpm", "--version"])).trim();
  if (pnpm !== policy.tools.pnpm)
    throw new GateFailure("policy-refusal", `G9: pnpm pin expected ${policy.tools.pnpm}, actual ${pnpm}`);
  tools.pnpm = { expected: policy.tools.pnpm, actual: pnpm, status: "pass" };
  const expected = policy.tools.vitest;
  const declared = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).devDependencies?.vitest;
  const installed = JSON.parse(readFileSync(join(root, "node_modules/vitest/package.json"), "utf8")).version;
  if (
    typeof expected !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(expected) ||
    expected !== declared ||
    expected !== installed
  )
    throw new GateFailure(
      "policy-refusal",
      `G9: vitest pin expected ${expected}, declared ${declared}, installed ${installed}`,
    );
  const version = (await executeTool(ctx, ["pnpm", "exec", "vitest", "--version"])).trim();
  if (!version.includes(expected))
    throw new GateFailure("policy-refusal", `G9: vitest executable version mismatch: ${version}`);
  tools.vitest = { expected, actual: installed, executableVersion: version, status: "pass" };
}

/** The staged test files, run against the staged content through the pinned tools. */
async function runStagedTestFiles(ctx: GateContext, tests: string[]): Promise<void> {
  const argv = [
    "pnpm",
    "exec",
    "vitest",
    "run",
    "--config",
    "vitest.config.ts",
    "--no-cache",
    ...tests.map((file) => `./${file}`),
  ];
  await executeTool(ctx, argv);
}

/**
 * The files the index changes against HEAD.
 *
 * The staged scope's input is the index, so the staged files are the ones the
 * index changes. A deleted file is not a file any more and a type change is,
 * so the filter keeps additions, copies, modifications, renames and type
 * changes. The list is computed once per run and used by every staged gate,
 * so two gates cannot disagree about what is staged.
 */
function stagedFiles(): string[] {
  return git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRT", "HEAD").split("\0").filter(Boolean);
}

/**
 * The staged form of G9: the staged content is green.
 *
 * §5.4's pre-commit cell for G9 is "commits stay green". The staged scope
 * therefore proves the green half only: the staged test files are run against
 * the staged content and must pass. The red-on-base half belongs to the
 * pull-request replay (`runG9`->`replayBehavior`) and is not claimed here,
 * so the result states plainly which half it did not check. The working tree
 * is the input the run reads, and the staged scope's precondition has already
 * established that the working tree equals the index.
 */
async function runStagedG9(ctx: GateContext): Promise<StagedGateResult> {
  const root = ctx.root;
  const notChecked =
    "the red-on-base half of the G9 replay is not checked at the staged scope; the pull-request G9 owns the red-to-green replay";
  let stagedTests: string[] = [];
  let checked = "no staged test file was checked";
  try {
    const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
    const globs = policy?.test?.files;
    if (
      policy.version !== 1 ||
      !Array.isArray(globs) ||
      !globs.length ||
      globs.some((glob: unknown) => typeof glob !== "string" || !glob)
    )
      throw new GateFailure("incomplete-report", "G9: invalid bootstrap tool/test policy");
    // The staged scope's input is the index: the staged files are the ones the
    // index changes against HEAD. A deleted file is not a test file any more,
    // and a type change is: the bytes under test must be the staged bytes.
    const staged = stagedFiles();
    stagedTests = staged.filter((file) => globs.some((glob: string) => matchesGlob(file, glob))).sort();
    for (const file of stagedTests)
      if (!lstatSync(join(root, file)).isFile())
        throw new GateFailure("policy-refusal", `G9: a staged test file must be a regular file: ${file}`);
    if (!stagedTests.length)
      return {
        gate: "G9",
        status: "n/a",
        scope: "staged",
        reason: `no staged file is a test file (${staged.length} staged file(s); declared test files: ${globs.join(", ")})`,
        checked,
        notChecked,
      };
    await stagedToolIdentities(ctx, ctx.tools);
    checked = "the staged test files were run against the staged content";
    await runStagedTestFiles(ctx, stagedTests);
    return { gate: "G9", status: "pass", scope: "staged", stagedTests, checked, notChecked };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const kind = failureKind(error);
    console.error(`G9: ${reason}`);
    return {
      gate: "G9",
      status: "fail",
      scope: "staged",
      reason,
      ...(kind ? { kind } : {}),
      ...(stagedTests.length ? { stagedTests } : {}),
      checked,
      notChecked,
    };
  }
}
function safeReceipt(input: string): string {
  const requested = resolve(input);
  let parent = dirname(requested);
  // The walk stops at the nearest existing ancestor, and at the filesystem
  // root at the latest: the root is its own parent, so the walk terminates
  // whichever ancestor it is looking for.
  while (!existsSync(parent) && dirname(parent) !== parent) parent = dirname(parent);
  const destination = existsSync(requested)
    ? realpathSync(requested)
    : resolve(realpathSync(parent), relative(parent, requested));
  // The repository's identity is three answers to one question, and the
  // question does not change while the run does. One Git invocation answers
  // all three, so a receipt check does not spend a process on each answer.
  const [gitDirPath, commonDirPath, projectPath] = git(
    "rev-parse",
    "--absolute-git-dir",
    "--git-common-dir",
    "--show-toplevel",
  ).split("\n");
  const gitDir = realpathSync(gitDirPath);
  const commonDir = realpathSync(resolve(commonDirPath));
  const project = realpathSync(projectPath);
  const marker = resolve(project, ".git");
  const within = (directory: string) => {
    const path = relative(directory, destination);
    return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
  };
  const inGit = relative(gitDir, destination);
  const gitReceipt = within(gitDir) && /^(?:receipt[^/]*\.json|superman\/(?:receipts\/)?[^/]+\.json)$/u.test(inGit);
  const projectReceipt =
    within(project) && /^\.superman-ci\/(?:[^/]+\/)*[^/]+\.json$/u.test(relative(project, destination));
  if (
    (existsSync(requested) && (lstatSync(requested).isSymbolicLink() || !lstatSync(requested).isFile())) ||
    requested === marker ||
    destination === realpathSync(marker) ||
    (within(commonDir) && !gitReceipt) ||
    (!gitReceipt && !projectReceipt) ||
    (within(project) && git("--literal-pathspecs", "ls-files", "--", relative(project, destination)))
  ) {
    throw new Error("Receipt cannot overwrite tracked inputs, Git metadata or aliases");
  }
  return destination;
}
const receipt: Record<string, unknown> = {
  schema: "superman.receipt/1",
  kind: "bootstrap.raw",
  mergeAuthority: "none",
  results: [],
  verdict: "fail",
};
let receiptPath: string | undefined;
try {
  if (values.receipt) {
    receiptPath = safeReceipt(values.receipt);
  }
  const stage = values.stage ?? (Deno.env.get("GITHUB_ACTIONS") === "true" ? "ci" : "pre-pr");
  // The nightly compares main against the previous main; every other stage
  // compares the head against the configured base.
  receipt.baseSha =
    stage === "nightly"
      ? git("rev-parse", "--verify", "--end-of-options", "HEAD^1^{commit}")
      : git("rev-parse", "--verify", "--end-of-options", `${values.base}^{commit}`);
  receipt.evaluatedSha = git("rev-parse", "--verify", "HEAD^{commit}");
  receipt.headSha = receipt.evaluatedSha;
  // A local run has no pull-request reference: it binds the local branch. The
  // staged scope needs it because a pre-commit run has no PR identity.
  receipt.branch = Deno.env.get("HEAD_REF") || gitOptional("symbolic-ref", "--quiet", "--short", "HEAD") || "";
  if (stage === "nightly" && receipt.branch !== "main")
    throw new Error(`G9: the nightly stage runs on main, not ${receipt.branch}`);
  if (Deno.env.get("GITHUB_ACTIONS") === "true" || Deno.env.get("GITHUB_EVENT_PATH")) {
    const eventPath = Deno.env.get("GITHUB_EVENT_PATH");
    if (stage === "nightly") {
      // The nightly runs on the schedule event, on main, against the previous
      // main. It is not a pull request and has no pull-request identity.
      if (Deno.env.get("GITHUB_ACTIONS") === "true" && Deno.env.get("GITHUB_EVENT_NAME") !== "schedule")
        throw new Error("G9: the nightly stage runs on the schedule event");
    } else {
      if (Deno.env.get("GITHUB_EVENT_NAME") !== "pull_request" || !eventPath)
        throw new Error("G9: missing CI pull-request identity evidence");
      const pr = JSON.parse(readFileSync(eventPath, "utf8")).pull_request;
      const mismatches: string[] = [];
      if (!pr) mismatches.push("pull_request evidence missing");
      else {
        if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(pr.head?.sha ?? ""))
          mismatches.push(`head.sha=${String(pr.head?.sha)} is not a commit id`);
        if (pr.base?.sha !== receipt.baseSha)
          mismatches.push(`base.sha=${String(pr.base?.sha)} != ${String(receipt.baseSha)}`);
        if (pr.head?.ref !== receipt.branch)
          mismatches.push(`head.ref=${String(pr.head?.ref)} != ${String(receipt.branch)}`);
      }
      if (Deno.env.get("GITHUB_SHA") !== receipt.evaluatedSha)
        mismatches.push(`GITHUB_SHA=${String(Deno.env.get("GITHUB_SHA"))} != ${String(receipt.evaluatedSha)}`);
      if (mismatches.length) throw new Error(`G9: CI H/B/M identity mismatch: ${mismatches.join("; ")}`);
      const parents = git("rev-list", "--parents", "-n", "1", String(receipt.evaluatedSha)).split(" ").slice(1);
      if (parents.length !== 2 || parents[0] !== receipt.baseSha || parents[1] !== pr.head.sha)
        throw new Error("G9: tested merge is not the recorded base/head integration");
      // The forge rebuilds refs/pull/<n>/merge after it serializes the synchronize
      // payload, so the recorded merge pointer can still name an earlier merge of
      // the same base while the tested tree is the current one. A merge commit is
      // therefore identified by its parent pair, not by a byte-identical commit id
      // (spec: CI proves the integration of that head with a recorded base).
      const eventMergeSha = typeof pr.merge_commit_sha === "string" ? pr.merge_commit_sha : undefined;
      if (eventMergeSha) {
        if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(eventMergeSha))
          throw new Error(`G9: CI H/B/M identity mismatch: merge_commit_sha=${eventMergeSha} is not a commit id`);
        const recorded = gitOptional("rev-list", "--parents", "-n", "1", eventMergeSha);
        if (recorded) {
          const recordedParents = recorded.split(" ").slice(1);
          if (recordedParents.length !== 2 || recordedParents[0] !== receipt.baseSha)
            throw new Error(
              `G9: CI H/B/M identity mismatch: merge_commit_sha=${eventMergeSha} does not integrate the recorded base ${String(receipt.baseSha)}`,
            );
        }
      }
      receipt.headSha = git("rev-parse", "--verify", `${pr.head.sha}^{commit}`);
      receipt.testedMergeSha = receipt.evaluatedSha;
      receipt.eventMergeSha = eventMergeSha ?? null;
    }
  }
  const runG9 = async (): Promise<GateResult> => {
    const branch = String(receipt.branch);
    let reason: string | undefined;
    if (/^spec\/[a-z0-9][a-z0-9-]*$/u.test(branch)) reason = "spec-kind";
    else if (/^chore\/(?:wiki|skills)-[a-z0-9-]+$/u.test(branch)) reason = "chore-kind";
    else {
      const ticket = /^ticket\/([a-z0-9][a-z0-9-]*)-(\d{2,})$/u.exec(branch);
      if (!ticket) throw new Error("G9: invalid or missing HEAD_REF");
      const [, slug, number] = ticket;
      git("cat-file", "-e", `${receipt.baseSha}:.scratch/${slug}/spec.md`);
      const files = git("ls-tree", "-r", "--name-only", "-z", String(receipt.baseSha), "--", `.scratch/${slug}/issues/`)
        .split("\0")
        .filter((file) => file.startsWith(`.scratch/${slug}/issues/${number}-`) && file.endsWith(".md"));
      if (files.length !== 1) throw new Error("G9: expected exactly one approved-base ticket");
      const kinds = [
        ...git("show", `${receipt.baseSha}:${files[0]}`).matchAll(/^(?:\*\*)?Kind:(?:\*\*)?\s*(\S+)\s*$/gmu),
      ];
      if (kinds.length !== 1 || !["behavior", "refactor", "knowledge"].includes(kinds[0][1]))
        throw new Error("G9: missing or unknown approved-base Kind");
      if (kinds[0][1] === "knowledge") reason = "knowledge-only ticket";
      if (kinds[0][1] === "refactor")
        throw new Error("G9: refactor blocked; full-suite-at-every-commit replay is not implemented");
    }
    if (reason) {
      console.log(`G9: n/a (${reason})`);
      return { gate: "G9", status: "n/a", reason };
    } else {
      const evidence = {};
      const tools = (receipt.tools ?? {}) as Record<string, unknown>;
      receipt.behaviorReplay = evidence;
      receipt.tools = tools;
      await replayBehavior(Deno.cwd(), String(receipt.baseSha), String(receipt.headSha), env, evidence, tools);
      console.log("G9: pass (regression sensitivity, not chronological TDD)");
      return { gate: "G9", status: "pass" };
    }
  };
  const gates = ALL_GATES;
  if (!["pre-commit", "pre-pr", "ci", "nightly"].includes(stage)) throw new Error("Unknown raw stage selector");
  receipt.stage = stage;
  const declared = stagePolicy(Deno.cwd(), stage);
  // The gates this run selects decide what it binds: a gate that reads the
  // whole tree binds the whole tree, and the rest bind the inputs they read.
  const selected = values.gate ? [values.gate] : declared.gates;
  if (selected.some((gate) => !gates.includes(gate))) throw new Error("Unknown raw gate selector");
  // The CI leg keeps the whole-tree rule: there the checkout is the commit, so
  // a difference is a setup error rather than the caller's work in progress. A
  // local run binds the inputs its gates read instead, and names the ones it
  // could not bind. Both checks below use this one predicate, so they cannot
  // bind different things.
  const ciRun =
    Deno.env.get("GITHUB_ACTIONS") === "true" ||
    Boolean(Deno.env.get("GITHUB_EVENT_PATH")) ||
    stage === "ci" ||
    stage === "nightly";
  const wholeTree = ciRun || bindsWholeTree(selected);
  // The preconditions depend on the stage's scope, so they are resolved here
  // rather than before the stage is known.
  if (declared.scope === "staged") {
    // A staged run's input is the index. The working tree must equal the
    // index — no tracked file may carry an unstaged modification — so the
    // bytes the checks read are the staged bytes. The committed tree
    // deliberately differs from disk here: staging a modification is exactly
    // what a pre-commit run is for, so the commit is not the comparison base
    // for this scope. The index identity is recorded, and re-checked after
    // the run, so the result binds the staged snapshot.
    if (unstagedChanges()) throw new Error("G9: unstaged changes present; stage them before the staged checks run");
    receipt.stagedInputsId = stagedInputsId();
  } else if (Deno.env.get("GITHUB_ACTIONS") !== "true" && !Deno.env.get("GITHUB_EVENT_PATH")) {
    // A local full run binds its pull-request reference: the branch it names must
    // be the one checked out, and the tree it evaluates must be committed.
    if ((gitOptional("symbolic-ref", "--quiet", "--short", "HEAD") ?? "") !== String(receipt.branch))
      throw new Error("G9: HEAD_REF does not match the local branch");
    // A local run binds what its gates read: the inputs the selected gates read
    // must hold the committed bytes, and the whole tree when a gate reads the
    // whole tree. A document the gates never read cannot change a result, so an
    // uncommitted document is the caller's work in progress and not a reason to
    // refuse the measurement.
    if (!ciRun) {
      const changed = changedEvidenceInputs(Deno.cwd(), String(receipt.evaluatedSha), selected, wholeTree);
      if (changed.files.length) {
        const reason = `G9: dirty inputs; commit or preserve them before replay: ${changed.files.join(", ")}`;
        receipt.inputIntegrity = { status: "fail", scope: changed.scope, reason };
        throw new Error(reason);
      }
    }
  }
  // The identity this run resolved is recorded even when a later guard
  // refuses it, so a refused receipt still names the policy it refused.
  receipt.profile = runProfile(Deno.cwd(), stage);
  // A stage declared full must declare the complete inventory, exactly once.
  assertFullStage(stage, declared);
  if (declared.feedback === "full") {
    // One policy, two hosts: the full local pre-PR run and the CI run must
    // declare the same gate inventory and the same feedback kind. The two
    // declarations are compared as they are written, so a divergence in
    // either is a refusal rather than a silent pass.
    const local = stagePolicy(Deno.cwd(), "pre-pr");
    const remote = stagePolicy(Deno.cwd(), "ci");
    if (local.feedback !== remote.feedback || JSON.stringify(local.gates) !== JSON.stringify(remote.gates))
      throw new GateFailure(
        "policy-refusal",
        "The full local pre-PR run and the CI run must declare one gate inventory",
      );
  }
  receipt.scope = selected;
  receipt.feedback = values.gate ? "scoped" : declared.feedback;
  receipt.satisfiesFullBar = !values.gate && declared.feedback === "full";
  // The file scope the run actually checked: the staged files, or the whole
  // repository. It is recorded beside the gate selection so a reader can tell
  // how much was checked from how many gates ran.
  receipt.inputScope = (values.gate ? "full" : declared.scope) as StageScope;
  const tools: Record<string, unknown> = {};
  receipt.tools = tools;
  const context = {
    root: Deno.cwd(),
    baseSha: String(receipt.baseSha),
    headSha: String(receipt.headSha),
    // The branch this run resolved. A local run has no pull-request
    // reference, so the resolved local branch is what the policy classifies.
    branch: String(receipt.branch),
    env,
    tools,
    stage: (values.gate ? "scoped" : stage) as "scoped" | "pre-commit" | "pre-pr" | "ci",
    scope: (values.gate ? "full" : declared.scope) as StageScope,
  };
  const results: Record<string, unknown>[] = [];
  let policyError: string | undefined;
  try {
    receipt.policyPreflight = await directGate("G4", context);
  } catch (error) {
    policyError = error instanceof Error ? error.message : String(error);
    const kind = failureKind(error);
    receipt.policyPreflight = {
      gate: "G4",
      status: "fail",
      reason: policyError,
      ...(kind ? { kind } : {}),
    };
    console.error(policyError);
  }
  for (const gate of selected) {
    if (policyError) {
      results.push({ gate, status: "fail", reason: policyError, blockedBy: "G4/G8 policy preflight" });
      continue;
    }
    try {
      const result =
        gate === "G9" && context.branch === "main"
          ? { gate, status: "n/a", reason: "nightly on main (no pull request to replay)" }
          : gate === "G9"
            ? context.scope === "staged"
              ? await runStagedG9(context)
              : await runG9()
            : gate === "G8" && !context.branch.startsWith("ticket/")
              ? { gate, status: "n/a", reason: "spec/chore kind (no ticket traceability)" }
              : gate === "G4" || gate === "G8"
                ? { gate, status: "pass", sharedCheck: "G4/G8 policy preflight" }
                : gate === "G5" || gate === "G6"
                  ? await qualityGate(gate, context.root, context.baseSha, context.headSha, context.env, {
                      scope: context.scope,
                      changedFiles: context.scope === "staged" ? stagedFiles() : [],
                      // The lane the stage applies: the pull-request leg
                      // measures the declared pull-request scope, the nightly
                      // measures the whole declared scope, and the owner's
                      // scoped run compares the change at base and candidate.
                      mutation: mutationLane(context.stage),
                    })
                  : await directGate(gate, context);
      results.push(result);
      console.log(`${gate}: ${result.status}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const kind = failureKind(error);
      results.push({ gate, status: "fail", reason, ...(kind ? { kind } : {}) });
      console.error(`${gate}: ${reason}`);
    }
  }
  // Complete result accounting: one recorded result per selected gate, no
  // gate recorded twice, and no result outside the selected scope. A stage
  // inventory that names the same gate twice fails here rather than
  // producing two results for one gate.
  const recorded = results.map((result) => String(result.gate));
  const scope = new Set(selected);
  if (
    recorded.length !== selected.length ||
    new Set(recorded).size !== recorded.length ||
    recorded.some((gate) => !scope.has(gate)) ||
    selected.some((gate) => !recorded.includes(gate))
  )
    throw new GateFailure(
      "incomplete-report",
      `Incomplete result accounting: ${recorded.length} result(s) for ${selected.length} selected gate(s): ${recorded.join(", ")}`,
    );
  receipt.results = results;
  const failed = results.some((result) => result.status === "fail");
  // A partial or scoped run never satisfies the full bar; only a complete
  // full-stage evaluation may be reported as a pass.
  receipt.verdict = failed ? "fail" : receipt.satisfiesFullBar ? "pass" : "partial-feedback";
  if (failed) Deno.exitCode = 1;
  // The scope the receipt records says which rule produced the verdict: the
  // whole tree, the inputs the gates read, or the index of a staged run.
  const binding =
    declared.scope === "staged"
      ? { scope: "index" as const, files: [] as string[] }
      : ciRun
        ? { scope: "whole-tree" as const, files: [] as string[] }
        : changedEvidenceInputs(Deno.cwd(), String(receipt.evaluatedSha), selected, wholeTree);
  const inputsChanged =
    git("rev-parse", "--verify", "HEAD^{commit}") !== receipt.evaluatedSha ||
    (declared.scope === "staged"
      ? receipt.stagedInputsId !== stagedInputsId() || unstagedChanges()
      : ciRun
        ? Boolean(git("status", "--porcelain=v1", "-z", "--untracked-files=all")) ||
          !committedTreeMatches(Deno.cwd(), String(receipt.evaluatedSha))
        : binding.files.length > 0);
  if (inputsChanged) {
    const reason = `Inputs changed during raw checks; evidence does not bind the committed snapshot (caller changes were preserved)${
      binding.files.length ? `: ${binding.files.join(", ")}` : ""
    }`;
    receipt.inputIntegrity = { status: "fail", scope: binding.scope, reason };
    receipt.verdict = "fail";
    Deno.exitCode = 1;
    console.error(reason);
  } else receipt.inputIntegrity = { status: "pass", scope: binding.scope };
} catch (error) {
  receipt.verdict = "fail";
  receipt.error = error instanceof Error ? error.message : String(error);
  const kind = failureKind(error);
  receipt.errorKind = kind;
  receipt.results = [
    { gate: values.gate ?? "G1–G11", status: "fail", reason: receipt.error, ...(kind ? { kind } : {}) },
  ];
  console.error(receipt.error);
  Deno.exitCode = 1;
}
if (receiptPath && values.receipt) {
  const temporary = `${receiptPath}.${randomUUID()}.tmp`;
  let created = false;
  try {
    if (safeReceipt(values.receipt) !== receiptPath) throw new Error("Receipt parent alias changed during checks");
    mkdirSync(dirname(receiptPath), { recursive: true });
    const fd = openSync(temporary, "wx", 0o600);
    created = true;
    try {
      writeFileSync(
        fd,
        `${JSON.stringify(
          receipt,
          (_key, value: unknown) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
            }
            return value;
          },
          2,
        )}\n`,
      );
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (safeReceipt(values.receipt) !== receiptPath) throw new Error("Receipt parent alias changed during publication");
    renameSync(temporary, receiptPath);
  } catch (error) {
    receipt.verdict = "fail";
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  } finally {
    if (created) rmSync(temporary, { force: true });
  }
}
