# PR #1 review corrections — 2026-10-31

Scope: the six findings against committed head `75f86a06c78e83a22e66eff7ab956df2520ee872`, plus the bounded corrective rechecks. No product ticket, pin, dependency, coverage floor or activation changed. Existing uncommitted specification/ticket/glossary amendments were not used or edited.

## Observed red → green

Every row uses an approved spec §16 process seam in owned temporary repositories. The same test argv exited **1 before enforcement and 0 afterward**; real compiler/Vitest/Archgate and complete-coverage positive controls remain passing. There are no private-helper tests or skipped regressions.

Command shape: `node --test --test-name-pattern '<pattern>' <suite>`.

| Cycle | Pattern | Suite under `.superman/ci/` |
|---|---|---|
| 01 | `ticket PRs cannot add, replace or remove package-level Knip policy` | `pr-policy.test.ts` |
| 02 | `indirect policy loaders require reviewed input modeling` | `pr-policy.test.ts` |
| 03 | `prototype property names cannot add a sixth overlay skill` | `archgate-policy.test.ts` |
| 04 | `all JavaScript line terminators preserve static policy import protection` | `pr-policy.test.ts` |
| 05 | `package-based compiler policy needs reviewed resolution` | `pr-policy.test.ts` |
| 06 | `coverage rejects an unmodeled extensionless Node program` | `coverage.test.ts` |
| 07 | `reviewed pinned Vitest config helper remains supported` | `pr-policy.test.ts` |
| 08 | `computed and escaped policy-loader capabilities fail closed` | `pr-policy.test.ts` |
| 09 | `coverage never drops unmodeled Node programs without shebangs` | `coverage.test.ts` |
| 10 | `coverage cannot hide observed runtime behind a preserved symlink identity` | `coverage.test.ts` |

Sanitized command records, complete logs and their SHA-256 values are under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-fixes-90mv6eej/`; `tdd-cycles.json` binds each identical-argv pair. `10-observed-alias-red` was a generated-fixture quoting error, not behavior-red evidence; `10-observed-alias-red-valid` independently reproduced the false 100% result before enforcement changed.

## Corrective review and limits

Independent Standards and Spec rechecks report no remaining findings within these corrections. The initial blanket package rejection broke the existing Vitest profile: its full run was **354/370**, not a pass. The next snapshot passed **376/376**, but still allowed a preserved-symlink coverage bypass. Neither result certifies the final alias correction.

Package-based policy resolution remains unsupported except for the root `vitest/config` helper bound to the existing exact Vitest pins, reviewed lock bytes and absence of a workspace. Other package references, ambient/reflection/computed loader profiles and escaped identifiers fail closed; this is not a general JavaScript or package resolver. Coverage rejects unmodeled extensionless/executable/shebang inputs and unknown observed owned script identities before filtering, including preserved symlinks.

Final runtime/test verification is bound to disposable commit `cc793d2dd4d1466261916e950d50d9337f05ec76`, tree `592bd77a0e1e6ac5b55828d46619ea596460495a`, not a working-branch commit. Its six changed code/test files are byte-identical to the applied corrections. This results document is subsequent supporting evidence, not measured runtime code or a forge receipt.

## Final local verification

On macOS arm64 / Node **26.5.0**, `node .superman/ci/coverage.ts --mode incremental` passes **377/377 tests, zero failures/skips**, measuring all **17 runtime sources**. It records actual full uncached execution, zero reused files, the inactive-ledger fallback and `mergeAuthority: none`. The source manifest and disposable checkout remain unchanged.

| Metric | Covered / total | Percentage |
|---|---|---|
| Lines | 1450 / 1508 | 96.15% |
| Statements | 1623 / 1702 | 95.35% |
| Branches | 1578 / 1699 | 92.87% |
| Functions | 191 / 199 | 95.97% |

Strict tsrs, matching reference tsc, full Biome, knip and diff whitespace checks pass. Knip's six configuration hints are advisory, not ignored issues. Independent final Standards and Spec process rechecks pass within the reviewed corrections. All 17 pre-existing local amendment files retain identical bytes; no changes were staged.

`final-verification.json` and `application-preservation.json` in the evidence directory bind the measurements and applied files. Coverage receipt SHA-256: `ee4c05a31a1ff047e08d0a77d1d1aff517e880e0e0baa86e52e5cbefa9a65595`; exact-command TDD record SHA-256: `ebdc4938dd75bad7ad332fd068afbb0fe2c04811bb84f75ebe15bab21eabae11`.

The local raw receipt passes G1/G2/G3/G4/G10 with input integrity passing and `mergeAuthority: none`. G5/G6 have no product source, G7 is inactive, G8/G9 are spec-kind, and G11 belongs to the required Linux-x64 leg. Local success does not establish fresh hosted H/B/M evidence, the arm64 source/build/redistribution dossier, human approval or merge readiness. No credential material, hosted setting, publication, approval, merge, working-branch commit or push was part of these corrections.
