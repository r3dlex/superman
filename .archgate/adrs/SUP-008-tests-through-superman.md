---
id: SUP-008
title: CI runs tests and change-scoped gates only through superman, and keeps the nightly full run
domain: superman
rules: true
files: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
---

Source: docs/adr/0010-affected-analysis-and-change-aware-ci.md

## Context

With affected analysis (ADR 0010), `superman gate` decides which targets a PR tests, records that choice in the receipt, and counts misses against the nightly full run. A workflow step that calls a test runner, Stryker, jscpd, Biome, knip or `archgate check` directly would run outside that record: its scope is not in the receipt, it can't be audited, and it could quietly replace a gate. Dropping or narrowing the nightly full run would remove the oracle that misses are measured against.

## Decision

Once any workflow calls `superman gate`, workflows run tests and the change-scoped gates only through `superman gate`. Whenever a workflow uses `--affected`, a scheduled workflow must run `superman gate nightly` without `--affected`, and that workflow may not switch jobs off with `if: false`.

## Do's and Don'ts

- Do call `superman gate ci [--affected]`, `superman gate nightly` and `superman gate pre-pr`, and put tool commands in `superman.config.json` gate argv.
- Do keep the scheduled `tsc-drift` job (`tsc`/`tsrs --noEmit` are not covered here; SUP-006 covers them).
- Don't call `vitest`, `jest`, `stryker`, `jscpd`, `knip`, `biome check|ci|lint|format`, `archgate check`, `mix test`, `mix muex`, `cargo test`, `cargo nextest`, `dotnet test`, `pytest`, `cabal test`, `stack test`, `go test`, `npm|pnpm|yarn|bun test`, `nx affected|run-many`, `moon run|ci` or `turbo run` in a workflow step.
- Don't pass `--affected` to `superman gate nightly`, and don't disable the nightly job.

## Consequences

### Positive

- Every test that CI runs is in a receipt with its affected-target reason, so `audit` can measure misses.
- A ticket can't weaken a gate by adding a raw step, because workflows are protected and this rule is checked at Gate 1.

### Negative

- Repos that adopt superman must move existing raw test steps into gate config in their adoption PR.

### Risks

- The check is text-based. A runner hidden behind a wrapper script name is not caught; SUP-003 (no `*.sh`/`*.py`) and the "no `package.json` scripts in workflows" rule (§17) narrow that gap.

## Compliance and Enforcement

- `tests-only-through-superman`: when a non-comment workflow line runs `superman gate`, no non-comment workflow line invokes a listed tool directly.
- `nightly-full-run`: when a non-comment workflow line uses `--affected`, some workflow has a `schedule:` trigger and runs `superman gate nightly`; `superman gate nightly` never has `--affected`; a workflow that runs the nightly gate has no `if: false` job or step.

Active once ticket 06's follow-up switches CI to `superman gate ci`. Until then the M1 `ci.yml` calls `archgate check` directly and the rule passes because no workflow runs `superman gate` yet.

## References

- docs/adr/0010-affected-analysis-and-change-aware-ci.md
- docs/adr/0011-remote-gate-cache-security.md
- spec §5.4, §8, §17, Amendment 3
