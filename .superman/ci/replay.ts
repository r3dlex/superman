// Uncached bootstrap replay. Only owned temporary snapshots are written.
import { execFileSync, type SpawnSyncOptionsWithStringEncoding, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, matchesGlob, relative, resolve } from "node:path";

export function runOwned(command: string, args: string[], options: SpawnSyncOptionsWithStringEncoding) {
  // Node 26 forwards detached to native spawn, but its sync type omits it.
  // The timeout process fixture verifies this POSIX process-group boundary.
  const ownedOptions: SpawnSyncOptionsWithStringEncoding & { detached: boolean } = {
    ...options,
    detached: true,
    killSignal: "SIGKILL",
  };
  const result = spawnSync(command, args, ownedOptions);
  if (result.pid) {
    try {
      process.kill(-result.pid, "SIGKILL");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
  return result;
}

export function ownedSnapshot(
  root: string,
  temporary: string,
  name: string,
  sha: string,
  env: NodeJS.ProcessEnv,
  binaries: Record<string, string> = { vitest: "vitest/vitest.mjs", tsrs: "tsrs/bin/tsrs" },
): string {
  const path = join(temporary, name);
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", ...args], {
      cwd: temporary,
      env,
      encoding: "utf8",
      shell: false,
      maxBuffer: 64 * 1024 * 1024,
    });
  git("clone", "--quiet", "--no-checkout", "--no-hardlinks", "--", root, path);
  git("-C", path, "read-tree", sha);
  git("-C", path, "checkout-index", "--all");
  git("-C", path, "update-ref", "--no-deref", "HEAD", sha);
  const modules = join(path, "node_modules");
  mkdirSync(modules);
  for (const item of readdirSync(join(root, "node_modules"))) {
    if (!item.startsWith(".")) symlinkSync(realpathSync(join(root, "node_modules", item)), join(modules, item), "dir");
  }
  mkdirSync(join(modules, ".bin"));
  for (const [command, file] of Object.entries(binaries))
    symlinkSync(realpathSync(join(root, "node_modules", file)), join(modules, ".bin", command));
  return path;
}

// Vitest's JSON reporter deliberately omits unhandled errors. Its public
// completion callback supplies the independent evidence the JSON cannot carry.
type HookEntity = { result?: () => { errors?: readonly unknown[] }; errors?: () => readonly unknown[] };
type ParentSuite = { type: string; name: string; parent?: ParentSuite };
type CompletedModule = {
  moduleId: string;
  errors: () => readonly unknown[];
  children: {
    allTests: () => Iterable<{ name: string; parent: ParentSuite; result: () => { state: string } }>;
    allSuites: () => Iterable<{ errors: () => readonly unknown[] }>;
  };
};
class ReplayCompletionReporter {
  private hooks = new Map<HookEntity, number>();
  private hookFailures = 0;
  onHookStart(hook: { entity: HookEntity }): void {
    this.hooks.set(hook.entity, hook.entity.errors?.().length ?? hook.entity.result?.().errors?.length ?? 0);
  }
  onHookEnd(hook: { entity: HookEntity }): void {
    const count = hook.entity.errors?.().length ?? hook.entity.result?.().errors?.length ?? 0;
    if (!this.hooks.has(hook.entity) || count > (this.hooks.get(hook.entity) ?? 0)) this.hookFailures++;
    this.hooks.delete(hook.entity);
  }
  onTestRunEnd(modules: readonly CompletedModule[], errors: readonly unknown[], reason: string): void {
    const path = process.env.SUPERMAN_REPLAY_COMPLETION;
    if (!path) throw new Error("Missing replay completion destination");
    const tests = modules.flatMap((module) =>
      [...module.children.allTests()].map((test) => {
        const ancestors: string[] = [];
        for (let parent: ParentSuite | undefined = test.parent; parent?.type === "suite"; parent = parent.parent)
          ancestors.unshift(parent.name);
        return { file: module.moduleId, fullName: [...ancestors, test.name].join(" "), status: test.result().state };
      }),
    );
    const suiteErrors = modules.reduce(
      (count, module) =>
        count +
        module.errors().length +
        [...module.children.allSuites()].reduce((sum, suite) => sum + suite.errors().length, 0),
      0,
    );
    writeFileSync(
      path,
      JSON.stringify({
        schema: 1,
        modules: modules.length,
        tests,
        suiteErrors,
        unhandledErrors: errors.length,
        hookFailures: this.hookFailures,
        unfinishedHooks: this.hooks.size,
        reason,
      }),
    );
  }
}

type Outcome = { status: string; category?: string; testsCompleted: number };
type Report = {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  success: boolean;
  testResults: {
    name: string;
    status: string;
    message: string;
    assertionResults: {
      fullName: string;
      ancestorTitles: string[];
      title: string;
      status: string;
      failureMessages: string[];
    }[];
  }[];
};

export function replayBehavior(
  root: string,
  baseSha: string,
  candidateSha: string,
  env: NodeJS.ProcessEnv,
  evidence: Record<string, unknown>,
  tools: Record<string, unknown>,
): void {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", ...args], {
      cwd,
      env,
      encoding: "utf8",
      shell: false,
      maxBuffer: 64 * 1024 * 1024,
    });
  const config = JSON.parse(git(root, "show", `${baseSha}:.superman/ci/bootstrap.json`));
  if (
    config.version !== 1 ||
    !Array.isArray(config.test?.files) ||
    !config.test.files.length ||
    !Array.isArray(config.test?.support) ||
    !Array.isArray(config.policyInputs) ||
    !config.policyInputs.includes("tsconfig.json") ||
    !config.policyInputs.includes("vitest.config.ts") ||
    [...config.policyInputs, ...config.test.files, ...config.test.support].some(
      (path) =>
        typeof path !== "string" ||
        !path ||
        path.startsWith("/") ||
        path.split("/").some((part: string) => part === ".." || part === "."),
    )
  ) {
    throw new Error("G9: invalid bootstrap configuration");
  }
  for (const path of [".superman/ci/bootstrap.json", ...config.policyInputs]) {
    const before = git(root, "ls-tree", "-z", baseSha, "--", path);
    const after = git(root, "ls-tree", "-z", candidateSha, "--", path);
    if (!/^100(?:644|755) blob /u.test(before) || before !== after)
      throw new Error(`G9: reviewed policy input missing, aliased or changed: ${path}`);
  }
  const changed = git(root, "diff", "--name-only", "-z", "--no-renames", baseSha, candidateSha)
    .split("\0")
    .filter(Boolean);
  const candidateTree = new Map(
    git(root, "ls-tree", "-r", "-z", candidateSha)
      .split("\0")
      .filter(Boolean)
      .map((entry) => {
        const tab = entry.indexOf("\t");
        return [entry.slice(tab + 1), entry.slice(0, tab)];
      }),
  );
  const tests = changed
    .filter((file) => candidateTree.has(file) && config.test.files.some((glob: string) => matchesGlob(file, glob)))
    .sort();
  Object.assign(evidence, {
    baseSha,
    candidateSha,
    tests,
    baseOutcome: { status: "blocked" },
    candidateOutcome: { status: "blocked" },
  });
  if (!tests.length) throw new Error("G9: no added or changed test files");
  const nodeMatches =
    config.tools?.node === process.versions.node || config.tools?.node === process.versions.node.split(".")[0];
  tools.node = { expected: config.tools?.node, actual: process.versions.node, status: nodeMatches ? "pass" : "fail" };
  if (!nodeMatches) throw new Error(`G9: Node pin expected ${config.tools?.node}, actual ${process.versions.node}`);
  const actualVitest = JSON.parse(readFileSync(join(root, "node_modules/vitest/package.json"), "utf8")).version;
  tools.vitest = {
    expected: config.tools?.vitest,
    actual: actualVitest,
    status: actualVitest === config.tools?.vitest ? "pass" : "fail",
  };
  if (actualVitest !== config.tools?.vitest || actualVitest !== "5.0.5")
    throw new Error(
      `G9: Vitest pin expected ${config.tools?.vitest}, actual ${actualVitest}; reporter supports 5.0.5 only`,
    );
  const inputs = changed
    .filter((file) => tests.includes(file) || config.test.support.some((glob: string) => matchesGlob(file, glob)))
    .sort();
  for (const file of inputs) {
    const before = git(root, "ls-tree", "-z", baseSha, "--", file);
    const after = candidateTree.get(file);
    if ((before && !/^100(?:644|755) blob /u.test(before)) || (after && !/^100(?:644|755) blob /u.test(after))) {
      throw new Error(`G9: test-support inputs must be regular files: ${file}`);
    }
  }
  evidence.testInputs = inputs;
  evidence.testInputsHash = createHash("sha256")
    .update(JSON.stringify(inputs.map((file) => [file, candidateTree.get(file) ?? null])))
    .digest("hex");

  const temporary = mkdtempSync(join(tmpdir(), "superman-replay-"));
  try {
    // Materialize the dynamically loaded reporter as an owned artifact rather
    // than an apparently unused public export of this bootstrap module.
    const reporterPath = join(temporary, "replay-completion.mjs");
    writeFileSync(
      reporterPath,
      `import { writeFileSync } from 'node:fs';\n${ReplayCompletionReporter.toString()}\n${["export", "default ReplayCompletionReporter;"].join(" ")}\n`,
    );
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
      PNPM_CONFIG_IGNORE_SCRIPTS: "true",
      PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: "false",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    };
    const base = ownedSnapshot(root, temporary, "base", baseSha, env);
    const candidate = ownedSnapshot(root, temporary, "candidate", candidateSha, env);
    const pnpmVersion = runOwned("pnpm", ["--version"], {
      cwd: candidate,
      env: runnerEnv,
      encoding: "utf8",
      shell: false,
      timeout: 10_000,
    });
    const actualPnpm = pnpmVersion.stdout?.trim();
    const pnpmMatches =
      !pnpmVersion.error &&
      !pnpmVersion.signal &&
      pnpmVersion.status === 0 &&
      !pnpmVersion.stderr &&
      actualPnpm === config.tools?.pnpm;
    tools.pnpm = { expected: config.tools?.pnpm, actual: actualPnpm ?? null, status: pnpmMatches ? "pass" : "fail" };
    if (!pnpmMatches)
      throw new Error(
        `G9: pnpm pin expected ${config.tools?.pnpm}, actual ${actualPnpm ?? pnpmVersion.error?.message}`,
      );
    // Overlay only the declared candidate tests/support, never implementation.
    git(base, "restore", `--source=${candidateSha}`, "--worktree", "--", ...inputs);
    const run = (cwd: string, name: string): { outcome: Outcome; identities: string[] } => {
      const reportPath = join(temporary, `${name}.json`);
      const completionPath = join(temporary, `${name}-completion.json`);
      const result = runOwned(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          ...tests.map((file) => `./${file}`),
          "--config",
          join(cwd, "vitest.config.ts"),
          "--reporter=json",
          "--reporter",
          reporterPath,
          "--outputFile",
          reportPath,
          "--no-cache",
        ],
        {
          cwd,
          env: { ...runnerEnv, SUPERMAN_REPLAY_COMPLETION: completionPath },
          encoding: "utf8",
          shell: false,
          timeout: 20_000,
          killSignal: "SIGKILL",
          maxBuffer: 16 * 1024 * 1024,
        },
      );
      if (result.error || result.signal || !existsSync(reportPath))
        throw new Error(`G9: ${name} tool failure or missing report: ${result.error?.message ?? result.stderr}`);
      // This pinned JSON reporter omits unhandled errors. Noisy stderr is
      // deliberately unclassifiable, even when its assertion counters agree.
      if (result.stderr.trim()) throw new Error(`G9: ${name} stderr/unhandled error: ${result.stderr}`);
      if (
        ![reportPath, realpathSync(reportPath)].some(
          (path) => result.stdout.trim() === `JSON report written to ${path}`,
        )
      ) {
        throw new Error(`G9: ${name} unhandled error or unknown tool output: ${result.stdout}`);
      }
      if (!existsSync(completionPath)) throw new Error(`G9: ${name} missing completion evidence`);
      const completion = JSON.parse(readFileSync(completionPath, "utf8"));
      if (completion.suiteErrors !== 0) throw new Error(`G9: ${name} fixture/setup or import failure`);
      if (completion.hookFailures !== 0 || completion.unfinishedHooks !== 0)
        throw new Error(`G9: ${name} fixture/hook failure`);
      if (
        completion.schema !== 1 ||
        completion.modules !== tests.length ||
        completion.unhandledErrors !== 0 ||
        completion.reason !== (result.status === 0 ? "passed" : "failed")
      )
        throw new Error(`G9: ${name} unhandled error or incomplete execution`);
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
      const keys = [
        "numTotalTestSuites",
        "numPassedTestSuites",
        "numFailedTestSuites",
        "numPendingTestSuites",
        "numTotalTests",
        "numPassedTests",
        "numFailedTests",
        "numPendingTests",
        "numTodoTests",
        "snapshot",
        "startTime",
        "success",
        "testResults",
      ];
      if (
        !report ||
        typeof report !== "object" ||
        keys.some((key) => !Object.hasOwn(report, key)) ||
        Object.keys(report).some((key) => ![...keys, "coverageMap"].includes(key))
      )
        throw new Error(`G9: ${name} unknown reporter schema`);
      if (!Array.isArray(report.testResults) || report.testResults.length !== tests.length)
        throw new Error(`G9: ${name} invalid report or incomplete test files`);
      let passed = 0;
      let failed = 0;
      const missing: { path: string; symbol: string }[] = [];
      const identities: string[] = [];
      const statuses: string[] = [];
      const reported: string[] = [];
      const suites = new Map<string, boolean>();
      for (const file of report.testResults) {
        const path = relative(realpathSync(cwd), resolve(file.name));
        reported.push(path);
        if (
          !tests.includes(path) ||
          file.message ||
          !Array.isArray(file.assertionResults) ||
          !file.assertionResults.length
        )
          throw new Error(`G9: ${name} setup/import failure or unknown test file`);
        for (const assertion of file.assertionResults) {
          if (
            !Array.isArray(assertion.ancestorTitles) ||
            assertion.ancestorTitles.some((title) => typeof title !== "string") ||
            typeof assertion.title !== "string" ||
            !assertion.title ||
            assertion.fullName !== [...assertion.ancestorTitles, assertion.title].join(" ")
          )
            throw new Error(`G9: ${name} unknown report test identity`);
          identities.push(`${path}#${assertion.fullName}`);
          statuses.push(`${path}#${assertion.fullName}#${assertion.status}`);
          if (assertion.status === "passed" && assertion.failureMessages.length === 0) passed++;
          else if (
            assertion.status === "failed" &&
            assertion.failureMessages.length > 0 &&
            assertion.failureMessages.every((message) => message.startsWith("AssertionError:"))
          )
            failed++;
          else if (name === "base" && assertion.status === "failed" && assertion.failureMessages.length === 1) {
            const symbol = /^TypeError: \(0 , __vite_ssr_import_\d+__\.(\w+)\) is not a function\n/u.exec(
              assertion.failureMessages[0],
            );
            if (!symbol) throw new Error(`G9: ${name} failure is not a completed behavior assertion`);
            missing.push({ path, symbol: symbol[1] });
            failed++;
          } else throw new Error(`G9: ${name} failure is not a completed behavior assertion`);
          for (let i = 0; i <= assertion.ancestorTitles.length; i++) {
            const id = `${path}#${JSON.stringify(assertion.ancestorTitles.slice(0, i))}`;
            suites.set(id, suites.get(id) === true || assertion.status === "failed");
          }
        }
        if (
          file.status !==
          (file.assertionResults.some((assertion) => assertion.status === "failed") ? "failed" : "passed")
        )
          throw new Error(`G9: ${name} inconsistent report file status`);
      }
      if (
        !Array.isArray(completion.tests) ||
        JSON.stringify(statuses.sort()) !==
          JSON.stringify(
            completion.tests
              .map(
                (test: { file: string; fullName: string; status: string }) =>
                  `${relative(realpathSync(cwd), resolve(test.file))}#${test.fullName}#${test.status}`,
              )
              .sort(),
          )
      )
        throw new Error(`G9: ${name} test identities disagree with completion evidence`);
      if (missing.length) {
        const actualTsrs = JSON.parse(readFileSync(join(root, "node_modules/tsrs/package.json"), "utf8")).version;
        tools.tsrs = {
          expected: config.tools?.tsrs,
          actual: actualTsrs,
          status: actualTsrs === config.tools?.tsrs ? "pass" : "fail",
        };
        if (actualTsrs !== config.tools?.tsrs) throw new Error("G9: tsrs pin mismatch");
        const compile = (path: string) =>
          runOwned("pnpm", ["exec", "tsrs", "--noEmit", "--pretty", "false"], {
            cwd: path,
            env: runnerEnv,
            encoding: "utf8",
            shell: false,
            timeout: 20_000,
            killSignal: "SIGKILL",
            maxBuffer: 16 * 1024 * 1024,
          });
        const baseTypes = compile(base);
        const candidateTypes = compile(candidate);
        if (
          baseTypes.error ||
          baseTypes.signal ||
          baseTypes.status !== 2 ||
          baseTypes.stderr ||
          candidateTypes.error ||
          candidateTypes.signal ||
          candidateTypes.status !== 0 ||
          candidateTypes.stderr ||
          candidateTypes.stdout
        )
          throw new Error("G9: missing symbol compiler evidence unavailable or candidate compilation failed");
        const diagnostics = baseTypes.stdout
          .trim()
          .split("\n")
          .map((line) =>
            /^(.+)\(\d+,\d+\): error TS2305: Module '"([^"]+)"' has no exported member '([^']+)'\.$/u.exec(line),
          );
        if (
          !diagnostics.length ||
          diagnostics.some(
            (item) =>
              !item ||
              !missing.some((failure) => failure.path === item[1] && failure.symbol === item[3]) ||
              !relative(base, resolve(base, dirname(item[1]), item[2])).startsWith("src/") ||
              matchesGlob(relative(base, resolve(base, dirname(item[1]), item[2])), "src/**/*.test.ts"),
          ) ||
          missing.some(
            (failure) => !diagnostics.some((item) => item?.[1] === failure.path && item[3] === failure.symbol),
          )
        ) {
          throw new Error("G9: failure is not a compiler-confirmed missing product symbol");
        }
      }
      if (
        new Set(reported).size !== tests.length ||
        new Set(identities).size !== identities.length ||
        report.numTotalTestSuites !== suites.size ||
        report.numFailedTestSuites !== [...suites.values()].filter(Boolean).length ||
        report.numPassedTestSuites !== [...suites.values()].filter((failed) => !failed).length ||
        report.numPendingTestSuites !== 0 ||
        report.numTotalTests !== passed + failed ||
        report.numPassedTests !== passed ||
        report.numFailedTests !== failed ||
        report.numPendingTests !== 0 ||
        report.numTodoTests !== 0 ||
        report.success !== (failed === 0) ||
        result.status !== (failed ? 1 : 0)
      ) {
        throw new Error(`G9: ${name} inconsistent report counters or process exit`);
      }
      return {
        outcome: {
          status: failed ? "fail" : "pass",
          ...(failed ? { category: missing.length ? "missing-symbol" : "assertion" } : {}),
          testsCompleted: passed + failed,
        },
        identities: identities.sort(),
      };
    };
    const evaluate = (path: string, name: "base" | "candidate") => {
      try {
        const result = run(path, name);
        evidence[`${name}Outcome`] = result.outcome;
        return result;
      } catch (error) {
        evidence[`${name}Outcome`] = {
          status: "blocked",
          category: "infrastructure",
          reason: error instanceof Error ? error.message : String(error),
        };
        throw error;
      }
    };
    const before = evaluate(base, "base");
    const after = evaluate(candidate, "candidate");
    if (before.outcome.status !== "fail") throw new Error("G9: no behavior regression on approved base");
    if (after.outcome.status !== "pass") throw new Error("G9: candidate tests failed");
    if (JSON.stringify(before.identities) !== JSON.stringify(after.identities))
      throw new Error("G9: base/candidate test identities differ");
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
