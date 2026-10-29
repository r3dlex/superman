# 01: Skeleton and raw gates on three OSes

**Milestone:** M2

**What to build:** A contributor can clone the repo, run `pnpm install`, and run `superman --version` from source, and every v0 gate already runs as a raw command (no superman logic yet): typecheck, Vitest, knip, jscpd, Stryker, Archgate, and a small test-first (G9) script that checks a `Kind: behavior` ticket PR has a test-only red commit before its first source commit and that those tests fail at that commit. Baselines for the duplication and mutation ratchets are measured on this first code. This ticket also runs Pocock's `setup-matt-pocock-skills` to write `AGENTS.md` (≤60 lines, precedence sentence first; `CLAUDE.md`/`GEMINI.md` one-line pointers) and the `docs/agents/` notes the Pocock skills expect, pointing them at `.scratch/` local tickets, `docs/adr/` and `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-ci-matrix`: extends `.github/workflows/ci.yml` to the 3-OS matrix (macos-15, ubuntu-24.04, ubuntu-24.04-arm; G1 `n/a` on arm64) running the raw gates and the G9 script (called by its path, never through a `package.json` script), and adds `superman.ratchet.json` with the measured baselines.

- [ ] `superman --version` prints the `package.json` version and exits 0; tested through the process boundary with Vitest (red test commit first).
- [ ] `package.json` still has empty `dependencies`, `optionalDependencies` and `peerDependencies` (SUP-001 passes); devDependencies are exact pins.
- [ ] tsconfig (strict, Node 26 type stripping compatible), Vitest, knip, jscpd and Stryker configs exist; knip reports 0 issues; typecheck is clean.
- [ ] A build produces `dist/cli.js`, the `bin` target, with a `#!/usr/bin/env node` shebang; `dist/` stays gitignored.
- [ ] The G9 script is TypeScript run directly by Node (no `.sh`/`.py`, SUP-003). It lives in `src/` so this ticket PR stays off protected paths and ticket 05 can reuse it. It has fixture tests for: behaviour PR with red-then-green passes; fix-before-test fails; red commit failing on a syntax error fails.
- [ ] First measured jscpd percentage and mutation score are recorded for the follow-up (they become `superman.ratchet.json`).
- [ ] `AGENTS.md` and `docs/agents/` exist as written by `setup-matt-pocock-skills`, with no Pocock file modified.
- [ ] This PR touches no protected path and passes the M1 CI (Archgate strict + path policy).
