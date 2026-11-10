---
Status: accepted
---

# Cache only modeled code checks; keep authority and fresh evidence separate

André retained local, Actions and remote gate-result caches in v0, with a conservative eligibility policy on 2026-10-30. Reusing a passing result is useful only when the result's complete inputs and current safety state are known. The key, allowlist, freshness and recovery contract lives in spec §5.7; this ADR records why.

## Eligibility and trust

Only fully input-modeled typecheck, ordinary test, knip, full-corpus duplication and lint checks may reuse passes. **The confirmed 2026-11-08 mutation amendment (ADR 0017) removes mutation from this eligibility list in the plan:** its required profiles execute fresh, using scope selection rather than historical result reuse. Architecture/policy, owner-governed critical acceptance, skill integrity, traceability, behavior replay, forge admission, Trivy and G12 also execute afresh. Critical cases stay outside selection/reuse so an optimization cannot omit its own oracle. Matching source hashes alone cannot model changed tests/fixtures, reviews, commit history or vulnerability databases. Keys include actual checker/tool identities, protected configuration, platform, allowed environment and complete source/runtime-asset/comparison inputs; missing input evidence means fresh execution. Duplication reuse must cover the entire approved corpus, not a selected subset.

The 2026-11-01 Deno amendment (ADR 0016) extends this model to actual operational/runtime and real Node test-tool hosts, source/compiled launch form, executable content, compiler declarations, effective permission/config/environment policy and assets; compiled evidence also binds verified denort/build/artifact identities. A Node-compatible version label cannot prove real Node execution or equivalence to Deno. No cross-runtime/form reuse is assumed. Unknown modeled inputs force uncached full checks, while missing required runtime/profile approval still blocks admission. Retained historical Node receipts are not upgraded. The remote built-in transport and later protected writers run on Deno; trust roles/credentials remain unchanged. Implementation belongs to tickets 21–24 before reuse activation, not this document.

| Tier | Authority |
|---|---|
| Local | Supporting local runs may save passes in the clone's Git metadata; this is not independent merge-admission evidence. Worktree metadata paths are resolved through git, not an assumed `.git/` directory. |
| Actions | Pinned cache steps may save PR-scoped entries under GitHub's isolation rules. Those saves never become entries that main trusts from a PR namespace. |
| Remote | S3-compatible R2, read-only to PRs; entries signed by trusted main writers and checked against a protected public key. Private cache data requires authenticated reads; missing credentials skip the tier, never expose data or justify PR secrets. |

Main selects every applicable target and may reuse eligible valid passes. Nightly selects its applicable targets and reads no gate-result cache, making it the fresh comparison run. Mutation's own weekly/release applicability and always-fresh contract live in spec §5.4; ordinary main/nightly events do not imply a daily broad mutation audit. A missing, stale or unverifiable safety ledger makes required fallback work **uncached**; otherwise an unread quarantine decision could be bypassed by reusing passes during full selection.

## Credentials and recovery

André chose protected GitHub Environment credentials rather than an OIDC-validating Cloudflare Worker for v0. Cache-writing/signing authority is confined to separate main push/nightly writer jobs; jobs installing dependencies or executing project tests/builds do not receive it. Writers validate the producing run, commit and artifact identities before signing data and do not execute project hooks. Ed25519 signatures authenticate the producer, not freshness or completeness; the latest trusted audit and scope checks remain necessary.

One confirmed stale cached pass quarantines implicated entries and disables reuse for that gate/input model until a reviewed fix, relevant invalidation fixtures and fresh uncached full evidence. Fresh gate execution continues. A reset, changed hash or later green retry alone does not repair the model. Selection-miss quarantine is separate (ADR 0010); an absent/invalid cache entry that simply causes execution is not an incident.

Execution inputs use the reviewed existing self-hosted environment and actual available image/native-host/tool identities (ADR 0015), not a new VM platform. Unknown stable inputs force fresh checks; missing required platform/tool/access approval still blocks the applicable role. Separate writer credentials and data-only validation remain required, but an Environment/job name alone does not prove isolation. The retained repository-checker/human-review limit (ADRs 0001/0017) is not replaced by a signature or claimed tamper-proof dynamic evidence.

## Considered Options

- **Only local and Actions tiers:** declined; they do not provide the intended shared/local reuse across pilot environments.
- **Cache every gate with more elaborate keys:** declined for v0; keep admission, evidence and security checks fresh.
- **Fresh execution on every main push:** declined; main may reuse valid allowlisted passes while nightly stays uncached.
- **Cloudflare Worker accepting GitHub OIDC:** deferred until infrastructure scale justifies the additional deployed adapter. The v0 write credential remains Environment-scoped.
- **Only evict the one known-bad entry:** declined; a shared input-model bug can invalidate other entries for the same gate.

Setup remains André's manual step before ticket 22's activation follow-up: choose the R2 account/bucket and authenticated/private or public read endpoint as appropriate, provision the write credential and signing key, and verify the Environment restrictions. No such setup or credential change was performed by this design reconciliation.
