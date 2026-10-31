# Runner research — Gate 1 supporting evidence

Observed on **2026-10-31**, beginning **10:15:38Z**; initial release-index snapshot **10:19:14Z**, with parent rechecks at **10:22–10:24Z** below. Public, anonymous HTTPS metadata/source reads only. This note is **research, not approval, deployment inventory or activation authority**. No routing, credentials/settings, infrastructure, images/assets, ticket 01 or other repository files were changed; no provisioning, builds, artifact downloads or hosted writes were performed.

**Result:** latest public stable `actions/runner` is **2.338.2**; the native runner wrapper on `main` and all four inspected newer proposal/probe heads still defaults to **2.334.0**. There are newer public proposals than `main`, including a separate ARM64 Archgate probe. Public job assignments establish some historical runner names/groups, not Superman access or an approved disposable-worker deployment.

## 1. Versions and revision boundaries

The public repository is **GitHub** [`r3dlex/github-runners-for-repo`][repo], not GitLab. Default branch `main` was `8e878b1de0b29d58f58887d9b702ce91901d7b70`, committed **2026-10-28T08:03:50Z**. Repository `pushed_at` was **2026-10-31T10:14:23Z**. Anonymous [releases][repo-releases] and [tags][repo-tags] both returned `[]`; `pyproject.toml`'s **0.1.0** is source package metadata, not an observed release. The exact-name [PyPI lookup][pypi] returned HTTP 404. [Sources: main commit][main-commit], [package metadata][package].

Public [branch][branches] and [PR][pulls] snapshots, refreshed at 10:22Z, distinguished these available revisions:

| Revision | Exact observed head | Status / relevant proposal |
| --- | --- | --- |
| `main` | `8e878b1de0b29d58f58887d9b702ce91901d7b70` | Merged native CLI; persistent host/service model |
| `feat/provision-github-cli`, [PR #30](https://github.com/r3dlex/github-runners-for-repo/pull/30) | `f0072d49a95e95710c28a611866a04957fbb1580` | Open, unmerged; GitHub CLI provisioning; `GH_VERSION=v2.103.3` |
| `feat/runner-disk-cleanup-and-timeouts`, [PR #31](https://github.com/r3dlex/github-runners-for-repo/pull/31) | `37d772e8dcb323448cad52f90444045d7525f958` | Open, unmerged; runner-home discovery, liveness rechecks and cache cleanup |
| `feat/runner-health-all-tiers`, [PR #33](https://github.com/r3dlex/github-runners-for-repo/pull/33) | `fa89cc3943ced2458a0ab876ff9c4efadabe6ed7` | Open, unmerged; tier-specific platform/disk/liveness probes |
| `probe/archgate-arm64-build` (latest observed) | `d1f126572cf43ab57254122e61a6385dedef8748` | No PR in the observed list; committed **10:19:55Z**, one commit after the earlier probe; changes latency measurement scheduling, not a runner/image release. [Commit][probe-new-commit], [delta][probe-delta] |
| Earlier retained probe snapshot | `2176507584811282e94dd287720cbb53c8aa134e` | Committed **10:14:21Z**, [three commits ahead of main][probe-compare]; its failed run remains historical evidence |

The runner default is unchanged at **2.334.0** in [main][native], [#30][native-30], [#31][native-31], [#33][native-33], [the earlier probe][native-probe] and [the latest observed probe][native-probe-new]. Native `gh-runners install --version VER` selects another official version; it does not establish compatibility, approval or the application version actually running. Main installation downloads/extracts without checksum verification. Main provisioning defaults to **Node major 22** and **Archgate v0.60.0**, not Superman's Node 26 / Archgate 0.61.0. PR #30 retains those defaults; its proposed `gh` **2.103.3** matches the [latest public stable GitHub CLI release][gh-release], published **2026-10-26T19:20:08Z**. [Provisioning source][provision], [PR #30 source][provision-30].

An **older retained Docker solution** exists on `feat/org-level-runner-support` at `48f0d30e0fed64dfbd5731ccf1f87afcd033f121` (**2026-06-06T15:46:36Z**), not current main: [`runner/Dockerfile`][legacy-docker] uses **`ubuntu:22.04`**, **`RUNNER_VERSION=2.321.0`**, **`TARGETARCH=x64`**; [Compose][legacy-compose] builds locally and uses `restart: unless-stopped`. This is historical source availability, not proof of a published image, newer proposal, immutable pin or disposable worker.

### Upstream runner releases

GitHub's [latest-release API][runner-latest] returned stable **`v2.338.2`**, published **2026-10-26T14:45:12Z**, at tag commit **`d1eb12d4b115c301201de27d667284e1a80f2ab5`** ([tag resolution][runner-tag]). The recent [release list][runner-releases] also contains **2.338.1**, published October 22, explicitly **prerelease**, and stable **2.338.0**, published October 6. The repository's pinned **2.334.0** remains a public [April 21 release][runner-old].

Relevant 2.338.2 assets are `actions-runner-osx-arm64-2.338.2.tar.gz`, `actions-runner-linux-x64-2.338.2.tar.gz` and `actions-runner-linux-arm64-2.338.2.tar.gz`; Windows x64/arm64, macOS x64 and Linux arm assets also exist. The [release][runner-release] warns that progressive rollout can make the latest version unavailable to a particular organization/repository. Thus **latest public release ≠ Superman-authorized version ≠ installed fleet version**. GitHub documents automatic runner updates by default, and a 30-day update requirement when automatic updates are disabled; indefinitely freezing the old source default is not a security lifecycle. [Official reference][self-hosted-reference].

The parent independently rechecked `/releases/latest` at **10:22:40Z**: **2.338.2**, stable/non-draft, with the same publication date; manager main and its empty release/tag lists were unchanged. The release API advertises these archive identities (metadata only, **bytes not downloaded or verified**, not image/fleet approval):

| 2.338.2 archive | API-advertised SHA-256 |
| --- | --- |
| `actions-runner-osx-arm64-2.338.2.tar.gz` | `25a065af409ffa317ab4d5a3b614dd15fc9c40f2172bc1b35a1b1258e919a388` |
| `actions-runner-linux-x64-2.338.2.tar.gz` | `baebf204307bac6193480852732f0aba2ae97b6c5597c244f4d5558390147c40` |
| `actions-runner-linux-arm64-2.338.2.tar.gz` | `670adb2f268fe21dcbb58b3db0e0aa9d5b3bddfe2c651481336e561ff86de945` |

## 2. Concrete names/selectors: observations versus proposals

Anonymous public job metadata independently corroborated the parent's two main-branch assignments and two newer probe assignments:

| Public run / attempt / job | Recorded assignment | Job-requested labels | Observed execution/result |
| --- | --- | --- | --- |
| [41175485646 / 1 / 124462043304][job-3] | ID **117**, **`r3dlex-runner-3`**; group **1**, exactly **`default`** | `self-hosted`, `ubuntu-latest` | **2026-10-31 06:10:19–06:10:26Z**, heartbeat success; main head `8e878b1…` |
| [41126704453 / 1 / 124306979103][job-4] | ID **118**, **`r3dlex-runner-4`**; group **1**, exactly **`default`** | `self-hosted`, `ubuntu-latest` | **2026-10-30 20:53:04–20:53:10Z**, heartbeat success; same main head |
| [41191935183 / 1 / 124510317292][job-probe] | ID **204**, **`r3dlex-linux-arm64-1`**; group **1**, exactly **`default`** | `self-hosted`, `Linux`, `ARM64`, `r3dlex-linux-arm64` | **2026-10-31 10:14:29–10:17:25Z**, **failure** at Archgate's own test suite; head `2176507…` |
| [41192313096 / 1 / 124511414201][job-probe-new] | ID **206**, **`r3dlex-linux-arm64-4`**; group **1**, exactly **`default`** | `self-hosted`, `Linux`, `ARM64`, `r3dlex-linux-arm64` | **2026-10-31 10:20:02–10:21:55Z**, **failure** at the isolated latency-budget tests; latest observed head `d1f1265…` |

Sources: [main job metadata 1][jobs-3], [main job metadata 2][jobs-4] (observed **10:17:17Z**), [earlier probe metadata][jobs-probe] (**10:17:40Z**) and [latest probe metadata][jobs-probe-new] (parent recheck **10:23Z**). These are **historical assignments**, not four simultaneously available workers or proof of distinct hardware. The labels are requested matching constraints, **not complete registered label inventories**; groups are those recorded for these jobs, not a current authorization read. They establish neither present online/capacity status nor Superman repository/workflow/public-PR access. Both failed probes' binary-build, checksum/package and upload steps were **skipped**; neither supplies a successful ARM64 distribution or approved image. The latest probe also skipped its canonical full-suite and later serial-suite steps after the early latency failure; its changed verification ordering is not adopted as Superman policy.

The [probe recipe][probe] targets **Archgate 0.61.0**, pinned upstream commit **`f65d99f56d02757cca94d53f6d717333770e0170`**, and declares a **Bun 1.4.4** fallback package (it may instead use an already installed Bun). Those are proposed build inputs, not proof of the runtime tool versions or a released/approved asset.

Main [AGENTS.md][main-guidance] **documents** `r3dlex-runner-3` / `r3dlex-runner-4` as `aarch64` in a persistent **Colima VM** with shared host storage. Treat that topology as a source claim, not an independently inspected deployment. In particular, custom label `ubuntu-latest` does **not** establish x64, the GitHub-hosted Ubuntu image, or a disposable worker.

PR #33's [pinned workflow][tiers] proposes these additional exact selectors; its `tier` strings are matrix names, **not runner groups**:

| Proposed tier | Exact `runs-on` labels | Expected platform |
| --- | --- | --- |
| `mac-arm64-primary` | `[self-hosted, macOS, arm64-primary]` | Darwin / arm64 |
| `linux-arm64-standard` | `[self-hosted, Linux, arm64-standard]` | Linux / arm64 |
| `linux-x64` | `[self-hosted, Linux, X64]` | Linux / x64 |

Its [actionlint declaration][tier-labels] additionally names `r3dlex-org`, `r3dlex-linux-arm64`, `mac-arm64`, `dpua-validation`. A lint declaration or expected platform is **not** registration, liveness or access evidence. The probe [source][probe] comments name `r3dlex-linux-arm64-1..4`; only **-1** and **-4** were corroborated by the sampled assignments, not four available runners. At **10:24:07Z**, the [branch-filtered health-run list][tier-runs] returned only an older failed run `41187871709` at head `ef81b7e…`; it supplies no run evidence for PR #33's current `fa89cc3…` tier proposal.

Important source discrepancies and limits:

- [Executable config][config] defaults to **`self-hosted,linux,x64`**, while [`.env.example`][env] / README show **`self-hosted,linux,x64,r3dlex-org`**. `RUNNER_COUNT=4` is configuration, not measured capacity. Configured/example group **`Default`** must not be substituted for observed job group spelling **`default`**. An extra registered label is not access control against a workflow requesting only `self-hosted`.
- `runner_image="github-runner:latest"` / `RUNNER_IMAGE` survives in config, but the [native manager][native] does not use it. Current main's [complete tree][main-tree] has no Dockerfile/Compose recipe; its [architecture][architecture] explicitly describes direct host execution. The legacy string is **not a published or approved image**.
- Native configure calls the short-lived **registration-token** endpoint and `config.sh`; it does not expose `--ephemeral`, call `generate-jitconfig`, or manage per-job VM destruction. Documentation's “JIT token” wording does not establish actual JIT worker configuration or isolation. [Native implementation][native], [CLI][cli].
- Main's [test workflow][main-test] uses `continue-on-error` and runs hosted checks after **any** self-hosted failure. It is not queue failover and must not be copied as Superman's fail-closed fallback contract. GitHub matches all requested labels/groups; unmatched jobs queue, with failure after 24 hours—not automatic hosted substitution. [Routing reference][self-hosted-reference].

## 3. Named public building blocks — not adopted/approved solutions

These are candidates to evaluate separately, **not evidence that r3dlex has deployed them**:

| Public building block | Exact available name/version/provenance | Remaining boundary |
| --- | --- | --- |
| Official Linux runner container | **`ghcr.io/actions/actions-runner:2.338.2`**; public [package version 1448530890][runner-image]; [recipe at runner release commit][runner-docker] | Linux amd64/arm64, not macOS; a container alone does not prove host/job isolation. Published digest below is **not an approval**. |
| Actions Runner Controller (ARC) | Stable **`gha-runner-scale-set-0.15.1`**, published **2026-10-23T15:27:31Z**; commit **`23159a8e2d70ca4cece740fe43a8d9eb0c2818de`**. Charts **`gha-runner-scale-set-controller`** and **`gha-runner-scale-set`**, under `oci://ghcr.io/actions/actions-runner-controller-charts/`. [Release][arc-release], [pinned values][arc-values] | Kubernetes/control-plane deployment required; documentation's **`runs-on: arc-runner-set`** is an example installation name, not a live r3dlex selector. The default image is moving `:latest`; DinD values include privileged execution. Neither implies Superman compliance. [Quickstart][arc-quickstart] |
| GitHub Actions Runner Scale Set Client | **`github.com/actions/scaleset` v0.5.0**, published **2026-10-23T12:28:53Z**; commit **`af394d86c0d5024225238b0209043c70193bcfe6`**. **Public Preview**; includes `GenerateJitRunnerConfig` and `examples/dockerscaleset`. [Release][scaleset-release], [pinned README][scaleset] | A client for custom VM/container/process lifecycle, not a prebuilt isolated worker service. `my-scale-set` is the documented example routing name; operator must implement creation/destruction, access and isolation. |
| Tart VM toolset on Apple Silicon | Latest stable **2.41.1**, published **2026-10-15T14:38:26Z**; canonical repository now **`openai/tart`** (old `cirruslabs/tart` API redirects). Commit **`543453404cd1b15c1338b6b70e162d000c8ba5e2`**; README's concrete template is **`ghcr.io/cirruslabs/macos-tahoe-base:latest`**. [Release][tart-release], [pinned README][tart] | VM tooling/template example, not GitHub registration or an at-most-one-job lifecycle. Template digest/publication and suitability/licensing/security review were not verified; moving `latest` is not an approved VM identity. |

Public GitHub package metadata maps runner image **2.338.2** (also `latest` at observation) to these identities; **no registry login/token, manifest/layer pull or image execution** was used:

| Identity shown on [package version 1448530890][runner-image] | Digest |
| --- | --- |
| Image index | `sha256:759a1d94a15b05941aba5196974ff43fe15b4cbba29b694b35cbc32a1166b232` |
| `linux/amd64` | `sha256:0ce3288e48b012a83685998f683a2ae0cbd284fa722c090dda0af5443215cf30` |
| `linux/arm64` | `sha256:2089924d7fb6a96f1d1d2aca242ad6a07315b4ec2d7d275391ee265de70e941b` |

The parent independently rechecked the public package page at **10:23Z**, confirming those digest strings and the 2.338.2 tag, and rechecked the latest-release APIs for ARC **0.15.1**, Scale Set Client **0.5.0** and Tart **2.41.1**. No candidate was selected or provisioned.

**`actions/runner-images` is different again:** it supplies hosted VM-image build sources/inventories, not this wrapper or an automatically approved self-hosted image. Its [pinned README][runner-images-source] warns builds are not idempotent even from a specific tag. Latest relevant non-prerelease entries in the [30-release snapshot][runner-images-releases] were:

| Hosted image family / selector | Published source release | Reported image version |
| --- | --- | --- |
| Ubuntu 24.04 x64 / `ubuntu-24.04` | [`ubuntu24/20261026.354`](https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20261026.354) | **20261026.354.1** |
| Ubuntu 24.04 ARM64 / `ubuntu-24.04-arm` | [`ubuntu24-arm64/20261026.166`](https://github.com/actions/runner-images/releases/tag/ubuntu24-arm64%2F20261026.166) | **20261026.166.1** |
| macOS 15 ARM64 / `macos-15` | [`macos-15-arm64/20261028.0489`](https://github.com/actions/runner-images/releases/tag/macos-15-arm64%2F20261028.0489) | **20261028.0489.1** |

The repository's global `/releases/latest` pointed to **`macos-26-arm64/20261026.0455`**, image **20261026.0455.2**; that is one image family, not a universal latest runner/image version. Hosted labels and release inventories do not prove what a particular Superman run used; that requires its own job image evidence. None of these public versions changes the existing three-platform routing.

## 4. What Gate 1 still needs

1. **Authorized current inventory:** runner scope, actual group IDs/names, complete labels/scale-set selectors, native OS/architecture/capacity, and **Superman repository/workflow/public/fork-PR access**. Historical group `1/default` in another repository is not that evidence.
2. **Approved worker identities:** per-platform OCI/VM identity and checksums, recipe revision/provenance, review/approval, actual runner application/content and relevant host inputs. Public upstream digests above are available metadata, **not approved r3dlex fleet digests**; actual installed versions and approved VM snapshots remain unknown.
3. **External isolation/lifecycle proof:** at-most-one-job registration, fresh workspace/HOME/temp, destruction/wipe on success/failure/cancellation/timeout, retained external logs, cache/trust separation and network/storage/process boundaries. Access to developer HOME/keychain/SSH agents, host Docker sockets, privileged mounts, metadata/management services and other jobs remains **unverified**. GitHub explicitly separates one-job ephemeral deregistration from automation that wipes the worker. [Official reference][self-hosted-reference].
4. **Named operator and current human authority:** no operator appointment, image approval, Superman group authorization, hosted exception/fallback approval or route-activation permission follows from these sources. Newer PRs and latest upstream versions do not resolve those unknowns. The failed Archgate probe does not remove the existing ARM64 asset/platform blocker.

Use this as a dated amendment input only. **Ticket 01 and the existing raw gates retain their status; no routing/settings/infrastructure/image/asset work, commit/push/PR/review/merge is authorized by this report.**

Next: request spec §8.4's sanitized current runner/access/image inventory from André, or review the bounded hosted bootstrap exception; do not run provisioning from these research notes.

[repo]: https://api.github.com/repos/r3dlex/github-runners-for-repo
[repo-releases]: https://api.github.com/repos/r3dlex/github-runners-for-repo/releases?per_page=20
[repo-tags]: https://api.github.com/repos/r3dlex/github-runners-for-repo/tags?per_page=20
[pypi]: https://pypi.org/pypi/github-runners-for-repo/json
[main-commit]: https://api.github.com/repos/r3dlex/github-runners-for-repo/commits/8e878b1de0b29d58f58887d9b702ce91901d7b70
[package]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/pyproject.toml#L1-L14
[branches]: https://api.github.com/repos/r3dlex/github-runners-for-repo/branches?per_page=100
[pulls]: https://api.github.com/repos/r3dlex/github-runners-for-repo/pulls?state=all&sort=updated&direction=desc&per_page=100
[native]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/github_runners_for_repo/runner_manager.py#L24-L219
[native-30]: https://github.com/r3dlex/github-runners-for-repo/blob/f0072d49a95e95710c28a611866a04957fbb1580/github_runners_for_repo/runner_manager.py#L24
[native-31]: https://github.com/r3dlex/github-runners-for-repo/blob/37d772e8dcb323448cad52f90444045d7525f958/github_runners_for_repo/runner_manager.py#L24
[native-33]: https://github.com/r3dlex/github-runners-for-repo/blob/fa89cc3943ced2458a0ab876ff9c4efadabe6ed7/github_runners_for_repo/runner_manager.py#L24
[native-probe]: https://github.com/r3dlex/github-runners-for-repo/blob/2176507584811282e94dd287720cbb53c8aa134e/github_runners_for_repo/runner_manager.py#L24
[probe-compare]: https://api.github.com/repos/r3dlex/github-runners-for-repo/compare/8e878b1de0b29d58f58887d9b702ce91901d7b70...2176507584811282e94dd287720cbb53c8aa134e
[provision]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/github_runners_for_repo/scripts/provision-host.sh#L32-L34
[provision-30]: https://github.com/r3dlex/github-runners-for-repo/blob/f0072d49a95e95710c28a611866a04957fbb1580/github_runners_for_repo/scripts/provision-host.sh#L68-L81
[gh-release]: https://github.com/cli/cli/releases/tag/v2.103.3
[legacy-docker]: https://github.com/r3dlex/github-runners-for-repo/blob/48f0d30e0fed64dfbd5731ccf1f87afcd033f121/runner/Dockerfile
[legacy-compose]: https://github.com/r3dlex/github-runners-for-repo/blob/48f0d30e0fed64dfbd5731ccf1f87afcd033f121/docker-compose.yml
[runner-latest]: https://api.github.com/repos/actions/runner/releases/latest
[runner-release]: https://github.com/actions/runner/releases/tag/v2.338.2
[runner-tag]: https://api.github.com/repos/actions/runner/git/ref/tags/v2.338.2
[runner-releases]: https://api.github.com/repos/actions/runner/releases?per_page=6
[runner-old]: https://github.com/actions/runner/releases/tag/v2.334.0
[self-hosted-reference]: https://docs.github.com/en/actions/reference/runners/self-hosted-runners
[job-3]: https://github.com/r3dlex/github-runners-for-repo/actions/runs/41175485646/job/124462043304
[job-4]: https://github.com/r3dlex/github-runners-for-repo/actions/runs/41126704453/job/124306979103
[job-probe]: https://github.com/r3dlex/github-runners-for-repo/actions/runs/41191935183/job/124510317292
[jobs-3]: https://api.github.com/repos/r3dlex/github-runners-for-repo/actions/runs/41175485646/attempts/1/jobs?per_page=100
[jobs-4]: https://api.github.com/repos/r3dlex/github-runners-for-repo/actions/runs/41126704453/attempts/1/jobs?per_page=100
[jobs-probe]: https://api.github.com/repos/r3dlex/github-runners-for-repo/actions/runs/41191935183/attempts/1/jobs?per_page=100
[main-guidance]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/AGENTS.md#L190-L224
[tiers]: https://github.com/r3dlex/github-runners-for-repo/blob/fa89cc3943ced2458a0ab876ff9c4efadabe6ed7/.github/workflows/runner-health.yml
[tier-labels]: https://github.com/r3dlex/github-runners-for-repo/blob/fa89cc3943ced2458a0ab876ff9c4efadabe6ed7/.github/actionlint.yaml
[probe]: https://github.com/r3dlex/github-runners-for-repo/blob/2176507584811282e94dd287720cbb53c8aa134e/.github/workflows/probe-archgate-arm64.yml
[config]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/github_runners_for_repo/config.py
[env]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/.env.example#L19-L29
[architecture]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/specs/architecture.md
[main-tree]: https://api.github.com/repos/r3dlex/github-runners-for-repo/git/trees/8e878b1de0b29d58f58887d9b702ce91901d7b70?recursive=1
[cli]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/github_runners_for_repo/cli.py
[main-test]: https://github.com/r3dlex/github-runners-for-repo/blob/8e878b1de0b29d58f58887d9b702ce91901d7b70/.github/workflows/test.yml
[runner-image]: https://github.com/orgs/actions/packages/container/actions-runner/1448530890?tag=2.338.2
[runner-docker]: https://github.com/actions/runner/blob/d1eb12d4b115c301201de27d667284e1a80f2ab5/images/Dockerfile
[arc-release]: https://github.com/actions/actions-runner-controller/releases/tag/gha-runner-scale-set-0.15.1
[arc-values]: https://github.com/actions/actions-runner-controller/blob/23159a8e2d70ca4cece740fe43a8d9eb0c2818de/charts/gha-runner-scale-set/values.yaml
[arc-quickstart]: https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/quickstart
[scaleset-release]: https://github.com/actions/scaleset/releases/tag/v0.5.0
[scaleset]: https://github.com/actions/scaleset/blob/af394d86c0d5024225238b0209043c70193bcfe6/README.md
[tart-release]: https://github.com/openai/tart/releases/tag/2.41.1
[tart]: https://github.com/openai/tart/blob/543453404cd1b15c1338b6b70e162d000c8ba5e2/README.md
[runner-images-source]: https://github.com/actions/runner-images/blob/102f6553849daabcbd37e321e2e224dbab45c469/README.md
[runner-images-releases]: https://api.github.com/repos/actions/runner-images/releases?per_page=30
[native-probe-new]: https://github.com/r3dlex/github-runners-for-repo/blob/d1f126572cf43ab57254122e61a6385dedef8748/github_runners_for_repo/runner_manager.py#L24
[probe-new-commit]: https://api.github.com/repos/r3dlex/github-runners-for-repo/commits/d1f126572cf43ab57254122e61a6385dedef8748
[probe-delta]: https://api.github.com/repos/r3dlex/github-runners-for-repo/compare/2176507584811282e94dd287720cbb53c8aa134e...d1f126572cf43ab57254122e61a6385dedef8748
[job-probe-new]: https://github.com/r3dlex/github-runners-for-repo/actions/runs/41192313096/job/124511414201
[jobs-probe-new]: https://api.github.com/repos/r3dlex/github-runners-for-repo/actions/runs/41192313096/attempts/1/jobs?per_page=100
[tier-runs]: https://api.github.com/repos/r3dlex/github-runners-for-repo/actions/workflows/runner-health.yml/runs?branch=feat%2Frunner-health-all-tiers&per_page=5
