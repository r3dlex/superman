---
Status: accepted
---

# The v0 agent identity is the GitHub App r3dlex-superman-bot

The first plan was a machine-user account (`r3dlex-bot`) with a classic PAT, but GitHub blocked machine-user sign-up from the agent browser and the `r3dlex` org is on the free plan. v0 therefore authors as the private GitHub App `r3dlex-superman-bot` (no webhook, installed only on selected repos; contents, pull requests and workflows write; metadata, checks, statuses and actions read). superman mints a 1-hour installation token from the App key (`SUPERMAN_APP_KEY_PATH`, mode 600, only in the agents' environment), passes it to `gh` via `GH_TOKEN` with a separate `GH_CONFIG_DIR`, and pushes `spec/*`, `ticket/*` and `chore/*` branches to the upstream repo; commits are authored as `r3dlex-superman-bot[bot]`.

## Considered Options

- Machine-user with a classic PAT (`repo` + `workflow`, 90 days): kept as the `machine-user` mode for a later switch; stronger because it cannot merge.
- Fine-grained PAT: rejected, it cannot contribute as an outside collaborator.

## Consequences

- The `main` ruleset (no bypass, 1 approval, last-push approval, dismiss stale) stops the App from pushing to `main` or approving its own PR, and the tag ruleset stops it from tagging, so it cannot trigger a release.
- The App can press merge after André approves; `merge-ready` prints the merge command for André and `audit` flags a merge by any non-approver (ADR 0001).
- Branch pushes by the App trigger `pull_request` workflows normally; CI needs no secrets.
