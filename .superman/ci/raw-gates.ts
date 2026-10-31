#!/usr/bin/env node
// Protected bootstrap entrypoint; ticket 06 may replace it only after parity.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { directGate, type GateResult } from "./direct-gates.ts";
import { fixtureEnvironment } from "./fixture-env.ts";
import { replayBehavior } from "./replay.ts";

const { values } = parseArgs({
  options: {
    gate: { type: "string" },
    base: { type: "string", default: "origin/main" },
    receipt: { type: "string" },
  },
});
const env = { ...fixtureEnvironment(), GIT_OPTIONAL_LOCKS: "0" };
const git = (...args: string[]) => execFileSync("git", args, { env, encoding: "utf8", shell: false }).trim();
function committedInputsMatch(sha: string): boolean {
  const format = git("rev-parse", "--show-object-format");
  if (!["sha1", "sha256"].includes(format)) throw new Error("Unknown Git object format");
  return git("ls-tree", "-r", "-z", sha)
    .split("\0")
    .filter(Boolean)
    .every((entry) => {
      const tab = entry.indexOf("\t");
      const [mode, type, expected] = entry.slice(0, tab).split(" ");
      const file = entry.slice(tab + 1);
      if (type !== "blob" || !existsSync(file)) return false;
      const stat = lstatSync(file);
      if (mode === "120000" ? !stat.isSymbolicLink() : !stat.isFile()) return false;
      if (mode !== "120000" && ((stat.mode & 0o111) !== 0) !== (mode === "100755")) return false;
      const bytes = mode === "120000" ? Buffer.from(readlinkSync(file)) : readFileSync(file);
      return createHash(format).update(`blob ${bytes.length}\0`).update(bytes).digest("hex") === expected;
    });
}
function safeReceipt(input: string): string {
  const requested = resolve(input);
  let parent = dirname(requested);
  while (!existsSync(parent)) parent = dirname(parent);
  const destination = existsSync(requested)
    ? realpathSync(requested)
    : resolve(realpathSync(parent), relative(parent, requested));
  const gitDir = realpathSync(git("rev-parse", "--absolute-git-dir"));
  const commonDir = realpathSync(resolve(git("rev-parse", "--git-common-dir")));
  const project = realpathSync(git("rev-parse", "--show-toplevel"));
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
  receipt.baseSha = git("rev-parse", "--verify", "--end-of-options", `${values.base}^{commit}`);
  receipt.evaluatedSha = git("rev-parse", "--verify", "HEAD^{commit}");
  receipt.headSha = receipt.evaluatedSha;
  receipt.branch = process.env.HEAD_REF;
  if (process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_EVENT_PATH) {
    if (process.env.GITHUB_EVENT_NAME !== "pull_request" || !process.env.GITHUB_EVENT_PATH)
      throw new Error("G9: missing CI pull-request identity evidence");
    const pr = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).pull_request;
    if (
      !pr ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(pr.head?.sha ?? "") ||
      pr.base?.sha !== receipt.baseSha ||
      pr.head.ref !== receipt.branch ||
      process.env.GITHUB_SHA !== receipt.evaluatedSha ||
      (pr.merge_commit_sha && pr.merge_commit_sha !== receipt.evaluatedSha)
    )
      throw new Error("G9: CI H/B/M identity mismatch");
    const parents = git("rev-list", "--parents", "-n", "1", String(receipt.evaluatedSha)).split(" ").slice(1);
    if (parents.length !== 2 || parents[0] !== receipt.baseSha || parents[1] !== pr.head.sha)
      throw new Error("G9: tested merge is not the recorded base/head integration");
    receipt.headSha = git("rev-parse", "--verify", `${pr.head.sha}^{commit}`);
    receipt.testedMergeSha = receipt.evaluatedSha;
  } else if (git("symbolic-ref", "--quiet", "--short", "HEAD") !== receipt.branch)
    throw new Error("G9: HEAD_REF does not match the local branch");
  if (
    git("status", "--porcelain=v1", "-z", "--untracked-files=all") ||
    !committedInputsMatch(String(receipt.evaluatedSha))
  )
    throw new Error("G9: dirty inputs; commit or preserve them before replay");
  const runG9 = (): GateResult => {
    const branch = process.env.HEAD_REF ?? "";
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
      replayBehavior(process.cwd(), String(receipt.baseSha), String(receipt.headSha), env, evidence, tools);
      console.log("G9: pass (regression sensitivity, not chronological TDD)");
      return { gate: "G9", status: "pass" };
    }
  };
  const gates = Array.from({ length: 11 }, (_, i) => `G${i + 1}`);
  const selected = values.gate ? [values.gate] : gates;
  if (selected.some((gate) => !gates.includes(gate))) throw new Error("Unknown raw gate selector");
  receipt.scope = selected;
  const tools: Record<string, unknown> = {};
  receipt.tools = tools;
  const context = {
    root: process.cwd(),
    baseSha: String(receipt.baseSha),
    headSha: String(receipt.headSha),
    branch: process.env.HEAD_REF ?? "",
    env,
    tools,
    fullRun: !values.gate,
  };
  const results: Record<string, unknown>[] = [];
  let policyError: string | undefined;
  try {
    receipt.policyPreflight = await directGate("G4", context);
  } catch (error) {
    policyError = error instanceof Error ? error.message : String(error);
    receipt.policyPreflight = { gate: "G4", status: "fail", reason: policyError };
    console.error(policyError);
  }
  for (const gate of selected) {
    if (policyError) {
      results.push({ gate, status: "fail", reason: policyError, blockedBy: "G4/G8 policy preflight" });
      continue;
    }
    try {
      const result =
        gate === "G9"
          ? runG9()
          : gate === "G8" && !context.branch.startsWith("ticket/")
            ? { gate, status: "n/a", reason: "spec/chore kind (no ticket traceability)" }
            : gate === "G4" || gate === "G8"
              ? { gate, status: "pass", sharedCheck: "G4/G8 policy preflight" }
              : await directGate(gate, context);
      results.push(result);
      console.log(`${gate}: ${result.status}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({ gate, status: "fail", reason });
      console.error(`${gate}: ${reason}`);
    }
  }
  receipt.results = results;
  const failed = results.some((result) => result.status === "fail");
  receipt.verdict = failed ? "fail" : "pass";
  if (failed) process.exitCode = 1;
  if (
    git("rev-parse", "--verify", "HEAD^{commit}") !== receipt.evaluatedSha ||
    git("status", "--porcelain=v1", "-z", "--untracked-files=all") ||
    !committedInputsMatch(String(receipt.evaluatedSha))
  ) {
    const reason =
      "Inputs changed during raw checks; evidence does not bind the committed snapshot (caller changes were preserved)";
    receipt.inputIntegrity = { status: "fail", reason };
    receipt.verdict = "fail";
    process.exitCode = 1;
    console.error(reason);
  } else receipt.inputIntegrity = { status: "pass" };
} catch (error) {
  receipt.verdict = "fail";
  receipt.error = error instanceof Error ? error.message : String(error);
  receipt.results = [{ gate: values.gate ?? "G1–G11", status: "fail", reason: receipt.error }];
  console.error(receipt.error);
  process.exitCode = 1;
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
    process.exitCode = 1;
  } finally {
    if (created) rmSync(temporary, { force: true });
  }
}
