// The owned snapshot's tool surface. A snapshot is the reviewed tree as the
// measurement sees it, so every command the reviewed tree's bin directory
// carries must be reachable from the snapshot: the declared critical cases
// run inside the measurement, and their gates probe tools the measurement
// itself never uses.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixtureEnvironment } from "./fixture-env.ts";
import { fixture } from "./raw-fixture.ts";
import { ownedSnapshot } from "./replay.ts";

test("the snapshot carries the reviewed tree's whole tool surface", (t) => {
  const repo = fixture(t, "ticket/demo-01");
  const temporary = mkdtempSync(join(tmpdir(), "superman-snapshot-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const head = repo.git("rev-parse", "HEAD").trim();

  const snapshot = ownedSnapshot(repo.root, temporary, "candidate", head, fixtureEnvironment());

  const commands = readdirSync(join(repo.root, "node_modules", ".bin"));
  assert.ok(commands.includes("tsrs"), "the reviewed tree carries no tsrs command");
  for (const command of commands)
    assert.ok(existsSync(join(snapshot, "node_modules", ".bin", command)), `${command} is missing from the snapshot`);
  // And the command runs from the snapshot, the way a gate's tool probe
  // runs it: the fixture's own pnpm, so the probe needs no network.
  const probe = spawnSync(join(repo.root, ".tools", "pnpm"), ["exec", "tsrs", "--version"], {
    cwd: snapshot,
    encoding: "utf8",
    shell: false,
    env: { ...fixtureEnvironment(), PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false" },
  });
  assert.equal(probe.status, 0, `${probe.stdout}${probe.stderr}`);
  assert.match(probe.stdout, /tsrs/u);
});
