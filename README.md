# superman

Human-in-the-loop guardrails for AI coding agents.

Status: bootstrapping. The v0 design was agreed on 2026-10-30; product implementation remains blocked on the Gate 1 bootstrap prerequisites in [spec §17](.scratch/superman-v0/spec.md#17-protected-path-follow-ups-and-bootstrap-readiness). M1 amendment 4 updates the plan and narrow bootstrap rules/path policy, not the remaining raw gates or product implementation. The first PR (`spec/superman-v0`) is authored by the GitHub App `r3dlex-superman-bot` and reviewed and merged by [@br4vesirrobin](https://github.com/br4vesirrobin).

The approver reviews the exact PR head; CI tests its merge with a recorded base. Public Superman requires a fresh base at merge. The workflow forbids agent approval and merging, but the App can technically merge after approval; audit detects that accepted v0 limitation. Private legiox-workspace remains audit-only where host protection is unavailable.

- Spec: [`.scratch/superman-v0/spec.md`](.scratch/superman-v0/spec.md)
- Tickets: [`.scratch/superman-v0/issues/`](.scratch/superman-v0/issues/)
- Decisions: [`docs/adr/`](docs/adr/) (why) and [`.archgate/adrs/`](.archgate/adrs/) (enforced rules)
- Glossary: [`GLOSSARY.md`](GLOSSARY.md)

The first usable v0 release includes change-aware tests and verified-project typechecking, all M7b providers and cache tiers, and shared ticket claims. Its checker runs from the PR itself: tests and human review, not an independent evaluator, are the accepted trust boundary. Scoped duplication scans and heuristic Elixir selection can detect some regressions only after merge; see spec §5.7.

**M7c is in v0:** a governed vault, candidate-first memories reviewed with code, agent-owned OKF wiki, blocking G12 and nightly wiki maintenance. Five bounded overlay names total ≤470 lines; the AGENTS block stays ≤25. Lefthook wraps Superman's pipeline without automatic stash/staging; optional CodeGraph is session-scoped context, never gate authority. These are planned in [spec §5.8–5.9](.scratch/superman-v0/spec.md#58-governed-vault-okf-wiki-and-g12-m1-amendment-4-adr-0012) and tickets 27–32, not implemented here. Go/deploy tickets 25–26 remain post-v0.

Distribution: one MIT-licensed npm package, `superman-ai` (CLI command `superman`, plus overlay skills). Claude Code and Codex use plugin manifests; OpenCode uses skills only. A public `0.0.0` placeholder already exists; it is not a usable CLI release. André's release tag authorizes direct OIDC publishing after build, test and scan jobs pass; privileged publishing and cache-writing jobs are separate from project-code execution.

Next: complete the Gate 1 bootstrap checklist in spec §17 before admitting ticket 01.
