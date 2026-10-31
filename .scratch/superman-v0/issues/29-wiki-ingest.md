# 29: wiki-ingest and the ship handoff

**Milestone:** M7c, IN v0 **(M1 amendment 4)**

**What to build:** Canonical ≤100-line `wiki-ingest` in Pocock's format, explicitly called by ≤150-line ship after each ticket (spec §6.1/§6.4). Candidate-first promotion, provenance, exact links/index and a verified PR log stay in that ticket PR; open a draft first if necessary. Judgment is skill text, deterministic checks remain the CLI.

**Blocked by:** 28, 09, spec/superman-v0-wiki-gate

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-wiki-skills` updates catalog/lock and activates the draft-first handoff; one shared skill tree, no Pocock edits.

- [ ] Frontmatter sets name/description/disable-model-invocation: true; five-name SUP-004 individual/total budgets pass and an over-budget fixture fails.
- [ ] A ticket walkthrough writes a candidate before promotion, retains source/ticket provenance in the wiki, updates index/log and removes the promoted candidate; unresolved candidates stay explicitly pending. No duplicate memory body or second publication PR.
- [ ] No useful memory yields a considered no-promotion log outcome, not fabricated content. Stale/conflicting sources are rechecked/reported; raw/policy/secrets/personal data remain off-limits.
- [ ] Ship uses the same draft PR number, runs G12/final pre-pr before review and pushes the final head under verified bot authority; no future merge identities, approval, merge or direct main write.
- [ ] Packed/harness smoke fixtures resolve the installed skill handoff; no assumption that user-only skills auto-trigger.

Start with a draft ticket PR containing one promotable and one unresolved candidate, then a no-promotion case.
