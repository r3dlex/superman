---
Status: accepted
---

# Two ADR tiers: "why" ADRs in docs/adr, enforced rules in .archgate/adrs

Pocock's `domain-modeling` writes short "why" ADRs to `docs/adr/`, while Archgate needs frontmatter ADRs with companion `.rules.ts` files under `.archgate/adrs/`; one format cannot serve both, and a frontmatter-less Pocock ADR inside `.archgate/adrs/` fails `archgate check --strict` as unparsed. We keep both tiers and link them: every Archgate ADR's body starts with `Source: docs/adr/NNNN-slug.md`, and the meta-rule GEN-001 fails when that line is missing or points to a file that does not exist. A decision that cannot be checked mechanically stays only in `docs/adr/`, and its Consequences say "not enforceable".

## Considered Options

- Archgate ADRs only: rejected, it drops Pocock's format and the skills that read it.
- `docs/adr/` only, with prose enforcement: rejected, that is what lx has today ("Archgate is a name, not an enforcer").

## Consequences

- Both tiers are protected paths and change only in spec-kind (Gate 1) PRs.
- Repos that keep a different "why" directory (lx: `docs/architecture/adr`) set `paths.whyAdrs`; the GEN-001 template superman renders uses that path.
