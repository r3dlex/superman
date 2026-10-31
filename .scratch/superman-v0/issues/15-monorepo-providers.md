# 15: Monorepo providers: moon, Nx, Turborepo

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Three providers, each detected by its config file (`.moon/workspace.yml`, `nx.json`, `turbo.json`) and tried before the language providers. moon: `moon query projects --affected --downstream deep` fed the change model's files; Nx: `nx show projects --affected --base=<sha> --head=<sha> --json`; Turborepo: `turbo ls --filter=...[<base>...<head>] --output=json`. Each maps projects or packages to targets with precision `project`/`package`, takes each target's test argv from superman config (never `moon run`/`nx run`/`turbo run`, which SUP-008 forbids in workflows and which would bypass receipts), and claims the files under its project roots. Files outside every project fall through to the language providers. ADR 0010.

Also expose configured complete-project typecheck argv only after verifying the native project/reference graph and reverse dependents. An affected-project name list alone is not compiler-scope evidence; missing graph/options/commands triggers the full typecheck fallback (spec §5.7).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] For each tool, a fake executable on `PATH` replaying recorded JSON makes a fixture select exactly the recorded projects (test-first); the PR records the tool version used to record it.
- [ ] moon: whether `query projects --affected` reads changed files from stdin, and the v2 `moon query affected` form, are checked against a real moon install (VERIFY result recorded).
- [ ] Turborepo: `turbo ls --filter … --output=json` is checked against a real install (VERIFY result recorded); if absent, `turbo run test --dry-run=json --filter …` parsing is used instead.
- [ ] A tool missing from `PATH` while its config exists yields `mode: "full"` with reason `provider-missing:<id>`.
- [ ] Changing `nx.json`, `turbo.json` or `.moon/**` forces full.
- [ ] A file outside every project root is passed on to the TS provider in a mixed fixture.
- [ ] Recorded native graphs select the changed compiler project and all reverse dependents; a missing graph/argv fixture falls back to full typechecking without guessing from test targets.

Start by recording each supported tool's real graph output and version, then replay it through the shared interface.
