# 20: Haskell provider (package level)

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `cabal.project`, `stack.yaml` or a single root `*.cabal`. Packages come from `cabal.project` `packages:` globs or `stack.yaml` `packages:`; edges come from each `.cabal` file's `build-depends` across all components (library, executables, test-suites), read as text. A changed file belongs to the package whose directory contains it; affected targets are that package plus reverse dependencies, `precision: "package"`. Test command: `cabal test <pkg>` (or `stack test <pkg>` when `stack.yaml` is the build tool). `cabal.project*`, `stack.yaml(.lock)` and freeze files force full. Module-level precision is out of v0 (§3).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fixture with packages `core ← web` selects both for a `core` change and only `web` for a `web` change, with `cabal test` argv (test-first); the same fixture with `stack.yaml` yields `stack test` argv.
- [ ] `build-depends` spread over several lines, with version bounds and conditionals, is parsed into the right package names.
- [ ] A `cabal.project` change forces full.
