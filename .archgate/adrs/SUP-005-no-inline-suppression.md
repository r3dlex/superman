---
id: SUP-005
title: No inline gate suppressions
domain: superman
rules: true
files: ["**/*"]
---

Source: docs/adr/0004-no-waivers.md

## Decision

Reject effective `archgate-ignore`, `biome-ignore` and `trivy:ignore` directives. Fix the finding or change its governing policy through Gate 1; a ticket PR cannot grant itself a waiver. “Inert” means inert to the consuming tool, not merely a string in the source language: Archgate 0.61.0 can apply a raw-line directive inside a template, quoted scalar, block comment or heredoc.

## Compliance and Enforcement

Rule `no-inline-suppression` runs Archgate's raw-line grammar independently of source-language lexing, then inspects supported Biome/Trivy comments. It does not ban every occurrence of directive names: genuinely inert inline/escaped strings and engine-excluded fenced Markdown examples remain permitted. SUP-005 findings name the source location in the message rather than Archgate's suppressible `file` field: a directive cannot disable its own prohibition.

- Archgate, all extensions: use the pinned engine's exact line/HTML regexes, LF splitting, non-whitespace reason requirement and Markdown-only fence/HTML handling. Language quotes/scalars never exempt a matching raw line. Differential fixtures plant a real blocking rule and show native exit 1→0/suppressed 1 before asserting that SUP-005 keeps the combined run blocked.
- Plain TS/JS and module extensions: validate syntax through `ctx.ast`, then collect original-source Biome comments with literal/escape/template-expression state and AST-provided regex spellings/counts. Extra identical spellings are inspected as division expressions, not guessed from preceding tokens; diagnostics identify alternative locations when the AST cannot disambiguate original positions. Missing AST/source reconciliation fails closed. Archgate 0.61.0's own comment collector skips whole templates and does not track regexes; using it alone misses effective comments.
- JSX/TSX: the bounded collector distinguishes balanced tag/attribute/text regions from JS expression containers. Apostrophes, quotes and comment-looking bytes in raw JSX text do not open JS strings/comments. Native Biome fixtures prove both a later effective suppression and genuinely inert text/attribute/string cases. This is not full JSX/TSX grammar support: ambiguous angle/type-parameter contexts, parenthesized-child ambiguity, unsupported attribute values or unreconciled markup raise a rule error rather than a clean result. Even otherwise valid constructs outside that boundary remain unready until reviewed fixtures support them.
- JSON/JSONC: inspect line/block comments outside quoted strings for Biome's inline, file and range forms, including category values and multiple categories. Source block-comment prefixes do not hide directives.
- YAML: inspect Trivy hash comments outside quoted and literal/folded scalars; an anchor node property leaves the following scalar's quote boundary intact. A real comment after its closing quote is still forbidden. HCL/Terraform additionally supports line/block comments and heredoc examples; Dockerfiles use full-line hash comments for Trivy. Rule IDs, wildcard IDs and expiry suffixes do not grant exemptions.
- Markdown/MDX and remaining extensions: the independent Archgate pass is authoritative; there is no claim to tokenize other tool/language grammars.

The sandbox permits no parser imports or filesystem/process access; the rule uses only `RuleContext` and standard JavaScript. This is bounded bootstrap comment governance, not a replacement for Biome/Trivy, a general polyglot/JSX parser or proof of three-platform execution. Adopting another tool syntax needs Gate 1 rule changes and process fixtures before claiming coverage. Tests in `.superman/ci/archgate-policy.test.ts` generate temporary repositories and observe pinned Archgate 0.61.0 and, for the JSX regressions, Biome 2.6.4 process outcomes. Changed source invalidates earlier platform snapshots; final-source platform verification is separate.

## References

- docs/adr/0004-no-waivers.md
- docs/adr/0009-biome-and-trivy-gates.md
- spec §17
