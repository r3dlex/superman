# 10: Harness plugin manifests from one package

**Milestone:** M10b (M1 amendment)

**What to build:** A harness user installs the superman overlay in Claude Code, Codex and OpenCode from the same files: `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` point at the root `skills/`; the repo carries the Claude and Codex marketplaces; OpenCode is pointed at the same `skills/` by `superman skills sync --harness opencode`. No skill file is duplicated in the package or repo. Each §12.1 VERIFY item is proven with a packed tarball (`pnpm pack`) or replaced by what works, and the spec is updated through the follow-up.

**Blocked by:** 09

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-harness-catalogs`: adds `.agents/plugins/marketplace.json` and finalises the `superman` entry in `.claude-plugin/marketplace.json`; amends spec §12.1 with the verified facts.

- [ ] `claude plugin validate .` passes, and installing from a local marketplace pointing at the unpacked tarball exposes `ship` and `adr-rule` (invocation name recorded).
- [ ] Codex installs the overlay from the repo marketplace (or from the packed tarball) and lists both skills; the chosen manifest form (root `plugin.json` vs `.codex-plugin/plugin.json`) and SHA pinning are recorded.
- [ ] OpenCode loads both skills from the configured path; v1/v2 behaviour recorded.
- [ ] `superman skills sync --harness claude|codex|opencode` writes only that harness's config and is byte-stable on re-run.
- [ ] `pnpm pack` contains exactly the `files` allowlist plus README/package.json, with one copy of each skill; a test asserts the packed file list.
- [ ] No runtime dependency is added (no OpenCode JS plugin).
