---
Status: accepted
---

# No waivers: a gate changes only through a reviewed spec PR

lx contained standing "override and do not stop" merge-authority waivers and an `agent-self` approval mode, which turned every gate into a suggestion. We decided there is no waiver mechanism: a gate, rule, threshold, protected path or ticket `Kind:` changes only in a spec-kind (Gate 1) PR that André reviews, and ticket PRs may not touch protected paths or lower a ratchet (G4). A disabled gate reports `n/a`, never `pass`, and an agent that thinks a rule is wrong stops and writes a "Rule conflict" section in its PR instead of editing the rule.

## Consequences

- Archgate 0.61.0 supports inline `archgate-ignore <ADR>/<rule> <reason>` comments, and they still suppress a violation under `--strict`. That is a waiver path inside a ticket PR. Recommended follow-up for André to decide at Gate 1: a rule (proposed SUP-005) that reports any `archgate-ignore` directive outside `.archgate/fixtures/`, so suppressions also need a spec PR.
- Platform gaps are reported, not waived: on linux-arm64 G1 prints `n/a (enforced on linux-x64 leg)` while the linux-x64 leg stays required.
- Work that needs a protected-path change (CI workflows, lock, `.claude/settings.json`) is split into a ticket PR plus a spec-kind follow-up PR, which costs André one more review.
