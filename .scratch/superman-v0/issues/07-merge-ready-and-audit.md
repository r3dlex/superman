# 07: `superman merge-ready` and `superman audit`

**Milestone:** M8

**What to build:** André runs `superman merge-ready <pr>` and it re-derives everything from the forge (§9.2): the author is the agent identity and not an approver, the head branch and repo match the mode, the latest approver review is APPROVED on the current head SHA with no CHANGES_REQUESTED, every check run and status on that SHA succeeded and the configured required jobs are present, the PR kind's path policy holds on the files list from `gh api`, the base is `main` and the PR is mergeable. On success it writes a receipt and prints `gh pr merge <pr> --squash --match-head-commit <sha>`; on failure one line per failed condition. `superman audit` lists merged PRs on `main` without a valid approval, merges whose actor is not an approver (including the App), and direct pushes.

**Blocked by:** 03

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture tests with a fake `gh` cover each §9.2 condition failing alone.
- [ ] A push after approval (head SHA differs from the review's `commit_id`) fails.
- [ ] An empty set of check runs fails.
- [ ] The printed merge command is pinned to the head SHA (`--match-head-commit` behaviour on current `gh` checked; VERIFY result recorded).
- [ ] `audit` flags a fixture merge done by the App after approval and a direct push to `main`.
- [ ] The first real ticket PR after this one is merged through `merge-ready`.
