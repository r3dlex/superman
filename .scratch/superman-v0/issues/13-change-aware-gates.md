# 13: Change-aware gates

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Apply spec §5.7's gate-specific conservative scope/eligibility table to one model: ordinary test targets, verified complete-project typechecks/reverse dependents with full fallback, equivalent-scope mutation with complete invalidation inputs, and supported architecture/lint scopes. G5 retains the full approved corpus before merge; critical acceptance/policy/integrity/replay/security checks stay fresh outside narrowing/reuse. Replace ticket 06's interim diff code without a second graph or a partial-corpus exemption.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI wiring in ticket 24's follow-up).

- [ ] A fixture with two independent targets where only one changes runs only that target's tests; the receipt lists the skipped target nowhere as `pass` (written test-first).
- [ ] Removing ownership/dependency-completeness evidence forces full required-test selection rather than knowingly omitting a needed target. Supported-profile negative fixtures detect an incomplete provider mapping; omission is never recorded as a pass. Incident attribution/recovery remains ticket 23's responsibility.
- [ ] Stryker receives the reviewed equivalent base/candidate scopes, including enforcement-core mappings where applicable. Test-only, fixture, dependency, config or runtime changes invalidate implicated mutation evidence; absence of changed source alone cannot produce G6 `n/a`. Reuse needs complete valid inputs; uncertainty executes the required fresh scope, with new-file initialization and critical survivor policy preserved.
- [ ] Each gate receives its own complete governing scope, recorded deterministically: G5 the full approved corpus, Archgate all effective wide rule inputs, Biome complete supported rule/cycle graph inputs or full fallback. A shared affected-test list cannot silently become every gate's corpus; unsupported graph completeness blocks instead of reporting zero violations.
- [ ] Archgate `check <files>` scoping is checked against 0.61.0 for rules with `files` globs and for GEN-001 (VERIFY result recorded in the PR).
- [ ] A changed-file clone against an unchanged file outside selected tests and a full-corpus total-percentage regression fail before merge. Missing/partial corpus evidence blocks. Any future incremental G5 replacement needs separately reviewed equivalent-detection proof, not a nightly catch or faster duration.
- [ ] With `--affected` and a force-full trigger, every gate's argv is identical to the `full`-mode argv.
- [ ] Two independent compiler projects select only the changed project and reverse dependents; missing/ambiguous references, argv, ambient inputs or stale referenced outputs invoke the full configured typecheck.
- [ ] G9 replay and all owner-governed policy-applicable critical cases run despite narrower/empty ordinary G2 selection and planted cached passes. A later invalid safety ledger forces uncached full execution of every applicable check. Critical cases and their expected failures cannot be pruned by the optimization they govern.
- [ ] **(M1 amendment 4)** Preserve the model seam for ticket 28's G12 impact closure: knowledge inputs are not blanket-ignored, and G12 never reuses gate-result passes. General wiki parsing/validation is ticket 28, not hidden scope in this ticket.
- [ ] Actual-Deno process targets retain their broad declared inputs; complete tsrs and supplemental Deno entry-graph checks fall back fully on uncertain compiler/config/declaration scope. G9 stays fresh/independent, Stryker consumes the proven instrumented-child/active-mutant mechanism, and G2 cannot replace complete four-metric evidence with narrowed Node-only/changed-file coverage. Missing compatible unchanged evidence forces uncached full execution (§5.4/§5.10).

Start with two compiler projects, then remove one dependency edge's verification evidence and assert full typecheck fallback.
