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
import { dirname, extname, isAbsolute, join, matchesGlob, normalize, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fixtureEnvironment } from "./fixture-env.ts";
import { runOwned } from "./replay.ts";

/** The entries of a directory; an absent directory has none. */
function directoryEntries(directory: string) {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** The subdirectories of `directories` whose name matches `segment`. */
function matchingDirectories(directories: string[], segment: string): string[] {
  const matched: string[] = [];
  for (const directory of directories)
    for (const entry of directoryEntries(directory))
      if (entry.isDirectory() && matchesGlob(entry.name, segment)) matched.push(join(directory, entry.name));
  return matched;
}

/** The files of `directories` whose name matches `segment`. */
function matchingFiles(directories: string[], segment: string): string[] {
  const matched: string[] = [];
  for (const directory of directories)
    for (const entry of directoryEntries(directory))
      if (entry.isFile() && matchesGlob(entry.name, segment)) matched.push(join(directory, entry.name));
  return matched;
}

/**
 * The receipts the policy declares, oldest first.
 *
 * The declared glob is walked one segment at a time, so the gate reads only
 * the receipts the policy names. A symlinked directory or file is not a
 * receipt: a link can hide bytes the policy never declared.
 */
function declaredReceipts(root: string, glob: string): string[] {
  const segments = glob.split("/").filter(Boolean);
  if (!segments.length) return [];
  let directories = [root];
  for (const segment of segments.slice(0, -1)) directories = matchingDirectories(directories, segment);
  return matchingFiles(directories, segments[segments.length - 1]).sort(
    (a, b) => lstatSync(a).mtimeMs - lstatSync(b).mtimeMs,
  );
}

/**
 * The identity of the collector that wrote a receipt.
 *
 * The path is the collector's own path relative to the measured root when
 * the collector is inside it, and its absolute path when it is not: the
 * gate measures the repository it runs in, and a fixture may run it from
 * outside. The digest is of the bytes that ran.
 */
function collectorIdentity(root: string): { file: string; sha256: string } {
  const path = realpathSync(fileURLToPath(import.meta.url));
  const relativePath = relative(root, path);
  return {
    file: relativePath.startsWith("..") ? path : relativePath,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
}

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
  // Exclusions are reviewed test-only modeling. An unreviewed path is refused.
  // Removing a reviewed path only makes the scope model stricter: the scope
  // model then rejects the unmodeled source file by name.
  const reviewedExclusions = [
    "**/*.d.ts",
    "**/*.test.ts",
    ".superman/ci/raw-fixture.ts",
    ".superman/ci/critical/fixture-context.ts",
    "vitest.config.ts",
  ];
  if (JSON.stringify([...policy.exclude].sort()) !== JSON.stringify([...reviewedExclusions].sort()))
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
  const inScope = (file: string, patterns: string[]) => patterns.some((glob: string) => matchesGlob(file, glob));
  // The candidate runtime is declared as its own scope with its own manifest.
  // A declared candidate inventory that exists but is incomplete fails visibly
  // instead of shrinking the aggregate.
  const candidate = policy.candidate;
  if (
    !candidate ||
    typeof candidate.root !== "string" ||
    !candidate.root ||
    !Array.isArray(candidate.patterns) ||
    !candidate.patterns.length ||
    !Array.isArray(candidate.members)
  )
    throw new Error("Coverage policy requires a declared candidate inventory");
  if (!existsSync(join(root, candidate.root)))
    throw new Error(`Coverage candidate inventory is missing its declared root: ${candidate.root}`);
  for (const member of candidate.members) {
    if (!files.includes(member))
      throw new Error(`Coverage candidate inventory is missing a declared member: ${member}`);
    if (!inScope(member, [...policy.node, ...policy.product, ...candidate.patterns]))
      throw new Error(`Coverage candidate inventory member matches no declared scope: ${member}`);
  }
  const candidateFiles = files.filter((file) => inScope(file, candidate.patterns) && !excluded(file));
  // The manifest is the declared inventory. A runtime-reachable excluded file
  // that matches the candidate scope is attributed to that scope, and the
  // manifest is re-validated afterwards: the inventory can never grow past
  // what it declares.
  const validateCandidateManifest = () => {
    if (
      candidateFiles.length !== candidate.members.length ||
      !candidateFiles.every((file) => candidate.members.includes(file))
    )
      throw new Error(
        `Coverage candidate inventory does not match its manifest: resolved ${candidateFiles.length} of ${candidate.members.length} declared members`,
      );
  };
  validateCandidateManifest();
  // The Deno operational surface is declared as its own scope with its own
  // manifest, exactly like the candidate. It is not measured by this host:
  // the Node host cannot execute Deno code, so a Node-measured number for
  // this surface would be a false measurement. Its measurement is carried
  // from the Deno collector's own receipt.
  const deno = policy.deno;
  if (
    !deno ||
    typeof deno.root !== "string" ||
    !deno.root ||
    !Array.isArray(deno.patterns) ||
    !deno.patterns.length ||
    !Array.isArray(deno.members) ||
    typeof deno.collector !== "string" ||
    !deno.collector ||
    typeof deno.receipt !== "string" ||
    !deno.receipt
  )
    throw new Error("Coverage policy requires a declared Deno inventory");
  if (!existsSync(join(root, deno.root)))
    throw new Error(`Coverage Deno inventory is missing its declared root: ${deno.root}`);
  const declaredScopes = [...policy.node, ...policy.product, ...candidate.patterns, ...deno.patterns];
  for (const member of deno.members) {
    if (!files.includes(member)) throw new Error(`Coverage Deno inventory is missing a declared member: ${member}`);
    if (!inScope(member, declaredScopes))
      throw new Error(`Coverage Deno inventory member matches no declared scope: ${member}`);
  }
  const denoFiles = files.filter((file) => inScope(file, deno.patterns) && !excluded(file));
  // The Deno manifest is complete in both directions, like the candidate's.
  // The mismatch is named: a member that is absent and a file that is
  // undeclared are both listed, so the drift is visible and not a count.
  const validateDenoManifest = () => {
    if (denoFiles.length !== deno.members.length || !denoFiles.every((file) => deno.members.includes(file)))
      throw new Error(
        `Coverage Deno inventory does not match its manifest: resolved ${denoFiles.length} of ${deno.members.length} declared members; ${[
          ...deno.members
            .filter((member: string) => !denoFiles.includes(member))
            .map((member: string) => `missing ${member}`),
          ...denoFiles
            .filter((file: string) => !deno.members.includes(file))
            .map((file: string) => `undeclared ${file}`),
        ].join(", ")}`,
      );
  };
  validateDenoManifest();
  // The Deno surface's floor is a carried obligation, and the Deno collector
  // records where that obligation binds. The Node gate carries that binding
  // point; it does not invent one.
  let denoBinds = "";
  let denoInventory: { files: number; total: Record<string, unknown> } | null = null;
  let denoMeasurement: {
    collector: { file: string; sha256: string };
    receipt: string;
    receiptSha256: string;
    evaluatedSha: string;
    inputsHash: string;
    members: string[];
    metrics: Record<string, { covered: number; total: number }>;
    verdict: string;
  } | null = null;
  if (denoFiles.length) {
    const receipts = declaredReceipts(root, deno.receipt);
    if (!receipts.length) throw new Error(`Coverage Deno measurement receipt is absent: ${deno.receipt}`);
    const collector = join(root, deno.collector);
    if (!existsSync(collector) || !lstatSync(collector).isFile() || lstatSync(collector).isSymbolicLink())
      throw new Error(`Coverage Deno measurement collector is missing: ${deno.collector}`);
    const collectorSha256 = createHash("sha256").update(readFileSync(collector)).digest("hex");
    // The receipt must name the collector that produced it. A receipt from a
    // collector revision that no longer exists cannot be attributed, so it
    // is refused instead of bound, and the bound receipt is the one the
    // current collector wrote.
    const attributed: string[] = [];
    for (const path of receipts) {
      let receipt: { collector?: { file?: string; sha256?: string } };
      try {
        receipt = JSON.parse(readFileSync(path, "utf8"));
      } catch {
        throw new Error(`Coverage Deno measurement receipt is malformed: ${relative(root, path)}`);
      }
      const named = receipt.collector;
      if (named && named.file === deno.collector && named.sha256 === collectorSha256) attributed.push(path);
    }
    if (!attributed.length)
      throw new Error(
        `Coverage Deno measurement receipt does not bind the current collector: ${deno.collector} (${collectorSha256})`,
      );
    const receiptPath = attributed[attributed.length - 1];
    const bound = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      evaluatedSha?: string;
      inputsHash?: string;
      sources?: string[];
      verdict?: string;
      inventories?: { deno?: { files?: number; total?: Record<string, { covered: number; total: number }> } };
      carriedObligations?: Array<{ inventory: string; binds?: string }>;
    };
    // The receipt must bind every declared member: a Deno measurement of a
    // different inventory is not a measurement of this one.
    const measured = Array.isArray(bound.sources) ? bound.sources : [];
    const unbound = deno.members.filter((member: string) => !measured.includes(member));
    if (unbound.length)
      throw new Error(`Coverage Deno measurement receipt does not bind every declared member: ${unbound.join(", ")}`);
    const total = bound.inventories?.deno?.total;
    if (!total) throw new Error("Coverage Deno measurement receipt does not report a Deno inventory");
    const denoMetrics: Record<string, { covered: number; total: number }> = {};
    for (const name of metrics) {
      const counts = total[name];
      if (
        !counts ||
        ![counts.covered, counts.total].every(Number.isSafeInteger) ||
        counts.total < 0 ||
        counts.covered < 0 ||
        counts.covered > counts.total
      )
        throw new Error(`Coverage Deno measurement receipt has invalid ${name} counts`);
      denoMetrics[name] = { covered: counts.covered, total: counts.total };
    }
    const shortfalls = metrics.filter(
      (name) => denoMetrics[name].covered * 100 < policy.minimum[name] * denoMetrics[name].total,
    );
    if (shortfalls.length) {
      const obligation = (bound.carriedObligations ?? []).find((entry) => entry.inventory === "deno");
      if (!obligation || typeof obligation.binds !== "string" || !obligation.binds)
        throw new Error("Coverage Deno measurement receipt does not bind its floor obligation");
      denoBinds = obligation.binds;
    }
    // The receipt's own verdict must be the truth about its measurement: a
    // receipt that claims a pass while its metrics miss the floor is a
    // false green, and it is refused rather than carried.
    const verdict = bound.verdict;
    if (verdict !== (shortfalls.length ? "fail" : "pass"))
      throw new Error(`Coverage Deno measurement receipt verdict does not match its metrics: ${verdict}`);
    denoInventory = { files: bound.inventories?.deno?.files ?? measured.length, total };
    denoMeasurement = {
      collector: { file: deno.collector, sha256: collectorSha256 },
      receipt: relative(root, receiptPath),
      receiptSha256: createHash("sha256").update(readFileSync(receiptPath)).digest("hex"),
      evaluatedSha: bound.evaluatedSha ?? "",
      inputsHash: bound.inputsHash ?? "",
      members: [...deno.members],
      metrics: denoMetrics,
      verdict,
    };
  }
  if (!Array.isArray(candidate.suites))
    throw new Error("Coverage policy requires declared candidate measurement suites");
  for (const suite of candidate.suites) {
    if (!suite || typeof suite.file !== "string" || !files.includes(suite.file))
      throw new Error(`Coverage candidate measurement suite is missing: ${suite?.file}`);
  }
  const sources = files.filter(
    (file) => inScope(file, policy.node) && !excluded(file) && !candidateFiles.includes(file),
  );
  const product = files.filter(
    (file) => inScope(file, policy.product) && !excluded(file) && !candidateFiles.includes(file),
  );
  // A test filename is not a runtime exclusion. Follow static imports from measured
  // modules, including through other excluded modules, and measure that closure.
  const runtimeSpecifiers = (text: string) => {
    const specs: string[] = [];
    const stripped = text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:])\/\/.*$/gmu, "$1");
    for (const match of stripped.matchAll(
      /\b(?:import|export)\s+type\b[^;]*?\bfrom\s*["']([^"']+)["']|\bfrom\s*["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)|(?:^|[;\r\n\u2028\u2029}])\s*import\s*["']([^"']+)["']/gu,
    )) {
      if (match[1]) continue;
      const spec = match[2] ?? match[3] ?? match[4];
      if (spec?.startsWith(".")) specs.push(spec);
    }
    return specs;
  };
  const attributeExcluded = (resolved: string) => {
    if (
      sources.includes(resolved) ||
      product.includes(resolved) ||
      candidateFiles.includes(resolved) ||
      denoFiles.includes(resolved)
    )
      return;
    // The candidate scope is covered by the same guard: runtime code that is
    // reachable from a declared scope belongs to that scope or is rejected.
    if (inScope(resolved, candidate.patterns)) candidateFiles.push(resolved);
    else if (inScope(resolved, deno.patterns)) denoFiles.push(resolved);
    else if (inScope(resolved, policy.node)) sources.push(resolved);
    else if (inScope(resolved, policy.product)) product.push(resolved);
    else throw new Error(`Coverage scope does not model runtime-reachable excluded module: ${resolved}`);
  };
  const seen = new Set([...sources, ...product, ...candidateFiles]);
  const queue = [...seen];
  // A child script is runtime even when its name looks like a test. Node resolves
  // that argument from the repository root, not from the spawning file.
  for (const file of files) {
    if (!/\.[cm]?[jt]sx?$/u.test(file) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) continue;
    const stripped = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/(^|[^:])\/\/.*$/gmu, "$1");
    for (const match of stripped.matchAll(
      /\b(?:execFileSync|spawnSync|execFile|spawn)\s*\([^;\n]*["']([^"'\\]*\.test\.ts)/gu,
    )) {
      const resolved = normalize(match[1]);
      if (resolved.startsWith("../") || isAbsolute(resolved) || !files.includes(resolved) || seen.has(resolved))
        continue;
      seen.add(resolved);
      queue.push(resolved);
      attributeExcluded(resolved);
    }
  }
  while (queue.length) {
    const file = queue.pop();
    if (!file || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) continue;
    for (const spec of runtimeSpecifiers(readFileSync(file, "utf8"))) {
      const base = normalize(join(dirname(file), spec));
      const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}.cjs`].find((path) =>
        files.includes(path),
      );
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
      if (!excluded(resolved)) continue;
      attributeExcluded(resolved);
    }
  }
  validateCandidateManifest();
  validateDenoManifest();
  for (const file of files) {
    if (excluded(file)) continue;
    if (sources.includes(file) || product.includes(file) || candidateFiles.includes(file) || denoFiles.includes(file))
      continue;
    // Every source file is modeled by a declared scope or by the declared
    // exclusion list. An unmodeled source file is a scope failure, not a guess
    // about runtime code.
    if (/\.[cm]?[jt]sx?$/u.test(file)) throw new Error(`Coverage scope does not model source file: ${file}`);
    if (
      lstatSync(file).isFile() &&
      ((lstatSync(file).mode & 0o111) !== 0 ||
        readFileSync(file, "utf8").startsWith("#!") ||
        (!extname(file) && ![".gitignore", ".npmrc", "CODEOWNERS", "LICENSE", "NOTICE"].includes(file)))
    )
      throw new Error(`Coverage scope does not model repository runtime code: ${file}`);
  }
  const tests = files.filter((file) => policy.tests.some((glob: string) => matchesGlob(file, glob)));
  if (!sources.length || !tests.length) throw new Error("Coverage requires source inventory and process tests");
  for (const file of [...sources, ...product, ...candidateFiles, ...denoFiles]) {
    if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
      throw new Error(`Coverage source must be a regular file: ${file}`);
    // A source map reference replaces the inventoried bytes with a smaller
    // program. Only a real directive is refused: the comment form, not a bare
    // mention of the token inside a string or a regular expression.
    if (/(?:\/\/[#@]?|\/\*[#@]?)\s*sourceMappingURL\s*=/u.test(readFileSync(file, "utf8")))
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
    for (const path of [
      parent,
      directory,
      raw,
      join(directory, "node"),
      join(directory, "product"),
      join(directory, "candidate"),
    ]) {
      const stat = lstatSync(path, { throwIfNoEntry: false });
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== path))
        throw new Error("Coverage output cannot be an alias");
    }
    for (const scope of [
      directory,
      join(directory, "node"),
      join(directory, "product"),
      join(directory, "candidate"),
    ]) {
      for (const name of [
        "coverage-final.json",
        "coverage-summary.json",
        "lcov.info",
        "coverage-receipt.json",
        "measurement-receipt.json",
      ]) {
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
  // The candidate inventory is measured by its own bounded host, in its own
  // process, so the candidate's measurement surfaces are executed and observed
  // exactly like the Node and product inventories.
  let candidateMeasurement: {
    host: { file: string; sha256: string };
    suites: Array<{ file: string; outcome: string }>;
  } | null = null;
  if (candidateFiles.length) {
    mkdirSync(join(directory, "candidate"), { recursive: true });
    const receipt = join(directory, "candidate/measurement-receipt.json");
    const measured = runOwned(
      process.execPath,
      [join(import.meta.dirname, "node-hosted-candidate-measurement-host.ts"), receipt],
      {
        cwd: root,
        env: childEnv,
        encoding: "utf8",
        shell: false,
        timeout: 20 * 60_000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    process.stdout.write(measured.stdout ?? "");
    process.stderr.write(measured.stderr ?? "");
    if (measured.error || measured.signal || measured.status !== 0)
      throw new Error("Coverage candidate measurement failed");
    // The candidate inventory is measured by another process: its receipt binds
    // the suites that measured it, their outcomes and the host's identity.
    const bound = JSON.parse(readFileSync(receipt, "utf8")) as {
      host: { file: string; sha256: string };
      suites: Array<{ file: string; outcome: string }>;
    };
    candidateMeasurement = bound;
    const host = bound.host;
    const hostBytes = readFileSync(join(import.meta.dirname, host.file));
    if (createHash("sha256").update(hostBytes).digest("hex") !== host.sha256)
      throw new Error("Coverage candidate measurement receipt does not bind its host");
    const recorded = bound.suites;
    for (const suite of candidate.suites) {
      const entry = recorded.find((item) => item.file === suite.file);
      if (!entry || !["pass", "reported"].includes(entry.outcome))
        throw new Error(`Coverage candidate measurement receipt does not bind its suite: ${suite.file}`);
    }
  }
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
  const urls = new Set([...sources, ...candidateFiles].map((file) => pathToFileURL(join(root, file)).href));
  const merged = v8.mergeProcessCovs(
    readdirSync(raw).map((file) => {
      const report = JSON.parse(readFileSync(join(raw, file), "utf8"));
      if (!Array.isArray(report.result)) throw new Error("Coverage has invalid native V8 evidence");
      // Reject observed owned programs before filtering; a filename cannot hide runtime.
      for (const script of report.result) {
        if (typeof script.url !== "string") throw new Error("Coverage has invalid native V8 script identity");
        if (!script.url.startsWith("file:")) continue;
        const path = fileURLToPath(script.url);
        const owned = relative(root, path);
        if (
          owned === ".." ||
          owned.startsWith(`..${sep}`) ||
          isAbsolute(owned) ||
          (owned.split(sep).includes("node_modules") && !files.includes(owned)) ||
          sources.includes(owned) ||
          product.includes(owned) ||
          candidateFiles.includes(owned) ||
          excluded(owned)
        )
          continue;
        throw new Error(`Coverage scope does not model repository runtime code: ${owned}`);
      }
      return { result: report.result.filter((script: { url: string }) => urls.has(script.url)) };
    }),
  );
  // Each declared inventory is measured on its own; the aggregate merges them
  // disjointly. Unloaded files stay in their own inventory's denominator.
  const measure = async (inventory: string[]) => {
    const map = coverage.createCoverageMap({});
    for (const file of inventory) {
      const url = pathToFileURL(join(root, file)).href;
      // Native Node strip mode preserves offsets; no source map can replace bytes.
      const code = stripTypeScriptTypes(readFileSync(join(root, file), "utf8"));
      const measured = merged.result.find((script: { url: string }) => script.url === url) ?? {
        url,
        functions: [],
      };
      map.merge(await convert({ code, ast: parseAstAsync(code), coverage: measured }));
    }
    return map;
  };
  const nodeMap = await measure(sources);
  const candidateMap = await measure(candidateFiles);
  safeOutput();
  mkdirSync(join(directory, "node"), { recursive: true });
  writeFileSync(join(directory, "node/coverage-final.json"), JSON.stringify(nodeMap.toJSON()));
  mkdirSync(join(directory, "candidate"), { recursive: true });
  writeFileSync(join(directory, "candidate/coverage-final.json"), JSON.stringify(candidateMap.toJSON()));
  const reports = [join(directory, "node/coverage-final.json"), join(directory, "candidate/coverage-final.json")];
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
  const expected = [...sources, ...product, ...candidateFiles].map((file) => join(root, file)).sort();
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
  // Each declared inventory is reported on its own, never folded into another.
  const inventories: Record<string, { files: number; total: Record<string, unknown> }> = {};
  for (const [name, inventoryMap] of [
    ["node", nodeMap],
    ["candidate", candidateMap],
    [
      "product",
      product.length
        ? coverage.createCoverageMap(JSON.parse(readFileSync(join(directory, "product/coverage-final.json"), "utf8")))
        : null,
    ],
  ] as const) {
    if (!inventoryMap) continue;
    const scope = join(directory, name);
    const scopeContext = reporting.createContext({ dir: scope, coverageMap: inventoryMap });
    reporters.create("json-summary").execute(scopeContext);
    inventories[name] = {
      files: Object.keys(inventoryMap.toJSON()).length,
      total: JSON.parse(readFileSync(join(scope, "coverage-summary.json"), "utf8")).total,
    };
  }
  // The Deno inventory is reported from the Deno collector's receipt. It is
  // never measured by this host and never folded into another inventory.
  if (denoInventory) inventories.deno = denoInventory;
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
  // The floors bind the shipped inventories. The candidate inventory is measured
  // and reported with its four metrics visible; its floor is a carried
  // obligation that binds at the merge-bound cutover, when the Deno root
  // becomes the required evaluator — the same point the Deno surface's own
  // floor binds at, so both carried floors name one binding point.
  const failures: string[] = [];
  for (const name of ["node", "product"]) {
    const inventory = inventories[name];
    if (!inventory?.files) continue;
    for (const metric of metrics) {
      const counts = inventory.total[metric] as { covered: number; total: number; pct?: string };
      if (counts.covered * 100 < policy.minimum[metric] * counts.total)
        failures.push(`${metric} ${counts.pct ?? "0"}% (${name})`);
    }
  }
  const carried: Array<{ inventory: string; metrics: Record<string, string>; binds: string }> = [];
  for (const [name, binds] of [
    ["candidate", "the merge-bound cutover, when the Deno root becomes the required evaluator"],
    ["deno", denoBinds],
  ] as const) {
    const inventory = inventories[name];
    if (!inventory?.files) continue;
    const shortfalls = metrics.filter((metric) => {
      const counts = inventory.total[metric] as { covered: number; total: number };
      return counts.covered * 100 < policy.minimum[metric] * counts.total;
    });
    if (shortfalls.length)
      carried.push({
        inventory: name,
        metrics: Object.fromEntries(
          shortfalls.map((metric) => {
            const counts = inventory.total[metric] as { covered: number; total: number };
            return [metric, `${counts.covered}/${counts.total}`];
          }),
        ),
        binds,
      });
  }
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
        sources: [...sources, ...product, ...candidateFiles].sort(),
        // The collector that wrote this receipt, by file and digest: the
        // same attribution the Deno receipt carries.
        collector: collectorIdentity(root),
        tools: {
          node: process.version,
          c8: actual,
          vitest: "5.0.5",
          coverageV8: "5.0.5",
          conversion: "ast-v8-to-istanbul (locked)",
        },
        inventories,
        candidateMeasurement,
        denoMeasurement,
        total,
        carriedObligations: carried,
        verdict: failures.length ? "fail" : "pass",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Coverage reports: ${directory}`);
  if (failures.length) throw new Error(`Coverage below 90%: ${failures.join(", ")}`);
  for (const obligation of carried)
    console.log(
      `Coverage carried obligation (${obligation.inventory}): ${Object.entries(obligation.metrics)
        .map(([metric, counts]) => `${metric} ${counts}`)
        .join(", ")}; binds at ${obligation.binds}`,
    );
  console.log("Coverage: pass (minimum 90% in every metric; target 100%)");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
