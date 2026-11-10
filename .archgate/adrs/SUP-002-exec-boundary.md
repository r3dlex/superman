---
id: SUP-002
title: Child processes only through src/exec.ts, never through a shell
domain: superman
rules: true
files: ["src/**/*.ts", ".superman/deno-bootstrap/**", ".scratch/superman-v0/deno-*.ts", "**/deno.json", "**/deno.jsonc", "**/import_map.json"]
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

Rule `deno-exec-boundary` extends the same boundary to the Deno runtime graph. The Deno runtime graph as it exists today has two surfaces: the operational Deno root `.superman/deno-bootstrap/`, which is Deno runtime source, and the Deno-named candidate surface `.scratch/superman-v0/deno-*.ts`, which is Node-hosted probe and measurement tooling that merely names Deno. The exec-seam and shell-spawn checks act on the source of both; the `node:child_process` ban is restricted to the operational root, because the candidate's probes legitimately drive Deno as a child from Node. Every Deno configuration and import-map input in the tree (`deno.json`, `deno.jsonc`, `import_map.json`) is in scope wherever it sits. A Deno configuration input is read wherever it sits, including under `src/`, because a Deno configuration is a Deno configuration wherever it is. The Deno source rules read only the Deno runtime graph's sources: the product `src/` tree stays Node until ticket 01 and row 11 port it, so `src/*.ts` is not Deno source yet. It reports a `Deno.Command`, `Deno.run` or `Deno.spawn` outside the exec seam, `shell: true`, a shell interpreter named anywhere in a Deno spawn's executable or arguments (`sh`, `bash`, `zsh`, `dash`, `ksh`, `cmd`, `cmd.exe`, which covers the `sh -c` and `cmd /c` command-string forms and an interpreter reached through another executable such as `env sh -c`), a `node:child_process` import in the operational Deno root, and a blanket permission grant (`-A`, `--allow-all`) in the operational runtime or the Deno configuration. A literal that holds only the flag names it rather than granting it, so `["-A"]` on its own is not a grant. The exec seam is one definition: the runtime's exec module, one per runtime — `src/exec.ts` for the product (ADR 0016) and `.superman/deno-bootstrap/exec.ts` for the operational Deno root. André confirmed the exact-path definition on 2026-11-04: a nested `exec.ts` is not the runtime's exec module and is reported, not exempt. The Node-side checks keep exactly the scope they had at HEAD — the `src/` sources — so widening the ADR's declared scope does not change what they report, even where a widened pattern such as `**/deno.json` reaches a path under `src/`.

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §5.3 (rules for gate commands), §10
