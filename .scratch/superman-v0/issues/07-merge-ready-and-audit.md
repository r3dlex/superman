# 07: `superman merge-ready` and `superman audit`

**Milestone:** M8

**What to build:** Re-derive the §9.2 forge checklist: exact-head approval, expected agent author/repo/branch, mandatory workflow/job/App evidence for the tested H/B/M integration, fresh current base, mergeability and effective policy compliance. Optional drift checks stay optional. Print the head-matched squash command but do not claim that flag pins the base; public strict host protection is separate, private lx best-effort limitations remain explicit. Audit maps final squash commits to reviewed head/tested merge evidence rather than equating their SHAs, flags non-approver merges/direct pushes, and supplies ticket 23's incident inputs. This runs the PR-owned checker; it is not an independent evaluator (ADR 0001).

**Blocked by:** 03

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture tests with a fake `gh` cover each §9.2 condition failing alone.
- [ ] A push after approval (head SHA differs from the review's `commit_id`) fails.
- [ ] An empty set of check runs fails.
- [ ] Fixtures reject stale base, unrelated merge SHA, wrong workflow/App producer, missing required job and mismatched run/artifact attempt, while a non-required drift failure does not become a blocker.
- [ ] The printed command pins H only; public strict-up-to-date settings and private best-effort limits are represented accurately in evidence.
- [ ] `audit` flags a fixture merge done by the App after approval and a direct push to `main`.
- [ ] The first real ticket PR after this one is merged through `merge-ready`.

Start with a passing head approval paired with a stale or unrelated tested merge; admission must fail.
