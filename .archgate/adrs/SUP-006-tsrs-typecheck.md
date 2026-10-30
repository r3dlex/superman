---
id: SUP-006
title: The type check is the exact-pinned tsrs in default mode
domain: superman
rules: true
files: ["package.json", "superman.config.json", ".github/workflows/*.yml", ".github/workflows/*.yaml"]
---

Source: docs/adr/0008-tsrs-primary-typechecker.md

## Context

tsrs is a beta Rust port of TypeScript 7's checker. Its `--fast` preset (also `TSRS_FAST=1`) can change diagnostics and the exit status compared to the pinned TypeScript. A floating version could change gate results without a reviewed PR.

## Decision

The typecheck gate runs `tsrs --noEmit` in default mode. `tsrs`, and `typescript` if present for the drift job, are exact-pinned devDependencies. Workflows and `superman.config.json` never pass `--fast` and never set `TSRS_FAST`.

The 2026-10-30 design also permits verified complete-project typecheck argv (spec §5.7). The current executable companion checks the full fallback command only; extending its scope to those project commands/protected compiler inputs is pending bootstrap/activation work, not installed by this Markdown amendment.

## Do's and Don'ts

- Do pin `tsrs` to an exact version such as `0.20.1-ts7.1.0-beta`, and upgrade it only in a PR that passes full CI.
- Do use `--fast` in a local editor or watch loop if you want.
- Don't use `^`, `~`, ranges or dist-tags for `tsrs` or `typescript`.
- Don't add `--fast` or `TSRS_FAST` to a workflow or to gate argv.
- Don't use tsrs to emit build output; Bun builds release artifacts.

## Consequences

### Positive

- Gate results only change when a reviewed pin bump changes them.

### Negative

- tsrs upgrades always need a PR, even for patch releases.

### Risks

- A tsrs bug can still report a wrong result in default mode. The scheduled tsc drift job and the revert triggers in ADR 0008 cover this.

## Compliance and Enforcement

- `exact-pin`: `devDependencies.tsrs` and `devDependencies.typescript`, when present, are exact versions.
- `no-fast-in-gates`: no line in a workflow or `superman.config.json` passes `--fast` (other than `--fast false`) or mentions `TSRS_FAST`.
- `typecheck-uses-tsrs`: when `superman.config.json` exists, `gates.typecheck` contains `tsrs` and `--noEmit`.

Active from M1. The rules pass until ticket 01 adds the devDependency and ticket 04's follow-up adds the config.

## References

- docs/adr/0008-tsrs-primary-typechecker.md
- spec §5.1, §5.3, §5.4 (G2), §8
