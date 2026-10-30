# superman

superman separates human approval, automated checks and their evidence for agent-authored changes. These terms distinguish planning authority, implementation work and performance optimizations.

## Language

### People and identities

**Approver**:
A designated human account authorized to review, approve the exact proposed head and merge agent-authored PRs.
_Avoid_: owner, reviewer bot, human-in-the-loop account

**Agent identity**:
The non-approver identity under which agents author commits and open PRs. It may be an App bot or a fork-based machine-user.
_Avoid_: bot account (ambiguous between the two modes), r3dlex-bot (the old plan)

### Work units

**Spec**:
The design document for one piece of work, reviewed and merged at Gate 1 before its implementation tickets proceed.
_Avoid_: PRD, plan, design doc

**Ticket**:
One thin vertical slice of a spec, built and merged as exactly one implementation PR.
_Avoid_: issue, task, story

**Ticket claim**:
An exclusive reservation of a ticket for one active worker, distinct from the ticket's completion status.
_Avoid_: claimed status (alone does not coordinate workers)

**Kind**:
The ticket's declared change type, `behavior`, `refactor` or content-only `knowledge`, fixed at Gate 1. Knowledge work cannot change code or policy and has no code-behavior replay.
_Avoid_: type, category

**Spec-kind PR**:
A PR for planning, policy, adoption or distribution artifacts, reviewed at Gate 1 and distinct from product implementation.
_Avoid_: docs PR, config PR

**Ticket PR**:
A PR implementing one ticket, leaving protected policy inputs unchanged except for permitted ratchet tightening.
_Avoid_: feature PR, implementation PR

**Protected-path follow-up**:
A spec-kind PR that activates protected settings or adoption artifacts after their ticket implementation has merged.
_Avoid_: companion hack, side PR

### Gates and evidence

**Gate 1**:
André's review and merge of a spec-kind PR.
_Avoid_: spec approval meeting, sign-off

**Gate 2**:
André's review, approval on the exact head, and merge of a ticket PR after its applicable admission evidence passes.
_Avoid_: final review, release gate

**Gate (G1–G12)**:
One deterministic acceptance check within the delivery workflow, with a pass, fail or not-applicable outcome.
_Avoid_: hook, policy, check (when the gate is meant)

**Drift job**:
A scheduled, non-blocking comparison of primary and reference checker diagnostics.
_Avoid_: shadow gate (it never blocks a merge)

**Protected policy input**:
A file or field whose contents define a gate or its governing policy. Changes require Gate 1 review, except explicitly permitted ratchet tightening.
_Avoid_: configuration file (a policy input may be a field)

**Hook wrapper**:
The delivery layer invoking the authoritative gate pipeline, not selecting checks or defining a second pipeline.
_Avoid_: gate scheduler, gate authority

**Protected path**:
A path protected as a whole, rather than only selected fields. A ticket PR may change it only through explicitly permitted ratchet tightening.
_Avoid_: locked file, frozen file

**Ratchet**:
A quality baseline that ticket work may only tighten: mutation scores may rise or hold, and duplication percentages may fall or hold. Mutation regressions are judged over equivalent file scopes.
_Avoid_: threshold (a ratchet moves), budget

**Receipt**:
The evidence record of one gate run, including its inputs, outcomes and evaluated revisions. A PR integration receipt distinguishes the PR head, tested base and tested merge result.
_Avoid_: report, log, attestation

**Red–green replay**:
A comparison in which a behavior test fails against the approved-base implementation and passes against the proposed implementation. It demonstrates regression sensitivity, not the order in which changes were authored.
_Avoid_: proof of TDD order, red-commit requirement

**Waiver**:
An authorized exemption that permits a merge without satisfying its applicable gate policy. Superman provides no such exemption; policy changes receive Gate 1 review.
_Avoid_: override, exception, bypass

### Governed knowledge

**Vault**:
The governed collection of source material and memory proposals from which the wiki is maintained.
_Avoid_: wiki (the published knowledge view), scratch directory

**Vault policy**:
The reviewed format, write-permission and resource-budget rules governing the vault and wiki.
_Avoid_: agent preference, wiki instruction

**Raw source**:
A reviewed source artifact retained unchanged for agent readers. Adding or replacing one is a source import, not memory editing.
_Avoid_: draft memory, editable evidence

**Source import**:
A Gate 1-reviewed addition or replacement of raw source material, distinct from ordinary agent ingestion.
_Avoid_: ingestion (which derives knowledge without changing raw sources)

**Candidate memory**:
A proposed knowledge addition awaiting promotion or explicit resolution.
_Avoid_: accepted memory, published fact

**Promotion**:
Incorporation of a candidate into the wiki within its associated PR. The wiki becomes the canonical copy and the promoted candidate is removed.
_Avoid_: automatic acceptance, second publication PR

**Wiki**:
The agent-maintained knowledge collection whose changes are reviewed with the work they describe.
_Avoid_: vault, governing policy, gate authority

**OKF bundle**:
A portable collection of typed knowledge entries, optionally accompanied by navigation and change history.
_Avoid_: arbitrary Markdown folder, approval record

**Freshness warning**:
A notice that a page's declared freshness window has elapsed, requiring source rechecking before its claims are relied on.
_Avoid_: automatic truth assessment, automatic merge block

**Wiki maintenance PR**:
A knowledge-only change proposal subject to human review and the same wiki-validity checks as other changes.
_Avoid_: automatic cleanup merge, policy repair

**Context graph**:
A source-navigation aid for agents, distinct from the authoritative change model and acceptance evidence.
_Avoid_: gate graph, source of truth

### Change-aware CI

**Change model**:
The shared account of changed inputs, selected affected targets and selection reasons for one run.
_Avoid_: diff (only the first half), change set per gate

**Affected target**:
A test file, compiler project, package or application selected because it owns changed inputs or depends on them. It carries the applicable gate commands and selection reasons.
_Avoid_: impacted project, related test (the TS provider's narrower case)

**Provider**:
An ecosystem-specific mapping from changed inputs to affected targets, with declared precision and confidence.
_Avoid_: plugin, adapter, detector

**Force-full trigger**:
A changed path, or a condition such as a shallow clone, a provider error or an unclaimed file, that makes a run select every target.
_Avoid_: global change (only one kind of trigger), escape hatch

**Full run**:
A gate run that selects every applicable target; eligible checks may still reuse valid cached passes.
_Avoid_: fresh execution, all checks rerun

**Uncached full run**:
A full run that executes every applicable check without reusing gate results. It is the reference run for detecting selection misses and stale cached passes.
_Avoid_: cache-restored full run

**Safety ledger**:
The current trusted record of whether affected selection and cached-pass reuse are permitted for a repository and its providers or gates.
_Avoid_: miss ledger (too narrow), cache index

**Selection miss**:
An affected run's omission of a target needed to detect a regression introduced by that change.
_Avoid_: miss (ambiguous with a cache lookup miss), false negative (too general), flake

**Selection-miss rate**:
The fraction of affected-mode PRs with at least one confirmed selection miss, counted once per PR. A provider's rate includes only PRs that used that provider.
_Avoid_: missed targets per PR, cache miss rate

**Stale cached pass**:
A reused passing result that masks a repeatable failure under the consuming run's conditions. An ordinary cache lookup miss is not a correctness incident.
_Avoid_: selection miss, cache miss

**Cache key**:
The identity of a gate/target execution and its complete inputs. Matching keys alone do not establish current permission to reuse a pass.
_Avoid_: cache id, fingerprint

### Decisions and skills

**Why ADR**:
A decision record preserving the trade-offs and rationale, whether or not mechanical enforcement is possible.
_Avoid_: design note

**Archgate ADR**:
The enforceable companion to a why ADR, linking its decision to mechanically checkable rules.
_Avoid_: rule doc, policy file

**Overlay**:
superman's own `ship`, `adr-rule`, `wiki-ingest`, `wiki-lint` and optional `plan-critic` skills, used on top of Pocock's skills and never replacing them.
_Avoid_: superman skills pack, extension

**Catalog**:
The reviewed selection of upstream and overlay skills offered for installation, including their pinned origins.
_Avoid_: registry, store

**Lock**:
The reviewed record of selected skill revisions, content identities and tool pins.
_Avoid_: manifest, pins file

**Harness**:
An agent runtime that loads skills and plugins: Claude Code, Codex or OpenCode.
_Avoid_: IDE, client, host
