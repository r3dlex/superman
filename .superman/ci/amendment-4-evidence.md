# M1 amendment 4 — local policy evidence

Date: 2026-10-30. Scope: the approved reconciliation plus M7c/Lefthook specification and current bootstrap policy/rules. This is not G12 implementation, full bootstrap readiness, hosted CI evidence or merge authorization.

## Tool identity

- Node `26.5.0`; lifecycle-suppressed frozen installation used `pnpm@12.16.1` and the unchanged lockfile.
- The local npm package is `archgate@0.61.0`, but its shim reuses an existing shared **0.43.0** binary. That binary rejects `--strict`; it was not used as passing gate evidence or overwritten.
- Verification instead used the official **0.61.0 darwin-arm64** release in an owned temporary directory. Archive sha256: `44c645602313bc6be7ef99ebc34c5e08f3169695b631bd9ab09bda0d3b699cf3`, matched to its release `.sha256`; `--version` returned `0.61.0`. Set `ARCHGATE_BIN` to that independently verified binary for rule fixtures. The tests reject a stale shim version rather than weakening the command.

## Red → green

Each new executable behavior was tested through the user-approved process seam before its implementation. Representative observed red outcomes:

| Boundary | Red outcome | Green behavior |
|---|---|---|
| Ticket candidate writes | Protected-path rejection | Regular Markdown candidates allowed; vault policy/raw remain protected |
| Wiki maintenance | Unknown branch kind | Knowledge-only chore accepted; code/policy/raw/locks/tracker edits rejected |
| Knowledge ticket | Unknown Kind | Base-declared knowledge kind accepted only for wiki/candidates/own Status; G9 explicitly inapplicable |
| Required log on spec/skills PR | Path rejected | Log path permitted without implementing future G12 semantics |
| Lefthook/config/lifecycle protection | Unreviewed policy changes passed | Discovery/local configs, provisioning controls, pins, lock and MCP config changes require Gate 1 |
| Filename/path integrity | Newline raw filename and wiki symlink passed | NUL-safe matching and committed-tree regular-file checks block bypasses |
| SUP-004 | New skill names and 470-line total rejected | Five names and 150/80/60/100/80 limits accepted; excess/unknown name/missing flag rejected |
| SUP-009 | Secret/personal-data fixtures passed | Credential/structured personal-data patterns fail without echoing matched values; non-sensitive contents pass |
| Review: fixture isolation | Inherited Git overrides committed an owned external fixture's pending file | Shared fixture environment removes all Git overrides; child process test preserves external HEAD/status/refs |
| Review: scanner cost | A 512-KiB permitted raw line exceeded a 5-second process timeout | Bounded/linear-pattern scans handle that line and a punctuation-heavy 256-KiB line in about 0.55 seconds combined locally |

Fixtures use temporary real Git repositories and the real pinned Archgate process, not private-helper mocks. Existing changed-file rule behavior was also checked against an unchanged oversized skill; no unnecessary engine replacement was made. Pattern checks are not general privacy proof.

## Verification commands

```text
npm exec --yes --ignore-scripts --package=pnpm@12.16.1 -- pnpm install --frozen-lockfile --ignore-scripts
node --test .superman/ci/pr-policy.test.ts
ARCHGATE_BIN=<verified-0.61.0-binary> node --test .superman/ci/archgate-policy.test.ts
ARCHGATE_TELEMETRY=0 <verified-0.61.0-binary> check --strict
git diff --check
```

The process suites pass **16 path-policy tests and 9 rule tests**. Strict Archgate and whitespace checks pass. Both suites are wired into the bootstrap CI; lifecycle scripts are suppressed there too. The policy reads committed HEAD, not a dirty tree: prospective-tree validation uses a separate temporary repository with this exact candidate content against the real local main, without staging/committing the working branch. Re-run on the actual commit before pushing; a pass on the old HEAD alone would not verify these changes.

Document checks pass: 32 tickets, stories 1–59, questions 1–36, acyclic dependencies and release closure containing 01–24/27–32 but not post-v0 25–26; JSON/JSONC examples, balanced fences, local README links/anchors and all Archgate Source links. All 17 immutable source-file citations in the new/updated integration ADRs returned 200. Runtime dependency fields remain empty; no tracked/prospective `.sh` or `.py` file is present.

## Remaining limits

G12/parsers, vault/wiki contents, overlay implementations, hook/MCP installation and nightly scheduling remain ticket work. Three-platform product gates, Archgate linux-arm64 self-build and the other §17 prerequisites remain blocked. Public-source inspection is not CodeGraph/Lefthook platform-runtime evidence. Hosted CI requires its own run evidence.

## Publication authority

No App/bot credential context was available. André explicitly authorized his existing active `br4vesirrobin` login for this amendment's commit/push/PR-body publication only. This is human-authenticated bootstrap publication, not evidence that bot preflight passed or permission for approvals, merges, force pushes or future agent operations under an approver identity. Preserve agent author attribution, record the human committer/pusher honestly and recheck the actual active login/remote head before writing. The product identity contract and blocked Gate 1 readiness remain unchanged.
