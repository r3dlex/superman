# 22: Remote gate cache: read-only PRs, signed writes from `main`

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** S3-compatible R2 transport, SigV4 and Ed25519 entry verification using Node built-ins (ADR 0011/spec §5.7). PRs read only. Private data requires authenticated reads; absent read credentials skip that tier, never leak it publicly or inject PR secrets. Only a separate trusted main push/nightly writer job receives write/signing credentials; it verifies producing run/attempt/ref/commit/artifact identities and signs validated pass/safety data without installs/tests/project hooks. A source-execution job does not become a writer merely because credentials are accidentally present. Invalid entries/network errors are lookup misses, not selection incidents.

**Blocked by:** 21

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-remote-cache` configures the URL/public key and separate restricted writer. Before activation André chooses account/bucket, public or authenticated-private reads, Environment restrictions and credentials/keys. Protected Environment credentials were selected for v0; no OIDC Worker or live infrastructure is implied by this ticket.

- [ ] Against an in-process HTTP stub, a `pull_request` run never sends PUT, even with write credentials present in its environment (test-first).
- [ ] A dedicated verified main writer writes a signed entry and matches the SigV4 test vector; a main build/test job with planted credentials still does not PUT.
- [ ] An entry with a wrong key, a tampered `result` or a signature from another key is treated as a miss and the gate runs.
- [ ] A network error or 5xx is a miss, never a failure of the gate.
- [ ] `doctor` reports the remote tier as `read-only`, `read-write` or `off`.
- [ ] Missing private read credentials skip remote without exposing data; wrong source run/attempt/ref/SHA/digest blocks signing/upload, and project hooks never execute in the privileged writer.

Start with a fake main build job carrying credentials and prove that it cannot enter the writer operation.
