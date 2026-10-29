# 24: `init`, `doctor` and CI template wiring; SUP-008 active

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** `superman init` detects the repo's providers and writes the `affected` config section (§5.3), pins the provider tool versions it finds in the lock, renders the CI template from §8 (`--affected` on PRs only, `actions/cache` step, nightly full job in the `superman-cache-write` Environment) and renders SUP-008's two rules into the target repo (id per question 23). `superman doctor` lists active providers and versions, warns on the glob fallback and on tool version drift, and reports the cache tiers and the miss-ledger state. After the follow-up merges, superman's own CI uses affected mode and SUP-008 is active on this repo.

**Blocked by:** 14, 21, 23

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-affected`: the `affected` section in `superman.config.json`, `.github/workflows/superman.yml` with `--affected` on PRs, the pinned `actions/cache` step, and the nightly in the write Environment. `archgate check --strict` must pass on it with SUP-008 active.

- [ ] `init` on a polyglot fixture (TS + Rust + Elixir) writes providers `["ts","rust","elixir"]`, and re-running it gives no diff (test-first).
- [ ] The rendered workflow passes SUP-008; removing its `schedule:` makes SUP-008 fail; adding a raw `vitest run` step makes SUP-008 fail.
- [ ] `doctor` on a fixture with only glob mappings prints a warning and exits 0.
- [ ] On this repo after the follow-up, a PR changing one gate module runs only that gate's tests, and its receipt shows the reason (first real affected-mode PR, linked from the follow-up).
