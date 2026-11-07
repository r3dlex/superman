# 01: Deno skeleton under pre-wired raw gates on three OSes

**Milestone:** M2

**What to build:** The first usable CLI skeleton and process-boundary tests, evaluated before merge by the raw checks already installed at Gate 1. Policy configs/pins, G9 replay scripts and the CI matrix are prerequisites in spec §17, not code that this ticket adds and activates after its own merge. Measure first-source duplication/mutation baselines for review; do not invent a repository floor or require a red commit. Run Pocock's repo setup without changing upstream skill files.

**Blocked by:** Gate 1 bootstrap

**Status:** blocked

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-baselines` commits the exact approved first measurements before ticket 02 or another source ticket proceeds. The initial matrix, configs, pin checks, protected-input/SUP-005 enforcement and raw G9 scripts belong to the earlier Gate 1 bootstrap, not this follow-up.

**Reconciled quality/CI plan:** spec §8/ADR 0015 do not admit this ticket or delegate runner setup to it. Before admission, verify the chosen existing self-hosted environment/native-platform/tool/access identities (§17); labels and partial historical runner observations are not current acceptance. No hosted fallback, new VM/image platform or external admission App is a prerequisite or substitute. Required check names remain unchanged. The registered arm64 asset's source/build/redistribution acceptance, fresh three-platform evidence and applicable undersized-corpus blockers remain open, with historical failures preserved.

**Deno amendment:** Gate 1 must first port/prove operational bootstrap, rule/protected-input support, exact stable runtime/capability profiles, supplemental Deno checking, meaningful replay, mutant propagation/worker isolation and complete four-metric coverage (§5.10/§17, ADR 0016). This ticket consumes that evidence; it cannot implement or activate its own evaluator. No numerical Deno pin, profile or platform pass is established by planning. Gate 1 admission is judged on the evidence produced, not on the internal correctness of the measurement tooling that produced it ([ADR 0018](../../../docs/adr/0018-admission-evidence-not-tool-correctness.md)).

The [completed SUP-005 slice](../gate1-preparation.md) supplies bounded current-Node comment-namespace evidence only. It is not a remaining syntax implementation assigned to this ticket, nor proof that the standalone collector or actual Deno integration is complete. Preserve its evidence and every other Gate 1 blocker.

## CLI and build

- [ ] The approved source launcher executes actual Deno: `superman --version` prints the reviewed version and exits 0 through Node-hosted Vitest's public process seam; tests run red locally, then green before committing. No operational Node fallback or Node-version-label impersonation.
- [ ] `package.json` still has empty `dependencies`, `optionalDependencies` and `peerDependencies` (SUP-001 passes); devDependencies are exact pins, including `tsrs@0.20.1-ts7.1.0-beta`, `@biomejs/biome@2.6.4` and `typescript@7.1.0-beta` for the drift job, or newer exact versions where tsrs's suffix and `typescript` match (SUP-006 passes).
- [ ] Existing reviewed strict compiler/test/quality/runtime profiles are used unchanged; knip is clean, primary tsrs and complete-graph supplemental `deno check` pass, and matching pinned tsc remains the drift reference. Configuration/pin/declaration changes return to Gate 1.
- [ ] `pnpm exec biome ci` uses the already reviewed `biome.json`; effective inline gate suppressions are rejected.
- [ ] `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --include-dev-deps --exit-code 1 .` with Trivy 0.76.1 reports 0 findings, and there is no `.trivyignore` (SUP-007).
- [ ] The tsrs platform result for macOS arm64, linux x64 and linux arm64 is recorded in the PR (VERIFY in spec §5.4).
- [ ] Source invocation from an unrelated cwd uses anchored owned inputs/assets and the approved noninteractive configuration/environment profile. Missing/wrong runtime and permission/setup failures are launch/tool errors, never G9 feature-red evidence. No npm bin, installer or automatic dependency download is added; production source/binary bundles land in 33.
## Enforcement evidence

- [ ] Before merge, the pre-wired G9 verifier replays the candidate tests against base and candidate, accepting a missing-behavior/assertion failure but rejecting syntax/config/tool failures. No historical red commit is required.
- [ ] All applicable raw gates actually execute before this merge on all three platforms, including the reviewed/checksummed arm64 Archgate build; metadata-only checks or arm64 `n/a` do not satisfy this criterion.
- [ ] Chosen existing self-hosted routes have §8's actual approval/platform/tool/access evidence. Each required leg enforces §5.4's independent 90% overall coverage floors (100% target); nightly remains uncached full on all three platforms. Missing capacity/evidence blocks without hosted substitution or a new VM project. Runner activation is earlier Gate 1 work, not part of this ticket.
- [ ] First measured full-corpus duplication/equivalent-scope mutation scores, scopes, tool/config identities and raw survivors are reviewed on this head and recorded for the baseline follow-up. Critical first measurements follow André's reviewed survivor treatment; unresolved introduced critical Survived/NoCoverage outcomes cannot hide behind initialization or aggregate gains. No nonexistent prior baseline or universal new floor is invented.
- [ ] Measurements execute instrumented Deno source under the already-proved mutation/coverage mechanism, bind actual source/runtime/profile/tool identities, and include the complete current Deno/retained-Node/rule inventory. An old Node score or direct Node import test cannot satisfy this evidence.
- [ ] `AGENTS.md` and `docs/agents/` exist as written by `setup-matt-pocock-skills`, with no Pocock file modified.
- [ ] This PR edits no protected policy input; any tightening obeys metric direction. Full local pre-PR and initial raw CI enforce the same already-proved quality contract, including required Trivy, fresh critical cases and complete result accounting. Missing tools, skipped required work or incomplete reports block; neither old two-job results nor partial pre-commit feedback are a full pass.

Start only after the Gate 1 checklist is evidenced; then write the CLI version fixture before implementation.
