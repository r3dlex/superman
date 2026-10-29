---
Status: accepted
---

# A human approves the exact head SHA; agents author, never approve or merge

Across 269 merged PRs in André's repos there were 0 real approvals: the author, approver and merger were the same account, so the human gate existed only on paper. We decided that every merge to `main` needs an APPROVED review by an approver (`identity.approvers`, today `br4vesirrobin`) on the exact head SHA with CI green on that SHA, that the PR author is always a separate agent identity, and that only the approver merges. The control is identity and repository permissions, not prose in a skill: `superman doctor` refuses to run as an approver, `merge-ready` re-checks the approval and checks on the head SHA, and `audit` flags any merge that breaks the rule.

The agent identity has two supported modes, selected by `identity.agent.mode` with no code change:

- `app` (v0 default): a GitHub App installation token, branches pushed to the upstream repo (see ADR 0005).
- `machine-user`: a separate account with Read access that opens PRs from its own fork, so it cannot merge at all.

## Considered Options

- Same account authors and approves (status quo): rejected, it produced 0/269 real approvals.
- Agent-self approval mode, or standing "override and do not stop" waivers: rejected, see ADR 0004.
- Auto-merge by superman after the re-check (`superman merge`): out of v0, because it needs a write token in agent hands.

## Consequences

- André does one review and one merge per PR. That cost is the point, and `audit` measures it (spec §13).
- In `app` mode the App could technically press merge after an approval. This is accepted for v0 and detected by `audit` (merge actor must be an approver); `machine-user` mode removes the possibility.
- If agents share André's OS session they can reach his credentials. v0 accepts this residual risk with a separate `GH_CONFIG_DIR`/`GH_TOKEN` and `doctor` checks; a container or VM is the planned hardening.
