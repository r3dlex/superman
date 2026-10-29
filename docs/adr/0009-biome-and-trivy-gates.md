---
Status: accepted
---

# Biome and Trivy are blocking gates (G10, G11), with no ignore files

André decided on 2026-10-29 that Biome lints and formats TypeScript, JavaScript and JSON, replacing ESLint and Prettier. `biome ci` blocks merges as gate G10. It runs on staged files in pre-commit and on the whole repo in pre-pr and CI.

Trivy runs as gate G11: `trivy fs` on the repo, scanning for vulnerable dependencies (from `pnpm-lock.yaml`, including dev dependencies, since superman's only dependencies are dev tools), committed secrets and misconfigurations. It fails on HIGH or CRITICAL. CI always runs it. Locally, pre-pr runs it when the `trivy` binary is on PATH and otherwise reports `n/a (enforced in CI)`, and `doctor` reports whether it is present. Before publish, the release workflow also scans the npm tarball and the Bun binaries.

Consistent with ADR 0004, there is no `.trivyignore` (or any Trivy ignore or config file). A finding is fixed, the dependency is upgraded or replaced, or the gate itself changes in a spec PR.

## Considered Options

- **ESLint plus Prettier.** Rejected by André. It means two tools and a plugin tree of dev dependencies.
- **A protected `.trivyignore`.** Rejected. It would be a standing waiver list, even if reviewed.
- **`aquasecurity/trivy-action` or `setup-trivy` in CI.** Rejected. In March 2026 their tags were force-pushed to credential-stealing code (GHSA-69fq-xp46-6x23, CVE-2026-33634). CI downloads the pinned Trivy release tarball instead and checks its sha256 against a value committed in the workflow. The binary was compromised too (v0.69.4), so the pin is a reviewed exact version, never `latest`.

## Consequences

- Rule SUP-007 reports any `.trivyignore*` or `trivy.yaml` file. `biome.json` joins the protected paths, so rule changes need a spec PR.
- Inline suppressions (`biome-ignore` and `trivy:ignore` comments) are the same kind of waiver as `archgate-ignore`. They are added to ADR 0004's proposed SUP-005 for André to decide.
- Biome covers only TS, JS and JSON. Polyglot repos (lx) map G10 to their own linters through config.
- Pins checked on 2026-10-29: `@biomejs/biome@2.6.4` and Trivy `v0.76.1`. The linux-x64 tarball sha256 is `c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0`, verified against `trivy_0.76.1_checksums.txt`.
