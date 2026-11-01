---
Status: proposed
---

# Prefer approved-image self-hosted CI without making it exclusive

The 2026-10-31 Gate 1 amendment for existing PR #1 proposes self-hosted runners with approved immutable images as the preferred r3dlex CI default. Controlling image provenance and lifecycle can improve reproducibility and capacity economics, but operating that fleet also creates isolation, update and availability responsibilities. The preference is conditional on demonstrated safe capacity, not a reason to queue indefinitely, run public PRs on a developer machine or weaken a gate. Spec §8 owns execution policy and activation prerequisites; terms live in `GLOSSARY.md`.

## Trade-offs

- **Self-hosted-only:** rejected. Unavailable platforms/capacity and unsafe untrusted-code boundaries need explicit GitHub-hosted exceptions; npm currently requires hosted runners for OIDC trusted publishing. Replacing OIDC with a long-lived token merely to self-host would reverse ADR 0006's security choice.
- **GitHub-hosted-only:** not the intended r3dlex default. Hosted capacity remains useful for bootstrap, untrusted PRs, outages and provider-parity checks, but moving hosted image aliases do not provide the same reviewed immutable-image control. Each exception preserves all gate/platform/coverage obligations.
- **Automatic label failover:** rejected as a false capability. GitHub's labels/groups constrain matching; an offline self-hosted route queues rather than switching providers. v0 uses an explicitly authorized, reviewed routing change and fresh attempt evidence, preserving the unavailable/failed attempt.
- **Persistent/shared workers or job-name-only privilege separation:** rejected. Untrusted project execution can persist into later jobs or reach host authority. Disposable single-job workers, independently demonstrated cleanup and restricted trust domains are prerequisites; ephemeral registration and an image digest alone prove neither isolation nor host identity.

## Consequences and scope

Execution receipts must identify the actual route, runner and image/provenance, including hosted image versions and exception/fallback authority. Cache keys model stable execution inputs, not just source/tool versions or ephemeral worker names; unknown inputs force fresh checks, not invented equivalence. These extend ADRs 0011/0014 without changing their cache allowlist, coverage floors or uncached nightly behavior. ADR 0001's accepted same-user local-agent risk does not authorize shared developer-machine CI.

The separate GitHub-hosted npm publisher remains a provider-required exception, consuming the exact scanned artifact with no project hooks and no stored npm token. Self-hosted or explicitly excepted build/test/scan jobs have no publication authority; cache/safety writers and wiki maintenance retain their separate restricted roles (ADRs 0006, 0011, 0012).

This records organization-wide **intent**, not a verified organization setting or adoption in another repository. Required check names and the `bootstrap.json` bindings are unchanged. Both active workflows already select self-hosted label sets: `ci.yml` uses `["self-hosted","macOS","ARM64","r3dlex-org"]`, `["self-hosted","Linux","X64","r3dlex-org"]` and `["self-hosted","Linux","ARM64","r3dlex-linux-arm64"]`; the arm64 candidate workflow uses the last of those. Check suffixes such as `macos-15` are not those routes. The selector change is not image approval, isolation proof, exception authorization or fleet-capacity evidence. Public `r3dlex/github-runners-for-repo` source and job assignments supply partial observed names/group/selectors, recorded in spec §8.4 and its linked research. A persistent shared Colima fleet and a failure-triggered hosted fallback are not proof of this decision's disposable isolation, immutable-image approval or fail-closed behavior. Current complete registration, Superman access, approved fleet images and restricted privileged profiles still require evidence; §8.4 blocks admission of the proposed contract pending that proof and separate authorization. Existing bootstrap/platform/redistribution blockers and historical evidence remain intact. This proposed ADR is not Gate 1 approval or ticket 01 admission.

## Primary sources (read without credentials, 2026-10-31)

- [GitHub routing and ephemeral-runner reference](https://docs.github.com/en/actions/reference/runners/self-hosted-runners): unmatched capacity queues; deregistration after one job does not itself wipe the worker.
- [Using labels and groups](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow): cumulative matching, not ordered fallback; actual repository runner inventory requires authorized access.
- [GitHub self-hosted security guidance](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners): public PR exposure, cross-job/host compromise and JIT hardware-reuse risks.
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/#supported-cicd-providers): GitHub-hosted runners supported, self-hosted runners currently unsupported.

Next: review the exception scopes and request §8.4's sanitized inventory before authorizing implementation or routing activation.
