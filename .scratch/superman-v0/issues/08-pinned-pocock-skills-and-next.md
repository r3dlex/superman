# 08: Pinned Pocock install, skill lock and `superman next`

**Milestone:** M9

**What to build:** Agents get Pocock's 12 flow skills unmodified from the `r3dlex/superman` catalog at unchanged SHA `59db609eb1e18aaf59b63284d0e52255aff0c63c` through a `git-subdir` + `sha` entry, without `implement-spec`. `superman skills sync` writes the project's harness config and per-file sha256 values into `superman.lock.json`; `skills lock --pocock <sha>` supports a future separately reviewed pin change, not a Deno-migration bump. `skills verify` warns locally on drift and fails in CI (G7) when lock/catalog/list disagree. `superman next` lists unblocked, unclaimed tickets from `.scratch/<slug>/issues/`.

**Blocked by:** 03

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-skills-pin`: adds the `pocock` entry to `.claude-plugin/marketplace.json`, `superman.lock.json` hashes and `.claude/settings.json` (`extraKnownMarketplaces`, enabled plugins).

`next` reads merged-base completion and excludes clone-wide claims/existing ticket PRs. `superman claim <ticket> [--release|--reclaim]` atomically reserves one worker in the common Git metadata directory across worktrees; it is not a local Status edit. Explicit release/recovery is required, and independent clones are outside the atomic guarantee. Numeric ticket blockers and named activation follow-ups must be verified; unknown prerequisites are not eligible (spec §5.2, §6.1, §17).

- [ ] The installed set has exactly the 12 configured skills and excludes `implement-spec` (VERIFY in §5.6 resolved and recorded).
- [ ] `skills verify` warns on a 1-byte edit in the plugin cache and exits 0 locally; in CI mode a lock/catalog mismatch exits 1.
- [ ] Standalone local drift warnings are not full-gate exemptions: full pre-PR/CI applies the same required lock/catalog/list integrity checks under §5.4/§8.5. Preserve the upstream pin, unmodified skill files and existing distinction between a local warning and a full quality verdict.
- [ ] `pocock:` prefixed handoffs between Pocock skills resolve (VERIFY resolved and recorded).
- [ ] `next` lists only merged-base ready tickets with verified blockers, no shared claim and no conflicting ticket PR; a dirty/unmerged `Status: resolved` cannot unblock dependents.
- [ ] No skill file is ever edited by superman (test asserts files are byte-identical after sync).
- [ ] Lock updates preserve actual runtime/tool/profile identities (§5.10) and the one canonical release-tree skill hashes. A planning-complete spec or existing ready label does not satisfy Gate 1/named activation blockers; unknown evidence remains ineligible.
- [ ] Two concurrent process fixtures attempting one claim yield exactly one winner across worktrees, including a worktree with a `.git` file; live claims cannot be silently stolen and stale recovery is explicit.
- [ ] **(2026-11-08)** This PR replaces every today-step that `superman skills lock`, `superman next` and `superman claim` take over in [WORKFLOW.md](../../../WORKFLOW.md#the-three-flows)'s three flows. Once every step of a flow runs through superman, that flow's superman diagram becomes the flow and today's is deleted.

Start with competing claim processes sharing one clone's Git common directory.
