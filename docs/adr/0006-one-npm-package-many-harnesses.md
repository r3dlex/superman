---
Status: accepted
---

# One npm package carries the CLI and the overlay plugin for every harness

superman must install as a plugin in Claude Code, OpenAI Codex and OpenCode, and ship as the npm package `superman-ai` (André, 2026-10-29). It was renamed from `@r3dlex/superman` on the same day because the unscoped `superman` and `superman-cli` names are taken and André owns no `@r3dlex` npm scope. The CLI command stays `superman`. We publish one package whose root is also the plugin root: the overlay skills live once under `skills/<name>/SKILL.md`, and each harness gets only a thin manifest that points at that directory (`.claude-plugin/plugin.json` for Claude Code, a Codex manifest for Codex, and OpenCode's `skills` path list or skill-directory discovery for OpenCode). The same tree is listed in the repo's own catalogs, so a git install and an npm install see identical files and the lock's sha256 values match both. npm releases use trusted publishing (OIDC, no `NPM_TOKEN`) with provenance, from a workflow triggered only by a `v*` tag that André pushes.

## Considered Options

- A separate package or repo per harness: rejected, it duplicates skill files and their hashes drift.
- Keeping the overlay under `plugin/` (the draft layout): workable for Claude Code and Codex's legacy manifest, but Codex's root `plugin.json` dialect hard-codes `./skills` (VERIFY), so a root `skills/` serves every format.
- An OpenCode JS plugin: rejected for v0, because the current plugin API is the `@opencode/plugin` runtime dependency (ADR 0003) and v0 has no hooks to register.
- A long-lived `NPM_TOKEN` secret: rejected, trusted publishing removes it.

## Consequences

- The per-harness manifest shapes are partly VERIFY (spec §12.1); ticket 10 proves each with a packed-tarball install.
- Public registry metadata checked on 2026-10-30 shows an MIT-licensed `superman-ai@0.0.0` placeholder published on 2026-10-29 and pointing at this repository. This proves existence, not André's account access; verify that access and configure trusted publishing before the first usable release.
- `files` in `package.json` is an allowlist; the overlay skill files, manifests, `dist/` and `schema/` ship, while `.scratch/`, `.archgate/`, tests and CI do not.
- André chose MIT and direct OIDC publication on his release tag on 2026-10-30. Staged publication plus a second npm approval was considered and declined; the tag is the final human release authorization.
- Build/test/scan jobs have no publishing or cache-write authority. A separate publisher consumes the exact scanned tarball without project install/build/publish hooks; optional release-asset uploads are likewise separate. This keeps dependency hooks and tests away from credentials and OIDC publishing authority (spec §12.2).
- The first usable v0 release waits for every v0 ticket, including M7b's complete provider/cache work and its reviewed activation follow-ups. A placeholder is not evidence that the usable CLI is shipped.

Sources: [public package metadata](https://registry.npmjs.org/superman-ai), [trusted publishing](https://docs.npmjs.com/trusted-publishers/), [staged publishing](https://docs.npmjs.com/staged-publishing/).
