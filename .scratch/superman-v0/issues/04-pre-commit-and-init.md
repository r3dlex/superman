# 04: Controlled Lefthook pre-commit and byte-stable `superman init`

**Milestone:** M5

**What to build:** Byte-stable, non-destructive templates and the controlled **Node→Lefthook 2.2.2→Superman** pre-commit adapter from spec §5.2/§5.6 **(M1 amendment 4, ADR 0003)**. Lefthook wraps one static job, not gate selection/scheduling. Preserve reviewed configs, diff/refuse modified generated files unless explicit `--force`, and never translate that flag into native Lefthook force/reset/install. Until ticket 12, source-file related tests use `gates.testRelated`; afterward explicit test targets use `gates.test`. Ticket 24 supplies provider/cache activation; ticket 27 later extends init with vault/wiki.

Preserve the already reviewed bootstrap configs; this ticket does not first enable their checks. Commits stay green after a complete local TDD cycle. The later model uses verified complete-project typechecks or full fallback, declared CLI process-test inputs and GEN-002/local ADR adoption policy (spec §5.7, §17).

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-dogfood-init`: reviewed config/lock, adapter, `lefthook.yml`, exact development/PATH tool pin, lifecycle-suppression settings, AGENTS and CODEOWNERS. Safe repo-local hooksPath adoption only; no automatic replacement of another manager or global config. The effective config/local/include/remote surfaces and pin/lifecycle fields remain protected.

- [ ] Running `superman init` twice in a fixture repo yields an empty `git diff` the second time.
- [ ] `init` on a repo with a hand-edited `AGENTS.md` block exits 1 and prints a diff unless `--force`.
- [ ] The Node-shebang adapter validates executable pin/effective config, then calls `lefthook run pre-commit --no-auto-install --no-stage-fixed` with `shell: false`; one protected static job delegates to `superman gate pre-commit`. No dynamic filenames/args, auto-install/sync/staging or stash/restore. Lefthook's internal static shell boundary is documented honestly.
- [ ] `init --repo-kind polyglot` writes config with repo-specific gate commands left for the user, and `paths.whyAdrs`/`paths.glossary` configurable (lx: `docs/architecture/adr`, `CONTEXT.md`).
- [ ] `superman gate pre-commit` p50 is ≤10 s on the superman repo (measured over 10 runs, reported in the PR).
- [ ] **(M1 amendment)** A staged file that fails Biome makes pre-commit fail with Biome's file:line, and unstaged files are not checked. Gate processes are spawned without `TSRS_FAST` in their environment.
- [ ] A pre-commit touching a protected path on a `ticket/*` branch fails with one line naming the path.
- [ ] Effective config/include/protected-field changes are rejected, while unrelated package metadata remains editable; inert suppression fixture strings are not treated as active directives.
- [ ] Missing/wrong Lefthook, unexpected local/discovered/include/remote config, environment config/skip/exclude overrides and masked delegation fail closed. Receipts retain Superman exit 1/2 even though Lefthook returns 1 for either failure.
- [ ] Partial staging, deletions, untracked files and hostile/space/newline filenames produce direct/hook scope parity with unchanged index/worktree/stash state; staged paths do not imply an unproved index-only execution sandbox.
- [ ] Existing hook managers, hand-edited adapters and global hooksPath are refused/diffed without native install, hook replacement, `.old` backup chaining, `.github/hooks/lefthook.json` deletion or global Git-config changes. Parallel linked-worktree runs do not rewrite shared hook metadata.
- [ ] Dependency provisioning uses lifecycle suppression; neither npm postinstall nor `LEFTHOOK=0` is mistaken for a safe installer. CI/nightly continue calling Superman directly.

Start with partial-staging direct/hook parity, then twice-run init with pre-existing reviewed configs and a conflicting hook manager.
