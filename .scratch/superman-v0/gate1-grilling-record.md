# Gate 1 preparation — grilling decision record

**Date:** 2026-11-04. **Decider:** André. **Method:** `mattpocock-skills:grilling`, three rounds, one question per decision with a recommended answer.

**Status:** the decision frontier is closed. This record states what was decided and what it changes. It is not an ADR, not a spec amendment, not a ticket change and not an execution record. No preparation slice has been executed and no evidence was produced by this session.

**Reads with:** [loop diagnosis](gate1-loop-diagnosis.md) (why three attempts circled), this record (what was decided), and [the preparation record](gate1-preparation.md) (the history the decisions apply to).

---

## The decisions

### D1 — A measurement harness's own correctness is a tool property, not a Gate 1 acceptance criterion

The custody transfer, orphan detection, TERM grace, creation-mode verification and storage-subtree accounting of a throwaway recording wrapper are defects of that tool. They are reviewed at the tool's own seam and do not become Gate 1 blockers on their own.

Grounds: all twelve named pre-use findings between A2 and A4-R concern the harness; none concerns the Deno checker, the D1 corpus or the tsrs/tsc/native comparison. A1, which deliberately did not build the durable harness, produced every checker observation row 3 needs, in 8.44 s.

### D2 — Row 3 closes on a green run of the probe that already exists

Delete `skipDefaultLibCheck` from the probe's three Deno configs and re-run. Row 3 closes on the assertions the probe already makes; per-edge type/value binding is discharged by byte-level reversal (202/202, zero mismatches), exact loaded-input-set identity and cross-checker diagnostic agreement, and is recorded as a residual limit rather than a blocker.

Grounds: the only thing that stopped the 2026-11-02 D1 execution was the probe's own `skipDefaultLibCheck`, which the S3-B2 amendment says to omit — and A1 then proved the amended profile works.

### D3 — A preparation step's acceptance criterion is fixed in advance; discoveries are notes

The obligation list for a step is closed before the step executes. A requirement discovered during execution is recorded as a note and needs André's explicit approval to become a blocker.

Grounds: five checker-side obligations were carried by every stop without ever being retired, and A4-R introduced nothing at all while growing the capsule by 16,635 bytes.

### D4 — A harness is acceptable when the spec-named properties for that measurement are proven at that measurement's own seam

Worker isolation, per-test attribution, cleanup and startup-control neutralization are proven where the spec names them (`spec.md:381`, `spec.md:637`, `spec.md:639`). Generic recorder custody and lifecycle properties are not acceptance criteria.

Grounds: ADR 0017 requires results fixture-proved and never tool correctness — "a recommended preset or tool exit alone establishes none of these additions" (`docs/adr/0017-quality-first-local-and-remote-contract.md:21`). `spec.md:797` states owned paths and cleanup "improve attributable evidence, not OS-level isolation". ADR 0016, ADR 0014 and `GLOSSARY.md` are silent on tool correctness; the glossary defines **Receipt** (`GLOSSARY.md:82`) and has no term for a tool.

### D5 — Row 3 next, then rows 4 and 5 in parallel

Row 3 is the only row whose implementation already exists and is blocked by a single config line. Rows 4 and 5 follow in parallel — their probes (`deno-mutation.probe.test.ts`, `deno-coverage.probe.test.ts`) exist. Rows 1–12 all remain on the critical path to ticket 01.

Grounds: §17's table header is "Completion evidence required before Deno activation/ticket 01 admission" (`spec.md:1141`) and its checker row requires mutation, per-test attribution, worker-isolation and four-metric coverage (`spec.md:1146`). Ticket 01 depends on the same (`issues/01-skeleton-and-raw-gates.md:35`, `:36`).

### D6 — The decision lives in a new ADR 0018 plus a Current-state section

ADR 0018 states what Gate 1 requires before ticket 01 is admitted and which obligations are measurement-tool quality rather than admission criteria. The preparation record gains a Current-state section at the top carrying the live blockers, the one next action and its criterion; every dated attempt record moves under one History heading.

Grounds: 35 `Step N` headings in one flat document, `Step 3` alone carrying 11 across two different sequences, make progress unreadable. ADR 0016:40 requires preserving historical receipts at their original scope, so History is preserved verbatim.

### D7 — The capsule path is superseded and must not be resumed

The probe file is the sole row-3 harness. The staged A5 capsule intake was deleted (below).

### D8 — The frontier is closed

Nine decisions taken; no branch of the design tree left unvisited. Facts that were needed were established from the repository before asking, not asked of the decider.

---

## What this changes

**Executed 2026-11-04.** The next action became a single command, not a new packet type, and it has since run; see [Current state](gate1-preparation.md#current-state) for the live status and the [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-04--step-3-dual-checker-probe-green-after-the-s3-b2-config-correction) for the receipt.

1. Remove `skipDefaultLibCheck` from the probe's two **Deno** configs — `config/deno.valid.json` and `config/deno.default-lib.json` — at `deno-checker.probe.test.ts:282` and `:503`. The S3-B2 amendment already decided this: omit it, because source inspection establishes that omission leaves its skipping mechanism falsy, not that Deno accepts the option. The probe's **tsconfig** keeps it: spec §5.10 requires both external skip-check flags false for primary tsrs and the separate matching-tsc drift reference.
2. Run the probe against a fresh owned copy of the D1 fixture root, with the Deno binary from the retained T0 tools root:

   ```text
   SUPERMAN_STEP3_T0=<retained T0 tools root> \
   SUPERMAN_STEP3_T1=<fresh owned copy of the D1 fixture root> \
   node --test .scratch/superman-v0/deno-checker.probe.test.ts
   ```

   The probe's own assertions are the completion criterion: corpus counts (202 declarations, 272 edits across 89 files, 162/57 directive, 100/30 undici-literal, 10/2 realm-guard), reversal 202/202 with zero mismatches, exact loaded-input sets for tsrs and matching tsc, native exit 0 with no ignored compiler option, and matching diagnostic codes across all three checkers for the valid, direct, transitive, declaration and default-library cases.
3. Append the outcome to `.superman/ci/bootstrap-evidence.md` and record row 3's state.

Nothing else changes operationally. `spec.md:1139` keeps the current Node bootstrap as the active evaluator, and no activation, pin acceptance, ticket status change or readiness label follows from a green row 3.

## What was settled by fact, not by decision

- **Native-profile acceptance is not deferrable past ticket 01.** `spec.md:645` chains it directly: "Native-profile acceptance remains pending, Step 3 open, Step 8 blocked and ticket 01 unadmitted".
- **Checker equivalence is not the criterion.** `spec.md:641` states native diagnostic scope "does not promise identical checked bodies or diagnostics across checkers", and the S3-B2 amendment supersedes the stronger native-equivalence wording. ADR 0016 contains no equivalence criterion; ADR 0017 and ADR 0014 are silent.
- **The scope was never the problem.** §17's five rows and ticket 01's own checkboxes require mutation, coverage, worker isolation and three-platform evidence. D1's effort was aimed at real work; the error was the acceptance criterion and the harness.
- **The capsule findings do not transfer to the probe.** `CAP-5` required checking loaded paths against admitted inputs rather than a whole inventory; the probe already asserts the stricter form at `deno-checker.probe.test.ts:300`.
- **The existing escape hatch.** `spec.md:1149`: "Unknown/failed integration remains a blocker and comes back for a reviewed decision."

## Explicit silences left standing

No file states how much evidence a preparation phase must produce, defines "Gate 1 preparation" as a phase, defines a "tool" as a term, or sets a minimum set of proofs for completing Gate 1. ADR 0016:40 puts the same point differently: "Planning completion clears none of these blockers."

## Temporary artifact disposition

The staged A5 capsule intake (`…/T/opencode/superman-s3-b2-a5-capsule-intake-n217sbc6`, 14 MB) was **deleted** on 2026-11-04. It had no `execution/` directory, had never been executed, was referenced nowhere in the repository, and every artifact in it was credited by no receipt. Its presence was the live trap: a prepared, resumable capsule packet that a later session could pick up and restart the circle with.

The A2, A3-R and A4-R intake directories were **preserved** (21 MB, 38 MB, 49 MB). Each holds receipts that the historical records cite by SHA-256 — `E/src/record.mts`, `E/evidence/result.json` and `E/evidence/independent-verification.json` (A2); `E/evidence/capsule-source-review.md`, `E/evidence/obligation-ledger.md`, `E/evidence/unreached-commands.json` and `E/source-revisions/administrative-capture.txt` (A3-R); `E/review/pre-use/standards.md`, `spec.md`, `disposition.md`, `manifest.json`, `delta.patch` and the sealed candidate (A4-R). Deleting them would make the recorded findings and hashes unverifiable, against `spec.md:1149` and ADR 0016:40.

## Next step, not taken here

Prompt 3: write ADR 0018, then restructure the preparation record with a Current-state section and a single History heading. Neither has been written; this session produced no ADR, no spec amendment and no document edit.

## Fence compliance

Documentation only: this record, plus [the loop diagnosis](gate1-loop-diagnosis.md) and `gate1-loop-check.mjs` from the diagnosis phase. No code, config, CI, product, ticket, spec or ADR change; no staging, commit or push; no hosted write; no Deno, recorder or checker binary acquired, installed or executed; ticket 01 remains blocked and Step 3 open. One out-of-repository deletion was made under D7: the unreferenced, never-executed A5 capsule intake.
