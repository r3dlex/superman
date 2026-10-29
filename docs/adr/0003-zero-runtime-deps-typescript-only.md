---
Status: accepted
---

# Zero runtime dependencies, TypeScript only, one exec boundary

The tooling superman replaces (autobahn, northstar) was about 11.5k lines with 6.7k of Python and 1.8k of bash, depended on daemons, and cost about 30k tokens of context. superman's own code is TypeScript on Node built-ins only: `package.json` `dependencies` stays empty, external tools (`git`, `gh`, `archgate`, `knip`, `jscpd`, `stryker`) are pinned devDependencies or PATH tools that `doctor` checks, no `*.sh` or `*.py` file is tracked, hooks are Node-shebang files, and `node:child_process` is imported only by `src/exec.ts`, which spawns argv arrays with `shell: false`.

## Considered Options

- zod, commander and similar small dependencies: rejected; a hand-written validator and `node:util` `parseArgs` cover v0, and every dependency is supply-chain surface in a tool that guards merges.
- Bash or Python glue for hooks and CI: rejected for the reasons above.

## Consequences

- Enforced by SUP-001 (no runtime deps), SUP-002 (exec boundary, no `shell: true`) and SUP-003 (no `.sh`/`.py`, Node hooks).
- An OpenCode JS plugin that needs `@opencode/plugin` at runtime would break this rule, so v0 integrates with OpenCode through skills only (ADR 0006).
