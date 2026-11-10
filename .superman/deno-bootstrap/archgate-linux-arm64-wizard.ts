#!/usr/bin/env deno
// Manual publication helper, not a gate or a grant of release authority.
//
// The Deno sibling of the Node original. The seven stages, the prompts, the
// saved values, the guards and the exit codes are unchanged; the spawns go
// through the exec seam and the terminal is the Deno one.
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { constants as osConstants } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { spawn } from "./exec.ts";

const envFile = Deno.env.get("ENV_FILE") || ".env";
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
const encoder = new TextEncoder();
const write = (text: string) => Deno.stdout.writeSync(encoder.encode(text));
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

/** Read one line from the terminal, bytewise. */
async function readLine(): Promise<{ value: string; eof: boolean }> {
  const bytes: number[] = [];
  const byte = new Uint8Array(1);
  let eof = false;
  for (;;) {
    const count = await Deno.stdin.read(byte);
    if (!count) {
      eof = true;
      break;
    }
    if (byte[0] === 10) break;
    bytes.push(byte[0]);
  }
  return {
    value: new TextDecoder()
      .decode(new Uint8Array(bytes))
      .split("\0")[0]
      .replace(/^[ \t]+|[ \t]+$/gu, ""),
    eof,
  };
}

async function pause(message: string) {
  write(`  ${dim}${message}${reset} `);
  await readLine();
}

async function confirm(message: string) {
  write(`  ${yellow}? ${message} [y/N] `);
  return /^[Yy]/u.test((await readLine()).value);
}

function available(command: string) {
  return (Deno.env.get("PATH") ?? "").split(":").some((directory) => {
    try {
      const path = resolve(directory, command);
      accessSync(path, constants.X_OK);
      return statSync(path).isFile();
    } catch {
      return false;
    }
  });
}

/** Run a command and stop the wizard when it fails. */
async function run(command: string, args: string[], capture = false): Promise<string> {
  const result = await spawn(command, args, {
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    Deno.stderr.writeSync(encoder.encode(`${command}: ${result.error.message}\n`));
    Deno.exit(result.error.code === "ENOENT" ? 127 : 126);
  }
  if (result.status !== 0)
    Deno.exit(
      result.signal
        ? 128 + osConstants.signals[result.signal as keyof typeof osConstants.signals]
        : (result.status ?? 1),
    );
  return result.stdout ?? "";
}

async function openUrl(url: string) {
  say(`${green}↗ opening${reset} ${url}`);
  const command = ["wslview", "explorer.exe", "xdg-open", "open"].find(available);
  const opened = command
    ? await spawn(command, [url], { stdio: ["inherit", "ignore", "ignore"], encoding: "utf8", shell: false })
    : undefined;
  if (opened?.status !== 0) warn(`couldn't open a browser, so visit it manually: ${url}`);
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

async function clear() {
  if (!Deno.stdout.isTerminal()) return;
  if (
    available("tput") &&
    (await spawn("tput", ["clear"], { stdio: ["inherit", "inherit", "ignore"], encoding: "utf8", shell: false }))
      .status === 0
  )
    return;
  write("\u001b[2J\u001b[3J\u001b[H");
}

async function ask(key: string, prompt: string) {
  const current = existing(key);
  let input: { value: string; eof: boolean };
  if (Deno.stdin.isTerminal()) {
    // Bytewise input prevents Readline from swallowing later confirmations or gh stdin.
    let ended = false;
    const source = new Readable({
      read() {
        if (ended) return;
        void (async () => {
          const byte = new Uint8Array(1);
          const count = await Deno.stdin.read(byte);
          ended = !count || byte[0] === 10 || byte[0] === 13;
          source.push(count ? Buffer.from(byte) : null);
        })();
      },
    });
    Deno.stdin.setRaw(true);
    const editor = (() => {
      // Bash read -e edits even for TERM=dumb; Node otherwise disables editing.
      const term = Deno.env.get("TERM");
      try {
        if (term === "dumb") Deno.env.delete("TERM");
        return createInterface({ input: source, output: process.stdout, terminal: true });
      } finally {
        if (term !== undefined) Deno.env.set("TERM", term);
      }
    })();
    try {
      input = await new Promise((resolve) => {
        editor.once("close", () => resolve({ value: "", eof: true }));
        editor.once("SIGINT", () => {
          Deno.stdin.setRaw(false);
          Deno.exit(130);
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
      Deno.stdin.setRaw(false);
    }
  } else input = await readLine();
  if (input.eof && !input.value) Deno.exit(1);
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

if (Deno.stdout.isTerminal() && available("tput")) {
  const colors = await spawn("tput", ["colors"], {
    stdio: ["inherit", "pipe", "ignore"],
    encoding: "utf8",
    shell: false,
  });
  if (colors.status === 0 && Number(colors.stdout.trim()) >= 8) {
    const sequences = await Promise.all(
      [["bold"], ["dim"], ["sgr0"], ["setaf", "4"], ["setaf", "2"], ["setaf", "3"]].map(async (args) =>
        (await run("tput", args, true)).replace(/\n+$/u, ""),
      ),
    );
    [bold, dim, reset, blue, green, yellow] = sequences;
  }
}
mkdirSync(dirname(envFile), { recursive: true });
await clear();
write(`\n${bold}${blue}  Archgate linux-arm64 candidate${reset}\n${dim}  7 stages${reset}\n\n`);
say(`${dim}You drive the browser; this wizard tells you exactly what to do and`);
say("captures the values you copy back. Stop any time with Ctrl-C and re-run");
say(`later, since it remembers values already saved.${reset}`);
await pause("Ready to start?");
stage("Commit the candidate workflow");
say("This workflow only builds a review artifact. It does not create a tag or edit tool-assets.json.");
step(`Copy ${workflow} to .github/workflows/archgate-linux-arm64-candidate.yml.`);
step(`Commit and push that file on ${ref}. Leave the arm64 asset null.`);
if (!(await confirm(`Is that workflow on origin/${ref}?`))) {
  warn("Stop here. Dispatch needs the workflow on the branch.");
  Deno.exit(1);
}

stage("Dispatch the self-hosted build");
say("The run must land on a linux-arm64 self-hosted runner, not a GitHub-hosted image.");
await openUrl(`https://github.com/${repo}/actions/workflows/archgate-linux-arm64-candidate.yml`);
if (await confirm(`Dispatch archgate-linux-arm64-candidate.yml on ${ref} now?`))
  await run("gh", ["workflow", "run", "archgate-linux-arm64-candidate.yml", "--repo", repo, "--ref", ref]);
step("Wait until the run finishes. A red test or checksum check means do not publish.");
const runId = await ask("RUN_ID", "Paste the completed run id:");
save("ARCHGATE_ARM64_RUN_ID", runId);

stage("Download the candidate");
const downloadDirectory = mkdtempSync(`${Deno.env.get("TMPDIR") || "/tmp"}/archgate-arm64-candidate.`);
say(`Downloading run ${runId} into ${downloadDirectory}.`);
await run("gh", [
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
if (!existsSync(archive) || !statSync(archive).isFile()) Deno.exit(1);
save("ARCHGATE_ARM64_ARCHIVE", archive);
note(`Archive: ${archive}`);

stage("Inspect the archive");
const archiveHash = (await run("shasum", ["-a", "256", archive], true))
  .split("\n")
  .map((line) => line.trim().split(/\s+/u)[0])
  .join("\n")
  .replace(/\n+$/u, "");
say(`Archive sha256: ${archiveHash}`);
await run("tar", ["-tzf", archive]);
if (
  [
    "80c87fa1f44438ea3b004acaf1aadfdfd306bd2595640b4664cefef882c473e3",
    "496d9c989ff6214b77909864d562e336feaacc119aca8e4fa4349e01b4263b6b",
  ].includes(archiveHash)
) {
  warn("This is an old unapproved archive. Do not publish it.");
  Deno.exit(1);
}
step("Confirm the member named archgate is present and --version in the run log is 0.61.0.");
step("Open the run log and check the sha256sum lines match this archive.");
await openUrl(`https://github.com/${repo}/actions/runs/${runId}`);
save("ARCHGATE_ARM64_ARCHIVE_SHA256", archiveHash);
await pause("Press Enter after you have compared the log with this hash.");

stage("Accept the notice set");
warn(
  "LICENSE.md alone does not finish redistribution review. The earlier 73-member package was still not publish-ready.",
);
step("If notices are missing, rebuild the tar with archgate at the archive root, then re-run from download.");
if (!(await confirm("Do you accept these exact bytes, including license and notices?"))) {
  warn("Stopped before publication. The arm64 job stays red.");
  Deno.exit(1);
}

stage("Publish the prerelease");
const tag = "archgate-v0.61.0-linux-arm64";
const releaseUrl = `https://github.com/${repo}/releases/download/${tag}/archgate-linux-arm64.tar.gz`;
warn("This creates a protected tag. It is irreversible without an admin tag delete.");
say(`Tag: ${tag}`);
say(`Asset URL will be ${releaseUrl}`);
if (!(await confirm("Create the prerelease from the inspected archive?"))) {
  warn("Stopped. Nothing was published.");
  Deno.exit(1);
}
await run("gh", [
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

await clear();
write(`\n${bold}${green}  ✓ Setup complete${reset}\n`);
note(`wrote ${written.length} value(s) to ${envFile}: ${written.join(" ")}`);
write("\n");
