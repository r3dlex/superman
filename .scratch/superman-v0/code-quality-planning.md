# Deno, Q35 and completed SUP-005 — combined reconciliation

**Status:** Matt `to-spec` → approved `to-tickets` → independent `code-review` completed. Standards: zero findings; Spec: zero findings. Planning only: ticket 01 and Deno activation remain blocked. All changes remain uncommitted.

## Authorized sequence

1. **Synthesize in place:** reconcile the confirmed Deno plan, Q35's final quality contract and completed G1–G4 SUP-005 preparation. Done when the spec/rationale/README distinguish their design, local evidence and remaining readiness obligations without reviving superseded infrastructure.
2. **Reconcile the existing backlog:** present affected IDs, delivery/acceptance changes and blocking edges through Matt `to-tickets`; wait for approval before writing. Done when the approved criteria agree with the spec, with IDs/kinds/statuses/valid blockers preserved and no default readiness assignment or new product ticket.
3. **Review both axes:** independent Standards and Spec reviewers examine the combined inherited/own document delta and the confirmed decisions, including new/uncommitted files. Done when findings are resolved within approved scope and preservation/document checks pass. This is not Gate 1 approval or merge authority.

André first approved a nine-document allowlist and retained the public testing seams. After concurrent overlapping synthesis was detected, this session made no edits and paused. André then explicitly selected this session to reconcile both topics and requested the Matt prompts be printed and executed. He approved the expanded 13-document scope and unchanged public seams through a short OpenCode popup. The other session's later handoff reports completed documentation work; it is coordination/evidence, not additional authorization.

No executable/rule/test/config/workflow/dependency/pin/skill edit, runtime execution, installation, credential use, hosted operation, real-repository staging/commit, push, approval/merge or activation is authorized by this reconciliation. Historical interviews and SUP-005 evidence/preparation records remain unchanged. Future preparation needs its own exact slice/files/seam approval.

## Inputs and authority

| Input | Governing interpretation |
|---|---|
| [Deno decisions](deno-amendment.md#final-interview-decisions-authoritative-review-inputs) | Confirmed Q4/Q6–Q24, including owned Deno operation, retained real-Node tool hosts, source/three-binary releases, broader reviewed compiled grants without sandbox claims and release-assets ordering |
| [Quality contract](code-quality-amendment.md#current-proposed-contract) | Current proposed contract plus U2/Q32/Q35 supersession, not the historical controller/VM/hosted-pilot selections; design confirmation is not activation |
| [SUP-005 preparation](gate1-preparation.md) and [append-only evidence](../../.superman/ci/SUP005-tdd.md) | G1–G4's completed local syntax-prevention slice; current-Node frozen-fixture measurements and independent closure do not prove actual Deno collection, real dirty-checkout admission or three-platform readiness |
| Current spec and rationale | Spec §§5.4/5.7/8/17 own the reconciled operational plan; ADRs 0015–0017 explain the trade-offs. Retain ADRs 0001/0005's authority/identity limits |

The same public CLI/bootstrap/collector process/report seams, actual-Deno mutation/coverage fixtures, native exact-artifact conformance and real pinned-Archgate process fixtures remain approved test design. Supplemental actual exported-rule callbacks do not replace engine fixtures. No new private-helper or external-controller seam is introduced.

## Intake and inherited work

- Real HEAD: `12ea1dada7878dd783902a4eae73133f49f12f8c`, branch `spec/superman-v0`; index empty at intake.
- Fresh takeover snapshot: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-combined-reconciliation-72q9be77/`. `baseline.json` and `files/` preserve 122 tracked/untracked files; `handover.json` and `handover/files/` preserve the stable received draft before this session's edits. They match. Never compare this work to HEAD alone.
- Earlier pre-Q35-draft snapshot: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-quality-planning-fj9vbjha/`, 121 files. It supports review of the inherited Q35 delta; it is not substituted for the fresh takeover preservation baseline.
- Quality-session handoff artifacts: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-quality-to-spec-i4zb06jy/`. Its `document-validation.json` reports document checks only, not runtime/CI/platform acceptance.

Inherited Q35 work comprises the spec and ADRs 0001/0003/0006/0009/0010/0011/0014/0015/0016 plus new proposed ADR 0017. This session retains that draft rather than recreating or claiming authorship of it. Earlier Deno planning, the five-file SUP-005 implementation/evidence delta and unrelated work are intake state, not newly implemented here.

## Document allowlist

The approved 13-document allowance is:

| Surface | Exact paths |
|---|---|
| Planning and entrypoint | `.scratch/superman-v0/spec.md`, `README.md`, `.scratch/superman-v0/code-quality-planning.md` |
| Retained authority/runtime/release rationale | `docs/adr/0001-human-approval-on-head-sha.md`, `docs/adr/0003-zero-runtime-deps-typescript-only.md`, `docs/adr/0006-one-npm-package-many-harnesses.md` |
| Quality/optimization rationale | `docs/adr/0009-biome-and-trivy-gates.md`, `docs/adr/0010-affected-analysis-and-change-aware-ci.md`, `docs/adr/0011-remote-gate-cache-security.md`, `docs/adr/0014-overall-coverage-in-incremental-ci.md` |
| Current design rationale | `docs/adr/0015-preferred-self-hosted-ci-with-hosted-exceptions.md`, `docs/adr/0016-deno-operational-runtime-and-release-bundles.md`, `docs/adr/0017-quality-first-local-and-remote-contract.md` |

This is an allowance, not a requirement to rewrite every inherited file. Ticket edits require the separate proposal/approval below. Keep all existing ADR statuses, numbered sections/stories and the vanilla skill pin `59db609eb1e18aaf59b63284d0e52255aff0c63c`; installed skill hashes are captured in the takeover snapshot and no skill file is edited.

## Executed prompts

The actual installed Matt `ask-matt` router and `to-spec`, `to-tickets`, `code-review` definitions were read and invoked in the recorded order. The prompts were printed before execution. Local tracker conventions override publication/readiness defaults; intake-relative review overrides the committed-diff-only default. No skill body is modified; unchanged hashes do not claim a fully verified project installation at the declared upstream pin.

```text
/to-spec Reconcile the existing spec/rationale/README with confirmed Deno decisions, Q35's current contract and completed G1–G4 SUP-005 preparation. Reuse the inherited draft; confirm document scope and retain public seams. Separate design/local evidence from unproved Deno integration and Gate 1 admission.
/to-tickets Propose and then apply only the approved existing-backlog delta. Preserve IDs, kinds, statuses and valid blocking edges; no regeneration, new product ticket or readiness assignment.
/code-review Review inherited and own uncommitted reconciliation against confirmed Deno/Q35/SUP-005 decisions with independent Standards and Spec reviewers and preserved intake snapshots. Resolve findings only within approved scope.
```

## Approved existing-ticket reconciliation

André approved the displayed 24-item proposal through an OpenCode popup, explicitly retaining granularity, kinds/statuses and every blocking edge. No split, merge, new numerical ticket or readiness assignment was approved. The exact ticket allowance is:

| IDs | Exact filenames under `.scratch/superman-v0/issues/` | Approved delta |
|---|---|---|
| 01–04 | `01-skeleton-and-raw-gates.md`, `02-config-receipts-exec.md`, `03-doctor.md`, `04-pre-commit-and-init.md` | Combined prerequisites/SUP-005 scope; complete receipts/applicability; no optional full-local Trivy skip; partial hook feedback and existing-environment templates |
| 05–08 | `05-path-policy-trace-test-first.md`, `06-ratchets-and-gate-ci.md`, `07-merge-ready-and-audit.md`, `08-pinned-pocock-skills-and-next.md` | Protected quality mappings/severities; full quality/G5/critical mutation; complete admission evidence without new infrastructure; standalone warning versus full-gate integrity |
| 11–13 | `11-trusted-npm-release.md`, `12-change-model-and-affected-receipt.md`, `13-change-aware-gates.md` | Existing restricted release roles; conservative model/critical cases; gate-specific full scope and mutation invalidation instead of source-only/partial-G5 exemptions |
| 14–20 | `14-ts-js-provider.md`, `15-monorepo-providers.md`, `16-elixir-provider.md`, `17-rust-provider.md`, `18-csharp-provider.md`, `19-python-provider.md`, `20-haskell-provider.md` | Supported-profile conservative conformance and full fallback; Elixir hints cannot alone prune required tests; unresolved dynamic/imported/build inputs cannot justify an incomplete subset |
| 21–24 | `21-gate-cache-local-actions.md`, `22-remote-gate-cache.md`, `23-audit-miss-tracking.md`, `24-init-doctor-ci-wiring.md` | Fresh critical suite/full-corpus reuse; actual restricted existing writer profile; first-incident quarantine/reviewed-fix/fresh-full recovery; safe provider/CI activation |
| 30, 33 | `30-wiki-lint.md`, `33-deno-release-bundles-and-native-parity.md` | Restricted existing maintenance roles and native conformance profiles, with no hosted/VM delivery prerequisite or weaker artifact/evidence bar |

The complete 33-ticket roster and all original `Milestone`, `Blocked by`, `Status` and `Kind` values remain intake state, not newly certified readiness. Existing named activation selectors and `10 → release-assets → 33 → 11` ordering remain in force. Gate 1 preparation stays before 01; provider/cache/G12/hook/release activation retains its existing later stage. The acceptance updates describe future work and do not mean it has run.

## Independent review and validation

The installed Matt `code-review` used two independent, fresh-context, read-only reviewers. The fixed point resolves to intake HEAD. Its captured default `git diff 12ea1dada7878dd783902a4eae73133f49f12f8c...HEAD` and corresponding commit list are empty because this work is uncommitted. Per André's explicit scope, review instead used a verified nonempty intake-working-tree→candidate patch: 11 inherited Q35 documents against the pre-Q35 snapshot, plus this session's approved document/ticket changes. A separate stable-handover→candidate patch identifies this session's own work. No real commit was made to manufacture a diff.

Frozen inputs and exact source hashes are under the takeover directory's `review-round-1/`; `review-input/` holds the final closure snapshot. The combined review covers **37 Markdown files**; **31** changed during this session, while the remaining inherited Q35 files were preserved. The independent Spec reviewer received the full confirmed Deno/Q35/G1–G4 sources and evidence, not merely the amended spec. Pre-existing executable work and historical implementation remain excluded from authorship claims.

### Standards

**No findings:** no documented-standard breaches or applicable Fowler-baseline smells in the frozen combined reconciliation. Historical phase statements and current operational homes remain distinct. Read-only document review, not runtime/CI or Gate 1 evidence.

### Spec

**Zero findings:** no missing/partial requested requirement, unauthorized scope or incorrect reconciliation against the independent Deno, Q35 and G1–G4 sources. Release ordering, trust limits, quality safeguards and readiness blockers remain; SUP-005 is not promoted into actual-Deno/native/admission evidence.

**Summary:** Standards 0 (worst: none); Spec 0 (worst: none). No cross-axis reranking, implementation approval or merge authority follows. Closure-only status/next-action edits are checked against the frozen reviewed policy/ticket content.

### Document and preservation checks

Command: `/usr/bin/python3 <takeover-directory>/check-documents.py`, run with temporary HOME and a sanitized environment; the script is outside the repository and uses only Python's standard library plus `/usr/bin/git` for read-only checks. Results/log identities are in `document-validation.json`; the pre-closure result is retained as `document-validation-round-1.json`.

| Check | Observed result |
|---|---|
| Scope/preservation | 86 intake files outside the approved allowlist byte-identical; all non-Markdown code/config/policy and historical evidence unchanged; only the approved new planning record added |
| Tickets | All 33 filenames/IDs and original Milestone/Blocked by/Status/Kind values preserved; dependency graph remains acyclic, with release-assets → 33 → 11 ordering intact; 24 approved acceptance updates, no new ticket/readiness assignment |
| Spec/rationale | All 46 numbered sections and original 63 stories preserved; inherited 64–69 retained; all ADR statuses preserved, including proposed 0015/0016/0017 |
| Document integrity | 47 local links/anchors, 3 strict-JSON examples, 328 section references, fenced blocks and owned-file whitespace checks passed |
| Repository/skills | Real HEAD unchanged, index empty; 8 captured installed skill bodies unchanged and declared upstream pin retained |

These are document checks, not a new test-suite/coverage/mutation/type/lint/hosted/native-platform result. The existing SUP-005 measurements retain their original fixture/source/platform scope. No runtime gate or Deno probe ran during this reconciliation. No new code, installation, infrastructure/credential/hosted operation, staging/commit, push, approval/merge or activation occurred.

Next: use Matt `grill-with-docs` in a separately authorized follow-on to select one bounded §17 quality/Deno preparation slice, resolve its governing prerequisites and approve exact files/public seams before any implementation.
