# 30: wiki-lint and nightly knowledge-only PRs

**Milestone:** M7c, IN v0 **(M1 amendment 4)**

**What to build:** ≤80-line explicit `wiki-lint` skill and an isolated nightly agent-runner template consuming uncached G12/freshness reports (spec §6.5/§8). It may propose `chore/wiki-*` PRs limited to wiki/candidate/log content, never merge. Deterministic validation remains unprivileged and never calls a model.

**Blocked by:** 29, 24, spec/superman-v0-wiki-skills

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-wiki-maintenance` adopts skill hashes/catalog and the reviewed runner/workflow. André supplies approved bot/model credential **references** and scheduling setup before activation; unavailable setup is blocked, not a simulated nightly success. PR jobs/cache writers never gain maintenance credentials.

- [ ] Canonical Pocock-format frontmatter and SUP-004 budgets pass; invocation is explicit, not model auto-triggering.
- [ ] Expired knowledge triggers source review, not blind timestamp renewal. Ambiguity/code/policy/raw-import findings are reported as separate planned work, not edited in a maintenance PR.
- [ ] Fake forge/model process fixtures prove only wiki/candidates/log are written, a draft obtains its real PR number and G12 runs before review; no approval/merge/direct-main operation exists.
- [ ] Human exact-head approval and all applicable gates remain required; G9 code replay is n/a for wiki-only chores, never falsely passed. An attempted lock/code/raw/policy/workflow change is rejected.
- [ ] No project/PR execution receives bot/model credentials; missing authority/runner fails visibly. Live scheduling evidence is recorded before first usable release.

Start with a stale-page report and an attempted raw-source repair; only a knowledge-only proposal may proceed.
