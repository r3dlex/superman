// Measurement host for the approved step 7 retained-jscpd conformance slice.
// It drives the pinned jscpd 5.4.2 process and observes its JSON reports plus the
// public CLI diagnostics (`--debug` profile, console status) where the JSON report
// does not expose the effective profile.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { type TestContext, test } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const CONFIG_PATH = join(REPO_ROOT, ".jscpd.json");
const BOOTSTRAP_PATH = join(REPO_ROOT, ".superman/ci/bootstrap.json");
const QUALITY_PATH = join(REPO_ROOT, ".superman/ci/quality.ts");
const PACKAGE_PATH = join(REPO_ROOT, "package.json");
const LOCK_PATH = join(REPO_ROOT, "pnpm-lock.yaml");
const JSCPD_WRAPPER = join(REPO_ROOT, "node_modules/.pnpm/jscpd@5.4.2/node_modules/jscpd/run-jscpd.js");
const JSCPD_BINARY = join(
  REPO_ROOT,
  "node_modules/.pnpm/jscpd-darwin-arm64@5.4.2/node_modules/jscpd-darwin-arm64/bin/jscpd",
);

const NODE_SHA256 = "cbee2298aee5cc476bf8d5441e7348b627254a39d869743a5b04489028c729d4";
const CONFIG_SHA256 = "ff400eab800e0776d60977cca6956b7057ad7a422caa5fc6d186dea6f7bcc96a";
const BOOTSTRAP_SHA256 = "3a8e81c34e15c669611cdc536e3eb57df95b7aba8b3b3ec70537526d44a93e3a";
const QUALITY_SHA256 = "8481e88c67089fe5709379cf1ce58fc242a06a2e9df8a41911e3d397ef0a7ffa";
const PACKAGE_SHA256 = "f3a11bb4cc47c4edfc62abe9ea380fb826f29d537584915060266ee7ac6bc1b9";
const LOCK_SHA256 = "cdeabea99c80d8d4bbb3bf09d7f9677defbcd94ec22a0064d9c0b1159091772b";
const WRAPPER_SHA256 = "e81342e628de62d9b15fe94a918d25cc98e2e90a9b85c3f8ec636578c278467a";
const BINARY_SHA256 = "bfbed2a5f2d9846bb578c61c7a6edae5e35010aa7064194eea5f2315d69d05bc";

const VALID_SOURCE = `export function repetitive(value: number) {\n${Array.from(
  { length: 15 },
  (_, index) => `  value = value + ${index + 1};`,
).join("\n")}\n  return value;\n}\n`;
const UNIQUE_SOURCE = VALID_SOURCE.replaceAll("repetitive", "distinctValue").replaceAll("value", "amount");
const TINY_SOURCE = "export const version = '0.0.0';\n";
const UNCHANGED_EXTRA = "// unchanged marker\nexport const unchangedMarker = 'unchanged';\n";

type Stats = {
  clones: number;
  duplicatedLines: number;
  duplicatedTokens: number;
  lines: number;
  newClones: number;
  newDuplicatedLines: number;
  percentage: number;
  percentageTokens: number;
  sources: number;
  tokens: number;
};
type Location = { end: number; name: string; start: number };
type Duplicate = {
  firstFile: Location;
  format: string;
  fragment: string;
  isNew: boolean;
  kind: string;
  lines: number;
  secondFile: Location;
  tokens: number;
};
type Report = {
  duplicates: Duplicate[];
  statistics: { detectionDate: string; formats: Record<string, Stats>; total: Stats };
};
type EffectiveProfile = {
  absolute: boolean;
  changed: boolean;
  changed_only: boolean;
  exit_code: number | null;
  fail_on_empty: boolean;
  formats: string[];
  ignore: string[];
  ignore_patterns: string[];
  max_lines: number | null;
  max_size: number;
  min_lines: number;
  min_tokens: number;
  mode: string;
  no_gitignore: boolean;
  output_dir: string;
  paths: string[];
  reporters: string[];
  skip_local: boolean;
  threshold: number | null;
};
type Fixture = { env: NodeJS.ProcessEnv; home: string; root: string; scanRoot: string; tmp: string };
type Run = { output: string; status: number | null; stderr: string; stdout: string };

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function makeFixture(t: TestContext): Fixture {
  const root = mkdtempSync(join(tmpdir(), "superman-jscpd-step7-"));
  const home = join(root, "home");
  const tmp = join(root, "tmp");
  const scanRoot = join(root, "src");
  mkdirSync(home);
  mkdirSync(tmp);
  mkdirSync(scanRoot);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return {
    root,
    home,
    tmp,
    scanRoot,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: home,
      TMPDIR: tmp,
      TMP: tmp,
      TEMP: tmp,
      CI: "1",
      NO_COLOR: "1",
      JSCPD_NO_TIPS: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_OPTIONAL_LOCKS: "0",
    },
  };
}

function writeFixture(fixture: Fixture, path: string, content: string): void {
  const target = join(fixture.root, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

function runJscpdCommand(fixture: Fixture, argv: string[]): Run {
  const result = spawnSync(process.execPath, [JSCPD_WRAPPER, ...argv], {
    cwd: fixture.root,
    env: fixture.env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `jscpd terminated by ${result.signal}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", output: "" };
}

function runJscpd(fixture: Fixture, name: string, args: string[]): Run {
  const output = join(fixture.root, `report-${name}`);
  const run = runJscpdCommand(fixture, ["--config", CONFIG_PATH, "--output", output, "--no-colors", ...args]);
  return { ...run, output };
}

function readReport(output: string): Report {
  const path = join(output, "jscpd-report.json");
  assert.ok(existsSync(path), `missing jscpd report: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as Report;
}

function identifierTokens(prefix: string, total: number, lines: number): string {
  const perLine = Math.floor(total / lines);
  const remainder = total % lines;
  let index = 0;
  return `${Array.from({ length: lines }, (_, line) => {
    const count = perLine + (line < remainder ? 1 : 0);
    return Array.from({ length: count }, () => `${prefix}${index++}`).join(" ");
  }).join("\n")}\n`;
}

function scanPair(fixture: Fixture, name: string, left: string, right: string): Report {
  writeFixture(fixture, "src/a.ts", left);
  writeFixture(fixture, "src/b.ts", right);
  const run = runJscpd(fixture, name, [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  return readReport(run.output);
}

function git(fixture: Fixture, ...args: string[]): string {
  const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd: fixture.root,
    env: fixture.env,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ?? "";
}

function measureProfile(fixture: Fixture): EffectiveProfile {
  const result = runJscpdCommand(fixture, ["--config", CONFIG_PATH, "--debug", fixture.scanRoot]);
  assert.equal(result.status, 0, result.stderr);
  const start = result.stdout.indexOf("{");
  const end = result.stdout.lastIndexOf("}");
  assert.ok(start >= 0 && end > start, `missing merged config JSON: ${result.stdout}${result.stderr}`);
  return JSON.parse(result.stdout.slice(start, end + 1)) as EffectiveProfile;
}

test("the declared effective profile binds the pinned tool, minTokens 50, default minLines 5 and typescript-only filtering", (t) => {
  const fixture = makeFixture(t);
  assert.equal(process.release.name, "node");
  assert.equal(Number(process.versions.node.split(".")[0]) >= 26, true);
  assert.equal(sha256(process.execPath), NODE_SHA256);
  assert.equal(sha256(CONFIG_PATH), CONFIG_SHA256);
  assert.equal(sha256(BOOTSTRAP_PATH), BOOTSTRAP_SHA256);
  assert.equal(sha256(QUALITY_PATH), QUALITY_SHA256);
  assert.equal(sha256(PACKAGE_PATH), PACKAGE_SHA256);
  assert.equal(sha256(LOCK_PATH), LOCK_SHA256);
  assert.equal(sha256(JSCPD_WRAPPER), WRAPPER_SHA256);
  assert.equal(sha256(JSCPD_BINARY), BINARY_SHA256);
  const version = runJscpd(fixture, "version", ["--version"]);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), "jscpd 5.4.2");
  const profile = measureProfile(fixture);
  assert.deepEqual(profile.paths, [fixture.scanRoot]);
  assert.equal(profile.min_tokens, 50);
  assert.equal(profile.min_lines, 5);
  assert.equal(profile.max_lines, null);
  assert.deepEqual(profile.formats, ["typescript"]);
  assert.equal(profile.mode, "mild");
  assert.deepEqual(profile.reporters, ["console", "json"]);
  assert.equal(profile.output_dir, ".superman-ci/duplication");
  assert.equal(profile.max_size, 1_048_576);
  assert.equal(profile.no_gitignore, false);
  assert.equal(profile.threshold, null);
  assert.equal(profile.exit_code, null);
  assert.equal(profile.fail_on_empty, false);
  assert.equal(profile.absolute, false);
  assert.deepEqual(profile.ignore, []);
  assert.deepEqual(profile.ignore_patterns, []);
  assert.equal(profile.skip_local, false);
  assert.equal(profile.changed, false);
  assert.equal(profile.changed_only, false);
});

test("a complete declared .ts inventory reports every scannable source and the exact raw clone", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", VALID_SOURCE);
  writeFixture(fixture, "src/b.ts", VALID_SOURCE);
  writeFixture(fixture, "src/unique.ts", UNIQUE_SOURCE);
  writeFixture(fixture, "src/empty.ts", "");
  writeFixture(fixture, "src/script.js", VALID_SOURCE);
  writeFixture(fixture, "src/data.json", JSON.stringify({ source: VALID_SOURCE }));
  writeFixture(fixture, "src/notes.md", `# notes\n\n${VALID_SOURCE}`);
  const declaredTs = ["src/a.ts", "src/b.ts", "src/unique.ts", "src/empty.ts"];
  const omittedTs = ["src/empty.ts"];
  const run = runJscpd(fixture, "complete", [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  const report = readReport(run.output);
  const total = report.statistics.total;
  // The empty .ts is in the declared inventory but is omitted from the scanned
  // corpus. Record the exact gap rather than declaring the partial scan complete.
  assert.equal(total.sources, declaredTs.length - omittedTs.length);
  assert.equal(total.sources, 3);
  assert.equal(total.clones, 1);
  assert.equal(total.duplicatedLines, 18);
  assert.equal(total.duplicatedTokens, 103);
  assert.equal(total.lines, 54);
  assert.equal(total.tokens, 309);
  assert.ok(Math.abs(total.percentage - (100 * total.duplicatedLines) / total.lines) <= 0.0051);
  assert.ok(Math.abs(total.percentageTokens - (100 * total.duplicatedTokens) / total.tokens) <= 0.0051);
  assert.equal(total.newClones, 0);
  assert.equal(total.newDuplicatedLines, 0);
  assert.deepEqual(report.statistics.formats.typescript, total);
  assert.equal(report.duplicates.length, total.clones);
  const clone = report.duplicates[0];
  assert.equal(clone.format, "typescript");
  assert.equal(clone.kind, "exact");
  assert.equal(clone.isNew, false);
  assert.equal(clone.lines, 18);
  assert.equal(clone.tokens, 103);
  assert.equal(clone.fragment, VALID_SOURCE.trimEnd());
  assert.deepEqual([clone.firstFile.name, clone.secondFile.name].sort(), ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(
    [clone.firstFile.start, clone.firstFile.end, clone.secondFile.start, clone.secondFile.end],
    [1, 18, 1, 18],
  );
  assert.ok(Number.isFinite(Date.parse(report.statistics.detectionDate)));
  assert.match(run.stdout, /Found 1 clones\./u);
});

test("the minimum-clone boundary is 50 tokens inclusive and more than 5 lines", (t) => {
  const at50Tokens6Lines = identifierTokens("a", 50, 6);
  let fixture = makeFixture(t);
  let report = scanPair(fixture, "at-50-tokens-6-lines", at50Tokens6Lines, at50Tokens6Lines);
  let total = report.statistics.total;
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 1);
  assert.equal(total.duplicatedLines, 6);
  assert.equal(total.duplicatedTokens, 50);
  assert.equal(total.lines, 12);
  assert.equal(total.tokens, 100);
  assert.equal(total.percentage, 50);
  assert.equal(report.duplicates[0].lines, 6);
  assert.equal(report.duplicates[0].tokens, 50);

  const at50Tokens5Lines = identifierTokens("b", 50, 5);
  fixture = makeFixture(t);
  report = scanPair(fixture, "at-50-tokens-5-lines", at50Tokens5Lines, at50Tokens5Lines);
  total = report.statistics.total;
  // The declared minLines 5 is a file-inclusion floor; clone detection requires
  // more than five lines. The five-line files still contribute to the denominator.
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 0);
  assert.equal(total.lines, 10);
  assert.equal(total.tokens, 100);
  assert.equal(total.percentage, 0);

  const belowTokens = identifierTokens("c", 49, 6);
  fixture = makeFixture(t);
  report = scanPair(fixture, "below-tokens", belowTokens, belowTokens);
  total = report.statistics.total;
  assert.equal(total.sources, 0);
  assert.equal(total.clones, 0);
  assert.equal(total.lines, 0);
  assert.equal(total.tokens, 0);

  const belowLines = identifierTokens("d", 52, 4);
  fixture = makeFixture(t);
  report = scanPair(fixture, "below-lines", belowLines, belowLines);
  total = report.statistics.total;
  assert.equal(total.sources, 0);
  assert.equal(total.clones, 0);
  assert.equal(total.lines, 0);
  assert.equal(total.tokens, 0);

  const manyTokensFiveLines = identifierTokens("e", 100, 5);
  fixture = makeFixture(t);
  report = scanPair(fixture, "many-tokens-five-lines", manyTokensFiveLines, manyTokensFiveLines);
  total = report.statistics.total;
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 0);
  assert.equal(total.lines, 10);
  assert.equal(total.tokens, 200);
  assert.equal(total.percentage, 0);

  const exact = identifierTokens("f", 50, 6);
  const changed = exact.replace(/f49(\n?)$/u, "fChanged$1");
  fixture = makeFixture(t);
  report = scanPair(fixture, "exactness", exact, changed);
  total = report.statistics.total;
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 0);
  assert.equal(total.lines, 12);
  assert.equal(total.tokens, 100);
});

test("tiny, one-line and empty files are omitted from the declared scan and never produce a one-line clone", (t) => {
  let fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", TINY_SOURCE);
  writeFixture(fixture, "src/b.ts", TINY_SOURCE);
  let run = runJscpd(fixture, "tiny-declared", [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  let total = readReport(run.output).statistics.total;
  assert.equal(total.sources, 0);
  assert.equal(total.lines, 0);
  assert.equal(total.tokens, 0);
  assert.equal(total.clones, 0);
  assert.equal(total.percentage, 0);

  fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", TINY_SOURCE);
  writeFixture(fixture, "src/b.ts", TINY_SOURCE);
  run = runJscpd(fixture, "tiny-control", ["--min-tokens", "1", "--min-lines", "1", fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  total = readReport(run.output).statistics.total;
  // Even at the 1/1 control floor the one-line files are counted but no clone is
  // reported. This is the preserved tiny-identical-file zero-clone result.
  assert.equal(total.sources, 2);
  assert.equal(total.lines, 2);
  assert.equal(total.tokens, 12);
  assert.equal(total.clones, 0);
  assert.equal(total.percentage, 0);

  fixture = makeFixture(t);
  const twoLines = "alpha beta gamma\ndelta epsilon zeta\n";
  writeFixture(fixture, "src/a.ts", twoLines);
  writeFixture(fixture, "src/b.ts", twoLines);
  run = runJscpd(fixture, "two-line-control", ["--min-tokens", "1", "--min-lines", "1", fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  total = readReport(run.output).statistics.total;
  // The control proves a two-line clone is detectable, so the one-line result is
  // a hard clone floor rather than a missing report.
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 1);
  assert.equal(total.duplicatedLines, 2);
  assert.equal(total.duplicatedTokens, 6);
  assert.equal(total.lines, 4);
  assert.equal(total.tokens, 12);
  assert.equal(total.percentage, 50);

  fixture = makeFixture(t);
  writeFixture(fixture, "src/empty.ts", "");
  run = runJscpd(fixture, "empty-only", [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  total = readReport(run.output).statistics.total;
  assert.equal(total.sources, 0);
  assert.equal(total.lines, 0);
  assert.equal(total.tokens, 0);
  assert.equal(total.clones, 0);
  assert.equal(total.percentage, 0);

  fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", VALID_SOURCE);
  writeFixture(fixture, "src/b.ts", VALID_SOURCE);
  writeFixture(fixture, "src/empty.ts", "");
  run = runJscpd(fixture, "empty-mixed", [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  total = readReport(run.output).statistics.total;
  assert.equal(total.sources, 2);
  assert.equal(total.clones, 1);
  assert.equal(total.lines, 36);
  assert.equal(total.tokens, 206);
});

test("the typescript format filter includes ts, mts, cts and d.ts but excludes tsx", (t) => {
  const fixture = makeFixture(t);
  const extensions = ["ts", "tsx", "mts", "cts", "dts", "js", "json", "md"];
  for (const extension of extensions) {
    const source = VALID_SOURCE.replaceAll("repetitive", `${extension}Value`).replaceAll("value", `${extension}Amount`);
    const suffix = extension === "dts" ? "d.ts" : extension;
    writeFixture(fixture, `src/${extension}-a.${suffix}`, source);
    writeFixture(fixture, `src/${extension}-b.${suffix}`, source);
  }
  const run = runJscpd(fixture, "formats", [fixture.root]);
  assert.equal(run.status, 0, run.stderr);
  const report = readReport(run.output);
  const total = report.statistics.total;
  // .tsx is a separate jscpd format; format ["typescript"] excludes it even when
  // the extension is explicit. .js/.json/.md are likewise outside this corpus.
  assert.equal(total.sources, 8);
  assert.equal(total.clones, 4);
  assert.equal(total.duplicatedLines, 72);
  assert.equal(total.duplicatedTokens, 412);
  assert.equal(total.lines, 144);
  assert.equal(total.tokens, 824);
  assert.ok(Math.abs(total.percentage - 50) <= 0.0051);
  const names = new Set(report.duplicates.flatMap((clone) => [clone.firstFile.name, clone.secondFile.name]));
  for (const name of names) assert.ok(!/\.(?:tsx|js|json|md)$/u.test(name), name);
  for (const name of [
    "src/ts-a.ts",
    "src/ts-b.ts",
    "src/mts-a.mts",
    "src/mts-b.mts",
    "src/cts-a.cts",
    "src/cts-b.cts",
    "src/dts-a.d.ts",
    "src/dts-b.d.ts",
  ])
    assert.ok(names.has(name), name);

  const explicitTsx = runJscpd(fixture, "formats-explicit-tsx", ["src/tsx-a.tsx", "src/tsx-b.tsx"]);
  assert.equal(explicitTsx.status, 0, explicitTsx.stderr);
  const explicitTsxTotal = readReport(explicitTsx.output).statistics.total;
  assert.equal(explicitTsxTotal.sources, 0);
  assert.equal(explicitTsxTotal.clones, 0);
});

test("the default gitignore filter skips an ignored .ts file and --no-gitignore restores it", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, ".gitignore", "src/ignored.ts\nreport-*\nhome/\ntmp/\n");
  writeFixture(fixture, "src/kept.ts", VALID_SOURCE);
  writeFixture(fixture, "src/ignored.ts", VALID_SOURCE);
  writeFixture(fixture, "src/reference.ts", VALID_SOURCE);
  git(fixture, "init", "--quiet", "--initial-branch=main");
  git(fixture, "config", "user.name", "Fixture");
  git(fixture, "config", "user.email", "fixture@example.invalid");
  git(fixture, "add", ".gitignore", "src/kept.ts", "src/reference.ts");
  git(fixture, "add", "-f", "src/ignored.ts");
  git(fixture, "commit", "--quiet", "-m", "base");
  const ignored = runJscpd(fixture, "ignore-default", [fixture.root]);
  assert.equal(ignored.status, 0, ignored.stderr);
  const ignoredReport = readReport(ignored.output);
  const ignoredTotal = ignoredReport.statistics.total;
  assert.equal(ignoredTotal.sources, 2);
  assert.equal(ignoredTotal.clones, 1);
  assert.equal(ignoredTotal.lines, 36);
  assert.equal(ignoredTotal.tokens, 206);
  const defaultNames = new Set(
    ignoredReport.duplicates.flatMap((clone) => [clone.firstFile.name, clone.secondFile.name]),
  );
  assert.deepEqual([...defaultNames].sort(), ["src/kept.ts", "src/reference.ts"]);
  assert.ok(!defaultNames.has("src/ignored.ts"));

  const restored = runJscpd(fixture, "ignore-no", ["--no-gitignore", fixture.root]);
  assert.equal(restored.status, 0, restored.stderr);
  const restoredReport = readReport(restored.output);
  const restoredTotal = restoredReport.statistics.total;
  assert.equal(restoredTotal.sources, 3);
  assert.equal(restoredTotal.clones, 2);
  assert.equal(restoredTotal.duplicatedLines, 36);
  assert.equal(restoredTotal.duplicatedTokens, 206);
  assert.equal(restoredTotal.lines, 54);
  assert.equal(restoredTotal.tokens, 309);
  assert.ok(Math.abs(restoredTotal.percentage - 66.66666666666666) <= 0.0051);
  const restoredNames = new Set(
    restoredReport.duplicates.flatMap((clone) => [clone.firstFile.name, clone.secondFile.name]),
  );
  assert.ok(restoredNames.has("src/ignored.ts"));
  assert.ok(restoredNames.has("src/kept.ts"));
  assert.ok(restoredNames.has("src/reference.ts"));
});

test("a changed-to-unchanged clone is found by the full corpus and --changed but not by --changed-only", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, ".gitignore", "report-*\nhome/\ntmp/\n.jscpd-baseline*.json\n");
  writeFixture(fixture, "src/unchanged.ts", VALID_SOURCE + UNCHANGED_EXTRA);
  git(fixture, "init", "--quiet", "--initial-branch=main");
  git(fixture, "config", "user.name", "Fixture");
  git(fixture, "config", "user.email", "fixture@example.invalid");
  git(fixture, "add", ".gitignore", "src/unchanged.ts");
  git(fixture, "commit", "--quiet", "-m", "base");
  writeFixture(fixture, "src/changed.ts", VALID_SOURCE);

  const full = runJscpd(fixture, "changed-full", [fixture.root]);
  assert.equal(full.status, 0, full.stderr);
  const fullReport = readReport(full.output);
  const fullTotal = fullReport.statistics.total;
  assert.equal(fullTotal.sources, 2);
  assert.equal(fullTotal.clones, 1);
  assert.equal(fullTotal.duplicatedLines, 18);
  assert.equal(fullTotal.duplicatedTokens, 103);
  assert.equal(fullTotal.lines, 38);
  assert.equal(fullTotal.tokens, 212);
  assert.ok(Math.abs(fullTotal.percentage - 47.368421052631575) <= 0.0051);
  assert.deepEqual([fullReport.duplicates[0].firstFile.name, fullReport.duplicates[0].secondFile.name].sort(), [
    "src/changed.ts",
    "src/unchanged.ts",
  ]);

  const baseline = join(fixture.root, ".jscpd-baseline-changed.json");
  const changed = runJscpd(fixture, "changed-flag", ["--changed", "--baseline", baseline, fixture.root]);
  assert.equal(changed.status, 0, changed.stderr);
  const changedReport = readReport(changed.output);
  const changedTotal = changedReport.statistics.total;
  assert.equal(changedTotal.sources, 2);
  assert.equal(changedTotal.clones, 1);
  assert.equal(changedTotal.newClones, 1);
  assert.equal(changedTotal.newDuplicatedLines, 17);
  assert.equal(changedTotal.duplicatedLines, 18);
  assert.equal(changedTotal.lines, 38);
  assert.equal(changedTotal.tokens, 212);
  assert.ok(Math.abs(changedTotal.percentage - 47.368421052631575) <= 0.0051);
  assert.deepEqual([changedReport.duplicates[0].firstFile.name, changedReport.duplicates[0].secondFile.name].sort(), [
    "src/changed.ts",
    "src/unchanged.ts",
  ]);
  const baselineData = JSON.parse(readFileSync(baseline, "utf8")) as {
    fingerprints: Record<string, unknown>;
    head: string;
    scan: string;
    version: number;
  };
  assert.equal(baselineData.version, 1);
  assert.equal(baselineData.head, git(fixture, "rev-parse", "HEAD").trim());
  assert.match(baselineData.head, /^[a-f0-9]{40}$/u);
  assert.equal(typeof baselineData.scan, "string");
  assert.ok(baselineData.scan.length > 0);
  assert.deepEqual(baselineData.fingerprints, {});

  const changedOnly = runJscpd(fixture, "changed-only-flag", [
    "--changed-only",
    "--baseline",
    join(fixture.root, ".jscpd-baseline-only.json"),
    fixture.root,
  ]);
  assert.equal(changedOnly.status, 0, changedOnly.stderr);
  const changedOnlyReport = readReport(changedOnly.output);
  const changedOnlyTotal = changedOnlyReport.statistics.total;
  // The unchanged file carries extra tokens, so 18 lines/103 tokens identifies
  // the changed file rather than merely proving that one of the two was scanned.
  assert.equal(changedOnlyTotal.sources, 1);
  assert.equal(changedOnlyTotal.lines, 18);
  assert.equal(changedOnlyTotal.tokens, 103);
  assert.equal(changedOnlyTotal.clones, 0);
  assert.equal(changedOnlyTotal.newClones, 0);
  assert.equal(changedOnlyTotal.percentage, 0);
  assert.equal(changedOnlyReport.duplicates.length, 0);
});

test("the preserved mixed fixture exceeds 100 percent under the non-declared 1/1 control", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, "src/large.ts", VALID_SOURCE);
  writeFixture(fixture, "src/version.ts", TINY_SOURCE);
  const declared = runJscpd(fixture, "mixed-declared", [fixture.root]);
  assert.equal(declared.status, 0, declared.stderr);
  const declaredTotal = readReport(declared.output).statistics.total;
  assert.equal(declaredTotal.sources, 1);
  assert.equal(declaredTotal.lines, 18);
  assert.equal(declaredTotal.tokens, 103);
  assert.equal(declaredTotal.clones, 0);
  assert.equal(declaredTotal.percentage, 0);

  const control = runJscpd(fixture, "mixed-control", ["--min-tokens", "1", "--min-lines", "1", fixture.root]);
  assert.equal(control.status, 0, control.stderr);
  const controlReport = readReport(control.output);
  const controlTotal = controlReport.statistics.total;
  assert.equal(controlTotal.sources, 2);
  assert.equal(controlTotal.lines, 19);
  assert.equal(controlTotal.tokens, 109);
  assert.equal(controlTotal.clones, 13);
  assert.equal(controlTotal.duplicatedLines, 26);
  assert.equal(controlTotal.duplicatedTokens, 65);
  assert.ok(controlTotal.duplicatedLines > controlTotal.lines);
  assert.ok(controlTotal.percentage > 100);
  assert.ok(controlTotal.percentageTokens < 100);
  assert.ok(Math.abs(controlTotal.percentage - 136.8421052631579) <= 0.0051);
  assert.ok(Math.abs(controlTotal.percentageTokens - 59.63302752293578) <= 0.0051);
  assert.equal(controlReport.duplicates.length, 13);
  assert.ok(controlReport.duplicates.every((clone) => clone.firstFile.name === clone.secondFile.name));
  assert.ok(controlReport.duplicates.every((clone) => clone.lines === 2));
});

test("jscpd exit status alone does not enforce duplication and its threshold comparison is strict", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", VALID_SOURCE);
  writeFixture(fixture, "src/b.ts", VALID_SOURCE);
  const declared = runJscpd(fixture, "threshold-declared", [fixture.root]);
  assert.equal(declared.status, 0, declared.stderr);
  const declaredTotal = readReport(declared.output).statistics.total;
  assert.equal(declaredTotal.clones, 1);
  assert.equal(declaredTotal.percentage, 50);

  const zero = runJscpd(fixture, "threshold-zero", ["--threshold", "0", fixture.root]);
  assert.equal(zero.status, 1);
  assert.match(zero.stderr, /over threshold \(0\.0%\)/u);
  const zeroTotal = readReport(zero.output).statistics.total;
  assert.equal(zeroTotal.clones, 1);
  assert.equal(zeroTotal.percentage, 50);

  const atFifty = runJscpd(fixture, "threshold-fifty", ["--threshold", "50", fixture.root]);
  assert.equal(atFifty.status, 0);
  const atFiftyTotal = readReport(atFifty.output).statistics.total;
  assert.equal(atFiftyTotal.clones, 1);
  assert.equal(atFiftyTotal.percentage, 50);
});

test("the retained driver-shaped invocation reports the same corpus gap and absolute clone identities", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", VALID_SOURCE);
  writeFixture(fixture, "src/b.ts", VALID_SOURCE);
  writeFixture(fixture, "src/unique.ts", UNIQUE_SOURCE);
  writeFixture(fixture, "src/empty.ts", "");
  const declared = ["src/a.ts", "src/b.ts", "src/unique.ts", "src/empty.ts"];
  const maxSize = Math.max(1, ...declared.map((path) => readFileSync(join(fixture.root, path)).length));
  const run = runJscpd(fixture, "driver-shaped", [
    "--reporters",
    "json",
    "--absolute",
    "--no-gitignore",
    "--max-size",
    String(maxSize),
    ...declared.map((path) => `./${path}`),
  ]);
  assert.equal(run.status, 0, run.stderr);
  const report = readReport(run.output);
  const total = report.statistics.total;
  // The retained driver requires sources === declared files; the explicit empty
  // .ts is omitted, so this corpus gap is the same one the driver blocks on.
  assert.equal(total.sources, 3);
  assert.equal(declared.length - total.sources, 1);
  assert.equal(total.clones, 1);
  assert.equal(total.lines, 54);
  assert.equal(total.tokens, 309);
  const realRoot = realpathSync(fixture.root);
  const names = report.duplicates
    .flatMap((clone) => [clone.firstFile, clone.secondFile])
    .map((location) => {
      assert.ok(isAbsolute(location.name), location.name);
      return relative(realRoot, realpathSync(location.name));
    });
  assert.deepEqual(names.sort(), ["src/a.ts", "src/b.ts"]);
});

test("the raw report accounting is internally consistent and stable across two runs", (t) => {
  const fixture = makeFixture(t);
  writeFixture(fixture, "src/a.ts", VALID_SOURCE);
  writeFixture(fixture, "src/b.ts", VALID_SOURCE);
  writeFixture(fixture, "src/unique.ts", UNIQUE_SOURCE);
  const first = runJscpd(fixture, "stable-one", [fixture.root]);
  const second = runJscpd(fixture, "stable-two", [fixture.root]);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const firstReport = readReport(first.output);
  const secondReport = readReport(second.output);
  for (const report of [firstReport, secondReport]) {
    const total = report.statistics.total;
    assert.equal(total.sources, 3);
    assert.equal(total.clones, 1);
    assert.equal(report.duplicates.length, total.clones);
    assert.ok(Math.abs(total.percentage - (100 * total.duplicatedLines) / total.lines) <= 0.0051);
    assert.ok(Math.abs(total.percentageTokens - (100 * total.duplicatedTokens) / total.tokens) <= 0.0051);
    assert.deepEqual(report.statistics.formats.typescript, total);
    assert.equal(total.newClones, 0);
    assert.equal(total.newDuplicatedLines, 0);
    assert.ok(Number.isFinite(Date.parse(report.statistics.detectionDate)));
    for (const clone of report.duplicates) {
      assert.equal(clone.format, "typescript");
      assert.equal(clone.kind, "exact");
      assert.equal(clone.isNew, false);
      assert.ok(clone.lines >= 1);
      assert.ok(clone.tokens >= 1);
      assert.ok(clone.tokens <= total.tokens);
      assert.ok(clone.fragment.length > 0);
      assert.ok(clone.firstFile.start >= 1);
      assert.ok(clone.firstFile.end >= clone.firstFile.start);
      assert.ok(clone.secondFile.start >= 1);
      assert.ok(clone.secondFile.end >= clone.secondFile.start);
    }
  }
  assert.deepEqual(firstReport.statistics.total, secondReport.statistics.total);
  const normalize = (report: Report) =>
    report.duplicates
      .map((clone) => ({
        first: clone.firstFile.name,
        firstEnd: clone.firstFile.end,
        firstStart: clone.firstFile.start,
        format: clone.format,
        fragment: clone.fragment,
        kind: clone.kind,
        lines: clone.lines,
        second: clone.secondFile.name,
        secondEnd: clone.secondFile.end,
        secondStart: clone.secondFile.start,
        tokens: clone.tokens,
      }))
      .sort((left, right) => {
        const a = JSON.stringify(left);
        const b = JSON.stringify(right);
        return a < b ? -1 : a > b ? 1 : 0;
      });
  assert.deepEqual(normalize(firstReport), normalize(secondReport));
});

test("the protected policy inputs are unchanged from the recorded intake identities during this run", () => {
  assert.equal(sha256(CONFIG_PATH), CONFIG_SHA256);
  assert.equal(sha256(BOOTSTRAP_PATH), BOOTSTRAP_SHA256);
  assert.equal(sha256(QUALITY_PATH), QUALITY_SHA256);
  assert.equal(sha256(PACKAGE_PATH), PACKAGE_SHA256);
  assert.equal(sha256(LOCK_PATH), LOCK_SHA256);
  assert.equal(sha256(JSCPD_WRAPPER), WRAPPER_SHA256);
  assert.equal(sha256(JSCPD_BINARY), BINARY_SHA256);
  assert.equal(sha256(process.execPath), NODE_SHA256);
});
