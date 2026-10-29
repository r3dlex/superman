# 08: Pinned Pocock install, skill lock and `superman next`

**Milestone:** M9

**What to build:** Agents get Pocock's 12 flow skills unmodified from the `r3dlex/superman` catalog at SHA `59db609` (or a newer SHA André picks) through a `git-subdir` + `sha` entry, without `implement-spec`. `superman skills sync` writes the project's harness config and per-file sha256 values into `superman.lock.json`; `skills lock --pocock <sha>` bumps the pin; `skills verify` warns locally on drift and fails in CI (G7) when the lock, catalog SHA and config skill list disagree. `superman next` lists unblocked, unclaimed tickets from `.scratch/<slug>/issues/`.

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-skills-pin`: adds the `pocock` entry to `.claude-plugin/marketplace.json`, `superman.lock.json` hashes and `.claude/settings.json` (`extraKnownMarketplaces`, enabled plugins).

- [ ] The installed set has exactly the 12 configured skills and excludes `implement-spec` (VERIFY in §5.6 resolved and recorded).
- [ ] `skills verify` warns on a 1-byte edit in the plugin cache and exits 0 locally; in CI mode a lock/catalog mismatch exits 1.
- [ ] `pocock:` prefixed handoffs between Pocock skills resolve (VERIFY resolved and recorded).
- [ ] `superman next` on this repo's `.scratch/superman-v0/issues/` lists exactly the tickets whose blockers are done and whose status is `ready-for-agent`.
- [ ] No skill file is ever edited by superman (test asserts files are byte-identical after sync).
