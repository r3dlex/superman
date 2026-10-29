# 03: `superman doctor` refuses approver identities

**Milestone:** M4

**What to build:** An agent runs `superman doctor` before any work and it exits 1 with one reason per problem when the session could act as André or is misconfigured: the active `gh` identity or `GH_TOKEN`/`GITHUB_TOKEN` resolves to an approver, the approver appears in `gh auth status` for the active `GH_CONFIG_DIR`, the push remote does not match the identity mode, App-mode installation permissions or repos differ from the expected set or the key file is group/world-readable, machine-user mode collaborator permission is not `read`, `ARCHGATE_TELEMETRY` is not `0`, tool versions differ from the lock, lock hashes do not match files on disk, or the hooks path is unset (§5.2, §9.3). Both identity modes go through one forge identity interface (`token()`, `pushRemote()`, `prHead()`, `expectedAuthor()`).

**Blocked by:** 02

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] With a fake `gh` reporting `br4vesirrobin`, `superman doctor` exits 1 and names the approver identity; with the App identity it exits 0.
- [ ] Fixture tests cover App mode and machine-user mode, switched only by `identity.agent` in config.
- [ ] App mode mints a 1-hour installation token from `SUPERMAN_APP_KEY_PATH` without printing or writing the token (test asserts it never appears in stdout, stderr or the receipt).
- [ ] The key file check fails on mode wider than 600.
- [ ] Every failing condition prints one line; output stays within about 2 KB.
- [ ] A receipt of kind `doctor` is written.
