# 21: Gate cache: content-hash key, local and Actions tiers

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The spec §5.7 key/eligibility contract, stored under resolved common Git metadata and restored through isolated Actions caches. Allow only fully modeled typecheck/test/knip/duplication/mutation/lint passes; bind actual checker/tool identity, effective config/runtime assets, global and base/baseline comparison inputs. Admission/policy/integrity/replay/security checks never reuse results. Main may reuse valid passes; nightly and missing/untrusted safety state execute uncached full checks. Jobs executing project code only produce data; privileged remote publication belongs to ticket 22.

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
- [ ] Architecture/policy, skill, trace, replay and Trivy fixtures execute even with planted pass entries; missing/stale safety state or quarantine defeats eligible entries too.
- [ ] Linked worktrees with `.git` files resolve the intended cache location; main never imports a PR Actions namespace.
- [ ] §5.7 execution-input fixtures change only the approved image digest/hosted image version, provider/profile policy, runner software or relevant host/kernel/libc/CPU/virtualization input and each must miss. An Actions prefix match cannot bypass complete-key/provenance validation across a hosted fallback; unknown inputs force uncached full checks/coverage, not a guessed key.
- [ ] Identical modeled execution inputs on different disposable worker/run IDs can reuse an eligible pass with current safety permission; receipts still identify both attempts. Nightly reads neither gate nor coverage-result caches, and incomplete unchanged-coverage evidence retains §5.4's full uncached fallback.

Start with an identical-version/changed-checker fixture that must not hit a prior pass.
