// Step 3 conditional D1 measurement probe. Not an operational launcher.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  buildDerivedManifest,
  type InputVerification,
  type Transform,
  treeHash,
  type UndiciSite,
} from "./deno-checker.manifest.ts";

const T1 = process.env.SUPERMAN_STEP3_T1 ?? "";
const T0 = process.env.SUPERMAN_STEP3_T0 ?? "";
if (!T1 || !T0) throw new Error("SUPERMAN_STEP3_T1 and SUPERMAN_STEP3_T0 are required");

const TSRS =
  "/Users/andreburgstahler/Ws/ai-tool-workspace/superman/node_modules/.pnpm/@tsrs+darwin-arm64@0.20.1-ts7.1.0-beta/node_modules/@tsrs/darwin-arm64/tsrs";
const TSC =
  "/Users/andreburgstahler/Ws/ai-tool-workspace/superman/node_modules/.pnpm/@typescript+typescript-darwin-arm64@7.1.0-beta/node_modules/@typescript/typescript-darwin-arm64/lib/tsc";
const DENO = join(T0, "tools/deno/deno");
const TOOL_HASHES = {
  tsrs: "5c1f6789358b9947e5c2176532f2cbee5488a5d7481652ee2f1763efdf105217",
  tsc: "29f5eb8daa5c8cf6ef1c0cb79fbcf47c0cfdf26edabdf148bb779d0b2d56cebc",
  deno: "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba",
};

type Run = {
  label: string;
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  stdoutSha256: string;
  stderrSha256: string;
  codes: string[];
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function allFiles(root: string): string[] {
  const files: string[] = [];
  for (const relativePath of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const absolutePath = join(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) throw new Error(`symlink is not allowed: ${relativePath}`);
    if (stat.isFile()) files.push(relativePath);
  }
  return files.sort();
}

function codesOf(stdout: string, stderr: string): string[] {
  return [...new Set(`${stdout}\n${stderr}`.match(/TS\d{4}/gu) ?? [])].sort();
}

function run(label: string, tool: string, args: string[], cwd: string): Run {
  const expectedHash = tool === TSRS ? TOOL_HASHES.tsrs : tool === TSC ? TOOL_HASHES.tsc : TOOL_HASHES.deno;
  assert.equal(sha256(readFileSync(tool)), expectedHash, `${label} tool identity`);
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: join(T1, "home"),
    TMPDIR: join(T1, "tmp"),
    XDG_CACHE_HOME: join(T1, "cache"),
    DENO_DIR: join(T1, "cache", label),
    DENO_NO_UPDATE_CHECK: "1",
    DENO_NO_PACKAGE_JSON: "1",
    DENO_NO_PROMPT: "1",
    NO_COLOR: "1",
  };
  mkdirSync(env.DENO_DIR, { recursive: true });
  const result = spawnSync(
    "/usr/bin/env",
    ["-i", ...Object.entries(env).map(([name, value]) => `${name}=${value}`), tool, ...args],
    {
      cwd,
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${label} ended by signal ${result.signal}`);
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    label,
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    codes: codesOf(stdout, stderr),
  };
}

function summary(result: Run): Record<string, unknown> {
  return {
    label: result.label,
    status: result.status,
    signal: result.signal,
    stdoutSha256: result.stdoutSha256,
    stderrSha256: result.stderrSha256,
    stdoutBytes: Buffer.byteLength(result.stdout),
    stderrBytes: Buffer.byteLength(result.stderr),
    codes: result.codes,
    stdoutTail: result.stdout.slice(-1200),
    stderrTail: result.stderr.slice(-1200),
  };
}

function loadedPaths(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("/") && /\.(?:ts|cts|d\.ts)$/u.test(line))
    .sort();
}

function expectCode(result: Run, code: string, label: string): void {
  assert.notEqual(result.status, 0, `${label} unexpectedly passed`);
  assert.deepEqual(result.codes, [code], `${label} codes were ${result.codes.join(",")}`);
}

function testTransform(name: string, sha: string): Transform {
  return { name, rawSha256: sha, adaptedSha256: sha, edits: [], exactReverse: true };
}

test("the manifest generator transforms and reverses a tiny fixture", () => {
  const root = mkdtempSync(join(T1, "tiny-"));
  try {
    const rawRoot = join(root, "raw");
    const adaptedRoot = join(root, "adapted");
    const outputRoot = join(root, "derived");
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
    const transform: Transform = {
      name: "lib.sample.d.ts",
      rawSha256: sha256(rawDirective),
      adaptedSha256: sha256(adaptedDirective),
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
    const undiciSite: UndiciSite = {
      file: "sample",
      line: 1,
      column: rawUndici.indexOf("'") + 1,
    };
    const verification: InputVerification = {
      transforms: [
        transform,
        testTransform("node/undici/sample.d.ts", sha256(rawUndici)),
        testTransform("node/undici/target.d.ts", sha256(target)),
      ],
    };
    const { manifest, reversal } = buildDerivedManifest({
      rawRoot,
      adaptedRoot,
      outputRoot,
      verification,
      undiciSites: [undiciSite],
      realmSites: [],
      write: true,
      expected: { declarations: 3, legal: 0, mechanisms: 0, directive: 1, undici: 1, realm: 0, filesEdited: 2 },
    });
    assert.equal(manifest.counts.edits, 2);
    assert.equal(manifest.counts.directive.files, 1);
    assert.equal(manifest.counts.undiciLiteral.files, 1);
    assert.equal(reversal.restored, 3);
    assert.equal(
      readFileSync(join(outputRoot, "node/undici/sample.d.ts"), "utf8"),
      "import target from './target.js';\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the full D1 sequence stops at the first failure", () => {
  const verification = JSON.parse(
    readFileSync(join(T1, "evidence/input-verification.json"), "utf8"),
  ) as InputVerification;
  const acquisition = JSON.parse(readFileSync(join(T1, "evidence/acquisition.json"), "utf8")) as {
    commit: string;
    tree: string;
    inventorySha256: string;
    mappingSha256: string;
    sourceRecords: Array<{ source: string; kind: string; mode: string; gitBlob: string }>;
  };
  const { manifest, reversal } = buildDerivedManifest({
    rawRoot: join(T1, "raw-dts"),
    adaptedRoot: join(T1, "adapted-dts"),
    outputRoot: join(T1, "derived-dts"),
    verification,
    acquisition,
    verificationSha256: sha256(readFileSync(join(T1, "evidence/input-verification.json"))),
    legalRoot: join(T1, "legal"),
    mechanismsRoot: join(T1, "mechanisms"),
    write: true,
  });
  assert.equal(manifest.counts.declarations, 202);
  assert.equal(manifest.counts.edits, 272);
  assert.equal(manifest.counts.filesEdited, 89);
  assert.deepEqual(manifest.counts.directive, { sites: 162, files: 57 });
  assert.deepEqual(manifest.counts.undiciLiteral, { sites: 100, files: 30 });
  assert.deepEqual(manifest.counts.realmGuard, { sites: 10, files: 2 });
  assert.equal(reversal.restored, 202);
  assert.equal(reversal.mismatches.length, 0);
  writeJson(join(T1, "evidence/preflight.json"), {
    manifest: {
      counts: manifest.counts,
      rawTreeSha256: manifest.rawTreeSha256,
      adaptedTreeSha256: treeHash(join(T1, "adapted-dts")),
      derivedTreeSha256: treeHash(join(T1, "derived-dts")),
      reverse: manifest.reverse,
    },
    reversal,
  });

  const tsconfig = {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      noImplicitOverride: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      skipLibCheck: false,
      skipDefaultLibCheck: false,
      noResolve: false,
      libReplacement: false,
      incremental: false,
      lib: [],
      types: [],
      typeRoots: [],
    },
    files: [
      join(T1, "derived-dts/lib.deno.window.d.ts"),
      join(T1, "derived-dts/lib.deno.unstable.d.ts"),
      join(T1, "cases/valid/entry.ts"),
    ],
  };
  writeJson(join(T1, "config/tsconfig.valid.json"), tsconfig);
  writeJson(join(T1, "config/deno.valid.json"), {
    compilerOptions: {
      strict: true,
      noImplicitOverride: true,
      skipLibCheck: false,
      lib: ["deno.window", "deno.unstable", "esnext"],
      types: [],
    },
    vendor: false,
  });

  const expected = new Set([
    ...allFiles(join(T1, "derived-dts")).map((file) => join(T1, "derived-dts", file)),
    join(T1, "cases/valid/entry.ts"),
    join(T1, "cases/valid/nested/child.ts"),
  ]);
  const tsrs = run(
    "valid-tsrs",
    TSRS,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.valid.json")],
    join(T1, "cases/valid"),
  );
  assert.deepEqual([...new Set(loadedPaths(tsrs.stdout))].sort(), [...expected].sort(), "tsrs loaded inputs differ");
  assert.equal(
    tsrs.status,
    0,
    `tsrs valid baseline failed: ${tsrs.codes.join(",")}\n${tsrs.stdout.slice(-4000)}\n${tsrs.stderr.slice(-2000)}`,
  );

  const tsc = run(
    "valid-tsc",
    TSC,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.valid.json")],
    join(T1, "cases/valid"),
  );
  assert.deepEqual([...new Set(loadedPaths(tsc.stdout))].sort(), [...expected].sort(), "tsc loaded inputs differ");
  assert.equal(
    tsc.status,
    0,
    `matching tsc drift failed: ${tsc.codes.join(",")}\n${tsc.stdout.slice(-4000)}\n${tsc.stderr.slice(-2000)}`,
  );

  const deno = run(
    "valid-deno",
    DENO,
    [
      "check",
      `--config=${join(T1, "config/deno.valid.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      "--log-level=debug",
      join(T1, "cases/valid/entry.ts"),
    ],
    join(T1, "cases/valid"),
  );
  assert.equal(deno.status, 0, `native valid baseline failed: ${deno.codes.join(",")}\n${deno.stderr.slice(-4000)}`);
  const ignoredOptions = deno.stderr.includes("Unsupported compiler options");
  writeJson(join(T1, "evidence/valid-baseline.json"), {
    tsrs: summary(tsrs),
    tsc: summary(tsc),
    deno: summary(deno),
    expectedLoaded: expected.size,
    tsrsLoaded: [...new Set(loadedPaths(tsrs.stdout))].sort(),
    tscLoaded: [...new Set(loadedPaths(tsc.stdout))].sort(),
    blocked: ignoredOptions ? "S3-B2" : null,
  });
  assert.equal(ignoredOptions, false, "S3-B2 blocker: native host ignored a compiler option; raw exit 0 is not a pass");

  const info = run(
    "valid-info",
    DENO,
    [
      "info",
      "--json",
      `--config=${join(T1, "config/deno.valid.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      join(T1, "cases/valid/entry.ts"),
    ],
    join(T1, "cases/valid"),
  );
  assert.equal(info.status, 0, "native info failed");
  const baselinePath = join(T1, "evidence/valid-baseline.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<string, unknown>;
  baseline.info = summary(info);
  writeJson(baselinePath, baseline);

  const direct = join(T1, "cases/invalid-direct");
  mkdirSync(direct, { recursive: true });
  writeFileSync(join(direct, "entry.ts"), 'const value: number = "not a number";\nvoid value;\n');
  writeJson(join(T1, "config/tsconfig.direct.json"), {
    ...tsconfig,
    files: [
      join(T1, "derived-dts/lib.deno.window.d.ts"),
      join(T1, "derived-dts/lib.deno.unstable.d.ts"),
      join(direct, "entry.ts"),
    ],
  });
  const directTsrs = run(
    "direct-tsrs",
    TSRS,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.direct.json")],
    direct,
  );
  expectCode(directTsrs, "TS2322", "direct tsrs");
  const directTsc = run(
    "direct-tsc",
    TSC,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.direct.json")],
    direct,
  );
  expectCode(directTsc, "TS2322", "direct tsc");
  const directDeno = run(
    "direct-deno",
    DENO,
    [
      "check",
      `--config=${join(T1, "config/deno.valid.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      join(direct, "entry.ts"),
    ],
    direct,
  );
  expectCode(directDeno, "TS2322", "direct deno");

  const transitive = join(T1, "cases/invalid-transitive");
  mkdirSync(transitive, { recursive: true });
  writeFileSync(join(transitive, "entry.ts"), 'import { value } from "./middle.ts";\nvoid value;\n');
  writeFileSync(join(transitive, "middle.ts"), 'export { value } from "./leaf.ts";\n');
  writeFileSync(join(transitive, "leaf.ts"), 'export const value: number = "not a number";\n');
  writeJson(join(T1, "config/tsconfig.transitive.json"), {
    ...tsconfig,
    files: [
      join(T1, "derived-dts/lib.deno.window.d.ts"),
      join(T1, "derived-dts/lib.deno.unstable.d.ts"),
      join(transitive, "entry.ts"),
    ],
  });
  const transTsrs = run(
    "transitive-tsrs",
    TSRS,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.transitive.json")],
    transitive,
  );
  expectCode(transTsrs, "TS2322", "transitive tsrs");
  const transTsc = run(
    "transitive-tsc",
    TSC,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.transitive.json")],
    transitive,
  );
  expectCode(transTsc, "TS2322", "transitive tsc");
  const transDeno = run(
    "transitive-deno",
    DENO,
    [
      "check",
      `--config=${join(T1, "config/deno.valid.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      join(transitive, "entry.ts"),
    ],
    transitive,
  );
  expectCode(transDeno, "TS2322", "transitive deno");

  const declaration = join(T1, "cases/invalid-declaration");
  mkdirSync(declaration, { recursive: true });
  writeFileSync(
    join(declaration, "conflict.d.ts"),
    "declare const duplicate: number;\ndeclare const duplicate: string;\n",
  );
  writeFileSync(join(declaration, "entry.ts"), '/// <reference path="./conflict.d.ts" />\nexport {};\n');
  writeJson(join(T1, "config/tsconfig.declaration.json"), {
    ...tsconfig,
    files: [
      join(T1, "derived-dts/lib.deno.window.d.ts"),
      join(T1, "derived-dts/lib.deno.unstable.d.ts"),
      join(declaration, "conflict.d.ts"),
      join(declaration, "entry.ts"),
    ],
  });
  const declTsrs = run(
    "declaration-tsrs",
    TSRS,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.declaration.json")],
    declaration,
  );
  expectCode(declTsrs, "TS2451", "declaration tsrs");
  const declTsc = run(
    "declaration-tsc",
    TSC,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.declaration.json")],
    declaration,
  );
  expectCode(declTsc, "TS2451", "declaration tsc");
  const declDeno = run(
    "declaration-deno",
    DENO,
    [
      "check",
      `--config=${join(T1, "config/deno.valid.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      join(declaration, "entry.ts"),
    ],
    declaration,
  );
  expectCode(declDeno, "TS2451", "declaration deno");

  const defaultLib = join(T1, "cases/invalid-default-lib");
  mkdirSync(defaultLib, { recursive: true });
  writeFileSync(join(defaultLib, "entry.ts"), "const result = new Map();\nvoid result;\n");
  writeJson(join(T1, "config/deno.default-lib.json"), {
    compilerOptions: { strict: true, skipLibCheck: false, lib: ["es5"], types: [] },
    vendor: false,
  });
  writeJson(join(T1, "config/tsconfig.default-lib.json"), {
    ...tsconfig,
    compilerOptions: { ...tsconfig.compilerOptions, lib: ["es5"] },
    files: [join(defaultLib, "entry.ts")],
  });
  const defaultTsrs = run(
    "default-lib-tsrs",
    TSRS,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.default-lib.json")],
    defaultLib,
  );
  expectCode(defaultTsrs, "TS2583", "default-lib tsrs");
  const defaultTsc = run(
    "default-lib-tsc",
    TSC,
    ["--noEmit", "--pretty", "false", "--listFiles", "--project", join(T1, "config/tsconfig.default-lib.json")],
    defaultLib,
  );
  expectCode(defaultTsc, "TS2583", "default-lib tsc");
  const defaultDeno = run(
    "default-lib-deno",
    DENO,
    [
      "check",
      `--config=${join(T1, "config/deno.default-lib.json")}`,
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--node-modules-dir=none",
      join(defaultLib, "entry.ts"),
    ],
    defaultLib,
  );
  expectCode(defaultDeno, "TS2583", "default-lib deno");

  writeJson(join(T1, "evidence/controls.json"), {
    direct: { tsrs: summary(directTsrs), tsc: summary(directTsc), deno: summary(directDeno) },
    transitive: { tsrs: summary(transTsrs), tsc: summary(transTsc), deno: summary(transDeno) },
    declaration: { tsrs: summary(declTsrs), tsc: summary(declTsc), deno: summary(declDeno) },
    defaultLib: { tsrs: summary(defaultTsrs), tsc: summary(defaultTsc), deno: summary(defaultDeno) },
  });
});
