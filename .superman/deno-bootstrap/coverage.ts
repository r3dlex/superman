#!/usr/bin/env deno
// The operational Deno root's coverage collector.
//
// The mechanism is the Node original's proven one: a declared, complete
// inventory of the root's own source files; the root's own process suites as
// the measured surface; the locked AST converter for complete, source-bound
// denominators; four independent metric floors; and a receipt that names every
// input, tool and total. The inventory is the reviewed policy's own
// declaration, the receipt names the collector that wrote it, and the verdict
// is the truth about the measurement this run made. The exit status tells the
// same truth: a floor shortfall ends the run non-zero, after the receipt is
// written, because the gate binds the receipt and never the exit status.
//
// Node is used only as the bounded measured conversion and tool host: it runs
// the process suites and performs the type strip and the AST conversion. No
// Deno-side module imports or spawns the Node implementation for operational
// behavior.
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, matchesGlob, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "./exec.ts";
import { fixtureEnvironment } from "./fixture-env.ts";
import { nodeRuntimeVersion, runOwned } from "./replay.ts";

/**
 * The declared inventory of the operational Deno root.
 *
 * The root, its scope patterns and its member list are read from the
 * reviewed coverage policy: that policy is the one declaration of the Deno
 * inventory, and the Node gate resolves the same declaration, so the two
 * hosts cannot drift apart.
 *
 * The manifest is complete in both directions: a declared member that is
 * absent from the tree is refused, and a source file in the root that the
 * manifest does not declare is refused by name. The inventory can therefore
 * never grow or shrink past what it declares.
 */
type DenoScope = {
  root: string;
  patterns: string[];
  members: string[];
  collector: string;
};

/**
 * The bounded measured conversion host.
 *
 * The type strip and the AST conversion have no reviewed Deno-side
 * implementation, so they stay on the Node side as a measured conversion host:
 * one process, one fixed argument vector, the locked converter packages, and
 * no repository logic. It reads the raw V8 evidence and the declared
 * inventory, and writes the coverage map and its summary.
 */
const CONVERSION_HOST = `
import { createRequire, stripTypeScriptTypes } from "node:module";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.resolve("c8"));
const coverage = require("istanbul-lib-coverage");
const reporting = require("istanbul-lib-report");
const reporters = require("istanbul-reports");
const v8 = require("@bcoe/v8-coverage");
const v8Require = createRequire(import.meta.resolve("@vitest/coverage-v8"));
const { convert } = await import(pathToFileURL(v8Require.resolve("ast-v8-to-istanbul")).href);
const { parseAstAsync } = await import(pathToFileURL(v8Require.resolve("vite")).href);

const [raw, inventory, output] = JSON.parse(process.argv[1]);
const urls = new Set(inventory.map((file) => pathToFileURL(file).href));
const merged = v8.mergeProcessCovs(
  readdirSync(raw).map((file) => ({ result: [JSON.parse(readFileSync(join(raw, file), "utf8"))] })),
);
const map = coverage.createCoverageMap({});
for (const file of inventory) {
  const url = pathToFileURL(file).href;
  // The strip preserves offsets; no source map can replace bytes.
  const code = stripTypeScriptTypes(readFileSync(file, "utf8"));
  const measured = merged.result.find((script) => script.url === url) ?? { url, functions: [] };
  map.merge(await convert({ code, ast: parseAstAsync(code), coverage: measured }));
}
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "coverage-final.json"), JSON.stringify(map.toJSON()));
const context = reporting.createContext({ dir: output, coverageMap: map });
reporters.create("json-summary").execute(context);
`;

/** The four independent metrics the mechanism reports. */
const METRICS = ["lines", "statements", "branches", "functions"] as const;

async function main() {
  const args = Deno.args.slice(2);
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
  const root = realpathSync(Deno.cwd());
  const policy = JSON.parse(readFileSync(join(root, ".superman/ci/coverage.json"), "utf8"));
  const bootstrap = JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  // The Deno inventory's scope is the policy's declaration: the collector
  // resolves it the way the Node gate resolves it, so the two hosts measure
  // the same scope and refuse the same drift.
  const deno = policy.deno as Partial<DenoScope> | undefined;
  if (
    !deno ||
    typeof deno.root !== "string" ||
    !deno.root ||
    !Array.isArray(deno.patterns) ||
    !deno.patterns.length ||
    !Array.isArray(deno.members) ||
    typeof deno.collector !== "string" ||
    !deno.collector
  )
    throw new Error("Coverage policy requires a declared Deno inventory");
  const denoScope = deno as DenoScope;
  // The collector attributes its own measurement: the receipt names the
  // collector file and its digest, so the gate can bind a receipt to the
  // collector revision that produced it instead of to a receipt it cannot
  // attribute.
  const collectorPath = realpathSync(fileURLToPath(import.meta.url));
  const collectorFile = relative(root, collectorPath);
  if (collectorFile !== denoScope.collector)
    throw new Error(`Coverage Deno collector is not the declared collector: ${collectorFile}`);
  const collectorSha256 = createHash("sha256").update(readFileSync(collectorPath)).digest("hex");
  // The Node runtime that executes the tool host and the conversion is
  // identified explicitly, so the recorded identity is the one that runs them.
  const nodeVersion = nodeRuntimeVersion({ ...Deno.env.toObject() });
  if (![nodeVersion, nodeVersion.split(".")[0]].includes(bootstrap.tools.node))
    throw new Error("Coverage Node pin mismatch");
  const actual = JSON.parse(readFileSync(join(root, "node_modules", "c8", "package.json"), "utf8")).version;
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
  if (
    policy.version !== 1 ||
    policy.target !== 100 ||
    !METRICS.every(
      (name) => Number.isFinite(policy.minimum?.[name]) && policy.minimum[name] >= 90 && policy.minimum[name] <= 100,
    )
  )
    throw new Error("Coverage policy requires at least 90% in every metric and a 100% target");
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
  // The scope is resolved exactly as the Node gate resolves it: the
  // declared patterns, minus the reviewed exclusions.
  const inScope = (file: string, patterns: string[]) => patterns.some((glob: string) => matchesGlob(file, glob));
  const excluded = (file: string) =>
    file.endsWith(".test.ts") || file.endsWith(".d.ts") || (policy.exclude ?? []).includes(file);
  // The declared inventory is complete in both directions.
  for (const member of denoScope.members) {
    if (!files.includes(member)) throw new Error(`Coverage Deno inventory is missing a declared member: ${member}`);
    if (!lstatSync(join(root, member)).isFile()) throw new Error(`Coverage source must be a regular file: ${member}`);
    if (!inScope(member, denoScope.patterns))
      throw new Error(`Coverage Deno inventory member matches no declared scope: ${member}`);
  }
  // Every source file in the declared root that the manifest does not
  // declare is refused by name: the scope can never grow past what the
  // policy declares. The reviewed exclusions are honoured, so an excluded
  // file is not a source file here either.
  const denoFiles = files.filter(
    (file) => file.startsWith(`${denoScope.root}/`) && /\.[cm]?[jt]sx?$/u.test(file) && !excluded(file),
  );
  for (const file of denoFiles) {
    if (!denoScope.members.includes(file)) throw new Error(`Coverage scope does not model source file: ${file}`);
  }
  const sources = [...denoScope.members];
  // The process suites of this root are the measured surface.
  const tests = files.filter((file) => file.startsWith(`${denoScope.root}/tests/`) && file.endsWith(".test.ts"));
  if (!sources.length || !tests.length) throw new Error("Coverage requires source inventory and process tests");
  for (const file of sources) {
    // A source map reference replaces the inventoried bytes with a smaller
    // program. Only a real directive is refused: the comment form, not a bare
    // mention of the token inside a string or a regular expression.
    if (/(?:\/\/[#@]?|\/\*[#@]?)\s*sourceMappingURL\s*=/u.test(readFileSync(join(root, file), "utf8")))
      throw new Error(`Coverage source maps require reviewed input modeling: ${file}`);
    // The pinned converters also honor raw start/stop text and c8's `|8` spelling.
    if (
      /\/[/*]\*?\s*(?:(?:[c|v]8|istanbul)\s+ignore\b|node:coverage\s+(?:ignore|disable|enable)\b)|(?:[cv]8|istanbul|node:coverage)\s+ignore\s+(?:start|stop)\b/u.test(
        readFileSync(join(root, file), "utf8"),
      )
    )
      throw new Error(`Coverage suppression is forbidden: ${file}`);
  }
  const parent = join(root, ".superman-ci");
  if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error("Coverage output cannot be an alias");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, "coverage-deno-"));
  const raw = join(directory, "v8");
  mkdirSync(raw);
  const childEnv: Record<string, string | undefined> = { ...env, DENO_COVERAGE_DIR: raw };
  delete childEnv.NODE_OPTIONS;
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.NODE_V8_COVERAGE;
  // The Node runtime is the bounded tool host for the process suites.
  const result = await runOwned("node", ["--test", "--test-concurrency=1", "--test-reporter=tap", ...tests], {
    cwd: root,
    env: childEnv,
    encoding: "utf8",
    shell: false,
    timeout: 20 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  Deno.stdout.writeSync(new TextEncoder().encode(result.stdout));
  Deno.stderr.writeSync(new TextEncoder().encode(result.stderr));
  if (result.error || result.signal || result.status !== 0) throw new Error("Coverage process tests failed");
  if (fingerprint() !== before) throw new Error("Coverage inputs changed; caller changes were preserved");
  // The conversion host is the bounded measured conversion step.
  const converted = await runOwned(
    "node",
    [
      "--input-type=module",
      "--eval",
      CONVERSION_HOST,
      JSON.stringify([raw, sources.map((file) => join(root, file)), join(directory, "deno")]),
    ],
    {
      cwd: root,
      env: { ...childEnv, DENO_COVERAGE_DIR: undefined },
      encoding: "utf8",
      shell: false,
      timeout: 10 * 60_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  Deno.stdout.writeSync(new TextEncoder().encode(converted.stdout));
  Deno.stderr.writeSync(new TextEncoder().encode(converted.stderr));
  if (converted.error || converted.signal || converted.status !== 0) throw new Error("Coverage conversion host failed");
  if (fingerprint() !== before) throw new Error("Coverage inputs changed; caller changes were preserved");
  const scope = join(directory, "deno");
  const summary = JSON.parse(readFileSync(join(scope, "coverage-summary.json"), "utf8"));
  const total = summary.total;
  for (const name of METRICS) {
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
  const inventories: Record<string, { files: number; total: Record<string, unknown> }> = {
    deno: { files: Object.keys(JSON.parse(readFileSync(join(scope, "coverage-final.json"), "utf8"))).length, total },
  };
  // The Deno root is a parallel, non-admitting successor: the Node runtime
  // stays the required evaluator until the merge-bound transition. Its floor
  // is therefore carried as an obligation, and it binds at that transition.
  const carried: Array<{ inventory: string; metrics: Record<string, string>; binds: string }> = [];
  const shortfalls = METRICS.filter((metric) => {
    const counts = inventories.deno.total[metric] as { covered: number; total: number };
    return counts.covered * 100 < policy.minimum[metric] * counts.total;
  });
  if (shortfalls.length)
    carried.push({
      inventory: "deno",
      metrics: Object.fromEntries(
        shortfalls.map((metric) => {
          const counts = inventories.deno.total[metric] as { covered: number; total: number };
          return [metric, `${counts.covered}/${counts.total}`];
        }),
      ),
      binds: "the merge-bound cutover, when the Deno root becomes the required evaluator",
    });
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
        // The runtime names its architecture the way Deno does; the Node original
        // spells the same architectures the way Node does.
        platform: `${Deno.build.os}-${
          Deno.build.arch === "aarch64" ? "arm64" : Deno.build.arch === "x86_64" ? "x64" : Deno.build.arch
        }`,
        minimum: policy.minimum,
        target: policy.target,
        inputsHash: before,
        sources: [...sources].sort(),
        // The collector that produced this receipt, by file and digest: the
        // gate binds a receipt to the collector revision that wrote it, and
        // refuses a receipt it cannot attribute.
        collector: { file: collectorFile, sha256: collectorSha256 },
        tools: {
          node: `v${nodeVersion}`,
          c8: actual,
          vitest: "5.0.5",
          coverageV8: "5.0.5",
          conversion: "ast-v8-to-istanbul (locked, Node conversion host)",
        },
        inventories,
        // The Node receipt carries the attribution of a separately hosted
        // candidate measurement. This collector measures the Deno inventory in
        // its own run, so there is no separately hosted inventory to attribute.
        candidateMeasurement: null,
        // The same holds for the Deno measurement the Node receipt carries:
        // this receipt is that measurement, so there is nothing separately
        // hosted to attribute.
        denoMeasurement: null,
        total,
        carriedObligations: carried,
        // The verdict is the truth about this measurement, in the Node
        // original's shape: the floor is missed, the verdict is a failure.
        // The Deno surface's floor is a carried obligation — row 8's Node
        // gate carries it, and it binds at the merge-bound cutover — so the
        // gate does not fail on it. The receipt, the message and this run's
        // exit status all report it, and none of them claims a pass the
        // measurement did not achieve.
        verdict: shortfalls.length ? "fail" : "pass",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Coverage reports: ${directory}`);
  for (const obligation of carried)
    console.log(
      `Coverage carried obligation (${obligation.inventory}): ${Object.entries(obligation.metrics)
        .map(([metric, counts]) => `${metric} ${counts}`)
        .join(", ")}; binds at ${obligation.binds}`,
    );
  if (shortfalls.length) {
    console.log(
      `Coverage below 90%: ${shortfalls
        .map((metric) => {
          const counts = inventories.deno.total[metric] as { covered: number; total: number; pct?: string };
          return `${metric} ${counts.pct ?? "0"}% (deno)`;
        })
        .join(", ")}`,
    );
    // The exit status is the same truth the receipt and the message tell: a
    // floor shortfall ends the run non-zero. The receipt is already written
    // and complete, so the red run still leaves a receipt the gate can bind:
    // the gate binds the receipt and never this exit status.
    Deno.exitCode = 1;
  } else console.log("Coverage: pass (minimum 90% in every metric; target 100%)");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exitCode = 1;
}
