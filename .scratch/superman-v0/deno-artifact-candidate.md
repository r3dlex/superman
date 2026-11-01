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
