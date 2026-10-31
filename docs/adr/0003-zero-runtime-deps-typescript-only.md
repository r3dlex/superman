---
Status: accepted
---

# Zero runtime dependencies, TypeScript only, one exec boundary

The tooling superman replaces (autobahn, northstar) was about 11.5k lines with 6.7k of Python and 1.8k of bash, depended on daemons, and cost about 30k tokens of context. superman's own code is TypeScript on Node built-ins only: runtime dependencies stay empty, external tools are pinned devDependencies/CI binaries or checked PATH tools, no shell/Python file is tracked, and hooks are Node-shebang files. Product source imports `node:child_process` only in `src/exec.ts`, using argv with `shell: false`. Protected bootstrap/privileged-writer entrypoints under `.superman/` are policy tooling, not a way to move product behavior around that source seam; their own process calls retain built-in-only/argv guarantees. **M1 amendment 4** narrows the process restriction to no unmanaged persistent processes, not a ban on ordinary children/workers.

## Considered Options

- zod, commander and similar small dependencies: rejected; a hand-written validator and `node:util` `parseArgs` cover v0, and every dependency is supply-chain surface in a tool that guards merges.
- Bash or Python glue for hooks and CI: rejected for the reasons above.
- A second language-specific hook scheduler: rejected in Amendment 4. Lefthook wraps one Superman entrypoint; Superman retains change analysis, commands and receipts, so local/CI policy does not fork.

## Lefthook adoption (M1 amendment 4, 2026-10-30)

André chose language-agnostic hook delivery with external **Lefthook 2.2.2**, MIT, pinned commit `eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03`. Superman keeps the Node Git adapter and safe repo-local hooksPath, calling `lefthook run pre-commit --no-auto-install --no-stage-fixed` after pin/config validation. The effective config delegates one static `superman gate pre-commit` job; CI/nightly invoke Superman directly. Exact operational safeguards live in spec §5.6 and ticket 04.

Native Lefthook installation was rejected: it generates shell hooks, replaces/backups existing hooks without chaining them, can remove `.github/hooks/lefthook.json`, and `--reset-hooks-path` can unset global Git configuration. Its npm postinstall calls `install`, so provisioning suppresses lifecycle scripts; `LEFTHOOK=0` alone is insufficient outside CI. `stage_fixed: false` also does not prevent the default partial-staging stash/restore, which is why the adapter uses the CLI flag.

Lefthook executes `run` via `sh -c`, even with a runner. This is an explicit **external static-wrapper exception**, not permission for shell-interpolated gate commands or tracked shell helpers. There are no filename/argument placeholders. Missing tools/bypass config fail closed; child 1/2 distinctions remain in Superman's receipt because Lefthook collapses failures to 1. Existing managers/global config are refused, not silently repaired; concurrent worktree/direct-hook parity remains evidence to obtain, not a source-inspection claim.

Primary sources at the pin: [LICENSE](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/LICENSE), [run flags](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/cmd/run.go), [partial-staging guard](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/internal/run/controller/guard.go), [shell executor](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/internal/run/controller/exec/exec_unix.go), [installer](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/internal/command/install.go), [postinstall](https://github.com/evilmartians/lefthook/blob/eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03/packaging/registries/npm/lefthook/postinstall.js).

## Consequences

- Enforced by SUP-001 (no runtime deps), SUP-002 (exec boundary, no `shell: true`) and SUP-003 (no `.sh`/`.py`, Node hooks).
- Dev tools are never runtime dependencies (amended 2026-10-29). Biome (`@biomejs/biome`) and tsrs are exact-pinned devDependencies, and their native binaries come through their own `optionalDependencies` at dev time only. Trivy is a CI binary, downloaded at a pinned version with its sha256 checked, and is used locally only when it is on PATH. None of these ship in the npm tarball or enter `dependencies` (ADR 0008, ADR 0009). ADR 0014's protected coverage collector is the bounded development-tool API exception: c8's locked V8 merger/Istanbul reporters and Vitest's test API plus locked AST converter/parser combine complete subprocess/rule and product measurements. Product code and other bootstrap process boundaries retain the built-in-only rule.
- No Python tooling either: no Ruff and no Python linters. Polyglot repos use their own language's tools.
- An OpenCode JS plugin that needs `@opencode/plugin` at runtime would break this rule, so v0 integrates with OpenCode through skills only (ADR 0006).
- The full YAML/Markdown parser requirement for G12 stays dependency-free despite its substantial implementation cost (ADR 0012). Optional external session-scoped CodeGraph is context, not runtime library or gate authority (ADR 0013).
