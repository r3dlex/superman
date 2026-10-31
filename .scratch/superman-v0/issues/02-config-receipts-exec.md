# 02: Config, receipts and the exec boundary

**Milestone:** M3

**What to build:** Validate strict JSON using the hand-written config/schema contract in spec §5.3 and write deterministic receipts (§5.5). Cover protected fields, declared test/support inputs, App IDs/repository scope, required check origins, verified-project typechecking and safety/cache settings. Explicit test files use `gates.test`; `gates.testRelated` is for source-file selection. All product spawning crosses `src/exec.ts` with `shell: false`; resolve Git metadata paths correctly in worktrees.

**Blocked by:** 01, spec/superman-v0-baselines

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Config validator rejects unknown keys, wrong types and shell strings in gate commands (argv arrays only), with one line per error and exit code 2.
- [ ] `schema/config.v1.json`, `schema/lock.v1.json`, `schema/receipt.v1.json` exist and are in the npm `files` allowlist (already listed).
- [ ] Receipts have sorted keys, `schema: superman.receipt/1`, and differ between two runs only in `startedAt`/`durationMs` (golden-file test).
- [ ] A gate with `enabled: false` is recorded as `n/a`, never `pass`.
- [ ] Only the exec module imports `node:child_process`; SUP-002 passes on `src/` and fails on a fixture that imports it elsewhere or passes `shell: true`.
- [ ] Mutation compares equivalent base/candidate file scopes; lower duplication and higher mutation tighten correctly. Metric-key deletion/addition and scope substitution cannot evade policy.
- [ ] PR receipts distinguish H/B/M/evaluated SHA and per-gate/target cache outcomes; worktrees with a `.git` file write only to resolved Git metadata.

Start with invalid-config and H/B/M receipt fixtures through the CLI seam.
