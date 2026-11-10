# 10: Harness plugin manifests from one release tree

**Milestone:** M10b (M1 amendment)

**What to build:** A harness user installs the Superman overlay in Claude Code, Codex and OpenCode from one canonical extracted source/assets tree: thin verified manifests point at root `skills/`, repo catalogs retain their roles and OpenCode uses that same tree through `skills sync`. Prove §12.1's manifest/discovery/hash items using a fixture-built allowlisted source/assets archive, not npm/`pnpm pack`. Final production bundle assembly and compiled-artifact parity are ticket 33, avoiding a dependency cycle. Confirmed facts update the spec only through the protected follow-up.

**Blocked by:** 09

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-harness-catalogs`: adds `.agents/plugins/marketplace.json` and finalises the `superman` entry in `.claude-plugin/marketplace.json`; amends spec §12.1 with the verified facts.

After this ticket, separately reviewed `spec/superman-v0-release-assets` adopts MIT LICENSE/release metadata and concrete release allowlist/build manifests before ticket 33. Fixture archive smokes here do not activate those policies or certify final binary artifacts.

- [ ] `claude plugin validate .` passes, and installing from a local marketplace pointing at the extracted source/assets tree exposes `ship` and `adr-rule` (invocation name recorded).
- [ ] Codex installs from the repo marketplace or extracted source/assets tree and lists both skills; the chosen manifest form and SHA pinning are recorded.
- [ ] OpenCode loads both skills from the configured path; v1/v2 behaviour recorded.
- [ ] `superman skills sync --harness claude|codex|opencode` writes only that harness's config and is byte-stable on re-run.
- [ ] The fixture source/assets archive contains exactly §12.1's allowlisted files with one copy of each canonical overlay skill and matching hashes. Source/runtime inputs and on-disk harness files resolve independently of cwd; embedded binary assets are not assumed discoverable skills. No npm route or upstream Pocock redistribution.
- [ ] No runtime dependency is added (no OpenCode JS plugin).
