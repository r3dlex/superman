# SUP-005 bootstrap evidence

Scope: SUP-005 only, at the approved real-Archgate process seam in `archgate-policy.test.ts`. No product source, hosted writes, commits or bootstrap-readiness claim.

## Tool identity

- Node: `v26.5.0`, darwin-arm64.
- The pinned npm package's shim reported `0.43.0` from its shared cache; it was not used for gate evidence.
- Independently fetched `https://github.com/archgate/cli/releases/download/v0.61.0/archgate-darwin-arm64.tar.gz` and its `.sha256`; SHA-256 matched `44c645602313bc6be7ef99ebc34c5e08f3169695b631bd9ab09bda0d3b699cf3`.
- Verified binary: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/sup005-archgate-0.61.0-meFEJL/archgate` (`--version`: `0.61.0`). Shared cache unchanged.

Commands below use `ARCHGATE_BIN` set to that verified binary. Fixture repositories are generated and removed by the tests; no tracked negative directive files are added.

## Sequential red–green observations

1. `node --test --test-name-pattern='SUP-005 rejects an Archgate next-line' .superman/ci/archgate-policy.test.ts`
   - RED with an empty rule set: exit 1; 0 passed, 1 failed. The fixture engine returned exit 0, `"pass": true`, `"results": []`; assertion `0 !== 1`.
   - Then added only TypeScript comment detection and an unsuppressible SUP-005 diagnostic.
   - GREEN: exit 0; 1 passed, 0 failed (fixture exit 1 with SUP-005 finding).
2. `node --test --test-name-pattern='SUP-005 rejects a Biome suppression' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. Engine returned exit 0, `"pass": true`; assertion `0 !== 1`.
   - Added Biome comment recognition only.
   - GREEN with cycle 1: exit 0; 2 passed, 0 failed.
3. `node --test --test-name-pattern='SUP-005 rejects Biome file' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. `policy.js` engine returned exit 0, `"pass": true`; assertion `0 !== 1`.
   - Extended source-language selection and Biome file/range/block variants (including case/underscore spelling), retaining comment-token boundaries.
   - GREEN with earlier cycles: exit 0; 3 passed, 0 failed.
4. `node --test --test-name-pattern='SUP-005 rejects a Trivy suppression' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. Engine returned exit 0; assertion `0 !== 1`.
   - Added YAML full-line Trivy directive detection; diagnostic sharing avoids a second suppressible reporting path.
   - GREEN with earlier cycles: exit 0; 4 passed, 0 failed.
5. `node --test --test-name-pattern='SUP-005 permits inert YAML' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. Engine incorrectly rejected the literal/folded examples at lines 4 and 6; assertion `1 !== 0`.
   - Added YAML block-scalar boundaries before examining full-line comments.
   - GREEN with earlier cycles: exit 0; 5 passed, 0 failed.
6. `node --test --test-name-pattern='SUP-005 distinguishes YAML' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. Engine incorrectly rejected three scalar lines (2, 5, 8); assertion `1 !== 0`.
   - Added YAML quote/escape state, inline comment boundaries and comment-stripped block-scalar headers.
   - GREEN with earlier cycles: exit 0; 6 passed, 0 failed (both inert and active process outcomes observed).
7. `node --test --test-name-pattern='SUP-005 cannot suppress itself' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. TS self-suppression attempts were blocked, but the YAML Archgate directive returned engine exit 0; assertion `0 !== 1`.
   - Added YAML Archgate comments and Markdown HTML/line forms, following 0.61.0's fenced-example handling.
   - GREEN with earlier cycles: exit 0; 7 passed, 0 failed; SUP-005 findings were never filtered (`suppressed: 0`).
8. `node --test --test-name-pattern='SUP-005 permits generated' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. Engine incorrectly rejected unsupported Archgate block/trailing forms at lines 9 and 10; assertion `1 !== 0`.
   - Restricted Archgate TS/JS detection to full-line line-comments, while preserving Biome block/inline comments.
   - GREEN with earlier cycles: exit 0; 8 passed, 0 failed.
9. `node --test --test-name-pattern='SUP-005 checks JSON' .superman/ci/archgate-policy.test.ts`
   - RED: exit 1; 0 passed, 1 failed. JSONC directive returned engine exit 0; assertion `0 !== 1`.
   - Added JSON/JSONC string-aware comment tokenization (no AST API exists for JSON comments); reused comment checks.
   - GREEN with earlier cycles: exit 0; 9 passed, 0 failed; active comments rejected and inert JSON values accepted.
10. `node --test --test-name-pattern='SUP-005 finds effective comments' .superman/ci/archgate-policy.test.ts`
    - An initial nested-template candidate already passed with the upstream collector; simplified to one template to isolate its blind spot before changing the rule.
    - RED: exit 1; 0 passed, 1 failed. Single-template interpolation directive returned engine exit 0; assertion `0 !== 1`.
    - Extended the JSON tokenizer for JS/TS strings/template expressions. The engine AST still validates syntax; original-source comment tokens no longer depend on its whole-template-skipping collector.
    - GREEN with earlier cycles: exit 0; 10 passed, 0 failed.
11. `node --test --test-name-pattern='SUP-005 distinguishes regex' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. A regex backtick hid the following directive; engine returned exit 0 (`0 !== 1`).
    - Used regex literal spellings from the engine AST to skip literal bodies during original-source comment collection, rather than guessing slash syntax from text alone.
    - First implementation stayed RED (10 passed, 1 failed): Meriyah omits `Literal.raw`. A temporary real-engine AST probe showed `regex: { pattern, flags }`; reconstructed literal spellings from those fields instead. No probe files remain.
    - GREEN with earlier cycles: exit 0; 11 passed, 0 failed.
12. `node --test --test-name-pattern='SUP-005 does not mistake division' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. An identical regex elsewhere let a real division/array block comment return engine exit 0 (`0 !== 1`).
    - Added expression/token context before matching AST regex spellings; expanded the same fixture to expression-ending strings/templates/numbers/postfix/brackets/objects.
    - GREEN with earlier cycles: exit 0; 12 passed, 0 failed.
13. `node --test --test-name-pattern='SUP-005 rejects Trivy IaC' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. Terraform directive returned engine exit 0 (`0 !== 1`).
    - Added HCL comment/string/heredoc handling and Dockerfile full-line comments; Trivy expiry and wildcard suffixes do not grant exemptions.
    - GREEN with earlier cycles: exit 0; 13 passed, 0 failed.
14. `node --test --test-name-pattern='SUP-005 rejects Archgate.s line' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. Text-file Archgate directive returned engine exit 0 (`0 !== 1`).
    - Added Archgate's extension-independent full-line grammar for remaining files, so forbidden source extensions cannot use a file directive to disable their own rule.
    - GREEN with earlier cycles: exit 0; 14 passed, 0 failed.
15. `node --test --test-name-pattern='SUP-005 permits non-directive' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. A documentation mention with a non-category word was rejected (`1 !== 0`).
    - Restricted Biome payloads to category syntax (including groups, values and multiple categories); normalized JSDoc line prefixes outside the regex to avoid ambiguous whitespace scanning and report the directive's actual line.
    - GREEN with earlier cycles: exit 0; 15 passed, 0 failed.
16. `node --test --test-name-pattern='SUP-005 recognizes JavaScript line' .superman/ci/archgate-policy.test.ts`
    - RED: exit 1; 0 passed, 1 failed. U+2028 let an ordinary line comment hide the next Biome directive; engine returned exit 0 (`0 !== 1`).
    - Added JS line-terminator token boundaries/locations and kept Archgate's separate LF-only raw-line grammar. Literal contents remain inert.
    - GREEN with earlier cycles: exit 0; 16 passed, 0 failed.

Additional regression fixtures cover hidden policy files under `--base`/`--staged` and long harmless comment whitespace. They were added after the sequential implementation cycles and are not represented as new RED observations.

17. Extended `node --test --test-name-pattern='SUP-005 does not mistake division' .superman/ci/archgate-policy.test.ts` to function/class expression endings.
    - RED: exit 1; 0 passed, 1 failed. The preceding-token approximation misclassified division after a function expression (`0 !== 1`).
    - Replaced that approximation with AST regex counts. Extra identical source spellings are inspected as code; ambiguous locations are reported as alternatives, not falsely attributed to one regex. Missing AST/source reconciliation fails closed. This removes the need to approximate the JS/TS expression grammar.
    - GREEN: `node --test --test-name-pattern='SUP-005' .superman/ci/archgate-policy.test.ts` exited 0; 18 passed, 0 failed, including the two added regression tests.

## Upstream behavior inspected

Archgate tag `v0.61.0`: `src/engine/suppressions.ts`, `js-parser.ts`, `runner.ts`, `loader.ts` and ADR ARCH-024. `ctx.ast(..., { comments: true })` is available; rule imports cannot access filesystem/process/parser packages. The engine filters file-associated violations after running rules. Its original-source comment collector skips whole templates and does not track regex literals, so those boundaries need process fixtures rather than assuming the AST API closes them.

Also inspected Biome's official suppression syntax/parser and Trivy `v0.76.1`'s `pkg/iac/ignore/parse.go`/`rule.go` for comment forms, categories, IDs and expiry suffixes. These source inspections are not execution evidence for G10/G11.

## Final local verification

**Historical snapshot before independent review corrections below.** These results do not verify the revised source or resolve the subsequently reproduced P1/P2 findings.

- `ARCHGATE_BIN=<verified path above> node --test .superman/ci/archgate-policy.test.ts`: exit 0; **27 passed, 0 failed** (18 SUP-005 tests plus all 9 existing tests).
- `node node_modules/tsrs/bin/tsrs --noEmit`: exit 0; no diagnostics.
- `node node_modules/@biomejs/biome/bin/biome check --write .archgate/adrs/SUP-005-no-inline-suppression.rules.ts .superman/ci/archgate-policy.test.ts`: exit 0. Only the two owned TS files were formatted; the split private-key fixture remains synthetic via array `.join(" ")`, not a literal header.
- Repeated the same Biome command without `--write`: exit 0; 2 files checked, no fixes, no diagnostics.
- `ARCHGATE_TELEMETRY=0 <verified path above> check --strict --output json`: exit 0; **8 evaluated rules passed**, no warnings/errors/rule errors/suppressions. This records that invocation's normal engine-selected scope, not an uncached all-platform gate claim.
- `git diff --check -- .superman/ci/archgate-policy.test.ts .archgate/adrs/SUP-005-no-inline-suppression.md .archgate/adrs/SUP-005-no-inline-suppression.rules.ts .superman/ci/SUP005-tdd.md`: exit 0.

## Historical limits and handoff (before independent review)

Only darwin-arm64 was executed here. This is bounded comment governance at the real Archgate process seam, not a general polyglot tokenizer, real Biome/Trivy negative-fixture execution, linux-arm64 proof, hosted CI/protection evidence or completion of bootstrap §17. The source-aware formats and extension-independent Archgate fallback are documented in the new companion ADR; another syntax needs reviewed process fixtures before coverage is claimed. No `src/` product implementation, package/config/workflow/path-policy changes, repository commits, pushes, approvals or hosted writes were made by this worker. Other workers' changes were left intact.

## Independent-review corrections

The earlier source-language meaning of “inert” was wrong for Archgate: v0.61.0 applies its raw-line grammar inside literals/scalars too. The historical 27-test run did not prove effective suppression semantics or complete JSX handling. The separately recorded platform snapshot is historical once these sources change; main owns fresh final-source platform verification.

### P1: engine-effective Archgate directive inside template raw text

- RED command: `ARCHGATE_BIN=<verified path above> node --test --test-name-pattern='SUP-005 blocks raw template directives' .superman/ci/archgate-policy.test.ts`.
- Observed exit 1, 0 passed/1 failed. The planted SUP-099 rule alone failed without the directive (exit 1, suppressed 0), passed with it inside a template (exit 0, suppressed 1), and the old SUP-005 plus SUP-099 still passed (exit 0, total 2, suppressed 1); assertion `0 !== 1`.
- Minimal correction: one extension-independent Archgate raw-line pass using the exact pinned regexes, LF splitting, reason requirement and Markdown-only fence/HTML handling. Biome/Trivy literal handling no longer controls Archgate recognition.
- GREEN on the same command: exit 0; 1 passed/0 failed. Native SUP-099 still demonstrates the suppression, while the combined run now fails on the unsuppressible SUP-005 diagnostic.
- Corrected the old “generated inert string” fixture: its raw template directive was not engine-inert, so the example now has a non-directive line prefix. Added differential planted-rule checks across the already-supported quoted/scalar forms and genuinely inert inline/escaped/fenced examples. No new language was added.
- Differential control run initially had 3 passing/1 failing test because a native missing-reason warning went to stderr after JSON stdout; parsing the combined diagnostic string was invalid JSON. The fixture now exposes stdout separately for structured assertions while preserving combined diagnostics. This was a harness parsing failure, not another policy RED.

### P1: JSX raw-text apostrophe hides a later effective Biome comment

- RED command: `ARCHGATE_BIN=<verified path above> node --test --test-name-pattern='SUP-005 inspects real comments after JSX' .superman/ci/archgate-policy.test.ts`.
- Observed exit 1, 0 passed/1 failed. Pinned Biome 2.6.4 reported `lint/suspicious/noDebugger` (exit 1) without the directive and exited 0 with it after `<div>don't panic</div>`. Old SUP-005 still returned exit 0, pass true; assertion `0 !== 1`.
- Minimal correction: a bounded JSX text/tag/attribute mode around the existing source-comment collector. Quotes and comment-looking bytes in JSX text are inert to Biome; expression containers return to JS comment collection. `ctx.ast` still validates source first. Unclosed/mismatched markup, unsupported attribute values and ambiguous JSX/type-parameter/angle contexts fail closed rather than reporting clean inspection.
- GREEN on the same command: exit 0; 1 passed/0 failed. Both TSX and JSX reproduce Biome's exit 1→0 suppression effect, remain blocked by SUP-005, and permit the three native-Biome-clean JSX-text examples.

### P2: anchored YAML quoted scalar is mistaken for a comment

- RED command: `ARCHGATE_BIN=<verified path above> node --test --test-name-pattern='SUP-005 preserves anchored YAML' .superman/ci/archgate-policy.test.ts`.
- Observed exit 1, 0 passed/1 failed. `quoted: &example "example #trivy:ignore:AVD-KSV-0014"` was incorrectly rejected at line 1; assertion `1 !== 0`.
- Minimal correction: consume the anchor node property without consuming the scalar-start state. Both existing quote modes then retain their normal boundaries; real trailing comments are still inspected. No new language or tag grammar was added.
- GREEN on the same command: exit 0; 1 passed/0 failed. Both quote modes permit the anchored scalar and reject the real trailing comment.

The JSX test additionally checks nested tags, quoted attributes/JS strings and an effective comment inside an expression container against native Biome. A separate regression checks fail-closed rule errors on the bounded collector's ambiguous type-parameter/angle contexts; it does not claim those valid constructs are cleanly supported.

The first whole-suite run had 32 passing/1 failing test: the new fail-closed regression expected exit 1, but Archgate correctly uses exit **2** for a rule error (`ruleErrors: 1`, `inspection is incomplete`). Corrected that public-process expectation; no production relaxation was made. Typecheck, owned-file Biome and strict SUP-005 repository inspection were already green in that run.

The corrected bounded-context regression passed on `node --test --test-name-pattern='SUP-005 fails closed on JSX' .superman/ci/archgate-policy.test.ts`: exit 0, 1 passed/0 failed. All three native-Biome-valid cases remain unready through Archgate exit 2, not an invented clean result.

## Current correction verification and handoff

- `ARCHGATE_BIN=<verified path above> node --test .superman/ci/archgate-policy.test.ts`: exit 0; **33 passed, 0 failed, 0 skipped**. All 27 preceding tests remain, with the falsely “inert” template fixture corrected; six new process tests cover the review findings, native parser comparisons and fail-closed bounds.
- `node node_modules/tsrs/bin/tsrs --noEmit`: exit 0; no diagnostics.
- `node node_modules/@biomejs/biome/bin/biome check .archgate/adrs/SUP-005-no-inline-suppression.rules.ts .superman/ci/archgate-policy.test.ts`: exit 0; 2 files checked, no fixes or diagnostics. `--write` was used only on these two owned TS files before the final run; the synthetic private-key fixture still uses array `.join(" ")`.
- `ARCHGATE_TELEMETRY=0 <verified path above> check --adr SUP-005 --strict --output json`: exit 0; one evaluated rule passed, no warnings/errors/rule errors/suppressions.
- Owned-file `git diff --check`: exit 0.

Final source identities for main's independent review/reverification (SHA-256):

```text
515958cec2e6aaba419928ccfd1b61523c9e9e7b48934a24a9d5c5dad30a949b  .archgate/adrs/SUP-005-no-inline-suppression.rules.ts
42637fbb2d911ad3ddc0c5c0cc71ea06c826b649e360116dfc4aa77a76fbc4be  .superman/ci/archgate-policy.test.ts
e54de2a48430201fe69d8478b5da643dbc6bee81a9e388d3cda9857b2208e41f  .archgate/adrs/SUP-005-no-inline-suppression.md
```

This worker changed only the original four owned SUP-005 files. No quality/router/replay, package/config/workflow, existing why ADR or product source changes were made here, and no repository commit/hosted write was performed. The native Biome comparisons are narrowly `lint/suspicious/noDebugger` process evidence, not a full G10/G11 or bootstrap-readiness verdict. JSX inspection remains explicitly bounded: otherwise valid ambiguous/unsupported constructs can return rule-error exit 2 rather than be declared clean. Earlier platform snapshots are historical; main owns final-source native-arm/platform verification and independent re-review. No platform snapshot was refreshed or promoted by this worker.

## 2026-11-01 — Deno namespace preparation under the current Node evaluator

This appended follow-on does not revise the historical results above. [Popup decisions G1–G4](../../.scratch/superman-v0/gate1-preparation.md) authorize one non-activating syntax-only preparation slice, not ticket 01, Deno execution, strict admission or a merge. Existing-file scope is this append, SUP-005 rule/companion and the two existing process/callback test files. No standalone collector, runtime, package/config/workflow, other-rule or product-source change is included.

### Environment and identities

Intake HEAD is `12ea1dada7878dd783902a4eae73133f49f12f8c`. All 119 intake tracked/untracked files and staged/unstaged differences were preserved outside the repository in:

```text
/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-preparation-9deegjql/
```

Call this directory `B` below. Actual commands use `python3 B/check.py <label> <program> <arguments>`; replace `B` with the full path above. The runner starts each check with a fresh allowlisted outer environment, temporary HOME/TMPDIR, controlled PATH, offline pnpm settings, telemetry disabled and no inherited credentials/Git configuration. It records commands, exits, stdout/stderr and executable/source SHA-256 values under `B/logs/<label>.*`. This is test hygiene, not OS isolation. G3 permits Git staging/commits only inside owned disposable test fixtures; the real checkout is never staged/committed.

- Real Node: `/opt/homebrew/Cellar/node/26.13.0/bin/node`, `v26.13.0`, darwin-arm64; `process.release.name` is `node`, no Deno version. SHA-256 `7296c3dda88793e08d1089d839a782178c4bba6bb22f5c40ab2a75263fb071bd`.
- Archgate: reuse the previously verified direct `0.61.0` executable, not the ambient `0.43.0` npm shim/cache. Existing archive SHA-256 is `44c645602313bc6be7ef99ebc34c5e08f3169695b631bd9ab09bda0d3b699cf3`, equal to `tool-assets.json`; the runner also verifies that its archive member equals the executable (`be740ac09306e9d2417230065bbb14687fa5b19a7ba771c61c7591a75c3c0b5e`). No download/install occurred.
- pnpm: existing native `12.16.1`, executable SHA-256 `dbeac289e38258dbbe9c2aa3e51e33be2c5118682b05dd20d7f2e0fd11f38b95`; the older ambient shim is not used.
- Exact existing checker/linter: `Version 7.1.0-beta (tsrs 0.20.1-ts7.1.0-beta, microsoft/TypeScript@3e9236361fa9)` and Biome `2.6.4`, verified via direct repository launchers. `tool-identities` and `checker-linter-identities` logs retain paths, launcher hashes and actual version output.
- Actual installed Matt bodies/references were read and invoked; the user overrides `implement`'s commit default. `B/installed-skill-hashes.json` records those bodies without claiming an installed project lock. The declared upstream pin remains `59db609eb1e18aaf59b63284d0e52255aff0c63c`; no skill body/reference or pin was edited.

### Genuine sequential red–green cycles

Each row ran `node --test --test-name-pattern='<exact test name>' .superman/ci/archgate-policy.test.ts` through the runner before and after the stated minimal change. In every RED the pinned engine returned exit 0/pass true/no findings, causing `0 !== 1`; the test command exited 1 with 0 passed/1 failed. Each same-command GREEN exited 0 with 1 passed/0 failed and the expected public SUP-005 diagnostic.

| Exact test name | RED/GREEN log labels | Minimal change after RED |
|---|---|---|
| `SUP-005 rejects a Deno file coverage suppression` | `red-deno-file` / `green-deno-file` | Add the declared Deno family to the existing JS/TS comment path; leave JSON Biome-only and HCL Trivy-only |
| `SUP-005 rejects Deno annotations after native comment whitespace` | `red-deno-whitespace` / `green-deno-whitespace` | Include Rust's U+0085 whitespace, absent from JS `trimStart()` |
| `SUP-005 rejects Deno annotations after combined JSDoc and native whitespace` | `red-deno-jsdoc-whitespace` / `green-deno-jsdoc-whitespace` | Resolve the independent-review finding: normalize the combined whitespace/star prefix inside the Deno pattern only, preserving other tool semantics |

The first RED used intake rule SHA-256 `515958cec2e6aaba419928ccfd1b61523c9e9e7b48934a24a9d5c5dad30a949b`; first GREEN used `629d8d8492f8b8880b4a7a08b13bfa03c56503112b06c3852d345f4ce467eaa1`. The same test bytes (`88a7f9334f943090ffe6628a6481e8a6a62eb97172c970dc37517986de32fcc0`) ran on both sides. Later-cycle identities are retained in their JSON logs, not substituted with final hashes.

Additional process/callback cases are regression evidence, not invented earlier RED observations. The initial `deno-process-regressions` run had 3 pass/2 fixture failures: ESM `export` was invalid in `.cts`, and the generated regex was invalid. Corrected those fixture bytes to CommonJS and a valid escaped regex in both seams without relaxing the production rule. Corrected Deno-only runs passed 5 process/2 callback tests before the two whitespace cycles. The first owned-file Biome check reported formatting errors and a template-placeholder warning; formatting/string construction was corrected without disabling a rule.

### Independent review and corrected-source local checks

The actual Matt `code-review` skill ran fresh Standards and Spec agents independently against `B/review-scope.patch`: allowed working-tree bytes versus captured intake, including new/uncommitted files, not `HEAD...HEAD`. Both axes found one combined U+0085/JSDoc-prefix gap (Spec: P2). The third cycle above reproduced and corrected it; both follow-up reviews closed the source finding. Each then found one evidence-attribution error (Spec: P3): the earlier raw-driver refusal was incorrectly grouped as final-source execution. The table now explicitly preserves its earlier source identity. Final evidence-review closure follows below. The separate code-quality interview changed concurrently and is explicitly excluded/preserved, not attributed to this slice.

These checks executed in the real checkout. The test/type/lint/Archgate rows use the final rule/test bytes below. The explicitly earlier raw-driver row is only a dirty-boundary observation; its JSON retains the pre-correction hashes, not the final-source identities.

| Runner label | Program and arguments | Observed result |
|---|---|---|
| `archgate-policy-post-review` | `node --test .superman/ci/archgate-policy.test.ts` | Exit 0; **41 passed**, 0 failed/skipped |
| `rule-callbacks-post-review` | `node --test .superman/ci/rule-coverage.test.ts` | Exit 0; **49 passed**, 0 failed/skipped |
| `typecheck-post-review-final` | `node node_modules/tsrs/bin/tsrs --noEmit` | Exit 0, no diagnostics; typechecking also passed regularly during implementation |
| `biome-post-review` | `node node_modules/@biomejs/biome/bin/biome ci --error-on-warnings` | Exit 0; 39 files, no diagnostics/fixes; owned-file check also passed |
| `archgate-post-review-final` | `archgate check --strict --output json` | Exit 0; 8 evaluated rules passed, no warnings/errors/rule errors/suppressions; normal engine-selected scope, not full admission |
| `raw-driver-dirty-boundary` (earlier source) | `node --input-type=module -e 'import { execFileSync } from "node:child_process"; process.env.HEAD_REF = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } }).trim(); await import("./.superman/ci/raw-gates.ts");'` | Exit **1**: `G9: dirty inputs; commit or preserve them before replay`; no real checkout repair/staging/commit |

Final implemented-source identities (SHA-256; documentation/evidence completion is separate):

```text
cd139662ef2571258708e57e027f7c700080898496f99bbeef1aac039da467f6  .archgate/adrs/SUP-005-no-inline-suppression.rules.ts
bd15b279f1182011fa04cbb219e5887c92df1c6c4a2ac688208c006949df7643  .archgate/adrs/SUP-005-no-inline-suppression.md
68985f5b64665997f4ded3a89c8356397bb7acd92bce60ab57a869ac7015a775  .superman/ci/archgate-policy.test.ts
1e94d00aab2aac344b7a08defc1252c15746889dfe5fdcb1b83c701c8aaea4a6  .superman/ci/rule-coverage.test.ts
```

### Full-suite result and stable-snapshot verification boundary

`full-bootstrap-coverage`: `node .superman/ci/coverage.ts --mode full` ran the complete pre-correction bootstrap suite: **441 passed, 0 failed/skipped**, approximately 636 seconds. The overall command exited **1** with `Coverage inputs changed; caller changes were preserved`. The concurrent interview changed while this ran; the collector correctly withheld a coverage receipt. This is neither final-source coverage nor a passing coverage gate.

The final-source rerun uses `B/verification-snapshot`, an owned frozen 121-file test fixture under G3. `B/snapshot-manifest.json` records exact copied hashes/modes, shared already-installed dependencies, real intake HEAD and disposable fixture commit `9d7b2f05638d86e0db05ec9533c692e6ae684017`. The four source/companion hashes above match both snapshot and real checkout. No real branch/ref/index was changed. Invocation:

```text
python3 B/check.py --fixture-root B/verification-snapshot full-bootstrap-coverage-snapshot node .superman/ci/coverage.ts --mode full
```

The completed run's result follows below. Its receipt describes the disposable snapshot, not the real dirty checkout or admission. Later evidence-note edits do not retroactively change that receipt's input identity.

The source research's immutable Deno commit is not an adopted pin. These checks execute current real Node/Archgate, not Deno or a replacement collector. Public process fixtures are parser/engine evidence for SUP-005; callback contexts are supplemental, not parser proof. Native grammar and broader block/suffix prevention remain distinct. No threshold, inventory, historical platform evidence, ticket status or readiness blocker is weakened. Standalone-collector Deno protection, Deno runtime/profile/measurement acceptance, three-platform verification, runner/App/host evidence, strict-amendment reconciliation and human exact-head review/merge remain outside this slice and unresolved.

### Final frozen-snapshot result

`full-bootstrap-coverage-snapshot` completed with **exit 0** in 628.268 seconds. Its full current-Node bootstrap suite passed **442 tests, 0 failed, 0 skipped, 0 cancelled**. The uncached collector evaluated all 18 inventoried runtime/rule sources with no cached files and published a passing `superman.coverage/1` receipt at:

```text
B/verification-snapshot/.superman-ci/coverage-8irB2N/coverage-receipt.json
```

The receipt binds disposable fixture commit `9d7b2f05638d86e0db05ec9533c692e6ae684017`, darwin-arm64 and input hash `f72c4817ae9855e27ac1b31874f46fb455a95d614cc9acbbe5cb781740ca4e03`, with `mergeAuthority: none`. This commit exists only in the owned test fixture. Final rule/test bytes and non-Markdown policy still match the real checkout after completion; the four hashes above remain unchanged. The later evidence/preparation-note edits and concurrent interview are not retroactively included in that snapshot fingerprint.

| Overall metric | Covered / total | Percent | Skipped |
|---|---:|---:|---:|
| Lines | 1687 / 1750 | 96.4% | 0 |
| Statements | 1885 / 1975 | 95.44% | 0 |
| Branches | 1735 / 1876 | 92.48% | 0 |
| Functions | 225 / 234 | 96.15% | 0 |

Each overall metric passes its existing 90% minimum; the 100% target is retained, **not reached or weakened**. Supplemental callback measurement of actual SUP-005 code reports 234/234 lines, 280/280 statements, 19/19 functions and 253/259 branches (97.68%). Those numbers do not turn controlled callback AST responses into real-parser proof; the pinned-engine process tests remain separate.

The completed stderr log retains Node's `stripTypeScriptTypes` experimental-feature warning; it was not suppressed. Artifact SHA-256 values:

```text
f0f4f3fcfd338879eaef9a3a892699f6d4b5ccd135d1ebee551a6f3370324f76  coverage-receipt.json
e774963c7336f2014c53941982a6eba2f5e8bbcce2cf01339ba159235ab09fbd  coverage-summary.json
383fae95229173bf371b544b7f9b99c1a408b009b98adfd39ddd753e9bf460cd  B/snapshot-manifest.json
```

`B/preservation-result.json` confirms the real HEAD remains `12ea1dada7878dd783902a4eae73133f49f12f8c`, staged diff remains empty, the entire historical evidence prefix is unchanged, inspected skill hashes remain unchanged since observation, and final code/non-Markdown policy matches the snapshot. Of 114 unrelated intake files, 113 remain byte-identical; the concurrent code-quality interview's evolving bytes are preserved/excluded, not reverted or adopted. Only the five existing and two new approved files are attributed to this phase. No installations, real-repository commits, credential/hosted operations or activation occurred.

### Final independent review closure

- **Standards: zero unresolved findings.** Both the NEL/JSDoc policy gap and the earlier raw-driver attribution error are closed; no remaining documented-standard breach or Fowler-smell finding. Reviewer session: `ses_e694d92dbffe8KMT8WrFGzGIiy`.
- **Spec: zero unresolved findings.** P2 (combined NEL/JSDoc prefix) and P3 (evidence attribution) are closed; no remaining missing/partial requirement, incorrect behavior or scope creep within G1–G4. Reviewer session: `ses_e694d923bffeGWHpbDRYXyE3k0`.

Both independent reviewers inspected the completed snapshot artifacts and final source/evidence bindings read-only. Each axis had two findings resolved and none open; there is no outstanding worst issue on either axis. This closes the bounded local preparation/review workflow only. The real checkout remains uncommitted and dirty, raw admission remains blocked, and all Deno/native/host/Gate 1 and product-admission limits above remain in force. No readiness or merge authority is claimed by the local result.
