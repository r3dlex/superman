---
Status: proposed
---

# Quality-first CI uses existing self-hosted environments only

André's final [quality interview U2/Q32/Q35](../../.scratch/superman-v0/code-quality-amendment.md) on 2026-11-01 supersedes this ADR's 2026-10-31 nonexclusive self-hosted preference, hosted exceptions and disposable-worker delivery prerequisite. Strengthen repository-owned quality CI using **only existing self-hosted environments/currently available images**, rather than turn the amendment into a VM/controller platform. Spec §8 owns routing/inventory/access policy, §5.5/§5.7 evidence/reuse and §17 activation. The filename is retained for stable references, not as the active policy's title.

## Trade-offs

- **Lean existing CI:** selected. One full local/remote quality policy with native macOS arm64/Linux x64/Linux arm64 evidence is the deliverable. Missing platforms/tools remain blocking, not reasons for an exemption.
- **Hosted pilot/fallback:** superseded, including bootstrap/outage/untrusted-PR/release exceptions. Bare hosted labels and a failed self-hosted gate cannot select another provider to get green. Labels/groups constrain matching; an unmatched route queues rather than failing over.
- **New disposable VM/image/controller infrastructure:** deferred outside this delivery, with no promised follow-up. Existing persistent environments need an honest access/credential/risk inventory, not a false isolation claim or a new lifecycle-attestation project. Deno permissions and fresh temporary paths do not sandbox project tools.
- **Preinstalled tools only:** declined. Approved exact-pinned artifacts/frozen dependencies may be verified/provisioned in owned job directories on existing environments, with lifecycle/pnpmfile suppression and actual identities recorded. This does not approve a runtime pin, global host change, image rebuild or installation during document synthesis.

## Consequences and scope

Bind actual route/native platform/runner software and currently available image identity/provenance, or a dated native-host/environment/tool inventory when no image exists. Do not invent an image digest or infer architecture from job titles. Relevant unknown execution inputs disable reuse and invoke uncached full checks; missing required platform/tool/access evidence still blocks that job. A fresh full run cannot supply missing approval. This preserves complete coverage, cache trust and uncached nightly requirements without requiring a new worker platform.

Retain read-only PR tokens, no persisted checkout credentials and no approver/App/private keys or privileged writer/uploader/bot/model credentials in project jobs. Privileged roles use separately restricted operator-approved **existing self-hosted** profiles; actual credential/access separation must be established before each role activates. A job/Environment name alone proves no separation. If an existing route cannot meet the relevant boundary, block that role rather than provision a VM or claim hostile-code containment. Data-only cache/safety writers and release uploaders execute no project installs/builds/tests/hooks; reviewed wiki maintenance retains only its bounded bot/model role. ADRs 0001/0017 retain the PR-owned-checker/human-review and same-user local-agent limits.

This governs Superman, not organization settings or another repository. Required `bootstrap (…)` contexts and their App binding stay unchanged; actual source selectors and historical public observations live in spec §8.4. They are not current complete capacity/environment/access acceptance. André (`br4vesirrobin`) is accountable for quality policy/profiles/calibration/recovery and may explicitly delegate bounded operations; that assigns no credential-use authority. Existing Archgate-arm64/runtime/native-platform/live-protection blockers remain. This ADR stays proposed: synthesis activates no route, installs no tool, updates no image and admits no ticket.

## Primary-source limits

Previously read official [routing](https://docs.github.com/en/actions/reference/runners/self-hosted-runners), [labels/groups](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow) and [self-hosted security guidance](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners) explain queue and persistent-host risks. They do not certify this fleet, approve an image or establish current access. Research remains evidence about sources, not a native execution result or new provisioning authority.

Next: review the narrowed spec/ADR delta and request §8.4's sanitized current existing-environment/tool inventory before authorizing preparation or route activation.
