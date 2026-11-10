---
id: GEN-001
title: Every Archgate ADR links an existing docs/adr decision
domain: general
rules: true
files: [".archgate/adrs/*.md"]
---

Source: docs/adr/0002-two-adr-tiers.md

## Context

superman keeps two ADR tiers: short Pocock "why" ADRs in `docs/adr/` and enforced Archgate ADRs with `.rules.ts` here. Without a link, a rule can outlive or drift from the decision that justified it.

## Decision

The first non-empty line of every Archgate ADR body is `Source: docs/adr/NNNN-slug.md`, and that file exists in the repository.

## Do's and Don'ts

- Do write the `Source:` line directly under the frontmatter.
- Do create the `docs/adr/` decision first (Pocock `domain-modeling`), then derive the rule (overlay `adr-rule`).
- Don't point several unrelated rules at a decision that does not mention them.
- Don't leave the line out for "obvious" rules.

## Consequences

### Positive

- Every enforced rule is traceable to a reviewed decision.

### Negative

- One more line per ADR.

### Risks

- The link proves existence, not relevance; Gate 1 review covers relevance.

## Compliance and Enforcement

Rule `source-link` reads each scoped ADR and reports a missing, malformed or dangling `Source:` line. It always has files to check (this ADR included), so it is active from M1.

## References

- docs/adr/0002-two-adr-tiers.md
- spec §10, §11.1 (GEN-001)
