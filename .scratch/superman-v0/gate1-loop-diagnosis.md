# Gate 1 preparation — loop diagnosis

**Status:** diagnosis only. No fix, no scope decision, no ticket change. The Step 3 S3-B2 slice stays open, Step 8 stays blocked, ticket 01 stays unadmitted. This note explains why three consecutive preparation attempts produced no measured evidence; it does not decide what to do about it.

**Subject:** `.scratch/superman-v0/gate1-preparation.md` (190 KB, 1,243 lines, 76 headings) and its receipt file `.superman/ci/bootstrap-evidence.md` (1,513 lines), branch `spec/superman-v0` at HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4` with 2,647 uncommitted lines.

**Trigger:** the user reported the Step 3 work "going in circles" and asked for the diagnosis before any further attempt.

---

## The tight loop

```bash
node .scratch/superman-v0/gate1-loop-check.mjs
```

Exit 1 = RED (the circle is present), exit 0 = GREEN (the circle is broken). The script parses the attempt records out of the two files above and reports, per attempt, whether a checker actually reported anything.

The signal is deliberately narrow: an attempt counts as **measured** only if its receipt carries a `TS####` diagnostic. Version calls, approval receipts, identity comparisons, packet freezes and pre-use reviews are preparation, not measurement. That distinction is the whole loop.

```
verdict: RED — 3 consecutive preparation attempts produced zero measured checker evidence
last measured attempt: A1

attempt  measured  TS####  unreached-cmds  capsule-bytes  recovery-side obligations  outcome
A1       yes       6       -                -               -                          Status: all 32 planned target invocations completed
A2       NO        0       15               -               recorder-contract,version-output-contract,host-lifecycle-evidence  Status: stopped at a recorder version-output assertion
A3-R     NO        0       29               19540           recorder-contract,capsule,pre-use-review  Status: stopped during read-only source review
A4-R     NO        0       29               46175           capsule  Status: stopped after independent candidate review
```

### Why this loop is trustworthy

| Property | Evidence |
| --- | --- |
| Red-capable | Appending one measured attempt (A5) to a copy of the receipt file flips it to GREEN, exit 0. The mutation landed: 1,513 → 1,517 lines. |
| Not stuck-red | The same script on the pristine tree still exits 1, so the GREEN came from the mutation and not from a constant. |
| Deterministic | Three consecutive runs: exit 1, 1, 1. |
| Fast | 0.05 s wall clock. |
| Agent-runnable | One `node` invocation, no arguments, no dependencies, no network, no Deno binary. |
| Minimal | RED reproduces on 147 + 42 lines — the three stop records alone, cut from 2,756. Dropping any one of A2, A3-R or A4-R flips it to GREEN, so every remaining element is load-bearing. |

### What the loop already says

| Question | Answer from the receipts |
| --- | --- |
| Did any attempt measure? | One. A1 — 32 target invocations, 64 retained streams, 326,168 bytes, 8.44 s, fresh `DENO_DIR` per call, `TS2322`/`TS2451`/`TS2344`/`TS2583`/`TS2430` all observed, four denial controls confirmed. |
| Did the attempts after A1 measure? | No. A2 launched four `--version` processes and stopped; A3-R and A4-R launched nothing at all. |
| How much planned work never ran? | 15 top-level commands at A2, 29 at A3-R, 29 at A4-R, all retained as unreached. |
| Did the harness grow? | Yes: the administrative-capture capsule went 19,540 bytes (A3-R) → 46,175 bytes (A4-R), +137%, across attempts that measured nothing. |
| Did any open obligation get retired? | No. Five checker-side obligations were carried by every stop and never retired: `D1-transformation`, `binding-preservation`, `published-global`, `computed-export`, `fallback-precision`. A2 additionally carried `API-CLI-correspondence`, `native-content-provenance`, `injected-input`, `embedded-body`. |
| What did each stop add? | A2 introduced the recorder contract, the version-output contract and host-lifecycle evidence. A3-R introduced `other-platform` plus the capsule and the pre-use review. **A4-R introduced nothing at all.** |

---

## Ranked hypotheses

Each hypothesis is stated with the prediction that would kill it. Probes follow.

### H1 — The acceptance object is the recorder, not the evidence

*Prediction:* every stopping finding between A1 and A4-R concerns the measurement tool, and no stop is triggered by a checker disagreement or by D1-corpus evidence. **Killed if any stop was caused by a checker result.**

**Supported.** A3-R raised five named findings (`CAP-1`…`CAP-5`: credited-RED continuation, smoke launch, cleanup/time boundary, exceptional raw/storage evidence, compiler-input scope) and A4-R raised seven (`A4-S1`…`A4-S5`, `A4-M1`, `A4-J1`: orphan detection, custody timing, storage enumeration, first observed failure, control ceiling, mode verification, `prepare()` ownership). All twelve concern the recorder/capsule. **Zero concern the Deno checker, the D1 corpus, or the tsrs/tsc/native comparison.** A2's stop was a recorder regex rejecting Biome's second trailing newline — the tools all reported the expected version; only the recorder's assertion failed.

### H2 — The obligation set is written by the activity it gates

*Prediction:* no attempt retires an open obligation; each stop appends new ones. **Killed if any attempt retired an obligation.**

**Supported.** The loop output above: five obligations carried by every stop, none retired, A4-R introducing nothing while growing the capsule by 16,635 bytes. The set is monotonically non-shrinking.

### H3 — The executed obligation set exceeds what the checklist row requires

*Prediction:* the work in flight is larger than the acceptance text for that step. **Killed if row 3 or spec §17 explicitly requires the 100-edge/39-target preservation proof.**

**Supported.** The closure checklist (`.scratch/superman-v0/gate1-preparation.md:96`) row 3 asks for *"a complete **tiny** entry graph has valid and deliberately invalid/transitive cases under primary tsrs and supplemental Deno checking, with complete matching declarations."* A1 delivered that reading: 204 files (202 declarations + two subjects) under tsrs and matching tsc, valid baseline plus deliberately invalid direct and transitive `TS2322`, all 202 declarations loaded, matching-tsc drift kept separate.

What the attempts are actually executing is larger: 100 rewritten-edge/39-target preservation, published-global precision, computed exports, non-Deno fallback precision, native content provenance, injected inputs, embedded bodies, other-platform evidence. Spec §17's checker row (`.scratch/superman-v0/spec.md:1133`) demands the mutation/coverage/G9 proofs — real instrumented Deno source, active mutant, per-test attribution, worker isolation, four-metric inventories — which are other checklist rows, not row 3.

*This is a scope question, not a settled fact. Which reading governs is a decision, not a diagnosis.*

### H4 — Two colliding step namespaces make progress look like regression

*Prediction:* the same `Step N` label denotes different work inside one flat document. **Killed if the labels are unambiguous in context.**

**Supported.** The preparation record carries 35 `Step N` headings. `Step 3` alone carries 11, spanning two different sequences: the closure-checklist step 3 (dual-checker feasibility) and the Deno probe sequence's step 3 (declaration-input and D1 corpus work). `Step 5` carries 6, `Step 1`/`2`/`4`/`7` carry 3–4 each. A reader who opens "Step 3" cannot tell which one is live.

### H5 — The circuit breaker was never tripped

*Prediction:* no escalation record exists despite three or more unresolved attempts. **Killed by an escalation artifact.**

**Supported.** Zero hits for *escalate*, *circuit break* or *fourth attempt* in either file (the raw grep's five hits are `step 5 seam` and `compile substrate` false positives). Four separate human approvals exist — A1 "yes", A2 "yes", A3-R "approve", A4-R "explicitly approved" — each scoped to one fresh packet. The workspace `AGENTS.md` Circuit Breaker Protocol (three prior attempts without resolution → escalate with a written summary of what was tried and what blocked each attempt; no fourth attempt without acknowledgement) has no corresponding artifact, and no written summary of the three attempts exists anywhere.

---

## Root cause

The Step 3 slice states its acceptance in terms of the properties of a throwaway measurement harness — custody transfer, orphan detection, TERM grace, creation-mode verification, storage-subtree accounting, smoke launch. Under that criterion the loop cannot terminate: the only thing that closes an iteration is "the harness is now correct", and a harness of that description is never finished, so each review produces a new obligation and the checker is never reached.

The attempts confirm this in their own numbers: the one attempt that deliberately did **not** build the durable harness — A1's "one-shot recorder", which the record itself says earns no reusable probe or supervisor acceptance — produced every checker observation Step 3 needs (32 invocations, 64 retained streams, all five diagnostic families, four denial controls, 8.44 s). The three attempts that built the harness produced zero.

Three factors keep the circle turning rather than ending it: the obligation set never shrinks (H2), it is written in harness properties rather than evidence (H1), and the executed scope is wider than the step's own acceptance text (H3). H4 makes each attempt look like a regression rather than an increment, and H5 means a tripped circuit is renewed by packet cadence instead of escalated.

## What this note does not do

No fix, no scope decision, no ADR, no document restructuring, no new attempt. It also does not claim the D1 preservation proof is unnecessary — H3 establishes a divergence between the acceptance text and the executed work, and resolving which one governs is a decision for André, not a conclusion of this diagnosis.

Two side observations, out of scope here: `pnpm exec biome check` aborts with "Linter process terminated abnormally (possibly out of memory)" on any file in this tree, including untouched ones — a pre-existing tool condition, not caused by this work. And the Deno capability research, artifact candidate and code-quality planning documents in this directory were not re-examined.

## Fence compliance

Documentation and one new untracked script only: `.scratch/superman-v0/gate1-loop-diagnosis.md` and `.scratch/superman-v0/gate1-loop-check.mjs`. No code, config, CI, product, ticket, spec or ADR change; no staging, commit or push; no hosted write; no acquisition, installation or execution of any Deno, recorder or checker binary; ticket 01 readiness unchanged. Every pre-existing repository byte is preserved — `git status` shows the same 5 modified and 11 untracked paths as at intake, plus the two files named above. No installed skill body or reference was edited.
