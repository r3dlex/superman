// The shared raw fixture must not let a pnpm command reach the host's
// node_modules. The fixture reaches it by a symlink, so a pnpm command that
// installs rewrites the host's tree through that link: the host's tools
// disappear, and every later run in the host fails with a command that is
// "not found" although its binary is on disk.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fixture, GATE_CHILD_TIMEOUT } from "./raw-fixture.ts";

/**
 * A host tree with one tool and no install state. pnpm decides a tree is out
 * of date when it carries no state of its own, and the install it starts then
 * prunes the tree it finds. The fixture's tree is reached by a symlink, so
 * the pruning lands on the host.
 */
function hostModules(): string {
  const host = mkdtempSync(join(tmpdir(), "superman-host-modules-"));
  mkdirSync(join(host, ".bin"), { recursive: true });
  mkdirSync(join(host, "faketool"), { recursive: true });
  writeFileSync(join(host, "faketool", "package.json"), '{"name":"faketool","version":"1.0.0"}\n');
  writeFileSync(join(host, ".bin", "faketool"), '#!/bin/sh\necho "faketool 1.0.0"\n', { mode: 0o755 });
  return host;
}

test("a pnpm command in the fixture leaves the host's node_modules alone", (t) => {
  const host = hostModules();
  t.after(() => rmSync(host, { recursive: true, force: true }));
  const repo = fixture(t, "ticket/demo-01", "behavior", host);

  const result = spawnSync(join(repo.root, ".tools", "pnpm"), ["exec", "faketool", "--version"], {
    cwd: repo.root,
    encoding: "utf8",
    shell: false,
    // The command must not reach the network: the fixture's own dependencies
    // are installed in the host, and the store is not consulted here.
    env: { ...process.env, npm_config_offline: "true" },
  });

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /faketool 1\.0\.0/u);
  // The host still holds the tool the fixture's command ran.
  assert.ok(existsSync(join(host, ".bin", "faketool")), "the host's node_modules was rewritten");
});

test("the fixture's gate child is bounded below the suite's own timeout", () => {
  // A child that outlives the suite makes the suite time out, and a timeout
  // is an ambiguous mutation outcome: the gate refuses a run that reports
  // one, so the first measurement was refused with nineteen of them.
  const config = readFileSync(join(resolve(import.meta.dirname, "../.."), "vitest.config.ts"), "utf8");
  const declared = /testTimeout:\s*([\d_]+)/u.exec(config)?.[1]?.replaceAll("_", "");
  assert.ok(declared, "the suite declares no testTimeout");
  assert.ok(
    GATE_CHILD_TIMEOUT < Number(declared),
    `the fixture's child (${GATE_CHILD_TIMEOUT}ms) must be below the suite's timeout (${declared}ms)`,
  );
});
