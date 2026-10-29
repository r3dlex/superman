# 11: Tag-triggered trusted npm release

**Milestone:** M11

**What to build:** When André pushes a `v*` tag, a release workflow builds, re-runs the gates on the tagged commit, checks the tag matches `package.json` `version`, scans the packed tarball and any Bun binaries with Trivy (G11, HIGH/CRITICAL fail) **(M1 amendment)**, and publishes `superman-ai` (CLI command `superman`) to npmjs.org through trusted publishing (OIDC, provenance, no `NPM_TOKEN`), as designed in §12.2. Optional Bun binaries for darwin-arm64, linux-x64 and linux-arm64 are attached with `SHA256SUMS`. After the first release, `npx superman-ai doctor` works.

**Blocked by:** 10

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** Spec-kind PR `spec/superman-v0-release`: adds `.github/workflows/release.yml` (the ticket PR ships the build/verify code and tests only).

- [ ] The workflow triggers only on `push` of `v*` tags; it has no `workflow_dispatch`, `pull_request` or `pull_request_target`.
- [ ] Top-level permissions are `contents: read`; only the publish job has `id-token: write`; only the binaries job has `contents: write`; every action is pinned by full SHA; `persist-credentials: false`.
- [ ] No npm token secret or `.npmrc` token is referenced anywhere in the repo (test greps the workflows).
- [ ] A version/tag mismatch fails before publish.
- [ ] **(M1 amendment)** The `npm pack` tarball and the Bun binaries are scanned with the pinned, sha256-checked Trivy before publish or upload. A HIGH or CRITICAL finding stops the release, and the exact tarball that was scanned is the one published.
- [ ] André's one-time npmjs.org steps (§12.2) are listed in the PR and confirmed done before the first tag.
- [ ] After André's first tag, `npx superman-ai doctor` runs from npm and the npm page shows provenance.
