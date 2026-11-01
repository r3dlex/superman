---
Status: accepted
---

# One change model selects tests and verified-project typechecks

André retained all M7b work in the first usable v0 release on 2026-10-30. Change-aware CI is not a post-v0 optimization: it must earn its complexity through the pilot's latency and reliability metrics. One provider result is shared by gates so selection, cache inputs and receipts cannot silently use different dependency models. The authoritative selection and recovery contract is spec §5.7; domain meanings live in `GLOSSARY.md`.

## Decisions

- **One interface, multiple adapters.** Existing moon/Nx/Turborepo graphs take precedence where they cover a language, followed by language providers and configured globs. Targets carry applicable test/typecheck commands, input files and reason chains. Base and head graphs cover deletions and renames; explicit links cover cross-language and non-import dependencies.
- **Typechecks are scoped too.** Select complete compiler projects/packages/apps and reverse dependents only from verified project references/native graphs and explicit commands. Missing or ambiguous evidence falls back to the whole-repository command. File-import reachability alone does not establish compiler scope.
- **Process tests have declared inputs.** CLI integration tests depend on all CLI source unless a narrower dependency map is explicitly declared. Static test imports alone cannot describe subprocess behavior. Packaged skills and other runtime assets are inputs; a blanket Markdown ignore is rejected.
- **Deno amendment, 2026-11-01 (ADR 0016).** Model actual source/compiled runtime identity, protected launch/config/permission/declaration/build inputs and canonical release assets, including bootstrap process tests. Runtime/profile/global changes force full selection and invalidate implicated reuse. The TS/JS provider must account for the adopted resolution forms or conservatively broaden; selecting Deno as Superman's host does not promise universal Deno-project precision. No new selector is implemented here.
- **Fail toward full.** Unknown ownership, provider/tool errors, missing base history and protected/global/build inputs select the full repository. A missing or untrustworthy safety ledger additionally disables gate-result reuse. Full selection and uncached execution are distinct (ADR 0011).
- **Conservative required-check scope, confirmed 2026-11-01.** Every narrowing provider must demonstrate conservative impact coverage for its supported profile. Heuristics may over-select but cannot knowingly omit required work; use complete-app/full targets until the mapping is proved. Owner-governed critical acceptance runs fresh outside selection/caches so the optimization cannot suppress its own safety tests. No provider is removed by this requirement.

## Deliberate precision trade-offs

| Choice | Reason and accepted limit |
|---|---|
| Own zero-runtime-dependency TS/JS import parser | Explains test selection without adopting a build system; uncertain resolution broadens the package/full selection rather than claiming exactness. |
| Elixir module-name hints | Q16 supersedes the earlier accepted heuristic omission: hints alone cannot narrow required tests. Complete-app/full selection remains available until conservative coverage is demonstrated; no `mix test --stale` assumption. |
| Full-corpus PR duplication | Q11 supersedes the accepted cross-scope/total-percentage blind spot. Enforce the complete approved corpus before merge; incremental replacement needs equivalent-detection proof. Nightly discovery cannot retroactively prevent a merge. |
| Full selection on main, uncached full nightly | Main may reuse eligible passes; nightly supplies fresh execution for selection and cache correctness checks. |

Other providers remain in v0: Rust, C#, Python and package-level Haskell, plus moon/Nx/Turborepo adapters. Go and affected deploy execution remain post-v0. Runtime `superman` stays a selector/runner, not a build scheduler.

## Reliability and recovery

Selection misses and stale cached passes are separate correctness incidents; ordinary cache lookup misses are normal. A later failing target does not identify an introducing PR by timing alone. Bounded base/head replay verifies attribution; inconclusive evidence is reported as unresolved and conservatively disables affected selection rather than blaming every PR in the merge window.

The selection-miss metric remains diagnostic PR incidence, counted once per provider and only provider-using PRs in its denominator. Q13 supersedes the 2%/two-miss grace: the **first confirmed miss** quarantines implicated selection; unknown attribution disables conservatively. The operational window, freshness and recovery rules live once in spec §5.7. Recovery needs a reviewed fix, relevant fixtures and fresh uncached full evidence, not a reset or changed model hash alone. The first confirmed stale pass separately quarantines implicated reuse (ADR 0011).

## Consequences

- `superman init` renders repo-neutral GEN-002 for tests-through-Superman/full-nightly enforcement, linked to a locally reviewed adoption ADR under the configured why-ADR directory. SUP-008 stays Superman-specific.
- Provider/typecheck and safety-ledger work expands tickets 12–24. Ticket 24 activates the complete v0 provider set only after its dependencies and manual infrastructure are ready; the release ticket depends on that activation.
- Safety quarantine is immediate under spec §5.7; a miss reaching a release, repeated incidents after fixes or failure to achieve the pilot latency benefit additionally triggers reviewed disable/redesign. The code may remain; its optimization authority does not. Performance goals never waive required checks.

Implementation next: finish the Gate 1 prerequisites in spec §17, then build ticket 12's shared interface before its provider adapters.
