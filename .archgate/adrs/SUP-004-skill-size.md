---
id: SUP-004
title: Overlay skills stay within their line budgets
domain: superman
rules: true
files: ["skills/*/SKILL.md"]
---

Source: docs/adr/0007-overlay-context-budget.md

## Context

Skill text is context the agent pays for, and overlapping skills clash. The overlay is capped at three user-invoked skills with fixed line budgets.

## Decision

Only `ship` (≤150 lines), `adr-rule` (≤80) and `plan-critic` (≤60) may exist under `skills/`, their total stays ≤290 lines, and each sets `disable-model-invocation: true` in its frontmatter.

## Do's and Don'ts

- Do move detail into the CLI or into files the skill reads on demand.
- Do keep each skill's frontmatter `disable-model-invocation: true`.
- Don't add a fourth overlay skill without a spec PR that names the observed failure.
- Don't raise a budget to make a skill fit.

## Consequences

### Positive

- The overlay costs 0 baseline tokens and stays readable in one sitting.

### Negative

- Some guidance moves out of the skill into the CLI or docs.

### Risks

- Line counts do not measure quality; Gate 2 review still applies.

## Compliance and Enforcement

Rule `skill-budget` counts lines per scoped `skills/*/SKILL.md` and checks names, the total and the frontmatter flag. **No-op until M10 (ticket 09) adds `skills/`:** with no matching files the rule passes without checking anything. Note that with `--base` only changed skills are scoped, so the total is exact only on a full run.

## References

- docs/adr/0007-overlay-context-budget.md
- spec §5.6, §6, §13
