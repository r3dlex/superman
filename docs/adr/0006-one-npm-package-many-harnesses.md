---
Status: accepted
---

# One canonical release tree carries the CLI and each harness's overlay

Superman must install into Claude Code, OpenAI Codex and OpenCode. **The 2026-11-01 interview-confirmed plan (ADR 0016) supersedes this ADR's original npm package/bin/OIDC route for v0**, not its one-tree/harness/security requirements. Required source/assets and three Deno-compiled release archives share one canonical overlay tree, with one copy per installed release under `skills/<name>/SKILL.md` and thin manifests (`.claude-plugin/plugin.json`, the verified Codex form, and OpenCode skill discovery/path configuration). Repo catalogs and extracted releases reference identical bytes and lock hashes. The command remains `superman`; only André's `v*` tag authorizes exact verified-artifact GitHub release uploads. No npm/npx/JSR channel or Node launcher is promised. Spec §12 owns the new contract; activation remains blocked under §17.

Historically the npm name changed from `@r3dlex/superman` to `superman-ai` on 2026-10-29 because `superman`/`superman-cli` were taken and no `@r3dlex` scope was owned. The public placeholder and registry evidence are not removed, republished or upgraded into a usable CLI by this amendment.

## Considered Options

- A separate package/release tree or repo per harness: rejected, it duplicates canonical skill files and their hashes drift.
- Keeping the overlay under `plugin/` (the draft layout): workable for Claude Code and Codex's legacy manifest, but Codex's root `plugin.json` dialect hard-codes `./skills` (VERIFY), so a root `skills/` serves every format.
- An OpenCode JS plugin: rejected for v0, because the current plugin API is the `@opencode/plugin` runtime dependency (ADR 0003) and v0 has no hooks to register.
- A long-lived `NPM_TOKEN` secret was rejected for the historical npm route. That route and its OIDC setup are now outside v0; no registry credential or replacement stored publishing token is introduced.

## Consequences

- The per-harness manifest shapes remain partly VERIFY (spec §12.1); ticket 10 proves fixture-source-tree discovery/manifests, while 33 proves final extracted source/compiled-archive parity before release. Neither requires npm installation.
- Public registry metadata checked on 2026-10-30 showed an MIT-licensed `superman-ai@0.0.0` placeholder pointing at this repository. This proves historical existence, not André's access. The earlier instruction to verify npm access/configure trusted publishing is **superseded for v0**, not a remaining release prerequisite or authority for account changes.
- The release allowlist carries owned source/executable entrypoints, explicit launch policy, templates/schemas, canonical skills/manifests, README and MIT LICENSE, not `.scratch/`, `.archgate/`, tests, CI or development dependencies. Compiled embedded assets do not replace on-disk harness files.
- MIT and André's tag as final human release authorization remain selected. The former direct OIDC/staged-npm alternatives are historical, not a v0 publisher prerequisite.
- Build/test/scan jobs have no upload or cache-write authority. A separately restricted uploader verifies the exact source/binary artifacts, native/scan evidence, run/tag/SHA provenance and digests without project installs, rebuilds, tests or hooks (spec §12.2). The confirmed quality amendment restricts it to an operator-approved existing self-hosted environment (ADR 0015); no inherited npm-provider hosted exception or new VM project is authorized.
- The first usable v0 release waits for all v0 work, including both Deno distribution forms, M7b/M7c and reviewed activation follow-ups. A placeholder is not evidence of usable distribution. Source and binary behavior, assets and complete source measurements remain unverified; no implementation or publication occurs in this design amendment.

Sources: [public package metadata](https://registry.npmjs.org/superman-ai), [trusted publishing](https://docs.npmjs.com/trusted-publishers/), [staged publishing](https://docs.npmjs.com/staged-publishing/).
