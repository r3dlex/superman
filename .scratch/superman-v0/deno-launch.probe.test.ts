// Measurement driver for one observed Deno source launch. Not the evaluator.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const CONTROL_FLAGS = ["--no-prompt", "--no-config", "--no-lock", "--no-npm", "--no-remote"];
const IDENTITY_SOURCE = `const id = {deno: Deno.version.deno, v8: Deno.version.v8, ts: Deno.version.typescript, target: Deno.build.target, standalone: Deno.build.standalone, os: Deno.build.os};
console.log(JSON.stringify(id));
`;

type Fixture = {
  root: string;
  home: string;
  tmp: string;
  denoDir: string;
  cwd: string;
};

type Version = {
  text: string;
  deno: string;
  channel: string;
  target: string;
  v8: string;
  typescript: string;
};

function ownedFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-launch-"));
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

function allowlist(fixture: Fixture, extra: Record<string, string> = {}): Record<string, string> {
  return {
    PATH: "/usr/bin:/bin",
    HOME: fixture.home,
    TMPDIR: fixture.tmp,
    DENO_DIR: fixture.denoDir,
    ...extra,
  };
}

function resolveExplicit(binary: string | undefined): string {
  if (!binary) throw new Error("explicit Deno path is required");
  if (binary === process.execPath) throw new Error("Node is not a Deno launch fallback");
  if (!existsSync(binary)) throw new Error(`explicit Deno path is missing: ${binary}`);
  return binary;
}

function readVersion(binary: string, env: Record<string, string>): Version {
  const result = spawnSync(binary, ["--version"], {
    env,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const header = result.stdout.match(/^deno (\S+) \(([^,]+), [^,]+, ([^)]+)\)/m);
  const v8 = result.stdout.match(/^v8 (\S+)/m);
  const typescript = result.stdout.match(/^typescript (\S+)/m);
  if (!header || !v8 || !typescript) throw new Error(`unrecognized deno --version:\n${result.stdout}`);
  return {
    text: result.stdout,
    deno: header[1],
    channel: header[2],
    target: header[3],
    v8: v8[1],
    typescript: typescript[1],
  };
}

function requireStable(binary: string | undefined, env: Record<string, string>): { binary: string; version: Version } {
  const resolved = resolveExplicit(binary);
  const version = readVersion(resolved, env);
  if (version.channel !== "stable" || version.target !== "aarch64-apple-darwin") {
    throw new Error(`explicit Deno binary is not stable aarch64-apple-darwin: ${version.channel} ${version.target}`);
  }
  return { binary: resolved, version };
}

function spawnDeno(binary: string, args: string[], cwd: string, env: Record<string, string>) {
  if (args.includes("-A") || args.includes("--allow-all") || args.some((arg) => arg.startsWith("--allow-"))) {
    throw new Error("permission flags are not part of this launch");
  }
  return spawnSync(binary, args, { cwd, env, encoding: "utf8", shell: false, timeout: 30_000 });
}

function filesUnder(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else found.push(path);
    }
  };
  walk(root);
  return found;
}

function writeExecutable(path: string, source: string) {
  writeFileSync(path, source, { mode: 0o755 });
}

test("missing explicit path fails in the driver", () => {
  assert.throws(() => resolveExplicit(undefined), /explicit Deno path is required/u);
  assert.throws(() => resolveExplicit(join(tmpdir(), "missing-deno-launch-binary")), /explicit Deno path is missing/u);
});

test("Node is not a Deno launch fallback", () => {
  assert.throws(() => resolveExplicit(process.execPath), /Node is not a Deno launch fallback/u);
});

test("a non-stable explicit binary fails closed", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const fake = join(fixture.cwd, "fake-deno");
  writeExecutable(
    fake,
    "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then printf '%s\\n' 'deno 9.9.9 (canary, release, aarch64-apple-darwin)' 'v8 0.0.0' 'typescript 0.0.0'; exit 0; fi\necho should-not-launch\nexit 0\n",
  );
  assert.throws(
    () => requireStable(fake, allowlist(fixture)),
    /explicit Deno binary is not stable aarch64-apple-darwin: canary aarch64-apple-darwin/u,
  );
});

test("stable explicit binary launches identity under pre-start controls", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const env = allowlist(fixture);
  const { binary, version } = requireStable(process.env.SUPERMAN_DENO_BIN, env);
  const script = join(fixture.cwd, "identity.ts");
  writeFileSync(script, IDENTITY_SOURCE);
  const result = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script], fixture.cwd, env);
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const id = JSON.parse(result.stdout) as {
    deno: string;
    v8: string;
    ts: string;
    target: string;
    standalone: boolean;
    os: string;
  };
  assert.equal(id.deno, version.deno);
  assert.equal(id.v8, version.v8);
  assert.equal(id.ts, version.typescript);
  assert.equal(id.target, version.target);
  assert.equal(id.standalone, false);
  assert.equal(id.os, "darwin");
  assert.equal(filesUnder(fixture.home).length, 0);
  const outside = filesUnder(fixture.root).filter((path) => path !== script && !path.startsWith(`${fixture.denoDir}/`));
  assert.deepEqual(outside, []);
  const shim = join(fixture.denoDir, "node_compat_bin", "node");
  assert.equal(existsSync(shim), true);
  assert.equal(env.PATH.includes(fixture.denoDir), false);
  assert.equal(env.PATH.includes("node_compat_bin"), false);
});

test("parent unstable deno.json warns only without --no-config", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const env = allowlist(fixture);
  const { binary } = requireStable(process.env.SUPERMAN_DENO_BIN, env);
  const parent = join(fixture.root, "parent");
  const child = join(parent, "child");
  mkdirSync(child, { recursive: true });
  writeFileSync(join(parent, "deno.json"), '{"unstable":["not-a-feature"]}\n');
  const script = join(child, "identity.ts");
  writeFileSync(script, IDENTITY_SOURCE);
  const exposed = spawnDeno(binary, ["run", "--no-prompt", script], child, env);
  assert.ifError(exposed.error);
  assert.equal(exposed.status, 0);
  assert.match(exposed.stderr, /not-a-feature/u);
  assert.match(exposed.stderr, /unstable feature/u);
  const controlled = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script], child, env);
  assert.ifError(controlled.error);
  assert.equal(controlled.status, 0, controlled.stderr);
  assert.equal(controlled.stderr, "");
  assert.equal(JSON.parse(controlled.stdout).deno, JSON.parse(exposed.stdout).deno);
});

test("passed bad DENO_V8_FLAGS exits 1 with no identity stdout", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const env = allowlist(fixture, { DENO_V8_FLAGS: "--not-a-real-v8-flag" });
  const { binary } = requireStable(process.env.SUPERMAN_DENO_BIN, allowlist(fixture));
  const script = join(fixture.cwd, "identity.ts");
  writeFileSync(script, IDENTITY_SOURCE);
  const result = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script], fixture.cwd, env);
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /V8 did not recognize flag/u);
});

test("passed missing broker path exits 87", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const broker = join(fixture.root, "missing-broker.sock");
  const env = allowlist(fixture, { DENO_PERMISSION_BROKER_PATH: broker });
  const { binary } = requireStable(process.env.SUPERMAN_DENO_BIN, allowlist(fixture));
  const script = join(fixture.cwd, "identity.ts");
  writeFileSync(script, IDENTITY_SOURCE);
  const result = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script], fixture.cwd, env);
  assert.ifError(result.error);
  assert.equal(result.status, 87);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Permission broker is an experimental feature/u);
});

test("ungranted read of an owned path exits 1 NotCapable", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const env = allowlist(fixture);
  const { binary } = requireStable(process.env.SUPERMAN_DENO_BIN, env);
  const secret = join(fixture.cwd, "owned-secret.txt");
  writeFileSync(secret, "owned-secret\n");
  const script = join(fixture.cwd, "read.ts");
  writeFileSync(script, "await Deno.readTextFile(Deno.args[0]);\nconsole.log('read-ok');\n");
  const result = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script, secret], fixture.cwd, env);
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout.includes("owned-secret"), false);
  assert.equal(result.stdout.includes("read-ok"), false);
  assert.match(result.stderr, /NotCapable/u);
});

test("a PATH entry named deno is not executed", (t) => {
  const fixture = ownedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const shimDir = join(fixture.root, "shim");
  mkdirSync(shimDir);
  const marker = join(fixture.root, "shim-ran");
  writeExecutable(join(shimDir, "deno"), `#!/bin/sh\necho fake-deno\ntouch ${JSON.stringify(marker)}\nexit 0\n`);
  const shimEnv = allowlist(fixture, { PATH: `${shimDir}:/usr/bin:/bin` });
  const selected = spawnSync("deno", ["--version"], { cwd: fixture.cwd, env: shimEnv, encoding: "utf8", shell: false });
  assert.ifError(selected.error);
  assert.equal(selected.status, 0);
  assert.equal(selected.stdout, "fake-deno\n");
  assert.equal(existsSync(marker), true);
  rmSync(marker);

  const { binary } = requireStable(process.env.SUPERMAN_DENO_BIN, allowlist(fixture));
  const script = join(fixture.cwd, "identity.ts");
  writeFileSync(script, IDENTITY_SOURCE);
  const result = spawnDeno(binary, ["run", ...CONTROL_FLAGS, script], fixture.cwd, shimEnv);
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(marker), false);
  assert.equal(result.stdout.includes("fake-deno"), false);
  assert.equal(JSON.parse(result.stdout).standalone, false);
});
