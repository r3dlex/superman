# 01: Skeleton under pre-wired raw gates on three OSes

**Milestone:** M2

**What to build:** The first usable CLI skeleton and process-boundary tests, evaluated before merge by the raw checks already installed at Gate 1. Policy configs/pins, G9 replay scripts and the CI matrix are prerequisites in spec §17, not code that this ticket adds and activates after its own merge. Measure first-source duplication/mutation baselines for review; do not invent a repository floor or require a red commit. Run Pocock's repo setup without changing upstream skill files.

**Blocked by:** Gate 1 bootstrap

**Status:** blocked

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-baselines` commits the exact approved first measurements before ticket 02 or another source ticket proceeds. The initial matrix, configs, pin checks, protected-input/SUP-005 enforcement and raw G9 scripts belong to the earlier Gate 1 bootstrap, not this follow-up.

## CLI and build

- [ ] `superman --version` prints the package version and exits 0 through the Vitest process seam; tests run red locally, then green before committing.
- [ ] `package.json` still has empty `dependencies`, `optionalDependencies` and `peerDependencies` (SUP-001 passes); devDependencies are exact pins, including `tsrs@0.20.1-ts7.1.0-beta`, `@biomejs/biome@2.6.4` and `typescript@7.1.0-beta` for the drift job, or newer exact versions where tsrs's suffix and `typescript` match (SUP-006 passes).
- [ ] Existing reviewed strict compiler/test/quality configs are used unchanged; knip is clean and default-mode tsrs matches pinned tsc diagnostics. Configuration changes return to Gate 1.
- [ ] `pnpm exec biome ci` uses the already reviewed `biome.json`; effective inline gate suppressions are rejected.
- [ ] `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --include-dev-deps --exit-code 1 .` with Trivy 0.76.1 reports 0 findings, and there is no `.trivyignore` (SUP-007).
- [ ] The tsrs platform result for macOS arm64, linux x64 and linux arm64 is recorded in the PR (VERIFY in spec §5.4).
- [ ] A build produces `dist/cli.js`, the `bin` target, with a `#!/usr/bin/env node` shebang; `dist/` stays gitignored.
## Enforcement evidence

- [ ] Before merge, the pre-wired G9 verifier replays the candidate tests against base and candidate, accepting a missing-behavior/assertion failure but rejecting syntax/config/tool failures. No historical red commit is required.
- [ ] All applicable raw gates actually execute before this merge on all three platforms, including the reviewed/checksummed arm64 Archgate build; metadata-only checks or arm64 `n/a` do not satisfy this criterion.
- [ ] First measured duplication/mutation scores, scopes, tool/config identities and survivors are reviewed on this head and recorded for the baseline follow-up; initialization is not represented as a comparison with nonexistent prior code.
- [ ] `AGENTS.md` and `docs/agents/` exist as written by `setup-matt-pocock-skills`, with no Pocock file modified.
- [ ] This PR edits no protected policy input; any tightening obeys metric direction. Initial raw CI, not merely the old two-job M1 checks, is green.

Start only after the Gate 1 checklist is evidenced; then write the CLI version fixture before implementation.
