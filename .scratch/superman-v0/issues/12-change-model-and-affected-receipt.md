# 12: Change model, provider interface and the receipt `affected` block

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** The shared change-model/provider interface in spec §5.7, with test and typecheck commands, input files and reasons per target. Separate PR H/B/M from the actual evaluated snapshot; branch diffs use H, not default `GITHUB_SHA=M`. Merge base/candidate ownership for deletes/renames, declared non-import/runtime assets and force-full precedence. Ship glob fallback and read-only `affected`; real adapters follow in 14–20. Keep compiler-project verification/fallback explicit rather than inferring it from a test-file graph (ADR 0010).

**Blocked by:** 06

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (config wiring is ticket 24's follow-up; fixtures carry their own config).

- [ ] A fixture repo where a glob-mapped file changes yields `mode: "affected"` with one target, its provider `glob` and a reason naming the file; the test is written first and fails before the change model exists.
- [ ] Changing a file under each built-in force-full group (a protected path, a lockfile, `tsconfig.json`, `.moon/workspace.yml`, a configured `global` path) yields `mode: "full"` and `forceFull` naming the file and group.
- [ ] An unclaimed non-ignored input forces full. Declared runtime Markdown and protected/global inputs still select targets or force full even if a documentation ignore matches; blanket `**/*.md` is not emitted.
- [ ] A shallow clone (no merge-base) and a provider that exits non-zero each yield `mode: "full"` with the reason; neither crashes the gate.
- [ ] A deleted file and a renamed file are both in `changedFiles` with status `D`/`R`, and the targets that owned the old path are affected.
- [ ] Two providers claiming the same file both contribute targets; the merged list is sorted and byte-stable across two runs.
- [ ] `gate ci --affected` in a fixture with `GITHUB_EVENT_NAME=push` on the base branch runs in `full` mode, and `gate nightly --affected` exits 2 with a usage error.
- [ ] `superman affected --json` output equals the receipt's `affected` block for the same inputs.
- [ ] A target can expose both test/typecheck argv with distinct result/cache identities; unavailable compiler graph/argv produces full-typecheck fallback, not guessed file arguments.
- [ ] A declared CLI-process target is affected by any source change unless a narrower explicit dependency map applies; changing a packaged skill selects its declared consumers.

Start with one test target and one complete compiler-project target in a fixture; neither consumer recomputes the diff.
