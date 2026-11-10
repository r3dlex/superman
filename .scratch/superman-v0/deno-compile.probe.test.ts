// Measurement host for the approved temporary compile/asset substrate. Not an operational launcher.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const DENO_SHA256 = "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba";
const DENORT_SHA256 = "f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb";
const NODE_SHA256 = "cbee2298aee5cc476bf8d5441e7348b627254a39d869743a5b04489028c729d4";
const ASSET = Buffer.from([0x00, 0xff, 0x53, 0x55, 0x50, 0x2d, 0x36, 0x00, 0xfe, 0x01]);
const ENTRY = [
  'const asset = Deno.readFileSync(new URL("./asset.bin", import.meta.url));',
  'if (Deno.args[0] === "external") {',
  "  const target = Deno.args[1];",
  "  if (!target) Deno.exit(2);",
  '  const status = await Deno.permissions.request({ name: "read", path: target });',
  '  if (status.state === "granted") {',
  "    const got = Deno.readFileSync(target);",
  "    await Deno.stdout.write(got);",
  "    Deno.exit(0);",
  "  }",
  "  console.error(status.state);",
  "  Deno.exit(13);",
  "}",
  "await Deno.stdout.write(asset);",
  "",
].join("\n");

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireDigest(path: string | undefined, expected: string, label: string): string {
  if (!path) throw new Error(`${label} is required`);
  const digest = sha256(readFileSync(path));
  if (digest !== expected) throw new Error(`${label} digest is not the verified candidate: ${digest}`);
  return path;
}

function requireDeno(): string {
  return requireDigest(process.env.SUPERMAN_DENO_BIN, DENO_SHA256, "SUPERMAN_DENO_BIN");
}

function requireRoot(): string {
  const root = process.env.SUPERMAN_COMPILE_ROOT;
  if (!root) throw new Error("SUPERMAN_COMPILE_ROOT is required");
  if (!existsSync(root)) throw new Error("SUPERMAN_COMPILE_ROOT does not exist");
  return root;
}

test("the compile entry is measured through the step 5 binding seam before any compile credit", () => {
  assert.equal(sha256(readFileSync(process.execPath)), NODE_SHA256, "credited host is not the verified Node 26 binary");
  const deno = requireDeno();
  requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
  const owned = mkdtempSync(join(requireRoot(), "measure-"));
  const source = join(owned, "source");
  const entry = join(source, "entry.ts");
  const receipt = join(owned, "receipt.json");
  mkdirSync(source);
  writeFileSync(entry, ENTRY);
  writeFileSync(join(source, "asset.bin"), ASSET);
  const measured = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-name-pattern",
      "external entry is measured",
      "--test-reporter",
      "tap",
      ".scratch/superman-v0/deno-coverage.probe.test.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        SUPERMAN_DENO_BIN: deno,
        SUPERMAN_COVERAGE_ROOT: owned,
        SUPERMAN_MEASURE_ENTRY: entry,
        SUPERMAN_MEASURE_RECEIPT: receipt,
      },
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    },
  );
  assert.ifError(measured.error);
  assert.equal(measured.status, 0, measured.stderr || measured.stdout);
  assert.equal(existsSync(receipt), true, "step 5 seam did not write a measurement receipt");
  const body = JSON.parse(readFileSync(receipt, "utf8")) as {
    entryPath: string;
    entrySha256: string;
    sourcesContentMatches: boolean;
    loadedPaths: string[];
    emitPath: string;
    metrics: Record<"lines" | "statements" | "branches" | "functions", [number, number, number]>;
    denoSha256: string;
  };
  assert.equal(body.entrySha256, sha256(readFileSync(entry)));
  assert.equal(body.entrySha256, sha256(ENTRY));
  assert.equal(body.sourcesContentMatches, true);
  assert.deepEqual(body.loadedPaths, [body.entryPath]);
  assert.equal(body.denoSha256, DENO_SHA256);
  assert.equal(body.metrics.lines[2], 0);
  assert.equal(body.metrics.lines[1] > 0, true);
  assert.equal(body.metrics.lines[0] > 0, true);
  const emit = readFileSync(body.emitPath, "utf8");
  const mapped = emit.match(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/u);
  assert.ok(mapped?.[1], "executed emit has no inline source map");
  const sourceMap = JSON.parse(Buffer.from(mapped[1], "base64").toString("utf8")) as { sourcesContent?: string[] };
  assert.equal(sourceMap.sourcesContent?.[0], ENTRY);
  rmSync(owned, { recursive: true, force: true });
});

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) found.push(...walkFiles(path));
    else found.push(path);
  }
  return found;
}

function compileCredited(options: {
  deno: string;
  denort: string;
  entry: string;
  asset: string;
  output: string;
  cwd: string;
  home: string;
  tmp: string;
  denoDir: string;
}): { status: number | null; stderr: string; argv: string[] } {
  const deno = requireDigest(options.deno, DENO_SHA256, "compile deno");
  const denort = requireDigest(options.denort, DENORT_SHA256, "compile denort");
  const argv = [
    ...clearedPrefix(options.home, options.tmp, options.denoDir),
    `DENORT_BIN=${denort}`,
    deno,
    "compile",
    "--no-prompt",
    "--no-config",
    "--no-lock",
    "--no-npm",
    "--no-remote",
    "--include",
    options.asset,
    "--output",
    options.output,
    options.entry,
  ];
  const result = spawnSync("/usr/bin/env", argv, {
    cwd: options.cwd,
    env: hostileEnv(options.cwd, options.tmp, options.denoDir),
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
  });
  if (result.error) throw new Error(`compile launch failed: ${result.error.message}`);
  return { status: result.status, stderr: result.stderr ?? "", argv };
}

test("actual compilation consumes the verified denort and does not download a runtime", () => {
  assert.equal(sha256(readFileSync(process.execPath)), NODE_SHA256);
  const deno = requireDeno();
  const denort = requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
  const owned = mkdtempSync(join(requireRoot(), "compile-"));
  const source = join(owned, "source");
  const cwd = join(owned, "unrelated-cwd");
  const home = join(owned, "home");
  const tmp = join(owned, "tmp");
  const denoDir = join(owned, "deno-dir");
  const entry = join(source, "entry.ts");
  const asset = join(source, "asset.bin");
  const output = join(owned, "out", "fixture-bin");
  const receipt = join(owned, "receipt.json");
  for (const dir of [source, cwd, home, tmp, denoDir, join(owned, "out")]) mkdirSync(dir);
  writeFileSync(entry, ENTRY);
  writeFileSync(asset, ASSET);
  writeFileSync(join(cwd, "deno.json"), '{"unstable":["not-a-feature"],"compile":{"include":["wrong.bin"]}}\n');
  writeFileSync(join(cwd, "wrong.bin"), Buffer.from("not-the-asset"));
  const measured = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-name-pattern",
      "external entry is measured",
      "--test-reporter",
      "tap",
      ".scratch/superman-v0/deno-coverage.probe.test.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        SUPERMAN_DENO_BIN: deno,
        SUPERMAN_COVERAGE_ROOT: owned,
        SUPERMAN_MEASURE_ENTRY: entry,
        SUPERMAN_MEASURE_RECEIPT: receipt,
      },
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    },
  );
  assert.equal(measured.status, 0, measured.stderr || measured.stdout);
  const body = JSON.parse(readFileSync(receipt, "utf8")) as { entrySha256: string };
  assert.equal(body.entrySha256, sha256(ENTRY));
  if (sha256(readFileSync(entry)) !== body.entrySha256) throw new Error("refusing to compile stale measured source");
  const compiled = compileCredited({ deno, denort, entry, asset, output, cwd, home, tmp, denoDir });
  assert.equal(compiled.status, 0, compiled.stderr);
  assert.equal(compiled.stderr.includes("dl.deno.land"), false, compiled.stderr);
  assert.equal(compiled.stderr.includes("not-a-feature"), false, compiled.stderr);
  assert.equal(compiled.stderr.includes("V8 did not recognize flag"), false, compiled.stderr);
  assert.equal(compiled.stderr.includes("Permission broker"), false, compiled.stderr);
  assert.equal(compiled.argv.includes("--no-prompt"), true);
  assert.equal(compiled.argv.includes("--no-config"), true);
  assert.equal(compiled.argv.includes("-A"), false);
  assert.equal(
    compiled.argv.some((arg) => arg.startsWith("--allow-")),
    false,
  );
  assert.equal(existsSync(output), true);
  assert.equal(
    statSync(output).size > 68_094_056,
    true,
    `output smaller than verified denort: ${statSync(output).size}`,
  );
  assert.equal(
    walkFiles(denoDir).some((path) => path.endsWith("denort-aarch64-apple-darwin.zip")),
    false,
    walkFiles(denoDir).join("\n"),
  );
  rmSync(owned, { recursive: true, force: true });
});

function clearedPrefix(home: string, tmp: string, denoDir: string): string[] {
  return [
    "-i",
    "PATH=/usr/bin:/bin",
    `HOME=${home}`,
    `TMPDIR=${tmp}`,
    `DENO_DIR=${denoDir}`,
    "DENO_NO_UPDATE_CHECK=1",
    "DENO_NO_PACKAGE_JSON=1",
  ];
}

function hostileEnv(cwd: string, tmp: string, denoDir: string): Record<string, string> {
  return {
    PATH: "/usr/bin:/bin",
    HOME: join(cwd, "hostile-home"),
    TMPDIR: tmp,
    DENO_DIR: denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_PERMISSION_BROKER_PATH: join(cwd, "missing-broker.sock"),
  };
}

function runNative(binary: string, cwd: string, home: string, tmp: string, denoDir: string, args: string[] = []) {
  return spawnSync("/usr/bin/env", [...clearedPrefix(home, tmp, denoDir), binary, ...args], {
    cwd,
    env: hostileEnv(cwd, tmp, denoDir),
    shell: false,
    timeout: 30_000,
  });
}

test("the compiled fixture returns the exact asset bytes from an unrelated cwd", () => {
  assert.equal(sha256(readFileSync(process.execPath)), NODE_SHA256);
  const deno = requireDeno();
  const denort = requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
  const owned = mkdtempSync(join(requireRoot(), "asset-"));
  const source = join(owned, "source");
  const compileCwd = join(owned, "compile-cwd");
  const runCwd = join(owned, "run-cwd");
  const home = join(owned, "home");
  const tmp = join(owned, "tmp");
  const denoDir = join(owned, "deno-dir");
  const entry = join(source, "entry.ts");
  const asset = join(source, "asset.bin");
  const output = join(owned, "out", "fixture-bin");
  const receipt = join(owned, "receipt.json");
  for (const dir of [source, compileCwd, runCwd, home, tmp, denoDir, join(owned, "out")]) mkdirSync(dir);
  writeFileSync(entry, ENTRY);
  writeFileSync(asset, ASSET);
  writeFileSync(join(compileCwd, "deno.json"), '{"unstable":["not-a-feature"]}\n');
  writeFileSync(join(compileCwd, "package.json"), '{"imports":{"./asset.bin":"./wrong.bin"}}\n');
  writeFileSync(join(compileCwd, "import_map.json"), '{"imports":{"./asset.bin":"./wrong.bin"}}\n');
  writeFileSync(join(compileCwd, "deno.lock"), "{not-json\n");
  const measured = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-name-pattern",
      "external entry is measured",
      "--test-reporter",
      "tap",
      ".scratch/superman-v0/deno-coverage.probe.test.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        SUPERMAN_DENO_BIN: deno,
        SUPERMAN_COVERAGE_ROOT: owned,
        SUPERMAN_MEASURE_ENTRY: entry,
        SUPERMAN_MEASURE_RECEIPT: receipt,
      },
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    },
  );
  assert.equal(measured.status, 0, measured.stderr || measured.stdout);
  const body = JSON.parse(readFileSync(receipt, "utf8")) as { entrySha256: string };
  assert.equal(body.entrySha256, sha256(readFileSync(entry)));
  const compiled = compileCredited({ deno, denort, entry, asset, output, cwd: compileCwd, home, tmp, denoDir });
  assert.equal(compiled.status, 0, compiled.stderr);
  rmSync(asset);
  const decoy = Buffer.from("cwd-decoy-asset");
  writeFileSync(join(runCwd, "asset.bin"), decoy);
  const nativeDir = join(owned, "native-deno");
  mkdirSync(nativeDir);
  const ran = runNative(output, runCwd, home, tmp, nativeDir);
  assert.ifError(ran.error);
  assert.equal(ran.status, 0, ran.stderr?.toString() ?? "");
  assert.deepEqual(ran.stdout, ASSET);
  assert.equal(Buffer.compare(ran.stdout ?? Buffer.alloc(0), decoy) === 0, false);
  const executed = {
    entrySha256: body.entrySha256,
    assetSha256: sha256(ASSET),
    denoSha256: DENO_SHA256,
    denortSha256: DENORT_SHA256,
    outputSha256: sha256(readFileSync(output)),
    outputBytes: statSync(output).size,
    stdoutMatchesAsset: true,
    compileArgv: compiled.argv,
  };
  writeFileSync(join(requireRoot(), "executed-binding.json"), `${JSON.stringify(executed)}\n`);
  rmSync(owned, { recursive: true, force: true });
});

function compileVariant(options: {
  deno: string;
  denort?: string;
  entry: string;
  output: string;
  cwd: string;
  home: string;
  tmp: string;
  denoDir: string;
  include?: string;
  discovery?: boolean;
  noPrompt?: boolean;
  proxy?: boolean;
}): { status: number | null; stderr: string; error?: Error } {
  const args = clearedPrefix(options.home, options.tmp, options.denoDir);
  if (options.proxy) {
    args.push("HTTPS_PROXY=http://127.0.0.1:9", "HTTP_PROXY=http://127.0.0.1:9");
  }
  if (options.denort) args.push(`DENORT_BIN=${options.denort}`);
  args.push(options.deno, "compile");
  if (options.noPrompt !== false) args.push("--no-prompt");
  if (options.discovery !== false) args.push("--no-config", "--no-lock", "--no-npm", "--no-remote");
  if (options.include) args.push("--include", options.include);
  args.push("--output", options.output, options.entry);
  const result = spawnSync("/usr/bin/env", args, {
    cwd: options.cwd,
    env: hostileEnv(options.cwd, options.tmp, options.denoDir),
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  return { status: result.status, stderr: result.stderr ?? "", error: result.error };
}

test("wrong runtime, asset, and config override are not passes", () => {
  assert.equal(sha256(readFileSync(process.execPath)), NODE_SHA256);
  const deno = requireDeno();
  const denort = requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
  const owned = mkdtempSync(join(requireRoot(), "fail-"));
  const source = join(owned, "source");
  const cwd = join(owned, "cwd");
  const home = join(owned, "home");
  const tmp = join(owned, "tmp");
  const entry = join(source, "entry.ts");
  const asset = join(source, "asset.bin");
  const wrongAsset = join(source, "wrong.bin");
  const wrongRuntime = join(owned, "wrong-denort");
  mkdirSync(source);
  mkdirSync(cwd);
  mkdirSync(home);
  mkdirSync(tmp);
  writeFileSync(entry, ENTRY);
  writeFileSync(asset, ASSET);
  writeFileSync(wrongAsset, Buffer.from("wrong-asset-bytes"));
  writeFileSync(wrongRuntime, ASSET);
  writeFileSync(join(cwd, "deno.json"), '{"unstable":["not-a-feature"],"compile":{"include":["wrong.bin"]}}\n');
  assert.throws(
    () => requireDigest(wrongRuntime, DENO_SHA256, "SUPERMAN_DENO_BIN"),
    /digest is not the verified candidate/u,
  );

  const badRuntimeDir = join(owned, "bad-runtime-deno");
  mkdirSync(badRuntimeDir);
  const badRuntime = compileVariant({
    deno,
    denort: wrongRuntime,
    entry,
    output: join(owned, "bad-runtime-out"),
    cwd,
    home,
    tmp,
    denoDir: badRuntimeDir,
    include: asset,
  });
  assert.equal(badRuntime.status === 0 && existsSync(join(owned, "bad-runtime-out")), false, badRuntime.stderr);
  console.log(`bad-runtime status=${badRuntime.status ?? "null"}`);

  const omittedDir = join(owned, "omitted-deno");
  mkdirSync(omittedDir);
  const omitted = compileVariant({
    deno,
    entry,
    output: join(owned, "omitted-out"),
    cwd,
    home,
    tmp,
    denoDir: omittedDir,
    include: asset,
    proxy: true,
  });
  if (omitted.status === 0 && existsSync(join(owned, "omitted-out"))) {
    throw new Error(`omitted DENORT_BIN compiled a binary: ${omitted.stderr}`);
  }
  assert.equal(omitted.status === 0, false, omitted.stderr);
  console.log(`omitted-denort status=${omitted.status ?? "null"}`);

  const wrongIncludeDir = join(owned, "wrong-include-deno");
  mkdirSync(wrongIncludeDir);
  const wrongInclude = compileCredited({
    deno,
    denort,
    entry,
    asset: wrongAsset,
    output: join(owned, "wrong-include-out"),
    cwd,
    home,
    tmp,
    denoDir: wrongIncludeDir,
  });
  assert.equal(wrongInclude.status, 0, wrongInclude.stderr);
  rmSync(asset);
  const wrongRun = runNative(join(owned, "wrong-include-out"), cwd, home, tmp, wrongIncludeDir);
  assert.ifError(wrongRun.error);
  assert.equal(Buffer.compare(wrongRun.stdout ?? Buffer.alloc(0), ASSET) === 0, false);

  const omittedIncludeDir = join(owned, "omitted-include-deno");
  mkdirSync(omittedIncludeDir);
  writeFileSync(asset, ASSET);
  const omittedInclude = compileVariant({
    deno,
    denort,
    entry,
    output: join(owned, "omitted-include-out"),
    cwd,
    home,
    tmp,
    denoDir: omittedIncludeDir,
  });
  if (omittedInclude.status === 0 && existsSync(join(owned, "omitted-include-out"))) {
    rmSync(asset);
    const ran = runNative(join(owned, "omitted-include-out"), cwd, home, tmp, omittedIncludeDir);
    if (ran.status === 0 && Buffer.compare(ran.stdout ?? Buffer.alloc(0), ASSET) === 0) {
      throw new Error("omitted --include still returned the asset bytes");
    }
  }

  writeFileSync(join(source, "deno.json"), '{"unstable":["not-a-feature"]}\n');
  const overrideAsset = join(source, "override-asset.bin");
  writeFileSync(overrideAsset, ASSET);
  const overrideDir = join(owned, "override-deno");
  mkdirSync(overrideDir);
  const override = compileVariant({
    deno,
    denort,
    entry,
    output: join(owned, "override-out"),
    cwd: source,
    home,
    tmp,
    denoDir: overrideDir,
    include: overrideAsset,
    discovery: false,
  });
  assert.equal(override.stderr.includes("not-a-feature"), true, override.stderr);
  const neutralizedDir = join(owned, "neutralized-deno");
  mkdirSync(neutralizedDir);
  const neutralized = compileCredited({
    deno,
    denort,
    entry,
    asset: overrideAsset,
    output: join(owned, "neutralized-out"),
    cwd,
    home,
    tmp,
    denoDir: neutralizedDir,
  });
  assert.equal(neutralized.status, 0, neutralized.stderr);
  assert.equal(neutralized.stderr.includes("not-a-feature"), false, neutralized.stderr);
  rmSync(owned, { recursive: true, force: true });
});

test("prompting and appended permission flags do not escalate", () => {
  assert.equal(sha256(readFileSync(process.execPath)), NODE_SHA256);
  const deno = requireDeno();
  const denort = requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
  const owned = mkdtempSync(join(requireRoot(), "prompt-"));
  const source = join(owned, "source");
  const cwd = join(owned, "cwd");
  const runCwd = join(owned, "run-cwd");
  const home = join(owned, "home");
  const tmp = join(owned, "tmp");
  const denoDir = join(owned, "deno-dir");
  const entry = join(source, "entry.ts");
  const asset = join(source, "asset.bin");
  const output = join(owned, "out", "fixture-bin");
  const secret = join(owned, "secret.bin");
  const secretBytes = Buffer.from("secret-not-granted");
  for (const dir of [source, cwd, runCwd, home, tmp, denoDir, join(owned, "out")]) mkdirSync(dir);
  writeFileSync(entry, ENTRY);
  writeFileSync(asset, ASSET);
  writeFileSync(secret, secretBytes);
  const measured = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-name-pattern",
      "external entry is measured",
      "--test-reporter",
      "tap",
      ".scratch/superman-v0/deno-coverage.probe.test.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        SUPERMAN_DENO_BIN: deno,
        SUPERMAN_COVERAGE_ROOT: owned,
        SUPERMAN_MEASURE_ENTRY: entry,
        SUPERMAN_MEASURE_RECEIPT: join(owned, "receipt.json"),
      },
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    },
  );
  assert.equal(measured.status, 0, measured.stderr || measured.stdout);
  const receipt = JSON.parse(readFileSync(join(owned, "receipt.json"), "utf8")) as { entrySha256: string };
  assert.equal(receipt.entrySha256, sha256(ENTRY));
  const compiled = compileCredited({ deno, denort, entry, asset, output, cwd, home, tmp, denoDir });
  assert.equal(compiled.status, 0, compiled.stderr);
  assert.equal(compiled.argv.includes("-S"), false);
  assert.equal(compiled.argv.includes("--env-file"), false);
  const denied = runNative(output, runCwd, home, tmp, denoDir, ["external", secret]);
  assert.ifError(denied.error);
  assert.equal(denied.status, 13, denied.stderr?.toString() ?? "");
  assert.equal(denied.stderr?.toString().includes("denied"), true, denied.stderr?.toString() ?? "");
  assert.equal(Buffer.compare(denied.stdout ?? Buffer.alloc(0), secretBytes) === 0, false);
  const escalated = runNative(output, runCwd, home, tmp, denoDir, ["external", secret, `--allow-read=${secret}`]);
  assert.ifError(escalated.error);
  assert.equal(escalated.status, 13, escalated.stderr?.toString() ?? "");
  assert.equal(Buffer.compare(escalated.stdout ?? Buffer.alloc(0), secretBytes) === 0, false);
  const promptDir = join(owned, "prompt-deno");
  mkdirSync(promptDir);
  const prompted = compileVariant({
    deno,
    denort,
    entry,
    output: join(owned, "prompt-out"),
    cwd,
    home,
    tmp,
    denoDir: promptDir,
    include: asset,
    noPrompt: false,
  });
  if (prompted.status === 0 && existsSync(join(owned, "prompt-out"))) {
    const hanging = spawnSync(
      "/usr/bin/env",
      [...clearedPrefix(home, tmp, promptDir), join(owned, "prompt-out"), "external", secret],
      { cwd: runCwd, env: hostileEnv(runCwd, tmp, promptDir), encoding: "buffer", shell: false, timeout: 5_000 },
    );
    if (
      !hanging.error &&
      hanging.status === 0 &&
      Buffer.compare(hanging.stdout ?? Buffer.alloc(0), secretBytes) === 0
    ) {
      throw new Error("compile without --no-prompt escalated an external read");
    }
  }
  const artifact = sha256(readFileSync(output));
  assert.equal(artifact === DENORT_SHA256, false);
  assert.equal(statSync(output).size > 68_094_056, true);
  rmSync(owned, { recursive: true, force: true });
});
