// Temporary full-scope enforcement; no affected selection or gate-result cache.
//
// The Deno sibling of the Node original. Every spawn goes through the exec
// seam, the Node runtime that executes the toolchain is identified explicitly,
// and the owned children are cleaned up as process groups. The gate inventory,
// the failure taxonomy and every decision are the Node original's.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, matchesGlob } from "node:path";
import { fileURLToPath } from "node:url";
import { DENO_LAUNCH_FLAGS, DENO_PERMISSIONS, denoPermissions, execFileSync, type PermissionProfile } from "./exec.ts";
import { nodeRuntimeVersion, type ProcessEnv, runOwned } from "./replay.ts";

/** This module's own directory, resolved from its module URL. */
const here = dirname(fileURLToPath(import.meta.url));

/** The complete raw gate inventory. A full stage must run every one of them. */
export const ALL_GATES = Array.from({ length: 11 }, (_, i) => `G${i + 1}`);

/**
 * Why a gate failed. Every one of these fails the full result: nothing that
 * is missing, ignored, skipped, incomplete or stale counts as success.
 */
export type FailureKind =
  | "missing-tool"
  | "failed-command"
  | "incomplete-report"
  | "stale-report"
  | "skipped-required-work"
  | "policy-refusal"
  | "critical-survivor";

export class GateFailure extends Error {
  readonly kind: FailureKind;
  constructor(kind: FailureKind, message: string) {
    super(message);
    this.name = "GateFailure";
    this.kind = kind;
  }
}

export function failureKind(error: unknown): FailureKind | undefined {
  return error instanceof GateFailure ? error.kind : undefined;
}

type GateStage = "pre-commit" | "pre-pr" | "ci" | "scoped";
export type GateResult = { gate: string; status: "pass" | "n/a"; reason?: string; [key: string]: unknown };
export type GateContext = {
  root: string;
  baseSha: string;
  headSha: string;
  branch: string;
  env: ProcessEnv;
  tools: Record<string, unknown>;
  stage?: GateStage;
  /** The scope the stage declared: staged files, or the whole repository. */
  scope?: StageScope;
};

const sourceExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"];

/**
 * The reviewed launch of a module in this root under the Deno runtime.
 *
 * The runtime identity is the running Deno executable, the configuration and
 * dependency discovery are neutralized, and the permission profile is the
 * explicit reviewed class list. There is no blanket grant and no prompt.
 */
function denoLaunch(...args: string[]): string[] {
  return [Deno.execPath(), "run", ...DENO_LAUNCH_FLAGS, ...DENO_PERMISSIONS, ...args];
}

function isSourceFile(file: string): boolean {
  return sourceExtensions.some((extension) => file.endsWith(extension));
}

function toolFailure(
  argv: string[],
  result: { error?: Error; signal?: string | null; status?: number | null; stdout?: string; stderr?: string },
): GateFailure {
  const code = (result.error as { code?: string } | undefined)?.code;
  if (code === "ENOENT")
    return new GateFailure("missing-tool", `missing tool: ${argv[0]} (${result.error?.message ?? ""})`);
  return new GateFailure(
    "failed-command",
    `${argv.join(" ")} failed (${result.status ?? result.signal}): ${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

async function runTool(ctx: GateContext, argv: string[], timeout = 120_000) {
  return await runOwned(argv[0], argv.slice(1), {
    cwd: ctx.root,
    env: {
      ...ctx.env,
      ARCHGATE_TELEMETRY: "0",
      PNPM_CONFIG_IGNORE_SCRIPTS: "true",
      PNPM_CONFIG_IGNORE_PNPMFILE: "true",
      PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
      PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: "false",
    },
    encoding: "utf8",
    shell: false,
    timeout,
    killSignal: "SIGKILL",
    maxBuffer: 16 * 1024 * 1024,
  });
}

/**
 * The one seam every tool invocation goes through.
 *
 * The tool runs in an owned process group with a bounded output buffer and no
 * shell, and a missing tool or a failed command is reported with the file's
 * own failure taxonomy. The staged scope binds the same seam, so there is one
 * copy of the tool-running code and one failure shape.
 */
export async function execute(ctx: GateContext, argv: string[], timeout = 120_000): Promise<string> {
  const result = await runTool(ctx, argv, timeout);
  if (result.error || result.signal || result.status !== 0) throw toolFailure(argv, result);
  return result.stdout;
}

// ---------------------------------------------------------------------------
// The sibling's own Deno graph.
//
// Each host typechecks its own graph: the Node original's G2 keeps the
// pinned `tsrs --noEmit` over the Node graph, and this sibling's G2 checks
// the Deno operational graph with the Deno runtime it drives. The graph is
// the sibling's own source root, so the check is the host's own contract.
// ---------------------------------------------------------------------------

/**
 * The flags of the Deno check.
 *
 * The ambient configuration, the lockfile, the dependency discovery and the
 * remote module resolution are neutralized, exactly as the sibling's own
 * module launches neutralize them. The check subcommand type-checks a graph
 * and runs none of it, so it takes no prompt flag.
 */
const DENO_CHECK_FLAGS = ["--no-config", "--no-lock", "--no-npm", "--no-remote"] as const;

/**
 * The reviewed capability profile of the Deno check.
 *
 * `deno check` type-checks a module graph and runs none of it, so the
 * runtime grants it no capability: the subcommand accepts no capability flag
 * at all — `deno check --allow-read` exits 1 with "unexpected argument".
 * The read access the check needs is the runtime's own module loading, which
 * is not a capability grant. The profile is built through the seam's
 * builder, so the grant the check runs under is an explicit decision and
 * never a blanket one.
 */
const DENO_CHECK_PROFILE: PermissionProfile = {};

/**
 * What the Deno graph check bound and observed.
 *
 * The receipt names the runtime that produced the check, the entry points
 * the graph was entered at and every module the check covered, so a reader
 * can see that the check was over the whole graph and not one module.
 */
type DenoCheckEvidence = {
  runtime: { executable: string; version: string };
  entryPoints: string[];
  modules: string[];
  scope: "the whole Deno operational graph";
};

/**
 * The Deno root's own operational modules.
 *
 * The operational graph is the sibling's own source root: the modules that
 * live directly in it. The `tests` directory holds the Node-hosted harness
 * suites, which are not operational Deno modules, so it is not part of the
 * graph.
 */
function denoRootModules(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name)
    .sort();
}

/**
 * The sibling's own modules that a module imports.
 *
 * A relative specifier names a module of the same root. A bare specifier
 * names a built-in or a package, and neither is part of the graph.
 */
function importedModules(root: string, file: string): string[] {
  const imported = new Set<string>();
  const source = readFileSync(join(root, file), "utf8");
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.\/[^"']+)["']/gu)) {
    const target = match[1].slice(2);
    if (target.endsWith(".ts")) imported.add(target);
  }
  return [...imported].sort();
}

/**
 * The Deno root's entry points and the modules they cover.
 *
 * A module no sibling module imports is an entry point: the graph is
 * entered there. The closure over the entry points is the whole operational
 * graph. A module the closure does not reach is a module the check would
 * never type-check, so the graph is refused rather than checked in part.
 */
function denoGraph(root: string): { entryPoints: string[]; modules: string[] } {
  const modules = denoRootModules(root);
  const known = new Set(modules);
  const imports = new Map(
    modules.map((file) => [file, importedModules(root, file).filter((target) => known.has(target))]),
  );
  const entryPoints = modules.filter((file) => ![...imports.values()].some((targets) => targets.includes(file)));
  const covered = new Set<string>();
  const queue = [...entryPoints];
  for (let index = 0; index < queue.length; index += 1) {
    const file = queue[index];
    if (covered.has(file)) continue;
    covered.add(file);
    for (const target of imports.get(file) ?? []) if (!covered.has(target)) queue.push(target);
  }
  const uncovered = modules.filter((file) => !covered.has(file));
  if (uncovered.length)
    throw new GateFailure(
      "policy-refusal",
      `G2: the Deno operational graph does not cover ${uncovered.join(", ")}; every module must be reachable from an entry point`,
    );
  return { entryPoints, modules };
}

/**
 * The pinned Deno runtime the check runs under.
 *
 * The deployment names the pinned binary when it has one — the candidate CI
 * legs export `SUPERMAN_DENO_BIN` for the verified candidate — and the
 * sibling itself runs under that binary. The binary is probed through the
 * exec seam, so a runtime that is not there is a missing tool and a runtime
 * that reports another version is a policy refusal.
 */
function pinnedDeno(ctx: GateContext): string {
  const named = ctx.env.SUPERMAN_DENO_BIN?.trim();
  return named ? named : Deno.execPath();
}

/**
 * The version the Deno runtime reports.
 *
 * The runtime prints its own version on the first line, followed by the V8
 * and the TypeScript versions it bundles.
 */
function parseDenoVersion(output: string): string {
  const version = /^deno (\d+\.\d+\.\d+)/mu.exec(output)?.[1];
  if (!version) throw new GateFailure("failed-command", "G2: the Deno runtime did not report a version");
  return version;
}

/**
 * The Deno version the Deno root's own CI template declares.
 *
 * The template is the Deno root's reviewed declaration of the pinned
 * runtime: every native leg names the same version. A template that
 * declares no version, or more than one, is refused rather than guessed at.
 */
function reviewedDenoVersion(root: string): string {
  const template = join(root, "ci.template.yml");
  if (!existsSync(template))
    throw new GateFailure(
      "policy-refusal",
      "G2: the Deno root declares no CI template; the pinned Deno version is unreviewed",
    );
  const declared = [
    ...new Set(
      [...readFileSync(template, "utf8").matchAll(/^\s*deno_version:\s*"?(\d+\.\d+\.\d+)"?\s*$/gmu)].map(
        (match) => match[1],
      ),
    ),
  ];
  if (declared.length !== 1)
    throw new GateFailure(
      "policy-refusal",
      `G2: the Deno root's CI template declares ${declared.length} pinned Deno versions: ${declared.join(", ") || "none"}`,
    );
  return declared[0];
}

/**
 * The sibling's own Deno graph check.
 *
 * The runtime identity is bound before the graph is checked, so a refused
 * receipt still names the runtime it refused. The check runs through the
 * exec seam, under the reviewed capability profile, over the whole
 * operational graph.
 */
async function denoGraphCheck(ctx: GateContext): Promise<DenoCheckEvidence> {
  const runtime = pinnedDeno(ctx);
  const actual = parseDenoVersion(await execute(ctx, [runtime, "--version"], 60_000));
  const expected = reviewedDenoVersion(here);
  if (actual !== expected)
    throw new GateFailure("policy-refusal", `G2: Deno pin expected ${expected}, actual ${actual}`);
  ctx.tools.deno = { expected, actual, executable: runtime, status: "pass" };
  const graph = denoGraph(here);
  const argv = [
    runtime,
    "check",
    ...DENO_CHECK_FLAGS,
    ...denoPermissions(DENO_CHECK_PROFILE),
    ...graph.entryPoints.map((file) => join(here, file)),
  ];
  const result = await runTool(ctx, argv);
  if (result.error) throw toolFailure(argv, result);
  if (result.status !== 0 || result.signal)
    throw new GateFailure(
      "failed-command",
      `G2: deno check failed (${result.status ?? result.signal}):\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  return {
    runtime: { executable: runtime, version: actual },
    entryPoints: graph.entryPoints,
    modules: graph.modules,
    scope: "the whole Deno operational graph",
  };
}

/** Strip the reporter's terminal escapes and read the first JSON document. */
function readJsonReport(text: string): unknown {
  const clean = text.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu"), "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

async function config(ctx: GateContext) {
  const data = JSON.parse(readFileSync(join(ctx.root, ".superman/ci/bootstrap.json"), "utf8"));
  if (data.version !== 1 || !data.tools || !Array.isArray(data.test?.files) || !data.test.files.length)
    throw new Error("Invalid bootstrap tool/test policy");
  // The Node runtime that will execute the toolchain is identified explicitly,
  // so the recorded identity is the one that actually runs the tools.
  const nodeVersion = nodeRuntimeVersion(ctx.env);
  if (data.tools.node !== nodeVersion && data.tools.node !== nodeVersion.split(".")[0])
    throw new Error("Node pin mismatch");
  if (Deno.env.get("TSRS_FAST") !== undefined)
    throw new Error("TSRS_FAST must be unset; fast mode is not gate evidence");
  ctx.tools.node = { expected: data.tools.node, actual: nodeVersion, status: "pass" };
  const pnpm = (await execute(ctx, ["pnpm", "--version"])).trim();
  if (pnpm !== data.tools.pnpm) throw new Error(`pnpm pin expected ${data.tools.pnpm}, actual ${pnpm}`);
  ctx.tools.pnpm = { expected: data.tools.pnpm, actual: pnpm, status: "pass" };
  return data;
}

async function pin(
  ctx: GateContext,
  policy: Awaited<ReturnType<typeof config>>,
  key: string,
  name: string,
  binary: string,
  command = ["pnpm", "exec", binary],
) {
  const expected = policy.tools[key];
  const declared = JSON.parse(readFileSync(join(ctx.root, "package.json"), "utf8")).devDependencies?.[name];
  const actual = JSON.parse(readFileSync(join(ctx.root, "node_modules", name, "package.json"), "utf8")).version;
  if (
    typeof expected !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(expected) ||
    expected !== declared ||
    expected !== actual
  )
    throw new Error(`${name} pin expected ${expected}, declared ${declared}, installed ${actual}`);
  const version = (await execute(ctx, [...command, "--version"])).trim();
  if (!version.includes(expected)) throw new Error(`${name} executable version mismatch: ${version}`);
  ctx.tools[key] = { expected, actual, executableVersion: version, status: "pass" };
}

/** A stage's declared inventory, the feedback kind it may claim, and its scope. */
export type StageScope = "staged" | "full";
export type StageDeclaration = {
  gates: string[];
  feedback: "full" | "partial";
  declared: boolean;
  scope: StageScope;
};

/**
 * The declared stage inventory. The full local pre-PR run and the CI run must
 * declare the same gates: one policy, two hosts.
 */
export function stagePolicy(root: string, stage: string): StageDeclaration {
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const declared = policy.stages?.[stage];
  if (declared === undefined) {
    // No reviewed declaration: the stage may run the built-in inventory, but
    // it can never claim the full bar. The condition is on the stage
    // declaration itself, not on the presence of an unrelated file.
    if (existsSync(join(root, ".superman/ci/quality.ts")))
      throw new GateFailure(
        "skipped-required-work",
        `Raw stage ${stage} has no declared inventory; the reviewed stage declaration is required`,
      );
    return { gates: [...ALL_GATES], feedback: "partial" as const, declared: false, scope: "full" as const };
  }
  const gates = declared.gates;
  const feedback = declared.feedback;
  const scope = declared.scope;
  if (!Array.isArray(gates) || !gates.length || gates.some((gate: unknown) => !ALL_GATES.includes(gate as string)))
    throw new GateFailure("incomplete-report", `Raw stage ${stage} declares an invalid gate inventory`);
  if (feedback !== "full" && feedback !== "partial")
    throw new GateFailure("incomplete-report", `Raw stage ${stage} declares an invalid feedback kind`);
  if (scope !== "staged" && scope !== "full")
    throw new GateFailure("incomplete-report", `Raw stage ${stage} declares an invalid scope`);
  if (feedback === "partial" && gates.length === ALL_GATES.length)
    throw new GateFailure("skipped-required-work", `Raw stage ${stage} is declared partial but runs every gate`);
  // Partial feedback is staged feedback. A stage that claims a partial result
  // while scanning the whole repository is not the stage §5.4 describes, and the
  // receipt would misreport how much was checked.
  if (feedback === "partial" && scope !== "staged")
    throw new GateFailure(
      "skipped-required-work",
      `Raw stage ${stage} is declared partial but its scope is ${scope}; partial feedback must be staged`,
    );
  return {
    gates: gates as string[],
    feedback: feedback as "full" | "partial",
    declared: true,
    scope: scope as StageScope,
  };
}

/**
 * A stage declared full must declare the complete inventory, exactly once
 * each. A stage declared partial may not declare it.
 */
export function assertFullStage(stage: string, declaration: StageDeclaration): void {
  if (declaration.feedback !== "full") return;
  const missing = ALL_GATES.filter((gate) => !declaration.gates.includes(gate));
  if (missing.length)
    throw new GateFailure(
      "skipped-required-work",
      `Raw stage ${stage} is declared full but omits ${missing.join(", ")}`,
    );
  if (declaration.gates.length !== ALL_GATES.length)
    throw new GateFailure(
      "skipped-required-work",
      `Raw stage ${stage} is declared full but names a gate more than once`,
    );
}

/**
 * The identity a run binds: the driver it executed, the reviewed tool pins
 * and the reviewed quality policy with the stage's declared inventory. Two
 * hosts that share one policy produce the same profile; a divergence in the
 * driver, the pins or the declared inventory produces a different one.
 */
export function runProfile(root: string, stage: string) {
  const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const declaration = bootstrap.stages?.[stage] ?? null;
  const driver = ["direct-gates.ts", "raw-gates.ts", "quality.ts", "replay.ts"]
    .map(
      (file) =>
        `${file}:${createHash("sha256")
          .update(readFileSync(join(here, file)))
          .digest("hex")}`,
    )
    .join("\n");
  return {
    driver: createHash("sha256").update(driver).digest("hex"),
    tools: createHash("sha256")
      .update(JSON.stringify(bootstrap.tools ?? null))
      .digest("hex"),
    policy: createHash("sha256")
      .update(
        JSON.stringify({
          quality: bootstrap.quality ?? null,
          gates: declaration?.gates ?? null,
          feedback: declaration?.feedback ?? null,
        }),
      )
      .digest("hex"),
  };
}

function sourceInventory(root: string): string[] {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean);
  return files.filter(isSourceFile).sort();
}

function readPatterns(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.some((item: unknown) => typeof item !== "string" || !item))
    throw new GateFailure("incomplete-report", `Invalid declared ${name} pattern list`);
  return value as string[];
}

export async function directGate(gate: string, ctx: GateContext): Promise<GateResult> {
  if (gate === "G4" || gate === "G8") {
    await execute(
      { ...ctx, env: { ...ctx.env, HEAD_REF: ctx.branch, HEAD_SHA: ctx.headSha, BASE_SHA: ctx.baseSha } },
      denoLaunch(join(here, "pr-policy.ts")),
    );
    return { gate, status: "pass" };
  }
  const policy = await config(ctx);
  if (gate === "G11") {
    if (!existsSync(join(ctx.root, "pnpm-lock.yaml")))
      throw new GateFailure("policy-refusal", "G11: dependency scan requires the reviewed lockfile");
    if (
      readdirSync(ctx.root).some(
        (file) => file.startsWith(".trivyignore") || /^trivy\.(?:ya?ml|json|toml)$/u.test(file),
      )
    )
      throw new GateFailure("policy-refusal", "G11: Trivy ignore/config files are forbidden");
    // CI delegates the scan to the required linux-x64 leg. A full local
    // pre-PR run has no other leg to delegate to: it runs the scan itself.
    // The runtime names its architecture the way Deno does; the Node original
    // spells the same architecture "x64".
    if (ctx.stage === "ci" && !(Deno.build.os === "linux" && Deno.build.arch === "x86_64"))
      return {
        gate,
        status: "n/a",
        reason: "delegated to the required linux-x64 CI leg; an explicit delegation, not a tool pass",
      };
    const command = ctx.env.TRIVY_BIN || "trivy";
    // The caller's Trivy environment never reaches the tool: only the cache
    // directory survives, so an inherited severity or skip list cannot shape
    // the scan.
    const clean = { ...ctx.env };
    for (const key of Object.keys(clean)) if (key.startsWith("TRIVY_") && key !== "TRIVY_CACHE_DIR") delete clean[key];
    const actual = /^Version:\s*(\S+)/mu.exec(
      await execute({ ...ctx, env: clean }, [command, "--version"], 60_000),
    )?.[1];
    if (actual !== policy.tools.trivy)
      throw new GateFailure("policy-refusal", `Trivy pin expected ${policy.tools.trivy}, actual ${actual}`);
    ctx.tools.trivy = { expected: policy.tools.trivy, actual, status: "pass" };
    const startedAt = Date.now();
    const result = await runTool(
      { ...ctx, env: clean },
      [
        command,
        "fs",
        "--scanners",
        "vuln,secret,misconfig",
        "--severity",
        "HIGH,CRITICAL",
        "--include-dev-deps",
        "--exit-code",
        "1",
        "--format",
        "json",
        // The reviewed scan policy above is unchanged; this is the bounded
        // execution window (spec §8.3) the scan needs on a full repository.
        "--timeout",
        "15m",
        ".",
      ],
      1_200_000,
    );
    if (result.error) throw toolFailure([command, "fs"], result);
    const report = readJsonReport(result.stdout ?? "");
    if (!report || typeof report !== "object")
      throw new GateFailure("incomplete-report", "G11: Trivy produced no readable JSON report");
    const createdAt = Date.parse(String((report as { CreatedAt?: unknown }).CreatedAt ?? ""));
    if (!Number.isFinite(createdAt))
      throw new GateFailure("incomplete-report", "G11: Trivy report carries no creation identity");
    if (createdAt < startedAt - 1000)
      throw new GateFailure(
        "stale-report",
        `G11: Trivy report is stale (created ${new Date(createdAt).toISOString()}, scan started ${new Date(startedAt).toISOString()})`,
      );
    const bySeverity: Record<string, number> = {};
    let findings = 0;
    const reported = (report as { Results?: unknown }).Results;
    for (const entry of Array.isArray(reported) ? reported : []) {
      if (!entry || typeof entry !== "object") continue;
      for (const key of ["Vulnerabilities", "Secrets", "Misconfigurations"]) {
        const raw = (entry as Record<string, unknown>)[key];
        if (!Array.isArray(raw)) continue;
        for (const finding of raw as { Severity?: string }[]) {
          const severity = finding?.Severity ?? "UNKNOWN";
          bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
          findings++;
        }
      }
    }
    if (findings)
      throw new GateFailure(
        "failed-command",
        `G11: Trivy reported ${findings} HIGH/CRITICAL finding(s): ${JSON.stringify(bySeverity)}\n${result.stderr ?? ""}`,
      );
    if (result.status !== 0 || result.signal)
      throw new GateFailure("failed-command", `trivy fs failed (${result.status ?? result.signal})`);
    return {
      gate,
      status: "pass",
      scan: "fresh vuln/secret/misconfig, HIGH+CRITICAL, including dev dependencies",
      findings: { total: findings, bySeverity },
    };
  }
  if (gate === "G7") {
    // Skill activation is a later reviewed follow-up, not an implicit bootstrap install.
    const registration = [
      "superman.lock.json",
      ".claude-plugin/marketplace.json",
      ".agents/plugins/marketplace.json",
      "opencode.json",
      "opencode.jsonc",
    ].some((file) => existsSync(join(ctx.root, file)));
    const settings = join(ctx.root, ".claude/settings.json");
    const selected =
      existsSync(settings) &&
      Object.keys(JSON.parse(readFileSync(settings, "utf8")).enabledPlugins ?? {}).some((name) =>
        /pocock|superman/u.test(name),
      );
    if (registration || selected)
      throw new GateFailure(
        "policy-refusal",
        "G7: active skill lock/catalog needs the reviewed ticket-08 verifier; unknown evidence is blocked",
      );
    return { gate, status: "n/a", reason: "Project skill catalog/lock not activated (tickets 08–10)" };
  }
  if (gate === "G5" || gate === "G6")
    throw new GateFailure("policy-refusal", `Raw gate ${gate} is dispatched by the driver; the quality module owns it`);
  if (gate === "G1") {
    const command = ctx.env.ARCHGATE_BIN ? [ctx.env.ARCHGATE_BIN] : ["pnpm", "exec", "archgate"];
    await pin(ctx, policy, "archgate", "archgate", "archgate", command);
    if (ctx.scope === "staged") {
      // §5.4's pre-commit form: only the staged files are checked. The staged
      // invocation is a different check, not the whole-repository one scoped
      // down: it evaluates the rules that apply to the staged files.
      await execute(ctx, [...command, "check", "--staged", "--strict", "--output", "json"]);
      return { gate, status: "pass", scope: "staged" };
    }
    await execute(ctx, [...command, "check", "--base", ctx.baseSha, "--strict", "--output", "json"]);
    const files = execFileSync("git", ["ls-files", "-z"], {
      cwd: ctx.root,
      env: ctx.env,
      encoding: "utf8",
      shell: false,
    })
      .split("\0")
      .filter(Boolean);
    await execute(ctx, [...command, "check", "--strict", "--output", "json", "--", ...files]);
    return { gate, status: "pass", scope: "full", fullInventory: files.length };
  }
  if (gate === "G3") {
    await pin(ctx, policy, "knip", "knip", "knip");
    const model = JSON.parse(readFileSync(join(ctx.root, "knip.json"), "utf8"));
    const entry = readPatterns(model.entry, "Knip entry");
    const project = readPatterns(model.project, "Knip project");
    const ignore = readPatterns(model.ignore ?? [], "Knip ignore");
    const inventory = sourceInventory(ctx.root);
    const unresolved = entry.filter((pattern) => !inventory.some((file) => matchesGlob(file, pattern)));
    if (unresolved.length)
      throw new GateFailure("incomplete-report", `G3: declared Knip entry does not resolve: ${unresolved.join(", ")}`);
    // The model's universe is the source inventory the declared model claims:
    // its project scope plus the surfaces it ignores on purpose. A file the
    // model never declared is outside its scope, not an unaccounted file.
    const universe = inventory.filter(
      (file) =>
        project.some((pattern) => matchesGlob(file, pattern)) || ignore.some((pattern) => matchesGlob(file, pattern)),
    );
    // Knip exits nonzero as soon as it has an issue, so its report is read
    // whether the run passed or failed: an unused file is the model's own
    // outcome, not a tool failure that hides it.
    const argv = ["pnpm", "exec", "knip", "--no-progress", "--reporter", "json"];
    const run = await runTool(ctx, argv);
    const report = readJsonReport(run.stdout ?? "");
    if (!report || typeof report !== "object" || !Array.isArray((report as { issues?: unknown }).issues))
      throw new GateFailure("incomplete-report", "G3: knip produced no readable report");
    const unused = new Set<string>();
    const reported: string[] = [];
    for (const issue of (report as { issues: Record<string, unknown>[] }).issues) {
      for (const file of (issue?.files ?? []) as { name?: string }[])
        if (typeof file?.name === "string") unused.add(file.name);
      for (const category of [
        "binaries",
        "catalog",
        "catalogReferences",
        "dependencies",
        "devDependencies",
        "duplicates",
        "enumMembers",
        "exports",
        "namespaceMembers",
        "optionalPeerDependencies",
        "types",
        "unlisted",
        "unresolved",
      ]) {
        const found = issue?.[category];
        if (Array.isArray(found) && found.length)
          reported.push(`${category} in ${String(issue?.file ?? "the project")}`);
      }
    }
    const classified = { entry: [] as string[], member: [] as string[], ignored: [] as string[] };
    const notMembers: string[] = [];
    for (const file of universe) {
      if (entry.some((pattern) => matchesGlob(file, pattern))) classified.entry.push(file);
      else if (ignore.some((pattern) => matchesGlob(file, pattern))) classified.ignored.push(file);
      else if (unused.has(file)) notMembers.push(file);
      else classified.member.push(file);
    }
    if (notMembers.length)
      throw new GateFailure(
        "failed-command",
        `G3: declared project member is not a member of the dependency model: ${notMembers.join(", ")}`,
      );
    if (reported.length)
      throw new GateFailure(
        "failed-command",
        `G3: knip reported ${reported.length} issue(s) the model does not account for: ${reported.slice(0, 10).join("; ")}`,
      );
    if (run.status !== 0 || run.signal)
      throw new GateFailure(
        "failed-command",
        `knip --no-progress --reporter json failed (${run.status ?? run.signal})`,
      );
    return {
      gate,
      status: "pass",
      model: {
        entry: classified.entry.length,
        projectMembers: classified.member.length,
        explicitlyIgnored: classified.ignored.length,
        ignored: ignore,
      },
    };
  }
  if (gate === "G10") {
    await pin(ctx, policy, "biome", "@biomejs/biome", "biome");
    const biome = JSON.parse(readFileSync(join(ctx.root, "biome.json"), "utf8"));
    const rules = biome?.linter?.rules ?? {};
    const suspicious = rules.suspicious ?? {};
    for (const rule of ["noExplicitAny", "noTsIgnore", "noImportCycles"])
      if (suspicious[rule] !== "error")
        throw new GateFailure("policy-refusal", `G10: explicit Biome correctness rule ${rule} must be an error`);
    const advisories = policy.quality?.advisories;
    if (!advisories) throw new GateFailure("policy-refusal", "G10: the reviewed advisory calibration is not declared");
    const complexity = rules.complexity ?? {};
    for (const [rule, option, expected] of [
      ["noExcessiveCognitiveComplexity", "maxAllowedComplexity", advisories.cognitiveComplexity],
      ["noExcessiveLinesPerFunction", "maxLines", advisories.functionLines],
      ["useMaxParams", "max", advisories.parameters],
    ] as const) {
      const declared = complexity[rule];
      if (!declared || typeof declared !== "object")
        throw new GateFailure("policy-refusal", `G10: the reviewed advisory rule ${rule} is not declared`);
      if (declared.level === "error")
        throw new GateFailure("policy-refusal", `G10: advisory ${rule} must stay advisory, never a blocking cap`);
      if (!["info", "warn", "hint"].includes(declared.level))
        throw new GateFailure("policy-refusal", `G10: advisory ${rule} has an unsupported severity ${declared.level}`);
      if (declared.options?.[option] !== expected)
        throw new GateFailure("policy-refusal", `G10: advisory ${rule} threshold must stay ${expected}`);
    }
    // The counting semantics are pinned with the thresholds: an advisory that
    // counts a different body is a different advisory.
    for (const [rule, options] of Object.entries({
      noExcessiveLinesPerFunction: { skipBlankLines: false, skipIifes: false },
    })) {
      const declared = complexity[rule];
      for (const [option, expected] of Object.entries(options))
        if (declared?.options?.[option] !== expected)
          throw new GateFailure(
            "policy-refusal",
            `G10: advisory ${rule} counting semantics ${option} must stay ${expected}`,
          );
    }
    const argv =
      ctx.scope === "staged"
        ? // §5.4's pre-commit form: the staged files only, and no error when
          // nothing is staged. `check` is the general form; `ci` is the
          // whole-repository one, and they are not interchangeable.
          ["pnpm", "exec", "biome", "check", "--staged", "--no-errors-on-unmatched", "--reporter=json"]
        : ["pnpm", "exec", "biome", "ci", "--reporter=json"];
    const result = await runTool(ctx, argv);
    if (result.error) throw toolFailure(argv, result);
    const report = readJsonReport(result.stdout ?? "");
    if (!report || typeof report !== "object" || !Array.isArray((report as { diagnostics?: unknown }).diagnostics))
      throw new GateFailure("incomplete-report", "G10: Biome produced no readable report");
    const diagnostics = (report as { diagnostics: Record<string, unknown>[] }).diagnostics;
    const errors = diagnostics.filter((diagnostic) => diagnostic?.severity === "error");
    const advisoryRules = new Set([
      "lint/complexity/noExcessiveCognitiveComplexity",
      "lint/complexity/noExcessiveLinesPerFunction",
      "lint/complexity/useMaxParams",
    ]);
    const cohorts: Record<string, Record<string, number>> = {
      "product-runtime": {},
      "bootstrap-rules": {},
      "tests-fixtures": {},
      other: {},
    };
    for (const diagnostic of diagnostics) {
      const category = String(diagnostic?.category ?? "");
      if (!advisoryRules.has(category)) continue;
      const file = String((diagnostic?.location as { path?: unknown } | undefined)?.path ?? "");
      const cohort = file.startsWith("src/")
        ? "product-runtime"
        : file.startsWith(".superman/") || file.startsWith(".archgate/")
          ? "bootstrap-rules"
          : file.startsWith("test/") || /\.test\.[cm]?[jt]sx?$/u.test(file) || file.includes("/test/")
            ? "tests-fixtures"
            : "other";
      const rule = category.split("/").pop() ?? category;
      cohorts[cohort][rule] = (cohorts[cohort][rule] ?? 0) + 1;
    }
    if (errors.length) {
      const summary = errors
        .slice(0, 10)
        .map(
          (diagnostic) =>
            `${diagnostic?.category} ${String((diagnostic?.location as { path?: unknown } | undefined)?.path ?? "")}: ${String(diagnostic?.message ?? "")}`,
        )
        .join("\n");
      throw new GateFailure(
        "failed-command",
        `biome ${argv[3]} failed: ${errors.length} correctness error(s)\n${summary}`,
      );
    }
    if (result.status !== 0 || result.signal)
      throw new GateFailure("failed-command", `biome ${argv[3]} failed (${result.status ?? result.signal})`);
    return {
      gate,
      status: "pass",
      scope: ctx.scope ?? "full",
      advisories: {
        byCohort: cohorts,
        total: Object.values(cohorts).reduce(
          (sum, cohort) => sum + Object.values(cohort).reduce((a, b) => a + b, 0),
          0,
        ),
        blocking: false,
      },
    };
  }
  if (gate !== "G2") throw new Error(`Unknown direct raw gate: ${gate}`);
  // Each host typechecks its own graph: this sibling checks the Deno
  // operational graph with the Deno runtime it drives, and the Node tool
  // chain below checks the Node graph.
  const denoCheck = await denoGraphCheck(ctx);
  await pin(ctx, policy, "tsrs", "tsrs", "tsrs");
  await pin(ctx, policy, "typescript", "typescript", "tsc");
  if (!policy.tools.tsrs.endsWith(`-ts${policy.tools.typescript}`))
    throw new Error("G2: tsrs and reference TypeScript versions do not match");
  await execute(ctx, ["pnpm", "exec", "tsrs", "--noEmit", "--pretty", "false"]);
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ctx.root, env: ctx.env, encoding: "utf8", shell: false })
    .split("\0")
    .filter(Boolean);
  const tests = files.filter((file) => policy.test.files.some((glob: string) => matchesGlob(file, glob)));
  if (!tests.length) {
    if (files.some((file) => file.startsWith("src/")))
      throw new Error("G2: product source exists without a test suite");
    return {
      gate,
      status: "pass",
      tests: "n/a (no product source/tests; bootstrap process suites run separately)",
      denoCheck,
    };
  }
  await pin(ctx, policy, "vitest", "vitest", "vitest");
  await execute(ctx, ["pnpm", "exec", "vitest", "run", "--config", "vitest.config.ts", "--no-cache"]);
  return { gate, status: "pass", tests: tests.length, denoCheck };
}
