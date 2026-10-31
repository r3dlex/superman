# 16: Elixir provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `mix.exs`. Umbrella apps come from `apps/*/mix.exs` and their `in_umbrella: true` deps. File-level edges come from `mix xref graph --format json --output -` (Elixir ≥1.19), run per app; the reverse closure of the changed files gives the affected source files, and test files are selected per affected app as the test files whose source names a module defined in an affected file, plus `<path>_test.exs` by convention (`confidence: "heuristic"`). Changes to `test/test_helper.exs`, `test/support/**`, `config/*.exs`, `mix.exs` or `mix.lock` select the whole app (root ones force full). Test command: `mix test <files>` in the app directory. Locally `superman affected --staged` mentions `mix test --stale` as the faster option; CI never relies on it (question 21). An Elixir older than 1.19 makes the provider app-level only.

The heuristic test subset is deliberately retained in CI (2026-10-30), not mislabeled exact. Compiler/typecheck selection uses complete verified apps and reverse dependents with configured argv, never the heuristic test-file subset; unknown compiler scope uses the full command. Cache reuse still requires a complete input model (spec §5.7).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fake `mix` replaying recorded `xref graph --format json` output selects the expected test files in a two-app umbrella fixture (test-first); the PR records the Elixir version and the exact JSON shape (VERIFY).
- [ ] A change in app A that app B depends on (`in_umbrella`) selects B's tests too.
- [ ] A `test/support/` change selects the whole app; a root `config/config.exs` change forces full.
- [ ] A helper/process-mediated test omitted by module-name matching is reported as heuristic risk and detected by an uncached full run; verified attribution belongs to ticket 23.
- [ ] Complete-app compile targets include reverse dependents, while unverified app graph/argv uses the whole-repo fallback.

Start with a recorded two-app xref fixture and a test that reaches behavior through a helper.
- [ ] Elixir < 1.19 (fake `elixir --version`) degrades to app-level selection with `precision: "package"` and a `doctor` note.
- [ ] Against lx at the adoption milestone: one real `mix xref graph --format json` run is recorded, with its duration.
