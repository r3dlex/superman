---
Status: accepted
---

# Overall coverage stays enforced when CI is incremental

André approved the coverage policy and measurement seams on 2026-10-31, then explicitly required the same policy in incremental CI with nightly whole-repository checks. Spec §5.4 owns the acceptance contract; `.superman/ci/coverage.json` is the protected executable policy. A changed-files percentage or a previous passing average cannot establish the current overall result: denominators change, and changed tests can invalidate coverage of unchanged code.

Incremental enforcement therefore requires fresh affected-code measurements plus verified unchanged-code evidence over the exact complete inventory. It must bind source, tests, dependency/selection model, effective configuration, tool/instrumentation identities and producer provenance. Unknown or stale evidence invokes uncached full verification; nightly always remeasures everything. The bootstrap has no trusted coverage ledger/selector, so it deliberately uses that full fallback rather than activating future cache/provider tickets.

Vitest alone would omit the Node bootstrap subprocesses and the rules running inside Archgate's Bun binary. Use the exact-pinned development tools over disjoint inventories, then aggregate measured counts. Supplemental exported-rule callback tests make the actual rule code measurable; they do not replace the pinned-engine process fixtures or prove parser integration. c8's locked V8 merger/Istanbul reporters, Vitest's public test API and its locked AST converter/Vite parser are the bounded development-tool API exception to ADR 0003, not product runtime dependencies. No additional dependency is installed for conversion.

Independent review demonstrated that c8's synthetic uncovered-file report counted one function even when an unloaded module declared 100. Native Node V8 data is therefore converted against the AST of **every** inventoried file, with Node's native strip-only transformation preserving source offsets; missing execution data supplies zero hits, not a synthetic denominator. Unsupported source-map directives block rather than substituting different source content. Vitest receives an explicit empty method-exclusion list and returns its coverage over an owned pipe; only the parent validates inputs/aliases and publishes reports. This closes demonstrated method-exclusion and report-symlink false evidence without excluding runtime code.

Per-file floors and an automatic threshold ratchet were not selected: overall coverage is the requirement, and the 100% target must not become a reason to omit difficult code. The protected collector and required CI jobs enforce the policy directly, not through an editable package script. Hosted execution and Gate 1 approval remain separate evidence; a local coverage receipt grants no merge authority.
