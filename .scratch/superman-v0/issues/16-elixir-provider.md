# 16: Elixir provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `mix.exs`. Umbrella apps come from `apps/*/mix.exs` and their `in_umbrella: true` deps; record actual `mix xref graph --format json --output -` output/version where supported (Elixir ≥1.19, VERIFY). Required tests select complete affected apps and reverse dependents only with conservative app-graph/input evidence, otherwise all required targets. Run each selected app's configured complete `mix test` command. Module-name/conventional test-file hints may explain potential impact, but cannot alone prune required checks. Helpers/support/config/manifests/locks broaden appropriately; root unknown/global inputs force full. Older Elixir remains app-level when that graph is verified, otherwise full.

Q16/Q35 supersede the earlier accepted heuristic omission. Finer required-test selection needs demonstrated conservative supported-profile coverage before activation; `mix test --stale` or a confidence label is not that proof. Compiler/typecheck selection likewise uses complete verified apps/reverse dependents with explicit argv or the full command. Cache reuse remains a separate complete-input decision (spec §5.7).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fake `mix` replaying recorded graph output selects complete affected apps/reverse dependents in a two-app umbrella fixture (test-first); record the Elixir version and exact JSON shape. Missing/unsupported/incomplete graph/input evidence selects all required targets, not conventional-name test files.
- [ ] A change in app A that app B depends on (`in_umbrella`) selects B's tests too.
- [ ] A `test/support/` change selects the whole app; a root `config/config.exs` change forces full.
- [ ] A helper/process-mediated test not named by module hints still runs before merge through complete-app/full selection. Hints cannot suppress it; a known omission is not deferred to nightly. Critical cases remain fresh outside selection, and actual incident attribution belongs to ticket 23.
- [ ] Complete-app compile targets include reverse dependents, while unverified app graph/argv uses the whole-repo fallback.

- [ ] Elixir < 1.19 (fake `elixir --version`) degrades to app-level selection with `precision: "package"` and a `doctor` note.
- [ ] Against lx at the adoption milestone: one real `mix xref graph --format json` run is recorded, with its duration.

Start with a recorded two-app graph and a helper/process-mediated test that module-name hints would omit; complete-app/full selection must still run it.
