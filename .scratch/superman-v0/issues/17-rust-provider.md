# 17: Rust provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `Cargo.toml`. `cargo metadata --format-version 1` gives `workspace_members`, package manifest paths and `resolve.nodes[].deps[]` with `dep_kinds` (normal, dev, build). A changed file belongs to the package whose manifest directory is its longest prefix; the affected targets are those packages plus their reverse dependencies inside the workspace (dev-deps included, because they affect tests). Test command: `cargo test -p <crate>` per target. Root `Cargo.toml`, `Cargo.lock`, `rust-toolchain(.toml)` and `.cargo/config.toml` force full.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fake `cargo` replaying recorded `metadata` JSON for a three-crate workspace (`core ← api ← cli`) selects `core`, `api` and `cli` for a `core` change and only `cli` for a `cli` change (test-first).
- [ ] A dev-dependency edge counts; a build-dependency edge counts.
- [ ] A file in a non-member path (e.g. `examples/` outside any package) is unclaimed and forces full unless ignored.
- [ ] The same verified package graph supplies explicit complete-crate typecheck commands for affected crates/reverse dependents; feature/config/input ambiguity falls back to the configured full check, not an arbitrary Rust file list.

Start with the recorded crate graph, adding complete-project typecheck targets alongside test targets.
- [ ] On lx, `apps/sarif-core` changes select `cargo test -p sarif-core` (recorded at adoption).
