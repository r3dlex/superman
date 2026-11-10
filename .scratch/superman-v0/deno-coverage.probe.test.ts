// Measurement host for the approved four-metric Deno coverage feasibility slice. Not an operational launcher.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { basename, dirname, join, relative, sep } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { FileCoverage, Profile, SourceMap } from "./deno-coverage-measurement.ts";
import {
  aggregate,
  bindProfile,
  codeBody,
  convertCode,
  convertProfile,
  counts,
  emitPath,
  extractInlineMap,
  parseProfiles,
  readV8Profiles,
  requireToolIdentities,
  validateLoadedProfile,
} from "./deno-coverage-measurement.ts";

const DENO_SHA256 = "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba";

const fixtureRoots: string[] = [];
after(() => {
  for (const root of fixtureRoots) rmSync(root, { recursive: true, force: true });
});

type Fixture = {
  root: string;
  home: string;
  tmp: string;
  denoDir: string;
  pilot: string;
  emit: string;
  coverage: string;
  nodeDir: string;
  ruleDir: string;
};

function requireDeno(): string {
  const path = process.env.SUPERMAN_DENO_BIN;
  if (!path) throw new Error("SUPERMAN_DENO_BIN is required");
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error("SUPERMAN_DENO_BIN must be a regular file");
  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (digest !== DENO_SHA256) throw new Error(`SUPERMAN_DENO_BIN digest is not the verified candidate: ${digest}`);
  return realpathSync(path);
}

function requireRoot(): string {
  const root = process.env.SUPERMAN_COVERAGE_ROOT;
  if (!root) throw new Error("SUPERMAN_COVERAGE_ROOT is required");
  if (!existsSync(root)) throw new Error("SUPERMAN_COVERAGE_ROOT does not exist");
  return realpathSync(root);
}

function makeFixture(name: string): Fixture {
  requireToolIdentities();
  const root = realpathSync(mkdtempSync(join(requireRoot(), `${name}-`)));
  const fixture = {
    root,
    home: join(root, "home"),
    tmp: join(root, "tmp"),
    denoDir: join(root, "deno-dir"),
    pilot: join(root, "pilot"),
    emit: join(root, "emit"),
    coverage: join(root, "coverage"),
    nodeDir: join(root, "node"),
    ruleDir: join(root, "rule"),
  };
  for (const dir of [
    fixture.home,
    fixture.tmp,
    fixture.denoDir,
    fixture.pilot,
    fixture.emit,
    fixture.nodeDir,
    fixture.ruleDir,
  ])
    mkdirSync(dir);
  fixtureRoots.push(root);
  return fixture;
}

function write(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function writeDenoPilot(fixture: Fixture): void {
  write(
    join(fixture.pilot, "loaded.ts"),
    [
      "export function fullyCovered(n: number): number {",
      "  const doubled = n * 2;",
      "  return doubled + 1;",
      "}",
      "",
    ].join("\n"),
  );
  write(
    join(fixture.pilot, "partial.ts"),
    [
      "export function choose(n: number): string {",
      '  if (n > 0) return "positive";',
      '  return "non-positive";',
      "}",
      "",
      "export function untouched(n: number): number {",
      "  return n * 2;",
      "}",
      "",
    ].join("\n"),
  );
  write(
    join(fixture.pilot, "unloaded.ts"),
    [
      "export function neverCalled(n: number): number {",
      "  if (n > 10) return n - 1;",
      "  return n + 1;",
      "}",
      "",
    ].join("\n"),
  );
  write(
    join(fixture.pilot, "run.ts"),
    [
      'import { fullyCovered } from "./loaded.ts";',
      'import { choose } from "./partial.ts";',
      "",
      "const marker = fullyCovered(2) + choose(1);",
      "console.log(marker);",
      "",
    ].join("\n"),
  );
}

function runDeno(
  fixture: Fixture,
  args: string[],
  timeout = 60_000,
  denoDir = fixture.denoDir,
): { stdout: string; stderr: string } {
  const deno = requireDeno();
  const result = spawnSync(
    "/usr/bin/env",
    [
      "-i",
      "PATH=/usr/bin:/bin",
      `HOME=${fixture.home}`,
      `TMPDIR=${fixture.tmp}`,
      `DENO_DIR=${denoDir}`,
      "DENO_NO_UPDATE_CHECK=1",
      "DENO_NO_PACKAGE_JSON=1",
      deno,
      ...args,
    ],
    {
      cwd: fixture.root,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: join(fixture.root, "hostile-home"),
        DENO_V8_FLAGS: "--not-a-real-v8-flag",
        DENO_PERMISSION_BROKER_PATH: join(fixture.root, "missing-broker.sock"),
      },
      encoding: "utf8",
      shell: false,
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.error) throw new Error(`Deno launch failed: ${result.error.message}`);
  if (result.signal) throw new Error(`Deno process ended by signal ${result.signal}`);
  if (result.status !== 0) throw new Error(`Deno process failed with status ${result.status}: ${result.stderr}`);
  if (result.stderr.includes("V8 did not recognize flag")) throw new Error("Deno inherited a hostile V8 flag");
  if (result.stderr.includes("Permission broker")) throw new Error("Deno inherited a hostile permission broker");
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function collectDeno(fixture: Fixture, options: { coverage?: string; denoDir?: string } = {}): Profile[] {
  return collectCommand(fixture, join(fixture.pilot, "run.ts"), options);
}

function collectEntry(
  fixture: Fixture,
  entryPath: string,
  allowRead: string,
  options: { coverage?: string; denoDir?: string } = {},
): Profile[] {
  const coverage = options.coverage ?? fixture.coverage;
  const denoDir = options.denoDir ?? fixture.denoDir;
  runDeno(
    fixture,
    [
      "run",
      "--no-prompt",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--no-remote",
      `--allow-read=${allowRead}`,
      `--coverage=${coverage}`,
      entryPath,
    ],
    60_000,
    denoDir,
  );
  return parseProfiles(coverage);
}

function collectCommand(
  fixture: Fixture,
  entryPath: string,
  options: { coverage?: string; denoDir?: string } = {},
): Profile[] {
  const coverage = options.coverage ?? fixture.coverage;
  const denoDir = options.denoDir ?? fixture.denoDir;
  runDeno(
    fixture,
    ["run", "--no-prompt", "--no-config", "--no-lock", "--no-npm", "--no-remote", `--coverage=${coverage}`, entryPath],
    60_000,
    denoDir,
  );
  return parseProfiles(coverage);
}

function transpileSource(fixture: Fixture, filePath: string): { code: string; sourceMap: SourceMap } {
  const output = join(fixture.emit, `${basename(filePath).replace(/\.[^.]+$/u, "")}.js`);
  runDeno(fixture, [
    "transpile",
    "--no-config",
    "--no-lock",
    "--no-npm",
    "--no-remote",
    filePath,
    "-o",
    output,
    "--source-map",
    "inline",
  ]);
  const code = readFileSync(output, "utf8");
  const sourceMap = extractInlineMap(code);
  if (sourceMap.sources.length !== 1 || sourceMap.sourcesContent?.length !== 1)
    throw new Error(`transpiled source does not bind exactly one original source: ${filePath}`);
  const mapSource = new URL(sourceMap.sources[0], pathToFileURL(filePath));
  if (mapSource.protocol !== "file:" || realpathSync(fileURLToPath(mapSource)) !== filePath)
    throw new Error(`transpiled source map does not point at the original file: ${filePath}`);
  if (!Buffer.from(sourceMap.sourcesContent[0], "utf8").equals(readFileSync(filePath)))
    throw new Error(`transpiled source does not match the current original bytes: ${filePath}`);
  if (!codeBody(code).trim()) throw new Error(`transpiled source is empty: ${filePath}`);
  return { code, sourceMap };
}

async function convertUnloaded(fixture: Fixture, filePath: string): Promise<FileCoverage> {
  const emitted = transpileSource(fixture, filePath);
  return convertCode({
    code: emitted.code,
    filePath,
    sourceMap: emitted.sourceMap,
    profile: { scriptId: "", url: pathToFileURL(filePath).href, functions: [] },
    requireComplete: false,
  });
}

type InventoryEntry = { filePath: string; mode: "loaded" | "unloaded" };

async function convertInventory(
  fixture: Fixture,
  entries: InventoryEntry[],
  profiles: Profile[],
  reference?: Profile[],
  sourceHashes?: Map<string, string>,
): Promise<Map<string, FileCoverage>> {
  if (reference) requireSameStructure(profiles, reference);
  if (sourceHashes) verifySources(sourceHashes);
  const expected = new Map<string, InventoryEntry>();
  for (const entry of entries) {
    if (!existsSync(entry.filePath)) throw new Error(`inventory source is missing: ${entry.filePath}`);
    const filePath = realpathSync(entry.filePath);
    if (expected.has(filePath)) throw new Error(`inventory repeats an aliased source: ${filePath}`);
    expected.set(filePath, entry);
  }
  const byPath = new Map<string, Profile>();
  for (const profile of profiles) {
    const url = new URL(profile.url);
    if (url.protocol !== "file:" || url.search || url.hash)
      throw new Error(`coverage profile URL is not a plain local file URL: ${profile.url}`);
    const filePath = realpathSync(fileURLToPath(url));
    if (byPath.has(filePath)) throw new Error(`duplicate coverage profile: ${filePath}`);
    if (!expected.has(filePath)) throw new Error(`unexpected coverage source: ${filePath}`);
    byPath.set(filePath, profile);
  }
  for (const [filePath, entry] of expected) {
    if (entry.mode === "loaded" && !byPath.has(filePath))
      throw new Error(`missing expected coverage profile: ${filePath}`);
    if (entry.mode === "unloaded" && byPath.has(filePath))
      throw new Error(`unexpected coverage profile for unloaded source: ${filePath}`);
  }
  const files = new Map<string, FileCoverage>();
  for (const [filePath, entry] of expected) {
    const profile = byPath.get(filePath);
    files.set(
      filePath,
      profile && entry.mode === "loaded"
        ? await convertProfile(bindProfile(fixture, profile))
        : await convertUnloaded(fixture, filePath),
    );
  }
  return files;
}

async function collectInventory(fixture: Fixture, entries: InventoryEntry[]): Promise<Map<string, FileCoverage>> {
  const hashes = snapshotSources(entries);
  const first = collectDeno(fixture);
  const second = collectDeno(fixture, {
    coverage: join(fixture.root, "coverage-reference"),
    denoDir: join(fixture.root, "deno-dir-reference"),
  });
  return convertInventory(fixture, entries, first, second, hashes);
}

function denoEntries(fixture: Fixture): InventoryEntry[] {
  return [
    { filePath: join(fixture.pilot, "run.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "loaded.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "partial.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "unloaded.ts"), mode: "unloaded" },
  ];
}

function profileByName(profiles: Profile[], name: string): Profile {
  const found = profiles.find((profile) => basename(fileURLToPath(profile.url)) === name);
  if (!found) throw new Error(`missing profile for ${name}`);
  return found;
}

function fileAt(files: Map<string, FileCoverage>, filePath: string): FileCoverage {
  const file = files.get(realpathSync(filePath));
  if (!file) throw new Error(`missing converted source: ${filePath}`);
  return file;
}

function profileStructure(profiles: Profile[]): string {
  return JSON.stringify(
    [...profiles]
      .map((profile) => ({
        url: profile.url,
        functions: profile.functions.map((fn) => ({
          name: fn.functionName,
          ranges: fn.ranges.map((range) => [range.startOffset, range.endOffset, range.count]),
        })),
      }))
      .sort((left, right) => left.url.localeCompare(right.url)),
  );
}

function requireSameStructure(left: Profile[], right: Profile[]): void {
  const owned = (profiles: Profile[]) => profiles.filter((profile) => profile.url.startsWith("file:"));
  if (profileStructure(owned(left)) !== profileStructure(owned(right)))
    throw new Error("coverage profile structure differs between independent runs");
}

async function expectReject(operation: () => unknown, pattern: RegExp): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert.match(error instanceof Error ? error.message : String(error), pattern);
    return;
  }
  throw new Error(`expected rejection matching ${pattern}`);
}

function writeNodePilot(fixture: Fixture): void {
  write(
    join(fixture.nodeDir, "subject.ts"),
    [
      "export function fullyCovered(n: number): number {",
      "  return n + 1;",
      "}",
      "export function choose(n: number): string {",
      '  if (n > 0) return "yes";',
      '  return "no";',
      "}",
      "",
    ].join("\n"),
  );
  write(
    join(fixture.nodeDir, "unloaded.ts"),
    ["export function neverCalled(n: number): number {", "  return n * 2;", "}", ""].join("\n"),
  );
  write(
    join(fixture.nodeDir, "subject.test.ts"),
    [
      'import assert from "node:assert/strict";',
      'import { test } from "node:test";',
      'import { choose, fullyCovered } from "./subject.ts";',
      "",
      'test("subject", () => {',
      "  assert.equal(fullyCovered(1), 2);",
      '  assert.equal(choose(1), "yes");',
      "});",
      "",
    ].join("\n"),
  );
}

function writeRulePilot(fixture: Fixture): void {
  write(
    join(fixture.ruleDir, "fixture.rules.ts"),
    [
      "type Ctx = {",
      "  scopedFiles: string[];",
      "  report: { violation(value: { message: string; file?: string }): void };",
      "};",
      "",
      "const rules = {",
      '  "fixture-rule": {',
      '    description: "fixture rule",',
      "    check(ctx: Ctx) {",
      '      if (!ctx.scopedFiles.includes("fixture.txt")) return;',
      '      ctx.report.violation({ message: "fixture violation", file: "fixture.txt" });',
      "    },",
      "  },",
      "};",
      "",
      "export default { rules };",
      "",
    ].join("\n"),
  );
  write(
    join(fixture.ruleDir, "fixture.test.ts"),
    [
      'import assert from "node:assert/strict";',
      'import { test } from "node:test";',
      'import fixture from "./fixture.rules.ts";',
      "",
      'test("rule", async () => {',
      "  const found: unknown[] = [];",
      '  await fixture.rules["fixture-rule"].check({',
      '    scopedFiles: ["fixture.txt"],',
      "    report: { violation: (value) => found.push(value) },",
      "  });",
      "  assert.equal(found.length, 1);",
      "});",
      "",
    ].join("\n"),
  );
}

function nodeEntries(fixture: Fixture): InventoryEntry[] {
  return [
    { filePath: join(fixture.nodeDir, "subject.ts"), mode: "loaded" },
    { filePath: join(fixture.nodeDir, "unloaded.ts"), mode: "unloaded" },
  ];
}

function ruleEntries(fixture: Fixture): InventoryEntry[] {
  return [{ filePath: join(fixture.ruleDir, "fixture.rules.ts"), mode: "loaded" }];
}

function runNodeTests(fixture: Fixture, testFile: string, rawDir: string): void {
  mkdirSync(rawDir, { recursive: true });
  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "--test-reporter=tap", testFile], {
    cwd: fixture.root,
    env: {
      PATH: "/usr/bin:/bin",
      HOME: fixture.home,
      TMPDIR: fixture.tmp,
      NODE_V8_COVERAGE: rawDir,
    },
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Node launch failed: ${result.error.message}`);
  if (result.signal) throw new Error(`Node process ended by signal ${result.signal}`);
  if (result.status !== 0) throw new Error(`Node process failed with status ${result.status}: ${result.stderr}`);
}

function sourceHash(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function snapshotSources(entries: InventoryEntry[]): Map<string, string> {
  return new Map(entries.map((entry) => [realpathSync(entry.filePath), sourceHash(entry.filePath)]));
}

function verifySources(expected: Map<string, string>): void {
  for (const [filePath, hash] of expected)
    if (sourceHash(filePath) !== hash) throw new Error(`source changed after collection: ${filePath}`);
}

async function convertNodeInventory(
  profiles: Profile[],
  entries: InventoryEntry[],
  testOnly: string[],
  expectedHashes: Map<string, string>,
  reference?: Profile[],
): Promise<Map<string, FileCoverage>> {
  if (reference) requireSameStructure(profiles, reference);
  verifySources(expectedHashes);
  const expected = new Map<string, InventoryEntry>();
  for (const entry of entries) {
    const filePath = realpathSync(entry.filePath);
    if (expected.has(filePath)) throw new Error(`inventory repeats an aliased source: ${filePath}`);
    expected.set(filePath, entry);
  }
  const tests = new Set(testOnly.map((file) => realpathSync(file)));
  const byPath = new Map<string, Profile>();
  for (const profile of profiles) {
    const url = new URL(profile.url);
    if (url.protocol !== "file:") continue;
    if (url.search || url.hash)
      throw new Error(`Node coverage profile URL is not a plain local file URL: ${profile.url}`);
    const filePath = realpathSync(fileURLToPath(url));
    if (fileURLToPath(url) !== filePath) throw new Error(`Node coverage profile URL is aliased: ${profile.url}`);
    if (tests.has(filePath)) continue;
    if (byPath.has(filePath)) throw new Error(`duplicate coverage profile: ${filePath}`);
    if (!expected.has(filePath)) throw new Error(`unexpected coverage source: ${filePath}`);
    byPath.set(filePath, profile);
  }
  const files = new Map<string, FileCoverage>();
  for (const [filePath, entry] of expected) {
    const profile = byPath.get(filePath);
    if (entry.mode === "loaded" && !profile) throw new Error(`missing expected coverage profile: ${filePath}`);
    if (entry.mode === "unloaded" && profile)
      throw new Error(`unexpected coverage profile for unloaded source: ${filePath}`);
    const sourceBytes = readFileSync(filePath);
    if (expectedHashes.get(filePath) !== createHash("sha256").update(sourceBytes).digest("hex"))
      throw new Error(`source changed after collection: ${filePath}`);
    const source = sourceBytes.toString("utf8");
    const code = stripTypeScriptTypes(source);
    if (code.length !== source.length) throw new Error(`Node strip changed source offsets: ${filePath}`);
    if (profile) validateLoadedProfile(filePath, code, profile, true);
    files.set(
      filePath,
      await convertCode({
        code,
        filePath,
        profile: profile ?? { scriptId: "", url: pathToFileURL(filePath).href, functions: [] },
        requireComplete: Boolean(profile),
      }),
    );
  }
  return files;
}

test("the Deno inventory binds loaded and unloaded sources exactly once", async () => {
  const fixture = makeFixture("inventory");
  writeDenoPilot(fixture);
  const entries: InventoryEntry[] = [
    { filePath: join(fixture.pilot, "run.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "loaded.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "partial.ts"), mode: "loaded" },
    { filePath: join(fixture.pilot, "unloaded.ts"), mode: "unloaded" },
  ];
  const files = await collectInventory(fixture, entries);
  assert.deepEqual([...files.keys()].sort(), entries.map((entry) => realpathSync(entry.filePath)).sort());
  assert.deepEqual(counts(fileAt(files, entries[0].filePath)), {
    lines: [2, 2, 0],
    statements: [2, 2, 0],
    branches: [0, 0, 0],
    functions: [0, 0, 0],
  });
  assert.deepEqual(counts(fileAt(files, entries[3].filePath)), {
    lines: [0, 2, 0],
    statements: [0, 3, 0],
    branches: [0, 2, 0],
    functions: [0, 1, 0],
  });
  assert.deepEqual(counts(fileAt(files, entries[1].filePath)), {
    lines: [2, 2, 0],
    statements: [2, 2, 0],
    branches: [0, 0, 0],
    functions: [1, 1, 0],
  });
  assert.deepEqual(counts(fileAt(files, entries[2].filePath)), {
    lines: [1, 3, 0],
    statements: [2, 4, 0],
    branches: [1, 2, 0],
    functions: [1, 2, 0],
  });
});

test("a missing expected profile rejects before conversion", async () => {
  const fixture = makeFixture("reject-missing");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const loadedPath = realpathSync(join(fixture.pilot, "loaded.ts"));
  const remaining = profiles.filter((profile) => realpathSync(fileURLToPath(profile.url)) !== loadedPath);
  await expectReject(
    () => convertInventory(fixture, denoEntries(fixture), remaining),
    /missing expected coverage profile/u,
  );
});

test("a well-formed but partial loaded profile rejects", async () => {
  const fixture = makeFixture("reject-partial");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const loaded = profileByName(profiles, "loaded.ts");
  const empty = { ...structuredClone(loaded), functions: [] };
  await expectReject(() => convertProfile(bindProfile(fixture, empty)), /loaded coverage profile is empty/u);
  const truncated = structuredClone(loaded);
  const top = truncated.functions.find((fn) => fn.functionName === "");
  if (!top?.ranges[0]) throw new Error("fixture profile has no top-level range");
  top.ranges[0].endOffset = 0;
  await expectReject(() => convertProfile(bindProfile(fixture, truncated)), /does not cover the executed script/u);
  const partialSource = profileByName(profiles, "partial.ts");
  const dropped = structuredClone(partialSource);
  dropped.functions = dropped.functions.filter((fn) => fn.functionName !== "untouched");
  await expectReject(() => convertProfile(bindProfile(fixture, dropped)), /omits an AST function/u);
});

test("Node profile aliases and malformed raw data reject", async () => {
  const fixture = makeFixture("reject-node-shape");
  writeNodePilot(fixture);
  const entries = nodeEntries(fixture);
  const hashes = snapshotSources(entries);
  const raw = join(fixture.root, "node-v8");
  runNodeTests(fixture, join(fixture.nodeDir, "subject.test.ts"), raw);
  const profiles = readV8Profiles(raw);
  const subject = profiles.find((profile) => profile.url.endsWith("subject.ts"));
  if (!subject) throw new Error("fixture Node profile is missing");
  const testOnly = [join(fixture.nodeDir, "subject.test.ts")];
  const queried = { ...structuredClone(subject), url: `${subject.url}?alias=1` };
  await expectReject(
    () => convertNodeInventory([...profiles, queried], entries, testOnly, hashes),
    /not a plain local file URL/u,
  );
  const aliasPath = join(fixture.nodeDir, "alias.ts");
  symlinkSync(join(fixture.nodeDir, "subject.ts"), aliasPath);
  const aliased = { ...structuredClone(subject), url: pathToFileURL(aliasPath).href };
  await expectReject(() => convertNodeInventory([...profiles, aliased], entries, testOnly, hashes), /aliased/u);
  const hashed = { ...structuredClone(subject), url: `${subject.url}#frag` };
  await expectReject(
    () => convertNodeInventory([...profiles, hashed], entries, testOnly, hashes),
    /not a plain local file URL/u,
  );
  await expectReject(() => convertNodeInventory([], entries, testOnly, hashes), /missing expected coverage profile/u);
  const extraPath = join(fixture.nodeDir, "extra.ts");
  write(extraPath, "export const extra = 1;\n");
  const extra = { ...structuredClone(subject), url: pathToFileURL(extraPath).href };
  await expectReject(
    () => convertNodeInventory([...profiles, extra], entries, testOnly, hashes),
    /unexpected coverage source/u,
  );
  await expectReject(
    () => convertNodeInventory([...profiles, structuredClone(subject)], entries, testOnly, hashes),
    /duplicate coverage profile/u,
  );
  const oversized = structuredClone(subject);
  const choose = oversized.functions.find((fn) => fn.functionName === "choose");
  if (!choose?.ranges[0]) throw new Error("fixture Node profile has no choose range");
  choose.ranges[0].endOffset = 10_000_000;
  const outOfBoundsProfiles = profiles.map((profile) => (profile === subject ? oversized : profile));
  await expectReject(
    () => convertNodeInventory(outOfBoundsProfiles, entries, testOnly, hashes),
    /coverage range exceeds the executed transformation/u,
  );
  const topOversized = structuredClone(subject);
  const top = topOversized.functions.find((fn) => fn.functionName === "");
  if (!top) throw new Error("fixture Node profile has no top-level function");
  top.ranges.push({ startOffset: 0, endOffset: 10_000_000, count: 1 });
  const topOversizedProfiles = profiles.map((profile) => (profile === subject ? topOversized : profile));
  await expectReject(
    () => convertNodeInventory(topOversizedProfiles, entries, testOnly, hashes),
    /coverage range exceeds the executed transformation/u,
  );
  const badDir = join(fixture.root, "bad-node-v8");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(
    join(badDir, "bad.json"),
    JSON.stringify({ result: [{ url: pathToFileURL(join(fixture.nodeDir, "subject.ts")).href, functions: "bad" }] }),
  );
  await expectReject(() => readV8Profiles(badDir), /no scriptId\/URL\/functions/u);
  const corruptDir = join(fixture.root, "corrupt-node-v8");
  mkdirSync(corruptDir, { recursive: true });
  writeFileSync(join(corruptDir, "corrupt.json"), "{");
  await expectReject(() => readV8Profiles(corruptDir), /Node coverage profile is malformed/u);
});

test("a profile that drops a nested function rejects", async () => {
  const fixture = makeFixture("reject-nested");
  write(
    join(fixture.pilot, "nested.ts"),
    [
      "export function outer(n: number): number {",
      "  function inner(x: number): number {",
      "    return x + 1;",
      "  }",
      "  return inner(n);",
      "}",
      "",
    ].join("\n"),
  );
  write(join(fixture.pilot, "run.ts"), 'import { outer } from "./nested.ts";\nconsole.log(outer(1));\n');
  const profiles = collectDeno(fixture);
  const nested = profileByName(profiles, "nested.ts");
  const inner = nested.functions.find((fn) => fn.functionName === "inner");
  if (!inner) throw new Error("fixture profile has no nested inner function");
  const dropped = structuredClone(nested);
  dropped.functions = dropped.functions.filter((fn) => fn.functionName !== "inner");
  await expectReject(() => convertProfile(bindProfile(fixture, dropped)), /omits an AST function/u);
});

test("a Deno unloaded source changed after collection rejects", async () => {
  const fixture = makeFixture("reject-unloaded-stale");
  writeDenoPilot(fixture);
  const entries = denoEntries(fixture);
  const hashes = snapshotSources(entries);
  const first = collectDeno(fixture);
  const second = collectDeno(fixture, {
    coverage: join(fixture.root, "coverage-reference"),
    denoDir: join(fixture.root, "deno-dir-reference"),
  });
  writeFileSync(
    join(fixture.pilot, "unloaded.ts"),
    `${readFileSync(join(fixture.pilot, "unloaded.ts"), "utf8")}\n// changed\n`,
  );
  await expectReject(
    () => convertInventory(fixture, entries, first, second, hashes),
    /source changed after collection/u,
  );
});

test("invalid profile shapes reject", async () => {
  const fixture = makeFixture("reject-shape");
  const shapeDir = join(fixture.root, "shape");
  mkdirSync(shapeDir, { recursive: true });
  const base = { scriptId: "1", url: pathToFileURL(join(fixture.root, "shape.ts")).href };
  writeFileSync(join(shapeDir, "no-script.json"), JSON.stringify({ url: base.url, functions: [] }));
  await expectReject(() => parseProfiles(shapeDir), /no scriptId\/URL\/functions/u);
  const badFlag = join(fixture.root, "bad-flag");
  mkdirSync(badFlag, { recursive: true });
  writeFileSync(
    join(badFlag, "bad.json"),
    JSON.stringify({ ...base, functions: [{ functionName: "x", isBlockCoverage: "no", ranges: [] }] }),
  );
  await expectReject(() => parseProfiles(badFlag), /invalid function/u);
  const badRange = join(fixture.root, "bad-range");
  mkdirSync(badRange, { recursive: true });
  writeFileSync(
    join(badRange, "bad.json"),
    JSON.stringify({
      ...base,
      functions: [
        {
          functionName: "x",
          isBlockCoverage: true,
          ranges: [{ startOffset: -1, endOffset: 0, count: 0 }],
        },
      ],
    }),
  );
  await expectReject(() => parseProfiles(badRange), /invalid range/u);
});

test("an independent Deno run detects a range-dropped partial profile", async () => {
  const fixture = makeFixture("stable");
  writeDenoPilot(fixture);
  const first = collectDeno(fixture);
  const second = collectDeno(fixture, {
    coverage: join(fixture.root, "coverage-2"),
    denoDir: join(fixture.root, "deno-dir-2"),
  });
  requireSameStructure(first, second);
  const partial = structuredClone(first);
  const target = profileByName(partial, "partial.ts");
  const choose = target.functions.find((fn) => fn.functionName === "choose");
  if (!choose || choose.ranges.length < 2) throw new Error("fixture profile has no branch range");
  choose.ranges.pop();
  await expectReject(() => convertInventory(fixture, denoEntries(fixture), partial, second), /structure differs/u);
});

test("a Node source changed after collection rejects", async () => {
  const fixture = makeFixture("reject-node-stale");
  writeNodePilot(fixture);
  const entries = nodeEntries(fixture);
  const hashes = snapshotSources(entries);
  const raw = join(fixture.root, "node-v8");
  runNodeTests(fixture, join(fixture.nodeDir, "subject.test.ts"), raw);
  writeFileSync(
    join(fixture.nodeDir, "subject.ts"),
    `${readFileSync(join(fixture.nodeDir, "subject.ts"), "utf8")}\n// changed\n`,
  );
  await expectReject(
    () => convertNodeInventory(readV8Profiles(raw), entries, [join(fixture.nodeDir, "subject.test.ts")], hashes),
    /source changed after collection/u,
  );
});

test("an unmodeled or duplicated source rejects instead of shrinking or double counting", async () => {
  const fixture = makeFixture("reject-unmodeled");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const withoutRun = denoEntries(fixture).filter((entry) => !entry.filePath.endsWith("run.ts"));
  await expectReject(() => convertInventory(fixture, withoutRun, profiles), /unexpected coverage source/u);
  await expectReject(
    () =>
      convertInventory(fixture, denoEntries(fixture), [
        ...profiles,
        structuredClone(profileByName(profiles, "loaded.ts")),
      ]),
    /duplicate coverage profile/u,
  );
});

test("a profile for a declared-unloaded source rejects", async () => {
  const fixture = makeFixture("reject-unloaded-profile");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const unloadedUrl = pathToFileURL(join(fixture.pilot, "unloaded.ts")).href;
  profiles.push({ ...structuredClone(profileByName(profiles, "loaded.ts")), url: unloadedUrl });
  await expectReject(
    () => convertInventory(fixture, denoEntries(fixture), profiles),
    /unexpected coverage profile for unloaded source/u,
  );
});

test("an aliased profile path rejects instead of binding a different file", async () => {
  const fixture = makeFixture("reject-alias");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const alias = join(fixture.pilot, "alias.ts");
  symlinkSync(join(fixture.pilot, "loaded.ts"), alias);
  const aliased = { ...structuredClone(profileByName(profiles, "loaded.ts")), url: pathToFileURL(alias).href };
  await expectReject(() => bindProfile(fixture, aliased), /aliased/u);
});

test("malformed and missing-map evidence rejects", async () => {
  const fixture = makeFixture("reject-malformed");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const badDir = join(fixture.root, "bad-profiles");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "bad.json"), "{");
  await expectReject(() => parseProfiles(badDir), /malformed/u);
  assert.throws(() => extractInlineMap("//# sourceMappingURL=data:application/json,not-base64"), /not base64 encoded/u);
  const loaded = profileByName(profiles, "loaded.ts");
  const path = emitPath(fixture, fileURLToPath(loaded.url));
  const text = readFileSync(path, "utf8");
  writeFileSync(path, text.replace(/\n\/\/# sourceMappingURL=.*(?=\n\/\/ denoCacheMetadata=)/u, ""));
  await expectReject(() => bindProfile(fixture, loaded), /no inline source map/u);
});

test("an out-of-bounds range or a stale original rejects", async () => {
  const fixture = makeFixture("reject-stale");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const loaded = profileByName(profiles, "loaded.ts");
  const outOfBounds = structuredClone(loaded);
  const firstRange = outOfBounds.functions[0]?.ranges[0];
  if (!firstRange) throw new Error("loaded profile has no top-level range");
  firstRange.endOffset = 10_000_000;
  await expectReject(() => bindProfile(fixture, outOfBounds), /exceeds the executed transformation/u);
  writeFileSync(
    join(fixture.pilot, "loaded.ts"),
    `${readFileSync(join(fixture.pilot, "loaded.ts"), "utf8")}\n// changed\n`,
  );
  await expectReject(() => bindProfile(fixture, loaded), /does not match the current original bytes/u);
});

test("an abnormal Deno child rejects instead of crediting partial evidence", () => {
  const fixture = makeFixture("reject-child");
  write(join(fixture.pilot, "exit.ts"), "Deno.exit(7);\n");
  assert.throws(
    () =>
      runDeno(fixture, [
        "run",
        "--no-prompt",
        "--no-config",
        "--no-lock",
        "--no-npm",
        "--no-remote",
        join(fixture.pilot, "exit.ts"),
      ]),
    /status 7/u,
  );
  write(join(fixture.pilot, "sleep.ts"), "await new Promise((resolve) => setTimeout(resolve, 5_000));\n");
  assert.throws(
    () =>
      runDeno(
        fixture,
        ["run", "--no-prompt", "--no-config", "--no-lock", "--no-npm", "--no-remote", join(fixture.pilot, "sleep.ts")],
        500,
      ),
    /ETIMEDOUT|timed out/u,
  );
});

test("disjoint Deno, Node and rule inventories aggregate exactly once", async () => {
  const fixture = makeFixture("aggregate");
  writeDenoPilot(fixture);
  writeNodePilot(fixture);
  writeRulePilot(fixture);
  const deno = await collectInventory(fixture, denoEntries(fixture));
  const nodeRaw = join(fixture.root, "node-v8");
  const nodeRawReference = join(fixture.root, "node-v8-reference");
  const nodeHashes = snapshotSources(nodeEntries(fixture));
  runNodeTests(fixture, join(fixture.nodeDir, "subject.test.ts"), nodeRaw);
  runNodeTests(fixture, join(fixture.nodeDir, "subject.test.ts"), nodeRawReference);
  const nodeFirst = readV8Profiles(nodeRaw);
  const nodeSecond = readV8Profiles(nodeRawReference);
  requireSameStructure(nodeFirst, nodeSecond);
  const node = await convertNodeInventory(
    nodeFirst,
    nodeEntries(fixture),
    [join(fixture.nodeDir, "subject.test.ts")],
    nodeHashes,
    nodeSecond,
  );
  const ruleRaw = join(fixture.root, "rule-v8");
  const ruleRawReference = join(fixture.root, "rule-v8-reference");
  const ruleHashes = snapshotSources(ruleEntries(fixture));
  runNodeTests(fixture, join(fixture.ruleDir, "fixture.test.ts"), ruleRaw);
  runNodeTests(fixture, join(fixture.ruleDir, "fixture.test.ts"), ruleRawReference);
  const ruleFirst = readV8Profiles(ruleRaw);
  const ruleSecond = readV8Profiles(ruleRawReference);
  requireSameStructure(ruleFirst, ruleSecond);
  const rule = await convertNodeInventory(
    ruleFirst,
    ruleEntries(fixture),
    [join(fixture.ruleDir, "fixture.test.ts")],
    ruleHashes,
    ruleSecond,
  );
  assert.deepEqual(counts(fileAt(node, join(fixture.nodeDir, "subject.ts"))), {
    lines: [2, 3, 0],
    statements: [3, 4, 0],
    branches: [1, 2, 0],
    functions: [2, 2, 0],
  });
  assert.deepEqual(counts(fileAt(node, join(fixture.nodeDir, "unloaded.ts"))), {
    lines: [0, 1, 0],
    statements: [0, 1, 0],
    branches: [0, 0, 0],
    functions: [0, 1, 0],
  });
  assert.deepEqual(counts(fileAt(rule, join(fixture.ruleDir, "fixture.rules.ts"))), {
    lines: [3, 3, 0],
    statements: [3, 4, 0],
    branches: [1, 2, 0],
    functions: [1, 1, 0],
  });
  const merged = aggregate([deno, node, rule], join(fixture.root, "reports"));
  const expectedFiles = [
    ...denoEntries(fixture).map((entry) => realpathSync(entry.filePath)),
    ...nodeEntries(fixture).map((entry) => realpathSync(entry.filePath)),
    ...ruleEntries(fixture).map((entry) => realpathSync(entry.filePath)),
  ].sort();
  assert.deepEqual(merged.files, expectedFiles);
  assert.deepEqual(merged.total, {
    lines: [10, 16, 0],
    statements: [12, 20, 0],
    branches: [3, 8, 0],
    functions: [5, 8, 0],
  });
});

test("a wholly unloaded source keeps complete denominators with zero hits", async () => {
  const fixture = makeFixture("unloaded");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  for (const profile of profiles) {
    const bound = bindProfile(fixture, profile);
    const transpiled = transpileSource(fixture, bound.filePath);
    assert.equal(codeBody(transpiled.code), codeBody(bound.runtimeCode), bound.filePath);
  }
  assert.equal(
    profiles.some((profile) => basename(fileURLToPath(profile.url)) === "unloaded.ts"),
    false,
  );
  const unloaded = await convertUnloaded(fixture, join(fixture.pilot, "unloaded.ts"));
  assert.deepEqual(counts(unloaded), {
    lines: [0, 2, 0],
    statements: [0, 3, 0],
    branches: [0, 2, 0],
    functions: [0, 1, 0],
  });
});

test("loaded and partially hit profiles convert to exact four-metric counts", async () => {
  const fixture = makeFixture("convert");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  const byName = new Map(profiles.map((profile) => [basename(fileURLToPath(profile.url)), profile]));
  const loadedProfile = byName.get("loaded.ts");
  const partialProfile = byName.get("partial.ts");
  assert.ok(loadedProfile, "loaded profile must exist");
  assert.ok(partialProfile, "partial profile must exist");
  const loadedBound = bindProfile(fixture, loadedProfile);
  const partialBound = bindProfile(fixture, partialProfile);
  const loaded = await convertProfile(loadedBound);
  const partial = await convertProfile(partialBound);
  assert.deepEqual(counts(loaded), {
    lines: [2, 2, 0],
    statements: [2, 2, 0],
    branches: [0, 0, 0],
    functions: [1, 1, 0],
  });
  assert.deepEqual(counts(partial), {
    lines: [1, 3, 0],
    statements: [2, 4, 0],
    branches: [1, 2, 0],
    functions: [1, 2, 0],
  });
});

test("a real Deno run binds every loaded profile to the emit bytes actually executed", () => {
  const fixture = makeFixture("bind");
  writeDenoPilot(fixture);
  const profiles = collectDeno(fixture);
  assert.deepEqual(
    profiles.map((profile) => fileURLToPath(profile.url)).sort(),
    [join(fixture.pilot, "loaded.ts"), join(fixture.pilot, "partial.ts"), join(fixture.pilot, "run.ts")].sort(),
  );
  for (const profile of profiles) {
    const bound = bindProfile(fixture, profile);
    assert.equal(bound.sourceMap.sourcesContent?.length, 1);
    assert.equal(bound.sourceMap.sourcesContent?.[0], readFileSync(bound.filePath, "utf8"));
    assert.equal(bound.runtimeCode.includes("sourceMappingURL=data:application/json"), true);
    assert.equal(bound.profile.functions.length > 0, true);
  }
});

test("aggregate rejects a source repeated across inventories", () => {
  const fixture = makeFixture("reject-aggregate-alias");
  const filePath = join(fixture.root, "duplicate.ts");
  write(filePath, "export const value = 1;\n");
  const fake = {
    path: realpathSync(filePath),
    statementMap: {},
    fnMap: {},
    branchMap: {},
    s: {},
    f: {},
    b: {},
  };
  const first = new Map([[realpathSync(filePath), fake]]);
  const second = new Map([[realpathSync(filePath), fake]]);
  assert.throws(
    () => aggregate([first, second], join(fixture.root, "reports")),
    /aggregate repeats an aliased source/u,
  );
});

function isOwnedPath(root: string, target: string): boolean {
  const owned = relative(root, target);
  return owned === "" || (!owned.startsWith("..") && !owned.includes(`..${sep}`));
}

const measureEntry = process.env.SUPERMAN_MEASURE_ENTRY;
if (measureEntry) {
  test("external entry is measured through the step 5 binding seam", async () => {
    const root = requireRoot();
    const entryStat = lstatSync(measureEntry, { throwIfNoEntry: false });
    if (!entryStat?.isFile() || entryStat.isSymbolicLink()) throw new Error("measured entry must be a regular file");
    const entryPath = realpathSync(measureEntry);
    if (!isOwnedPath(root, entryPath)) throw new Error("measured entry is outside the owned coverage root");
    const receiptPath = process.env.SUPERMAN_MEASURE_RECEIPT;
    if (!receiptPath) throw new Error("SUPERMAN_MEASURE_RECEIPT is required");
    const receiptDir = realpathSync(dirname(receiptPath));
    if (!isOwnedPath(root, receiptDir)) throw new Error("measurement receipt is outside the owned coverage root");
    const fixture = makeFixture("external-entry");
    fixture.pilot = dirname(entryPath);
    const allowRead = dirname(entryPath);
    mkdirSync(join(fixture.root, "coverage-reference"));
    mkdirSync(join(fixture.root, "deno-dir-reference"));
    const first = collectEntry(fixture, entryPath, allowRead);
    const second = collectEntry(fixture, entryPath, allowRead, {
      coverage: join(fixture.root, "coverage-reference"),
      denoDir: join(fixture.root, "deno-dir-reference"),
    });
    requireSameStructure(first, second);
    if (first.length !== 1) throw new Error(`measured entry produced ${first.length} profiles`);
    const bound = bindProfile(fixture, first[0]);
    if (bound.filePath !== entryPath) throw new Error("measured profile did not bind the entry");
    const original = readFileSync(entryPath);
    if (!bound.sourceMap.sourcesContent || !Buffer.from(bound.sourceMap.sourcesContent[0], "utf8").equals(original)) {
      throw new Error("executed transformation does not match the current original bytes");
    }
    const metrics = counts(await convertProfile(bound));
    const receipt = {
      entryPath,
      entrySha256: createHash("sha256").update(original).digest("hex"),
      sourcesContentMatches: true,
      loadedPaths: [entryPath],
      emitPath: emitPath(fixture, entryPath),
      metrics,
      denoSha256: createHash("sha256").update(readFileSync(requireDeno())).digest("hex"),
    };
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
  });
}
