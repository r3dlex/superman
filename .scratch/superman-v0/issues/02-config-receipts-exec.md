# 02: Config, receipts and the exec boundary

**Milestone:** M3

**What to build:** Validate strict JSON using the hand-written config/schema contract in spec §5.3 and write deterministic receipts (§5.5/§5.10). Cover protected fields, declared test/support/runtime/profile inputs, App IDs/repository scope, required check origins, verified-project typechecking and safety/cache settings. Explicit test files use `gates.test`; `gates.testRelated` is for source-file selection. All product spawning uses `Deno.Command` through `src/exec.ts`, with explicit argv/no shell interpolation; resolve Git metadata paths correctly in worktrees.

**Blocked by:** 01, spec/superman-v0-baselines

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Config validator rejects unknown keys, wrong types and shell strings in gate commands (argv arrays only), with one line per error and exit code 2.
- [ ] Config/lock/receipt schemas exist and are included in the source/compiled release allowlist; source/binary consumers resolve identical bytes independently of cwd, without npm installation.
- [ ] Receipts have sorted keys, `schema: superman.receipt/1`, and differ between two runs only in `startedAt`/`durationMs` (golden-file test).
- [ ] A policy-defined disabled/inapplicable gate is recorded as `n/a`, never `pass`; missing tools or reports cannot select that outcome. Stage/applicability fixtures distinguish partial pre-commit feedback from the full local/CI quality contract.
- [ ] Only the exec module may spawn with `Deno.Command`; other product spawn APIs, including `node:child_process`, fail the already-installed SUP-002 policy. Process fixtures prove explicit argv/cwd/child env, bounded output, timeout/signal/descendant cleanup and concurrent-worker isolation.
- [ ] The product reader round-trips §5.3's distinct bounded/product/broad records and compares equivalent mutation populations, with new source measured separately and absent accepted profiles uninitialized. Lower duplication/higher mutation tighten an existing comparable profile with counts/provenance refreshed atomically; profile/metric addition, deletion, scope changes or new dispositions require Gate 1.
- [ ] Proposed and approved-base reads reject unsupported schemas/fields, same-path wrong source bytes, missing reports, inconsistent counts/scores, stale dispositions and failed overall evidence even when G6 passed. `qualityInputsHash` remains policy/checker/tool-model identity; source/test/fixture/dependency content, revisions, actual runtime/platform/tools and report/receipt/producing-run provenance are bound separately. Equivalents and confirmed Timeouts retain raw status and denominator (§5.3–5.4).
- [ ] PR receipts distinguish H/B/M/evaluated SHA and per-gate/target cache outcomes; worktrees with a `.git` file write only to resolved Git metadata.
- [ ] §5.5/§8 execution-identity fixtures bind requested/selected existing self-hosted profiles, actual runner/group/selectors/native platform, runner software and available image/provenance or dated native-environment/tool inventory to the run/attempt. Unknown required facts cannot fabricate readiness; do not invent an image digest, hosted route or VM attestation. Local evidence is supporting, not remote admission proof. Golden tests use fixed inputs, not invented fleet values.
- [ ] Config/lock/receipt contracts bind actual Deno versus real Node tool hosts, source/compiled execution, executable/content, Deno/V8/bundled-TypeScript/target, entrypoint/argv, config/capability/env/declaration/asset hashes and applicable compile/denort/artifact provenance (§5.10). Missing required identities fail validation/admission; historical records are not upgraded by assuming defaults. Skill-lock updates cannot discard these fields.
- [ ] Protected quality inventories/critical mappings/severities/cohorts and complete gate outcomes follow the already-approved §5.3–5.5 contract. Missing/empty/stale/malformed reports, ignored errors, wrong-source results or skipped required work block through the public receipt/CLI seam; raw coverage/mutation counts and structural advisories remain distinct. This implements the proved bootstrap contract rather than redefining it in a ticket.

Start with invalid-config and H/B/M receipt fixtures through the CLI seam.
