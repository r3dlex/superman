# 03: Agent identity preflight and identity-bound PR opening

**Milestone:** M4

**What to build:** Agent preflight under spec §9.3, refusing an approver or unverified identity and reporting environment/pin/hook problems without leaking credentials. Both modes share the forge identity interface (`token()`, `pushRemote()`, `prHead()`, `expectedAuthor()`); the spec is the single checklist rather than a second copied list here.

App mode verifies JWT-authenticated App/installation metadata, issued-token grants and paginated repository coverage; `GET /user` is only for supported user-token modes. The App key's identity does not prove an independently supplied token's identity. Implement `superman pr open <ticket> [--draft]` through that same identity/exec interface, with bot-bound push/PR creation and no approval/merge operation, so `ship` does not call a nonexistent command. The draft form supplies M7c's verified PR number before wiki-ingest; final review waits for completed knowledge/gates **(M1 amendment 4)**. Read-only approver `merge-ready` is a distinct allowed role (ADRs 0001, 0005).

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fake user-token `/user` response naming the approver fails; a valid App fixture uses `/app`, installation metadata and repository pages without attempting unsupported `/user` identification.
- [ ] Fixture tests cover App mode and machine-user mode, switched only by `identity.agent` in config.
- [ ] App mode mints a 1-hour installation token from `SUPERMAN_APP_KEY_PATH` without printing or writing the token (test asserts it never appears in stdout, stderr or the receipt).
- [ ] The key file check fails on mode wider than 600.
- [ ] Every failing condition prints one line; output stays within about 2 KB.
- [ ] **(M1 amendment)** `doctor` reports whether `trivy` is on PATH and its version. If it is missing, it prints an info line, `G11 runs in CI only`, and exits 0. A version different from the lock's `tools.trivy` fails. `TSRS_FAST` set in the environment fails with a one-line reason.
- [ ] A receipt of kind `doctor` is written.
- [ ] Wrong App/installation/token permissions, excess/missing repo coverage, wrong App ID/bot identity and an unverifiable independently supplied token each fail alone.
- [ ] Fake git/gh process fixtures prove `pr open` uses the selected agent remote/credentials, rejects a conflicting ticket PR/claim and never approves, merges or leaks credentials.
- [ ] **(M1 amendment 4)** `pr open --draft` returns the repository/PR identity without requesting human review early; the later completed head can be pushed to that same PR. CodeGraph-specific warning-only diagnostics land in ticket 31, not a new mandatory doctor dependency here.

Start with the fixture that makes `/user` unsupported for an otherwise valid installation token.
