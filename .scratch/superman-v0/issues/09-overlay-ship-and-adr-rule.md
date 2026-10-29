# 09: Overlay skills `ship` and `adr-rule`

**Milestone:** M10

**What to build:** An agent invokes `ship` on a ticket and is walked from `superman doctor` through a ticket branch, the Pocock `tdd` loop (red test commit first), the gates and an open PR with Summary / Evidence / Merge Danger and a "Rule conflict" section, stopping after three identical gate failures. `adr-rule` turns an accepted `docs/adr` decision into an Archgate ADR plus rule with a failing fixture. Both are user-invoked only (`disable-model-invocation: true`) and live once in the root skill tree (§12.1).

**Blocked by:** 08, 07, 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-overlay-catalog`: adds the `superman` entry (relative source `./`) to `.claude-plugin/marketplace.json` and the overlay hashes to `superman.lock.json`.

- [ ] `ship` is ≤150 lines and `adr-rule` ≤80 lines; SUP-004 passes on them and fails on a fixture with 151 lines or a missing `disable-model-invocation`.
- [ ] Both skills reference Pocock skills by their installed names and never copy Pocock text.
- [ ] The next ticket after this one is shipped end-to-end through `ship` and merged via `merge-ready` (evidence linked in that PR).
- [ ] `adr-rule` on a sample decision produces a rule whose fixture fails before and passes after (shown in the PR).
