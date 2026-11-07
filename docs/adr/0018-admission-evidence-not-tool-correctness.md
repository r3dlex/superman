---
Status: proposed
---

# Gate 1 admission is judged on evidence, not on measurement-tool correctness

Gate 1's pre-admission criteria are closed before each preparation step executes and are judged on the evidence produced, not on the internal correctness of the throwaway tooling that produced it. André confirmed this on 2026-11-04 ([grilling record](../../.scratch/superman-v0/gate1-grilling-record.md), decisions D1–D8): a measurement harness's custody transfer, orphan detection, TERM grace, creation-mode verification and storage enumeration are defects of that tool rather than Gate 1 blockers, and the approved probe file is the sole harness for the Step 3 dual-checker measurement.

## Considered Options

- **Review every new harness before its first use.** Rejected. This rule produced three consecutive attempts — S3-B2-A2, A3-R and A4-R — that each stopped before measuring anything, while the one attempt that deliberately skipped the durable harness (S3-B2-A1) produced every checker observation the step needs in 8.44 s. The pre-use reviews raised twelve named defects, all in the wrapper and none in the checker; the wrapper grew from 19,540 to 46,175 bytes across attempts that measured zero checkers and retired zero obligations.
- **Require the measurement harness's own correctness as an admission criterion.** Rejected. ADR 0017 requires results to be fixture-proved and never requires tool correctness ("a recommended preset or tool exit alone establishes none of these additions"); spec §8.3 states that owned paths and cleanup "improve attributable evidence, not OS-level isolation"; and spec §5.10 requires no OS-sandbox claim. ADR 0016, ADR 0014 and `GLOSSARY.md` are silent on tool correctness — the glossary defines *Receipt* and has no term for a tool.
- **Require the native checker to be equivalent to tsrs/tsc.** Rejected. Spec §5.10 states that native diagnostic scope "does not promise identical checked bodies or diagnostics across checkers", and the S3-B2 amendment supersedes the stronger native-equivalence wording. No ADR sets an equivalence criterion.
- **Close the Step 3 row on A1's measurement alone.** Rejected. A1 measured the same derived corpus and observed the same diagnostic families, but its evidence rests on a one-shot recorder's ad-hoc commands rather than the probe's assertions, and it carries no proof of the transformation's own preservation — the manifest counts and the 202/202 clean reversal.
- **Defer native-profile acceptance to the merge-bound cutover.** Rejected. Spec §17's table header makes every row "Completion evidence required before Deno activation/ticket 01 admission", and §5.10 chains "Native-profile acceptance remains pending, Step 3 open, Step 8 blocked and ticket 01 unadmitted".
- **Treat the three attempts' scope as the problem.** Rejected. §17's checker row requires mutation, per-test attribution, worker isolation and four-metric coverage before ticket 01 admission, and ticket 01's own checkboxes depend on the same. The error was the acceptance criterion and the harness, not the amount of work.

## Consequences

- Each preparation step states its acceptance criterion before execution, as a closed list. A requirement discovered during execution is recorded as a note and needs André's explicit approval to become a blocker. Open lists are how five checker-side obligations were carried by three consecutive stops without ever being retired.
- A measurement is acceptable when the properties the spec names for that measurement — worker isolation, per-test attribution, cleanup and startup-control neutralization — are proven at that measurement's own seam. Generic recorder custody and lifecycle properties are not acceptance criteria.
- The Step 3 dual-checker measurement uses the approved probe `.scratch/superman-v0/deno-checker.probe.test.ts` and no other harness. The D1 corpus's rewritten-edge and canonical-target binding preservation is discharged by byte-level reversal (202/202, zero mismatches), exact loaded-input-set identity and cross-checker diagnostic agreement, and is recorded as a residual limit rather than a blocker.
- The native Deno checker profile stays required before ticket 01 admission. It is not deferred, and closing Step 3 does not by itself admit ticket 01.
- Row 3 runs next; rows 4 and 5 follow in parallel, because their probes already exist. Rows 1–12 all remain on the critical path to ticket 01.
- The staged S3-B2-A5 capsule intake was deleted as unreferenced and never executed. The S3-B2-A2, A3-R and A4-R intake directories are preserved: the historical records cite their receipts by SHA-256, and ADR 0016 requires preserving historical failures and receipts at their original scope.
- **Not enforceable.** This is a "why" ADR in the `docs/adr/` tier; no rule file changes and no protected policy input moves. A step's acceptance criterion is a document, and the loop-observing script `.scratch/superman-v0/gate1-loop-check.mjs` detects the symptom without enforcing anything.
