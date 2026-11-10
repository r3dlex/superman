# 05: Policy inputs, traceability and red–green replay

**Milestone:** M6

**What to build:** Implement G4 effective protected paths/config includes/tool-pin fields, G8 merged-base traceability and G9 behavior replay under the authoritative spec §5.3–5.4/§17 contract. Read ticket Kind from base. Behavior tests fail for missing behavior on approved-base code and pass on candidate code; green-only commit history is valid. Refactors retain full-suite-at-every-commit verification. This CLI implementation replaces, rather than first introduces, the pre-wired raw checks after parity is proved.

**Blocked by:** 04

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI switches to superman in ticket 06's follow-up).

- [ ] Fixture repos for spec, ticket and chore branches: each kind's allowed and forbidden paths produce pass/fail as in §5.4 and §17.
- [ ] Mutation decreases, duplication increases, profile/metric addition or deletion, scope/semantics changes, newly approved dispositions and non-Status ticket edits fail. Lower duplication/higher mutation may tighten only an existing comparable profile, with valid measured counts/content/run provenance refreshed atomically (§5.3); a narrowed PR result cannot tighten a broad baseline.
- [ ] Effective compiler/test/quality configs, referenced policy inputs, tool-pin fields, critical decision/operator/test mappings, profile schemas, reviewed dispositions, lane/audit policy, correctness severities, advisory cohorts/counting semantics and stage applicability remain protected under the already-proved bootstrap contract. Unrelated metadata stays editable; canonical skills/manifests/catalogs obey their maintenance kind. A ticket cannot weaken mappings or suppressions to obtain green.
- [ ] Green-only behavior commits pass with valid replay. Passing-on-base tests, broken syntax/config/fixture/tool failures and failing candidate tests fail; actual authoring chronology is not inferred.
- [ ] A refactor with a red intermediate commit fails; intermediate verification is uncached.
- [ ] Receipt has `behaviorReplay: { baseSha, candidateSha, tests, testInputsHash, baseOutcome, candidateOutcome }` and H/B/M identities. Replay uses explicit test-file argv and is never narrowed/cached by G2 selection.
- [ ] A branch matching no known kind fails G4 with one line.
- [ ] **(M1 amendment 4)** Preserve bootstrap policy fixtures: ticket/wiki chores may change regular wiki/candidate content, never vault.json/raw or Lefthook effective policy; spec/skills/wiki PR kinds can carry their required log. Reject symlinks/path aliases instead of letting writable knowledge escape into policy. G12 content/log semantics activate only after ticket 28.
- [ ] Base-declared Kind: knowledge permits only wiki/candidates/own Status and marks G9 inapplicable; attempted code/tests/ratchet/policy/raw/lock edits or self-reclassification fail, while G12/privacy/human approval remain required.
- [ ] Preserve the already-proved Deno bootstrap fixtures for runtime/version/config/lock/import-map/declaration/permission/entrypoint/build input closure, prohibited imports/spawn/bypass/suppressions and unknown indirection. Real-Deno G9 rejects runtime/config/permission/tool/setup failures as feature-red evidence; it observes approved-base/candidate behavior with actual runtime/source identities. This ticket does not first implement the governing bootstrap support (§17).
- [ ] Preserve SUP-005's declared Deno comment-namespace negative fixtures and inert literal/template/regex/documentation controls through the real pinned-engine process seam. The completed local preparation is not relabeled as actual-Deno collection or complete Gate 1 evidence.

Start with a single green commit whose test is red on base and green on candidate, then the broken-test counterexample.
