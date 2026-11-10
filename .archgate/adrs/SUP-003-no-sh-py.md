---
id: SUP-003
title: No shell or Python files, and hooks run on Node
domain: superman
rules: true
files: ["**/*.sh", "**/*.py", ".superman/hooks/*", ".superman/deno-bootstrap/**", ".scratch/superman-v0/deno-*.ts"]
---

Source: docs/adr/0003-zero-runtime-deps-typescript-only.md

## Context

The tooling superman replaces carried about 6.7k lines of Python and 1.8k of bash. Superman's tracked tooling/hooks remain TypeScript/Node; Amendment 4 adopts external Lefthook only through a controlled Node adapter.

## Decision

The repository tracks no `*.sh` or `*.py` file, and every file in `.superman/hooks/` starts with the `#!/usr/bin/env node` shebang.

## Do's and Don'ts

- Do write scripts as TypeScript run by Node, or as `superman` subcommands.
- Do generate git hooks as Node-shebang files (`superman init`).
- Don't add helper scripts in bash or Python, including under CI folders.
- Don't hide shell logic in a hook without an extension.
- **M1 amendment 4:** the Node adapter delegates with `--no-auto-install --no-stage-fixed`; never use Lefthook's native shell-hook installer. Its external static `sh -c` executor is the explicit ADR 0003 exception, not tracked shell glue or permission to interpolate gate arguments.

## Consequences

### Positive

- One language and one runtime to review and test.

### Negative

- Short glue that would be one line of bash takes a few lines of TS.

### Risks

- Inline `run:` steps in workflows are still shell; keep them to single tool invocations.

## Compliance and Enforcement

Rule `no-sh-py-files` reports every scoped `.sh`/`.py` file; rule `node-hooks` checks hook shebangs. Both are active from M1 and pass today because no such file exists; `node-hooks` is a no-op until M5 adds `.superman/hooks/pre-commit`.

Rule `deno-runtime-shebang` extends the hook contract to the Deno runtime graph's sources: the operational Deno root `.superman/deno-bootstrap/`, which is Deno runtime source, and the Deno-named candidate surface `.scratch/superman-v0/deno-*.ts`, which is Node-hosted probe and measurement tooling that merely names Deno — a tracked shell helper is a tracked shell helper wherever it sits. The product `src/` tree stays Node until ticket 01 and row 11 port it, so `src/*.ts` is not Deno source yet. A shebang there must name `node` or `deno` as its interpreter — the shebang is read as an interpreter line, so `#!/bin/sh -c deno run x` is a shell helper and not a Deno entry point; a shell or Python interpreter is a tracked helper in a language the repository does not run. The existing `.sh`/`.py` file rejection already covers the whole tree, including the Deno graph. The exact Deno hook shebang is still ticket 04's decision, so both runtimes are accepted until then.

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §3, §5.6, §13
