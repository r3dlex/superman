# 01: Skeleton and raw gates on three OSes

**Milestone:** M2

**What to build:** A contributor can clone the repo, run `pnpm install`, and run `superman --version` from source, and every v0 gate already runs as a raw command (no superman logic yet): typecheck with exact-pinned `tsrs --noEmit` (G2, ADR 0008), Biome `biome ci` (G10), Vitest, knip, jscpd, Stryker, Archgate, a Trivy `fs` scan (G11; the pinned binary, run locally when present), and a small test-first (G9) script that checks a `Kind: behavior` ticket PR has a test-only red commit before its first source commit and that those tests fail at that commit. Baselines for the duplication and mutation ratchets are measured on this first code. This ticket also runs Pocock's `setup-matt-pocock-skills` to write `AGENTS.md` (≤60 lines, precedence sentence first; `CLAUDE.md`/`GEMINI.md` one-line pointers) and the `docs/agents/` notes the Pocock skills expect, pointing them at `.scratch/` local tickets, `docs/adr/` and `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-ci-matrix`: extends `.github/workflows/ci.yml` to the 3-OS matrix (macos-15, ubuntu-24.04, ubuntu-24.04-arm; G1 `n/a` on arm64) running the raw gates and the G9 script (called by its path, never through a `package.json` script), and adds `superman.ratchet.json` with the measured baselines. **(M1 amendment)** It also adds `biome.json` (protected; scope and style chosen to match the existing files, with Markdown excluded unless André opts in), the pinned Trivy install with its sha256 check on the linux-x64 leg (§8; never `trivy-action`/`setup-trivy`), the `tsrs --noEmit` and `biome ci` steps on all three legs (this is tsrs's platform check), and the scheduled, non-blocking `tsc-drift` job (ADR 0008).

- [ ] `superman --version` prints the `package.json` version and exits 0; tested through the process boundary with Vitest (red test commit first).
- [ ] `package.json` still has empty `dependencies`, `optionalDependencies` and `peerDependencies` (SUP-001 passes); devDependencies are exact pins, including `tsrs@0.20.1-ts7.1.0-beta`, `@biomejs/biome@2.6.4` and `typescript@7.1.0-beta` for the drift job, or newer exact versions where tsrs's suffix and `typescript` match (SUP-006 passes).
- [ ] tsconfig (strict, Node 26 type stripping compatible), Vitest, knip, jscpd and Stryker configs exist; knip reports 0 issues; `pnpm exec tsrs --noEmit` is clean, never with `--fast`; `pnpm exec tsc --noEmit` reports the same diagnostics, and the PR records that comparison.
- [ ] `pnpm exec biome ci` passes, with no `biome-ignore` comments. The proposed biome.json goes into the follow-up PR, since biome.json is protected, and this PR records it. ESLint and Prettier are not added.
- [ ] `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --include-dev-deps --exit-code 1 .` with Trivy 0.76.1 reports 0 findings, and there is no `.trivyignore` (SUP-007).
- [ ] The tsrs platform result for macOS arm64, linux x64 and linux arm64 is recorded in the PR (VERIFY in spec §5.4).
- [ ] A build produces `dist/cli.js`, the `bin` target, with a `#!/usr/bin/env node` shebang; `dist/` stays gitignored.
- [ ] The G9 script is TypeScript run directly by Node (no `.sh`/`.py`, SUP-003). It lives in `src/` so this ticket PR stays off protected paths and ticket 05 can reuse it. It has fixture tests for: behaviour PR with red-then-green passes; fix-before-test fails; red commit failing on a syntax error fails.
- [ ] First measured jscpd percentage and mutation score are recorded for the follow-up (they become `superman.ratchet.json`).
- [ ] `AGENTS.md` and `docs/agents/` exist as written by `setup-matt-pocock-skills`, with no Pocock file modified.
- [ ] This PR touches no protected path and passes the M1 CI (Archgate strict + path policy).
