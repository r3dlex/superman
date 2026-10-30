---
Status: accepted
---

# One change model selects tests and verified-project typechecks

André retained all M7b work in the first usable v0 release on 2026-10-30. Change-aware CI is not a post-v0 optimization: it must earn its complexity through the pilot's latency and reliability metrics. One provider result is shared by gates so selection, cache inputs and receipts cannot silently use different dependency models. The authoritative selection and recovery contract is spec §5.7; domain meanings live in `GLOSSARY.md`.

## Decisions

- **One interface, multiple adapters.** Existing moon/Nx/Turborepo graphs take precedence where they cover a language, followed by language providers and configured globs. Targets carry applicable test/typecheck commands, input files and reason chains. Base and head graphs cover deletions and renames; explicit links cover cross-language and non-import dependencies.
- **Typechecks are scoped too.** Select complete compiler projects/packages/apps and reverse dependents only from verified project references/native graphs and explicit commands. Missing or ambiguous evidence falls back to the whole-repository command. File-import reachability alone does not establish compiler scope.
- **Process tests have declared inputs.** CLI integration tests depend on all CLI source unless a narrower dependency map is explicitly declared. Static test imports alone cannot describe subprocess behavior. Packaged skills and other runtime assets are inputs; a blanket Markdown ignore is rejected.
- **Fail toward full.** Unknown ownership, provider/tool errors, missing base history and protected/global/build inputs select the full repository. A missing or untrustworthy safety ledger additionally disables gate-result reuse. Full selection and uncached execution are distinct (ADR 0011).

## Deliberate precision trade-offs

| Choice | Reason and accepted limit |
|---|---|
| Own zero-runtime-dependency TS/JS import parser | Explains test selection without adopting a build system; uncertain resolution broadens the package/full selection rather than claiming exactness. |
| Elixir module-name heuristic in CI | André retained the finer subset rather than app-wide CI tests. Confidence is heuristic; repeatable omissions can be detected after merge. |
| Scoped PR duplication scan | André accepted post-merge detection of cross-scope clones and the total-percentage ratchet. The PR scan is not a complete pre-merge duplication guarantee. |
| Full selection on main, uncached full nightly | Main may reuse eligible passes; nightly supplies fresh execution for selection and cache correctness checks. |

Other providers remain in v0: Rust, C#, Python and package-level Haskell, plus moon/Nx/Turborepo adapters. Go and affected deploy execution remain post-v0. Runtime `superman` stays a selector/runner, not a build scheduler.

## Reliability and recovery

Selection misses and stale cached passes are separate correctness incidents; ordinary cache lookup misses are normal. A later failing target does not identify an introducing PR by timing alone. Bounded base/head replay verifies attribution; inconclusive evidence is reported as unresolved and conservatively disables affected selection rather than blaming every PR in the merge window.

The selection-miss metric is PR incidence, with each PR counted once per provider and only provider-using PRs in that denominator. The rolling-window, small-sample, safety-ledger freshness and re-enable rules are specified once in spec §5.7. Stale cached passes stop affected reuse immediately under ADR 0011, rather than sharing the selection-miss grace threshold.

## Consequences

- `superman init` renders repo-neutral GEN-002 for tests-through-Superman/full-nightly enforcement, linked to a locally reviewed adoption ADR under the configured why-ADR directory. SUP-008 stays Superman-specific.
- Provider/typecheck and safety-ledger work expands tickets 12–24. Ticket 24 activates the complete v0 provider set only after its dependencies and manual infrastructure are ready; the release ticket depends on that activation.
- An implementation that misses a release, repeatedly exceeds the reliability threshold after a provider fix, or fails the latency benefit is disabled through the spec's reviewed recovery path. The code may remain; its optimization authority does not.

Implementation next: finish the Gate 1 prerequisites in spec §17, then build ticket 12's shared interface before its provider adapters.
