# 21: Gate cache: content-hash key, local and Actions tiers

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** `src/cache/key.ts` computes the cache key (ADR 0011: sha256 of canonical JSON over schema, gate, target, argv, tool versions, config hash, os, arch, env allowlist and sorted input file hashes, where inputs are the target's files, its transitive dependencies from the provider and the `global` paths). Before running a gate for a target, superman looks up the key in `.git/superman/cache/`; a stored pass skips the gate and the receipt records `cached: { key, tier: "local", producerSha }`. Only passes are written. In CI the same directory is restored and saved by an `actions/cache` step (tier `actions`); `gate nightly` neither reads nor skips (it still writes on `main`).

**Blocked by:** 13

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** The pinned `actions/cache` step lands with ticket 24's follow-up (`spec/superman-v0-affected`).

- [ ] Running `gate pre-pr --affected` twice on an unchanged fixture runs the tests once; the second receipt shows `cached` with tier `local` (test-first).
- [ ] Changing any one key component (a dependency's file, a tool version, the gate argv, an allowlisted env var, the config section) misses the cache, each in its own test.
- [ ] A failing gate writes nothing, and a later run re-runs it.
- [ ] `gate nightly` re-runs a target that has a cached pass.
- [ ] The key is byte-stable across macOS and Linux for the same inputs except the `os`/`arch` fields (golden test).
