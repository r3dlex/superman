# Row 12 — operator request: native proof, live forge evidence, and publication

**Prepared 2026-11-04.** This is the part of Gate 1 that no agent can complete. It asks for three things only: native runner capacity, live forge evidence, and publication authority — each with the exact identities and commands needed, so nothing has to be re-derived and nothing is asked that could be read from the repository.

**What this request is not.** It is not an acceptance of the Deno pin, a native-profile acceptance, an evaluator activation, a ticket 01 admission, or a readiness change. It is not a merge. Every one of those remains André's action on an exact head, and row 12's own criterion says so.

**Spec references.** §17's "Native acceptance and authority" row; §9.2's merge checklist; §5.4 and §5.10's measurement contracts; ADR 0016 (Deno runtime) and ADR 0017 (quality contract).

---

## 1. The three native proof runs

Row 12's criterion requires **all three** native candidate proof runs, binding the same exact source, tools and profiles, on the three platforms. A missing platform blocks; it is not skipped, narrowed, or reported `n/a`.

The three required check producers, from `.superman/ci/bootstrap.json`:

| Required check | Runner labels | App |
| --- | --- | --- |
| `bootstrap (macos-15)` | `self-hosted`, `macOS`, `ARM64`, `r3dlex-org` | GitHub Actions app id `15368` |
| `bootstrap (ubuntu-24.04)` | `self-hosted`, `Linux`, `X64`, `r3dlex-org` | app id `15368` |
| `bootstrap (ubuntu-24.04-arm)` | `self-hosted`, `Linux`, `ARM64`, `r3dlex-linux-arm64` | app id `15368` |

Note the arm64 leg uses a **different runner group** from the other two (`r3dlex-linux-arm64`, not `r3dlex-org`), and it is the same group the Archgate arm64 candidate workflow targets.

**What is needed:** actual runner/group/label/capacity for all three, plus Superman and public-PR access, the actual tools and software on each host, existing image provenance or a native-host inventory, and any mounts, services or credentials with their residual risks. Labels and historical jobs are not current acceptance. No hosted fallback, no new VM, image, controller or admission App.

## 2. Artifact identities to verify

### The six Deno candidate archives (v2.9.8)

| Archive | SHA-256 |
| --- | --- |
| `deno-aarch64-apple-darwin.zip` | `9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` |
| `deno-x86_64-unknown-linux-gnu.zip` | `e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609` |
| `deno-aarch64-unknown-linux-gnu.zip` | `d49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905` |
| `denort-aarch64-apple-darwin.zip` | `0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` |
| `denort-x86_64-unknown-linux-gnu.zip` | `1577df68c9fe13ec7b974d10d483e9f8974575a3d17f7c127489cf5032e14bd4` |
| `denort-aarch64-unknown-linux-gnu.zip` | `1cf6a3b3e8c1f364c2b89fd08605e5c2d16ed1c670fed330fb5e370c2dbf6b3d` |

Not part of the six-archive set but bound by the same records: `deno_src.tar.gz` `b57d0281c1647effc735f242ba52bc409747fc6ed6ad4946e76f062c67e113eb` (source archive, not downloaded locally) and `lib.deno.d.ts` `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a` (release asset, 721,335 bytes, equal to the attested binary's `deno types` stdout).

### Archgate

| Asset | SHA-256 | State |
| --- | --- | --- |
| `archgate-darwin-arm64.tar.gz` | `44c645602313bc6be7ef99ebc34c5e08f3169695b631bd9ab09bda0d3b699cf3` | archive present locally; extracted binary `be740ac09306e9d2417230065bbb14687fa5b19a7ba771c61c7591a75c3c0b5e` reports 0.61.0 |
| `archgate-linux-x64.tar.gz` | `82037281f74617323715703db492d7284d75531cf8032bcf7af41148a9f416b3` | not present locally |
| registered `archgate-linux-arm64.tar.gz` | `a8b860aeb06df957e2128a4cb4ca4b1ce389c4390429bbffb4f7e6fe62674df1` | registered replacement; extracted binary `181ef65d8a0c73a9abb2279baf710e7ded18e05cfa04c37f033ce95aa6357708`, one regular file `archgate`, mode `0755`, 97,897,256 bytes |

The linux-arm64 replacement additionally needs **its source/build/test evidence bound to that exact archive and binary, and a human redistribution disposition**. The existing Colima build at commit `f65d99f56d02757cca94d53f6d717333770e0170` passed its suite (2,945 pass, 42 skipped), and the local arm64 unit asset's digest is `a8b860ae…` — the registered replacement is that asset, and the arm64 CI job must consume **it**, not a rebuild. Do not rebuild or republish the asset by default.

### Trivy

| Asset | SHA-256 |
| --- | --- |
| `trivy_0.76.1_macOS-ARM64.tar.gz` | `11a9b6cd2752011b54f01ea4bd0dbfa9f0c41dc6538d5a3f9d23955f471bf4e5` |
| `trivy_0.76.1_Linux-64bit.tar.gz` | `c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0` |

The darwin-arm64 Trivy binary is present locally at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-trivy-Xkz2WM/trivy` and reports 0.76.1, but **the recorded distribution archive is no longer on disk**, so its digest cannot be re-verified here. Treat the tool as version-bound, not archive-bound, and re-verify from the archive on the native hosts.

### The pinned binaries used locally

`deno` 2.9.8 `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba`; `denort` `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb`.

## 3. What to run, and what to report back

For each of the three platforms, on the exact head under test:

1. Fetch and verify the candidate archives against the digests above; verify the extracted executables' own digests.
2. Run the replacement, rule and measurement subjects — the row 11 Deno surface under `.superman/deno-bootstrap/`, the row 9 Archgate rules, the row 8/10 coverage and quality measurements — on the native platform.
3. Bind the results to the exact source, tool and profile identities, and retain the receipts.
4. Report the required check producers, the artifacts, and the run/attempt relationships.

The `bootstrap (<os>)` job already does the platform verification, the checksum-locked external tool install, the overall coverage floor and the applicable raw G1–G11 leg, and uploads `bootstrap-<platform>`. The native candidate proof runs the *candidate* subjects, which are distinct receipts — they do not substitute for the current Node required results, and the Node result stays required until the exact-head approval and merge.

**Please report back, per platform:** the runner identity that ran it, the source SHA, the tool digests actually used, the profile identity, the full pass/fail outcome, the artifact and run/attempt identifiers, and any limit you hit — including a platform you could not reach, which blocks rather than being skipped.

## 4. Live forge evidence, and the publication sequence

**The publication authority is separate and later.** The order is: local evidence → operator lanes → André's exact-head approval → publication → forge evidence → merge. Nothing is published before the exact-head approval, and the candidate never replaces the Node required evaluation before the merge.

What is needed for the publication step, when you reach it:

- The frozen intended file/source manifest, the bot identity and installation scope, the exact commit/push/PR operations, the candidate-proof dispatch, and the required permissions — **presented for approval before any of it happens.**
- The templates stay outside workflow discovery until then. `.superman/deno-bootstrap/ci.template.yml` is not a workflow until it is published as one; merely pushing changed executable workflow YAML is not a nonactivating preparation step.
- After publication: the expected required workflow/job/App results, the run/attempt/artifact relationship, and fresh authorized H/B/M evidence.

## 5. The pre-merge checklist (§9.2)

All seven must hold at the moment of the merge. They are reproduced here because the PR body must carry them:

1. The PR author is the configured agent identity (`<slug>[bot]` in App mode, the bot login in machine-user mode) and is **not** in `identity.approvers`. The head repo is the upstream repo with a `spec/`, `ticket/` or `chore/` branch (App mode) or the bot's fork (machine-user mode).
2. `headSha` is taken from the PR at the moment of the check.
3. The latest review by an approver is `APPROVED` with `commit_id == headSha`. No approver's latest review is `CHANGES_REQUESTED`. The approver is not the author.
4. Required workflow/job/App identities from protected config are present and successful for the integration evidence. Validate head H, tested base B, tested merge M and the run/attempt/artifact relationship against the forge; do not query H alone and assume it is M. Empty, missing, unknown or mismatched evidence fails. Optional non-required jobs stay non-blocking; a skipped required job is not a pass.
5. The PR kind matches its branch. The changed files obey the path policy of that kind, recomputed from `gh api …/pulls/<n>/files`, not trusted from CI.
6. The base is configured `main`, the PR is mergeable, and the evidence covers the current base. Public Superman also has strict server-side up-to-date protection. A changed head needs a new exact-head approval; a changed base needs fresh integration evidence. Private lx has only best-effort checks at this point and audit afterwards, not an atomic base-freshness guarantee.
7. The merge itself is checked by `audit`: in App mode the merge actor must be an approver; a merge by the App is flagged even after approval.

## 6. Two things to look at when the workflow owner reviews

- **The full-repo Trivy scan takes 9 m 48 s** against the CI job's 30-minute budget. The scan policy is unchanged — only `--format json` and `--timeout 15m` were added — but the timing needs the workflow owner's eye.
- **The Knip entry for `.superman/ci/node-hosted-candidate-measurement-host.ts` must resolve.** The file is now tracked in the index as intent-to-add, so it will resolve once the branch is committed. The new Knip completeness check blocks CI correctly if it does not.

## 7. What I can do without any of this

The local half of row 12 — the transition fixture, the workflow template and the transition test — is agent work and does not need operator access. It is sequenced after row 11, because it proves the transition over the surface row 11 produces.
