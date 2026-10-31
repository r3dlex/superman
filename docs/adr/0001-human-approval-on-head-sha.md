---
Status: accepted
---

# A human approves the exact head SHA; agents author, never approve or merge

Across 269 merged PRs in André's repos there were 0 real approvals: the author, approver and merger were the same account, so the human gate existed only on paper. Every merge to `main` requires an APPROVED review by an approver (`identity.approvers`, today `br4vesirrobin`) on the exact PR head, a separate agent author, and an approver merge actor. As agreed on 2026-10-30, CI tests the integration result: receipts bind the reviewed head, tested base and tested merge commit rather than claiming they are one SHA. The forge admission checklist lives in spec §9.2.

Public Superman uses strict up-to-date protection, because `gh pr merge --match-head-commit` guards only the head, not a race with base advancement. A rebase changes the head and requires fresh approval and checks. Private legiox-workspace retains the accepted best-effort `merge-ready` plus audit posture without paid host protection.

The agent identity has two supported modes, selected by `identity.agent.mode` with no code change:

- `app` (v0 default): a GitHub App installation token, branches pushed to the upstream repo (see ADR 0005).
- `machine-user`: a separate account with Read access that opens PRs from its own fork, so it cannot merge at all.

## Considered Options

- Same account authors and approves (status quo): rejected, it produced 0/269 real approvals.
- Agent-self approval mode, or standing "override and do not stop" waivers: rejected, see ADR 0004.
- Auto-merge by superman after the re-check (`superman merge`): out of v0, because it needs a write token in agent hands.
- A checker pinned independently of the candidate PR: declined on 2026-10-30. v0 runs the PR-owned checker; tests and André's review are the trust boundary for changes to that checker. Protected configuration does not make its implementation incapable of certifying itself.

## Consequences

- André does one review and one merge per PR. That cost is the point, and `audit` measures it (spec §13).
- `doctor` is agent preflight, not a prohibition on the approver running read-only `merge-ready`. Before that command exists, bootstrap merges use the reviewed forge-check procedure from spec §17.
- On protected public Superman the App could press merge after approval; audit detects that accepted v0 limitation. Without host protection a contents-write App need not even wait for approval and can also push directly, whereas Read/fork machine-user mode removes that capability. Private lx's adoption must document its actual identity permissions, not inherit an inaccurate Read-only claim for an App.
- If agents share André's OS session they can reach his credentials. v0 accepts this residual risk with a separate `GH_CONFIG_DIR`/`GH_TOKEN` and `doctor` checks; a container or VM is the planned hardening.

Sources for the SHA distinction: [PR events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request), [head matching](https://cli.github.com/manual/gh_pr_merge), and [strict required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging).
