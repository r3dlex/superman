# 06: Ratchets and the switch to `superman gate ci`

**Milestone:** M7

**What to build:** `superman gate pre-pr`, `ci` and `nightly` run the jscpd ratchet (G5: total % ≤ baseline and no new clone touching changed files) and the Stryker ratchet (G6: incremental on the PR's changed `src` files with the nightly incremental cache; nightly full run with `--force`, which opens an issue when the score drops). After this, CI calls `superman gate ci` instead of raw commands. **(M1 amendment)** `gate pre-pr`/`ci` also run G10 (`biome ci`) and G11 (`trivy fs`; pre-pr reports `n/a (enforced in CI)` when `trivy` is not on PATH), and `nightly` re-runs G11 on `main`. **(M1 amendment 3)** The changed-file list for Stryker `--mutate` and jscpd built here is interim: ticket 13 replaces it with the change model (ticket 12), with identical results on a full run. The nightly job stays full, and SUP-008 becomes active when this ticket's follow-up switches CI to `superman gate ci`.

**Blocked by:** 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-gate-ci`: replaces `.github/workflows/ci.yml` with the rendered `superman.yml` (3-OS matrix, nightly with `issues: write` only on that job), removes `.superman/ci/`, and keeps every action SHA-pinned. It keeps the pinned, sha256-checked Trivy install and the scheduled non-blocking `tsc-drift` job from ticket 01's follow-up.

- [ ] A fixture PR that lowers the mutation score on changed files below `mutationScorePr` fails G6 with the surviving mutants listed (file, line, mutator).
- [ ] A fixture PR that adds a clone touching changed files fails G5.
- [ ] `superman gate ci` output with `--output github` produces annotations and the receipt is uploadable as `superman-receipt-<sha>`.
- [ ] Whether Stryker `--since` exists is checked (VERIFY) and the PR records the result; `--mutate` with changed files is used either way.
- [ ] **(M1 amendment)** A fixture with a HIGH-severity vulnerable lockfile entry fails G11, and a fixture with a Biome error fails G10. Both show in the receipt with tool versions. A `.trivyignore` in a fixture makes G1 fail (SUP-007).
- [ ] `superman gate nightly` runs full Stryker with `--force` and full jscpd.
