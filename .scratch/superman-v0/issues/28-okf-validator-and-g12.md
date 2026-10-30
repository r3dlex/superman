# 28: General OKF validator and blocking G12

**Milestone:** M7c, IN v0 **(M1 amendment 4)**

**What to build:** Dependency-free built-in `superman wiki check` and G12 under spec §5.8, through the CLI process/receipt seam (§16). Implement general YAML and broader Markdown parsing, not the rejected restricted subset. Validate the pinned OKF shapes/timestamp amendment and explicit Superman link/index/log/budget profile; preserve unknown OKF keys/types. Reuse ticket 13's model for impact, not CodeGraph or a second test-selection graph.

**Blocked by:** 27, 13, spec/superman-v0-vault

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-wiki-gate` activates fresh blocking G12/required checks on all PR kinds with its own verified PR log entry. Before activation provide conformance/adversarial evidence for the whole general-parser contract; no partial parser is promoted to ready.

- [ ] General YAML fixtures cover quoted/flow/block/nested syntax, multiline scalars, comments, tags as safe data and aliases/anchors. Unknown keys/types pass; duplicate/ambiguous keys, cyclic/explosive aliases and executable tags cannot silently parse/execute. No dependency, parser vendoring, regex-only or subset compliance claim.
- [ ] Markdown fixtures cover inline/reference/image links, escapes, nested labels, heading/duplicate/Unicode fragments and code spans/fences/indented examples; wikilinks use exact root IDs, optional extension/alias/fragment and no basename search.
- [ ] ISO timestamp fixtures include explicit Z/offset/fraction and real-date validation for every optional timestamp family, single/list verified forms and usage overrides. Date-only timestamps fail, optional omission passes, log headings stay dates. Expired stale_after warns against an injected clock; it never silently renews.
- [ ] Broken internal targets/fragments, path escapes/collisions/symlinks, incomplete index, malformed reserved files and byte overflows fail with bounded location/fix output. External URL availability is not a network gate. Indexed log archives remain valid concepts within page budgets.
- [ ] Every PR kind requires a newly prepared entry for its forge-verified PR number; old entries/fake future merge metadata do not satisfy it. Pre-commit needs no number; release/main contexts do not invent a new PR. No-promotion outcomes are legitimate.
- [ ] Every run inventories/indexes/checks budgets; changed content plus inbound/fragment dependents is validated using base/head for renames/deletions. Unknown history/impact/policy forces full; code-only changes still check the current PR log. Nightly is uncached full, and no gate-result cache supplies G12.
- [ ] Receipt records pins/profile/policy, clock, PR identity, actual scan/closure/fallback/warnings/failures. Full and affected fixtures produce equivalent failure outcomes; CLI exits 0/1/2 as declared.

Start with a valid nontrivial YAML alias/Markdown-reference page and an unchanged page whose target heading was renamed; the latter must fail even in affected mode.
