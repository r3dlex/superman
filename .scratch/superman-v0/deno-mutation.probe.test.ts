// Measurement host for the approved Deno mutation-bridge pilot. Not an operational launcher.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";

const DENO_SHA256 = "d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba";
const STRYKER_BIN = join(process.cwd(), "node_modules/@stryker-mutator/core/bin/stryker.js");
const NODE_MODULES = join(process.cwd(), "node_modules");
const TOOL_IDENTITIES = [
  { name: "vitest", version: "5.0.5", sha256: "d00333f3a13ed44fedc77184c8675bae45246534f06684d94cff5e4f8a9f7c10" },
  {
    name: "@stryker-mutator/core",
    version: "10.1.1",
    sha256: "1b4b304cebbc3927f5e5d93b8c2e4a21c23c64de48fe4ab22988d3fffadccba2",
  },
  {
    name: "@stryker-mutator/vitest-runner",
    version: "10.1.1",
    sha256: "6ca8b7ced2942f4e53f29ee8724b74fa4b07990c95f29df5fb57e5f3971e4230",
  },
];

function requireToolIdentities(): void {
  for (const tool of TOOL_IDENTITIES) {
    const path = join(NODE_MODULES, tool.name, "package.json");
    const bytes = readFileSync(path);
    const parsed = JSON.parse(bytes.toString("utf8")) as { version?: string };
    assert.equal(parsed.version, tool.version, `${tool.name} version`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), tool.sha256, `${tool.name} package hash`);
  }
}
// Deno throws NotCapable if the instrumenter reads process.env while activeMutant is unset.
// The approved profile does not grant --allow-env, so every load sets the namespace first.

type Mutant = {
  id: string;
  mutatorName: string;
  replacement: string;
  status: string;
  static?: boolean;
  coveredBy?: string[];
  killedBy?: string[];
  location?: { start?: { line?: number } };
  statusReason?: string;
};

type Report = {
  files: Record<string, { mutants: Mutant[] }>;
  testFiles?: Record<string, { tests?: Array<{ id: string; name: string }> }>;
  framework?: { name?: string; version?: string };
  config?: { inPlace?: boolean; force?: boolean; testRunner?: string; concurrency?: number };
};

type ChildReport = {
  instrumented: boolean;
  subjectPath: string;
  activeBeforeLoad: string | null;
  label: string;
  value: string;
  coverage: { static: Record<string, number>; perTest: Record<string, Record<string, number>> };
  hitCount: number;
};

function requireDeno(): string {
  const path = process.env.SUPERMAN_DENO_BIN;
  if (!path) throw new Error("SUPERMAN_DENO_BIN is required");
  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (digest !== DENO_SHA256) throw new Error(`SUPERMAN_DENO_BIN digest is not the verified candidate: ${digest}`);
  return path;
}

function requireRoot(): string {
  const root = process.env.SUPERMAN_MUTATION_ROOT;
  if (!root) throw new Error("SUPERMAN_MUTATION_ROOT is required");
  return root;
}

function clearedLaunchPrefixSource(): string {
  return `"-i", "PATH=/usr/bin:/bin", \`HOME=\${home}\`, \`TMPDIR=\${tmp}\`, \`DENO_DIR=\${denoDir}\`, "DENO_NO_UPDATE_CHECK=1", "DENO_NO_PACKAGE_JSON=1", deno, "run", "--no-prompt", "--no-lock", "--no-npm", "--no-remote"`;
}

function subjectSource(): string {
  return [
    'export const label = 1 > 0 ? "yes" : "no";',
    "",
    "export function classify(n: number): string {",
    '  if (n > 0) return "positive";',
    '  return "non-positive";',
    "}",
    "",
    "export function unused(n: number): number {",
    "  return n + 1;",
    "}",
    "",
  ].join("\n");
}

function bridgeSource(): string {
  return `const subjectPath = Deno.args[2];
if (!subjectPath) throw new Error("subject path missing");
const mutantId = Deno.args[0] ?? "";
const testId = Deno.args[1] ?? "";
const source = await Deno.readTextFile(subjectPath);
const instrumented = source.includes("stryMutAct_9fa48");
type StrykerNamespace = {
  activeMutant?: string;
  currentTestId?: string;
  mutantCoverage?: { static: Record<string, number>; perTest: Record<string, Record<string, number>> };
  hitCount?: number;
};
const host = globalThis as typeof globalThis & { __stryker__?: StrykerNamespace };
const ns: StrykerNamespace = host.__stryker__ ?? (host.__stryker__ = {});
ns.activeMutant = mutantId;
ns.hitCount = 0;
if (testId !== "") ns.currentTestId = testId;
const activeBeforeLoad = ns.activeMutant === "" ? null : ns.activeMutant ?? null;
const loaded = (await import("./subject.ts")) as { label: string; classify: (n: number) => string };
console.log(
  JSON.stringify({
    instrumented,
    subjectPath,
    activeBeforeLoad,
    label: loaded.label,
    value: loaded.classify(1),
    coverage: ns.mutantCoverage ?? { static: {}, perTest: {} },
    hitCount: ns.hitCount ?? 0,
  }),
);
`;
}

function vitestTestSource(): string {
  return `import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

type StrykerNamespace = {
  activeMutant?: string;
  currentTestId?: string;
  mutantCoverage?: { static: Record<string, number>; perTest: Record<string, Record<string, number>> };
  hitCount?: number;
};

const host = globalThis as typeof globalThis & { __stryker__?: StrykerNamespace };
const ns: StrykerNamespace = host.__stryker__ ?? (host.__stryker__ = {});

test("positive input stays positive", () => {
  const root = process.env.SUPERMAN_MUTATION_ROOT;
  const deno = process.env.SUPERMAN_DENO_BIN;
  const project = process.env.SUPERMAN_PILOT_PROJECT;
  if (!root || !deno || !project) throw new Error("pilot env missing");
  const pilot = join(project, "pilot");
  const worker = String(process.pid);
  const home = join(root, "workers", worker, "home");
  const tmp = join(root, "workers", worker, "tmp");
  const denoDir = join(root, "workers", worker, "deno-dir");
  const hostile = join(root, "workers", worker, "hostile-home");
  for (const dir of [home, tmp, denoDir, hostile]) mkdirSync(dir, { recursive: true });
  const mutantId = ns.activeMutant ?? "";
  const testId = ns.currentTestId ?? "";
  const subject = join(pilot, "subject.ts");
  const workerEnv = {
    PATH: "/usr/bin:/bin",
    HOME: hostile,
    TMPDIR: tmp,
    DENO_DIR: denoDir,
    DENO_V8_FLAGS: "--not-a-real-v8-flag",
    DENO_PERMISSION_BROKER_PATH: join(hostile, "missing-broker.sock"),
    NODE_OPTIONS: "--require ./not-loaded.js",
  };
  const child = spawnSync(
    "/usr/bin/env",
    [
      ${clearedLaunchPrefixSource()},
      "--no-config",
      \`--allow-read=\${pilot}\`,
      join(pilot, "bridge.ts"),
      mutantId,
      testId,
      subject,
    ],
    {
      cwd: pilot,
      env: workerEnv,
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    },
  );
  const outcomes = join(project, "outcomes");
  mkdirSync(outcomes, { recursive: true });
  writeFileSync(
    join(outcomes, \`\${worker}-\${mutantId || "dry"}-\${Date.now()}.json\`),
    JSON.stringify({
      requestedMutant: mutantId,
      testId,
      startedAt: Date.now(),
      pid: process.pid,
      denoDir,
      status: child.status,
      signal: child.signal,
      stderr: child.stderr,
      stdout: child.stdout,
      error: child.error?.message ?? null,
    }),
  );
  if (child.error || child.signal || child.status !== 0) process.kill(process.pid, "SIGKILL");
  const parsed = JSON.parse(child.stdout) as ChildShape;
  if (parsed.coverage) ns.mutantCoverage = parsed.coverage;
  if (typeof parsed.hitCount === "number") ns.hitCount = parsed.hitCount;
  expect(parsed.label).toBe("yes");
  expect(parsed.value).toBe("positive");
});

test("unrelated control does not load the subject", () => {
  expect(1).toBe(1);
});

type ChildShape = { label: string; value: string; coverage?: StrykerNamespace["mutantCoverage"]; hitCount?: number };
`;
}

function writeFixture(
  project: string,
  include: string,
  files: Record<string, string>,
  stryker: Record<string, unknown>,
): void {
  const pilot = join(project, "pilot");
  mkdirSync(pilot, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(pilot, name), text);
  writeFileSync(join(project, "package.json"), '{"private":true,"type":"module"}\n');
  writeFileSync(
    join(project, "vitest.config.ts"),
    `import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { environment: "node", include: [${JSON.stringify(include)}] } });\n`,
  );
  writeFileSync(
    join(project, "stryker.config.json"),
    JSON.stringify(
      {
        testRunner: "vitest",
        plugins: ["@stryker-mutator/vitest-runner"],
        vitest: { configFile: "vitest.config.ts", related: false },
        mutate: ["pilot/subject.ts"],
        reporters: ["json"],
        jsonReporter: { fileName: "mutation.json" },
        coverageAnalysis: "perTest",
        thresholds: { high: 100, low: 0, break: null },
        inPlace: true,
        force: true,
        incremental: false,
        symlinkNodeModules: false,
        ...stryker,
      },
      null,
      2,
    ),
  );
  symlinkSync(NODE_MODULES, join(project, "node_modules"));
}

function writeProject(project: string): string {
  const source = subjectSource();
  writeFixture(
    project,
    "pilot/subject.test.ts",
    {
      "subject.ts": source,
      "bridge.ts": bridgeSource(),
      "subject.test.ts": vitestTestSource(),
      "deno.json": '{"unstable":["not-a-feature"]}\n',
    },
    { reporters: ["clear-text", "json"], concurrency: 2, timeoutMS: 60_000, timeoutFactor: 1.5 },
  );
  return source;
}

function runStryker(
  project: string,
  deno: string,
  root: string,
): { status: number | null; stdout: string; stderr: string } {
  requireToolIdentities();
  const result = spawnSync(
    process.execPath,
    [
      STRYKER_BIN,
      "run",
      "stryker.config.json",
      "--inPlace",
      "--force",
      "--allowConsoleColors",
      "false",
      "--concurrency",
      "2",
      "--mutate",
      "pilot/subject.ts",
    ],
    {
      cwd: project,
      env: {
        PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
        HOME: join(root, "stryker-home"),
        TMPDIR: join(root, "stryker-tmp"),
        CI: "true",
        SUPERMAN_DENO_BIN: deno,
        SUPERMAN_MUTATION_ROOT: root,
        SUPERMAN_PILOT_PROJECT: project,
      },
      encoding: "utf8",
      shell: false,
      timeout: 240_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

type Outcome = {
  requestedMutant: string;
  testId: string;
  startedAt: number;
  pid: number;
  denoDir: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
};

function testName(report: Report, id: string): string {
  for (const file of Object.values(report.testFiles ?? {})) {
    const found = file.tests?.find((item) => item.id === id);
    if (found) return found.name;
  }
  throw new Error(`unknown Stryker test id ${id}`);
}

function pidIsGone(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH";
  }
}

function mutantBy(mutants: Mutant[], replacement: string, line: number): Mutant {
  const found = mutants.find((mutant) => mutant.replacement === replacement && mutant.location?.start?.line === line);
  if (!found) throw new Error(`missing mutant ${replacement} at line ${line}`);
  return found;
}

test("Stryker kills a load-time mutant only after Deno loaded the instrumented snapshot with that id set", {
  timeout: 300_000,
}, (t) => {
  const deno = requireDeno();
  const root = requireRoot();
  const project = join(root, "project");
  rmSync(project, { recursive: true, force: true });
  mkdirSync(join(root, "stryker-home"), { recursive: true });
  mkdirSync(join(root, "stryker-tmp"), { recursive: true });
  const original = writeProject(project);
  const nodeModulesStamp = statSync(join(NODE_MODULES, "@stryker-mutator/core/package.json")).mtimeMs;
  t.after(() => {
    const reportPath = join(project, "mutation.json");
    if (existsSync(reportPath)) writeFileSync(join(root, "mutation.json"), readFileSync(reportPath));
    const outcomes = join(project, "outcomes");
    if (existsSync(outcomes)) {
      rmSync(join(root, "outcomes"), { recursive: true, force: true });
      mkdirSync(join(root, "outcomes"), { recursive: true });
      for (const name of readdirSync(outcomes))
        writeFileSync(join(root, "outcomes", name), readFileSync(join(outcomes, name)));
    }
  });
  const run = runStryker(project, deno, root);
  writeFileSync(join(root, "stryker-stdout.txt"), run.stdout);
  writeFileSync(join(root, "stryker-stderr.txt"), run.stderr);
  const reportPath = join(project, "mutation.json");
  assert.equal(existsSync(reportPath), true, `missing Stryker report\n${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
  assert.equal(report.framework?.name, "StrykerJS");
  assert.equal(report.framework?.version, "10.1.1");
  assert.equal(report.config?.inPlace, true);
  assert.equal(report.config?.testRunner, "vitest");
  const subjectFile = Object.entries(report.files).find(([name]) => name.endsWith("pilot/subject.ts"));
  assert.ok(subjectFile, `no subject in report: ${Object.keys(report.files).join(",")}`);
  const [reportedSubject, subjectReport] = subjectFile;
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.includes("Instrumented 1 source file(s) with 15 mutant(s)"), true);
  assert.equal(report.config?.force, true);
  assert.equal(report.config?.concurrency, 2);
  const mutants = subjectReport.mutants;
  const killed = mutantBy(mutants, "false", 1);
  const survivor = mutantBy(mutants, "true", 1);
  const uncovered = mutantBy(mutants, "n - 1", 9);
  assert.equal(killed.status, "Killed");
  assert.deepEqual(
    killed.killedBy?.map((id) => testName(report, id)),
    ["positive input stays positive"],
  );
  assert.deepEqual(survivor.killedBy ?? [], []);
  assert.equal(survivor.status, "Survived");
  assert.deepEqual(
    survivor.coveredBy?.map((id) => testName(report, id)),
    ["positive input stays positive"],
  );
  assert.equal(uncovered.status, "NoCoverage");
  assert.deepEqual(uncovered.coveredBy ?? [], []);
  const names = Object.values(report.testFiles ?? {}).flatMap((item) => item.tests?.map((entry) => entry.name) ?? []);
  assert.deepEqual(names.sort(), ["positive input stays positive", "unrelated control does not load the subject"]);
  for (const mutant of mutants) {
    const attributed = (mutant.coveredBy ?? []).map((id) => testName(report, id));
    assert.equal(attributed.includes("unrelated control does not load the subject"), false, mutant.id);
  }
  const outcomes = readdirSync(join(project, "outcomes")).map(
    (name) => JSON.parse(readFileSync(join(project, "outcomes", name), "utf8")) as Outcome,
  );
  const proof = outcomes.find((child) => child.requestedMutant === killed.id);
  assert.ok(proof, "no child outcome for the killed load-time mutant");
  const parsed = JSON.parse(proof.stdout) as ChildReport;
  assert.equal(parsed.instrumented, true);
  assert.equal(parsed.subjectPath, join(project, "pilot/subject.ts"));
  assert.equal(reportedSubject, "pilot/subject.ts");
  assert.equal(parsed.activeBeforeLoad, killed.id);
  assert.equal(parsed.label, "no");
  assert.equal(parsed.hitCount, 1);
  const dry = outcomes.find((child) => child.requestedMutant === "");
  assert.ok(dry, "missing dry-run child outcome");
  const dryReport = JSON.parse(dry.stdout) as ChildReport;
  const counterKeys = Object.keys(dryReport.coverage.perTest);
  assert.deepEqual(counterKeys, [dry.testId]);
  assert.equal(dry.testId.endsWith("#positive input stays positive"), true, dry.testId);
  const counts = dryReport.coverage.perTest[dry.testId];
  assert.equal(counts?.[killed.id], 1);
  assert.equal(counts?.[survivor.id], 1);
  assert.equal(Object.hasOwn(counts ?? {}, uncovered.id), false);
  const mutantRuns = outcomes.filter((child) => child.requestedMutant !== "");
  const pids = new Set(mutantRuns.map((child) => child.pid));
  const dirs = new Set(mutantRuns.map((child) => child.denoDir));
  assert.equal(pids.size >= 2, true, `mutant workers=${[...pids].join(",")}`);
  assert.equal(dirs.size, pids.size);
  const spans = [...pids].map((pid) => {
    const times = mutantRuns.filter((child) => child.pid === pid).map((child) => child.startedAt);
    return { start: Math.min(...times), end: Math.max(...times) };
  });
  assert.equal(spans.length >= 2, true);
  assert.equal(
    spans[0] !== undefined &&
      spans[1] !== undefined &&
      spans[0].start <= spans[1].end &&
      spans[1].start <= spans[0].end,
    true,
  );
  for (const child of outcomes) {
    assert.equal(child.stderr.includes("V8 did not recognize flag"), false, child.stderr);
    assert.equal(child.stderr.includes("Permission broker"), false, child.stderr);
    assert.equal(child.stderr.includes("not-a-feature"), false, child.stderr);
    assert.equal(pidIsGone(child.pid), true, `worker ${child.pid} still alive`);
    if (child.requestedMutant === "") continue;
    const body = JSON.parse(child.stdout) as ChildReport;
    assert.equal(body.instrumented, true);
    assert.equal(body.activeBeforeLoad, child.requestedMutant);
  }
  assert.equal(readFileSync(join(project, "pilot/subject.ts"), "utf8"), original);
  assert.equal(statSync(join(NODE_MODULES, "@stryker-mutator/core/package.json")).mtimeMs, nodeModulesStamp);
});

test("a permission or config failure is not a Stryker kill", { timeout: 180_000 }, (t) => {
  const deno = requireDeno();
  const root = requireRoot();
  const project = join(root, "denial");
  rmSync(project, { recursive: true, force: true });
  const pilot = join(project, "pilot");
  mkdirSync(pilot, { recursive: true });
  writeFileSync(join(pilot, "deno.json"), "{not-json\n");
  writeFileSync(join(pilot, "secret.txt"), "secret\n");
  writeFileSync(join(pilot, "config.ts"), 'console.log("configured");\n');
  writeFileSync(join(pilot, "read.ts"), 'await Deno.readTextFile("./secret.txt");\nconsole.log("read");\n');
  writeFileSync(join(pilot, "subject.ts"), "export const value = 1 + 1;\n");
  writeFileSync(
    join(pilot, "denial.test.ts"),
    `import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";

test("denied launch is a tool failure", () => {
  const project = process.env.SUPERMAN_PILOT_PROJECT;
  const deno = process.env.SUPERMAN_DENO_BIN;
  const root = process.env.SUPERMAN_MUTATION_ROOT;
  if (!project || !deno || !root) throw new Error("pilot env missing");
  const pilot = join(project, "pilot");
  const home = join(root, "denial-home");
  const tmp = join(root, "denial-tmp");
  const denoDir = join(root, "denial-deno");
  for (const dir of [home, tmp, denoDir]) mkdirSync(dir, { recursive: true });
  const shared = [${clearedLaunchPrefixSource()}];
  const config = spawnSync("/usr/bin/env", [...shared, join(pilot, "config.ts")], {
    cwd: pilot,
    env: { PATH: "/usr/bin:/bin", HOME: home, TMPDIR: tmp, DENO_V8_FLAGS: "--not-a-real-v8-flag" },
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  const child = spawnSync("/usr/bin/env", [...shared, "--no-config", join(pilot, "read.ts")], {
    cwd: pilot,
    env: { PATH: "/usr/bin:/bin", HOME: home, TMPDIR: tmp, DENO_V8_FLAGS: "--not-a-real-v8-flag" },
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  writeFileSync(join(project, "denial-outcome.json"), JSON.stringify({ configStatus: config.status, configStderr: config.stderr, status: child.status, stderr: child.stderr }));
  process.kill(process.pid, "SIGKILL");
});
`,
  );
  writeFixture(project, "pilot/denial.test.ts", {}, { concurrency: 1, timeoutMS: 60_000, timeoutFactor: 1.5 });
  t.after(() => {
    const outcome = join(project, "denial-outcome.json");
    if (existsSync(outcome)) writeFileSync(join(root, "denial-outcome.json"), readFileSync(outcome));
  });
  const run = runStryker(project, deno, root);
  writeFileSync(join(root, "denial-stdout.txt"), run.stdout);
  const outcomePath = join(project, "denial-outcome.json");
  assert.equal(existsSync(outcomePath), true, run.stdout);
  const outcome = JSON.parse(readFileSync(outcomePath, "utf8")) as {
    status: number | null;
    stderr: string;
    configStatus: number | null;
    configStderr: string;
  };
  assert.equal(outcome.configStatus !== 0, true, outcome.configStderr);
  assert.equal(outcome.configStderr.length > 0, true, outcome.configStderr);
  assert.match(outcome.configStderr, /Failed deserializing config file/u);
  assert.match(outcome.configStderr, /Expected colon/u);
  assert.equal(outcome.status !== 0, true);
  assert.equal(outcome.stderr.includes("NotCapable"), true, outcome.stderr);
  const reportPath = join(project, "mutation.json");
  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
    const killed = Object.values(report.files)
      .flatMap((item) => item.mutants)
      .filter((mutant) => mutant.status === "Killed");
    assert.deepEqual(killed, []);
  }
  assert.equal(run.stdout.includes('"status":"Killed"') || run.stdout.includes('"status": "Killed"'), false);
});

test("a read denial during a covered mutant run is RuntimeError, not Killed", { timeout: 180_000 }, () => {
  const deno = requireDeno();
  const root = requireRoot();
  const project = join(root, "covered-denial");
  rmSync(project, { recursive: true, force: true });
  writeFixture(
    project,
    "pilot/subject.test.ts",
    {
      "subject.ts": 'export const label = 1 > 0 ? "yes" : "no";\n',
      "secret.txt": "secret\n",
      "read.ts": 'await Deno.readTextFile("./secret.txt");\n',
      "load.ts": `const host = globalThis as typeof globalThis & { __stryker__?: { activeMutant?: string; currentTestId?: string; mutantCoverage?: unknown; hitCount?: number } };
const ns = host.__stryker__ ?? (host.__stryker__ = {});
ns.activeMutant = Deno.args[0] ?? "";
ns.hitCount = 0;
if (Deno.args[1]) ns.currentTestId = Deno.args[1];
const loaded = (await import("./subject.ts")) as { label: string };
console.log(JSON.stringify({ label: loaded.label, coverage: ns.mutantCoverage ?? { static: {}, perTest: {} } }));
`,
      "subject.test.ts": `import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

test("covered load", () => {
  const project = process.env.SUPERMAN_PILOT_PROJECT;
  const deno = process.env.SUPERMAN_DENO_BIN;
  const root = process.env.SUPERMAN_MUTATION_ROOT;
  if (!project || !deno || !root) throw new Error("pilot env missing");
  const ns = (globalThis as { __stryker__?: { activeMutant?: string; currentTestId?: string; mutantCoverage?: unknown } }).__stryker__;
  const pilot = join(project, "pilot");
  const home = join(root, "covered-home");
  const tmp = join(root, "covered-tmp");
  const denoDir = join(root, "covered-deno");
  for (const dir of [home, tmp, denoDir]) mkdirSync(dir, { recursive: true });
  const mutantId = ns?.activeMutant ?? "";
  const args = [${clearedLaunchPrefixSource()}, "--no-config"];
  const child = mutantId
    ? spawnSync("/usr/bin/env", [...args, join(pilot, "read.ts")], { cwd: pilot, env: { PATH: "/usr/bin:/bin", HOME: home, TMPDIR: tmp }, encoding: "utf8", shell: false, timeout: 30_000 })
    : spawnSync("/usr/bin/env", [...args, \`--allow-read=\${pilot}\`, join(pilot, "load.ts"), "", ns?.currentTestId ?? ""], { cwd: pilot, env: { PATH: "/usr/bin:/bin", HOME: home, TMPDIR: tmp }, encoding: "utf8", shell: false, timeout: 30_000 });
  writeFileSync(join(project, \`covered-\${mutantId || "dry"}.json\`), JSON.stringify({ mutantId, status: child.status, stderr: child.stderr, stdout: child.stdout }));
  if (mutantId) process.kill(process.pid, "SIGKILL");
  const parsed = JSON.parse(child.stdout) as { coverage?: unknown };
  if (ns && parsed.coverage) ns.mutantCoverage = parsed.coverage;
  expect(child.status).toBe(0);
});
`,
    },
    { concurrency: 1, timeoutMS: 60_000, timeoutFactor: 1.5 },
  );
  const run = runStryker(project, deno, root);
  const reportPath = join(project, "mutation.json");
  assert.equal(existsSync(reportPath), true, `${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
  const mutants = Object.values(report.files).flatMap((item) => item.mutants);
  const denied = mutants.filter((mutant) => mutant.status === "RuntimeError");
  assert.equal(denied.length > 0, true, JSON.stringify(mutants.map((mutant) => mutant.status)));
  assert.equal(
    mutants.some((mutant) => mutant.status === "Killed"),
    false,
  );
  assert.equal(
    denied.every((mutant) => (mutant.coveredBy ?? []).length > 0),
    true,
  );
  const outcome = JSON.parse(readFileSync(join(project, `covered-${denied[0]?.id}.json`), "utf8")) as {
    stderr: string;
  };
  assert.equal(outcome.stderr.includes("NotCapable"), true, outcome.stderr);
});

test("a Stryker timeout of a covered mutant is not a kill", { timeout: 180_000 }, () => {
  const deno = requireDeno();
  const root = requireRoot();
  const project = join(root, "timeout");
  rmSync(project, { recursive: true, force: true });
  writeFixture(
    project,
    "pilot/subject.test.ts",
    {
      "subject.ts": 'export const label = 1 > 0 ? "yes" : "no";\n',
      "load.ts": `const host = globalThis as typeof globalThis & { __stryker__?: { activeMutant?: string; currentTestId?: string; mutantCoverage?: unknown; hitCount?: number } };
const ns = host.__stryker__ ?? (host.__stryker__ = {});
ns.activeMutant = "";
ns.hitCount = 0;
if (Deno.args[0]) ns.currentTestId = Deno.args[0];
await import("./subject.ts");
console.log(JSON.stringify({ coverage: ns.mutantCoverage ?? { static: {}, perTest: {} } }));
`,
      "subject.test.ts": `import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

test("covered load times out when a mutant is active", async () => {
  const project = process.env.SUPERMAN_PILOT_PROJECT;
  const deno = process.env.SUPERMAN_DENO_BIN;
  const root = process.env.SUPERMAN_MUTATION_ROOT;
  if (!project || !deno || !root) throw new Error("pilot env missing");
  const ns = (globalThis as { __stryker__?: { activeMutant?: string; currentTestId?: string; mutantCoverage?: unknown } }).__stryker__;
  if (ns?.activeMutant) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    return;
  }
  const pilot = join(project, "pilot");
  const home = join(root, "timeout-home");
  const tmp = join(root, "timeout-tmp");
  const denoDir = join(root, "timeout-deno");
  for (const dir of [home, tmp, denoDir]) mkdirSync(dir, { recursive: true });
  const child = spawnSync("/usr/bin/env", [${clearedLaunchPrefixSource()}, "--no-config", \`--allow-read=\${pilot}\`, join(pilot, "load.ts"), ns?.currentTestId ?? ""], { cwd: pilot, env: { PATH: "/usr/bin:/bin", HOME: home, TMPDIR: tmp }, encoding: "utf8", shell: false, timeout: 30_000 });
  const parsed = JSON.parse(child.stdout) as { coverage?: unknown };
  if (ns && parsed.coverage) ns.mutantCoverage = parsed.coverage;
  expect(child.status).toBe(0);
});
`,
    },
    { concurrency: 1, timeoutMS: 100, timeoutFactor: 1 },
  );
  const run = runStryker(project, deno, root);
  const reportPath = join(project, "mutation.json");
  assert.equal(existsSync(reportPath), true, `${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
  const mutants = Object.values(report.files).flatMap((item) => item.mutants);
  const timedOut = mutants.filter((mutant) => mutant.status === "Timeout");
  assert.equal(
    timedOut.length > 0,
    true,
    JSON.stringify(mutants.map((mutant) => [mutant.id, mutant.status, mutant.coveredBy])),
  );
  assert.equal(
    mutants.some((mutant) => mutant.status === "Killed"),
    false,
  );
  assert.equal(
    timedOut.every((mutant) => (mutant.coveredBy ?? []).length > 0),
    true,
  );
});
