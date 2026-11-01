---
Status: accepted
---

# Biome and Trivy are blocking gates (G10, G11), with no ignore files

André decided on 2026-10-29 that Biome lints and formats TypeScript, JavaScript and JSON, replacing ESLint and Prettier. `biome ci` blocks merges as gate G10. Pre-commit checks staged files; affected PRs require conservative complete rule inputs/graph, while full selection checks the repository. Spec §5.4 owns the confirmed 2026-11-01 profile and severity/scope fixtures; ADR 0010 owns selection rationale. A successful process exit is not proof that every intended rule or input was checked.

Trivy runs as gate G11: `trivy fs` scans vulnerable dependencies including development tools, committed secrets and misconfigurations, failing on HIGH or CRITICAL. The quality amendment requires the same scan in full local pre-PR and CI: missing local Trivy blocks that full result, superseding the earlier `n/a (enforced in CI)` exception. Pre-commit stays partial; `doctor` presence diagnostics alone are not a full pass. CI delegates G11 to Linux x64 with explicit accounting on other legs. Deno source/assets and compiled artifacts replace npm/Bun product scan targets (ADR 0016); actual scanner coverage of archives/embedded runtimes/binaries must be proved, not inferred from an exit code.

## Confirmed quality-profile extension (2026-11-01; activation unproved)

Vetted explicit-any, ts-ignore and resolved runtime import-cycle findings become explicit Biome **errors**, with paired valid/invalid fixtures under the retained pin. This prevents informational defaults from silently passing a supposedly blocking rule. Actual Deno aliases/import maps/reexports, declarations and runtime versus type-only edges must be covered; unknown resolution broadens or blocks rather than becoming a zero-cycle result. Govern effective suppression semantics separately: `noTsIgnore` does not itself ban every type-check suppression or authorize another directive.

Structural cognitive-complexity/function-body-length/parameter findings stay per-function, cohort-separated advisories until useful scoped calibration and Gate 1 promotion (spec §5.4, ADR 0017). No automatic hard ceiling, extra linter suite, compiler flag or nursery-rule promotion follows. The current recommended-only `biome.json` is not evidence that these additions are implemented; Deno graph/directive fixtures and full local/CI parity remain §17 preparation.

Consistent with ADR 0004, there is no `.trivyignore` (or any Trivy ignore or config file). A finding is fixed, the dependency is upgraded or replaced, or the gate itself changes in a spec PR.

## Considered Options

- **ESLint plus Prettier.** Rejected by André. It means two tools and a plugin tree of dev dependencies.
- **A protected `.trivyignore`.** Rejected. It would be a standing waiver list, even if reviewed.
- **`aquasecurity/trivy-action` or `setup-trivy` in CI.** Rejected. In March 2026 their tags were force-pushed to credential-stealing code (GHSA-69fq-xp46-6x23, CVE-2026-33634). CI downloads the pinned Trivy release tarball instead and checks its sha256 against a value committed in the workflow. The binary was compromised too (v0.69.4), so the pin is a reviewed exact version, never `latest`.

## Consequences

- Rule SUP-007 reports any `.trivyignore*` or `trivy.yaml` file. `biome.json` joins the protected paths, so rule changes need a spec PR.
- Inline suppressions (`biome-ignore` and `trivy:ignore` comments) are the same kind of waiver as `archgate-ignore`. SUP-005 was adopted on 2026-10-30 and implemented in the Gate 1 bootstrap. Its later [Deno comment-namespace preparation](../../.scratch/superman-v0/gate1-preparation.md) is locally verified with pinned-engine process fixtures and supplemental actual-rule callbacks, including declared prevention cases beyond native pragmas. It does not prove a Deno runtime/collector port or three-platform admission. [Bootstrap evidence](../../.superman/ci/bootstrap-evidence.md) and spec §17 retain the remaining obligations.
- Biome covers only TS, JS and JSON. Polyglot repos (lx) map G10 to their own linters through config.
- Pins checked on 2026-10-29: `@biomejs/biome@2.6.4` and Trivy `v0.76.1`. The linux-x64 tarball sha256 is `c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0`, verified against `trivy_0.76.1_checksums.txt`.
- G11 always executes afresh because vulnerability databases are external inputs. Biome is cache-eligible only under ADR 0011's complete-input allowlist.
- Deno does not replace Biome or Trivy. Prove the selected Deno source/config/global handling under the existing pins; no `deno lint`/`deno fmt` substitution or suppression family is silently approved. The bounded SUP-005 result is separate preparation, not implementation by this ADR edit or proof of the remaining runtime/measurement integration.
