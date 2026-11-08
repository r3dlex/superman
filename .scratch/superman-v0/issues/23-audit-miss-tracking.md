# 23: Attributed incidents and the fresh safety ledger

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The audit/recovery contract in spec §5.7: classify selection misses, stale cached passes, flakes, lookup misses and unresolved attribution separately. Verify a culprit through bounded base/head replay, not the merge window alone. Compute PR-incidence windows and produce run/attempt/policy/provider-bound safety data; ticket 22's separate trusted writer signs it. Readers independently verify latest trusted audit identity, scope and age ≤48 hours. Missing/untrusted safety evidence forces uncached full execution; reviewed selection and cache recovery are separate.

**Blocked by:** 13, 07, 22

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Audit/writer identities, protected timeout and artifact retention are wired in ticket 24's activation follow-up.

This later selection/cache safety ledger extends the already-installed quality contract. §5.4's weekly/release mutation audits, finding triage and source-merge freshness stop are earlier Gate 1 requirements, independent of this ledger's ≤48-hour freshness rule.

- [ ] Two candidate PRs in a window do not both get blamed: replay identifies the introducing change; inconclusive/budget-exhausted replay reports unresolved and disables affected selection. Candidates are bounded by the rolling 50 relevant PRs and protected audit timeout.
- [ ] A target that fails once and passes on rerun is reported as a flake, not a miss.
- [ ] The first confirmed selection miss quarantines implicated selection immediately, regardless of history size; unknown attribution disables conservatively. Ten omitted targets in one PR count once in diagnostic rolling-50 incidence, with only provider-using PRs in each denominator. No 2%/two-miss grace remains, and an unconfirmed flake is not a confirmed miss.
- [ ] The first confirmed stale cached pass separately quarantines implicated gate/input-model reuse; recovery requires a reviewed fix and fresh uncached full evidence. Ordinary missing/invalid cache entries merely execute checks and do not enter correctness counts.
- [ ] Missing, bad-signature, >48-hour, wrong-scope or older-than-latest-trusted-audit ledgers produce uncached full execution despite valid cached entries. An unverified remote “latest” pointer is insufficient.
- [ ] Explicit-clock fixtures keep the two audit contracts independent: acceptable mutation-audit age cannot validate an expired optimization ledger, and a fresh signed safety ledger cannot reset the fourteen-day source-merge clock or resolve a critical mutation finding. Full-execution fallback preserves §5.4's mutation applicability; it neither clears findings nor creates a daily broad-mutation obligation.
- [ ] Selection and reuse recover through separately reviewed fix/conformance/replay evidence, fresh uncached full verification and their scoped activation records. `missResetAt`, a cache reset, changed hash, later green retry, future-dated reset or missing receipts cannot alone clear quarantine or erase history.
- [ ] Audit preserves unavailable/failed existing-self-hosted attempts separately from selection misses and stale cached passes. Missing/mismatched required native-platform/runtime/environment/tool/access evidence (§5.5/§8) is unknown/untrusted, never a passing leg or zero incidents. Hosted fallback and new VM infrastructure are not recovery routes; historical receipts are not rewritten.
- [ ] Replay/safety attribution binds applicable actual runtime/source-or-compiled/config/capability/tool identities (§5.10); a compatibility version or old Node result cannot establish a Deno pass or zero incidents. Missing evidence remains unresolved/untrusted, with existing conservative fallback/quarantine rules rather than erased history.

Start with a correctly signed but obsolete “safe” ledger and a newer trusted audit; optimization must remain off.
