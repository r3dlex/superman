# Matt Pocock skills — Deno amendment planning

Observed **2026-11-01**; upstream HEAD independently rechecked unchanged at **06:30:56Z**. Investigation only: anonymous first-party source/metadata reads; no workflows invoked, Deno execution, implementation, credentials, hosted writes, commits or pushes. This note is not approval or ticket admission.

## Recommendation, not execution

Keep the bounded main flow, but make amendment/review scope explicit:

**`grill-with-docs` → `to-spec` (amend existing) → `to-tickets` (only the approved backlog delta) → scoped amendment review → André's Gate 1 approval/merge.**

This follows Matt's own router, not a secondary interpretation. `ask-matt` is the right **optional routing entrypoint**, not another necessary planning phase. `wayfinder` is not a better default for this bounded amendment. `code-review` is useful supporting review only with an explicit comparison scope; its defaults miss uncommitted changes. None of these steps admits ticket 01. [Sources: router][ask], [review][review], [Superman spec §§5.4, 5.6, 17](spec.md).

Names here identify upstream skills, **not verified OpenCode invocation/discovery syntax**. The spec's selected 12 include the core interview/spec/ticket/review skills, but not `ask-matt`, `wayfinder`, `research`, `prototype` or `codebase-design`; global availability does not establish approved project delivery. Consulting those upstream definitions does not authorize adding them to the selected set. [Local source: spec §§5.3, 5.6](spec.md).

## Version and installation evidence

| Identity | Finding |
| --- | --- |
| Superman's **declared pin** | **`59db609eb1e18aaf59b63284d0e52255aff0c63c`**, committed **2026-10-27T07:44:12Z**. Declaration is in spec §§5.3/5.6, not proof of an installed lock. [Commit][pin] |
| **Current upstream HEAD snapshot** | **`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`**, committed **2026-10-31T14:23:30Z**; **5 commits ahead**, none behind. “Latest” below means this commit, not an asserted release version. [Commit][head], [complete comparison][delta] |
| Installed bytes | Parent session supplied SHA-256 observations for `/Users/andreburgstahler/.config/opencode/skills/<id>/SKILL.md`. I did **not** inspect those local bodies; I independently hashed raw upstream files and compared with the supplied values. This is corroboration of the parent's observations, not independent local inspection. |
| Loaded/approved identity | **Unverified here.** Matching one body does not establish its installation provenance, all companion files, harness resolution, a project lock or authorization. |

The parent-reported hashes for **`grilling`, `code-review`, `implement-spec` match HEAD, not the pin**. Full byte-hash comparisons were used; prefixes are shown for compactness:

| Body | Pin SHA-256 prefix | HEAD / parent-reported prefix |
| --- | --- | --- |
| `grilling` | `befdff1e27a1` | `a146842ed93c` |
| `code-review` | `09eb147f793e` | `9c921a8d8813` |
| `implement-spec` | `7a22dd2e60b8` | `1993a473cec4` |

Sources: pinned [grilling][grilling], [code-review][review], [implement-spec][implement-spec]; HEAD [grilling][head-grilling], [code-review][head-review], [implement-spec][head-implement-spec]. The other five supplied hashes—`ask-matt`, `grill-with-docs`, `to-spec`, `to-tickets`, `implement`—match the pin's bytes, which are unchanged at HEAD. [Sources][ask]: [wrapper][grill-docs], [spec][to-spec], [tickets][tickets], [implement][implement], [revision comparison][delta]. This does **not** establish that the whole installation is at either commit.

**Relevant upstream changes:** commit [`7739eae…`][fresh] adds fresh-context instructions to subagents in `grilling`, `research`, `wayfinder`, `code-review`, the architecture survey and design-it-twice; [`a496f55…`][fresh-implementer] requires a fresh implementer per ticket in `implement-spec`. The router, interview wrappers, `to-spec`, `to-tickets`, `prototype` and `implement` bodies are unchanged. These changes do not remove publication/commit/integration defaults or make `implement-spec` compatible with Superman. No pin update is recommended by this investigation. [Complete delta][delta].

## Upstream facts that affect the choice

| Skill(s) | First-party behavior and consequential default |
| --- | --- |
| **`ask-matt`** | Explicit router over this repository's skills. Recommends `grill-with-docs` for repo work, then `to-spec`/`to-tickets` for multi-session builds. Keep interview → spec → tickets in the same context where practical. It offers per-ticket `implement` **or** `implement-spec`; Superman's policy must reject the latter branch. [Source][ask] |
| **`grill-with-docs` / `grill-me` / `grilling`** | First wrapper loads **grilling + domain-modeling**; second loads **only grilling**. They are not three successive interview phases. Grilling asks the current decision frontier in rounds, waits for the human, delegates fact-finding, and forbids acting before shared understanding is confirmed. Domain-modeling updates the glossary **inline** and offers qualifying ADRs: the docs wrapper is not read-only. [Wrapper][grill-docs], [grill-me][grill-me], [primitive][grilling], [domain writes][domain] |
| **`to-spec`** | Synthesis, **not an interview**. It still checks proposed test seams with the human. It then **publishes** and applies **`ready-for-agent`**. Its template discourages specific paths/snippets; blindly re-templating Superman would also discard intentional stable cross-references. [Source][to-spec]; existing numbering/seams: [spec introduction/§16](spec.md). |
| **`to-tickets`** | Quizzes the human and waits for breakdown approval before publication. Local output starts at **`01`** and each template says **`Status: ready-for-agent`**. It says not to modify/close the parent issue. Its wide-refactor exception allows expand–contract, even a shared integration branch when batches cannot stay green; that is not permission to bypass Superman's per-ticket gates. [Source][tickets] |
| **Tracker / setup** | “Publish” is tracker-dependent, **not inherently a GitHub write**. The local adapter means new files under `.scratch/<feature>/`; it is creation-oriented, not an existing-backlog reconciliation algorithm. Setup proposes GitHub for GitHub remotes, writes agent docs, and can create hosted labels when triage setup applies. Do not run setup merely because planner configuration is absent: supply Superman's explicit local convention and stop if the skill cannot honor it. [Local adapter][local], [setup][setup]; setup remains in blocked [ticket 01](issues/01-skeleton-and-raw-gates.md). |
| **`code-review`** | Two independent Standards/Spec subagents; requires a resolvable fixed point and nonempty **`git diff <fixed-point>...HEAD`**. That default excludes staged/unstaged edits and is a code-versus-spec review, not inherently a design-quality review of the spec itself. It does not itself instruct commits or merges. [Source][review] |
| **`wayfinder`** | For huge, foggy efforts beyond one session; Matt explicitly says **never a well-scoped feature**. Defaults to decisions, not deliverables, and uses `wayfinder:` rather than `ready-for-agent` labels. Nevertheless it creates/claims/resolves tracker artifacts, can update/delete tickets, includes executable task tickets, and explicitly **pushes `research/<name>` branches**. Planning-only is not side-effect-free. [Router][ask], [body][wayfinder] |
| **`prototype`** | Only logic/state-model **HTML** and **UI** branches; no tests by design. Instructs folding the validated decision into real code and **committing the prototype on a throwaway branch**, with an issue pointer. It is not an obvious Deno runtime/toolchain compatibility-spike workflow. [Source][prototype] |
| **`codebase-design` / `improve-codebase-architecture`** | First is module/interface/seam vocabulary; design-it-twice explores alternatives with **3+ parallel agents**. The second surveys existing architectural friction, writes/opens a temporary HTML report, then interviews and updates domain docs. Useful conditionally for a **specific bootstrap/CLI seam**, not a required whole-codebase refactor phase. [Vocabulary][design], [alternatives][twice], [survey][architecture] |
| **`implement` / `implement-spec`** | `implement` calls TDD/review and explicitly **commits to the current branch**. `implement-spec` creates an integration branch/worktrees, has workers reset onto that base if needed, merges their work through a **merger subagent**, and resolves tickets or readies a PR. These are real local integration merges—not a claim that it automatically merges GitHub main. Superman explicitly excludes this workflow. [Implement][implement], [orchestrator][implement-spec], [spec §5.6](spec.md). |

## Applying the route safely

These are constraints for a **later authorized planning session**, not actions taken here:

**Shared prompt fence:** use only the existing local tracker `.scratch/superman-v0/`; write only explicitly authorized planning documents. No product/bootstrap code, configs, CI, skill edits, installation, branch/worktree operations, commits/pushes, hosted issues/PRs/settings, credentials, agent approval or merge operations. Do not invoke setup or either implementation workflow. Preserve unrelated changes and all existing blockers. Later human Gate 1 review/merge is separate from this planning scope. [Local authority: spec §§5.3–5.4/17](spec.md).

1. **Interview first.** Use `grill-with-docs` to decide Deno's scope (product CLI versus protected bootstrap/dev tooling), distribution/install contract, typechecker, tests/coverage/mutation, process/permission model and platform evidence. Use targeted primary-source `research` for missing facts, not to choose policy for André. Keep open choices open; a recommended answer is not approval. With no product `src/` yet, distinguish future product design from the **existing Node-specific bootstrap**, rather than calling the migration entirely greenfield. Sources: [interview][grilling], [research][research], [package.json](../../package.json), [ADR 0003](../../docs/adr/0003-zero-runtime-deps-typescript-only.md), [ADR 0008](../../docs/adr/0008-tsrs-primary-typechecker.md), [ADR 0014](../../docs/adr/0014-overall-coverage-in-incremental-ci.md).
2. **Synthesize an amendment, not a replacement.** Tell `to-spec` the exact existing path `.scratch/superman-v0/spec.md`; preserve section/story IDs, decisions not reopened, ticket references and blocked status. Propose only the confirmed delta, flag unresolved questions, retain/check the existing process seams (§16), and explicitly override automatic publication/readiness. Glossary/ADR edits require an authorized planning-document scope; otherwise return proposals rather than writing them. [Sources][to-spec]: [domain-modeling][domain], [current spec](spec.md).
3. **Reconcile tickets only if needed and approved.** Tell `to-tickets` to propose changes to existing affected ticket IDs first; do not regenerate from `01`, renumber, delete the backlog, modify the parent spec, or assign `ready-for-agent`. Retain blockers/statuses; append any genuinely new IDs only after approval. Separate Gate 1 policy/bootstrap work from product tickets and protected activation follow-ups—ordinary tickets cannot migrate their own governing policy. [Sources][tickets]: [spec §§5.3–5.4/17](spec.md), [blocked ticket 01](issues/01-skeleton-and-raw-gates.md).
4. **Review the actual planning delta.** Review consistency against confirmed interview decisions and retained requirements, including impacted ADRs/rules/tickets; do not treat the amended spec as proof of its own correctness. If using `code-review`, provide a verified fixed point **and explicitly include authorized uncommitted edits** where applicable; otherwise defer its normal committed-diff mode. Do not commit merely to satisfy the reviewer. Preserve unrelated working-tree changes. Automated findings never replace André's exact-head approval/merge, and ticket 01 remains blocked until the real §17 prerequisites close. [Review source][review]; [local gate contract §§5.4/9/17](spec.md).

**Conditional detours:** use `wayfinder` only if the interview reveals genuinely multi-session decision fog; authorize a separate local decision-map namespace rather than reusing implementation ticket IDs, and explicitly forbid its push/task/publication side effects outside scope. `to-questionnaire` is for knowledge held by **someone else**, not a substitute for André's own decisions; `wait-what` re-explains a confusing message; `handoff` writes a portable **temporary-directory** document, normally for a directory/harness/person transition, not every phase. None is a mandatory extra step. [Wayfinder][wayfinder], [questionnaire][questionnaire], [clarifier][wait], [handoff][handoff], [router's phase guidance][ask].

## Evidence limits

This is a targeted audit of official pinned bodies, their relevant companion references, and the complete five-commit delta—not a catalog audit or workflow test. Upstream defaults describe instructions, not an enforcement sandbox. Installed/loaded identity and OpenCode behavior remain outside my independent verification; the hash evidence above is explicitly parent-supplied locally. No Deno support, packaging strategy, checker/coverage/mutation compatibility, permissions design, successful platform execution, readiness or authority has been established. Existing spec/ticket IDs, blockers and unrelated work were not changed.

[pin]: https://api.github.com/repos/mattpocock/skills/commits/59db609eb1e18aaf59b63284d0e52255aff0c63c
[head]: https://api.github.com/repos/mattpocock/skills/commits/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d
[delta]: https://api.github.com/repos/mattpocock/skills/compare/59db609eb1e18aaf59b63284d0e52255aff0c63c...4ae2317ddb22b046e26455e4f9c9b3aaaf62212d?per_page=100
[fresh]: https://github.com/mattpocock/skills/commit/7739eaed7f8f3915437a8def198a6d0d7206dbc7
[fresh-implementer]: https://github.com/mattpocock/skills/commit/a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
[ask]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/ask-matt/SKILL.md
[grill-docs]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/grill-with-docs/SKILL.md
[grill-me]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/grill-me/SKILL.md
[grilling]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/grilling/SKILL.md
[domain]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/domain-modeling/SKILL.md
[to-spec]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/to-spec/SKILL.md
[tickets]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/to-tickets/SKILL.md
[local]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md
[setup]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/setup-matt-pocock-skills/SKILL.md
[review]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/code-review/SKILL.md
[wayfinder]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/wayfinder/SKILL.md
[prototype]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/prototype/SKILL.md
[design]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/codebase-design/SKILL.md
[twice]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/codebase-design/DESIGN-IT-TWICE.md
[architecture]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/improve-codebase-architecture/SKILL.md
[implement]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/implement/SKILL.md
[implement-spec]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/implement-spec/SKILL.md
[research]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/research/SKILL.md
[questionnaire]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/to-questionnaire/SKILL.md
[wait]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/wait-what/SKILL.md
[handoff]: https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/handoff/SKILL.md
[head-grilling]: https://raw.githubusercontent.com/mattpocock/skills/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/grilling/SKILL.md
[head-review]: https://raw.githubusercontent.com/mattpocock/skills/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review/SKILL.md
[head-implement-spec]: https://raw.githubusercontent.com/mattpocock/skills/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/implement-spec/SKILL.md
