# Draft PR body — r3dlex/superman#1 (`spec/superman-v0` → `main`)

**Draft only.** Not posted, not pushed, not staged. To apply: the body replaces the PR description through a hosted write, which is André's to authorise.

---

## Summary

```text
superman gate ──runs──> .superman/ci/**             the Node evaluator: the required result
                  └────> .superman/deno-bootstrap/**  the Deno candidate: parallel, non-admitting

  .superman/ci/**              Node gate code — measured, floored at ≥90 % in every metric
  .superman/deno-bootstrap/**  the Deno successor — measured; its floor is CARRIED, not met
  .archgate/adrs/SUP-001/002/003/006/008
                                the governing rules now police the Deno runtime graph
```

This PR is Gate 1 **preparation**. It does not switch the evaluator and does not admit a ticket. The Deno candidate is proven in parallel beside the Node evaluator; Node remains the required result until André approves the exact head and merges.

What landed, by area:

| Area | Change |
| --- | --- |
| Deno runtime | `.superman/deno-bootstrap/` — 16 files. The exec seam is the only `Deno.Command` boundary; the policy, gate, replay, quality and coverage modules are ports of the Node originals; `ci.template.yml` is the publication artifact and sits outside workflow discovery. **Each host typechecks its own graph**: the Node G2 keeps the pinned `tsrs --noEmit`, and the Deno sibling's G2 runs `deno check` over the Deno operational graph, entered at the modules no sibling module imports, with the closure over the entry points required to equal the whole module inventory — a graph it cannot close is refused rather than checked in part |
| Governing rules | SUP-001/002/003/006/008 extended to the Deno runtime graph, each with a real bypass fixture at the pinned engine |
| Quality contract | `.superman/ci/` — one driver, one pin set, one declared inventory for both hosts; a seven-kind failure taxonomy; the 15/50/4 advisories separated from correctness errors; the declared duplication corpus and floors enforced; critical mutation cases executed fresh |
| Coverage model | Four disjoint inventories — `node`, `product`, `candidate`, `deno` — each measured and reported separately; the candidate's and the Deno surface's floors carried, never silently passed |
| Transition | `.superman/deno-bootstrap/tests/transition.test.ts` — the approved-base and merged-policy policies run through one fixture; the change between them is exactly the declared transition |

## Evidence

**Before** — the preparation's own guards could not fire:

```text
$ stagePolicy(<tree with no declared stage>, "pre-commit")
{"gates":["G1","G2",…,"G11"],"feedback":"full","declared":false}
```

A partial stage could reach a full bar, because the guard was conditioned on an unrelated file's presence.

```text
# the Deno quality gate's own receipt
{"verdict":"pass", …}          # while its four metrics read 24–42 %
```

```text
# the two-host parity assertion, given a deliberately diverged Deno receipt
✔ the parity harness rejects a diverged Deno receipt        # passed on a diverged receipt
```

**After** — every one of those is now refused, visibly:

```text
$ stagePolicy(<tree with no declared stage>, "pre-commit")
{"gates":["G1","G2",…,"G11"],"feedback":"partial","declared":false}
```

```text
# the Deno collector's receipt and output
verdict: "fail"
Coverage below 90%: lines 32.96 % (deno), statements 33.05 % (deno), …
```

```text
# the same comparison, now that it reads the Node original rather than a formula
the profile shapes differ: policy, tools against driver, policy, tools
the reviewed policy identity differs: 2800a7dd… against bf456663…
```

Suites, on the pinned toolchain (`SUPERMAN_DENO_BIN` and `ARCHGATE_BIN` at the pinned 0.61.0 / 2.9.8, pinned pnpm 12.16.1):

```text
.superman/ci/**             561 tests, 561 pass, 0 fail
superman rule suites        112 tests, 112 pass, 0 fail
critical cases (Vitest)      36 tests,  36 pass, 0 fail   (the declared critical set)
.superman/deno-bootstrap/**   79 tests,  79 pass, 0 fail   (24 of them staged-scope parity cases)
archgate check --strict      "pass": true, "total": 16, "passed": 16, "failed": 0
knip --no-progress           0 issues
biome ci                     0 errors, 0 warnings (144 advisories, under the reviewed 15/50 calibration)
tsrs --noEmit                clean
deno check                   clean, on every Deno source
git diff --check             clean
```

The shipped `node` coverage inventory, against the ≥90 % floors:

```text
                    before            after              floor
lines       2361/2606  90.59 %  2658/2768  96.03 %  met
statements  2627/2944  89.23 %  2973/3120  95.29 %  met
functions    351/377   93.10 %   401/414   96.86 %  met
branches    2161/2531  85.38 %  2406/2664  90.32 %  met
```

The pre-commit stage, measured over the same kind of snapshot with a staged modification of a tracked file:
**p50 2.33 s, p95 2.72 s** against §5.2's `Target p50 under 10 s` and §13's ≤10 s / ≤30 s. It is a floor,
not the steady state — the staged duplication and staged green checks report `n/a` here because no changed file
is in the duplication corpus and no staged file is a test file, there being no `src/` until ticket 01.

The other two inventories, measured over the same tree and **carried**, not met:

```text
candidate   lines 652/688 (94.77 %) · statements 742/836 (88.76 %)
            branches 493/628 (78.50 %) · functions 111/117 (94.87 %)   → merge-bound cutover
deno        lines 918/1955 (46.96 %) · statements 1015/2158 (47.03 %)
            branches 748/2081 (35.94 %) · functions 153/297 (51.52 %)   → merge-bound cutover
```

The Node collector's own verdict on the shipped `node` inventory is `verdict: "pass"` and it exits 0. The Deno surface's floor did not fail the gate — it was carried, exactly as the decision requires.

Two metrics were below the floor and now meet it. The cause was that row 9's four Deno rule implementations sit in the `node` inventory while the repository's coverage run never loaded them — the Archgate engine executes rules out of band. ADR 0014 names the remedy: *"Supplemental exported-rule callback tests make actual rule code measurable; they do not replace the pinned-engine process fixtures."* Fifteen such tests were added, covering each rule's scope filter, matcher, reporting path and its own guards; the 26 pinned-engine bypass fixtures remain the proof that each rule reports a real violation. The rules went from 14.91 / 48.93 / 39.39 / 53.03 % statements to roughly 99 % each. Four arms remain uncovered and are named in the record as the rules' own unreachable defensive fallbacks.

The branch margin is 0.32 points — about eight arms. The measurement was taken over an isolated snapshot of the same bytes, because the whole-repository run refuses to publish a receipt while the tree is being edited; on the root tree in this environment it refuses outright, because another actor's untracked `.serena/` directory is read as runtime code. A clean checkout has no such directory, so CI measures it normally.

A real Trivy scan over this repository, with the retained local database:

```text
trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL \
  --include-dev-deps --exit-code 1 --format json --timeout 15m .
exit 0 · one target · 0 HIGH/CRITICAL findings · 198,095 bytes of JSON · 10 m 51 s
```

**The preparation's own rows are accepted; this PR is not.** Rows 8, 9, 10 and 11 were accepted on
2026-11-06 at preparation scope, on their recorded evidence, each keeping its carried limits. That
acceptance is about the **local** evidence on this tree. It is not the Gate 1 approval, it does not
change ticket 01's status, and it accepts no pin, native profile or activation. Row 12 is **not**
accepted — its criterion needs the native proof runs, the live forge evidence and the publication.
The merge below is still André's, on the exact head.

**Prospective local evidence is not hosted evidence.** Everything above is local, on this tree, with the pinned tools. There is **no** hosted H/B/M for this head: the three native candidate runs, the live forge check and the publication are outstanding operator lanes (§ *Remaining blockers*). The current Node required results are the ones above; the candidate Deno proof is additional and is not a substitute for them before approval and merge.

**What the receipts bind.** Each measurement names the source revision, the tool digests and the profile identity, and each receipt is attributable to the collector that produced it — the gate refuses a receipt it cannot attribute.

**Freshness.** Every figure above was measured over the final tree of this branch, on darwin-arm64 with the pinned toolchain, and re-measured after the last review fix. Nothing here was carried over from an earlier state: the coverage figures, the suite counts, the pre-commit timing and the Archgate result were all re-run after the final change. The preparation's own records — the Current state section and the dated rows of [.scratch/superman-v0/gate1-preparation.md](.scratch/superman-v0/gate1-preparation.md) — are the source of every number here, and they carry the measurements' own dates and digests.

## Reversibility

**The ADR test, on this diff.** *Hard to reverse?* No — the preparation is a **two-way** change: reverting the merge restores the Node-only rules and removes the Deno root. *Surprising without context?* Yes — a second, parallel implementation of the whole evaluator beside the required one reads as duplication without a reason; the reason is the merge-bound cutover ([ADR 0016](docs/adr/0016-deno-operational-runtime-and-release-bundles.md), [ADR 0017](docs/adr/0017-quality-first-local-and-remote-contract.md)). *A real trade-off?* Yes — Deno as the operational runtime, Node and pnpm as the bounded development and test host.

**Rollback:** cheap, by reverting the merge. The evaluator cutover this PR *prepares* is the expensive one, and it is **not** in this PR.

**Blast radius:** policy. This PR changes protected policy inputs — `coverage.json`, `knip.json`, `biome.json`, `.jscpd.json`, `stryker.config.json` and the five Archgate rule pairs — and adds a new tracked root under `.superman/deno-bootstrap/`. It changes no runtime the gate executes and no product source: `src/` does not exist yet and is ticket 01's.

**One-way items inside it.** The `.superman/deno-bootstrap/` root becomes the operational Deno surface at the cutover, and the candidate's coverage floor becomes binding then. Both are recorded as carried obligations, not as passes.

## Remaining blockers

- **The three native candidate proof runs.** `bootstrap (macos-15)`, `bootstrap (ubuntu-24.04)` and `bootstrap (ubuntu-24.04-arm)` — the arm64 leg on the separate `r3dlex-linux-arm64` runner group. No native result exists for this head.
- **Live forge evidence.** The expected workflow/job/App identities, the artifacts, and the run/attempt and H/B/M relationships, verified against the forge rather than assumed.
- **The publication itself**, including the file name the workflow template takes under `.github/workflows/`. Nothing is published by this PR.
- **The Deno candidate's coverage floor.** lines 46.96 %, statements 47.03 %, branches 35.94 %, functions 51.52 % — carried to the merge-bound cutover, where the Deno root becomes the required evaluator.
- **The candidate measurement inventory's floor.** lines 94.77 %, statements 88.76 %, functions 94.87 %, branches 78.50 % — carried, to the same point.
- **Row 11's clause 6 — resolved by a stated scope, and recorded.** The temporary duplication between the Node enforcement core and its Deno sibling is visible to the coverage measurement and to neither the duplication nor the mutation one: the mutation scope reaches `.superman/ci/**` and not `.superman/deno-bootstrap/**`, and the duplication corpus is the product's `src/**`. Measured over both roots the declared corpus reports 252 clones / 5,288 duplicated lines / 20.42 %, and `quality.ts` against its Deno twin alone is 26 clones / 1,300 lines / 46.81 %. André resolved this on 2026-11-06 by **stating the scope**: the duplication corpus is the product's code, the Deno surface is a declared and separately measured inventory answering to the same enforced rules, and the Node-hosted Stryker cannot measure Deno code at all — so the scope cannot be symmetric until the Deno host can mutation-measure its own graph. Spec §5.4 now carries that statement, dated. Nothing is currently flattered by the exclusion — the corpus is empty until ticket 01.
- **Row 10's clause 6 — the mechanism is in place, the first baseline is not due.** The eight declared critical cases are Vitest-visible and the mutation runner selects one for every declared critical module; the cases execute fresh outside any affected selection, and a failing one blocks. What is still not produced is the enforcement core's *first* mutation baseline and its raw survivor list, which the row's carried limits place outside this preparation ("the enforcement-core first measurements and raw survivors are a review input, not a floor; product-source baselines wait for ticket 01"). The rule itself is now identity-based rather than count-based, so a newly introduced survivor cannot hide behind one the base had and the candidate killed.
- **The mutation gate's scope, and the two lanes it runs in.** The declared mutation scope is the enforcement core — 12 files, 6,036 lines, **8,783 mutants** by the pinned Stryker's own count — and the whole-scope measurement takes about fifty minutes on a ten-core machine. The pull-request leg applies a **declared, narrowed scope** (`quality.mutation.pullRequestScope`, the product source) and executes the declared critical cases fresh; the nightly applies the whole declared scope, measures it whole, on the schedule event, on `main`, against the previous `main`, with the job timeout the measured rate needs. The scope is declared, not derived: an undeclared scope is not a smaller one. The equivalent-scope comparison the gate makes is every lane's contract but the nightly's.
- **The mutation leg had never run before this pull request, and it could not have.** The steady-state form measured all six declared critical modules at *both* revisions on every run — about 84% of the scope, about 14,800 mutant-runs — and the CI job's timeout is 30 minutes. The leg now measures the change at base and at candidate, and the whole scope only in the nightly's lane.
- **Trivy's archive digest cannot be re-verified locally** — the recorded distribution archive is gone, so the tool is version-bound rather than archive-bound.
- **G2's affected-target selection is not implemented.** §5.2's pre-commit cell asks for "tests of the affected targets of the staged files (§5.7)"; §5.7's change model does not exist yet, so the pre-commit stage takes §5.4's full fallback. The staged G9 runs the staged test files specifically, which is narrower than the full suite and is what "commits stay green" asks for.

## The §9.2 human merge checklist

All seven must hold at the moment of the merge.

1. The PR author is the configured agent identity (`<slug>[bot]` in App mode, the bot login in machine-user mode) and is **not** in `identity.approvers`. The head repo is the upstream repo with a `spec/`, `ticket/` or `chore/` branch (App mode) or the bot's fork (machine-user mode).
2. `headSha` is taken from the PR at the moment of the check.
3. The latest review by an approver is `APPROVED` with `commit_id == headSha`. No approver's latest review is `CHANGES_REQUESTED`. The approver is not the author.
4. Required workflow/job/App identities from protected config are present and successful for the integration evidence. Validate head H, tested base B, tested merge M and the run/attempt/artifact relationship against the forge; do not query H alone and assume it is M. Empty, missing, unknown or mismatched evidence fails. Optional non-required jobs stay non-blocking; a skipped required job is not a pass.
5. The PR kind matches its branch. The changed files obey the path policy of that kind, recomputed from `gh api …/pulls/<n>/files`, not trusted from CI.
6. The base is configured `main`, the PR is mergeable, and the evidence covers the current base. Public Superman also has strict server-side up-to-date protection. A changed head needs a new exact-head approval; a changed base needs fresh integration evidence. Private lx has only best-effort checks at this point and audit afterward, not an atomic base-freshness guarantee.
7. The merge itself is checked by `audit`: in App mode the merge actor must be an approver; a merge by the App is flagged even after approval.

## What this PR does not claim

- It does not implement ticket 01, and it does not make ticket 01 ready.
- It does not ship a product release; there is no `src/` and no product code.
- It does not accept a Deno pin or a native profile.
- It does not activate the Deno evaluator; Node remains the required result.
- It does not publish a workflow, and it does not claim hosted H/B/M.
- It does not claim the candidate's coverage floor is met. It records the shortfall.
