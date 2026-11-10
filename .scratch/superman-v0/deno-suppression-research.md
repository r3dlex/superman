# Deno coverage suppressions — SUP005 preparation research

**Observed: 2026-11-01. Planning/source research only.** No runtime version, artifact, channel or platform is selected or verified. The commit below is an **immutable research reference, not a selected Superman pin**. This worker read public documentation/source/metadata and the earlier runtime research note; it did not execute Deno, tests, probes or installers, access credentials, perform hosted writes or Git actions, or spawn another agent. The only repository write is this new note. Existing SUP005 implementation/scope mapping is being researched separately and is not duplicated here.

## Findings at a glance

Deno's inspected native coverage reporter recognizes exactly four directive words: `deno-coverage-ignore`, `deno-coverage-ignore-file`, `deno-coverage-ignore-start`, and `deno-coverage-ignore-stop`. Recognition requires an actual **line comment**, an exact **case-sensitive, ASCII-hyphenated first whitespace-delimited word**, and the applicable placement/range conditions. The closing word is **`stop`, not `end`**. There are no c8, Istanbul or v8 comment aliases in this parser. [Constants and matching][keywords] [Matcher][match] [Range parser][range]

A candidate SUP005 rule may deliberately forbid a broader declared namespace, including spellings or placements that Deno currently ignores. That would be a **prevention-policy contract**, not evidence that every forbidden spelling suppresses Deno coverage. This note makes no choice about that contract.

## 1. Source identities and limits

| Surface | Observation, not adoption |
| --- | --- |
| Current stable release metadata | GitHub's latest-release endpoint returned `v2.9.8`, `draft: false`, `prerelease: false`, published `2026-10-21T15:28:53Z`. [Release API][release] |
| Immutable runtime source examined | That tag resolves directly to commit **`fe7ed012d92c642fd8e5607ac5a45d517538b5c5`**, the same candidate reference used by `deno-runtime-research.md`. Thus the observed current stable source and the earlier reference coincide; neither has become a selected pin. [Tag resolution][tag] |
| Actual official docs read | The live CLI reference's “Ignoring Code” section and the test-coverage guide's “Ignore code in the report” section. Their source was also read at docs commit **`74beb7585f7e798fe0bc8d867295bff23fc2e38e`**, returned by the docs HEAD API. [Live reference][docs-live] [Live guide][guide-live] [Immutable reference][docs] [Immutable guide][guide] [Docs HEAD metadata][docs-head] |
| Implementation owning recognition | `cli/tools/coverage/ignore_directives.rs`; `cli/tools/coverage/mod.rs` calls it on **original source**, then applies the resulting line sets/ranges to reports. This is not inferred from a blog or another coverage tool's syntax. [Original-source parsing][report-init] [Source selection/call site][report-call] |

All behavioral statements below are documentation observations or deductions from that fixed source, **not executed compatibility results**. No historical minimum-version, other-version, compiled-executable or platform claim is established.

## 2. Official documented contract

The reference documents:

- `// deno-coverage-ignore-file` at the top to omit the file;
- `// deno-coverage-ignore` immediately above the single line to omit;
- `// deno-coverage-ignore-start` and `// deno-coverage-ignore-stop` around a range;
- whitespace, but not other leading text, before the word inside the comment; trailing text is allowed;
- line comments only: `/* ... */` is explicitly invalid;
- matched, non-nested ranges; malformed ranges produce warnings and can leave code included. Ignored lines/branches are excluded rather than credited as covered. [Official reference][docs]

The source adds important precision to “trailing text,” “at the top,” and malformed nesting, below. These details should not be replaced by a generic prefix/substring match when describing Deno's own behavior.

## 3. Exact lexical recognition

For next-line/file matching, the implementation is equivalent to:

```text
comment.kind == Line
and comment.text.trim().split_whitespace().next() == Some(exact_directive_word)
```

The range parser uses the same line-comment/first-word rule for `-start` and `-stop`. There is no case folding, separator substitution, prefix match, punctuation stripping, argument parser or search for a later word. [Matcher][match] [Range parser][range]

Within an already lexed line comment, `trim` and `split_whitespace` use Rust's Unicode `White_Space` definition, not just an ordinary space. Tabs and Unicode whitespace can separate the directive from trailing text. Do not silently equate that character class with JavaScript regex `\s` when describing an exact implementation. The inspected Deno source declares Rust `1.95.0`; that version's standard-library documentation owns these string-method semantics. [Rust toolchain declaration][rust-toolchain] [Rust split_whitespace][rust-split] [Rust trim][rust-trim]

| Source spelling/context | Native recognition at the inspected source; placement still matters |
| --- | --- |
| `//deno-coverage-ignore` | Recognized; whitespace after `//` is not required. |
| `//   deno-coverage-ignore` or a tab before the word | Recognized; leading comment-body whitespace is removed. |
| `// deno-coverage-ignore reason` or `// deno-coverage-ignore -- reason` | Recognized; later whitespace-separated text is discarded. |
| `// deno-coverage-ignore : reason` | Recognized; the colon is in later text, not part of the first word. |
| `// deno-coverage-ignore 3` | Recognized as the ordinary single-line directive; `3` is not a line-count parameter. |
| `// deno-coverage-ignore: reason`, `// deno-coverage-ignore;`, or `// deno-coverage-ignore(reason)` | Not recognized: punctuation is attached to the first word. “Any trailing text” in the docs does not mean arbitrary attached suffixes. |
| `// DENO-COVERAGE-IGNORE` or mixed case | Not recognized: equality is case-sensitive. |
| `// deno_coverage_ignore`, mixed underscore/hyphen separators, or spaced-out words | Not recognized: the exact words use ASCII `-` separators. |
| `// deno-coverage-ignore-next`, `// deno-coverage-ignore-end`, or another extra suffix | Not recognized; these are not alternative directive words. |
| `// reason deno-coverage-ignore` | Not recognized: only the first whitespace-delimited word is checked. |
| `/// deno-coverage-ignore` | Not recognized: the comment body begins with another `/`, not the directive. |
| `/* deno-coverage-ignore */` or `/** deno-coverage-ignore */` | Not recognized: block-comment kind is rejected, even with an otherwise exact word. |
| `const text = "// deno-coverage-ignore";` | Not a directive: it is a string token, not a comment. The same distinction applies to a plain template-literal text mention, not to actual comments inside template interpolations. |

The spelling rows follow directly from exact first-word comparison. For lexical context, Deno collects only `TokenOrComment::Comment` values, preserving line/block kind. Its lexer dependency is locked as `deno_ast` `0.53.3`; the corresponding upstream tag resolves to `8bd7154d96b6dcb7120ad9ed38595e22411f3fd1`, whose lexer keeps tokens and comments separate and sorts them by source position. These source observations are not local lexer probes. [Deno comment collection][lex] [Dependency lock][ast-lock] [AST tag metadata][ast-tag] [AST lexer source][ast-lex]

## 4. Placement and effect

### Single line: physical adjacency, not “next statement”

`parse_next_ignore_directives` records the directive comment's **physical source-line index**. The report omits a function or branch when its mapped start line is immediately after that index; line filtering removes both the directive's line and its immediately following line. There is no search across blank lines/comments to find the next executable statement, nor an instruction to omit a whole following function body. A numeric trailing token changes none of this. [Next-line parser][next] [Function filtering][report-init] [Branch filtering][report-branches] [Line filtering][report-lines]

There is no “comment must occupy its own line” or column-zero check. Consequently, source such as `work(); // deno-coverage-ignore` is recognized too: it can remove the current line from the line denominator and affect the following line, rather than simply meaning “ignore this statement.” Function/branch filtering still uses the mapped following-line check, so do not claim identical current-line effects for all metrics. These are source deductions, not recommended usage. [Comment collection][lex] [Next-line parser][next] [Report filters][report-lines] [Branch filtering][report-branches]

### File: first comment before code, not any comment near the top

Only the **first lexed comment** is considered for `-file`. It must be a matching line comment, and, if code exists, its end must precede or equal the first non-shebang token's start. Blank leading space/lines do not disqualify it; a shebang is expressly excluded from first-token detection. An earlier license/comment, including a block comment, disqualifies a later `-file`; so does code such as a directive string or import before it. The upstream unit tests expressly cover a non-first comment, code-before-comment and shebang cases. [File parser][file] [Shebang/token handling][lex] [File-position tests][file-tests]

A valid file-ignore returns empty function, branch and line collections. The caller only includes reports with found lines, implementing omission rather than a fabricated 100% result. [File-ignore result][report-init] [Report inclusion][report-call]

### Ranges: `start` / `stop`, inclusive line bounds

- `-start` opens a range; `-stop` closes it. The resulting range runs from the **start comment's line through the stop comment's line, inclusively**. The report compares those bounds inclusively for lines and mapped function/branch starts. There is no separate `-end`, `off` or `on` alias. [Range parser][range] [Function filtering][report-init] [Branch filtering][report-branches] [Line filtering][report-lines]
- No lexical requirement puts these comments on separate lines from preceding code. Inline boundary comments can therefore affect code on their boundary lines; treating them as token-exact AST-region boundaries would be inaccurate. [Range bounds][range] [Line filtering][report-lines]
- An unmatched `-stop` adds no range and warns when warning logging is enabled. An unterminated `-start` contributes **no open-ended range through EOF**; it is discarded, with a warning when enabled. Previously completed ranges remain in the result. [Range parser][range]
- Although nesting is documented as invalid, the implementation maintains a depth counter: nested starts warn, and a **fully balanced nested sequence emits one outer range** when depth returns to zero. An outer sequence still open at EOF emits no range, even if an inner pair closed. Thus “nested is invalid” must not be interpreted as “nested comments can never suppress code.” The pinned unit test asserts a single outer range for balanced nesting; the upstream expected report also contains a warning alongside a successful coverage summary. [Range parser][range] [Range tests][range-tests] [Expected nested-warning report][nested-output]
- The parser logs these malformed-range warnings; it does not return a malformed-pragma error. They are not a substitute for an independent suppression prohibition. Upstream expected reports show warnings plus coverage for nested, unterminated and stray-stop cases. These files were read, not run. [Range parser][range] [Nested report][nested-output] [Unterminated report][unterminated-output] [Stray-stop report][stop-output]

## 5. Are c8 / Istanbul / v8 comments aliases in Deno?

**Not in the inspected native Deno coverage path.** A line comment beginning with `c8`, `istanbul` or `v8` fails the exact first-word comparison; their common block-comment forms fail the comment-kind check as well. The four constants and the report call sites contain no alias conversion or delegated c8/Istanbul ignore parser. [Constants][keywords] [Matcher][match] [Range parser][range] [Native report path][report-init]

The native collector obtains precise coverage through V8 inspector `Profiler.startPreciseCoverage` / `Profiler.takePreciseCoverage` and serializes script profiles; the Deno report layer owns the comment filtering examined here. “V8-backed” is not evidence that a comment spelling beginning with `v8` is automatically recognized. [Collector][collector] [Native report path][report-init]

This conclusion is bounded to Deno's native pipeline at the cited commit. It does **not** claim these comments are harmless to another instrumenter, converter or reporter used alongside Deno, nor justify removing existing non-Deno suppression families from SUP005. No other tool's acceptance grammar was investigated here.

## 6. Enforcement distinction and fixture recommendation

Keep these two claims separate in any later preparation slice:

1. **Source-backed native grammar:** the four exact words, line-comment recognition and placement/closure rules above describe this Deno source snapshot.
2. **Declared forbidden namespace:** a SUP005 contract could intentionally reject a larger family, independent of whether a particular uppercase, underscore, block, punctuation-suffixed, misplaced or unbalanced instance currently suppresses anything. Label such expectations as prevention-policy coverage, not native-Deno behavior. This research neither selects that namespace nor authorizes widening any scan scope/exemption.

**Short fixture recommendation:** exercise the public SUP005 diagnostic/scan surface with fixture source bytes containing real comments: a top-first `-file`, an adjacent single-line directive, and a balanced `-start`/`-stop` pair. Those are meaningful suppression examples without needing to run Deno for the rule-recognition test. Keep inert string mentions as separate lexical-context controls, with their expected SUP005 result determined by the declared policy. A string-only example is not evidence that the rule catches actual Deno pragmas: the generated/scanned source must contain the comment, not merely a string describing it. [Deno lexical distinction][lex] [Native matching][match] [File parser][file] [Range parser][range]

## 7. Verification obligations — none executed here

For a later separately authorized change:

- Bind “recognized by Deno” fixture explanations to the immutable source reference; re-read the owning parser/call sites if a different runtime source is later selected. Metadata observation is not version admission or runtime/platform evidence.
- Give public-comment fixtures the placement needed to be genuinely effective: file-ignore first before code, next-line immediately adjacent, and ranges properly closed with `-stop`. Include inline, intervening-blank, earlier-comment, shebang and malformed-range cases where the declared contract needs that distinction. [Placement sources above][file] [Range parser][range] [Report filters][report-lines]
- Distinguish grammar controls from any deliberately broader prevention cases: case, underscores/hyphens, block comments, attached versus whitespace-separated punctuation, unknown suffixes, leading prose and Unicode whitespace. Set SUP005 outcomes from its reviewed contract, not by pretending all these forms are native aliases. [Matcher][match] [Rust whitespace][rust-split]
- Keep inert string/template mentions separately identified. Verify actual comment bytes reach the public scanning seam; do not use a detector-helper assertion or a string-only mention as the sole evidence for public suppression recognition. This is a fixture recommendation, not an assertion about the existing local mapping.
- If native runtime-effect evidence is later required, obtain separate authorization and an admitted runtime/artifact/platform arrangement. Source reading and static SUP005 fixtures establish neither actual Deno execution nor correct coverage denominators on any platform. No such evidence is supplied by this note.

## Sources

Live documentation/metadata was observed on **2026-11-01** and can move. Runtime implementation and upstream fixtures below use the immutable research commit; no tests were executed. The `deno_ast` lexer is supplementary owner-source reading at its resolved version tag, not an artifact-integrity attestation.

[release]: https://api.github.com/repos/denoland/deno/releases/latest
[tag]: https://api.github.com/repos/denoland/deno/git/ref/tags/v2.9.8
[docs-head]: https://api.github.com/repos/denoland/docs/commits/main
[docs-live]: https://docs.deno.com/runtime/reference/cli/coverage/#ignoring-code
[guide-live]: https://docs.deno.com/runtime/test/coverage/#ignore-code-in-the-report
[docs]: https://github.com/denoland/docs/blob/74beb7585f7e798fe0bc8d867295bff23fc2e38e/runtime/reference/cli/coverage.md#ignoring-code
[guide]: https://github.com/denoland/docs/blob/74beb7585f7e798fe0bc8d867295bff23fc2e38e/runtime/test/coverage.md#ignore-code-in-the-report
[keywords]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L10-L13
[lex]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L31-L57
[match]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L190-L207
[next]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L144-L158
[file]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L160-L188
[file-tests]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L326-L395
[range]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L59-L142
[range-tests]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/ignore_directives.rs#L230-L300
[report-init]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/mod.rs#L155-L241
[report-branches]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/mod.rs#L298-L324
[report-lines]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/mod.rs#L504-L524
[report-call]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/mod.rs#L827-L916
[collector]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/coverage.rs#L44-L165
[nested-output]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tests/specs/coverage/nested_ignore_comment_warning/cov.out
[unterminated-output]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tests/specs/coverage/unterminated_ignore_comment_warning/cov.out
[stop-output]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tests/specs/coverage/missing_ignore_start_comment_warning/cov.out
[ast-lock]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/Cargo.lock#L2074-L2078
[ast-tag]: https://api.github.com/repos/denoland/deno_ast/git/ref/tags/0.53.3
[ast-lex]: https://github.com/denoland/deno_ast/blob/8bd7154d96b6dcb7120ad9ed38595e22411f3fd1/src/lexing.rs
[rust-toolchain]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/rust-toolchain.toml
[rust-split]: https://doc.rust-lang.org/1.95.0/std/primitive.str.html#method.split_whitespace
[rust-trim]: https://doc.rust-lang.org/1.95.0/std/primitive.str.html#method.trim
