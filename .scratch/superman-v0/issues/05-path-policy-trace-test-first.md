# 05: Path policy, traceability and test-first gates

**Milestone:** M6

**What to build:** `superman gate pre-pr` and `superman gate ci` decide the PR kind from the branch and enforce G4 (paths per kind, §5.4 and §17), G8 (ticket file and spec exist on base) and G9 (`Kind:` parsed from the ticket on base; behaviour tickets need a red test-only commit that fails on an assertion or missing symbol before the first source commit and passes at head; refactor tickets stay green at every commit). This replaces the M1 bootstrap path policy and the raw G9 script with tested superman code.

**Blocked by:** 04

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None (CI switches to superman in ticket 06's follow-up).

- [ ] Fixture repos for spec, ticket and chore branches: each kind's allowed and forbidden paths produce pass/fail as in §5.4 and §17.
- [ ] A ticket PR that lowers a `superman.ratchet.json` value, adds or removes a key, or edits its ticket beyond the `Status:` line fails.
- [ ] A ticket PR with fix-before-test fails, one with test-first passes, and a `Kind: refactor` PR with a red step fails.
- [ ] A red commit failing on a syntax error in the test file is classified as broken, not red (classification VERIFY resolved and noted in the PR).
- [ ] The receipt carries `testFirst: { redSha, tests[], redOutcome, greenOutcome }` and `prKind`.
- [ ] A branch matching no known kind fails G4 with one line.
