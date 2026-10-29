# 14: TS/JS import-graph provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** `src/affected/ts.ts`, a zero-dependency provider that scans `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` files for static `import`/`export … from`, `require("…")` and literal `import("…")` specifiers, resolves them with TypeScript's rules (`tsconfig` `extends`, `baseUrl`, `paths` wildcards, `package.json` `exports`/`imports` with conditions, pnpm/npm workspace packages, extension and `index` probing), builds the reverse graph and returns the test files (`paths.tests`) that reach a changed file, each with its import chain as the reason. A non-literal `import()` or an unresolvable specifier makes the importing package's whole test set affected (`confidence: "heuristic"`). Target id `ts:<test file>`, test command `gates.testRelated` + files. ADR 0010 option 2.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture: `a.ts ← b.ts ← b.test.ts` and `c.ts ← c.test.ts`; changing `a.ts` selects only `b.test.ts` with reason `a.ts → b.ts → b.test.ts` (test-first).
- [ ] `paths` alias (`@/x`), `exports` subpath with `import`/`require` conditions, a workspace package import and a `.js` specifier pointing at a `.ts` file each resolve in their own fixture.
- [ ] A type-only import (`import type`) is an edge (a type change can break a test's typecheck).
- [ ] A non-literal `import(name)` marks the package's tests affected with `confidence: "heuristic"`.
- [ ] Deleting `a.ts` selects the tests that imported it in the base graph.
- [ ] On the superman repo, a change to one gate module selects only that gate's tests, and the provider runs in under 1 s (reported in the PR).
- [ ] `src/affected/ts.ts` stays under 500 lines (scope smell otherwise, §10 size budget).
