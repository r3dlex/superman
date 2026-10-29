# 23: `audit` miss tracking and the auto-off ledger

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** `superman audit` reads the receipts of full runs (nightly, `main` pushes) and of each merged PR's last affected run, and reports **misses** (ADR 0010: a target that fails in a full run, fails again on one rerun, and was not selected by an affected run of a PR merged since the last green full run), attributed to the PR and the owning provider, and the rate per repo and provider. `gate nightly` writes a signed miss ledger `{ repo, window, rate, providers: { id: rate }, state }` to the trusted cache namespace; `gate ci --affected` reads it and runs full for a repo or provider whose rate is above `affected.missThreshold` (default 0.02), printing why; a missing or invalid ledger means full. `affected.missResetAt` resets the window.

**Blocked by:** 13, 07

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture receipts with one PR that did not select a target that later failed nightly (twice) produce one miss naming that PR and provider (test-first).
- [ ] A target that fails once and passes on rerun is reported as a flake, not a miss.
- [ ] Rate above the threshold makes the next `gate ci --affected` run full with reason `miss-ledger:<provider>`; a provider-level off leaves other providers in affected mode.
- [ ] A ledger with a bad signature, or none, makes `--affected` run full.
- [ ] `missResetAt` later than the misses brings the rate back to 0.
