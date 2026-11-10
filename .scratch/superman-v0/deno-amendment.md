# Deno amendment — planning record

**Status:** planning complete after Q24 confirmation, approved ticket reconciliation and corrected two-axis review. Product implementation and activation remain blocked; planning completion is not Gate 1 approval or merge authority.

## Starting state (2026-11-01)

- Repository: `/Users/andreburgstahler/Ws/ai-tool-workspace/superman`.
- Branch: `spec/superman-v0`.
- Starting HEAD: `21c7f6ba4f9f1c254a01954d0230889958902733`.
- Baseline snapshot: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-deno-planning-a2wcbof9/`. `baseline.json` records hashes of 112 starting files and status; `files/` preserves their bytes; `unstaged.patch` and `staged.patch` preserve the starting Git differences. This temporary snapshot supports this session's review, not durable platform evidence.
- No staged changes at intake. Pre-existing changes below are not this amendment's work and must be preserved. For overlapping planning files, compare against the snapshot, not just HEAD.

```text
 M .github/workflows/ci.yml
 M .scratch/superman-v0/issues/01-skeleton-and-raw-gates.md
 M .scratch/superman-v0/spec.md
 M .superman/ci/bootstrap-evidence.md
 M .superman/ci/coverage-evidence.md
 M .superman/ci/coverage.test.ts
 M .superman/ci/coverage.ts
 M .superman/ci/pr-policy.test.ts
 M .superman/ci/pr-policy.ts
 M .superman/ci/quality-gates.test.ts
 M .superman/ci/quality.ts
 M docs/adr/0015-preferred-self-hosted-ci-with-hosted-exceptions.md
?? .scratch/superman-v0/matt-skills-research.md
```

## Skill identity and authority

The actual installed definitions under `/Users/andreburgstahler/.config/opencode/skills/` were read, including the domain-modeling ADR/glossary companion formats. `grill-with-docs` invokes `grilling` and `domain-modeling`; `research` delegates primary-source investigation to a fresh background agent. Later stages remain subject to interview, test-seam and ticket-breakdown confirmations.

| Installed `SKILL.md` | SHA-256 |
| --- | --- |
| grill-with-docs | `7de372c13488f1ee96cc11cd8907b56b6809cc93eef776eeddd37de6b6cbe3fe` |
| grilling | `a146842ed93ca43d833550fa9adf02e58cb63c83fea9d4b4522995b82242d4e2` |
| domain-modeling | `7b925d7b1e341a2eeae33ad68a8a8c0ab889a38ddd22a7598e4c240e5a7556a3` |
| research | `1f629e18ab899412683bc6a1c4efb4339999e27c2fdac328f26ee10a8c031d33` |
| to-spec | `43ad9cf318e5e7d3d1fa360253a37021796dc87a0c2e595ad262661a10f85088` |
| to-tickets | `56ec23c5b2782785d4e65bff9e315b6d3aeb4ef977c174a219e99489fada1995` |
| code-review | `9c921a8d88138a41401d8897ca1bb852088ab1b7b605cdd04edc13e3e8aab6dd` |

These observations identify installed bodies, not a verified project installation at its declared upstream revision. The existing Superman upstream pin remains `59db609eb1e18aaf59b63284d0e52255aff0c63c`; no skill, selected-skill catalog or pin change is authorized. The pre-existing [skill investigation](matt-skills-research.md) retains its own evidence limits.

The user's scope overrides skill defaults that would recreate the backlog, assign `ready-for-agent`, publish hosted artifacts or overlook uncommitted work. Only the existing local tracker is authorized. No implementation, executable-rule/bootstrap/workflow/configuration/dependency changes, installation, credential access, commits, pushes, approvals or merges are permitted.

## Decision record

- **Q1 — confirmed by André:** runtime-only migration. Deno becomes the runtime for the product CLI and controlled hook adapter; Node/pnpm remain for existing quality tools and npm OIDC publishing. Retain tsrs, Vitest, Stryker and Biome. Standalone distribution, permissions, testing and bootstrap activation remain unresolved.
- **Q2 — initially selected, then withdrawn:** André initially required both npm/npx and standalone binaries in v0, then explicitly corrected this to **only Deno, no npm/npx distribution**. The required Deno distribution forms and npm-publisher removal are being clarified; do not implement the withdrawn npm requirement.
- **Q3 — superseded by the Q2 correction:** the initially accepted separately provisioned Deno + Node-built-in npm launcher is no longer the chosen distribution route. No npm launcher is authorized by this interview.
- **Q4 — confirmed:** stable Web APIs, stable Deno APIs and supported `node:` compatibility built-ins are allowed; no third-party runtime libraries, including JSR `@std`, npm/HTTP imports or vendored/embedded third-party code. Existing bounded development-only measurement exceptions remain.
- **Q5 — confirmed, contrary to the recommendation:** port the protected bootstrap to Deno too. Its detailed scope and retained Node development/measurement-host exceptions are the next frontier. Governing migration work stays separately authorized Gate 1 work before product admission, not inside ticket 01.
- **Q6 — confirmed:** reviewed exact stable-channel Deno patch and per-platform artifact identities, no `latest`/canary/unstable APIs or silent upgrades. The numerical pin is deliberately unresolved pending separately authorized Gate 1 artifact/platform acceptance.
- Subsequent questions and confirmations use OpenCode popups at André's request.

Technical research is supporting information, not compatibility or platform execution evidence. No policy/specification change is activated by this interview record.

### Final interview decisions (authoritative review inputs)

Q7–Q19 resolve the provisional/withdrawn choices above. André selected each recommendation below through OpenCode popups. These are design confirmations, not exact-head Gate 1 approvals or permission to implement.

| Question | Confirmed decision |
| --- | --- |
| Q7 | **In v0:** versioned Deno source/assets releases **and** Deno-compiled binaries for macOS arm64, Linux x64 and Linux arm64. No npm/npx distribution or npm OIDC publisher; possible later npm support is neither planned nor authorized. No Node npm launcher. |
| Q8 | Deno runs Superman-owned operational entrypoints: CLI, hook adapter, bootstrap verifiers/orchestrators and later protected writers. Real Node/pnpm remain for retained quality tools and explicitly bounded test/measurement drivers; external tools keep their own runtimes. |
| Q9 | Reviewed bounded capability manifests for every launch class; noninteractive/fail-closed, no `-A`/`--allow-all`, prompt escalation or permission broker. Compiled grants are a build-time ceiling. Exact grants/effective-permission proof remain Gate 1 blockers; subprocesses retain host authority and require independent isolation. |
| Q10 | Anchor owned entrypoints/assets, explicit protected configuration, no ambient config/import-map/package/lock discovery or runtime dependency downloads; sanitize or reject inherited Deno/Node/compiler/broker/preload controls. Intentionally read pilot Superman policy, not pilot runtime configuration. `--no-config` alone is not proof. |
| Q11 | Product subprocesses use `Deno.Command` only through `src/exec.ts`; explicit argv, bounded output/timeouts/cancellation and controlled executable/environment resolution. No product `node:child_process` bypass. Protected bootstrap has separately reviewed boundaries; no blanket transient-worker ban. |
| Q12 | Keep exact-pinned tsrs `--noEmit` primary, add mandatory supplemental `deno check` over complete Deno entry graphs, protect declaration/compiler inputs, prove valid/invalid fixtures on all three platforms. Retain nonblocking pinned `tsc` drift comparison. |
| Q13 | Keep Vitest/Stryker and all bars. Before product admission prove meaningful G9 replay, instrumented-source/active-mutant propagation plus worker isolation and known kill, and complete source-bound coverage of unloaded/executed Deno code, Node drivers and rules. Independent ≥90% lines/statements/branches/functions floors, target 100%; no waiver/tool swap by assumption. |
| Q14 | Actual Deno source execution is the canonical coverage/mutation route. Exact compiled artifacts run the same public CLI conformance suite on all three native platforms; bind measured source, compiler/runtime/assets/permissions/build identities and artifact digests. Source coverage is not called collected binary coverage. |
| Q15 | Doctor/receipts/selection/cache distinguish actual Deno from real Node tool hosts and source from compiled launches, including executable content, Deno/V8/bundled TypeScript/target/config/permission/assets and denort/build/artifact identities as applicable. A Node compatibility version is not Node proof. Unknown inputs force full fresh checks; missing required approval/identity blocks admission. No assumed cross-runtime/launch reuse or relabeled history. |
| Q16 | Keep current Node bootstrap until separately authorized spec-kind work proves the Deno replacement, then obtain exact-head human approval before activation/product admission. Rules/protected inputs/replay/mutation/complete coverage/native platforms are Gate 1 prerequisites. Retain runner/App/protection/Archgate-arm64 blockers and later activation reviews. |
| Q17 | André's `v*` tag authorizes GitHub releases after full v0 closure. Unprivileged build/test/scan produces exact source/binary artifacts; isolated restricted uploader verifies run/tag/SHA/provenance/digests without installs/rebuilds/tests/hooks. No npm publisher/provider-hosted justification. Retain MIT; optional signing remains unverified. |
| Q18 | Compiled CLI needs no installed Deno, but controlled hooks do. Keep one portable Deno hook rather than native hook installers. External gate tools, including Node/pnpm where configured, remain prerequisites for both routes. |
| Q19 | André explicitly confirmed shared understanding **and** existing public CLI/bootstrap/measurement testing seams. Proceed with in-place synthesis, separately approved ticket reconciliation and independent two-axis review, not implementation. |
| Q20 | Approved the readable 20-existing-ticket reconciliation plus new blocked **33**, blocked by **06, 10**, with **11** additionally blocked by **33**. All other existing IDs/kinds/statuses/valid dependencies remain. The first overlong popup was dismissed, not approved; approval came through the subsequent short popup. |
| Q21 | Approved `spec/superman-v0-release-assets` after 10 and **before 33**, adding that named blocker to 33. This protected follow-up adopts MIT LICENSE/release metadata and concrete release allowlist/build manifests. Runtime/measurement substrate remains before 01; workflow/uploader activation remains after 11. This resolves the license/assets cycle exposed during synthesis. |
| Q22 | Continue this Deno-only amendment separately from concurrent work; preserve/exclude other commits/code and code-quality notes. Cross-amendment reconciliation remains an explicit Gate 1 blocker; do not silently adopt the other interview's unfinished trust-boundary changes. |
| Q23 | **Revises Q9's blanket no-broad-grant wording:** portable compiled binaries may use explicitly reviewed broader read/write/run/net capability classes where required. Still no `-A`/`--allow-all`, prompts, broker or automatic escalation. Make no repository least-privilege or sandbox claim; retain independent host/credential isolation. Source/hooks/bootstrap are scoped more tightly where feasible; exact grants remain Gate 1 blockers. |
| Q24 | Reconfirmed understanding and unchanged public process/measurement seams; finish synthesis/tickets/review. Source/hook/build startup controls must be neutralized **before full Deno starts**; app checks afterward are not proof. OS-launch mechanism remains unverified Gate 1 work. Reconfirmed release-assets ordering and concurrent-work boundary. |

Stable Web/Deno/supported `node:` built-ins and zero third-party product runtime libraries (Q4), retained quality tools (Q1), and exact stable-channel artifact selection with the numerical pin unresolved (Q6) remain confirmed. The bundled Deno engine is the selected runtime, not an imported product library; zero runtime libraries does not mean the executable has no underlying runtime supply chain.

The primary-source findings are in [deno-runtime-research.md](deno-runtime-research.md). Documented upstream features are not repository compatibility evidence. No Deno execution or platform test was performed in this planning task.

[Compiled-capability research](deno-capability-research.md) exposed the narrower-grants/portable-binary trade-off behind Q23. It distinguishes CLI-grant runtime-cwd binding from config-set build-time absolute paths, fixed noninteractive permission ceilings, PATH name resolution and full-Deno versus researched denort startup controls. These source observations select no numerical pin and are not executed acceptance evidence.

## Concurrent work boundary

During this session another actor advanced HEAD through `82b39ac`, `3520d5a` and `12ea1dada7878dd783902a4eae73133f49f12f8c`. This session made no commits or executable changes. The intake snapshot remains the comparison baseline. Read-only comparison established that the overlapping spec, ticket 01, ADR 0015 and README at that later HEAD equal their intake bytes, so the other commits do not contaminate the Deno document diff. Subsequent changes still need attribution before review.

The newly observed `code-quality-amendment.md` and `code-quality-gates-research.md` belong to a separate ongoing interview, not this amendment. That interview reopens evaluator/local-agent trust but explicitly has not changed canonical policy; this task neither adopts nor overwrites it. Preserve those notes and all `.superman/`, workflow and other executable work, exclude them from the two-axis Deno review, and reconcile the amendments before Gate 1 approval/admission. No current implementation/identity/protection requirement is waived by that separation.

## Remaining stages

1. **Complete:** resolve decision frontiers; obtain explicit shared-understanding and test-seam confirmation (Q19).
2. **Complete:** invoke `to-spec`; amend the existing numbered spec and reconcile affected rationale/README only. Invoked after Q19, with Q21–Q24 corrections incorporated after reconfirmation; user-specified in-place/local/blocked conventions override creation/readiness defaults.
3. **Complete:** invoke `to-tickets`; amend existing **01–08, 10–14, 21–24, 28, 30, 31** and add blocked **33**. Preserve existing IDs/kinds/statuses and valid dependencies; 11 adds 33, and Q21 adds `spec/superman-v0-release-assets` to 33. No default readiness or hosted publication.
4. **Complete:** invoke `code-review`; independent Standards/Spec axes compare confirmed decisions and the intake working tree to all changed/new Deno documents, excluding unrelated work. Corrected follow-up review found no remaining document findings on either axis; details below.

## Two-axis review

The installed `code-review` skill was invoked. Intake HEAD resolves. Its default `git diff 21c7f6ba4f9f1c254a01954d0230889958902733...HEAD` and commit list were captured, but show concurrent commits rather than this uncommitted amendment. Per the user's explicit scope, reviewers instead received a nonempty intake-working-tree → candidate patch and frozen copies of **35** changed/new Deno Markdown files, with an exact path/hash manifest. Both fresh-context axes ran in parallel, read-only. Independent confirmed interview choices—not just the amended spec—were supplied to the Spec reviewer.

Review input: the baseline directory's `review-input/` (`scope.json`, `amendment.patch`, `files/`); the first round is retained under `review-round-1/` when the corrected snapshot is generated. Excluded: initial/concurrent source, bootstrap, rules, workflows and evidence edits; the three other-actor commits; code-quality interview/research notes; unchanged pre-existing Matt research and glossary.

### Standards

Round 1: **2 P2 document-consistency findings**: (1) ADR 0006 still carried the obsolete npm access/trusted-publisher prerequisite; (2) several spec/ADR references assigned final compiled-archive proof to 10 despite the approved 10 → release-assets → 33 ordering. No applicable code-smell findings. Both corrected: preserve registry history without setup instructions; 10 owns fixture-source manifest/discovery smokes, 33 owns final source/compiled-archive parity.

### Spec

Round 1: **2 findings**: (1) P2 obsolete npm prerequisite, contrary to Q7/Q17; (2) P3 config example's `node_modules/superman-ai` schema URI, contrary to Deno-only owned-asset resolution. Both corrected; the example now explicitly illustrates an installed-release-owned absolute URI to be resolved by init, not an npm layout.

Round 2, same independent axes: **Standards — no unresolved hard findings and no applicable smells; Spec — no remaining findings against the confirmed user decisions.** Both checked the corrected 35-file snapshot and resolved prior findings. Standards verified all snapshot hashes and the four changed documents since round 1. The last update to this record reports those review outcomes; it does not introduce another policy/ticket decision.

**Summary:** Standards 0 remaining (worst remaining: none); Spec 0 remaining (worst remaining: none). Initial counts stay separate; the shared npm finding is not reranked across axes. These are document reviews, not implementation/gate/platform acceptance or human Gate 1 approval.

## Document validation and remaining prerequisites

Scoped `git diff --check` passed. Read-only metadata checks preserved every original numbered section, ticket Kind/Status and valid blocker; all 33 numerical ticket IDs exist with no dependency cycle. Ticket 01 and new 33 remain blocked; other pre-existing ready labels were preserved, not re-certified. Named activation selectors were not verified against a forge and remain unready until actual evidence exists. No product tests, raw gates, Deno probes, platform runs or hosted CI were executed in this planning task.

Remaining before product admission: separately authorized protected bootstrap/rule/input port; exact stable Deno and compile-runtime artifact selection; explicit grants (including approved broader compiled classes), pre-Deno startup/config/environment isolation; complete checker/declaration/replay/mutant/worker/four-metric coverage integration; native three-platform acceptance; existing runner/image/isolation/App/protection and Archgate-arm64 acceptance; cross-amendment reconciliation; André's exact-head Gate 1 approval/merge. Missing facts/profiles remain blockers, not implementer defaults.

Remaining before release: each implementation/activation dependency, `spec/superman-v0-release-assets` after 10/before 33, exact source/three-binary native/harness/scan acceptance and provenance, operator-designated restricted upload profile, selected MIT/release metadata and final workflow activation after 11. No npm setup is a v0 prerequisite. No implementation, executable/config/pin/skill change, credential/infrastructure/hosted operation, commit, push, approval or merge was performed by this session; concurrent work is preserved and excluded as recorded above.

## Changed-file scope

All changes made by this session are the following Markdown files. The glossary and pre-existing Matt research remain unchanged.

```text
README.md
.scratch/superman-v0/spec.md
.scratch/superman-v0/deno-amendment.md
.scratch/superman-v0/deno-runtime-research.md
.scratch/superman-v0/deno-capability-research.md
.scratch/superman-v0/issues/01-skeleton-and-raw-gates.md
.scratch/superman-v0/issues/02-config-receipts-exec.md
.scratch/superman-v0/issues/03-doctor.md
.scratch/superman-v0/issues/04-pre-commit-and-init.md
.scratch/superman-v0/issues/05-path-policy-trace-test-first.md
.scratch/superman-v0/issues/06-ratchets-and-gate-ci.md
.scratch/superman-v0/issues/07-merge-ready-and-audit.md
.scratch/superman-v0/issues/08-pinned-pocock-skills-and-next.md
.scratch/superman-v0/issues/10-harness-manifests.md
.scratch/superman-v0/issues/11-trusted-npm-release.md
.scratch/superman-v0/issues/12-change-model-and-affected-receipt.md
.scratch/superman-v0/issues/13-change-aware-gates.md
.scratch/superman-v0/issues/14-ts-js-provider.md
.scratch/superman-v0/issues/21-gate-cache-local-actions.md
.scratch/superman-v0/issues/22-remote-gate-cache.md
.scratch/superman-v0/issues/23-audit-miss-tracking.md
.scratch/superman-v0/issues/24-init-doctor-ci-wiring.md
.scratch/superman-v0/issues/28-okf-validator-and-g12.md
.scratch/superman-v0/issues/30-wiki-lint.md
.scratch/superman-v0/issues/31-codegraph-context.md
.scratch/superman-v0/issues/33-deno-release-bundles-and-native-parity.md
docs/adr/0003-zero-runtime-deps-typescript-only.md
docs/adr/0006-one-npm-package-many-harnesses.md
docs/adr/0008-tsrs-primary-typechecker.md
docs/adr/0009-biome-and-trivy-gates.md
docs/adr/0010-affected-analysis-and-change-aware-ci.md
docs/adr/0011-remote-gate-cache-security.md
docs/adr/0014-overall-coverage-in-incremental-ci.md
docs/adr/0015-preferred-self-hosted-ci-with-hosted-exceptions.md
docs/adr/0016-deno-operational-runtime-and-release-bundles.md
```
