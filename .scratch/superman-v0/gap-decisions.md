# Gap-analysis decisions — to-spec input

**Date:** 2026-11-10. **Source:** `gap-analysis.md` (zero-trust review of `c5a2074`, not committed), walked finding by finding with André.
**Status:** decisions, not implementation. Nothing here changes `spec.md` or the tickets on its own.

**Ticket-number correction.** The gap analysis calls ticket 06 "release bundles". Ticket 06 is
*ratchets-and-gate-ci*; the release tickets are 11 (*trusted-npm-release*) and 33
(*deno-release-bundles-and-native-parity*). The owners below use the real numbers.

## Fold into Gate 1 — before ticket 01

### Gate code and policy

- **§5.1 / A3 — status vocabulary.** `pass` | `n/a` | `unarmed`. `n/a` and `unarmed` satisfy a
  required check only when `bootstrap.json` declares them per gate, stage and leg, with a reason; an
  undeclared one fails. G2 stops returning `pass` on zero tests. SUP-004, SUP-007, SUP-009 and G12 are
  declared `unarmed`. G5/G6 over the empty `src/` corpus are declared `n/a`; ticket 01 removes those
  declarations as `src/` arrives.
- **A3 G11.** The non-linux-x64 delegation is declared per leg in `bootstrap.json`; the receipt names
  the leg that ran G11.
- **C5.** G9's approved-base "not implemented" path records a distinct `unimplemented` receipt kind
  and still fails closed.
- **§5.7 / A1.** G4 accepts a lane branch under its own name: `spec/<slug>--<lane>`, with the
  `--<lane>` suffix stripped before the allow-list is built.
- **§5.5 / A5.** Every `tool-assets.json` entry carries `status: candidate | accepted` and the record
  that approved it. Required legs refuse candidates; Deno 2.9.8 is a candidate, executed only by the
  non-required leg.
- **§5.4 / B1 (part).** The bootstrap tree (`.superman/ci/**`, `.superman/deno-bootstrap/**`) is a
  declared scope. SUP-002's `files:` gains `.superman/ci/**` (an exec seam, or the rule's allowance
  rewritten); `knip.json` stops ignoring the Deno twin; the coverage inventory states which suites
  the collector runs and which G6 runs fresh.
- **§5.6 / B2.** GEN-001 requires an `accepted` source ADR. ADRs 0015, 0016 and 0017 are split into
  an accepted part and a proposed part, and the eight accepted→proposed citations resolve to one or
  the other.

### Manifest and documents

- **A4 npm / C1 manifest.** `package.json`: `private: true`; drop `publishConfig`, `bin` and
  `files`. Ticket 11 re-adds them if npm distribution returns.
- **§5.2 / A2 (part).** The 29 mislabelled `**Status:**` lines become `blocked`; `spec.md:1433`'s
  blocker column matches each ticket's `**Blocked by:**` line.
- **§5.3 (part).** Every orphan requirement in A4 names exactly one owning ticket in the spec
  (document change only).
- **A4 / C4 (part).** The 4 broken citations in `gate1-grilling-record.md` are fixed and anchored to
  section IDs, not line numbers.
- **C2.** `README.md`'s "Next:" names the post-landing action; the unresolved-items list stays.
- **C3.** `WORKFLOW.md` marks the unimplemented commands as the spec's CLI contract; its G6 row says
  `stages.ci` runs G6 as a declared `n/a` until `src/` exists.
- **§7.1.** `spec.md` is renumbered into reading order, and **every** reference is rewritten — 64
  documents, 26 code/rule/workflow files, historical records included. **This explicitly overrides
  the append-only history rule.** It moves `qualityInputsHash` (two `§` comments in `quality.ts`), so
  it lands with §5.1's `quality.ts` change: one ratchet refresh, not two.
- **§7.2.** The 34 answered §15 questions fold into the sections they decided; only #16 (R2
  account, bucket, keys) and #20 (deploy) remain in §15.
- **§7.3.** A one-page index of `.scratch/superman-v0/` marks each document live, historical or
  superseded.

### Lane landing

- **A1.** `spec/superman-v0` is fast-forwarded to `ea544b0`; one scoped `--gate G6` at the landed
  head verifies the ratchet. The landed record states that the lane's earlier receipts came from a
  disposable clone under `HEAD_REF=spec/superman-v0`.

## Defer to a named ticket

| Ticket | Takes |
|---|---|
| 01 skeleton-and-raw-gates | C1 scripts (`duplication`, `test`) — correct once `src/` and `test/` exist; removes the declared G5/G6/G2 `n/a` entries |
| 05 path-policy-trace-test-first | The automated readiness-derivation check (§5.2), requirement-ownership check (§5.3) and citation-integrity check (A4/C4) |
| 06 ratchets-and-gate-ci | The versioned per-profile ratchet record and reader migration (§5.3, A4, B3); B4's dead `stryker.config.json` `mutate` key, in the same identity refresh |
| 09 overlay-ship-and-adr-rule | Owner of `plan-critic` (M15), activated when a spec needs it |
| 16 / 17 | Acceptance criteria that need an lx run move to the lx-A/B/C spec PR in legiox-workspace; the in-repo fixtures stay as acceptance here |
| 28 okf-validator-and-g12 | Arming G12 (declared `unarmed` until then) |
| 33 deno-release-bundles-and-native-parity | The Deno twin suites' automated leg (resolving the banned `deno test`); `deno.json` / `deno.lock`; one scheduled drift job for `tsc` and `deno check` (B5) |

## Rejected

None.

## Open input for to-spec

- **§5.6:** which clauses of 0015, 0016 and 0017 become `accepted` is André's content review at
  Gate 1; these decisions do not settle it.
