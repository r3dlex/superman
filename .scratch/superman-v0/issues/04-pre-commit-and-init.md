# 04: Controlled Lefthook pre-commit and byte-stable `superman init`

**Milestone:** M5

**What to build:** Byte-stable, non-destructive templates and the controlled **Deno→Lefthook 2.2.2→Superman** pre-commit adapter from spec §5.2/§5.6/§5.10 (ADRs 0003/0016). Lefthook wraps one static job, not gate selection/scheduling. Preserve reviewed configs, diff/refuse modified generated files unless explicit `--force`, and never translate that flag into native Lefthook force/reset/install. Until ticket 12, source-file related tests use `gates.testRelated`; afterward explicit test targets use `gates.test`. Ticket 24 supplies provider/cache activation; ticket 27 later extends init with vault/wiki.

Preserve the already reviewed bootstrap configs; this ticket does not first enable their checks. Commits stay green after a complete local TDD cycle. The later model uses verified complete-project typechecks or full fallback, declared CLI process-test inputs and GEN-002/local ADR adoption policy (spec §5.7, §17).

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-dogfood-init`: reviewed config/lock, adapter, `lefthook.yml`, exact development/PATH tool pin, lifecycle-suppression settings, AGENTS and CODEOWNERS. Safe repo-local hooksPath adoption only; no automatic replacement of another manager or global config. The effective config/local/include/remote surfaces and pin/lifecycle fields remain protected.

- [ ] Running `superman init` twice in a fixture repo yields an empty `git diff` the second time.
- [ ] `init` on a repo with a hand-edited `AGENTS.md` block exits 1 and prints a diff unless `--force`.
- [ ] The portable Deno adapter validates actual runtime/profile and Lefthook pin/effective config, then calls `lefthook run pre-commit --no-auto-install --no-stage-fixed` through the approved argv process seam; one protected static job delegates to `superman gate pre-commit`. No dynamic filenames/args, auto-install/sync/staging or stash/restore. Lefthook's internal static shell boundary is documented honestly. Hooks require provisioned Deno even when the CLI is compiled; no native hook installer or Node fallback.
- [ ] `init --repo-kind polyglot` writes config with repo-specific gate commands left for the user, and `paths.whyAdrs`/`paths.glossary` configurable (lx: `docs/architecture/adr`, `CONTEXT.md`).
- [ ] `superman gate pre-commit` p50 is ≤10 s on the superman repo (measured over 10 runs, reported in the PR). Receipts label its staged feedback partial, never the full pre-PR/CI quality bar; the speed target does not waive checks applicable to that stage.
- [ ] **(M1 amendment)** A staged file that fails Biome makes pre-commit fail with Biome's file:line, and unstaged files are not checked. Gate processes are spawned without `TSRS_FAST` in their environment.
- [ ] A pre-commit touching a protected path on a `ticket/*` branch fails with one line naming the path.
- [ ] Effective config/include/protected-field changes are rejected, while unrelated package metadata remains editable; inert suppression fixture strings are not treated as active directives.
- [ ] Missing/wrong Lefthook, unexpected local/discovered/include/remote config, environment config/skip/exclude overrides and masked delegation fail closed. Receipts retain Superman exit 1/2 even though Lefthook returns 1 for either failure.
- [ ] Partial staging, deletions, untracked files and hostile/space/newline filenames produce direct/hook scope parity with unchanged index/worktree/stash state; staged paths do not imply an unproved index-only execution sandbox.
- [ ] Existing hook managers, hand-edited adapters and global hooksPath are refused/diffed without native install, hook replacement, `.old` backup chaining, `.github/hooks/lefthook.json` deletion or global Git-config changes. Parallel linked-worktree runs do not rewrite shared hook metadata.
- [ ] Dependency provisioning uses lifecycle suppression; neither npm postinstall nor `LEFTHOOK=0` is mistaken for a safe installer. CI/nightly continue calling Superman directly.
- [ ] CI templates require resolved reviewed existing self-hosted profiles (§8/ADR 0015), actual native-platform/tool/access identities and available image or native-environment inventory. Missing required facts block; no bare hosted route, new VM/image platform or silent failover is generated. Approved exact-pinned job-local tools do not imply global changes. Regeneration preserves reviewed routing/checks; owner name alone is not adoption evidence. Provider/cache/writer activation remains ticket 24's follow-up.
- [ ] Init renders the already-reviewed explicit Deno launch/config/capability/input inventory without selecting an unapproved version/profile. Adversarial cwd/parent config/import-map/lock/HOME/env/PATH and noninteractive-denial fixtures retain direct/hook scope and receipt parity. Adoption of actual protected runtime files/adapter remains the existing spec-kind follow-up, not this ticket changing governing policy.
- [ ] **(2026-11-08)** This PR replaces every today-step that `superman gate pre-commit` takes over in [WORKFLOW.md](../../../WORKFLOW.md#the-three-flows)'s three flows. Once every step of a flow runs through superman, that flow's superman diagram becomes the flow and today's is deleted.

Start with partial-staging direct/hook parity, then twice-run init with pre-existing reviewed configs and a conflicting hook manager.
