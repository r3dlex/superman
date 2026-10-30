---
Status: accepted
---

# Cache only modeled code checks; keep authority and fresh evidence separate

André retained local, Actions and remote gate-result caches in v0, with a conservative eligibility policy on 2026-10-30. Reusing a passing result is useful only when the result's complete inputs and current safety state are known. The key, allowlist, freshness and recovery contract lives in spec §5.7; this ADR records why.

## Eligibility and trust

Only fully input-modeled typecheck, test, knip, duplication, mutation and lint checks may reuse passes. Architecture/policy, skill integrity, traceability, behavior replay, forge admission and Trivy always execute afresh. Matching source hashes alone cannot model changed reviews, commit history or vulnerability databases. Keys include actual checker/tool identities as well as version strings, protected configuration, platform, allowed environment and complete source/runtime-asset inputs; missing input evidence means fresh execution.

| Tier | Authority |
|---|---|
| Local | Supporting local runs may save passes in the clone's Git metadata; this is not independent merge-admission evidence. Worktree metadata paths are resolved through git, not an assumed `.git/` directory. |
| Actions | Pinned cache steps may save PR-scoped entries under GitHub's isolation rules. Those saves never become entries that main trusts from a PR namespace. |
| Remote | S3-compatible R2, read-only to PRs; entries signed by trusted main writers and checked against a protected public key. Private cache data requires authenticated reads; missing credentials skip the tier, never expose data or justify PR secrets. |

Main selects every target and may reuse eligible valid passes. Nightly selects every target and reads no gate-result cache, making it the fresh comparison run. A missing, stale or unverifiable safety ledger makes the fallback an **uncached** full run; otherwise an unread quarantine decision could be bypassed by reusing passes during full selection.

## Credentials and recovery

André chose protected GitHub Environment credentials rather than an OIDC-validating Cloudflare Worker for v0. Cache-writing/signing authority is confined to separate main push/nightly writer jobs; jobs installing dependencies or executing project tests/builds do not receive it. Writers validate the producing run, commit and artifact identities before signing data and do not execute project hooks. Ed25519 signatures authenticate the producer, not freshness or completeness; the latest trusted audit and scope checks remain necessary.

One confirmed stale cached pass quarantines the implicated entries and disables reuse for that gate/input model until a reviewed fix. Fresh gate execution continues. This is not a selection-miss percentage event, and an absent/invalid cache entry that simply causes execution is not an incident.

## Considered Options

- **Only local and Actions tiers:** declined; they do not provide the intended shared/local reuse across pilot environments.
- **Cache every gate with more elaborate keys:** declined for v0; keep admission, evidence and security checks fresh.
- **Fresh execution on every main push:** declined; main may reuse valid allowlisted passes while nightly stays uncached.
- **Cloudflare Worker accepting GitHub OIDC:** deferred until infrastructure scale justifies the additional deployed adapter. The v0 write credential remains Environment-scoped.
- **Only evict the one known-bad entry:** declined; a shared input-model bug can invalidate other entries for the same gate.

Setup remains André's manual step before ticket 22's activation follow-up: choose the R2 account/bucket and authenticated/private or public read endpoint as appropriate, provision the write credential and signing key, and verify the Environment restrictions. No such setup or credential change was performed by this design reconciliation.
