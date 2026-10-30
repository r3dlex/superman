# 14: TS/JS import-graph provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The zero-runtime-dependency TS/JS adapter described in spec §5.7: static imports/exports/require/literal imports, TS paths/extends/package conditions/workspaces, reverse closure and base/candidate deletion handling. Unknown resolution broadens the package/full test scope with honest confidence. Explicit test targets use `gates.test` plus test files, not `vitest related`. Independently verify complete compiler-project references/inputs and explicit tsrs argv; the test import graph alone cannot scope a typecheck. Respect broad declared CLI-process tests and packaged runtime assets (ADR 0010).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture: `a.ts ← b.ts ← b.test.ts` and `c.ts ← c.test.ts`; changing `a.ts` selects only `b.test.ts` with reason `a.ts → b.ts → b.test.ts` (test-first).
- [ ] `paths` alias (`@/x`), `exports` subpath with `import`/`require` conditions, a workspace package import and a `.js` specifier pointing at a `.ts` file each resolve in their own fixture.
- [ ] A type-only import (`import type`) is an edge (a type change can break a test's typecheck).
- [ ] A non-literal `import(name)` marks the package's tests affected with `confidence: "heuristic"`.
- [ ] Deleting `a.ts` selects the tests that imported it in the base graph.
- [ ] A gate-module change selects its narrow unit tests **and** every declared broad CLI-process test; unrelated narrow tests are omitted. Provider duration is measured against the <1 s target.
- [ ] `src/affected/ts.ts` stays under 500 lines (scope smell otherwise, §10 size budget).
- [ ] Verified project references select complete compiler projects/reverse dependents; absent/ambiguous references, compiler options or argv fall back to the full typecheck, including the single-root-project case.
- [ ] A runtime skill/template Markdown change reaches its declared tests; no blanket extension ignore hides it.

Start with import-independent subprocess tests and declare their full-source inputs before optimizing unit-test selection.
