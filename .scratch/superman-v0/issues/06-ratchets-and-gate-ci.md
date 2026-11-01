# 06: Ratchets and the switch to `superman gate ci`

**Milestone:** M7

**What to build:** One Deno-operated full local pre-PR/CI quality driver replacing raw checks only after parity with spec §5.3–5.7. G6 preserves equivalent scopes, conservative completion and critical-survivor treatment; first measurements need review, and nightly uses the separate full-repo baseline with forced fresh mutation. G5 enforces the full approved corpus/total-percentage baseline before merge, also after ticket 13 adds shared-model selection. Required local Trivy, explicit correctness errors, separate structural advisories and fresh owner-governed critical cases belong to the same contract. No universal mutation floor or partial-corpus exemption is introduced.

**Blocked by:** 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-gate-ci` switches raw CI to the parity-proved CLI, preserving reviewed configs/pins, §8 existing self-hosted profiles, three-platform checks and nonblocking drift. Unknown route/native-platform/tool/access identities or missing activation authority block, without hosted substitution or a new VM platform. Retire only superseded bootstrap scripts after equivalent failure fixtures pass; preserve historical evidence and privileged-writer helpers rather than deleting `.superman/ci/` wholesale.

- [ ] A same-scope mutation regression fails; a noncritical legacy file improving 20%→30% does not fail merely because an illustrative whole-repo baseline is 80%. New-file initialization and nightly comparisons stay separate. Critical introduced Survived/NoCoverage outcomes block despite aggregate improvement; first critical measurements require reviewed survivor treatment, not an invented floor or weak initialization.
- [ ] Full-corpus fixtures reject a changed-file clone against an unchanged file outside selected tests and a total-percentage regression. Missing/partial/undersized corpus evidence blocks; the measured baseline is not replaced with universal zero duplication.
- [ ] CI annotations and run/attempt/evaluated-SHA/leg-bound receipt artifacts preserve H/B/M identities.
- [ ] Whether Stryker `--since` exists is checked (VERIFY) and the PR records the result; `--mutate` with changed files is used either way.
- [ ] **(M1 amendment)** A fixture with a HIGH-severity vulnerable lockfile entry fails G11, and a fixture with a Biome error fails G10. Both show in the receipt with tool versions. A `.trivyignore` in a fixture makes G1 fail (SUP-007).
- [ ] `superman gate nightly` runs full Stryker with `--force` and full jscpd.
- [ ] Existing-self-hosted template fixtures preserve native macOS arm64/Linux x64/Linux arm64, all applicable gates and §5.4's independent 90% overall coverage floors/100% target. Nightly executes uncached full checks/coverage on all three; a route change cannot narrow scope or reuse nightly results. Required tools may be approved locked job-local artifacts, never an unreviewed pin/global/image change.
- [ ] §8.2 fixtures leave unavailable work blocked/queued unless an authorized protected change selects another reviewed existing self-hosted route. No hosted substitution or new VM delivery is inferred. Missing/skipped/neutral/cancelled legs, wrong identities and success-only aggregators cannot satisfy required checks; new attempts retain prior evidence and fresh H/B/M bindings.
- [ ] Deno operational orchestration matches the already-approved bootstrap's actual-Deno checker/replay/mutation/complete-coverage fixtures (§5.4/§5.10), including instrumented snapshot/active-mutant/test-attribution/worker isolation, unloaded-file four-metric denominators and fresh owned profiles. Retain real Node quality-tool hosts and bounded measurement libraries; a Node-only pass is not Deno parity. CI switches only through the existing protected follow-up after native three-platform proof, with no threshold or inventory reduction.
- [ ] Public gate fixtures reject missing local Trivy, ignored exits, absent/stale/malformed/empty required reports and incomplete inventories. Verify explicit Biome errors against valid/invalid actual-Deno graph/directive cases; 15/50/4 structural findings stay cohort-separated advisories. Critical cases run fresh despite empty ordinary selection or planted cache passes. Conservative mutation status/population accounting includes enforcement-core mappings; reporter/tool failures cannot count as kills or green.

Start with the improving-legacy-file fixture and a genuine same-scope regression.
