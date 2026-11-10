---
id: SUP-001
title: No runtime dependencies
domain: superman
rules: true
files: ["package.json", ".superman/deno-bootstrap/**", ".scratch/superman-v0/deno-*.ts", "**/deno.json", "**/deno.jsonc", "**/import_map.json"]
---

Source: docs/adr/0003-zero-runtime-deps-typescript-only.md

## Context

superman guards merges, so every runtime dependency is supply-chain surface in the tool that is supposed to be trusted. Node built-ins cover argument parsing, JSON validation, hashing and process spawning.

## Decision

`package.json` declares no `dependencies`, `optionalDependencies` or `peerDependencies`. Tools superman drives (`archgate`, `tsrs`, Biome, `knip`, `jscpd`, Stryker, Vitest, TypeScript for the drift job) are exact-pinned `devDependencies`. Trivy is a pinned CI binary, or a PATH tool locally. `superman doctor` checks all of them.

## Do's and Don'ts

- Do use `node:` built-ins (`node:util` `parseArgs`, `node:crypto`, `node:child_process` via `src/exec.ts`).
- Do pin dev tools to exact versions.
- Don't add zod, commander, chalk or similar to runtime dependencies.
- Don't move a runtime need into `peerDependencies` to get around this rule.

## Consequences

### Positive

- `npx superman-ai` installs one package and nothing else.

### Negative

- A hand-written config validator instead of a schema library.

### Risks

- Dev tools can still be compromised; exact pins and the lockfile limit that.

## Compliance and Enforcement

Rule `no-runtime-deps` reads `package.json` and reports every key in the three runtime dependency fields. Active from M1, because `package.json` exists.

Rule `no-deno-runtime-deps` extends the same decision to the Deno runtime graph. The Deno runtime graph as it exists today has two surfaces: the operational Deno root `.superman/deno-bootstrap/`, which is Deno runtime source, and the Deno-named candidate surface `.scratch/superman-v0/deno-*.ts`, which is Node-hosted probe and measurement tooling that merely names Deno. This rule acts on the source of both, because a third-party runtime import is a third-party runtime import wherever the file is executed. Every Deno configuration and import-map input in the tree (`deno.json`, `deno.jsonc`, `import_map.json`) is in scope wherever it sits. A Deno configuration input is read wherever it sits, including under `src/`, because a Deno configuration is a Deno configuration wherever it is. The Deno source rules read only the Deno runtime graph's sources: the product `src/` tree stays Node until ticket 01 and row 11 port it, so `src/*.ts` is not Deno source yet. It reports an npm/JSR/HTTP specifier in a runtime import, in a dynamic import, in a `require` call or in a `declare module` declaration, and an import-map alias (`imports` or `scopes`) that resolves to one. The import map is the indirect route: a bare specifier in the runtime resolves through it, so the alias is checked as well as the direct import, and a local alias is followed through the local import graph it reaches, so an alias that points at a file which imports the third-party package itself — directly or through further local imports — is reported too. The Deno lock is not in this rule's scope; it is the resolution input that SUP-006 reads. The Node-side `package.json` check is unchanged.

## References

- docs/adr/0003-zero-runtime-deps-typescript-only.md
- spec §4 principle 6, §10, §13
