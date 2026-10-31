# 09: Overlay skills `ship` and `adr-rule`

**Milestone:** M10

**What to build:** `ship` follows spec §6.1: doctor, verified eligible ticket, atomic shared claim, worktree, local red→implement→green cycle, green commits and uncached CI behavior replay, then identity-bound `pr open`. Carry `Status: resolved` in the PR but treat it as completion only after merge; release the claim after verified merge. Keep Summary/Evidence/Merge Danger/Rule conflict and the three-failure stop. `adr-rule` uses configured local why-ADR paths and proves its rule with fixtures. Both skills remain user-invoked and canonical under root `skills/`.

**Blocked by:** 08, 07, 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-overlay-catalog`: adds the `superman` entry (relative source `./`) to `.claude-plugin/marketplace.json` and the overlay hashes to `superman.lock.json`.

- [ ] `ship` is ≤150 lines and `adr-rule` ≤80 lines; SUP-004 passes on them and fails on a fixture with 151 lines or a missing `disable-model-invocation`.
- [ ] The workflow never requests a red commit, hook bypass, direct main status write or agent approval/merge; failure/conflict keeps the claim visible until explicit recovery.

Start by walking the outline against a claimed ticket fixture and a normal green-only TDD history.
- [ ] Both skills reference Pocock skills by their installed names and never copy Pocock text.
- [ ] The next ticket after this one is shipped end-to-end through `ship` and merged via `merge-ready` (evidence linked in that PR).
- [ ] **(M1 amendment 4)** Preserve the later M7c handoff slot: ticket 29 adds draft-PR identity→wiki-ingest→final pre-pr/review inside the same ≤150-line ship budget; until activation report wiki ingestion as not installed, not completed. No placeholder wiki skill implementation in this ticket.
- [ ] `adr-rule` on a sample decision produces a rule whose fixture fails before and passes after (shown in the PR).
