// Measurement host for the approved OS-native startup boundary. Not an operational launcher.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const DENO_SHA256 = "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba";
const DENORT_SHA256 = "f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb";
const RUN_ARGS = ["run", "--no-prompt", "--no-config", "--no-lock", "--no-npm", "--no-remote"];

function requireDigest(path: string | undefined, expected: string, label: string): string {
  if (!path) throw new Error(`${label} is required`);
  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (digest !== expected) throw new Error(`${label} digest is not the verified candidate: ${digest}`);
  return path;
}

function requireDeno(): string {
  return requireDigest(process.env.SUPERMAN_DENO_BIN, DENO_SHA256, "SUPERMAN_DENO_BIN");
}

function requireDenort(): string {
  return requireDigest(process.env.SUPERMAN_DENORT_BIN, DENORT_SHA256, "SUPERMAN_DENORT_BIN");
}

function requireRoot(): string {
  const root = process.env.SUPERMAN_STARTUP_ROOT;
  if (!root) throw new Error("SUPERMAN_STARTUP_ROOT is required");
  return root;
}

type Fixture = { root: string; home: string; tmp: string; denoDir: string; cwd: string };

function ownedFixture(): Fixture {
  const root = mkdtempSync(join(requireRoot(), "fixture-"));
  const fixture = {
    root,
    home: join(root, "home"),
    tmp: join(root, "tmp"),
    denoDir: join(root, "deno-dir"),
    cwd: join(root, "cwd"),
  };
  for (const dir of [fixture.home, fixture.tmp, fixture.denoDir, fixture.cwd]) mkdirSync(dir);
  return fixture;
}

function inherited(fixture: Fixture): Record<string, string> {
  return {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
  };
}

function clearedArgv(
  env: Record<string, string>,
  utility: string[],
  options: {
    packageJson?: boolean;
    denort?: string;
    home?: string;
    tmp?: string;
    denoDir?: string;
    omitDenoDir?: boolean;
  } = {},
): string[] {
  const args = [
    "-i",
    "PATH=/usr/bin:/bin",
    `HOME=${options.home ?? env.HOME}`,
    `TMPDIR=${options.tmp ?? env.TMPDIR}`,
    "DENO_NO_UPDATE_CHECK=1",
  ];
  if (!options.omitDenoDir) args.push(`DENO_DIR=${options.denoDir ?? env.DENO_DIR}`);
  if (options.packageJson !== false) args.push("DENO_NO_PACKAGE_JSON=1");
  if (options.denort) args.push(`DENORT_BIN=${options.denort}`);
  return [...args, ...utility];
}

function clearedSpawn(
  env: Record<string, string>,
  utility: string[],
  cwd: string,
  options: {
    packageJson?: boolean;
    denort?: string;
    timeout?: number;
    home?: string;
    tmp?: string;
    denoDir?: string;
    omitDenoDir?: boolean;
  } = {},
) {
  return spawnSync("/usr/bin/env", clearedArgv(env, utility, options), {
    cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: options.timeout ?? 60_000,
  });
}

function launchCompile(
  binary: string,
  script: string,
  output: string,
  cwd: string,
  env: Record<string, string>,
  options: { home?: string } = {},
) {
  return clearedSpawn(
    env,
    [
      binary,
      "compile",
      "--no-prompt",
      "--no-config",
      "--no-lock",
      "--no-npm",
      "--no-remote",
      "--output",
      output,
      script,
    ],
    cwd,
    { ...options, denort: requireDenort(), timeout: 120_000 },
  );
}

function launchBoundary(
  binary: string,
  script: string,
  cwd: string,
  env: Record<string, string>,
  options: { packageJson?: boolean; home?: string; tmp?: string; denoDir?: string; omitDenoDir?: boolean } = {},
) {
  return clearedSpawn(env, [binary, ...RUN_ARGS, script], cwd, options);
}

test("env -i replaces a hostile HOME before Deno writes its cache", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const hostile = join(fixture.root, "hostile-home");
  mkdirSync(hostile);
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('home');\n");
  const exposed = spawnSync(binary, [...RUN_ARGS, script], {
    cwd: fixture.cwd,
    env: { PATH: "/usr/bin:/bin", HOME: hostile, TMPDIR: fixture.tmp, DENO_NO_UPDATE_CHECK: "1" },
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 0, exposed.stderr);
  assert.equal(existsSync(join(hostile, "Library", "Caches", "deno")), true);
  rmSync(hostile, { recursive: true, force: true });
  mkdirSync(hostile);

  const env = {
    PATH: "/usr/bin:/bin",
    HOME: hostile,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };
  const printed = clearedSpawn(env, ["/usr/bin/env", "-0"], fixture.cwd, { home: fixture.home });
  assert.ifError(printed.error);
  assert.equal(printed.status, 0, printed.stderr);
  assert.equal(printed.stdout.includes(`HOME=${fixture.home}`), true);
  assert.equal(printed.stdout.includes(`HOME=${hostile}`), false);
  const bounded = clearedSpawn(env, [binary, ...RUN_ARGS, script], fixture.cwd, {
    home: fixture.home,
    omitDenoDir: true,
  });
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "home\n");
  assert.equal(existsSync(join(fixture.home, "Library", "Caches", "deno")), true);
  assert.deepEqual(readdirSync(hostile), []);
});

test("env -i drops inherited Node and compiler controls before the child starts", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    NODE_OPTIONS: "--require ./not-loaded.js",
    NODE_PATH: join(fixture.root, "hostile-modules"),
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_UNSTABLE_TSGO: "1",
  };
  const exposed = spawnSync("/usr/bin/env", ["-0"], { cwd: fixture.cwd, env, encoding: "utf8", shell: false });
  assert.equal(exposed.stdout.includes("NODE_OPTIONS"), true);
  assert.equal(exposed.stdout.includes("DENO_UNSTABLE_TSGO"), true);
  const bounded = clearedSpawn(env, ["/usr/bin/env", "-0"], fixture.cwd);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout.includes("NODE_OPTIONS"), false);
  assert.equal(bounded.stdout.includes("NODE_PATH"), false);
  assert.equal(bounded.stdout.includes("DENO_V8_FLAGS"), false);
  assert.equal(bounded.stdout.includes("DENO_UNSTABLE_TSGO"), false);
  assert.equal(bounded.stdout.includes(`HOME=${fixture.home}`), true);
});

test("Apple env -S substitutes an inherited value even when -i is present", () => {
  const result = spawnSync("/usr/bin/env", ["-i", "-S", "printf %s $" + "{DENO_V8_FLAGS}"], {
    env: { DENO_V8_FLAGS: "hostile-v8", PATH: "/usr/bin:/bin" },
    encoding: "utf8",
    shell: false,
    timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "hostile-v8");
});

test("compiled denort startup does not take the full-Deno broker or V8 env path", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('compiled');\n");
  const output = join(fixture.root, "compiled-out");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_PERMISSION_BROKER_PATH: join(fixture.root, "missing-broker.sock"),
  };
  const compiled = launchCompile(binary, script, output, fixture.cwd, env);
  assert.ifError(compiled.error);
  assert.equal(compiled.status, 0, compiled.stderr);

  const direct = spawnSync(output, [], { cwd: fixture.cwd, env, encoding: "utf8", shell: false, timeout: 60_000 });
  assert.ifError(direct.error);
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(direct.stdout, "compiled\n");
  assert.equal(direct.stderr.includes("Permission broker"), false);
  assert.equal(direct.stderr.includes("V8 did not recognize flag"), false);

  const bounded = clearedSpawn(env, [output], fixture.cwd, { packageJson: false });
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "compiled\n");
  assert.equal(bounded.stderr.includes("Permission broker"), false);
  assert.equal(env.DENO_PERMISSION_BROKER_PATH?.endsWith("missing-broker.sock"), true);
});

test("env -i compile uses the verified denort and ignores ambient config", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  writeFileSync(join(fixture.cwd, "deno.json"), '{"unstable":["not-a-feature"]}\n');
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('compiled');\n");
  const output = join(fixture.root, "compiled-out");
  const hostile = join(fixture.root, "hostile-home");
  mkdirSync(hostile);
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: hostile,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_PERMISSION_BROKER_PATH: join(fixture.root, "missing-broker.sock"),
  };
  const printed = clearedSpawn(env, ["/usr/bin/env", "-0"], fixture.cwd, {
    home: fixture.home,
    denort: requireDenort(),
  });
  assert.equal(printed.stdout.includes(`HOME=${fixture.home}`), true);
  assert.equal(printed.stdout.includes(`HOME=${hostile}`), false);

  const compiled = launchCompile(binary, script, output, fixture.cwd, env, { home: fixture.home });
  assert.ifError(compiled.error);
  assert.equal(compiled.status, 0, compiled.stderr);
  assert.equal(compiled.stderr.includes("not-a-feature"), false);
  assert.equal(compiled.stderr.includes("V8 did not recognize flag"), false);
  assert.equal(compiled.stderr.includes("Permission broker"), false);
  assert.equal(compiled.stderr.includes("dl.deno.land"), false);
  assert.equal(existsSync(output), true);
  assert.deepEqual(readdirSync(hostile), []);
});

test("a generated hook uses explicit argv rather than a deno shebang", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const shimDir = join(fixture.root, "shim");
  mkdirSync(shimDir);
  const marker = join(fixture.root, "shim-ran");
  writeFileSync(join(shimDir, "deno"), `#!/bin/sh\necho fake-deno\ntouch ${JSON.stringify(marker)}\nexit 0\n`, {
    mode: 0o755,
  });
  const shebang = join(fixture.cwd, "shebang-hook");
  writeFileSync(shebang, "#!/usr/bin/env deno\necho shebang-ran\n", { mode: 0o755 });
  const hook = join(fixture.cwd, "generated-hook.ts");
  writeFileSync(hook, "#!/usr/bin/env deno\nconsole.log('hook-ready');\n");
  const hostile = join(fixture.root, "hostile-home");
  mkdirSync(hostile);
  const env = {
    PATH: `${shimDir}:/usr/bin:/bin`,
    HOME: hostile,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_PERMISSION_BROKER_PATH: join(fixture.root, "missing-broker.sock"),
  };

  const named = spawnSync(shebang, [], { cwd: fixture.cwd, env, encoding: "utf8", shell: false });
  assert.ifError(named.error);
  assert.equal(named.status, 0);
  assert.equal(named.stdout, "fake-deno\n");
  assert.equal(existsSync(marker), true);
  rmSync(marker);

  const printed = clearedSpawn(env, ["/usr/bin/env", "-0"], fixture.cwd, { home: fixture.home });
  assert.equal(printed.stdout.includes(`HOME=${fixture.home}`), true);
  assert.equal(printed.stdout.includes(`HOME=${hostile}`), false);
  const bounded = launchBoundary(binary, hook, fixture.cwd, env, { home: fixture.home });
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "hook-ready\n");
  assert.equal(bounded.stderr.includes("V8 did not recognize flag"), false);
  assert.equal(bounded.stderr.includes("Permission broker"), false);
  assert.deepEqual(readdirSync(hostile), []);
  assert.equal(existsSync(marker), false);
  assert.equal(bounded.stdout.includes("fake-deno"), false);
  assert.equal(bounded.stdout.includes("shebang-ran"), false);
});

test("env -i delivers SIGTERM to the launched Deno process", { timeout: 20_000 }, async (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('ready');\nsetInterval(() => {}, 1000);\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
  };
  const child = spawn("/usr/bin/env", clearedArgv(env, [binary, ...RUN_ARGS, script]), {
    cwd: fixture.cwd,
    env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ready marker; stdout=${stdout}; stderr=${stderr}`)), 10_000);
    child.stdout?.on("data", () => {
      if (stdout.includes("ready")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`exited before ready code=${code} signal=${signal}; stdout=${stdout}; stderr=${stderr}`));
    });
  });
  child.kill("SIGTERM");
  const outcome = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  assert.equal(outcome.signal, "SIGTERM");
  assert.equal(outcome.code, null);
  assert.equal(stderr.includes("V8 did not recognize flag"), false);
});

test("a rejected Deno flag through env -i is Deno's failure, not env's", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('ready');\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };
  const result = clearedSpawn(env, [binary, "run", "--not-a-deno-flag", script], fixture.cwd);
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unexpected argument '--not-a-deno-flag' found/u);
  assert.equal(result.stderr.includes("No such file or directory"), false);
});

test("env -i fails a missing explicit executable before Deno starts", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const missing = join(fixture.root, "missing-deno");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };
  const result = clearedSpawn(env, [missing, "run", "--no-prompt"], fixture.cwd);
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No such file or directory|not found/iu);
  assert.deepEqual(readdirSync(fixture.denoDir), []);
});

test("env -i launches a script path containing a space from a symlinked cwd", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const spaced = join(fixture.root, "dir with space");
  mkdirSync(spaced);
  const script = join(spaced, "entry.ts");
  writeFileSync(script, "console.log('spaced');\n");
  const link = join(fixture.root, "cwd-link");
  symlinkSync(spaced, link);
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const bounded = launchBoundary(binary, script, link, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "spaced\n");
  assert.equal(bounded.stderr, "");
});

test("an explicit candidate path runs instead of a PATH deno", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const shimDir = join(fixture.root, "shim");
  mkdirSync(shimDir);
  const marker = join(fixture.root, "shim-ran");
  writeFileSync(join(shimDir, "deno"), `#!/bin/sh\necho fake-deno\ntouch ${JSON.stringify(marker)}\nexit 0\n`, {
    mode: 0o755,
  });
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('ready');\n");
  const env = {
    PATH: `${shimDir}:/usr/bin:/bin`,
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const named = spawnSync("deno", ["--version"], { cwd: fixture.cwd, env, encoding: "utf8", shell: false });
  assert.ifError(named.error);
  assert.equal(named.status, 0);
  assert.equal(named.stdout, "fake-deno\n");
  assert.equal(existsSync(marker), true);
  rmSync(marker);

  const bounded = launchBoundary(binary, script, fixture.cwd, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "ready\n");
  assert.equal(existsSync(marker), false);
  assert.equal(bounded.stdout.includes("fake-deno"), false);
});

test("env -i source launch does not discover an ambient deno.lock", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  writeFileSync(join(fixture.cwd, "local.ts"), "console.log('local');\n");
  writeFileSync(join(fixture.cwd, "deno.lock"), "{not-a-lockfile\n");
  writeFileSync(join(fixture.cwd, "deno.json"), '{"lock":"deno.lock"}\n');
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "import './local.ts';\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const exposed = spawnSync(binary, ["run", "--no-prompt", script], {
    cwd: fixture.cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.notEqual(exposed.status, 0);
  assert.match(exposed.stderr, /lock/iu);
  assert.equal(exposed.stdout.includes("local"), false);

  const bounded = launchBoundary(binary, script, fixture.cwd, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stdout, "local\n");
});

test("env -i source launch does not apply ambient package.json imports", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  writeFileSync(join(fixture.cwd, "pwned.ts"), "console.log('via-package');\n");
  writeFileSync(join(fixture.cwd, "package.json"), '{"imports":{"#x":"./pwned.ts"}}\n');
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "import '#x';\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const exposed = spawnSync(binary, ["run", "--no-prompt", script], {
    cwd: fixture.cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 0, exposed.stderr);
  assert.equal(exposed.stdout, "via-package\n");

  const bounded = launchBoundary(binary, script, fixture.cwd, env, { packageJson: false });
  assert.ifError(bounded.error);
  assert.equal(bounded.stdout.includes("via-package"), false);
  assert.notEqual(bounded.status, 0);
  assert.equal(bounded.stderr.includes("DENO_NO_PACKAGE_JSON"), false);
});

test("env -i source launch does not apply an ambient import map", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  writeFileSync(join(fixture.cwd, "mapped.ts"), "console.log('via-map');\n");
  writeFileSync(join(fixture.cwd, "deno.json"), '{"imports":{"local-mod":"./mapped.ts"}}\n');
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "import 'local-mod';\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const exposed = spawnSync(binary, ["run", "--no-prompt", script], {
    cwd: fixture.cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 0, exposed.stderr);
  assert.equal(exposed.stdout, "via-map\n");

  const bounded = launchBoundary(binary, script, fixture.cwd, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.stdout.includes("via-map"), false);
  assert.notEqual(bounded.status, 0);
});

test("env -i source launch does not apply a parent deno.json", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const parent = join(fixture.root, "parent");
  const child = join(parent, "child");
  mkdirSync(child, { recursive: true });
  writeFileSync(join(parent, "deno.json"), '{"unstable":["not-a-feature"]}\n');
  const script = join(child, "entry.ts");
  writeFileSync(script, "console.log('ready');\n");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
  };

  const exposed = spawnSync(binary, ["run", "--no-prompt", script], {
    cwd: child,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 0);
  assert.match(exposed.stderr, /not-a-feature/u);
  assert.match(exposed.stderr, /unstable feature/u);

  const bounded = launchBoundary(binary, script, child, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stderr, "");
  assert.equal(bounded.stdout, "ready\n");
});

test("env -i drops an inherited permission-broker path before Deno starts", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('ready');\n");
  const broker = join(fixture.root, "missing-broker.sock");
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    DENO_PERMISSION_BROKER_PATH: broker,
  };
  assert.equal(env.DENO_PERMISSION_BROKER_PATH, broker);

  const exposed = spawnSync(binary, [...RUN_ARGS, script], {
    cwd: fixture.cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 87);
  assert.equal(exposed.stdout, "");
  assert.match(exposed.stderr, /Permission broker is an experimental feature/u);

  const bounded = launchBoundary(binary, script, fixture.cwd, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stderr.includes("Permission broker"), false);
  assert.equal(env.DENO_PERMISSION_BROKER_PATH, broker);
});

test("env -i drops inherited DENO_V8_FLAGS before Deno starts", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const binary = requireDeno();
  const script = join(fixture.cwd, "entry.ts");
  writeFileSync(script, "console.log('ready');\n");
  const env = inherited(fixture);
  assert.equal(env.DENO_V8_FLAGS, "--not-a-real-v8-flag");

  const exposed = spawnSync(binary, [...RUN_ARGS, script], {
    cwd: fixture.cwd,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 1);
  assert.equal(exposed.stdout, "");
  assert.match(exposed.stderr, /V8 did not recognize flag/u);

  const bounded = launchBoundary(binary, script, fixture.cwd, env);
  assert.ifError(bounded.error);
  assert.equal(bounded.status, 0, bounded.stderr);
  assert.equal(bounded.stderr.includes("V8 did not recognize flag"), false);
  assert.equal(env.DENO_V8_FLAGS, "--not-a-real-v8-flag");
});
