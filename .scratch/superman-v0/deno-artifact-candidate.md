# Deno artifact candidate — preparation record

Status: candidate artifact identity only. Not an accepted pin, not evaluator activation, not a grant selection, not Gate 1 admission, and not completion of spec §17 Runtime/profile selection.

## Approved preparation contract

`to-spec` was applied only to this confirmed slice. Spec §17 already requires Runtime/profile selection and says no numerical pin is approved in that cell. This section is not a regenerated v0 spec, not a product ticket, and not a `ready-for-agent` assignment. Nothing here is published or activated.

**Problem:** that first row has no accepted artifact identity. A local Homebrew measurement is not one. Polishing the launch probe does not address the row.

**Solution:** name one candidate artifact identity from the GitHub stable release: tag `v2.9.8`, commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, and the six `deno`/`denort` zips below. Cite the unverified release attestation that names those digests. Do not accept a pin.

**User story:** as André, I want those exact upstream assets named as a candidate, so a later Gate 1 review can accept or reject that identity without treating the local bottle, an unread checksum sidecar, or an unverified attestation as a pin.

**Acceptance:** this note cites the tag, commit, six asset names, and their GitHub asset digests. It states that the attestation bundle covers the whole release and that this slice cites only those six. The signature is unverified, the `.sha256sum` sidecars are unread, and the zips were not downloaded.

**Allowlist:** this file, plus one `GLOSSARY.md` term, **Candidate artifact identity**. No spec, ADR, planning-record, launch-probe, or SUP-005 edit. No ADR is added.

**Seam:** none. There is no new behavior, so no TDD cycle applies. The citation is the acceptance evidence.

**Out of scope:** accepting the pin; `dl.deno.land` identity; proof that a later compile used these zips; the pre-Deno startup boundary; OS/libc measurement; launch manifests; grants; the Q23 review; §8.4; evaluator switch; product work; staging; commit; push; readiness promotion.

Observed on 2026-11-01 from published metadata. No zip was downloaded, no artifact was executed, and no signature was verified. The `.sha256sum` sidecars were not read. SUP-005 and the launch-probe files were not edited.

## Candidate label

| Field | Cited value |
|---|---|
| Channel | GitHub stable release. Not LTS, not canary, and not the moving name `latest`. |
| Tag | `v2.9.8` |
| Tag commit | `fe7ed012d92c642fd8e5607ac5a45d517538b5c5` |
| Published | `2026-10-21T15:28:53Z` |
| Release `target_commitish` | `main`. This is not the identity. |

`releases/latest` returned this non-prerelease tag. The immutable identity is the tag and the tag-ref commit, not the API name `latest`. The local Homebrew `2.9.8` version string is a coincidence and is not why this tag was named. Its measured bottle digest is not a candidate digest. [Launch evidence](deno-launch-evidence.md) keeps that measurement at its original limit.

Stable builds are documented as coming from GitHub releases. A version string does not identify a channel, and the same version can differ by channel. No LTS bytes were fetched. [Stability and releases](https://docs.deno.com/runtime/fundamentals/stability_and_releases/)

Sources: [release metadata](https://api.github.com/repos/denoland/deno/releases/latest), [tag ref](https://api.github.com/repos/denoland/deno/git/ref/tags/v2.9.8), [release page](https://github.com/denoland/deno/releases/tag/v2.9.8).

## Six assets

These are the whole candidate set. Digests are the GitHub release asset digests. The same six digests appear as subjects in the release-attestation payload below. No local hash of the zip bytes was computed.

| Asset | GitHub asset digest |
|---|---|
| `deno-aarch64-apple-darwin.zip` | `sha256:9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` |
| `deno-x86_64-unknown-linux-gnu.zip` | `sha256:e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609` |
| `deno-aarch64-unknown-linux-gnu.zip` | `sha256:d49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905` |
| `denort-aarch64-apple-darwin.zip` | `sha256:0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` |
| `denort-x86_64-unknown-linux-gnu.zip` | `sha256:1577df68c9fe13ec7b974d10d483e9f8974575a3d17f7c127489cf5032e14bd4` |
| `denort-aarch64-unknown-linux-gnu.zip` | `sha256:1cf6a3b3e8c1f364c2b89fd08605e5c2d16ed1c670fed330fb5e370c2dbf6b3d` |

The target triples name the published assets. They are not a measured OS or libc result.

Left out of the candidate set: `libdenort`, QuickJS runtimes, bsdiff patches, loose-binary checksums, `deno_src.tar.gz`, `lib.deno.d.ts`, and every other platform.

## Release attestation

Querying the GitHub attestations API for subject `sha256:9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` returned one bundle. Its predicate type is `https://in-toto.io/attestation/release/v0.2`. The payload names `pkg:github/denoland/deno@v2.9.8`, commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, and the release's asset subjects. That bundle covers the whole release. This record cites only the six digests above.

The signature was not verified. No SLSA build-provenance predicate was present in that bundle. This citation is not build provenance, not a receipt, and not an accepted pin.

## Limits

- `.sha256sum` sidecar contents were not read. Their agreement with these digests is unproved.
- The zips were not downloaded, so these digests are published metadata, not locally recomputed hashes.
- The compile-time download identity, and whether a later compile used these zips, was not established. That identity stays outside this slice.
- The pre-Deno startup boundary is outside this slice.
- Supported OS/libc, launch/config/capability/environment manifests, bounded real-Node drivers, and the Q23 grant review remain unresolved. This cut does not complete Runtime/profile selection.
- §8.4's environment inventory was not taken.
- No test seam was added. Acceptance evidence is this citation.

## 2026-11-01 verification — official candidate inputs

Status: local byte identity and GitHub release-origin verification for the named `v2.9.8` inputs. This is not an accepted pin, not SLSA or other build provenance, not evaluator activation, and not Gate 1 admission. Q1 names this candidate; Q3 still blocks final source/build-provenance acceptance. No binary was executed. No repository staging, commit, push, installation, or readiness change was made.

The historical prefix above remains the 2026-11-01 citation. Its statements that the zips were not downloaded and the signature was not verified are true of that earlier slice. They are not claims about this later verification.

### Tools, host, and checkout

Commands started at `2026-11-01T19:17:44Z` on Darwin arm64, macOS 27.0.1, build `26A434`. Superman HEAD was `62c8495aeffa33d827c481e661f6083f8bc718d4` on `spec/superman-v0`. The only pre-existing dirty file was `.scratch/superman-v0/gate1-preparation.md`; it was not staged.

| Tool | Path and version | sha256 |
|---|---|---|
| `gh` | `/opt/homebrew/bin/gh` 2.103.3 (2026-10-26) | `258d12a00ca7939294c4b9a977eae72dc74882f8c4293012126f8d2da27e9d2e` |
| `shasum` | `/usr/bin/shasum` | `0812595f981a26f813d98dc380af14d4af427626c9339eda29eb849ae13de1e3` |
| `unzip` | `/usr/bin/unzip` 6.00 | `a4abf0d63b26d8e7067b8d4a3674a3f3c0d7c0b3a6e68fba04540a405f618bb7` |
| `file` | `/usr/bin/file` 5.41 | `8014815e1028410f48966f1880f99c842a5678cf2fcaa010e8d7e9e498f651d0` |
| Python | `/opt/homebrew/bin/python3` 3.15.2 | `6cc907e4a022fefc843bcd93954eaf5a2cbfc77a095640bfadeeed96154190c5` |

Downloads and extractions stayed in `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step1`. Execute bits were removed after extraction (`mode 0644`). Nothing was copied onto `PATH` or into a Deno install location. That temp tree was removed after this record was written. An already-present Homebrew `deno` symlink was not invoked or changed.

Three local command mistakes were corrected and are not artifact failures: `gh release view` was first called with the unknown field `immutable` and then succeeded with `isImmutable`; the first `verify-asset` loop aborted before any verification because zsh treats `status` as read-only; the first contents-API calls were globbed by zsh and succeeded once quoted.

### Release and source identity

`gh api repos/denoland/deno/git/ref/tags/v2.9.8` returned object type `commit`, sha `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`. This ref is not an annotated tag object. The commit API first line is `2.9.8 (#37052)`. GitHub's API reported `verification.verified=true`, `reason=valid`, `verified_at=2026-10-21T11:47:22Z`. That is GitHub's verification result, not a local PGP check. The signature block is not copied here.

`gh release view v2.9.8 --repo denoland/deno` returned tag `v2.9.8`, published `2026-10-21T15:28:53Z`, created `2026-10-21T11:47:21Z`, author `github-actions[bot]`, `isDraft=false`, `isPrerelease=false`, `isImmutable=true`. `targetCommitish` is `main`. That branch name is not the identity.

`gh release verify v2.9.8 --repo denoland/deno --format json` exited 0. The verified statement type is `https://in-toto.io/Statement/v1` and its predicate type is `https://in-toto.io/attestation/release/v0.2`. The predicate names `pkg:github/denoland/deno@v2.9.8`, repository `denoland/deno`, and tag `v2.9.8`. The package subject digest is Git SHA-1 `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, not a SHA-256 git digest. The verified signer expression is `^https://dotcom\.releases\.github\.com$`. The timestamp authority is `timestamp.githubapp.com` at `2026-10-21T15:28:54Z`. The statement has 56 named asset subjects plus that package subject. Certificate and signature bytes are not copied here.

The attestations API for `sha256:9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` and for `sha256:0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` each returned one attestation. Both predicate types were `https://in-toto.io/attestation/release/v0.2`. No SLSA build-provenance predicate was present in those responses. A release attestation is not build provenance and is not relabeled here.

### Six archives, sidecars, and extracted executables

`gh release download` fetched only the six candidate zips, their six `.zip.sha256sum` sidecars, the three loose `deno-*.sha256sum` files, and `lib.deno.d.ts`. `gh release verify-asset` exited 0 for all 16. Each matched the release attestation subject of the same name, with the same predicate, signer expression, and timestamp as above. Local `/usr/bin/shasum -a 256` of every downloaded file matched that subject digest.

Each zip listed exactly one member. The zip timestamps below are archive metadata, not a build attestation. `file` 5.41 read headers only; no binary was executed, and these notes are not measured OS/libc or musl results.

| Archive | Local/attested zip sha256 | Member | Bytes | Extracted sha256 | `file` 5.41 header |
|---|---|---|---|---|---|
| `deno-aarch64-apple-darwin.zip` | `9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` | `deno` | 81512928 | `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba` | Mach-O 64-bit executable arm64 |
| `deno-x86_64-unknown-linux-gnu.zip` | `e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609` | `deno` | 96055992 | `368bca08999e02c6911b8f248167b582276b1f547db5712b6e736d7eda1dbda7` | ELF 64-bit x86-64, interpreter `/lib64/ld-linux-x86-64.so.2`, for GNU/Linux 3.2.0, BuildID sha1 `9917388c8356b25023811735fad924d7e14497f1`, stripped |
| `deno-aarch64-unknown-linux-gnu.zip` | `d49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905` | `deno` | 85561832 | `b484f780e5149ca05c673f1f79f7fb466f12a2295933bdad917af4a8a5c020e8` | ELF 64-bit ARM aarch64, interpreter `/lib/ld-linux-aarch64.so.1`, for GNU/Linux 3.7.0, BuildID sha1 `b73e940197519f44edfa911f6880f1fde9aafa99`, stripped |
| `denort-aarch64-apple-darwin.zip` | `0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` | `denort` | 68094056 | `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb` | Mach-O 64-bit executable arm64 |
| `denort-x86_64-unknown-linux-gnu.zip` | `1577df68c9fe13ec7b974d10d483e9f8974575a3d17f7c127489cf5032e14bd4` | `denort` | 104987712 | `7b91d3d117804c0ebe05ac017a3430e0f09d9ab05b588ff0bda6f514dd0a4f2d` | ELF 64-bit x86-64, interpreter `/lib64/ld-linux-x86-64.so.2`, for GNU/Linux 3.2.0, BuildID sha1 `279ce08d8e8e963e8c8c47439a2a17cc68f8ac6c`, not stripped |
| `denort-aarch64-unknown-linux-gnu.zip` | `1cf6a3b3e8c1f364c2b89fd08605e5c2d16ed1c670fed330fb5e370c2dbf6b3d` | `denort` | 105887632 | `bab7bc2f98ff656f335712f064b97bdedfa243d4a59ada40bd30b48e268db01b` | ELF 64-bit ARM aarch64, interpreter `/lib/ld-linux-aarch64.so.1`, for GNU/Linux 3.7.0, BuildID sha1 `051c5bba4bf776c5f916d313f6ab65c20612d5c7`, not stripped |

Zip member timestamps were `2026-10-21 16:14` for both Apple archives, `14:53` for both x86_64 Linux archives, and `14:57` for both aarch64 Linux archives.

Each `.zip.sha256sum` payload is `<zip sha256><two spaces><zip name>\n`, and that hash matches the local zip and the attestation subject. The three loose `deno-*.sha256sum` payloads name `deno` and match the extracted executable hashes above. Their own file digests are the attested sidecar subjects, which are different from the executable hashes. The verified release statement has no loose `denort-*.sha256sum` subject. The three denort executable hashes above are local hashes of the single attested zip member, not a published executable sidecar.

`deno_src.tar.gz` is a named attestation subject (`sha256:b57d0281c1647effc735f242ba52bc409747fc6ed6ad4946e76f062c67e113eb`) and was not downloaded. Source identity here is the tag commit, not a local source-archive hash.

### Declaration inputs, closure, and license

`lib.deno.d.ts` is a release asset and an attestation subject. It is not added to the six-archive candidate set. Local sha256 `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a`, 721335 bytes. No `.sha256sum` sidecar for it was in the release asset list. `verify-asset` exited 0. No file in the `cli/tsc/dts` listing had size 721335, so the published asset is not identical to one file in that listing.

At commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`, the contents API listed 134 files and 1 directory in `cli/tsc/dts`, and 51 files and 8 directories in `cli/tsc/dts/node`. Root path `LICENSE` returned 404. `LICENSE.md` is 1074 bytes, git blob `b641c75c0b04ccfddcb1145d2554ab49b6ca9411`, content sha256 `f62497fffecc0852960c8d3e6934b9db86d16396e9b604072e923892cae3a588`. Its text is the MIT License, copyright 2018-2026 the Deno authors. `cli/tsc/dts/node/LICENSE` is 1141 bytes, git blob `9e841e7a26e4eb057b24511e7b92d42b257a80e5`. Its text is the MIT License with `Copyright (c) Microsoft Corporation.`

The published declaration file begins `// Copyright 2018-2026 the Deno authors. MIT license.` It also contains, at line 17133, `Copyright (c) Microsoft Corporation` and an Apache License 2.0 notice. It has 54 `/// <reference` directives. The distinct referenced libs are `esnext`, `esnext.disposable`, `es2015.symbol.wellknown`, `es2020.intl`, `es2022.intl`, `es2025.intl`, `node`, and the Deno libs `deno.net`, `deno.console`, `deno.url`, `deno.web`, `deno.webgpu`, `deno.canvas`, `deno.fetch`, `deno.websocket`, `deno.crypto`, `deno.ns`, `deno.broadcast_channel`, `deno.shared_globals`, `deno.webstorage`, and `deno.cache`.

A sample, not a complete closure, fetched seven source files from `raw.githubusercontent.com` at that commit and tested byte containment in the published asset. Content sha256 is not the git blob sha.

| Source file | Bytes | Content sha256 | Contained in published `lib.deno.d.ts` |
|---|---|---|---|
| `lib.deno.ns.d.ts` | 229839 | `8e8348a4c8762c5cedfe4c9b9673ba01f79ea49b9f1d3b9a91bbe2e69c316504` | yes |
| `lib.deno.window.d.ts` | 18455 | `65deeb96e59b827bda5fcbeb999c0b8ded931870abb40e7a5b1a58623c46d6ae` | yes |
| `lib.deno.shared_globals.d.ts` | 37204 | `dd15d55184d1158f1bcdf849f392293ca2dbfac6f2918f780b90b6fc0607bda4` | yes |
| `lib.deno_net.d.ts` | 37460 | `6444509e83bfb0de78e4c435ceb8b9f33f4fe12f2540b2bbf618ddc210da75a9` | yes |
| `lib.deno_webstorage.d.ts` | 2076 | `1a9528f05d15fa448b9b4d0fd2295cf98a8b66400248e3ff9f0bf3fbb34dd49f` | yes |
| `lib.deno.worker.d.ts` | 13537 | `8d1fa46be2704b536b731586c591dd100350f3f30e39b480e18eb069ef1174e8` | no |
| `lib.node.d.ts` | 138 | `99de6424ed5e22034c9e3bc30e94166d9454b787c7c67d59b3a529c048a698f3` | no |

`lib.dom.d.ts` at that commit is 2349590 bytes, larger than the published asset, so the published file cannot contain the complete source declaration tree. Declaration origin is the release asset plus the named commit. Closure and license are not single-valued: some Deno-owned files are embedded, some referenced files are not, and MIT Deno, MIT Microsoft, and Apache-2.0 Microsoft notices are all present. That is a recorded gap, not a closed declaration set.

### Provenance gaps that remain open

- Release-origin verification is not build provenance. No SLSA predicate was observed for the two queried subjects, and none is inferred for the others.
- The release statement binds the package to a Git SHA-1, not a SHA-256 commit digest. The commit signature was not verified locally.
- `deno_src.tar.gz` was not downloaded. Source-archive byte identity is unproved.
- Denort executables have no published loose checksum sidecar. Their hashes are local hashes of attested zip members.
- `file` header notes are not native execution, OS/libc acceptance, or a musl result. macOS minimum OS was not identified. Linux binaries were not run.
- Declaration closure is incomplete, as recorded above. The node compatibility tree was listed, not byte-closed.
- Compile-time consumption, grants, startup profiles, §8.4 inventory, and pin acceptance were not established. No `.superman/ci/deno-substrate.json` was created.

## 2026-11-01 re-acquisition — step 2 execution inputs

Status: the two darwin-arm64 archives were downloaded again because the step 1 temp tree had been removed. This is not a new pin, not build provenance, and not permission to execute the other four platform archives. Those four were not downloaded.

The already-installed `gh` 2.103.3, `shasum`, `unzip`, and `file` 5.41 matched the step 1 tool hashes. `gh release download` fetched only:

| File | Local sha256, also the attestation subject |
|---|---|
| `deno-aarch64-apple-darwin.zip` | `9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` |
| `deno-aarch64-apple-darwin.zip.sha256sum` | `1ca4234e7c94173c442249c0399070cdce09cc841092c0a6d205101bbde7dca3` |
| `deno-aarch64-apple-darwin.sha256sum` | `4e72750a8ca8de982942967718e1af6a32f3107f91b4ddbbcef49be371ee5f8a` |
| `denort-aarch64-apple-darwin.zip` | `0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` |
| `denort-aarch64-apple-darwin.zip.sha256sum` | `d1a9c498c490faf655b57bc8a686c49261c72f3c239dbf5ee281e988f96c3de3` |

All five `gh release verify-asset v2.9.8 --repo denoland/deno --format json` commands exited 0. Each statement was `https://in-toto.io/Statement/v1` with predicate `https://in-toto.io/attestation/release/v0.2`, package `pkg:github/denoland/deno@v2.9.8`, tag `v2.9.8`, and signer expression `^https://dotcom\.releases\.github\.com$`. The timestamp authority was `timestamp.githubapp.com` at `2026-10-21T15:28:54Z`. No SLSA predicate was present. Certificate bytes are not copied here.

Each zip still had one member. Extracted `deno` was 81512928 bytes, sha256 `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba`, matching the loose sidecar. Extracted `denort` was 68094056 bytes, sha256 `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb`. There is still no loose denort sidecar. `file` 5.41 again reported Mach-O 64-bit executable arm64 for both. That header note is not OS/libc acceptance.

The bytes stayed under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step2`. They were not copied onto `PATH` or into a Deno install location. The Homebrew binary at `/opt/homebrew/Cellar/deno/2.9.8/bin/deno` was not hashed again and was not executed. Its previously recorded digest `2e5e5177a25d6a89847f229996fc8f104db8985356f7608067de7a59a42059fe` remains a different identity.

## 2026-11-01 re-acquisition — step 3 checker inputs

Status: step 3 re-acquired the official darwin-arm64 `deno` and `lib.deno.d.ts` because the step 2 temp tree had been removed. This is not a new pin, not build provenance, and not checker completion. `denort` and the other platform archives were not downloaded. The binary was not executed.

Commands started at `2026-11-01T21:56:05Z` on Darwin arm64, macOS 27.0.1, build `26A434`. Superman HEAD was `62c8495aeffa33d827c481e661f6083f8bc718d4` on `spec/superman-v0`. `gh` 2.103.3 downloaded only:

| File | Local sha256, also the attestation subject |
|---|---|
| `deno-aarch64-apple-darwin.zip` | `9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` |
| `deno-aarch64-apple-darwin.zip.sha256sum` | `1ca4234e7c94173c442249c0399070cdce09cc841092c0a6d205101bbde7dca3` |
| `deno-aarch64-apple-darwin.sha256sum` | `4e72750a8ca8de982942967718e1af6a32f3107f91b4ddbbcef49be371ee5f8a` |
| `lib.deno.d.ts` | `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a` |

All four `gh release verify-asset v2.9.8 --repo denoland/deno --format json` commands exited 0. Each predicate was `https://in-toto.io/attestation/release/v0.2`. The zip sidecar payload matches the zip hash. The loose sidecar names `deno` and matches the extracted hash below.

Extracted `deno` was 81512928 bytes, sha256 `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba`, mode `rwxr-xr-x`. No `chmod` was required. It was not copied onto `PATH` or into a Deno install location. Homebrew `deno` was not executed.

The approved declaration walk stops before any `cli/tsc/dts` fetch. The published asset has 54 `/// <reference` lines, 21 distinct `lib` names, and no `path` references. The approved adapter target is `lib.<name>.d.ts`. Twelve names have no file of that name in `cli/tsc/dts` at `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`. The same listing has a different underscore name. Those underscore files were not fetched and are not substitutes.

| `lib` name | Approved filename, absent | Listed filename, not used |
|---|---|---|
| `deno.broadcast_channel` | `lib.deno.broadcast_channel.d.ts` | `lib.deno_broadcast_channel.d.ts` |
| `deno.cache` | `lib.deno.cache.d.ts` | `lib.deno_cache.d.ts` |
| `deno.canvas` | `lib.deno.canvas.d.ts` | `lib.deno_canvas.d.ts` |
| `deno.console` | `lib.deno.console.d.ts` | `lib.deno_console.d.ts` |
| `deno.crypto` | `lib.deno.crypto.d.ts` | `lib.deno_crypto.d.ts` |
| `deno.fetch` | `lib.deno.fetch.d.ts` | `lib.deno_fetch.d.ts` |
| `deno.net` | `lib.deno.net.d.ts` | `lib.deno_net.d.ts` |
| `deno.url` | `lib.deno.url.d.ts` | `lib.deno_url.d.ts` |
| `deno.web` | `lib.deno.web.d.ts` | `lib.deno_web.d.ts` |
| `deno.webgpu` | `lib.deno.webgpu.d.ts` | `lib.deno_webgpu.d.ts` |
| `deno.websocket` | `lib.deno.websocket.d.ts` | `lib.deno_websocket.d.ts` |
| `deno.webstorage` | `lib.deno.webstorage.d.ts` | `lib.deno_webstorage.d.ts` |

These nine approved names are present in that listing: `lib.deno.ns.d.ts`, `lib.deno.shared_globals.d.ts`, `lib.es2015.symbol.wellknown.d.ts`, `lib.es2020.intl.d.ts`, `lib.es2022.intl.d.ts`, `lib.es2025.intl.d.ts`, `lib.esnext.d.ts`, `lib.esnext.disposable.d.ts`, and `lib.node.d.ts`. They were not fetched. The first `deno.net` reference is line 5 of the published asset. The owned temp tree is removed at this stop and is not an install.

## 2026-11-02 re-acquisition — amended Step 3 inputs

Status: André separately approved the revised Step 3 execution packet after the [source-only amendment](gate1-preparation.md#step-3-declaration-input-amendment--2026-11-02). Acquisition and input verification completed, but [strict checker feasibility stopped](../../.superman/ci/bootstrap-evidence.md#2026-11-02--source-only-checker-baseline-blocked). This append does not change the earlier stop, candidate pin status or build-provenance gap.

Owned run intake was `2026-11-02T06:27:04.504575Z`, Superman HEAD `62c8495aeffa33d827c481e661f6083f8bc718d4`, branch `spec/superman-v0`, on macOS 27.0.1 build `26A434`, arm64. The three previously dirty Markdown records and untracked startup probe were captured before any write. Acquisition completed at `06:30:09.703Z` under `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step3-fldy0ns2` (`<owned>` below).

The bounded Node acquisition host made anonymous HTTPS requests without credentials or `gh`. Only these release assets were re-acquired; each payload matched its historical verified release subject:

| Asset | SHA-256 |
| --- | --- |
| `deno-aarch64-apple-darwin.zip` | `9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e` |
| `deno-aarch64-apple-darwin.zip.sha256sum` | `1ca4234e7c94173c442249c0399070cdce09cc841092c0a6d205101bbde7dca3` |
| `deno-aarch64-apple-darwin.sha256sum` | `4e72750a8ca8de982942967718e1af6a32f3107f91b4ddbbcef49be371ee5f8a` |
| `lib.deno.d.ts` | `d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a` |

Both sidecar payloads named the expected zip/member and matched their recorded hashes. The zip contained exactly one regular member, `deno`, 81512928 bytes, mode `0100755`; extracted SHA-256 was **`d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba`**. The executable stayed at `<owned>/tools/deno/deno`, outside installation locations and `PATH`. No denort, other-platform archive, source archive, dependency install or Homebrew Deno execution occurred. Release-origin evidence is reused for identical bytes; there is no fresh attestation-verification or build-provenance claim.

The exact source commit `fe7ed012d92c642fd8e5607ac5a45d517538b5c5` resolves to tree `ad29daf52a8c383f8f6d564979d2056c760471a5`. The non-truncated tree and every acquired file's Git blob were checked. All **209 source files**—202 declarations, three legal files, and four approved compiler/build mechanism files—matched regular mode `100644`, recorded blob hash and size; individual SHA-256 values are in `evidence/acquisition.json`. Deno/Node/Undici license files and inline notices, including MDN attribution, remain intact. This is not a redistribution disposition.

The acquired declaration path set exactly matched inventory SHA-256 **`f41bc544f978ddf9500bc349333a3fdb22434c4cd90934dfe1a5a3b51bffc760`**; the finite map matched **`c6cb237eb62c185b856a6f4a78c8c348c2a07f7861563683f8479def7da984fd`**. Inventory serialization is ASCII-sorted paths relative to `cli/tsc/dts/`, each followed by LF; map serialization is ASCII-sorted `logical-name<TAB>canonical-relative-path<LF>` rows. Independent lexical input verification resolved all 103 lib names, 59 path occurrences and 391 unique caller/import pairs, reaching exactly 202 approved declarations from the two roots. It made 162 active-directive replacements across 57 files, preserving 17 `no-default-lib` directives, existing paths/imports and line counts. Reversing only those edits restored **202/202 originals byte-for-byte**. The release bundle was not a compiler input. Its seventeen-component source reconstruction again matched all 721335 bytes exactly; binary `deno types` identity is recorded with the checker observations, not inferred from this source reconstruction.

Measurement artifacts remain under `<owned>` for review. `evidence/acquisition.json` SHA-256 is **`99e149da60701fae53c2953406b38dcf7d18fb535d28557ae31388c586c4e4e2`**; `evidence/input-verification.json` is **`7dc22aa1b9ffa59f336b9ce417c4777de62b401c99f73f89b04923fd501d4d88`**. The frozen 42-file measurement index, `evidence/evidence-index.json`, has SHA-256 **`0b560bbc09a9cbb734549b3787f106dba621c2014f1cd8f2a90f86d7c4336923`** and binds the scripts, fixture/configuration bytes, raw command logs and scoped results. These input proofs do not close the checker failures or Step 3.

## 2026-11-02 re-acquisition — step 6 denort input

Status: bounded re-acquisition of the official darwin-arm64 `denort` because the step 2 temp tree was gone and no retained copy matched the step 1 hash. This is not a new pin, not build provenance, not proof that a compile consumed this file, and not execution. The other four platform archives, `libdenort`, and `deno` were not downloaded. Homebrew `deno` was not executed.

Commands ran on Darwin arm64, macOS 27.0.1, build `26A434`. Superman HEAD was `62c8495aeffa33d827c481e661f6083f8bc718d4` on `spec/superman-v0`. `gh` 2.103.3, sha256 `258d12a00ca7939294c4b9a977eae72dc74882f8c4293012126f8d2da27e9d2e`, downloaded only:

| File | Local sha256, also the attestation subject |
|---|---|
| `denort-aarch64-apple-darwin.zip` | `0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483` |
| `denort-aarch64-apple-darwin.zip.sha256sum` | `d1a9c498c490faf655b57bc8a686c49261c72f3c239dbf5ee281e988f96c3de3` |

Both `gh release verify-asset v2.9.8 --repo denoland/deno --format json` commands exited 0. Each statement was `https://in-toto.io/Statement/v1` with predicate `https://in-toto.io/attestation/release/v0.2`, package `pkg:github/denoland/deno@v2.9.8`, repository `denoland/deno`, and tag `v2.9.8`. The verified identity SAN was `https://dotcom.releases.github.com`. The timestamp authority was `timestamp.githubapp.com` at `2026-10-21T15:28:54Z`. No SLSA predicate was present. Certificate bytes are not copied here. The statement names both downloaded subjects; it also names other release subjects that were not downloaded.

The sidecar payload is `0d44d476ffcb0406771ed62eca9da8a9bc12b2f0b4a2c7b477b5303809c5b483  denort-aarch64-apple-darwin.zip\n`. The zip contained exactly one member, `denort`, 68094056 bytes. Extracted SHA-256 was **`f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb`**, mode `0755`. There is still no loose denort sidecar. The executable stayed at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step6/acquire/denort`, outside installation locations and `PATH`. It was not executed. The retained deno at `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step4/bin/deno` was not replaced; its previously checked sha256 remains `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba`.

The later step 6 probe did execute these two binaries. That execution is recorded in [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--temporary-compileasset-substrate). The binary whose native stdout matched the fixture asset was 68160098 bytes, sha256 `ea03ab9ffeadf4e100a4d542a63642bf6e6690956f6f4b45e61847b9f4f499fb`, bound to measured entry sha256 `f2b3c944a9f3aa03547629034c09d1a3ff4b4f6799663307962e583b614bf46e`. Earlier compiles of the same inputs had the same size and different digests, so this is not a reproducibility claim. It does not accept a pin or close build provenance.

## 2026-11-02 step 1 closure — source archive and declaration closure

Status: this append completes the bounded step 1 verification at preparation scope. It records source-archive byte identity, the published declaration asset's component/reference/license closure, and read-only target constraints. It does not accept a pin, close Q1/Q3 build provenance, close §8.4, execute a candidate in this slice, activate an evaluator, or admit ticket 01. The detailed command log and supporting JSON are in [bootstrap evidence](../../.superman/ci/bootstrap-evidence.md#2026-11-02--step-1-closure-verification).

### Source archive

`deno_src.tar.gz` was acquired with `gh release download v2.9.8 --repo denoland/deno --pattern 'deno_src.tar.gz*' --dir /private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step1-closure/src`. It is **37,035,922 bytes**, sha256 **`b57d0281c1647effc735f242ba52bc409747fc6ed6ad4946e76f062c67e113eb`**, matching the attested subject of the same name. `gh release verify-asset v2.9.8 /private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step1-closure/src/deno_src.tar.gz --repo denoland/deno --format json` exited 0. The statement is `https://in-toto.io/Statement/v1` with predicate `https://in-toto.io/attestation/release/v0.2`, package `pkg:github/denoland/deno@v2.9.8`, repository `denoland/deno`, and tag `v2.9.8`. The release statement names 57 subjects; the source-archive subject digest is the local hash above. The verified identity SAN is `https://dotcom.releases.github.com`; the timestamp authority is `timestamp.githubapp.com` at `2026-10-21T15:28:54Z`. No SLSA predicate was present. No `deno_src.tar.gz.sha256sum` sidecar was present in the release asset set.

`cli/Cargo.toml` inside the archive carries `version = "2.9.8"`. Its Git blob is `641611f416cd79a2ab4a02cc82fcd5ed4eaca9e7`, matching the Git tree at `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`.

Selected members were streamed from the archive to stdout and hashed; no member was written to disk. The last column is the `acquisition.json` record match; the three legal files are separate records, not entries in the 202-declaration inventory.

| Member | Local sha256 | Git blob | Tree match | Acquisition match |
|---|---|---|---|---|
| `Cargo.toml` | `71b1e43ad42b8816daab3da366f7852310277cf28f8e873e55f14830263961a0` | `aeed19fab875c5e26dd45573755269bbd24d9121` | yes | — |
| `cli/Cargo.toml` | `ac2ca211c59b910c2b05ecd9ecdd28b3b6b529a29c8002a19695b75e5a669de4` | `641611f416cd79a2ab4a02cc82fcd5ed4eaca9e7` | yes | — |
| `LICENSE.md` | `f62497fffecc0852960c8d3e6934b9db86d16396e9b604072e923892cae3a588` | `b641c75c0b04ccfddcb1145d2554ab49b6ca9411` | yes | yes |
| `cli/tsc/dts/lib.deno.ns.d.ts` | `8e8348a4c8762c5cedfe4c9b9673ba01f79ea49b9f1d3b9a91bbe2e69c316504` | `35a6b7eba3e160e303f1942d78dfbbc6657d48cf` | yes | yes |
| `cli/tsc/dts/lib.deno.window.d.ts` | `65deeb96e59b827bda5fcbeb999c0b8ded931870abb40e7a5b1a58623c46d6ae` | `c60c09feb60da1f0f718454e4ac0c21915cce8e6` | yes | yes |
| `cli/tsc/dts/lib.deno.unstable.d.ts` | `5993271718a0562ea8725884c12d0cd5f97c5e7174cede5540899fee529b4b6a` | `def49f214dff277d1614e5c579e52db6f17284c1` | yes | yes |
| `cli/tsc/dts/node/LICENSE` | `c2cfccb812fe482101a8f04597dfc5a9991a6b2748266c47ac91b6a5aae15383` | `9e841e7a26e4eb057b24511e7b92d42b257a80e5` | yes | yes |
| `cli/tsc/dts/node/undici/LICENSE` | `a6db8096b2707bc0102d256917d4d33f298ba36d8c3f25de067a2b5bb379db27` | `e7323bb52ec35279e2df7d728a6dd5a10b99afd8` | yes | yes |

The archive is **not** a byte-exact export of the commit tree. It has 22,101 entries (17,632 files, 4,469 directories); the non-truncated tree at the named commit has 19,232 entries (14,903 blobs, 4,324 trees, 5 submodule commits). **46 tracked metadata/test-fixture blobs are absent**: `.github/**`, `.gitattributes`, `.gitignore`, `.gitmodules`, and `.gitkeep` files. **2,775 extra files are present**, all under the `tests/util/std` submodule path; zero extra files are unattributed. The five submodule gitlinks are `tests/bench/testdata/lsp_benchdata` `a7874340…`, `tests/node_compat/runner/suite` `f287abd8…`, `tests/util/std` `9c5b7101…`, `tests/wpt/suite` `c937f9d2…`, and `tools/lzld` `cbf98cf0…`; only `tests/util/std` contributes files, and the other four submodule trees are empty in the archive. The 2,775 files are the archive's `tests/util/std` subtree; their content was not matched file-by-file to the `9c5b7101…` gitlink. The directory comparison is 4,469 archive directories versus 4,329 tree directories/gitlinks: four `.github` directories absent, 143 extra directories under `tests/util/std`, and the archive root; zero unattributed extra directories. Those differences are outside the declaration/compiler input set. The declaration and legal members used below are present and match their `acquisition.json` records, so this is a source-archive packaging boundary, not a declaration-input gap.

### Published declaration closure

The published asset `lib.deno.d.ts` is **721,335 bytes**, sha256 **`d474c1436452815395b60b5913cc2687560e23159f15b2dcaccb6e4bff09b25a`**. The attested darwin-arm64 binary's `deno types` stdout has the same size and hash.

The asset contains 54 `/// <reference` directives: 16 `no-default-lib="true"` and 38 `lib` directives naming 21 distinct targets. It is exactly the 17 release components concatenated in the recorded order with one `\n` separator between components: 721,319 component bytes + 16 separator bytes = 721,335 bytes. Every component starts at the expected contiguous offset.

| # | Component | Source | Bytes | SHA-256 | Offset |
|---:|---|---|---:|---|---:|
| 1 | `deno.ns` | `lib.deno.ns.d.ts` | 229839 | `8e8348a4c8762c5cedfe4c9b9673ba01f79ea49b9f1d3b9a91bbe2e69c316504` | 0 |
| 2 | `deno.console` | `lib.deno_console.d.ts` | 6365 | `28db5d664ef4451e1c2c520b4a10336c275add9a740b53b3eeb63c052980ce97` | 229840 |
| 3 | `deno.url` | `lib.deno_url.d.ts` | 28096 | `34b36a51db5d10fcb509e12c7c7a22272cc1230b67e2cda31521ae411af7e3fc` | 236206 |
| 4 | `deno.web` | `lib.deno_web.d.ts` | 98164 | `dc26fb30cf8d2a23db534c335491b22ecab03d05d8ac573b155d46b2fca7d7d1` | 264303 |
| 5 | `deno.fetch` | `lib.deno_fetch.d.ts` | 16365 | `5487bfb2636096851007b5fd1b57d2bef9317ccb17ae66c725eaa44fef559435` | 362468 |
| 6 | `deno.webgpu` | `lib.deno_webgpu.d.ts` | 41688 | `cf8488b888b6c29c8bda1f7129e1d77fd7f299b22a0d7eadd035cad48bb1a662` | 378834 |
| 7 | `deno.websocket` | `lib.deno_websocket.d.ts` | 10954 | `a523a4cec5c6909f9fff1798e21a49dabf36e64f619cf6f0635fe56caf0319c5` | 420523 |
| 8 | `deno.webstorage` | `lib.deno_webstorage.d.ts` | 2076 | `1a9528f05d15fa448b9b4d0fd2295cf98a8b66400248e3ff9f0bf3fbb34dd49f` | 431478 |
| 9 | `deno.canvas` | `lib.deno_canvas.d.ts` | 9759 | `d2799497f1fc7c6ae9ea59666c84e7ed253d4b2893c50cf454e1360958ed1291` | 433555 |
| 10 | `deno.crypto` | `lib.deno_crypto.d.ts` | 20256 | `b7deddab4103d60043f869cd2532571bd496ba37e623b779733114de824b342d` | 443315 |
| 11 | `deno.broadcast_channel` | `lib.deno_broadcast_channel.d.ts` | 2348 | `b86ebfee46d72bdb537b64f9cb459e1af87de6aa0c66d1d13578f9c62c1fd9a2` | 463572 |
| 12 | `deno.net` | `lib.deno_net.d.ts` | 37460 | `6444509e83bfb0de78e4c435ceb8b9f33f4fe12f2540b2bbf618ddc210da75a9` | 465921 |
| 13 | `deno.shared_globals` | `lib.deno.shared_globals.d.ts` | 37204 | `dd15d55184d1158f1bcdf849f392293ca2dbfac6f2918f780b90b6fc0607bda4` | 503382 |
| 14 | `deno.cache` | `lib.deno_cache.d.ts` | 4125 | `50566f60b3f769e542e2794a1649ac3efd261bb9c1ef818c838cef7544d9daca` | 540587 |
| 15 | `esnext.temporal` | `lib.esnext.temporal.d.ts` | 22011 | `4ffedae1d1c2d53fdbca1c96d3c7dda544281f7d262f99b6880634f8fd8d9820` | 544713 |
| 16 | `deno.window` | `lib.deno.window.d.ts` | 18455 | `65deeb96e59b827bda5fcbeb999c0b8ded931870abb40e7a5b1a58623c46d6ae` | 566725 |
| 17 | `deno.unstable` | `lib.deno.unstable.d.ts` | 136154 | `5993271718a0562ea8725884c12d0cd5f97c5e7174cede5540899fee529b4b6a` | 585181 |

All 21 referenced targets resolve through the 103-name map into the 202-file inventory. Fourteen are embedded Deno targets. Seven are external: `es2015.symbol.wellknown`, `es2020.intl`, `es2022.intl`, `es2025.intl`, `esnext`, `esnext.disposable`, and `node`. The inventory includes 85 `lib.es*.d.ts` files. The `node` target resolves to `lib.node.d.ts`, which references the external Node/Undici closure: **58 Node `.d.cts` files plus 40 Undici `.d.ts` files = 98 files**.

All 202 declaration files re-hash against `acquisition.json`; the same run also re-hashes the 3 legal records and 4 mechanism records (209 total: `cli/build.rs`, `cli/tsc/00_typescript.js`, `cli/tsc/99_main_compiler.js`, `cli/tsc/mod.rs`), and the 103-name map and two roots are unchanged. The three legal files are MIT:

| Legal file | Bytes | SHA-256 |
|---|---:|---|
| `LICENSE.md` | 1074 | `f62497fffecc0852960c8d3e6934b9db86d16396e9b604072e923892cae3a588` |
| `cli/tsc/dts/node/LICENSE` | 1141 | `c2cfccb812fe482101a8f04597dfc5a9991a6b2748266c47ac91b6a5aae15383` |
| `cli/tsc/dts/node/undici/LICENSE` | 1090 | `a6db8096b2707bc0102d256917d4d33f298ba36d8c3f25de067a2b5bb379db27` |

The asset carries the Deno MIT notice at offset 3 in `deno.ns`; the MDN/Mozilla CC-BY-SA 2.5 attribution at offset 503519 (line 15878) in `deno.shared_globals`; the Microsoft copyright line at offset 544795 (line 17133); and the Apache-2.0 text at offset 544872 (line 17134), both in `esnext.temporal`. That is the declared origin/closure/license inventory for the published asset; it is not a redistribution disposition.

### Target constraints

Read-only metadata inspection; no candidate binary was executed in this slice. The macOS values come from `LC_BUILD_VERSION` on the retained verified Mach-O binaries. The Linux values come from ELF program/section metadata on the re-acquired attested zips.

| Binary | SHA-256 | Format | Interpreter | ABI note | Highest required GLIBC | BuildID |
|---|---|---|---|---|---|---|
| `deno` (macOS arm64) | `d1e99265e5e6ee096c5780d88ff7d3e6cfdf33b1953a118b4889cab8ca6980ba` | Mach-O 64-bit arm64 | — | macOS minos 12.0, SDK 14.5 | — | — |
| `denort` (macOS arm64) | `f0003b0441a483f4a88ef18342549ee38ff76d829b48c9f51b43df911e780cfb` | Mach-O 64-bit arm64 | — | macOS minos 12.0, SDK 14.5 | — | — |
| `deno-x86_64-unknown-linux-gnu` | `368bca08999e02c6911b8f248167b582276b1f547db5712b6e736d7eda1dbda7` | ELF64 LSB PIE, x86-64 | `/lib64/ld-linux-x86-64.so.2` | Linux 3.2.0 | `GLIBC_2.27` | `9917388c8356b25023811735fad924d7e14497f1` |
| `deno-aarch64-unknown-linux-gnu` | `b484f780e5149ca05c673f1f79f7fb466f12a2295933bdad917af4a8a5c020e8` | ELF64 LSB PIE, aarch64 | `/lib/ld-linux-aarch64.so.1` | Linux 3.7.0 | `GLIBC_2.27` | `b73e940197519f44edfa911f6880f1fde9aafa99` |
| `denort-x86_64-unknown-linux-gnu` | `7b91d3d117804c0ebe05ac017a3430e0f09d9ab05b588ff0bda6f514dd0a4f2d` | ELF64 LSB PIE, x86-64 | `/lib64/ld-linux-x86-64.so.2` | Linux 3.2.0 | `GLIBC_2.27` | `279ce08d8e8e963e8c8c47439a2a17cc68f8ac6c` |
| `denort-aarch64-unknown-linux-gnu` | `bab7bc2f98ff656f335712f064b97bdedfa243d4a59ada40bd30b48e268db01b` | ELF64 LSB PIE, aarch64 | `/lib/ld-linux-aarch64.so.1` | Linux 3.7.0 | `GLIBC_2.27` | `051c5bba4bf776c5f916d313f6ab65c20612d5c7` |

`GLIBC_2.27` is the highest versioned symbol required by `.gnu.version_r`; it is not a tested runtime floor. The `GNU/Linux 3.2.0`/`3.7.0` values are `.note.ABI-tag` kernel notes, not glibc floors. Linux `DT_NEEDED` includes `libc.so.6`, `libgcc_s.so.1`, `libdl.so.2`, `libpthread.so.0`, `libm.so.6`, and (x86-64 only) `librt.so.1`, and the recorded `ld-linux` interpreter. musl, Windows, macOS x86_64, and every other target are not covered. No Linux or macOS execution at these minima was performed.

### Commit signature

GitHub's commit API reports `verified=true`, `reason=valid`, `verified_at=2026-10-21T11:47:22Z` for `fe7ed012d92c642fd8e5607ac5a45d517538b5c5`. The signature is PGP (`-----BEGIN PGP SIGNATURE-----`, 801 bytes, sha256 `79420e41a249d17c7349da5c5ed5e71509544dbb9edd12cb49175d1bb24a8def`); the payload is 401 bytes, sha256 `1b35f7a69a3f562d7a4c741340c38c0469c745d8e557f3c6e24b52a5d8c0c81a`. Local verification was **not** performed: `gpg` is not installed, installation is prohibited, `ssh-keygen` verifies SSH signatures only, and no signer public key was fetched. This is a recorded API-only limit, not a local cryptographic check.

### Limits

- Release-origin verification is not SLSA/build provenance. No SLSA predicate was present; the package subject is a Git SHA-1.
- The source archive is a release-packaged source tree, not a byte-exact export of the commit tree; the 46 absent tracked metadata/test-fixture files, 2,775 `tests/util/std` submodule files and the directory delta are recorded above.
- The declaration closure covers the published `lib.deno.d.ts` and the 202-file inventory; it is not a redistribution disposition or a build-provenance finding.
- Target constraints are header/metadata facts, not native execution acceptance.
- The commit signature remains GitHub-API-only.
- No pin, Q1/Q3 closure, §8.4 closure, Gate 1 closure, evaluator activation, installation, candidate execution or ticket 01 admission follows. No declaration was edited.

## 2026-11-02 — Step 3 D1 derived representation

The approved external-D1 packet produced a derived 202-file declaration corpus under the owned root `T1` `/private/var/folders/r6/yb6jhjqs3_xf1l3zwhdcnr6m0000gn/T/opencode/superman-gate1-step3-d1.9WHBCb`. The immutable 202 originals and existing 162-edit adapted tree came from the retained `T0`; the release bundle remained identity-only.

The derived manifest records **272 edits across 89 files**: 162 directive replacements/57 files; 100 Undici module literals/30 files; 10 realm guards/2 files. It preserves the 17 `no-default-lib` directives and canonical deduplication. No other span was introduced; `noOtherSpans:true`; `releaseBundleLoaded:false`. Reversing only those spans restored **202/202** originals byte-for-byte with zero mismatches.

| Artifact | SHA-256 |
| --- | --- |
| `derived-manifest.json` | `404f2d944928419dda52c1b970f321bc0a1f9e0164567ac993a3349402cb7461` |
| `reversal.json` | `8ee4f90cbf92b95285ca8a0c4c2e0d3879ed53fbd8cf093f621d1188aa0ee983` |
| `preflight.json` | `a693ca689ee32a7416d77e05ac854c072138194c4269f25941fcac7f0180864c` |
| Adapted declaration tree | `52cf1f56e2265d5899e71e11e7e4fa5ced171b8b00c21f52285e9f6f7743034f` |
| Derived declaration tree | `c0527affba309a19947a225d26a4871b8a756ae6e571c2d42d76c1ed595e50d8` |
| Manifest identity | `3bba054913b9bc7b58cf5254a72de04112e9e8bcdfd19fe375cbea6f2fa0b575` |

The external valid baseline under the derived roots passed primary tsrs and matching tsc with 0 diagnostics and exactly 204 loaded files (202 declarations plus the two subject files). Native Deno exited 0 but ignored `skipDefaultLibCheck:false`, so S3-B2 remains open and no native profile or Step 3 closure is claimed. The invalid/transitive controls were not credited after that stop. This append records a derived-input measurement, not redistribution, pin, Gate 1 or ticket 01 acceptance.
