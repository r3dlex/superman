# 13: Change-aware gates

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Apply the authoritative gate-selection table in spec §5.7 to one model: selected test argv, verified complete-project typechecks/reverse dependents with full fallback, equivalent-scope mutation and scoped architecture/duplication/lint files. Preserve fresh policy/integrity/replay/security checks. G5 deliberately accepts cross-scope/total-percentage detection after merge; do not claim its PR corpus is complete. Replace ticket 06's interim diff code without adding a second provider graph.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI wiring in ticket 24's follow-up).

- [ ] A fixture with two independent targets where only one changes runs only that target's tests; the receipt lists the skipped target nowhere as `pass` (written test-first).
- [ ] The selected-test result omits an unselected target, while uncached full execution detects its repeatable failure; receipt omission is not recorded as a pass.
- [ ] Stryker receives exactly the changed `src` files that match `gates.mutation.mutate`; a test-only change runs no mutation and reports G6 `n/a (no changed source)`.
- [ ] jscpd, Archgate and Biome receive the same sorted file list, visible in the receipt; a Biome error in an unchanged, unaffected file passes in `affected` mode and fails in `full` mode.
- [ ] Archgate `check <files>` scoping is checked against 0.61.0 for rules with `files` globs and for GEN-001 (VERIFY result recorded in the PR).
- [ ] A clone into a changed file from outside the scanned corpus is missed by scoped G5 and caught by full G5; the receipt names the corpus and post-merge limit. Whole/scoped durations are measured, not used to silently reverse the accepted scope choice.
- [ ] With `--affected` and a force-full trigger, every gate's argv is identical to the `full`-mode argv.
- [ ] Two independent compiler projects select only the changed project and reverse dependents; missing/ambiguous references, argv, ambient inputs or stale referenced outputs invoke the full configured typecheck.
- [ ] G9 replay runs despite narrower G2 selection and never accepts a cached replay result. A later invalid safety ledger forces uncached full execution of every applicable check.
- [ ] **(M1 amendment 4)** Preserve the model seam for ticket 28's G12 impact closure: knowledge inputs are not blanket-ignored, and G12 never reuses gate-result passes. General wiki parsing/validation is ticket 28, not hidden scope in this ticket.

Start with two compiler projects, then remove one dependency edge's verification evidence and assert full typecheck fallback.
