---
Status: accepted
---

# One change model selects affected targets for every gate, with a full run on main and nightly

André decided on 2026-10-29 that superman runs change-aware CI from v0. Each run computes its changed files once: `git diff <merge-base>...<head>` in `gate ci` and `gate pre-pr`, and the staged files in `gate pre-commit`. Providers turn those files into **affected targets**, and each target names the tests and gate inputs to run. The receipt records the base and head, the changed files, every affected target with a reason chain and the provider that chose it, and any force-full trigger. Every gate reads that one result, and none works out its own changes. This replaces the separate changed-files logic in tickets 04–06 (pre-commit related tests, Stryker `--mutate`, jscpd "clones touching changed files").

- **Providers behind one interface.** Each one returns `{ targets[], reasons, testCommand per target, precision: "file" | "package" | "project", confidence }`. More than one can be active, and their results are merged by target id. Cross-language edges go through `affected.global` paths (any change → full) or explicit `affected.links` in config. Detection order: a monorepo tool first (moon `moon query projects --affected`, Nx `nx show projects --affected`, Turborepo `--filter=...[<base>]`), then the language-native provider, and config glob mapping only as a last resort, which `doctor` warns about.
- **v0 providers:** TS/JS (superman's own zero-dependency import-graph parser with TypeScript module resolution), Elixir (`mix xref graph`), Rust (`cargo metadata`), C# (`ProjectReference` graph), Python (static import graph parsed in TS, optional `pytest-testmon`) and Haskell (package level only). Go is post-v0.
- **Fail toward full.** A file no provider claims (and not in `affected.ignore`), a provider error, a shallow clone, or any force-full trigger runs the full suite. The force-full triggers are every protected path (§5.3, which includes the workflows, the superman config and lock, and `biome.json`), every lockfile and toolchain pin of every detected language, `tsconfig*.json`, root build manifests, provider config (`.moon/**`, `nx.json`, `turbo.json`) and the configured `global` paths.
- **Change-aware gates.** Tests run only for affected targets. Mutation (Stryker `--mutate` plus incremental, muex `--since`) runs only on changed source files in PRs, as G6 already did. jscpd, Archgate and Biome run on the changed files and the files of affected targets. Typecheck, knip, G4, G7–G9 and G11 stay whole-repo in v0, because they are already cheap or already diff-based.
- **Full runs stay the oracle.** Pushes to `main` and the nightly job always select every target. The nightly job also ignores cache hits (ADR 0011), so it is the ground truth that `superman audit` compares PR selections against.
- **Miss tracking and auto-off.** A **miss** is a target that fails in a nightly or `main` full run, still fails on one rerun, and was not selected by the affected run of a PR merged since the last green full run. `superman audit` reports misses per repo and per provider over the pilot window (§13). Above `affected.missThreshold` (default 0.02, i.e. 2% of merged affected-mode PRs), affected mode switches off for that repo or provider: `gate ci --affected` runs the full suite and says why, and `doctor` and `audit` report it. Switching it back on takes a spec PR that sets `affected.missResetAt`.

## Considered Options

- **External tools only (moon, Nx, Turborepo, `vitest related`).** Rejected as the only path. Most target repos (superman itself, single-package TS repos, lx's non-JS parts) have no monorepo tool. `vitest related` and `vitest --changed` cover tests but not mutation, jscpd or deploy selection, and their graph cannot be written into the receipt for Gate 2 review. Monorepo tools stay first in the detection order wherever a repo already has one.
- **Our own TS import-graph parser (chosen for TS/JS).** About 400 lines in `src/affected/ts.ts`, zero runtime dependencies, deterministic, and it reports why each target was selected. Its risk is module resolution edge cases (`exports` conditions, `paths` wildcards, dynamic `import()` with non-literal specifiers), which fall back to file-level "unknown edge → target's whole package" or to full.
- **Per-gate change detection (the M1 design).** Rejected. Pre-commit, Stryker and jscpd each computed changes differently, and nothing recorded what was skipped.
- **No change-aware CI in v0, full suite on every PR.** Rejected by André: PR wall time on polyglot repos (lx) would break the §13 ≤12 min budget.

## Consequences

- New milestone M7b (tickets 12–24), new rule **SUP-008** (CI runs tests only through `superman gate`; the nightly full run can't be dropped), receipt field `affected`, config section `affected`.
- Every PR's receipt says exactly which targets ran and why, so André can see at Gate 2 what was skipped.
- A miss is no longer silent: the nightly full run fails, `audit` names the PR and provider, and the threshold turns the feature off.
- `superman.config.json` is a protected path, so provider settings, `global` paths, links, ignores and the threshold can only change in a spec PR.
- **Revert triggers.** Any one of these turns affected mode off repo-wide (one spec PR sets `affected.enabled: false`; the code stays):
  - the miss rate is above the threshold for two windows in a row after a provider fix;
  - a miss on a `main` push that reached a release;
  - PR CI p50 does not drop by at least 30% compared to the full suite after the pilot window (the feature is not paying for its risk);
  - the change model and a gate disagree about the changed-file set (a bug, not a miss), more than once.
