# Duplication corpus declaration and first-baseline rules

Status: reviewed policy artifact for preparation step 7, André's **A with conditions**. It records the declared corpus, the inclusion/clone floors, the fail-closed accounting and the first-baseline rules. It does not change `.jscpd.json`, activate G5, create a product baseline, or admit ticket 01.

## Declared operational corpus

- Scope: `src/**/*.ts`, as read by the protected G5 driver in `.superman/ci/quality.ts` (sha256 `1cc6a8ccdd97a167bb0ce3ad9f29bb1900ed22c9472af0ce9428457a62d8fc88`).
- This checkout has no `src/` and no `superman.ratchet.json`. The declared product corpus is empty; real G5 is `n/a`; no product baseline exists.
- The step 7 probe's 4-declared / 3-scanned fixture is a **test fixture**, not the product corpus. Its empty `.ts` omission is a recorded fixture control, not an operational exclusion.
- The retained profile is `.jscpd.json` (sha256 `9b7d0d5eecd680eccc9cd90df9d235fd9c1ba5e130c4a47d79c0d1c5420c9666`): jscpd 5.4.2, `minTokens 50`, effective tool-default `minLines 5`, `format ["typescript"]`, reporters console+json, output `.superman-ci/duplication`, max size 1 MiB, no threshold, no ignore lists.

**Digests refreshed 2026-11-06.** Both pinned digests above named the bytes of the preparation's earlier
state. The G5 driver and the retained jscpd profile have both changed since — the driver gained the staged
scope, the shared report validation and the identity-based survivor comparison — and this document's own rule
says "A tool, profile or policy change invalidates the old baseline". The digests above are the current bytes.
The declared corpus, the clone floors and the fail-closed accounting are unchanged by the refresh.

## File-inclusion floor

- Operational G5 corpus: the driver's explicit `src/**/*.ts` file list. `.d.ts` matches that glob and is included; `.mts` and `.cts` are outside it. Those two are not part of the declared operational corpus even though the tool's format filter would scan them if passed.
- Tool format filter (probe/control): `.ts`, `.mts`, `.cts`, `.d.ts` scanned; `.tsx` excluded even when explicit; `.js`, `.json`, `.md` excluded.
- Omitted classes inside the operational `src/**/*.ts` corpus: empty files, files below 50 tokens, files below 5 lines, and files the driver's explicit list does not contain. The driver passes `--no-gitignore`, so committed `.gitignore`d files are included; the default scan's omission of ignored files is a control, not the G5 route.
- A file included in the declared corpus but omitted by jscpd is a **declared/scanned gap**. The G5 guard `total.sources === after.length` blocks it; it is never silently accepted.

## Clone-detection floor and the 5-line blind spot

- The detected-clone floor is **50 tokens inclusive and more than 5 lines**.
- A 50-token / 6-line pair is detected. A 50-token / 5-line pair is included in the corpus but produces no clone; 100-token / 5-line also produces no clone.
- Included 5-line files remain in `sources`, `lines` and `tokens`. They are not an omitted class.
- The 5-line blind spot is accepted only because this declaration states it explicitly. If it proves material to the product corpus, model **B** (deduplicated covered lines or another reviewed metric) is the fallback; a blind `minLines` change is not a drop-in fix.

## Fail-closed accounting

- `jscpdPct` remains `total.percentage` (line percentage).
- Keep `[0,100]`, `duplicatedLines <= lines`, `sources === after.length`, the percentage identities, `duplicates.length === clones`, and `formats.typescript === total`.
- A real declared-profile corpus that produces `duplicatedLines > lines` blocks for a reviewed decision. It is never clipped, re-based, padded or given a reduced denominator.
- The non-declared 1/1 control's 136.84% line percentage is out of profile. It is a control observation, not a reason to change the declared metric.
- `--changed-only` is disqualified: it missed the changed-to-unchanged clone.
- `--changed` remains a later optimization only after equivalent cross-scope and total-percentage detection is proved. Full-corpus G5 remains the only policy-defined pre-merge route.
- No `--changed` enforced value is selected. If a later `--changed` route is approved, it must state whether `newClones`/`newDuplicatedLines` or the total percentage is enforced and prove equivalent detection; until then, full-corpus total percentage is the only enforced value.

## First baseline and transitions

- A first baseline is allowed only on a **spec-kind** branch, with the exactly measured value and unchanged source. Ordinary ticket work cannot initialize or reinitialize it.
- The baseline direction is tighten-only: a candidate may lower or equal `jscpdPct`; a later regression blocks when `percentage > threshold`.
- Corpus growth or shrinkage must be recorded with the measured corpus and the new denominator. An empty or legitimately zero corpus is reported as `n/a`/initialization, not as an invented zero percentage.
- A tool, profile or policy change invalidates the old baseline; reinitialization needs the same reviewed, exact-measurement path.
- If ticket 01's first source is below the measurable floor, A cannot measure it. A separate reviewed corpus model is required before that source is admitted; no baseline is invented.

## Evidence and current state

- Step 7 probe: `.scratch/superman-v0/duplication.probe.test.ts`, 12 tests, 12/12 in the retained completion run.
- Current probe identity and TAP are in the step 7 correction appended to `.scratch/superman-v0/gate1-preparation.md` and `.superman/ci/bootstrap-evidence.md`.
- No `.jscpd.json`, package, lock, workflow, `src/`, `test/`, `.archgate/**` or other protected policy file is edited by this declaration.
- The declaration does not create a product baseline, activate G5, close Gate 1 or admit ticket 01.
