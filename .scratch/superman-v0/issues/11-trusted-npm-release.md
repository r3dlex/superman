# 11: Tag-triggered trusted npm release

**Milestone:** M11

**What to build:** The first usable MIT-licensed v0 release after all M7b providers/cache/typechecks **and M7c tickets 27–32/activation** (M1 amendment 4). André's `v*` tag authorizes direct OIDC publication, not staged npm approval. Build/test/scan run uncached applicable gates with lifecycle-suppressed dependency installation in unprivileged jobs; separate publisher/upload jobs validate run/tag/SHA/digests and consume exact artifacts without project hooks or installs. Spec §12.2 defines release applicability and reviewed-main provenance.

**Blocked by:** 10, 24, 32, spec/superman-v0-dogfood-init, spec/superman-v0-gate-ci, spec/superman-v0-skills-pin, spec/superman-v0-overlay-catalog, spec/superman-v0-harness-catalogs, spec/superman-v0-remote-cache, spec/superman-v0-affected, spec/superman-v0-vault, spec/superman-v0-wiki-gate, spec/superman-v0-wiki-skills, spec/superman-v0-wiki-maintenance, spec/superman-v0-codegraph

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-release` adds the reviewed separate-job workflow, MIT LICENSE/package metadata and final required release settings. No publishing or account modification is part of implementing this ticket without André's tag/setup authorization.

- [ ] The workflow triggers only on `push` of `v*` tags; it has no `workflow_dispatch`, `pull_request` or `pull_request_target`.
- [ ] Only the separate publisher has `id-token: write`; only a separate upload job has `contents: write`. Install/build/test/scan jobs have neither; every action is SHA-pinned with checkout credential persistence disabled.
- [ ] No npm token secret or `.npmrc` token is referenced anywhere in the repo (test greps the workflows).
- [ ] A version/tag mismatch fails before publish.
- [ ] Incomplete v0/M7b/M7c activation (including blocking full-parser G12, wiki skills/nightly setup, context integration and own wiki), missing MIT source licensing, unknown npm authority or unreviewed-main provenance blocks the first usable release; the `0.0.0` placeholder does not satisfy it. Optional CodeGraph executable absence remains a warning, not a new runtime dependency.
- [ ] **(M1 amendment)** The `npm pack` tarball and the Bun binaries are scanned with the pinned, sha256-checked Trivy before publish or upload. A HIGH or CRITICAL finding stops the release, and the exact tarball that was scanned is the one published.
- [ ] André's one-time npmjs.org steps (§12.2) are listed in the PR and confirmed done before the first tag.
- [ ] After André's first tag, `npx superman-ai doctor` runs from npm and the npm page shows provenance.
- [ ] Artifact digest/run/tag substitution fails; privileged jobs publish/upload the verified bytes without rebuilding or running project/package hooks.

Start with a release fixture that substitutes a tarball from another run; verification must reject it before any privileged action.
