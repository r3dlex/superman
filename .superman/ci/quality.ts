// Protected raw G5/G6 implementation; no product behavior or caller writes.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, matchesGlob, posix, relative } from "node:path";
import { ownedSnapshot, runOwned } from "./replay.ts";

type QualityResult = {
  gate: string;
  status: "pass" | "n/a";
  reason?: string;
  metrics?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
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
    throw new Error(`${gate}: invalid ${tool} report JSON; measurement evidence unavailable`);
  }
}

export function qualityGate(
  gate: string,
  root: string,
  baseSha: string,
  headSha: string,
  env: NodeJS.ProcessEnv,
): QualityResult {
  if (!["G5", "G6"].includes(gate)) throw new Error(`Unsupported quality gate ${gate}`);
  const gitEnv = {
    ...Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, env: gitEnv, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024 });
  const sources = (sha: string) =>
    git("ls-tree", "-r", "--name-only", "-z", sha, "--", "src")
      .split("\0")
      .filter((path) => matchesGlob(path, "src/**/*.ts") && (gate === "G5" || !matchesGlob(path, "src/**/*.test.ts")))
      .sort();
  const before = sources(baseSha);
  const after = sources(headSha);
  for (const [sha, files] of [
    [baseSha, before],
    [headSha, after],
  ] as const) {
    for (const file of files) {
      if (!/^100(?:644|755) blob /u.test(git("ls-tree", "-z", sha, "--", file)))
        throw new Error(`${gate}: quality scopes require regular committed source files: ${file}`);
    }
  }
  if (!before.length && !after.length) return { gate, status: "n/a", reason: "no TypeScript source" };
  let baseline: { jscpdPct: number; mutationScore: number; qualityInputsHash: string } | undefined;
  const baselineEntry = git("ls-tree", "-z", baseSha, "--", "superman.ratchet.json");
  if (before.length || baselineEntry) {
    if (!/^100(?:644|755) blob /u.test(baselineEntry))
      throw new Error(`${gate}: reviewed superman.ratchet.json is missing; first-source baseline follow-up required`);
    try {
      baseline = JSON.parse(git("show", `${baseSha}:superman.ratchet.json`));
      if (
        !baseline ||
        Object.keys(baseline).some((key) => !["jscpdPct", "mutationScore", "qualityInputsHash"].includes(key)) ||
        ![baseline.jscpdPct, baseline.mutationScore].every(
          (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100,
        ) ||
        !/^[a-f0-9]{64}$/u.test(baseline.qualityInputsHash)
      )
        throw new Error("invalid baseline fields");
    } catch {
      throw new Error(`${gate}: invalid reviewed superman.ratchet.json; Gate 1 baseline refresh required`);
    }
  }
  const config = JSON.parse(git("show", `${baseSha}:.superman/ci/bootstrap.json`));
  if (
    config.version !== 1 ||
    !config.tools ||
    !Array.isArray(config.policyInputs) ||
    config.policyInputs.some(
      (path: unknown) => typeof path !== "string" || path.startsWith("/") || path.split("/").includes(".."),
    )
  )
    throw new Error(`${gate}: invalid reviewed quality policy`);
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
      throw new Error(`${gate}: quality policy changed or unavailable; Gate 1 baseline refresh required: ${path}`);
    // G4 owns general discovery. This narrower hash profile accepts only exact,
    // explicitly inventoried local includes, not a second optimistic resolver.
    const text = git("show", `${baseSha}:${path}`);
    const refs: string[] = [];
    try {
      if (/\.jsonc?$/u.test(path)) {
        const data = JSON.parse(text);
        if (data.extends !== undefined) refs.push(...(Array.isArray(data.extends) ? data.extends : [data.extends]));
        if (data.references !== undefined) {
          if (!Array.isArray(data.references)) throw new Error("unknown references");
          for (const ref of data.references)
            refs.push(typeof ref.path === "string" && !ref.path.startsWith(".") ? `./${ref.path}` : ref.path);
        }
      } else if (/\.[cm]?[jt]sx?$/u.test(path)) {
        for (const match of text.matchAll(
          /(?:^|[;\n])\s*(?:import\s+(?:[^;]*?\sfrom\s*)?|export\s+[^;]*?\sfrom\s*)["']([^"']+)["']|\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/gu,
        ))
          refs.push(match[1] ?? match[2]);
        if (/\b(?:import|require)\s*\(\s*[^\s"']|\b(?:readFile(?:Sync)?|readdir(?:Sync)?|globSync)\s*\(/u.test(text))
          throw new Error("dynamic policy input");
      }
      for (const ref of refs) {
        if (
          typeof ref !== "string" ||
          ref.startsWith("/") ||
          ref.startsWith("#") ||
          (ref.includes(":") && !ref.startsWith("node:")) ||
          (ref.startsWith(".") && !policies.includes(posix.normalize(posix.join(posix.dirname(path), ref))))
        )
          throw new Error("unlisted local policy reference");
      }
    } catch {
      throw new Error(
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
        scopes: { duplication: "src/**/*.ts", mutation: ["src/**/*.ts", "!src/**/*.test.ts"] },
        execution: { duplication: "jscpd explicit full corpus", mutation: "stryker inPlace force explicit files" },
        checker: createHash("sha256")
          .update(readFileSync(import.meta.filename))
          .digest("hex"),
        snapshotRunner: createHash("sha256")
          .update(readFileSync(join(import.meta.dirname, "replay.ts")))
          .digest("hex"),
      }),
    )
    .digest("hex");
  if (baseline && baseline.qualityInputsHash !== qualityInputsHash)
    throw new Error(
      `${gate}: qualityInputsHash scope/tool/config mismatch (expected ${baseline.qualityInputsHash}, actual ${qualityInputsHash}); Gate 1 baseline refresh required`,
    );
  if (gate === "G6" && baseline && !before.length) {
    throw new Error(
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
        throw new Error("invalid ratchet change");
    } catch {
      throw new Error(`${gate}: candidate baseline missing, loosened or re-scoped; Gate 1 baseline refresh required`);
    }
  }
  if (!after.length) {
    if (
      baseline &&
      candidateBaseline &&
      (baseline.jscpdPct !== candidateBaseline.jscpdPct || baseline.mutationScore !== candidateBaseline.mutationScore)
    )
      throw new Error(`${gate}: empty source scope cannot prove ratchet tightening; Gate 1 baseline refresh required`);
    return {
      gate,
      status: "n/a",
      reason: "no candidate TypeScript source; reviewed source scope removed",
      evidence: { baseSha, headSha, qualityInputsHash, baseline, removed: before },
    };
  }
  const temporary = mkdtempSync(join(tmpdir(), "superman-quality-"));
  try {
    const home = join(temporary, "home");
    mkdirSync(home);
    const runnerEnv = {
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
    const binaries: Record<string, string> =
      gate === "G5"
        ? { jscpd: "jscpd/run-jscpd.js" }
        : { stryker: "@stryker-mutator/core/bin/stryker.js", vitest: "vitest/vitest.mjs", tsc: "typescript/bin/tsc" };
    const snapshot = ownedSnapshot(root, temporary, "candidate", headSha, gitEnv, binaries);
    const execute = (args: string[], cwd = snapshot) => {
      const result = runOwned("pnpm", ["exec", ...args], {
        cwd,
        env: runnerEnv,
        encoding: "utf8",
        shell: false,
        timeout: args.includes("--version") ? 10_000 : 120_000,
        maxBuffer: 32 * 1024 * 1024,
      });
      if (result.error || result.signal || result.status !== 0)
        throw new Error(
          `${gate}: quality tool failed (${result.status ?? result.signal}): ${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
        );
      return result.stdout;
    };
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
          throw new Error(
            `${gate}: ${name} pin mismatch: expected ${expected}, declared ${declared}, installed ${installed}`,
          );
        const executableVersion = command ? execute([command, "--version"]).trim() : undefined;
        if (
          (format === "plain" && executableVersion !== expected) ||
          (format === "vitest" && !executableVersion?.startsWith(`vitest/${expected} `)) ||
          (format === "typescript" && executableVersion !== `Version ${expected}`)
        )
          throw new Error(`${gate}: ${name} executable pin mismatch: ${executableVersion}`);
        tools[name] = {
          expected,
          declared,
          installed,
          ...(command ? { executableVersion } : { kind: "Stryker plugin; no standalone executable" }),
        };
      }
      if (config.tools.stryker !== "10.1.1" || config.tools.vitest !== "5.0.5")
        throw new Error(`${gate}: unsupported pinned mutation reporter schema`);
      const mutate = (snapshot: string, after: string[]) => {
        const declared = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies;
        if (Object.entries(tools).some(([name, pin]) => declared?.[name] !== (pin as { expected: string }).expected))
          throw new Error(`${gate}: snapshot tool declarations differ from reviewed pins`);
        if (after.some((file) => /[,?*[\]{}!:\\\r\n]/u.test(file)))
          throw new Error(`${gate}: mutation scope contains unsupported glob or range syntax`);
        const originals = new Map(after.map((file) => [file, readFileSync(join(snapshot, file), "utf8")]));
        const path = join(snapshot, ".superman-ci/mutation.json");
        rmSync(path, { force: true });
        const output = execute(
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
          throw new Error(`${gate}: Stryker did not restore owned snapshot inputs`);
        if (!existsSync(path)) throw new Error(`${gate}: missing Stryker mutation report`);
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
          JSON.stringify(Object.keys(report.files).sort()) !== JSON.stringify(after) ||
          report.config?.inPlace !== true ||
          report.config.force !== true ||
          report.config.incremental !== false ||
          report.config.dryRunOnly !== false ||
          report.config.testRunner !== "vitest" ||
          JSON.stringify(report.config.mutate) !== JSON.stringify(after)
        )
          throw new Error(`${gate}: unknown Stryker schema or mismatched execution/scope`);
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
          throw new Error(`${gate}: unknown Stryker threshold/test schema or unsupported global break floor`);
        const testIds = new Set<string>();
        for (const file of Object.values(report.testFiles) as { tests: { id: string; name: string }[] }[]) {
          if (!knownKeys(file, ["tests"], ["source"]) || !Array.isArray(file.tests))
            throw new Error(`${gate}: invalid Stryker test identities`);
          for (const test of file.tests) {
            if (
              !knownKeys(test, ["id", "name"], ["location"]) ||
              typeof test.id !== "string" ||
              typeof test.name !== "string" ||
              !test.name ||
              testIds.has(test.id)
            )
              throw new Error(`${gate}: invalid Stryker test identities`);
            testIds.add(test.id);
          }
        }
        if (!testIds.size) throw new Error(`${gate}: missing Stryker test completion identities`);
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
            throw new Error(`${gate}: invalid Stryker file identity/source`);
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
              throw new Error(
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
                throw new Error(`${gate}: invalid Stryker mutant location`);
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
              throw new Error(`${gate}: invalid Stryker mutant completion metadata`);
            for (const key of ["coveredBy", "killedBy"])
              if (
                mutant[key] !== undefined &&
                (!Array.isArray(mutant[key]) ||
                  new Set(mutant[key]).size !== mutant[key].length ||
                  mutant[key].some((id: string) => !testIds.has(id)))
              )
                throw new Error(`${gate}: inconsistent Stryker test identities`);
            if (
              mutant.status === "Killed" &&
              (!Array.isArray(mutant.killedBy) ||
                !mutant.killedBy.length ||
                mutant.killedBy.some((id: string) => !testIds.has(id)) ||
                !Number.isSafeInteger(mutant.testsCompleted) ||
                mutant.testsCompleted < 1)
            )
              throw new Error(`${gate}: missing mutant completion/kill evidence`);
            if (
              (mutant.status === "Survived" &&
                (!nonnegativeInteger(mutant.testsCompleted) || mutant.testsCompleted < 1)) ||
              (mutant.status !== "Killed" && mutant.killedBy?.length) ||
              (mutant.status === "NoCoverage" && mutant.coveredBy?.length)
            )
              throw new Error(`${gate}: inconsistent Stryker mutant status/completion evidence`);
            counts[mutant.status]++;
            const { duration: _duration, ...stable } = mutant;
            mutants.push({ file, ...stable });
          }
        }
        const instrumented = /Instrumented (\d+) source file\(s\) with (\d+) mutant\(s\)/u.exec(output);
        if (
          !ids.size ||
          !instrumented ||
          Number(instrumented[1]) !== after.length ||
          Number(instrumented[2]) !== ids.size
        )
          throw new Error(`${gate}: zero mutants or inconsistent Stryker instrumented counters`);
        if (["CompileError", "RuntimeError", "Timeout", "Ignored", "Pending"].some((status) => counts[status]))
          throw new Error(`${gate}: incomplete or ambiguous mutation outcomes: ${JSON.stringify({ counts, mutants })}`);
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
      if (!baseline) {
        const { files, mutants, restored, ...metrics } = mutate(snapshot, after);
        return {
          gate,
          status: "pass",
          reason: "measured initialization; no approved-base source comparison",
          metrics,
          evidence: { baseSha, headSha, qualityInputsHash, files, mutants, restored, tools },
        };
      }
      const changed = new Set(
        git("diff", "--name-only", "-z", "--no-renames", baseSha, headSha, "--", "src").split("\0").filter(Boolean),
      );
      const existing = after.filter((file) => before.includes(file) && changed.has(file));
      const added = after.filter((file) => !before.includes(file));
      const removed = before.filter((file) => !after.includes(file));
      if (removed.length && added.length)
        throw new Error(
          `${gate}: ambiguous mutation scope relocation; Gate 1 reviewed mapping and baseline refresh required: ${JSON.stringify({ removed, added })}`,
        );
      const evidence = { baseSha, headSha, qualityInputsHash, baseline, candidateBaseline, tools, removed };
      const tightening = candidateBaseline && candidateBaseline.mutationScore > baseline.mutationScore;
      if (!existing.length && !added.length && !tightening)
        return { gate, status: "n/a", reason: "no changed-existing or new product mutation scope", evidence };
      let comparison:
        | {
            files: string[];
            base: ReturnType<typeof mutate>;
            candidate: ReturnType<typeof mutate>;
          }
        | undefined;
      if (existing.length) {
        const baseSnapshot = ownedSnapshot(root, temporary, "base", baseSha, gitEnv, binaries);
        comparison = { files: existing, base: mutate(baseSnapshot, existing), candidate: mutate(snapshot, existing) };
        if (
          comparison.candidate.counts.Killed * comparison.base.totalMutants <
          comparison.base.counts.Killed * comparison.candidate.totalMutants
        )
          throw new Error(
            `${gate}: comparable-scope mutation regression ${comparison.candidate.mutationScore} < base ${comparison.base.mutationScore}; ${JSON.stringify(comparison)}`,
          );
      }
      const initialization = added.length ? mutate(snapshot, added) : undefined;
      const ratchetTightening = tightening ? mutate(snapshot, after) : undefined;
      if (ratchetTightening && candidateBaseline && ratchetTightening.mutationScore < candidateBaseline.mutationScore)
        throw new Error(
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
        },
        evidence,
      };
    }
    const expected = config.tools.jscpd;
    const declared = JSON.parse(readFileSync(join(snapshot, "package.json"), "utf8")).devDependencies?.jscpd;
    const installed = JSON.parse(readFileSync(join(root, "node_modules/jscpd/package.json"), "utf8")).version;
    if (expected !== "5.4.2" || expected !== declared || expected !== installed)
      throw new Error(
        `${gate}: jscpd pin mismatch: expected ${expected}, declared ${declared}, installed ${installed}`,
      );
    const executableVersion = execute(["jscpd", "--version"]).trim();
    if (executableVersion !== `jscpd ${expected}`)
      throw new Error(`${gate}: jscpd executable pin mismatch: ${executableVersion}`);
    const output = join(snapshot, ".superman-ci", "duplication");
    for (const file of after) {
      // Match jscpd 5.4.2's raw find_ignore_ranges, not JS comment semantics:
      // its slash-comment scan can make literal text effective too.
      let ignored = false;
      for (const [comment] of readFileSync(join(snapshot, file), "utf8").matchAll(
        /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/gu,
      )) {
        if (comment.includes("jscpd:ignore-start")) ignored = true;
        else if (ignored && comment.includes("jscpd:ignore-end")) {
          throw new Error(`G5: source-level jscpd ignore range is forbidden: ${file}`);
        }
      }
    }
    // A full run must not inherit jscpd's silent one-megabyte file exclusion.
    const largestSourceBytes = Math.max(1, ...after.map((path) => readFileSync(join(snapshot, path)).length));
    execute([
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
      ...after.map((path) => `./${path}`),
    ]);
    const reportPath = join(output, "jscpd-report.json");
    if (!existsSync(reportPath)) throw new Error(`${gate}: missing jscpd report`);
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
      throw new Error(`${gate}: unknown jscpd reporter schema`);
    if (total.sources !== after.length) {
      throw new Error(
        `${gate}: incomplete jscpd corpus counters: expected ${after.length} sources, actual ${total.sources}; filters or undersized files require reviewed policy modeling`,
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
      throw new Error(`${gate}: invalid or ambiguous jscpd report counters`);
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
        throw new Error(`${gate}: unknown jscpd clone schema`);
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
          throw new Error(`${gate}: invalid jscpd clone file identity`);
        const file = relative(realpathSync(snapshot), realpathSync(location.name));
        if (!after.includes(file)) throw new Error(`${gate}: jscpd clone escaped the selected full corpus`);
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
            throw new Error(`${gate}: invalid jscpd clone location`);
        }
        location.name = file;
      }
    }
    const metrics = {
      jscpdPct: total.percentage,
      clones: total.clones,
      sources: total.sources,
      lines: total.lines,
      tokens: total.tokens,
    };
    const threshold = candidateBaseline?.jscpdPct;
    if (threshold !== undefined && total.percentage > threshold)
      throw new Error(
        `${gate}: duplication regression ${total.percentage} > approved ${threshold}; ${JSON.stringify({ metrics, files: after, clones: report.duplicates })}`,
      );
    return {
      gate,
      status: "pass",
      reason: baseline
        ? "full corpus satisfies reviewed duplication baseline"
        : "measured initialization; no approved-base source comparison",
      metrics,
      evidence: {
        baseSha,
        headSha,
        qualityInputsHash,
        files: after,
        clones: report.duplicates,
        ...(baseline ? { baseline } : {}),
        tools: { jscpd: { expected, declared, installed, executableVersion } },
      },
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
