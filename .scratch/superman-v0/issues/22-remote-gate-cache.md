# 22: Remote gate cache: read-only PRs, signed writes from `main`

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** S3-compatible R2 transport, built-in-only SigV4 and Ed25519 verification using stable Deno/Web/supported compatibility APIs (ADRs 0011/0016, spec §5.7/§5.10). PRs read only. Private data requires authenticated reads; absent credentials skip that tier, never expose data or inject PR secrets. Only a separate trusted Deno-operated main push/nightly writer receives write/signing credentials; it verifies producing run/attempt/ref/commit/artifact/runtime/profile identities and signs validated data without installs/tests/project hooks. A source-execution job does not become a writer because credentials are accidentally present. Invalid entries/network errors remain lookup misses, not selection incidents.

**Blocked by:** 21

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-remote-cache` configures the URL/public key and separate restricted writer. Before activation André chooses account/bucket, public or authenticated-private reads, Environment restrictions and credentials/keys, plus §8's operator-approved restricted existing self-hosted environment/tool/access profile. Public fleet observations and a job/label/Environment name alone prove no credential separation. Missing relevant evidence blocks that role, without hosted substitution or new disposable-VM infrastructure. Protected Environment credentials remain selected; no OIDC Worker or live setup is implied by this ticket.

- [ ] Against an in-process HTTP stub, a `pull_request` run never sends PUT, even with write credentials present in its environment (test-first).
- [ ] A dedicated verified main writer writes a signed entry and matches the SigV4 test vector; a main build/test job with planted credentials still does not PUT.
- [ ] An entry with a wrong key, a tampered `result` or a signature from another key is treated as a miss and the gate runs.
- [ ] Reader/writer fixtures apply ticket 21's shared eligibility contract: a G6 pass is neither published nor consumed as a reusable remote cache entry, even with matching inputs, valid provenance and signature. Required mutation and triggered fault controls execute fresh under §5.4.
- [ ] A network error or 5xx is a miss, never a failure of the gate.
- [ ] `doctor` reports the remote tier as `read-only`, `read-write` or `off`.
- [ ] Missing private read credentials skip remote without exposing data; wrong source run/attempt/ref/SHA/digest blocks signing/upload, and project hooks never execute in the privileged writer.
- [ ] Writer fixtures validate actual producer/consumer runtime/environment/tool identities and provenance (§5.5/§8); mismatched/unapproved identities cannot be signed into trusted passes. Before activation operator evidence establishes relevant credential/access separation from project execution, including protected writer storage. Record persistent-host limits honestly; transport tests/job names are not that evidence, and no new VM/lifecycle attestation is required.
- [ ] Transport/writer process fixtures run actual Deno with reviewed bounded network/env/config capabilities and record its real identity; a Node-hosted HTTP stub is test infrastructure, not a Node operational fallback. Deno subprocess permissions are not claimed as isolation or authority; existing independent trust/credential prerequisites remain.

Start with a fake main build job carrying credentials and prove that it cannot enter the writer operation.
