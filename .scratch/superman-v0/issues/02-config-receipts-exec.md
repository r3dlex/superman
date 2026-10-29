# 02: Config, receipts and the exec boundary

**Milestone:** M3

**What to build:** `superman` reads and validates `superman.config.json` with a hand-written validator (no zod) against `schema/config.v1.json`, reports every invalid field with its path and exits 2, and every gate command writes a deterministic JSON receipt (§5.5) to `.git/superman/receipts/`. All process spawning goes through one module with `shell: false` (SUP-002 now has files to check). The schema settles the G9 key names (`paths.tests`, `testCmd.related` vs `gates.testRelated`) and the lock and ratchet schemas.

**Blocked by:** 01

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Config validator rejects unknown keys, wrong types and shell strings in gate commands (argv arrays only), with one line per error and exit code 2.
- [ ] `schema/config.v1.json`, `schema/lock.v1.json`, `schema/receipt.v1.json` exist and are in the npm `files` allowlist (already listed).
- [ ] Receipts have sorted keys, `schema: superman.receipt/1`, and differ between two runs only in `startedAt`/`durationMs` (golden-file test).
- [ ] A gate with `enabled: false` is recorded as `n/a`, never `pass`.
- [ ] Only the exec module imports `node:child_process`; SUP-002 passes on `src/` and fails on a fixture that imports it elsewhere or passes `shell: true`.
- [ ] Mutation score on the changed files is at least the ratchet baseline; jscpd does not rise.
