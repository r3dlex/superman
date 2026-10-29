---
Status: accepted
---

# Gate results are cached by content hash, and only trusted runs on main may write the shared caches

André decided on 2026-10-29 that v0 ships a gate result cache with three tiers: local, the GitHub Actions cache, and a remote content-addressed store over HTTP. A **cache key** is the sha256 of a canonical JSON document holding the cache schema version, the gate and target, the exact argv, the tool versions from `superman.lock.json` plus the resolved binary versions, the hash of the config sections the gate reads, the OS and architecture, an allowlisted set of environment variables, and the sorted `(path, sha256)` list of the target's input files (its own files, its transitive dependencies from the provider, and the `global` paths). Only **pass** results are stored. A hit with a pass skips that gate for that target, and the receipt records `cached: { key, producerSha, tier }`.

- **Local:** `.git/superman/cache/` (never committed), written by any local run, read only by the same clone.
- **Actions cache:** the workflow restores and saves the cache directory with `actions/cache` (pinned by SHA). GitHub already scopes it: a `pull_request` run can read caches from its own PR, its base branch and the default branch, and what it saves is scoped to `refs/pull/<n>/merge`, so a PR cannot write a cache that `main` reads.
- **Remote:** one HTTP blob store, S3-compatible (Cloudflare R2 by default). Entries live at `<prefix>/v1/<repo>/ac/<key>.json`. superman talks to it with Node's `fetch` and `node:crypto` (AWS SigV4 signing written in about 80 lines), so there is still no runtime dependency.
  - **Read-only for untrusted runs.** PR runs, including fork PRs that get no secrets, read through a read-only path (a public read endpoint for public repos, a read-only token for private ones). They never write.
  - **Writes only from trusted runs:** `push` to `main` and `schedule` on `main`, through a GitHub Environment `superman-cache-write` that is restricted to `main` and holds the write credential and the signing key.
  - **Signed and hash-checked entries.** Each entry is `{ key, result, producer: { repo, sha, runId, ref }, createdAt, sig }`. `sig` is Ed25519 over the canonical entry, made with the writer's private key. The public key is in `superman.config.json` (a protected path). A reader recomputes the key from its own inputs, requires `entry.key` to equal it, verifies `sig`, and drops (treats as a miss) any entry that fails.
  - Optional: reuse the remote cache of moon or Nx when the repo already runs one, for that tool's own tasks only. superman's gate entries always go to its own store.

## Considered Options

- **No remote cache, only local and Actions.** Rejected by André. Actions caches are per-repo, evicted after 7 days without access and capped per repo (10 GB by default), and they don't help local `pre-pr` runs on the Mac.
- **A Cloudflare Worker in front of R2 that accepts GitHub OIDC tokens for writes** (no long-lived write secret; the worker checks `repository`, `ref == refs/heads/main` and `event_name`). Stronger, but it is extra infrastructure to deploy and review. Kept as open question 18.
- **Caching failures too.** Rejected: a failure must always re-run, so that a flaky failure isn't frozen in.
- **Letting PR runs write to a PR-scoped namespace.** Rejected for v0, because it adds a namespace that `main` must never read. GitHub's Actions cache scoping already gives PR reruns their speed-up.

## Consequences

- Cache poisoning from a PR is prevented by design: a PR can't write to the store `main` reads, and a tampered entry fails the key or signature check.
- A cached pass only proves that a trusted run passed on identical inputs. Hidden inputs (network, time, an unlisted env var) can make it wrong. The nightly run never reads the cache, so it catches these, and a nightly failure on a cached target counts as a miss (ADR 0010).
- A leaked write credential lets an attacker write entries but not sign them, unless the signing key in the same environment leaks too. Rotating both is one spec PR that changes the public key in config.
- Remote cache setup (bucket, endpoint, Environment, keys) is a manual André step, plus a spec-kind follow-up for the config and workflow (ticket 22).
