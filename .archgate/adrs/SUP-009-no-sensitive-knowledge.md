---
id: SUP-009
title: No secrets or personal data in wiki or vault
domain: superman
rules: true
files: ["wiki/**", ".superman/vault/**"]
---

Source: docs/adr/0012-governed-vault-and-okf-wiki.md

## Context

Durable context is copied into agent sessions and reviewed history. A secret or personal record in raw sources leaks just as surely as one in a promoted page; moving it to candidates is not containment.

## Decision

No secrets or personal data may be committed under wiki/ or .superman/vault/, including policy, raw sources and pending candidates. Use non-identifying references and synthetic fixture data outside these roots. Stop/report suspected exposure; do not merely move or mask a live credential in the same history.

## Compliance and Enforcement

Rule `no-sensitive-knowledge` blocks recognizable credential/private-key patterns, email addresses and common structured personal-data fields. Findings name the category/file/line, **never echo the sensitive value**. It is text-pattern detection, not proof that arbitrary prose, binary sources, names, secrets or encoded data are safe. G11 and explicit human import/promotion review remain required; no allowlist/suppression makes real personal data acceptable. Non-text raw material requires review/scanner evidence, not an invented clean-text verdict.

Fixtures are generated from TypeScript strings in temporary repositories, not tracked sensitive examples inside the governed roots. No-op on an absent wiki/vault means nothing was scanned, not that future contents passed. G12's full parser/budget/link checks activate separately in ticket 28.

## References

- docs/adr/0012-governed-vault-and-okf-wiki.md
- spec §5.8, §17
