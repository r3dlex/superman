---
Status: accepted
---

# tsrs is the primary type checker, pinned exactly and watched against tsc

André decided on 2026-10-29 that `tsrs` is the primary type checker in CI and locally, including on self-hosted runners. `tsrs` is oxc-project's Rust port of TypeScript 7's checker (Apache-2.0). Its version names the TypeScript release it follows: `0.20.1-ts7.1.0-beta` tracks TypeScript `7.1.0-beta`. It is still a beta, so it gets these precautions:

- Only `--noEmit`. tsrs never emits anything we ship. Bun builds the release binaries, and the build that produces `dist/` is separate from the type check.
- Exact pin. The devDependency is `tsrs@<exact version>`, like `archgate@0.61.0`. It changes only in a PR that passes full CI on all three OS legs.
- Default mode only in gates. `--fast` and `TSRS_FAST=1` turn on a preset whose diagnostics and exit status may differ from the pinned TypeScript, so they are never used in CI or in any gate. A developer may use them in a local editor or a watch loop.
- Drift watch. A scheduled, non-blocking job runs the official TypeScript `tsc --noEmit`, pinned exactly to the version tsrs names, and diffs its diagnostics against tsrs. Any difference fails that job and opens an issue.
- Platform check. tsrs has to install and run on macOS arm64, linux x64 and linux arm64.

## Considered Options

- **`tsc --noEmit` from TypeScript 7 as the gate.** This is the reference behaviour, and it stays the drift oracle and the fallback.
- **`tsc` from TypeScript 5.x/6.x.** Rejected. It is slower and is not the TypeScript line tsrs follows.
- **tsrs with `--fast` in CI.** Rejected. Its results can differ from the pinned TypeScript, and a gate must be deterministic.

## Consequences

- Rule SUP-006 enforces the exact pin, no `--fast` and no `TSRS_FAST` in workflows or the superman config, and that `gates.typecheck` is `tsrs --noEmit`.
- npm findings on 2026-10-29: `tsrs@0.20.1-ts7.1.0-beta` has no install scripts. It resolves its native binary through `optionalDependencies` for `@tsrs/{darwin-arm64, darwin-x64, linux-x64-gnu, linux-x64-musl, linux-arm64-gnu, linux-arm64-musl, win32-x64}`, all at the same version, so all three CI legs have a binary.
- Checked hands-on on linux x64: it reported the same diagnostics and exit code as `typescript@7.1.0-beta` `tsc --noEmit` on a fixture. macOS arm64 and linux arm64 are checked from npm metadata only (VERIFY in ticket 01's CI matrix).
- **Revert triggers.** Any one of these sends us back to `tsc --noEmit`:
  - a confirmed wrong diagnostic compared to tsc: a missed error, or an error tsc doesn't report;
  - a crash or hang;
  - a CI platform that is missing or broken for the pinned version;
  - upstream abandonment, meaning no release for 90 days while TypeScript ships a new minor, or the repo is archived.
- **Revert path.** Change `gates.typecheck` in `superman.config.json` (and its CI step) back to `["pnpm", "exec", "tsc", "--noEmit"]`, swap the devDependency, mark this ADR superseded and drop SUP-006's `typecheck-uses-tsrs` rule. It is one spec-kind PR with no code changes.
