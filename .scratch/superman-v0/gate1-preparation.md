# Gate 1 preparation — bounded follow-on execution

**Status:** see [Current state](#current-state) for the live status. The G1–G4 bounded SUP-005 slice is locally implemented, verified and independently reviewed; Standards and Spec each report zero unresolved findings. This is not ticket 01, strict readiness or evaluator activation.

## Current state

**Updated 2026-11-05.** This is the only part of this record that must stay current. Everything under [History](#history) is a dated record and is not edited; the closure checklist and the execution prompts above it are the plan.

| | |
| --- | --- |
| Steps 1–7 | **All accepted.** Steps 1, 2, 4, 6 and 7 on 2026-11-02; step 3 on 2026-11-04; step 5's independence clause on 2026-11-04. |
| Rows 8–11 | **All accepted 2026-11-06**, at preparation scope, on their recorded evidence, with their carried limits carried. Row 12 is **not** accepted — its criterion needs the operator lanes. |
| Step 7's overlap clause | Not met at the declared profile — carried, not waived. It feeds row 10's conformance decision, not row 8. |
| Row 8, current-Node inventory/measurement expansion | **Accepted 2026-11-06** at preparation scope. The shipped `node` inventory clears every floor (96.03 / 95.29 / 90.32 / 96.86 %, receipt `verdict: "pass"`); the candidate inventory's floor is carried to the merge-bound cutover. |
| Row 9, governing Deno rules/input closure | **Accepted 2026-11-06** at preparation scope. All six clauses met; the repository's strict Archgate run is green at `"total": 16`, and the four bypasses are re-tested and rejected. |
| Row 10, full raw quality contract | **Accepted 2026-11-06** at preparation scope. Clauses 1–5 met, and clause 6's **mechanism** is in place — eight declared critical cases, Vitest-visible, mutation-selected and fixture-proved — with the survivor rule now identity-based. The enforcement core's *first* mutation baseline stays not due, by the row's carried limits; **the lane that carries it is now named (2026-11-07): the nightly's uncached full run and the owner's reviewed run**, while the pull-request leg applies the declared pull-request mutation scope and the declared critical cases. §5.4's pre-commit scope is closed; G2's affected-target selection waits for §5.7's change model. |
| Row 11, incremental parallel operational port | **Accepted 2026-11-06** at preparation scope. Staged-scope parity with the Node original, 79 Deno tests green; clause 6 **resolved by a stated scope** now written into spec §5.4 with its date; and the sibling's G2 runs its own `deno check` over the Deno graph. |
| Ticket 01 | **Unadmitted.** Blocked by the Gate 1 bootstrap. |
| Deno evaluator | Not activated. The current Node bootstrap remains the active evaluator. |

**Next action.** The pull-request leg's mutation scope and the nightly's full-corpus lane are in (2026-11-07): the pull-request leg applies the declared `quality.mutation.pullRequestScope`, the nightly and the owner's run apply the whole declared `quality.mutation.scope`, and the measurement-inputs check is anchored to the baseline. What remains is the measurement itself: the full-corpus run's receipt and its raw survivor list, which §5.4's first-measurement survivor treatment needs before activation/merge. The acceptance round stands as recorded: André accepts or rejects rows 8–11 on their recorded evidence. Row 12 is **not** presented — its criterion needs the three native candidate proof runs, the live forge evidence and the publication, which are operator lanes. The two independent reviews (Standards and Spec, run in parallel) are in; their findings and their resolutions are recorded under rows 10 and 11. Rows 1–12 all stay on the critical path to ticket 01.

**Rules of record.** [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md) decides how a preparation step is judged — read it before starting a step. [The grilling record](gate1-grilling-record.md) holds the reasoning behind those decisions; [the loop diagnosis](gate1-loop-diagnosis.md) holds why three attempts circled, and `gate1-loop-check.mjs` reports whether the last three attempts measured anything (exit 1 means they did not).

**Environment notes.** **The pinned Archgate 0.61.0 binary is gone from this machine's temporary directory** (2026-11-07). The npm shim in `node_modules` is version 0.61.0 but caches its platform binary at `~/.archgate/bin/archgate` *without the version in the path*, so it reuses a stale **0.43.0** binary; the rule suites that need the pinned engine therefore fail with `G1: missing tool: …` or the 0.43.0 `ctx.ast is not a function` failure. The continuous-integration job installs the pinned binary from the digest-verified asset (`.superman/ci/tool-assets.json`), so the hosted runs are unaffected; the local suites that depend on it cannot be green until the binary is reinstalled. `cp` is interactive in this environment — `cp` over an existing file prompts `cp: overwrite …? (y/n)` and silently leaves the target unchanged when stdin is not a terminal. Any "restore the file" step must use `command cp -f`, and must be verified with `git diff` rather than trusted. `ARCHGATE_BIN` must point at the pinned 0.61.0 binary; without it the rule suites fall back to the 0.43.0 npm shim and fail 47 tests with `ctx.ast is not a function`. `.serena/` (another actor's untracked directory) contains a nested `.gitignore` that the runtime-code guard reads as a runtime program; it must be moved aside for a local gate run. **The suites used to fail with `kill EPERM` under heavy parallel load**, and the cause was the code, not the environment: the owned-child group cleanup tolerated `ESRCH` but not `EPERM`, so a best-effort kill of an already-dead process group aborted an otherwise-successful gate run. The child and its descendants run as this user, so `EPERM` means the group id now names a group this user does not own — the recycled-id case, where nothing of ours survives — and it is as unactionable as `ESRCH`. The Node original now tolerates both. If a suite still fails that way, re-run it alone before concluding that a change broke something. **`node --version` can carry a version-manager shim's own log line on stdout** — the `proto` shim on `PATH` has printed an NDJSON line before the version, which corrupted the Deno sibling's Node-version probe and made it report a pin mismatch while the Node original passed. The probe now reads the last line that is exactly a version. **Check Biome over the whole repository, not over a convenient subset.** `node_modules/.bin/biome ci` is what the full scope's G10 runs and it is what the whole repository must be clean under; `biome check <the files this slice changed>` is a weaker check that hides errors in the files nobody looked at. Three times in this preparation an error-severity Biome diagnostic shipped because the check was run on a subset — twice on the files a round had just changed, once on two files from an earlier round that nothing had re-checked since. The repository is now clean under `biome ci`: 0 errors, 0 warnings. **`pnpm exec biome` aborts with "Linter process terminated abnormally (possibly out of memory)" — but that is a `pnpm exec` artifact, not a Biome failure.** `node_modules/.bin/biome check` runs in about 120 ms on a single file and on the whole repository, and reports real findings. Use it, and treat its findings as real: a slice whose Biome leg is red has formatter or lint errors to fix, not an environment excuse.

## Intake and scope

- User requested execution of the proposed three-stage flow: remaining-frontier interview → one explicitly approved protected preparation slice using Matt's TDD/implementation flow → independent Standards + Spec review.
- Starting HEAD: `12ea1dada7878dd783902a4eae73133f49f12f8c`, branch `spec/superman-v0`.
- Snapshot: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-preparation-9deegjql/`. It preserves all 119 intake tracked/untracked files, hashes/status in `baseline.json`, and staged/unstaged patches. No staged changes existed.
- All existing Deno planning documents/ticket edits, the separate code-quality interview/research and other work are intake state for this phase. Preserve them; review this phase against these bytes, not merely HEAD.
- The earlier Deno record's no-implementation statements describe that completed planning phase. They are not a claim about this separately requested follow-on execution.
- Read the actual installed `grill-with-docs`, `grilling`, `domain-modeling` and `research` definitions, the domain formats and TDD test/mocking references. Preserve vanilla skill files and the upstream pin. Local tracker remains `.scratch/superman-v0/`; no parallel product backlog or default readiness assignment.

No commits, pushes, installations, credentials, infrastructure/hosted operations, approvals/merges or activation are authorized. Product work remains blocked. A local implementation requires a separately confirmed narrow slice, file scope and public testing seams; missing tools/evidence are blockers, not permission to install or bypass.

## Decision frontier

- **G1 — confirmed through an OpenCode popup:** allow one narrowly approved, non-activating local Gate 1 preparation slice under the current Node evaluator. Do not take over the unfinished strict-admission interview, weaken its target, claim strict readiness, switch evaluators or admit ticket 01. Resolve only conflicts/prerequisites that govern this slice; preserve other blockers.
- **G2 — confirmed:** the initial preparation slice rejects the Deno coverage-ignore directive family in real code comments while preserving inert strings/documentation examples. Conservative prevention may include unsupported suffix variants; this is not a claim that every rejected spelling is an effective native Deno pragma. No Deno execution or activation follows.
- **G3 — confirmed:** commits/staging are permitted only inside owned disposable fixture repositories. No such operation is permitted in Superman or another real checkout. Test execution uses temporary HOME, controlled tools and sanitized outer environment without real credentials; this is test hygiene, not proof of OS isolation.
- **G4 — confirmed:** implement the exact five-file SUP-005 slice below with the existing public process and exported-rule seams, TDD, regression/type/lint checks, evidence and independent Standards + Spec review. Lowercase ASCII-hyphenated `deno-coverage-ignore` at the start of a real JS/TS comment line is the forbidden family, including block/JSDoc prevention cases and unsupported suffix variants. Inert quoted/template/regex text and Markdown examples stay permitted; actual comments inside expressions remain inspected. No collector/runtime port, new ticket, status change or activation.

[Primary-source research](deno-suppression-research.md) identifies four exact native directive words, with `-stop` rather than `-end`, line-comment/first-word/positioning requirements and no c8/Istanbul/v8 aliases in the inspected native parser. It distinguishes those facts from the broader prevention policy selected in G2. Its immutable runtime source is a research reference, not a selected Superman pin or executed Deno result.

## Approved preparation contract (`to-spec` synthesis)

The actual installed `to-spec` definition was invoked after G4. Existing spec §17 already requires the SUP-005 extension; no new canonical architecture decision, product spec, numbered ticket or readiness label is needed. This record carries only the explicitly approved preparation scope, not a competing product specification.

**Problem/solution:** current SUP-005 does not reject Deno coverage-ignore comments. Extend its already-reviewed JS/TS comment inspection and unsuppressible diagnostics, preserving existing tool semantics and all parser fail-closed bounds. No new parser, dependency, runtime launch or exemption.

**User story:** as André, I want Deno coverage-ignore annotations rejected before runtime migration, so future source cannot weaken coverage through a pragma while genuinely inert examples remain usable.

**Acceptance:** the native four directive spellings, inline comments, range endpoints, real expression comments and declared broader block/suffix cases yield public SUP-005 violations at the correct source locations. Plain mentions, literals, template raw text, regex bodies and Markdown examples remain inert. Existing Archgate/Biome/Trivy behavior and unsuppressible diagnostic properties remain. Real pinned-Archgate fixtures prove integration; supplemental actual exported-rule tests observe findings and make changed branches measurable, not private helper behavior. Record a genuine red-before-green command and final checks with actual tool/source identities and limitations.

**Existing-file allowlist:**

1. `.archgate/adrs/SUP-005-no-inline-suppression.rules.ts`
2. `.archgate/adrs/SUP-005-no-inline-suppression.md` (retain its existing `Source:`)
3. `.superman/ci/archgate-policy.test.ts`
4. `.superman/ci/rule-coverage.test.ts`
5. `.superman/ci/SUP005-tdd.md` (append, do not rewrite historical evidence)

The only new repository files for this phase are this preparation record and `deno-suppression-research.md`. Preserve all intake Deno/code-quality planning documents and ticket states unchanged. The standalone coverage collector, c8/v8/Istanbul/Node suppression handling, other rule families, package/lock/config/workflows and product source are outside this slice. In particular, no claim that the collector itself rejects Deno directives or measures Deno is introduced.

**Verification arrangement:** use existing real Node 26, independently checksum-matched Archgate 0.61.0, installed exact checker/lint tools and pinned pnpm where needed—not ambient old shims or any automatic download. Temporary fixture Git operations use G3's narrow permission; actual Superman HEAD/index must remain unchanged. Raw full-driver admission rejects a dirty checkout, so preserve the dirty planning work and report that limit rather than staging/committing it to manufacture a pass.

Other runtime artifact/grant/launch/measurement/platform/isolation and independent-admission decisions do not govern this syntax-only slice; their unresolved status is preserved before activation/product admission. The glossary terms remain unchanged, and no new why ADR is needed for an already-required no-waiver extension.

**`to-tickets` reconciliation:** invoked the actual installed definition after synthesis. G4 approved one complete public scan→diagnostic→fixture/evidence preparation slice, already a §17 prerequisite. No numbered product ticket is necessary or authorized; no existing ticket field, dependency or readiness label changes. The implementation stays on the existing spec-kind preparation surface rather than introducing the gate inside ticket 01 or creating a parallel backlog.

## Evidence boundary

The syntax-only implementation reuses the existing source-comment collector and unsuppressible diagnostic. JS/TS comments receive the Biome and Deno patterns together; JSON remains Biome-only and HCL remains Trivy-only. Public pinned-Archgate process fixtures and supplemental exported-rule callbacks cover the declared namespace and inert controls. The genuine file-pragma red–green cycle passed; a second source-backed regression reproduced and closed the U+0085 whitespace gap. Independent Standards and Spec agents each then found that U+0085 before a JSDoc star bypassed normalization; a third genuine process RED→GREEN cycle closed it in the Deno matcher only. Biome/Trivy normalization was not broadened. Two malformed initial fixture sources were corrected without relaxing policy and are not counted as policy RED evidence. Exact commands, outcomes and source identities are recorded in [SUP005 evidence](../../.superman/ci/SUP005-tdd.md).

The pre-correction full bootstrap run passed all 441 tests without skips, but the collector correctly exited 1 (`Coverage inputs changed; caller changes were preserved`) rather than publishing coverage: the concurrent code-quality interview changed while checks ran. That interview is preserved and excluded from this slice's review; its latest bytes are not taken over here. Final verification used an owned frozen temporary 121-file fixture snapshot with source/policy hashes bound back to this checkout, using only G3's disposable-fixture Git permission. It passed **442 tests, 0 failed/skipped**, and overall coverage of **96.4% lines, 95.44% statements, 92.48% branches, 96.15% functions**. Each existing 90% floor passes; the 100% target remains unmet and unchanged. Its receipt describes only disposable fixture commit `9d7b2f05638d86e0db05ec9533c692e6ae684017` on darwin-arm64, not real-checkout raw admission. The real raw driver explicitly refused the dirty checkout; no real staging/commit is used to manufacture a pass. Exact commands, hashes, counts and the retained Node experimental warning are in the appended evidence.

Final real-checkout checks passed 41 process tests and 49 supplemental callback tests, regular/final typechecking, repository Biome CI (39 files, warnings treated as errors), strict Archgate (8 evaluated rules) and owned-file diff whitespace checks. Source, tests and non-Markdown policy still match the measured snapshot. The historical evidence prefix, actual HEAD/empty staged diff, declared skill pin and unrelated intake files remain preserved; only the separately evolving interview differs outside this slice. No installed skill body/reference was edited.

Final independent closure: **Standards — two findings resolved, zero open; Spec — P2/P3 resolved, zero open.** Each reviewer checked the completed evidence independently and confirmed the combined whitespace/star correction and earlier-source attribution fix. The review compares only the five changed existing files and two new notes against the captured intake; it does not approve the unrelated interview or confer live authority. All work remains uncommitted in the real repository.

Only current-Node local test/type/lint execution is in scope. No Deno runtime probes, migration, standalone collector change, evaluator activation, independent-execution claim, three-platform acceptance, hosted CI, complete Gate 1 readiness or merge authority follows. Historical evidence retains its original revision/platform scope. The unfinished strict-admission interview and all product-admission blockers remain unchanged.

## Gate 1 closure planning — 2026-11-01

**Status: closure planning confirmed after Q1–Q6; all execution steps remain open.** André confirmed the planning direction and requested the end-to-end Matt execution prompts below. This section plans the remaining work solely to admit ticket 01. The completed G1–G4 history above retains its original scope. No implementation, artifact provisioning/execution, installation, staging/commit, push, hosted change or evaluator activation is authorized by this planning phase.

Planning intake: `spec/superman-v0`, HEAD `12ea1dada7878dd783902a4eae73133f49f12f8c`, with inherited tracked and untracked changes. Preserve that work. Each future implementation slice needs its own exact file/seam/command approval and an intake-relative review that includes additions; an empty committed diff is not a review of a working-tree candidate.

During this documentation pass, another actor advanced the checkout to `62c8495aeffa33d827c481e661f6083f8bc718d4` (`spec: publish Gate 1 Deno and quality preparation without activation`). Read-only inspection found that the inherited preparation was committed, while this closure appendix remains a working-tree addition. This session made no Git write. Treat the older statements about uncommitted preparation as historical; rebind future execution/review/publication to the actual current head and intended delta. The concurrent commit is not proof of new CI, artifact acceptance, runtime activation or current write authority.

**Next action:** see [Current state](#current-state).

### Confirmed closure-interview decisions

These Q numbers belong to this closure interview, not the earlier Deno or quality interviews.

| Decision | Confirmed planning choice and reason |
| --- | --- |
| Q1 | Use the official Deno/denort `v2.9.8` candidate for later feasibility, not the Homebrew bottle, so artifact-sensitive evidence targets the proposed upstream inputs. This does not accept a pin or permit provisioning/execution. |
| Q2 | Investigate an OS-native `env -i` boundary with approved absolute paths first for source/bootstrap, generated hook and compile fixtures. Prove explicit executable/argv, hostile startup, paths/shebangs and signal behavior; do not introduce an operational Node launcher, tracked shell/Python helper or another compiled launcher by default. |
| Q3 | Verified upstream release origin/integrity may support separately authorized temporary candidate use, with an explicit provenance-gap inventory. Final source/build-provenance acceptance remains blocking; a release attestation is not relabeled build provenance. No mandatory SLSA format is introduced. |
| Q4 | After feasibility, plan a separately approved expansion of current Node measurement/protection/compiler inventories before materializing the parallel Deno successor. This changes active measurement policy, not operational runtime dispatch. Both inventories remain visible to applicable quality checks. |
| Q5 | Plan merge-bound operational cutover: Node remains the required evaluator through final exact-head Gate 1 review; candidate Deno proof is separately authorized and distinct from admission. Fixture-prove the approved-base/merged-policy transition before publishing workflow changes. No environment/file-presence/availability switch or Node fallback. |
| Q6 | Preserve and port the existing Archgate builder/publication helper functionality rather than retire it. This does not authorize building, republishing, invoking the wizard or changing its hosted workflow now. Existing required-tool provisioning also needs a Deno orchestration port. |

### Evidence carried forward, without promotion

| Existing evidence | Accepted scope of the record | What it does not close |
| --- | --- | --- |
| [Combined reconciliation](code-quality-planning.md) | Completed document/backlog alignment and independent two-axis document review | Executable quality/Deno integration or admission |
| G1–G4 above and [SUP-005 evidence](../../.superman/ci/SUP005-tdd.md) | Completed local Node-evaluated comment-namespace prevention and its recorded frozen-fixture checks | Actual-Deno collection, current dirty-checkout raw admission or native matrix |
| [Launch evidence](deno-launch-evidence.md) | Nine local launch-driver cases against the observed darwin-arm64 Homebrew binary | Accepted official artifacts, a portable operating launcher, grants, checker/mutation/coverage or three-platform proof; tooling-enforced formatting was not supplied by the quoted review |
| [Artifact candidate](deno-artifact-candidate.md) | Named release/source identity and six published archive digests | Downloaded-byte/executable verification, verified signature, declaration closure, compile-runtime consumption or pin acceptance |
| [Registered Archgate arm64 check](../../.superman/ci/bootstrap-evidence.md#registered-linux-arm64-replacement--independent-check-2026-11-01) | Published/registered asset and recorded checksum integrity | Hash-bound source/build/test acceptance and human redistribution disposition for that exact replacement |

### One finite closure checklist

Step identifiers below are preparation steps, not numbered product tickets. All execution rows remain open. The order is recommended execution order; the dependency column defines actual blocking edges. Each implementation slice closes with scoped checks and independent Standards + Spec review, preserving failed attempts and source identities.

| Step | Missing work/category | Depends on | Observable completion |
| --- | --- | --- | --- |
| 1 | **Measurements + later human acceptance:** verify official candidate inputs | Separate provisioning/tool/access authority | Bind each archive and extracted executable to the named release/source; verify release origin/integrity; record source/build-provenance gaps, target constraints and matching declaration origin/closure/license. Q3 permits only bounded temporary use, not admission. |
| 2 | **Implementation + measurements:** OS-native startup-boundary pilot | 1; approved exact temporary profiles/grants | Actual source, hook and compiler launches neutralize hostile inherited startup controls before full Deno entry. Test ambient config/package/lock/import-map discovery, explicit executable identity, unusual paths, launch failures/signals and route-specific behavior. Node parent sanitization alone is not credited to this boundary. |
| 3 | **Implementation + measurements:** dual-checker feasibility | 1–2 | A complete tiny entry graph has valid and deliberately invalid/transitive cases under primary tsrs and supplemental Deno checking, with complete matching declarations. Matching tsc remains separate drift evidence. No partial stubs, suppression or relaxed checking hides incompatibility. |
| 4 | **Implementation + measurements:** Deno mutation bridge feasibility | 1–2 | Real pinned Stryker/Vitest reports prove instrumented snapshot loading, pre-load active mutant, per-test counters/hit attribution, a known kill, survivor/NoCoverage controls, concurrent-worker isolation and cleanup. Tool/config/permission failures cannot be credited as kills. |
| 5 | **Implementation + measurements:** complete four-metric Deno coverage feasibility | 1–2 | Bind actual executed transformation/AST/maps to original bytes; independently verify all four counts for loaded, partially hit and wholly unloaded sources, then aggregate disjoint Deno/Node/rule inventories once. Missing expected profiles, stale/aliased/partial data and abnormal children reject. |
| 6 | **Implementation + measurements:** temporary compile/asset substrate | 1–2; 5 before claiming measured-source binding | Actual compilation consumes the verified denort, with explicit build/config/capability inputs and exact asset bytes from unrelated cwd. Wrong runtime/assets/overrides and prompting/escalation fail. Final acceptance includes native execution; this is not binary coverage or product bundle implementation. |
| 7 | **Measurements, then human metric decision:** retained-jscpd conformance | Existing approved tool/execution authority; may run alongside 1–6 | Prove declared minimum-clone/filter semantics, tiny/mixed/empty files, overlaps and changed-to-unchanged clones against a complete inventory. Then review the accounting/metric and baseline-transition contract. No padding, hidden exclusions, percentage clipping or guessed threshold fix. |
| 8 | **Protected implementation:** current-Node inventory/measurement expansion | 3–5; exact Q4 slice approval | Node operational dispatch remains active; explicit checker/Knip/test/protection and complete mixed-runtime measurement support accept supported candidate inputs and reject unmodeled/partial ones. Materialized runtime code cannot hide in excluded probe files. |
| 9 | **Protected implementation:** governing Deno rules/input closure | 2–3; supported inventory model from 8 before operational materialization | Real pinned-Archgate process fixtures prove SUP-001/002/003/006/008 extensions and effective runtime/config/declaration/permission/build closure. Preserve Source links, runtime-neutral rules and completed SUP-005 history; collector-specific suppression checks still need actual integration. |
| 10 | **Protected implementation + measurements + human scope review:** full raw quality contract | Relevant 3–9 evidence; post-conformance decision from 7 | Shared full-local/CI policy rejects missing tools/work/reports and false greens; full local Trivy actually runs. Explicit Biome errors, complete Knip model, separate 15/50/4 advisory reports, protected full duplication corpus and fresh critical cases/mappings are proved. Review enforcement-core first measurements/raw survivors; product baselines remain for 01. Bootstrap reuse stays off. |
| 11 | **Protected implementation:** incremental parallel operational port | 3–6 and 8–10 | Candidate Deno policy/process, gate/replay/quality, coverage and owned helper slices preserve public outputs/receipts/failure/cleanup contracts, with complete inventories and parity fixtures. No candidate module delegates operational work to the old Node graph. Each sub-slice is separately approved and reviewed. |
| 12 | **Measurements + operator/human decisions:** exact-source replacement and transition proof | 11; operator lanes below | Fresh complete local checks and all three native candidate proof runs bind exact source/tools/profiles and H/B/M as applicable. Prove the Q5 transition and raw forge completeness checks before workflow publication. Node required evaluation is not replaced by candidate proof before approval/merge. Final artifact/profile, Archgate and live-setting acceptance are complete. |
| 13 | **Human authority + final verification:** activate, retire obsolete Node operational routes and admit 01 | 12; separate publication/activation authority | André approves the exact final Gate 1 head and merges. Verify the merged-policy Deno route, absence of operational Node fallback and the final declared inventory. Any later contraction/source change needs fresh affected evidence and exact-head review/approval; pre-contraction receipts cannot certify a different tree. Only then may 01 become ready. |

**Feasibility stop:** if the retained tools cannot establish steps 2–7, report the concrete incompatibility for review before the broad port. Do not silently replace tools, weaken floors, invent statement denominators or expand runtime authority. Steps 3–6 may proceed independently after their actual inputs exist; all required feasibility evidence joins before its production integration.

### Proposed exact file surfaces and public seams

Paths marked **new** do not exist yet. These are proposed slice boundaries, not a blanket edit allowance. Approve each exact subset before implementation; additional files need a scope amendment. No product `src/` work belongs here.

**Steps 1–7 — bounded pilots.** Reuse `deno-artifact-candidate.md` for appended artifact evidence and this record for decisions. Proposed protected input declaration: `.superman/ci/deno-substrate.json` (**new**), containing candidate/artifact/declaration identities rather than an assumed accepted pin. Generate pilot subjects, compiler configs, bridge code and assets only inside owned temporary fixtures.

Proposed measurement-driver files (**all new**):

| Step | Exact file | Public seam |
| --- | --- | --- |
| 2 | `.scratch/superman-v0/deno-startup.probe.test.ts` | Actual OS-native launch → actual Deno process outcomes; inherited hostile values reach the boundary under test |
| 3 | `.scratch/superman-v0/deno-checker.probe.test.ts` | Real pinned checker processes/diagnostics over complete temporary graphs |
| 4 | `.scratch/superman-v0/deno-mutation.probe.test.ts` | Real pinned Stryker/Vitest plus Deno → mutation/test/child-outcome reports |
| 5 | `.scratch/superman-v0/deno-coverage.probe.test.ts` | Actual Deno collection/conversion → exact public report counts/inventory |
| 6 | `.scratch/superman-v0/deno-compile.probe.test.ts` | Actual fixture compiler/source/binary processes → identity, asset and failure outcomes |
| 7 | `.scratch/superman-v0/duplication.probe.test.ts` | Real pinned jscpd → raw detection/accounting reports |

These may be bounded real-Node measurement hosts, not operational Node launchers. Assertions observe external outcomes/reports, not private helpers or mock-call counts. Genuine fixture code does not become a hidden implementation home: reusable measurement/operational code must enter the declared measured inventory on integration.

The startup candidate is source-backed, not runtime-proved: the [GNU env manual](https://www.gnu.org/software/coreutils/manual/html_node/env-invocation.html) and inspected [Apple env](https://github.com/apple-oss-distributions/shell_cmds/blob/main/env/env.c)/[split-string implementation](https://github.com/apple-oss-distributions/shell_cmds/blob/main/env/envopts.c) support environment clearing, but split-string variable expansion can occur before clearing. A proposed `env -S` profile must not reintroduce inherited values this way. These references do not identify an installed OS binary or establish native-platform/shebang acceptance.

**Step 8 — proposed inventory/checker support allowance:** `.superman/ci/coverage.ts`, `.superman/ci/coverage.json`, `.superman/ci/coverage.test.ts`, `.superman/ci/bootstrap-coverage.test.ts`, `.superman/ci/bootstrap.json`, `.superman/ci/direct-gates.ts`, `.superman/ci/pr-policy.ts`, `.superman/ci/pr-policy.test.ts`, `tsconfig.json`, `knip.json`, and `.superman/ci/node-hosted-candidate-measurement-host.ts` (**new**, only if the proven design needs that bounded host). Keep complete Node and Deno declaration environments distinct. Introduce supported inventories before candidate runtime files, rather than adding an exclusion.

Proposed successor configuration paths (**new**): `.superman/deno-bootstrap/profile.json`, `.superman/deno-bootstrap/deno.json`, `.superman/deno-bootstrap/tsconfig.json`. Artifact identity lives in the substrate declaration; launch/config/grant policy references it rather than duplicating competing selections. Do not populate guessed defaults.

**Step 9 — exact rule pairs:** `.archgate/adrs/SUP-001-zero-runtime-deps.{md,rules.ts}`, `SUP-002-exec-boundary.{md,rules.ts}`, `SUP-003-no-sh-py.{md,rules.ts}`, `SUP-006-tsrs-typecheck.{md,rules.ts}`, and `SUP-008-tests-through-superman.{md,rules.ts}` in that same directory. Existing public fixtures: `.superman/ci/archgate-policy.test.ts`, `.superman/ci/rule-coverage.test.ts`, `.superman/ci/pr-policy.test.ts`; effective-input work remains in `.superman/ci/pr-policy.ts` and its protected manifests. Supplemental actual exported-rule callbacks do not replace engine fixtures.

**Step 10 — proposed bounded quality sub-slices:**

| Sub-slice | Exact existing surfaces; additions require separate approval | Seam |
| --- | --- | --- |
| Stage/result completeness and full-local Trivy | `.superman/ci/bootstrap.json`, `.superman/ci/raw-gates.ts`, `.superman/ci/direct-gates.ts`, `.superman/ci/raw-gates.test.ts`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/bootstrap-coverage.test.ts` | Raw process/receipt plus fake-forge/report inputs; later live raw forge checklist remains required |
| Static graph/model and advisory conformance | `biome.json`, `knip.json`, `.superman/ci/bootstrap.json`, `.superman/ci/direct-gates.ts`, `.superman/ci/raw-routing.test.ts` | Actual pinned tool diagnostics over valid/invalid Deno graphs; advisories stay nonblocking |
| Full-corpus G5 and critical G6/cases | `.jscpd.json`, `stryker.config.json`, `.superman/ci/bootstrap.json`, `.superman/ci/quality.ts`, `.superman/ci/quality-gates.test.ts`, `.superman/ci/raw-routing.test.ts` | Existing raw G5/G6/process/report seam, real tools, source-bound raw outcomes and fresh critical cases |

Critical mappings require André's review, not default assignment from filenames. A first enforcement-core run is not an empty-repository initialization. Scope fixes needed by these checks require exact file approval; do not delete public code or hide findings to produce green.

**Step 11 — proposed stable sibling root:** `.superman/deno-bootstrap/`. Materialize and review these groups incrementally; all listed files are **new**:

| Port sub-slice | Exact files under that root | Required parity |
| --- | --- | --- |
| 11a: policy/process foundations | `pr-policy.ts`, `fixture-env.ts` | Protected-input decisions, explicit environments/executable resolution, output bounds, cancellation/descendant cleanup and concurrent fixtures |
| 11b: raw checks and replay | `raw-gates.ts`, `direct-gates.ts`, `replay.ts`, `quality.ts` | Applicability, 0/1/2/tool-failure distinctions, meaningful replay, complete receipts and equivalent-scope/critical quality outcomes |
| 11c: coverage orchestration | `coverage.ts` | Proven four-metric complete-inventory mechanism; Node is only the bounded measured conversion/tool host where approved |
| 11d: retained owned helpers | `provision-tools.ts`, `archgate-arm64-build.ts`, `archgate-linux-arm64-wizard.ts` | Existing provisioning/manual-helper behavior under Deno, fake authority/tool fixtures and unchanged external runtime identities; no real build/publication is implied |

Proposed Node-hosted public process suites: `.superman/deno-bootstrap/tests/launch.test.ts` and `.superman/deno-bootstrap/tests/bootstrap.test.ts` (**new**). Candidate tests may reuse genuine test-only fixture utilities; `.superman/ci/raw-fixture.ts` needs separate approval if parameterization is necessary. Do not retarget existing Node tests by default, modify their operational imports merely to share code, or insert forwarding wrappers. Temporary implementation duplication remains visible to all applicable measurement policies.

**Step 12 — transition surfaces:** `.superman/deno-bootstrap/ci.template.yml` and `.superman/deno-bootstrap/tests/transition.test.ts` (**new**); later, separately authorized `.github/workflows/ci.yml`, `.github/workflows/archgate-linux-arm64-candidate.yml`, `.superman/ci/bootstrap.json` and the relevant `package.json` command/legacy-entry metadata. Keep every existing dependency/skill pin unless a separate decision changes it. Templates stay outside workflow discovery until publication is authorized. Merely pushing changed executable workflow YAML is not a nonactivating preparation step.

**Evidence homes:** append scope-bound outcomes to `.superman/ci/bootstrap-evidence.md`, `.superman/ci/coverage-evidence.md` and this preparation record. Append artifact measurements to `deno-artifact-candidate.md`. Preserve historical prefixes and failures; leave the completed SUP-005 evidence unchanged unless its own separately approved work actually adds evidence.

### Proposed completion commands, not results

Run from the repository root using verified approved real-Node/tool hosts and explicit verified candidate inputs, with the approved outer/child environment and owned fixture roots. These commands have **not** run in this phase. Missing tools or approval block; do not install or auto-download them. Raw full-driver execution needs a clean evaluated snapshot with correct branch/base identities; preserving the dirty real checkout is not optional. Disposable-fixture Git operations also require execution-scope permission.

For step 1, the documented GitHub CLI [release verification](https://cli.github.com/manual/gh_release_verify) and [asset verification](https://cli.github.com/manual/gh_release_verify-asset) interfaces can verify release membership/integrity, subject to an approved compatible verifier/access context:

```text
gh release verify v2.9.8 --repo denoland/deno --format json
gh release verify-asset v2.9.8 <owned-path-to-one-of-the-six-zips> --repo denoland/deno --format json
```

Repeat asset verification for all six archives, compare the separately recorded archive/executable hashes and checksum sidecars, and retain the distinct source/build-provenance disposition. These are not complete pin-acceptance commands.

After each proposed pilot exists and its exact execution profile is separately approved:

```text
node --test --test-reporter=tap .scratch/superman-v0/deno-startup.probe.test.ts
node --test --test-reporter=tap .scratch/superman-v0/deno-checker.probe.test.ts
node --test --test-reporter=tap .scratch/superman-v0/deno-mutation.probe.test.ts
node --test --test-reporter=tap .scratch/superman-v0/deno-coverage.probe.test.ts
node --test --test-reporter=tap .scratch/superman-v0/deno-compile.probe.test.ts
node --test --test-reporter=tap .scratch/superman-v0/duplication.probe.test.ts
```

Existing process suites supply the integration completion entrypoints, after their approved changes:

```text
node --test --test-concurrency=1 .superman/ci/coverage.test.ts .superman/ci/bootstrap-coverage.test.ts
node --test --test-concurrency=1 .superman/ci/archgate-policy.test.ts .superman/ci/rule-coverage.test.ts .superman/ci/pr-policy.test.ts
node --test --test-concurrency=1 .superman/ci/raw-gates.test.ts .superman/ci/raw-routing.test.ts .superman/ci/quality-gates.test.ts
```

The real pinned Archgate process suites require their explicitly verified `ARCHGATE_BIN`. After the **new** candidate suites exist:

```text
node --test --test-concurrency=1 .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts .superman/deno-bootstrap/tests/transition.test.ts
```

Full completion also needs the complete approved compiler graphs, repository Biome/Knip/strict Archgate checks and the full stage-aware raw contract, not just these targeted suites. No accepted direct Deno checker/compile/gate argv exists yet: producing and approving those exact profiles is part of steps 1–3/6, not permission to invent grants here. Do not advertise nonexistent `superman gate`, `superman merge-ready` or product release commands as bootstrap closure.

### Operator evidence lanes — alongside local feasibility and implementation

| Lane | Existing record/home | Completion and responsible party |
| --- | --- | --- |
| Existing environments | Spec §8.4; append dated evidence in `bootstrap-evidence.md` | André or his designated authorized operator supplies actual native macOS arm64/Linux x64/Linux arm64 runner/group/labels/capacity, Superman/public-PR access, actual tools/software, existing image provenance or native-host inventory, mounts/services/credentials and residual risks. Labels and historical jobs are not current acceptance; no new image/VM/controller/hosted fallback. |
| Registered Archgate replacement | Final registered-replacement section in `bootstrap-evidence.md`; `.superman/ci/tool-assets.json` | Bind source/build/test evidence and human redistribution disposition to archive `a8b860aeb06df957e2128a4cb4ca4b1ce389c4390429bbffb4f7e6fe62674df1` and binary `181ef65d8a0c73a9abb2279baf710e7ded18e05cfa04c37f033ce95aa6357708`. André/designated reviewer accepts the evidence; older candidate hashes cannot substitute. No automatic rebuild/republication. |
| Native candidate proof | Same evidence homes plus exact run/attempt artifacts | After route/provisioning/execution authorization, run the exact replacement/rule/measurement subjects on all three native platforms. Keep candidate receipts distinct, proposed namespace `.superman-ci/deno-bootstrap/`; no substitution for current Node required results. |
| Live host and final authority | Spec §9.2 raw forge checklist, §8 profiles and final `bootstrap-evidence.md` observations | Separately authorized fresh verification of expected App/installation scope/grants, required workflow/job/App results and H/B/M, strict freshness/review protections and tag-role limits. André's exact-head review/merge and the Q5 transition remain separate from local evidence. Do not assume missing credentials/settings from old records or reuse human credentials. |

### Decision gates that need later evidence, not guessed answers now

1. Before executing any pilot: approve its exact temporary grants, configuration/launch argv, files, fixture Git operations and artifact/tool/access scope. Q1–Q6 are planning choices, not those permissions.
2. After artifact/native/launch evidence: André reviews final runtime/declaration/provenance/OS-libc selections, per-class profiles and Q23 broader compiled-grant reasons. Unknown selections remain unready.
3. After step 7: review the complete duplication accounting/detection/metric and baseline-transition contract. The preserved mixed fixture's overlapping clone-line ratio above 100 and tiny identical-file zero-clone result are different questions; neither licenses clipping or a blind cutoff change.
4. Before critical policy activation: review actual case/module mappings and raw enforcement-core first measurements/survivor treatment. Introduced critical undetected mutants cannot hide behind an aggregate score or initialization label.
5. Before any workflow publication/cutover: approve and prove the exact Q5 transition, its source identities, operator routes and live authority. If contraction requires a different tree or protected follow-up, propose that exact scope and refresh its evidence/approval before admitting 01; do not assume earlier approval covers it.

Provider/cache/quarantine activation, G12/wiki work, product artifact distribution and first product baselines keep their existing later stages. Refactor-history and active skill-verifier profiles stay blocked unless actually required; the prescribed setup of agent steering docs in 01 is not itself project plugin/catalog activation. No new product ticket, default readiness label, infrastructure project or global sign-off is introduced.

### Matt execution prompts

These are copy-paste instructions for **later separate invocations**, not operations executed by this planning record. Use them in order, repeating prompt 2 for the dependency-ready preparation steps. `/implement` already invokes `/tdd` where applicable and independent `/code-review`; its default commit step is overridden below until explicit publication authority is given. Evidence-only work needs real verification, not a fabricated red–green cycle.

The existing spec/backlog reconciliation and the checklist above supply the plan. Do not rerun whole-v0 `to-spec`/`to-tickets` or use `implement-spec`: that skill's integration-branch/merger-agent flow is not this separately approved Gate 1 transition. A missing fact/decision is a blocker to resolve, not permission to widen scope. No prompt can guarantee human approval or a merge despite failed gates.

#### 1. Start with official-candidate verification

```text
/implement Work only on preparation step 1 in .scratch/superman-v0/gate1-preparation.md, governed by spec §§5.4, 5.10, 8 and 17. First present the exact file allowance, verification commands and artifact/tool/access permissions needed, and wait for my execution approval. Then verify the six official v2.9.8 candidate archives and extracted executables, release/source identity and matching complete declaration inputs. Keep release-origin verification distinct from final build-provenance/pin acceptance under closure Q1/Q3. Append scoped evidence to the existing records; preserve historical evidence and unrelated dirty work. No automatic installation/download, credential access, runtime execution, real-repository staging/commit, push, hosted change, activation or readiness promotion follows from the planning approval. Obtain any needed bounded artifact acquisition/execution authority explicitly. Do not invent TDD for a citation or verification-only change. End with independent Standards + Spec review and the exact next dependency-ready step; do not continue into it automatically.
```

#### 2. Repeat one bounded preparation slice through step 11

Replace `STEP` with the selected checklist step/sub-slice, for example `2`, `8` or `11a`. Do not select a step whose evidence or authority prerequisites remain open.

```text
/implement Execute only preparation STEP from .scratch/superman-v0/gate1-preparation.md. Recheck its dependencies, current source identities and live execution authority; present the exact files, public testing seams, commands, temporary grants and fixture operations for my approval before implementation. After approval, use Matt TDD for new behavior: one meaningful RED→GREEN slice at a time through actual process/report seams, regular type/single-file checks and the applicable full checks at the end. Use only approved exact tools/artifacts/profiles and owned fake-data fixtures. Preserve the active Node dispatch except for the separately approved measurement-policy expansion; the Deno successor remains parallel and non-admitting until the approved merge-bound transition. Append actual results and limits to existing evidence homes. Run independent Standards + Spec review against a frozen nonempty intake-relative delta including additions; resolve findings within the approved scope. Override the default commit step: no real-repository staging/commit, push, installation, hosted write, publication, activation, approval/merge or readiness change without separate live authority. Stop at this slice's completion or a consolidated blocker report, identify the next dependency-ready step and preserve other open rows.
```

Operator lanes may proceed alongside these slices only within their separately approved access/execution scope; overlapping repository edits still need a single agreed writer.

#### 3. Collect the parallel operator evidence

```text
/implement Work only on the Operator evidence lanes in .scratch/superman-v0/gate1-preparation.md. Identify the exact read-only inventory/verification commands, evidence destinations and permissions, then obtain the necessary access approval. Collect current existing native runner/environment/tool/public-PR-access facts and exact registered Archgate arm64 source/build/test evidence; obtain André's or his designated reviewer's redistribution disposition. Do not rebuild or republish the already-registered asset by default. Preserve known App/settings history without treating it as current authority. Append sanitized evidence to existing records and report missing human decisions precisely. No infrastructure project, hosted fallback, installation, credential search/mint, settings change, real Git write or activation is implicit. No fake TDD for evidence-only work; independently review the resulting scoped records.
```

If a pilot reveals an unresolved decision, use `grill-with-docs` for that frontier only. Once confirmed, `to-spec` may synthesize only that approved delta into its existing canonical/preparation homes, with no new product backlog, readiness label or hosted publication. Do not re-interview settled Q1–Q6 choices.

#### 4. Review the complete prospective Gate 1 candidate

```text
/code-review origin/main Review the complete intended Gate 1 candidate against spec §§5.4, 5.10, 8 and 17, the confirmed Deno/Q35 decisions and the closure plan in .scratch/superman-v0/gate1-preparation.md. Resolve and freeze origin/main to a commit and compare it with the separately authorized live PR base; stop and reconcile stale/different base evidence. Include all intended committed and uncommitted changes and explicit additions, including inherited planning work, using frozen source manifests and nonempty intake/working-tree patches where the default committed diff omits them. Do not stage or commit to manufacture a diff. Run fresh independent Standards and Spec reviewers; check every relevant closure row, exact source/provenance and the merge-bound transition. Return unresolved findings and blockers, not approval or merge authority. No unrelated dirty files are silently included or overwritten.
```

Repeat the relevant slice's implementation/check/review cycle for findings. Changed source, profiles or policy invalidate the affected earlier evidence; a clean final review alone does not supply missing measurements or live facts.

#### 5. Draft the Gate 1 PR body

```text
/pr Draft the body for the existing spec/superman-v0 Gate 1 PR in r3dlex/superman. Use Matt's Summary/Evidence/Merge Danger template, the smallest visual showing Node preparation→candidate proof→merge-bound Deno activation, genuine before/after evidence and exact source/tool/profile identities. Distinguish prospective local evidence from actual hosted H/B/M and current Node required results from candidate Deno proof. Include all remaining blockers and the raw §9.2 human merge checklist; do not claim product release or ticket01 implementation. Draft only: no commit/push, PR write, activation, approval or merge is authorized by this prompt.
```

#### 6. Obtain publication authority and collect exact hosted proof

This is an authorization checkpoint, not authority inherited from the earlier planning/implementation prompts. The following invocation requests the exact publication manifest and scope first; staging, committing, pushing or executing native/hosted proof requires André's subsequent approval of it.

```text
/implement Complete only preparation step 12's publication and exact-source proof for the already-reviewed Gate 1 candidate. First show the frozen intended file/source manifest, current bot identity/installation scope, exact commit/push/PR operations, proposed candidate-proof dispatch and required permissions; wait for my explicit publication/execution authorization. Preserve and verify work already committed/published by another actor; do not reset it or manufacture duplicate publication. After authorization, stage only the approved remaining manifest and commit/push as the non-approver bot to the existing spec branch/PR, preserving all unrelated work and history. Publish only the already-proved merge-bound workflow transition; Node must remain the required evaluator before human approval/merge. Collect full local and all three native candidate results, expected required check producers, artifacts/run/attempt/H/B/M and fresh authorized §9.2 host evidence. Candidate proof must not substitute for Node admission. Do not change settings, provision unapproved tools, bypass failures, use human credentials, approve or merge. Any source/head/base change requires the affected checks and independent review again. Stop when the exact head is genuinely ready for human review or return one consolidated blocker report.
```

#### 7. Update the PR evidence after hosted verification

```text
/pr Refresh the existing Gate 1 PR body from the final verified head and current run/attempt/H/B/M evidence using Summary/Evidence/Merge Danger. Show each closed preparation requirement, native/tool/Archgate acceptance and the exact merge-bound transition; retain any unresolved blocker instead of claiming readiness. Present the body diff and obtain explicit permission before a hosted body update. Do not change code, commit/push, replace checks, activate, approve or merge. Never mark ticket01 implemented or infer readiness from old receipts.
```

#### 8. Human exact-head approval and merge

This is **André's action, not a Matt agent command**. After the raw §9.2 checklist, required results, current base freshness, resolved findings and exact-head approval all hold, André merges the existing PR in the browser or uses his own authorized approver session:

```text
gh pr merge <verified-pr-number> --repo r3dlex/superman --squash --match-head-commit <exact-approved-head-sha>
```

The head flag does not guard the base; the independently verified strict freshness policy still applies. No agent approval/merge or `--admin` is authorized. A head/base/evidence change returns to the relevant checks and fresh human review.

#### 9. Verify the merged transition before starting 01

```text
/implement Verify only preparation step 13 after André's actual exact-head Gate 1 merge. Recheck the merged commit/policy and live evidence; prove Deno is the authoritative operational route, no Node fallback remains and the final inventory/checks match that source. Preserve bounded real-Node test/measurement/tool hosts. If contraction needs another source change or protected follow-up, propose its exact scope and run the same implementation→review→PR→human-merge cycle with fresh affected evidence; do not treat an older approval/receipt as covering it. Report ticket01 admission eligibility only when every applicable closure condition is actually closed. Apply a readiness edit only if the approved workflow and a separate live instruction authorize that exact edit; otherwise report the required reconciliation. Do not start product code, initialize product baselines or change other ticket statuses.
```

**Next command:** prompt 1 above. Continue through the dependency-ready slices and publication/human-merge checkpoints; never run the whole checklist as an unconditional batch.

## Row 8 slice — current-Node inventory and measurement expansion (Q4)

**Status: draft for approval. Nothing in this slice has been executed.** Row 8 is the first dependency-ready row: steps 1–7 are accepted, and this slice needs its own exact approval and its own closed criterion before any implementation, per [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md).

**The row's completion text.** "Node operational dispatch remains active; explicit checker/Knip/test/protection and complete mixed-runtime measurement support accept supported candidate inputs and reject unmodeled/partial ones. Materialized runtime code cannot hide in excluded probe files."

**Q4 constrains it.** "After feasibility, plan a separately approved expansion of current Node measurement/protection/compiler inventories before materializing the parallel Deno successor. This changes active measurement policy, not operational runtime dispatch. Both inventories remain visible to applicable quality checks."

**What the model does today.** `.superman/ci/coverage.ts` takes its file set from `git ls-files --cached --others --exclude-standard`, then partitions it into the two declared scopes in `.superman/ci/coverage.json` — `node` (`.superman/ci/**/*.ts`, `.archgate/adrs/*.rules.ts`) and `product` (`src/**/*.ts`) — minus `exclude`. `knip.json` declares `project` as `src/**/*.ts`, `test/**/*.ts`, `.superman/ci/**/*.ts`. The parallel Deno candidate's Node-hosted measurement files are in the git file set but match **no** declared scope: they are unmodeled rather than rejected. The probe files under `.scratch/superman-v0/` sit outside every declared scope and outside knip's project, so runtime code materializing there is invisible to the measurement. A guard already exists against a runtime-reachable excluded module (`coverage.ts:127`); this slice extends the same discipline to unmodeled files.

**File allowance.** The record's proposed surfaces name `.superman/ci/coverage.ts`, `.superman/ci/coverage.json`, `.superman/ci/coverage.test.ts`, `.superman/ci/bootstrap-coverage.test.ts`, `.superman/ci/bootstrap.json`, `.superman/ci/direct-gates.ts`, `.superman/ci/pr-policy.ts`, `.superman/ci/pr-policy.test.ts`, `tsconfig.json`, `knip.json`, and `.superman/ci/node-hosted-candidate-measurement-host.ts` (**new**, only if the proven design needs that bounded host). Keep the complete Node and Deno declaration environments distinct. Introduce supported inventories before candidate runtime files rather than adding an exclusion. Any file outside this list needs a scope amendment.

**Public seam.** The existing public coverage/protection process seam and the declared policy inputs — not private helpers. The same discipline as rows 3–5: a new behavior is proved through the actual gate process with its own result, and the result is what the criterion is written against.

**Closed acceptance criterion.** A run passes only when all six hold:

1. **Declared scopes are exhaustive over source files.** Every file in the git file set matching `\.[cm]?[jt]sx?$` matches at least one declared scope or the declared exclusion list. An unmodeled source file fails the run and names its path. Non-source files are outside this clause: the coverage model does not measure them, and the repository's Markdown, JSON and YAML files are not a coverage-scope question.
2. **No exclusion can hide runtime code.** The existing runtime-reachable-excluded-module guard still fires, and it covers the candidate scope: runtime code materialized in an excluded or undeclared path and reachable from a declared scope is rejected, not ignored.
3. **Partial candidate inventories reject.** A declared candidate inventory that exists but is incomplete — a missing declared root, a member matching no scope, or a scope resolving to fewer files than its own manifest declares — fails visibly rather than shrinking the aggregate.
4. **Both inventories stay visible.** The Node and candidate inventories are each measured and each reported, never folded into one another, and the aggregate counts them disjointly.
5. **Node operational dispatch stays active.** No change to the runtime that executes the gates. This slice changes measurement and protection policy only; the Node-side gate result remains the required result.
6. **The floors still apply to the shipped inventories.** Each **shipped** inventory — `node` and `product` — is measured against `coverage.json`'s four independent ≥90% overall floors and the 100% target, with unloaded files in the denominator. The **candidate** inventory is measured and reported with its own four-metric result visible in the receipt, and its floor becomes a carried obligation that binds at the merge-bound cutover, when the Deno root becomes the required evaluator.

   *Amended 2026-11-04 on André's decision.* The candidate is transitional scratch measurement scaffolding, not the operational enforcement core the floors were written for; ADR 0014 ties the floors to that core. Its numbers stay measured and visible so rot is detectable, and the floor binds the surface that actually ships. The floors themselves are unchanged: ≥90% in every metric, 100% target.

   *Binding point settled 2026-11-04 on André's decision.* This clause originally read that the candidate's floor "binds when the candidate materialises as the operational surface — row 11, or the merge-bound cutover, whichever comes first", and that wording was read two ways. André's decision of 2026-11-04 settled it: **both** carried coverage floors — the candidate measurement inventory's and the Deno operational surface's — bind at the merge-bound cutover, when the Deno root becomes the required evaluator. The candidate tooling was never promoted to the operational surface (row 11 created a new surface), and the Deno surface is still parallel and non-admitting, so neither floor binds before the cutover. **This settled an ambiguity in the wording; it discovered no new obligation.** No floor, threshold, scope or exclusion changed.

This list is closed. An obligation not named here is not in scope; discovering one is a note for the next decision, not a new blocker.

**Carried limits, not waivers.** The candidate inventory covers a fixture-scale surface, not product or bootstrap source; it is measured by a bounded Node-hosted host rather than by the candidate's own Deno-dependent suites, so what the floors attest is the candidate's *measurement code* being exercised, not Deno execution; darwin-arm64 only; no pin acceptance, no activation, no ticket 01 admission and no readiness change.

**Completion commands, not results.** The existing process suites, after the approved changes:

```text
node --test --test-concurrency=1 .superman/ci/coverage.test.ts .superman/ci/bootstrap-coverage.test.ts
node --test --test-concurrency=1 .superman/ci/archgate-policy.test.ts .superman/ci/rule-coverage.test.ts .superman/ci/pr-policy.test.ts
node --test --test-concurrency=1 .superman/ci/raw-gates.test.ts .superman/ci/raw-routing.test.ts .superman/ci/quality-gates.test.ts
```

plus the repository's own Biome, Knip and strict-Archgate checks and the full stage-aware raw contract. These have not run in this phase. Missing tools or approval block; do not install or auto-download them.

## Row 8 slice approval — 2026-11-04

**Decision: André approved the row 8 slice and its closed acceptance criterion on 2026-11-04, with the candidate scope shaped as a third declared scope in `.superman/ci/coverage.json`, measured in the same disjoint aggregate as `node` and `product`.** Nothing in this slice has been executed by this approval. Execution starts only through a separately approved slice; this record is not a new product backlog or an admission receipt. Spec §§5.4, 5.10, 8 and 17 remain the governing requirements.

**Criterion precision amendment.** Clause 1 is bounded to **source files** — files matching `\.[cm]?[jt]sx?$` — which is the set the coverage model already treats as source (`.superman/ci/coverage.ts:134`). The literal "every file in the git file set" reading would reject every Markdown, JSON and YAML file in the repository, which is not a coverage-scope question and would leave the clause uncheckable. ADR 0018 requires a criterion to be checkable; this is that correction, not a scope change. The six clauses otherwise stand as approved, and the list stays closed.

**What the correction surfaces.** Thirteen source files currently match no declared scope: ten under `.scratch/superman-v0/` — the Deno candidate's Node-hosted probe and measurement tooling, which merely mentions Deno and is not Deno runtime — plus `vitest.config.ts` and `.scratch/superman-v0/gate1-loop-check.mjs`. The third scope covers the candidate surface; the remaining two must be declared in a scope or explicitly excluded. `coverage.ts:63` pins the exclusion list to exactly `**/*.d.ts`, `**/*.test.ts` and `.superman/ci/raw-fixture.ts`, so adding an exclusion is a reviewed policy change in this same Gate 1 scope, not a free edit.

## Row 9 slice — governing Deno rules and input closure

**Status: criterion fixed in advance on 2026-11-04; not yet executed.** Row 9 depends on row 8's supported inventory model before any operational materialization. Spec §§5.4, 5.10, 8 and 17 remain the governing requirements.

**The row's completion text.** "Real pinned-Archgate process fixtures prove SUP-001/002/003/006/008 extensions and effective runtime/config/declaration/permission/build closure. Preserve Source links, runtime-neutral rules and completed SUP-005 history; collector-specific suppression checks still need actual integration."

**What is wrong today.** The five governing rule pairs scope to Node and product surfaces: SUP-001 to `package.json`, SUP-002 to `src/**/*.ts`, SUP-003 to `**/*.sh`/`**/*.py` and `.superman/hooks/*`, SUP-006 to `package.json`/`superman.config.json`/workflows, SUP-008 to workflows. The Deno candidate's runtime lives in `.scratch/superman-v0/` and later `.superman/deno-bootstrap/`; `src/` and `test/` do not exist yet. **Every one of these five rules is therefore vacuous against the Deno runtime graph** — SUP-002's own text says so: "No-op until M2/M3 add `src/`". A rule that scopes to files that do not exist cannot detect a Deno bypass.

**File allowance.** `.archgate/adrs/SUP-001-zero-runtime-deps.{md,rules.ts}`, `SUP-002-exec-boundary.{md,rules.ts}`, `SUP-003-no-sh-py.{md,rules.ts}`, `SUP-006-tsrs-typecheck.{md,rules.ts}` and `SUP-008-tests-through-superman.{md,rules.ts}`; the public fixtures `.superman/ci/archgate-policy.test.ts`, `.superman/ci/rule-coverage.test.ts` and `.superman/ci/pr-policy.test.ts`; and the effective-input work in `.superman/ci/pr-policy.ts` and its protected manifests. Supplemental actual exported-rule callbacks do not replace engine fixtures. Any other file needs a scope amendment.

**Public seam.** The pinned Archgate binary running the real rules over real fixture inputs, observed through the existing process fixtures. Not a re-implementation of a rule in a test. The pinned darwin-arm64 Archgate 0.61.0 is available and hash-verified: the archive at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/archgate-darwin/archgate-darwin-arm64.tar.gz` matches the recorded `tool-assets.json` digest `44c645602313bc6be7ef99ebc34c5e08f3169695b631bd9ab09bda0d3b699cf3`, and the extracted binary reports `0.61.0` with SHA-256 `be740ac09306e9d2417230065bbb14687fa5b19a7ba771c61c7591a75c3c0b5e`. `ARCHGATE_BIN` must point at that extracted binary; the npm shim is not an acceptable substitute, because the existing fixture fails on it deliberately.

**Closed acceptance criterion.** A run passes only when all six hold:

1. **Every one of the five rules has a non-vacuous Deno scope.** Each rule's Deno scope contains at least one file that exists today, and each rule reports a real violation for a fixture that bypasses it. A rule whose scope matches nothing is a failure, not a pass.
2. **No existing detection is weakened.** Each rule's Node and product coverage is unchanged, and every previously-passing fixture still passes. The extension is additive.
3. **Each rule has a proven bypass fixture.** SUP-001 rejects a Deno runtime dependency; SUP-002 rejects a `Deno.Command` outside the exec seam and any shell-equivalent spawn; SUP-003 rejects a shell or Python file and a non-Node hook shebang; SUP-006 rejects `--fast`, `TSRS_FAST` and a floating tsrs pin on the Deno path; SUP-008 rejects a direct Deno test or gate invocation in a workflow.
4. **Effective runtime, config, declaration, permission and build inputs are protected, with negative fixtures.** An import-map, lock, declaration, permission, entrypoint or build input that is effective but unprotected, or protected but bypassable, is rejected. Indirection is covered, not only the direct path.
5. **`Source:` links survive.** Every edited ADR still carries a `Source:` line pointing at an existing file, and GEN-001 passes.
6. **SUP-005's completed history is untouched.** Its rule bytes and its recorded evidence are unchanged, and the collector-specific suppression checks remain exactly as they are — still needing actual integration, and still not claimed as done.

This list is closed. An obligation not named here is a note for the next decision, not a blocker.

**Carried limits, not waivers.** The Deno scopes cover the candidate surface, not product `src/`; the rules are text- and AST-level and do not prove runtime equivalence; the exec-seam rule cannot see an alias built at runtime; darwin-arm64 only; no product `src/` work, no pin acceptance, no activation and no ticket 01 admission.

**Completion commands, not results.** The existing process suites, after the approved changes:

```text
node --test --test-concurrency=1 .superman/ci/archgate-policy.test.ts .superman/ci/rule-coverage.test.ts .superman/ci/pr-policy.test.ts
```

plus the pinned strict Archgate run over `.archgate/adrs/`. These have not run in this phase. Missing tools or approval block; do not install or auto-download them.

## Row 9 criterion fixed — 2026-11-04

**Status: the row 9 criterion above is fixed in advance, on 2026-11-04, and the slice is approved for execution.** Per [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md) the criterion is closed before the slice runs; a discovery that is not named in it is a note, not a blocker. Row 9 still requires André's acceptance of the recorded evidence before it counts as closed.

## Row 10 slice — full raw quality contract

**Status: criterion fixed in advance on 2026-11-04; not yet executed.** Row 10 depends on the relevant rows 3–9 evidence and on row 7's post-conformance decision. Spec §§5.4, 5.10, 8 and 17 remain the governing requirements.

**The row's completion text.** "Shared full-local/CI policy rejects missing tools/work/reports and false greens; full local Trivy actually runs. Explicit Biome errors, complete Knip model, separate 15/50/4 advisory reports, protected full duplication corpus and fresh critical cases/mappings are proved. Review enforcement-core first measurements/raw survivors; product baselines remain for 01. Bootstrap reuse stays off."

**File allowance, in three bounded sub-slices.** Stage/result completeness and full-local Trivy: `.superman/ci/bootstrap.json`, `.superman/ci/raw-gates.ts`, `.superman/ci/direct-gates.ts`, `.superman/ci/raw-gates.test.ts`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/bootstrap-coverage.test.ts`. Static graph/model and advisory conformance: `biome.json`, `knip.json`, `.superman/ci/bootstrap.json`, `.superman/ci/direct-gates.ts`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/bootstrap-coverage.test.ts`. Full-corpus G5 and critical G6/cases: `.jscpd.json`, `stryker.config.json`, `.superman/ci/bootstrap.json`, `.superman/ci/quality.ts`, `.superman/ci/quality-gates.test.ts`, `.superman/ci/raw-routing.test.ts`. Each sub-slice is separately implemented, reviewed and recorded. Any other file needs a scope amendment.

**Public seam.** The existing raw process/receipt seam with fake-forge and report inputs, and the real pinned tools over valid and invalid Deno graphs. The later live raw forge checklist remains required and is not claimed by this slice.

**Tool identities available locally.** Biome 2.6.4, jscpd 5.4.2, knip 6.43.0, Vitest 5.0.5, Stryker 10.1.1 and c8 12.0.0 are installed in `node_modules/.bin/` and match their pins. Trivy 0.76.1 is present at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-trivy-Xkz2WM/trivy` and reports the pinned version, but **its recorded archive digest cannot be re-verified locally** — `tool-assets.json` records the SHA-256 of the distribution archive (`11a9b6cd…`), the archive is no longer on disk, and the extracted binary's own digest is `5c03401caf9d3cc04d9e0c7f3abd102e97518e8237465cce702162b605535e8d`. The tool identity is therefore version-bound but not archive-bound at this scope; that is a recorded limit, not a re-verification to perform. Note separately that `node_modules/.bin/archgate` is version 0.43.0 — the npm shim, not the pinned 0.61.0 — and must not be used where the pinned binary is required.

**Closed acceptance criterion.** A run passes only when all six hold:

1. **One policy, two hosts.** The same driver and tool profile govern the full local pre-PR run and the CI run. A partial pre-commit result is labeled partial feedback and never satisfies the full bar.
2. **Nothing missing counts as success.** A missing tool, an ignored failure, skipped required work, an incomplete report and a stale report each fail the full result, each with its own fixture. Full local Trivy actually runs and reports its findings; a missing local Trivy blocks rather than counting as success.
3. **Errors fail; advisories advise.** Explicit correctness errors fail. The 15/50/4 structural advisories are reported separately, stay nonblocking, and are never converted into caps or floors.
4. **The Knip model is complete.** Every declared entry resolves, and every project file is an entry, a project member, or explicitly ignored — with a fixture for each of those three outcomes.
5. **The duplication corpus is protected.** The declared corpus and the >5-line floor hold; `--changed-only` is disqualified; no clipping, percentage re-basing or re-scoping occurs. The declared-profile overlap question recorded at step 7 stays a recorded question, not a quietly changed threshold.
6. **Critical mutation evidence is fresh and mapped.** Critical cases and module mappings are fresh-only and reviewed. A missing critical case blocks, and no aggregate improvement excuses an unresolved introduced critical survivor.

This list is closed. An obligation not named here is a note for the next decision, not a blocker.

**Carried limits, not waivers.** The enforcement-core first measurements and raw survivors are a review input, not a floor; product-source baselines wait for ticket 01; bootstrap reuse stays off; darwin-arm64 only; no pin acceptance, no activation and no ticket 01 admission.

## Row 11 slice — incremental parallel operational port

**Status: criterion fixed in advance on 2026-11-04; not yet executed.** Row 11 depends on rows 3–6 and 8–10. Spec §§5.4, 5.10, 8 and 17 remain the governing requirements.

**The row's completion text.** "Candidate Deno policy/process, gate/replay/quality, coverage and owned helper slices preserve public outputs/receipts/failure/cleanup contracts, with complete inventories and parity fixtures. No candidate module delegates operational work to the old Node graph. Each sub-slice is separately approved and reviewed."

**File allowance — a new stable sibling root.** `.superman/deno-bootstrap/`, materialized and reviewed incrementally, all files new: 11a `pr-policy.ts`, `fixture-env.ts` — protected-input decisions, explicit environments and executable resolution, output bounds, cancellation and descendant cleanup, concurrent fixtures. 11b `raw-gates.ts`, `direct-gates.ts`, `replay.ts`, `quality.ts` — applicability, 0/1/2 and tool-failure distinctions, meaningful replay, complete receipts, equivalent-scope and critical quality outcomes. 11c `coverage.ts` — the proven four-metric complete-inventory mechanism, with Node only the bounded measured conversion/tool host where approved. 11d `provision-tools.ts`, `archgate-arm64-build.ts`, `archgate-linux-arm64-wizard.ts` — existing provisioning and manual-helper behavior under Deno, fake authority/tool fixtures, unchanged external runtime identities, and no real build or publication implied. Plus the Node-hosted public process suites `.superman/deno-bootstrap/tests/launch.test.ts` and `.superman/deno-bootstrap/tests/bootstrap.test.ts`. Temporary implementation duplication must stay visible to all applicable measurement policies.

**Public seam.** The same public seams as the Node originals — the CLI, hook, collector and gate boundaries, not new private-helper seams. Candidate tests may reuse genuine test-only fixture utilities; `.superman/ci/raw-fixture.ts` needs separate approval if parameterization is required.

**Runtime identities available locally.** The pinned `deno` binary is at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step3-fldy0ns2/tools/deno/deno` with SHA-256 `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba` — the same digest the row 3 and row 5 probes pin and assert — and also at `…/superman-gate1-step4/bin/deno`. The pinned `denort` compile binary is at `…/superman-gate1-step6/acquire/denort` with SHA-256 `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df…`, matching the step 6 record. The `deno-launch-probe/shim/deno` is a shim and is not the candidate. Use these retained binaries; do not fetch a new one.

**What the port has to replace.** The Node originals import `node:child_process` (`execFileSync` in `pr-policy`, `raw-gates`, `direct-gates`, `quality` and `coverage`; `execFileSync` and `spawnSync` in `replay`), `node:crypto`, `node:fs`, `node:path`, `node:os`, `node:util` and `node:url`; `coverage.ts` additionally imports `node:module` for `createRequire` and `stripTypeScriptTypes`. ADR 0016 makes `Deno.Command` the sole spawn API and forbids `node:child_process` bypasses; the remaining `node:` built-ins are permitted as verified compatibility built-ins. `stripTypeScriptTypes` is the one member with no Deno equivalent, and it is exactly the conversion step that 11c keeps on the Node side as a bounded measured conversion host rather than reimplementing.

**Closed acceptance criterion.** A run passes only when all six hold:

1. **Four separately reviewed sub-slices.** 11a, 11b, 11c and 11d are each implemented, reviewed and recorded in order, each within its declared file list, each with its own acceptance.
2. **Contracts are preserved, not re-implemented.** For the same inputs, the Deno sibling produces the same public outputs, receipt shapes, failure codes and cleanup behavior as the Node original. A parity fixture per contract, not a second implementation of the same logic.
3. **No candidate module delegates operational work to the Node graph.** No Deno-side module imports or spawns the Node implementation for operational behavior. Node remains only a bounded measured conversion or tool host where a sub-slice explicitly approves it.
4. **Inventories are complete.** The Deno sibling exposes the same declared inventory of protected inputs, gate names and report shapes as the Node original, and a fixture proves a missing or extra member is rejected.
5. **Boundary behavior matches.** Protected-input decisions, explicit environments and executable resolution, output bounds, cancellation and descendant cleanup, and concurrent fixtures behave as the Node original does — each with a fixture.
6. **Duplication stays visible.** Temporary implementation duplication is not hidden from the duplication or mutation measurement to make a result look better.

This list is closed. An obligation not named here is a note for the next decision, not a blocker.

**Carried limits, not waivers.** The port is a parallel, non-admitting successor: Node remains the required evaluator until the merge-bound transition in row 12. darwin-arm64 only. No pin acceptance, no activation, no workflow publication and no ticket 01 admission.

## Rows 10 and 11 criteria fixed — 2026-11-04

**Status: the row 10 and row 11 criteria above are fixed in advance, on 2026-11-04, and both slices are approved for execution.** Per [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md) each criterion is closed before its slice runs; a discovery that is not named in it is a note, not a blocker. Row 11's sub-slices are each separately implemented, reviewed and recorded, per the row's own text. Both rows still require André's acceptance of the recorded evidence before they count as closed.

## Row 12 slice — exact-source replacement and transition proof

**Status: criterion fixed in advance on 2026-11-04; not yet executed.** Row 12 depends on row 11 and on the operator lanes below. Spec §§5.4, 5.10, 8 and 17 remain the governing requirements.

**The row's completion text.** "Fresh complete local checks and all three native candidate proof runs bind exact source/tools/profiles and H/B/M as applicable. Prove the Q5 transition and raw forge completeness checks before workflow publication. Node required evaluation is not replaced by candidate proof before approval/merge. Final artifact/profile, Archgate and live-setting acceptance are complete."

**File allowance.** `.superman/deno-bootstrap/ci.template.yml` and `.superman/deno-bootstrap/tests/transition.test.ts` (**new**); then, only under separate publication authority, `.github/workflows/ci.yml`, `.github/workflows/archgate-linux-arm64-candidate.yml`, `.superman/ci/bootstrap.json` and the relevant `package.json` command and legacy-entry metadata. Templates stay outside workflow discovery until publication is authorized. Merely pushing changed executable workflow YAML is not a nonactivating preparation step.

**Public seam.** The public CLI conformance suite for the source route and for exact compiled artifacts, the transition fixture, and the raw forge completeness checks. The candidate namespace stays distinct from the current Node receipts.

**Closed acceptance criterion.** A run passes only when all six hold:

1. **The transition is fixture-proved before publication.** The approved-base policy and the merged-policy policy both run through the same transition fixture and the change between them is exactly the declared one. There is no environment, file-presence or availability switch, and no Node fallback.
2. **Node stays the required evaluator until André approves the exact head and merges.** Candidate proof never substitutes for the Node admission result, and no candidate result is promoted to a required check before that approval.
3. **Fresh complete local checks bind the exact source under test.** The result names the exact source, tool and profile identities, not a range or a branch.
4. **All three native candidate proof runs bind the same exact source, tools and profiles** on macOS arm64, Linux x64 and Linux arm64. A missing platform blocks; it is not skipped, narrowed or reported `n/a`.
5. **Raw forge completeness is verified, not assumed.** The expected required check producers, artifacts, and the run/attempt and H/B/M relationships are checked against the forge. H alone is never assumed to be M.
6. **Final acceptance is complete and every publication operation is authorized first.** Artifact, profile, Archgate and live-setting acceptance are all in hand before any workflow is published or any check is replaced.

This list is closed. An obligation not named here is a note for the next decision, not a blocker.

**Operator lanes — not satisfiable locally.** Row 12's native and live evidence needs André or his designated authorized operator to supply: actual native macOS arm64, Linux x64 and Linux arm64 runner/group/labels/capacity, Superman and public-PR access, the actual tools and software, existing image provenance or a native-host inventory, and mounts, services and credentials with their residual risks. Labels and historical jobs are not current acceptance. The registered Archgate linux-arm64 replacement additionally needs its source/build/test evidence and a human redistribution disposition bound to the recorded archive and binary. Missing operator evidence blocks; it does not license a hosted fallback, a new VM project or a new admission App.

**Carried limits, not waivers.** The local half is darwin-arm64 only; the three-platform runs and the publication are separate authorized operations; no activation, no evaluator switch and no ticket 01 admission follows from row 12.

## Row 12 criterion fixed — 2026-11-04

**Status: the row 12 criterion above is fixed in advance, on 2026-11-04, and the slice is approved for execution of its local half.** The native and live lanes need operator authority that no agent can supply; those are stated as an operator request, not as an agent blocker. Per [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md) the criterion is closed before the slice runs. Row 12 still requires André's acceptance of the recorded evidence before it counts as closed.

### Row 8 criterion amended — 2026-11-04

**Decision: André amended row 8's clause 6.** The ≥90% floors bind the shipped inventories (`node`, `product`); the candidate inventory is measured and reported with its four metrics visible, and its floor becomes a carried obligation binding at row 11 or the merge-bound cutover. This is a reviewed decision under spec §17 ("Unknown/failed integration remains a blocker and comes back for a reviewed decision"), recorded here because the clause was fixed in advance and is now changed by decision rather than by discovery.

The candidate inventory's last measurement was 94.78 % lines, 88.75 % statements, 94.87 % functions and 78.57 % branches — up from 57.39 / 52.15 / 45.29 / 43.80 across two rounds of Node-hosted fixtures. Those numbers stand as recorded; the amendment changes what they are measured against, not what they are.

**Two further decisions, 2026-11-04.** The candidate inventory's four declared members are to be **tracked**, like their siblings in the same directory, so the scope is non-empty on a clean checkout. SUP-008's Deno command list is to be trimmed by `deno bench` only; `deno test`, `deno lint`, `deno fmt`, `deno coverage` and `deno task` stand. The exec seam stays on **exact paths** — `src/exec.ts` and `.superman/deno-bootstrap/exec.ts` — so row 11 places the Deno seam at one of them or asks for an amendment.

## History

### Step 1 — official candidate verification

#### Step 1 measurement record — 2026-11-01

Status: official-candidate measurements are recorded in [deno-artifact-candidate.md](deno-artifact-candidate.md#2026-11-01-verification--official-candidate-inputs). This append does not edit the checklist table above and does not close pin acceptance, build provenance, runtime activation, or ticket 01 admission. The historical planning text remains unchanged.

The approved run used the already-installed `gh` 2.103.3, `shasum`, `unzip`, and `file` 5.41. It downloaded only the six `v2.9.8` candidate archives, their zip sidecars, the three loose `deno` executable sidecars, and `lib.deno.d.ts` into an owned temp directory. All 16 `gh release verify-asset` commands exited 0 against release attestation predicate `https://in-toto.io/attestation/release/v0.2`. Local archive hashes match the attestation subjects and zip sidecars. Extracted `deno` hashes match the loose sidecars. Denort hashes are local hashes of the single attested zip member; no loose denort sidecar exists in the verified statement. No binary was executed. Tag `v2.9.8` still resolves to commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`.

Recorded gaps, not waivers: the verified predicate is release origin, not SLSA build provenance; the package subject uses Git SHA-1 and the commit signature was not checked locally; `deno_src.tar.gz` was not downloaded; header identification is not OS/libc acceptance; the published declaration asset embeds some source files, references others, and carries Deno MIT plus Microsoft MIT and Apache-2.0 notices. Q3 still blocks final provenance acceptance. No protected substrate file, readiness label, staging, commit, push, or install was made.

Step 2 is the next checklist row and is not execution-ready: it still requires separately approved exact temporary profiles and grants. No later row was started.


#### Step 1 closure record — 2026-11-02

**Status: the bounded step 1 verification is complete and presented for André's acceptance. Step 1 remains open in the checklist table until that acceptance is recorded.** This append does not accept a pin, close Q1/Q3 source/build provenance, close §8.4, execute a candidate in this slice, activate an evaluator, or admit ticket 01. The checklist table above is not edited.

##### Dependency and identity recheck

- HEAD is `62c8495aeffa33d827c481e661f6083f8bc718d4` on `spec/superman-v0`; no `src/`, no `superman.ratchet.json`, no product baseline.
- Step 1 does not depend on the **completion** of steps 2–7, but this closure reuses the retained step 3 acquisition/declaration inputs (`inventory.json`, `raw-dts/`, `legal/`, `acquisition.json`, and the `deno types` stdout) read-only; step 3 remains open. This is a non-blocking, read-only input reuse; the checklist table's dependency cell remains unchanged. Step 1 feeds the Gate 1 provenance/transition rows, not step 3's checker feasibility or step 8's current-Node inventory/measurement expansion.
- Step 3 remains open and continues to block step 8. Steps 2, 4, 5 and 6 retain their recorded local scopes; step 7 retains A with conditions. This record does not reopen or promote them.
- André approved the full closure packet, including re-acquisition of the four Linux candidate archives for read-only target-constraint inspection. No candidate binary was executed in this slice; no installation, credential read, real-repository Git write, hosted write or activation occurred.

##### What is now recorded

| Criterion | Recorded outcome |
|---|---|
| Six candidate archives and extracted executables | Retained from the 2026-11-01 record; the four Linux zips were re-acquired and each `gh release verify-asset` exited 0. |
| Release origin/integrity | The six candidate archives (including the four Linux zips re-acquired here) and `deno_src.tar.gz` match attested release subjects. Release predicate is `https://in-toto.io/attestation/release/v0.2`; it is not build provenance. |
| Source archive | `deno_src.tar.gz`, sha256 `b57d0281c1647effc735f242ba52bc409747fc6ed6ad4946e76f062c67e113eb`, 37,035,922 bytes. `cli/Cargo.toml` is version 2.9.8. Eight selected members match their Git blobs; the three legal and three declaration key members match their `acquisition.json` records. The record set is 202 declarations + 3 legal + 4 mechanisms (`cli/build.rs`, `cli/tsc/00_typescript.js`, `cli/tsc/99_main_compiler.js`, `cli/tsc/mod.rs`) = 209. |
| Source tree boundary | The archive has 22,101 entries; the commit tree has 19,232. 46 tracked metadata/test-fixture blobs are absent and 2,775 `tests/util/std` submodule files are present; zero extra files are unattributed. The 2,775 files are the archive's `tests/util/std` subtree; their content was not matched file-by-file to the `9c5b7101…` gitlink. The directory comparison is 4,469 archive directories versus 4,329 tree directories/gitlinks: four `.github` directories absent, 143 extra directories under `tests/util/std`, and the archive root. The five submodule gitlinks include `tests/util/std` `9c5b7101…`; the other four submodule trees are empty. Recorded as a packaging boundary, not a declaration-input gap. |
| Declaration origin/closure/license | Published `lib.deno.d.ts`, sha256 `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a`, 721,335 bytes, equals the attested binary's `deno types` stdout. It reconstructs exactly from 17 components plus 16 `\n` separators. 54 directives: 16 `no-default-lib`, 38 `lib`, 21 distinct targets. All 21 resolve into the 202-file inventory; the `node` closure is 98 files (58 Node + 40 Undici). Three legal files are MIT; the asset carries Deno MIT, the MDN/Mozilla CC-BY-SA 2.5 attribution at offset 503519 in `deno.shared_globals`, and the Microsoft copyright/Apache-2.0 text at offsets 544795/544872 in `esnext.temporal`. |
| Target constraints | macOS arm64 `deno`/`denort`: Mach-O `LC_BUILD_VERSION`, minos 12.0, SDK 14.5. Linux x86-64 and aarch64 `deno`/`denort`: ELF64 LSB PIE, recorded interpreters, `.note.ABI-tag` 3.2.0/3.7.0, highest required `GLIBC_2.27`, recorded BuildIDs. `DT_NEEDED` includes `libc.so.6`, `libgcc_s.so.1`, `libdl.so.2`, `libpthread.so.0`, `libm.so.6`, and (x86-64 only) `librt.so.1`, and the recorded interpreter. |
| Commit signature | GitHub API `verified=true`, `reason=valid`, `verified_at=2026-10-21T11:47:22Z`. Signature is PGP (801 bytes); payload 401 bytes. Local verification was not performed because `gpg` is absent and installation is prohibited; no signer key was fetched. |
| Provenance-gap inventory | Release origin is not SLSA/build provenance; the package subject is Git SHA-1; the source archive is not a byte-exact tree export; glibc values are symbol requirements, not tested floors; no candidate execution at the recorded minima; commit signature is API-only. |

##### Evidence homes

- [Artifact append](deno-artifact-candidate.md#2026-11-02-step-1-closure--source-archive-and-declaration-closure): source-archive identity, key-member table, declaration component/reference/license closure and target-constraint table.
- [Bootstrap append](../../.superman/ci/bootstrap-evidence.md#2026-11-02--step-1-closure-verification): exact commands, tool identities, raw outcomes, artifact hashes and limits.
- Owned root: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step1-closure`, with `closure.json` `0c2edb0e…`, `source-binding.json` `2b7d18f4…`, `elf-metadata.json` `5710a6c5…` and `manifest.sha256` `f52c7e80…`.

##### Not closed by this record

- Final source/build-provenance acceptance and any pin decision (Q1/Q3).
- Three-platform native acceptance, OS/libc execution, signing, notarization or quarantine.
- §8.4 existing environment/tool/access/native-capacity inventory.
- §17 Runtime/profile selection manifests, explicit launch/config/capability/environment inputs and bounded real-Node drivers.
- Gate 1 approval/merge, evaluator activation and ticket 01 admission.
- Step 3 dual-checker feasibility; it remains open and blocks step 8.

**Review:** an independent Standards + Spec R4 review of the frozen delta sha256 `284e2ba23fd3f1aae7a420183f4d688cae96f5dd0db861333f428cb81f54bd10` (262 lines; intake `624a6296…`, `076ff39d…`, `0c6a8d5a…`) returned **zero remaining findings** on both axes. The R1–R3 findings were resolved within this scope: the MDN/Mozilla CC-BY-SA 2.5 notice, the 202/209 denominator, the Linux-zip double count, exact commands, valid ELF JSON, dependency wording, the directory/submodule disclosure, `DT_NEEDED`, and the placeholder path. This post-review sentence follows the reviewed freeze; the review is documentation/evidence review, not step 1 acceptance, pin acceptance or live authority.

**Next action:** André accepts the step 1 row at the preparation scope above, or returns a concrete finding. Until that acceptance, step 1 is not green. Do not start step 2, step 3 or step 8 from this record. After acceptance, the next dependency-ready execution path remains the separate **Step 3 conditional D1** packet with fresh popup approval.


#### Step 1 acceptance — 2026-11-02

**Decision: André accepted the step 1 row at preparation scope on 2026-11-02.** Step 1 is green for the bounded verification recorded above. This appended decision supersedes the pending-acceptance wording immediately above; the checklist table is not edited.

Accepted scope:

- Six candidate archives and extracted executables are bound to the named `v2.9.8` release/source. The four Linux zips were re-acquired and each `gh release verify-asset` exited 0.
- `deno_src.tar.gz` is `b57d0281c1647effc735f242ba52bc409747fc6ed6ad4946e76f062c67e113eb`, 37,035,922 bytes. `cli/Cargo.toml` is 2.9.8; eight selected members match their Git blobs; the declaration/legal key members match their `acquisition.json` records.
- The source-archive packaging boundary is accepted as recorded: 46 absent tracked metadata/test-fixture blobs, 2,775 `tests/util/std` files not content-matched to the gitlink, 4,469 vs 4,329 directories, zero unattributed entries.
- The published `lib.deno.d.ts` is `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a`, 721,335 bytes, equal to the attested binary's `deno types` stdout. The 17-component exact reconstruction, 54 directives / 21 targets, 202-file inventory, 103-name map, 98-file Node/Undici closure, and the Deno MIT / MDN CC-BY-SA 2.5 / Microsoft Apache-2.0 notice inventory are accepted.
- The target-constraint metadata are accepted: macOS arm64 minos 12.0 / SDK 14.5; Linux x86-64/aarch64 interpreters, ABI notes 3.2.0/3.7.0, highest required `GLIBC_2.27`, BuildIDs and `DT_NEEDED`.
- The commit signature is accepted as GitHub-API-verified only (`verified=true`, `reason=valid`); no local PGP verification was performed.

This acceptance does **not** accept a pin, close Q1/Q3 build provenance, close §8.4, close §17 runtime/profile manifests or bounded real-Node drivers, prove three-platform native execution, activate an evaluator, approve/merge Gate 1, or admit ticket 01. The independent Standards + Spec R4 review was clean on both axes for the reviewed delta `284e2ba2…`; the review is not live authority.

**Next action:** present the separate **Step 3 conditional D1** execution packet with fresh popup approval. Step 3 remains open and blocks step 8. Do not start step 2, step 3 or step 8 from this acceptance.


### Step 2 — OS-native startup-boundary pilot

#### Step 2 measurement record — 2026-11-01

Status: local darwin-arm64 OS-native startup-boundary pilot recorded below and in [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-01--os-native-startup-boundary-pilot). This append does not edit the checklist table above. It does not accept a pin, close build provenance, activate an evaluator, admit ticket 01, or start step 3.

The approved run re-acquired only `deno-aarch64-apple-darwin.zip`, `denort-aarch64-apple-darwin.zip`, and their three named sidecars into an owned temp directory. `gh release verify-asset` exited 0 for all five. Local hashes matched the step 1 record and the release-attestation subjects. The two extracted Mach-O binaries were executed only through `/usr/bin/env -i` or as explicit controls. Homebrew `deno` was not invoked. No binary was installed onto `PATH` or into a Deno install location. No `-A`, `--allow-*`, `--env-file`, or `env -S` profile was used for a credited launch.

The credited boundary passes the hostile environment to `/usr/bin/env` and clears it with `-i` plus an explicit allowlist: `PATH=/usr/bin:/bin`, owned `HOME`/`TMPDIR`/`DENO_DIR`, `DENO_NO_UPDATE_CHECK=1`, and `DENO_NO_PACKAGE_JSON=1`. Source and generated-hook launches then run the absolute verified `deno` with `--no-prompt --no-config --no-lock --no-npm --no-remote`. Compile adds the absolute verified `DENORT_BIN` and `--output` under the owned fixture. Node `env` sanitization is not the credited proof.

Two genuine RED→GREEN cycles were recorded. The first failed while a direct launch still delivered `DENO_V8_FLAGS=--not-a-real-v8-flag` (`V8 did not recognize flag`, status 1). The second failed while compile omitted the discovery flags and applied a hostile `deno.json` (`'not-a-feature' isn't a valid unstable feature`). A bare malformed `deno.lock` did not fail on this binary; the fixture was corrected to a `deno.json` lock pointer and is not a policy RED. Independent review then required the hook and compile routes to show the same hostile V8 and broker values being cleared, a package-import result that does not depend on `DENO_NO_PACKAGE_JSON`, and a hostile `HOME` distinct from the allowlisted home. Those observations were added. Ungranted-read cases were removed as outside this slice. The final probe passed 17, failed 0, skipped 0. Project `tsrs --noEmit` does not include `.scratch` and exited 0; the single-file check needed `--ignoreConfig` because a bare file argument is rejected while `tsconfig.json` exists. Repository Biome CI checked 41 files and exited 0; the probe file was also checked alone and exited 0.

Limits, not waivers: darwin-arm64 only; release attestation is not build provenance; `env -S` still substituted an inherited value when combined with `-i`; a `#!/usr/bin/env deno` shebang hit a PATH shim and is not a portable accepted launcher; compiled `denort` did not show the full-Deno broker or V8 failure when those variables were passed directly, which is one observation of this binary, not an ambient-free guarantee; no packet capture proves the absence of network; `.env` reads were not demonstrated because `--allow-env` was not granted. No `.superman/ci/deno-substrate.json`, `.superman/deno-bootstrap/`, workflow, package, or operational Node dispatch file was edited. No real-repository staging, commit, push, or readiness change was made.

Step 3 remains the next checklist row and is not execution-ready. These step 2 measurements do not approve its checker profiles or grants. Step 7 stays independently unstarted.

##### Step 2 review correction — 2026-11-02

The step 2 probe was refactored to use the shared `RUN_ARGS` array for its two explicit launches. No behavior changed, so no new RED→GREEN cycle was invented. Final probe sha256 **`dcbd83fd0f944db31d5dee599e69dc43e3f7c129849cc9add2029254f13b5741`**; retained TAP **`c92d6664575a71cacfd6506d4b459ce9b69fe864019fd654728d824d12ee9fb4`**, **17 passed, 0 failed, 0 skipped**, 3682.92 ms. The exact single-file check was:

```text
node node_modules/tsrs/bin/tsrs --noEmit --ignoreConfig --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --types node .scratch/superman-v0/deno-startup.probe.test.ts
```

It exited 0; the single-file Biome check also exited 0. Project `tsrs --noEmit` still excludes `.scratch`, so this explicit check is the probe's type evidence.

Route scope is narrowed, not waived. The credited hook route is the generated hook launched by explicit argv (`.ts`), not a Lefthook route. The `#!/usr/bin/env deno` shebang control deliberately ran a PATH shim; it is a negative control, not a portable accepted launcher. The real Lefthook/init hook route remains later work. The credited compile route is the `env -i` compile with the verified `DENORT_BIN` and discovery flags; direct execution of the compiled denort with broker/V8 variables was status 0 and did not show the full-Deno failure, which is one darwin-arm64 observation, not a neutralization proof.

The step 2 row is presented for acceptance at this narrowed scope. The hook-route and denort-observation limits are carried, not claimed as complete.

The historical second RED — compile without discovery flags plus a hostile `deno.json` — was an authoring observation, not a retained probe control. The retained probe's compile tests are the green path plus the `env -i` controls, and `launchCompile` always passes `--no-config`. That RED remains self-attested, like the other failing TAPs, and is not presented as a retained negative control.

##### Step 2 acceptance-ready — 2026-11-02

**Presented for André's acceptance at the narrowed route scope, local darwin-arm64 only. Not accepted by this record.**

If accepted, the scope is:

- On local darwin-arm64, the OS-native source launch uses `/usr/bin/env -i` plus the explicit allowlist, the absolute verified `deno` and the probe-local `RUN_ARGS` constant. The `env -i` boundary clears inherited V8, broker and startup environment values. Ambient config, lock, package and import-map discovery is prevented separately by the probe-local `RUN_ARGS` flags `--no-config`, `--no-lock`, `--no-npm`, `--no-remote` and by `DENO_NO_PACKAGE_JSON=1`; those flags are not the environment boundary. TAP `c92d6664575a71cacfd6506d4b459ce9b69fe864019fd654728d824d12ee9fb4`, **17 passed, 0 failed, 0 skipped**, 3682.92 ms; probe sha256 `dcbd83fd0f944db31d5dee599e69dc43e3f7c129849cc9add2029254f13b5741`.
- The credited hook route is the generated hook launched by explicit argv (`.ts`); the shebang/PATH-shim case is a negative control, not a portable launcher.
- The credited compile route is the `env -i` compile with the verified `DENORT_BIN`, explicit discovery flags and owned output.

Carried, not waived, classified by kind:

- **Gate 1 / ticket 04 gap (§5.10 configuration isolation, §17 runtime/profile selection):** the real Lefthook/init hook route remains later work; this row does not claim it.
- **Step 6 / §17 native-acceptance item:** direct compiled denort execution was status 0 and did not show the full-Deno broker/V8 failure. It is one darwin-arm64 observation, not a neutralization proof, and not step 6.
- **Step-row evidence-retention gap (this row):** the historical compile-without-discovery-flags RED is self-attested; the retained probe has no such negative control.
- **Platform and fixture limits:** darwin-arm64 only; `.env` non-discovery/reads were not demonstrated; these results do not prove Linux, portable shebang acceptance, network absence or OS/libc acceptance. The hostile fixtures are bounded probe fixtures, not a full §5.10 malicious-environment matrix.

The row is acceptance-ready only at this narrowed local-darwin-arm64 scope. No pin, Gate 1, evaluator activation or ticket 01 admission follows.


#### Step 2 acceptance — 2026-11-02

**Decision: André accepted the step 2 row at preparation scope on 2026-11-02.** Step 2 is green for the bounded verification recorded above. This appended decision supersedes the pending-acceptance wording in the step 2 acceptance-ready section; the checklist table is not edited.

Accepted scope, local darwin-arm64 only:

- The `env -i` source launch with the explicit allowlist, absolute verified `deno` and probe-local `RUN_ARGS`. The environment boundary clears inherited V8/broker/startup values; ambient config/lock/package/import-map discovery is blocked by `--no-config`, `--no-lock`, `--no-npm`, `--no-remote` and `DENO_NO_PACKAGE_JSON=1`, not by `env -i`.
- The generated hook launched by explicit argv (`.ts`); the shebang/PATH-shim case is a negative control, not a portable launcher.
- The `env -i` compile with the verified `DENORT_BIN`, explicit discovery flags and owned output.

Evidence: probe `dcbd83fd0f944db31d5dee599e69dc43e3f7c129849cc9add2029254f13b5741`; TAP `c92d6664575a71cacfd6506d4b459ce9b69fe864019fd654728d824d12ee9fb4`, **17 passed, 0 failed, 0 skipped**, 3682.92 ms.

Carried, not waived:

- **Gate 1 / ticket 04 gap (§5.10 configuration isolation, §17 runtime/profile selection):** the real Lefthook/init hook route remains later work.
- **Step 6 / §17 native-acceptance item:** direct compiled denort execution was status 0 and did not show the full-Deno broker/V8 failure; it is one darwin-arm64 observation, not a neutralization proof, and not step 6.
- **Step-row evidence-retention gap:** the historical compile-without-discovery-flags RED is self-attested; the retained probe has no such negative control.
- **Platform and fixture limits:** darwin-arm64 only; `.env` non-discovery/reads were not demonstrated; these results do not prove Linux, portable shebang acceptance, network absence or OS/libc acceptance. The hostile fixtures are bounded probe fixtures, not a full §5.10 malicious-environment matrix.

This acceptance does **not** accept a pin, close Gate 1, activate an evaluator, approve any ticket, or admit ticket 01.


### Step 3 — dual-checker feasibility

#### Step 3 blocker — 2026-11-01

Status: the approved step 3 packet was started and stopped. This append does not edit the checklist table above. It does not accept a pin, close build provenance, activate an evaluator, admit ticket 01, or complete dual-checker feasibility.

The approved re-acquisition is recorded in [deno-artifact-candidate.md](deno-artifact-candidate.md#2026-11-01-re-acquisition--step-3-checker-inputs) and [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-01--dual-checker-feasibility-stopped). Official darwin-arm64 `deno` was extracted and hashed, then not executed. Homebrew `deno` was not used. No `.scratch/superman-v0/deno-checker.probe.test.ts` was created. No subject graph was given to tsrs, tsc, or `deno check`.

The stop is the approved declaration rule. `/// <reference lib="NAME" />` may be rewritten only to `/// <reference path="./lib.NAME.d.ts" />`. Twelve referenced names, including `deno.net` at line 5 of the verified `lib.deno.d.ts`, have no `lib.NAME.d.ts` in `cli/tsc/dts` at `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`. The listing has `lib.deno_net.d.ts` and eleven other underscore names. Using those names would be an unapproved filename map, so they were not fetched. No stub was written. A missing file stops the slice.

No RED→GREEN cycle was run. A checker launch against a partial declaration set would not be the required three-graph outcome. Steps 4, 5, 6, and 7 stay independently unstarted. Step 8 remains blocked by this open step 3 row. Closing step 3 needs a separate scope amendment for the filename mismatch, or files that actually have the approved names. This record does not approve either.


#### Step 3 declaration-input amendment — 2026-11-02

**Status: André approved this documentation-only amendment through the Step 3 popup. Step 3 remains open.** The approved candidate changes from a concatenated declaration root to complete, unbundled source declarations at the same commit, using the finite filename map below. This approval permits only this append; acquisition, fixture/probe implementation, checker execution and their exact files/commands/grants still require separate execution approval. The historical stop above and the artifact/bootstrap evidence remain unchanged.

##### Next execution intake and completion boundary

1. **Present a revised Step 3 packet before acquiring or executing its inputs.** Use source commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, with `cli/tsc/dts/lib.deno.window.d.ts` and `cli/tsc/dts/lib.deno.unstable.d.ts` as the two declaration roots. Show the exact 202-declaration inventory below, legal inputs, raw source identities, temporary layout, transformation, public process/report seams, tools, argv, configuration/environment/grants and checks. Intake is complete only after André separately approves that packet; the root choice is not execution authority. Retaining unstable declarations matches bodies already present in the candidate asset, not permission to use unstable APIs.
2. **After that approval, verify the entire input closure before checker launch.** Bind every original file to its exact source path, regular-file Git mode/blob and content digest at the named commit; preserve canonical relative paths, `.d.cts` extensions and the Node/Undici hierarchy. The inventory must equal the approved set, not merely have 202 entries. Unknown names, missing targets, hash/mode differences, escaping paths, unexpected dependencies or unintended duplicate body identities stop the slice. This prevents a partial or substituted declaration environment from producing a misleading result.
3. **Apply only the directive adapter defined below and verify its byte boundary.** Every active source `lib` reference must resolve through the finite map to an existing canonical file. Preserve existing `path` directives, import specifiers, `no-default-lib` directives, line endings, bodies and notices. Record original/transformed hashes and reversible replacement spans; reversing only those spans must restore every original byte. This is complete only when all replacements are accounted for and closure still holds; retain inert later comments rather than treating them as dependency directives.
4. **Run feasibility only under the separately approved checker profiles.** Keep primary tsrs/default-mode `--noEmit`, supplemental native Deno checking and the separate matching-tsc drift comparison. Prove the valid, deliberately invalid and transitive-error graphs through actual process results, with loaded-input provenance and tool/config/permission failures distinguished from meaningful negative cases. Keep declaration checking enabled: no `skipLibCheck`, `skipDefaultLibCheck`, `noResolve`, partial stubs or harness diagnostic filtering to manufacture acceptance. Finish with the existing scoped evidence and independent Standards + Spec review. Only that later evidence can close Step 3; this amendment supplies none of those checker outcomes.

##### Why source roots instead of the release bundle

Fresh-context, anonymous, text-only primary-source research reconstructed the recorded release declaration asset by joining the seventeen source components in [`get_types_declaration_file_text()`](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/mod.rs#L58-L90) with one LF between components. The result matched all **721335 bytes**, sha256 **`d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a`**. This establishes the source assembly of the published text, not the executable's embedded bytes or build provenance.

The bundle's 54 textual reference lines include only three active leading directives: `no-default-lib="true"`, `lib="esnext"` and `lib="deno.net"`. Later concatenated reference lines follow declarations and are inert comments under [TypeScript's directive semantics](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html), also implemented in the [pinned compiler's pragma processing](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/00_typescript.js#L40736-L40788). Loading source dependencies alongside the bundle repeats embedded Net/Temporal bodies; walking all textual lines repeats still more components. A self-path reference is not a valid solution.

The two selected source roots reach every one of the seventeen release components without simultaneously compiling their concatenated copies. Keep the release bundle as identity/reconstruction evidence, **not a compiler input alongside these source roots**. A bundle-aware alternative would have 186 declaration files but require additional embedded-body ownership and reference-pruning rules; that alternative is not selected. Renaming underscore files into dotted aliases does not solve concatenation or the many-to-one Float16 alias. The selected amendment minimizes transformation semantics, not the number of fetched files.

##### Finite library-name map

All canonical filenames below are relative to `cli/tsc/dts/` at the named commit. The map covers **103 referenced library names addressing 102 canonical files**: fourteen Deno names, `node`, and 88 standard-library names. The two source roots are additional entry files, not extra referenced names. Accept only this finite set; an upstream catalog entry outside its reachable set is not implicitly approved.

The twelve underscore exceptions come from [`LAZILY_LOADED_STATIC_ASSETS`](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/mod.rs#L191-L219), whose dotted virtual assets are registered by the [compiler library-map injection](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/99_main_compiler.js#L201-L210). They are regular files here, not inferred `ext/` paths or symlinks.

| Referenced Deno name | Canonical filename |
| --- | --- |
| `deno.broadcast_channel` | `lib.deno_broadcast_channel.d.ts` |
| `deno.cache` | `lib.deno_cache.d.ts` |
| `deno.canvas` | `lib.deno_canvas.d.ts` |
| `deno.console` | `lib.deno_console.d.ts` |
| `deno.crypto` | `lib.deno_crypto.d.ts` |
| `deno.fetch` | `lib.deno_fetch.d.ts` |
| `deno.net` | `lib.deno_net.d.ts` |
| `deno.url` | `lib.deno_url.d.ts` |
| `deno.web` | `lib.deno_web.d.ts` |
| `deno.webgpu` | `lib.deno_webgpu.d.ts` |
| `deno.websocket` | `lib.deno_websocket.d.ts` |
| `deno.webstorage` | `lib.deno_webstorage.d.ts` |
| `deno.ns` | `lib.deno.ns.d.ts` |
| `deno.shared_globals` | `lib.deno.shared_globals.d.ts` |

`node` maps to **`lib.node.d.ts`**, whose existing path reference loads `node/index.d.cts`.

For the standard-library stems in the following table, both the referenced name and canonical file stem are the shown value: prepend `lib.` and append `.d.ts` for the filename. These **87 stems** define 87 physical files and 87 name-map entries; row labels only group the finite inventory.

| Group | Exact standard-library stems | Files |
| --- | --- | ---: |
| Decorators | `decorators`, `decorators.legacy` | 2 |
| ES5 | `es5` | 1 |
| ES2015, first group | `es2015`, `es2015.collection`, `es2015.core`, `es2015.generator`, `es2015.iterable` | 5 |
| ES2015, second group | `es2015.promise`, `es2015.proxy`, `es2015.reflect`, `es2015.symbol`, `es2015.symbol.wellknown` | 5 |
| ES2016 | `es2016`, `es2016.array.include`, `es2016.intl` | 3 |
| ES2017 | `es2017`, `es2017.arraybuffer`, `es2017.date`, `es2017.intl`, `es2017.object`, `es2017.sharedmemory`, `es2017.string`, `es2017.typedarrays` | 8 |
| ES2018 | `es2018`, `es2018.asyncgenerator`, `es2018.asynciterable`, `es2018.intl`, `es2018.promise`, `es2018.regexp` | 6 |
| ES2019 | `es2019`, `es2019.array`, `es2019.intl`, `es2019.object`, `es2019.string`, `es2019.symbol` | 6 |
| ES2020, first group | `es2020`, `es2020.bigint`, `es2020.date`, `es2020.intl`, `es2020.number` | 5 |
| ES2020, second group | `es2020.promise`, `es2020.sharedmemory`, `es2020.string`, `es2020.symbol.wellknown` | 4 |
| ES2021 | `es2021`, `es2021.intl`, `es2021.promise`, `es2021.string`, `es2021.weakref` | 5 |
| ES2022 | `es2022`, `es2022.array`, `es2022.error`, `es2022.intl`, `es2022.object`, `es2022.regexp`, `es2022.string` | 7 |
| ES2023 | `es2023`, `es2023.array`, `es2023.collection`, `es2023.intl` | 4 |
| ES2024 | `es2024`, `es2024.arraybuffer`, `es2024.collection`, `es2024.object`, `es2024.promise`, `es2024.regexp`, `es2024.sharedmemory`, `es2024.string` | 8 |
| ES2025 | `es2025`, `es2025.collection`, `es2025.float16`, `es2025.intl`, `es2025.iterator`, `es2025.promise`, `es2025.regexp` | 7 |
| ESNext, first group | `esnext`, `esnext.array`, `esnext.collection`, `esnext.date`, `esnext.decorators`, `esnext.disposable` | 6 |
| ESNext, second group | `esnext.error`, `esnext.intl`, `esnext.sharedmemory`, `esnext.temporal`, `esnext.typedarrays` | 5 |

The **88th standard-library name is `esnext.float16`**, mapping to **`lib.es2025.float16.d.ts`**, as specified by the [pinned `libEntries` catalog](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/00_typescript.js#L40947-L41065). It shares one physical file with `es2025.float16`; creating another renamed copy would lose canonical deduplication. This is the thirteenth non-literal filename exception, not a dot-to-underscore case.

Resolve each replacement relative to its containing file, because `path` references are relative whereas library names are not. Examples of the approved adapter are:

```diff
 // lib.deno.ns.d.ts
-/// <reference lib="deno.net" />
+/// <reference path="./lib.deno_net.d.ts" />

 // node/index.d.cts
-/// <reference lib="esnext.float16" />
+/// <reference path="../lib.es2025.float16.d.ts" />
```

##### Complete declaration inventory beyond the library map

The physical inventory is **16 Deno files** (the fourteen mapped files plus the two roots), **87 standard-library files**, **one `lib.node.d.ts`**, and the following **58 Node + 40 Undici files**: **202 declarations total**. The additional Node/Undici files are transitive, type-only dependencies of the pinned Deno declarations, not new runtime libraries or npm package substitutions.

For the Node table, prepend **`node/`** and append **`.d.cts`** to every exact stem. Preserve subdirectories.

| Group | Exact Node stems | Files |
| --- | --- | ---: |
| A–B | `assert`, `assert/strict`, `async_hooks`, `buffer`, `buffer.buffer` | 5 |
| C | `child_process`, `cluster`, `compatibility/iterators`, `console`, `constants`, `crypto` | 6 |
| D–E | `dgram`, `diagnostics_channel`, `dns`, `dns/promises`, `dom-events`, `domain`, `events` | 7 |
| F–H | `fs`, `fs/promises`, `globals`, `globals.typedarray`, `http`, `http2`, `https` | 7 |
| I–P | `index`, `inspector`, `module`, `net`, `os`, `path`, `perf_hooks`, `process` | 8 |
| P–S | `punycode`, `querystring`, `readline`, `readline/promises`, `repl`, `sea`, `sqlite` | 7 |
| S | `stream`, `stream/consumers`, `stream/promises`, `stream/web`, `string_decoder`, `test` | 6 |
| T | `timers`, `timers/promises`, `tls`, `trace_events`, `tty` | 5 |
| U–Z | `url`, `util`, `v8`, `vm`, `wasi`, `worker_threads`, `zlib` | 7 |

The [Node entry](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/node/index.d.cts) already references the other 57 `.d.cts` files, including a repeated `dns/promises` path that denotes one file. Keep existing bare module specifiers and intentional ambient-module merging; for example, `inspector/promises` is declared in `node/inspector.d.cts`, `util/types` in `node/util.d.cts`, and unprefixed `buffer` has two merging declaration owners. Do not invent corresponding physical files or rewrite module imports to make them look like filename aliases. The committed declarations are already adapted by the [upstream updater](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tools/update_types_node.ts); consume those committed bytes rather than running it or replacing the corpus with npm `@types/node`.

For the Undici table, prepend **`node/undici/`** and append **`.d.ts`** to every exact stem. The [Undici index](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/node/undici/index.d.ts) and its relative imports reach all forty files.

| Group | Exact Undici stems | Files |
| --- | --- | ---: |
| A–C, first group | `agent`, `api`, `balanced-pool`, `cache-interceptor`, `cache`, `client-stats` | 6 |
| C–D | `client`, `connector`, `content-type`, `cookies`, `diagnostics-channel`, `dispatcher` | 6 |
| E–G | `env-http-proxy-agent`, `errors`, `eventsource`, `fetch`, `formdata`, `global-dispatcher`, `global-origin` | 7 |
| H–M, first group | `h2c-client`, `handlers`, `header`, `index`, `interceptors`, `mock-agent`, `mock-call-history` | 7 |
| M–P | `mock-client`, `mock-errors`, `mock-interceptor`, `mock-pool`, `patch`, `pool-stats`, `pool` | 7 |
| P–W | `proxy-agent`, `readable`, `retry-agent`, `retry-handler`, `util`, `utility`, `websocket` | 7 |

The static walk resolved 162 active source `lib` occurrences, all relative path/import dependencies and the bare ambient-module imports within this inventory. The 202 files include 17 `no-default-lib` directives and no source `types` directives. The [pinned Git tree](https://api.github.com/repos/denoland/deno/git/trees/fe7ed012d92c642fd8e5607ac5a45d517538b5c5?recursive=1) has regular mode `100644`, not symlinks, for all files under `cli/tsc/dts/`. `node/undici/webidl.d.ts`, DOM/worker/desktop libraries and `typescript.d.ts` are outside this reachable closure; their presence elsewhere upstream is not a reason to broaden the environment.

##### Legal inputs and evidence limits

Retain the pinned [Deno `LICENSE.md`](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/LICENSE.md), [Node `LICENSE`](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/node/LICENSE) and [Undici `LICENSE`](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/node/undici/LICENSE), alongside all inline notices. In particular, preserve the Microsoft Apache-2.0 headers, Node documentation notice, Undici attribution and the [MDN/Mozilla CC-BY-SA 2.5 attribution](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/lib.deno.shared_globals.d.ts#L1-L18). The MDN notice supplements the earlier MIT/Apache summary; this text-only inventory is not a redistribution disposition.

The research's in-memory adapter changed 162 directive lines across 57 files, preserved all 17 `no-default-lib` directives and restored **202/202 originals exactly** by reversing only those replacements. This is a text-transformation observation, not a checker RED→GREEN cycle. Parent spot-checks confirmed the pinned assembly/map/catalog, root directives, Node entry and MDN notice. No repository declaration fixture or probe was materialized and no acquired executable, Deno, tsrs or tsc was run during this amendment.

The native Deno host is a TypeScript 6.0.3 fork with its own [diagnostic/merge policies](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/mod.rs#L1250-L1320) and [host filters](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/97_ts_host.js#L776-L894), distinct from the retained tsrs/matching-tsc 7.1 line. Its inline [`reference_types_node.d.ts` helper](https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/mod.rs#L334-L344) is not part of this 202-file source closure and contains a `types="npm:@types/node"` fallback. Before later native checking, identify actual host-injected inputs and reject unapproved npm acquisition/ambient substitutions rather than assuming the external source inventory describes native loading. Report built-in host behavior; do not copy its diagnostic filters into the external checkers or probe. Source reconstruction does not prove matching embedded executable declarations, strict checker compatibility, native-platform acceptance or final pin/build-provenance acceptance.

**Next action:** start only the Step 3-scoped `/implement` intake described in item 1 above, presenting this amended source inventory and the exact revised execution packet for André's separate approval. Keep Step 3 and its dependent Step 8 open; do not start another preparation step or change activation/readiness from this documentation approval.


#### Step 3 execution stop — 2026-11-02

**Status: André separately approved the revised execution packet; its input acquisition/adapter passed, but its valid checker baseline failed. Step 3 remains open; Step 8 remains blocked.** The approved filename obstacle is resolved for this run, not the dual-checker feasibility requirement. The earlier missing-filename stop and documentation-only amendment remain historical, unchanged records.

The [artifact append](deno-artifact-candidate.md#2026-11-02-re-acquisition--amended-step-3-inputs) binds official candidate/source identities and the exact 202-file declaration closure. It preserves all source bodies/notices, the finite 103-name map and reversible directive-only edits. The [bootstrap append](../../.superman/ci/bootstrap-evidence.md#2026-11-02--source-only-checker-baseline-blocked) owns exact commands, tool/input identities, raw outcomes and scope limitations.

| Blocker | Observed boundary | Required next decision |
| --- | --- | --- |
| **S3-B1 — external declaration compatibility** | The valid graph loads the complete approved corpus, but primary tsrs and matching tsc both reject declaration bodies with byte-identical diagnostics | Review a strictly checkable declaration/integration strategy; the approved directive-only map does not authorize body/import edits, pruning, filtering or checker replacement |
| **S3-B2 — native profile acceptance** | Deno exits 0 but explicitly ignores the requested `skipDefaultLibCheck` option; its host asset requests also differ from the external corpus | Review native supported/effective options and actual input provenance before approving a revised profile; do not silently drop the ignored option or credit raw exit 0 |

This Step 3 run created no persistent checker probe or intentionally invalid case. It has no RED→GREEN cycle, complete three-graph result, final repository/full-suite pass or native-matrix acceptance. Those remain unverified because the approved feasibility stop occurred before persistent probe implementation, not because a gate was waived. This run's only repository edits are append-only outcomes in this record, `deno-artifact-candidate.md` and `bootstrap-evidence.md`. The startup probe and unrelated work are preserved; this run performed no real/fixture Git writes, installations, hosted operations, evaluator changes or readiness promotion.

Independent Standards + Spec R2 review of this bounded evidence delta is complete: **Standards 0 remaining hard findings/0 smells; Spec 0 remaining findings**. The initial review-scope finding on each axis was resolved by isolating this run's three Step 3 sections, preserving and excluding concurrent work. At this run's intake, the next independently dependency-ready checklist row was **Step 4, mutation-bridge feasibility** (its prerequisites are 1–2, not 3). Concurrent Step 4 records and mutation/coverage probes subsequently appeared in this shared checkout; they are separate work, not started, adopted or reviewed by this Step 3 run. Their bytes and separate authority/results are preserved, and this record makes no global claim that those rows remain unstarted. The review scope excludes those concurrent additions rather than deleting them. Current Step 3 execution authority does not extend to those steps or a new compatibility strategy.

**Next action:** hold a narrow Step 3 decision review of S3-B1/S3-B2 before approving any new declaration/profile strategy or resuming its implementation. Preserve the failed baseline and current Node evaluator.


#### Step 3 conditional D1 design — 2026-11-02

**Status: André approved conditional D1 as the planning choice; the earlier “Revise design first” selection was withdrawn. Compatibility remains unverified, Step 3 remains open and Step 8 remains blocked.** This section amends only the earlier Step 3 directive-only restriction for the closed derived-input proposal below. It is not execution authority, activated policy or acceptance of a native profile. Historical stops and concurrent Steps 4–7 retain their own scope.

##### Next execution sequence and stop boundary

1. **Complete documentation-only review first.** Review this synthesis on Standards and Spec against a frozen, nonempty intake-relative delta, excluding inherited/concurrent changes. Completion means both independent reports identify any unresolved findings; a clean document review supplies no compatibility or execution evidence.
2. **Present a fresh external-D1 packet for separate popup approval.** Acknowledge the three prior stops: missing approved filenames, the failed strict valid baseline, and Q2's unsupported inspection option. Show exact files, preimages/reversible spans, temporary layout, tools/identities, inspection seams, argv, environment, limits and verification commands. Prior approvals do not resume stopped packets; obtain explicit acknowledgement before a further checker attempt.
3. **After execution approval, establish inspection capability and test the valid baseline first.** Verify the complete input/profile identities and actual resolution under both retained external tools. Stop at the first inspection, identity, resolution or baseline failure, preserving every diagnostic. Do not substitute matching-tsc inspection for missing tsrs evidence or add repairs to continue the packet.
4. **Only after that valid baseline passes, exercise invalid and preservation controls.** Direct-invalid and transitive-invalid subjects must fail for their intended type errors; declaration/default-library checks and the preservation obligations below need fresh evidence. New generator/probe behavior requires meaningful public-process TDD, not a declaration/configuration/tool/permission failure relabeled feature RED. Finish applicable checks and independent review of the actual delta. Native work needs its own supported profile and exact authority; external success alone cannot close Step 3.

##### Closed proposed transformation allowance

Retain all 202 immutable original declarations from `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, including the two roots `lib.deno.window.d.ts` and `lib.deno.unstable.d.ts`, the 103-name map/13 non-literal mappings and canonical hierarchy; retain separately the three legal files and all notices. The release bundle remains identity-only. Keeping unstable declarations does not authorize unstable APIs.

Only a separately approved derived representation may contain these transformations:

| Family | Exact allowance | Boundary |
| --- | --- | --- |
| Existing directive adapter | 162 replacements across 57 files, as already recorded | Preserve all 17 `no-default-lib` directives and existing canonical deduplication |
| Undici module literals | The 100 sites below across 30 files: 90 imports, nine star re-exports and one named re-export | Replace only the literal suffix `.d.ts` with `.js`; preserve syntax and type/value bindings; require the same 39 canonical declaration targets under actual 7.1 resolution |
| Realm guards | The ten sites below in two files | Insert only the specified Deno branches; preserve existing `onmessage` branches and unchanged Node/Undici fallbacks |

Together these are 272 logical edit sites across 89 files, not permission to edit other spans. Bind exact preimages, byte spans and original/derived digests in the future execution manifest; reversing only those spans must restore all 202 originals exactly. Preserve all unrelated bytes, line endings and notices. Reversibility proves source recovery, not semantic equivalence.

###### Exact module-literal sites

Paths below are relative to `raw-dts/node/undici/`; append `.d.ts` to each stem. Coordinates are 1-based original line:column, identifying the literal's opening quote. This closed set is the original baseline's 100 TS2846 sites, not permission to rewrite every matching string. That log has SHA-256 `6ee0a99b07b12ad866d215b10f8431a734b2865da7531e1e3f06e3c0c6e5913e`.

| File stem | Exact coordinates |
| --- | --- |
| `agent` | `2:18`, `3:24`, `4:26`, `5:24` |
| `api` | `3:24` |
| `balanced-pool` | `1:18`, `2:24` |
| `client-stats` | `1:20` |
| `client` | `2:24`, `3:28`, `4:26` |
| `diagnostics-channel` | `3:28`, `4:24` |
| `dispatcher` | `5:37`, `6:26`, `7:26`, `8:20`, `9:30` |
| `env-http-proxy-agent` | `1:19`, `2:24` |
| `errors` | `1:37`, `2:20` |
| `eventsource` | `1:42`, `2:24`, `8:8` |
| `fetch` | `7:26`, `8:30`, `9:24` |
| `formdata` | `4:38` |
| `global-dispatcher` | `1:24` |
| `h2c-client` | `2:24`, `3:28` |
| `handlers` | `1:24` |
| `header` | `1:30` |
| `index`, lines 1–10 | `1:24`, `2:58`, `3:50`, `4:18`, `5:51`, `7:26`, `8:20`, `9:23`, `10:28` |
| `index`, lines 11–20 | `11:20`, `12:19`, `13:24`, `14:22`, `15:23`, `16:53`, `17:24`, `18:24`, `19:31`, `20:26` |
| `index`, lines 21–34 | `21:24`, `22:61`, `23:26`, `25:15`, `26:15`, `27:15`, `28:15`, `29:15`, `30:15`, `31:15`, `32:15`, `33:15`, `34:31` |
| `interceptors` | `1:26`, `2:24`, `3:26` |
| `mock-agent` | `1:19`, `2:24`, `3:48`, `5:33` |
| `mock-call-history` | `1:24` |
| `mock-client` | `1:20`, `2:24`, `3:23`, `4:48` |
| `mock-errors` | `1:20` |
| `mock-interceptor` | `1:37`, `2:24`, `3:35` |
| `mock-pool` | `1:18`, `2:23`, `3:48`, `4:24` |
| `pool-stats` | `1:18` |
| `pool` | `1:20`, `2:24`, `4:24` |
| `proxy-agent` | `1:19`, `2:28`, `3:24`, `4:37` |
| `retry-agent` | `1:24`, `2:26` |
| `retry-handler` | `1:24` |
| `websocket` | `10:8`, `11:24`, `12:29` |

No implementation `.js` stubs, blanket `import type` conversion, path aliases, duplicate bodies or replacement declarations are proposed. An unexpected resolution target rejects D1 rather than authorizing another spelling or signature repair.

###### Exact realm-guard sites

All paths/lines below are relative to the immutable `raw-dts/` corpus. Independent substantive Deno declarations must supply each selected global; `{}` means no additional inherited base, not an API stub.

| Guard site | Selected published Deno owner |
| --- | --- |
| `node/globals.d.cts:6`, `_Request` | `lib.deno_fetch.d.ts`, `Request` |
| `node/globals.d.cts:7`, `_Response` | `lib.deno_fetch.d.ts`, `Response` |
| `node/globals.d.cts:8`, `_FormData` | `lib.deno_fetch.d.ts`, `FormData` |
| `node/globals.d.cts:9`, `_Headers` | `lib.deno_fetch.d.ts`, `Headers` |
| `node/globals.d.cts:10`, `_MessageEvent` | `lib.deno_web.d.ts`, `MessageEvent` |
| `node/globals.d.cts:11`, `_WebSocket` | `lib.deno_websocket.d.ts`, `WebSocket` |
| `node/globals.d.cts:12`, `_EventSource` | `lib.deno_fetch.d.ts`, `EventSource` |
| `node/globals.d.cts:13`, `_CloseEvent` | `lib.deno_websocket.d.ts`, `CloseEvent` |
| `node/perf_hooks.d.cts:920–924`, `PerformanceObserver` | `lib.deno.shared_globals.d.ts`, global constructor |
| `node/perf_hooks.d.cts:930–934`, `PerformanceObserverEntryList` | `lib.deno.shared_globals.d.ts`, global constructor |

For each of the eight aliases, retain the original `onmessage` branch, then insert `typeof globalThis extends { Deno: unknown } ? {}` before the unchanged Undici import fallback. For each performance global, retain its original branch, then test `typeof globalThis extends { Deno: unknown; PerformanceObserver: infer T } ? T` (using `PerformanceObserverEntryList` for the other site) before the unchanged Node-class fallback. Constructor self-inference remains a hypothesis to reject if circular or binding-order-dependent.

This is an explicit semantic owner-selection amendment, not a cosmetic edit or reconstruction of native filtering. Precision is measured against the selected published owner, not the invalid raw cross-realm merge. Preserve published Deno types, including existing `Body.json(): Promise<any>`; preserve explicit Undici's `Promise<unknown>` and `Request.duplex`. Existing owner types do not authorize new widening elsewhere.

##### Preservation and inspection acceptance

| Obligation | Required evidence before compatibility acceptance |
| --- | --- |
| Corpus/profile and marker integrity | Independently validate exact complete inputs, complete Deno owners and protected profile. Ambient `{ Deno: unknown }` is a type-level selector, not runtime identity or authority; forged/incomplete ambient inputs must not be accepted as the reviewed corpus |
| Resolution and bindings | Prove every rewritten edge reaches its original canonical declaration with unchanged type/value bindings under both pinned external tools, with no ambient substitution, implementation stub or duplicate body |
| Published global precision | Check required members, return types, constructors/statics, overloads, inference and negative assignability against the selected Deno owners; reject missing APIs, new widening, error-recovery `any`, cycles or binding-order-dependent results |
| Computed module exports and fallbacks | Preserve explicit Node/Undici APIs and affected transitive ambient references, plus original browser and non-Deno fallback precision. Unchanged export text alone is insufficient proof |
| Strict checking and inspection | Retain the original strict ESNext/Bundler external profile, tsrs `0.20.1-ts7.1.0-beta` default mode/`--noEmit`, matching tsc `7.1.0-beta`, both skip-check flags false and complete declaration checking. Do not revive NodeNext by default, filter diagnostics or hide inputs |

The installed `tsrs/sync` and `tsrs/async` clients expose configuration/program/resolution inspection surfaces, but their runtime capability and relationship to CLI behavior remain unverified. `Program.getCompilerOptions()` reports parsed options, not every implicit default. Any future API use needs an explicitly bound native executable/cwd, controlled environment, `runExternalCode:false` and separately proved CLI relationship; source declarations alone are insufficient.

Residual diagnostics or failed preservation reject the candidate without opportunistic edits. Other conditions, including `PerformanceResourceTiming`, remain untouched and visible as risks; the original 127 diagnostics are not a complete API inventory. Preserve all historical failures and the current Node evaluator.

##### Native and authority boundaries

S3-B2 remains open: omitting unsupported `skipDefaultLibCheck:false` is only a conditional design possibility requiring equivalent effective checking, disclosed host behavior and fresh verification. No native profile is accepted. Native entry-graph success cannot substitute for complete declaration-body/scope/provenance evidence; D1 does not close those gaps.

The [Q2/source-audit evidence append](../../.superman/ci/bootstrap-evidence.md#2026-11-02--step-3-q2-stop-and-source-only-d1-audit) records actual outcomes and missing native-policy sources. Additional acquisition or native checking requires separate authority; retain unknowns rather than fetching or guessing.

This synthesis creates no ticket, issue, label, catalog/registry publication or readiness promotion. It permits no declaration/configuration change, acquisition, helper/checker execution, installation, credential access, real-repository Git write, hosted write or activation. The numeric Deno candidate and release-origin evidence are not final pin/build-provenance acceptance.

**Next action:** finish the frozen documentation-only Standards + Spec review, then present the fresh external-D1 execution packet through a popup. Do not resume Q2 or start checking from this design approval.

##### Step 3 D1 documentation review — 2026-11-02

**Status: the documentation-only D1 review is complete and clean on both axes. Step 3 remains open; Step 8 remains blocked. No packet is approved or presented here.**

The frozen review delta was `superman-review-step3-d1-r3`, fixed point HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`, 410 lines across eight sections: the Step 3 checklist row; the historical missing-filename blocker; the declaration-input amendment; the failed strict-baseline stop; the conditional D1 design; the amended Step 3 acquisition append; the source-only baseline bootstrap append; and the Q2/source-audit bootstrap append. Manifest SHA-256: `c7e6329f70820f25b26d1df4912b755fe7db26098c7e33e52b10a206f4c233f3`.

**Standards review — clean, 0 findings.** R1 findings were resolved: the native trace now distinguishes 150 inventory filenames from 12 host-mapped dotted virtual names and does not call request names resolved canonical targets; the frozen checklist includes all 13 rows and the feasibility-stop paragraph; and the D1 sentence separates the 202 declarations from the three legal files. The only residual note is non-blocking wording: “retain separately the three legal files and all notices” could be read as scoping “separately” over the inline notices; this does not change the evidence or authorization.

**Spec review — clean, 0 findings.** The Step 3 row remains correctly open. The design requires a complete tiny entry graph with valid and deliberately invalid/transitive cases under primary tsrs and supplemental Deno checking, with matching tsc only as separate drift evidence. The three prior stops (missing approved filenames, failed strict valid baseline, Q2 unsupported inspection option) remain preserved and classified. S3-B1/S3-B2 remain open. Both skip-check flags are required false; the ignored `skipDefaultLibCheck:false` is disclosed and remains conditional on equivalent effective checking and fresh verification. A clean document review supplies no compatibility, native-profile, Gate 1 or ticket 01 evidence.

Remaining decisions for the future packet, not findings against this design:

1. Define the direct-invalid and transitive-invalid subject graphs and their intended diagnostics.
2. Select and prove the inspection seam; do not resume Q2.
3. Bind all 272 preimages/spans/digests and prove the combined 202/202 reversal for the full derived representation.
4. Resolve S3-B2's effective-checking path and the residual diagnostics; the original 127 diagnostic locations and risks such as `PerformanceResourceTiming`, TS2430 and TS2403 remain unmapped.

**Next action:** present the fresh external-D1 execution packet for separate approval. Do not execute it from this review. No commit, push, install, network, activation, native-profile acceptance or ticket 01 admission follows.

##### Step 3 D1 execution — 2026-11-02

**Status: André approved the packet with “I approve it.” The preflight and external valid baseline pass; native S3-B2 still blocks. Step 3 remains open and Step 8 remains blocked.** This append records actual outcomes only. It does not accept a pin, native profile, Gate 1 or ticket 01.

**Roots.** Retained read-only `T0` `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step3-fldy0ns2`; new owned `T1` `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step3-d1.9WHBCb`. No acquisition, install or network occurred.

**Preflight.** The derived manifest contains **202 declarations, 272 edits across 89 files**: 162 directive edits/57 files, 100 Undici literals/30 files, 10 realm guards/2 files. `derived-manifest.json` sha256 `404f2d944928419dda52c1b970f321bc0a1f9e0164567ac993a3349402cb7461`; `reversal.json` `8ee4f90cbf92b95285ca8a0c4c2e0d3879ed53fbd8cf093f621d1188aa0ee983`; `preflight.json` `a693ca689ee32a7416d77e05ac854c072138194c4269f25941fcac7f0180864c`. Reversal restored **202/202** with zero mismatches; `noOtherSpans:true`; `releaseBundleLoaded:false`; adapted tree hash `52cf1f56e2265d5899e71e11e7e4fa5ced171b8b00c21f52285e9f6f7743034f` and derived tree hash `c0527affba309a19947a225d26a4871b8a756ae6e571c2d42d76c1ed595e50d8`. The manifest’s own identity is `3bba054913b9bc7b58cf5254a72de04112e9e8bcdfd19fe375cbea6f2fa0b575`. The builder validated the input-verification counts, acquisition commit/tree/inventory/mapping, legal and mechanism counts, declaration names, symlink roots, parent target segments, declaration target suffixes and directive preimages/replacements.

**External valid baseline — green.** Primary tsrs and matching tsc both exited **0**, loaded exactly **204** files (202 derived declarations plus `entry.ts` and `nested/child.ts`), and emitted no diagnostics. Both stdout hashes are `305b14b6dfcf16f7dfc59439e336ae52e623b638b718154d50e3fdf4c2fb22b5`; stderr is empty. The prior 127-diagnostic external failure is resolved for this exact derived candidate. This is not a Step 3 closure: the invalid/transitive row clauses were not exercised after the native stop.

**Native S3-B2 — still open.** Deno exited 0, but stderr sha256 `67ce0f6bf0cdaa78acfe0f246f02c78895371bf8857af4beb6cf981147e8a9cf` contains:

```text
Unsupported compiler options in ".../config/deno.valid.json".
  The following options were ignored:
    skipDefaultLibCheck
```

Raw exit 0 is not a pass. The native profile is not accepted; S3-B2 needs a separate supported-profile decision and exact authority.

**RED→GREEN.** The generator’s tiny exported-function test first failed against an unimplemented stub: RED TAP `f1bc8e8bee940733bf7a6dac6378108405586628b59c05e1a59a47df7564df10` (1 test, 0 passed, 1 failed, `D1 generator not implemented`). This is a red-on-revert replay, not a test-first authoring claim. With the implementation restored, the final TAP is `d57942af7c24cb3563d152ccb771319883fe27795ba5adbdb62eebbcbffc79a4`: tiny test passed; the full sequence stopped at S3-B2 (1 passed, 1 failed). Module `deno-checker.manifest.ts` `b913d41e930018c7092dd998dcc62712307be605b65f40ed666d11fcd1503fc5`; probe `deno-checker.probe.test.ts` `68c14a36ba5189c5f185ee82c121a93d91390dd72937b548e5d8afb360a42576`.

**Stop boundary.** An earlier harness run reached the four controls because its native warning regex missed the multi-line ignored-option text; `controls.json` was removed and **no control is credited**. The retained final run stopped at S3-B2 before the controls; the next packet must not assume controls were never attempted. No direct-invalid, transitive-invalid, declaration-conflict or default-library control is credited in the retained final run. No native success, native-profile acceptance, Step 3 closure or Step 8 unblock follows.

Still required before any Step 3 closure: actual resolution/binding evidence for the rewritten edges and the 39 canonical targets; published-global precision checks; computed-export/fallback preservation; the invalid/transitive controls; and meaningful public-process TDD for any new generator/probe behavior. The tiny exported-function red-on-revert replay does not satisfy that TDD obligation. These are designed-but-unverified, not execution results.

The final scoped checks passed: project `tsrs --noEmit` 0; `biome ci` 50 files 0; single-file `tsrs --ignoreConfig` 0; single-file Biome 2 files 0; `git diff --check` 0. Retained check evidence: `final-checks.json` `a05b0f3ad3f820a7af63ca9c7d5111332d4d077a0a72027941ed4e7b3ba88f76`.

**Next action:** hold a narrow S3-B2 supported-profile decision before any renewed native or invalid-control execution. Do not resume Q2. No commit, push, install, network, activation or ticket 01 admission.

**Post-review:** independent Standards + Spec R4 review of frozen bundle `superman-review-step3-d1-exec-r4` (manifest sha256 `fb693a95883b8c100268036cb2b22fe9c47dc991eecf55ea8de5028a6b279580`) is clean — Standards PASS, Spec 0 findings. This sentence is the only later change; no measurement bytes changed.


#### Step 3 S3-B2 native-contract amendment — 2026-11-03

**Decision: André selected “Confirm bounded design” after the source-only `grill-with-docs` review, confirming the native-scope amendment and existing real-checker process/report testing seams. Native-profile acceptance remains pending; Step 3 stays open, Step 8 blocked and ticket 01 unadmitted.** This is the decision home for that amendment, synthesized through scoped `to-spec`; [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-native-source-audit) owns source findings and historical acquisition/inspection outcomes.

##### Continuation sequence

1. Finish independent Standards + Spec review of the frozen, nonempty documentation delta against this invocation's intake, including additions and excluding inherited/concurrent changes.
2. In the subsequent `/implement` invocation, perform read-only intake and present a fresh exact packet: owned files/preimages/reversible spans, retained tool/input paths and hashes, provenance, public process/report seams, argv/cwd/config/environment, fixture inputs and ownership, fresh per-invocation caches, limits/cleanup and verification/stop criteria. Obtain explicit approval of that packet before code changes or generator/test/checker execution. Earlier design/acquisition approvals do not authorize it. Acknowledge the missing-filename, strict-baseline and Q2 inspection stops; do not resume Q2. Further acquisition needs its own bounded authority.
3. Under that later approval, establish fresh valid baselines before crediting negative/preservation controls. Preserve all raw outcomes and stop at a failed required condition; do not repair the contract opportunistically. New generator/probe behavior needs meaningful public-process RED→GREEN, followed by applicable checks and independent review of the owned implementation delta. The earlier stub replay remains red-on-revert, not chronological TDD.

##### Confirmed scope, not native equivalence

Keep exact primary/default-mode tsrs `--noEmit` over the **complete 202-declaration D1 corpus**, with `skipLibCheck:false` and `skipDefaultLibCheck:false`; matching-tsc drift remains separate. The [D1 transformation/preservation contract](#step-3-conditional-d1-design--2026-11-02), including all 100 rewritten edges/39 targets and unchanged type/value bindings, remains in force.

Supplemental native checking means **whole-TypeScript-program diagnostics under the pinned Deno type-oriented graph and built-in filtering semantics**. At source commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, `--all` selects whole-program diagnostics but `check` still uses `GraphKind::TypesOnly` and fixed upstream filters. This explicitly supersedes the stronger/unqualified native-equivalence condition in the historical D1 “Native and authority boundaries” wording and its review summaries. Those records remain unchanged as history. It is not a claim that native and external checkers validate identical declaration bodies or emit identical diagnostics, and it does not authorize copying native filters into external checkers or the probe.

Required operational inputs must remain accounted for. Unexplained omissions, missing resolved-input/content provenance, failed controls and failed D1 preservation remain blockers. A smaller observed native graph cannot silently redefine the required operational scope. Source inspection and synthetic controls cannot certify every embedded declaration body or establish binary/source correspondence.

##### Proposed native profile and admission boundary

The following are design templates, not executable authority; the later packet must bind absolute executable/config/entry paths and all environment values:

```text
check --all --allow-import --deny-import --no-npm --no-lock --node-modules-dir=none --config=<approved-config> <approved-entry>
```

**Both import flags must remain bare and inseparable; no host-valued allow entries.** Explicit bare `--allow-import` prevents implicit allowed-host descriptors; with both empty lists, global denial wins. Bare denial alone leaves an allowed-host hole, while bare allowance alone is permissive. This is an import-specific source-supported boundary, not a runtime network grant or OS sandbox. At this pin `--all --no-remote` conflicts, and accepted `check --cached-only` is not applied; neither is an alternative profile.

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "skipLibCheck": false,
    "lib": ["deno.window", "deno.unstable", "esnext"],
    "types": []
  },
  "vendor": false
}
```

`skipLibCheck` is supported and defaults false; keep it explicit. Omit unsupported `skipDefaultLibCheck`: source inspection establishes that omission leaves its skipping mechanism falsy, not that Deno accepts that option or that every library body was checked. Retaining unstable declarations does not authorize unstable APIs.

- Admit only protected, identity-bound local config/entry/declaration inputs and accounted-for built-ins. Exclude import maps, `extends`, packages, workspaces, vendor content, remote configuration and unapproved remote/JSR/npm inputs before launch; reject ambient substitutions. The exact packet must prevent ambient config/package/lock discovery, not merely name a config file. Deliberately invalid acquisition-control inputs require explicit packet scope.
- Use verified absolute hosts through a clean broker-free `/usr/bin/env -i` boundary and an explicit allowlist, including owned HOME/TMPDIR/cache paths and package-discovery/update/prompt controls. Do not inherit broker, resolver, startup or registry overrides. The prior source/hook launch measurements do not automatically prove this new checker route.
- Use a **genuinely fresh empty `DENO_DIR` for every invocation**, including each control, retry and `info`; a reusable per-label directory is insufficient. A cached “Already type checked” result cannot earn fresh checking credit.
- Retain complete raw stdout/stderr within the approved bounds, exit/signal outcomes, exact tools/config/input identities and diagnostic owning files/locations. Exceeding an output limit stops the packet; tails/hashes alone cannot substitute for the required complete output.

Keep graph inspection separate, with its own fresh cache and the same protected local-input/environment boundary:

```text
info --json --no-remote --no-npm --no-lock --node-modules-dir=none --config=<approved-config> <approved-entry>
```

`info` constructs a graph and is not passive; it accepts neither `--all` nor `--cached-only` in this profile. Its output is later observation, not pre-launch admission or checked-body evidence.

##### Required evidence before native-profile or Step 3 acceptance

| Obligation | Credit and limit |
| --- | --- |
| Fresh valid baseline | Bound the exact binary/profile/inputs and full outputs; retain strict complete external checking and the separate drift comparison. Ignored options, tool/config/permission failures and cached native results are not a valid checking pass. |
| Direct/transitive errors | Observe intended `TS2322` errors at the direct subject and transitive leaf through the actual checker process/report seam, not merely a nonzero exit or matching diagnostic code elsewhere. |
| Declaration semantics | Keep binder redeclaration `TS2451` distinct from a genuine declaration-semantic constraint error such as `TS2344` in an admitted local declaration, including its transitive reachability. Binder errors alone do not prove semantic body checking. |
| Library selection and embedded semantics | An `es5`/`Map` control establishes library selection only. The proposed ambient `Array<T>` augmentation with `index?: string`, seeking `TS2430` owned by `asset:///lib.es5.d.ts` at `RegExpMatchArray`/`RegExpExecArray`, is **untested**. Success would prove only those exercised relationships. A custom `no-default-lib` marker does not by itself classify that file as a default library in this fork. |
| Denial before acquisition | Exercise only the exact approved invalid-input controls and distinguish permission denial from resolution, configuration and tool failure. Establish rejection before acquisition; a network failure or post-run `info` inventory is not that proof. |
| Native provenance/accounting | Reconcile requested names, successfully loaded/resolved inputs, content identities and checking evidence separately, including injected inputs and unexplained omissions. The amendment does not excuse missing required evidence. |
| D1 preservation | Complete all 100 rewritten-edge/39-target resolution and type/value-binding checks under both external tools, published-global precision, computed Node/Undici exports, browser/non-Deno fallback precision and credited invalid/transitive controls. Existing reversal and green valid-baseline evidence alone are insufficient. |

The earlier external 204-input baseline remains historical green; the final native invocation was cached, and earlier controls were attempted but uncredited. The [evidence append](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-native-source-audit) preserves their exact limits and the prior acquisition/inspection stops. This synthesis changes only these local records and necessary spec §5.10 wording. Existing numbering/statuses and concurrent work remain intact. No checker execution, native-profile/pin acceptance, Step 3 closure, Step 8 unblock, Gate 1 approval/merge, activation or ticket 01 admission follows; real-repository staging/commit, push, install and hosted changes require separate authority.


#### Step 3 S3-B2-A1 measurement prerequisite — 2026-11-03

**The separately approved bounded measurement completed all 32 planned target invocations. Native-profile acceptance remains pending; Step 3 stays open, Step 8 blocked and ticket 01 unadmitted.** André replied “yes” to the presented exact S3-B2-A1 packet and its explicitly narrower measurement-first scope. That approval covered one temporary recorder, the named controls/loopback observer and these evidence appends; it did not authorize full D1 implementation. [Bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-a1-fresh-process-measurement) owns the raw-result identities, exact observations and limits.

Here `R` is `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-s3-b2-continuation-packet-bkfqxd8t`, and `E` is `R/execution`. Approved `R/packet.md` SHA-256: `a322348e51e942221555ed1773f9b26b6cd0bde8dc34201b444f623e656140a8`; frozen intake `R/intake.json`: `d92333e12e0e2ad4bb94e12b07a7e184287457dcac9de4d1f3f92e73fab81317`. The approval is retained in `E/evidence/approval.json`; the proposal/freeze records retain their original pre-approval wording.

##### Evidence supplied at the approved fixture scope

| Obligation | Actual observation and bounded credit |
| --- | --- |
| Fresh complete external baseline | Primary/default tsrs `--noEmit` and separate matching-tsc both exited 0 with exactly **204 files: all 202 D1 declarations plus two subjects**. Both external skip-check flags remained false. The derived corpus was copied byte-for-byte, not regenerated. |
| Reviewed native profile | Fresh `deno check --all --allow-import --deny-import --no-npm --no-lock --node-modules-dir=none --config=… …` passed the valid subject. Both import flags were bare; the reviewed full config omitted unsupported `skipDefaultLibCheck`. Stderr was `Check entry.ts`, with no ignored-option warning or cached-check claim. |
| Direct/transitive checking | All three tools reported the intended `TS2322` at `direct/entry.ts:1:7` and `transitive/leaf.ts:1:14`. |
| Binder versus declaration semantics | All three tools reported `TS2451` at both `binder/conflict.d.ts:1:15,2:15`, separately from transitive `TS2344` at `semantic/constraint.d.ts:2:30`. These establish the named relationships, not all declaration bodies. |
| Library selection | A fresh valid es5-only subject passed all three tools; the separate `Map` subject produced `TS2583` at `es5-map/entry.ts:1:20`. This is selection evidence only. |
| Embedded semantic canary | Following a fresh valid native control, augmentation produced **two `TS2430` diagnostics owned by `asset:///lib.es5.d.ts`**, at `RegExpMatchArray:961:11` and `RegExpExecArray:976:11`. The previously untested hypothesis is now measured for these two relationships only. |
| Denial controls | HTTP loopback, the implicit-allow host and JSR metadata failed with import-permission errors; npm failed specifically under `--no-npm`. All four errors pointed to their entry at `1:8`. The responsive loopback observer saw one self-control request and **zero denial-phase connections/requests**. External cases have the narrower diagnostic/source-path/cache evidence described in bootstrap evidence. |
| Separate graph observation | One fresh `info` invocation observed the two admitted local subject modules. It supplies neither complete compiler-input/embedded-content provenance nor checked-body evidence. |

All target stdout/stderr was retained in full: **64 streams, 326,168 bytes total**, largest stream 31,846 bytes. Each of the 32 target calls used a distinct newly created empty `DENO_DIR`; the recorder had its own additional fresh directory. The complete recorder run took about **8.44 seconds**, with no limit reached, signal termination or retry. Separate matching-tsc diagnostic comparisons matched in all seven external cases. No runtime fixture execution, source acquisition, API session or generator/probe execution occurred.

##### Remaining blockers and completion boundary

All **100 rewritten-edge/39-target** resolution/type-value bindings, published-global precision, computed Node/Undici exports and browser/non-Deno fallback precision still need their preservation evidence. API-to-CLI correspondence remains unproved. Actual native resolved-input/content accounting, injected inputs, embedded-body coverage and the earlier unexplained omissions remain unresolved; the smaller `info` graph cannot redefine required operational inputs. This macOS arm64 measurement establishes no other-platform result.

The prior missing-filename, strict-baseline, Q2, API-intake, deadline-helper and acquisition/inspection stops remain history; **Q2 was not resumed**. The historical stub remains **red-on-revert**, not chronological TDD. This one-shot recorder earns no reusable probe/supervisor or deadline-enforcement acceptance. New generator/probe behavior, temporary or persistent, still requires a separately approved test-first packet at the reviewed public seams.

Only this append and the bootstrap append are repository-owned changes in S3-B2-A1. Both captured prefixes and all 137 repository intake files matched before appending; `spec.md`, the generator/probe and retained evidence were preserved. Independent Standards and Spec review uses the same frozen nonempty intake-relative delta under `E/review/r1/`, including the temporary recorder/config/fixture/command/result additions and raw/cache identities; reports and the post-review preservation receipt are separate artifacts there. No real-repository staging/commit, push, install, hosted change, publication or activation is authorized or performed by this packet. Further execution requires a new exact packet and approval.


#### Step 3 S3-B2-A2 execution stop — 2026-11-03

**The approved API-evidence slice stopped during its fourth version check, before a valid checker baseline or TDD cycle. Native-profile acceptance remains pending; Step 3 stays open, Step 8 blocked and ticket 01 unadmitted.** André answered “yes” to the exact S3-B2-A2 packet at SHA-256 `d1b624f905873e49fb41cc302fd5a7d1d95045c068877483f2bf052f170e79bd`, including its bounded permissions and historical-stop acknowledgements. This approval does not transfer unused invocations to a recovery attempt.

Here `R` is `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-s3-b2-a2-intake-wml1p558`, and `E` is `R/execution`. The [bootstrap outcome](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-a2-version-preflight-stop) owns exact raw evidence, identities and limitations. Fresh preflight revalidated the frozen packet, 137 repository paths, HEAD/index, retained inputs and A1 evidence before creating E. All 202 D1 declarations were copied unchanged; copying supplies no loaded-file or checking evidence.

Four target processes ran: Node, tsrs, matching tsc and Biome `--version`, each through its own recorder host. All four tools exited 0 with the expected version number and empty stderr. Biome emitted `Version: 2.6.4\n\n`; the new recorder incorrectly required exactly one trailing newline and exited 1. That recorder validation failure triggered the packet's stop boundary. It is **not feature RED**, a compiler diagnostic, a tool-version mismatch or successful completion of the API slice. The raw output and failed assertion remain unchanged; no correction, normalization or retry was executed.

There were **zero** CLI subject checks, observer/native API sessions, Deno invocations, TDD cycles, source typechecks or lint invocations. Only `E/src/record.mts` was authored; the observer and its test were not reached. The recorder includes unexecuted observer/native launch paths, but no new probe behavior or reusable supervisor is accepted. Its host receipts retain shell exit codes and recoverable PIDs, not direct OS wait-signal observations or measured recorder-host wall times; those omissions remain limitations for recovery. The earlier watchdog still has `staticP2Closed:false`, and the historical generator stub remains red-on-revert.

The next dependency-ready work is a **fresh exact recovery packet** addressing the observed version-output assumption and incomplete host lifecycle evidence before the still-unreached A2 prerequisites. It has not started. API-to-CLI correspondence; all 100 rewritten-edge/39-target resolution and type/value bindings; published-global, computed-export and fallback precision; and native resolved-content/injected-input/embedded-body reconciliation remain unproved. A1 and Q2 history are preserved; neither was rerun or resumed.

Only this append and the bootstrap append are repository changes in A2. Independent Standards and Spec review uses the same frozen, nonempty intake-relative delta at `E/review/r1/`, including the recorder's revisions, all temporary additions and raw evidence. Reports and the post-review preservation receipt are separate artifacts there; these repository postimages stay frozen during review. No staging/commit, acquisition, installation, push, hosted write, publication or activation occurred.


#### Step 3 S3-B2-A3-R pre-use stop — 2026-11-03

**The approved recorder-recovery slice stopped at read-only review of its unexecuted administrative capture capsule, before any measured launch. Step 3 remains open, native-profile acceptance pending, Step 8 blocked and ticket 01 unadmitted.** André answered “approve” to packet SHA-256 `70d52da87af06e9d21e25fd016e22775ae5389e205070b0cd37ed97feb9cdf19`; the approval covered that bounded slice, including its historical-stop acknowledgements and disabled commit default.

Here `R` is `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-s3-b2-a3-recovery-intake-us3o79cz`, and `E=R/execution`. The [bootstrap append](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-a3-r-pre-use-capsule-stop) owns exact identities and findings. Approval preflight matched 13,084 identity rows before exclusive E creation and seven exact static fixture/config files. Resume revalidation matched 17,731 comparisons, all 137 repository preimages, seven historical roots with 3,655 entries, tools/inputs and Git anchors. These are preservation observations, not runtime qualification.

The sole authored capsule draft is `E/source-revisions/administrative-capture.txt`, SHA-256 `5a6331610983b2f602c65a32fdfe621cafcef1cbaf5275288c26a66fc11d0878`. Static review found an unreachable credited-RED continuation, unconditional rejection of the three required smokes, a restarted cleanup allowance with premature close timestamps, exception-path raw/storage/receipt gaps, and an overbroad source-check loaded-file allowlist. It remains unaltered and unsealed for execution. Packet §4 requires a new packet for source alterations, so no corrected draft or trial launch was substituted.

Actual measured hosts, recorders, targets, fixture leaves and capsule invocations are **zero**. The three TypeScript sources, C1–C6, four version baselines, final suite, three smokes, source checks and lint were never reached. The 60-minute measured window never started. There is no process raw/status/cleanup evidence or feature RED to claim; this is a static preparation stop. A2's findings and the historical deadline helper's `staticP2Closed:false` remain unresolved.

`E/evidence/obligation-ledger.md` records this new capsule prerequisite and every still-open D1/native/platform requirement. The next dependency-ready work is fresh intake and an exact approval packet for capsule recovery and independent findings, followed by qualified recorder evidence. API correspondence, all 100-edge/39-target resolution and per-use bindings, global/export/fallback precision, native content/injected-input/body reconciliation and Linux x64/arm64 evidence remain outstanding.

Only this append and the bootstrap append modify repository files in A3-R. The same nonempty intake-relative owned delta, including every temporary addition and the unexecuted capsule, is frozen at `E/review/r1/` for independent Standards and Spec review. Final reports, judgement disposition and post-review preservation receipt are separate artifacts there; these repository postimages stay frozen. Historical inputs and unrelated work remain preserved. No acquisition, installation, staging/commit, push, hosted write, publication or activation occurred.


#### Step 3 S3-B2-A4-R pre-use stop — 2026-11-03

**The explicitly approved A4-R slice stopped at independent pre-use review: five hard Spec P2 findings, one hard Standards P3 finding and one warranted heuristic P3. Step 3 remains open, native-profile acceptance pending, Step 8 blocked and ticket 01 unadmitted.** No measured or capsule process ran; the TypeScript sources, execution clock and use seal remain absent.

`R=/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-s3-b2-a4-recovery-intake-ttv5l_g7`; `E=R/execution`. André explicitly approved packet `1b1cfea3befd6f4c62e9a921c1c19657423767830a6503bbfea21f9d51164516` and freeze `1a78a52ee937b886f3531928df5c9c7ad0f38924d63fe88c97d1e4b7caeb3a81`, including their stop boundaries. Approval preflight passed 11,953 comparisons; stop revalidation passed 14,152 comparisons with zero mismatches, including all 137 repository preimages. These are identity observations, not recorder qualification.

The candidate remains unchanged at `E/source-revisions/administrative-capture.txt`, 46,175 bytes, mode `0400`, SHA-256 `b4b1858379fbb0b1aa04450d5549d89dda29df2d43c7e7677dd135e7564044be`. It is sealed for review only and was never executed, imported or syntax-checked. The [bootstrap append](../../.superman/ci/bootstrap-evidence.md#2026-11-03--step-3-s3-b2-a4-r-terminal-pre-use-stop) records exact evidence and findings: EOF-gated orphan detection, renewed TERM grace on custody transfer, silently omitted storage subtrees, delayed first-failure handling, unbounded custody control reads and incomplete immediate creation-mode verification. Preparation/lifecycle ownership is a warranted heuristic. All hard findings remain unresolved; the packet authorizes no correction round.

Pre-use reports and explicit dispositions are in `E/review/pre-use/`; actual zero counts and all 29 unreached commands are in `E/evidence/`. No feature RED, chronological GREEN, source check, lint, baseline, smoke or runtime cleanup evidence exists. Static remedies for earlier findings do not close A2 recorder obligations. A3-R's original draft and all historical artifacts remain preserved. Administrative creation-time verification omissions are disclosed rather than inferred away from current restrictive modes.

The complete nonempty intake-relative owned delta—both new repository suffixes and every execution addition, including pre-use snapshots/reports—is frozen at `E/review/r1/` for two fresh parallel final reviewers. Reports, dispositions and the post-review preservation receipt are separate artifacts there; these repository postimages stay frozen. The conditional next read-only intake may begin only after that outcome and preservation exist. Capsule recovery is the next dependency; API/D1/native/platform execution remains behind qualified recorder evidence and fresh exact approvals. The updated ledger preserves every strict D1/native/platform obligation. Prior approvals and all unused slots are nontransferable.


#### Step 3 dual-checker probe green — 2026-11-04

**Outcome: the probe's full D1 sequence completes. Step 3's closed criterion is met at its recorded local darwin-arm64 scope; step 8 stays blocked on steps 4 and 5, ticket 01 stays unadmitted, and no activation or pin acceptance follows.** The [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-04--step-3-dual-checker-probe-green-after-the-s3-b2-config-correction) owns the exact receipts, hashes and limits.

One source change: `skipDefaultLibCheck` was removed from the probe's two **Deno** configs. The probe's tsconfig keeps it — spec §5.10 requires both external skip-check flags false for primary tsrs and the separate matching-tsc drift reference, and Deno's bundled TypeScript is the only reader that ignores the option.

The red run failed at `deno-checker.probe.test.ts:346` with `S3-B2 blocker: native host ignored a compiler option; raw exit 0 is not a pass`, after the manifest counts, the 202/202 reversal and both tsrs/tsc loaded-input assertions had passed. The green run continued past it: 2 passed, 0 failed, 1,841 ms, with 202 declarations and 272 edits across 89 files, a 202/202 reversal with zero mismatches, exact loaded-input sets for tsrs and matching tsc, a native baseline with no ignored compiler option, and `TS2322`/`TS2451`/`TS2583` observed identically by all three checkers across the direct, transitive, declaration and default-library cases. `preflight.json` is byte-identical to the 2026-11-02 receipt: the transformation and its reversal are bit-reproducible.

Limits: only each stream's last 1,200 bytes are retained; no `TS2344` declaration-semantic control and no `TS2430` embedded canary; no published-global, computed-export or non-Deno fallback precision and no native resolved-content, injected-input or embedded-body accounting; darwin-arm64 only. Per-edge and per-target binding preservation is discharged by the byte-level reversal, the exact loaded-input-set identity and the cross-checker diagnostic agreement, and is recorded as a residual limit rather than a blocker.

The probe file is the sole harness for this step. No capsule, custody protocol or separate harness review is involved.


#### Step 3 acceptance — 2026-11-04

**Decision: André accepted the step 3 row at preparation scope on 2026-11-04.** Step 3 is green for the bounded dual-checker verification recorded above. This appended decision supersedes the pending-acceptance wording in the step 3 probe-green record; the checklist table is not edited.

Accepted scope, local darwin-arm64 only:

- The derived D1 corpus: 202 declarations, 272 edits across 89 files — 162 directive sites/57 files, 100 undici-literal sites/30 files, 10 realm-guard sites/2 files; reversal 202/202 with **zero mismatches**; manifest identity `3bba054913b9bc7b58cf5254a72de04112e9e8bcdfd19fe375cbea6f2fa0b575`; derived tree `c0527affba309a19947a225d26a4871b8a756ae6e571c2d42d76c1ed595e50d8`.
- Primary tsrs `--noEmit` and the separate matching-tsc drift reference both exited 0 with no diagnostics, each loading exactly the 202 derived declarations plus the two subjects — no ambient substitution.
- The native `deno check --all` baseline exited 0 with no ignored compiler option, under the S3-B2 amended profile.
- `TS2322` at the direct subject and at the transitive leaf, `TS2451` at the declaration conflict and `TS2583` at the default-library control were each observed identically by all three checkers.
- Every invocation re-verified its executable SHA-256 and ran through `env -i` with an explicit allowlist and its own fresh `DENO_DIR`.

Carried, not waived:

- Only each stream's last 1,200 bytes are retained; the receipt binds each stream's SHA-256 and byte count, not the full bytes.
- No `TS2344` declaration-semantic control and no `TS2430` embedded-semantic canary.
- No published-global, computed-export or non-Deno fallback precision, and no native resolved-content, injected-input or embedded-body accounting. Per-edge and per-target binding preservation is discharged by the byte-level reversal, the exact loaded-input-set identity and the cross-checker diagnostic agreement.
- darwin-arm64 only; no Linux x64 or linux arm64 native result.

This acceptance does **not** accept a pin, close Gate 1, activate an evaluator, approve any ticket or admit ticket 01.

### Step 4 — Deno mutation bridge feasibility

#### Step 4 measurement record — 2026-11-02

Status: local darwin-arm64 Deno mutation-bridge feasibility is recorded here and in [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--deno-mutation-bridge-feasibility). This append does not edit the checklist table above. It does not accept a pin, close build provenance, activate an evaluator, admit ticket 01, or close step 3.

Dependencies rechecked before the packet. Steps 1 and 2 remain the recorded measurements at HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`. Step 4 depends only on those rows. Step 3 stays open and does not block this row. Q1–Q6 and the step 2 profile were not execution authority. André approved the step 4 packet in this session: one new probe file, these two evidence appends, a bounded re-acquisition of the darwin-arm64 `deno` zip and sidecars, owned temp fixtures, no fixture Git, and the profile named in the evidence. `denort` was not an input.

The probe is `.scratch/superman-v0/deno-mutation.probe.test.ts`. Pilot subjects, configs, and reports stayed in the owned temp. The active Node dispatch was not edited. The Deno successor was not admitted.

One genuine red: with the instrumenter namespace unset, official `deno` threw `NotCapable` on `process.env.__STRYKER_ACTIVE_MUTANT__`. The Vitest workers were `SIGKILL`ed. Stryker produced no report and no `Killed` credit. The green run initializes that namespace before import, without `--allow-env`. The final probe passed 4, failed 0, skipped 0.

The pinned Stryker/Vitest report showed the instrumented `pilot/subject.ts` path, a load-time kill, a covered survivor, a `NoCoverage` control, per-test counters keyed by the covering test id, two overlapping workers, and restoration of the subject. A covered read denial scored `RuntimeError`, not `Killed`. A covered sleep scored `Timeout`, not `Killed`. The hostile `deno.json` warning is status 0 on this binary and is not treated as a scored kill. Equivalent base/candidate scope remains a later comparison obligation. Exact counts, hashes, and limits are in the bootstrap append.

**Next action:** step 5 is the next dependency-ready checklist row. It still needs its own packet. Step 3 remains open and still needs its separate execution approval. Steps 6 and 7 stay independently unstarted. Step 8 remains blocked by step 3. Do not start those rows from this measurement. Do not claim ticket 01 admission.

##### Step 4 review correction — 2026-11-02

The probe now asserts the exact installed tool identities — Vitest `5.0.5` (`d00333f3…` package hash), Stryker core `10.1.1` (`1b4b304c…`), Stryker Vitest runner `10.1.1` (`6ca8b7ce…`) — renames `generatedLaunchPrefix` to `clearedLaunchPrefixSource`, factors the worker environment in the generated Vitest test, and replaces the warning-only config control with a real config failure. A malformed `deno.json` makes the config launch exit 1 with `Failed deserializing config file ... Expected colon after the string or word in object property`; the permission-denied read still exits 1 with `NotCapable`. The Stryker report for these runs has no `Killed` mutant.

RED→GREEN: a temporary copy retaining the old `unstable` warning fixture fails at `configStatus !== 0` (`not ok`, 0 passed / 1 failed; RED TAP `7952fdf54ae01f669208401ae9cd9ac233e2899bea8183d454bc08df417ef8b8`). The final probe passes **4/4**, 14,819.92 ms, TAP `d79b609a5fd22309b1840ae09aa32eeb1db60245351d6ed820d0d2adb3cb1350`; final probe sha256 **`a4c7319c8fd77bb678c1144cded3af3714c0b52f4d592650c26a98c02f4db841`**. The probe now asserts the exact `Failed deserializing config file` / `Expected colon` diagnostics. The earlier “hostile deno.json warning is status 0” sentence is historical and is no longer the config-failure evidence.

The exact single-file check is:

```text
node node_modules/tsrs/bin/tsrs --noEmit --ignoreConfig --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --types node .scratch/superman-v0/deno-mutation.probe.test.ts
```

It exited 0; the single-file Biome check also exited 0. Repeated generated-source environment/namespace blocks beyond the factored worker environment remain as a recorded smell; they are not a correctness claim.

##### Step 4 acceptance-ready — 2026-11-02

**Presented for André's acceptance at the local darwin-arm64 mutation-bridge scope. Not accepted by this record.**

If accepted, the scope is:

- The pinned Stryker/Vitest run proves the instrumented snapshot load, pre-load active mutant, per-test counter/hit attribution, a known kill, a covered survivor, a `NoCoverage` control, two overlapping workers, concurrent-worker isolation and cleanup, and subject restoration. TAP `d79b609a5fd22309b1840ae09aa32eeb1db60245351d6ed820d0d2adb3cb1350`, **4 passed, 0 failed, 0 skipped**, 14,819.92 ms; probe sha256 `a4c7319c8fd77bb678c1144cded3af3714c0b52f4d592650c26a98c02f4db841`.
- The malformed `deno.json` config failure exits 1 with the asserted `Failed deserializing config file` / `Expected colon` diagnostics; the permission-denied read exits 1 with `NotCapable`; neither is credited as a kill.
- A covered read denial scored `RuntimeError`, not `Killed`; a covered sleep scored `Timeout`, not `Killed`.
- Vitest `5.0.5` and Stryker core/runner `10.1.1` package identities are asserted by version and package.json sha256.

Carried, not waived:

- Equivalent base/candidate scope remains a later comparison obligation; this row measures the fixture scope only.
- Repeated generated-source environment/namespace blocks beyond the factored worker environment remain a non-blocking smell.

No pin, Gate 1, evaluator activation or ticket 01 admission follows.


#### Step 4 acceptance — 2026-11-02

**Decision: André accepted the step 4 row at preparation scope on 2026-11-02.** Step 4 is green for the bounded verification recorded above. This appended decision supersedes the pending-acceptance wording in the step 4 acceptance-ready section; the checklist table is not edited.

Accepted scope, local darwin-arm64 only:

- The pinned Stryker/Vitest run proves instrumented snapshot load, pre-load active mutant, per-test counter/hit attribution, a known kill, covered survivor, `NoCoverage`, two overlapping workers with concurrent-worker isolation/cleanup, and subject restoration.
- The malformed `deno.json` config failure exits 1 with the asserted `Failed deserializing config file` / `Expected colon` diagnostics; the permission-denied read exits 1 with `NotCapable`; neither is credited as a kill.
- A covered read denial scored `RuntimeError`, not `Killed`; a covered sleep scored `Timeout`, not `Killed`.
- Vitest `5.0.5` and Stryker core/runner `10.1.1` package identities are asserted by version and package.json sha256.

Evidence: probe `a4c7319c8fd77bb678c1144cded3af3714c0b52f4d592650c26a98c02f4db841`; TAP `d79b609a5fd22309b1840ae09aa32eeb1db60245351d6ed820d0d2adb3cb1350`, **4 passed, 0 failed, 0 skipped**, 14,819.92 ms; report 7 Killed / 4 Survived / 4 NoCoverage; RED TAP `7952fdf54ae01f669208401ae9cd9ac233e2899bea8183d454bc08df417ef8b8`.

Carried, not waived:

- Equivalent base/candidate mutation scope remains a later comparison obligation; this row measures the fixture scope only.
- Repeated generated-source environment/namespace blocks beyond the factored worker environment remain a non-blocking smell.

This acceptance does **not** accept a pin, close Gate 1, activate an evaluator, approve any ticket, or admit ticket 01.


### Step 5 — complete four-metric Deno coverage feasibility

#### Step 5 measurement record — 2026-11-02

Status: local darwin-arm64 four-metric Deno coverage feasibility is recorded here and in [coverage evidence](../../.superman/ci/coverage-evidence.md#2026-11-02--four-metric-deno-coverage-feasibility-step-5) plus [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--four-metric-deno-coverage-feasibility). This append does not edit the checklist table above. It does not accept a pin, close build provenance, activate an evaluator, admit ticket 01, or close step 3.

Dependencies rechecked before the packet. Steps 1 and 2 remain the recorded measurements at HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`; step 1's release-origin verification and step 2's local startup boundary satisfy this row's dependencies. Step 4 is a completed sibling, not a dependency. Step 3 stays open and does not block step 5; step 8 remains blocked by it. Q1–Q6 were planning choices, not execution authority.

During this slice a concurrent actor updated the step 4 probe and its bootstrap/preparation evidence. Those step 4 files are moving, were preserved in place, and are outside this step 5 delta; they are not reviewed, relied on or promoted here. Step 4 remains a completed sibling at its own recorded scope.

André approved the step 5 packet in this session: one new probe, three append-only evidence edits, a bounded read-only use of the already-verified step 4 darwin-arm64 `deno`, owned temp fixtures, no Deno permission grants, no network/install/Homebrew, and no fixture Git or real-repository Git writes. `denort` was not an input.

The probe is `.scratch/superman-v0/deno-coverage.probe.test.ts`, sha256 `7b7add873b848e6b4bbbcca8be8bbc5b76ca115079dfae6023b52a9a18a0d749`. Subjects, transforms, profiles and reports stayed in `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step5`. The active Node dispatch was not edited; the Deno successor was not admitted.

Four meaningful RED→GREEN cycles were observed through actual process/report seams: raw profile-to-emit byte binding, loaded/partial four-metric conversion, wholly unloaded denominators, and inventory binding. The observed red messages were `profile binding is not implemented`, `four-metric conversion is not implemented`, `unloaded transformation is not implemented`, and `inventory conversion is not implemented`. The failing TAPs were not retained, so this is self-attested authoring history; the final green TAP is the retained evidence. The rejection controls and the three-inventory aggregation assertion were then exercised against the completed seam; they are recorded as completed checks, not as separately observed reds.

The final probe passed **20 tests, 0 failed, 0 skipped** in **2719.29 ms**. It bound every loaded profile to the executed `DENO_DIR/gen` emit and its inline map, required `sourcesContent` to equal the original bytes, and verified all four counts for loaded, partially hit and wholly unloaded sources. It also rejected empty/truncated/function-dropped loaded profiles, an independent-run structural mismatch, Node sources changed after collection, Node query/hash/alias/missing/unexpected/duplicate/out-of-bounds/malformed profiles, cross-inventory duplicates and non-base64 maps, then aggregated disjoint Deno, Node and exported-rule inventories exactly once over seven declared files:

| Metric | Aggregate covered / total | Skipped |
|---|---:|---:|
| Lines | 10 / 16 | 0 |
| Statements | 12 / 20 | 0 |
| Branches | 3 / 8 | 0 |
| Functions | 5 / 8 | 0 |

Per-file exact counts and report hashes are in the coverage evidence. The probe also exercised missing, unexpected, duplicate, aliased, malformed, missing-map, out-of-bounds, stale loaded/unloaded source, independent-run structural mismatch, invalid profile shape, nonzero-child and timeout rejections. Deno's native three-metric report, V8 ancestry and binary coverage were not used as substitutes for the fourth metric or the executed-source mapping.

Final real-checkout checks: the completion-shaped TAP run exited 0; project `tsrs --noEmit` exited 0 (`.scratch` is outside `tsconfig.json`'s `include`, so this does not type-check the probe); the single-file `tsrs --ignoreConfig` check exited 0; repository `biome ci` checked **43 files** and exited 0; `git diff --check` exited 0 for the tracked append diffs; the untracked probe had no trailing whitespace under a separate `grep` check. The probe file was also checked by Biome alone with no findings. The retained Node `stripTypeScriptTypes` experimental warning is in the TAP, not suppressed.

Limits, not waivers: darwin-arm64 only; release attestation is not build provenance; `deno transpile` is experimental, rejects `--no-prompt`, and used the accepted `--no-config --no-lock --no-npm --no-remote` flags under `env -i`; its code body had to match the executed emit for every loaded source; the opaque cache metadata hash was not recomputed; Node's top-level first V8 range can exceed the stripped source length because of Node's own wrapper; it is the only unbounded range, while nested Node and Deno ranges are bounded; the four RED→GREEN cycles are self-attested and their failing TAPs were not retained; fixtures are tiny feasibility subjects, not product/bootstrap inventories; the Node and rule fixtures are not the repository's actual retained drivers or Archgate rules; no `deno check`/declaration environment was involved; no three-platform, network, install, fixture Git, workflow, package, policy or readiness change. The active Node evaluator remains required; the Deno successor stays parallel and non-admitting.

**Next action:** step 6 is the next dependency-ready checklist row, with step 5 now measured for its measured-source-binding prerequisite. It still needs its own exact packet and approval. Step 3 remains open and still blocks step 8; step 7 stays independently unstarted. Do not start step 6 from this record. Do not claim ticket 01 admission.

##### Step 5 review correction — 2026-11-02

The step 5 probe identity was stale. `7b7add87…` is the original 20-test run; `9be20e43…` is the step 6 measured-source-binding amendment; the current corrected probe is **`56bb09607253396b04b9457735d9d4e63c00a67f38b410208ee8f4fac348d423`**. The historical lines remain; this correction binds the current run: TAP **`71c6816bc0ca2b567f29760d268f6968646765b78c66103ef6e5e27c682d4c48`**, **20 passed, 0 failed, 0 skipped**, 3562.99 ms, owned root `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-step5-rerun`.

Code changes: `parseProfiles`, `bindProfile`, `convertProfile`, `readV8Profiles` and `aggregate` are module-local measurement seams; the tests assert returned values/errors rather than call order. They cannot be exported because Biome's `noExportsInTest` forbids exports from a test file, and the probe is a measurement host, not product code. `makeFixture` registers module-level cleanup, and the converter identities are pinned with package.json hashes: `c8` 12.0.0, `@vitest/coverage-v8` 5.0.5, `ast-v8-to-istanbul` 1.0.7, `vite` 8.3.5, `@bcoe/v8-coverage` 1.0.2, `istanbul-lib-coverage` 3.2.2, `istanbul-lib-report` 3.0.1, `istanbul-reports` 3.2.0.

The exact single-file check is:

```text
node node_modules/tsrs/bin/tsrs --noEmit --ignoreConfig --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --types node .scratch/superman-v0/deno-coverage.probe.test.ts
```

It exited 0; the single-file Biome check also exited 0; the fixture roots were removed after the run.

Remaining limits, narrowed not waived: the Node and rule legs remain synthetic fixtures, not the repository's actual retained Node drivers or Archgate rules; the wholly unloaded source has no executed emit, so its transform is `deno transpile` output rather than executed emit; and the four metrics still flow through the same Istanbul summary path, with no independent counter/derivation retained. The last item remains a row gap against the “independently verify all four counts” wording. The row is presented for acceptance only at this narrowed scope, or for a further independent-counter packet.

##### Step 5 independent-counter attempt and module move — 2026-11-02

The approved Step 5 packet was attempted. The measurement seams moved to a non-test module, and the proposed independent converter was tested; it did not reproduce the same four-count definition. The final probe is green, but the full “independently verify all four counts” row is **not met**.

Module move:

- New measurement module `.scratch/superman-v0/deno-coverage-measurement.ts`, sha256 `064c6e63e48ff5c3686b66ff9672bbc564f027a08b85323a42c635a74ec92af0`. It exports `parseProfiles`, `extractInlineMap`, `emitPath`, `validateLoadedProfile`, `bindProfile`, `convertCode`, `convertProfile`, `counts`, `codeBody`, `readV8Profiles`, `aggregate` and `requireToolIdentities`; the probe imports them.
- Probe `.scratch/superman-v0/deno-coverage.probe.test.ts`, sha256 `c994fe886c3edac10de7b9b82a1d70a6a02c90e16e8c8be5590673a8433496e7`.
- Retained TAP `aebf087892539e09e8a7c50373c5adc4dedaf5cb93e4265d325ae4a7d71a09e2`, **20 passed, 0 failed, 0 skipped**, 2925.80 ms, owned root `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-step5-independent`.
- The module move is behavior-preserving. Tests drive exported functions, not test-file private helpers, so Biome's `noExportsInTest` and the Testing Decisions rule against private-helper assertions are both satisfied without suppression.
- Single-file check now includes `--allowImportingTsExtensions` and both files; it exited 0. Biome on both files exited 0.

Independent-converter attempt:

- The attempted converter was `v8-to-istanbul` 9.3.0, package sha256 `9403e515e7b76070a8c54b064107e06bfb98df3345634c0c405056a13e2c323e`, resolved through `c8`. It is a different converter from production `ast-v8-to-istanbul`.
- It does **not** implement the same counting model. It emits line-granular statement maps (including blank and brace lines) and function-body branches. On the existing fixtures:
  - `loaded.ts`: production lines/statements `2/2`, branches `0/0`, functions `1/1`; `v8-to-istanbul` `4/4`, `4/4`, `1/1`, `1/1`.
  - `partial.ts`: production `1/3`, `2/4`, `1/2`, `1/2`; `v8-to-istanbul` `4/8`, `4/8`, `1/2`, `1/2`.
  - `unloaded.ts`: production `0/2`, `0/3`, `0/2`, `0/1`; `v8-to-istanbul` `4/4`, `4/4`, `0/0`, `0/0`.
- The failing probe TAP is `f56db100a2dc3c58a03af3e0d46d5c987a08a1ef39a6512c74ad57508cfbb20f` (2 tests, 0 passed, 2 failed). The loaded/partial tuples are in `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-step5-diag/out4.txt`, sha256 `cc0ac65e1a1478eed662042341e379e0b608b161bc240336a6abebcb5ed9a16a`; the unloaded tuple is in the failing TAP, which the transcript does not contain.
- No production count was adjusted to match the converter. The independent function and its failing assertions were removed after the bounded attempt; the retained probe is the 20/20 run above.

Narrowed acceptance packet: the retained step 5 evidence can be accepted only for the production four-count conversion over the existing loaded/partial/unloaded fixtures; the executed emit/source-map binding to original bytes; the one-time disjoint Deno/Node/rule aggregation; the exported measurement module; exact fixture/error coverage; and the 20/20 TAP. It **cannot** be accepted for “independently verify all four counts.” Step 5 remains open; this is not acceptance of the full row. A further independent-counter design needs a new approved packet and must reproduce the AST-based statement/branch/function model rather than a line-granular converter.

Carried limits remain: the Node/rule legs are synthetic fixtures, not the repository's retained Node drivers or actual Archgate rules; the wholly unloaded source has no executed emit; the env-gated `SUPERMAN_MEASURE_ENTRY` test remains step 6's scope.


#### Step 5 acceptance — 2026-11-02

**Decision: André accepted the retained step 5 evidence at the narrowed scope on 2026-11-02.** This is not acceptance of the full step 5 row. The independent four-count clause remains open.

Accepted scope:

- The production four-count conversion over the existing loaded, partially hit and wholly unloaded fixtures, including the exact recorded tuples and the executed emit/source-map/original-byte binding.
- The recorded missing, unexpected, duplicate, aliased, malformed, partial, stale, out-of-bounds and abnormal-child rejections.
- The one-time disjoint Deno/Node/rule aggregation over the declared fixtures.
- The exported measurement module `.scratch/superman-v0/deno-coverage-measurement.ts`, sha256 `064c6e63e48ff5c3686b66ff9672bbc564f027a08b85323a42c635a74ec92af0`; probe sha256 `c994fe886c3edac10de7b9b82a1d70a6a02c90e16e8c8be5590673a8433496e7`; TAP `aebf087892539e09e8a7c50373c5adc4dedaf5cb93e4265d325ae4a7d71a09e2`, **20 passed, 0 failed, 0 skipped**, 2925.80 ms.
- Tests drive the module's exported seams rather than test-file private helpers; no Biome suppression.

Not accepted:

- **“Independently verify all four counts.”** The attempted `v8-to-istanbul` 9.3.0 derivation produced line-granular statements and function-body branches, not the AST-based four-count model. The full row remains open. No production count was adjusted to match the failed converter.

Carried: the Node/rule legs are synthetic fixtures, not the repository's retained Node drivers or actual Archgate rules; the wholly unloaded source uses `deno transpile` output rather than an executed emit; the env-gated `SUPERMAN_MEASURE_ENTRY` test remains step 6's scope.

This acceptance does **not** accept a pin, close Gate 1, close §5.4/§5.10 independence, activate an evaluator, approve any ticket or admit ticket 01. A future independent counter needs a new approved packet and must reproduce the AST-based statement/branch/function model. Step 3 remains open and blocks step 8; the open step 5 independence clause also remains unresolved.


#### Step 5 independent-count closure packet — execution, 2026-11-02
**Outcome: executed — per-file and aggregate counts matched; review and acceptance still pending at this date.**


André subsequently approved the specific oracle correction `VariableDeclarator.start = 37` (`doubled`, not the declaration keyword at 31) and exact execution packet `step5-independent-count-closure-li8fg2kz`, manifest SHA-256 `80bc855e9b4a21c0dd11488f69087be0d76ee3d73130957dd19325cb5b53f2eb`. The initializer location (line 2/column 18), function offset 7, return offset 56, nine fixture strings and seven-file expected table stayed locked. This is execution evidence, not the separate human acceptance of the completed clause.

The owned `deriveFile`/`deriveAggregate` counter and probe now independently derive every loaded, partial and unloaded file. All seven rows match exactly, with aggregate **lines 10/16, statements 12/20, branches 3/8, functions 5/8; skipped 0**. The full independent probe passed **24/24**; the byte-identical production probe passed **20/20**, with no failed/skipped/cancelled/todo tests. Explicit scratch-file tsrs and Biome, project tsrs, repository Biome, and tracked/untracked whitespace checks passed. The retained formatting-only failure precedes scoped formatting and passing verification.

Evidence root: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-step5-closure-packet-li8fg2kz`. `execution/` retains command receipts and genuine TDD RED→GREEN preimages/TAPs (O2–O8, O11–O13, A0/A1); `independent/seven-files-KkNvTy/` retains fresh raw/reference inputs, source/emit/map bindings, locations/hits and exact comparisons. [Coverage evidence](../../.superman/ci/coverage-evidence.md#2026-11-02--step-5-owned-independent-counts-execution-evidence) records all seven rows, hashes and exact verification scope. The counter SHA-256 is `153d15f5667fd169126ddd213e987f64141d52a86db57a469df710f7e1efcd90`; its probe is `39d998fbffc777c5ea4c47f9cf8994a036cceaf48b39ff67479ffc707e2f6af4`.

The earlier offset stop, incompatible `v8-to-istanbul` failure and the failing historical `green-covered.tap` remain preserved. The separately reconciled intake includes both concurrent Step 3 post-review sentences. This append checked the captured **165361-byte** prefix SHA-256 `1ddb177089e358c81f580d9edacf1d13ed0b1b2f53888fb675e7600daca5e501` and retained the complete preimage; the obsolete `99269381…` prefix is not used.

Independent Standards + Spec review and André's subsequent acceptance remain pending. The earlier pasted conditional acceptance text is not acceptance of these results. Carried limits: local darwin-arm64, shared AST/location libraries, synthetic Node/rule subjects, unloaded Deno transpilation, bounded range/profile-completeness evidence and Step 6's env-gated external-entry boundary. Step 3 stays open and blocks Step 8. No Gate 1, pin, §5.4/§5.10 evaluator-independence, activation or ticket 01 transition; no repository Git write, installation, download, network, credentials or hosted operation.

##### Step 5 independent-count review — acceptance-ready, 2026-11-02

Independent **Standards PASS, 0 findings; Spec PASS, 0 findings** on frozen `review-r1`, manifest SHA-256 `fcfa4381c560f524b599625661bad8aa1348a030b0dd1ecb815be0094d61adbb`, under the packet root above. Both reviewers inspected the intake-relative changes including full untracked additions, raw/source/map bindings, locked hand oracles, TDD receipts, seven exact rows and preserved production/history. The later successful hash recheck is bound by `review-r1/review-receipt.json`, SHA-256 `4b3d6debc08296a10b0197b099c1869ee57f367391c63c7145f13c2c53cfa8e6`; [coverage evidence](../../.superman/ci/coverage-evidence.md#independent-review--acceptance-ready-2026-11-02) records both review identities and limitations.

The independently verified four-count clause is acceptance-ready at the stated fixture scope; **human acceptance remains pending**. The counter/probe have not changed since the 24/24 full pass and clean reviews. This append preserves the captured historical prefix and complete live suffix, with the preimage retained in `appends/preparation-review/`. Step 3 remains open and blocks Step 8; all pin, Gate 1, evaluator-independence, activation and ticket 01 boundaries remain unchanged.


#### Step 5 independence acceptance — 2026-11-04

**Decision: André accepted the step 5 independence clause at the bounded fixture scope on 2026-11-04.** This supersedes the pending-acceptance wording in the step 5 independent-count review; the checklist table is not edited.

Accepted scope:

- An independent counter that never calls the production converter derived every loaded, partially hit and wholly unloaded file's four counts. All seven rows match exactly, with aggregate **lines 10/16, statements 12/20, branches 3/8, functions 5/8; skipped 0**, over the seven declared files.
- The independent probe passed **24/24**; the byte-identical production probe passed **20/20**, with no failed, skipped, cancelled or todo tests.
- Independent Standards and Spec reviews returned **zero findings** on the frozen bundle.

Carried, not waived:

- Local darwin-arm64; shared AST/location libraries.
- The Node and rule legs are **synthetic fixtures**, not the repository's retained Node drivers or actual Archgate rules. The real-inventory expansion is row 8's scope, not an acceptance condition.
- The wholly unloaded source uses `deno transpile` output rather than an executed emit.
- The four RED→GREEN cycles are self-attested; their failing TAPs were not retained.

This acceptance closes the step 5 independence clause only. It does **not** accept a pin, close Gate 1, close the §5.4/§5.10 independence requirement at repository scope, activate an evaluator, approve any ticket or admit ticket 01.

### Step 6 — temporary compile/asset substrate

#### Step 6 acquisition hold — 2026-11-02

Status: the approved step 6 packet's denort re-acquisition completed. No compile probe was written or run. André approved that packet, then required a measured-source-binding amendment before probing. This append does not edit the checklist table. It does not accept a pin, close build provenance, activate an evaluator, or admit ticket 01.

The verified denort was absent from the retained step 2, 4, and 5 trees. The already-installed `gh` 2.103.3 re-acquired only `denort-aarch64-apple-darwin.zip` and its zip sidecar. Both `gh release verify-asset` commands exited 0 against predicate `https://in-toto.io/attestation/release/v0.2`. The extracted member matches the step 1 local hash `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb`, 68094056 bytes. It was not executed. The retained deno at the step 4 path still matches `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba` and was not re-downloaded or executed. Exact commands and the owned path are in the artifact and bootstrap appends.

Probing stays blocked until the binding amendment is approved. The step 5 probe remains the measurement seam; this hold does not edit it. Step 3 remains open and still blocks step 8. Step 7 stays independently unstarted. Do not claim ticket 01 admission.


#### Step 6 measurement record — 2026-11-02

Status: local darwin-arm64 temporary compile/asset substrate is recorded here and in [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--temporary-compileasset-substrate) plus the [artifact append](deno-artifact-candidate.md#2026-11-02-re-acquisition--step-6-denort-input). This append does not edit the checklist table. It does not accept a pin, close build provenance, activate an evaluator, or admit ticket 01.

André approved the step 6 packet, then required measured-source binding before probing. The approved amendment adds an env-gated test to the existing step 5 probe and one coverage-evidence append. It does not edit `.superman/ci/coverage.ts` or create `.superman/ci/deno-substrate.json`.

The probe is `.scratch/superman-v0/deno-compile.probe.test.ts`, sha256 `1a9c5df562ef49f7d340b5976318b222fd06bf92bbafd401da05dc41205261a4`. The step 5 probe is now sha256 `9be20e43783f57796e2a8043a6d902e2e592b17fbf377b19998ba20a72302d9b`. Its historical step 5 hash `7b7add873b848e6b4bbbcca8be8bbc5b76ca115079dfae6023b52a9a18a0d749` remains the identity of that earlier run. With `SUPERMAN_MEASURE_ENTRY` unset, that probe still passed 20, failed 0, skipped 0.

Five RED→GREEN cycles were observed through process seams. The red messages were `step 5 seam did not write a measurement receipt`, `compile substrate is not implemented`, `native asset execution is not implemented`, `failure controls are not implemented`, and `prompt and escalation controls are not implemented`. The failing TAPs were not retained. The final green TAP is the retained evidence.

The final probe passed **5 tests, 0 failed, 0 skipped** in **13609.549083 ms**. It measured the compile entry through the step 5 seam before compile credit, required `sourcesContent` to equal the entry bytes, compiled from an unrelated cwd with the verified denort and explicit flags, and required the native binary to emit the exact non-UTF-8 asset bytes after the on-disk asset was removed. Wrong denort and omitted denort exited 1. A hostile `deno.json` beside the entry was applied only when discovery flags were omitted, and was absent from the credited `--no-config` compile. An external read was denied, including when `--allow-read` was appended to the binary argv. No `-A` or compile/runtime `--allow-*` was used. The measurement child used only `--allow-read=<entry directory>`.

The binary whose stdout matched the asset was 68160098 bytes, sha256 `ea03ab9ffeadf4e100a4d542a63642bf6e6690956f6f4b45e61847b9f4f499fb`, bound to measured entry sha256 `f2b3c944a9f3aa03547629034c09d1a3ff4b4f6799663307962e583b614bf46e` and asset sha256 `788533168219c0ef69e8b8330f7fc880c6e46b64b39a78d04ab9b2eb283c5f82`. Earlier compiles of the same inputs had the same size and different digests. This host's ad-hoc Mach-O signing does not make the output byte-stable. The recorded digest identifies that executed run, not a reproducible artifact. It is not a prefix of denort.

Limits, not waivers: darwin-arm64 only; release attestation is not build provenance; v2.9.8 has no `--include-as-is`, and exact bytes were proved with `--include` of a non-module asset; this is not binary coverage, a product bundle, three-platform acceptance, or pin acceptance. Step 3 remains open and still blocks step 8. A concurrent untracked `.scratch/superman-v0/duplication.probe.test.ts` appeared during this slice. It is preserved and is not reviewed, adopted, or attributed here. No real-repository staging, commit, push, or readiness change was made. Do not claim ticket 01 admission.


#### Step 6 closure decision — 2026-11-02

**Status: the concurrent step 6 measurement record is accepted as closing the step 6 measurement row at its recorded local darwin-arm64 scope, with the evidence corrections and limits below.** This section is recorded after the concurrent Step 3/7 appends; the earlier Step 6 record remains the detailed measurement history. The checklist table above is not edited. This does not accept a pin, close build provenance, close §8.4, activate an evaluator or admit ticket 01.

##### Verified evidence

| Item | Value |
| --- | --- |
| Five-test TAP | `.../superman-gate1-step6/probe.tap`, sha256 `a9ef10c8b1b27932f2d8ec85add5073b411508f28e126d8b2dfb88f8cf4b7664`; 5 passed, 0 failed, 0 skipped, 13609.549083 ms |
| Executed binding | `.../superman-gate1-step6/probe/executed-binding.json`, sha256 `fd93ff83dfed11936b541ed8f9e34da36d02aec96a6a5a19f0186362d27b6fcb`; entry `f2b3c944...`, asset `788533168219c0ef69e8b8330f7fc880c6e46b64b39a78d04ab9b2eb283c5f82`, deno `d1e99265...`, denort `f0003b04...`, output `ea03ab9ffeadf4e100a4d542a63642bf6e6690956f6f4b45e61847b9f4f499fb` / 68160098 bytes, `stdoutMatchesAsset: true` |
| Step 5 dependency | Current probe `9be20e43783f57796e2a8043a6d902e2e592b17fbf377b19998ba20a72302d9b`; retained env-unset TAP `.../superman-gate1-step6/coverage-rerun.tap`, sha256 `4e3304ca0845234d4a93bf113c70d0364e6d0cc7636d6404c7d243ed03f38b19`, 20 passed, 0 failed, 0 skipped, 2895.059458 ms; the external-entry test is registered only when `SUPERMAN_MEASURE_ENTRY` is set |
| Compile/native argv | `/usr/bin/env -i`, owned `HOME`/`TMPDIR`/`DENO_DIR`, `DENORT_BIN` verified, absolute deno, `compile --no-prompt --no-config --no-lock --no-npm --no-remote --include <asset> --output <owned> <entry>`; no `-A`, `--allow-*`, `--env-file` or `env -S` |

The five tests cover: measured-source binding through the step 5 seam before compile credit; actual denort consumption without runtime download; exact native asset bytes from an unrelated cwd; wrong runtime/asset/config override not passing; and prompting/appended permission flags not escalating. The TAP records `bad-runtime status=1` and `omitted-denort status=1`. The hostile-config control observed `not-a-feature` only when discovery flags were omitted; the credited `--no-config` compile did not. External read and the appended `--allow-read` both exited 13 with `denied`, and the secret bytes were absent.

##### Evidence corrections and limits

- **Stale credited-artifact file.** `last-credited-artifact.txt` under the owned compile root records an earlier digest `a1a3870c...`; the credited final digest is `ea03ab...` in `executed-binding.json`. The stale file is not the credited artifact.
- **Earlier temp residue.** The credited run's own `measure-*`, `compile-*` and `fail-*` directories were removed. Earlier failed-run directories remain under the owned compile root and contain fixture binaries/caches; they are not evidence for this closure. The earlier Step 6 wording that fixture binaries are not retained except one digest applies to the credited run; the earlier residue is recorded here as a limit.
- **Step 5 receipt.** The compile probe asserted the step 5 receipt (`entrySha256`, `sourcesContentMatches`, `loadedPaths`, metrics, `denoSha256`) but did not retain it. The retained evidence is the final TAP plus `executed-binding.json`, which binds the entry/asset/deno/denort/output identities and compile argv.
- **Self-attested RED history.** The five RED→GREEN cycles remain self-attested; the failing TAPs were not retained. The final TAP is the retained evidence.
- **Conditional negative controls.** Wrong/omitted include and prompt controls are outcome-fail checks. A tool/config failure is not credited as a pass, but the probe does not always prove the exact failure cause; the TAP records the two status-1 controls.
- **No re-run.** The optional bounded gap re-run was not exercised. The confirmed gaps are evidence hygiene/traceability, not a failed measurement; the retained TAP and executed-binding remain the credited evidence. No probe was edited.
- **Limits.** darwin-arm64 only; release attestation is not build provenance; exact bytes were proved for a non-module asset; no packet capture; no three-platform/OS-libc/signing/quarantine acceptance; no pin, §8.4, Gate 1 or ticket 01 closure.

##### Decision and next

Accept the step 6 measurement row at local darwin-arm64 scope; the broader Gate 1 prerequisites and three-platform native acceptance remain open. Step 3 remains open and blocks step 8. The next dependency-ready path is the separate **Step 3 conditional D1** execution packet, which needs its own fresh popup approval; do not start it from this record. The Step 7 A corpus declaration/first-baseline artifact remains separate. Do not claim ticket 01 admission.


### Step 7 — retained-jscpd conformance

#### Step 7 measurement record — 2026-11-02

Status: the declared-profile conformance measurements for the tested fixtures are complete, and André has selected **A with conditions**. This completes the measurement/decision portion of step 7, but not an operational corpus/baseline activation: the reviewed corpus declaration and first-baseline rules remain a separate policy artifact. This append does not edit the checklist table. It does not accept a pin, produce a product baseline, activate an evaluator, or admit ticket 01. The raw results, tool identities and limits are in [the bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--retained-jscpd-conformance-step-7). Earlier sections' “Step 7 stays independently unstarted” statements are historical; they predate this section and are not a current-status claim.

##### Dependency recheck

- Step 7 depends on the existing approved jscpd tool/execution authority, not on step 3. jscpd **5.4.2** is declared in `package.json` and `.superman/ci/bootstrap.json`, installed at its exact version, and already used by protected G5. The probe uses the installed `run-jscpd.js` wrapper and its darwin-arm64 binary directly; no installation, download, Homebrew, substitute scanner or network access was used.
- Step 3 remains open and continues to block step 8. It does not block this row.
- HEAD is `62c8495aeffa33d827c481e661f6083f8bc718d4` on `spec/superman-v0`. `.jscpd.json` is sha256 `ff400eab800e0776d60977cca6956b7057ad7a422caa5fc6d186dea6f7bcc96a`; the policy/bootstrap inputs matched the intake hashes recorded in the bootstrap append.
- There is no `src/` directory and no `superman.ratchet.json`. The real G5 corpus is empty and G5 remains `n/a`; no product baseline was invented.
- André approved the packet with the optional fixture-Git controls. One new probe was created; two append-only evidence homes were edited. Fixture Git was limited to owned disposable temp repositories. No `.jscpd.json`, package, lock, config, workflow, `src/`, `test/`, `.archgate/**` or other protected policy file was edited. No real-repository Git write occurred.
- A concurrent actor appended the step 6 denort re-acquisition to `deno-artifact-candidate.md` during this run. Those bytes are preserved, are outside this slice's delta, and are not relied on by this record.
- The concurrent step 6 appends in this file and in the bootstrap evidence are preserved as the frozen step 7 base. The step 7 delta is only the two step 7 sections and the new probe; the step 6 bytes are outside that delta and are not reviewed or relied on here.

The probe is `.scratch/superman-v0/duplication.probe.test.ts`, sha256 `678be60ad1a838bf07f20bb35974be38aa9c222b3cec9a2d2aaeb5aef6bc18e2` (745 lines / 32426 bytes). The final completion run passed **12 tests, 0 failed, 0 skipped** (retained `final-completion.tap`, sha256 `faf3a1fa6dba80faffa628b5defacca51c5baf08b62a94e91c99ec4f60af2bd3`, 2457.76 ms). Project `tsrs --noEmit`, the explicit single-file `tsrs` and the single-file Biome check on the new probe exited 0. The first post-probe `biome ci` checked 44 files and exited 0. An intermediate shared-tree pass checked 45 files and exited 1 on two concurrent Deno probes outside this slice; their owner subsequently formatted them, and the final shared-tree `biome ci` checked 45 files and exited 0. This run did not edit those concurrent files.

##### What the probe establishes

| Question | Observed result |
| --- | --- |
| `.jscpd.json` effective profile (before G5 CLI overrides) | `minTokens 50`; **tool-default `minLines 5`** (not declared in `.jscpd.json`); `format ["typescript"]`; reporters console+json; output `.superman-ci/duplication`; max size 1 MiB; no threshold/exit-code/fail-on-empty; no ignore lists. |
| Declared corpus accounting (4 declared, 3 scanned) | Three above-threshold `.ts` files (two identical 18-line/103-token, one distinct) gave `sources 3`, `clones 1`, `lines 54`, `tokens 309`, `duplicatedLines 18`, `duplicatedTokens 103`, percentage 33.33; the empty `.ts` was omitted, so the declared/scanned gap is one file. |
| Minimum-clone semantics | 50-token/**6-line** pair detected (`tokens 50`, `lines 6`); 50-token/**5-line** pair included in the corpus but **no clone**; 100-token/5-line also no clone; 49-token/6-line and 52-token/4-line files omitted; one-token difference in a 50-token/6-line pair gives no clone. |
| Tiny/mixed/empty | Two identical one-line files: `sources 0` under the declared profile; under the 1/1 control `sources 2`, `lines 2`, `tokens 12`, **0 clones**. Two identical two-line files under 1/1: one clone (`lines 2`, `tokens 6`). Empty-only corpus: `sources 0`, `lines 0`, `tokens 0`, percentage 0, exit 0. |
| Format filter | `.ts`, `.mts`, `.cts`, `.d.ts` scanned; `.tsx` excluded even when explicit; `.js`, `.json`, `.md` excluded. |
| `.gitignore` filter | Default scan skipped the force-added but still `.gitignore`d `src/ignored.ts`: `sources 2`, `clones 1`, names only `src/kept.ts`/`src/reference.ts`; `--no-gitignore` gave `sources 3`, `clones 2`, `duplicatedLines 36`, `lines 54`, `tokens 309`, percentage 66.67, with `src/ignored.ts` present. |
| Changed-to-unchanged | Full scan and `--changed` found the clone between untracked `src/changed.ts` (18 lines/103 tokens) and committed `src/unchanged.ts` (20 lines/109 tokens); `--changed-only` scanned only the 103-token changed file and reported no clone. `--changed` reported `newClones 1` and `newDuplicatedLines 17` for the 18-line clone. |
| Overlapping clones | Declared profile on the preserved mixed fixture: `sources 1` (one-line file omitted), `clones 0`, percentage 0. Non-declared 1/1 control: `sources 2`, `lines 19`, `clones 13`, `duplicatedLines 26`, line percentage **136.8421052631579**, token percentage **59.63302752293578**. No declared-profile >100% fixture was found; that is an observation, not a proof of impossibility. |
| Exit status | Declared profile exits 0 with a 50% clone. `--threshold 0` exits 1; `--threshold 50` exits 0 at exactly 50% (strict `>`). Exit status alone is not the baseline. |
| Accounting | `duplicates.length === clones`; `formats.typescript === total`; percentage identities hold within `0.0051`; two runs produce identical totals and clone identities; `detectionDate` is parseable. |

##### Accounting/metric and baseline-transition contract — André's decision (A with conditions)

The current protected G5 contract, read from `.superman/ci/quality.ts` and not changed here:

- Scope is `src/**/*.ts`; the driver invokes jscpd on the explicit full file list with `--absolute --no-gitignore --max-size <largest>`, JSON reporter, and requires `total.sources === after.length`, `total.lines > 0`, `duplicatedLines <= lines`, the percentage identities, `duplicates.length === clones`, and `formats.typescript === total`.
- `metrics.jscpdPct = total.percentage`. `superman.ratchet.json` holds `jscpdPct` in `[0,100]`, `mutationScore`, and `qualityInputsHash`; a candidate may only lower or equal `jscpdPct`; a first baseline is allowed only on a spec-kind branch with the measured value and unchanged source; a later regression blocks when `percentage > threshold`.
- The current model therefore cannot represent a line percentage above 100, cannot silently accept a source-count mismatch, and cannot reinitialize a baseline on ordinary ticket work.

The measurements stress that contract in four places:

1. **Corpus completeness vs denominator.** Files below 50 tokens or 5 lines, and empty files, are omitted from `sources`, `lines` and `tokens`. The driver's `sources === after.length` guard blocks those omissions. But a corpus composed only of above-threshold files can still contain a 5-line duplicate that the tool will not detect, because the observed clone floor is **more than 5 lines**. Those 5-line files remain in the denominator. This is an accounting question: the declared `minLines 5` is not the clone-detection floor.
2. **Overlap and metric choice.** Under the 1/1 control, `duplicatedLines 26 > lines 19`, so the line percentage is 136.84% while the token percentage is 59.63%. The current driver rejects `duplicatedLines > lines` and the baseline validator caps `jscpdPct` at 100. The declared 50/5 profile did not reproduce the >100% case in this probe. If line percentage remains the metric, the >100% control must be explicitly out of profile and the overlap/omission accounting must be decided; if token percentage or a deduplicated covered-line accounting is preferred, that is a different reviewed metric.
3. **Incremental cross-scope.** `--changed-only` misses a changed-to-unchanged clone. `--changed` scans every file and finds it, but its `newDuplicatedLines` (17) is not the clone's line count (18), and the reported percentage remains the full-corpus 47.37%. Equivalent cross-scope and total-percentage detection for any incremental route is not established by this probe. Full-corpus G5 remains the only policy-defined pre-merge route; this probe demonstrated the full-corpus scan's cross-scope detection, not a full driver or gate receipt.
4. **First baseline and tiny first source.** No product baseline exists. Ticket 01's first source may be below the thresholds. The earlier small-corpus probe and this probe both show that lowering only `minTokens` is insufficient; `minLines` and the one-line/two-line floor matter, and the 1/1 control produces a >100% line ratio. A blind cutoff change is not a drop-in fix.

André selected **A with conditions** on 2026-11-02. The considered alternatives were:

- **A — selected. Keep the declared jscpd 5.4.2 profile and current line percentage (`total.percentage`)**, and require a reviewed corpus-completeness declaration for tiny/empty files and for above-threshold files that cannot produce a clone at the 6-line floor. This preserves the current direction but needs an explicit representation for the denominator.
- **B. Replace the accounting** with a deduplicated covered-line set or another reviewed metric, with fixtures proving overlap, cross-scope and total-percentage behavior before the ratchet/baseline model changes.
- **C. Change the threshold/profile** (for example an explicit `minLines`) only after a reviewed policy decision; the 1/1 control shows the >100% line ratio and is not a drop-in.
- **D. Use token percentage** instead of line percentage; the 1/1 control's token percentage is 59.63 and stays within `[0,100]`, but this changes the metric and does not by itself resolve corpus omission.
- **E. Adopt `--changed`/baseline only after equivalent-detection proof**; `--changed-only` is disqualified by the observed cross-scope miss.

##### Adopted A conditions

1. **Reviewed corpus declaration.** Enumerate the exact measured corpus and every omitted file or omitted class with its reason: empty, below 50 tokens, or below 5 lines. Separately enumerate every included 5-line file that cannot produce a clone; those files remain in `sources`/`lines` and are not an omitted class. No hidden exclusion, padding or reduced denominator. The declaration is a reviewed policy artifact, not an agent-selected ignore list.
2. **Explicit clone floor.** State that the effective clone floor is **more than 5 lines** while file inclusion is 5 lines. The 5-line blind spot is accepted only if the declaration says so explicitly; if it proves material to the product, B is the fallback.
3. **Fail-closed accounting.** Keep `[0,100]`, `duplicatedLines <= lines`, `sources === after.length` and the percentage identities. A real declared-profile corpus that produces `duplicatedLines > lines` blocks for a reviewed decision; it is never clipped or silently re-based.
4. **Incremental routes.** `--changed-only` stays disqualified. `--changed`/baseline remains a later optimization only after equivalent cross-scope and total-percentage detection is proved.
5. **First baseline.** A first baseline must remain spec-kind, exactly measured and source-unchanged; ordinary ticket work cannot initialize it. No baseline is created by this decision.
6. **Tiny first source.** If ticket 01's first source is below the measurable floor, A cannot measure it; a separate reviewed model (B or another approved corpus model) is required before that source can be admitted.

The A decision fixes the direction but not every baseline-transition detail. The reviewed corpus declaration/first-baseline artifact must still state: first-baseline creation and source-unchanged rule; tighten-only direction; behavior when the corpus grows or shrinks; representation of an empty/omitted corpus or a legitimate zero; reinitialization when the tool/profile/policy changes; and, if the later `--changed` optimization is approved, whether `newClones`/`newDuplicatedLines` or the total percentage is the enforced value. No metric, threshold, exclusion, clipping rule or baseline is activated by this record.

##### Next action

Record the A conditions in the reviewed corpus declaration and first-baseline rules; do not change `.jscpd.json`, the scanner, package/lock/config/workflow, or create a product baseline in this slice. The step 7 measurement/decision is complete; operational corpus/baseline activation still needs that reviewed artifact and the applicable §17/Gate 1 work. Step 6 remains the next dependency-ready measurement row, but its concurrent measurement record is outside this delta and is not accepted or relied on here; step 6 remains open for its own review. Do not start or continue step 6 from this record. Step 3 remains open and blocks step 8. Steps 8–13 and all other open rows are preserved. Do not claim ticket 01 admission.

##### Step 7 review correction — 2026-11-02

The reviewed corpus declaration and first-baseline rules now exist as [duplication-corpus.md](duplication-corpus.md), sha256 **`c65938e15697c7080efdb1921fc5fda7edc5a1eb56029e8118c846fef2610305`**. It records the declared `src/**/*.ts` corpus (currently empty; no `src/`, no `superman.ratchet.json`, G5 `n/a`), the `minTokens 50` / effective `minLines 5` inclusion floor, the **more-than-5-line** clone floor and the 5-line blind spot, the fail-closed `[0,100]` / `duplicatedLines <= lines` / `sources === after.length` accounting, `--changed-only` disqualification, `--changed` as a later optimization only after equivalent proof, the spec-kind exact-measured source-unchanged first baseline, corpus growth/shrink/empty/zero rules, reinitialization, and the tiny-first-source separate-model rule. It does not change `.jscpd.json` or create a product baseline.

The probe's header now states that it observes JSON reports plus public CLI diagnostics (`--debug` profile, console status), not “only public report seams.” The Node version assertion accepts the repo's `engines: >=26` range; the probe separately binds the exact Node `26.5.0` executable hash used for this run. Current probe **`9fdbe9611414d5fa000356fbc3ff8676552777844f29d2c0ef70250b5cc59015`**; TAP **`58626c4673e89edb67a6fca78a95bd4a1e5c38ae70b895a0ec06b1df807cb9ac`**, **12 passed, 0 failed, 0 skipped**, 2509.38 ms. The exact single-file `tsrs --ignoreConfig` check and the single-file Biome check exited 0.

The 4-declared / 3-scanned fixture remains a test fixture, not the product corpus; the declaration records that distinction explicitly. The row is presented for acceptance at the declaration scope; no baseline, scanner/profile change or ticket 01 admission follows.

##### Step 7 acceptance-ready — 2026-11-02

**Presented for André's acceptance with the reviewed corpus artifact, at local darwin-arm64 and declaration/measurement scope. Not accepted by this record.**

If accepted, the scope is:

- The reviewed corpus declaration and first-baseline rules at `.scratch/superman-v0/duplication-corpus.md`, sha256 `c65938e15697c7080efdb1921fc5fda7edc5a1eb56029e8118c846fef2610305`, covering A conditions 1–6, the operational `src/**/*.ts` corpus, `.d.ts` inclusion and `.mts`/`.cts` exclusion, G5's `--no-gitignore` route, the >5-line clone floor, fail-closed accounting, `--changed-only` disqualification and no `--changed` enforced value.
- The declared-profile conformance probe at local darwin-arm64, TAP `58626c4673e89edb67a6fca78a95bd4a1e5c38ae70b895a0ec06b1df807cb9ac`, **12 passed, 0 failed, 0 skipped**, 2509.38 ms; probe sha256 `9fdbe9611414d5fa000356fbc3ff8676552777844f29d2c0ef70250b5cc59015`. It proves: tiny, one-line and empty omission with no one-line clone; the complete declared inventory and exact raw clone; the 50-token / >5-line boundary; the TypeScript format filter; default-gitignore vs `--no-gitignore`; the preserved mixed fixture; strict threshold/exit behavior; and changed-to-unchanged detection by the full corpus and `--changed` but not `--changed-only`.

Carried, not waived:

- **Declared-profile overlap partial:** in this probe the declared 50/5 profile produced no overlapping clones; the >100% line-ratio observation exists only under the non-declared 1/1 control. This is an observation, not a proof of impossibility. No clipping, re-basing or metric change is made, and the row's overlap clause is not met at the declared profile.
- **Platform/build limit:** darwin-arm64 only; one installed jscpd 5.4.2 build.
- **Driver-scope limit:** the probe drives `node_modules/.pnpm/jscpd@5.4.2/node_modules/jscpd/run-jscpd.js` with driver-shaped argv; it does not execute or prove the protected G5 driver in `.superman/ci/quality.ts`. The declaration records the driver contract, but this probe is not a G5 gate receipt.
- **Fixture provenance:** the probe's ambient `git` is a fixture grant, not a bound project tool; its fixtures use `tmpdir()` cleanup rather than an owned root; the operational corpus is empty in this checkout; G5 is `n/a` and no product baseline exists.
- **Artifact provenance:** `duplication-corpus.md` is untracked at HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`; acceptance would bind these working-tree bytes, not a committed artifact.

The row is acceptance-ready only at this declared-profile measurement/declaration scope. No `.jscpd.json` change, product baseline, Gate 1 closure or ticket 01 admission follows.


#### Step 7 acceptance — 2026-11-02

**Decision: André accepted the step 7 row and the reviewed corpus artifact at preparation scope on 2026-11-02.** Step 7 is green for the bounded declaration/measurement verification recorded above. This appended decision supersedes the pending-acceptance wording in the step 7 acceptance-ready section; the checklist table is not edited.

Accepted scope, local darwin-arm64 only:

- The reviewed corpus declaration and first-baseline rules at `.scratch/superman-v0/duplication-corpus.md`, sha256 `c65938e15697c7080efdb1921fc5fda7edc5a1eb56029e8118c846fef2610305`, covering A conditions 1–6, the operational `src/**/*.ts` corpus, `.d.ts` inclusion and `.mts`/`.cts` exclusion, G5's `--no-gitignore` route, the >5-line clone floor, fail-closed accounting, `--changed-only` disqualification and no `--changed` enforced value.
- The declared-profile conformance probe proves tiny/one-line/empty omission with no one-line clone, the complete declared inventory and exact raw clone, the 50-token / >5-line boundary, TypeScript format filtering, default-gitignore vs `--no-gitignore`, the preserved mixed fixture, strict threshold/exit behavior, and changed-to-unchanged detection by the full corpus and `--changed` but not `--changed-only`.

Evidence: probe `9fdbe9611414d5fa000356fbc3ff8676552777844f29d2c0ef70250b5cc59015`; TAP `58626c4673e89edb67a6fca78a95bd4a1e5c38ae70b895a0ec06b1df807cb9ac`, **12 passed, 0 failed, 0 skipped**, 2509.38 ms.

Carried, not waived:

- **Declared-profile overlap partial:** in this probe the declared 50/5 profile produced no overlapping clones; the >100% line-ratio observation exists only under the non-declared 1/1 control. This is an observation, not a proof of impossibility, and the row's overlap clause is **not met** at the declared profile. No clipping, re-basing or metric change is made.
- **Platform/build limit:** darwin-arm64 only; one installed jscpd 5.4.2 build.
- **Driver-scope limit:** the probe drives `node_modules/.pnpm/jscpd@5.4.2/node_modules/jscpd/run-jscpd.js` with driver-shaped argv; it does not execute or prove the protected G5 driver in `.superman/ci/quality.ts`.
- **Fixture provenance:** ambient `git` is a fixture grant, not a bound project tool; fixtures use `tmpdir()` cleanup rather than an owned root; the operational corpus is empty in this checkout; G5 is `n/a` and no product baseline exists.
- **Artifact provenance:** `duplication-corpus.md` is untracked at HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`; this acceptance binds these working-tree bytes, not a committed artifact.

This acceptance does **not** change `.jscpd.json`, create a product baseline, close Gate 1, activate an evaluator, approve any ticket, or admit ticket 01.

**Review:** the independent Standards and Spec R4 reviews of the frozen acceptance-prep delta (`superman-review-accept-247-r3`, manifest sha256 `b406b3efc189bd8e16f2203a98158763a44babf65530ef5cfa469652c5b21ed6`) returned **zero findings** on both axes. The reviews are evidence review, not live authority.

### Step 8 — current-Node inventory/measurement expansion

#### Step 8 slice record — 2026-11-04

**Outcome:** the row 8 slice is implemented and presented for André's acceptance. This record is not an acceptance: nothing here accepts a Deno pin, a native profile, an evaluator activation, ticket 01 admission or a readiness change. Node operational dispatch is unchanged — Node 26.5.0 still executes the gates.

**Scope.** `.superman/ci/coverage.ts`, `.superman/ci/coverage.json`, `.superman/ci/coverage.test.ts`, `.superman/ci/node-hosted-candidate-measurement-host.ts` (new), `tsconfig.json`, `knip.json`. No staging, commit, push, install or network fetch. Every fixture this slice writes goes to a `mkdtempSync` root; `git status --porcelain` shows no path outside this slice's thirteen declared files.

**What the model does now.** `.superman/ci/coverage.json` declares a third scope, `candidate`, with its own root, patterns, manifest and measurement suites, covering the parallel Deno candidate's **Node-hosted measurement tooling** under `.scratch/superman-v0/` — files that merely mention Deno, not Deno runtime. The operational Deno **runtime** is a different surface, `.superman/deno-bootstrap/**`, which row 11 created. One declaration holds both the members and the suites that measure them; `.superman/ci/node-hosted-candidate-measurement-host.ts` reads that declaration from the repository it measures, so there is no second, unlinked inventory. That host runs the candidate's **Node-hosted** measurement surfaces; it never executes the candidate runtime, and the receipt it writes says so (`candidateRuntime: "not executed"`). The candidate inventory is measured in its own process by the bounded host `.superman/ci/node-hosted-candidate-measurement-host.ts`, reported separately in the receipt as `inventories.candidate`, and merged into the aggregate disjointly from `node` and `product`. `tsconfig.json` carries the candidate surface in the compiler inventory (`knip.json`'s `project` deliberately does not: the Knip model is row 10's work, and `knip.json` gains only the host's entry).

**Clause-by-clause results.**

1. **Declared scopes are exhaustive over source files — met.** A source file that matches no declared scope and no declared exclusion fails and names its path (`Coverage scope does not model source file: <path>`). The hard-coded `vitest.config.ts` carve-out is removed; `vitest.config.ts` is a declared exclusion. RED→GREEN recorded in the bootstrap append.
2. **No exclusion can hide runtime code — met.** The runtime-reachable-excluded-module guard still fires and now also attributes a reachable module to the candidate scope; a module matching no scope is still rejected by name, and a runtime-reachable excluded file that *does* match the candidate scope cannot enlarge the declared inventory: the manifest is re-validated after the reachability walk and the run fails with `Coverage candidate inventory does not match its manifest`.
3. **Partial candidate inventories reject — met.** A missing declared root, a declared member matching no scope, a declared member missing from the file set (the scope resolving to fewer files than its manifest declares) and a resolved count that differs from the manifest each fail visibly and publish no measurement.
4. **Both inventories stay visible — met.** Each declared inventory is measured on its own and reported on its own (`inventories.node`, `inventories.candidate`, `inventories.product`); the aggregate merges them disjointly. A candidate file with a real source-map directive is rejected exactly like a node file, and the runtime-reachable-excluded-module guard now covers the candidate scope. The candidate inventory is measured by another process, so its measurement is attributed: `coverage-receipt.json` carries `candidateMeasurement` — the suites that measured it, their outcomes, the host's file and sha256, the Node runtime and `candidateRuntime: "not executed"`.
5. **Node operational dispatch stays active — met.** No change to the runtime that executes the gates; only measurement and protection policy changed.
6. **The floors still apply — met under the criterion as amended on 2026-11-04.** The original wording was **not** met: a Node-hosted gate measures the candidate inventory without the Deno binary — the host fabricates the Deno-emitted packet and drives the candidate's own measurement module over it and over its refusals, and the loop check reads the repository's real records — which lifted the candidate inventory to **94.78% lines (654/690)**, **88.75% statements (742/836)**, **94.87% functions (111/117)** and **78.57% branches (495/630)**; statements (eleven counts short) and branches (seventy-two arms short) were below the ≥90% floors. The amendment is André's reviewed decision, recorded at [Row 8 criterion amended — 2026-11-04](#row-8-criterion-amended--2026-11-04) — **not a discovery**: the ≥90% floors bind the shipped inventories (`node`, `product`), the candidate inventory is measured and reported with its four metrics visible in the receipt, and the candidate's floor becomes a carried obligation that binds at the merge-bound cutover, when the Deno root becomes the required evaluator. The floors themselves are unchanged — ≥90% in every metric, 100% target — and no floor was lowered. The measured numbers stand as recorded, and the remaining uncovered paths (named from the retained lcov in the bootstrap append) are carried with them. *(The binding point in this clause was settled by André's decision of 2026-11-04: the wording read "binds at row 11 or the merge-bound cutover, whichever comes first", and the decision settled that **both** carried coverage floors — the candidate measurement inventory's and the Deno operational surface's — bind at the merge-bound cutover, when the Deno root becomes the required evaluator. It settled an ambiguity in the wording; it discovered no new obligation, and no floor, threshold, scope or exclusion changed.)*

**Exec seam.** The host spawns the candidate's declared measurement surfaces, so row 9's exec-seam rule binds it: the seam stays on the exact paths `src/exec.ts` and `.superman/deno-bootstrap/exec.ts`, and row 11 placed the Deno seam at `.superman/deno-bootstrap/exec.ts` on 2026-11-04. The host's own spawns use the repository's owned-child idiom (`runOwned`) with exact paths declared in `.superman/ci/coverage.json`; the Deno seam path exists since row 11 and the product seam path `src/exec.ts` does not exist yet.

**Biome carry.** `node_modules/.bin/biome check` on the changed files exits 0 (the formatter errors are fixed). The five remaining diagnostics are informational: `main()`'s length and complexity were already over the limits before this slice, and the host's `fabricateEmittedPacket` and `fabricateRefusals` are new and still long — extracting them into ≤50-line helpers is a mechanical follow-up, recorded as a carry.

**Deliberate narrowing, recorded.** `coverage.ts`'s source-map guard matches the comment form of a source-map directive rather than any occurrence of the token, because `.scratch/superman-v0/deno-coverage-measurement.ts:164` holds that token inside a regular-expression literal. It still rejects a trailing `//# sourceMappingURL=`, a trailing `/*# sourceMappingURL=` and a line-start directive. No clause names this narrowing.

**What the amendment required in the model.** The floors bind the shipped inventories, so `coverage.ts` enforces them against `node` and `product` and reports the candidate inventory's shortfall as a carried obligation — `carriedObligations` in the coverage receipt, with the point at which the candidate's floor binds — rather than as a run failure or a silent pass. The candidate inventory's four metrics stay visible in the receipt, and the shipped inventories' floor failure keeps its `Coverage below 90%: <metric> <pct>% (<inventory>)` form.

**Carried limits.** The candidate runtime is not a repository input, so the candidate suites that need the verified Deno binary are not run by the gate; the candidate inventory is measured through the candidate's own Node-hosted surfaces only. The whole-repository gate cannot complete in this environment: with the tree as it stands it stops at `Coverage scope does not model repository runtime code: .serena/.gitignore` (another actor's untracked directory), and with `.serena/` moved aside it stops at `Coverage process tests failed` (460 tests, 308 pass, 152 fail: 48 Archgate-pin `expected: '0.61.0' actual: '0.43.0'`, 74 quality-gate failures caused by another actor's in-flight `direct-gates.ts` parameter property that Node's strip-only mode cannot parse, 0 pnpm-pin, 0 Biome out-of-memory). The retained TAP for both runs and their sha256 digests are cited in the bootstrap append. The node inventory is therefore not measured under the shipped policy here, and no number is presented as one. Another actor's untracked `.serena/` directory contains a nested `.gitignore` that the runtime-code guard reads as runtime code; the guard is path-correct and unchanged in that respect, and a clean checkout does not carry `.serena/`. The four declared candidate members were added to the index as intent-to-add on 2026-11-04 (no content staged, nothing committed), so the candidate scope is non-empty here and in a checkout that carries those index entries. `gate1-loop-check.mjs` is a declared candidate member that the TypeScript-only compiler project never typechecks. The candidate's inclusion in the Knip model is row 10's work (clause 4, "the Knip model is complete"); `knip.json`'s `project` is unchanged here and G3 is green, and the two row 10 options (declaring `istanbul-lib-coverage`, `istanbul-lib-report` and `istanbul-reports` in `package.json`, or moving the candidate module to the repository's `createRequire(import.meta.resolve("c8"))` idiom with a non-literal argument, which would supersede the row 5 acceptance binding sha256 `064c6e63e48ff5c3686b66ff9672bbc564f027a08b85323a42c635a74ec92af0`) are recorded in the bootstrap append, not implemented. The candidate inventory's remaining statements and branches gap is a failed named clause, not a note: it is recorded above as NOT MET, and it is André's decision whether to close it with further Node-hosted measurement of the candidate's error paths or to change the criterion.
#### Step 8 follow-up record — 2026-11-04 (the Deno operational surface as a declared inventory)

**Outcome:** the row 8 coverage scope model now declares the Deno operational surface as its own scope, and its measurement is bound from the Deno collector's own receipt rather than taken by the Node host. **This is a discovery, not a settled requirement.** Row 8's clause 6, as amended on 2026-11-04, never named the Deno operational surface; under [ADR 0018](../../docs/adr/0018-admission-evidence-not-tool-correctness.md) an obligation not named in the criterion is a note for the next decision, not something to absorb silently and not a blocker. This record is not an acceptance: nothing here accepts a Deno pin, a native profile, an evaluator activation, ticket 01 admission or a readiness change, and no floor was changed.

**The discovery, and its consequence.** Row 11 created `.superman/deno-bootstrap/**` — the operational Deno **runtime** — and row 8's scope-exhaustiveness check stopped on it: `Coverage scope does not model source file: .superman/deno-bootstrap/exec.ts`. The amended clause 6 binds the ≥90% floors to the shipped inventories (`node`, `product`); it names no fourth inventory, so the Deno surface's own floor is **not** bound by the Node coverage gate by this criterion, and its binding point is André's confirmation, not this record's decision. The declaration and attribution below exist because the gate is otherwise red on a real surface and because a measurement must be attributed to something; the treatment is a note for the next decision, not the criterion's own requirement, and not a blocker.

**What is declared.** `.superman/ci/coverage.json` gains a fourth scope, `deno`, with the same shape the `candidate` scope uses — a root, patterns and a manifest of members — so the manifest-equality check applies to it exactly as it does to the candidate: a missing root, a member matching no scope, a missing member, and a scope resolving to a different count each reject and publish no measurement. The declared root is `.superman/deno-bootstrap`; the declared patterns are `.superman/deno-bootstrap/**/*.ts`; the declared members are the eleven operational modules — `.superman/deno-bootstrap/archgate-arm64-build.ts`, `archgate-linux-arm64-wizard.ts`, `coverage.ts`, `direct-gates.ts`, `exec.ts`, `fixture-env.ts`, `pr-policy.ts`, `provision-tools.ts`, `quality.ts`, `raw-gates.ts` and `replay.ts` — matching the Deno collector's own `DECLARED` list exactly. The scope is not excluded and is not folded into `node` or `product`.

**Where the measurement comes from.** Not from the Node host: the Node host cannot execute Deno code, and a Node-measured number for this surface would be a false measurement. The measurement is carried from the Deno collector's own receipt, the one `deno run … .superman/deno-bootstrap/coverage.ts` writes, bound into the coverage receipt the way row 8 already binds the candidate host's receipt (`candidateMeasurement`). The coverage receipt's `denoMeasurement` carries the collector's identity — `.superman/deno-bootstrap/coverage.ts` and the sha256 of the bytes in the tree when that receipt was written, recorded in the Deno receipt's own `collector` field and mirrored into `denoMeasurement.collector` — the receipt it bound (`.superman-ci/coverage-deno-OBhcBa/coverage-receipt.json`, sha256 `0e954c5a6ad505b944cc95324d551cee09401fca48921681c8bb68757af695a8`, `evaluatedSha` `62c8495aeffa33d827c481e661f6083f8bc718d4`, `inputsHash` `25a337723c6d57099c366a832e77333ee6a037822d5e20242101ed3a44cb9209`), the eleven declared members, and the four metrics with their covered/total tuples — **lines 550/1675, statements 609/1854, branches 437/1851, functions 95/231**. Nothing is synthesized, estimated or re-derived: the numbers are the Deno receipt's own. The gate fails visibly if the receipt is absent, if it does not bind every declared member, if it reports no Deno inventory, if no receipt names the collector that is in the tree, or if the receipt's own verdict disagrees with its metrics. *(Corrected on 2026-11-04 in the row 11 correction round: this paragraph cited the receipt the collector wrote at 08:17:57 and a collector digest that no collector in the tree has; the receipt now records the collector that wrote it and the gate binds only that receipt, so the figures are replaced by the fresh ones above.)* *(Corrected on 2026-11-05 in the binding-point correction round: this paragraph pinned the collector's sha256 inline, `c90a8016…`, and a later round replaced the collector's bytes, so the pinned digest named a collector that is no longer in the tree. The digest is not re-pinned here, because a collector digest changes on every collector edit and any pinned value goes stale again the next time the collector is touched. Where the collector's identity actually lives is the Deno receipt's own `collector` field and the coverage receipt's `denoMeasurement.collector`, which the gate fills from the bytes in the tree at bind time and refuses to bind if it does not match. Read the identity there rather than from this record.)*

**The floor is a carried obligation, not a pass.** The Deno surface's four metrics are far below the ≥90% floors, so its floor is carried in the same shape as the candidate's — `carriedObligations` in the coverage receipt, plus the visible `Coverage carried obligation (deno): lines 550/1675, statements 609/1854, branches 437/1851, functions 95/231; binds at the merge-bound cutover, when the Deno root becomes the required evaluator` line. The binding point is the Deno collector's own recorded one, carried forward verbatim. The shipped inventories' floors are unchanged and their failure keeps its existing `Coverage below 90%: <metric> <pct>% (<inventory>)` form. The Deno receipt's own `verdict` is `fail`, which is the truth about that measurement; the collector does not claim a pass it did not achieve, and the gate refuses a receipt whose verdict disagrees with its metrics.

**Clause-by-clause results.**

1. **Declared scopes are exhaustive over source files — met, and extended additively.** The Deno root is now modelled by a declared scope instead of being rejected by name. The scope-exhaustiveness check itself is unchanged, and no source file is excluded to make room for the Deno root.
2. **No exclusion can hide runtime code — met, unchanged.** The runtime-reachable-excluded-module guard still fires and now also attributes a reachable module to the Deno scope; a module matching no scope is still rejected by name, and a runtime-reachable excluded file that does match the Deno scope cannot enlarge the declared inventory, because the Deno manifest is re-validated after the reachability walk exactly as the candidate's is.
3. **Partial candidate inventories reject — met, and the same four rejections now apply to the Deno inventory.** A missing declared root, a declared member matching no scope, a declared member missing from the file set, and a resolved count that differs from the manifest each fail visibly and publish no measurement.
4. **Both inventories stay visible — met.** Each declared inventory is measured or carried on its own and reported on its own (`inventories.node`, `inventories.candidate`, `inventories.product`, `inventories.deno`); the Deno inventory is never folded into the Node aggregate and never enters `receipt.sources`. The Deno surface's source-map and suppression guards apply to it as they do to the candidate's members.
5. **Node operational dispatch stays active — met.** No change to the runtime that executes the gates; only measurement and protection policy changed.
6. **The floors still apply — met under the criterion as amended on 2026-11-04, unchanged.** The ≥90% floors still bind `node` and `product` exactly as they did; the 100% target is unchanged; no floor was lowered. The Deno surface's own floor is a **carried obligation**, in the same shape as the candidate's — but this is the discovery's treatment, decided here as a note for the next decision, **not** a requirement the amended clause 6 names.

**The wording correction.** Row 8's records said "the Deno runtime graph" for two different surfaces. Only `.superman/deno-bootstrap/**` is the Deno **runtime**; `.scratch/superman-v0/deno-*.ts` is Node-hosted candidate measurement tooling that merely mentions Deno, and row 9's rules scope both without making them the same thing. Row 8's records now say which is which. The same phrasing still stands in row 9's own record and evidence (`The Deno runtime graph these rules cover…`); that is row 9's record to change and it is not changed here.

**Carried limits.** The Deno receipt does not record the collector's own hash, so the gate binds the **measured surface** — the declared member list — and records the collector's current hash for inspection; it cannot prove which collector revision produced the bound receipt. In this tree the Deno root was under concurrent edit by another actor throughout this slice (the collector rewritten at 08:39:40, its two Node-hosted suites at 08:38:47 and 08:41:54) while the bound receipt was produced at 08:17:57, so the bound measurement is bound to the declared member set and not to the collector's current revision. The Deno root is not in the repository's TypeScript compiler project, so `pnpm exec tsrs --noEmit` does not typecheck it and `deno check` is its type checker. The whole-repository gate still cannot complete here: with `.serena/` moved aside it stops at `Coverage process tests failed` (492 tests, 416 pass, 76 fail — 48 are the Archgate npm shim's `Use a verified 0.61.0 binary via ARCHGATE_BIN` refusal, `ARCHGATE_BIN` being unset, and 28 are in `.superman/ci/raw-routing.test.ts` around the pnpm pin `12.16.1` against the installed 9.15.9), so the `node` inventory is not measured under the shipped policy in this environment and no number is presented as one. The Deno numbers above are the Deno collector's own, carried through the Node gate.

#### Step 8 binding-point correction record — 2026-11-05

**Outcome:** the Node gate and the Deno collector now name **one** binding point for **both** carried coverage floors — the merge-bound cutover, when the Deno root becomes the required evaluator — and the Node gate's own candidate obligation carries that exact string. The candidate floor is therefore carried to the cutover rather than to row 11, and the Deno floor is carried to the same point. This is a **wording correction on André's 2026-11-04 decision**, which settled an ambiguity in the earlier wording; it discovered no new obligation, and no floor, threshold, scope, exclusion, inventory or admission state changed. This record is not an acceptance, and it accepts nothing — no pin, no native profile, no evaluator activation, no workflow publication, no ticket 01 admission and no readiness change.

**The decision, and what it settled.** André's decision of 2026-11-04 is that **both** carried coverage floors bind at the merge-bound cutover. The wording it settles — "binds when the candidate materialises as the operational surface — row 11, or the merge-bound cutover, whichever comes first" — was read two ways: as naming row 11 as an earlier binding point for the candidate floor, and as naming only the cutover. The decision settles it the second way, for both floors. The candidate tooling was never promoted to the operational surface — row 11 created a *new* surface — and the Deno surface is still parallel and non-admitting, so neither floor binds before the cutover. Row 11's collector already used the settled wording; the Node gate's candidate obligation was the one still naming the superseded wording.

**What changed.** `.superman/ci/coverage.ts` writes the settled string into the candidate obligation of the Node receipt, and the comment above the carried-obligation loop says both floors name one binding point. `.superman/ci/coverage.test.ts` pins the string in one place and asserts **exact equality** on both carried obligations — the candidate floor's and the Deno floor's — so the two cannot drift apart again. The Deno floor's binding point is still the Deno collector's own recorded one, carried forward verbatim. The floors, the gate's refusal of an unattributable receipt, the receipt's shape, the exact-equality exclusion pin, the scope exhaustiveness check, the manifest-equality check and the separate measurement and reporting of the candidate and Deno inventories are all unchanged.

**The RED→GREEN at the real seam.** The seam is the coverage command's own process seam — the fixture runs the real `coverage.ts` over a real tiny repository and reads the receipt the run wrote. The RED came first: the assertion was tightened to the settled wording while production still wrote the superseded one, and it failed naming that old string verbatim (`actual: 'row 11, or the merge-bound cutover, whichever comes first'`, `expected: 'the merge-bound cutover, when the Deno root becomes the required evaluator'`, `operator: 'strictEqual'`). After the production change the same file is green: **63 tests, 63 pass, 0 fail**. Both assertions were then shown to bite by mutating the code they guard — the production string, and the Deno receipt fixture's recorded binding point — each mutation failing on the exact string the receipt carried, and each mutation reverted.

**The pinned collector digest is no longer pinned.** Row 8's follow-up record above named the Deno collector's sha256 inline, and a later round replaced the collector's bytes, so that pinned digest named a collector that is no longer in the tree. It is **not** re-pinned with the current digest, because a collector digest changes on every collector edit and any pinned value goes stale again the next time the collector is touched. Where the collector's identity actually lives is the Deno receipt's own `collector` field and the coverage receipt's `denoMeasurement.collector`, which the gate fills from the bytes in the tree at bind time and refuses to bind if it does not match. Both records point there instead.

**Verification** (darwin-arm64, Node v26.5.0, the pinned Deno 2.9.8 and the pinned Archgate 0.61.0).

| Command | Exit | Result |
|---|---|---|
| `node --test --test-concurrency=1 .superman/ci/coverage.test.ts` | 0 | **63 tests, 63 pass, 0 fail** |
| the binding-point test with the production string mutated back to the superseded wording | 1 | the assertion failed and named it — the reachability demonstration |
| the Deno-surface test with the Deno receipt fixture's binding point mutated to the superseded wording | 1 | the assertion failed and named it — the reachability demonstration |
| `SUPERMAN_DENO_BIN=<pinned> ARCHGATE_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts .superman/deno-bootstrap/tests/transition.test.ts` | 0 | **45 tests, 45 pass, 0 fail** |
| `ARCHGATE_BIN=<pinned> <pinned 0.61.0> check --strict --output json` | 0 | `"pass": true, "total": 16, "passed": 16, "failed": 0, "errors": 0, "ruleErrors": 0` |
| `node_modules/.bin/biome check .superman/ci/coverage.ts .superman/ci/coverage.test.ts` | 0 | 3 infos, 0 errors, 0 warnings — the same pre-existing complexity infos the pre-change file carries |
| `pnpm exec tsrs --noEmit` | 0 | clean |
| `git diff --check` | 0 | clean |
| `node .superman/ci/coverage.ts` (the whole-repository gate, over the **repository root**) | **1** | the gate stopped at `Coverage inputs changed; caller changes were preserved` — its input-fingerprint guard refuses the run because another actor was editing the repository's files during it. Its process-test stage was green (**523 tests, 523 pass, 0 fail**) and its candidate-measurement stage ran, but it published no receipt and no `node` number |
| `node .superman/ci/coverage.ts` (the whole-repository gate, over an isolated `mkdtemp` tree excluding another actor's untracked `.serena/` directory, carrying the one Deno receipt the current collector wrote) | **0** | **the gate completed and published a receipt.** 523 process tests, 523 pass, 0 fail; the receipt's `verdict` is `pass` over `node` 19 files, `candidate` 4 files and `deno` 11 files; and **both carried obligations name the identical binding point** — `candidate -> the merge-bound cutover, when the Deno root becomes the required evaluator` and `deno -> the merge-bound cutover, when the Deno root becomes the required evaluator`. The run printed `Coverage carried obligation (candidate): statements 742/836, branches 495/630; binds at the merge-bound cutover, when the Deno root becomes the required evaluator` and `Coverage carried obligation (deno): lines 571/1733, statements 631/1910, branches 466/1911, functions 103/241; binds at the merge-bound cutover, when the Deno root becomes the required evaluator`, then `Coverage: pass (minimum 90% in every metric; target 100%)` |

**Carried limits.**

- **The `node` inventory is measured, but only over an isolated tree.** Over the **repository root** the whole-repository gate exits **1** at `Coverage inputs changed; caller changes were preserved` — its input-fingerprint guard refuses the run because another actor was editing the repository's files during it — so it publishes no receipt and no `node` number. Over an isolated `mkdtemp` tree the gate **completed and exited 0**: 523 process tests, 523 pass, 0 fail, and a receipt whose `verdict` is `pass` over `node` 19 files, `candidate` 4 files and `deno` 11 files — with **both carried obligations naming the identical binding point**, `the merge-bound cutover, when the Deno root becomes the required evaluator`. That is a gate over a *copy* of the working tree, not over the repository root: the root's run is stopped by that actor's concurrent edits and — whenever their untracked `.serena/` directory is present in the tree — by the scope-exhaustiveness check, which reads `.serena/.gitignore` as repository runtime code. No `node` coverage percentage is presented as a measurement of this repository's root tree, and this round does not touch the Node surface's coverage — the binding point is the only thing that changed.
- **The candidate floor's residual is unchanged.** Row 8's numbers stand as recorded — 94.78 % lines (654/690), 88.75 % statements (742/836), 94.87 % functions (111/117), 78.57 % branches (495/630) — with statements and branches still below the ≥90 % floors. What changed is only *when* that floor binds. The obligation is carried, not waived, and it remains a failed named clause of row 8's amendment for André to close by measurement or by a criterion change.
- **The Deno surface's floor gap is not closed.** Its floor remains a carried obligation binding at the merge-bound cutover.

#### Step 8 coverage re-measurement record — 2026-11-06

**Outcome:** the shipped `node` inventory is re-measured over the final tree and **passes every floor**, the candidate inventory and the Deno operational surface are re-measured and **carried**, and the Node collector exits 0. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**The measurement.** Over an isolated snapshot of the same bytes — a fresh Git repository over the tree with `node_modules` symlinked, so no verification run wrote into the repository root. The Deno collector ran first under the pinned Deno 2.9.8 and left its receipt; the Node collector then bound that receipt.

| Inventory | Files | lines | statements | branches | functions | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `node` | 19 | 2658/2768 (96.03 %) | 2973/3120 (95.29 %) | 2406/2664 (**90.32 %**) | 401/414 (96.86 %) | **every floor met** — receipt `verdict: "pass"` |
| `candidate` | 4 | 652/688 (94.77 %) | 742/836 (88.76 %) | 493/628 (78.50 %) | 111/117 (94.87 %) | **carried** — statements and branches are below the floor |
| `deno` | 11 | 918/1955 (46.96 %) | 1015/2158 (47.03 %) | 748/2081 (35.94 %) | 153/297 (51.52 %) | **carried** |

*(Re-measured on 2026-11-06 over the final tree, after the two independent reviews' fixes and the Deno sibling's own `deno check`. The first measurement of the day reported 2642/2752, 2953/3100, 2401/2654 and 393/406; the G6 identity comparison and the per-host typecheck moved the figures slightly, and the branch margin is **0.32** points rather than 0.47. It is still thin, and the record says so.)*

Both carried obligations bind at **the merge-bound cutover, when the Deno root becomes the required evaluator** — André's settled wording, and the wording the receipt itself carries.

**Two things the measurement shows that the earlier numbers did not.**

1. **The `node` inventory's branch margin grew, not shrank.** The earlier figure was 2284/2531 (90.24 %), a margin of 0.24 points over the ≥90 % floor. The measurement over the final tree is 2406/2664 (90.32 %), a margin of **0.32** points. The staged-scope work added covered branches — the staged G9's own tool-identity, staged-file and regular-file guards, the staged G5's corpus and profile checks, and the process-group cleanup's second tolerated errno — and none of them is uncovered. The margin is still thin enough to say so plainly: it is under half a point, and a new uncovered branch in the enforcement core eats a third of it.
2. **The Deno surface's own numbers improved substantially.** The port's coverage is 46.96 / 47.03 / 35.94 / 51.52 % against the earlier 32.83 / 32.84 / 23.60 / 41.12 % — the port grew by the staged forms and its own `deno check`, and the coverage grew with it. The floor is still not met and is still carried; the improvement changes nothing about when it binds.

**The gate's own verdict.** The Node collector printed `Coverage: pass (minimum 90% in every metric; target 100%)` and **exited 0**. The Deno surface's floor did not fail the gate — it was carried, exactly as the decision requires, and the gate's failure was the `node` inventory's own floor on the earlier measurement, not the Deno inventory's.

### Step 9 — governing Deno rules/input closure

#### Step 9 slice record — 2026-11-04

**Outcome:** the row 9 slice is implemented and presented for André's acceptance. This record is not an acceptance: nothing here accepts a Deno pin, a native profile, an evaluator activation, ticket 01 admission or a readiness change. The Node evaluator still runs the gates. What changed is that the five governing rule pairs now see the Deno runtime graph instead of being vacuous against it.

**Scope.** `.archgate/adrs/SUP-001-zero-runtime-deps.{md,rules.ts}`, `SUP-002-exec-boundary.{md,rules.ts}`, `SUP-003-no-sh-py.{md,rules.ts}`, `SUP-006-tsrs-typecheck.{md,rules.ts}`, `SUP-008-tests-through-superman.{md,rules.ts}` and the public process fixture `.superman/ci/archgate-policy.test.ts`. `.superman/ci/pr-policy.ts` and `.superman/ci/pr-policy.test.ts` were read-only for most of the slice; the coordinator then lifted that fence after checking that no slice had touched them, so clause 4's G4 layer is closed by adding the Deno configuration inputs to the protected list, with a fixture. SUP-005, SUP-004, SUP-007, SUP-009, `docs/adr/0018-*.md`, `.archgate/config.json` and `.archgate/rules.d.ts` are byte-unchanged. No staging, commit, push, install or network fetch. Every fixture this slice writes goes to a `mkdtempSync` root; `git status --porcelain` shows no path outside this slice's thirteen declared files.

**The Deno surfaces and inputs these rules cover, as of 2026-11-04.** The Deno runtime graph has two source surfaces — the operational Deno root `.superman/deno-bootstrap/**`, which is Deno runtime source and is populated by row 11, and the Deno-named candidate surface `.scratch/superman-v0/deno-*.ts`, which is Node-hosted probe and measurement tooling that merely names Deno and is therefore held to the Deno source checks but not to the operational root's own rules — and the Deno configuration and import-map inputs `**/deno.json`, `**/deno.jsonc`, `**/import_map.json`, plus the resolution input `**/deno.lock` in SUP-006, which is the rule that reads it. The product `src/` tree is not part of the Deno *source* graph: it is Node code until ticket 01 and row 11 port it, so the Deno source rules read only the operational Deno root and the Deno candidate surface and the scope widens when the runtime is actually ported. The Deno *configuration* rules are deliberately not narrowed: a `deno.json` is a Deno configuration wherever it sits, so `**/deno.json` reaches them under `src/` too, because the product tree will hold a Deno configuration once it is ported. Archgate 0.61.0's rule-file security scan blocks imports in rule files, so SUP-001, SUP-002, SUP-003 and SUP-006 repeat the same vocabulary constants verbatim instead of importing a shared module.

**Observed results.** The pinned darwin-arm64 Archgate 0.61.0 (`be740ac0…c3c0b5e`, archive `44c64560…699cf3`; `ARCHGATE_BIN` must point at the extracted binary — without it the suites fall back to the 0.43.0 npm shim and fail 47 tests with `ctx.ast is not a function`, which is the shim failing, not a regression) ran the real rules over real fixture repositories. Eight RED→GREEN cycles at that process seam, one per rule plus three that closed gaps found in review, each RED being the engine reporting `pass: true` for a fixture that bypasses the rule. Every bypass fixture now exits 1 with a real finding: a Deno runtime dependency directly and through the import map and through a declaration input (SUP-001); a `Deno.Command` outside the exec seam, a shell-equivalent spawn in both the `sh -c` and the `cmd /c` form, a blanket permission grant in the operational runtime or the Deno configuration, and a `node:child_process` import in the operational Deno root (SUP-002); a shell or Python file, a non-Node hook shebang and extension-less shell glue in the Deno graph (SUP-003); `--fast`, `TSRS_FAST`, a floating tsrs pin in the Deno configuration and in the lock, and a type input outside the checked graph (SUP-006); a direct `deno test`, `deno task` or `deno lint` in a workflow that runs `superman gate` (SUP-008); a second hop through a local alias, a third-party package in the lock, a shell interpreter reached through another executable and a shebang that names deno after a shell are rejected as well. The allowed forms of each fixture still exit 0, including a Node product file carrying a `["-A"]` literal and a `--fast` comment, which the Deno rules must not touch. Clause 2 was measured, not asserted: a differential harness ran the pinned binary over one identical fixture — including `src/deno.json` with a `shell: true` line, which HEAD never reported — with the HEAD rule pair and with the changed pair, and every pre-existing rule's report set is identical to HEAD; the widening adds findings only through the new rules. The completion command `node --test --test-concurrency=1 .superman/ci/archgate-policy.test.ts .superman/ci/rule-coverage.test.ts .superman/ci/pr-policy.test.ts` exits 0 with 180 tests, 180 pass, 0 fail; the pinned strict run over `.archgate/adrs/` is `"pass": true, "total": 16` — briefly red during the slice only because SUP-005 could not parse another actor's in-flight `.superman/ci/coverage.ts`, while this slice's five ADRs each pass on their own in either state — and the tracked-tree run is `"pass": true, "total": 19"` with the candidate surface now tracked as intent-to-add, so the Deno scope in that copy holds the whole candidate surface; `git diff --check` is clean; the five rule files type-check clean under the pinned `tsc`; the per-file Biome check is clean. Full commands, outputs and the rule-by-rule fixture table are in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 9 slice`.

**Clause-by-clause results.**

1. **Every one of the five rules has a non-vacuous Deno scope — met.** Each ADR declares the Deno runtime graph in its `files:` frontmatter, each rule reports a real violation for a fixture that bypasses it, and the allowed forms still pass. The scope is non-empty in a clean checkout because `.scratch/superman-v0/deno-launch.probe.test.ts` is tracked and matches it.
2. **No existing detection is weakened — met, and measured.** The old-versus-new differential runs the pinned binary over one identical fixture with the HEAD rule pair and with the changed pair; every pre-existing rule's report set is identical to HEAD, and the widening adds findings only through the new rules.
3. **Each rule has a proven bypass fixture — met.** SUP-001 rejects a Deno runtime dependency directly, through the import map and through the import chain; SUP-002 rejects a `Deno.Command` outside the exec seam, a shell-equivalent spawn and a blanket permission grant; SUP-003 rejects a shell or Python file, a non-Node hook shebang and a shell helper that names deno after a shell; SUP-006 rejects `--fast`, `TSRS_FAST`, a floating tsrs pin and a remote type input; SUP-008 rejects a direct Deno test or gate invocation in a workflow.
4. **Effective runtime, config, declaration, permission and build inputs are protected, with negative fixtures — met.** The rule side is complete: every input kind has a declared scope, a rule that acts on it, a negative fixture, and the indirection is covered through the import map, the import chain, the lock, a shell interpreter behind another executable and a workflow step that reaches a Deno task. The G4 path-policy layer is closed too: `pr-policy.ts`'s `PROTECTED` list carries `**/deno.json`, `**/deno.jsonc`, `**/deno.lock` and `**/import_map.json`, so an effective Deno configuration input cannot change outside a spec-kind PR, and the pr-policy fixture proves that a ticket PR touching one is rejected while a spec-kind PR may change one.
5. **`Source:` links survive — met.** Every edited ADR keeps its `Source:` line pointing at an existing `docs/adr/` file, and GEN-001 passes in the strict run.
6. **SUP-005's completed history is untouched — met.** Its rule bytes and its recorded evidence are unchanged, and the collector-specific suppression checks remain exactly as they are — still needing actual integration, and still not claimed as done.

**Carried limits.** The Deno scopes cover the candidate surface, not product `src/`; the rules are text-level and prove no runtime equivalence; the exec-seam rule cannot see an alias built at runtime; `node:child_process` is rejected in the operational Deno root only, because seven of the Node-hosted candidate probes under `.scratch/superman-v0/` legitimately use it; the exec seam is one definition — one module per runtime, `src/exec.ts` for the product and `.superman/deno-bootstrap/exec.ts` for the operational Deno root, confirmed by André on 2026-11-04, so a nested `exec.ts` is reported rather than exempt — and row 11 must confirm or amend the second path; the Deno hook shebang is still ticket 04's decision, so both `node` and `deno` shebangs are accepted; ADR 0008's `--fast` allowance for a local editor or watch loop is honoured, so the fast-mode ban stops at the Deno gate configuration; SUP-008's Deno scope is the workflow set, so row 12's Deno workflow template is not yet in it. **Durability:** the Deno scope is non-empty in a clean checkout: `.scratch/superman-v0/deno-launch.probe.test.ts` is tracked at `62c8495…` (blob `d9146608…`) and matches the `.scratch/superman-v0/deno-*.ts` scope, so clause 1's non-vacuity holds there and the scope was not widened to make that true. The other candidate surfaces in this working tree are untracked, so a clean checkout has a smaller but non-empty Deno scope. The G4 path-policy layer of clause 4 is closed: `deno.json`, `deno.jsonc`, `deno.lock` and `import_map.json` are in `pr-policy.ts`'s protected list.

**The candidate surface `.scratch/superman-v0/**` is not a protected glob, deliberately.** It is already protected where it matters: a ticket PR may only edit the Status line of its own ticket under `.scratch/`, so no ticket PR can change the candidate surface today. Adding it to the protected glob list would loosen it rather than tighten it, because protected paths are editable in *every* spec-kind PR — the candidate surface would become writable by spec-kind PRs for other slugs. The recorded-evidence concern is answered by the flow rather than by a glob: the candidate surface and the receipts that cite its bytes are both changed in the same spec-kind PR for that slug (the receipts live under `.superman/**`, also protected), so the evidence cannot be invalidated silently. What clause 4 names — the effective Deno configuration inputs — is protected at the path layer by the four new globs, and the Deno runtime graph's source is policed by the five rules, which are protected under `.archgate/**`. André confirmed this decision on 2026-11-04; it is a decision with its reasoning, not an open limit. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission. `pnpm exec biome` still aborts with its out-of-memory condition, which is pre-existing and reproduces on untouched files.

#### Step 9 coverage-closure record — 2026-11-05

**Outcome:** row 9's four Deno rules were inside the `node` coverage inventory with no supplemental exported-rule callback coverage, so the `node` inventory's own floor was unmet and the branch's required check was red; this record closes that gap with the supplemental callback layer ADR 0014 prescribes, and the `node` inventory now meets all four floors. **This is not an acceptance.** Nothing here accepts a Deno pin, a native profile, an evaluator activation, ticket 01 admission or a readiness change; no acceptance record was written; the Node evaluator still runs the gates; and the floors are unchanged — ≥90 % in every metric with the 100 % target, not lowered, and no exclusion was added.

**The finding, measured.** `.superman/ci/coverage.json`'s `node` scope is `[".superman/ci/**/*.ts", ".archgate/adrs/*.rules.ts"]`, so the four rule files row 9 changed sit in the inventory's denominator. The repository's coverage run never loads them: the Archgate engine executes the rules out of band, in a separate process, not inside the measured Node test run. From the last whole-repository coverage receipt before this change (`.superman-ci/coverage-M2IYiM/coverage-receipt.json`, `verdict: "fail"`), the four files measured 17/114, 13/33, 23/47 and 35/66 statements and 8/77, 8/22, 4/27 and 15/36 branches — and the inventory as a whole failed its own floor: `Coverage below 90%: statements 89.23% (node), branches 85.38% (node)`. `.github/workflows/ci.yml` runs the overall coverage floor as a required step of the `bootstrap (…)` job, so the branch's required CI was red on the `node` inventory.

**The remedy, and it is the repository's own doctrine.** ADR 0014, *Overall coverage stays enforced when CI is incremental*: "Supplemental exported-rule callback tests make actual rule code measurable; they do not replace the pinned-engine process fixtures or prove parser integration." `.superman/ci/rule-coverage.test.ts` is that supplemental suite and already served the pre-existing rules; it reached none of row 9's four — the four rule names appear 0 times in that file before this change (`no-deno-runtime-deps` 0, `deno-exec-boundary` 0, `deno-runtime-shebang` 0, `deno-check-policy` 0) — while the pinned-engine suite reaches them through the ADR and its rule file rather than by name. Fifteen supplemental callback tests were added there, in the file's own idiom and placed with each ADR's existing group. `.superman/ci/archgate-policy.test.ts` is unchanged by this record and keeps its bypass fixtures at the pinned Archgate 0.61.0 binary; those fixtures remain the proof that each rule reports a real violation through the engine. The supplemental tests make the rule code measurable — the scope filter, the matcher and the reporting path of each rule — and are not a second implementation of the rule.

**A note on the before-measurement, and on how the measured run was made.** The before-numbers are a real whole-repository coverage receipt over this tree — `.superman-ci/coverage-M2IYiM/coverage-receipt.json`, written 2026-11-05 at 10:59, `verdict: "fail"`.

Three further whole-repository coverage runs were started over the repository root — one before the change, two after — and **all three were refused by the collector's own fingerprint guard**: another actor was editing the tree inside each run window, and the collector refused with `Coverage inputs changed; caller changes were preserved`. That is the guard refusing to publish a measurement that does not bind one tree, not a defect. Every one of those runs' test phases was green — **508 tests, 508 pass, 0 fail, 0 skipped** before the change, and **523 tests, 523 pass, 0 fail, 0 skipped** for each run after it, the fifteen new supplemental tests included.

The published measurement is a whole-repository coverage run over an **isolated snapshot of the working tree** — a fresh git repository over the same tree at commit `66532a063d0e97ec1e9f50a9aeef910caadb382f`, with `node_modules` hard-linked and the Deno collector's receipts copied in, so no verification run wrote into the repository root. That is the same construction the Deno collector's own recorded evidence uses, and the tree it measured contains this change. The run's own exit status was **0** and its receipt's verdict is **`pass`**. The isolated construction does not weaken the measurement: the snapshot is the same bytes, the same declared inventories, the same pinned tools and the same collector, and the collector's own input-fingerprint guard is what proved the run bound exactly one tree.

**The reachability demonstrations, one guard at a time.** Each rule's own guard was broken in a byte-identical copy of its rule file held outside the repository, the corresponding supplemental test was run against the mutated copy and went red with the guard named, and the unmutated copy was restored and re-run green. SUP-001's Deno-graph scope filter (`SOURCE.test(file) && DENO_SOURCE.test(file)` → `SOURCE.test(file)`) made the Node product tree reported as a Deno runtime graph; SUP-002's exec seam (`EXEC_SEAMS.includes(file)` → `false`) made the exec seam reported as a spawn outside the seam; SUP-003's interpreter set (`["node", "deno"]` → `["node"]`) made the Deno shebangs reported; SUP-006's exact-version matcher (`/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/u` → `/^.*$/u`) made the floating pin accepted. The repository's own rule files were never edited.

**The measured effect.** The whole-repository coverage run over the isolated snapshot described above. The repository's own `.serena/` directory was held outside the tree for every run in this round (another actor's untracked directory that the coverage runtime-code guard reads as repository runtime code) and was restored afterwards:

| `node` inventory | before | after |
| --- | --- | --- |
| lines | 2361/2606 (90.59 %) | 2496/2606 (95.77 %) |
| statements | 2627/2944 (89.23 %) | 2797/2944 (95 %) |
| functions | 351/377 (93.10 %) | 364/377 (96.55 %) |
| branches | 2161/2531 (85.38 %) | 2284/2531 (90.24 %) |

Every one of the four floors is now met, and the receipt's own verdict is `pass`: the two metrics that were below the floor — statements at 89.23 % and branches at 85.38 % — are now 95 % and 90.24 %. The floors themselves are unchanged (≥90 % in every metric, 100 % target), no exclusion was added, and nothing was lowered. The four rule files now measure 113/114, 46/47, 33/33 and 66/66 statements and 76/77, 26/27, 21/22 and 35/36 branches. The four arms that stay uncovered are the rules' own defensive fallbacks, which no input reaches: SUP-001's `if (!target) continue;` (`LOCAL_IMPORT`'s capture group always captures at least one character), SUP-002's `?? "Command"` (`ctx.grep` returned the line it matched, so `DENO_SPAWN.exec` always matches), SUP-003's `?? token` (`token` is truthy and `split` always yields an element) and SUP-006's `?? ""` (`TSRS_PIN`'s capture group always captures at least one character). The 100 % target is still not met and was not met before.

**Clause 4 — corrected wording.** Row 9's clause 4 is unchanged in force and now reads with the second evidence layer named, because that is what this record adds. It reads:

> 4. **Effective runtime, config, declaration, permission and build inputs are protected, with negative fixtures — met.** The rule side is complete: every input kind has a declared scope, a rule that acts on it, a negative fixture, and the indirection is covered through the import map, the import chain, the lock, a shell interpreter behind another executable and a workflow step that reaches a Deno task. The G4 path-policy layer is closed too: `pr-policy.ts`'s `PROTECTED` list carries `**/deno.json`, `**/deno.jsonc`, `**/deno.lock` and `**/import_map.json`, so an effective Deno configuration input cannot change outside a spec-kind PR, and the pr-policy fixture proves that a ticket PR touching one is rejected while a spec-kind PR may change one. **The negative-fixture layer has two independent seams, and both now cover the four Deno rules:** the pinned-engine process fixtures in `.superman/ci/archgate-policy.test.ts`, which remain the proof that each rule reports a real violation through Archgate 0.61.0, and the supplemental exported-rule callback tests in `.superman/ci/rule-coverage.test.ts`, which make the rule code measurable — its scope filter, its matcher and its reporting path — as ADR 0014 prescribes. Neither replaces the other, and the supplemental layer proves no parser integration.

The binding-point wording is the settled one, **the merge-bound cutover, when the Deno root becomes the required evaluator**, for both carried coverage floors — the candidate measurement inventory's and the Deno operational surface's; the measured receipt already carries that wording on both obligations. Nothing in row 9's rules, in the supplemental fixtures or in this record depends on the superseded wording (`row 11, or the merge-bound cutover, whichever comes first`), and no file in row 9's slice was edited to accommodate the correction.

**Carried limits.** The 100 % target is unmet. The supplemental layer is not a parser-integration proof, and ADR 0014's sentence says so. The candidate inventory and the Deno operational surface keep their own floors and their own numbers; this record does not move them. The `node` inventory's floor is a whole-inventory floor — ADR 0014 records that per-file floors and an automatic ratchet were not selected — so the four rule files' per-file numbers above are evidence of what changed, not a threshold. The published measurement was made over an isolated snapshot because the repository root is under concurrent edit; the three in-repository runs were refused by the collector's own fingerprint guard, which is the correct behaviour.

This record changes no threshold, floor, pin, workflow, protected field or admission state, and it is not an acceptance.

### Step 10 — full raw quality contract

#### Step 10 slice record — 2026-11-04

**Outcome:** the row 10 slice is implemented in three bounded sub-slices and presented for André's acceptance. This record is not an acceptance: nothing here accepts a pin, a native profile, an evaluator activation, ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every gate. The later live raw forge checklist remains required and is not claimed by this slice.

**Scope.** Twelve files, all inside the row 10 file allowance: `.superman/ci/bootstrap.json`, `.superman/ci/raw-gates.ts`, `.superman/ci/direct-gates.ts`, `.superman/ci/quality.ts`, `.superman/ci/raw-gates.test.ts`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/bootstrap-coverage.test.ts`, `.superman/ci/quality-gates.test.ts`, `biome.json`, `knip.json`, `.jscpd.json`, `stryker.config.json`. No staging, commit, push, install, network fetch, workflow change, `package.json` change or ticket-status change. Every fixture this slice writes goes to a `mkdtempSync` root; `git status --porcelain` shows no path outside the twelve declared files plus the other actors' own working-tree work.

**What changed, in the three bounded sub-slices.**

- **Stage/result completeness and full-local Trivy.** The driver takes `--stage pre-commit|pre-pr|ci`, resolves the stage inventory from the protected `bootstrap.json`, refuses a full stage that omits a gate, and requires the full local pre-PR run and the CI run to declare one gate inventory. The receipt records `stage`, `feedback`, `satisfiesFullBar` and a `profile` hash of the pinned tool set and the stage/quality policy; `verdict === "pass"` is reachable only from a complete full-stage evaluation, so a partial or scoped result is `partial-feedback` and never satisfies the full bar. The gate failure taxonomy is `missing-tool`, `failed-command`, `incomplete-report`, `stale-report` and `skipped-required-work`; each fails the full result and is recorded per gate. A full local pre-PR run now runs the Trivy scan itself and publishes its findings (`findings.total`, `findings.bySeverity`); CI delegates the scan to the required linux-x64 leg as an explicit delegation, never a tool pass, and a missing local Trivy blocks instead of counting as success.
- **Static graph/model and advisory conformance.** `biome.json` sets `suspicious/noExplicitAny`, `suspicious/noTsIgnore` and `suspicious/noImportCycles` to `error`; G10 refuses to run if any of the three is not an error. The 15/50/4 advisories are declared at `info` with pinned counting semantics (`maxAllowedComplexity: 15`, `maxLines: 50` with `skipBlankLines: false` and `skipIifes: false`, `useMaxParams.max: 4`), and G10 refuses a promoted advisory or a changed threshold, so an advisory can be neither turned into a cap nor re-tuned. The findings are reported separately from the verdict and split into the product-runtime, bootstrap-rules, tests-fixtures and other cohorts. G3 now proves the Knip model: every declared entry resolves, and every source file is an entry, a project member or explicitly ignored; the receipt publishes the three counts. `knip.json`'s `ignore` names `.archgate/**`, `.scratch/superman-v0/**` and `vitest.config.ts` explicitly, so the candidate's scratch measurement tooling and the other non-product surfaces are ignored by the dependency model rather than silently outside it.
- **Full-corpus G5 and critical G6/cases.** G5 requires the reviewed `.jscpd.json` to declare the reviewed clone floors (50 tokens, more than 5 lines — now explicit rather than a tool default), to own no threshold and to carry no ignore list; the declared corpus is pinned to `src/**/*.ts` and to the declared mutation scope; a clipped percentage is rejected by name; the reviewed ratchet, not the tool, owns the percentage. A changed-only scan is disqualified by the corpus guard. The protected policy declares the owner-governed critical cases and their module mappings; G6 validates them before any baseline decision (a missing module or case blocks), binds the declaration into `qualityInputsHash`, and fails on an introduced critical survivor in a declared critical module even when the aggregate comparable scope improves.

**Clause-by-clause results.** All six clauses are met. 1. One policy, two hosts — the same driver, the same pins, one declared inventory for the local pre-PR run and the CI run; a partial pre-commit result is `partial-feedback` and never a pass. 2. Nothing missing counts as success — the five failure modes each fail the full result with their own fixture, and a missing local Trivy blocks. 3. Errors fail, advisories advise — explicit correctness errors are errors and fail; the 15/50/4 advisories are reported separately, stay nonblocking and cannot be promoted or re-tuned. 4. The Knip model is complete — entries resolve, every source file is an entry, a project member or explicitly ignored, with a fixture for each of the three outcomes. 5. The duplication corpus is protected — the declared corpus and the >5-line floor hold, `--changed-only` is disqualified, and no clipping, percentage re-basing or re-scoping occurs. 6. Critical mutation evidence is fresh and mapped — critical cases and module mappings are declared in protected policy, a missing critical case blocks, and an introduced critical survivor blocks despite an aggregate improvement. The per-clause fixture table, the RED→GREEN record with the real outputs, and the exact commands and exit statuses are in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 10 slice`.

**Carried limits.** The Trivy identity is version-bound, not archive-bound: the recorded archive digest (`11a9b6cd…`) can no longer be re-verified locally because the archive is gone. The full-repository Trivy scan takes 9 m 48 s on this machine, so the linux-x64 CI leg's headroom against the 30-minute job budget needs review by the workflow's owner; the scan policy is unchanged and only `--format json` and the bounded `--timeout 15m` were added. The product mutation scope is empty until ticket 01, so no critical module is inside the measured scope today; the declared critical cases cover the enforcement core, whose modules cannot be mutation-measured with the pinned Vitest runner because the bootstrap process suites are Node test suites — the survivor rule is implemented and fixture-proved against a product critical module and will bind as soon as product critical modules are declared. `knip.json` is shared with the concurrent row 8/9 actor: their entry `.superman/ci/node-hosted-candidate-measurement-host.ts` is untracked in this working tree, so the committed tree must carry it or the new entry-resolution check will block CI — correctly, because the model would then declare an entry that resolves to nothing. The `pre-commit` stage runs the whole repository's Knip and Biome rather than a staged subset. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.





#### Step 10 correction round — 2026-11-04

**Outcome:** the sixteen merged findings of the independent Spec and Standards review are fixed or recorded as a named blocker, every guard this slice adds is shown reachable and shown changing the outcome, and the clause verdicts are rewritten as the code behaves after the fixes. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every gate. The previous record's claim that all six clauses were met was wrong, and its clause-6 verdict ("met for the mechanism") was not a clause verdict at all; both are corrected below.

**Scope.** Seven files, all inside the row 10 file allowance — `.superman/ci/direct-gates.ts`, `.superman/ci/raw-gates.ts`, `.superman/ci/quality.ts`, `.superman/ci/bootstrap.json`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/quality-gates.test.ts`, `knip.json` — plus the two evidence records. `biome.json`, `.jscpd.json`, `stryker.config.json`, `package.json`, `.superman/ci/raw-gates.test.ts` and `.superman/ci/bootstrap-coverage.test.ts` are unchanged by this round. No staging, commit, push, install, acquisition, network fetch, workflow change, `package.json` change, lockfile change or ticket-status change. `.archgate/**`, `.github/**`, `.superman/ci/coverage*`, `.superman/ci/pr-policy*`, `.superman/ci/node-hosted-candidate-measurement-host.ts` and `.superman/deno-bootstrap/**` are byte-unchanged; row 11 and row 12 were working under the Deno root while this round ran.

**What changed.** The undeclared-stage fallback can no longer yield a full bar, and the condition that guards it belongs on the stage declaration rather than on an unrelated file's presence. The failure taxonomy covers every refusal this slice introduces, and the two members it lacked — `policy-refusal` and `critical-survivor` — name what the previous five could not. The one-policy/two-hosts comparison compares the two declarations as they are written and can therefore fail; the receipt's profile carries the driver identity, the tool pins and the policy, so the comparison is a proof rather than two hashes of one file. The complete-result accounting guard now checks what was never checked and is reachable. Knip's report is read whether the run passed or failed, so an unused file is the model's "not a member" outcome instead of a tool failure that hides it, and the Knip universe is the declared model's own scope with the Deno operational root explicitly ignored. The declared duplication corpus and mutation scope are the applied scope, the declared critical cases reach the survivor rule, a deleted critical module fails, and every declared critical case is executed fresh with its declared runner. The advisory counting semantics are pinned with the thresholds, and the two correctness rules that had no fixture have one each. The `knip.json` diff's deletion of the product entry `src/cli.ts` is recorded, and the `--format json --timeout 15m` additions to the Trivy command are disclosed in the scope table.

**Clause-by-clause results.**

1. **One policy, two hosts — MET.** No stage without a reviewed declaration can yield a full bar: the fallback is partial feedback, and the tree that carries the enforcement core refuses the undeclared stage outright with `skipped-required-work`. The full local pre-PR run and the CI run are compared as they are declared, and the comparison can fail: a CI stage that declares a different inventory is refused with `policy-refusal` and `The full local pre-PR run and the CI run must declare one gate inventory`, and the two receipts' profiles differ exactly in the policy component. A partial pre-commit result stays labelled partial feedback, `satisfiesFullBar` stays false and its verdict is never `pass`.
2. **Nothing missing counts as success — MET.** Every refusal this slice introduces carries a kind; the taxonomy has seven members and each is produced by at least one fixture. A missing local Trivy blocks with `missing-tool`, an ignored failure blocks with `failed-command`, an unreadable report with `incomplete-report`, a stale report with `stale-report`, and a declared full stage that omits a gate with `skipped-required-work` before any gate runs. The full local Trivy scan ran for real with the pinned binary 0.76.1 and the gate's own argv: **exit 0, one target scanned, zero HIGH/CRITICAL findings**, 10 m 51 s, a 198 095-byte JSON report — the repository is clean under the pinned scan policy, and the previous record's "aborts with `context deadline exceeded`" was the database download, not a scan.
3. **Errors fail; advisories advise — MET.** The three explicit correctness rules are errors, and each now has a fixture that reaches its own branch: an `any`, a `@ts-ignore` suppression and a two-file import cycle. The 15/50/4 advisories are reported separately by cohort, stay nonblocking, cannot be promoted into a cap, cannot be re-tuned, and cannot have their counting semantics changed — `skipBlankLines` and `skipIifies` are pinned with the thresholds and a change to either is refused by name.
4. **The Knip model is complete — MET.** The universe is the declared model's scope, so a surface the model never declared is outside its business rather than an unaccounted file; `.superman/deno-bootstrap/**` is an explicit ignore, because it is Deno source the Node-side Knip cannot analyse, and the reason is recorded. The three outcomes are genuinely distinguishable — an entry that resolves, a project member the model reaches, and an explicitly ignored file — each with a fixture, and an unused file surfaces as "not a member of the dependency model" rather than as a tool failure.
5. **The duplication corpus is protected — MET for the corpus, the floors and the clipping; the §5.4 pre-commit scope is a recorded divergence.** The declared corpus and the >5-line floor hold, the clipped percentage is rejected by name, the reviewed ratchet owns the percentage, and a changed-only scan is unrepresentable: the invocation names every file of the declared corpus explicitly and carries no `--changed…` argument, and a reduced coverage is refused by name whatever produced it. The §5.4 pre-commit cells are index-scoped while this driver binds the committed snapshot and refuses dirty inputs; that divergence is recorded in the evidence with the reasoning attached and goes to André.
6. **Critical mutation evidence is fresh and mapped — PARTIAL, and the unmet part is named.** Met: the declared scope is the applied scope, a declared critical module **outside `src/`** is measured and blocks on an introduced survivor, a critical module the candidate deleted fails, and a declared critical case is executed fresh with its declared runner rather than checked for existence. Not met: this repository's own declared critical modules are the enforcement core, and the pinned mutation toolchain cannot measure them — Stryker's runner is Vitest and the enforcement core's suites are Node `--test` suites — so the survivor rule is not proved against the repository's own declared modules and the repository's G6 cannot produce its first enforcement-core baseline. Under ADR 0018 that is a failed named clause, not a note: it goes to André as a blocker with the two candidate resolutions, a Vitest-visible critical case for the enforcement core or a Node `--test` mutation runner.

**Verification.** The four slice suites together: `node --test --test-concurrency=1 .superman/ci/raw-gates.test.ts .superman/ci/raw-routing.test.ts .superman/ci/quality-gates.test.ts .superman/ci/bootstrap-coverage.test.ts` — **224 tests, 224 pass, 0 fail, exit 0**, run with the pinned pnpm 12.16.1 first on `PATH` and `ARCHGATE_BIN` pointing at the pinned darwin-arm64 Archgate 0.61.0. `node_modules/.bin/biome check` on the changed files: 17 infos, 0 errors. `pnpm exec tsrs --noEmit`: clean. `node_modules/.bin/knip --no-progress`: 0 issues. `git diff --check`: clean. The real Trivy scan: exit 0, one target, zero HIGH/CRITICAL findings. The exact commands, exit statuses and the reachability table are in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 10 correction round`.

**Carried limits.** The Trivy identity is version-bound, not archive-bound, and the real run skipped the database update because this round permits no network fetch. The §5.4 pre-commit scope divergence is recorded above. The repository's approved base does not carry the reviewed policy, so a raw-gate run against this repository's own base is refused before any gate runs; the gates are exercised through the process-seam fixtures, which build their own approved base. The Deno sibling was not ported to this round's changes and was not touched: its quality refusals still carry no `kind`, and the parity comparison of the two hosts' receipts will show that difference until row 11 ports the taxonomy. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.

#### Step 10 §5.4 pre-commit alignment record — 2026-11-05

**Outcome:** the pre-commit stage now runs the staged forms the spec names, and the §5.4 pre-commit divergence the previous record carried is closed on the Node side except for the part that depends on a change model this repository does not have. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every gate.

**Scope.** Four files, all inside the row 10 file allowance — `.superman/ci/bootstrap.json`, `.superman/ci/direct-gates.ts`, `.superman/ci/raw-gates.ts`, `.superman/ci/raw-routing.test.ts`. `.superman/ci/pr-policy.ts` is **byte-unchanged by this round**: an earlier attempt resolved the branch inside the policy helper and was reverted, because the branch is the driver's to resolve and the policy helper must not depend on the working directory's Git state. No staging, commit, push, install, acquisition, network fetch, workflow change, `package.json` change, lockfile change or ticket-status change. Every fixture writes to a `mkdtempSync` root. `.superman/deno-bootstrap/**` is being aligned to this round in parallel under row 11's clause 2 and was not edited here.

**What changed.** The stage declaration carries a scope, so a stage's *input* is declared rather than inferred from its result: `"pre-commit"` declares `feedback: "partial"` and `scope: "staged"`, and the `pre-pr` and `ci` stages declare `feedback: "full"` and `scope: "full"`. A stage that declares no scope, or an invalid one, is refused; a stage that declares partial feedback over a whole-repository scope is refused by name. The gate context carries the scope, and two gates change form under it: G1 runs `archgate check --staged --strict` instead of the whole-repository pair of checks, and G10 runs `biome check --staged --no-errors-on-unmatched` instead of `biome ci`. The staged scope has its own preconditions and its own input identity: the run records the staged snapshot's identity and re-checks it afterwards, so the receipt binds the index rather than the commit. The full scope keeps the committed-tree binding it always had.

**Two real defects the measurement exposed, both fixed.**

1. **The branch never reached the policy.** `direct-gates.ts` runs the protected-path policy as a subprocess and injects `HEAD_REF` from the gate context. The context's branch was `process.env.HEAD_REF ?? ""`, which is empty for a local run, so the policy saw an empty branch and — because it fails closed — **every** gate in the pre-commit stage failed with `Unknown PR kind for branch ""`. The branch now flows from the resolved receipt, which falls back to the local branch when there is no pull-request reference. A local run therefore classifies the change it is checking instead of refusing itself.
2. **The staged scope refused the ordinary pre-commit case.** The first form of the staged precondition compared the working tree against the recorded commit. A pre-commit run's ordinary input is a staged modification of a tracked file, so that comparison is false for exactly the case the stage exists for, and the run refused with `G9: committed inputs do not match the recorded revision`. That comparison belongs to the full scope, where the evaluation binds the committed tree; in the staged scope the committed tree deliberately differs from disk. The staged scope's invariant is that the working tree equals the index, which is what `unstagedChanges()` checks.

**Reachability.** Every guard this round adds is reached by a named input and produces a named outcome.

| Guard | Input that reaches it | Outcome |
| --- | --- | --- |
| staged scope: an unstaged modification | a tracked file edited after staging | refusal `G9: unstaged changes present; stage them before the staged checks run`, exit 1 |
| staged scope: the staged snapshot is the input | a tracked file edited **and** staged | the run executes the staged forms, all five gates pass, the receipt records `inputScope: "staged"` and the index identity |
| full scope: the pull-request reference | `HEAD_REF=ticket/demo-99` on `ticket/demo-01` | refusal `G9: HEAD_REF does not match the local branch`, exit 1 |
| declaration: an invalid scope | the stage declaration without a `scope` | refusal `Raw stage pre-commit declares an invalid scope` |
| declaration: partial feedback over a whole-repository scope | `pre-commit` declared `scope: "full"` | refusal `… partial feedback must be staged` |

**The pre-commit p50.** Spec §5.2 sets `Target p50 under 10 s` and §13 sets p50 ≤10 s / p95 ≤30 s. Measured on an isolated snapshot of the same bytes — the root tree cannot be measured because staging it would commit another actor's uncommitted work — with a staged modification of a tracked file, the pinned pnpm 12.16.1 first on `PATH` and `ARCHGATE_BIN` pointing at the pinned darwin-arm64 Archgate 0.61.0:

```text
runs: 10   cold (first): 2.61 s   warm p50: 2.59 s   p95: 2.99 s   max: 2.99 s
ordered: 2.53 2.56 2.58 2.58 2.59 2.61 2.65 2.72 2.77 2.99
verdict: partial-feedback | inputScope: staged | feedback: partial
  G1 pass staged · G2 pass · G3 pass · G4 pass · G10 pass staged
```

The verdict is `partial-feedback` and `satisfiesFullBar` is false, which is the receipt's own statement that a staged run identifies partial staged feedback and never full quality admission.

**Clause verdicts, against the six closed clauses of this row.**

1. **One policy, two hosts — MET.** The pre-commit stage now differs from the full stages at the *declaration*, not only at the result: a partial stage is a staged scope, and the two scope declarations cannot be confused. A stage with no reviewed declaration still falls back to partial feedback and never to the full bar.
2. **Nothing missing counts as success — MET, unchanged by this round.** The staged scope adds two refusals of its own (an invalid scope; partial feedback over a whole-repository scope) and both carry their kind.
3. **Errors fail; advisories advise — MET, unchanged by this round.** G10's advisory reporting is identical in both forms; only the invocation changes.
4. **The Knip model is complete — MET, unchanged by this round.** Knip runs whole-repository in both scopes, which is what §5.2's pre-commit cell says (`knip`, unqualified).
5. **The duplication corpus is protected — MET for the corpus, the floors and the clipping. The §5.4 pre-commit scope divergence is now closed except for G2.** G1 and G10 run their staged forms. G2's "tests of the affected targets of the staged files (§5.7)" is **not** implemented: §5.7's change model and affected-target selection do not exist in this repository, so the run takes §5.4's G2 local-cell fallback ("complete verified projects or full fallback"). Today that fallback is also empty of product tests — there is no `src/` and no `test/` — so G2 reports `n/a (no product source/tests; bootstrap process suites run separately)`.
6. **Critical mutation evidence is fresh and mapped — unchanged: still PARTIAL, still the enforcement core's unmeasurable first baseline.** This round does not touch it.

**Discovered obligations, recorded as notes rather than blockers.** Under ADR 0018 an obligation that is not named in a row's closed criterion is a note for the next decision, not a blocker. Two are recorded here for the acceptance round.

- **G5's local cell.** §5.4's gate table gives G5 the local behaviour "changed files, partial feedback", but §5.2's `superman gate pre-commit` row does not name duplication, and the declared pre-commit stage does not declare G5. The row and the table therefore disagree about whether duplication belongs to the pre-commit stage. This goes to André as a scope question.
- **G9's local cell.** §5.4's gate table gives G9 the local behaviour "commits stay green", which is a hook invariant rather than a gate invocation; §5.2's pre-commit row does not name it, and the declared stage does not declare G9. On a `spec/` branch the replay is `n/a (spec-kind)` in any case. This goes to André as a scope question.

**Verification.** `node --test .superman/ci/raw-routing.test.ts` — **50 tests, 50 pass, 0 fail**, including the three reachability tests above. `node --test .superman/ci/pr-policy.test.ts` — **84 tests, 84 pass, 0 fail**, including the new `WORKFLOW.md` allowance test. `node_modules/.bin/biome check` on the changed files: 0 errors. `pnpm exec tsrs --noEmit`: clean. `git diff --check`: clean. *(Corrected on 2026-11-05: this paragraph originally reported the whole-suite figure **526 tests, 526 pass, 0 fail** and claimed `biome check` on the changed files was clean. Both were wrong at the time they were written. The Biome claim was never checked on the two files this round actually changed — `.superman/ci/direct-gates.ts` and `.superman/ci/raw-gates.ts` — and it carried **three error-severity diagnostics**: a formatter error on the 123-column `biome ${argv[3]} failed` line and an import-order error. The repository's own G10 (`biome ci`) would have been red. The errors are fixed and the check is now run on every file a slice changes, not on a convenient subset. The whole-suite figure is superseded by the later record.)*

**Carried limits.** The pre-commit p50 was measured on an isolated snapshot, not on the root tree, because the root tree holds another actor's uncommitted work that may not be staged. G2's affected-target selection waits for §5.7's change model. The G5 and G9 scope questions above are open for André. The Deno sibling receives this round's change in parallel under row 11's clause 2; until that alignment lands, the two hosts' staged-scope receipts differ. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.

#### Step 10 pre-commit G5 and G9 record — 2026-11-06

**Outcome:** the pre-commit stage now declares the two gates §5.4's local column gives a local behaviour, and both have a staged form that is implemented, wired and verified. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every gate.

**The decision this implements.** §5.2's `superman gate pre-commit` cell named six checks and neither duplication nor the behaviour replay, while §5.4's gate table gave G5 the local behaviour "changed files, partial feedback" and G9 the local behaviour "commits stay green", and marked G6 and G11 "off". André resolved the disagreement on 2026-11-05 in favour of the table: the pre-commit stage declares **G5 and G9** as well as G1, G2, G3, G4 and G10. §5.2's cell was amended to name both, and the amendment is recorded in §5.4 itself.

**Scope.** `.superman/ci/bootstrap.json`, `.superman/ci/raw-gates.ts`, `.superman/ci/quality.ts`, `.superman/ci/replay.ts`, `.superman/ci/quality-gates.test.ts`, `.superman/ci/raw-routing.test.ts`, `.superman/ci/coverage.json`, `stryker.config.json`, `vitest.config.ts`, `.superman/ci/critical/**` (new), and the spec. No staging, commit, push, install, acquisition, network fetch, workflow change, `package.json` change or ticket-status change. Every fixture writes to a `mkdtempSync` root.

**What changed.**

- **The staged G5** scans the changed files in the declared duplication corpus and compares them against a base scan of the same file names, so a clone that already existed is not blamed on the change. Its result carries `metrics.changedFilesPct` — deliberately not named `jscpdPct`, so the changed-files percentage cannot be read as the corpus percentage — and names the merge bar (the complete approved corpus and its total-percentage baseline) as a different check it does not replace. It keeps the reviewed-profile, pin and tool-version discipline, and it refuses a staged `.jscpd.json` that differs from the reviewed base profile, so the staged content cannot choose the measurement's own configuration.
- **The staged G9** runs the staged test files against the staged content and requires them to be green. Every result carries a `checked` string and a `notChecked` string saying that the red-on-base half of the G9 replay is not checked at the staged scope and that the pull-request G9 owns the red-to-green replay. The full-scope G9 — the replay, the `n/a` kinds and the refactor refusal — is unchanged.
- **The driver computes the staged file list once** and hands it to both staged gates, so two gates cannot disagree about what is staged. `qualityGate` takes the scope and the changed files; the full-scope call site is unchanged.
- **The index is materialised without touching the repository.** `ownedIndexSnapshot` writes the index's content into a temporary prefix with `git checkout-index --all --prefix=…`, which writes neither the index nor the object store; a test asserts the index file and `git status` are unchanged after a staged run.
- **The tool seam is shared, not copied.** The staged path first carried its own copies of `runTool`/`toolFailure`/`execute` because `direct-gates.ts` was fenced at the time; `direct-gates.ts` now publishes one `execute(ctx, argv)` and the staged path uses it.
- **The six declared critical cases are Vitest-visible** (§5.4's "Fresh critical acceptance" names the enforcement core's cases). They live in `.superman/ci/critical/`, `vitest.config.ts`'s `include` reaches them, and `bootstrap.json` declares them with `runner: "vitest"`. The pinned mutation runner now uses the `forks` pool, because three of the six critical modules resolve their repository through the working directory and Vitest's `threads` pool cannot change it — without that, their mutants would have been `NoCoverage` rather than measured.

**Two blockers the work exposed, both fixed.**

1. **The coverage collector would have failed.** `.superman/ci/coverage.json`'s `policy.tests` was `[".superman/ci/**/*.test.ts"]`, and the collector runs that list with `node --test`. The new glob matches the Vitest critical files, and `node --test` on a Vitest file fails. The list is now `[".superman/ci/*.test.ts"]`; measured with the repository's own `path.matchesGlob`, the new glob takes the six Node suites and leaves the Vitest files out, while the old one took them in.
2. **A successful tool run could be reported as a failed gate.** The owned-child group cleanup tolerated `ESRCH` but not `EPERM`, so a best-effort kill of an already-dead process group aborted a gate whose tool had succeeded. The child and its descendants run as this user, so `EPERM` means the group id now names a group this user does not own — the recycled-id case, where nothing of ours survives — and it is as unactionable as `ESRCH`. The Node original now tolerates both. This was the cause of the recurring `kill EPERM` failures in unrelated tests across both hosts' suites under load, and the earlier note that blamed the environment is corrected.

**Reachability.** Every guard the two staged forms add is reached by a named input and produces a named outcome.

| Guard | Input that reaches it | Outcome |
| --- | --- | --- |
| staged G5: an empty scanned set | a staged change with no corpus file | `n/a` with the reason naming the corpus and that nothing was scanned |
| staged G5: an introduced clone | two staged corpus files that duplicate | fail, naming the clone pair and that the approved base does not already have it |
| staged G5: a pre-existing clone | the same pair duplicated in the approved base | pass — the clone is not introduced |
| staged G5: the staged profile differs from the reviewed base profile | a staged `.jscpd.json` with raised floors | refusal |
| staged G9: a green staged test file | a staged test file that passes | pass, `scope: "staged"` |
| staged G9: a red staged test file | a staged test file that fails | fail, `kind: "failed-command"`, Vitest's own output |
| staged G9: no staged test file | a staged change with no test file | `n/a` with the reason naming the staged file count and the declared test globs |
| staged G9: a staged test file that is not a regular file | a staged symlink | refusal, `kind: "policy-refusal"` |
| the staged G5's index snapshot | any staged run | the index file and `git status` are unchanged afterwards |

**Clause verdicts, against the six closed clauses of this row.**

1. **One policy, two hosts — MET.** The pre-commit stage is now declared by the same policy file as the full stages, and its gate set is the one §5.4's local column implies. A partial stage is still a staged scope and still never satisfies the full bar.
2. **Nothing missing counts as success — MET.** The staged forms add refusals of their own, each with its kind: an invalid scope, partial feedback over a whole-repository scope, a non-regular staged test file, a staged profile that differs from the reviewed one, and every pin and tool-version disagreement.
3. **Errors fail; advisories advise — MET, unchanged.** G10's advisory reporting is identical in both forms.
4. **The Knip model is complete — MET, unchanged.** Knip runs whole-repository in both scopes, which is what §5.2's pre-commit cell says.
5. **The duplication corpus is protected — MET for the corpus, the floors and the clipping; the pre-commit scope is now the changed-files form the spec names.** The staged scan names its files explicitly and never carries a `--changed` argument, so the merge bar's `--changed-only` disqualification is not reachable from it.
6. **Critical mutation evidence is fresh and mapped — the mechanism is now in place; the enforcement core's first baseline is still not due.** The six declared critical cases are Vitest-visible and are selected by the mutation runner's own selection for every declared critical module; the cases execute fresh outside any affected selection, and a failing one blocks. What is still not produced is the enforcement core's **first** mutation baseline and its raw survivor list, which the row's carried limits already place outside this preparation ("the enforcement-core first measurements and raw survivors are a review input, not a floor; product-source baselines wait for ticket 01").

**The pre-commit p50 with the seven-gate stage.** Spec §5.2 sets `Target p50 under 10 s` and §13 sets p50 ≤10 s / p95 ≤30 s. Measured on an isolated snapshot of the same bytes, with a staged modification of a tracked file, the pinned pnpm 12.16.1 first on `PATH` and `ARCHGATE_BIN` at the pinned darwin-arm64 Archgate 0.61.0:

```text
runs: 10   cold (first): 2.24 s   warm p50: 2.33 s   p95: 2.72 s   max: 2.72 s
ordered: 2.24 2.25 2.32 2.33 2.33 2.37 2.39 2.54 2.55 2.72
verdict: partial-feedback | inputScope: staged | feedback: partial | satisfiesFullBar: false
  G1 pass staged · G2 pass · G3 pass · G4 pass · G5 n/a staged · G9 n/a staged · G10 pass staged
```

**This is a floor, not the steady state.** G5 and G9 report `n/a` here because no changed file is in the declared duplication corpus and no staged file is a test file — the repository has no `src/` yet, and that is ticket 01's. The two new gates cost nothing in this state; a staged G5 that scans a corpus and a staged G9 that runs Vitest over the staged test files will both cost real time. The p50 target is therefore met with margin **on this repository's actual content**, and the number that will matter is the one measured on a tree with product source, which this preparation cannot produce.

**Verification.** With the pinned pnpm 12.16.1 first on `PATH` and `ARCHGATE_BIN` at the pinned darwin-arm64 Archgate 0.61.0:

| Command | Result |
| --- | --- |
| `node --test .superman/ci/raw-gates.test.ts .superman/ci/raw-routing.test.ts .superman/ci/quality-gates.test.ts .superman/ci/bootstrap-coverage.test.ts` | **260 tests, 260 pass, 0 fail** |
| `node --test .superman/ci/pr-policy.test.ts .superman/ci/coverage.test.ts` | **147 tests, 147 pass, 0 fail** |
| `node --test .superman/ci/archgate-policy.test.ts .superman/ci/rule-coverage.test.ts .superman/ci/archgate-linux-arm64-wizard.test.ts` | **153 tests, 153 pass, 0 fail** |
| `pnpm exec vitest run --config vitest.config.ts --no-cache .superman/ci/critical` | **6 files, 28 tests, 28 pass** |
| `node_modules/.bin/knip --no-progress` | 0 issues |
| `pnpm exec tsrs --noEmit` | clean |
| `node_modules/.bin/biome check` on the changed files | 0 errors |
| `<pinned Archgate> check --strict --output json` | `"pass": true, "total": 16, "failed": 0` |

The whole Node suite is **560 tests, 560 pass, 0 fail**. The Deno sibling's own suites are reported in row 11's records.

**Carried limits.** The staged G9 is green-only by the spec's own local cell; the red-on-base half is the pull-request G9's. The staged G5's `notChecked` names the merge bar as a different check. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.

#### Scope amendment — the root workflow map — 2026-11-06

**What was added, and under whose authority.** André asked for a document that records the workflow of each of the superman commands, and asked which file should hold it under Matt Pocock's skills. The answer given was a root `WORKFLOW.md` beside `README.md` and `GLOSSARY.md`, and the document was written. Four files therefore fall outside rows 8–12's declared file allowances, and the rows' own rule — "Any other file needs a scope amendment" — requires the amendment to be recorded here rather than left implicit:

| File | Why |
| --- | --- |
| `WORKFLOW.md` (new) | The operational map André asked for: which command answers which question, in what order, and what each result does and does not prove. |
| `README.md` (one link) | The map's discoverability. The README already lists the spec, the tickets, the decisions and the glossary; the workflows belong with them. |
| `.superman/ci/pr-policy.ts` (one entry in `SPEC_EXTRA`) | A root file that only a spec-kind PR may change has to be named in the spec-kind allowance, or the gate refuses the document that introduces it. `WORKFLOW.md` joins `GLOSSARY.md`, `CONTEXT.md` and `README.md` there. |
| `.superman/ci/pr-policy.test.ts` (one case) | The reachability proof for that allowance: a spec-kind PR may change the document, and a ticket PR may change it only as documentation. |

**What the amendment does not do.** It grants no new gate, no new receipt, no new tool and no admission. The document describes the **specified** CLI — which is not implemented — and points at the repository for everything that is. It changed no protected policy input's *content* beyond one entry in a path allow-list, and it changed no threshold, floor, pin or workflow.

**A correction the independent Spec-axis review forced.** The first draft of the document said the coverage collector measures "three disjoint inventories — `node`, `product`, `candidate`". There are **four**: the `deno` inventory was added by row 8's follow-up and is reported from the Deno collector's own receipt. The document now says four and says which one is not measured by the Node host. A document that restates a number is only worth having if the number is right.

#### Step 10 independent Spec-axis review — findings and resolutions — 2026-11-06

**Outcome:** an independent Spec-axis reviewer, given the working-tree delta and the closed criteria, reported **five** findings. Four are resolved; one is a decision that is André's. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**How the review was run.** The reviewer worked from the working-tree delta against the last commit plus the untracked additions, because the committed diff is empty. It was given the spec's governing sections and the rows' closed criteria, and was told to verify a finding rather than infer it from the diff's shape. It did: the G6 defect below was reproduced in a `/tmp` copy of the tree with a second critical module declared, and it confirmed the repository was unmodified afterwards.

**The five findings and what happened to each.**

1. **§5.4's "Fresh critical acceptance" names five areas the initial critical cases must cover; two had no declared case.** The six declared cases cover policy selection/result completeness, H/B/M and artifact identity, stage routing, coverage inventory, duplication/mutation evidence, and the protected-path policy. Nothing asserted an **approval/credential boundary**, and nothing asserted **path/process safety and failure propagation** — no `credential`, `approver`, `cleanup`, `descendant` or `EPERM` appears in the declared critical cases. *Resolution:* two new declared critical cases are being added, each promoting behaviour the enforcement core already implements and already proves in its Node suites, so the gap is closed by making existing behaviour *failing* rather than by inventing a requirement. The declaration lands in `bootstrap.json` when the cases land.
2. **Row 11's clause 6 is not met.** The mutation scope reaches `.superman/ci/**` and not `.superman/deno-bootstrap/**`; the duplication corpus is the product's `src/**`. The temporary duplication between the two hosts is therefore visible to the coverage measurement and to neither of the other two. *Resolution:* already recorded as the **2026-11-06 clause-6 measurement finding**, with three resolutions on the table for André. This review confirms the finding independently and confirms the earlier "met" verdict was untrue.
3. **The root workflow map is scope creep, and it was wrong.** `WORKFLOW.md`, its README link, the `SPEC_EXTRA` entry in `pr-policy.ts` and the new `pr-policy.test.ts` case fall outside rows 8–12's file allowances, and the rows' own rule requires a recorded scope amendment; none was recorded. The document also said the collector measures "three disjoint inventories" when there are **four**. *Resolution:* both halves fixed — the document now names four inventories and says which one is not measured by the Node host, and the **scope amendment is recorded** (the authority is André's request for the document).
4. **G6's critical-survivor measurement could never succeed with the repository's own declared critical modules.** The report guard compared Stryker's *sorted* file keys against the list *as passed*, and the five declared critical modules are declared in a different order. So the comparison was always false and G6 refused with `incomplete-report` before the survivor rule could decide — and the shipped test passed only because its fixture declared a single module. *Resolution:* the guard compares sorted to sorted. The Deno sibling carried the same defect and was corrected with it.
5. **The survivor rule compared counts, not mutants.** §5.4 requires that "unresolved introduced undetected mutants (Survived or NoCoverage) block". A count comparison lets a new survivor hide behind one the base had and the candidate killed: the numbers match, so nothing blocks and an introduced critical survivor goes unreported. *Resolution:* the comparison is now on a **content-derived identity** — the mutator, the source text the mutant replaced, and the replacement. The identity survives an unrelated edit above the mutant (the text is the same even when the line moves) and a mutant whose own source changed is a different mutant, which is exactly what "introduced" has to mean. The reviewer's counterexample is now a unit test. The Deno sibling was corrected with it.

**What the review did not raise.** It did not report a missing requirement that the record already carries as a limit or an operator lane, which is the rule the review was given. It raised one scope question and two genuine code defects, and it was right about the "met" verdict it contradicted.

#### Step 10 independent Standards-axis review — findings and dispositions — 2026-11-06

**Outcome:** an independent Standards-axis reviewer reported **four** documented-standard violations and **three** baseline smells. Two are resolved, one is resolved, one is a decision that is André's, and one baseline smell is declined with the evidence that contradicts its premise. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**The review was run in parallel with the Spec-axis review**, on the same working-tree delta, against the same standards sources — `docs/adr/**`, `.archgate/adrs/**`, `GLOSSARY.md`, the spec's governing sections and the rows' closed criteria — plus Fowler's smell baseline, which the brief reproduced in full. It was told to skip anything tooling already enforces and to keep documented-standard breaches distinct from judgement calls.

**The four documented-standard violations.**

1. **Row 11's clause 6 — the temporary duplication is hidden from the duplication and mutation measurement.** The same finding the Spec axis raised, and the reviewer **measured** it rather than inferring it: over both roots the declared corpus reports **252 clones / 5,288 duplicated lines / 20.42 %** — `.superman/ci` alone 7.34 %, the Deno root alone 2.93 % — and `quality.ts` against its Deno twin alone is **26 clones / 1,300 lines / 46.81 %**. *Disposition:* already recorded as the 2026-11-06 clause-6 measurement finding, now with the numbers attached, and it goes to André with three resolutions.
2. **ADR 0008/0016's checker contract is unmet by the change's own CI.** The Deno root is in no type-check project: `tsconfig.json` includes `.superman/ci/**` and `.scratch/superman-v0/**` but not `.superman/deno-bootstrap/**`, and `ci.template.yml` runs three `deno run` steps and **no `deno check`**. Spec §5.4's G2 cell requires "exact-pinned `tsrs --noEmit` plus supplemental complete-graph `deno check` for Deno code (§5.10, ADR 0008)". The Node evaluator's G2 runs `tsrs --noEmit` alone. *Disposition:* a real, named §5.4 gap. The natural reading is that each host's G2 runs its own typecheck — the Node gate's `tsrs --noEmit` over the Node graph, the Deno sibling's `deno check` over the Deno graph — and the sibling is where it belongs, since the Deno runtime is the operational one (ADR 0016). It is recorded and goes to the acceptance round with the clause-6 decision; it is not implemented here because it needs a Deno pin in the reviewed policy and a change to the row 12 workflow template.
3. **`duplication-corpus.md` pinned digests this change invalidates.** It recorded `quality.ts` at sha256 `8481e88c…` and `.jscpd.json` at `ff400eab…`; both files have changed since, and the document's own rule says "A tool, profile or policy change invalidates the old baseline". *Resolution:* both digests refreshed to the current bytes, with the refresh and its reason recorded in the document.
4. **The new critical case was not fixture-proved.** `policy-preflight-and-tool-routing.critical.test.ts` calls `directGate("G5", …)` directly, so `direct-gates.ts`'s `config(ctx)` runs `pnpm --version` against the **ambient** PATH; the case passes only when the pinned pnpm happens to be first on it, and fails with `pnpm pin expected 12.16.1, actual 9.15.9` otherwise. ADR 0017 requires the critical evidence to be fixture-proved. *Disposition:* the case is being rewritten so it does not depend on the caller's environment, and the proof required is that it passes both with the pinned pnpm first on `PATH` and with an ambient `PATH` that does not have it.

**The three baseline smells.**

- **Duplicated Code — `fixtureContext()` is byte-identical in all the critical case files.** *Resolution:* extracted once into a shared helper under `.superman/ci/critical/` and imported, rather than repeated per file.
- **Mysterious Name — "HBM" appears nowhere else.** *Declined, with the evidence that contradicts the premise.* "H/B/M" is the **spec's own term**: nine occurrences in `spec.md` — "H/B/M admission", "H/B/M freshness", "H/B/M from the forge" — ten in this record, and one in ADR 0016. The glossary's `Receipt` entry already distinguishes "the PR head, tested base and tested merge result". What the finding got right is narrower: the **glossary** carried the three revisions only inside the `Receipt` entry, so the identifier used a compression the vocabulary did not carry as a term of its own. *Resolution:* `H/B/M` is now a glossary entry of its own, naming the three revisions and pointing at `Receipt`.
- **Speculative Generality — SUP-001/002/006 newly scan `**/deno.json|deno.jsonc|import_map.json|deno.lock`, and none of them exists in the tree.** *Declined.* Those rules are not speculative: row 9's clause 4 requires the Deno sibling to expose the same declared inventory of protected inputs as the Node original, and the clause was closed by adding exactly these Deno configuration inputs to `pr-policy.ts`'s protected list, with a fixture. A protected-path rule is a rule about a path that must be protected **when it exists**; the repository has no `deno.json` because the Deno configuration has not been authored yet, not because the inputs are not effective ones. §5.4 records the Deno configuration and resolution inputs as effective inputs precisely because they carry the import map, the lock and the type inputs the Deno runtime graph resolves.

**The reviewer's own caveat, carried forward.** `archgate check` reports `ruleErrors: 1` (SUP-005's `ctx.ast is not a function`) when it runs the *installed* 0.43.0 npm shim rather than the pinned 0.61.0. That is environmental and pre-existing: against the pinned darwin-arm64 Archgate 0.61.0 the repository reports `"pass": true, "total": 16, "passed": 16, "failed": 0`.

#### Step 11 clause-6 resolution and the Deno check decision — 2026-11-06

**Outcome:** André resolved the two decisions the two independent reviews raised. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**Decision 1 — row 11's clause 6: record the exclusion as explicit policy.** The temporary duplication between the Node enforcement core and its Deno sibling stays outside the duplication and the mutation measurement, and the exclusion is now a **stated scope** rather than an implicit scope list. It is stated in the place that governs it — spec §5.4's new "The duplication corpus and the mutation scope" paragraph, dated 2026-11-06 — with the reasoning: the duplication corpus is the product's code, the Deno surface is a declared and separately measured inventory that answers to the same enforced rules, and the Node-hosted Stryker cannot measure Deno code at all, so the scope cannot be symmetric until the Deno host can mutation-measure its own graph. The measured figures stay on the record: 252 clones / 5,288 duplicated lines / 20.42 % over both roots, and 26 clones / 1,300 lines / 46.81 % for `quality.ts` against its Deno twin alone.

**Decision 2 — §5.4's supplemental complete-graph `deno check`: the Deno sibling's G2 runs it.** Each host typechecks its own graph. The Node evaluator's G2 keeps `tsrs --noEmit` over the Node graph; the **Deno sibling's G2 runs `deno check` over the Deno operational graph**, natively, with the runtime it already drives, binding the pinned runtime's identity and failing closed when the tool is missing or its version disagrees. The candidate CI legs then check the Deno graph through the sibling's own G2, so no separate workflow step is needed. The Node required result does not check the Deno root — the sibling does, and the sibling is the Deno root's own evaluator.

**Three further findings from the two new critical cases**, recorded because they are real and because the cases that found them are now declared:

1. **The credential filter is family-based, not allowlist-based.** `fixtureEnvironment()` strips `GIT_*`, `GITHUB_*`, `GH_*`, `SUPERMAN_APP_*` and the four identity variables by *name*. `direct-gates.ts`'s `runTool` passes `{...ctx.env}` to its child, so **any other caller variable — an arbitrarily named bot or model credential — reaches the direct gates' tools**. Only `quality.ts`'s `hermeticEnvironment` and `replay.ts`'s `runnerEnv` build a real allowlist (PATH, HOME, TMPDIR, CI and the pnpm/Git-config settings). §8.3 names credential *kinds*, not variable names, so the implemented filter cannot recognise an unrecognised name. The declared case pins the named families, and the limit is stated rather than papered over.
2. **The direct gates keep the caller's HOME.** The quality and replay tools get a scratch HOME; the driver's own environment keeps the caller's, so G1, G2, G3, G10 and G11 run with the caller's home directory. §8.3's "avoid exposing host homes" holds for the quality and replay tool environment only.
3. **One branch of `safeReceipt` is uncovered** — the symlink-alias refusal. The existing H/B/M case pins the tracked-input and Git-metadata refusals; the alias branch belongs on that same case, because `safeReceipt` is private to `raw-gates.ts` and the case's declared module is the same one.

**A note on how the credential defect was found.** The Node original's `fixtureEnvironment()` was briefly narrowed to strip only `GIT_*`, which let a gate's tool process inherit the caller's `GITHUB_TOKEN`, `GH_TOKEN` and `SUPERMAN_APP_KEY_PATH` — and left the Node original weaker than the Deno sibling, which still carried the full filter. The narrowing was a deliberate, temporary mutation made to prove the new credential case can fail; it is restored byte-for-byte, and the Node original and the Deno sibling now carry the same filter again. The case is mutation-checked: the narrowing makes it fail, and reverting makes it pass.

**A coverage consequence.** The shared `fixtureContext()` helper the eight critical cases now import is test-only support code, and §5.4 excludes test-only fixtures from the inventory. It is excluded by name, beside the fixture it joins — the reviewed exclusion list is a protected policy input, and this is a Gate 1 change.

### Step 11 — incremental parallel operational port

#### Step 11 slice record — 2026-11-04

**Outcome:** the row 11 slice is implemented in four bounded sub-slices (11a, 11b, 11c, 11d) and presented for André's acceptance. This record is not an acceptance: nothing here accepts a Deno pin, a native profile, an evaluator activation, a workflow publication, ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every required gate; the Deno root is a parallel, non-admitting successor and admits nothing. Each sub-slice is presented for acceptance; none is accepted here.

**Scope.** Thirteen new files, all inside the row 11 file allowance, all under the new stable sibling root `.superman/deno-bootstrap/`: `exec.ts` (the exec seam, placed at the exact path André confirmed on 2026-11-04), `fixture-env.ts`, `pr-policy.ts` (11a); `raw-gates.ts`, `direct-gates.ts`, `replay.ts`, `quality.ts` (11b); `coverage.ts` (11c); `provision-tools.ts`, `archgate-arm64-build.ts`, `archgate-linux-arm64-wizard.ts` (11d); and the two Node-hosted public process suites `tests/launch.test.ts` and `tests/bootstrap.test.ts`. No other file was created, edited or deleted by this slice. `.superman/ci/**` was read-only except for the evidence append; `.archgate/**`, `knip.json`, `biome.json`, `.jscpd.json`, `stryker.config.json`, `package.json`, the lockfiles, the workflows and the skill pin are byte-unchanged. No staging, commit, push, install, network fetch, hosted write, ticket-status change or readiness change. No product `src/` work.

**Observed results.** The pinned Deno 2.9.8 (`d1e99265…6980ba`) is the runtime of the new root; the pinned darwin-arm64 Archgate 0.61.0 (`be740ac0…c3c0b5e`) is green over the repository (`"pass": true, "total": 16`). The nineteen process tests pass. The exec seam is the only spawn boundary in the Deno root, reproduces the Node originals' observable failure shapes, replaces the child environment rather than merging it, bounds the output per stream, cancels a timed-out child and takes its descendants with it, and runs concurrent fixtures independently — each of those compared against the Node original's *observed* output rather than a literal. The gates, the replay and the quality module produce the Node original's receipts: for the same fixture inputs and the same environment the two hosts' receipts agree on the results, the scope, the feedback, the verdict, the input integrity, the tool identities and the replay evidence, including the replay's distinction between a completed behavior assertion and a compiler-confirmed missing product symbol, and the quality module's equivalent-scope and critical-case refusals. The Deno collector proves the four-metric complete-inventory mechanism: it refuses a declared member that is absent and a source file in the root that the manifest does not declare, both by name, collects the native V8 evidence, hands the type strip and the locked AST conversion to the bounded Node conversion host, writes a receipt whose shape is compared against the Node host's own receipt, and carries all four metrics visibly — lines 550/1675, statements 609/1854, branches 437/1851, functions 95/231 on the real run, with the shortfall carried as an obligation. *(The figures are corrected on 2026-11-04 in the row 11 correction round; they replace the numbers of the receipt the collector wrote at 08:17:57, which the current collector did not produce.)* The helper modules carry the CI workflow's provisioning step and the self-build workflow's build plan over with the declared external runtime identities unchanged, and are exercised with fake authority and fake tool fixtures: a checksum mismatch, a missing asset and a wrong pinned commit are each refused, a version that differs from the declared one is reported rather than refused, nothing is installed, no build runs and nothing is published. The manual helper keeps its seven stages, its prompts, its saved values, its guards and its exit codes.

**The parity claim has a failing case behind it.** The independent Spec review found that the harness compared the Node receipt with itself: the Deno receipt was captured and never read, so diverging it left the assertions passing. The guard was written against the unfixed comparison first, so its RED is a real failure of the pre-fix logic — `AssertionError: Missing expected exception: the parity assertion accepted a diverged Deno receipt` — and it passes after the one-line fix that reads the sibling's own receipt. The fixed harness then found a real divergence on its first full run that the broken harness had hidden: the two hosts had been given different environments, so the tool-failure reasons differed; both hosts now receive the same environment. The full RED→GREEN sequence, the nine findings and their resolutions, and every command with its exit status are in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 11 slice`.

**Clause-by-clause results.**

1. **Four separately reviewed sub-slices — PARTIAL as to acceptance; met as to implementation, review and recording.** 11a, 11b, 11c and 11d were implemented in that order, each within its declared file list, each with its own fixtures and its own recorded result. Each sub-slice is presented for André's acceptance and **none is accepted here**, because the acceptance is not this slice's to give.
2. **Contracts are preserved, not re-implemented — met, by parity fixture.** For the same fixture inputs the Deno sibling produces the same public outputs, receipt shapes, failure codes and cleanup behavior as the Node original, and the proof is a comparison fixture per contract rather than a second implementation of the same logic. The seam's expectations are the Node original's observed output; the two hosts' coverage receipts are compared for shape; and the harness itself is proved able to fail.
3. **No candidate module delegates operational work to the Node graph — met.** No module under `.superman/deno-bootstrap/` imports or spawns the Node implementation; the Deno modules read the same declared policy inputs, which are declarative and not the implementation, and the only Node use inside the root is the bounded measured conversion and tool host that 11c approves — one fixed-argument Node process for the type strip and the AST conversion, the Node test runner that hosts this root's own process suites, and one identity probe for the toolchain's Node runtime. The two Node-hosted suites are harness code: the modules under test never see them, and the harness reaches the Node graph's own owned-child idiom rather than importing `node:child_process`, because SUP-002 rejects that module in the Deno graph.
4. **Inventories are complete — met.** The Deno sibling exposes the same declared inventory of protected inputs, gate names and report shapes as the Node original, and fixtures prove that a missing declared member, an extra undeclared member and a differing receipt shape are each rejected.
5. **Boundary behavior matches — met, each with a fixture.** Protected-input decisions, explicit environments and executable resolution, output bounds, cancellation and descendant cleanup, and concurrent fixtures each have a fixture that compares the Deno sibling against the Node original's observed behavior.
6. **Duplication stays visible — met.** No exclusion, ignore, corpus narrowing or suppression was added to hide the port's duplication. The temporary duplication stays visible as a declared, measured inventory: row 8's follow-up has since declared the Deno scope in `.superman/ci/coverage.json` with exactly this slice's eleven source files, and the Node collector now refuses an unmodeled source file, an incomplete manifest and a receipt that does not bind every declared member.

**Row 8's candidate-inventory floor binds at the merge-bound cutover, and is not closed.** Row 8's amended clause 6 made the candidate inventory's floor "a carried obligation that binds when the candidate materialises as the operational surface — row 11, or the merge-bound cutover, whichever comes first". **That wording named row 11 as the earlier of the two points; André's decision of 2026-11-04 settled the binding point — both carried coverage floors, the candidate measurement inventory's and the Deno operational surface's, bind at the merge-bound cutover — so the candidate floor is not due at this row.** What binds: the candidate inventory (`.scratch/superman-v0`, its four declared members) must reach ≥90% in lines, statements, branches and functions, with the 100% target unchanged. The numbers on record are row 8's — 94.78% lines (654/690), 88.75% statements (742/836), 94.87% functions (111/117) and 78.57% branches (495/630) — and statements and branches are below the floor. Row 11 does not change the candidate inventory at all: its thirteen files are under `.superman/deno-bootstrap/`. No fresh candidate measurement is producible in this environment, so the numbers stand unchanged and the obligation is carried forward **open and not yet due: it binds at the merge-bound cutover**, where it is a failed named clause of row 8's amendment and not a note, and it is André's decision whether to close it with further Node-hosted measurement of the candidate's error paths or to change the criterion. The Deno root's *own* inventory is the same matter and binds at the same point: it is a parallel, non-admitting successor, so its floor is carried to the merge-bound cutover, when the Deno root becomes the required evaluator.

**Carried limits.** The Deno inventory's floor is a carried obligation, not a pass. The brief's premise that `stripTypeScriptTypes` has no Deno equivalent does not hold for the pinned Deno 2.9.8, which exports it from `node:module`; the conversion nevertheless stays on the Node side as the brief decided, and the finding is recorded for the next decision. The Node runtime identity is probed once per process rather than inherited, because the Deno runtime's own Node-compatibility version is not the version that executes the replay's Node tools; that probe is a scope question and goes to André with this reasoning attached. The Deno root's coverage is measured from the Deno children of Node-hosted suites, so a Deno-native suite would measure more of it. 11d's first two files have no Node original — the behaviour they carry lives inline in the two workflows — so their parity is against the workflow steps. The wizard's interactive path is ported to Deno's raw mode and byte reader rather than Node's own readline input; its prompts, saved values, guards and exit codes are unchanged, and the captured child's stdin is restored to the Node original's `inherit`. `.superman/ci/raw-fixture.ts` was not parameterized — its `runGate` is hard-wired to the Node entrypoint, so the Deno parity runner lives in the suite. `pnpm` on this machine is 9.15.9 against the 12.16.1 pin; the fixtures use the pinned build through their own shim, and a gate run outside a fixture reports `pnpm pin expected 12.16.1, actual 9.15.9`. `.serena/` is another actor's untracked directory and was moved aside only for the local gate runs. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no workflow publication, no ticket 01 admission.

#### Step 11 correction round record — 2026-11-04

**Outcome:** the nine hard findings from the row 11 Standards review are fixed and the tenth is stated as a contract. The Deno collector no longer claims a pass it did not achieve, the Deno inventory's scope lives in one declaration, the bound receipt names the collector that wrote it and the Node gate refuses a receipt it cannot attribute, the build plan honours a step's working directory and carries the workflow's platform assertion and archive extraction, the permission profiles come from one builder, the wizard writes the Node original's escape sequence, the seam's dead export is gone, and the executable-resolution and timeout contracts are written down. This record is not an acceptance: nothing here accepts a Deno pin, a native profile, an evaluator activation, a workflow publication, ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every required gate; the Deno root is a parallel, non-admitting successor and admits nothing.

**Scope.** `.superman/deno-bootstrap/coverage.ts`, `.superman/deno-bootstrap/exec.ts`, `.superman/deno-bootstrap/archgate-arm64-build.ts`, `.superman/deno-bootstrap/archgate-linux-arm64-wizard.ts`, `.superman/deno-bootstrap/tests/bootstrap.test.ts`, `.superman/deno-bootstrap/tests/launch.test.ts`, `.superman/ci/coverage.ts`, `.superman/ci/coverage.test.ts`, and this record and the evidence append in `.superman/ci/bootstrap-evidence.md`. `.superman/ci/coverage.json` is unchanged. No staging, commit, push, install or network fetch; every fixture writes to a `mkdtempSync` root.

**Clause-by-clause results against row 11's six clauses.**

1. **Four separately reviewed sub-slices — met as to implementation, review and recording; PARTIAL as to acceptance, unchanged by this round.** 11a, 11b, 11c and 11d were implemented in that order and each is presented for André's acceptance; none is accepted here. This round corrects the defects the review of 11a–11d found; it neither accepts nor rejects them.
2. **Contracts are preserved, not re-implemented — met.** The correction round changes no contract's behaviour: the seam's failure shapes, the gates' receipts, the collector's four metrics and the build plan's assertions are the same contracts. What changed is what the code *says* about itself: the collector's verdict and message, the receipt's attribution, the plan's missing steps, the permission profiles' single source and the two contract statements. The build plan's checksum steps are the one place where the *commands* differ from the workflow's, and the difference is recorded below and in the module header.
3. **No candidate module delegates operational work to the Node graph — met.** No module under `.superman/deno-bootstrap/` imports or spawns the Node implementation. The build plan's archive extraction is the workflow's own inline Node script, carried as a plan step that the injected runner executes; it is not a call into the Node graph, and the Node binary it names is the one the workflow itself downloads.
4. **Inventories are complete — met, and now from one declaration.** The Deno inventory's scope is the reviewed policy's `deno` declaration, which the collector and the Node gate both read and both resolve the same way; the collector refuses a declared member that is absent and a source file in the root that the declaration does not name, and the gate refuses the same drift with the differing members named.
5. **Boundary behavior matches — met, each with a fixture.** The correction round adds the fixtures for the boundary the review found inert (a step's working directory), the boundary the review found unreported (the executable's resolution against the child's directory) and the receipt's attribution. Every expectation is the observed result at the real seam, and every new guard was shown to bite by mutating the production code it guards.
6. **Duplication stays visible — met.** No exclusion, ignore, corpus narrowing or suppression was added. The duplication that this round removes is a *declaration* duplication, not a measurement one: the Deno scope was declared in the collector and in the policy, and it is now declared once; the temporary duplication between the Node originals and the Deno siblings stays visible as the declared, measured inventory it was.

**The nine hard findings, resolved.** The Deno collector's verdict is computed from its own measurement and the run no longer prints a pass it did not achieve; the scope lives in one declaration and both hosts refuse the drift by name; the receipt records the collector that wrote it and the gate binds only an attributable receipt, refusing one it cannot attribute; the build plan's runner receives the step's working directory; the plan carries the platform assertion, the archive extraction and the release directory the workflow has; the permission profiles come from `denoPermissions(profile)` in the exec seam, with each variant's purpose written down; the wizard writes `"\u001b[2J\u001b[3J\u001b[H"`; `execFile` is deleted; the executable's resolution against the child's directory is stated and pinned by a fixture. The tenth finding — that the timeout path kills only the direct child — is parity with the Node original, so it was not changed: the contract is now stated in the module header and in both functions, and the records say which function guarantees the descendant cleanup and which does not.

**The fresh measurement, and the figures it replaces.** The receipt is `.superman-ci/coverage-deno-OBhcBa/coverage-receipt.json` (sha256 `0e954c5a6ad505b944cc95324d551cee09401fca48921681c8bb68757af695a8`), written by the collector `.superman/deno-bootstrap/coverage.ts` (sha256 `c90a80169da4e8303844a9f882da402edde6f3f1561521af7a9add50d8f2c65f`), `evaluatedSha` `62c8495aeffa33d827c481e661f6083f8bc718d4`, `inputsHash` `25a337723c6d57099c366a832e77333ee6a037822d5e20242101ed3a44cb9209`, `verdict` `fail`. The four metrics are **lines 550/1675 (32.83 %), statements 609/1854 (32.84 %), branches 437/1851 (23.60 %), functions 95/231 (41.12 %)** — they replace the 518/1665, 573/1839, 375/1823 and 87/225 that the earlier records cited, which were the receipt the collector wrote at 08:17:57, a collector that no longer exists. The records that cited them have been corrected in place. *(Superseded on 2026-11-05 in the exit-status correction round: the collector named here has since changed — its digest is now `83c28622a0c70fb16c08d96758e23813f1d665fa3735970ec479ce775d16d4a4` — and the current measurement is the 2026-11-05 record's: lines 571/1733, statements 631/1910, branches 466/1911, functions 103/241, with the same `verdict: "fail"` and the same merge-bound binding point. The receipt path above is the repository-root receipt that run wrote; the 2026-11-05 measurement was taken in an isolated `mkdtemp` tree, so it has no repository-root path.)*

**Carried limits.**

- **The collector's exit status is 0 while its receipt says `fail`.** The Deno surface's floor binds at the merge-bound cutover, so the collector reports the shortfall and the Node gate carries the obligation; the gate now refuses a Deno receipt whose verdict disagrees with its metrics, so the truth cannot be laundered. If the collector should fail the run instead, that is one line and it makes the Deno root's own coverage command red until the root reaches 90 %.
- **Finding 9's premise did not reproduce.** The seam already resolved a relative executable against the passed `cwd`, and a probe of the pinned runtime confirmed that the runtime itself resolves a relative program against the child's directory. The contract is now stated in the code and pinned by a fixture; no behaviour changed.
- **The build plan's checksum steps are the workflow's two commands, not its pipeline.** The workflow's `grep … | sha256sum -c` has no argv-array form; the plan selects the published sum into its own checksum file and checks the archive against it. The verified property is the workflow's; the commands differ, and the header says so.
- **The Deno root's floor gap is not closed.** The four metrics are 23–41 % against ≥90 % floors, and the floor remains a carried obligation that binds at the merge-bound cutover.
- **The whole-repository gate cannot be run green in this environment** (another actor's untracked `.serena/` directory is read as repository runtime code), so no number from it is presented as a measurement. The Deno receipt binding is exercised before that check and passes.
- **The Node gate gained two refusals** — an unattributable receipt and a verdict that disagrees with the metrics — and one message that now names the members that differ. Row 8's floors, the exclusion pin, the source-map and suppression guards, the scope exhaustiveness check and the manifest-equality check are unchanged.

**Verification commands and exit statuses** (darwin-arm64, Node v26.5.0, the pinned Deno 2.9.8 and the pinned Archgate 0.61.0).

| Command | Exit | Result |
|---|---|---|
| `SUPERMAN_DENO_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts` | 0 | 24 tests, 24 pass, 0 fail |
| `node --test --test-concurrency=1 .superman/ci/coverage.test.ts` | 0 | 63 tests, 63 pass, 0 fail |
| `<pinned Deno> deno check --no-config --no-lock --no-npm --no-remote .superman/deno-bootstrap/*.ts` | 0 | clean over all eleven operational modules |
| `<pinned Deno> deno run --no-prompt --no-config --no-lock --no-npm --no-remote --allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/coverage.ts` | 0 | the receipt written, `verdict: "fail"`, the shortfall printed, no pass claimed |
| `ARCHGATE_BIN=<pinned> <pinned Archgate> check --strict --output json` | 0 | `"pass": true, "total": 16, "passed": 16` |
| `node_modules/.bin/biome check .superman/deno-bootstrap/` | 0 | 35 infos, 0 errors, 0 warnings |
| `pnpm exec tsrs --noEmit` | 0 | clean |
| `git diff --check` | 0 | clean |
| `git status --porcelain` | 0 | 54 entries, no stray |

#### Step 11 exit-status correction record — 2026-11-05

**Outcome:** the Deno collector now exits non-zero on a floor shortfall and still writes its receipt. The receipt is written first and stays complete and attributable; the exit status comes after it and says what the receipt's `verdict` says. The Node gate still binds that receipt and still carries the obligation while the floor is unmet, because the gate binds the receipt and never the collector's exit status. **This record is not an acceptance.** Nothing here accepts a Deno pin, a native profile, an evaluator activation, a workflow publication, ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every required gate; the Deno root is still a parallel, non-admitting successor and admits nothing.

**Scope.** `.superman/deno-bootstrap/coverage.ts`, `.superman/deno-bootstrap/tests/bootstrap.test.ts`, this record, and the evidence append in `.superman/ci/bootstrap-evidence.md`. `.superman/ci/**` is otherwise unchanged — the Node gate, the Node original and the coverage policy are byte-unchanged, and the Node gate needed no change: it binds the receipt, not the exit status. `.archgate/**`, `knip.json`, `biome.json`, `.jscpd.json`, `stryker.config.json`, `package.json`, the lockfiles, the workflows and the skill pin are byte-unchanged. No staging, commit, push, install, network fetch or hosted write; every fixture writes to a `mkdtempSync` root and the verification run wrote into an isolated `mkdtemp` tree, never into the repository root.

**The change, and what it did not change.** The collector gained one statement: after the shortfall message is printed, `Deno.exitCode = 1`. The receipt write, the four metrics, the floors, the coverage semantics, the receipt's shape and the printed message are untouched. The receipt's `verdict` is still `fail` when a floor is missed and `pass` only when every floor is met, and the message still reads `Coverage below 90%: lines 32.94% (deno), …` — never `Coverage: pass` — while a floor is missed. This closes the carried limit the previous round named: "the collector's exit status is 0 while its receipt says `fail` … If the collector should fail the run instead, that is one line".

**The RED→GREEN, at the real seam.** The seam is the collector process: the fixture runs the pinned Deno runtime over the collector and reads the run's exit status and the receipt the run left behind. The RED is the shortfall reaching the collector and the status not changing:

```
✖ the Deno coverage collector reports the shortfall it measured (682.436584ms)
  AssertionError [ERR_ASSERTION]: Coverage execution: full request; uncached full
  Coverage carried obligation (deno): lines 0/1732, statements 0/1909, branches 0/1911, functions 0/241; binds at the merge-bound cutover, when the Deno root becomes the required evaluator
  Coverage below 90%: lines 0% (deno), statements 0% (deno), branches 0% (deno), functions 0% (deno)
  0 !== 1
  actual: 0,
  expected: 1,
```

After the change the same fixture is green: `✔ the Deno coverage collector reports the shortfall it measured (603.1855ms)`.

**The reachability demonstration.** Every guard this change adds or touches is shown reachable and shown changing the outcome.

| Guard | Input that reaches it | Outcome it produces | The outcome without it |
| --- | --- | --- | --- |
| the exit status tells the truth about a floor shortfall | the Deno root measured at 32.94 % lines against a ≥90 % floor | the process exits 1, the receipt is on disk with `verdict: "fail"`, and the message names the shortfall | the process exits 0 while the receipt says `fail` |
| the exit status stays true when every floor is met | a scope measured at 100 % in all four metrics | the process exits 0, the receipt says `verdict: "pass"`, and nothing is carried | — |

The second row is the guard on the guard. It was proved by mutating the production code the guard lives in: with `Deno.exitCode = 1` moved out of the shortfall branch, the shortfall case stayed green and the pass case went red (`1 !== 0`, actual 1, expected 0). The mutation was reverted and the pass case is green again.

**The receipt is still bindable while the floor is unmet.** The fixture that runs both collectors over one tree now asserts the whole path: the Deno run exits 1, the Node run exits 0, the Node receipt carries `denoMeasurement` with the collector's file, the verdict `fail` and the four covered/total tuples the Deno receipt recorded, and the Node receipt carries the Deno floor as a carried obligation whose binding point is the merge-bound cutover. The gate's path never required the collector's exit status to be 0, so there was no bug to fix there.

**The same path over the repository's own tree.** The Node gate was then run over the same isolated tree, after the Deno collector had exited 1 there and left its receipt. It bound that receipt — the collector `.superman/deno-bootstrap/coverage.ts` at sha256 `83c28622a0c70fb16c08d96758e23813f1d665fa3735970ec479ce775d16d4a4`, all 11 declared members, the four metrics lines 571/1733, statements 631/1910, branches 466/1911, functions 103/241, and the verdict `fail` — and carried the Deno floor as an obligation binding at *the merge-bound cutover, when the Deno root becomes the required evaluator*. The gate's own exit status was **1**, and the failure is the `node` inventory's own floor — `Coverage below 90%: statements 89.23% (node), branches 85.38% (node)` — **not** the Deno inventory's. The Deno surface's floor did not fail the gate; it was carried, exactly as the decision requires. That run also reproduces the stale binding point on the *candidate* obligation (`row 11, or the merge-bound cutover, whichever comes first`), which is the item reported below.

**The measured run.** The collector ran over the repository's own working tree in an isolated `mkdtemp` root — a fresh git repository over the same tree, with `node_modules` symlinked — so no verification run wrote into the repository root. Exit status **1**. The receipt: schema `superman.coverage/1`, `verdict: "fail"`, collector `.superman/deno-bootstrap/coverage.ts` at sha256 `83c28622a0c70fb16c08d96758e23813f1d665fa3735970ec479ce775d16d4a4` (the digest of the bytes that ran), 11 declared members all measured, `inputsHash` `a1830bea38978188f20e05f7998b78b226ff7a1ff00581a88e8d5a86f97167e3`, and the four metrics **lines 571/1733 (32.94 %), statements 631/1910 (33.03 %), branches 466/1911 (24.38 %), functions 103/241 (42.73 %)**. The carried obligation is `deno`, with those four tuples, and it binds at *the merge-bound cutover, when the Deno root becomes the required evaluator*.

**Parity, and the one divergence.** The Node original is the reference, and it already does this: it writes its receipt first and then fails its own required inventories by throwing, so its receipt is on disk and its exit status is 1 at the same time. The Deno sibling now does the same thing for its own measurement. The divergence is the *scope* of the failure, and it is recorded rather than removed: the Node gate fails on the `node` and `product` inventories, which are the required ones, and carries the `candidate` and `deno` inventories as obligations; the Deno collector measures only the Deno inventory, so its exit status reports the truth about that one measurement and about nothing else. The floor itself still binds at the merge-bound cutover and not earlier — the exit status says the floor was missed, it does not make the floor bind.

**Both carried coverage floors bind at the merge-bound cutover.** André's decision of 2026-11-04 settles the binding point for both of them: the candidate measurement inventory's floor (`.scratch/superman-v0`, four declared members; 94.78 % lines, 88.75 % statements, 94.87 % functions, 78.57 % branches on the numbers row 8 recorded) and the Deno operational surface's floor (32.94 % lines, 33.03 % statements, 24.38 % branches, 42.73 % functions on the numbers above). Neither binds at row 11, and neither binds earlier than the cutover. The Step 11 slice record's paragraph on the candidate floor has been corrected in place: it read that the obligation was "due now … open and now formally due", and it now says the merge-bound cutover, with the criterion's original wording left quoted and the decision attributed. Two older statements of the earlier binding point are outside this slice's fence and are reported rather than edited: the approved preparation contract's clause 6 (line 347) and the amendment record at line 1554 both still read "row 11, or the merge-bound cutover, whichever comes first", and `.superman/ci/coverage.ts` still writes that same string into the candidate obligation of the Node receipt — the gate's owner owns that string. *(Resolved on 2026-11-05 in the binding-point correction round: the gate's owner edited that string, and the two older statements were corrected in place. The clause 6 and the amendment record now name the merge-bound cutover, and `.superman/ci/coverage.ts` writes the same string into the candidate obligation. See the Step 8 binding-point correction record above.)*

**Row 10's clause 6 is a named carried obligation bound to ticket 01.** That is row 10's record and not this slice's. The consistency this slice owes row 10 is the port and its parity fixture: `.superman/deno-bootstrap/quality.ts` and the parity fixture in `.superman/deno-bootstrap/tests/bootstrap.test.ts` were re-derived from row 10's corrected Node original and carry its corrected taxonomy (`policy-refusal`, `critical-survivor`) and its corrected profile shape, and the parity fixture compares the two hosts' decisions and their receipts rather than a formula. They were left untouched by this round, and the three process suites are green, so the port and the fixture are consistent with row 10's corrected semantics as they stand.

**Verification commands and exit statuses** (darwin-arm64, Node v26.5.0, the pinned Deno 2.9.8 and the pinned Archgate 0.61.0).

| Command | Exit | Result |
| --- | --- | --- |
| `SUPERMAN_DENO_BIN=<pinned> ARCHGATE_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/{launch,bootstrap,transition}.test.ts` | 0 | 45 tests, 45 pass, 0 fail, 0 skipped |
| `<pinned Deno> deno check --no-config --no-lock --no-npm --no-remote .superman/deno-bootstrap/*.ts` | 0 | clean over all eleven operational modules |
| `<pinned Deno> deno run --no-prompt --no-config --no-lock --no-npm --no-remote --allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/coverage.ts` (over the isolated tree) | **1** | the receipt written, `verdict: "fail"`, the shortfall printed, no pass claimed |
| `node .superman/ci/coverage.ts` (over the isolated tree, after the Deno collector exited 1 there) | **1** | the Deno receipt bound and carried; the failure is the `node` inventory's own floor (`statements 89.23% (node), branches 85.38% (node)`), not the Deno inventory's |
| `ARCHGATE_BIN=<pinned> <pinned Archgate> check --strict --output json` | 0 | `"pass": true, "total": 16, "passed": 16` |
| `node_modules/.bin/biome check .superman/deno-bootstrap/` | 0 | 39 infos, 0 errors, 0 warnings |
| `pnpm exec tsrs --noEmit` | 0 | clean |
| `git diff --check` | 0 | clean |
| `git status --porcelain` | 0 | 69 entries, no stray — the same 69 the tree carried before this round |

**Carried limits.**

- **The Deno root's floor gap is not closed.** The four metrics are 24–43 % against ≥90 % floors. The floor remains a carried obligation that binds at the merge-bound cutover, and the exit status now says so instead of staying silent about it.
- **The candidate-proof job's coverage step would go red when the template is published.** `.superman/deno-bootstrap/ci.template.yml` runs the collector under `set -euo pipefail`, so a non-zero exit ends that step after the receipt is written but before `raw-gates.ts` runs. The template is row 12's file, it is inert (it lives outside `.github/workflows/`), and this round did not change it: workflows are outside this slice's fence and no published path consumes the collector's exit status — the published `.github/workflows/ci.yml` runs the Node gate only. The publication lane owns the template's handling of a carried floor.
- **The Node gate's own `node` inventory is below its floor in this environment.** Over the isolated tree the gate exited 1 on `Coverage below 90%: statements 89.23% (node), branches 85.38% (node)` — the Node surface's own coverage, which this round did not touch and did not cause. The Deno inventory's floor was carried, not failed. Running the gate in the repository root is still not a measurement here: another actor's untracked `.serena/` directory is read as repository runtime code, which is why the run above was made over an isolated tree that excludes it.
- **Row 8's record still cites the collector that this round replaced.** The row 8 follow-up record (line 1573) names the collector's digest `c90a8016…` and the four metrics lines 550/1675, statements 609/1854, branches 437/1851, functions 95/231. The collector's bytes have changed since, so that digest names a collector that is no longer in the tree. It is row 8's record and outside this slice's group, so it is reported rather than edited; the same paragraph's own correction note already establishes the practice of correcting a stale citation in place. The current digest and the current figures are in this record and in the 2026-11-05 evidence append. *(Resolved on 2026-11-05 in the binding-point correction round: the row 8 follow-up record's inline collector digest was replaced by a pointer to where the collector's identity is recorded — the Deno receipt's own `collector` field and the coverage receipt's `denoMeasurement.collector` — and no digest is re-pinned, because a collector digest changes on every collector edit. See the Step 8 binding-point correction record above.)*

#### Step 11 staged-scope alignment record — 2026-11-05

**Outcome:** the Deno sibling now matches the Node original's staged scope, and the two hosts' receipts agree for the same fixture. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**Scope.** Six files, all inside the row 11 file allowance — `.superman/deno-bootstrap/direct-gates.ts`, `.superman/deno-bootstrap/raw-gates.ts`, `.superman/deno-bootstrap/replay.ts`, `.superman/deno-bootstrap/tests/staged-scope.test.ts` (new), `.superman/deno-bootstrap/tests/transition.test.ts`, `.superman/deno-bootstrap/tests/bootstrap.test.ts`. The Node originals are unchanged by this round except for the §5.4 pre-commit alignment that row 10 recorded. No staging, commit, push, install, acquisition, network fetch, workflow change, `package.json` change or ticket-status change. Every fixture writes to a `mkdtempSync` root.

**Why this round exists.** Row 11's clause 2 requires the sibling to produce the same public outputs, receipt shapes, failure codes and cleanup behaviour as the Node original for the same inputs. Row 10's §5.4 pre-commit alignment changed the Node original — a declared stage scope, the staged G1 and G10 forms, the staged-scope preconditions, the branch fallback — and the sibling still carried the pre-alignment shape. Left alone, the two hosts' staged receipts would have differed, which is the divergence clause 2 exists to prevent.

**What changed.** The sibling's stage declaration carries a scope; `stagePolicy` refuses an invalid scope and refuses a partial stage that declares a whole-repository scope; the gate context carries the scope; G1 runs `check --staged` and G10 runs `biome check --staged --no-errors-on-unmatched` under it. The sibling's raw driver records the staged snapshot's identity, refuses an unstaged modification in the staged scope, keeps the committed-tree binding in the full scope, and resolves the branch the way the Node original does. A new suite, `.superman/deno-bootstrap/tests/staged-scope.test.ts`, runs **both** hosts over one fixture and compares the outcome — eight parity cases, each one a guard with its input and its outcome.

**Two findings the alignment exposed.**

1. **The Node original's new scope rule had already broken the sibling's transition fixture.** Two transition tests were failing before this round: the fixture declared `"feedback": "partial"` without a scope, and the Node original's new rule refused the undeclared scope. The fixture now declares `"scope": "staged"`. The failure was in the sibling's *fixture*, not in the Node original's rule — but it is the honest reading: a stage that declares partial feedback over a scope it does not declare is refused.
2. **The sibling's Node-version probe could be corrupted by a version-manager shim.** The Node original reads its own `process.versions`, which no shim can corrupt; the sibling asks the toolchain's Node runtime with `node --version`, and a shim on `PATH` can print its own log line on stdout before the version. The probe now reads the version the way the runtime reports it — the last line that is exactly a version — and refuses output that carries none. The parsing is a named export with its own fixture, so the guard is reachable without a shim in the loop.

**Reachability.** Every new guard was shown reachable by rebuilding a copy of the sibling with the staged-scope change reverted and running the new suite against it: **all eight parity tests fail** against the reverted copy and **all eight pass** against the aligned sibling. The reverted copy was written under `/tmp` and deleted.

**Verification.** `node --test .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts .superman/deno-bootstrap/tests/transition.test.ts .superman/deno-bootstrap/tests/staged-scope.test.ts` with the pinned Deno 2.9.8 as `SUPERMAN_DENO_BIN`, the pinned pnpm 12.16.1 first on `PATH` and the pinned darwin-arm64 Archgate 0.61.0 as `ARCHGATE_BIN` — **53 tests, 53 pass, 0 fail**, up from 45. `deno check` on both Deno sources: exit 0. `node_modules/.bin/biome check` on the four changed files: 0 errors. `archgate check --strict` over them: pass, 0 violations. The Node reference suite `node --test .superman/ci/raw-routing.test.ts`: 50/50 pass.

**Carried limits.** The sibling's staged form covers G1 and G10; the staged G9 and G5 that André commissioned on 2026-11-05 are landing in the Node original in parallel and must be mirrored here before the two hosts can be compared on them. The suites are flaky under heavy parallel load — a `kill EPERM` from the process cleanup — which appears in both hosts' suites and is an environment property, not a code defect; every suite passes when it is not competing with another. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.

#### Step 11 staged-scope parity record — 2026-11-06

**Outcome:** the Deno sibling now has the staged G9 and the staged G5, and the two hosts' staged receipts agree field for field. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written. Node 26.5.0 still executes every gate; the sibling is parallel and non-admitting.

**Scope.** Five files, all inside the row 11 file allowance — `.superman/deno-bootstrap/exec.ts`, `.superman/deno-bootstrap/replay.ts`, `.superman/deno-bootstrap/quality.ts`, `.superman/deno-bootstrap/raw-gates.ts`, `.superman/deno-bootstrap/tests/staged-scope.test.ts`. The Node originals were not changed by this round; they were the reference. No staging, commit, push, install, acquisition, network fetch, workflow change, `package.json` change or ticket-status change. Every fixture writes to a `mkdtempSync` root.

**What changed.**

- **The staged G9** mirrors the Node original's: the staged test files are selected from the declared test globs, run against the staged content through the shared tool seam, and reported with the same `checked` and `notChecked` strings. The full-scope G9 — the replay, the `n/a` kinds, the refactor refusal — is unchanged.
- **The staged G5** mirrors the Node original's: the changed corpus files are scanned, compared against a base scan of the same file names, and reported with `metrics.changedFilesPct` and the same `notChecked` string naming the merge bar as a different check. The full scope's corpus, baseline comparison, ratchet rules and result shape are unchanged; both scopes now call the same extracted helpers, so they cannot drift.
- **The index is materialised without touching the repository**, by the sibling's own `ownedIndexSnapshot` — `git checkout-index --all --prefix=…` through the `Deno.Command` seam, then the shared tool linking.
- **The staged file list is computed once per run** and shared by the staged G9 and the staged G5, so the two cannot disagree about what is staged.
- **The process-group cleanup now tolerates `EPERM`**, matching the Node original, with the same reasoning: the child and its descendants run as this user, so `EPERM` means the group id now names a group this user does not own — the recycled-id case, where nothing of ours survives. Neither it nor `ESRCH` may turn a successful tool run into a failed gate.

**The parity proof.** `.superman/deno-bootstrap/tests/staged-scope.test.ts` builds **one** fixture, runs **both** hosts over it, and compares the receipts field by field — including the whole `results` array, the `stagedInputsId`, the `inputScope` and the input integrity. The staged G5's result object was captured from both hosts over the same fixture and compared in serialised form: byte-identical, including the clone fragment, the `startLoc`/`endLoc` positions and the `changedFilesPct` float. The staged G9's green, `n/a` and non-regular-file results are byte-identical too; the red case differs only in the embedded test runner's own output below the command line.

**Three guards in the sibling that no test reaches**, named rather than hidden:

1. **`exec.ts`'s `EPERM` tolerance.** Reaching it needs a process-group id recycled onto a group this user does not own, which the suite cannot produce deterministically without privileges it does not have. The Node original carries the same branch with no test either.
2. **The staged G5's changed-file-list validation.** The driver always supplies `stagedFiles()`, a valid string array, so the guard is unreachable through the raw-gates path. The Node original covers it with a direct unit call on `qualityGate`; the sibling's `qualityGate` cannot be called directly from the Node-hosted test runner, because its seam is `Deno.Command`.
3. **The staged G5's "no regular reviewed jscpd profile" and "no readable reviewed jscpd profile" refusals.** Reachable in principle — a base with no `.jscpd.json`, or an unparseable one — but the fixture copies the reviewed profile into the base and no case was added for them. The reviewed-profile discipline itself is covered, by the "reviewed profile is not the reviewed measurement profile" and "the staged profile differs" cases.

**Four ways the two hosts still differ**, all named:

1. **The G4 policy preflight's refusal text embeds each host's own launch command line**, so a failing preflight would produce different blocked-by reasons on the two hosts. This is pre-existing, it never fires when the preflight passes, and the Node original has the same shape.
2. **The staged G9's `tools.node.actual` is read differently** — the Node original reads its own `process.versions.node`, the sibling probes `node --version` from `PATH`. They agree in the fixture, and the suite asserts the `tools` records are deep-equal, but on a host whose `PATH` `node` differs from the running runtime they would diverge.
3. **The sibling's `qualityGate` is `async`** because the seam's `runOwned` is async; the public shape is identical and the driver awaits it.
4. **The staged G9's failure text names `pnpm exec vitest run …`**, not the host's launcher, so the two hosts' `reason` strings match.

**Verification.** With the pinned Deno 2.9.8 as `SUPERMAN_DENO_BIN`, the pinned pnpm 12.16.1 first on `PATH` and the pinned darwin-arm64 Archgate 0.61.0 as `ARCHGATE_BIN`:

| Command | Result |
| --- | --- |
| `node --test .superman/deno-bootstrap/tests/staged-scope.test.ts` | **24 tests, 24 pass, 0 fail** |
| `node --test .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts .superman/deno-bootstrap/tests/transition.test.ts .superman/deno-bootstrap/tests/staged-scope.test.ts` | **70 tests, 70 pass, 0 fail** |
| `node --test .superman/ci/raw-routing.test.ts` | **61 tests, 61 pass, 0 fail** — the Node reference is unchanged |
| `deno check` on the five Deno sources | exit 0 |
| `node_modules/.bin/biome check .superman/deno-bootstrap` | 0 errors |
| `git diff --check` | clean |

The sibling's own suites have grown from **45** at row 11's start to **70**, of which 24 are the staged-scope parity cases.

**Carried limits.** The three unreached guards above. The four host differences above, all of them recorded rather than papered over. darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no ticket 01 admission.

#### Step 11 clause-6 measurement finding — 2026-11-06

**Outcome:** row 11's clause 6 verdict — "Duplication stays visible — met" — rested on an assertion that is **not true as stated**, and the measurement is now on the record. This is a finding for the acceptance round, not a blocker and not a waiver. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**What was claimed.** The row 11 slice record's clause 6 verdict reads: "No exclusion, ignore, corpus narrowing or suppression was added to hide the port's duplication. The temporary duplication stays visible as a declared, measured inventory: row 8's follow-up has since declared the Deno scope in `.superman/ci/coverage.json` … and the Node collector now refuses an unmodeled source file, an incomplete manifest and a receipt that does not bind every declared member."

**What the measurement says.** The Deno sibling **is** a declared, measured inventory — the coverage one, with its own carried floor. It is **not** inside the other two policies that name duplication, and the asymmetry is against the Deno sibling:

| File | Coverage inventory | Mutation scope | Duplication corpus |
| --- | --- | --- | --- |
| `.superman/ci/raw-gates.ts` (the Node original) | yes | **yes** | no |
| `.superman/deno-bootstrap/raw-gates.ts` (the sibling) | yes, as its own scope | **no** | no |
| `.superman/deno-bootstrap/direct-gates.ts` (the sibling) | yes, as its own scope | **no** | no |
| `src/cli.ts` (the product) | yes | yes | **yes** |

Measured with the repository's own matcher (`path.matchesGlob`), against the declared policies — `quality.mutation.scope` is `["src/**/*.ts", ".superman/ci/**/*.ts", "!**/*.test.ts"]` and `quality.duplication.corpus` is `["src/**/*.ts"]`. The duplication corpus is the **product's** code, so neither host's enforcement core is in it; the mutation scope reaches the Node enforcement core and not the Deno one.

**Why it matters.** Row 11's clause 6 says temporary implementation duplication is "not hidden from the duplication or mutation measurement to make a result look better". The temporary duplication between the two hosts is visible to the **coverage** measurement — the Deno scope's size, members and floor are declared and the collector refuses an unmodeled file — and it is **not** visible to the duplication or mutation measurement. The Node enforcement core is mutation-measured and its Deno counterpart is not, and the duplication *percentage* would rise materially if both hosts' enforcement core were measured together, because the two are deliberate near-copies of one another.

**What is not being claimed.** This is not a demonstrated false green. Nothing in the measured results is currently flattered by the exclusion: the duplication corpus is empty today (`src/**` does not exist until ticket 01), so the measured percentage is unchanged by the port's existence. The Deno root's *mutation* measurement cannot be produced by the Node-hosted Stryker at all — the runner executes Node-hosted Vitest, and the Deno code is Deno — so §5.4's "Deno prerequisite" (a Node-hosted Stryker does not activate Deno mutants) is the reason the scope stops where it does, not a choice that flatters a number.

**The decision this goes to.** Three resolutions, and none of them is the executor's to take:

1. **Declare a second duplication corpus** covering both hosts' enforcement core, and refresh the baseline at Gate 1 as the policy already prescribes. The measured duplication percentage then rises materially, and the ratchet moves with it. This is the option that makes the temporary duplication visible to the duplication measurement.
2. **Record the exclusion as an explicit policy statement** — the duplication corpus is the product's code, and the enforcement core's own duplication is bounded by the declared coverage inventory and the enforced Archgate rules — rather than leaving it implicit in a scope list.
3. **Carry the Deno mutation measurement to the Deno host**, as §5.4's Deno prerequisite already requires, and close the mutation half of the scope when that lands.

Under ADR 0018 this is a **discovered obligation** against a named clause, so it goes to the acceptance round as a decision, not as a note and not as a silent fix.

#### Step 11 the sibling's own `deno check` — 2026-11-06

**Outcome:** André's second decision is implemented: **each host typechecks its own graph.** The Node original's G2 keeps the pinned `tsrs --noEmit` over the Node graph; the Deno sibling's G2 now runs `deno check` over the Deno operational graph, with the runtime it already drives. **This is not an acceptance:** nothing here accepts a pin, a native profile, an evaluator activation, a ticket 01 admission or a readiness change, and no acceptance record was written.

**Why it was open.** Spec §5.4's G2 cell requires "exact-pinned `tsrs --noEmit` **plus supplemental complete-graph `deno check` for Deno code** (§5.10, ADR 0008)", and §5.10's checker contract requires "`deno check` over complete Deno product/bootstrap entry graphs". ADR 0008's Deno amendment recorded the integration as unimplemented, and §17's "Checker/replay/mutation/coverage integration" row names "real positive/negative tsrs + deno-check fixtures" among the prerequisites for Deno activation. No gate ran it: `tsconfig.json` does not include the Deno root and the workflow template runs three `deno run` steps and no `deno check`.

**What the check does.** The invocation is

```text
<deno> check --no-config --no-lock --no-npm --no-remote \
  .superman/deno-bootstrap/{archgate-arm64-build,archgate-linux-arm64-wizard,coverage,pr-policy,provision-tools,raw-gates}.ts
```

**The entry points are derived from the sibling's own module graph**, not hand-listed: they are the Deno root's modules that no sibling module imports — six of the root's eleven, the `tests/` directory excluded because those suites are Node-hosted. Four things prove the graph is complete rather than one module: the closure over the entry points must **equal the whole module inventory**, and a module it misses is refused as a policy refusal, so the check can never be partial; `deno check` unions the entry points' graphs, and the failing-check fixture breaks `replay.ts` — a module **no** entry point imports — and the check reports it; the receipt names all eleven modules and the six entry points; and the refusal fixture adds two mutually-importing modules that no entry point reaches, and the gate refuses instead of checking in part.

**The capability profile is the empty one.** `deno check` accepts no capability flag at all — `deno check --allow-read` exits 1 with `unexpected argument '--allow-read'` — because the subcommand type-checks a graph and runs none of it. The profile is still built through the seam's own builder, so the grant is an explicit decision and never a blanket one; the read access the check needs is the runtime's own module loading, which is not a capability grant.

**Where the pinned version lives.** The Deno root's own `ci.template.yml` declares `deno_version:`, and that file is the Deno root's reviewed declaration of its runtime, so the gate reads it there rather than inventing a second home. Every declared leg must name the same version, or the gate refuses.

**The failure taxonomy.** A missing runtime is `missing-tool`; a version disagreement, an unreviewed or ambiguous pin, and an uncoverable graph are `policy-refusal`; the check's own non-zero exit is `failed-command` carrying its stdout and stderr verbatim.

**The parity harness was adjusted, not weakened.** Only the G2 entry's `denoCheck` field is dropped from the two hosts' `results` comparison, because by decision the two hosts typecheck different graphs; every other field and every other gate entry is still compared byte for byte, and a parity case asserts that the Node original's G2 has no `denoCheck` and the sibling's does.

#### Rows 8, 9, 10 and 11 acceptance — 2026-11-06

**Decision: André accepted rows 8, 9, 10 and 11 on 2026-11-06, at preparation scope, on their recorded evidence.** This entry records that decision and its scope; it is not the executor's judgement and it accepts nothing beyond it. The checklist table is not edited, and every carried limit below stays carried.

**What each acceptance covers.**

- **Row 8 — the current-Node inventory and measurement expansion.** The shipped `node` inventory is measured over the final tree and clears every floor independently: lines 2658/2768 (96.03 %), statements 2973/3120 (95.29 %), branches 2406/2664 (90.32 %), functions 401/414 (96.86 %), the receipt's own `verdict: "pass"` and the collector's exit 0. The candidate measurement inventory's floor is a **carried** obligation, binding at the merge-bound cutover; its statements and branches are below the floor today.
- **Row 9 — the governing Deno rules and input closure.** All six clauses met: the repository's strict Archgate run reports `"pass": true, "total": 16, "passed": 16, "failed": 0`; the rule and wizard suites are green; the four bypasses are re-tested and rejected; and the Deno configuration inputs are in the protected list with a fixture.
- **Row 10 — the full raw quality contract.** Clauses 1–5 met. Clause 6's **mechanism** is in place: eight declared critical cases, Vitest-visible, selected by the mutation runner for every declared critical module, executed fresh outside any affected selection, and fixture-proved under both the pinned and the ambient pnpm. The survivor rule compares **identities**, not counts, so a newly introduced survivor cannot hide behind one the approved base had and the candidate killed. The enforcement core's **first** mutation baseline and its raw survivor list are **not** produced — the row's own carried limits place the enforcement-core first measurements outside this preparation ("a review input, not a floor; product-source baselines wait for ticket 01").
- **Row 11 — the incremental parallel operational port.** Staged-scope parity with the Node original: the staged G9, the staged G5, the index snapshot and the shared tool seam, compared field by field over one fixture (24 parity cases). Clause 6 is **resolved by a stated scope** (André, 2026-11-06): the duplication corpus is the product's code, the Deno surface is a declared and separately measured inventory answering to the same enforced rules, and the Node-hosted Stryker cannot measure Deno code — so the scope cannot be symmetric until the Deno host can mutation-measure its own graph. The statement is in spec §5.4, dated. The sibling's G2 runs `deno check` over its own graph, entered at the modules no sibling module imports, refusing a graph it cannot close.

**The evidence the acceptance rests on**, on the final tree, darwin-arm64, with the pinned toolchain:

| | |
| --- | --- |
| Node suites | **561 tests, 561 pass, 0 fail** |
| Deno suites | **79 tests, 79 pass, 0 fail** |
| Declared critical cases | **36 tests, 36 pass, 0 fail**, under the pinned **and** the ambient pnpm |
| Pinned Archgate, strict | `"pass": true, "total": 16, "passed": 16, "failed": 0` |
| `node_modules/.bin/biome ci` | 0 errors, 0 warnings (144 advisories, under the reviewed 15/50 calibration) |
| `pnpm exec knip --no-progress` | 0 issues |
| `pnpm exec tsrs --noEmit` | clean |
| `deno check` | clean, on every Deno source |
| Pre-commit p50 / p95 | 2.33 s / 2.72 s against §5.2's target and §13's ≤10 s / ≤30 s |
| `git diff --check` | clean |

**Carried, not waived.** The candidate and Deno coverage floors bind at the merge-bound cutover. The enforcement core's first mutation baseline and raw survivors are a review input, not a floor. G2's affected-target selection waits for §5.7's change model, so the pre-commit stage takes §5.4's full fallback. The staged G9 is green-only by §5.4's own local cell; the red-on-base half is the pull-request G9's. The credential filter is family-based rather than allowlist-based, and the direct gates keep the caller's `HOME`; both are recorded limits. The Deno sibling carries three unreached guards and four host differences, all named.

**What this acceptance does not do.** It does not accept a Deno pin or a native profile. It does not activate the Deno evaluator; Node remains the required result. It does not publish a workflow and claims no hosted H/B/M. It does not admit ticket 01 or change its status, and it changes no readiness label. **Row 12 is not accepted** — its criterion requires the three native candidate proof runs, the live forge evidence and the publication, which are operator lanes.

#### Publication packet — 2026-11-07

**Outcome:** the exact publication manifest and the exact operations are prepared, and the preparation stops here for André's explicit publication and execution authorisation. **Nothing was staged, committed, pushed, published or installed; no credential was minted; no source file was modified.** The manifest is at [`.scratch/superman-v0/gate1-publication-manifest.md`](gate1-publication-manifest.md), which states its own digest. **This section deliberately does not quote that digest:** the record's own bytes are one of the manifest's paths, so quoting the digest here would change a byte the digest covers. The manifest is the frozen artifact; if the record changes after this point, the manifest correctly reports a mismatch and the packet must be re-frozen.

**1 — Base freshness: fresh.** The remote refs were fetched read-only (`git fetch origin main spec/superman-v0`; the fetch writes local refs and nothing else).

| | |
| --- | --- |
| `origin/main` | `e9b7551` — **unchanged**. The branch's recorded base is still the remote's tip of `main`. |
| The branch's tip | `62c8495` — unchanged, and **already equal to `origin/spec/superman-v0`**. The remote branch carries the earlier preparation; this working tree is the delta on top of it. |

So no rebase and no merge of `main` is needed, and **no check or review is re-opened by a base change**. If `main` moves between this packet and the merge, that is a fresh condition and the evidence must cover the new base (§9.2's sixth condition), not this one.

**2 — The frozen source manifest.** Every path the PR must contain, each with its sha256, sorted, with the manifest's own digest — in [`.scratch/superman-v0/gate1-publication-manifest.md`](gate1-publication-manifest.md). It is the **73** paths changed against `62c8495` plus the **11** untracked paths that are not `.serena/` — **84** in all. `.serena/` is excluded: it is another actor's directory, it is not ours to publish, and the coverage collector reads it as runtime code.

**3 — The index's review-phase markers, and the normalisation that is deferred.** The review phase left **intent-to-add** entries in the index — a marker, not content: `.serena/`, `.superman/ci/critical/`, `.superman/deno-bootstrap/tests/staged-scope.test.ts` and `WORKFLOW.md`. They are how the review made new files visible in `git diff`. They were **not** normalised in this invocation, because the packet is not authorised to stage.

**The marker on `.serena/` is a live hazard and must be cleared before any `git commit`.** An intent-to-add entry is already in the index, so a plain `git commit` would sweep it in. The authorised publication step must run, in this order:

```bash
git reset -- .serena/            # drop the marker; touches the index only, never the other actor's files
git reset                        # drop every review-phase marker, leaving the working tree untouched
git add -- <each of the 84 manifest paths, explicitly>   # never `git add -A`
git diff --cached --name-only    # must equal the manifest's path list, exactly
```

`git reset` with no path is the step that removes the markers; the working tree is untouched by it, so nothing of the preparation is lost. The manifest's 84 paths are then added **by explicit path**, never with `-A`, so no untracked path outside the manifest can enter the commit.

**4 — The identity gap, exactly.** The PR's author must be the configured **agent identity**, and §9.2's first condition requires that it is **not** in `identity.approvers`.

| | |
| --- | --- |
| The agent identity | the private GitHub App **`r3dlex-superman-bot`** — App id **5526100**, slug `r3dlex-superman-bot`, owner `r3dlex`, bot user **349828379**; installation **176536987**, unsuspended, repository-scoped to `r3dlex/superman` (App id 1438373851) |
| Its key | `SUPERMAN_APP_KEY_PATH` → `~/.config/superman-agent/app.pem`, mode 600 in a mode-700 directory — **present in this environment** |
| Its mint | `~/.config/superman-agent/mint-token.sh` (mode 700) mints a **1-hour installation token** scoped to `repositories: ["superman"]` |
| Its gh config | `~/.config/superman-agent/gh` — the separate `GH_CONFIG_DIR` ADR 0005 requires, so the human session's accounts are never touched |
| The local human session | `gh` is authenticated as **`br4vesirrobin`** — André's account, the **approver** — with a broad `gho_` OAuth token; the local git identity is `Andre Burgstahler <r3dtuxedo@gmail.com>` |

**The gap:** pushing as the local session would make the **approver** the PR's author, and §9.2's first condition fails. The App's token path is what closes it, and the App key is already here — so **no account has to be created**. A separate "Robo"/"HAL" account cannot substitute: GitHub permits one account per email address, a commit authored with André's email attributes to André's account (the approver), and ADR 0005 records that machine-user sign-up was blocked for this organisation; machine-user mode stays supported behind `identity.agent.mode` as a later switch (§9.3). The App's *display* name is a hosted setting André may change; the bot login — and therefore the attribution — stays `r3dlex-superman-bot[bot]`.

**5 — The exact operations.** Each step is marked with who may run it. Nothing below has been executed.

| # | Operation | Exact command | Who |
| --- | --- | --- | --- |
| 1 | Mint a short-lived installation token | `umask 077; TOKEN_FILE=$(mktemp); ~/.config/superman-agent/mint-token.sh > "$TOKEN_FILE"` | needs André's authority |
| 2 | Stage exactly the manifest | `git reset -- .serena/ && git reset && git add -- <the 84 manifest paths>` then `git diff --cached --name-only` must equal the manifest's list | needs André's authority |
| 3 | Verify the staged bytes | the staged paths' sha256 must equal the manifest's, path for path | needs André's authority |
| 4 | Commit, authored by the bot | `git -c user.name='r3dlex-superman-bot[bot]' -c user.email='r3dlex-superman-bot[bot]@users.noreply.github.com' commit -m '<message below>'` | needs André's authority |
| 5 | Push the branch | a credential helper reading the token from `"$TOKEN_FILE"` — `git -c credential.helper='!f() { echo username=x-access-token; echo "password=$(cat "$TOKEN_FILE")"; }; f' push origin HEAD:refs/heads/spec/superman-v0` — so the token never appears in argv or in a log | needs André's authority |
| 6 | Write the PR body | `GH_TOKEN=$(cat "$TOKEN_FILE") GH_CONFIG_DIR=~/.config/superman-agent/gh gh pr edit 1 --body-file .scratch/superman-v0/gate1-pr-body.md` | needs André's authority |
| 7 | Discard the token | `rm -f "$TOKEN_FILE"` — immediately after step 6 | needs André's authority |

The token **must not** be written into this record, into the evidence files, into a log, or into argv. The commit message for step 4:

```text
spec: complete the Gate 1 preparation

Rows 8–11 accepted at preparation scope on 2026-11-06. The pre-commit stage
gains the staged duplication and green-commit checks §5.4's local column
implies; the six declared critical cases become Vitest-visible and two more
cover the approval/credential and path/process boundaries §5.4 names; the
survivor rule compares identities rather than counts; the Deno sibling
reaches staged-scope parity and checks its own graph with deno check. Node
remains the required evaluator: nothing here activates the Deno root, accepts
a pin, publishes a workflow or admits ticket 01.
```

**6 — The candidate-proof dispatch plan.** The three native legs, their runner labels, and the receipts they produce are in the operator request (§1 and §3) and are unchanged by this packet. What the publication makes possible:

| Required check | Runner labels | Producer |
| --- | --- | --- |
| `bootstrap (macos-15)` | `self-hosted`, `macOS`, `ARM64`, `r3dlex-org` | GitHub Actions app id `15368` |
| `bootstrap (ubuntu-24.04)` | `self-hosted`, `Linux`, `X64`, `r3dlex-org` | app id `15368` |
| `bootstrap (ubuntu-24.04-arm)` | `self-hosted`, `Linux`, `ARM64`, `r3dlex-linux-arm64` | app id `15368` |

The candidate proof legs are the `deno-candidate (<os>)` matrix of `.superman/deno-bootstrap/ci.template.yml` — a **template**, not a workflow: it is outside workflow discovery until it is published under `.github/workflows/`, and the file name it takes there is part of the publication decision. Each leg binds `DENO_ARCHIVE_URL`, `DENO_ARCHIVE_SHA256` and `DENO_BINARY_SHA256` from the matrix, checks the source out with `fetch-depth: 0`, binds `HEAD_SHA` and `BASE_SHA` without overriding `GITHUB_SHA`, runs under the Deno root's own launch flags and permission classes, and uploads its receipts to `.superman-ci/deno-bootstrap/<platform>/` as `deno-candidate-<platform>`. The arm64 leg uses the **separate** `r3dlex-linux-arm64` group.

The forge must then show, for the integration evidence: the **head H** (the proposed head), the **tested base B**, the **tested merge M**, and the **run/attempt/artifact** relationship between them — with the check-run metadata attached to H and M checked out. Querying H alone and assuming it is M is not proof. The candidate receipts are **additional** evidence; the Node required results stay required until the exact-head approval and the merge.

**7 — The §9.2 pre-merge checklist, as a fillable table over that evidence.**

| # | Condition | Evidence to fill | Obtainable here? |
| --- | --- | --- | --- |
| 1 | The PR author is the agent identity and is not an `identity.approvers` member; the head repo is upstream with a `spec/` branch | the PR's author id (expect **349828379**, the App bot) and the approver list | **No** — needs the forge |
| 2 | `headSha` is taken from the PR at the moment of the check | the PR's head sha at check time | **No** — needs the forge |
| 3 | The latest approver review is `APPROVED` with `commit_id == headSha`; no approver's latest review is `CHANGES_REQUESTED`; the approver is not the author | the review list and each review's `commit_id` | **No** — needs the forge, and needs **André** |
| 4 | The required workflow/job/App identities are present and successful for the integration evidence, with H, B, M and the run/attempt/artifact relationship validated | the three `bootstrap (…)` check runs, their attempts, their artifacts, and M's checkout | **No** — needs the runners and the forge |
| 5 | The PR kind matches its branch, and the changed files obey that kind's path policy recomputed from the forge | the PR's files list against the `spec/*` policy | **No** — needs the forge |
| 6 | The base is `main`, the PR is mergeable, and the evidence covers the current base | the PR's base ref and mergeability; base freshness re-checked at merge time | **No** — needs the forge |
| 7 | The merge actor is an approver, checked by `audit` | the merge actor | **No** — needs the merge, which is André's |

**What still needs André's authority, in order:** (1) mint the installation token; (2) the commit, push and PR-body write under the App identity, with the exact commands above; (3) the runner and forge access the three native proof runs need; (4) the exact-head approval and the merge itself. Nothing here can be done from this session without those.

#### Publication executed, and the first hosted result — 2026-11-07

**Outcome:** the preparation is published to r3dlex/superman#1 under the App's identity, and the hosted CI produced its first result on the published head — **red, for one reason, with the cause identified and fixed under André's authorisation.** **This is not an acceptance of the merge:** nothing here accepts a hosted merge, a workflow's required-check set beyond the change reviewed below, or ticket 01.

**The publication, as executed.** André authorised the packet on 2026-11-07.

| | |
| --- | --- |
| Manifest | [`.scratch/superman-v0/gate1-publication-manifest.md`](gate1-publication-manifest.md) — 85 paths, digest `28e4c81b8fd0049c1c4b9a4c333c9944e36673a603bd1e87c238ab57767fc764`; every staged byte verified against it, **zero mismatches**; `.serena/` absent from the index |
| Identity | the App's 1-hour installation token, minted from `~/.config/superman-agent/app.pem` (App **5526100**, installation **176536987**), scoped to `r3dlex/superman`, used through `GH_TOKEN` and the separate `GH_CONFIG_DIR`; **never in argv, never in a log, and discarded** — 0 token files remain |
| Commit | `be4c188` — 85 files, 30,687 insertions, 410 deletions, authored by `r3dlex-superman-bot[bot] <r3dlex-superman-bot[bot]@users.noreply.github.com>` |
| Push | `62c8495..be4c188  HEAD -> spec/superman-v0` |
| PR #1 | open on `main`, mergeable, author **`app/r3dlex-superman-bot`**, description rewritten with the reviewed body (15,860 characters, from `## Summary`) |

**The first hosted result: all three legs red, one cause.**

```text
bootstrap (macos-15)          fail  42s
bootstrap (ubuntu-24.04)      fail  55s
bootstrap (ubuntu-24.04-arm)  fail  44s

Coverage Deno measurement receipt is absent: .superman-ci/coverage-deno-*/coverage-receipt.json
```

**This was not pre-existing.** The previous head `62c8495` was **green** on 2026-11-01. The published delta declares the Deno scope in `coverage.json`, so the Node collector now binds the Deno measurement from the Deno collector's receipt — and the published workflow **never ran the Deno collector**. The gate refused visibly rather than passing without the evidence: no false green, and the failure named its own cause.

**The authorised fix.** André authorised the workflow change on 2026-11-07. Two files, both protected policy inputs, both changed in this spec-kind PR:

| File | sha256 | Change |
| --- | --- | --- |
| `.superman/ci/tool-assets.json` | `beeff5450320905abc79e509a9139e179be7e659e1ac9138011176488742272e` | The pinned Deno **2.9.8** is registered for all three platforms, with the archive digest **and** the extracted executable's digest, on the identities row 12's operator request and the candidate template already carry. |
| `.github/workflows/ci.yml` | `0aa4ce17a00452ec37425fa7ea70da3d1f25b254a1eef1d7f080aa0e26c60e69` | The checksum-locked install step installs the pinned Deno beside Archgate and Trivy, extracting a zip for Deno and a tarball for the others and verifying the executable's own digest; a new step runs the Deno collector **before** the coverage floor, tolerating the collector's truthful exit 1 and refusing a missing receipt. |

The Deno collector's step tolerates exit 1 because the Deno surface's floor is unmet and the exit is truthful; the **binding is by receipt, not by exit status**, and the Node collector refuses a receipt it cannot attribute. Any other exit is a real failure.

**Verification of the fix, locally.** The workflow parses; the protected-path policy check passes on the changed tree — `kind: spec (superman-v0)`, `G8 traceability: n/a (spec-kind)`, `changed files: 171`, **`pr-policy: pass`**. The manifest that froze the published bytes is **historical**: it froze `be4c188`'s tree, and this fix changes three paths — the two above and this record.

**What remains.** The three legs must run green on the new head; the `deno-candidate` legs are a **separate** publication (the template's file name under `.github/workflows/` is André's call); the three native candidate proof runs and the live forge evidence are the operator lanes; and the exact-head approval and the merge are André's.

#### The first hosted result of the fix, and its own defect — 2026-11-07

**The first fix attempt failed in the install step, not in the coverage step.** The head `6225698` produced:

```text
bootstrap (macos-15)          fail  46s   (the install step)
Error: Command failed: unzip -o -q …/superman-deno/asset.zip -C …/superman-deno
caution: filename not matched:  -C
```

**The cause was the fix's own typo, not the design.** `-C` is a `tar` destination flag; `unzip` has no `-C` and extracts to the current directory unless given `-d`. The candidate template already had it right — `unzip -o -q "$DENO_DIR/deno.zip" -d "$DENO_DIR"` — and the bootstrap step was changed to match the template rather than the other way round. The corrected invocation is `unzip -o -q <archive> -d <directory>`.

This is recorded rather than smoothed over: the hosted run is the only thing that can catch an invocation that no local run exercised, because the install step's archive handling runs only on the runner.

#### The three hosted failures, diagnosed with three tight loops — 2026-11-07

**Outcome:** the three red runs are diagnosed, each with a command that goes red on the broken form and green on the fixed one, and each fix is committed. **This is not an acceptance of the merge:** nothing here accepts a hosted merge or ticket 01.

**The diagnosis discipline.** No failure was diagnosed by reading the diff. Each one has a loop that produces the runner's *own* symptom locally, and each loop was shown red on the broken code and green on the fixed code.

| # | Failure | The loop | Red on the broken form | Green on the fixed form |
| --- | --- | --- | --- | --- |
| 1 | `Coverage Deno measurement receipt is absent` | `node .superman/ci/coverage.ts --mode full` in a tree with no Deno receipt | `Coverage Deno measurement receipt is absent: .superman-ci/coverage-deno-*/coverage-receipt.json` — and it refuses **before** measuring, so the loop is seconds | the workflow produces the receipt first, so the collector binds it |
| 2 | `unzip: caution: filename not matched: -C` | `unzip -o -q asset.zip -C <dir>` against a zip | `caution: filename not matched:  -C`, and nothing is extracted | `unzip -o -q asset.zip -d <dir>` extracts the binary |
| 3 | the parity assertion could not match the runner's failure text | the runner's own captured bytes, `AssertionError\x1b[22m: expected 1 to be 2` | the raw text does **not** match `/AssertionError: expected 1 to be 2/` — the terminal's escape sits between the words | stripping the escapes matches it |

**What the loops could not do, stated plainly.** Failure 3's loop could not be reproduced *in situ*: the runner gives its steps a pseudo-terminal, and neither `FORCE_COLOR=1`, nor `CI=true`, nor `TERM=xterm-256color`, nor running the test under a pty, made the local child colour — Vitest 5.0.5 colours only on a TTY, and the child's stdout is piped on both hosts. The loop is therefore a **replay of the captured runner output**, which is the artefact that carries the signal.

**The fix that came out of it.** The assertion now reads the tool's *text* rather than the terminal's colour, and the captured runner bytes are a regression test in their own right:

```text
const coloured = "AssertionError\u001b[22m: expected 1 to be 2";
assert.doesNotMatch(coloured, /AssertionError: expected 1 to be 2/u);
assert.match(stripAnsi(coloured), /AssertionError: expected 1 to be 2/u);
```

That test was shown to be red-capable by mutating `stripAnsi` into a no-op — it failed — and the file was then restored byte-for-byte and re-verified green.

**The Matt prompt that carried the fix**, in the form the record keeps for every executed step:

```text
/implement Work only on the three failures the hosted legs reported on the
published head, and on nothing else. Each failure has a red-capable local
loop; use it, do not reason from the diff.

1. "Coverage Deno measurement receipt is absent" — the published workflow
   never runs the Deno collector, so the Node collector has nothing to bind.
   Register the pinned Deno 2.9.8 for all three platforms in
   .superman/ci/tool-assets.json with its archive digest and its extracted
   executable's digest; install it in the checksum-locked step beside
   Archgate and Trivy; and run the Deno collector before the coverage floor.
   The collector's truthful exit 1 is tolerated — the binding is by receipt,
   not by exit status — and a missing receipt is still refused.
2. "unzip: caution: filename not matched: -C" — `-C` is tar's destination
   flag; unzip has no -C and extracts to the current directory unless given
   -d. Use -d, matching the candidate template, which already had it right.
3. The parity assertion matched the literal text "AssertionError: expected
   1 to be 2" against output a CI runner renders with ANSI colour. Read the
   tool's text, not the terminal's colour, and pin the runner's captured
   bytes as a regression test.

Do not stage, commit, push or publish anything in this invocation beyond the
two policy files and the one test file; do not change a threshold, a floor, a
pin or the candidate workflow template; do not accept the merge. Re-run the
three loops and report each one's red and green.
```

**What the loops show now.** Loops 2 and 3 are green locally. **Loop 1 still shows the refusal, and that is correct** — the refusal is the gate working; the fix is that the workflow now produces the receipt, which only the hosted run can show. That run is the next step.

#### The fourth hosted run: two more causes, both found from the runner's own log — 2026-11-07

**Outcome:** the head `29c29be` produced two *different* failures — the macOS and Linux legs failed in the new Deno measurement step, the arm64 leg failed earlier, in the install step. The Deno measurement itself **worked**: the receipt was produced and the artifact uploaded. Both causes are now fixed.

**Cause 1 — the step's own exit handling.** The step wrote `set -uo pipefail` and expected that to tolerate the collector's truthful exit 1. It does not: the runner's shell runs the script with `-e` already on, and `set -uo pipefail` only *adds* flags — it never turns `-e` off. So the collector's exit 1 aborted the step, and the coverage step never ran. The step now wraps the collector in `set +e` and restores `set -e` before the receipt check, so the exit 1 is tolerated, any other exit is a real failure, and a missing receipt still fails the step.

**Cause 2 — the arm64 runner has no `unzip`.**

```text
Error: spawnSync unzip ENOENT
```

The macOS and Linux images ship `unzip`; the self-hosted arm64 runner does not. The install step's dependency on it was invisible until a runner without it ran. The **candidate template has the same dependency** — `unzip -o -q "$DENO_DIR/deno.zip" -d "$DENO_DIR"` — so the candidate legs would have failed the same way.

**The fix removes the host dependency instead of requiring a host change.** `.superman/ci/extract-zip.ts` reads a zip with Node's built-ins only (`node:zlib`'s `inflateRawSync` ✓ and the archive's own central directory ✓), and both the bootstrap workflow and the candidate template use it. The extraction is therefore the same on every platform, and it is covered by the repository's own tests rather than by a runner's image.

**The loop.** A zip built by the independent `zip` tool, extracted by the module:

```text
$ zip -q real.zip deno                 # method 0, stored
$ zip -q -9 deflated.zip deno          # method 8, deflated
entries: [ 'deno method=0 size=12' ]
content matches the original: true
```

and the unit suite (`6 tests, 6 pass`) builds its own archives so it cannot drift from the format it reads. The extractor was also checked against the workflow's exact import form — `await import(new URL('.superman/ci/extract-zip.ts', \`file://\${process.cwd()}/\`).href)` ✓ — which loads ✓.

**What this round costs and buys.** Two new files under `.superman/ci/`, one of them a test that runs in the coverage inventory ✓ so the helper is measured like any other enforcement-core code ✓. In exchange the workflow and the candidate template no longer depend on a tool the arm64 runner does not have ✓ — which is a *host prerequisite* the operator request already asks about ("the actual tools and software on each host") ✓, now removed rather than provisioned ✓.

#### The fifth hosted run: the extracted binary was not executable — 2026-11-07

**Outcome:** the head `4bf56cb` failed in the install step on all three legs, with one cause. It was **this round's own regression**, not an environmental difference: the previous round replaced `unzip` with the repository's own reader, and the reader wrote the extracted file with the default mode.

```text
Error: spawnSync /…/_work/_temp/superman-deno/deno EACCES
```

**The cause.** `unzip` preserved the archive's recorded permissions, so the extracted executable was executable ✓. The repository's reader writes the content and says nothing about the mode, so the file landed as `0644` — and executing it is `EACCES`. The previous round's `unzip` path had been passing *by accident*, on the archive's recorded mode, and the accident ended when the reader replaced it.

**The loop**, which is the same mode in two lines:

```text
plain.bin mode: 644
exec.bin  mode: 755
executing the non-executable one: EACCES
```

**The fix** sets the executable bit where the fact lives — these are *tools*, and a tool must be executable — rather than trusting the archive to record it:

```ts
writeFileSync(join(directory, tool), zipContent(bytes, entry), { mode: 0o755 });
```

Both the bootstrap workflow and the candidate template set it ✓, so neither depends on what a particular archive happens to record ✓.

**What this round is, in the record's own terms.** Five hosted rounds, five causes, and **four of them were environmental** — a workflow that never ran the collector, a shell flag that did not do what was meant, a missing host tool, a terminal's colour codes. The fifth was mine: a replacement that preserved the content and dropped the permissions. Each was invisible to the local suites, which passed throughout ✓✓✓✓✓, and each cost one round ✓. The hosted evidence is not a formality over a local result — it is the only thing that could see any of them ✓.

#### The sixth hosted run: two platform-dependent assertions — 2026-11-07

**Outcome:** the head `80664c1` got past the install step and the Deno measurement on every leg — the macOS leg ran **9 m 30 s** against 43 s before — and then failed on one test per host. Both causes were our own assertions, and both are fixed.

**Cause 1 — the colour assertion, in the copy I did not fix.** The previous round made the staged-G9 parity assertion read the tool's text rather than the terminal's colour — in the **Deno** suite. The **Node** suite's copy at `.superman/ci/raw-routing.test.ts:647` asserted the same literal text and was still live. It is fixed now, with the same `stripAnsi` helper ✓.

**Cause 2 — a digest pinned to one platform.** `.superman/deno-bootstrap/tests/transition.test.ts` asserted the Deno executable's digest against a hardcoded **darwin-arm64** value, so on the Linux legs it compared `368bca08…` (linux-x64) with `d1e99265…` (darwin-arm64) and failed ✓. The test's own name says it binds *the local* result ✓ — the expected value now comes from `tool-assets.json`'s entry for the running platform ✓, which also checks that the platform's digest is **registered** ✓.

Two related assertions were pinned to the same platform's bytes and are now platform-neutral: the Archgate identity is asserted as the **pinned version the binary reports** ✓ — its executable digest is registered per platform only as an *archive* digest ✓ — and the "the unpinned Archgate is not the reviewed one" assertion compares **versions** ✓ for the same reason ✓.

**What this round says about the assertions themselves.** Both failures were assertions that *could not* hold on two of the three platforms, and one of them was a literal-text match against output whose shape depends on the terminal. A test that asserts a value the environment does not determine is a test that will fail somewhere ✓ — and the runner is where "somewhere" is ✓.

**The coverage re-measurement, with the extractor now in the inventory** — 20 files ✓:

```text
node       lines 2690/2802 (96.00 %) · statements 3010/3160 (95.25 %)
           branches 2420/2682 (90.23 %) · functions 407/420 (96.90 %)   → verdict "pass"
candidate  lines 94.77 % · statements 88.76 % · branches 78.50 % · functions 94.87 %   → carried
deno       lines 46.96 % · statements 47.03 % · branches 35.94 % · functions 51.52 %   → carried
```

The `node` inventory's branch margin is **0.23 points** — the extractor's own branches took some of the previous 0.47 ✓ — and the floor still holds ✓.

#### The seventh hosted run: a gate's own critical case could not pass in the gate's context — 2026-11-07

**Outcome:** the head `0189695` ran the whole pipeline on every leg — the macOS leg 10 m 18 s, linux-x64 8 m 45 s, arm64 6 m 18 s — and failed on two assertions that no local run could reach. Both are fixed, and both now have a local loop.

**Cause 1 — the G6 gate could never pass, because one of its own critical cases failed when the gate ran it.** The G6 gate runs its declared cases with `SUPERMAN_CRITICAL_CASE_CHILD=1` set, so that a case which runs the gates cannot run the declared cases again. The `duplication-and-mutation-evidence` critical case evaluates the G6 gate **in process**, so it inherited that guard: the nested gate skipped the declared cases, reached the ratchet branch instead, and refused with `G6: reviewed superman.ratchet.json is missing` rather than the `G6: declared critical case declared-case failed` the case asserts. The gate runs that case, so **the G6 gate could not pass on any runner.**

The Node suite's equivalent test does not have this problem because it drives the gate **through the driver** — a fresh process, with no inherited guard. The critical case evaluates the gate in process, so it now does what the Node suite's test does in effect: it evaluates the gate as a fresh evaluation, with the guard cleared. The case's declared cases are plain files that never run the gates, so the recursion the guard prevents cannot occur in that fixture.

**The loop**, which is fast and reproduces the runner's exact failure:

```text
$ pnpm exec vitest run … duplication-and-mutation-evidence.critical.test.ts
  Test Files  1 passed (1)          # standalone
$ SUPERMAN_CRITICAL_CASE_CHILD=1 pnpm exec vitest run … duplication-and-mutation-evidence.critical.test.ts
  Test Files  1 failed (1)          # the runner's context
```

Both contexts pass now ✓.

**Cause 2 — the Trivy delegation assertion could not hold on linux-x64.** `raw-routing.test.ts` asserted that the CI run's G11 is `n/a` with a `delegated` reason. G11 is delegated to the required linux-x64 CI leg, so on that leg the CI run **scans** and passes. The assertion now follows the platform's delegation ✓.

**What this round is about.** Both failures were assertions that could not hold on two of the three platforms, and one of them was an assertion that could not hold in the *only* context that matters — the gate's. A test that asserts what the environment determines is a test that will fail somewhere, and the three legs are that somewhere. The discipline that finally made these visible was the same one the whole preparation rests on: **the evidence comes from the real thing, and the loop reproduces the symptom, not a theory of it.**

#### The eighth hosted run: the G6 gate refuses the Gate-1 PR that changed the quality policy — 2026-11-07

**Outcome:** every leg now runs the whole pipeline and fails at **exactly one gate, with exactly one message** — G1 to G5 and G7 to G11 all pass ✓.

```text
G6: G6: quality policy changed or unavailable; Gate 1 baseline refresh required: .gitignore
```

**This is the gate working as designed, not a defect.** The G6 gate requires every quality *measurement input* to be byte-identical between the base and the head — `.gitignore`, `bootstrap.json`, `pnpm-lock.yaml`, `.npmrc`, `.jscpd.json`, `stryker.config.json`, `vitest.config.ts`, `tsconfig.json`, the ignore files and the declared policy inputs. The base of this branch is the bootstrap commit, which carries none of the enforcement core, so **every one of those inputs differs** and the gate names the first in sorted order.

**What the refusal means.** The gate is saying: *this PR changed the quality policy, so the old baseline is invalid and a Gate 1 baseline refresh is required.* The repository's own suite pins that semantics: the test **"a first-baseline follow-up cannot change measurement inputs"** writes a fresh baseline on a `spec/` branch, changes `.jscpd.json`, and requires the refusal.

**The gap the run exposes.** §5.4 says "A tool, profile or policy change invalidates the old baseline; **reinitialization needs the same reviewed, exact-measurement path**", and the gate carries a reinitialisation path — the candidate's own reviewed `superman.ratchet.json`, on a spec-kind branch — which is exactly what this PR is. But that path cannot be reached here: the gate compares the **base's and the head's** measurement inputs *before* it will accept the fresh baseline, so the one PR that is allowed to refresh the baseline is the one PR the gate refuses. The repository carries no `superman.ratchet.json` at any revision, and the base has no enforcement-core files, so the reinitialisation branch is not entered either.

**What is left to decide.** This is a gate-semantics question, and it is André's:

1. **Anchor the comparison to the baseline, not to the base's blobs.** The gate already records the candidate's `qualityInputsHash` in the baseline; comparing the candidate's hash against *that* — rather than comparing the base's and the head's blobs — would let a Gate-1 policy change be measured by the same reviewed path and anchored to the fresh baseline, while a later PR that quietly changes an input still refuses because the candidate's hash no longer matches the recorded one. That is the same protection the existing "a first-baseline follow-up cannot change measurement inputs" test pins, one step earlier in the lifecycle.
2. **Record the refusal as a known limit** and carry the Gate-1 baseline refresh as a separate, separately authorised change — which leaves this PR's G6 red and therefore unmergeable under §9.2.
3. **Something else André prefers**, including treating this PR's policy change as the sanctioned first-baseline PR and adjusting the gate's inputs comparison to permit exactly that.

Whichever is chosen, the enforcement core's **first** baseline — its duplication percentage, its mutation score and its raw survivor list — has to be *measured* and then treated by André, because §5.4 says a first measurement within critical scope "requires André's survivor treatment before activation/merge, not silent weak initialization" ✓.

### Step 12 — exact-source replacement and transition proof

#### Step 12 local half record — 2026-11-04

**Outcome:** the local half of row 12 is implemented and recorded in two new files — `.superman/deno-bootstrap/ci.template.yml` (the candidate workflow template, outside workflow discovery) and `.superman/deno-bootstrap/tests/transition.test.ts` (the transition fixture) — and the transition is proved over the two policy surfaces before any publication. The fixture's nineteen tests pass; the three native candidate proof runs, the live forge evidence and the publication remain operator lanes and were not performed. **This record is not an acceptance.** Nothing here accepts a Deno pin, a native profile, an evaluator activation, a workflow publication, ticket 01 admission or a readiness change, and no acceptance record was written. The template was not copied into `.github/workflows/`, not published, and not staged, committed or pushed. Node 26.5.0 still executes every required gate; the Deno root remains a parallel, non-admitting successor.

**Scope.** Exactly two files were created, both under the row 12 file allowance and both under `.superman/deno-bootstrap/`. `.github/workflows/**`, `.superman/ci/**` (except this record and the evidence append), `.archgate/**`, `knip.json`, `biome.json`, `.jscpd.json`, `stryker.config.json`, `package.json`, the lockfiles and the skill pin are byte-unchanged. No hosted write, no installation, no network fetch, no ticket-status or readiness change. Every fixture writes to an `mkdtempSync` root.

**What the template declares.** One job, `deno-candidate (${{ matrix.os }})`, over the three recorded native platforms and their recorded runner label sets — including the arm64 leg's own `r3dlex-linux-arm64` group — each leg binding the recorded `v2.9.8` `deno` and `denort` archive names, archive digests and extracted-executable digests. The source is checked out with `fetch-depth: 0`, `HEAD_SHA` and `BASE_SHA` are bound to the pull-request head and base commits, and `GITHUB_SHA` is never overridden, so the Deno raw gates perform the H/B/M verification themselves. The Deno subjects run under the operational Deno root's reviewed profile — the launch flags and the permission classes produced by the exec seam's own `denoPermissions()` builder — with no blanket grant, no prompt escalation and no ambient configuration discovery. The receipts land in the candidate namespace `.superman-ci/deno-bootstrap/<platform>/` and are uploaded as `deno-candidate-<platform>`.

**What the fixture proves.** It reads a workflow the way the row 9 workflow rule reads it, so the fixture sees the template the way the rule that will judge it does. It proves the transition (three producers added, none removed, none changed), that the Node-side result stays the required result (the required producer set is identical before and after, and a promoted candidate result is visible), that the candidate route selects nothing by environment, file presence or availability, never falls back to the Node evaluation, carries the reviewed profile with no blanket grant, calls none of the banned Deno subcommands, covers exactly the three recorded platforms, binds the recorded tool identities, keeps its artifacts in the candidate namespace and binds the exact source under test. It also drives the real row 9 rule over the template as it would be published — including the activated form, in which the rule is live — and it drives the candidate route's own raw gates over a disposable repository to show that the expected forge evidence names the tested merge by its parent pair and that the head alone is refused with `G9: tested merge is not the recorded base/head integration`.

**The profile assertion was a false green and is corrected.** The fixture first compared the candidate receipt's profile against a formula it computed itself — `sha256(JSON.stringify({ stages, quality }))`, with no `driver` key — so it could not see a change in the Node original, and it agreed with a Deno port that had drifted the same way. It now runs the approved-base Node route and the candidate Deno route over the same tree with the same environment and compares their receipts' profiles: the same shape, the same reviewed `policy` `bf456663…` and `tools` `ce3ef474…`, and each host's own `driver` (`5bca844a…` against `ac40fd48…`). The correction, its RED, the drift the new comparison sees, and the second defect in the same area — the inherited `NODE_TEST_CONTEXT`, which makes a child report as a test child instead of running its case — are recorded in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 12 local half`.

**Clause-by-clause results against row 12's six clauses.**

1. **The transition is fixture-proved before publication — met, for the local half.** The approved-base policy (`.github/workflows/ci.yml`, unchanged against `HEAD`) and the merged policy (that base plus the candidate template) run through one reader, and the difference between them is exactly the declared transition: the three `deno-candidate (<os>)` producers added, none removed, none changed. There is no environment, file-presence or availability switch — each of those three is a guard that was shown reachable with the input that reaches it and the outcome it produces — and there is no Node fallback: a candidate step that reached the Node evaluation surface is refused by name. Publication has not happened.
2. **Node stays the required evaluator — met.** The required check producers stay `bootstrap (macos-15)`, `bootstrap (ubuntu-24.04)` and `bootstrap (ubuntu-24.04-arm)` under the `github-actions` app id `15368`, the policy's `requiredChecks` array is byte-equal to `HEAD`'s, and the candidate proof is additional: it is not in the required set, and promoting a candidate result onto a required name is visible in the fixture's producer count.
3. **Fresh complete local checks bind the exact source under test — met for the local half.** The local result names the exact source (`62c8495aeffa33d827c481e661f6083f8bc718d4`, a commit id, not a range or a branch), the tool identities (the pinned Deno 2.9.8 at `d1e99265…6980ba` and the pinned Archgate 0.61.0 at `be740ac0…c3c0b5e`; the repository's own 0.43.0 archgate does not match) and the permission profile identity (the template's own flags against the exec seam's reviewed profile). The candidate receipt binds the same three identities: the source shas, the tools and `profile.driver`/`profile.tools`/`profile.policy` — and the profile is compared against the Node original's own receipt, never against a formula this fixture computes.
4. **All three native candidate proof runs bind the same source, tools and profiles — the dispatch is proved; the runs themselves are an operator lane.** The template dispatches all three recorded platforms with the recorded source binding, the recorded tool identities and the reviewed profile, and a missing or unrecorded platform is refused by the fixture rather than skipped, narrowed or reported `n/a`. The runs themselves are the operator request's §3 and were not performed.
5. **Raw forge completeness is verified, not assumed — the expectation is proved; the forge check is an operator lane.** The fixture computes the expected producers, artifacts and the H/B/M relationship, and proves against a real merge that the tested merge is identified by its parent pair and that the head alone is refused. Checking the live forge is the operator's step after publication.
6. **Final acceptance is complete and every publication operation is authorized first — not reached, and nothing published.** The artifact, profile, Archgate and live-setting acceptances are André's, the native runners and the forge evidence are the operator's, and no workflow was published, copied or pushed by this slice.

**Carried limits.**

- **The template is a separate candidate workflow, not a replacement of `.github/workflows/ci.yml`.** Copying the approved-base workflow into the template would carry its `node:child_process` line into `.superman/deno-bootstrap/`, which SUP-002 scans, and would change the Node required route. The file name the template takes under `.github/workflows/` at publication, and the point at which it becomes a workflow, are a separately authorized decision.
- **The candidate proof's coverage step is expected to be red today.** The Deno scope's four metrics are 23–41 % against ≥90 % floors and the floor binds at the merge-bound cutover, so the candidate's coverage step reports the truth about the surface. Nothing here depends on it.
- **No compile route is in the template.** The `denort` archives are fetched and verified because the operator request's step 1 says to verify the candidate archives and the extracted executables' own digests, but no accepted compile argv exists yet and adding one would invent a profile.
- **The fixture runs the candidate route's raw gates over a disposable repository**, not over this repository: a complete local run binds a committed snapshot and this tree carries a large uncommitted delta.
- **The fixture does not contribute to the Deno scope's coverage numbers**; it removes `DENO_COVERAGE_DIR` from the child environment it hands the Deno runtime.
- **Four advisory Biome findings remain in the new file** (`info`-level under the reviewed 15/50 advisory calibration, non-blocking). They are reported, not hidden.
- **One failure was open earlier in this round and is now green.** The Deno quality gate's equivalent-scope parity test failed with `G5: the declared duplication corpus or clone floors changed (src/**/*.mts, 50 tokens, 5 lines); Gate 1 baseline refresh required`; moving this slice's two files aside reproduced it identically, so it belonged to row 10's in-flight correction. Row 11's re-sync landed during this round and the three suites are green together.
- darwin-arm64 only; no pin acceptance, no native-profile acceptance, no activation, no workflow publication, no ticket 01 admission.

**Verification commands and exit statuses** (darwin-arm64, Node v26.5.0, the pinned Deno 2.9.8 and the pinned Archgate 0.61.0).

| Command | Exit | Result |
|---|---|---|
| `SUPERMAN_DENO_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/transition.test.ts` | 0 | 19 tests, 19 pass, 0 fail |
| `SUPERMAN_DENO_BIN=<pinned> ARCHGATE_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/transition.test.ts` | 0 | 27 tests, 27 pass, 0 fail |
| `SUPERMAN_DENO_BIN=<pinned> ARCHGATE_BIN=<pinned> node --test --test-concurrency=1 .superman/deno-bootstrap/tests/launch.test.ts .superman/deno-bootstrap/tests/bootstrap.test.ts .superman/deno-bootstrap/tests/transition.test.ts` | 0 | 44 tests, 44 pass, 0 fail (the G5 quality-parity failure that was open earlier in this round is green after row 11's re-sync landed) |
| `<pinned Deno> deno check --no-config --no-lock --no-npm --no-remote .superman/deno-bootstrap/*.ts` | 0 | clean over all eleven operational modules |
| `<pinned Deno> deno check --no-config --no-lock --no-npm --no-remote .superman/deno-bootstrap/tests/transition.test.ts` | 0 | clean |
| `<pinned Archgate> check --strict --output json` | 0 | `"pass": true, "total": 16, "passed": 16`, 0 findings |
| `<pinned Archgate> check --base <origin/main> --strict --output json` | 0 | `"pass": true, "total": 16, "passed": 16`, 0 findings |
| `<pinned Archgate> check --strict --output json -- <tracked files> <the two new files>` | 0 | `"pass": true, "total": 16, "passed": 16`, 0 findings |
| `node_modules/.bin/biome check .superman/deno-bootstrap/tests/transition.test.ts` | 0 | 4 infos, 0 errors, 0 warnings |
| `<pinned Deno> run --no-prompt --no-config --no-lock --no-npm --no-remote --allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/coverage.ts` | 0 | the receipt `.superman-ci/coverage-deno-1gCOta/coverage-receipt.json` written; `verdict` **`fail`**; lines 571/1732 (32.96 %), statements 631/1909 (33.05 %), branches 466/1911 (24.38 %), functions 103/241 (42.73 %) against the ≥90 % floors, carried as the obligation that binds at the merge-bound cutover |
| `pnpm exec tsrs --noEmit` | 0 | clean |
| `git diff --check` | 0 | clean |
| `git status --porcelain` | 0 | 54 entries; the only paths this slice created are the two named files |

The guard-by-guard reachability record — the input that reaches each guard and the outcome it produces — is in `.superman/ci/bootstrap-evidence.md` under `2026-11-04 — Row 12 local half: the transition fixture and the workflow template`.

**Re-sync with row 10's correction round — 2026-11-04.** The Deno sibling was re-synced with the corrected Node originals after row 10's correction round changed `.superman/ci/quality.ts`, `.superman/ci/raw-gates.ts` and `.superman/ci/direct-gates.ts`; the sibling still implemented the pre-correction semantics and its parity fixture failed (`not ok 7 … expected: 0, actual: 1`). All three ports were re-derived from the corrected Node originals rather than patched, so each sibling's diff against its Node original is now exactly the runtime transform: the exec-seam import, `Deno.env`/`Deno.cwd()`/`Deno.exitCode`, the module's own location from `import.meta.url`, the `await` boundaries the asynchronous owned-child requires, the Deno launch of the pr-policy, `Deno.build` for the platform, and the explicit Node runtime identity probe. The corrected taxonomy, the undeclared-stage fallback, `assertFullStage`, the new `runProfile` and its `driver` identity, the G5/G6 dispatch that now lives in `raw-gates.ts`, the applied corpus and mutation scope, the baseline-hash guard, the deleted-critical-module failure and the fresh execution of every declared critical case with its declared runner are the Node original's, byte for byte. One divergence is recorded: a declared `node-test` critical case is run with the Node runtime named as `node` through the same `PATH` the Node original's environment provides, because the Deno runtime's `process.execPath` is the Deno executable; the runner, the arguments, the case, the outcome and the failure kind are unchanged. Each guard the corrected contract exposes is shown reachable and shown changing the outcome against both hosts, and the two-host comparison the corrected contract introduces is proved: the two receipts carry the same profile shape, the same tool identity and the same policy identity, and each host's `driver` identity is its own. One consequence is in row 12's file and not in this slice's: `.superman/deno-bootstrap/tests/transition.test.ts` asserts the candidate receipt's profile against the pre-correction formula, so its recorded expectation is stale against row 10's correction — and it was green before the re-sync only because the Deno sibling still implemented the pre-correction shape, which is a false green in that fixture. It is reported, not edited, because it belongs to row 12 and is outside this slice's fence. Its consequence is that the Deno collector's own measurement — which runs the root's process suites, that suite included — stops with `Coverage process tests failed` on that one test, so the Deno root's four-metric measurement cannot complete until row 12's fixture is updated to the corrected profile formula. The full re-sync record, the reachability table and the RED→GREEN of the harness defect that stopped the declared critical cases from executing are in `.superman/ci/bootstrap-evidence.md` under `Row 11 re-sync — 2026-11-04`.

## Gate 1 — the baseline identity, the mutation gate's cost, and the per-pull-request form of G6 — 2026-11-07

**André's decisions, in the order he made them.**

1. **Anchor the check to the baseline** — the G6 measurement-inputs check.
2. **Keep G6 on the pull-request leg, narrow its scope to a minute, and give the whole scope to the nightly.** The mutation gate stays a pull-request gate; its pull-request scope is declared and small, and the nightly applies the whole declared scope with the hours the measured rate needs.
3. **The full CI must take at most 15 minutes in all cases.**

### The baseline identity — what changed and why

§5.4 says a tool, profile or policy change invalidates the old baseline and that reinitialization needs the same reviewed, exact-measurement path. The gate could not reach that path: it compared the approved base's measurement inputs with the candidate's *before* it would accept a fresh baseline, so the one pull request allowed to refresh the baseline was the one pull request the gate refused.

The measured identity is now computed over the **candidate's** measurement inputs, and the two ways a recorded identity can fail to match are named apart, because only one of them is a lie:

| The recorded identity | What it is | The refusal |
| --- | --- | --- |
| the candidate's own measured identity | the first-baseline follow-up, recorded correctly | accepted |
| the approved base's own identity, while the candidate's inputs have moved | a stale record of the inputs from before the move | `changed measurement inputs` |
| neither | a hash that matches nothing | `forged qualityInputsHash` |

So the Gate-1 baseline refresh — the one change a spec-kind pull request may make to the measured inputs themselves — is reachable: the first-baseline follow-up may change a measurement input provided it records the candidate's own measured identity. Two tests carry it: one refuses the follow-up that records the pre-change identity, and one accepts the follow-up that records the candidate's own.

**The hash schema moved with the change**: `/1` to `/2` for the identity's shape, and `/2` to `/3` when the identity became lane-independent (it covers the *declared* scopes, not the applied one, so a baseline recorded in one lane is the baseline the other compares against). The repository has no baseline yet, so there is no old one to be read against the new one.

### The mutation gate's cost — two defects, both found locally, neither ever executed

The mutation gate had never run on this repository. The CI job's timeout is 30 minutes, and the leg could not have completed inside it. The measurements below are the first ones taken over the real tree, with the pinned Stryker 10.1.1 and Vitest 5.0.5:

| Measurement | Value |
| --- | --- |
| The declared mutation scope (`.superman/ci/**`, tests excluded) | 12 files, 6,036 lines |
| The mutants in that scope (Stryker's own instrumenter count) | **8,783** |
| The measured rate | 46 mutants/minute across nine workers (about 12 s per mutant) |
| Stryker's own estimate for the whole scope | about 50 minutes on this ten-core machine |
| The steady-state form's per-run cost | all six declared critical modules measured at **both** revisions on every run: about 84 % of the scope, about 14,800 mutant-runs |
| The CI job's timeout | 30 minutes |

Two defects follow from those numbers, and both are design faults rather than environment faults:

1. **The initialization path measured the whole scope.** The approved base (`main`) holds only a README, so there is no approved-base scope to compare against, and the gate's initialization path measured everything instead of reporting that there is nothing to compare. The 8,783-mutant measurement is a full-corpus run, and §5.4's G6 row gives the full-corpus run to the Nightly column and gives the per-pull-request column an equivalent-scope comparison.
2. **The steady-state path measured the whole critical mapping, not the change.** The critical modules were measured at the base and the candidate on every run, whether or not they changed. The comparison that the introduced-survivor rule needs is over the change's scope; measuring an unchanged module at two revisions measures the same mutants twice and proves nothing.

### André's resolution, and what the pull-request leg now carries

The mutation scope is **declared twice**, and each lane applies the one it declares:

| Lane | Declared scope | What it carries |
| --- | --- | --- |
| The pull-request leg (`pre-pr`, `ci`) | `quality.mutation.pullRequestScope` — the product source | The narrowed measurement, compared at base and candidate, plus the declared critical cases executed fresh |
| The nightly and the owner's reviewed run (`nightly`, and a scoped `G6` run) | `quality.mutation.scope` — the whole declared scope | The uncached full run against the full-repository baseline, and the critical policy |

The narrowed scope is **declared, not derived**: an undeclared scope is not a smaller one, and the reviewed policy is the only place a scope may be narrowed. A pull-request receipt names the scope it applied.

The **fresh critical acceptance** stays on the pull-request leg. It is §5.4's own requirement — "every applicable full pre-PR/PR evaluation executes these cases fresh outside affected selection and result caches" — and it is not the mutation gate's: it is a separate named requirement that the mutation gate had been carrying as a side effect. It now runs explicitly, and its outcome is in the receipt whether or not the narrowed scope has any source in it.

The nightly leg applies the whole declared scope and measures it whole, at the previous `main` and at `main`: it is the uncached full run. It runs on the schedule event, on `main` — a post-merge run has no pull-request identity, and the driver now says so by name instead of refusing the event. Its job timeout is the hours the measured rate needs: **360 minutes on the schedule, 30 on every pull request**. The nightly's path policy is `n/a` — a post-merge run is not a pull-request kind — and the red-green replay is `n/a` there, because there is no pull request to replay.

**The lane model, exactly.** Three lanes, one declared scope each, and the equivalent-scope comparison is every lane's contract except the nightly's:

| Lane | The stage that selects it | The declared scope | What it measures |
| --- | --- | --- | --- |
| `pull-request` | `pre-commit`, `pre-pr`, `ci` | `quality.mutation.pullRequestScope` | the change, at base and at candidate |
| `full` | a scoped `G6` run | `quality.mutation.scope` | the change, at base and at candidate |
| `corpus` | `nightly` | `quality.mutation.scope` | the whole scope, at the previous `main` and at `main` |

The identity hash is **lane-independent**: it covers the *declared* scopes, not the applied one, so a baseline recorded in one lane is the baseline the other compares against. The hash schema moved from `superman.bootstrap-quality/2` to `/3` with that change.

**What the pull-request leg now costs.** In this repository the narrowed scope is empty (the product's `src/**` does not exist until ticket 01), so the pull-request G6 leg measures nothing and reports the declared critical cases' execution: about ten seconds, against the minute André set.

### Two more defects the local clone's own gate run exposed

The clone of the pushed branch ran the driver's own gates locally, and two things in that run were not what the suites had shown:

1. **The quality tool runner killed every tool after two minutes.** `qualityRunner` gave every tool a 120-second budget ✗ — enough for the pull-request scope ✗ and nowhere near enough for the whole scope ✗. The full-corpus run was killed at the two-minute mark and produced no measurement at all ✗. The budget now follows what is measured: the change alone keeps the two minutes ✓, and the whole scope — the corpus lane ✓ and the initialization and first-baseline paths that measure it whole ✓ — is given the four hours the nightly's job allows ✓.
2. **The pull-request leg was red over an unused export.** `MutationLane` was exported and imported by nobody ✗, and knip reports unused exports as issues ✗ — and the G3 gate refuses a run whose issues its model does not account for ✗. The type is internal now ✓.

Neither was visible to the suites: the first needs the full scope to reach ✗, and the second was in a file the suites type-check but do not lint for dead exports ✗. The local clone's own gate run is what found both ✓ — the same acceptance object that the artefact rather than an inspection has to be ✓.

### The coverage floor caught the nightly's untested paths

The first hosted round with the new gate code failed in the coverage step, not in the gates: **the node inventory's branch coverage fell to 89.83 % against the 90 % floor**. The new nightly paths — the corpus lane, the nightly's base and branch, the post-merge path policy, the replay exemption — were behaviour with no test, and the floor refused them.

That is the floor working as ADR 0014 intends: *"improve meaningful tests instead"*. The remedy was four tests, one per behaviour — the nightly compares main against the previous main and refuses any other branch, refuses a pull-request event, replays nothing because there is no pull request, measures the whole declared scope where every other lane measures the change, and the path policy decides no pull-request kind on main. The nightly's branch is now checked wherever the nightly runs, not only inside the continuous-integration identity block, which is where a local nightly run had slipped through.

**The Deno candidate's own coverage moved, and why.** The Deno inventory's four metrics are carried, not met, and they bind at the merge-bound cutover. Round twelve measured them at **45.88 % lines, 45.92 % statements, 35.90 % branches, 52.66 % functions** on the arm64 and macOS legs, against the 46.96 / 47.03 / 35.94 / 51.52 the record carried before this slice. The Deno sibling's new lane paths are not covered by the Deno twin's own suites — the corpus lane has no Deno twin case yet — so the inventory fell by about a point. It is a carried obligation either way, and it is named here rather than left to be discovered at the cutover.

### The first measurement in critical scope — the survivor treatment's input

§5.4: *"First measurement within critical scope, including new critical files, requires André's survivor treatment before activation/merge, not silent weak initialization."* This is that measurement: the whole declared mutation scope, with the pinned Stryker 10.1.1 and Vitest 5.0.5, over the enforcement core at `5d9dd4b`.

| | |
| --- | --- |
| The scope | the whole declared mutation scope — 12 files, the enforcement core |
| The mutants | **8,881** |
| Killed | 1,210 |
| Survived | 1,125 |
| No coverage | 6,541 |
| **The mutation score** | **13.62 %** |
| The wall time | 23 min 40 s at four workers |

The critical mapping's own scope — `raw-gates.ts`, `direct-gates.ts`, `coverage.ts`, `quality.ts`, `pr-policy.ts`, `replay.ts` — is 7,458 mutants: 1,088 killed, 1,080 survived, 5,290 no coverage.

| File | Mutants | Killed | Survived | No coverage |
| --- | --- | --- | --- | --- |
| `quality.ts` | 2,279 | 138 | 99 | 2,042 |
| `pr-policy.ts` | 1,280 | 247 | 369 | 662 |
| `coverage.ts` | 1,135 | 165 | 220 | 749 |
| `direct-gates.ts` | 990 | 144 | 102 | 744 |
| `raw-gates.ts` | 910 | 270 | 208 | 431 |
| `replay.ts` | 864 | 124 | 82 | 657 |
| `node-hosted-candidate-measurement-host.ts` | 696 | 0 | 0 | 696 |
| `archgate-linux-arm64-wizard.ts` | 457 | 0 | 0 | 457 |
| `raw-fixture.ts` | 169 | 117 | 33 | 19 |
| `extract-zip.ts` | 84 | 0 | 0 | 84 |
| `fixture-env.ts` | 16 | 4 | 12 | 0 |
| `critical/fixture-context.ts` | 1 | 1 | 0 | 0 |

**Why three quarters of the scope has no coverage, and why that is a measurement artefact rather than a verdict on the code.** The pinned Stryker runs Vitest, and Vitest's discovery in this repository is the declared critical cases — 36 tests in eight files. The suites that actually exercise the enforcement core are the `node:test` suites (561 tests), and the mutation runner cannot execute a `node:test` file at all. So a mutant is *covered* only if one of the eight critical cases reaches it: 6,541 of 8,881 mutants are not reached by any of them, and they are reported as no coverage rather than as a verdict. The mutation score of 13.62 % is therefore a statement about the runner's test discovery, not about the enforcement core's testedness — the coverage floor measures the same core at 96 % lines through the `node:test` suites.

**The raw outcomes**, which §5.4 asks for by name, are in `.superman-ci/mutation-first-measurement/`: `mutation-report.json` is the pinned Stryker's own report and `critical-survivors.tsv` is every one of the critical scope's 6,370 unresolved mutants with its file, status, mutator, line and replacement. The nightly's receipt carries the same measurement in the continuous-integration run, where the workers fit the runner's memory.

**What the treatment has to decide.** §5.4 allows two resolutions: *meaningful kills*, or *a separate reviewed Gate 1 measurement/equivalence decision with the exact argument and raw outcomes*. The raw outcomes are above. The measurement's own finding — that the mutation runner cannot see the suites that cover the core — is the argument an equivalence decision would have to make, and it is not André's to make by default.

### The CI's own cost, measured on the hosted runner

Round eight's `bootstrap (ubuntu-24.04)` leg, from the hosted run's own step timings — the only measurement of the CI's cost that exists, because the leg had never reached its end:

| Step | Time |
| --- | --- |
| checkout, node setup, the policy preflight | ~3 s |
| `pnpm install --frozen-lockfile` | 18 s |
| the checksum-locked tool install (Archgate, Deno, Trivy) | 37 s |
| the Deno candidate surface measurement | 62 s |
| **the overall coverage floor** | **6 min 0 s** |
| **the raw G1–G11 run, Trivy included** | **71 s** |
| the artefact upload | 35 s |
| **the whole run** | **10 min 33 s** |

The budget André set — the whole CI in at most fifteen minutes — is therefore already met, and the long pole is the **coverage collector**, not the mutation gate. The mutation leg, once it applies the pull-request scope, is the declared critical cases and nothing else.

**Why a random mutant sample cannot serve the comparison.** A sample of the base's mutants and a sample of the candidate's mutants are different populations, so the introduced-survivor rule would measure sampling noise rather than introduced survivors. A deterministic sample (seeded by the mutant's identity) would be comparable, but the budget does not reach it: at the measured 12 seconds per mutant, a one-minute step buys about five mutants, and Stryker's own initial test run — the coverage analysis that precedes any mutant — is 24–38 seconds on its own, so no Stryker leg fits in a minute at any scope.
