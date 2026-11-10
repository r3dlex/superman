# Overall coverage enforcement — 2026-10-31

**Outcome:** corrected local verification passes **364/364 tests and all eight stages** (latest re-measurement, commit `45efb48`, 2026-10-31; the earlier snapshot was 360/360). Overall coverage is **96.11% lines, 95.37% statements, 93.07% branches and 95.97% functions**, independently above the approved floor. Independent Standards and Spec rechecks have no remaining hard findings in scope. The 100% target is not yet reached. The changes are committed and pushed on `spec/superman-v0`; hosted enforcement of the corrected tree and Gate 1 readiness are not established. Spec §5.4 and ADR 0014 own the acceptance contract; this file records evidence, not new policy or authority.

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

## Hosted run 41185030855 and the re-measurement that followed

Publishing `294ed4c94c63d2d0bfed351e9b47a07feb542404` started hosted run **41185030855**. The two x64/macOS legs reached the coverage floor and failed there with **358 tests / 350 passed / 8 failed**. All 8 were fixture-environment defects, not coverage-accounting defects: five G11 tests died with `ENOENT` because `raw-fixture.ts` only created the `.tools` sandbox when the self-managed pnpm layout existed (a hosted runner has none), and three coverage tests compared an unresolved `mkdtemp` root against the command's `realpathSync`-resolved root (macOS `TMPDIR` is a symlink). The analysis, the corrections and the Linux-arm64 decision are recorded in [bootstrap evidence](bootstrap-evidence.md).

After the corrections, and after rebasing onto the upstream commits that landed during the repair (`cf5c103`, `5044412`), the same command was re-measured locally on macOS-arm64 / Node **26.12.1** with the pinned archgate **0.61.0** at commit **`3f7f71738a56c891fb4b563c62ba89dcec5349b0`**: **360 passed / 0 failed / 0 skipped**, verdict `pass`, and the recorded metric table is **unchanged**, because the corrected files are test-only or excluded from the measured inventory. The two upstream commits added two tests and changed one measured line in `pr-policy.ts` without moving a single covered/total count.

| Metric | Covered / total | Percentage |
|---|---|---|
| Lines | 1414 / 1472 | **96.05%** |
| Statements | 1585 / 1663 | **95.30%** |
| Branches | 1528 / 1643 | **93.00%** |
| Functions | 190 / 198 | **95.95%** |

| Artifact | SHA-256 |
|---|---|
| Coverage receipt | `416d1556ea6550c47bd7ea4ff3fb9a4701cf9907972e7729bab1e7335c788437` |
| Coverage summary | `2c15013c85bd7c4fcbb7db69de22e03f031ded76b18b2b2bd1dd183b9b3d4520` |
| Raw bootstrap receipt | `e1486d243fe3d33fe6f09c89dc4b1ea32a327bf03da2dee06ebcefec1a103c22` |
| Coverage inputs hash | `bb3a0bfc59ac5d83bfb53f7eabdb8a1275713495de44ff0aa79a4b2aee6a6e08` |

The coverage receipt records `requestedMode: incremental`, `execution: full`, `cachedFiles: 0`, the explicit inactive-ledger fallback, `mergeAuthority: none` and `evaluatedSha: 3f7f71738a56c891fb4b563c62ba89dcec5349b0`. All 17 inventoried source files are represented with zero skipped items.

## Re-measurement after the G9 identity correction — 2026-10-31

The CI identity check in `.superman/ci/raw-gates.ts` compared the `synchronize` payload's `merge_commit_sha` with the checked-out commit by byte equality, a value GitHub does not keep stable (it rebuilds `refs/pull/<n>/merge` after serializing the payload). The correction binds the merge by its parent pair instead; the reasoning, the hosted runs that proved the tested tree was always correct, and the receipt-upload repair are recorded in [bootstrap evidence](bootstrap-evidence.md). The coverage floor, the 100% target, the measured inventory and the enforcement code were not touched by that change.

Re-measured on macOS-arm64 / Node **26.12.1** with the pinned archgate **0.61.0** (darwin-arm64 asset, sha256 verified against `tool-assets.json`) at commit **`45efb48472eedfaf46e0d2035b57e20eec03744a`**: **364 passed / 0 failed / 0 skipped**, verdict `pass`.

| Metric | Covered / total | Percentage |
|---|---|---|
| Lines | 1436 / 1494 | **96.11%** |
| Statements | 1609 / 1687 | **95.37%** |
| Branches | 1545 / 1660 | **93.07%** |
| Functions | 191 / 199 | **95.97%** |

All four metrics have zero skipped items and stay above the 90% minimum in every metric. The inventory gained only the new `gitOptional` helper in `raw-gates.ts` (+22 lines, +24 statements, +17 branches, +1 function); its lines and function are fully covered and the remaining branch gap is the `catch` path a resolvable pointer never takes. The coverage receipt records `requestedMode: incremental`, `execution: full`, `cachedFiles: 0`, the explicit inactive-ledger fallback, `mergeAuthority: none` and `evaluatedSha: 45efb48472eedfaf46e0d2035b57e20eec03744a`.

| Artifact | SHA-256 |
|---|---|
| Coverage receipt | `af251d0bda8e6ab24b0ba4937355acd8583a4b827a6de7378ee8d22f7f259115` |
| Coverage summary | `aa67fb47c707fd94ac2904ef0005f698e990fa0bb4cecbbe2d4dc4053bc782f7` |
| Raw bootstrap receipt | `2efa444833df6c44183140c8a982e7e581dc29e9486b20f39da86f925e1630d1` |
| Coverage inputs hash | `6fa48120c4f33b5f39009564d282ce4cb4245bd0573888026212d7ff7c7eb3a8` |

## Remaining authority and hosted work

Local coverage implementation and verification are complete and the corrections are committed and pushed on `spec/superman-v0`. Hosted PR coverage on the corrected head and actual scheduled execution remain unverified until the runs land; nightly evidence is not PR admission. The registered arm64 asset's source/build/redistribution acceptance, exact current-head three-platform evidence and applicable small-corpus blockers remain open, and ticket 01 is not admitted. Incremental coverage reuse stays off until its complete provenance/selection contract is verified in the later activation work.

Next: collect the hosted results for the pushed G9-corrected head on the two x64/macOS legs; the `ubuntu-24.04-arm` leg remains blocked on the human-authorized published archgate asset described in [bootstrap evidence](bootstrap-evidence.md), and the arm64 candidate build is itself red on upstream archgate's arm64 performance budgets.

## 2026-11-02 — four-metric Deno coverage feasibility (step 5)

Status: local darwin-arm64 feasibility only. This is supporting evidence for preparation step 5 in [the Gate 1 record](../../.scratch/superman-v0/gate1-preparation.md#step-5-measurement-record--2026-11-02). It does not accept a pin, close build provenance, activate the Deno evaluator, admit ticket 01, or supply merge authority. The active Node collector, policy and dispatch were not changed.

### Identity and inputs

| Identity | Value |
|---|---|
| Checkout | `spec/superman-v0` at `62c8495aeffa33d827c481e661f6083f8bc718d4`; no staged change |
| Host | Darwin arm64, macOS 27.0.1, build `26A434` |
| Node | `/Users/andreburgstahler/.proto/tools/node/26.5.0/bin/node` `v26.5.0`, sha256 `cbee2298aee5cc476bf8d5441e7348b627254a39d869743a5b04489028c729d4` |
| Deno | official `v2.9.8` candidate, tag commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`; existing step 4 extracted binary, sha256 `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba` |
| Deno version | `deno 2.9.8 (stable, release, aarch64-apple-darwin)`, V8 `15.0.245.2-rusty`, TypeScript `6.0.3` |
| Probe | `.scratch/superman-v0/deno-coverage.probe.test.ts`, sha256 `7b7add873b848e6b4bbbcca8be8bbc5b76ca115079dfae6023b52a9a18a0d749` |
| TAP | `<owned>/evidence/probe.tap`, sha256 `6dd224be27803cb21865490ed5521f7795b35477b366d5e1639846a7a1767983` |
| Owned root | `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step5` |
| Measurement tools | `c8` 12.0.0, `@bcoe/v8-coverage` 1.0.2, `istanbul-lib-coverage` 3.2.2, `istanbul-lib-report` 3.0.1, `istanbul-reports` 3.2.0, `ast-v8-to-istanbul` 1.0.7, `vite` 8.3.5, `@jridgewell/trace-mapping` 0.3.31; Biome 2.6.4; tsrs 0.20.1-ts7.1.0-beta |

`denort` was not consumed or executed. The Deno binary was not copied onto `PATH`, installed, downloaded again or replaced by the Homebrew bottle. The run used no `-A`, `--allow-*`, `--env-file`, `env -S` or permission broker.

A concurrent actor updated the step 4 probe and its evidence during this slice. Those step 4 files are moving, were preserved, and are outside this step 5 delta; this record does not rely on the changed step 4 probe or re-review it.

### Command and result

```text
SUPERMAN_DENO_BIN=<step 4 candidate>/bin/deno \
SUPERMAN_COVERAGE_ROOT=<owned>/probe \
/Users/andreburgstahler/.proto/tools/node/26.5.0/bin/node \
  --test --test-reporter=tap .scratch/superman-v0/deno-coverage.probe.test.ts
```

Exit 0. **20 passed, 0 failed, 0 skipped, 0 cancelled**, duration **2719.29 ms**. The same command without the two variables was run separately: exit 1, 20/20 tests failed fast, first message `SUPERMAN_COVERAGE_ROOT is required`; the retained TAP is `<owned>/evidence/no-env.tap` sha256 `0ddc43abf2ede15de02197e8d5619ac1c8961dcc12c204a77efab5f0c7694502`. It does not search `PATH` for another Deno.

### Mechanism proved

1. A real `deno run --coverage=<owned>` wrote CDP `ScriptCoverage` profiles (`scriptId`, `url`, `functions[{ranges[{startOffset,endOffset,count}],isBlockCoverage}]`) for the loaded fixture sources.
2. For each profile, the probe read the executed emit from the owned `DENO_DIR/gen/file/...js` cache, rejected a missing/foreign cache entry, stripped the opaque `// denoCacheMetadata=` trailer, extracted the inline version-3 source map, and required exactly one `sourcesContent` entry equal byte-for-byte to the current original file.
3. The source map's single source was independently resolved and required to realpath to that same original file. The profile's ranges were required to fit the executed runtime code.
4. The executed runtime code was parsed with the locked Vite parser and checked against an AST function inventory: each AST function present in the executed source had to match its own profile entry by name or by the smallest containing range within a 6-character tolerance. This rejects empty/truncated/function-dropped profiles. A second independent Deno collection in fresh owned paths was also required to produce the identical profile structure (URLs, function names, ranges and counts), so a range-dropped partial profile is detected against the independent run rather than inferred from V8 range counts. The converted output was then required to contain exactly the original source path.
5. `deno transpile` produced the transform for the wholly unloaded source. For every loaded Deno source, the transpiled code body was byte-identical to the executed emit code body; the unloaded map's `sourcesContent` also matched the original bytes. The unloaded source was converted with `functions: []`.
6. Node and Archgate-rule fixtures were measured separately through real `node --test` / `NODE_V8_COVERAGE` runs, converted with Node's strip-only transform, and aggregated with the Deno inventory through the locked Istanbul map/reporters. Duplicate/aliased paths were rejected before aggregation.

Deno's native coverage report was not used. V8 ancestry was not assumed to map Deno execution; the mapping came from the executed Deno emit and its inline map. No binary/`denort` coverage or statement denominator was invented.

### Exact four-metric counts

All values are `covered / total` with `skipped = 0` in every cell.

| Inventory | File | Lines | Statements | Branches | Functions |
|---|---|---:|---:|---:|---:|
| Deno | `pilot/run.ts` | 2 / 2 | 2 / 2 | 0 / 0 | 0 / 0 |
| Deno | `pilot/loaded.ts` | 2 / 2 | 2 / 2 | 0 / 0 | 1 / 1 |
| Deno | `pilot/partial.ts` | 1 / 3 | 2 / 4 | 1 / 2 | 1 / 2 |
| Deno | `pilot/unloaded.ts` | 0 / 2 | 0 / 3 | 0 / 2 | 0 / 1 |
| Node | `node/subject.ts` | 2 / 3 | 3 / 4 | 1 / 2 | 2 / 2 |
| Node | `node/unloaded.ts` | 0 / 1 | 0 / 1 | 0 / 0 | 0 / 1 |
| Rule | `rule/fixture.rules.ts` | 3 / 3 | 3 / 4 | 1 / 2 | 1 / 1 |
| **Aggregate** | **7 disjoint files** | **10 / 16** | **12 / 20** | **3 / 8** | **5 / 8** |

The unloaded Deno source has nonzero denominators in all four metrics and zero hits. The partially hit source has exact partial counts. The aggregate file list equals the seven declared inventory paths exactly; the aggregate total equals the arithmetic sum of the three inventories. Reports: `<owned>/probe/aggregate-*/reports/coverage-summary.json` sha256 `65f5c097d32013c45f803536a19676db1e390758423f1e9bdf30c5070a85b740`, `coverage-final.json` sha256 `ef2354fb6d12ba3f3969dc1cb01f77b182b0f3725f18acc4066a5c3efe8d5362`, `lcov.info` sha256 `61cecc1f0b98614353ca6b644bcd4b0c7e8b984dc00a4acefe3a950290a4679c`.

### Rejection controls exercised

| Control | Observed rejection |
|---|---|
| Missing profile for a declared-loaded source | `missing expected coverage profile` |
| Well-formed but empty loaded profile (`functions: []`) | `loaded coverage profile is empty` |
| Loaded profile whose top-level range does not cover the script | `loaded coverage profile does not cover the executed script` |
| Loaded profile omitting a nested AST function | `loaded coverage profile omits an AST function` |
| Range-dropped profile compared with an independent run | `coverage profile structure differs between independent runs` |
| Profile outside the declared inventory | `unexpected coverage source` |
| Duplicate profile for the same source | `duplicate coverage profile` |
| Profile for a declared-unloaded source | `unexpected coverage profile for unloaded source` |
| Symlinked profile path | `coverage profile URL is aliased` |
| Malformed profile JSON | `coverage profile is malformed` |
| Executed emit without an inline map | `executed source has no inline source map` |
| Range beyond the executed runtime code | `coverage range exceeds the executed transformation` |
| Source changed after collection | `executed transformation does not match the current original bytes` |
| Deno unloaded source changed after collection | `source changed after collection` |
| Node source changed after collection | `source changed after collection` |
| Node profile with a query/hash/alias URL | `not a plain local file URL` / `aliased` |
| Node missing/unexpected/duplicate profile | `missing expected coverage profile` / `unexpected coverage source` / `duplicate coverage profile` |
| Node nested range beyond the stripped source | `coverage range exceeds the executed transformation` |
| Malformed Node raw JSON | `Node coverage profile is malformed` |
| Invalid profile shape (missing scriptId / bad function flag / bad range) | `no scriptId/URL/functions` / `invalid function` / `invalid range` |
| Aggregate source repeated across inventories | `aggregate repeats an aliased source` |
| Non-base64 inline map payload | `executed source map is not base64 encoded` |
| Nonzero Deno child (`Deno.exit(7)`) | `Deno process failed with status 7` |
| Deno child exceeding its timeout | `ETIMEDOUT` / launch failure |

Each rejection happened before a report was written by the affected helper. The abnormal-child cases were not credited as kills, passes or partial coverage.

### Limits, not waivers

- Darwin arm64 only; Linux/macOS x64 and all three native platforms are not proved.
- Release-attestation origin is not SLSA or other build provenance; Q3 remains open.
- `deno transpile` prints an experimental warning and is not a stable API. The probe binds its output to the executed emit for every loaded source; if that equality fails, the slice must stop.
- The opaque `denoCacheMetadata` source/emit hashes were not recomputed. The binding is the embedded map's `sourcesContent` equality, the single-source map path check, the fresh owned `DENO_DIR`, and the range bounds.
- Node's top-level V8 range end (`304` for `subject.ts`) exceeded the stripped source length (`156`) because Node's V8 script carries its own transform wrapper. The Node leg therefore requires a non-empty profile with a top-level range covering the source body and validates every nested range shape, but does not upper-bound the top entry's first synthetic range. Nested Node ranges and all Deno ranges are upper-bounded against the executed emit. The AST function check plus the independent second-run comparison is a structural completeness guard, not a tamper-proof oracle. A profile that removes an individual range differs from the independent run and rejects; a profile that is structurally identical to a second complete run is accepted, because V8 exposes no independent branch denominator beyond the executed range set. The 6-code-unit range tolerance is a heuristic: it accommodates the observed method-name prefix (5 units), but a longer prefix or a short anonymous nested function can be misclassified. The independent second-run comparison, not the tolerance, is the primary partial-profile control.
- `deno transpile` rejects `--no-prompt`; the unloaded transform used the accepted `--no-config --no-lock --no-npm --no-remote` discovery flags under the same `env -i` boundary. Transpile does not prompt.
- The four RED→GREEN cycles were self-attested during implementation: the observed messages were `profile binding is not implemented`, `four-metric conversion is not implemented`, `unloaded transformation is not implemented`, and `inventory conversion is not implemented`. The failing TAPs were not retained; the final green TAP is the retained evidence, not independent proof of authoring order.
- `git diff --check` covers tracked append diffs only because the new probe is untracked. The new file was separately checked for trailing whitespace with `grep -nE '[[:blank:]]+$'` (no matches) and by Biome.
- Fixtures are tiny feasibility subjects, not product/bootstrap inventories. The Node and rule fixtures are test-only measurement subjects, not the repository's actual retained drivers or Archgate rules.
- No `deno check`/declaration environment was involved; step 3 stays open and step 8 remains blocked by it. The Deno emit/transform and Node strip/transform paths were kept distinct.
- No network, install, Homebrew, credentials, fixture Git, real staging/commit/push, workflow, package, policy or readiness change.
- The active Node dispatch is unchanged. The Deno successor remains parallel and non-admitting. No ticket 01 admission, no merge authority, no binary coverage and no product baseline are claimed.

**Next:** preparation step 6 (temporary compile/asset substrate) depends on steps 1–2 and on step 5 before claiming measured-source binding. Step 3 remains open and blocks step 8; step 7 stays independently unstarted. Do not start step 6 from this record.

## 2026-11-02 — step 6 binding amendment, step 5 probe hash

This append does not replace the step 5 measurement above. The probe hash in that section, `7b7add873b848e6b4bbbcca8be8bbc5b76ca115079dfae6023b52a9a18a0d749`, remains the identity of the run that produced the retained step 5 TAP. André later approved a step 6 amendment that adds an env-gated external-entry test to `.scratch/superman-v0/deno-coverage.probe.test.ts` and reuses that file's existing collect/bind/convert path. The file hash is now `9be20e43783f57796e2a8043a6d902e2e592b17fbf377b19998ba20a72302d9b`.

With `SUPERMAN_MEASURE_ENTRY` unset, the same step 5 command passed **20 tests, 0 failed, 0 skipped** in **2895.059458 ms**. The external-entry test is not registered in that run. This is a regression check of the amendment, not a new four-metric feasibility claim and not binary coverage. `.superman/ci/coverage.ts` was not edited.

## 2026-11-02 — step 6 binding TAP identity

This append binds the current step 5 probe `9be20e43783f57796e2a8043a6d902e2e592b17fbf377b19998ba20a72302d9b` to its retained env-unset 20-test run: `.../superman-gate1-step6/coverage-rerun.tap`, sha256 `4e3304ca0845234d4a93bf113c70d0364e6d0cc7636d6404c7d243ed03f38b19`, **20 passed, 0 failed, 0 skipped**, 2895.059458 ms. It confirms the step 6 measured-source-binding dependency and does not replace the step 5 measurement, claim new coverage, edit `.superman/ci/coverage.ts`, or execute Deno/denort in this append. No ticket 01 admission.

## 2026-11-02 — step 5 review correction

The step 5 probe identity is corrected without rewriting the historical lines: `7b7add87…` is the original run, `9be20e43…` is the step 6 amendment, and the current corrected probe is **`56bb09607253396b04b9457735d9d4e63c00a67f38b410208ee8f4fac348d423`**. The current run is TAP **`71c6816bc0ca2b567f29760d268f6968646765b78c66103ef6e5e27c682d4c48`**, **20 passed, 0 failed, 0 skipped**, 3562.99 ms.

The probe keeps `parseProfiles`, `bindProfile`, `convertProfile`, `readV8Profiles` and `aggregate` as module-local measurement seams; tests assert returned values/errors, not call order. They cannot be exported because Biome's `noExportsInTest` forbids exports from a test file. `makeFixture` registers cleanup and the fixture roots were removed after the run. The converter identities are asserted by version and package.json sha256: `c8` 12.0.0, `@vitest/coverage-v8` 5.0.5, `ast-v8-to-istanbul` 1.0.7, `vite` 8.3.5, `@bcoe/v8-coverage` 1.0.2, `istanbul-lib-coverage` 3.2.2, `istanbul-lib-report` 3.0.1, `istanbul-reports` 3.2.0.

The exact single-file `tsrs --ignoreConfig` check and the single-file Biome check exited 0. Remaining limits: synthetic Node/rule fixtures rather than retained repository drivers/Archgate rules; no executed emit for the wholly unloaded source; the four counts still use the same Istanbul summary path with no independent counter. The last item remains a row gap; this correction does not claim the full “independently verify all four counts” completion.

## 2026-11-02 — step 5 module move and independent-converter attempt

The approved Step 5 packet moved the measurement seams to `.scratch/superman-v0/deno-coverage-measurement.ts` (`064c6e63e48ff5c3686b66ff9672bbc564f027a08b85323a42c635a74ec92af0`) and made the probe import them. Probe `c994fe886c3edac10de7b9b82a1d70a6a02c90e16e8c8be5590673a8433496e7`; TAP `aebf087892539e09e8a7c50373c5adc4dedaf5cb93e4265d325ae4a7d71a09e2`, **20 passed, 0 failed, 0 skipped**, 2925.80 ms. Tests drive exported functions, not test-file private helpers; no linter suppression. The single-file `tsrs --ignoreConfig --allowImportingTsExtensions` check and Biome check on both files exited 0.

The proposed independent converter `v8-to-istanbul` 9.3.0 (`9403e515e7b76070a8c54b064107e06bfb98df3345634c0c405056a13e2c323e`) failed to reproduce the AST-based four-count definition. It reported line-granular statements and function-body branches: `loaded.ts` `4/4` lines, `4/4` statements, `1/1` branches and `1/1` functions against production `2/2`, `2/2`, `0/0`, `1/1`; `partial.ts` `4/8`, `4/8`, `1/2`, `1/2` against `1/3`, `2/4`, `1/2`, `1/2`; `unloaded.ts` `4/4`, `4/4`, `0/0`, `0/0` against `0/2`, `0/3`, `0/2`, `0/1`. The failing TAP is `f56db100a2dc3c58a03af3e0d46d5c987a08a1ef39a6512c74ad57508cfbb20f` (2/2 failed). The loaded/partial tuples are in `out4.txt` (`cc0ac65e1a1478eed662042341e379e0b608b161bc240336a6abebcb5ed9a16a`); the unloaded tuple is in the failing TAP, which the transcript does not contain.

No production count was adjusted; the independent function and its failing assertions were removed. The retained probe is the 20/20 module-move run. The row’s “independently verify all four counts” requirement is **not met**. The retained step 5 evidence can be accepted only for the production conversion, the executed emit/source-map binding to original bytes, the one-time disjoint Deno/Node/rule aggregation, the exported measurement module, fixture/error coverage and the 20/20 TAP. Step 5 remains open; this is not acceptance of the full row. A further independent counter needs a new approved packet and must reproduce the AST-based statement/branch/function model. The loaded/partial tuples are supported by `out4.txt` (`cc0ac65e…`); the unloaded tuple is supported by failing TAP `f56db100…`, not by that transcript.

## 2026-11-02 — step 5 independent-count stop

André approved the owned-counter packet. Execution stopped on the first synthetic oracle. The independent four-count clause is not closed. No production count was adjusted, and `v8-to-istanbul` 9.3.0 remains the preserved incompatible failure.

The behavioral RED is TAP `807656a082fce8b7b79ea318f7539fcbce3b6fbb6874173b2827b02ab1afb5b4`: `independent derivation is not implemented`. The offset stop is TAP `ce97a11510105f9a8c77b967174a663f9bd7f9f28f207482107a1d96321e8c17`. The locked Vite/Oxc parser places `VariableDeclarator.start` at 37 (`doubled`), while the hand-counted oracle required 31 (`const`). `ReturnStatement.start` 56 and the initializer’s mapped column 18 matched. A separate parser listing also showed `FunctionDeclaration.start` 7 and `VariableDeclaration.start` 31. The expected offset was not retuned. Production hits `VariableDeclarator.start`, so keeping 31 would disagree with the required model.

New files, not accepted evidence: `.scratch/superman-v0/deno-coverage-independent.ts` `fd346f316df6a7237d33ebabb6ee373da9d4e6d1c13d704f25a6de96d4da0cba`; `.scratch/superman-v0/deno-coverage-independent.probe.test.ts` `efeecef44b77d8b808dd216429535bd200cc8054a849b51226adabd650fff3ef`. Single-file tsrs and Biome on those two files exited 0. The accepted measurement module and probe hashes are unchanged. `.scratch/superman-v0/gate1-preparation.md` was not appended: its intake prefix `99269381…` (160218 bytes) no longer matches the live file. No review, commit, activation, or Step 5 closure.

## 2026-11-02 — step 5 owned independent counts, execution evidence

André approved the `VariableDeclarator.start = 37` correction (initializer line 2/column 18, function offset 7 and return offset 56 unchanged), then approved exact packet `step5-independent-count-closure-li8fg2kz`, manifest SHA-256 `80bc855e9b4a21c0dd11488f69087be0d76ee3d73130957dd19325cb5b53f2eb`. This records verified execution; independent review and subsequent human acceptance remain pending.

Evidence root `R` is `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-step5-closure-packet-li8fg2kz`. `execution-packet.json`, `fixture-lock.json`, `semantic-oracles.json`, `oracle-input-offsets.json`, `tools.json` and `parser-chain.json` are frozen manifest inputs. All nine fixture source strings and all expected tuples remain unchanged. The counter reads runtime code, bound original/map inputs and raw ranges; expected values enter only the probe's assertions. Counting/coalescing and tuple addition are owned by `deriveFile`/`deriveAggregate`; Vite and trace-mapping supply AST/location inputs. Only the approved production input-binding helpers are reused, with no production conversion, summary, raw-profile merge or Istanbul aggregation in the independent path.

The fresh run is `R/independent/seven-files-KkNvTy/`: Deno and both synthetic Node/rule harnesses each ran twice with isolated coverage directories (Deno also used separate fresh caches), exact raw structure matched excluding script IDs, and every declared loaded source had exactly one selected raw record. Original bytes, executed Deno cache emits, decoded maps, all four Deno transpiles, Node offset-preserving transforms, complete derived locations/hits and comparisons are retained. Loaded transpile bodies equal executed emit bodies. The wholly unloaded Deno input is a transform with an empty profile, not an executed emit.

| Independently derived file | Lines | Statements | Branches | Functions |
|---|---:|---:|---:|---:|
| `pilot/loaded.ts` | 2/2 | 2/2 | 0/0 | 1/1 |
| `pilot/partial.ts` | 1/3 | 2/4 | 1/2 | 1/2 |
| `pilot/unloaded.ts` | 0/2 | 0/3 | 0/2 | 0/1 |
| `pilot/run.ts` | 2/2 | 2/2 | 0/0 | 0/0 |
| `node/subject.ts` | 2/3 | 3/4 | 1/2 | 2/2 |
| `node/unloaded.ts` | 0/1 | 0/1 | 0/0 | 0/1 |
| `rule/fixture.rules.ts` | 3/3 | 3/4 | 1/2 | 1/1 |
| **Aggregate** | **10/16** | **12/20** | **3/8** | **5/8** |

Every per-file and aggregate tuple matches the frozen production table, including **skipped 0**. `comparison.json` SHA-256: `3c5f24c95d35b8195ce5b160df6dd56a6891b1b73b9ffd26e8f61b61fffc215c`. No table or counter adjustment followed a real-input mismatch; the first full comparison passed.

Verification:

- Independent full probe: **24/24**, zero failed/skipped/cancelled/todo; TAP `R/execution/independent-full/stdout.txt`, SHA-256 `8059b3758eb6ed09ba54894069ce9f5730e7b9af0b40f5b784e9824c971aaaa9`. Covers 20 locked semantic variants, three aggregation controls and the seven-file comparison.
- Genuine retained RED→GREEN preimages, TAPs and receipts for O2–O8, O11–O13, A0 and A1 are under `R/execution/`. The authorized O0 correction and already-supported regression cases, including A2, are passing controls, not claimed new-behavior REDs.
- Unchanged production probe: **20/20**, zero failed/skipped/cancelled/todo; TAP `R/execution/production-regression/stdout.txt`, SHA-256 `c16aa4d3d8c715bf61c4f1ce10c5336e03c3b6b1f95baa7153c0ad5977237f61`. `SUPERMAN_MEASURE_ENTRY` was unset; Step 6's external-entry boundary is carried.
- Explicit two-file tsrs/Biome, project tsrs, repository Biome (50 files), tracked whitespace and the untracked-file whitespace scan passed. Exact argv, clean environments, source preimages, stdout/stderr/status and hashes are retained in `R/execution/`. The earlier formatting-only Biome failure is retained, followed by scoped formatting and the passing checks.
- Counter SHA-256 `153d15f5667fd169126ddd213e987f64141d52a86db57a469df710f7e1efcd90`; independent probe `39d998fbffc777c5ea4c47f9cf8994a036cceaf48b39ff67479ffc707e2f6af4`. Accepted production module `064c6e63…` and probe `c994fe88…` remain byte-identical.

Historical failures remain in `R/historical/`, including incompatible `v8-to-istanbul` and the stopped offset oracle. The historical file named `green-covered.tap` is a **failure**, not a pass. The reconciled prefix locks in `R/intake-reconciled.json` preserve both concurrent Step 3 insertions; the obsolete `99269381…` prefix is not reused. This append uses the captured 36959-byte prefix SHA-256 `31ae0898e2959509b2568da8d4b6360e7c8fae1df64f62d33ba59ed409f9fcac`, with its complete preimage retained and checked.

Limits remain local darwin-arm64 feasibility, shared parser/location libraries, synthetic Node/rule subjects, suppression-free fixtures, the bounded range model and recorded V8/profile-completeness limits. These results do not establish general JavaScript equivalence or independent evaluator authority. Step 5 acceptance awaits review and André's separate action; Step 3 stays open and blocks Step 8. No pin acceptance, Gate 1 closure, §5.4/§5.10 independence closure, activation, ticket 01 admission or repository Git write.

### Independent review — acceptance-ready, 2026-11-02

Separate Standards and Spec reviewers examined frozen `R/review-r1` (manifest SHA-256 `fcfa4381c560f524b599625661bad8aa1348a030b0dd1ecb815be0094d61adbb`), including the nonempty intake-relative delta, both full untracked additions, all 137 snapshots and 341 retained evidence entries. **Standards PASS: 0 findings. Spec PASS: 0 findings.** They checked counting independence, locked hand oracles/TDD, raw bindings, all seven rows, aggregation, production/history preservation and scoped claims. Their read-only inspections did not rerun collectors.

Review reports: `R/review-r1/standards.md` SHA-256 `e667fec120f189a9024c23b06c20181329358a797db1ae2b4233b756cc545e59`; `spec.md` `cac063ab6d1888fd9fd341ae4ecaa0403a86eab2434b91fbf8c866712ff2fa02`. `review-receipt.json` `4b3d6debc08296a10b0197b099c1869ee57f367391c63c7145f13c2c53cfa8e6` binds both reviewer sessions and the subsequent successful recheck of live reviewed bytes, all retained evidence, packet/tool/parser hashes and passing source-bound checks. A prior metadata-only recheck-script syntax error is retained in `hash-recheck-invocation-error.txt`; it executed no checks or writes and is not a passing receipt.

The independent-count clause is **acceptance-ready at this bounded fixture scope**, with no unresolved review findings. André's separate human acceptance remains pending. No source/test change followed the reviewed full pass; only these review-result appends follow the frozen bundle. All limits and blocked transitions above remain. The captured historical prefix and complete live suffix were rechecked before this append and its preimage retained in `R/appends/coverage-review/`.
