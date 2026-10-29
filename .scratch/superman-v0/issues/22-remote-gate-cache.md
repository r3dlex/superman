# 22: Remote gate cache: read-only PRs, signed writes from `main`

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** A third tier over HTTP, S3-compatible (R2 by default), at `<prefix>/v1/<repo>/ac/<key>.json`, spoken to with `fetch` and SigV4 written on `node:crypto` (no SDK). Reads: anonymous GET on a public endpoint, or with a read-only token. Writes happen only when superman runs on a `push` or `schedule` event on the base branch **and** finds the write credential and the Ed25519 signing key in its environment; any other run never attempts a PUT. Entries are `{ key, result, producer: { repo, sha, runId, ref }, createdAt, sig }`; readers recompute the key, require `entry.key` to match, verify `sig` with `affected.cache.remote.publicKey` and treat any failure as a miss (logged in the receipt). ADR 0011.

**Blocked by:** 21

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-remote-cache`: `affected.cache.remote` (`url`, `bucketPrefix`, `publicKey`) in `superman.config.json` and the `superman-cache-write` Environment in the workflow. Manual André steps first: the R2 bucket, the public read endpoint, the write token and the signing key pair stored in the Environment (question 16).

- [ ] Against an in-process HTTP stub, a `pull_request` run never sends PUT, even with write credentials present in its environment (test-first).
- [ ] A `push` run on `main` with credentials writes a signed entry; the SigV4 `Authorization` header matches AWS's published test vector.
- [ ] An entry with a wrong key, a tampered `result` or a signature from another key is treated as a miss and the gate runs.
- [ ] A network error or 5xx is a miss, never a failure of the gate.
- [ ] `doctor` reports the remote tier as `read-only`, `read-write` or `off`.
