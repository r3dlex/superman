# 12: Change model, provider interface and the receipt `affected` block

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Every `superman gate` run computes its changed files once (`git diff --name-status <merge-base>...<head>` for `pre-pr`/`ci`, staged files for `pre-commit`), asks the active providers for affected targets through one `AffectedProvider` interface (§5.7), merges their results by target id, applies `affected.global`, `affected.links`, `affected.ignore` and the force-full triggers, and writes the `affected` block (§5.5) into the receipt before any gate runs. `superman affected [--base] [--staged] [--json]` prints the same result. `gate pre-pr|ci --affected` uses it; without the flag, on a `push` to the base branch and in `gate nightly` the mode is `full`. This ticket ships the interface, the merge, force-full, the glob provider and the `superman affected` command; real providers come in 14–20. ADR 0010.

**Blocked by:** 06

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (config wiring is ticket 24's follow-up; fixtures carry their own config).

- [ ] A fixture repo where a glob-mapped file changes yields `mode: "affected"` with one target, its provider `glob` and a reason naming the file; the test is written first and fails before the change model exists.
- [ ] Changing a file under each built-in force-full group (a protected path, a lockfile, `tsconfig.json`, `.moon/workspace.yml`, a configured `global` path) yields `mode: "full"` and `forceFull` naming the file and group.
- [ ] A changed file no provider claims and no `ignore` glob matches yields `mode: "full"` with reason `unclaimed`; the same file under `ignore` yields no target.
- [ ] A shallow clone (no merge-base) and a provider that exits non-zero each yield `mode: "full"` with the reason; neither crashes the gate.
- [ ] A deleted file and a renamed file are both in `changedFiles` with status `D`/`R`, and the targets that owned the old path are affected.
- [ ] Two providers claiming the same file both contribute targets; the merged list is sorted and byte-stable across two runs.
- [ ] `gate ci --affected` in a fixture with `GITHUB_EVENT_NAME=push` on the base branch runs in `full` mode, and `gate nightly --affected` exits 2 with a usage error.
- [ ] `superman affected --json` output equals the receipt's `affected` block for the same inputs.
