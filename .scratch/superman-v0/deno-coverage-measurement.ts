// Measurement module for the four-metric Deno coverage slice.
// This is not an operational launcher and not product code. It exists so the
// probe can drive exported measurement seams instead of asserting on test-file
// private helpers (Biome noExportsInTest; spec "Testing Decisions").
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type CoverageFixture = { pilot: string; denoDir: string };

const TOOL_IDENTITIES = [
  {
    name: "c8",
    version: "12.0.0",
    sha256: "2b5b56fcc53b1e8ec88b4413f3e49901bca7494873faeb3ba3f6d988bac0e247",
    from: "c8",
  },
  {
    name: "@vitest/coverage-v8",
    version: "5.0.5",
    sha256: "abdee7d3e2bb4e49ed96bc2393e0e6ef30d32759b90322d5e92aba0d97db8e5b",
    from: "@vitest/coverage-v8",
  },
  {
    name: "ast-v8-to-istanbul",
    version: "1.0.7",
    sha256: "21f42f2211e04ba2429bb830c5ddbfd18f9ea160019a32325a90f0796e6dad6d",
    from: "@vitest/coverage-v8",
  },
  {
    name: "vite",
    version: "8.3.5",
    sha256: "c9586ac07b42763a8a7f6aac6b4a805d70f057bd8c67c43da81c0cc4e5da8293",
    from: "@vitest/coverage-v8",
  },
  {
    name: "@bcoe/v8-coverage",
    version: "1.0.2",
    sha256: "3933b8b0c4a7ef984512050ee5f56726b29da0dac0632913b2bf93ca6bef43f3",
    from: "c8",
  },
  {
    name: "istanbul-lib-coverage",
    version: "3.2.2",
    sha256: "7974dda66b36ee4f2ae12760b0a94752ab735c6977174a30547047f08ff33cf3",
    from: "c8",
  },
  {
    name: "istanbul-lib-report",
    version: "3.0.1",
    sha256: "2c9e77d8fe3b5ef7c763f77d6eb7f85f327f68a46f8460b2b5a4f95bed87ed65",
    from: "c8",
  },
  {
    name: "istanbul-reports",
    version: "3.2.0",
    sha256: "7c7d6b02351defbbd17c2c117c0475962db6083db022350c12f853cec9229c6e",
    from: "c8",
  },
];

function packageJsonPath(resolver: NodeRequire, name: string): string {
  let dir = dirname(resolver.resolve(name));
  for (;;) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`package.json not found for ${name}`);
    dir = parent;
  }
}

export function requireToolIdentities(): void {
  const resolvers = new Map<string, NodeRequire>();
  for (const tool of TOOL_IDENTITIES) {
    const resolver = resolvers.get(tool.from) ?? createRequire(import.meta.resolve(tool.from));
    resolvers.set(tool.from, resolver);
    const path = packageJsonPath(resolver, tool.name);
    const bytes = readFileSync(path);
    const parsed = JSON.parse(bytes.toString("utf8")) as { version?: string };
    assert.equal(parsed.version, tool.version, `${tool.name} version`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), tool.sha256, `${tool.name} package hash`);
  }
}

type CoverageRange = { startOffset: number; endOffset: number; count: number };
type FunctionCoverage = { functionName: string; ranges: CoverageRange[]; isBlockCoverage: boolean };
export type Profile = { scriptId: string; url: string; functions: FunctionCoverage[] };
export type SourceMap = {
  version: number;
  sources: string[];
  sourcesContent?: string[];
  names: string[];
  mappings: string;
  file?: string;
  sourceRoot?: string;
};
export type Bound = { filePath: string; runtimeCode: string; sourceMap: SourceMap; profile: Profile };
export type FileCoverage = {
  path: string;
  statementMap: Record<string, unknown>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, unknown>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
};
export type Metrics = Record<"lines" | "statements" | "branches" | "functions", [number, number, number]>;

function validateProfile(value: unknown, label: string): Profile {
  if (!value || typeof value !== "object") throw new Error(`coverage profile is not an object: ${label}`);
  const profile = value as Partial<Profile>;
  if (typeof profile.scriptId !== "string" || typeof profile.url !== "string" || !Array.isArray(profile.functions))
    throw new Error(`coverage profile has no scriptId/URL/functions: ${label}`);
  for (const fn of profile.functions) {
    if (
      !fn ||
      typeof fn.functionName !== "string" ||
      typeof fn.isBlockCoverage !== "boolean" ||
      !Array.isArray(fn.ranges)
    )
      throw new Error(`coverage profile has an invalid function: ${label}`);
    for (const range of fn.ranges) {
      if (
        !range ||
        !Number.isSafeInteger(range.startOffset) ||
        !Number.isSafeInteger(range.endOffset) ||
        !Number.isSafeInteger(range.count) ||
        range.startOffset < 0 ||
        range.endOffset < range.startOffset ||
        range.count < 0
      )
        throw new Error(`coverage profile has an invalid range: ${label}`);
    }
  }
  return profile as Profile;
}

// Measurement seams. Tests drive these exported functions, not test-file
// private helpers. This is a non-test measurement module, so Biome's
// noExportsInTest does not apply; the module is not product code.
export function parseProfiles(directory: string): Profile[] {
  if (!existsSync(directory)) throw new Error("coverage profile directory is missing");
  const profiles: Profile[] = [];
  for (const name of readdirSync(directory).sort()) {
    if (!name.endsWith(".json")) continue;
    const text = readFileSync(join(directory, name), "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`coverage profile is malformed: ${name}`);
    }
    profiles.push(validateProfile(parsed, name));
  }
  if (!profiles.length) throw new Error("coverage profile directory is empty");
  return profiles;
}

export function extractInlineMap(code: string): SourceMap {
  const match = [...code.matchAll(/#\s*sourceMappingURL=(.*)\s*$/gm)].at(-1);
  if (!match?.[1]) throw new Error("executed source has no inline source map");
  const separator = ";base64,";
  const separatorIndex = match[1].indexOf(separator);
  if (separatorIndex < 0) throw new Error("executed source map is not base64 encoded");
  const payload = match[1].slice(separatorIndex + separator.length);
  if (!payload) throw new Error("executed source map is not base64 encoded");
  const map = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as SourceMap;
  if (map.version !== 3 || !Array.isArray(map.sources) || !Array.isArray(map.names) || typeof map.mappings !== "string")
    throw new Error("executed source map is not a version 3 map");
  return map;
}

export function validateLoadedProfile(
  filePath: string,
  runtimeCode: string,
  profile: Profile,
  allowOversizedTopLevel: boolean,
): void {
  if (!profile.functions.length) throw new Error(`loaded coverage profile is empty: ${filePath}`);
  const bodyLength = codeBody(runtimeCode).trimEnd().length;
  const top = profile.functions.find((fn) => fn.functionName === "" && fn.ranges[0]?.startOffset === 0);
  if (!top) throw new Error(`loaded coverage profile has no top-level range: ${filePath}`);
  for (const fn of profile.functions) {
    if (!fn.ranges.length) throw new Error(`loaded coverage profile has a partial function: ${filePath}`);
    for (const [index, range] of fn.ranges.entries()) {
      if (allowOversizedTopLevel && fn === top && index === 0) continue;
      if (range.endOffset > runtimeCode.length)
        throw new Error(`coverage range exceeds the executed transformation: ${filePath}`);
    }
  }
  const topRange = top.ranges[0];
  if (!topRange) throw new Error(`loaded coverage profile has no top-level range: ${filePath}`);
  if (topRange.startOffset !== 0 || topRange.endOffset < bodyLength)
    throw new Error(`loaded coverage profile does not cover the executed script: ${filePath}`);
}

export function emitPath(fixture: CoverageFixture, filePath: string): string {
  return join(fixture.denoDir, "gen", "file", `${filePath.replace(/^\//u, "")}.js`);
}

export function bindProfile(fixture: CoverageFixture, profile: Profile): Bound {
  const url = new URL(profile.url);
  if (url.protocol !== "file:" || url.search || url.hash)
    throw new Error(`coverage profile URL is not a plain local file URL: ${profile.url}`);
  const filePath = realpathSync(fileURLToPath(url));
  if (fileURLToPath(url) !== filePath) throw new Error(`coverage profile URL is aliased: ${profile.url}`);
  const owned = relative(fixture.pilot, filePath);
  if (!owned || owned.startsWith("..") || owned.includes(`..${sep}`))
    throw new Error(`coverage profile points outside the owned pilot: ${profile.url}`);
  const emit = emitPath(fixture, filePath);
  const stat = lstatSync(emit, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`executed transformation is missing for ${filePath}`);
  const serialized = readFileSync(emit, "utf8");
  const marker = "\n// denoCacheMetadata=";
  const markerIndex = serialized.lastIndexOf(marker);
  if (markerIndex <= 0) throw new Error(`executed transformation has no cache metadata: ${filePath}`);
  const runtimeCode = serialized.slice(0, markerIndex);
  if (!runtimeCode.trim()) throw new Error(`executed transformation is empty: ${filePath}`);
  const sourceMap = extractInlineMap(runtimeCode);
  if (sourceMap.sources.length !== 1 || sourceMap.sourcesContent?.length !== 1)
    throw new Error(`executed transformation does not bind exactly one original source: ${filePath}`);
  const mapSource = new URL(sourceMap.sources[0], pathToFileURL(filePath));
  if (mapSource.protocol !== "file:" || realpathSync(fileURLToPath(mapSource)) !== filePath)
    throw new Error(`executed source map does not point at the original file: ${filePath}`);
  const original = readFileSync(filePath);
  if (!Buffer.from(sourceMap.sourcesContent[0], "utf8").equals(original))
    throw new Error(`executed transformation does not match the current original bytes: ${filePath}`);
  validateLoadedProfile(filePath, runtimeCode, profile, false);
  return { filePath, runtimeCode, sourceMap, profile };
}

type Converters = {
  convert(options: {
    code: string;
    ast: unknown;
    coverage: Profile;
    sourceMap?: SourceMap;
  }): Promise<Record<string, FileCoverage>>;
  parseAstAsync(code: string): Promise<unknown>;
};

let converters: Promise<Converters> | undefined;

function loadConverters(): Promise<Converters> {
  converters ??= (async () => {
    const v8Require = createRequire(import.meta.resolve("@vitest/coverage-v8"));
    const { convert } = await import(pathToFileURL(v8Require.resolve("ast-v8-to-istanbul")).href);
    const { parseAstAsync } = await import(pathToFileURL(v8Require.resolve("vite")).href);
    return { convert, parseAstAsync } as Converters;
  })();
  return converters;
}

function istanbul(): {
  coverage: {
    createFileCoverage(data: FileCoverage): {
      toSummary(): { toJSON(): Record<string, { covered: number; total: number; skipped: number }> };
    };
    createCoverageMap(data: Record<string, FileCoverage>): {
      addFileCoverage(data: FileCoverage): void;
      getCoverageSummary(): { toJSON(): Record<string, { covered: number; total: number; skipped: number }> };
    };
  };
  reporting: { createContext(options: { dir: string; coverageMap: unknown }): unknown };
  reporters: { create(name: string): { execute(context: unknown): void } };
} {
  const require = createRequire(import.meta.resolve("c8"));
  return {
    coverage: require("istanbul-lib-coverage"),
    reporting: require("istanbul-lib-report"),
    reporters: require("istanbul-reports"),
  };
}

type AstNode = {
  type?: string;
  start?: number;
  end?: number;
  body?: unknown;
  operator?: string;
  [key: string]: unknown;
};

function collectAstFunctions(ast: unknown): Array<{ start: number; end: number; name?: string }> {
  const functions: Array<{ start: number; end: number; name?: string }> = [];
  const visit = (node: unknown, parent?: AstNode): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, parent);
      return;
    }
    const record = node as AstNode;
    if (
      ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(record.type ?? "") &&
      Number.isInteger(record.start) &&
      Number.isInteger(record.end)
    ) {
      let name = (record.id as { name?: string } | undefined)?.name;
      if (!name && parent) {
        if (["MethodDefinition", "Property", "PropertyDefinition"].includes(parent.type ?? "")) {
          const key = parent.key as { name?: string; value?: unknown } | undefined;
          if (key && typeof key.name === "string") name = key.name;
          else if (key && typeof key.value === "string") name = key.value;
        } else if (parent.type === "VariableDeclarator") {
          const identifier = parent.id as { name?: string } | undefined;
          if (identifier && typeof identifier.name === "string") name = identifier.name;
        }
      }
      functions.push({ start: record.start as number, end: record.end as number, name });
    }
    for (const [key, value] of Object.entries(record)) {
      if (["loc", "range", "start", "end", "raw"].includes(key)) continue;
      visit(value, record);
    }
  };
  visit(ast);
  return functions;
}

function validateCoverageCompleteness(code: string, ast: unknown, profile: Profile, filePath: string): void {
  const bodyLength = codeBody(code).trimEnd().length;
  const topLevel = profile.functions.find(
    (fn) => fn.functionName === "" && fn.ranges[0]?.startOffset === 0 && fn.ranges[0].endOffset >= bodyLength,
  );
  const measured = profile.functions.filter((fn) => fn !== topLevel);
  for (const fn of collectAstFunctions(ast)) {
    const candidates = measured.filter(
      (coverage) =>
        coverage.ranges[0] && coverage.ranges[0].startOffset <= fn.start && coverage.ranges[0].endOffset >= fn.end,
    );
    if (!candidates.length) throw new Error(`loaded coverage profile omits an AST function: ${filePath}`);
    const named = fn.name ? candidates.filter((coverage) => coverage.functionName === fn.name) : [];
    const pool = named.length ? named : candidates;
    const match = pool.reduce((left, right) =>
      (left.ranges[0]?.endOffset ?? 0) - (left.ranges[0]?.startOffset ?? 0) <=
      (right.ranges[0]?.endOffset ?? 0) - (right.ranges[0]?.startOffset ?? 0)
        ? left
        : right,
    );
    const range = match.ranges[0];
    if (!range) throw new Error(`loaded coverage profile omits an AST function: ${filePath}`);
    if (range.startOffset < fn.start - 6 || range.endOffset > fn.end + 6)
      throw new Error(`loaded coverage profile omits an AST function: ${filePath}`);
  }
}

export async function convertCode(input: {
  code: string;
  filePath: string;
  sourceMap?: SourceMap;
  profile: Profile;
  requireComplete?: boolean;
}): Promise<FileCoverage> {
  const { convert, parseAstAsync } = await loadConverters();
  const ast = await parseAstAsync(input.code);
  if (input.requireComplete ?? true) validateCoverageCompleteness(input.code, ast, input.profile, input.filePath);
  const options = {
    code: input.code,
    ast,
    coverage: input.profile,
    ...(input.sourceMap ? { sourceMap: { ...input.sourceMap, sources: [input.filePath], sourceRoot: "" } } : {}),
  };
  const data = await convert(options);
  const keys = Object.keys(data);
  if (keys.length !== 1 || keys[0] !== input.filePath)
    throw new Error(`conversion did not bind exactly the original source: ${keys.join(",")}`);
  return data[input.filePath];
}

export async function convertProfile(bound: Bound): Promise<FileCoverage> {
  return convertCode({
    code: bound.runtimeCode,
    filePath: bound.filePath,
    sourceMap: bound.sourceMap,
    profile: bound.profile,
  });
}

function metricTuple(value: { covered: number; total: number; skipped: number }): [number, number, number] {
  return [value.covered, value.total, value.skipped];
}

function summaryCounts(summary: Record<string, { covered: number; total: number; skipped: number }>): Metrics {
  const metric = (name: keyof Metrics): [number, number, number] => {
    const value = summary[name];
    if (!value) throw new Error(`missing ${name} summary`);
    return metricTuple(value);
  };
  return {
    lines: metric("lines"),
    statements: metric("statements"),
    branches: metric("branches"),
    functions: metric("functions"),
  };
}

export function counts(file: FileCoverage): Metrics {
  return summaryCounts(istanbul().coverage.createFileCoverage(file).toSummary().toJSON());
}

export function codeBody(text: string): string {
  return `${text.replace(/\n?\/\/# sourceMappingURL=.*\s*$/m, "").trimEnd()}\n`;
}

export function readV8Profiles(directory: string): Profile[] {
  if (!existsSync(directory)) throw new Error("Node coverage directory is missing");
  const reports = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(join(directory, name), "utf8"));
      } catch {
        throw new Error(`Node coverage profile is malformed: ${name}`);
      }
      if (!parsed || !Array.isArray((parsed as { result?: unknown }).result))
        throw new Error(`Node coverage profile is malformed: ${name}`);
      for (const script of (parsed as { result: unknown[] }).result) validateProfile(script, name);
      return parsed;
    });
  if (!reports.length) throw new Error("Node coverage directory is empty");
  const merged = createRequire(import.meta.resolve("c8"))("@bcoe/v8-coverage").mergeProcessCovs(reports).result;
  if (!Array.isArray(merged)) throw new Error("Node coverage merge failed");
  return merged as Profile[];
}

export function aggregate(
  inventories: Map<string, FileCoverage>[],
  directory: string,
): { total: Metrics; files: string[] } {
  const lib = istanbul();
  const map = lib.coverage.createCoverageMap({});
  const seen = new Set<string>();
  for (const inventory of inventories)
    for (const [filePath, file] of inventory) {
      const canonical = realpathSync(filePath);
      if (seen.has(canonical)) throw new Error(`aggregate repeats an aliased source: ${canonical}`);
      seen.add(canonical);
      map.addFileCoverage({ ...file, path: canonical });
    }
  mkdirSync(directory, { recursive: true });
  const context = lib.reporting.createContext({ dir: directory, coverageMap: map });
  for (const name of ["json", "json-summary", "lcovonly", "text"]) lib.reporters.create(name).execute(context);
  const summary = JSON.parse(readFileSync(join(directory, "coverage-summary.json"), "utf8"));
  return { total: summaryCounts(summary.total), files: [...seen].sort() };
}
