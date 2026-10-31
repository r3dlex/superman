# Gate 1 bootstrap — implementation and evidence

Scope: spec §17 steps 1–2 on `spec/superman-v0`. Ticket 01, product `src/`, approvals, merges and publication are not authorized. Subsequent narrow authorizations for App verification, installation-scope correction and main's required-check/strictness update are recorded below; they are not blanket hosted-setting or commit/push authority. This record does not grant readiness.

**Pre-coverage outcome:** the review-corrected local bootstrap profile passed **186/186 process tests and all eight local stages on macOS-arm64**. The later coverage amendment has separate [current evidence](coverage-evidence.md); this historical result does not certify those changes. Earlier init-supervised native Linux-arm64 results cover their recorded older source snapshot, not these corrections. The App key, permissions, selected Superman-only installation scope, main's exact required-check/App bindings and strict freshness were freshly reverified on 2026-10-31. Gate 1 is **not ready**: reviewed arm64 redistribution/publication, fresh hosted three-platform evidence and applicable undersized-corpus support remain blocked. Unsupported input profiles fail closed; the role-based tag limitation stays explicit.

## Initial gap assessment (2026-10-30)

| Requirement | Initial state | Work / evidence needed |
|---|---|---|
| Exact compiler/test/quality tool pins and effective configs | Only `archgate@0.61.0` present; PATH pnpm is 9.15.9, required pin is 12.16.1 | Lifecycle-suppressed pinned installation; strict configs and real tool checks |
| G4 protected inputs/fields | Interim static path list; only Lefthook/lifecycle package fields checked | Config/input closure, compiler/test/quality patterns, gate-tool fields and alias/rename fixtures |
| SUP-005 | Adopted in ADR 0004/0009, no executable rule | Effective-directive negative fixtures and inert-string positive fixtures through pinned Archgate |
| Raw G1–G11 | Two CI jobs; G9 placeholder | Protected direct-tool routing and red–green replay with assertion vs infrastructure failure classification |
| Three-platform proof | Existing workflow runs Ubuntu x64 only | macOS arm64 / Linux x64 / Linux arm64 execution; reviewed arm64 Archgate build and digest |
| Live App/protection prerequisites | Historical claims are not current evidence | Read-only endpoint evidence for identity/scope, strict main rules, required check producers and human-only tags |

No `attempts:N` labels, repeated-failure comments or reviews were present on PR #1 at intake. The prior amendments describe different work, not three failed attempts at this bootstrap.

## Approved test boundaries

- Existing §16 seams: execute `pr-policy.ts` in real temporary Git repositories; execute the pinned Archgate process against temporary rule fixtures.
- The user explicitly approved adding `node .superman/ci/raw-gates.ts` as a bootstrap-only process seam in this session. Tests observe exit codes, diagnostics and receipts; this seam does not prove live permissions or remote platform execution.
- Add one failing behavior test, observe red, implement its minimal enforcement, verify green, then continue. No red commits or hook bypasses.

## Work ledger

- [x] Exact pins and compiler/test/quality configurations (local; hosted execution still required)
- [x] Protected-input and protected-field enforcement with process fixtures
- [x] SUP-005 corrections and independent rechecks (33/33 final rule fixtures)
- [x] Raw gate routing and G9 replay/classification fixtures within the documented bootstrap profile
- [x] Full macOS-arm64 and init-supervised native Linux-arm64 verification; earlier failures retained
- [x] Hosted prerequisite assessment, narrowly authorized App/key/installation verification and main protection setup; remaining publication/hosted-run blockers recorded below
- [x] Final local evidence and explicit remaining blockers (not completion of hosted/platform readiness)

## Verification and remaining blockers

Implementation and execution results will be recorded here as they are observed. Unknown, unavailable and not-applicable outcomes are not passes. First-source baselines belong to ticket 01 and its reviewed follow-up; they are not fabricated here.

### G4 red → green

Each command below initially exited 1 because the new process test exposed the recorded behavior, then exited 0 after its enforcement change. Commands use `node --test --test-name-pattern '<pattern>' .superman/ci/pr-policy.test.ts`.

| Pattern | Observed red | Verified green |
|---|---|---|
| `primary compiler pin` | Changed tsrs pin passed | Added/replaced compiler/tool pins require Gate 1 |
| `compiler and quality configs` | Root tsconfig passed | Root/nested compiler and quality settings protected |
| `arbitrary referenced file` | Transitive shared compiler settings passed | Local config-input closure protected at base and candidate |
| `policy input exception` | Referenced wiki policy remained writable | Knowledge carve-out cannot evade effective-policy protection |
| `configured JSON pointers` | Protected escaped-key deletion and field addition passed | JSON pointers detect additions/removals/changes |
| `case-colliding committed` | Case-colliding Git tree passed | Case/Unicode-normalized identities checked independently of host filesystem |
| `package overrides` | Tool overrides passed with declared pins unchanged | Override/resolution and tool-provisioning fields protected |
| `policy evaluates event head` | Checkout integration M substituted for event head H | Explicit event H/B used for policy decisions |
| `reviewed bootstrap policy-input` | Nonstandard declared input remained writable | Reviewed inventory participates in policy closure |
| `comments after trailing` | Valid JSONC policy rejected | Comment/string-aware parsing accepts trailing commas after comments |
| `wiki maintenance cannot weaken` | Wiki chore could weaken referenced policy | Governing policy cannot live in writable knowledge roots |
| `multiline and literal dynamic` | Non-single-line config inputs remained writable | Multiline/static-literal import closure protected |
| `protected JSON fields cannot` | JSON-looking symlink text spoofed protected JSON | Registered partial-policy files require regular Git modes |
| `effective Git ignore policy` | Ticket could hide quality inputs through `.gitignore` | Root/nested ignore policy requires Gate 1 |
| `workflow.s event commit identities` | Real workflow SHAs leaked into temporary repos | Fixture environments remove inherited forge/credential identities |
| `reclassify product src` | Candidate inventory could authorize product source in a spec PR | Independent spec-kind `src/` prohibition |
| `metadata stops being unrelated` | Imported package policy bypassed full-path protection | Effective policy classification precedes partial package-field permissions |
| `package-local import aliases` | Local `#imports` looked like frozen dependencies | Unmodeled local/self aliases fail closed |
| `JSON-looking symlink manifest` | Built-in package fields trusted link text instead of regular file mode | Package policy cannot be a symlink |
| `pnpm provisioning hooks` | Default pnpmfile helpers remained ticket-writable | Default hook roots and static helper closure protected |
| `multiple static imports on one` | Only first same-line import protected | All semicolon-separated static imports participate |

Additional process fixtures cover executable static imports, JSONC extends, policy symlinks, and fail-closed unmodeled dynamic/hook-remote inputs. The bootstrap intentionally does not claim a general JavaScript/TOML/YAML resolver: unknown effective inputs block and need reviewed modeling at activation.

Final scoped macOS process run with deliberately foreign `HEAD_SHA`, `BASE_SHA` and `GITHUB_ACTIONS=true`: **40/40 passed**. Independent review lanes found five standards issues and four intent issues (one overlapping alias case); all original findings were reproduced, fixed with process regressions and independently rechecked. Standards and intent rechecks both report their original findings resolved; neither reviewed G9/raw routing or grants bootstrap readiness.

### SUP-005

[SUP005-tdd.md](SUP005-tdd.md) owns the initial 17 observed red→green cycles, source grammar/engine findings and limits. The earlier main-session rerun of `ARCHGATE_BIN=<verified 0.61.0 binary> node --test .superman/ci/archgate-policy.test.ts`: **27/27 passed**, no skips. Those fixtures accepted inert examples, rejected their tested directive forms and demonstrated SUP-005 self-suppression rejection. New source forms require reviewed fixtures before coverage is claimed.

Subsequent independent reviews reproduced three gaps not covered by those 27 tests: Archgate consumes full-line suppression text inside template literals; JSX apostrophes can hide later effective Biome comments (and inert JSX text can be misclassified); and anchored quoted YAML examples can be incorrectly rejected as comments. Six new process fixtures and separate red→green corrections close these cases. Both review lanes independently reran their original reproductions and report them resolved. The final suite passes **33/33**; ambiguous JSX fails closed, not as claimed general parser support. Earlier platform runs remain historical evidence for their recorded source hashes.

### Tool provisioning

Exact-pinned dev tools were installed with `npm exec --yes --ignore-scripts --package=pnpm@12.16.1 -- pnpm install --ignore-scripts`; runtime dependencies remain empty. The initial latest knip version caused pnpm to generate a release-age exception. That agent-created exception was removed, and `knip@6.43.0` (published 2026-10-24) selected instead; no release-age exemption is retained. `.npmrc` also disables lifecycle scripts.

After review exposed pnpmfile execution despite `--ignore-scripts`, `.npmrc` additionally disables pnpmfiles and CI checks G4/traceability **before** installation. Verified frozen reinstall with pinned pnpm and both `--ignore-scripts --ignore-pnpmfile` exits 0. The outer npm launcher warns that the pnpm-specific `.npmrc` option is not an npm option; pnpm accepts it. No global package-manager configuration was changed.

Local macOS-arm64 `tsrs --noEmit` and matching TypeScript `tsc --noEmit` both exited 0 with the strict reviewed config. This is local evidence, not the required hosted three-platform proof.

Executed tool identities on macOS arm64 / Node 26.5.0: tsrs `0.20.1-ts7.1.0-beta` (TypeScript `7.1.0-beta`, upstream `3e9236361fa9`), tsc `7.1.0-beta`, Biome `2.6.4`, Vitest `5.0.5`, knip `6.43.0`, jscpd `5.4.2`, Stryker `10.1.1`. The compiler process comparison also ran a valid fixture (both exit 0) and `export const value: string = 1` (both exit 2 with identical TS2322 diagnostics).

### Real quality-tool compatibility fixture

Owned temporary fixture: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-quality-proof-WYDWBj`. This is external test data, not ticket 01 or repository `src/`.

Pinned Vitest executed a real passing test. Default Stryker sandbox preprocessing then failed with `TypeError: ts.parseConfigFileTextToJson is not a function`: TypeScript 7's native package does not provide the legacy JS config-rewrite API. No pin was changed or mutation gate disabled. A one-variable probe used Stryker's documented `--inPlace` **only in that disposable fixture**; Vitest ran all seven mutants, all seven were killed, and original fixture source bytes were verified restored. G6 may use this mode only inside owned snapshots, never the caller checkout. Root Stryker configuration retains the safe sandbox default. [Upstream option](https://stryker-mutator.io/docs/stryker-js/configuration/#inplace-boolean).

Pinned jscpd analyzed an actual repeated-source fixture and emitted `jscpd-report.json` with one exact clone / 103 duplicated tokens / 50.0 percent duplication. The mutation report uses schema `1.0`, seven `Killed` statuses and zero survivors/errors. These prove tool execution/report shape, **not** Superman repository baseline values; first-source measurements remain ticket 01 work.

The newly added `mutation: stryker run` convenience script was removed: it would advertise the known-broken default TypeScript-7 preprocessing path. G6 uses the protected driver and owned snapshots instead; no `--inPlace` command is advertised for the caller checkout.

### Raw routing and replay

Raw routing process seam: `node .superman/ci/raw-gates.ts [--gate G1…G11] [--base origin/main] [--receipt <safe-output.json>]`. No selector means every G1–G11 outcome is recorded. A selected-gate receipt declares only that scope and carries `mergeAuthority: "none"`; neither a local pass nor an `n/a` is merge admission.

The final routing suite passes **19/19** on macOS arm64. Observed red→green process cycles cover real compiler/Vitest execution, Biome and knip rejection, protected-policy preflight, strict pinned Archgate suppression failure, inactive G7 applicability, Trivy scanner argument/failure propagation, default all-gate accounting, postflight input changes, reference compiler pin binding, safe receipt publication, worktree metadata protection and standalone G9 preflight. A final red→green correction records spec/chore G8 ticket traceability as `n/a`, while still executing policy preflight.

- Every selector, including standalone G9, executes shared G4/G8 preflight before tools. A real Vitest config-helper-only red/green fixture initially passed G9; it now fails G4 before replay, with no product change falsely credited.
- Real tests that write tracked inputs cannot produce passing snapshot evidence. Caller changes are preserved, not reverted. A postflight Git-error fixture initially retained a passing verdict; all exception paths now set `verdict: "fail"`.
- A tool-created receipt symlink initially overwrote tracked inputs after the integrity check. Publication now revalidates the output, writes an exclusive owned temporary file, fsyncs and atomically renames. Worktree `.git` markers/common metadata are protected; resolved per-worktree receipt namespaces have positive controls.
- Independent raw-router standards and intent reviews reproduced these issues, then rechecked every original finding as resolved. Quality measurements and snapshot-helper extraction were excluded from those reviews and require their own review.
- G9's updated implementation passes **38/38** real/fake-tool process fixtures after mandatory preflight: real Vitest red-on-base/green-on-candidate assertion replay; compiler-corroborated TS2305 missing exports; syntax/config/setup/tool/no-test/ambiguous-report rejection; report/completion identity and count binding; H/B/M validation; timeout-child cleanup; caller-index preservation. Knowledge content is a positive `n/a` control; illegal Kind reclassification is a negative control. These cases also passed in the final combined run.
- **Explicit bootstrap limits:** active skill/catalog verification and refactor full-suite-at-every-commit verification are not implemented. Inactive project skills are `G7: n/a`; unverifiable active registration and refactor tickets block. These are not waivers or completed capabilities.

### G5/G6 implementation handoff

The initial quality handoff reported **41/41 quality tests** and **38/38 G9 tests** passing through the approved raw-driver process seam. After independent review corrections, the final quality suite passes **47/47**. Strict tsrs, reference tsc and knip also pass; knip prints five non-blocking missing-source/redundant-entry hints, not issues.

- G5 runs pinned jscpd against the full tracked TypeScript corpus, explicitly disabling Git-ignore filtering and raising its file-size cutoff to include the largest selected source. A real duplicate-code regression of **50% > 0%** is rejected.
- G6 runs pinned Stryker/Vitest only inside owned disposable snapshots, with `--inPlace --force` and explicit scopes. A real changed-existing mutation regression of **100% → 85.714%** is rejected even when the candidate still exceeds the unrelated global floor. New files are measured separately; survivors and no-coverage mutants remain visible.
- No source produces explicit `n/a`, without invented metrics. First source records measured initialization and `evidence.qualityInputsHash`, not an invented baseline comparison. Existing-source work without a reviewed baseline on base blocks; no baseline was created in this repository.
- Tool/config/scope identities and exact declared/installed/executable pins are bound. Unlisted/dynamic policy inputs, ambiguous delete/add relocation, unsupported report schemas, zero mutants and incomplete/error mutation outcomes block. A proposed whole-repo tightening is accepted only after the actual measurement supports it.
- Red→green corrections include first-source measurement, malformed reports, omitted large source, unlisted policy inputs, rename-based scope substitution and unmeasured tightening. Additional corruption regressions run the real tool before altering its output. Owned-snapshot/index/credential fixtures preserve caller work and keep project tests away from caller credentials.
- The shared owned-snapshot/process helpers are reused by G9 and quality checks. Reporter materialization no longer appears as an unused default export to knip; no suppression or broad ignore was added. Tool runs are bounded at 120 seconds; quality version probes at 10 seconds.

Independent standards review found a source-level waiver not covered by that initial suite: jscpd `ignore-start/end` comments changed a real duplication regression into 0% with an unchanged policy hash. New process test `G5 rejects source-level…` first failed with `G5: pass`, then passed after the driver rejected effective exclusion ranges. The guard follows pinned jscpd v5.4.2 commit `db415b5d7cc34d72a324fe5eae2147646dc3558b`, `rust/crates/cpd-tokenizer/src/javascript.rs::find_ignore_ranges`: that tool scans raw slash comments even inside literal text. It is not a general JavaScript parser. Plain quoted marker names remain permitted; effective line/block ranges reject. Independent replay of the original 32.73% → 0% bypass now blocks without publishing the false 0% measurement.

Intent review added three reproduced gaps, each fixed with an observed failing-then-passing process test: retained baselines were forgotten after an empty source base; real 1-of-2 scans were accepted as full corpus; and aliased filesystem reads left dynamic policy data unmodeled. G5 now enforces the retained baseline, G6 blocks ambiguous empty-base reinitialization, incomplete source counts block, and shared G4 preflight rejects filesystem-loading policy imports including aliases. A matching G4 red→green fixture expands the policy suite to **41/41**. Both review lanes rechecked these bounded corrections without remaining findings in scope.

**Profile limits:** jscpd can omit files below its reviewed `minTokens` cutoff. Such a partial or undersized corpus now blocks instead of claiming full-corpus measurement; adopting that scope requires reviewed policy modeling, not lowering a threshold inside a ticket. Dynamic filesystem policy loading, ambiguous relocation and retained mutation scope reinitialization likewise require reviewed modeling. No generic resolver or unsupported measurement is claimed.

### Fresh local security scan

Trivy `0.76.1` macOS-arm64 archive bytes matched sha256 `11a9b6cd2752011b54f01ea4bd0dbfa9f0c41dc6538d5a3f9d23955f471bf4e5` from the upstream checksums. Executed `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --include-dev-deps --exit-code 1 .` with an owned temporary DB cache and JSON output, with no ignore/config file. Exit 0; HIGH/CRITICAL findings 0; the pnpm lockfile was analyzed. Report timestamp `2026-10-30T14:24:11.339637+01:00`, sha256 `f637fd4617f546cd749a250e625bf72c9b4fb80e92d0acdba1b3b0f630774d85`.

Report: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-trivy-Xkz2WM/scan.json`. This scanned the then-current working tree, not a future commit, and does not replace the required Linux-x64 CI scan or final-tree verification.

### Local Linux-arm64 Archgate self-build candidate

**Unapproved and unpublished.** Source commit `f65d99f56d02757cca94d53f6d717333770e0170`; all 698 files matched their exact upstream Git blobs. Source archive sha256 `1b37c9df6a6006d7fd7727d3bc89de73dacc2ded2f45a6e0c03b3fca17dcc08b`; upstream lockfile sha256 `f481e47bebbe90a079421dc47bed7d8850924481221a7a08b662c2eeeed5d019`.

Disposable Linux-arm64 build used Bun `1.4.3` image digest `sha256:bf9d5b1f01be2de7cec5aa6e3977e8848f7ab9a307c6c3a8af7a50a27e609023` and lifecycle-suppressed frozen installation. Official upstream tests: **2,949 passed / 38 upstream skips / 0 failed**. Full `bun run validate` passed without changing upstream source/assertions; release-style compilation produced ELF64 AArch64 version `0.61.0`. Compiled strict smoke exited clean 0 → planted violation 1 → restored 0. Final offline validation: 2026-10-30 13:25–13:26 UTC, Node 24.22.2 / Git 2.39.5 (upstream validation environment, not the Superman Node-26 gate environment).

| Candidate | SHA-256 |
|---|---|
| `archgate-linux-arm64` | `637d4179f66081a392995ea8b12c151372d77c504e451840e08a975ca398fef0` |
| `archgate-linux-arm64.tar.gz` | `80c87fa1f44438ea3b004acaf1aadfdfd306bd2595640b4664cefef882c473e3` |

Artifacts, commands, initial setup failures and log hashes are under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/archgate-061-arm64-unit.5lhUEc/` (`evidence-summary.json`, `evidence-files-sha256.json`, `verified-git-output/`). Containers were removed; no home/credential/SSH-agent/Docker-socket mounts or hosted writes were used. A 13:17:39 partial Superman snapshot had 18 passed / 1 failed rule test; that historical snapshot is not final-tree proof and requires rerunning the current tree. Human review, release publication and registered URL/checksum remain outstanding; no local pathname is installed as a substitute release asset.

### Stable policy/rule platform snapshot

The later stable snapshot ran unchanged G4/SUP-005 process suites with Node **26.13.0**, Git **2.39.5** and Archgate **0.61.0**, networking disabled and no home/credential/socket mounts. Disposable containers were removed.

| Platform | G4 policy | Archgate policy/rules | Evidence classification |
|---|---|---|---|
| Native Linux-arm64 | 40/40 passed | 27/27 passed | Local native selected-source proof, using the unapproved self-build candidate |
| Emulated Linux-x64 | 40/40 passed | 4 passed / 23 timed out | Every failure was `spawnSync /workspace/archgate ETIMEDOUT` at unchanged five-second deadlines; not a passing platform run |

Evidence directory: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/stable-g4-sup005-platforms.9iiuMs/` (`summary.json`, `source-manifest.json`, `failure-classification.json`, and both platform logs). Source-manifest sha256 `fa1ad8ecc08d83454bcccd219a242c2799a126fd2b422de66ef4a48da70df653`. No timeout was relaxed and no duplicate rerun was used to erase the failures. Raw routing/quality/replay was outside this snapshot. Native hosted Linux-x64 and final-tree three-platform execution remain required.

A separate native-arm64 toolchain is prepared for the final frozen-source rerun: local image `sha256:44fbd43f7685ab5e7088a1ff6e141105bc9403455bcc8e12c97849848d90c7df`, based on pinned Node 26.13.0, with lifecycle/pnpmfile-suppressed frozen dependencies and independently rechecked candidate Archgate bytes. Offline version probes match all exact pins. Preparation evidence is under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/final-arm64-toolchain-prep.uULD2x/`. Preparation copied only package/lock/npmrc inputs, not active sources; it is not gate-readiness evidence. The launcher explicitly invokes pnpm's `bin/pnpm.mjs`, which has a shebang; the earlier `ENOEXEC` concerned the separate native-frontend placeholder, not that `.mjs` file.

### Read-only hosted snapshot (2026-10-30, 13:07–13:09 UTC)

- [PR #1](https://github.com/r3dlex/superman/pull/1) remains open without approvals. Observed H `e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`, B `e9b7551fff4835a53dd716936e68ead7053502f1`, M `4ba924adc7694756ad3c11a7e20df54c8bb23e32`; the Git commit API confirms M's B/H parents.
- [Main ruleset 26119791](https://github.com/r3dlex/superman/rules/26119791) is active with no bypass, one approval, stale-review dismissal, last-push approval, resolved threads and squash/linear history. **Missing:** required status-check/workflow identities, expected App bindings and strict up-to-date enforcement. Classic branch-protection GET returns 404; this does not negate the active ruleset.
- [Tag ruleset 26121851](https://github.com/r3dlex/superman/rules/26121851) restricts all tag creation/update/deletion; its only bypass is repository-admin role ID 5. Current collaborators list only `br4vesirrobin` as admin. The App is excluded; exclusivity is role-based, not a person-specific allowlist.
- Actions defaults are read-only and cannot approve PR reviews. No release workflow exists yet, as expected before ticket 11.
- Supported metadata GETs identify App **5526100**, slug `r3dlex-superman-bot`, owner `r3dlex`, and selected-repository installation **176536987**, unsuspended. Registration/installation grants match ADR 0005. **Unverified:** exact selected repository set, key identity and active installation-token permissions/coverage. No Superman credential references were available, no key was opened, and no token was minted. Public metadata is not credential proof.
- [Run 41041604696, attempt 1](https://github.com/r3dlex/superman/actions/runs/41041604696), workflow ID **400619200** (`ci`, `.github/workflows/ci.yml`), passed the two old checks on Linux/x64 only. Producer is `github-actions`, App ID **15368**; jobs **124015500961** and **124015500551** checked out M. Check-run metadata is attached to H, not M; there are no uploaded receipts/artifacts. Four historical successful runs do not supply macOS/arm64 or Linux/arm64 proof.
- Upstream Archgate v0.61.0 resolves to `f65d99f56d02757cca94d53f6d717333770e0170`; its release and build matrix have no Linux-arm64 asset. `tool-assets.json` leaves that asset absent and CI deliberately fails closed until a reviewed, human-authorized release URL/checksum is registered. A local candidate build is not publication approval.

Read-only endpoints: `GET /repos/r3dlex/superman`; `/repos/r3dlex/superman/rulesets?includes_parents=true&per_page=100`; `/repos/r3dlex/superman/rulesets/{26119791,26121851}`; `/repos/r3dlex/superman/rules/branches/main`; `/repos/r3dlex/superman/branches/main/protection`; `/repos/r3dlex/superman/collaborators?affiliation=all&per_page=100`; `/repos/r3dlex/superman/actions/permissions/workflow`; `/apps/r3dlex-superman-bot`; `/orgs/r3dlex/installations?per_page=100`; `/repos/r3dlex/superman/pulls/1`; `/repos/r3dlex/superman/actions/runs/41041604696/attempts/1` and `/jobs?per_page=100`; `/repos/r3dlex/superman/actions/runs/41041604696/artifacts?per_page=100`; `/repos/r3dlex/superman/commits/{H,M}/check-runs?per_page=100`; `/repos/r3dlex/superman/git/commits/M`; `/repos/archgate/cli/releases/tags/v0.61.0`; `/repos/archgate/cli/git/ref/tags/v0.61.0`. IDs/placeholders here expand to the exact identities above. No hosted settings were changed.

## First full macOS-arm64 prospective-tree verification

Executed 2026-10-30 **15:31:54–15:37:54 UTC**, Node **26.5.0**, pinned pnpm **12.16.1**, verified Archgate **0.61.0** and Trivy **0.76.1**. A private temporary clone committed only the prospective tree as `d651cf853093952fe0e6e62570a69432c26cbd42`; the working branch stayed at `e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`, with approved-base reference `e9b7551fff4835a53dd716936e68ead7053502f1`. This is local prospective evidence, not a hosted head/integration claim.

| Verification | Result |
|---|---|
| All five process suites, `node --test --test-concurrency=1 …` | **178 passed / 0 failed / 0 skipped**: G4 41, rule suite 33, quality 47, G9 38, routing 19 |
| `tsrs --noEmit` and matching `tsc --noEmit` | Both exit 0, no diagnostics |
| Full `biome ci`, knip, prospective diff whitespace | All exit 0; no lint/unused-code issues |
| Default raw G1–G11 driver | Exit 0 with explicit outcomes; input integrity passes; no merge authority |
| Separate fresh raw G11 scan | Exit 0; vuln/secret/misconfig, HIGH/CRITICAL including dev dependencies; no ignored finding |
| Original checkout/index | Both preserved; no reset/revert used |

The default receipt passes G1/G2/G3/G4/G10 and explicitly reports `n/a` for G5/G6 (no product source), G7 (not activated), G8/G9 (spec-kind), and G11 (required on Linux-x64, independently scanned locally above). No inapplicable tool was mislabeled as executed. Real quality/behavior execution is proved by the process fixtures, not invented metrics for this source-free spec branch.

Artifacts: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-final-verification-tGlfp2/` — `summary.json`, `source-manifest.json`, `verification-inputs.json`, `bootstrap.json`, `trivy-local.json`, and one log per stage. The verifier records `sourcePreserved: true`, `indexPreserved: true`; original index sha256 `0815c0494ac9f22b76ffa7691ba3316240ed3d410d1d518187006b88cd6e00ba`.

- Process log sha256: `41f92102110d3244fe0225678b27f4517a47c3adb5311489615f6d14169ff1ba`.
- Source-manifest sha256: `23fae119d2dea0f9f898e19fd87978525ef71ba2fdf56a3f97be47266f33455a`.
- Verification-input fingerprint excluding only this evidence document's later results update: `4ab20dabe431708851d2e4ba9ebef34b839c66b177a12333ffa3b581489e674a` (96 files). The native rerun consumes the same immutable temporary commit, not the evolving evidence document.

## Native-arm64 failure, diagnosis and fixture correction

The matching prospective tree `d651cf853093952fe0e6e62570a69432c26cbd42` was **not green** on native Linux-arm64: **154 passed / 24 failed / 0 skipped**. All 97 supplied source files matched the manifest and remained unchanged. Strict tsrs, reference tsc, Biome, knip and the synthetic spec-kind raw run passed; that raw run had G9 `n/a` and therefore did **not** prove replay. The failed process cases were at the G9 pnpm boundary, mostly empty version output after its unchanged ten-second deadline.

Preserved original failure: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/final-native-arm64-proof.64a8Py/` (`final-summary.json`, `native-results/stages/`, source/evidence manifests). Original native receipt sha256 `9bba111fdbc3d3c3140c23dd04534f6343d82332b512f8173226e12cb66bbc7c`; evidence-manifest sha256 `5e0c81fde7b8a8a86fde55a405732f0cf3ca91f9b54be87e4fb80771398e4ad8`.

The approved single-process test `G9 replays an assertion regression` reproduced the failure without retries to obtain a pass. Instrumentation in an owned diagnostic copy exposed `spawnSync pnpm ETIMEDOUT`, not a version mismatch. Boundary probes isolated the missing provisioning lock: native pnpm also timed out in a minimal lockless working directory; `.npmrc` alone did not help, while adding the exact lockfile made its version probe finish in 36 ms. Engine metadata alone did not fix replay. These observations identify the fixture input; they do not claim a diagnosis of pnpm's internal implementation.

Adding **only** the reviewed `pnpm-lock.yaml` to the otherwise unchanged fixture changed the real native G9 test from red to green. The shared fixture now includes that lock plus matching reviewed tool declarations. The actual corrected fixture passed the same native test in ~1.14 seconds and the macOS control in ~3 seconds, with no new gate, fake binary, pin or deadline relaxation. Diagnostic sources/logs are explicitly under `diagnose-*`; no debug instrumentation was added to repository code.

This fixture-only correction changes the prospective tree after the first full runs. The original failure is retained, not relabeled green. Independent review found no weakened gate, assertion, pin or deadline in the correction.

## Corrected-tree verification

The corrected prospective commit is **`95e4b1fa84161ec6f26d36ced91d1a152f0a2f23`**. Its macOS-arm64 run on 2026-10-30 **16:01:02–16:06:46 UTC** passed all eight stages: **178/178 process tests, 0 skipped**, strict tsrs, reference tsc, full Biome, knip, default raw G1–G11, separate fresh G11, and prospective whitespace checks. Original source/index preservation again passed; the working branch remains at `e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`.

Current macOS artifacts: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-final-locked-MKuGfZ/`. Summary sha256 `30be0bfe7215d611496145867756e5240957bf80ab9ceab34063f5c9d4ad893c`; process-log sha256 `28b38fcb99c088af8c878213185dc6ab8b2c5ee2455b5667b8d347c081c17796`; default receipt sha256 `b6d3aea696fee7c46167cd630f28dac2c03675bd6892d3d245edbf7a944b6cd3`; fresh G11 receipt sha256 `8d72cf81e481094b50769dbd13cd9ba67517dc0314f006139f7b67448f07b8f6`. All declared `n/a` outcomes have the same applicability reasons as the earlier receipt, not claims that those tools executed on this spec branch.

Current source-manifest sha256 `ab4e486222bc0ae4eb1b8e17186c147141ac047eeef9de04e5ee335037c307cb`; verification-input fingerprint excluding only this evidence document's results update `e885f412f5f925f072e90c5be7a15ea0374f17cec031227fa727c35dd2c05c1a` (96 files).

The first corrected-source native run reached **177 passed / 1 failed / 0 skipped**: the empty-pnpm failure was gone, but the timeout-child test expected `ESRCH` and still saw a PID. All other stages passed. Evidence is retained under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/final-locked-native-arm64-proof.3bRZOz/` (receipt sha256 `1e1d33b40dcc069d8a0bb1db6c1f048a65f135afb65328db6dedd6b305d776c1`, evidence-manifest sha256 `9052b198dd08520e3c3ae554632d36d2a485ec5cd613457ae87b10e425070356`). The spec-kind raw receipt's G9 `n/a` did not waive that failure.

An owned diagnostic run of the same timeout test showed the child was already dead: `/proc/<pid>/status` was **`State: Z (zombie)`, `PPid: 1`**, with Node running as the sandbox's PID 1. The minimal container lacked an init/reaper. Enabling Docker **`--init`** as the sole runtime correction made the **unchanged** test and `ESRCH` assertion pass in ~20.52 seconds; no test, gate, pin or deadline changed. The diagnostic copy/logs are under `diagnose-timeout-*`; the successful unmodified-source control is `timeout-init-control/`. No debug instrumentation entered repository code.

The init-enabled consumer records and verifies `HostConfig.Init: true` alongside no networking or mounts. The full supervised run of the same immutable `95e4b1fa84161ec6f26d36ced91d1a152f0a2f23` source passed on **2026-10-30 16:15:47–16:17:48 UTC**: **178 passed / 0 failed / 0 skipped**, including the unchanged timeout test. Strict tsrs, reference tsc, full Biome, knip and the synthetic spec-kind raw G1–G11 run also passed. All 97 files and the synthetic candidate tree matched the supplied source and stayed unchanged. Both earlier native failures remain preserved; neither is relabeled green.

Final native artifacts: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/final-init-native-arm64-proof.2HubSP/` (`final-summary.json`, `native-results/stages/`, `native-results/receipts/native-arm64-prospective.json`, `native-results/init-runtime-identity.json`, `launch-identity.json`, and `prior-controls/`). PID 1 was verified as **`docker-init`**. The container was removed; no mounts, credentials or networking were available.

| Native evidence identity | SHA-256 |
|---|---|
| Image | `44fbd43f7685ab5e7088a1ff6e141105bc9403455bcc8e12c97849848d90c7df` |
| Exact command payload | `a466c5d77b19e6af6a0f6b8cc74d16d5cc25afe85454183733fad8f53abaf972` |
| Init-enabled consumer | `cd064384039ebdf65139707a0b30af5445aaaefa216e55b8a8f6ee09ab3950bf` |
| Process-suite log | `ddb15fbc477497685a95b55754b1cd38e4290ffaff201d8d5040cd131c299786` |
| Raw receipt | `6b24d4493bac7c2a464215615e96d3727c811a422aae794be0fc3b82c1bc63a1` |
| Final summary | `417e47565a3ef3ea0c6a2351c4cf4c8f86b95a8a4b3dce67a11a29bd309e5185` |
| Evidence manifest | `dcc86b98e3f993d01a2090b1a893f00b519972316a421046c1420f41bfc27c7c` |

This is prospective **local/synthetic** evidence, not hosted H/B/M or merge admission. Native G11 remains `n/a` as designed for the required x64 leg. G9's spec-kind `n/a` is not replay proof; its 38 real/fake-tool fixtures, including timeout cleanup, supply that evidence. The Archgate candidate remains unapproved/unpublished.

## Execution resumption — 2026-10-30 21:18 UTC

The explicit `execute` invocation resumes blocker resolution, not publication, credential or merge authority. Initial recheck evidence is under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-intake-o6T6aw/` (`summary.json`, `local.json`, one raw JSON record per public API response, and `proposed-required-checks.json`). Those initial HTTP requests used no authorization header; later explicitly authorized App verification is recorded separately below.

- [x] Recheck all 96 non-evidence verification inputs: no mismatch; working HEAD remains `e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`, and the original index hash is unchanged.
- [x] Recheck original arm64 binary/archive digests: both still match their candidate records. The archive contains only `archgate`; its distribution package must also provide the upstream Apache-2.0 license and applicable notices before publication. If the archive is repackaged, review and register its new archive digest rather than reusing the original one. The verified binary need not change.
- [x] Recheck public hosted state: PR #1 still has the old H/B and only four historical runs; upstream v0.61.0 still has no Linux-arm64 asset; effective main rules still have no required status checks or strict freshness. No Superman releases exist.
- [x] Prepare only the additive three-check/producer/strictness rule fragment. This is not a complete ruleset update payload. Public ruleset responses omit bypass actors, so a fresh authorized view is required before preserving or changing that state.
- [x] Obtain authorization for App credential verification only. The user authorized checking App 5526100 / installation 176536987 and minting a short-lived verification token, not hosted settings, publication or commit/push. `SUPERMAN_APP_KEY_PATH` was unset at intake; the user subsequently supplied `~/.config/superman-agent/app.pem` explicitly.
- [x] Select the preparation destination: the user chose a dedicated tooling prerelease in `r3dlex/superman`. This selects a destination only, not final asset approval or publication authority.
- [x] Verify the supplied PEM's safe file mode/ownership and authenticate the expected App with it. No unrelated home/keychain location, existing `gh` credential store or minting script was read.
- [x] Correct the installation's repository selection through the explicitly authorized browser change and complete independent App/key/token/full-repository-coverage verification: 28/28 checks pass; exactly `r3dlex/superman`; verification token revoked. The earlier broad-scope failure remains preserved.
- [x] Prepare and integrity-check a conditional license/provenance-bearing arm64 archive in an owned temp directory; unchanged verified binary, no publication or live asset registration. Redistribution evidence remains incomplete as described below.
- [ ] Complete distribution-license/notice preparation and obtain human approval of its exact final bytes/checksum. Protected tag creation remains a human step, not an App operation or a Superman product release.
- [x] With subsequent explicit authorization, add the three exact checks with GitHub Actions producer 15368 and strict freshness. Independent ruleset/effective-main API reads and a fresh authenticated UI reload verify persistence and preservation of all existing review/ref/bypass protections.
- [ ] After asset registration and green local verification, obtain authorization for an App-authored commit/push to the existing spec branch and collect exact hosted H/B/M evidence on all three jobs.
- [ ] Complete independent final review and update PR evidence; approval/merge remain Andre's separate actions.

Inactive catalog/refactor/dynamic profiles remain blocked. Ticket 01 is still blocked and expressly requires unchanged reviewed quality configs. Its eventual minimal source may be below the current jscpd `minTokens: 50` cutoff; this is a reviewed measurement-model decision before admitting such source, not permission to pad product code, omit files, fabricate a baseline or lower the threshold inside a ticket. No product implementation or profile-policy change was made during this recheck.

The user reports npm package control and OIDC publishing capability, and confirms the scoped package spelling is `@r3dlex/superman`. Public registry reads at 21:23 UTC confirm `@r3dlex/superman@0.0.0` and `superman-ai@0.0.0` as published placeholders for this repository. The earlier unscoped spelling `supermain-ai` returns 404 and is not a package-contract change; the current reviewed target remains `superman-ai`. Public metadata does not prove account control or either package's live trusted-publisher configuration. No name, npm setting or package version was changed. npm OIDC does not authenticate the GitHub App or publish the separate Archgate GitHub release asset, and does not advance ticket 11's product-release prerequisites.

### Authorized App-key verification — 2026-10-30 21:32 UTC

**Blocked on actual installation scope, not a missing key.** The user-supplied `~/.config/superman-agent/app.pem` is a regular, non-symlink RSA key, owned by the current user, mode **600**, inside a mode **700** directory. A JWT signed from that key authenticated `GET /app` as App **5526100**, slug **`r3dlex-superman-bot`**, owner **`r3dlex`**. App registration permissions match ADR 0005. JWT-authenticated `GET /app/installations/176536987` confirms the expected App/account binding, unsuspended state and matching installation permissions.

The live installation reports **`repository_selection: "all"`**, while reviewed policy requires **`"selected"`** and exactly **`r3dlex/superman`**. This newer authenticated observation supersedes the earlier selected-repository metadata for current readiness; it does not relabel that historical snapshot. Thirteen sequential checks passed before the scope check blocked. No installation token was minted, so token permissions and paginated repository coverage remain unverified. The key/JWT were never printed or persisted in evidence, the key was not modified, and neither `gh/` nor `mint-token.sh` was read or executed. No ambient credential was used.

Sanitized evidence: `superman-gate1-intake-o6T6aw/app-verification-UNVsVg/verification.json` under the approved temp directory; SHA-256 **`0664875bf77a1906438114be874402cee0575f64ff0286c020cfd0c5f9158928`**. The one-shot helper is `verify-app.mjs`, SHA-256 **`ba4fea32e83c53e5a42585938ec70178991b1035d3f9fad025101b17a9c55888`**. It uses supported endpoints and retains only explicitly selected, non-secret response fields.

Recovery requires an explicitly authorized organization administrator to restrict this installation to the selected Superman repository, accounting for the loss of App access to any other organization repositories, then rerun verification and complete token/repository pagination. Do not change policy to accept all repositories or issue a narrowed token merely to make the check appear green. No installation or hosted setting was changed by this verification.

The user then explicitly authorized a browser change limited to installation 176536987's repository selection, including removal of access to other organization repositories. This does not authorize main-rules changes, publication, commit/push, approval or merge. Browser Control **0.8.4**, build **2026-10-06T23:04:30.415Z**, reports `connected: false`, zero attached targets; one ordinary execute in session `superman-app-scope` returned **"Browser Control extension is not connected"** before opening the installation page. No form was submitted or hosted setting changed. Recovery requires the user to connect/attach the intended Chromium tab, not accessing an approver's CLI credentials or restarting shared browser state. Runtime reproduction/recovery is tracked in the approved temp evidence directory's `browser-control-todo.md`.

### Authorized installation correction and successful verification — 22:39–22:41 UTC

After the user installed/connected Browser Control extension **0.0.25** and instructed the agent to continue, the same session opened the exact installation settings page. Its UI corroborated the broad-scope failure. The agent selected **Only select repositories**, selected **`r3dlex/superman`**, and independently checked the App heading, installation URL, selected mode and exactly one selected repository before saving. One Save was sent to `/organizations/r3dlex/settings/installations/176536987/update`; navigation returned the persisted selected-only state, one Superman chip and disabled Save/Cancel controls. No other hosted setting was changed.

The unchanged one-shot verifier then passed **28/28 checks** through independently authenticated API calls. `GET /app` verified the expected key/App/owner and registration permissions; both installation endpoints verified the expected App/account/repository binding, unsuspended state, selected mode and installation grants. A new short-lived installation token was minted **without narrowing repository or permission grants**. Complete repository pagination returned **one repository, `r3dlex/superman`, ID 1438373851**, with no next page, consistent counts and unique identity. Token grants matched ADR 0005. Public bot metadata and PR #1's existing author independently matched bot ID **349828379**. No `/user` installation-token identity claim was made.

The verification token was revoked via `DELETE /installation/token` (**204**) immediately after the checks; no key/JWT/token was printed or persisted, and no existing `gh` configuration or minting script was used. Role-style booleans from the generic repository response are not used to infer App token grants or prove push/merge authority. No trial push, review or merge was performed. This closes the recorded App/key/selected-repository prerequisite at this observation time, not the separate main-rules or CI prerequisites.

Sanitized final evidence under the same approved temp directory:

- `app-verification-nyCf4v/verification.json`, completed **2026-10-30 22:41:08 UTC**, SHA-256 **`884ddefc77bc050ba99832f251a10a3b654c714c52ea1b904584b0e5657097ea`**.
- `browser-scope-change.json`, linking the single authorized UI submission to the independent API result, SHA-256 **`a13db7cf56109b21f6ee755f85c2fec5c5bd40e12efe56827dc59ac49514665b`**.

The initial `all`-scope failure and disconnected-browser diagnosis remain historical evidence, not relabeled passes. The runtime connection blocker is now resolved. Changing credentials, installation grants or selected repositories requires fresh verification; these receipts do not confer future write authority.

### Authorized main protection update — 22:43–22:50 UTC

After the App scope check passed, the user separately authorized updating **main ruleset 26119791** only: add the three protected-manifest check contexts, bind each to GitHub Actions **App 15368**, enable strict freshness, and preserve existing settings. Publication, commit/push, approval, merge and tag changes remain unauthorized.

The authenticated editor confirmed `main-protection`, active enforcement, the default-branch target, an empty bypass list, one required approval, stale-review dismissal, last-push approval, resolved threads, squash-only merge methods, linear history, deletion and force-push protection. The normal Add Checks UI allowed the new names to be added manually without substituting historical jobs. Each source selector was set to GitHub Actions; strict freshness was enabled and the creation exemption remained off. Before saving, all pre-existing checkbox values, approval count, name and merge methods were compared with the captured baseline.

| Required context | Persisted `integration_id` |
|---|---|
| `bootstrap (macos-15)` | 15368 |
| `bootstrap (ubuntu-24.04)` | 15368 |
| `bootstrap (ubuntu-24.04-arm)` | 15368 |

One Save was submitted. Its 20-second navigation wait timed out, so the agent did **not** resubmit it. Independent read-only `GET /repos/r3dlex/superman/rulesets/26119791` and `/rules/branches/main?per_page=100` both confirmed the exact three contexts/producers, `strict_required_status_checks_policy: true` and `do_not_enforce_on_create: false`. Removing only the added status-check rule from the returned rules array yields the exact pre-save rules; name, target, conditions and enforcement also match the captured API baseline. A fresh authenticated page reload independently verified the empty bypass list, target, review controls, strictness and all three source-bound rows.

Two inspection-only browser-script diagnostics are retained rather than mistaken for hosted failures: source labels briefly had not hydrated after expanding the reloaded section, then a fresh snapshot and explicit visibility wait verified exactly three; a local evidence-writer snippet initially failed parsing before execution, then was corrected without another hosted Save. Neither relaxed a saved requirement. Reproduction/recovery details are in `browser-control-todo.md`.

The tag ruleset **26121851** was inspected without editing: active, all tags, creation/update/deletion restrictions, with the sole bypass shown as **Repository admin / Always allow**. No App bypass or tag operation was introduced. This is still a role-based restriction, not a claim of a person-specific André-only allowlist. Workflow/run identity and current integration success remain to be verified against fresh hosted evidence; required status contexts/source bindings alone do not supply those runs.

Evidence under `superman-gate1-intake-o6T6aw/` in the approved temp directory:

- `main-protection-evidence-index.json`: **`86d98c88d8e47647f856fb9fd7ffdd9ced847d64b08011e889bcc98fe8237de4`**.
- `main-rules-before-save.json`: **`d01e0f370d7bf7dc947c3190c5a103d4db4313b9efdb02db39a85ea10ca62617`**.
- `main-rules-after-save.json`: **`6c0bed1e02604bbfc7871d667e89fa0354bf107d59570a8203625f66de03b4b0`**.
- `effective-main-after-save.json`: **`66c2260a075cbac25805d1cec3ee67b936e25352315162dc73e0245fc39fc92a`**.
- `main-rules-verification.json`: **`77499be446556c7e30140e5d67dfd221c3662c9c79288b442aa6550b5295bf04`**.
- `browser-main-rules-change.json`: **`63c5912704d65c63b5ffe1c0097d93a067eacfe104c8b46c1aa5ee3da27b3008`**.

This closes the recorded missing-main-check/binding/strictness prerequisite at this observation time. The older two-job CI runs do not satisfy the new requirements; no required check or fresh-run requirement was waived.

### Conditional redistribution package — not publication-ready

The independent local preparation unit produced `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/archgate-061-redistribution.GK54y6TU/archgate-linux-arm64.tar.gz`. Its **new archive SHA-256 is `496d9c989ff6214b77909864d562e336feaacc119aca8e4fa4349e01b4263b6b`**; the executable remains exactly **`637d4179f66081a392995ea8b12c151372d77c504e451840e08a975ca398fef0`**. The original candidate/archive are preserved. This package is neither an official upstream release nor a Superman product release and has no publication authorization.

The archive contains 73 regular files, including top-level executable `archgate` (0755), the original Apache-2.0 license, source/build provenance, pinned Bun license guidance, collected runtime-related license/notice texts, an inventory and explicit pre-publication gaps. The 48-package notice inventory is a conservative envelope, not proof of the exact JavaScript bundle. Package-local verification checked safe re-extraction, all member hashes/sizes/modes and 72 internal checksums (excluding the checksum file itself); gzip and detached archive checksum checks passed. Main-session independent checks confirmed the archive digest, safe/unique regular members, executable bytes directly from the archive, and embedded `publish_ready: false`. No new runtime test or build was claimed; prior runtime proof remains bound to the unchanged executable.

`verification-results.json` SHA-256: **`950726706151d18c763ceddf5486c91aab04182854365d3ad027b8e4c1399f38`**. `package/PRE-PUBLICATION-BLOCKERS.json` records the still-unestablished distribution evidence: exact embedded Bun/JSC/WebKit source/relinking correspondence and tinycc applicability; full target-specific runtime/native/polyfill notices; exact bundled-JavaScript coverage versus package-wide optional peers; and human review/publication authority. Copying license texts or linking a source tag alone is not evidence that these questions are resolved. These are gaps for review, not a legal conclusion or publication approval.

The preparation unit had no credential/browser/hosted-write authority and changed no source, dependency, verified binary, live repository input or registered tool asset. The arm64 asset in `tool-assets.json` remains `null`; neither the original naked-binary archive nor this conditional package is silently promoted to publish-ready.

## Execution recheck — 2026-10-31 06:06–06:10 UTC

The user authorized fresh App/key/token verification and authenticated protection-page reads only, and reconfirmed a dedicated tooling prerelease in `r3dlex/superman` as the intended destination. This is not approval of the conditional archive, a tag name/target, publication, settings changes, commit/push, PR-body updates, approval or merge. The final review fixed point is main **`e9b7551fff4835a53dd716936e68ead7053502f1`**, including the full branch and uncommitted bootstrap work against §17.

- **Local integrity:** all 96 non-evidence verification inputs still match the corrected-tree manifest; no unexpected files or product `src/` exist. HEAD is still **`e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`**. The original index SHA-256 remains **`0815c0494ac9f22b76ffa7691ba3316240ed3d410d1d518187006b88cd6e00ba`**. This is an integrity recheck, not a new native-platform execution result.
- **Candidate integrity:** the conditional archive still hashes to **`496d9c989ff6214b77909864d562e336feaacc119aca8e4fa4349e01b4263b6b`** and contains the unchanged executable **`637d4179f66081a392995ea8b12c151372d77c504e451840e08a975ca398fef0`**. All 73 members are safe, unique regular files; all 72 internal checksums match. Embedded `publish_ready` is still **false**, with PPB-1 through PPB-4 unresolved. Byte integrity does not establish redistribution readiness.
- **Fresh identity evidence:** the unchanged verifier, SHA-256 **`ba4fea32e83c53e5a42585938ec70178991b1035d3f9fad025101b17a9c55888`**, ran with a cleared environment and passed **28/28 checks**. App **5526100**, installation **176536987**, expected registration/installation/token grants and selected-only scope match; complete pagination returns exactly **`r3dlex/superman`**. The verification token was revoked. No ambient `gh` configuration, minting script or approver CLI credential was read.
- **Fresh protection evidence:** anonymous ruleset/effective-main reads still show the exact three `bootstrap (…)` contexts from `bootstrap.json`, each bound to App **15368**, strict freshness enabled and creation exemption disabled. An authenticated **read-only** browser session independently confirms main's active ruleset and empty bypass list. The tag editor confirms active restrictions on creation/update/deletion of all tags, with the sole bypass **Repository admin / Always allow**. That remains a role-based limitation, not a person-specific allowlist. No form was submitted and no settings update is needed on this evidence.
- **Hosted evidence is still absent:** PR #1 remains open with no reviews/comments or attempt labels, unchanged H/B/M, and only the four historical runs. No Superman releases exist; upstream Archgate v0.61.0 still has no Linux-arm64 asset. No published download/checksum or fresh three-job H/B/M receipt is claimed. `tool-assets.json` remains unchanged with arm64 `null`.
- **Profile boundaries remain unchanged:** active catalogs, refactor history and unmodeled dynamic inputs remain unsupported and fail closed. The existing real-tool fixture demonstrates that a sub-50-token source can make jscpd's report incomplete; such a first-source candidate requires reviewed measurement-policy support before admission. Ticket 01 is not started, padded or exempted, and no source or repository baseline is created. This initial recheck made no behavioral change; later corrections are recorded below. No publication/dashboard action is described as a TDD cycle.

Evidence: `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-recheck-avlpw0/` contains raw unsigned public responses, `local-verification.json`, `archive-verification.json`, authenticated main/tag readbacks and an evidence index. The fresh sanitized App receipt is `superman-gate1-intake-o6T6aw/app-verification-69dqqZ/verification.json` under the same approved temp parent. One browser evidence-writer call failed JavaScript parsing before any browser operation; a fresh inspection and corrected writer succeeded without input or resubmission. Its reproduction/recovery is retained in the recheck directory's `browser-control-todo.md`.

## Independent review corrections — 2026-10-31

The requested `code-review` ran separate Standards and Spec agents against pinned main plus the working tree. The initial reports identified three hard Standards findings, three Spec findings (one overlapping policy-discovery case) and one optional duplication heuristic. Corrections use the already approved §16 process seams; no new seam, product implementation, dependency or profile activation was introduced. The initial six cycles needed two additional lexical-input cycles after independent rechecks, as recorded below.

Each command is `node --test --test-name-pattern '<pattern>' <suite>`; named red/green command records and full logs are retained in `superman-gate1-recheck-avlpw0/`.

| Pattern / suite | Observed red | Correction / green |
|---|---|---|
| `selected G9 blocks comment-separated` / `raw-routing.test.ts` | A policy-only helper change produced G9 pass | Comment-bearing executable policy fails G4 before replay; all three comment placements block |
| `aliased module loaders` / `pr-policy.test.ts` | Aliased `createRequire` input changed while policy passed | `module` / `node:module` loading is explicitly unsupported and blocks |
| `absolute and URL policy imports` / `pr-policy.test.ts` | Absolute repository-local import was treated as a package | Absolute/non-Node URL identities block rather than claiming lockfile coverage |
| `raw checks reject hidden worktree` / `raw-gates.test.ts` | Real G2 passed worktree value 1 while recording committed value 9 | Pre/postflight compare actual bytes/modes with evaluated Git blobs, independently of index hiding flags; both assume-unchanged and skip-worktree fixtures block and preserve caller bytes/index |
| `raw G7 blocks unsupported OpenCode` / `raw-routing.test.ts` | Existing OpenCode skill registration reported G7 n/a | Presence of `opencode.json` or `opencode.jsonc` is an unsupported activation profile and blocks; no future skill verifier is claimed |
| `G5 clone locations are repository-relative` / `quality-gates.test.ts` | Identical real scans emitted different disposable snapshot paths | Validate absolute clone identities/locations first, then serialize repository-relative names; repeated real scans agree |
| `unsupported regex and template policy` / `pr-policy.test.ts` | Regex/template quote text masked a later import comment and policy passed | Slash/backtick tokens outside quoted strings block before import discovery; same-line and multiline reproductions fail closed, while quoted globs and real G9 replay remain valid |
| `escaped local module identities` / `pr-policy.test.ts` | Hex/Unicode-escaped local module paths were classified as packages | Escaped identities explicitly block instead of claiming lockfile coverage |

One initial comment guard was too broad: it rejected quoted test globs as comments. The existing real G9 positive control exposed that error; the guard now skips quoted strings, and the unchanged positive control plus comment-import negatives both pass. The first hidden-worktree test invocation was blocked by this unrelated guard error, so it is **not** counted as snapshot-binding red evidence. After the guard correction, `tdd-04-binding-red` independently observed the actual G2 false pass before the byte-binding fix. All initial failures are preserved. Initial Biome verification also found one new test-format discrepancy; only that hunk was corrected, without weakening lint policy.

The first independent recheck resolved the original byte-binding, absolute-input, OpenCode and volatile-receipt findings, but both axes reproduced a remaining G4 P1: quotes inside regex/template literals could hide an import comment from the quote-only guard. That failure remains preserved, not relabeled closed by a green full suite. Cycle 7 reproduced it before changing enforcement; the corrected bounded scan rejects slash expressions/comments and templates outside ordinary quoted strings. A separate cycle 8 observed and blocked escaped module identities. Their red/green records are `tdd-07-*` and `tdd-08-*`; final independent recheck results are recorded below.

This bootstrap does not claim a general JavaScript lexer or resolver: executable-policy comments, slash expressions (including regex/division) and templates remain unmodeled, even when harmless. Quoted globs remain supported; escaped module identities block rather than being decoded optimistically. OpenCode configuration remains conservatively blocked as a whole until reviewed activation modeling, including configurations that might contain only unrelated settings. Static-input extraction is not refactored merely to eliminate the review's optional duplication heuristic; the G4 discovery and narrower quality-hash profiles intentionally retain different responsibilities.

The pre-correction recheck passed all 178 process tests and all eight local stages. An intermediate correction snapshot **`fa2403584428520bee988aff38e00edf043e78e7`** then passed **184/184 process tests, 0 skipped**, all eight local stages and source/index preservation on macOS-arm64 at **06:29:36–06:36:18 UTC**. Its evidence is `superman-gate1-recheck-avlpw0/corrected-local-proof/` (process-log SHA-256 **`cfba43ec8082ccd3d4c38622c65908185a65e81ed7ad506dacb118ec87183cd2`**). The independent lexical bypass still applied to that snapshot. Neither earlier green run certifies cycles 7–8 or closes the reproduced P1; the later final-tree proof and independent reproductions below supply that bounded evidence. Older native failures/results remain unchanged.

## Final corrected-tree local proof and review — 2026-10-31

The immutable prospective local commit is **`1cfaaf15d35559bf7655aea499997fedbfacf208`**, with base **`e9b7551fff4835a53dd716936e68ead7053502f1`**. It ran on macOS-arm64 / Node **26.5.0**, **06:39:27–06:46:29 UTC**, with the same exact-pinned tools and independently checksum-verified Archgate bytes. This commit exists only in the owned verification clone; working HEAD remains **`e07728e4c042f61d7c50e0a3ab7bfea86c663bcb`**.

| Stage | Observed result |
|---|---|
| All five process suites, `node --test --test-concurrency=1 .superman/ci/*.test.ts` | **186 passed / 0 failed / 0 skipped**: policy 45, rule fixtures 33, quality 48, replay 39, routing 21 |
| Strict tsrs and matching reference tsc | Both exit 0 |
| Full Biome and knip | Both exit 0; no issue or suppression added |
| Default raw G1–G11 | Exit 0, correct applicability, input-integrity pass, `mergeAuthority: none` |
| Separate raw G11 | Exit 0: vuln/secret/misconfig, HIGH/CRITICAL, including dev dependencies |
| Prospective whitespace check | Exit 0 |
| Caller source/index | Preserved throughout execution; original index SHA-256 still **`0815c0494ac9f22b76ffa7691ba3316240ed3d410d1d518187006b88cd6e00ba`** |

The default raw receipt passes G1/G2/G3/G4/G10; G5/G6 have no product source, G7 is not activated, G8/G9 are spec-kind, and G11 belongs to the required Linux-x64 leg. Real mutation/duplication/replay execution is proved by the process fixtures, not invented repository measurements. The separate local G11 scan does not replace required hosted Linux-x64 evidence.

Artifacts are under `superman-gate1-recheck-avlpw0/final-local-proof/` in the approved temp parent. `superman-gate1-recheck-avlpw0/final-verification.json` independently rechecks all **96 non-evidence inputs** against the final manifest with no mismatch; only this document's results update is excluded. Its declared ordered-JSON fingerprint is **`7b8e073d19b24876ff1840f4f7c7e98e4b7949fc828e53168ceee1654dd54b78`**.

| Final artifact | SHA-256 |
|---|---|
| `summary.json` | `698923ad361e242d2177905222a212e1f9b9a6bc5811e6b5601d7d18b5f39cf3` |
| `source-manifest.json` | `d356714bdad8c9e3075776eca28c605f85dd2bba4c68d15eda4224037816f9f0` |
| `process-suites.log` | `36f64c450c28a5895bbb989e1c76a91b4144a872709a573f746c538381e3d05c` |
| `bootstrap.json` | `3f437918f5c4e55f1b0b961ef3c3f80adc562fc3c4bbaa1ca2ca4e6f3c081380` |
| `trivy-local.json` | `34c344f53b4f327034ce5603a8b5a1a8b12130c8c303b6e25c337d9265fffe92` |

### Standards

Final independent bounded recheck: **0 open hard findings**, all three originals resolved; **1 optional duplicate-logic advisory**, non-blocking. Original comment/regex/template cases now fail before replay; clean real replay and quoted-glob controls pass. Hidden-index and tool-time mutation cases fail while preserving caller work/index. Evidence: `superman-standards-final-bounded-ukjyxwp6/summary.json`, SHA-256 **`66e55d5e300b8a5d5fcc96f6485426bce6c65734a37020688ab546ba1516c9a9`**.

### Spec

Final independent bounded recheck: **0 remaining implementation findings or scope drift**, all three originals resolved. The reviewer independently loaded the original template-masked config with Node to confirm its effect, then observed G4 rejection; the quoted-glob positive control passes. G7 and deterministic-receipt fixes remain unchanged. Evidence: `spec-axis-final-recheck-chL6xD/results.json`, SHA-256 **`c828e257ef43b9f1f473533b0e159f5887489a553cae0ed1d6f095fb2fcaebd9`**. Both axes preserve the redistribution, hosted-platform and applicable small-corpus prerequisites; neither grants readiness or approval. Combined report: `superman-gate1-recheck-avlpw0/final-code-review.md`.

## Small-corpus probe and coverage status — no policy adoption

A bounded, credential-free disposable jscpd **5.4.2** probe clarified the remaining measurement restriction. Lowering only `minTokens` from 50 to 1 still omitted the tested one-line file. Explicit `minTokens: 1, minLines: 1` included it, but the mixed fixture reported **136.8421052631579%** duplication, incompatible with the current percentage/baseline model. Empty files remained omitted. These observations rule out a blind cutoff reduction as a drop-in fix; they do not establish a generally supported alternative profile or an upstream diagnosis.

Probe evidence: `superman-small-corpus-probe-7s7zV6/{summary.json,min-lines-summary.json}` and per-case real tool reports under the approved temp parent. No repository config, threshold, pin, product source or baseline changed. Applicable first-source work remains blocked until a reviewed accounting/measurement contract is implemented with process regressions.

At this probe's observation time there was **no line/branch/function/statement coverage percentage gate**. André subsequently approved the coverage policy, pinned dev tools and measurement seams, followed by the incremental/nightly requirement; [coverage-evidence.md](coverage-evidence.md) owns that newer work. Published CI still runs the old two-job checks until separately authorized publication. G6's real mutation ratchet is a different metric, not a unit-coverage requirement; raw G5/G6 remain n/a without product source, with real-tool behavior exercised in disposable fixtures. Installed Matt skills do not activate Superman's planned overlays/CLI verifier; `ship` remains post-Gate-1 work, and the intended catalog excludes `implement-spec`'s integration-merging flow.

## Remaining blockers and authority boundaries

| Blocker | Next permitted action / responsible party |
|---|---|
| No approved published Linux-arm64 Archgate asset | Resolve the conditional package's redistribution-evidence gaps, obtain human review/authorization of exact final bytes, publish, then register the verified release URL/checksum in reviewed policy |
| No full final-tree three-platform proof | After an authorized green commit/push, collect hosted checks/artifacts for the exact H/B/M on all three required jobs. Emulated-x64 timeouts are not native-x64 proof |
| Active skill verifier and refactor-history verifier unsupported by the bootstrap | Those inputs fail closed; do not admit such work based on an inactive `n/a` or behavior-ticket proof |
| Partial/undersized jscpd corpora or unmodeled dynamic/relocated scopes | These inputs block until reviewed policy modeling exists; no partial metric is reported as full-corpus success |

Tag protection is currently admin-role-based, not person-specific; retain that limitation when assessing human-only release authority. Ticket 01 stays blocked until §17 steps 1–2 and André's exact-head Gate 1 approval/merge. First-source baselines remain §17 step 3, not fabricated bootstrap data.

All task changes remain uncommitted and unpushed. No product `src/`, ticket implementation/status change, approval, merge, publication, persistent credential rotation/storage or tag-rules change was performed. Hosted configuration writes were limited to the separately authorized installation repository restriction and main required-check/source/strictness update; the temporary verification token was minted and revoked without changing the key. Temporary fixture repositories and the separate prospective verification commit are not working-branch commits or publication authority.
