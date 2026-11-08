# 13: Change-aware gates

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Apply spec §5.7's gate-specific conservative scope/eligibility table to one model: ordinary test targets, verified complete-project typechecks/reverse dependents with full fallback, fresh risk-affected mutation with complete invalidation inputs, and supported architecture/lint scopes. G5 retains the full approved corpus before merge; critical acceptance/policy/integrity/replay/security checks stay fresh outside narrowing/reuse. Replace ticket 06's interim selector while preserving the mutation behavior already proved before ticket 01.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI wiring in ticket 24's follow-up).

- [ ] A fixture with two independent targets where only one changes runs only that target's tests; the receipt lists the skipped target nowhere as `pass` (written test-first).
- [ ] Removing ownership/dependency-completeness evidence forces full required-test selection rather than knowingly omitting a needed target. Supported-profile negative fixtures detect an incomplete provider mapping; omission is never recorded as a pass. Incident attribution/recovery remains ticket 23's responsibility.
- [ ] Stryker freshly executes reviewed risk-affected product and owned operational enforcement functions, with enclosing-file fallback when finer selection is unproved. Test-only, fixture, dependency, config/policy, runtime and shared-contract changes select implicated unchanged code; absence of changed source alone cannot produce G6 `n/a`. Unknown impact broadens scope. Equivalent base/candidate populations, separate new-source measurements, profile read-back and critical dispositions retain §5.3–5.4 semantics; even an exact-input historical mutation pass cannot substitute for execution.
- [ ] Each gate receives its own complete governing scope, recorded deterministically: G5 the full approved corpus, Archgate all effective wide rule inputs, Biome complete supported rule/cycle graph inputs or full fallback. A shared affected-test list cannot silently become every gate's corpus; unsupported graph completeness blocks instead of reporting zero violations.
- [ ] Archgate `check <files>` scoping is checked against 0.61.0 for rules with `files` globs and for GEN-001 (VERIFY result recorded in the PR).
- [ ] A changed-file clone against an unchanged file outside selected tests and a full-corpus total-percentage regression fail before merge. Missing/partial corpus evidence blocks. Any future incremental G5 replacement needs separately reviewed equivalent-detection proof, not a nightly catch or faster duration.
- [ ] With `--affected` and a force-full trigger, each applicable gate receives its full-mode scope/argv for the same event and reviewed profile. G6 retains §5.4's separate weekly/release broad applicability; a full-selection fallback cannot substitute a PR population for a broad baseline or create an extra daily broad audit.
- [ ] Two independent compiler projects select only the changed project and reverse dependents; missing/ambiguous references, argv, ambient inputs or stale referenced outputs invoke the full configured typecheck.
- [ ] G9 replay and all eight policy-applicable ordinary critical cases run despite narrower/empty G2 or mutation selection and planted cached passes. Bounded fault controls rerun when their implementation or test/runner inputs change. A later invalid safety ledger forces uncached full execution of applicable checks, preserving G6's profile/cadence/budgets. Critical controls cannot be pruned by the optimization they govern.
- [ ] **(M1 amendment 4)** Preserve the model seam for ticket 28's G12 impact closure: knowledge inputs are not blanket-ignored, and G12 never reuses gate-result passes. General wiki parsing/validation is ticket 28, not hidden scope in this ticket.
- [ ] Actual-Deno process targets retain their broad declared inputs; complete tsrs and supplemental Deno entry-graph checks fall back fully on uncertain compiler/config/declaration scope. G9 stays fresh/independent, Stryker consumes the proven instrumented-child/active-mutant mechanism, and G2 cannot replace complete four-metric evidence with narrowed Node-only/changed-file coverage. Missing compatible unchanged evidence forces uncached full execution (§5.4/§5.10).

Start with two compiler projects, then remove one dependency edge's verification evidence and assert full typecheck fallback.
