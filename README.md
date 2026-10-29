# superman

Human-in-the-loop guardrails for AI coding agents.

Status: bootstrapping. The v0 spec lands as the first PR (`spec/superman-v0`), opened by the GitHub App `r3dlex-superman-bot` on a branch of this repo and approved and merged by a human approver ([@br4vesirrobin](https://github.com/br4vesirrobin)). From then on every change goes through a reviewed PR: the App authors and never approves or merges, and the approver approves the exact head SHA and merges.

- Spec: [`.scratch/superman-v0/spec.md`](.scratch/superman-v0/spec.md)
- Tickets: [`.scratch/superman-v0/issues/`](.scratch/superman-v0/issues/)
- Decisions: [`docs/adr/`](docs/adr/) (why) and [`.archgate/adrs/`](.archgate/adrs/) (enforced rules)
- Glossary: [`GLOSSARY.md`](GLOSSARY.md)

Planned distribution: the npm package `@r3dlex/superman` (CLI plus overlay skills), installable as a plugin in Claude Code, Codex and OpenCode. Nothing is published yet.
