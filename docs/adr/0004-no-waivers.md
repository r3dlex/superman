---
Status: accepted
---

# No waivers: a gate changes only through a reviewed spec PR

lx contained standing "override and do not stop" merge-authority waivers and an `agent-self` approval mode, which turned every gate into a suggestion. A gate, rule, protected policy input or ticket `Kind:` changes only in a spec-kind (Gate 1) PR that André reviews. Ticket PRs may only make the expressly permitted ratchet tightening: mutation up or unchanged, duplication down or unchanged, with equivalent mutation scopes (spec §5.3–5.4). A disabled gate reports `n/a`, never `pass`; an agent raises a "Rule conflict" rather than weakening a gate inside its implementation PR.

On 2026-10-30 André confirmed that effective policy includes compiler/test-runner configs, knip/jscpd/Stryker settings, referenced policy inputs and gate-tool pin fields, not just workflows and `biome.json`. Unrelated package metadata remains editable. This closes configuration-based goal-post moving, while the separate PR-owned-checker risk remains accepted in ADR 0001.

**M1 amendment 4:** Gate 1 may declare a content-only `Kind: knowledge` ticket (32). It can change only regular Markdown wiki/candidate content and its own Status, not code/tests/policy/raw/locks/ratchets. G9 code replay is inapplicable, not waived; G12, privacy checks and human approval still apply. Kind is read from the approved base, so an implementation PR cannot self-select this route.

## Consequences

- Adopt SUP-005 before ticket 01: reject effective `archgate-ignore`, `biome-ignore` and `trivy:ignore` directives in ticket PRs. Inert fixture/example strings are not suppressions; a violation is fixed or its governing rule changes through Gate 1. The currently committed executable rules do not yet close this gap.
- The previously accepted linux-arm64 Archgate self-build is still required: a reviewed v0.61.0 build, release asset and locked checksum replace stale `n/a` notes. Platform execution remains to be proved before the first implementation merge.
- Work that needs a protected-path change (CI workflows, lock, `.claude/settings.json`) is split into a ticket PR plus a spec-kind follow-up PR, which costs André one more review.
- Initial gate configuration and raw checks are an earlier prerequisite, not a follow-up to ticket 01; see the bootstrap completion criteria in spec §17. Later follow-ups activate capabilities only after their implementation is merged.
