---
id: SUP-007
title: No Trivy ignore or config files
domain: superman
rules: true
files: [".trivyignore", ".trivyignore.yaml", "**/.trivyignore", "**/.trivyignore.yaml", "trivy.yaml", "trivy.yml", "**/trivy.yaml", "**/trivy.yml"]
---

Source: docs/adr/0009-biome-and-trivy-gates.md

## Context

Trivy reads `.trivyignore` and `trivy.yaml` from the scanned directory automatically. Either file can silence a HIGH or CRITICAL finding without the gate command changing, which is a waiver under ADR 0004.

## Decision

The repo has no `.trivyignore`, `.trivyignore.yaml` or `trivy.yaml`. Gate G11 is configured only through its argv in the protected CI workflow and `superman.config.json`.

## Do's and Don'ts

- Do fix a finding, upgrade or replace the dependency, or remove the secret and rotate it.
- Do change G11's severity or scanners only in a spec PR.
- Don't add a Trivy ignore or config file, even under a protected path.

## Consequences

### Positive

- Every G11 result shows exactly what the pinned scanner found.

### Negative

- An unfixable upstream HIGH finding blocks merges until a spec PR changes the gate or replaces the dependency.

### Risks

- Inline `trivy:ignore` directives are not covered by this executable rule. SUP-005 was adopted in ADR 0004 on 2026-10-30 and remains a Gate 1 bootstrap implementation prerequisite; this documentation edit does not install it.

## Compliance and Enforcement

Rule `no-trivy-ignore` reports each scoped file that exists. Active from M1.

## References

- docs/adr/0009-biome-and-trivy-gates.md
- docs/adr/0004-no-waivers.md
- spec §5.4 (G11)
