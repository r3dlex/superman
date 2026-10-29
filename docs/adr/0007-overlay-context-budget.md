---
Status: accepted
---

# The overlay stays at three small, user-invoked skills

Loaded modules of the old tooling cost about 30k tokens, and skill clash grows with every overlapping skill. The overlay is capped at `ship` (≤150 lines), `adr-rule` (≤80) and the optional `plan-critic` (≤60), all with `disable-model-invocation: true` so they cost 0 baseline tokens; none reuses a Pocock skill name or job; and the only always-loaded superman text is a ≤25-line AGENTS.md block. A fourth overlay skill needs an observed failure that Pocock's skills cannot cover, argued in a spec PR.

## Consequences

- Enforced by SUP-004 (line budgets, the three allowed names, `disable-model-invocation: true`).
- Exceeding a budget is a kill-or-redesign trigger in spec §13, not a reason to raise the number.
