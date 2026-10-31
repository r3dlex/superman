---
Status: accepted
---

# Govern sources separately from the agent-owned OKF wiki

**M1 amendment 4, André, 2026-10-30: M7c is in v0.** Durable agent memories otherwise live outside code review or blur source evidence with editable claims. A protected vault policy governs read-only raw sources, proposed candidates and an agent-owned wiki; promotion occurs in the ticket PR, not an unattended second publication. The operational contract is spec §5.8, with workflow in §6.4–6.5 and activation in §17; terms live in `GLOSSARY.md`.

## Decisions and trade-offs

- **Review knowledge with its work.** Agents propose candidates before promotion and remove promoted candidates in that PR, leaving wiki provenance/log as one canonical copy. Unresolved proposals stay pending. Raw additions/replacements require explicit human-reviewed Gate 1 imports; ordinary ingestion cannot rewrite evidence. Final-tree checks cannot prove candidate-first chronology or factual truth.
- **Portable format, explicit stricter policy.** Pin OKF v0.2 and the exact timestamp amendment separately. Upstream permits unknown types/keys, optional index/log and broken links; Superman's mandatory complete index/log, strict internal links and exact-root-ID wikilinks are named extensions, not invented upstream requirements.
- **No fictional v0.3.** The timestamp change still has the Version 0.2 header, and no published v0.3 tag/release was found. All timestamp-valued fields require explicit offsets, without making optional timestamps mandatory; log date headings remain dates. Expiry warns/rechecks, malformed timestamps block.
- **General parsing, zero runtime dependencies.** André declined a restricted YAML subset. Full YAML/Markdown coverage and adversarial/conformance fixtures are required before G12 activation; no regex parser advertised as complete, executable tags, silent misparsing or undeclared third-party parser. This is meaningful implementation cost, not work completed by this spec.
- **Blocking and change-aware.** G12 validates syntax/shape, link impact, root inventory/index, current PR's log and byte budgets; uncertainty broadens validation, never bypasses it. The PR number is known before review, unlike a future squash SHA/time. Every PR kind logs after activation; nightly performs uncached full checks and proposes wiki-only maintenance for human review.
- **Governance is not confidentiality proof.** SUP-009 forbids secrets/personal data across wiki/vault, including raw imports. Pattern checks and G11 detect only some exposures; import/promotion review is still mandatory, and suspected exposure stops work. Bounded byte budgets prevent unreviewed context growth; archives remain indexed rather than truncated.

## Consequences

Tickets 27–32 and their protected activation follow-ups precede release. Policy/raw paths remain protected while ticket and wiki-maintenance PRs can change regular candidate/wiki content. The ≤25-line AGENTS block requires reading the wiki index before code but subordinates all knowledge to reviewed instructions/code/CI. Wiki-lint cannot change code/policy/raw, approve, merge or directly push main. Candidate-first and full parsing are not waived to make a small implementation estimate fit.

Ticket 32 is explicitly `Kind: knowledge`: inventing product behavior just to obtain a red test would be false evidence. Its strict Markdown-only/own-Status boundary makes code replay inapplicable while G12/privacy/human approval remain mandatory (ADR 0004).

## Primary sources (checked 2026-10-30)

- [Canonical published v0.2 text, `25461db`](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/25461dbcdd5b2f3fc9aef99c19fb7d8a94ef6149/SPEC.md): only `type` always required; bundle-relative concept IDs, optional reserved index/log, standard Markdown links and extensibility.
- [Timestamp amendment, `ad30107`](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/ad30107c31c06aec8a7d5636e0d1058118604e6f/SPEC.md) and [PR #6](https://github.com/GoogleCloudPlatform/open-knowledge-format/pull/6): explicit offsets on every timestamp-valued key; not a new published version.
- [Version ambiguity #24](https://github.com/GoogleCloudPlatform/open-knowledge-format/issues/24) and [wikilink proposal #9](https://github.com/GoogleCloudPlatform/open-knowledge-format/issues/9): do not label Superman extensions as upstream conformance requirements.
- [Apache-2.0 format repository license](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/ad30107c31c06aec8a7d5636e0d1058118604e6f/LICENSE.md); it does not prescribe the license of independently authored wiki contents.
