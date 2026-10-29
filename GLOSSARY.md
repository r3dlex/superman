# superman

superman is a thin TypeScript CLI plus a three-skill overlay on Matt Pocock's skills. It makes a human approval on the exact head SHA, and deterministic gates, the conditions for every merge done by an AI coding agent.

## Language

### People and identities

**Approver**:
A human account listed in `identity.approvers` (today `br4vesirrobin`, André) that reviews, approves and merges PRs.
_Avoid_: owner, reviewer bot, human-in-the-loop account

**Agent identity**:
The non-approver identity that authors commits and opens PRs, in one of two modes: `app` (the GitHub App `r3dlex-superman-bot`, v0 default) or `machine-user` (a separate account that works from its own fork).
_Avoid_: bot account (ambiguous between the two modes), r3dlex-bot (the old plan)

### Work units

**Spec**:
The design document for one piece of work at `.scratch/<slug>/spec.md`, written in Pocock's to-spec format and merged at Gate 1.
_Avoid_: PRD, plan, design doc

**Ticket**:
One thin vertical slice of a spec at `.scratch/<slug>/issues/<NN>-<slug>.md`, built and merged as exactly one PR.
_Avoid_: issue, task, story

**Kind**:
The ticket's declared change type, `behavior` or `refactor`, set at Gate 1 and used by G9.
_Avoid_: type, category

**Spec-kind PR**:
A PR from a `spec/<slug>` branch that changes specs, tickets, ADRs, rules, ratchet baselines, CI or other protected paths, and nothing else.
_Avoid_: docs PR, config PR

**Ticket PR**:
A PR from a `ticket/<slug>-<nn>` branch that implements one ticket and touches no protected path.
_Avoid_: feature PR, implementation PR

**Protected-path follow-up**:
The spec-kind PR that adds the protected files (workflows, lock, ratchet baselines, `.claude/settings.json`) a ticket needs, merged after the ticket PR.
_Avoid_: companion hack, side PR

### Gates and evidence

**Gate 1**:
André's review and merge of a spec-kind PR.
_Avoid_: spec approval meeting, sign-off

**Gate 2**:
André's review, approval on the head SHA, and merge of a ticket PR after `merge-ready` passes.
_Avoid_: final review, release gate

**Gate (G1–G11)**:
One deterministic check with a pass, fail or `n/a` result, run by `superman gate` and listed in spec §5.4.
_Avoid_: hook, policy, check (when the gate is meant)

**Drift job**:
The scheduled, non-blocking CI job that runs the pinned TypeScript `tsc --noEmit` and diffs its diagnostics against the primary checker, tsrs (ADR 0008).
_Avoid_: shadow gate (it never blocks a merge)

**Protected path**:
A path that only a spec-kind PR may change; a ticket PR that touches one fails G4.
_Avoid_: locked file, frozen file

**Ratchet**:
A baseline number (mutation score, duplication percentage) in `superman.ratchet.json` that may only get stricter.
_Avoid_: threshold (a ratchet moves), budget

**Receipt**:
The JSON record of one gate run, with every command, exit code, tool version and output hash.
_Avoid_: report, log, attestation

**Waiver**:
Any way to pass a merge without satisfying a gate; superman has none.
_Avoid_: override, exception, bypass

### Change-aware CI

**Change model**:
The one computation per gate run of the changed files and the affected targets they select, recorded in the receipt's `affected` block and read by every gate (ADR 0010).
_Avoid_: diff (only the first half), change set per gate

**Affected target**:
A unit of code (a test file, a package or a project) that owns a changed file or depends on one, together with the test command to run for it and the reason it was selected.
_Avoid_: impacted project, related test (the TS provider's narrower case)

**Provider**:
A module behind one interface that maps changed files to affected targets for one ecosystem or tool (moon, Nx, Turborepo, TS/JS, Elixir, Rust, C#, Python, Haskell, globs), and states its precision and confidence.
_Avoid_: plugin, adapter, detector

**Force-full trigger**:
A changed path, or a condition such as a shallow clone, a provider error or an unclaimed file, that makes a run select every target.
_Avoid_: global change (only one kind of trigger), escape hatch

**Miss**:
A target that fails in a full run, fails again on one rerun, and was not selected by the affected run of a PR merged since the last green full run.
_Avoid_: false negative (too general), flake (a flake passes on rerun)

**Cache key**:
The sha256 of everything a gate result depends on: gate, target, argv, tool versions, config, platform, allowlisted environment and the hashes of the input files (ADR 0011).
_Avoid_: cache id, fingerprint

### Decisions and skills

**Why ADR**:
A short Pocock-format decision record in `docs/adr/` that explains why.
_Avoid_: design note

**Archgate ADR**:
A frontmatter decision record in `.archgate/adrs/` with a companion `.rules.ts` that enforces it, linked to its why ADR by a `Source:` line.
_Avoid_: rule doc, policy file

**Overlay**:
superman's own skills, `ship`, `adr-rule` and the optional `plan-critic`, used on top of Pocock's skills and never replacing them.
_Avoid_: superman skills pack, extension

**Catalog**:
The repo's plugin marketplace files, which list the Pocock skills pinned to a commit and the superman overlay.
_Avoid_: registry, store

**Lock**:
`superman.lock.json`, which records the pinned upstream commit and a sha256 per installed skill file.
_Avoid_: manifest, pins file

**Harness**:
An agent runtime that loads skills and plugins: Claude Code, Codex or OpenCode.
_Avoid_: IDE, client, host
