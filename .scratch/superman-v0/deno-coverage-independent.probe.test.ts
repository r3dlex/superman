import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DerivedFile, DeriveInput, Metrics, Profile, SourceMap } from "./deno-coverage-independent.ts";
import { deriveAggregate, deriveFile } from "./deno-coverage-independent.ts";
import {
  bindProfile,
  codeBody,
  extractInlineMap,
  parseProfiles,
  requireToolIdentities,
  validateLoadedProfile,
} from "./deno-coverage-measurement.ts";

const covered = "export function covered(n) {\n  const doubled = n * 2;\n  return doubled + 1;\n}\n";

type Range = Profile["functions"][number]["ranges"][number];

function synthetic(
  code: string,
  options: { ranges?: Range[]; unloaded?: boolean; original?: string; mappings?: string; filePath?: string } = {},
): Promise<DerivedFile> {
  const filePath = options.filePath ?? "/owned/oracle.js";
  const original = options.original ?? code;
  return deriveFile({
    filePath,
    code,
    original: Buffer.from(original),
    ...(options.mappings !== undefined
      ? {
          sourceMap: {
            version: 3,
            sources: [filePath],
            sourcesContent: [original],
            names: [],
            mappings: options.mappings,
          },
        }
      : {}),
    profile: {
      scriptId: "synthetic",
      url: new URL(`file://${filePath}`).href,
      functions: options.unloaded
        ? []
        : [
            {
              functionName: "",
              isBlockCoverage: true,
              ranges: [{ startOffset: 0, endOffset: code.length, count: 1 }, ...(options.ranges ?? [])],
            },
          ],
    },
    role: options.unloaded ? "unloaded" : "loaded",
  });
}

function expectMetrics(file: Pick<DerivedFile, "metrics">, expected: [number, number][]): void {
  assert.deepEqual(file.metrics, {
    lines: [...expected[0], 0],
    statements: [...expected[1], 0],
    branches: [...expected[2], 0],
    functions: [...expected[3], 0],
  });
}

function fixtureRoot(name: string): string {
  const root = process.env.SUPERMAN_INDEPENDENT_ROOT;
  if (!root) throw new Error("SUPERMAN_INDEPENDENT_ROOT is required");
  return realpathSync(mkdtempSync(join(realpathSync(root), `${name}-`)));
}

test("a fully hit identity function reports its hand-counted counters", async () => {
  const derived = await deriveFile({
    filePath: "/owned/covered.js",
    code: covered,
    original: Buffer.from(covered),
    profile: {
      scriptId: "1",
      url: "file:///owned/covered.js",
      functions: [
        {
          functionName: "",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: covered.length, count: 1 }],
        },
      ],
    },
    role: "loaded",
  });
  assert.deepEqual(
    derived.statements.map((statement) => ({
      generatedOffset: statement.generatedOffset,
      line: statement.loc.start.line,
      column: statement.loc.start.column,
      hits: statement.hits,
    })),
    [
      { generatedOffset: 37, line: 2, column: 18, hits: 1 },
      { generatedOffset: 56, line: 3, column: 2, hits: 1 },
    ],
  );
  assert.deepEqual(
    derived.functions.map((fn) => ({ generatedOffset: fn.generatedOffset, hits: fn.hits })),
    [{ generatedOffset: 7, hits: 1 }],
  );
  assert.deepEqual(derived.branches, []);
  assert.deepEqual(derived.metrics, {
    lines: [2, 2, 0],
    statements: [2, 2, 0],
    branches: [0, 0, 0],
    functions: [1, 1, 0],
  });
});

test("S5-O2 explicit else retains its uncovered arm and return", async () => {
  const file = await synthetic("export function choose(n) {\n  if (n) return 1;\n  else return 2;\n}\n", {
    ranges: [{ startOffset: 54, endOffset: 63, count: 0 }],
  });
  expectMetrics(file, [
    [1, 2],
    [2, 3],
    [1, 2],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[1, 0]],
  );
});

test("S5-O3 then-hit preserves the implicit else denominator", async () => {
  const file = await synthetic("export function choose(n) {\n  if (n) return 1;\n  return 2;\n}\n", {
    ranges: [{ startOffset: 49, endOffset: 58, count: 0 }],
  });
  expectMetrics(file, [
    [1, 2],
    [2, 3],
    [1, 2],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[1, 0]],
  );
  assert.deepEqual(file.branches[0].arms[1].loc, { implicit: true });
});

test("S5-O4 expression arrows preserve conditional and flattened logical arms", async () => {
  const file = await synthetic(
    "export const choose = (n) => n ? 1 : 2;\nexport const both = (a, b, c) => a && (b || c);\n",
    {
      ranges: [
        { startOffset: 37, endOffset: 38, count: 0 },
        { startOffset: 84, endOffset: 85, count: 0 },
      ],
    },
  );
  expectMetrics(file, [
    [2, 2],
    [4, 4],
    [3, 5],
    [2, 2],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [
      [1, 0],
      [1, 1, 0],
    ],
  );
});

test("S5-O5 switch retains all actual case and default arms", async () => {
  const file = await synthetic(
    "export function pick(n) {\n  switch (n) {\n    case 1: return 1;\n    case 2: return 2;\n    default: return 3;\n  }\n}\n",
    {
      ranges: [
        { startOffset: 67, endOffset: 84, count: 0 },
        { startOffset: 89, endOffset: 107, count: 0 },
      ],
    },
  );
  expectMetrics(file, [
    [2, 4],
    [2, 4],
    [1, 3],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[1, 0, 0]],
  );
});

test("S5-O6 declarations expressions arrows and methods each count once", async () => {
  const file = await synthetic(
    "export function declared() { return 1; }\nexport const expression = function named() { return 2; };\nexport const arrow = () => 3;\nexport const object = { method() { return 4; }, value: function () { return 5; } };\nexport class Box { field = 6; method() { return 7; } }\n",
  );
  expectMetrics(file, [
    [5, 5],
    [10, 10],
    [0, 0],
    [6, 6],
  ]);
  assert.equal(file.functions.length, 6);
});

test("S5-O7 default argument retains its unhit right-hand arm", async () => {
  const file = await synthetic("export function defaults(n = 1) {\n  return n;\n}\n", {
    ranges: [{ startOffset: 29, endOffset: 30, count: 0 }],
  });
  expectMetrics(file, [
    [1, 1],
    [1, 1],
    [0, 1],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[0]],
  );
});

test("S5-O8 loop and control statements retain their own and contained counters", async () => {
  const file = await synthetic(
    "export function flow(xs) {\n  let out = 0;\n  outer: for (let i = 0; i < 2; i++) {\n    if (i) continue outer;\n    out += i;\n    break;\n  }\n  for (const x of xs) out += x;\n  for (const k in xs) out += 1;\n  while (out < 1) out++;\n  do { out--; } while (out > 1);\n  try { if (!xs) throw 1; } catch { out = 0; }\n  debugger;\n  return out;\n}\n",
  );
  expectMetrics(file, [
    [12, 12],
    [22, 22],
    [2, 4],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [
      [1, 0],
      [1, 0],
    ],
  );
});

test("S5-O11 equal original statement spans retain the last hit", async () => {
  const file = await synthetic("a(); b();\n", {
    original: "call();\n",
    mappings: "AAAA",
    ranges: [{ startOffset: 5, endOffset: 9, count: 0 }],
  });
  expectMetrics(file, [
    [0, 1],
    [0, 1],
    [0, 0],
    [0, 0],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [0],
  );
});

test("S5-O12 equal original function declarations add hits once", async () => {
  const file = await synthetic("function a() {}\nfunction b() {}\n", {
    original: "function f() {}\n",
    mappings: "AAAA;AAAA",
  });
  expectMetrics(file, [
    [0, 0],
    [0, 0],
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    file.functions.map((fn) => fn.hits),
    [2],
  );
});

test("S5-O13 equal ordered original branch arms add hits once", async () => {
  const file = await synthetic("if (a) b(); else c();\nif (d) e(); else f();\n", {
    original: "if (value) call(); else other();\n",
    mappings: "AAAA;AAAA",
  });
  expectMetrics(file, [
    [1, 1],
    [1, 1],
    [2, 2],
    [0, 0],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[2, 2]],
  );
});

test("S5-O0 unloaded keeps both statements and its function", async () => {
  const file = await synthetic(covered, { unloaded: true });
  expectMetrics(file, [
    [0, 2],
    [0, 2],
    [0, 0],
    [0, 1],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [0, 0],
  );
});

test("S5-O0 declarator-unhit samples doubled rather than const", async () => {
  const file = await synthetic(covered, { ranges: [{ startOffset: 37, endOffset: 38, count: 0 }] });
  expectMetrics(file, [
    [1, 2],
    [1, 2],
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [0, 1],
  );
});

test("S5-O0 declaration-keyword-unhit does not hide a hit declarator", async () => {
  const file = await synthetic(covered, { ranges: [{ startOffset: 31, endOffset: 32, count: 0 }] });
  expectMetrics(file, [
    [2, 2],
    [2, 2],
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [1, 1],
  );
});

test("S5-O1 one hit statement covers their shared original line", async () => {
  const file = await synthetic("const a = 1; const b = 2;\n", {
    ranges: [{ startOffset: 19, endOffset: 20, count: 0 }],
  });
  expectMetrics(file, [
    [1, 1],
    [1, 2],
    [0, 0],
    [0, 0],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [1, 0],
  );
});

test("S5-O3 then-unhit credits the implicit else", async () => {
  const file = await synthetic("export function choose(n) {\n  if (n) return 1;\n  return 2;\n}\n", {
    ranges: [{ startOffset: 37, endOffset: 46, count: 0 }],
  });
  expectMetrics(file, [
    [2, 2],
    [2, 3],
    [1, 2],
    [1, 1],
  ]);
  assert.deepEqual(
    file.branches.map((branch) => branch.arms.map((arm) => arm.hits)),
    [[0, 1]],
  );
});

test("S5-O9 directives uninitialized declarators and blanks add no counters", async () => {
  const file = await synthetic('"use strict";\nlet value;\nconst initialized = 1;\n');
  expectMetrics(file, [
    [1, 1],
    [1, 1],
    [0, 0],
    [0, 0],
  ]);
});

test("S5-O10 source mapping changes location without changing the runtime hit offset", async () => {
  const file = await synthetic("value();\n", { original: "\n\n  value();\n", mappings: "AAEE" });
  expectMetrics(file, [
    [1, 1],
    [1, 1],
    [0, 0],
    [0, 0],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => ({
      generatedOffset: statement.generatedOffset,
      line: statement.loc.start.line,
      column: statement.loc.start.column,
    })),
    [{ generatedOffset: 0, line: 3, column: 2 }],
  );
});

test("S5-O14 equal-range-last-wins preserves raw input precedence", async () => {
  const file = await synthetic(covered, {
    ranges: [
      { startOffset: 37, endOffset: 49, count: 2 },
      { startOffset: 37, endOffset: 49, count: 3 },
    ],
  });
  expectMetrics(file, [
    [2, 2],
    [2, 2],
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [3, 1],
  );
});

test("S5-O14 nested-range-wins preserves an unhit inner range", async () => {
  const file = await synthetic(covered, {
    ranges: [
      { startOffset: 37, endOffset: 49, count: 3 },
      { startOffset: 37, endOffset: 38, count: 0 },
    ],
  });
  expectMetrics(file, [
    [1, 2],
    [1, 2],
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    file.statements.map((statement) => statement.hits),
    [0, 1],
  );
});

test("S5-A0 disjoint loaded and unloaded files aggregate once", async () => {
  const root = fixtureRoot("aggregate");
  const loadedPath = join(root, "loaded.js");
  const unloadedPath = join(root, "unloaded.js");
  writeFileSync(loadedPath, covered);
  writeFileSync(unloadedPath, covered);
  const files = [
    await synthetic(covered, { filePath: loadedPath }),
    await synthetic(covered, { filePath: unloadedPath, unloaded: true }),
  ];
  const result = deriveAggregate(files);
  expectMetrics({ metrics: result.total }, [
    [2, 4],
    [2, 4],
    [0, 0],
    [1, 2],
  ]);
  assert.deepEqual(result.files, [loadedPath, unloadedPath].sort());
});

test("S5-A1 duplicate source paths are rejected rather than counted twice", async () => {
  const root = fixtureRoot("duplicate");
  const filePath = join(root, "loaded.js");
  writeFileSync(filePath, covered);
  const file = await synthetic(covered, { filePath });
  assert.throws(() => deriveAggregate([file, file]), /aggregate repeats an aliased source/);
});

test("S5-A2 a symlink alias cannot add a second copy of a source", async () => {
  const root = fixtureRoot("alias");
  const filePath = join(root, "loaded.js");
  const alias = join(root, "alias.js");
  writeFileSync(filePath, covered);
  symlinkSync(filePath, alias);
  const file = await synthetic(covered, { filePath });
  assert.throws(() => deriveAggregate([file, { ...file, path: alias }]), /aggregate repeats an aliased source/);
});

type LockedFile = { path: string; bytes: number; sha256: string };
type FixtureSource = LockedFile & {
  source: string;
  role: "loaded" | "unloaded" | "test-only";
  lockedExpectedMetrics?: [number, number][];
};

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function saveJson(path: string, value: unknown): void {
  writeFileSync(
    path,
    `${JSON.stringify(
      value,
      (_key, item) => (typeof item === "number" && !Number.isFinite(item) ? String(item) : item),
      2,
    )}\n`,
  );
}

function runChild(root: string, label: string, executable: string, args: string[], env: Record<string, string>): void {
  const directory = join(root, "commands", label);
  mkdirSync(directory, { recursive: true });
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, {
    cwd: root,
    env,
    shell: false,
    timeout: 60_000,
    maxBuffer: 33_554_432,
  });
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  writeFileSync(join(directory, "stdout.txt"), stdout);
  writeFileSync(join(directory, "stderr.txt"), stderr);
  saveJson(join(directory, "receipt.json"), {
    started,
    finished: new Date().toISOString(),
    argv: [executable, ...args],
    cwd: root,
    env,
    timeout: 60_000,
    maxBuffer: 33_554_432,
    executableSha256: sha256(readFileSync(executable)),
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
  });
  assert.equal(result.error, undefined, `${label}: child launch/timeout/buffer error`);
  assert.equal(result.signal, null, `${label}: child signal`);
  assert.equal(result.status, 0, `${label}: ${stderr.toString("utf8")}`);
}

function selectProfiles(root: string, sources: FixtureSource[], profiles: Profile[]): Map<string, Profile> {
  const expected = new Map(sources.map((source) => [join(root, source.path), source]));
  const selected = new Map<string, Profile>();
  for (const profile of profiles) {
    const url = new URL(profile.url);
    assert.equal(url.protocol, "file:", `unexpected coverage URL: ${profile.url}`);
    assert.equal(url.search + url.hash, "", `non-plain coverage URL: ${profile.url}`);
    const path = fileURLToPath(url);
    assert.equal(realpathSync(path), path, `aliased coverage URL: ${profile.url}`);
    const source = expected.get(path);
    assert.ok(source, `unexpected coverage path: ${path}`);
    if (source.role === "test-only") continue;
    assert.equal(source.role, "loaded", `profile for unloaded source: ${path}`);
    assert.ok(!selected.has(path), `duplicate raw profile: ${path}`);
    selected.set(path, profile);
  }
  assert.deepEqual(
    [...selected.keys()].sort(),
    sources
      .filter((source) => source.role === "loaded")
      .map((source) => join(root, source.path))
      .sort(),
    "exact loaded inventory",
  );
  return selected;
}

function nodeProfiles(root: string, directory: string, sources: FixtureSource[]): Map<string, Profile> {
  const extracted = join(directory, "selected-inputs");
  mkdirSync(extracted);
  const selection: Array<{ rawFile: string; record: number; url: string; selected: boolean }> = [];
  for (const name of readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()) {
    const report = JSON.parse(readFileSync(join(directory, name), "utf8")) as { result?: unknown[] };
    assert.ok(Array.isArray(report.result), `malformed Node report: ${name}`);
    for (const [index, value] of report.result.entries()) {
      assert.ok(value && typeof value === "object", `invalid raw script: ${name}:${index}`);
      const profile = value as Profile;
      assert.equal(typeof profile.url, "string", `invalid raw URL: ${name}:${index}`);
      const selected = profile.url.startsWith("file:");
      // Only Node's internal non-file records can be ignored; unknown schemes stop acquisition.
      assert.ok(selected || profile.url.startsWith("node:"), `unexpected non-file script: ${profile.url}`);
      selection.push({ rawFile: name, record: index, url: profile.url, selected });
      if (selected) saveJson(join(extracted, `${selection.length}.json`), value);
    }
  }
  saveJson(join(extracted, "../selection.json"), selection);
  return selectProfiles(root, sources, parseProfiles(extracted));
}

function sameStructure(left: Map<string, Profile>, right: Map<string, Profile>): void {
  const structure = (profiles: Map<string, Profile>) =>
    [...profiles.values()]
      .map(({ scriptId: _scriptId, ...profile }) => profile)
      .sort((a, b) => a.url.localeCompare(b.url));
  assert.deepEqual(structure(left), structure(right), "independent-run raw structure, excluding script IDs");
}

function bindMap(filePath: string, original: Buffer, map: SourceMap): void {
  assert.equal(map.sources.length, 1, "single original source");
  assert.equal(map.sourcesContent?.length, 1, "single embedded source");
  const url = new URL(map.sources[0], pathToFileURL(filePath));
  assert.equal(url.protocol, "file:");
  assert.equal(url.search + url.hash, "");
  assert.equal(fileURLToPath(url), filePath, "map source is the canonical input");
  assert.equal(realpathSync(filePath), filePath);
  assert.ok(Buffer.from(map.sourcesContent?.[0] ?? "", "utf8").equals(original), "embedded original source bytes");
}

function expectedMetrics(tuples: [number, number][]): Metrics {
  return {
    lines: [...tuples[0], 0],
    statements: [...tuples[1], 0],
    branches: [...tuples[2], 0],
    functions: [...tuples[3], 0],
  };
}

test("fresh seven-file inputs independently reproduce every frozen metric", async (context) => {
  const root = fixtureRoot("seven-files");
  context.diagnostic(`Retained independent inputs and comparisons: ${root}`);
  const packetRoot = dirname(dirname(root));
  const manifestBytes = readFileSync(join(packetRoot, "packet-manifest.json"));
  assert.equal(sha256(manifestBytes), "80bc855e9b4a21c0dd11488f69087be0d76ee3d73130957dd19325cb5b53f2eb");
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as { files: LockedFile[] };
  for (const file of manifest.files)
    assert.equal(sha256(readFileSync(join(packetRoot, file.path))), file.sha256, file.path);
  const lock = JSON.parse(readFileSync(join(packetRoot, "fixture-lock.json"), "utf8")) as {
    fixtures: FixtureSource[];
    aggregate: [number, number][];
  };
  const tools = JSON.parse(readFileSync(join(packetRoot, "tools.json"), "utf8")) as {
    node: LockedFile;
    deno: LockedFile;
    env: LockedFile;
    packages: Array<{ package: LockedFile; artifacts: LockedFile[] }>;
  };
  const parser = JSON.parse(readFileSync(join(packetRoot, "parser-chain.json"), "utf8")) as LockedFile[];
  for (const file of [
    tools.node,
    tools.deno,
    tools.env,
    ...parser,
    ...tools.packages.flatMap((pkg) => [pkg.package, ...pkg.artifacts]),
  ]) {
    assert.equal(sha256(readFileSync(file.path)), file.sha256, file.path);
  }
  assert.equal(realpathSync(process.execPath), realpathSync(tools.node.path));
  assert.equal(process.env.SUPERMAN_DENO_BIN, tools.deno.path);
  requireToolIdentities();
  for (const name of ["home", "tmp", "emit", "inputs", "derived", "deno-dir", "deno-dir-reference"])
    mkdirSync(join(root, name));
  for (const name of [
    "packet-manifest.json",
    "execution-packet.json",
    "fixture-lock.json",
    "tools.json",
    "parser-chain.json",
  ]) {
    writeFileSync(join(root, name), readFileSync(join(packetRoot, name)));
  }
  for (const source of lock.fixtures) {
    assert.equal(sha256(source.source), source.sha256);
    assert.equal(Buffer.byteLength(source.source), source.bytes);
    const path = join(root, source.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source.source, { flag: "wx" });
  }
  const verifySources = () => {
    for (const source of lock.fixtures)
      assert.equal(sha256(readFileSync(join(root, source.path))), source.sha256, source.path);
  };
  const deno = (label: string, args: string[], reference = false) => {
    const env = {
      PATH: "/usr/bin:/bin",
      HOME: join(root, "home"),
      TMPDIR: join(root, "tmp"),
      DENO_DIR: join(root, reference ? "deno-dir-reference" : "deno-dir"),
      DENO_NO_UPDATE_CHECK: "1",
      DENO_NO_PACKAGE_JSON: "1",
      DENO_NO_PROMPT: "1",
      NO_COLOR: "1",
    };
    runChild(
      root,
      label,
      tools.env.path,
      ["-i", ...Object.entries(env).map(([key, value]) => `${key}=${value}`), tools.deno.path, ...args],
      {},
    );
    verifySources();
  };
  const denoSources = lock.fixtures.filter((source) => source.path.startsWith("pilot/"));
  const collected = [false, true].map((reference) => {
    const suffix = reference ? "-reference" : "";
    deno(
      `deno-run${suffix}`,
      [
        "run",
        "--no-prompt",
        "--no-config",
        "--no-lock",
        "--no-npm",
        "--no-remote",
        `--coverage=${join(root, `coverage${suffix}`)}`,
        join(root, "pilot/run.ts"),
      ],
      reference,
    );
    return selectProfiles(root, denoSources, parseProfiles(join(root, `coverage${suffix}`)));
  });
  sameStructure(collected[0], collected[1]);
  const inputs: DeriveInput[] = [];
  for (const source of denoSources) {
    const path = join(root, source.path);
    const original = readFileSync(path);
    const name = source.path.slice("pilot/".length, -3);
    const output = join(root, "emit", `${name}.js`);
    deno(`transpile-${name}`, [
      "transpile",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--no-remote",
      path,
      "-o",
      output,
      "--source-map",
      "inline",
    ]);
    const transformed = readFileSync(output, "utf8");
    const transformedMap = extractInlineMap(transformed);
    bindMap(path, original, transformedMap);
    assert.ok(codeBody(transformed).trim(), "nonempty Deno transform");
    saveJson(join(root, "emit", `${name}.map.json`), transformedMap);
    let code = transformed;
    let sourceMap = transformedMap;
    const profile = collected[0].get(path);
    if (profile) {
      const bound = bindProfile({ pilot: join(root, "pilot"), denoDir: join(root, "deno-dir") }, profile);
      const referenceProfile = collected[1].get(path);
      assert.ok(referenceProfile);
      const reference = bindProfile(
        { pilot: join(root, "pilot"), denoDir: join(root, "deno-dir-reference") },
        referenceProfile,
      );
      bindMap(path, original, bound.sourceMap);
      bindMap(path, original, reference.sourceMap);
      assert.equal(bound.runtimeCode, reference.runtimeCode, "executed emit identity across runs");
      assert.equal(codeBody(transformed), codeBody(bound.runtimeCode), "loaded transpile equals executed code body");
      code = bound.runtimeCode;
      sourceMap = bound.sourceMap;
    }
    assert.notEqual(source.role, "test-only");
    inputs.push({
      filePath: path,
      original,
      code,
      sourceMap,
      profile: profile ?? { scriptId: "", url: pathToFileURL(path).href, functions: [] },
      role: source.role as "loaded" | "unloaded",
    });
  }
  for (const leg of ["node", "rule"] as const) {
    const sources = lock.fixtures.filter((source) => source.path.startsWith(`${leg}/`));
    const harness = sources.find((source) => source.role === "test-only");
    assert.ok(harness);
    const profiles = [false, true].map((reference) => {
      const label = `${leg}-v8${reference ? "-reference" : ""}`;
      const rawDirectory = join(root, label);
      mkdirSync(rawDirectory);
      runChild(
        root,
        label,
        tools.node.path,
        ["--test", "--test-concurrency=1", "--test-reporter=tap", join(root, harness.path)],
        {
          PATH: "/usr/bin:/bin",
          HOME: join(root, "home"),
          TMPDIR: join(root, "tmp"),
          NODE_V8_COVERAGE: rawDirectory,
        },
      );
      verifySources();
      return nodeProfiles(root, rawDirectory, sources);
    });
    sameStructure(profiles[0], profiles[1]);
    for (const source of sources) {
      if (source.role === "test-only") continue;
      const filePath = join(root, source.path);
      const original = readFileSync(filePath);
      const code = stripTypeScriptTypes(original.toString("utf8"));
      assert.equal(code.length, original.toString("utf8").length, "Node transform preserves UTF-16 offsets");
      const profile = profiles[0].get(filePath);
      if (profile) validateLoadedProfile(filePath, code, profile, true);
      inputs.push({
        filePath,
        original,
        code,
        role: source.role,
        allowOversizedTopLevel: true,
        profile: profile ?? { scriptId: "", url: pathToFileURL(filePath).href, functions: [] },
      });
    }
  }
  verifySources();
  const files: DerivedFile[] = [];
  for (const [index, input] of inputs.entries()) {
    saveJson(join(root, "inputs", `${index}.json`), {
      ...input,
      original: input.original.toString("utf8"),
      originalSha256: sha256(input.original),
      runtimeSha256: sha256(input.code),
    });
    const file = await deriveFile(input);
    files.push(file);
    saveJson(join(root, "derived", `${index}.json`), file);
  }
  const aggregate = deriveAggregate(files);
  const measuredSources = lock.fixtures.filter((source) => source.role !== "test-only");
  const comparisons = measuredSources.map((source) => {
    assert.ok(source.lockedExpectedMetrics);
    const expected = expectedMetrics(source.lockedExpectedMetrics);
    const actual = files.find((file) => file.path === join(root, source.path))?.metrics;
    return { path: source.path, expected, actual, equal: JSON.stringify(expected) === JSON.stringify(actual) };
  });
  const expectedTotal = expectedMetrics(lock.aggregate);
  saveJson(join(root, "comparison.json"), {
    files: comparisons,
    aggregate: {
      expected: expectedTotal,
      actual: aggregate.total,
      equal: JSON.stringify(expectedTotal) === JSON.stringify(aggregate.total),
    },
    canonicalPaths: aggregate.files,
  });
  assert.deepEqual(aggregate.files, measuredSources.map((source) => join(root, source.path)).sort());
  for (const row of comparisons) assert.deepEqual(row.actual, row.expected, row.path);
  assert.deepEqual(aggregate.total, expectedTotal);
});
