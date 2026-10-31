# Overall coverage enforcement — 2026-10-31

**Outcome:** corrected local verification passes **358/358 tests and all eight stages**. Overall coverage is **96.05% lines, 95.30% statements, 93.00% branches and 95.95% functions**, independently above the approved floor. Independent Standards and Spec rechecks have no remaining hard findings in scope. The 100% target is not yet reached. Changes remain uncommitted/unpushed; hosted enforcement and Gate 1 readiness are not established. Spec §5.4 and ADR 0014 own the acceptance contract; this file records evidence, not new policy or authority.

## Approved boundaries and tools

André approved the protected coverage-command process seam with real collectors in tiny owned repositories, supplemental actual exported rule-check tests with controlled external Archgate contexts, and dev-only c8 **12.0.0** / `@vitest/coverage-v8` **5.0.5**. Existing pinned-Archgate process tests remain required engine/parser proof. No product `src/`, quality baseline, cache/provider activation, additional overlay skill, publication, credential use, approval or merge is part of this change.

## Observed red → green slices

Sanitized command records and complete logs live under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-coverage-2SyoRO/`. Every record binds argv, exit status, times and log SHA-256; HOME/TMPDIR are isolated and credential environment variables are absent. Each row below was observed failing before enforcement and passing afterward, not inferred from a final test count.

| Records | Behavior established |
|---|---|
| `floor-01-*` | Passing tests cannot bypass under-90 overall measurements |
| `floor-02-*` | Product source is measured by actual Vitest V8, not just bootstrap code |
| `floor-03-*` | Source coverage-ignore directives cannot inflate results |
| `floor-04-*` | Runtime files outside modeled roots block rather than disappear |
| `floor-05-*` | Additional runtime exclusions cannot shrink the denominator |
| `floor-06-*` | Test-time source changes invalidate evidence and preserve caller bytes |
| `floor-07-*` | Coverage dependency pins and the convenience entrypoint require Gate 1 |
| `modes-08-*` | Incremental requests explicitly fall back to uncached full; nightly remeasures all |
| `counts-09-*` | Enforcement uses covered/total counts, not truncated displayed percentages |
| `method-scope-10-*` | Vitest config cannot omit uncalled class methods |
| `suppression-11-*` | Effective JSDoc and pinned c8's alternate ignore spelling are rejected |
| `output-alias-12-*` | A test-created output alias cannot overwrite caller-owned report-shaped files |
| `revision-13-*` | A test-time HEAD change invalidates otherwise identical source bytes |
| `node-pin-14-*` | Coverage verifies the declared Node identity as well as collector pins |
| `review-sourcemap-15-*` | A mapped smaller source program cannot produce a false 100% pass |
| `review-denominators-16-*` | An unloaded 100-function module contributes all 100 functions and 200 branches, both before and after merely importing it |
| `review-vitest-output-17-*` | Vitest cannot overwrite protected policy through its report-path symlink |

The initial c8 exact-90 positive control wrongly expected 90% lines; c8 counted declaration lines as covered, yielding 100% lines. After the reviewed AST-accounting correction, the unchanged program genuinely measures 90% lines as well as functions, and its assertion now expects that result. These fixture expectations are not enforcement TDD cycles. Formatting and knip initially failed on formatting and literal tool-owned Istanbul loads. Formatting was corrected; tool-owned dependencies are resolved through their pinned tools' locked loaders, without new direct dependencies, ignores or a weakened check.

## Measurements and checks

| Evidence | Observed result / limit |
|---|---|
| Initial full snapshot `measurement-mMQ9BR/` | **247 passed / 0 failed / 0 skipped**; old converter output lines/statements **96.95%**, functions **94.73%**, branches **87.91%**, exit 1. This predates the denominator defect correction and is not current accounting proof |
| Supplemental rule tests | **47/47 passed**; current AST rule scope has 100% lines/statements/functions and 97.96% branches; controlled AST responses are not parser integration proof |
| Corrected collector process tests | **29/29 passed**, including actual 100%, exact-90, overall-not-per-file and all three review reproductions; `coverage-review-corrections.json` |
| Final local checks | All eight stages pass: complete coverage/process run, strict tsrs, reference tsc, full Biome, knip, applicable raw G1–G11, separate fresh local G11 and prospective whitespace |
| Pinned frozen installation | pnpm **12.16.1** `install --frozen-lockfile --ignore-scripts --ignore-pnpmfile` exits 0; lock passes supply-chain policy; no runtime dependency added |
| Workflow structure | `workflow-contract-resolved.json`: parsed YAML confirms the same three required job names/platforms, direct blocking collector call, PR mode `incremental`, nightly at 02:17 UTC, preserved PR policy/H/B/M checks, read-only permissions and always-uploaded artifacts. The first helper invocation used an unresolved pnpm symlink anchor; resolving that anchor fixed the helper, not repository policy |

The inventory has 17 source files. Branch-gap work added 25 public policy-process tests (71/71 policy tests pass) and 70 raw-driver tests/subtests, all through approved seams. No threshold reduction, runtime exclusion or coverage-ignore directive was added. The generated G9 reporter's callback definitions remain measured even though execution of its generated copy is not credited to those original definitions; no private-helper tests or false coverage credit were introduced.

## Independent findings and corrections

**Standards:** one P1. A source map's `sourcesContent` could omit an uncalled function while retaining the inventoried filename and yield a false 100% pass. The unsupported source-map profile now blocks before execution; no mapped source is trusted as original bytes. Original reproduction: `superman-standards-review-SM1gOz/` under the approved temp parent.

**Spec:** one P1 and one P2. c8 represented an unloaded 100-function file by one synthetic function, allowing a false 95% overall pass; Node V8 data is now merged with c8's locked merger and converted against every file's native-strip-preserved AST through the already installed Vitest converter/parser. The regression verifies 119 total / 19 covered functions and 200 total / 0 covered branches, whether or not the 100-function module is merely imported. Separately, Vitest could overwrite coverage policy via its report symlink before postflight rejection. Coverage now travels over an owned pipe; only the parent publishes after input and alias validation. Original reproductions: `superman-spec-review-8595gbde/`.

The first expanded prospective verification, `verification-8Z0ebl/`, passed seven supporting stages but failed coverage because **16 routing tests** lacked the newly declared `coverage.json` policy input. Its process result was **339 passed / 16 failed**, not a percentage pass. Adding that real policy file to the routing fixture restores the affected positive controls without removing policy or changing assertions. Its `sourcePreserved: false` also records the deliberately overlapping review-correction edits to the original checkout; the snapshot itself was immutable and the original index stayed unchanged. This earlier run is retained, not promoted to final proof. The frozen corrected run below replaces it as local verification.

### Standards recheck

**Original P1 closed; 0 remaining hard findings and 0 optional smells in the corrected accounting/publication scope.** Seven independent real-collector probes reject the original map bypass, preserve policy bytes under the product alias, measure identical 19/119 functions and 0/200 branches for imported/unimported modules, and pass actual fully covered Node/product controls. Evidence: `superman-standards-recheck-m3MK5D/{results.json,source-preservation.json}` under the approved temp parent. Reviewer source/index hashes remained unchanged.

### Spec recheck

**Original P1/P2 closed; 0 new hard findings or corrective scope drift.** Sixteen independent bounded checks verify complete imported/unimported denominators, alias rejection with protected bytes preserved, actual 100% positives, exact-90 and overall-95 acceptance, incremental/nightly rejection despite prior perfect reports, and source-map/lowered-floor/additional-exclusion rejection. Evidence: `superman-spec-recheck-9jceqo77/{summary.json,commands.json,driver-identity.json}` under the approved temp parent. Initial evidence remains untouched; no reviewer source edits, credentials, network actions or full-suite duplication occurred.

Summary: Standards **0 open**, Spec **0 open**. These independent bounded results do not substitute for the complete run below or confer approval/merge authority.

## Corrected full local proof

The immutable prospective commit is **`144215cbec82a418ba371f440891faeb98c2f617`**, created only in the owned verification clone, with base **`e9b7551fff4835a53dd716936e68ead7053502f1`**. macOS-arm64 / Node **26.5.0** execution ran **08:01:14–08:09:55 UTC**. Working HEAD remains **`e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`**; no working-branch commit was made.

| Metric | Covered / total | Displayed percentage |
|---|---|---|
| Lines | 1414 / 1472 | **96.05%** |
| Statements | 1585 / 1663 | **95.30%** |
| Branches | 1528 / 1643 | **93.00%** |
| Functions | 190 / 198 | **95.95%** |

All metrics have zero skipped items. Enforcement compares these counts rather than displayed truncation. The receipt records `requestedMode: incremental`, `execution: full`, `cachedFiles: 0`, the explicit inactive-ledger fallback and `mergeAuthority: none`. Current reports cover all 17 inventoried source files, not merely changed files or future product source. The separate JSON/LCOV/text reports retain remaining gaps: 58 lines, 78 statements, 115 branches and 8 functions. The 100% target remains visible; no per-file floor or automatic ratchet is claimed. Node's experimental strip-only API warning is retained in the log, not suppressed.

The complete process result is **358 passed / 0 failed / 0 skipped**. Strict tsrs and matching tsc, full Biome and knip, raw gates, fresh local Trivy and whitespace all exit 0. Raw applicability is explicit: G5/G6 have no product source, G7 is not activated, G8/G9 are spec-kind, and default G11 belongs to the required Linux-x64 leg. A separate local G11 run actually executes Trivy 0.76.1 with all three scanners, dev dependencies and HIGH/CRITICAL failure policy. These local outcomes do not replace hosted platform evidence.

Artifacts: `superman-coverage-2SyoRO/verification-wXdjdd/` under the approved temp parent; coverage reports are in `snapshot/.superman-ci/coverage-8gMsD4/`.

| Artifact | SHA-256 |
|---|---|
| `summary.json` | `8043375df9a06ebb7667124baa8069b62edf2ca8c889d32596078f06fbb2231f` |
| `source-manifest.json` | `84133a0331dea4f8b709d96b5c718818643d465fa5516a8f1b7f9183cc20d1de` |
| `coverage.log` | `fe41d060a7d7d5bc6a9a248c6f3ecb4250f0de0c136a7710f5428827d4806bfc` |
| Coverage receipt | `7220966f49f79615ade505f0e627ca1b796c1b5833ab8826a4d060016db6f97b` |
| Coverage summary | `0483e070df3e318c43663a626d5c99c30dfb8847ad6e853f7b88584039ccdaa7` |
| Raw bootstrap receipt | `bd88b6da77e44149b50e70336667d33936d29cbebe2f4f8b3372a40e6a5a2465` |
| Fresh local G11 receipt | `f3e81749bf9fd30c8c491189a3b8bb553fa3607cb815477beda7051f4cd50b0f` |

The verifier reports **`sourcePreserved: true` and `indexPreserved: true`**. Original index SHA-256 remains **`0815c0494ac9f22b76ffa7691ba3316240ed3d410d1d518187006b88cd6e00ba`**. This document's subsequent results-only update is outside that immutable snapshot; measured code/tests/config/tool inputs are unchanged.

## Remaining authority and hosted work

Local coverage implementation and verification are complete. Obtain separate authorization before any working-branch commit/push or PR update. Hosted PR coverage and actual scheduled execution remain unverified until publication and runs; nightly evidence is not PR admission. The original approved arm64 redistribution/registered-asset, exact hosted three-platform and applicable small-corpus blockers remain, and ticket 01 is not admitted. Incremental coverage reuse stays off until its complete provenance/selection contract is verified in the later activation work.

Next: review `.github/workflows/ci.yml` and this evidence before deciding whether to authorize commit/push and a PR update.
