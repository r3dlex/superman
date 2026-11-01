# 24: Complete-provider activation and restricted writer wiring

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Init/doctor/CI adoption of the complete v0 provider set, verified-project typecheck settings and conservative safety/cache contract (spec §5.7–§8). Render GEN-002 in target repos with a local reviewed why-ADR under configured paths; retain SUP-008 locally. Main selects all with eligible reuse, nightly is uncached, and separate data-only writers—not install/test/build jobs—hold Environment credentials. Doctor reports graph verification/fallback, cache quarantine and latest safety evidence, not just active tool names.

**Blocked by:** 14, 15, 16, 17, 18, 19, 20, 21, 22, 23

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-affected` installs protected config/workflows, check identities, privacy, retention and separate writers after manual R2/key/Environment setup and §8.4's actual existing self-hosted native-platform/environment/tool/access evidence and authorization. Partial historical fleet observations cannot activate a privileged role; missing relevant facts block without hosted substitution or a new VM platform. Initial runs safely execute uncached full until a trusted main/nightly audit supplies a ledger bound to the merged policy. That selection/reuse safety fallback does not change runner routing. Then prove actual conservative-selection activation; complete reviewed activation remains a release prerequisite, without inventing a pre-merge future-policy ledger.

- [ ] `init` on a polyglot fixture (TS + Rust + Elixir) writes providers `["ts","rust","elixir"]`, and re-running it gives no diff (test-first).
- [ ] The rendered workflow passes SUP-008; removing its `schedule:` makes SUP-008 fail; adding a raw `vitest run` step makes SUP-008 fail.
- [ ] `doctor` on a fixture with only glob mappings prints a warning and exits 0.
- [ ] A gate change runs its selected unit tests and all broadly declared CLI-process tests, with honest reason chains; no false “only this gate’s tests” promise.
- [ ] Target policy is GEN-002 linked to an existing local adoption ADR; alternate why/glossary paths work without copying Superman-only source paths.
- [ ] Verified compiler projects are scoped; unknown graph/argv falls back to full typechecking. Runtime Markdown inputs are not ignored.
- [ ] Project-execution jobs lack writer/publisher authority. Separate main writers validate data provenance; PRs never receive secrets/write remote, and stale/missing safety evidence forces uncached full execution.
- [ ] **(M1 amendment 4)** Preserve the controlled Lefthook adapter/static config and lifecycle suppression when regenerating CI/init. Later M7c follow-ups add fresh G12 and a separately restricted existing wiki-lint environment without giving agent write credentials to PR jobs/cache writers; preserve already-adopted settings on re-run.
- [ ] Init/doctor/template fixtures select only reviewed currently available self-hosted environments and approved exact-pinned job-local tools (§8/ADR 0015). Unresolved required route/platform/environment/tool/access facts block; no invented selector/image digest, hosted exception or VM/image provisioning is generated. Reruns preserve approved routes; labels do not implement failover, and owner name alone is not adoption evidence.
- [ ] Every selected existing route preserves native macOS arm64/Linux x64/Linux arm64, gate applicability/coverage floors and uncached full nightly. Receipt/cache wiring binds actual execution inputs; missing/skipped/neutral/cancelled legs cannot hide behind alternative-job success. Operator evidence establishes the restricted existing writer credential/access boundary before activation, not fake tests or a new worker-disposal project.
- [ ] Render/adopt already-reviewed Deno launch/config/capability/declaration/runtime/asset inputs and real Node tool-host identities consistently in init/doctor/receipts/selection/cache. Direct Deno test/task/run bypass fixtures retain tests-through-Superman policy. No optimization activates before its complete runtime/input model and trusted fresh-ledger evidence exist; missing required profile approval is not cured by uncached execution. Source/binary routes and Deno-operated writers keep distinct verified identities (§5.10).
- [ ] Activate each narrowing provider only with its conservative supported-profile conformance evidence; otherwise retain full required-target selection. Full-corpus G5, fresh critical acceptance and complete overall coverage do not shrink with selected ordinary tests. Fixtures prove first-miss/stale-pass quarantine, input invalidation and reviewed-fix/fresh-full recovery; missing local required Trivy or incomplete quality accounting blocks the full pre-PR/CI result.

Start with an adoption fixture using a non-default ADR directory and a signed-but-stale safety ledger; it must render traceable policy and keep optimization off.
