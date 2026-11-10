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
- [ ] Consume the already-proved §5.4 mutation-audit contract through public merge-ready fixtures: unresolved critical findings block affected source work (all source work if attribution is unbounded), and fourteen days without accepted required broad evidence blocks source merges. Before first acceptance the clock starts at activation; failed/partial/unrelated runs do not reset it. Recovery requires fresh complete accepted evidence and resolved critical findings. Preserve owned findings/two-working-day triage and reject missing or failed canonical delegation; ticket 23's later optimization-safety ledger is a separate contract.
- [ ] Under §5.5/§8, reject unapproved/mismatched existing self-hosted profiles, forged environment-only identities, hosted substitutions and skipped/neutral/cancelled required work hidden by another success. Verify actual native-platform/tool/environment/access identities and complete quality accounting against protected policy and forge/operator evidence; labels alone prove none of them. Historical receipts remain historical. No new VM/App/independent-publisher prerequisite is introduced.
- [ ] Required §5.10 actual-runtime/config/permission/source-or-compiled evidence is validated independently of Node-compatible labels and candidate assertions; missing/mismatched identities block. Runtime grants cannot establish credential separation, exact-head approval or a sandbox. Historical Node evidence, including the bounded SUP-005 fixture result, cannot become Deno/native-matrix admission proof.
- [ ] The printed command pins H only; public strict-up-to-date settings and private best-effort limits are represented accurately in evidence.
- [ ] `audit` flags a fixture merge done by the App after approval and a direct push to `main`.
- [ ] The first real ticket PR after this one is merged through `merge-ready`.
- [ ] **(2026-11-08)** This PR replaces every today-step that `superman merge-ready` takes over in [WORKFLOW.md](../../../WORKFLOW.md#the-three-flows)'s three flows. Once every step of a flow runs through superman, that flow's superman diagram becomes the flow and today's is deleted.

Start with a passing head approval paired with a stale or unrelated tested merge; admission must fail.
