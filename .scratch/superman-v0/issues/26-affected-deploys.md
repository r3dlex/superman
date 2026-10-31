# 26: Affected deploys

**Milestone:** post-v0 **(M1 amendment 3)**

**What to build:** Design only in v0 (§5.7, question 20). `affected.deploy` maps a deployable target to `{ build, deploy, environment }` argv. On `main`, `superman deploy --affected` computes the change model between the last successful deployment's SHA (from the forge's deployments API) and the head, builds and deploys only the affected deployable targets in dependency order, and writes a receipt; any force-full trigger deploys everything. Deploy jobs run only in a protected GitHub Environment on `main`, never on PR events.

**Blocked by:** 24

**Status:** post-v0

**Kind:** behavior

**Protected-path follow-up:** The deploy workflow, when built.

- [ ] A fixture with two deployable targets where one changed since the last deployment SHA deploys only that one (test-first, fake deploy argv).
- [ ] No last-deployment SHA (first deploy) deploys everything.
- [ ] A `pull_request` event refuses to run `deploy` (exit 2).
