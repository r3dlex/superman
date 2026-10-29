# 06: Ratchets and the switch to `superman gate ci`

**Milestone:** M7

**What to build:** `superman gate pre-pr`, `ci` and `nightly` run the jscpd ratchet (G5: total % ≤ baseline and no new clone touching changed files) and the Stryker ratchet (G6: incremental on the PR's changed `src` files with the nightly incremental cache; nightly full run with `--force`, which opens an issue when the score drops). After this, CI calls `superman gate ci` instead of raw commands.

**Blocked by:** 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-gate-ci`: replaces `.github/workflows/ci.yml` with the rendered `superman.yml` (3-OS matrix, nightly with `issues: write` only on that job), removes `.superman/ci/`, and keeps every action SHA-pinned.

- [ ] A fixture PR that lowers the mutation score on changed files below `mutationScorePr` fails G6 with the surviving mutants listed (file, line, mutator).
- [ ] A fixture PR that adds a clone touching changed files fails G5.
- [ ] `superman gate ci` output with `--output github` produces annotations and the receipt is uploadable as `superman-receipt-<sha>`.
- [ ] Whether Stryker `--since` exists is checked (VERIFY) and the PR records the result; `--mutate` with changed files is used either way.
- [ ] `superman gate nightly` runs full Stryker with `--force` and full jscpd.
