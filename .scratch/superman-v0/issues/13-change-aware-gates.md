# 13: Change-aware gates

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** In `affected` mode, G2 runs each affected target's test command (deduplicated, in target order), G6 passes the change model's changed source files to Stryker `--mutate` with `--incremental` (muex `--since <base>` for Elixir), G5 runs jscpd on the changed files plus the affected targets' files, G1 runs `archgate check --strict <files>` and G10 runs `biome ci --no-errors-on-unmatched <files>` on the same file set. Typecheck, knip, G4, G7–G9 and G11 are unchanged. In `full` mode every gate behaves exactly as in tickets 04–06. Ticket 06's interim changed-file code is deleted. ADR 0010, §5.7 table.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI wiring in ticket 24's follow-up).

- [ ] A fixture with two independent targets where only one changes runs only that target's tests; the receipt lists the skipped target nowhere as `pass` (written test-first).
- [ ] A fixture that breaks a test of a non-affected target passes in `affected` mode and fails in `full` mode, proving the scope is real (this is the "miss" shape ticket 23 measures).
- [ ] Stryker receives exactly the changed `src` files that match `gates.mutation.mutate`; a test-only change runs no mutation and reports G6 `n/a (no changed source)`.
- [ ] jscpd, Archgate and Biome receive the same sorted file list, visible in the receipt; a Biome error in an unchanged, unaffected file passes in `affected` mode and fails in `full` mode.
- [ ] Archgate `check <files>` scoping is checked against 0.61.0 for rules with `files` globs and for GEN-001 (VERIFY result recorded in the PR).
- [ ] The duration of jscpd whole-repo vs scoped on the superman repo is reported in the PR (input to question 17).
- [ ] With `--affected` and a force-full trigger, every gate's argv is identical to the `full`-mode argv.
