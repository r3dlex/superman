# 23: Attributed incidents and the fresh safety ledger

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The audit/recovery contract in spec §5.7: classify selection misses, stale cached passes, flakes, lookup misses and unresolved attribution separately. Verify a culprit through bounded base/head replay, not the merge window alone. Compute PR-incidence windows and produce run/attempt/policy/provider-bound safety data; ticket 22's separate trusted writer signs it. Readers independently verify latest trusted audit identity, scope and age ≤48 hours. Missing/untrusted safety evidence forces uncached full execution; reviewed selection and cache recovery are separate.

**Blocked by:** 13, 07, 22

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Audit/writer identities, protected timeout and artifact retention are wired in ticket 24's activation follow-up.

- [ ] Two candidate PRs in a window do not both get blamed: replay identifies the introducing change; inconclusive/budget-exhausted replay reports unresolved and disables affected selection. Candidates are bounded by the rolling 50 relevant PRs and protected audit timeout.
- [ ] A target that fails once and passes on rerun is reported as a flake, not a miss.
- [ ] Ten omitted targets in one PR count once in PR incidence; provider denominators contain only PRs using that provider. Before 50, two confirmed miss-PRs disable selection; at 50, >2% disables; a release-reaching miss disables immediately.
- [ ] One confirmed stale cached pass quarantines affected gate/input-model reuse until a reviewed fix; ordinary missing/invalid entries merely execute checks and do not enter correctness counts.
- [ ] Missing, bad-signature, >48-hour, wrong-scope or older-than-latest-trusted-audit ledgers produce uncached full execution despite valid cached entries. An unverified remote “latest” pointer is insufficient.
- [ ] Reviewed `missResetAt` and cache reset/fix affect separate histories; changing a hash alone, a future-dated reset or missing receipts does not silently erase incidents.

Start with a correctly signed but obsolete “safe” ledger and a newer trusted audit; optimization must remain off.
