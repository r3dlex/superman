---
id: SUP-003
title: No shell or Python files, and hooks run on Node
domain: superman
rules: true
files: ["**/*.sh", "**/*.py", ".superman/hooks/*"]
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

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §3, §5.6, §13
