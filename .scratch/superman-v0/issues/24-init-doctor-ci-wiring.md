# 24: Complete-provider activation and isolated writer wiring

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Init/doctor/CI adoption of the complete v0 provider set, verified-project typecheck settings and conservative safety/cache contract (spec §5.7–§8). Render GEN-002 in target repos with a local reviewed why-ADR under configured paths; retain SUP-008 locally. Main selects all with eligible reuse, nightly is uncached, and separate data-only writers—not install/test/build jobs—hold Environment credentials. Doctor reports graph verification/fallback, cache quarantine and latest safety evidence, not just active tool names.

**Blocked by:** 14, 15, 16, 17, 18, 19, 20, 21, 22, 23

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-affected` installs protected config/workflows, check identities, privacy, retention and separate writers after manual R2/key/Environment setup. Its initial runs safely fall back to uncached full execution until a trusted main/nightly audit produces a ledger bound to the merged policy. Then prove actual selection activation; this complete reviewed activation is a release prerequisite, not a claim that a future-policy ledger existed before merge.

- [ ] `init` on a polyglot fixture (TS + Rust + Elixir) writes providers `["ts","rust","elixir"]`, and re-running it gives no diff (test-first).
- [ ] The rendered workflow passes SUP-008; removing its `schedule:` makes SUP-008 fail; adding a raw `vitest run` step makes SUP-008 fail.
- [ ] `doctor` on a fixture with only glob mappings prints a warning and exits 0.
- [ ] A gate change runs its selected unit tests and all broadly declared CLI-process tests, with honest reason chains; no false “only this gate’s tests” promise.
- [ ] Target policy is GEN-002 linked to an existing local adoption ADR; alternate why/glossary paths work without copying Superman-only source paths.
- [ ] Verified compiler projects are scoped; unknown graph/argv falls back to full typechecking. Runtime Markdown inputs are not ignored.
- [ ] Project-execution jobs lack writer/publisher authority. Separate main writers validate data provenance; PRs never receive secrets/write remote, and stale/missing safety evidence forces uncached full execution.
- [ ] **(M1 amendment 4)** Preserve the controlled Lefthook adapter/static config and lifecycle suppression when regenerating CI/init. Later M7c follow-ups add fresh G12 and an isolated wiki-lint runner without handing agent write credentials to PR jobs/cache writers; do not erase those already-adopted settings on re-run.

Start with an adoption fixture using a non-default ADR directory and a signed-but-stale safety ledger; it must render traceable policy and keep optimization off.
