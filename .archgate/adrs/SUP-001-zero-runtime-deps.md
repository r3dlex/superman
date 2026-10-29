---
id: SUP-001
title: No runtime dependencies
domain: superman
rules: true
files: ["package.json"]
---

Source: docs/adr/0003-zero-runtime-deps-typescript-only.md

## Context

superman guards merges, so every runtime dependency is supply-chain surface in the tool that is supposed to be trusted. Node built-ins cover argument parsing, JSON validation, hashing and process spawning.

## Decision

`package.json` declares no `dependencies`, `optionalDependencies` or `peerDependencies`. Tools superman drives (`archgate`, `knip`, `jscpd`, Stryker, Vitest, TypeScript) are exact-pinned `devDependencies` or PATH tools checked by `superman doctor`.

## Do's and Don'ts

- Do use `node:` built-ins (`node:util` `parseArgs`, `node:crypto`, `node:child_process` via `src/exec.ts`).
- Do pin dev tools to exact versions.
- Don't add zod, commander, chalk or similar to runtime dependencies.
- Don't move a runtime need into `peerDependencies` to get around this rule.

## Consequences

### Positive

- `npx @r3dlex/superman` installs one package and nothing else.

### Negative

- A hand-written config validator instead of a schema library.

### Risks

- Dev tools can still be compromised; exact pins and the lockfile limit that.

## Compliance and Enforcement

Rule `no-runtime-deps` reads `package.json` and reports every key in the three runtime dependency fields. Active from M1, because `package.json` exists.

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §4 principle 6, §10, §13
