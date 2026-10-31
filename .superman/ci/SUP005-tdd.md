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
