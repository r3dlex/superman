# 21: Gate cache: content-hash key, local and Actions tiers

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The spec §5.7 key/eligibility contract, stored under resolved common Git metadata and restored through isolated Actions caches. Allow only fully modeled typecheck/ordinary-test/knip/full-corpus-duplication/mutation/lint passes; bind actual checker/tool identity, source/tests/fixtures/dependencies/effective config/runtime assets and comparison scope. Critical acceptance/admission/policy/integrity/replay/security/G12 checks never reuse results. Main may reuse eligible valid passes; nightly and missing/untrusted safety state execute uncached full checks. Project jobs only produce data; privileged remote publication belongs to ticket 22.

**Blocked by:** 13

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** The pinned `actions/cache` step lands with ticket 24's follow-up (`spec/superman-v0-affected`).

- [ ] With valid current safety permission, two unchanged supporting runs execute an eligible test once and record the second hit per gate/target; a separate typecheck result is not conflated with that hit.
- [ ] Changing any one key component (a dependency's file, a tool version, the gate argv, an allowlisted env var, the config section) misses the cache, each in its own test.
- [ ] A failing gate writes nothing, and a later run re-runs it.
- [ ] `gate nightly` re-runs a target that has a cached pass.
- [ ] Canonical key serialization is byte-stable for identical declared inputs (golden test); different platforms/providers/images/host inputs retain their real differences through `executionIdentity` and `os`/`arch`, rather than claiming cross-platform equivalence.
- [ ] Same version label with changed checker content, changed runtime Markdown/config, or changed base/comparison baseline misses the cache. Unknown input completeness disables reuse.
- [ ] Owner-governed critical acceptance, architecture/policy, skill, trace, replay, Trivy and G12 fixtures execute fresh despite planted pass entries or empty ordinary-test selection; missing/stale safety state or quarantine defeats eligible entries too.
- [ ] Linked worktrees with `.git` files resolve the intended cache location; main never imports a PR Actions namespace.
- [ ] §5.7 execution-input fixtures change only an actual existing image identity or native-environment/tool input, profile policy, runner software or relevant host/kernel/libc/CPU/virtualization characteristic: each relevant change misses. An Actions prefix cannot bypass complete inner-key/provenance validation; unknown inputs force uncached full checks/coverage, not a guessed key. No hosted-fallback or new VM identity model is introduced.
- [ ] Identical completely modeled inputs on different run/worker IDs may reuse an eligible pass with current safety permission; receipts still identify both attempts. This does not claim a disposable worker or cross-environment equivalence. Nightly reads no gate/coverage-result cache, and incomplete unchanged-coverage evidence retains §5.4's uncached full fallback.
- [ ] Change only actual Deno/real-Node host executable content, source/compiled launch form, V8/bundled checker/declarations, effective config/capability/env policy, assets or applicable denort/compiler/build/artifact identity: each relevant change misses. A matching Node-compatible version label or source hash cannot authorize cross-runtime/form reuse. Unknown completeness forces uncached full checks, while missing required runtime/profile approval still blocks admission (§5.10).
- [ ] Test-only/support/fixture/dependency changes invalidate implicated test/mutation/coverage evidence. Duplication entries cover the complete approved corpus and comparison baseline; a selected-file result cannot satisfy G5. The first confirmed stale pass disables implicated reuse until a reviewed fix and fresh uncached full evidence, not eviction/reset alone.

Start with an identical-version/changed-checker fixture that must not hit a prior pass.
