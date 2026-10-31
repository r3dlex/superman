---
id: SUP-004
title: Overlay skills stay within their line budgets
domain: superman
rules: true
files: ["skills/*/SKILL.md"]
---

Source: docs/adr/0007-overlay-context-budget.md

## Context

Skill text is context the agent pays for, and overlapping skills clash. M1 amendment 4 explicitly allows five user-invoked names to cover reviewed memory promotion and nightly wiki maintenance, with fixed budgets.

## Decision

Only `ship` (≤150 lines), `adr-rule` (≤80), optional `plan-critic` (≤60), `wiki-ingest` (≤100) and `wiki-lint` (≤80) may exist under `skills/`, ≤470 lines total, each with `disable-model-invocation: true`.

## Do's and Don'ts

- Do move detail into the CLI or into files the skill reads on demand.
- Do keep each skill's frontmatter `disable-model-invocation: true`.
- Don't add a sixth overlay name without a spec PR naming an observed unmet failure.
- Don't raise a budget to make a skill fit.

## Consequences

### Positive

- Supported harnesses do not preload the overlay bodies; the ≤25-line AGENTS block remains the always-loaded text. Other harness behavior is verified in ticket 10.

### Negative

- Some guidance moves out of the skill into the CLI or docs.

### Risks

- Line counts do not measure quality; Gate 2 review still applies.

## Compliance and Enforcement

Rule `skill-budget` inventories all `skills/*/SKILL.md`, even during changed-file checks, and checks names, individual/total lines and the flag. **No-op until M10 (ticket 09):** absent skills produce no findings, not evidence that future skill contents passed. M7c tickets 29–30 add the two knowledge skills.

## References

- docs/adr/0007-overlay-context-budget.md
- spec §5.6, §6, §13
