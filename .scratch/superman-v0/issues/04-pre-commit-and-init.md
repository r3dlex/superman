# 04: `superman gate pre-commit` and byte-stable `superman init`

**Milestone:** M5

**What to build:** A maintainer runs `superman init` in a repo and gets `superman.config.json`, `superman.lock.json`, `superman.ratchet.json`, `.archgate/config.json` (if missing), the GEN-001 meta-rule, the Node-shebang `.superman/hooks/pre-commit`, a ≤25-line precedence block in `AGENTS.md`, `CODEOWNERS` lines and the CI workflow, all from deterministic templates, with `core.hooksPath` set. Re-running it changes nothing; a changed file is never overwritten without `--force` and a diff is printed instead. Every commit then runs `superman gate pre-commit` on staged files (Archgate `--staged`, typecheck, related tests, knip, protected-path check), printing only failures.

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-dogfood-init`: commits the output of `superman init` in this repo (`superman.config.json`, `superman.lock.json`, `.superman/hooks/pre-commit`, AGENTS block, `CODEOWNERS`), reviewed as rules.

- [ ] Running `superman init` twice in a fixture repo yields an empty `git diff` the second time.
- [ ] `init` on a repo with a hand-edited `AGENTS.md` block exits 1 and prints a diff unless `--force`.
- [ ] The generated hook is a `#!/usr/bin/env node` file (SUP-003) that spawns `superman gate pre-commit` and exits with its status.
- [ ] `init --repo-kind polyglot` writes config with repo-specific gate commands left for the user, and `paths.whyAdrs`/`paths.glossary` configurable (lx: `docs/architecture/adr`, `CONTEXT.md`).
- [ ] `superman gate pre-commit` p50 is ≤10 s on the superman repo (measured over 10 runs, reported in the PR).
- [ ] A pre-commit touching a protected path on a `ticket/*` branch fails with one line naming the path.
