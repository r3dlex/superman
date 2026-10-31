#!/usr/bin/env node
// Manual publication helper, not a gate or a grant of release authority.
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { constants as osConstants } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const envFile = process.env.ENV_FILE || ".env";
const workflow = fileURLToPath(
  new URL("../../.scratch/superman-v0/archgate-linux-arm64-candidate.yml", import.meta.url),
);
const ref = "spec/superman-v0";
const repo = "r3dlex/superman";
let bold = "",
  dim = "",
  reset = "",
  blue = "",
  green = "",
  yellow = "";
const write = (text: string) => writeSync(1, text);
const say = (text: string) => write(`  ${text}\n`);
const step = (text: string) => say(`${blue}•${reset} ${text}`);
const note = (text: string) => say(`${dim}${text}${reset}`);
const warn = (text: string) => say(`${yellow}⚠ ${text}${reset}`);
let stageIndex = 0;
const written: string[] = [];
const stage = (name: string) => {
  clear();
  write(`\n${bold}${blue}▸ Stage ${++stageIndex}/7 · ${name}${reset}\n`);
};

function readLine() {
  const bytes: number[] = [];
  const byte = Buffer.alloc(1);
  let eof = false;
  while (true) {
    if (readSync(0, byte, 0, 1, null) === 0) {
      eof = true;
      break;
    }
    if (byte[0] === 10) break;
    bytes.push(byte[0]);
  }
  return {
    value: Buffer.from(bytes)
      .toString("utf8")
      .split("\0")[0]
      .replace(/^[ \t]+|[ \t]+$/gu, ""),
    eof,
  };
}

function pause(message: string) {
  write(`  ${dim}${message}${reset} `);
  readLine();
}

function confirm(message: string) {
  write(`  ${yellow}? ${message} [y/N] `);
  return /^[Yy]/u.test(readLine().value);
}

function available(command: string) {
  return (process.env.PATH ?? "").split(":").some((directory) => {
    try {
      const path = resolve(directory, command);
      accessSync(path, constants.X_OK);
      return statSync(path).isFile();
    } catch {
      return false;
    }
  });
}

function run(command: string, args: string[], capture = false) {
  const result = spawnSync(command, args, {
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    process.stderr.write(`${command}: ${result.error.message}\n`);
    process.exit((result.error as NodeJS.ErrnoException).code === "ENOENT" ? 127 : 126);
  }
  if (result.status !== 0)
    process.exit(result.signal ? 128 + osConstants.signals[result.signal] : (result.status ?? 1));
  return result.stdout ?? "";
}

function openUrl(url: string) {
  say(`${green}↗ opening${reset} ${url}`);
  const command = ["wslview", "explorer.exe", "xdg-open", "open"].find(available);
  if (!command || spawnSync(command, [url], { stdio: ["inherit", "ignore", "ignore"], shell: false }).status !== 0)
    warn(`couldn't open a browser, so visit it manually: ${url}`);
}

function existing(key: string) {
  if (!existsSync(envFile) || !statSync(envFile).isFile()) return "";
  const line = readFileSync(envFile, "utf8")
    .split("\n")
    .filter((line) => line.startsWith(`${key}=`))
    .at(-1);
  let value = line?.slice(key.length + 1) ?? "";
  if (value.startsWith("'") && value.endsWith("'"))
    // Preserve the original Bash 3.2 replacement's literal backslash, not its comment.
    value = value.slice(1, -1).replaceAll("'\\''", "\\'");
  else if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
    if (/[\\$"]/u.test(value)) return "";
  }
  return value;
}

function clear() {
  if (!process.stdout.isTTY) return;
  if (
    available("tput") &&
    spawnSync("tput", ["clear"], { stdio: ["inherit", "inherit", "ignore"], shell: false }).status === 0
  )
    return;
  write("\u001b[2J\u001b[3J\u001b[H");
}

async function ask(key: string, prompt: string) {
  const current = existing(key);
  let input: { value: string; eof: boolean };
  if (process.stdin.isTTY) {
    // Bytewise input prevents Readline from swallowing later confirmations or gh stdin.
    let ended = false;
    const source = new Readable({
      read() {
        if (ended) return;
        const byte = Buffer.alloc(1);
        const count = readSync(0, byte, 0, 1, null);
        ended = !count || byte[0] === 10 || byte[0] === 13;
        this.push(count ? byte : null);
      },
    });
    process.stdin.setRawMode(true);
    const editor = (() => {
      // Bash read -e edits even for TERM=dumb; Node otherwise disables editing.
      const term = process.env.TERM;
      try {
        if (term === "dumb") delete process.env.TERM;
        return createInterface({ input: source, output: process.stdout, terminal: true });
      } finally {
        if (term !== undefined) process.env.TERM = term;
      }
    })();
    try {
      input = await new Promise((resolve) => {
        editor.once("close", () => resolve({ value: "", eof: true }));
        editor.once("SIGINT", () => {
          process.stdin.setRawMode(false);
          process.exit(130);
        });
        editor.question(
          `  ${bold}${prompt}${reset} ${current ? `${dim}[Enter keeps current]${reset} ` : ""}`,
          (value) => {
            resolve({ value: value.replace(/^[ \t]+|[ \t]+$/gu, ""), eof: false });
            editor.close();
          },
        );
      });
    } finally {
      source.destroy();
      process.stdin.setRawMode(false);
    }
  } else input = readLine();
  if (input.eof && !input.value) process.exit(1);
  return input.value || current;
}

function save(key: string, value: string) {
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n") : [];
  if (lines.at(-1) === "") lines.pop();
  const kept = lines.filter((line) => !line.startsWith(`${key}=`));
  const before = kept.length ? `${kept.join("\n")}\n` : "";
  writeFileSync(envFile, `${before}${key}='${value.replaceAll("'", "'\\''")}'\n`, { mode: 0o600 });
  written.push(key);
  say(`${green}✓ wrote${reset} ${key} → ${envFile}`);
}

if (process.stdout.isTTY && available("tput")) {
  const colors = spawnSync("tput", ["colors"], {
    stdio: ["inherit", "pipe", "ignore"],
    encoding: "utf8",
    shell: false,
  });
  if (colors.status === 0 && Number(colors.stdout.trim()) >= 8)
    [bold, dim, reset, blue, green, yellow] = [
      ["bold"],
      ["dim"],
      ["sgr0"],
      ["setaf", "4"],
      ["setaf", "2"],
      ["setaf", "3"],
    ].map((args) => run("tput", args, true).replace(/\n+$/u, ""));
}
mkdirSync(dirname(envFile), { recursive: true });
clear();
write(`\n${bold}${blue}  Archgate linux-arm64 candidate${reset}\n${dim}  7 stages${reset}\n\n`);
say(`${dim}You drive the browser; this wizard tells you exactly what to do and`);
say("captures the values you copy back. Stop any time with Ctrl-C and re-run");
say(`later, since it remembers values already saved.${reset}`);
pause("Ready to start?");
stage("Commit the candidate workflow");
say("This workflow only builds a review artifact. It does not create a tag or edit tool-assets.json.");
step(`Copy ${workflow} to .github/workflows/archgate-linux-arm64-candidate.yml.`);
step(`Commit and push that file on ${ref}. Leave the arm64 asset null.`);
if (!confirm(`Is that workflow on origin/${ref}?`)) {
  warn("Stop here. Dispatch needs the workflow on the branch.");
  process.exit(1);
}

stage("Dispatch the self-hosted build");
say("The run must land on a linux-arm64 self-hosted runner, not a GitHub-hosted image.");
openUrl(`https://github.com/${repo}/actions/workflows/archgate-linux-arm64-candidate.yml`);
if (confirm(`Dispatch archgate-linux-arm64-candidate.yml on ${ref} now?`))
  run("gh", ["workflow", "run", "archgate-linux-arm64-candidate.yml", "--repo", repo, "--ref", ref]);
step("Wait until the run finishes. A red test or checksum check means do not publish.");
const runId = await ask("RUN_ID", "Paste the completed run id:");
save("ARCHGATE_ARM64_RUN_ID", runId);

stage("Download the candidate");
const downloadDirectory = mkdtempSync(`${process.env.TMPDIR || "/tmp"}/archgate-arm64-candidate.`);
say(`Downloading run ${runId} into ${downloadDirectory}.`);
run("gh", [
  "run",
  "download",
  runId,
  "--repo",
  repo,
  "--name",
  "archgate-linux-arm64-candidate",
  "--dir",
  downloadDirectory,
]);
const archive = join(downloadDirectory, "archgate-linux-arm64.tar.gz");
if (!existsSync(archive) || !statSync(archive).isFile()) process.exit(1);
save("ARCHGATE_ARM64_ARCHIVE", archive);
note(`Archive: ${archive}`);

stage("Inspect the archive");
const archiveHash = run("shasum", ["-a", "256", archive], true)
  .split("\n")
  .map((line) => line.trim().split(/\s+/u)[0])
  .join("\n")
  .replace(/\n+$/u, "");
say(`Archive sha256: ${archiveHash}`);
run("tar", ["-tzf", archive]);
if (
  [
    "80c87fa1f44438ea3b004acaf1aadfdfd306bd2595640b4664cefef882c473e3",
    "496d9c989ff6214b77909864d562e336feaacc119aca8e4fa4349e01b4263b6b",
  ].includes(archiveHash)
) {
  warn("This is an old unapproved archive. Do not publish it.");
  process.exit(1);
}
step("Confirm the member named archgate is present and --version in the run log is 0.61.0.");
step("Open the run log and check the sha256sum lines match this archive.");
openUrl(`https://github.com/${repo}/actions/runs/${runId}`);
save("ARCHGATE_ARM64_ARCHIVE_SHA256", archiveHash);
pause("Press Enter after you have compared the log with this hash.");

stage("Accept the notice set");
warn(
  "LICENSE.md alone does not finish redistribution review. The earlier 73-member package was still not publish-ready.",
);
step("If notices are missing, rebuild the tar with archgate at the archive root, then re-run from download.");
if (!confirm("Do you accept these exact bytes, including license and notices?")) {
  warn("Stopped before publication. The arm64 job stays red.");
  process.exit(1);
}

stage("Publish the prerelease");
const tag = "archgate-v0.61.0-linux-arm64";
const releaseUrl = `https://github.com/${repo}/releases/download/${tag}/archgate-linux-arm64.tar.gz`;
warn("This creates a protected tag. It is irreversible without an admin tag delete.");
say(`Tag: ${tag}`);
say(`Asset URL will be ${releaseUrl}`);
if (!confirm("Create the prerelease from the inspected archive?")) {
  warn("Stopped. Nothing was published.");
  process.exit(1);
}
run("gh", [
  "release",
  "create",
  tag,
  "--repo",
  repo,
  "--prerelease",
  "--title",
  "Archgate 0.61.0 linux-arm64",
  "--notes",
  "Reviewed self-build of archgate/cli f65d99f56d02757cca94d53f6d717333770e0170. Not an upstream release.",
  archive,
]);
save("ARCHGATE_ARM64_RELEASE_URL", releaseUrl);
note(`Published ${releaseUrl}`);

stage("Record the pin for a later commit");
say("Do not edit tool-assets.json in this wizard. That registration is a separate reviewed commit.");
say("When you make it, set archgate.linux-arm64.url to the release URL and sha256 to the archive hash.");
note(`url: ${releaseUrl}`);
note(`sha256: ${archiveHash}`);
note(`Saved in ${envFile}. The arm64 job stays red until that commit lands.`);

clear();
write(`\n${bold}${green}  ✓ Setup complete${reset}\n`);
note(`wrote ${written.length} value(s) to ${envFile}: ${written.join(" ")}`);
write("\n");
