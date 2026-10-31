#!/usr/bin/env node
// Protected, uncached coverage command. A pass is not merge authority.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { join, matchesGlob } from "node:path";
import { pathToFileURL } from "node:url";
import { fixtureEnvironment } from "./fixture-env.ts";
import { runOwned } from "./replay.ts";

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length &&
    (args.length !== 2 || args[0] !== "--mode" || !["full", "incremental", "nightly"].includes(args[1]))
  )
    throw new Error("Usage: coverage.ts [--mode full|incremental|nightly]");
  const requestedMode = args[1] ?? "full";
  const fallbackReason =
    requestedMode === "incremental"
      ? "incremental coverage reuse is not activated; no trusted complete coverage ledger"
      : null;
  console.log(
    `Coverage execution: ${requestedMode} request; uncached full${fallbackReason ? ` (${fallbackReason})` : ""}`,
  );
  const root = realpathSync(process.cwd());
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/coverage.json"), "utf8"));
  const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (![process.versions.node, process.versions.node.split(".")[0]].includes(bootstrap.tools.node))
    throw new Error("Coverage Node pin mismatch");
  const actual = JSON.parse(readFileSync(new URL("./package.json", import.meta.resolve("c8")), "utf8")).version;
  if (actual !== "12.0.0" || bootstrap.tools.c8 !== actual || pkg.devDependencies.c8 !== actual)
    throw new Error("Coverage c8 pin mismatch");
  for (const [name, pin] of [
    ["vitest", "vitest"],
    ["@vitest/coverage-v8", "coverageV8"],
  ] as const) {
    const version = JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")).version;
    if (version !== "5.0.5" || pkg.devDependencies[name] !== version || bootstrap.tools[pin] !== version)
      throw new Error(`Coverage ${name} pin mismatch`);
  }
  const metrics = ["lines", "statements", "branches", "functions"] as const;
  if (
    policy.version !== 1 ||
    policy.target !== 100 ||
    !metrics.every(
      (name) => Number.isFinite(policy.minimum?.[name]) && policy.minimum[name] >= 90 && policy.minimum[name] <= 100,
    )
  )
    throw new Error("Coverage policy requires at least 90% in every metric and a 100% target");
  if (
    JSON.stringify([...policy.exclude].sort()) !==
    JSON.stringify(["**/*.d.ts", "**/*.test.ts", ".superman/ci/raw-fixture.ts"].sort())
  )
    throw new Error("Coverage exclusions require reviewed test-only modeling");
  const env = fixtureEnvironment();
  const revision = () =>
    execFileSync("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
      cwd: root,
      env,
      encoding: "utf8",
      shell: false,
    }).trim();
  const inventory = () =>
    execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      env,
      encoding: "utf8",
      shell: false,
    })
      .split("\0")
      .filter(Boolean);
  const fingerprint = () =>
    createHash("sha256")
      .update(revision())
      .update(
        JSON.stringify(
          inventory().map((file) => {
            const stat = lstatSync(file);
            const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(file)) : readFileSync(file);
            return [file, stat.mode, createHash("sha256").update(bytes).digest("hex")];
          }),
        ),
      )
      .digest("hex");
  const before = fingerprint();
  const files = inventory();
  // Node's globstar does not match hidden directories; suffix checks also apply there.
  const excluded = (file: string) =>
    file.endsWith(".test.ts") || file.endsWith(".d.ts") || policy.exclude.includes(file);
  const sources = files.filter(
    (file) => policy.node.some((glob: string) => matchesGlob(file, glob)) && !excluded(file),
  );
  const product = files.filter(
    (file) => policy.product.some((glob: string) => matchesGlob(file, glob)) && !excluded(file),
  );
  for (const file of files) {
    if (
      /\.[cm]?[jt]sx?$/u.test(file) &&
      !excluded(file) &&
      file !== "vitest.config.ts" &&
      !sources.includes(file) &&
      !product.includes(file)
    )
      throw new Error(`Coverage scope does not model repository runtime code: ${file}`);
  }
  const tests = files.filter((file) => policy.tests.some((glob: string) => matchesGlob(file, glob)));
  if (!sources.length || !tests.length) throw new Error("Coverage requires source inventory and process tests");
  for (const file of [...sources, ...product]) {
    if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
      throw new Error(`Coverage source must be a regular file: ${file}`);
    if (/\bsourceMappingURL\s*=/u.test(readFileSync(file, "utf8")))
      throw new Error(`Coverage source maps require reviewed input modeling: ${file}`);
    // The pinned converters also honor raw start/stop text and c8's `|8` spelling.
    if (
      /\/[/*]\*?\s*(?:(?:[c|v]8|istanbul)\s+ignore\b|node:coverage\s+(?:ignore|disable|enable)\b)|(?:[cv]8|istanbul|node:coverage)\s+ignore\s+(?:start|stop)\b/u.test(
        readFileSync(file, "utf8"),
      )
    )
      throw new Error(`Coverage suppression is forbidden: ${file}`);
  }
  const parent = join(root, ".superman-ci");
  if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error("Coverage output cannot be an alias");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, "coverage-"));
  const raw = join(directory, "v8");
  mkdirSync(raw);
  const safeOutput = () => {
    for (const path of [parent, directory, raw, join(directory, "node"), join(directory, "product")]) {
      const stat = lstatSync(path, { throwIfNoEntry: false });
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== path))
        throw new Error("Coverage output cannot be an alias");
    }
    for (const scope of [directory, join(directory, "node"), join(directory, "product")]) {
      for (const name of ["coverage-final.json", "coverage-summary.json", "lcov.info", "coverage-receipt.json"]) {
        const stat = lstatSync(join(scope, name), { throwIfNoEntry: false });
        if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1))
          throw new Error("Coverage output cannot be an alias");
      }
    }
  };
  const childEnv: NodeJS.ProcessEnv = { ...env, NODE_V8_COVERAGE: raw };
  delete childEnv.NODE_OPTIONS;
  delete childEnv.NODE_TEST_CONTEXT;
  const result = runOwned(process.execPath, ["--test", "--test-concurrency=1", "--test-reporter=tap", ...tests], {
    cwd: root,
    env: childEnv,
    encoding: "utf8",
    shell: false,
    timeout: 20 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error || result.signal || result.status !== 0) throw new Error("Coverage process tests failed");
  if (fingerprint() !== before) throw new Error("Coverage inputs changed; caller changes were preserved");
  safeOutput();
  // c8's synthetic empty report counts one function per unloaded file. Use the
  // approved tools' locked AST converter for complete, source-bound denominators.
  const require = createRequire(import.meta.resolve("c8"));
  const [coverage, reporting, reporters, v8] = [
    "istanbul-lib-coverage",
    "istanbul-lib-report",
    "istanbul-reports",
    "@bcoe/v8-coverage",
  ].map((name) => require(name));
  const v8Require = createRequire(import.meta.resolve("@vitest/coverage-v8"));
  const { convert } = await import(pathToFileURL(v8Require.resolve("ast-v8-to-istanbul")).href);
  const { parseAstAsync } = await import(pathToFileURL(v8Require.resolve("vite")).href);
  const urls = new Set(sources.map((file) => pathToFileURL(join(root, file)).href));
  const merged = v8.mergeProcessCovs(
    readdirSync(raw).map((file) => {
      const report = JSON.parse(readFileSync(join(raw, file), "utf8"));
      if (!Array.isArray(report.result)) throw new Error("Coverage has invalid native V8 evidence");
      return { result: report.result.filter((script: { url: string }) => urls.has(script.url)) };
    }),
  );
  const nodeMap = coverage.createCoverageMap({});
  for (const file of sources) {
    const url = pathToFileURL(join(root, file)).href;
    // Native Node strip mode preserves offsets; no source map can replace bytes.
    const code = stripTypeScriptTypes(readFileSync(join(root, file), "utf8"));
    const measured = merged.result.find((script: { url: string }) => script.url === url) ?? { url, functions: [] };
    nodeMap.merge(await convert({ code, ast: parseAstAsync(code), coverage: measured }));
  }
  safeOutput();
  mkdirSync(join(directory, "node"), { recursive: true });
  writeFileSync(join(directory, "node/coverage-final.json"), JSON.stringify(nodeMap.toJSON()));
  const reports = [join(directory, "node/coverage-final.json")];
  if (product.length) {
    const productTests = files.filter((file) => bootstrap.test.files.some((glob: string) => matchesGlob(file, glob)));
    if (!productTests.length) throw new Error("Coverage product source exists without tests");
    const measured = runOwned(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
      import { createVitest } from 'vitest/node';
      import { writeFileSync } from 'node:fs';
      const [tests, include, reportsDirectory] = JSON.parse(process.argv[1]);
      let coverage;
      const context = await createVitest({ config: 'vitest.config.ts', run: true, watch: false, cache: false,
        reporters: ['default', { onCoverage(result) { coverage = result.toJSON(); } }],
        passWithNoTests: false, coverage: { enabled: true, provider: 'v8', include, exclude: [],
          ignoreClassMethods: [], reporter: [], reportsDirectory } });
      try {
        await context.start(tests);
        if (!coverage) throw new Error('Missing Vitest coverage');
        writeFileSync(3, JSON.stringify(coverage));
      } finally { await context.close(); }
    `,
        JSON.stringify([productTests, product, join(directory, "product")]),
      ],
      {
        cwd: root,
        env: { ...childEnv, NODE_V8_COVERAGE: undefined },
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "pipe", "pipe", "pipe"],
        timeout: 10 * 60_000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    process.stdout.write(measured.stdout ?? "");
    process.stderr.write(measured.stderr ?? "");
    if (measured.error || measured.signal || measured.status !== 0) throw new Error("Coverage Vitest tests failed");
    if (fingerprint() !== before) throw new Error("Coverage inputs changed; caller changes were preserved");
    safeOutput();
    mkdirSync(join(directory, "product"), { recursive: true });
    // The tool sends data over an owned pipe; only this parent publishes reports.
    const productReport = measured.output[3];
    if (!productReport) throw new Error("Coverage Vitest report is missing");
    writeFileSync(join(directory, "product/coverage-final.json"), productReport);
    reports.push(join(directory, "product/coverage-final.json"));
  }
  if (fingerprint() !== before) throw new Error("Coverage inputs changed; caller changes were preserved");
  safeOutput();
  // Aggregate disjoint backend inventories through c8's locked reporting tools.
  const map = coverage.createCoverageMap({});
  const expected = [...sources, ...product].map((file) => join(root, file)).sort();
  const reported: string[] = [];
  for (const report of reports)
    for (const [file, data] of Object.entries(JSON.parse(readFileSync(report, "utf8")))) {
      if (!expected.includes(file) || reported.includes(file))
        throw new Error(`Coverage report has an unexpected source: ${file}`);
      reported.push(file);
      map.addFileCoverage(data);
    }
  if (JSON.stringify(reported.sort()) !== JSON.stringify(expected))
    throw new Error("Coverage report omitted inventoried source");
  const context = reporting.createContext({ dir: directory, coverageMap: map });
  for (const name of ["json", "json-summary", "lcovonly", "text"]) reporters.create(name).execute(context);
  const total = JSON.parse(readFileSync(join(directory, "coverage-summary.json"), "utf8")).total;
  for (const name of metrics) {
    const counts = total[name];
    if (
      !counts ||
      ![counts.covered, counts.total, counts.skipped].every(Number.isSafeInteger) ||
      counts.total < 0 ||
      counts.covered < 0 ||
      counts.covered > counts.total ||
      counts.skipped !== 0
    )
      throw new Error(`Coverage has invalid or skipped ${name} counts`);
  }
  const failures = metrics.filter((name) => total[name].covered * 100 < policy.minimum[name] * total[name].total);
  writeFileSync(
    join(directory, "coverage-receipt.json"),
    `${JSON.stringify(
      {
        schema: "superman.coverage/1",
        mergeAuthority: "none",
        requestedMode,
        execution: "full",
        cachedFiles: 0,
        fallbackReason,
        evaluatedSha: revision(),
        platform: `${process.platform}-${process.arch}`,
        minimum: policy.minimum,
        target: policy.target,
        inputsHash: before,
        sources: [...sources, ...product].sort(),
        tools: {
          node: process.version,
          c8: actual,
          vitest: "5.0.5",
          coverageV8: "5.0.5",
          conversion: "ast-v8-to-istanbul (locked)",
        },
        total,
        verdict: failures.length ? "fail" : "pass",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Coverage reports: ${directory}`);
  if (failures.length)
    throw new Error(`Coverage below 90%: ${failures.map((name) => `${name} ${total[name].pct}%`).join(", ")}`);
  console.log("Coverage: pass (minimum 90% in every metric; target 100%)");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
