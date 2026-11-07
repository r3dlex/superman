# Gate 1 publication manifest — 2026-11-07

**Frozen source manifest for the `spec/superman-v0` PR (r3dlex/superman#1).** Every path the PR must contain, with the sha256 of its bytes at 2026-11-07. The publication step must stage **exactly** the paths below and verify each staged path's sha256 against this table before it commits.

**This document is itself a path in the PR** — the 85th — and it is the one path this table cannot list, because a document cannot contain its own digest. Its own sha256 is reported with the packet and is recomputable at publication time from the staged bytes.

**Scope.** The **84** paths below are the 73 paths changed against `62c8495` plus the 11 untracked paths that are not another actor's directory and not this document. `.serena/` is excluded and must never be committed: it is another actor's directory, it is not ours to publish, and the coverage collector reads it as runtime code.

**Manifest digest** — sha256 over the 84 `sha256  path` lines below, in this order:

```text
28e4c81b8fd0049c1c4b9a4c333c9944e36673a603bd1e87c238ab57767fc764
```

**Base.** `origin/main` is `e9b7551` and has not moved; the branch tip is `62c8495` and already equals `origin/spec/superman-v0`.

## The paths

| # | path | sha256 | bytes |
| --- | --- | --- | --- |
| 1 | `.archgate/adrs/SUP-001-zero-runtime-deps.md` | `59801744dfa9aa1559f53a4b12becbf9560f4446d9adcc84075d801a9bc094ba` | 3387 |
| 2 | `.archgate/adrs/SUP-001-zero-runtime-deps.rules.ts` | `4edd7f7510c234e466adb5048d7eea87a3a502a0cc69e077e1d19364e8233f22` | 7791 |
| 3 | `.archgate/adrs/SUP-002-exec-boundary.md` | `103cb692967ca682ba3dd85468ddcf942c33834d81bf9759fa1636ca90dfad05` | 3865 |
| 4 | `.archgate/adrs/SUP-002-exec-boundary.rules.ts` | `3c6f8f03c9870d599bb875f9ab79c57727121a719a31149fc55a3a422f25f356` | 6318 |
| 5 | `.archgate/adrs/SUP-003-no-sh-py.md` | `e960c8e5f1e8c399a893608bb5b37979b80e4125056b7aec6a166cbb186b1460` | 2841 |
| 6 | `.archgate/adrs/SUP-003-no-sh-py.rules.ts` | `a7abf877496307a3581cd06e25ef2533f9a479df6be436b494a25abfc73e983f` | 3030 |
| 7 | `.archgate/adrs/SUP-006-tsrs-typecheck.md` | `5789b00d6d047110da9fc01bf9d1c6b6d62541bb2590b2bb8c06d427b2f4293c` | 4141 |
| 8 | `.archgate/adrs/SUP-006-tsrs-typecheck.rules.ts` | `dda46fdd4edf554b8956cbfefd3101e43e50b4132d04b601611494b39af22bef` | 6919 |
| 9 | `.archgate/adrs/SUP-008-tests-through-superman.md` | `6d5fdbc2615fc8fa468aa2340fa0ef8361544e07654850d68b0259396d25f1a2` | 4795 |
| 10 | `.archgate/adrs/SUP-008-tests-through-superman.rules.ts` | `4dc92458183b3176663c0bdde2041f1b7833a74bb24c9268ea7c60c9d74b7bd5` | 4506 |
| 11 | `.jscpd.json` | `9b7d0d5eecd680eccc9cd90df9d235fd9c1ba5e130c4a47d79c0d1c5420c9666` | 143 |
| 12 | `.scratch/superman-v0/deno-artifact-candidate.md` | `bd9fa947beda285d90bfd52371efdce7a5061c74ce4736ecd0653e39ff2e4339` | 46487 |
| 13 | `.scratch/superman-v0/deno-checker.manifest.ts` | `b913d41e930018c7092dd998dcc62712307be605b65f40ed666d11fcd1503fc5` | 26991 |
| 14 | `.scratch/superman-v0/deno-checker.probe.test.ts` | `daca436940cc9acf56ae1b65d34fb391600ad65c9530b8f4355e52a5492ec51c` | 18815 |
| 15 | `.scratch/superman-v0/deno-compile.probe.test.ts` | `1a9c5df562ef49f7d340b5976318b222fd06bf92bbafd401da05dc41205261a4` | 22833 |
| 16 | `.scratch/superman-v0/deno-coverage-independent.probe.test.ts` | `39d998fbffc777c5ea4c47f9cf8994a036cceaf48b39ff67479ffc707e2f6af4` | 28215 |
| 17 | `.scratch/superman-v0/deno-coverage-independent.ts` | `153d15f5667fd169126ddd213e987f64141d52a86db57a469df710f7e1efcd90` | 16058 |
| 18 | `.scratch/superman-v0/deno-coverage-measurement.ts` | `064c6e63e48ff5c3686b66ff9672bbc564f027a08b85323a42c635a74ec92af0` | 18961 |
| 19 | `.scratch/superman-v0/deno-coverage.probe.test.ts` | `c994fe886c3edac10de7b9b82a1d70a6a02c90e16e8c8be5590673a8433496e7` | 42569 |
| 20 | `.scratch/superman-v0/deno-mutation.probe.test.ts` | `a4c7319c8fd77bb678c1144cded3af3714c0b52f4d592650c26a98c02f4db841` | 28504 |
| 21 | `.scratch/superman-v0/deno-startup.probe.test.ts` | `dcbd83fd0f944db31d5dee599e69dc43e3f7c129849cc9add2029254f13b5741` | 25289 |
| 22 | `.scratch/superman-v0/duplication-corpus.md` | `6ed4470756be42918279dd6652c5870950d1b9292576a0f2de84b257f22a0887` | 5888 |
| 23 | `.scratch/superman-v0/duplication.probe.test.ts` | `9fdbe9611414d5fa000356fbc3ff8676552777844f29d2c0ef70250b5cc59015` | 32576 |
| 24 | `.scratch/superman-v0/gate1-grilling-record.md` | `f991392dd20ba3657c36d50534171275b70cdda74a8c8346cf09dd3dd1bb0795` | 10310 |
| 25 | `.scratch/superman-v0/gate1-loop-check.mjs` | `90c0b625729aa0327c6fa2fea5986812161b3edc94a10e47777eca54c6fa5313` | 9705 |
| 26 | `.scratch/superman-v0/gate1-loop-diagnosis.md` | `2c4f0f54b163adc9cb45be5aef26082e2d76dce222950d181abfcdc9e2ca67f0` | 11100 |
| 27 | `.scratch/superman-v0/gate1-pr-body.md` | `a94717507005a70ac2a472ed6e7325261724d8c4b4820c11ed3153cc602ccc1f` | 16222 |
| 28 | `.scratch/superman-v0/gate1-preparation.md` | `1785e63acf2f1bc5c98bd1a9fc3c1179ea92279893ac5333f3ebc84ca64dbcd4` | 432943 |
| 29 | `.scratch/superman-v0/gate1-row12-operator-request.md` | `846599e1b92f71cdde4036d3c596173154bdd5c4fa0577144856d619e506caef` | 10373 |
| 30 | `.scratch/superman-v0/issues/01-skeleton-and-raw-gates.md` | `893d4ae38f44857ea935d4c6e09758d11cbb6a354e9984d0cd1435ba05a6158a` | 6517 |
| 31 | `.scratch/superman-v0/spec.md` | `0db9f6219ce2a2d7421559d3272019a8779f6d213f1dbf388bac85524eca0ec8` | 242477 |
| 32 | `.superman/ci/archgate-policy.test.ts` | `d6d94b2200c1d4d4f4935d988c26db9964ade071c840ba904d70268f3fabdd8a` | 52052 |
| 33 | `.superman/ci/bootstrap-coverage.test.ts` | `57e1ea7365ac8cf1fe2cd47a6aaf9cef3f5ed2caa343ecc085aae5f86201075c` | 27025 |
| 34 | `.superman/ci/bootstrap-evidence.md` | `fb96952e8f597124ee219280a45f29ebda80cde792b2bf5e1c87e53233da50e1` | 497458 |
| 35 | `.superman/ci/bootstrap.json` | `c0732fe4960eb4199fc88b238f941244c21185068ad61d63bbc9db337d321fb7` | 3930 |
| 36 | `.superman/ci/coverage-evidence.md` | `fa378ba219274404825cf42924bef7b8ffdad675de11a93be65591ed266f80e5` | 43884 |
| 37 | `.superman/ci/coverage.json` | `601a1ebc848015b3c977a886260592ddad51634b68251432c6b5b53a7e438249` | 2328 |
| 38 | `.superman/ci/coverage.test.ts` | `03105d93beb908393d0968fcaad3fbe9e8192f4940f2e05bc8690a59c21a600a` | 59283 |
| 39 | `.superman/ci/coverage.ts` | `24274a78073f5cefeae35ab27542d8bbfe77779639f82b009480ef0d73ea3d64` | 37756 |
| 40 | `.superman/ci/critical/approval-and-credential-boundaries.critical.test.ts` | `4f6e6294267fe61ccc5e4c3aafc2a4e405d045f58d65ae8e1e20e942165f1591` | 7370 |
| 41 | `.superman/ci/critical/coverage-inventory-and-floor-safety.critical.test.ts` | `d2d874ff70400b8dd5db1274b9fa1cd561e30f5a4a2ddb2a3b60d93ebbfc4caf` | 7200 |
| 42 | `.superman/ci/critical/duplication-and-mutation-evidence.critical.test.ts` | `e358349735b83cf609a1a9e2ca1ebac18ba4ed353be2ce5e228ce742fd04f185` | 6599 |
| 43 | `.superman/ci/critical/fixture-context.ts` | `69477ab4c474fee08d6409da7fd8848c0383a25b0829742f108655d396fbb789` | 353 |
| 44 | `.superman/ci/critical/hbm-artifact-identity-and-receipt-safety.critical.test.ts` | `6994c5756a46a64feb998c1e2e77dd69feb9a2c0a3c711fb7f671068b9cac716` | 8680 |
| 45 | `.superman/ci/critical/path-and-process-safety.critical.test.ts` | `804e640886fe77f1bf8bb716bb2cdb1bf8b7bc396b5a9aba78eeabeffcde2c84` | 6907 |
| 46 | `.superman/ci/critical/policy-preflight-and-tool-routing.critical.test.ts` | `68eec4ebd3dd78302d78c35589b172a1232b0786472d66d80513ba8d24bd2855` | 7171 |
| 47 | `.superman/ci/critical/policy-selection-and-result-completeness.critical.test.ts` | `5547373632ee38ae0c60c5bac0a420d169c64c9aae6551160b78a3a92ed20e52` | 6669 |
| 48 | `.superman/ci/critical/protected-path-and-traceability-policy.critical.test.ts` | `b39c6e3759d56b050334e43cd0a390df616f1e30efb1ddbfadfcf25a6142029b` | 6513 |
| 49 | `.superman/ci/direct-gates.ts` | `82c52004a54625072c1031ced116fe2330757b347f74b38bb0985b17a81ab14c` | 27493 |
| 50 | `.superman/ci/node-hosted-candidate-measurement-host.ts` | `1c147ef8464aa640c1ff4a2482ddebe5e9b2fbaa59fdd82eddd61fa14cc38cc1` | 29259 |
| 51 | `.superman/ci/pr-policy.test.ts` | `a6b52e0851e669d311c97b64ec0d43431bece9849bf8b6264e131515b3be7551` | 67322 |
| 52 | `.superman/ci/pr-policy.ts` | `e5c90e77614f10a1bd4c98b518d59112033b5a9727a8a15bd8e5da4564675a5b` | 26394 |
| 53 | `.superman/ci/quality-gates.test.ts` | `d999880d0bc5668fbb45e7effa0d2b810dc6ec85281e986bc0418ad070c0f477` | 66713 |
| 54 | `.superman/ci/quality.ts` | `1cc6a8ccdd97a167bb0ce3ad9f29bb1900ed22c9472af0ce9428457a62d8fc88` | 62151 |
| 55 | `.superman/ci/raw-gates.test.ts` | `06321e67aab04686e40d73f5dd41217929d03143646121a2b384518496aa864d` | 25075 |
| 56 | `.superman/ci/raw-gates.ts` | `f1896f7b62257523af739de21748568dff1900ccd3914644182cc28877d826e6` | 25166 |
| 57 | `.superman/ci/raw-routing.test.ts` | `79bded5064c0ba4480c67d42bc7e72fd3abbe87482a8ac7b99dc55298bcc892d` | 59389 |
| 58 | `.superman/ci/replay.ts` | `c8bc5b3278f1bdd8714904694d88f3dddb9798ce8359dfeeb4099c65bd31d0a0` | 23699 |
| 59 | `.superman/ci/rule-coverage.test.ts` | `ee31df90b5f55ad4821af767c930b4b04bed2d8fdc2d47c836a7ef6cde7857d1` | 57185 |
| 60 | `.superman/deno-bootstrap/archgate-arm64-build.ts` | `8f3937872982a03e82e1bfb21141b0657f043142ec9e99d7585fdb5f6678d706` | 10971 |
| 61 | `.superman/deno-bootstrap/archgate-linux-arm64-wizard.ts` | `0932edc12a3ea86155c0b197d94dfd451d7b423c3e0891a4e1d5901aecc0fe4e` | 12257 |
| 62 | `.superman/deno-bootstrap/ci.template.yml` | `8cc5f8c34e2fd852ecbc6a91f264f12f3708c2dd3d89e95ce7965f6aec3f3278` | 12563 |
| 63 | `.superman/deno-bootstrap/coverage.ts` | `83c28622a0c70fb16c08d96758e23813f1d665fa3735970ec479ce775d16d4a4` | 18735 |
| 64 | `.superman/deno-bootstrap/direct-gates.ts` | `8a2012af4908306cb4dfed2f160b852fe405fa5a65370c85e2f0e40e06bc0c9c` | 37474 |
| 65 | `.superman/deno-bootstrap/exec.ts` | `12926f98101ab900784adcba26d5b4e1a063eb5dc51415e1a3f6f792e2f69636` | 14899 |
| 66 | `.superman/deno-bootstrap/fixture-env.ts` | `92ff7cbcba59b7d77d4ea56b9457d4a7779d89a742c9adfba7bdea709e081339` | 521 |
| 67 | `.superman/deno-bootstrap/pr-policy.ts` | `6352273cfaac66ee52c7eb06af34f36cbabb59e6974abe38b80a0d2931740bd6` | 26193 |
| 68 | `.superman/deno-bootstrap/provision-tools.ts` | `0a5221046b288d22e5bcd591bbe8e7ce8b9ca97f29575b35f43dc397d13dd051` | 5373 |
| 69 | `.superman/deno-bootstrap/quality.ts` | `2af2848c3eda8d9331ad23ac9673697c4144adb9704582e27038e0f6957aa178` | 63306 |
| 70 | `.superman/deno-bootstrap/raw-gates.ts` | `2a73f0b00386a083a8000bf56293afa4e356316bc16ef2598fc0261f43048cdf` | 25674 |
| 71 | `.superman/deno-bootstrap/replay.ts` | `d0eb2bc9403224915e605b571304575130ff6c811fea7060288cbea6c067092e` | 24803 |
| 72 | `.superman/deno-bootstrap/tests/bootstrap.test.ts` | `fe00d3653a9db11dcb8e70a0a0a9c1207a17aca10081d4938b06716f6cc4f620` | 59198 |
| 73 | `.superman/deno-bootstrap/tests/launch.test.ts` | `3a87cc5cee5c9b96a413b4cb63774fa5fd92967e087f7811aae0c478ac416266` | 15907 |
| 74 | `.superman/deno-bootstrap/tests/staged-scope.test.ts` | `6548adf51070bd59ed2efdfdcc84b10a5a8ea2dac09e0fea0d60039f5e15ac66` | 46190 |
| 75 | `.superman/deno-bootstrap/tests/transition.test.ts` | `acbcc016df71e9a4038e7de6aa8eea0c560823165759300faa94cba75b0a3a65` | 56754 |
| 76 | `GLOSSARY.md` | `af6238a7ee84db590d11d36ed21e90d4eaaccf482dfd809efcba012fddf9397f` | 10713 |
| 77 | `README.md` | `5581298e88957429b70284291b8be9e170ddbae081f7bc181a450389fb7e13a6` | 5940 |
| 78 | `WORKFLOW.md` | `0736c407e65bb0bb6e59c7b256e10122ee3d072ae7e90fd3897da84a4f83b0f1` | 10859 |
| 79 | `biome.json` | `5a4d893021ea4f318962ba31f9bc7fd66042ae004341777d45cbaf0c4574303c` | 1052 |
| 80 | `docs/adr/0018-admission-evidence-not-tool-correctness.md` | `633dda92ae6c43d4171fafc3a289833d651d0a1755bdb1e077d8d0af4167de39` | 5041 |
| 81 | `knip.json` | `cd322b6ca5eb2333763e970224bc7f9a4c9755962a00a82c0df2abc2f00d2b8e` | 530 |
| 82 | `stryker.config.json` | `5a5456f6a45bed860e4c6fa0568ad2bf542d0ef99a2e886b51b77dcf6752e933` | 402 |
| 83 | `tsconfig.json` | `aaa30c9f4029599e96175648c4f86b7733f6d2a6e179ce99b06ebcf7b78b4d3a` | 402 |
| 84 | `vitest.config.ts` | `f4e7a7b1a94f87afb60844ef215e614eec7a85ecb13417ea38c324c2d50f1ff5` | 277 |
| 85 | `.scratch/superman-v0/gate1-publication-manifest.md` | *(this document — see above)* | — |

## Reading this table

The sha256 is of the file's bytes as they stood when the manifest was frozen. If a path's bytes differ at publication time, the difference is un-reviewed and the manifest is stale — re-measure and re-review rather than commit a changed byte.
