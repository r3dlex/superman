---
id: SUP-002
title: Child processes only through src/exec.ts, never through a shell
domain: superman
rules: true
files: ["src/**/*.ts"]
---

Source: docs/adr/0003-zero-runtime-deps-typescript-only.md

## Context

Gate commands come from config as argv arrays. Spawning them through a shell would reintroduce quoting bugs, injection risk and hidden processes, and scattered `child_process` calls would make the fake-tool test seam leak.

## Decision

Only `src/exec.ts` imports `node:child_process` (or `child_process`). No source file passes `shell: true`.

## Do's and Don'ts

- Do call external tools through the functions `src/exec.ts` exports, with an argv array.
- Do substitute fake `gh`/`git`/`archgate` in tests through PATH, behind that boundary.
- Don't import `child_process` anywhere else under `src/`, statically or dynamically.
- Don't pass `shell: true`, including inside `src/exec.ts`.

## Consequences

### Positive

- One place to audit process spawning, and one test seam.

### Negative

- Small indirection for one-off calls.

### Risks

- The check is text-level; an alias built at runtime could evade it. Code review at Gate 2 covers that.

## Compliance and Enforcement

Rules `child-process-only-in-exec` and `no-shell-true` grep the scoped `src/**/*.ts` files. **No-op until M2/M3 add `src/`:** with no matching files both rules pass without checking anything.

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §5.3 (rules for gate commands), §10
