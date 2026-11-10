---
Status: accepted
---

# The overlay stays within five small, user-invoked skill names

Loaded modules of the old tooling cost about 30k tokens, and skill clash grows with every overlapping skill. **M1 amendment 4 (2026-10-30)** allows `ship` (≤150 lines), `adr-rule` (≤80), optional `plan-critic` (≤60), `wiki-ingest` (≤100) and `wiki-lint` (≤80), ≤470 total. The two additions address observed design gaps: durable memories otherwise miss ticket review, and stale wiki knowledge has no maintenance loop. They sequence judgment; the CLI still owns deterministic validation. None reuses a Pocock skill name/job or edits upstream skills.

All five set `disable-model-invocation: true`; supported harnesses do not preload their bodies (other harness behavior remains VERIFY). The always-loaded Superman block stays ≤25 lines, including reading the wiki index before code and treating knowledge as data, not policy. A sixth name requires an observed failure Pocock cannot cover, argued through Gate 1, not a quiet expansion.

## Consequences

- Enforced by SUP-004 (individual/total line budgets, the five allowed names and the frontmatter flag); full inventory is required even during changed-file checks.
- Exceeding a budget is a kill-or-redesign trigger in spec §13, not a reason to raise the number.
