// Approved wizard process/filesystem/tool seams; no real GitHub or user configuration.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type TestContext, test } from "node:test";

const checkout = resolve(import.meta.dirname, "../..");
// Explicit, test-only oracle mode replays the externally preserved original.
const baseline = process.env.SUPERMAN_WIZARD_BASELINE;
const entrypoint = join(import.meta.dirname, "archgate-linux-arm64-wizard.ts");
const candidateHash = "b82d14bd3717287c78a2e1351107a49a925192cae59c0f844437eed8a0d6caef";

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "superman-wizard-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const folder of ["bin", "home", "tmp", "work"]) mkdirSync(join(root, folder));
  // No ambient PATH: in particular no real gh, browser opener or archive program.
  for (const name of ["mkdir", "dirname", "mktemp", "grep", "tail", "cat", "rm", "awk"])
    symlinkSync([`/usr/bin/${name}`, `/bin/${name}`].find(existsSync) as string, join(root, "bin", name));
  const driver = join(root, "tool.cjs");
  writeFileSync(
    driver,
    `#!${process.execPath}\nconst fs = require("node:fs"); const path = require("node:path");
const tool = path.basename(process.argv[1]); const args = process.argv.slice(2);
const call = {tool, args, cwd: process.cwd()};
const failing = process.env.WIZARD_FAIL === [tool, ...args.slice(0, 2)].join(" ") || process.env.WIZARD_FAIL === tool;
if (failing && process.env.WIZARD_READ_STDIN === "yes") call.stdin = fs.readFileSync(0, "utf8");
fs.appendFileSync(process.env.WIZARD_TRACE, JSON.stringify(call) + "\\n");
if (failing) { console.error("fixture command failure"); process.exit(42); }
if (process.env.WIZARD_SIGNAL === tool) process.kill(process.pid, "SIGTERM");
if (tool === "gh" && args[0] === "run" && args[1] === "download" && process.env.WIZARD_ARCHIVE === "yes")
  fs.writeFileSync(path.join(args[args.indexOf("--dir") + 1], "archgate-linux-arm64.tar.gz"), "fixture archive\\n");
if (tool === "shasum") console.log((process.env.WIZARD_HASH || "${candidateHash}") + "  " + args[2]);
if (tool === "tar") process.stdout.write("archgate\\nLICENSE.md\\n");
if (tool === "tput") {
  const styles = {bold: "<bold>", dim: "<dim>", sgr0: "<reset>", clear: "<clear>", "setaf 4": "<blue>", "setaf 2": "<green>", "setaf 3": "<yellow>"};
  process.stdout.write(args[0] === "colors" ? "8\\n" : styles[args.join(" ")]);
}
`,
  );
  chmodSync(driver, 0o755);
  const env: NodeJS.ProcessEnv = {
    PATH: join(root, "bin"),
    HOME: join(root, "home"),
    TMPDIR: join(root, "tmp"),
    LANG: "C",
    TERM: "dumb",
    WIZARD_TRACE: join(root, "trace.jsonl"),
    NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE,
  };
  let runCount = 0;
  return {
    root,
    env,
    tool(name: string) {
      symlinkSync(driver, join(root, "bin", name));
    },
    start() {
      const command = [baseline ? "/bin/bash" : process.execPath, baseline ?? entrypoint];
      const child = spawn(command[0], command.slice(1), {
        cwd: join(root, "work"),
        env,
        stdio: "pipe",
        shell: false,
      });
      t.after(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
      return child;
    },
    terminal(input: string, extra: NodeJS.ProcessEnv = {}) {
      const command = [baseline ? "/bin/bash" : process.execPath, baseline ?? entrypoint];
      const args =
        process.platform === "darwin"
          ? ["-q", "/dev/null", ...command]
          : [
              "-q",
              "-e",
              "-c",
              `exec ${command.map((arg) => `'${arg.replaceAll("'", "'\\''")}'`).join(" ")}`,
              "/dev/null",
            ];
      writeFileSync(join(root, "input"), input);
      // Real files avoid macOS script's ioctl rejection of socket-backed stdio.
      const fds = [
        openSync(join(root, "input"), "r"),
        openSync(join(root, "output"), "w"),
        openSync(join(root, "error"), "w"),
      ];
      try {
        const result = spawnSync("/usr/bin/script", args, {
          cwd: join(root, "work"),
          env: { ...env, TERM: "xterm", SHELL: "/bin/sh", ...extra },
          stdio: fds,
          shell: false,
          timeout: 10_000,
        });
        assert.ifError(result.error);
        return {
          status: result.status,
          output: readFileSync(join(root, "output"), "utf8"),
          stderr: readFileSync(join(root, "error"), "utf8"),
        };
      } finally {
        for (const fd of fds) closeSync(fd);
      }
    },
    run(input: string, extra: NodeJS.ProcessEnv = {}) {
      const result = spawnSync(baseline ? "/bin/bash" : process.execPath, [baseline ?? entrypoint], {
        cwd: join(root, "work"),
        env: { ...env, ...extra },
        input,
        encoding: "utf8",
        shell: false,
        timeout: 10_000,
      });
      assert.ifError(result.error);
      const output = result.stdout;
      const calls: { tool: string; args: string[]; cwd: string; stdin?: string }[] = existsSync(
        env.WIZARD_TRACE as string,
      )
        ? readFileSync(env.WIZARD_TRACE as string, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [];
      const envPath = extra.ENV_FILE || join(root, "work/.env");
      const saved = existsSync(envPath)
        ? { bytes: readFileSync(envPath, "utf8"), mode: statSync(envPath).mode & 0o777 }
        : undefined;
      const observation = { status: result.status, signal: result.signal, output, stderr: result.stderr, calls, saved };
      if (process.env.SUPERMAN_WIZARD_OBSERVATIONS) {
        const directory = process.env.SUPERMAN_WIZARD_OBSERVATIONS;
        mkdirSync(directory, { recursive: true });
        writeFileSync(
          join(directory, `${t.name.replace(/[^\w-]/gu, "_")}-${++runCount}.json`),
          JSON.stringify(observation),
        );
      }
      return { ...observation, output };
    },
  };
}

test("wizard refuses an unconfirmed workflow without invoking external services", (t) => {
  const repo = fixture(t);
  const result = repo.run("\nn\n");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Stage 1\/7 · Commit the candidate workflow/u);
  const workflow = baseline
    ? join(dirname(baseline), "archgate-linux-arm64-candidate.yml")
    : join(checkout, ".scratch/superman-v0/archgate-linux-arm64-candidate.yml");
  assert.ok(result.output.includes(`Copy ${workflow} to .github/workflows/archgate-linux-arm64-candidate.yml.`));
  assert.match(result.output, /Stop here\. Dispatch needs the workflow on the branch\./u);
  assert.doesNotMatch(result.output, /Stage 2/u);
  assert.equal(existsSync(join(repo.root, "work/.env")), false);
});

test("wizard opens the build page but refuses EOF at the run id after declining dispatch", (t) => {
  const repo = fixture(t);
  repo.tool("open");
  const result = repo.run("\ny\nn\n");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Stage 2\/7 · Dispatch the self-hosted build/u);
  assert.doesNotMatch(result.output, /Stage 3/u);
  assert.deepEqual(result.calls, [
    {
      tool: "open",
      args: ["https://github.com/r3dlex/superman/actions/workflows/archgate-linux-arm64-candidate.yml"],
      cwd: join(repo.root, "work"),
    },
  ]);
  assert.equal(existsSync(join(repo.root, "work/.env")), false);
});

test("wizard saves the run id in cwd dotenv with mode 0600 and refuses a missing downloaded archive", (t) => {
  const repo = fixture(t);
  repo.tool("open");
  repo.tool("gh");
  const result = repo.run("\ny\nn\nrun42\n");
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Stage 3\/7 · Download the candidate/u);
  assert.doesNotMatch(result.output, /Stage 4/u);
  assert.deepEqual(result.saved, { bytes: "ARCHGATE_ARM64_RUN_ID='run42'\n", mode: 0o600 });
  assert.equal(existsSync(join(repo.root, "home/.config/superman-agent")), false);
  assert.deepEqual(
    result.calls.map((call) => call.tool),
    ["open", "gh"],
  );
  const download = result.calls[1];
  assert.deepEqual(download.args.slice(0, -1), [
    "run",
    "download",
    "run42",
    "--repo",
    "r3dlex/superman",
    "--name",
    "archgate-linux-arm64-candidate",
    "--dir",
  ]);
  assert.ok(download.args.at(-1)?.startsWith(join(repo.root, "tmp/archgate-arm64-candidate.")));
  assert.equal(download.cwd, join(repo.root, "work"));
});

test("wizard lists but rejects both known unapproved archive hashes before asking for publication", async (t) => {
  for (const hash of [
    "80c87fa1f44438ea3b004acaf1aadfdfd306bd2595640b4664cefef882c473e3",
    "496d9c989ff6214b77909864d562e336feaacc119aca8e4fa4349e01b4263b6b",
  ]) {
    await t.test(hash, (t) => {
      const repo = fixture(t);
      for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
      const result = repo.run("\ny\nn\nrun42\n", { WIZARD_ARCHIVE: "yes", WIZARD_HASH: hash });
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Stage 4\/7 · Inspect the archive/u);
      assert.ok(result.output.includes(`Archive sha256: ${hash}`));
      assert.match(result.output, /archgate\nLICENSE\.md\n/u);
      assert.match(result.output, /This is an old unapproved archive\. Do not publish it\./u);
      assert.doesNotMatch(result.output, /Stage 5|Do you accept/u);
      const archive = join(result.calls[1].args.at(-1) as string, "archgate-linux-arm64.tar.gz");
      assert.deepEqual(
        result.calls.slice(2).map(({ tool, args }) => ({ tool, args })),
        [
          { tool: "shasum", args: ["-a", "256", archive] },
          { tool: "tar", args: ["-tzf", archive] },
        ],
      );
      assert.equal(result.saved?.bytes, `ARCHGATE_ARM64_RUN_ID='run42'\nARCHGATE_ARM64_ARCHIVE='${archive}'\n`);
    });
  }
});

test("wizard records the inspected hash but stops when redistribution acceptance is declined", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
  const result = repo.run("\ny\nn\nrun42\n\nn\n", { WIZARD_ARCHIVE: "yes" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Stage 5\/7 · Accept the notice set/u);
  assert.match(result.output, /Stopped before publication\. The arm64 job stays red\./u);
  assert.doesNotMatch(result.output, /Stage 6/u);
  assert.equal(result.calls.at(-1)?.tool, "open");
  assert.deepEqual(result.calls.at(-1)?.args, ["https://github.com/r3dlex/superman/actions/runs/run42"]);
  assert.ok(result.saved?.bytes.endsWith(`ARCHGATE_ARM64_ARCHIVE_SHA256='${candidateHash}'\n`));
  assert.equal(
    result.calls.some((call) => call.args[0] === "release"),
    false,
  );
});

test("wizard requires a separate final confirmation before creating the protected prerelease tag", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
  const result = repo.run("\ny\nn\nrun42\n\ny\nn\n", { WIZARD_ARCHIVE: "yes" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Stage 6\/7 · Publish the prerelease/u);
  assert.match(result.output, /This creates a protected tag\. It is irreversible without an admin tag delete\./u);
  assert.match(result.output, /Stopped\. Nothing was published\./u);
  assert.doesNotMatch(result.output, /Stage 7/u);
  assert.equal(
    result.calls.some((call) => call.args[0] === "release"),
    false,
  );
  assert.equal(result.saved?.bytes.includes("ARCHGATE_ARM64_RELEASE_URL="), false);
});

test("wizard completes all seven stages with the original dispatch and release arguments", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
  const assets = join(repo.root, "work/tool-assets.json");
  writeFileSync(assets, '{"sentinel":"not editable by wizard"}\n');
  const result = repo.run("\ny\ny\nrun42\n\ny\ny\n", { WIZARD_ARCHIVE: "yes" });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.stderr, "");
  assert.deepEqual(
    [...result.output.matchAll(/Stage \d\/7 · (.+)/gu)].map((match) => match[1]),
    [
      "Commit the candidate workflow",
      "Dispatch the self-hosted build",
      "Download the candidate",
      "Inspect the archive",
      "Accept the notice set",
      "Publish the prerelease",
      "Record the pin for a later commit",
    ],
  );
  const archive = join(result.calls[2].args.at(-1) as string, "archgate-linux-arm64.tar.gz");
  assert.deepEqual(
    result.calls.map(({ tool }) => tool),
    ["open", "gh", "gh", "shasum", "tar", "open", "gh"],
  );
  assert.deepEqual(result.calls[1].args, [
    "workflow",
    "run",
    "archgate-linux-arm64-candidate.yml",
    "--repo",
    "r3dlex/superman",
    "--ref",
    "spec/superman-v0",
  ]);
  assert.deepEqual(result.calls.at(-1)?.args, [
    "release",
    "create",
    "archgate-v0.61.0-linux-arm64",
    "--repo",
    "r3dlex/superman",
    "--prerelease",
    "--title",
    "Archgate 0.61.0 linux-arm64",
    "--notes",
    "Reviewed self-build of archgate/cli f65d99f56d02757cca94d53f6d717333770e0170. Not an upstream release.",
    archive,
  ]);
  assert.ok(result.calls.every(({ cwd }) => cwd === join(repo.root, "work")));
  const url =
    "https://github.com/r3dlex/superman/releases/download/archgate-v0.61.0-linux-arm64/archgate-linux-arm64.tar.gz";
  assert.deepEqual(result.saved, {
    mode: 0o600,
    bytes: `ARCHGATE_ARM64_RUN_ID='run42'\nARCHGATE_ARM64_ARCHIVE='${archive}'\nARCHGATE_ARM64_ARCHIVE_SHA256='${candidateHash}'\nARCHGATE_ARM64_RELEASE_URL='${url}'\n`,
  });
  assert.match(result.output, /✓ Setup complete/u);
  assert.match(
    result.output,
    /wrote 4 value\(s\) to \.env: ARCHGATE_ARM64_RUN_ID ARCHGATE_ARM64_ARCHIVE ARCHGATE_ARM64_ARCHIVE_SHA256 ARCHGATE_ARM64_RELEASE_URL/u,
  );
  assert.equal(readFileSync(assets, "utf8"), '{"sentinel":"not editable by wizard"}\n');
});

test("wizard retains the last RUN_ID default and upserts through an existing dotenv symlink", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open"]) repo.tool(tool);
  const target = join(repo.root, "work/state with spaces.env");
  const envFile = join(repo.root, "work/linked.env");
  const kept = "# untouched\nRUN_ID=first\nRUN_ID='saved'\\''id'\nKEEP=literal\\value\n";
  writeFileSync(target, `${kept}ARCHGATE_ARM64_RUN_ID=stale\nARCHGATE_ARM64_RUN_ID=duplicate\n`, { mode: 0o640 });
  symlinkSync(target, envFile);
  const result = repo.run("\ny\nn\n\n", { ENV_FILE: envFile });
  assert.equal(result.status, 1, result.output);
  assert.equal(result.calls[1]?.args[2], "saved\\'id");
  assert.deepEqual(result.saved, { mode: 0o640, bytes: `${kept}ARCHGATE_ARM64_RUN_ID='saved\\'\\''id'\n` });
  assert.equal(lstatSync(envFile).isSymbolicLink(), true);
});

test("wizard preserves command failures and stops before any subsequent publication effect", async (t) => {
  for (const [failure, input, expectedTools] of [
    ["gh workflow run", "\ny\ny\nremaining stdin\n", ["open", "gh"]],
    ["gh run download", "\ny\nn\nrun42\n", ["open", "gh"]],
    ["shasum", "\ny\nn\nrun42\n", ["open", "gh", "shasum"]],
    ["tar", "\ny\nn\nrun42\n", ["open", "gh", "shasum", "tar"]],
    ["gh release create", "\ny\nn\nrun42\n\ny\ny\n", ["open", "gh", "shasum", "tar", "open", "gh"]],
  ] as const) {
    await t.test(failure, (t) => {
      const repo = fixture(t);
      for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
      const result = repo.run(input, { WIZARD_ARCHIVE: "yes", WIZARD_FAIL: failure, WIZARD_READ_STDIN: "yes" });
      assert.equal(result.status, 42, result.output);
      assert.equal(result.stderr, "fixture command failure\n");
      assert.deepEqual(
        result.calls.map(({ tool }) => tool),
        expectedTools,
      );
      assert.equal(result.calls.at(-1)?.stdin, failure === "gh workflow run" ? "remaining stdin\n" : "");
      assert.doesNotMatch(result.output, /Setup complete/u);
      assert.equal(result.saved?.bytes.includes("ARCHGATE_ARM64_RELEASE_URL=") ?? false, false);
    });
  }
});

test("wizard preserves default decoding, whitespace and EOF behavior without evaluating input", async (t) => {
  for (const [name, stored, input, expected] of [
    ["plain default", "RUN_ID=plain", "\n", "plain"],
    ["double quoted default", 'RUN_ID="double"', "\n", "double"],
    ["unsafe dollar default", 'RUN_ID="$value"', "\n", ""],
    ["unsafe escaped default", 'RUN_ID="back\\slash"', "\n", ""],
    ["unsafe embedded quote", 'RUN_ID="a"b"', "\n", ""],
    ["previously written key is not RUN_ID", "ARCHGATE_ARM64_RUN_ID=saved", "\n", ""],
    ["EOF refuses even with default", "RUN_ID=saved", "", undefined],
    ["EOF accepts partial input", "", "run42", "run42"],
    ["IFS trims whitespace", "", " \trun42 \t\n", "run42"],
    ["Bash 3.2 truncates at NUL", "", "run\u000042\n", "run"],
    ["metacharacters stay literal", "", "$(touch injected);'\\value\n", "$(touch injected);'\\value"],
  ] as const) {
    await t.test(name, (t) => {
      const repo = fixture(t);
      for (const tool of ["gh", "open"]) repo.tool(tool);
      writeFileSync(join(repo.root, "work/.env"), `${stored}\n`, { mode: 0o640 });
      const result = repo.run(`\ny\nn\n${input}`);
      assert.equal(result.status, 1, result.output);
      assert.equal(result.calls.find((call) => call.tool === "gh")?.args[2], expected);
      assert.equal(result.saved?.mode, 0o640);
      assert.equal(existsSync(join(repo.root, "work/injected")), false);
    });
  }
});

test("wizard uses browser priority and warns without silently trying a different available opener", async (t) => {
  for (const [tools, failure, expected] of [
    [["open", "xdg-open", "explorer.exe", "wslview"], "", "wslview"],
    [["open", "xdg-open", "explorer.exe"], "", "explorer.exe"],
    [["open", "xdg-open"], "", "xdg-open"],
    [["open"], "open", "open"],
    [[], "", undefined],
  ] as const) {
    await t.test(expected ? `${expected}, failure=${failure}` : "no opener", (t) => {
      const repo = fixture(t);
      for (const tool of tools) repo.tool(tool);
      const result = repo.run("\ny\nn\n", { WIZARD_FAIL: failure });
      assert.equal(result.status, 1, result.output);
      assert.equal(result.calls.length, expected ? 1 : 0);
      assert.equal(result.calls[0]?.tool, expected);
      assert.equal(result.output.includes("couldn't open a browser"), !expected || Boolean(failure));
      assert.equal(result.stderr, "");
    });
  }
});

test("wizard refuses a missing gh command and never falls back to a real user executable", (t) => {
  const repo = fixture(t);
  const result = repo.run("\ny\ny\n");
  assert.equal(result.status, 127, result.output);
  assert.match(result.stderr, /gh/u);
  assert.deepEqual(result.calls, []);
  assert.equal(result.saved, undefined);
});

test("wizard preserves the shell exit status of a terminated external command", (t) => {
  const repo = fixture(t);
  repo.tool("gh");
  const result = repo.run("\ny\ny\n", { WIZARD_SIGNAL: "gh" });
  assert.equal(result.status, 143, result.output);
  assert.equal(result.calls.length, 1);
  assert.equal(result.saved, undefined);
  assert.doesNotMatch(result.output, /Stage 3/u);
});

test("wizard browser opening inherits stdin while suppressing tool output and failures", (t) => {
  const repo = fixture(t);
  repo.tool("open");
  const result = repo.run("\ny\nremaining browser stdin\n", { WIZARD_FAIL: "open", WIZARD_READ_STDIN: "yes" });
  assert.equal(result.status, 1, result.output);
  assert.equal(result.calls[0]?.stdin, "remaining browser stdin\n");
  assert.equal(result.stderr, "");
  assert.match(result.output, /couldn't open a browser, so visit it manually/u);
  assert.equal(result.saved, undefined);
});

test("wizard cancellation at the initial prompt exits without configuring or publishing anything", {
  timeout: 10_000,
}, async (t) => {
  const repo = fixture(t);
  const child = repo.start();
  const closed = once(child, "close");
  let output = "";
  let cancelled = false;
  child.stdout.on("data", (data) => {
    output += data.toString();
    if (!cancelled && output.includes("Ready to start?")) {
      cancelled = true;
      child.kill("SIGINT");
    }
  });
  const [code, signal] = await closed;
  assert.ok(signal === "SIGINT" || code === 130, `${code}/${signal}`);
  assert.equal(existsSync(join(repo.root, "work/.env")), false);
  assert.equal(existsSync(repo.env.WIZARD_TRACE as string), false);
});

test("wizard preserves terminal styling, prompts and Readline editing", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open", "tput"]) repo.tool(tool);
  // macOS script injects an initial Ctrl-D, consumed by the EOF-tolerant banner pause.
  const { output, stderr } = repo.terminal(`${process.platform === "darwin" ? "" : "\n"}y\nn\nrun4X\u001b[D2\n`);
  assert.equal(stderr, "", output);
  const calls = readFileSync(repo.env.WIZARD_TRACE as string, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(calls.find((call) => call.tool === "gh")?.args[2], "run42X", output);
  assert.ok(output.includes("<bold><blue>  Archgate linux-arm64 candidate<reset>"), output);
  assert.ok(output.includes("<bold>Paste the completed run id:<reset>"), output);
  assert.ok(output.includes("<clear>"), output);
  assert.equal(calls.filter((call) => call.tool === "tput" && call.args[0] === "clear").length, 4);
});

test("wizard keeps Bash Readline editing even under TERM=dumb", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open"]) repo.tool(tool);
  const { output, stderr } = repo.terminal(`${process.platform === "darwin" ? "" : "\n"}y\nn\nrun4X\u001b[D2\n`, {
    TERM: "dumb",
  });
  assert.equal(stderr, "", output);
  const calls = readFileSync(repo.env.WIZARD_TRACE as string, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(calls.find((call) => call.tool === "gh")?.args[2], "run42X", output);
  assert.ok(output.includes("\u001b[2J\u001b[3J\u001b[H"), output);
});

test("wizard terminal editing does not swallow the later human publication confirmations", (t) => {
  const repo = fixture(t);
  for (const tool of ["gh", "open", "shasum", "tar"]) repo.tool(tool);
  const { output, stderr, status } = repo.terminal(
    `${process.platform === "darwin" ? "" : "\n"}y\nn\nrun42\n\ny\ny\n`,
    { WIZARD_ARCHIVE: "yes" },
  );
  assert.equal(stderr, "", output);
  assert.equal(status, 0, output);
  assert.match(output, /Stage 7\/7 · Record the pin for a later commit/u);
  const calls = readFileSync(repo.env.WIZARD_TRACE as string, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(calls.at(-1).args[0], "release", output);
  assert.equal(calls.find((call) => call.tool === "gh").args[2], "run42", output);
});
