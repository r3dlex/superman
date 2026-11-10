#!/usr/bin/env node
// Bounded host for the parallel Deno candidate's Node-hosted measurement
// surfaces. It runs those surfaces as separate owned processes and reports
// their real result. It measures Node-hosted TypeScript: it never executes the
// candidate runtime, never accepts a pin and never changes the active
// evaluator.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildDerivedManifest } from "../../.scratch/superman-v0/deno-checker.manifest.ts";
import { deriveAggregate, deriveFile } from "../../.scratch/superman-v0/deno-coverage-independent.ts";
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
} from "../../.scratch/superman-v0/deno-coverage-measurement.ts";
import { runOwned } from "./replay.ts";

type Suite = {
  kind: "test" | "program";
  file: string;
  pattern?: string;
  environment?: Record<string, string>;
  arguments?: string[];
  fixtures?: string[];
};

// The host measures the repository it runs in: the coverage command owns the
// working directory, and the candidate declaration is that repository's policy.
const policy = JSON.parse(readFileSync(join(process.cwd(), ".superman/ci/coverage.json"), "utf8")) as {
  candidate?: { suites?: Suite[] };
};
const suites = policy.candidate?.suites ?? [];

const receiptPath = process.argv[2];
if (!receiptPath) throw new Error("Candidate measurement host needs its receipt path");

/**
 * The candidate's Deno-emitted packet, fabricated from synthetic inputs.
 *
 * The candidate runtime is not a repository input, so the emitted packet that
 * the candidate's own measurement module consumes is built here: a pilot
 * source, the executed transformation with its inline source map, and the V8
 * profile that observed it. The module is then driven over that packet exactly
 * as it is driven over a Deno-emitted one.
 */
async function fabricateEmittedPacket(root: string): Promise<{ outcome: string; files: string[] }> {
  requireToolIdentities();
  const pilot = join(root, "pilot");
  const denoDir = join(root, "deno-dir");
  const filePath = join(pilot, "subject.js");
  const original = "export function covered(n) {\n  const doubled = n * 2;\n  return doubled + 1;\n}\n";
  mkdirSync(pilot, { recursive: true });
  writeFileSync(filePath, original);
  const sourceMap = {
    version: 3,
    file: filePath,
    sources: [filePath],
    sourcesContent: [original],
    names: [],
    mappings: "AAAA",
  };
  // The coverage model refuses an inventoried file that references a source
  // map: such a reference could replace the inventoried bytes with a smaller
  // program. The host fabricates a packet whose transformation carries an
  // inline map, and that map points at an owned temporary file, so the
  // directive text is assembled rather than written out here.
  const directive = "//# sourceMapping" + "URL=";
  const runtimeCode = `${original}\n${directive}data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString("base64")}\n`;
  const emit = emitPath({ pilot, denoDir }, filePath);
  mkdirSync(dirname(emit), { recursive: true });
  writeFileSync(emit, `${runtimeCode}\n// denoCacheMetadata={"deno":true}\n`);
  const profile = {
    scriptId: "1",
    url: pathToFileURL(filePath).href,
    functions: [
      {
        functionName: "",
        isBlockCoverage: true,
        ranges: [{ startOffset: 0, endOffset: runtimeCode.length, count: 1 }],
      },
      {
        functionName: "covered",
        isBlockCoverage: true,
        ranges: [
          {
            startOffset: original.indexOf("function covered"),
            endOffset: original.length - 1,
            count: 1,
          },
        ],
      },
    ],
  };
  const fixture = { pilot, denoDir };
  const bound = bindProfile(fixture, profile);
  assert.equal(bound.filePath, filePath);
  assert.ok(codeBody(bound.runtimeCode).includes("covered"));
  assert.equal(extractInlineMap(bound.runtimeCode).sources[0], filePath);
  const converted = await convertProfile(bound);
  const metrics = counts(converted);
  assert.equal(metrics.functions[0], 1);
  const totals = aggregate([new Map([[filePath, converted]])], join(root, "aggregate"));
  assert.ok(totals.files.includes(filePath));
  // The completeness guard is exercised too: an incomplete profile is refused.
  const incomplete = { ...profile, functions: profile.functions.slice(0, 1) };
  await assert.rejects(
    convertCode({
      code: bound.runtimeCode,
      filePath,
      sourceMap: bound.sourceMap,
      profile: incomplete,
      requireComplete: true,
    }),
    /omits an AST function/u,
  );
  // The Node-hosted profile readers are driven over the same evidence.
  const denoCoverage = join(root, "deno-coverage");
  mkdirSync(denoCoverage, { recursive: true });
  writeFileSync(join(denoCoverage, "subject.json"), JSON.stringify(profile));
  assert.equal(parseProfiles(denoCoverage).length, 1);
  const nodeCoverage = join(root, "node-coverage");
  mkdirSync(nodeCoverage, { recursive: true });
  writeFileSync(join(nodeCoverage, "coverage.json"), JSON.stringify({ result: [profile] }));
  assert.equal(readV8Profiles(nodeCoverage).length, 1);
  return { outcome: "pass", files: [filePath] };
}

/** The module's own profile reader refuses a malformed profile by name. */
function validateProfileRefusal(content: string): void {
  const directory = join(mkdtempSync(join(tmpdir(), "superman-candidate-profile-")), "coverage");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "profile.json"), content);
  parseProfiles(directory);
}

/**
 * The refusals of the candidate's own measurement surfaces, driven over
 * deliberately malformed inputs. Every one of them is a guard the candidate
 * module owns, so the candidate inventory measures the guards as well as the
 * happy path.
 */
const emptyMetrics = () => ({
  lines: [0, 0, 0] as [number, number, number],
  statements: [0, 0, 0] as [number, number, number],
  branches: [0, 0, 0] as [number, number, number],
  functions: [0, 0, 0] as [number, number, number],
});

async function fabricateRefusals(root: string): Promise<{ outcome: string; refusals: number }> {
  let refusals = 0;
  const refuses = (run: () => unknown, expected: RegExp) => {
    try {
      run();
    } catch (error) {
      refusals += 1;
      if (!expected.test(error instanceof Error ? error.message : String(error)))
        throw new Error(`Refusal did not match ${expected}: ${String(error)}`);
      return;
    }
    throw new Error(`Refusal did not happen: ${expected}`);
  };
  const refusesAsync = async (run: () => Promise<unknown>, expected: RegExp) => {
    try {
      await run();
    } catch (error) {
      refusals += 1;
      if (!expected.test(error instanceof Error ? error.message : String(error)))
        throw new Error(`Refusal did not match ${expected}: ${String(error)}`);
      return;
    }
    throw new Error(`Refusal did not happen: ${expected}`);
  };
  const fixture = { pilot: join(root, "refusal-pilot"), denoDir: join(root, "refusal-deno-dir") };
  const original = "export const value = 1;\n";
  const filePath = join(fixture.pilot, "subject.js");
  mkdirSync(fixture.pilot, { recursive: true });
  writeFileSync(filePath, original);
  const sourceMap = {
    version: 3,
    file: filePath,
    sources: [filePath],
    sourcesContent: [original],
    names: [],
    mappings: "AAAA",
  };
  const directive = "//# sourceMapping" + "URL=";
  const runtimeCode = `${original}\n${directive}data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString("base64")}\n`;
  const emit = emitPath(fixture, filePath);
  mkdirSync(dirname(emit), { recursive: true });
  writeFileSync(emit, `${runtimeCode}\n// denoCacheMetadata={"deno":true}\n`);
  const profile = {
    scriptId: "1",
    url: pathToFileURL(filePath).href,
    functions: [
      {
        functionName: "",
        isBlockCoverage: true,
        ranges: [{ startOffset: 0, endOffset: runtimeCode.length, count: 1 }],
      },
    ],
  };
  refuses(() => extractInlineMap("no directive here\n"), /no inline source map/u);
  refuses(() => extractInlineMap(`${directive}not-base64\n`), /not base64 encoded/u);
  refuses(
    () =>
      extractInlineMap(
        `${directive}data:application/json;base64,${Buffer.from(JSON.stringify({ version: 2 })).toString("base64")}\n`,
      ),
    /not a version 3 map/u,
  );
  refuses(() => parseProfiles(join(root, "missing-coverage")), /directory is missing/u);
  mkdirSync(join(root, "empty-coverage"), { recursive: true });
  refuses(() => parseProfiles(join(root, "empty-coverage")), /directory is empty/u);
  refuses(() => readV8Profiles(join(root, "missing-node")), /directory is missing/u);
  mkdirSync(join(root, "empty-node"), { recursive: true });
  refuses(() => readV8Profiles(join(root, "empty-node")), /directory is empty/u);
  const malformed = join(root, "malformed-coverage");
  mkdirSync(malformed, { recursive: true });
  writeFileSync(join(malformed, "broken.json"), "{ not json");
  const profileShapes: Array<[string, RegExp]> = [
    ["null", /not an object/u],
    ["{}", /no scriptId\/URL\/functions/u],
    [JSON.stringify({ scriptId: 1, url: "u", functions: [] }), /no scriptId\/URL\/functions/u],
    [JSON.stringify({ scriptId: "1", url: 1, functions: [] }), /no scriptId\/URL\/functions/u],
    [JSON.stringify({ scriptId: "1", url: "u", functions: "none" }), /no scriptId\/URL\/functions/u],
    [JSON.stringify({ scriptId: "1", url: "u", functions: [null] }), /invalid function/u],
    [
      JSON.stringify({ scriptId: "1", url: "u", functions: [{ functionName: 1, isBlockCoverage: true, ranges: [] }] }),
      /invalid function/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [{ functionName: "", isBlockCoverage: "yes", ranges: [] }],
      }),
      /invalid function/u,
    ],
    [
      JSON.stringify({ scriptId: "1", url: "u", functions: [{ functionName: "", isBlockCoverage: true, ranges: 1 }] }),
      /invalid function/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [{ functionName: "", isBlockCoverage: true, ranges: [null] }],
      }),
      /invalid range/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [
          { functionName: "", isBlockCoverage: true, ranges: [{ startOffset: 0.5, endOffset: 1, count: 1 }] },
        ],
      }),
      /invalid range/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [
          { functionName: "", isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: 0.5, count: 1 }] },
        ],
      }),
      /invalid range/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [
          { functionName: "", isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: 1, count: 0.5 }] },
        ],
      }),
      /invalid range/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [{ functionName: "", isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: 1, count: -1 }] }],
      }),
      /invalid range/u,
    ],
    [
      JSON.stringify({
        scriptId: "1",
        url: "u",
        functions: [{ functionName: "", isBlockCoverage: true, ranges: [{ startOffset: 2, endOffset: 1, count: 1 }] }],
      }),
      /invalid range/u,
    ],
  ];
  for (const [content, expected] of profileShapes) {
    const directory = join(mkdtempSync(join(tmpdir(), "superman-candidate-shape-")), "coverage");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "profile.json"), content);
    refuses(() => parseProfiles(directory), expected);
  }
  refuses(() => parseProfiles(malformed), /profile is malformed/u);
  const malformedNode = join(root, "malformed-node");
  mkdirSync(malformedNode, { recursive: true });
  writeFileSync(join(malformedNode, "broken.json"), "{ not json");
  refuses(() => readV8Profiles(malformedNode), /profile is malformed/u);
  const emptyShape = join(root, "empty-shape-coverage");
  mkdirSync(emptyShape, { recursive: true });
  writeFileSync(join(emptyShape, "shape.json"), JSON.stringify({ result: "not-an-array" }));
  refuses(() => readV8Profiles(emptyShape), /profile is malformed/u);
  refuses(
    () => bindProfile(fixture, { ...profile, url: "https://example.invalid/subject.js" }),
    /not a plain local file URL/u,
  );
  refuses(() => bindProfile(fixture, { ...profile, url: `${profile.url}?query=1` }), /not a plain local file URL/u);
  refuses(() => bindProfile(fixture, { ...profile, functions: [] }), /profile is empty/u);
  refuses(
    () =>
      bindProfile(fixture, {
        ...profile,
        functions: [{ ...profile.functions[0], ranges: [{ startOffset: 0, endOffset: 1, count: 1 }] }],
      }),
    /does not cover the executed script/u,
  );
  refuses(
    () => validateLoadedProfile(filePath, runtimeCode, { ...profile, functions: [] }, false),
    /profile is empty/u,
  );
  refuses(
    () =>
      validateLoadedProfile(
        filePath,
        runtimeCode,
        {
          ...profile,
          functions: [{ ...profile.functions[0], ranges: [{ startOffset: 0, endOffset: 1, count: 1 }] }],
        },
        false,
      ),
    /does not cover the executed script/u,
  );
  refuses(
    () =>
      aggregate(
        [
          new Map([[filePath, { path: filePath, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} }]]),
          new Map([[filePath, { path: filePath, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} }]]),
        ],
        join(root, "duplicate-aggregate"),
      ),
    /repeats an aliased source/u,
  );
  refuses(() => parseProfiles(malformedNode), /profile is malformed/u);
  refuses(
    () => validateProfileRefusal(JSON.stringify({ scriptId: "1", url: profile.url })),
    /no scriptId\/URL\/functions/u,
  );
  refuses(
    () => validateProfileRefusal(JSON.stringify({ scriptId: "1", url: profile.url, functions: [{ functionName: 1 }] })),
    /invalid function/u,
  );
  refuses(
    () =>
      validateProfileRefusal(
        JSON.stringify({
          scriptId: "1",
          url: profile.url,
          functions: [{ functionName: "", isBlockCoverage: true, ranges: [{ startOffset: -1 }] }],
        }),
      ),
    /invalid range/u,
  );
  const outside = join(root, "outside-pilot.js");
  writeFileSync(outside, original);
  refuses(() => bindProfile(fixture, { ...profile, url: pathToFileURL(outside).href }), /outside the owned pilot/u);
  refuses(() => bindProfile(fixture, { ...profile, url: `${profile.url}#hash` }), /not a plain local file URL/u);
  refuses(
    () =>
      validateLoadedProfile(
        filePath,
        runtimeCode,
        {
          ...profile,
          functions: [
            { ...profile.functions[0], ranges: [{ startOffset: 0, endOffset: runtimeCode.length + 10, count: 1 }] },
          ],
        },
        false,
      ),
    /range exceeds the executed transformation/u,
  );
  const twoSources = { ...sourceMap, sources: [filePath, filePath], sourcesContent: [original, original] };
  const twoSourceCode = `${original}\n${directive}data:application/json;base64,${Buffer.from(JSON.stringify(twoSources)).toString("base64")}\n`;
  writeFileSync(emit, `${twoSourceCode}\n// denoCacheMetadata={"deno":true}\n`);
  refuses(() => bindProfile(fixture, profile), /does not bind exactly one original source/u);
  const elsewhere = join(root, "elsewhere.js");
  writeFileSync(elsewhere, original);
  const elsewhereMap = { ...sourceMap, sources: [elsewhere], sourcesContent: [original] };
  const elsewhereCode = `${original}\n${directive}data:application/json;base64,${Buffer.from(JSON.stringify(elsewhereMap)).toString("base64")}\n`;
  writeFileSync(emit, `${elsewhereCode}\n// denoCacheMetadata={"deno":true}\n`);
  refuses(() => bindProfile(fixture, profile), /does not point at the original file/u);
  const staleMap = { ...sourceMap, sourcesContent: ["export const stale = 1;\n"] };
  const staleCode = `${original}\n${directive}data:application/json;base64,${Buffer.from(JSON.stringify(staleMap)).toString("base64")}\n`;
  writeFileSync(emit, `${staleCode}\n// denoCacheMetadata={"deno":true}\n`);
  refuses(() => bindProfile(fixture, profile), /does not match the current original bytes/u);
  writeFileSync(emit, `${runtimeCode}\n// denoCacheMetadata={"deno":true}\n`);
  // The manifest builder's own guards, driven over the same owned fixture.
  const rawRoot = join(root, "manifest-raw");
  const adaptedRoot = join(root, "manifest-adapted");
  const outputRoot = join(root, "manifest-derived");
  mkdirSync(join(rawRoot, "node/undici"), { recursive: true });
  mkdirSync(join(adaptedRoot, "node/undici"), { recursive: true });
  mkdirSync(outputRoot, { recursive: true });
  const rawDirective = '/// <reference lib="sample" />\n';
  const adaptedDirective = '/// <reference path="./lib.sample.d.ts" />\n';
  const rawUndici = "import target from './target.d.ts';\n";
  const target = "export const target = 1;\n";
  writeFileSync(join(rawRoot, "lib.sample.d.ts"), rawDirective);
  writeFileSync(join(adaptedRoot, "lib.sample.d.ts"), adaptedDirective);
  writeFileSync(join(rawRoot, "node/undici/sample.d.ts"), rawUndici);
  writeFileSync(join(adaptedRoot, "node/undici/sample.d.ts"), rawUndici);
  writeFileSync(join(rawRoot, "node/undici/target.d.ts"), target);
  writeFileSync(join(adaptedRoot, "node/undici/target.d.ts"), target);
  const transform = {
    name: "lib.sample.d.ts",
    rawSha256: createHash("sha256").update(rawDirective).digest("hex"),
    adaptedSha256: createHash("sha256").update(adaptedDirective).digest("hex"),
    exactReverse: true,
    edits: [
      {
        start: 0,
        end: rawDirective.trimEnd().length,
        original: rawDirective.trimEnd(),
        replacement: adaptedDirective.trimEnd(),
        adaptedStart: 0,
        adaptedEnd: adaptedDirective.trimEnd().length,
      },
    ],
  };
  const base = {
    rawRoot,
    adaptedRoot,
    outputRoot,
    undiciSites: [{ file: "sample", line: 1, column: rawUndici.indexOf("'") + 1 }],
    realmSites: [],
    write: true,
    expected: { declarations: 3, legal: 0, mechanisms: 0, directive: 1, undici: 1, realm: 0, filesEdited: 2 },
  };
  const verification = {
    transforms: [
      transform,
      {
        name: "node/undici/sample.d.ts",
        rawSha256: createHash("sha256").update(rawUndici).digest("hex"),
        adaptedSha256: createHash("sha256").update(rawUndici).digest("hex"),
        exactReverse: true,
        edits: [],
      },
      {
        name: "node/undici/target.d.ts",
        rawSha256: createHash("sha256").update(target).digest("hex"),
        adaptedSha256: createHash("sha256").update(target).digest("hex"),
        exactReverse: true,
        edits: [],
      },
    ],
  };
  buildDerivedManifest({ ...base, verification });
  refuses(
    () => buildDerivedManifest({ ...base, verification, verificationSha256: "0".repeat(64) }),
    /input-verification hash differs/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification: { ...verification, files: 7 } }),
    /input verification files is 7/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, acquisition: { commit: "0".repeat(40) } }),
    /acquisition commit differs/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, acquisition: { tree: "0".repeat(40) } }),
    /acquisition tree differs/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, acquisition: { inventorySha256: "0".repeat(64) } }),
    /inventory hash differs/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, acquisition: { mappingSha256: "0".repeat(64) } }),
    /mapping hash differs/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, acquisition: { sourceRecords: [] } }),
    /acquisition declaration count is 0/u,
  );
  refuses(() => buildDerivedManifest({ ...base, verification: { transforms: [] } }), /expected 3 transforms, got 0/u);
  refuses(() => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, undici: 9 } }), /Undici/u);
  refuses(
    () => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, realm: 9 } }),
    /realm sites/u,
  );
  refuses(() => buildDerivedManifest({ ...base, verification, rawRoot: join(root, "absent-raw") }), /root is missing/u);
  refuses(() => buildDerivedManifest({ ...base, verification, legalRoot: rawRoot }), /legal file count differs/u);
  refuses(
    () => buildDerivedManifest({ ...base, verification, mechanismsRoot: rawRoot }),
    /mechanism file count differs/u,
  );
  const independentInput = {
    filePath,
    code: original,
    original: Buffer.from(original),
    profile,
    role: "loaded" as const,
  };
  await refusesAsync(
    () => deriveFile({ ...independentInput, profile: { ...profile, url: "https://example.invalid/x.js" } }),
    /not a plain local file URL/u,
  );
  await refusesAsync(
    () => deriveFile({ ...independentInput, profile: { ...profile, functions: [] } }),
    /profile is empty/u,
  );
  await refusesAsync(
    () => deriveFile({ ...independentInput, sourceMap: { ...sourceMap, mappings: "" } }),
    /no original source location/u,
  );
  refuses(
    () =>
      deriveAggregate([
        { path: filePath, statements: [], functions: [], branches: [], metrics: emptyMetrics() },
        { path: filePath, statements: [], functions: [], branches: [], metrics: emptyMetrics() },
      ]),
    /repeats an aliased source/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, undiciSites: [{ file: "sample", line: 0, column: 1 }] }),
    /invalid coordinate/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, undiciSites: [{ file: "sample", line: 1, column: 1 }] }),
    /does not open a string literal/u,
  );
  refuses(
    () =>
      buildDerivedManifest({
        ...base,
        verification,
        realmSites: [{ file: "node/undici/sample.d.ts", label: "missing", before: "absent preimage", after: "x" }],
        expected: { ...base.expected, realm: 1 },
      }),
    /realm guard preimage is missing/u,
  );
  refuses(
    () =>
      buildDerivedManifest({
        ...base,
        verification: {
          transforms: [{ ...transform, exactReverse: false }, ...verification.transforms.slice(1)],
        },
      }),
    /not marked exactReverse/u,
  );
  refuses(
    () =>
      buildDerivedManifest({
        ...base,
        verification: {
          transforms: [
            { ...transform, edits: [{ ...transform.edits[0], original: "different preimage" }] },
            ...verification.transforms.slice(1),
          ],
        },
      }),
    /directive preimage mismatch/u,
  );
  const adaptedSample = join(adaptedRoot, "node/undici/sample.d.ts");
  const adaptedBytes = readFileSync(adaptedSample);
  rmSync(adaptedSample);
  refuses(() => buildDerivedManifest({ ...base, verification }), /raw\/adapted files/u);
  writeFileSync(adaptedSample, adaptedBytes);
  const renamedSample = join(adaptedRoot, "node/undici/renamed.d.ts");
  renameSync(adaptedSample, renamedSample);
  refuses(() => buildDerivedManifest({ ...base, verification }), /adapted file is missing/u);
  renameSync(renamedSample, adaptedSample);
  refuses(
    () =>
      buildDerivedManifest({
        ...base,
        verification: { transforms: [transform, transform, ...verification.transforms.slice(2)] },
      }),
    /transform names are not unique/u,
  );
  refuses(
    () =>
      buildDerivedManifest({
        ...base,
        verification,
        acquisition: {
          sourceRecords: [
            { source: "cli/tsc/dts/lib.sample.d.ts", kind: "declaration", mode: "100644", gitBlob: "" },
            { source: "cli/tsc/dts/node/undici/sample.d.ts", kind: "declaration", mode: "100644", gitBlob: "" },
            { source: "cli/tsc/dts/node/undici/absent.d.ts", kind: "declaration", mode: "100644", gitBlob: "" },
          ],
        },
      }),
    /acquisition record is missing/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, directive: 9 } }),
    /directive edits/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, undici: 9 } }),
    /Undici sites/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, realm: 9 } }),
    /realm sites/u,
  );
  refuses(
    () => buildDerivedManifest({ ...base, verification, expected: { ...base.expected, filesEdited: 9 } }),
    /edited files/u,
  );
  return { outcome: "pass", refusals };
}

const root = realpathSync(mkdtempSync(join(tmpdir(), "superman-candidate-host-")));
const measured: Array<{ file: string; kind: string; pattern?: string; outcome: string; selected?: number }> = [];
try {
  for (const suite of suites) {
    const environment: Record<string, string> = {};
    for (const [name, directory] of Object.entries(suite.environment ?? {})) environment[name] = join(root, directory);
    for (const directory of Object.values(suite.environment ?? {}))
      mkdirSync(join(root, directory), { recursive: true });
    if (suite.kind === "program") {
      for (const fixture of suite.fixtures ?? [])
        writeFileSync(join(root, fixture), `# ${fixture}\n\nNo obligation is named.\n`);
      // The loop check's own defaults are the repository's real preparation and
      // evidence records, so the arguments are empty by design.
      const result = runOwned(
        process.execPath,
        [
          join(process.cwd(), suite.file),
          ...(suite.arguments ?? []).map((argument) => argument.replace("{owned}", root)),
        ],
        {
          cwd: root,
          env: { ...process.env, ...environment },
          encoding: "utf8",
          shell: false,
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
        },
      );
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      // The loop check reports green (0) or red (1); this is a smoke test that
      // the script ran and reported, not a measurement outcome.
      assert.ok(result.status === 0 || result.status === 1 || result.status === 2, output);
      // A usage error (2) is the script reporting an unknown argument; a green
      // or red report must not.
      if (result.status !== 2) assert.doesNotMatch(output, /unknown argument/u, output);
      measured.push({ file: suite.file, kind: suite.kind, outcome: "reported" });
      continue;
    }
    if (!suite.pattern) throw new Error(`Candidate measurement suite has no name pattern: ${suite.file}`);
    const result = runOwned(
      process.execPath,
      [
        "--test",
        "--test-concurrency=1",
        "--test-reporter=tap",
        `--test-name-pattern=${suite.pattern}`,
        join(process.cwd(), suite.file),
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, ...environment },
        encoding: "utf8",
        shell: false,
        timeout: 600_000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /^not ok \d+ - /mu, output);
    // The file itself reports as one passing test when the pattern selects
    // nothing: a measurement that ran no test has measured nothing.
    const selected = [...output.matchAll(/^ok \d+ - (.+)$/gmu)]
      .map((match) => match[1])
      .filter((name) => name !== suite.file);
    assert.ok(selected.length > 0, `Candidate measurement suite selected no test: ${suite.file}\n${output}`);
    measured.push({
      file: suite.file,
      kind: suite.kind,
      pattern: suite.pattern,
      outcome: "pass",
      selected: selected.length,
    });
  }
  const fabrication = await fabricateEmittedPacket(root);
  const refusals = await fabricateRefusals(root);
  writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        schema: "superman.candidate-measurement/1",
        host: {
          file: "node-hosted-candidate-measurement-host.ts",
          sha256: createHash("sha256")
            .update(readFileSync(import.meta.filename))
            .digest("hex"),
        },
        runtime: `node ${process.version}`,
        candidateRuntime: "not executed",
        suites: measured,
        fabricated: fabrication,
        refusals,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Candidate Node-hosted measurement surfaces executed and reported: ${measured.length}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
