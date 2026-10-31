// Temporary full-scope enforcement; no affected selection or gate-result cache.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, matchesGlob } from "node:path";
import { runOwned } from "./replay.ts";

export type GateResult = { gate: string; status: "pass" | "n/a"; reason?: string; [key: string]: unknown };
export type GateContext = {
  root: string;
  baseSha: string;
  headSha: string;
  branch: string;
  env: NodeJS.ProcessEnv;
  tools: Record<string, unknown>;
  fullRun?: boolean;
};

function execute(ctx: GateContext, argv: string[], timeout = 120_000): string {
  const result = runOwned(argv[0], argv.slice(1), {
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
  if (result.error || result.signal || result.status !== 0)
    throw new Error(
      `${argv.join(" ")} failed (${result.status ?? result.signal}): ${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  return result.stdout;
}

function config(ctx: GateContext) {
  const data = JSON.parse(readFileSync(join(ctx.root, ".superman/ci/bootstrap.json"), "utf8"));
  if (data.version !== 1 || !data.tools || !Array.isArray(data.test?.files) || !data.test.files.length)
    throw new Error("Invalid bootstrap tool/test policy");
  if (data.tools.node !== process.versions.node && data.tools.node !== process.versions.node.split(".")[0])
    throw new Error("Node pin mismatch");
  if (Object.hasOwn(process.env, "TSRS_FAST"))
    throw new Error("TSRS_FAST must be unset; fast mode is not gate evidence");
  ctx.tools.node = { expected: data.tools.node, actual: process.versions.node, status: "pass" };
  const pnpm = execute(ctx, ["pnpm", "--version"]).trim();
  if (pnpm !== data.tools.pnpm) throw new Error(`pnpm pin expected ${data.tools.pnpm}, actual ${pnpm}`);
  ctx.tools.pnpm = { expected: data.tools.pnpm, actual: pnpm, status: "pass" };
  return data;
}

function pin(
  ctx: GateContext,
  policy: ReturnType<typeof config>,
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
  const version = execute(ctx, [...command, "--version"]).trim();
  if (!version.includes(expected)) throw new Error(`${name} executable version mismatch: ${version}`);
  ctx.tools[key] = { expected, actual, executableVersion: version, status: "pass" };
}

export async function directGate(gate: string, ctx: GateContext): Promise<GateResult> {
  if (gate === "G4" || gate === "G8") {
    execute({ ...ctx, env: { ...ctx.env, HEAD_REF: ctx.branch, HEAD_SHA: ctx.headSha, BASE_SHA: ctx.baseSha } }, [
      process.execPath,
      join(import.meta.dirname, "pr-policy.ts"),
    ]);
    return { gate, status: "pass" };
  }
  const policy = config(ctx);
  if (gate === "G11") {
    if (ctx.fullRun && !(process.platform === "linux" && process.arch === "x64"))
      return { gate, status: "n/a", reason: "Enforced on the required Linux-x64 leg" };
    if (!existsSync(join(ctx.root, "pnpm-lock.yaml")))
      throw new Error("G11: dependency scan requires the reviewed lockfile");
    if (
      readdirSync(ctx.root).some(
        (file) => file.startsWith(".trivyignore") || /^trivy\.(?:ya?ml|json|toml)$/u.test(file),
      )
    )
      throw new Error("G11: Trivy ignore/config files are forbidden");
    const command = ctx.env.TRIVY_BIN || "trivy";
    const actual = /^Version:\s*(\S+)/mu.exec(execute(ctx, [command, "--version"]))?.[1];
    if (actual !== policy.tools.trivy) throw new Error(`Trivy pin expected ${policy.tools.trivy}, actual ${actual}`);
    ctx.tools.trivy = { expected: policy.tools.trivy, actual, status: "pass" };
    const clean = { ...ctx.env };
    for (const key of Object.keys(clean)) if (key.startsWith("TRIVY_") && key !== "TRIVY_CACHE_DIR") delete clean[key];
    execute({ ...ctx, env: clean }, [
      command,
      "fs",
      "--scanners",
      "vuln,secret,misconfig",
      "--severity",
      "HIGH,CRITICAL",
      "--include-dev-deps",
      "--exit-code",
      "1",
      ".",
    ]);
    return { gate, status: "pass", scan: "fresh vuln/secret/misconfig, HIGH+CRITICAL, including dev dependencies" };
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
      throw new Error(
        "G7: active skill lock/catalog needs the reviewed ticket-08 verifier; unknown evidence is blocked",
      );
    return { gate, status: "n/a", reason: "Project skill catalog/lock not activated (tickets 08–10)" };
  }
  if (gate === "G5" || gate === "G6") {
    const { qualityGate } = await import("./quality.ts");
    return qualityGate(gate, ctx.root, ctx.baseSha, ctx.headSha, ctx.env);
  }
  if (gate === "G1") {
    const command = ctx.env.ARCHGATE_BIN ? [ctx.env.ARCHGATE_BIN] : ["pnpm", "exec", "archgate"];
    pin(ctx, policy, "archgate", "archgate", "archgate", command);
    execute(ctx, [...command, "check", "--base", ctx.baseSha, "--strict", "--output", "json"]);
    const files = execFileSync("git", ["ls-files", "-z"], {
      cwd: ctx.root,
      env: ctx.env,
      encoding: "utf8",
      shell: false,
    })
      .split("\0")
      .filter(Boolean);
    execute(ctx, [...command, "check", "--strict", "--output", "json", "--", ...files]);
    return { gate, status: "pass", fullInventory: files.length };
  }
  if (gate === "G3") {
    pin(ctx, policy, "knip", "knip", "knip");
    execute(ctx, ["pnpm", "exec", "knip", "--no-progress"]);
    return { gate, status: "pass" };
  }
  if (gate === "G10") {
    pin(ctx, policy, "biome", "@biomejs/biome", "biome");
    execute(ctx, ["pnpm", "exec", "biome", "ci"]);
    return { gate, status: "pass" };
  }
  if (gate !== "G2") throw new Error(`Unknown direct raw gate: ${gate}`);
  pin(ctx, policy, "tsrs", "tsrs", "tsrs");
  pin(ctx, policy, "typescript", "typescript", "tsc");
  if (!policy.tools.tsrs.endsWith(`-ts${policy.tools.typescript}`))
    throw new Error("G2: tsrs and reference TypeScript versions do not match");
  execute(ctx, ["pnpm", "exec", "tsrs", "--noEmit", "--pretty", "false"]);
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ctx.root, env: ctx.env, encoding: "utf8", shell: false })
    .split("\0")
    .filter(Boolean);
  const tests = files.filter((file) => policy.test.files.some((glob: string) => matchesGlob(file, glob)));
  if (!tests.length) {
    if (files.some((file) => file.startsWith("src/")))
      throw new Error("G2: product source exists without a test suite");
    return { gate, status: "pass", tests: "n/a (no product source/tests; bootstrap process suites run separately)" };
  }
  pin(ctx, policy, "vitest", "vitest", "vitest");
  execute(ctx, ["pnpm", "exec", "vitest", "run", "--config", "vitest.config.ts", "--no-cache"]);
  return { gate, status: "pass", tests: tests.length };
}
