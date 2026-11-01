# Deno runtime — Superman v0 amendment research

**Observed: 2026-11-01. Planning only; no runtime/platform verification performed.** This is primary-source research, not an approved runtime choice, amendment, tool pin, ticket admission or compatibility result. The installed OpenCode `research` skill was loaded without modification; this session is already the fresh-context research worker, so no additional worker was spawned. The declared Pocock pin remains **`59db609eb1e18aaf59b63284d0e52255aff0c63c`**. [Local contract: spec §§5.3, 5.6, 17][spec]

Only local files and anonymous public documentation/source/metadata were read. No Deno execution, installation, product probe, credential access, hosted write, configuration/script/pin/skill change, commit or push was performed. This note is the only repository write; `matt-skills-research.md` is preserved. Uncommitted local changes were treated as existing work, not reverted.

## What the existing design actually contains

| Surface | Observed local contract, not a Deno compatibility claim |
| --- | --- |
| Runtime and distribution | Node built-ins only, `dependencies: {}`, Node ≥26, npm `superman-ai` with bin `superman` → `./dist/cli.js`; optional Bun-built binaries. The package allowlist contains `dist/`, schemas and canonical skill/manifests, not `src/`. The inspected root has no product `src/` or `dist/` yet. [Spec §§4, 5.1, 12–12.2][spec], [package.json][package] |
| Existing protected implementation | Bootstrap code is real Node-specific tooling, not greenfield product code: coverage uses `process.execPath --test`, `NODE_V8_COVERAGE`, `node:module.stripTypeScriptTypes`, c8's locked merger/reporters and Vitest's locked AST converter. Replay/quality tooling creates owned snapshots, invokes Node/pnpm tools and checks their identities. [Coverage collector][local-coverage], [replay][local-replay], [quality][local-quality] |
| Development tools | Declared pins: tsrs `0.20.1-ts7.1.0-beta`, TypeScript `7.1.0-beta`, Vitest/coverage-v8 `5.0.5`, Stryker core/Vitest runner `10.1.1`, Biome `2.6.4`, c8 `12.0.0`. This research did not run or validate those installed tools. [package.json][package], [bootstrap pins][bootstrap] |
| Tests and quality | `vitest.config.ts` selects `environment: "node"`; Stryker selects the Vitest plugin. The primary approved seam is the CLI **process** with fake external tools on PATH, not replacement unit-only coverage. G9 needs a relevant behavior failure, not a missing runtime/configuration failure. Overall coverage requires ≥90% **separately for lines, statements, branches and functions**, including unexecuted owned runtime/bootstrap/rule files, on every required platform leg. [Vitest config][local-vitest], [Stryker config][local-stryker], [spec §§5.4, 16/Testing Decisions][spec] |

Moving the product CLI, moving protected bootstrap/hook tooling, changing a typechecker, and changing release packaging are therefore separate amendment questions. Nothing below silently moves all four. Existing Gate 1 blockers and the upstream skills contract are unchanged. [ADR 0003][adr3], [ADR 0008][adr8], [spec §§5.4, 5.6, 12, 17][spec]

## 1. Runtime stability, available versions and identities

- **Documented policy:** Deno's stable channel is the default recommended channel; current docs describe a 12-week stable-minor cadence and patches as needed. Deno says it strives to preserve code using its stable namespace APIs across future versions; this is not application-specific compatibility proof. Unstable APIs/features are separate and explicitly flagged. The docs currently identify the **2.9 LTS line**, starting at 2.9.3, maintained until **2027-01-31**. This is an observed upstream statement, not an extrapolated future release schedule or a Superman selection. [Stability and releases][stability]
- **Observed availability, not a pin:** GitHub's latest-release API returned stable **`v2.9.8`**, published **2026-10-21T15:28:53Z**. Its tag resolved to source commit **`fe7ed012d92c642fd8e5607ac5a45d517538b5c5`**. Separately, npm's `deno` latest metadata returned **`2.9.6`**, with `gitHead` **`e518fbd66dda5debcbdefc0beb0b3756b37b64fa`**. Do not conflate those distribution surfaces or invent a later version; neither is proposed for adoption here. No LTS binary was retrieved or identified. [GitHub release metadata][release-api], [tag resolution][deno-tag], [npm metadata][deno-npm]
- **A version string is not complete build identity:** Deno documents stable and LTS builds that can carry the same semver but differ in embedded channel marker/bytes. A bare version passed to `deno upgrade` selects the stable build; `deno upgrade lts` follows the latest LTS build rather than pinning an older patch. Thus channel, platform, exact asset/digest and source/build provenance matter independently of semver. [Stability and releases][stability]
- **Available runtime identity fields:** `Deno.version` reports `deno`, `v8` and `typescript`; `Deno.build` reports target, architecture, OS, vendor, environment and standalone status. Upstream describes these as logging/debugging information, not a substitute for testing feature support. The inspected 2.9.8 source declares its bundled TypeScript as **`6.0.3`**, not Superman's declared TypeScript 7.1 beta. No actual runtime identity values were sampled. [Version/build declarations][deno-identities], [version source][deno-version-source]
- **Node-compatible is not Node identity:** Deno deliberately reports a Node-compatible version through `process.version`/`process.versions.node`. Its current compatibility docs also describe providing a `node` shim to child processes when no real Node is on PATH. Thus an argv spelling of `node` or a Node-major version check alone does not prove retained tooling actually ran in Node. Distinguish the resolved executable/content and actual runtime from its compatibility version; this is especially relevant to the bootstrap's existing Node pin checks. [Node compatibility/shim][node-compat], [version source][deno-version-source], [local replay identity checks][local-replay]

**Unanswered:** which channel/artifact and supported version range would be approved; how updates/security fixes are reviewed; and how executable integrity, bundled checker/V8, transpilation/configuration and target identity would enter `doctor`, receipts, coverage evidence and cache keys. These are implementation/approval obligations, not grounds to select `latest`. [Existing identity/cache contract: spec §§5.5, 5.7–5.8][spec]

## 2. npm/npx is an entrypoint, not implicit Deno provisioning

**Installing the present Superman package does not install Deno.** Its metadata declares no Deno dependency or installer. npm's `bin` field links an executable; `npx`/`npm exec` resolves the selected package's bin, installs missing requested packages into npm's cache and exposes their bins on PATH. An `engines` declaration describes compatibility and is normally advisory, not a runtime installer. Node/npm are still prerequisites for the ordinary npm/npx route. A Deno shebang or launcher would additionally need Deno available unless the package actually ships a self-contained executable. [package.json][package], [npm bin/engines][npm-package], [npx][npx], [npm Node prerequisite][npm-install-node]

**Deno can itself be installed through npm, but that is an explicit, different operation.** Deno's official installation docs show `npm install -g deno`. The observed `deno@2.9.6` metadata declares `bin.cjs`, a Node `postinstall`, and platform-specific `@deno/*` optional dependencies. Its immutable wrapper source also has a runtime fallback: if the colocated binary is absent, it resolves the platform package and tries to hard-link/copy its executable, falling back to that package's path on a read-only filesystem. Therefore neither “postinstall must have run” nor “suppressing scripts necessarily makes it unusable” is established. Optional dependencies may be omitted; the actual script-suppressed installation behavior still needs verification. This is not automatic provisioning caused by installing `superman-ai`. [Deno installation][installation], [npm metadata][deno-npm], [wrapper][deno-npm-bin], [installer API][deno-npm-install], [npm optionalDependencies][npm-package]

The following are **possible contracts to evaluate, not selected designs**:

| Route | Runtime prerequisites and unresolved proof |
| --- | --- |
| npm package launches Deno source, directly or through a built-in-only Node adapter | npm/npx needs Node; execution also needs an independently provisioned Deno. Specify source/launcher files in the packed artifact, anchor their paths, check the actual Deno identity and map missing/wrong-runtime errors to Superman's public exit contract. Do not assume the current `dist/cli.js` contract already does this. [npm bin][npm-package], [Deno execution][run], [local distribution][package] |
| npm package launches an included compiled executable | npm/npx still needs Node/npm, but a Deno-compiled application carries its runtime. Prove platform selection, executable bits, unsupported-platform failure, bin/asset allowlists and lifecycle-suppressed installs. Multiple new platform npm packages/optional dependencies would be a separate distribution/supply-chain decision, not a free consequence of compile support. [Compile][compile], [npm bin/optionalDependencies][npm-package] |
| Direct standalone executable | No separately installed Deno is required for the compiled application. External programs Superman delegates to remain external; the Node hook adapter/dev tools and on-disk harness skills do not disappear merely because the CLI is compiled. [Compile][compile], [spec §§5.6, 12, 16][spec] |

`deno run npm:<package>` is another documented Deno-driven npm-CLI route, **not the same interface as `npx superman-ai doctor`**. Whether to support it is still open. No installer/postinstall, launch-time download, automatic runtime fallback or change to the one-package requirement is authorized by this research. [Deno npm CLI execution][node-compat], [spec §§5.6, 12.1–12.2][spec]

## 3. Compile targets, embedded assets and build boundaries

**Documented targets match the requested architecture names:**

| Superman platform | `deno compile --target` |
| --- | --- |
| macOS arm64 | `aarch64-apple-darwin` |
| Linux x64 | `x86_64-unknown-linux-gnu` |
| Linux arm64 | `aarch64-unknown-linux-gnu` |

Deno documents cross-compiling these targets regardless of the build host. The observed 2.9.8 release also lists Deno and `denort` archives for all three. These are GNU/Linux targets, not evidence of musl support; the inspected npm installer explicitly rejects musl. Cross-compilation availability is **not native execution/platform acceptance** for Superman, Archgate or any retained tool. [Compile targets][compile], [release assets][release-api], [npm Linux detection][deno-npm-install], [existing platform blocker: spec §§5.4/17][spec]

- **Runtime is embedded:** `deno compile` embeds the application in `denort`, a reduced Deno runtime without tooling subcommands; the documented default engine is V8. The compiler downloads the version/target-specific `denort` into `DENO_DIR` and can instead use `DENORT_BIN` or an adjacent `denort`. Thus the compiler executable's version alone does not identify the base runtime used to build an artifact. The current docs mark QuickJS selection and bundling experimental; they are not assumed stable alternatives here. [Compile runtime/build inputs][compile]
- **Permissions are build inputs:** runtime flags, including permission grants, are specified at compile time. A built executable is not a generic `deno` CLI to which the user can simply append new runtime flags. Exact argv, resolved config/import graph, runtime archive/digest, source/assets, environment overrides and produced artifact digest need to be distinguishable if later build evidence is required. This is an evidence consequence, not a claim of reproducible output. [Compile flags/runtime][compile], [existing receipt contract][spec]
- **Assets need explicit inclusion and runtime-relative lookup:** local files/directories can be embedded with `--include`; docs demonstrate reading relative to `import.meta.dirname`, not the caller's cwd. Literal dynamic imports are included; computed imports and worker entries require explicit treatment. Current docs distinguish `--include` (which resolves/transpiles embedded JS/TS) from `--include-as-is` for exact bytes, and explain that config/CLI include lists merge. Minimum-version compatibility of any chosen flags remains to prove. [Compile assets/dynamic imports/workers][compile]
- **Embedded does not mean on-disk plugin delivery:** compiled files normally live in Deno's virtual filesystem. That is not evidence that Claude/Codex/OpenCode can discover canonical skill files there. Schemas/templates/Markdown used by the CLI and real files exposed to harnesses require separate packed-artifact tests and byte/hash equivalence checks. The spec still requires one canonical on-disk skill tree; Pocock's files remain unmodified and pinned, not newly vendored into a binary. [Compile virtual filesystem][compile], [spec §§5.6/12.1][spec]
- **Build from a controlled runtime graph, not the whole development installation by assumption:** current compile docs warn that the resolved `node_modules` tree can be embedded by default. Zero product imports does not alone prove the artifact omitted development packages. Audit actual packaged contents and generated module/asset inventory before making a zero-runtime-library claim. This observation does not authorize experimental bundling as the solution. [Compile dependencies][compile], [ADR 0003][adr3]

**Still unverified:** minimum OS/libc compatibility, macOS distribution signing/quarantine behavior, external-tool lookup, symlink/worktree/path handling, start-up latency, artifact scanning and byte-stable assets on each actual target. Upstream documents ad-hoc macOS signatures and separately points to signing/notarization requirements; it does not certify this product's release. [Compile signing][compile], [spec §§8, 12, 17][spec]

## 4. Built-ins, typechecking and retained development tools

| Question | Documented fact and compatibility limit |
| --- | --- |
| Can a Deno CLI use no imported runtime libraries? | Deno exposes Web APIs, its `Deno` APIs and `node:` compatibility modules. Using those does not inherently require an npm/JSR library. Node compatibility is broad but explicitly incomplete; support must be checked at the API/behavior level, not inferred from the module prefix. [Web APIs][web-apis], [Node compatibility][node-compat] |
| Is `jsr:@std/*` built into the executable runtime? | No: the standard library is separately published, independently versioned JSR packages. Even Deno-maintained, dependency-free `@std/yaml`, `@std/path` or CLI helpers are imported library code, not built-ins. An empty npm `dependencies` object would not detect JSR/HTTP imports or import-map aliases. Accepting those would reopen the built-in-only contract; embedding them does not erase that supply-chain decision. [Standard library][std], [Deno configuration/imports][configuration], [ADR 0003][adr3] |
| What does `deno check` establish? | It resolves and typechecks code without executing the application and does not emit a distributable `dist/`. Default execution separates transpilation from checking; `deno run` does not typecheck unless requested, whereas `deno test` checks by default. Resolution can download dependencies, so “no execution” is not “no network or cache changes.” [Check][check], [TypeScript][typescript], [Node/npm resolution][node-compat] |
| Does `deno check` replace tsrs automatically? | No policy change follows. Deno has its own bundled compiler, ambient libraries, resolution/defaults and supported configuration; tsrs targets TypeScript 7 behavior. The inspected Deno source's TS 6.0.3 identity differs from the existing TS 7.1 beta contract. The local tsconfig is `NodeNext`, `types: ["node"]`; no Deno type environment has been established for tsrs/tsc. Shared/Deno-specific projects, declaration provenance and diagnostic differences need explicit evidence. [Deno compiler source][deno-version-source], [TypeScript/configuration][typescript], [tsrs upstream][tsrs], [local tsconfig][local-tsconfig], [ADR 0008][adr8] |
| Do Vitest/Stryker execute the Deno application just because it typechecks? | No. The local test environment is Node. Vitest documents environments as Node test execution; its V8 coverage guide naming Deno as a V8 runtime is not end-to-end certification of this launch/test/mutation arrangement. A Node harness can observe a Deno child through the process seam, but direct Node imports do not exercise Deno-only APIs or its permission/runtime behavior. [Vitest environment][vitest-environment], [coverage guide][vitest-coverage], [local configs][local-vitest], [spec §16][spec] |
| Must Biome be replaced? | No documented need follows from using Deno. Biome is a separate formatter/linter with a standalone native executable; `biome ci` checks without rewriting files. That does not prove current Deno syntax/globals/config selection work with the pinned policy, and neither `deno check` nor a runtime switch silently substitutes `deno lint`/`deno fmt` for G10. [Biome CLI][biome], [spec §§5.1/5.4][spec] |

The existing bootstrap's use of `stripTypeScriptTypes`, Node-native subprocess coverage, Node test runner flags, process-group teardown, extra file-descriptor pipes and tool version assertions makes it a **separate compatibility surface**. No claim is made that those APIs are unsupported in Deno; their present behavior and evidence simply cannot be carried over without review/fixtures. Retaining Node for those tools is possible to investigate independently of the product runtime. [Local coverage/replay/quality][local-coverage], [ADR 0003][adr3], [Node compatibility caveats][node-compat]

## 5. Mutation testing across a Node → Deno process boundary

The pinned Stryker 10.1.1 source provides a more precise answer than “it supports TypeScript”:

1. **The instrumented file is not one physical source replacement per mutant.** Stryker inserts mutation-switching helpers. They consult `globalThis.__stryker__` and can initialize its active mutant from `process.env.__STRYKER_ACTIVE_MUTANT__`. The environment-variable name is defined in the pinned API source. [Instrumentation helpers][stryker-syntax], [constants][stryker-constants]
2. **The Vitest runner activates mutants in Vitest's execution context.** `mutantRun` supplies the active ID through Vitest's provided context; `stryker-setup.ts` assigns it to that process/isolate's Stryker namespace. The setup also records current test IDs, hit counts and mutant coverage; the runner reads those from Vitest's metadata. The inspected implementation contains no automatic Deno-child bridge for those globals or returned counters. Merely inheriting the Node worker's environment is not proof that the currently active Vitest mutant ID is present there. [Runner][stryker-runner], [setup][stryker-setup]
3. **Path selection and mutant activation are independent obligations.** A spawned Deno must load the **instrumented files in the owned Stryker snapshot/in-place measurement tree**, not the clean checkout, a realpath outside it, previously built `dist/` or an unmutated compiled binary. Separately it needs the correct active ID before loading the module, environment permission if the helper reads it, and dry-run/test-attribution evidence returned through a proven mechanism. The pinned sandbox source documents its file mapping and in-place behavior; Superman currently runs in-place only inside its owned measurement snapshot. These requirements are deductions from those implementations, not verified integration behavior. [Stryker sandbox][stryker-sandbox], [local quality measurement][local-quality], [instrumentation/setup][stryker-syntax]
4. **Import-related selection is insufficient for process-only tests.** Upstream defaults `vitest.related` to true and explicitly warns about API/integration tests that do not import product files. Its Vitest runner also always uses per-test mutation analysis and disables ordinary coverage reporting. Changing `related` alone does not implement child activation, coverage return, worker isolation or hit-limit/timeout propagation; assuming `coverageAnalysis: "off"` fixes it contradicts the documented Vitest-plugin behavior. [Pinned Vitest runner docs][stryker-docs], [runner source][stryker-runner]

**Unanswered proof:** plant a behaviorally relevant, known-killable mutant in the Deno CLI path and prove the CLI-seam test kills **that mutant**, with the right source bytes, ID, test identity and completed child process. Prove concurrent Stryker workers cannot share activation/profile paths or overwrite one another; static/module-load mutants work; survivor, no-coverage, timeout and tool/permission failures remain distinguishable; and forced base/candidate runs use equivalent input scopes. A passing Node-only mutation score is not evidence for Deno-only execution. Whether this needs a test-only bridge, another runner or another approved measurement arrangement is not decided here. [Mechanism above][stryker-runner], [spec G6/G9 and §§5.7/16][spec]

## 6. Coverage: available collectors are not the complete contract

### What upstream actually supports

- Deno's coverage guide documents `deno run --coverage=<dir>` as well as test coverage, and describes `DENO_COVERAGE_DIR` inheritance into Deno children. **The versioned 2.9.8 source confirms both `Run` and `Test` read that environment variable.** This matters because the separate environment reference still incorrectly describes it as test-only. No such child collection was exercised here. [Coverage guide][deno-test-coverage], [2.9.8 directory selection][deno-coverage-dir], [environment reference][env]
- The native report/LCOV exposes **lines, branches and functions**, not a separate statement counter. The CLI reference now documents thresholds for those three; an older passage in the coverage guide says no threshold flag exists. The 2.9.8 reporter/threshold implementation corroborates the three-metric model. Do not resolve that documentation drift by inventing a statement metric or claiming no threshold support at all. [Coverage CLI][deno-coverage], [coverage guide][deno-test-coverage], [reporter fields][deno-coverage-stats], [threshold implementation][deno-coverage-source]
- The inspected Deno report pipeline reads collected `ScriptCoverage` JSON, merges/filters observed script profiles, then resolves original/transpiled sources. It does **not** enumerate every owned source file to synthesize missing-file denominators. Missing source/transpilation data can be warned about and skipped. Thus `--include` is not a guarantee that never-loaded owned files enter the denominator. This is a source finding, not a test of every CLI mode. [Collection/report pipeline][deno-coverage-source]
- Vitest **5.0.5 does have** `coverage.autoAttachSubprocess` (default false). Its documentation/source show that it uses **`NODE_V8_COVERAGE`** and expects JSON shaped as `{ result: [...] }`. Deno's native collector instead writes individual script profiles. Common V8 ancestry does not make these collection paths/formats or source offsets interchangeable. No evidence here establishes that enabling that Vitest option alone collects/remaps a Deno child. [Vitest option][vitest-coverage-config], [Vitest collector][vitest-collector], [Deno collector][deno-collector]

### Why this does not meet Superman's existing bar yet

The existing collector converts Node's type-stripped bytes with a locked AST converter, inventories unexecuted files and merges disjoint Node/rule and product coverage. It explicitly assumes Node strip-mode offsets, rejects unmanaged source maps and verifies all four metric counts. Replacing its execution engine, collector, transpilation or mapping invalidates those assumptions until proven. LCOV merging alone cannot manufacture a distinct statement denominator. These are integration consequences of the observed implementation and retained policy, **not a recommendation to lower thresholds or omit code**. [Local collector][local-coverage], [coverage inventory][local-coverage-policy], [spec §5.4/ADR 0014][spec]

Required unanswered checks include:

- independent counts for all **four** required metrics, including wholly unloaded files and partially covered functions/branches, Deno-only paths, bootstrap and actual rule code;
- source-bound conversion using the code Deno executed, exact original bytes and transpilation/source-map identities; no replaying Deno ranges against Node's independently stripped output by assumption;
- parent/child/worker collection completion before report publication; early exit, crash, signal, timeout and missing-profile cases fail visibly instead of improving the percentage;
- canonical source identities across owned snapshots, path/URL spellings, package versus compiled execution and source-map remapping, with no double-counting or omitted files;
- explicit rejection of Deno's additional `deno-coverage-ignore*` directives as well as existing ignore families; the current local suppression detector does not list that family;
- fresh owned profile/output directories: Deno documents accumulation across runs, so stale or concurrent files must not be accepted as current evidence; prove all three platform legs separately;
- complete source/test/policy/tool/producer identity binding and uncached full fallback; native full collection alone does not establish safe unchanged-file evidence or incremental reuse. [Deno collection/ignore behavior][deno-test-coverage], [local implementation][local-coverage], [spec §§5.4–5.5/5.7][spec]

No complete Deno four-metric collector, safe cross-runtime merge, compiled-binary coverage route or trusted incremental ledger was verified. A native Deno three-metric threshold or a passing Vitest import test cannot be reported as that missing evidence.

## 7. Noninteractive permissions, discovery and host environment

### Permissions are useful bounds, not isolation of gate tools

- `--no-prompt` disables interactive permission requests; it **does not grant** missing permissions. Denied operations raise capability errors. Non-TTY prompting behavior is documented too, but explicit noninteractive behavior still needs to be demonstrated for each supported launch route, including compiled binaries. Startup/runtime permission errors must not be counted as G9's meaningful red behavior or silently mapped to gate success. [Permissions][permissions], [security][security], [spec G9/exit contract][spec]
- `--allow-run` permits spawning; children run with their own host-level authority and do **not inherit the parent's Deno sandbox**. A name/path allowlist restricts which executable starts, not what it does or what that executable subsequently starts. Allowing Deno or a shell can launch unrestricted code; allowing writable/replaced executables also undermines that restriction. Even `git`, `gh` or a package runner can execute further code/configuration outside Deno's bounds. This cannot establish safe execution of untrusted repository gates or replace the existing CI worker/credential boundaries. [Security: permissions bypassing sandbox][security], [subprocess permissions][permissions], [spec §8/ADR 0003][spec]
- Runtime module/worker code shares privileges within its thread. Initial statically analyzable module loading has permission exemptions; denial of ordinary network I/O is not proof that dependency/module downloads cannot occur. Import resolution and network/process isolation are different controls. [Security module-graph rules][security], [import permissions][permissions]

### Configuration and environment are execution inputs

- Deno discovers `deno.json`/`deno.jsonc` in cwd/parents, supports package.json dependencies and import maps, and currently documents tsconfig/jsconfig discovery as well. Running from a pilot repository can therefore pick up that repository's runtime/compiler configuration unless the launcher controls discovery. Resolving the CLI entrypoint to an absolute path alone is not evidence that all ambient configuration was excluded. [Configuration][configuration], [TypeScript config discovery][typescript]
- The versioned flag definitions distinguish `--config`/`--no-config`, `--lock`/`--no-lock`, `--frozen-lockfile`, `--no-npm` and `--no-remote`. `DENO_NO_PACKAGE_JSON` separately controls package.json auto-resolution. **`--no-config` alone is not a documented hermetic-execution contract.** Disabling lock discovery also is not integrity verification; dependency-free runtime launch and dependency-using development/build commands may need different explicitly modeled inputs. No flag profile is selected here. [Flag definitions][deno-flags], [environment controls][env]
- Deno reads startup environment such as `DENO_DIR`, `DENO_V8_FLAGS`, registry/auth/proxy/CA settings, coverage settings and unstable-compiler controls. Compile additionally has `DENORT_BIN`/adjacent-runtime overrides. Current security docs also describe `DENO_PERMISSION_BROKER_PATH`, which delegates permission decisions and **ignores allow/deny flags** when enabled. Application `--allow-env` restrictions are not proof that these startup controls were neutralized. Selected-runtime support and launch-time sanitization require explicit verification. [Environment][env], [compile runtime][compile], [permission broker][security]
- `Deno.Command` defaults `clearEnv` to false; supplied `env` values alone do not mean a clean environment. Even with clearing enabled, upstream warns the OS can add variables. Likewise the current fixture helper copies the host environment and removes selected Git/GitHub/Superman names, not all Deno/npm/proxy/compiler controls. That helper is not already a Deno environment-isolation proof. [Command options][deno-command], [local fixture environment][local-fixture-env]

**Unanswered fixtures:** adversarial cwd/parent config and import-map/lock discovery; alternate HOME/cache/.npmrc; inherited runtime/permission-broker/preload/compiler/registry/proxy controls; missing permissions; resolved executable paths and PATH replacement; environment passed to `git`/`gh`/Node tools; process-group cancellation/descendant cleanup and output bounds. Use fake values and controlled temporary repositories, not real credentials. Verify package/source/compiled/hook launch parity and preserve the single product exec seam or obtain an explicit amendment for its replacement. This research neither establishes a least-privilege profile nor claims that Deno sandboxes the invoked gate suite. [Sources above][security], [spec §§5.3/8/16][spec]

## 8. npm publishing still has a Node/npm/provider contract

| Requirement observed in official sources | Consequence for this amendment investigation |
| --- | --- |
| Trusted publishing requires **npm ≥11.5.1 and Node ≥22.14.0**. | A Deno product runtime does not remove the separate Node/npm publication toolchain. This is the documented OIDC minimum, not authorization to change Superman's existing Node pin. [Trusted publishers][npm-trusted] |
| The actual npm release has its **own** engine constraint. npm latest metadata observed here is **12.2.1**, whose immutable package source declares **`^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`**. | The OIDC minimum alone does not guarantee a chosen newer npm runs on an older Node. `npm@latest` is not a reviewed Superman pin, and was not installed. For comparison only, inspected npm 11.20.0 declares `^20.17.0 \|\| >=22.9.0`; OIDC's higher minimum still applies to publishing. [Registry snapshot][npm-registry], [current npm source][npm-current], [11.20.0 source][npm-11] |
| Supported OIDC providers are GitHub-hosted Actions, GitLab.com shared runners and CircleCI cloud; **self-hosted runners are not supported**. GitHub requires `id-token: write`. | The existing isolated GitHub-hosted publisher exception remains factually justified; compile/build/test need not share the privileged publication job. No provider support was activated or tested here. [Trusted publishers][npm-trusted], [spec §§8/12.2][spec] |
| GitHub publisher setup binds exact owner/repository/workflow filename and optional environment. New configurations must complete their first successful publish within **2 days**. Current docs default new connections to staging permission; direct publishing is separately allowed. | Do not treat saved settings, a registry placeholder or a passing build as publishing authority. Recheck the exact direct-publish configuration at authorized release activation, without introducing a new policy choice here. [Trusted publishers][npm-trusted] |
| `npm trust` management requires npm ≥11.15.0, existing package/write access and account 2FA; certain token/basic-auth methods are unsupported. | Setup prerequisites differ from the minimum npm needed to publish via OIDC. This research accessed no account/settings/credentials and verified no ownership. [npm trust][npm-trust] |
| GitHub/GitLab OIDC automatically generates provenance when both source repository and package are public; CircleCI OIDC currently does not generate it. `repository.url` must match the GitHub source repository. | Do not equate arbitrary OIDC publication with provenance. The docs' provenance does not independently prove a Deno base-runtime digest, complete test coverage, scan coverage or the isolated promotion of Superman's exact artifact. [Trusted publishers][npm-trusted] |
| npm accepts a gzipped package tarball for publication. | The existing separate-job design can be evaluated with a prebuilt verified tarball; Deno's `deno publish` is documented as a JSR command, not an established replacement for npm OIDC publication. Keep exact artifact validation and lifecycle suppression from §12.2 until a separately reviewed change exists. [npm publish][npm-publish], [Deno CLI reference][deno-cli], [spec §12.2][spec] |

There is some upstream documentation drift: the current `npm trust` command text still says one connection per package while the trusted-publishers page documents up to ten. No conclusion here depends on multiple connections. Recheck the exact release/setup interface when authorized rather than changing account state to investigate. [npm trust][npm-trust], [trusted-publishers page][npm-trusted]

## Concrete verification obligations — none completed here

These are questions/evidence to obtain **after a separate authorization**, not implementation instructions, approved policies or permission to run probes now.

| ID | Missing evidence | What a meaningful result would demonstrate |
| --- | --- | --- |
| V1 | Amendment scope and runtime identity | Distinguish product runtime from Node bootstrap/hooks/dev tools/publisher; record approved channel/version/range and verified per-platform runtime/build artifacts, not a guessed future pin. |
| V2 | npm/source/binary install contract | Packed tarball launches from an unrelated temp repo; explicitly provisioned and missing/wrong Deno cases, scripts suppressed, optional dependencies omitted, offline/read-only scenarios, argv/stdout/stderr/signals/0–1–2 exits and required external tools have stated outcomes. No hidden installer or Node fallback. |
| V3 | Assets and platform execution | Both package and compiled routes read exact schema/template/skill bytes independent of cwd; harnesses see real canonical files; execute the actual artifact on all three platforms with declared OS/libc/signing constraints. Cross-build success alone is insufficient. |
| V4 | Retained checker/lint behavior | Deno-specific and shared runtime modules have complete typechecking inputs/declarations under the selected checker arrangement; demonstrate positive and deliberately invalid fixtures and any tsrs/tsc/Deno diagnostic differences. Biome/knip/Archgate policies still cover those files/imports. |
| V5 | CLI seam and replay | Real Deno process tests retain fake-tool PATH seams and broad declared runtime/assets dependencies; valid red-on-base/green-on-candidate replay is not a missing-Deno/config/permission error; pure Node import tests are identified as narrower evidence. |
| V6 | Mutation path and worker propagation | Known-killable Deno-path mutant killed through the process seam, correct instrumented snapshot/root and active ID, static/runtime activation, collected test/coverage identity, concurrent worker isolation and child cleanup. Report unmeasured/no-coverage explicitly. |
| V7 | Complete four-metric coverage | Deliberately unloaded and partially executed source/bootstrap/rule fixtures produce correct line/statement/branch/function denominators and counts; child Deno profiles complete and map to exact source once; absent/stale/ignored/forged profiles fail; uncached full execution on each leg before any reuse claim. |
| V8 | Permissions and ambient isolation | Noninteractive denials, child authority, inherited env, config/import-map/lock/package discovery, executable/path replacement, build-runtime overrides and cancellation are tested with fake data. State clearly what remains outside Deno's sandbox. |
| V9 | Governing-input and evidence changes | Any later approved configs/locks/compiler declarations/launcher/build/permission profiles become protected inputs with tool/content/source/platform/producer identities; old Node coverage and mutation evidence is not relabeled Deno evidence. |
| V10 | Release activation | Authorized humans verify package ownership, publisher provider/permissions/version prerequisites and exact tarball/binary promotion/provenance/scan evidence. Preserve tag/human approval, privilege separation and outstanding Gate 1/platform blockers. |

**Bottom line:** official support establishes a plausible Deno execution/compile substrate, not compatibility of Superman's retained gates. The largest evidence gaps are the explicit npm launch/provisioning contract, per-worker mutation routing into the actual Deno process, complete four-metric source-bound coverage, and ambient configuration/child-process authority. No policy decision or runtime/platform pass follows from this note.

## Sources

Official documentation below was observed on 2026-11-01 and can change. Implementation-specific claims link immutable commits. Deno's observed docs HEAD was `74beb7585f7e798fe0bc8d867295bff23fc2e38e`; the compile reference is additionally linked at that snapshot. Local citations describe the inspected working-tree text, not a fresh immutable commit or executed evidence.

[spec]: spec.md
[package]: ../../package.json
[bootstrap]: ../../.superman/ci/bootstrap.json
[adr3]: ../../docs/adr/0003-zero-runtime-deps-typescript-only.md
[adr8]: ../../docs/adr/0008-tsrs-primary-typechecker.md
[local-coverage]: ../../.superman/ci/coverage.ts
[local-coverage-policy]: ../../.superman/ci/coverage.json
[local-quality]: ../../.superman/ci/quality.ts
[local-replay]: ../../.superman/ci/replay.ts
[local-fixture-env]: ../../.superman/ci/fixture-env.ts
[local-vitest]: ../../vitest.config.ts
[local-stryker]: ../../stryker.config.json
[local-tsconfig]: ../../tsconfig.json
[stability]: https://docs.deno.com/runtime/fundamentals/stability_and_releases/
[release-api]: https://api.github.com/repos/denoland/deno/releases/latest
[deno-tag]: https://api.github.com/repos/denoland/deno/git/ref/tags/v2.9.8
[deno-npm]: https://registry.npmjs.org/deno/latest
[deno-npm-bin]: https://github.com/denoland/deno/blob/e518fbd66dda5debcbdefc0beb0b3756b37b64fa/tools/release/npm/bin.cjs
[deno-npm-install]: https://github.com/denoland/deno/blob/e518fbd66dda5debcbdefc0beb0b3756b37b64fa/tools/release/npm/install_api.cjs
[deno-identities]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/lib.deno.ns.d.ts#L4898-L4959
[deno-version-source]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/lib/version.rs
[installation]: https://docs.deno.com/runtime/getting_started/installation/
[compile]: https://github.com/denoland/docs/blob/74beb7585f7e798fe0bc8d867295bff23fc2e38e/runtime/reference/cli/compile.md
[run]: https://docs.deno.com/runtime/reference/cli/run/
[check]: https://docs.deno.com/runtime/reference/cli/check/
[typescript]: https://docs.deno.com/runtime/fundamentals/typescript/
[configuration]: https://docs.deno.com/runtime/fundamentals/configuration/
[node-compat]: https://docs.deno.com/runtime/fundamentals/node/
[web-apis]: https://github.com/denoland/docs/blob/74beb7585f7e798fe0bc8d867295bff23fc2e38e/runtime/reference/web_platform_apis.md
[std]: https://docs.deno.com/runtime/reference/std/
[permissions]: https://docs.deno.com/runtime/reference/permissions/
[security]: https://docs.deno.com/runtime/fundamentals/security/
[env]: https://docs.deno.com/runtime/reference/env_variables/
[deno-flags]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/libs/cli_parser/src/defs.rs#L196-L265
[deno-command]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/lib.deno.ns.d.ts#L4140-L4159
[deno-test-coverage]: https://docs.deno.com/runtime/test/coverage/
[deno-coverage]: https://docs.deno.com/runtime/reference/cli/coverage/
[deno-coverage-dir]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/args/mod.rs#L1112-L1125
[deno-coverage-source]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/mod.rs
[deno-coverage-stats]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tools/coverage/reporter.rs#L24-L35
[deno-collector]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/coverage.rs
[deno-cli]: https://docs.deno.com/runtime/reference/cli/
[tsrs]: https://github.com/oxc-project/tsrs#readme
[biome]: https://biomejs.dev/reference/cli/#biome-ci
[vitest-environment]: https://github.com/vitest-dev/vitest/blob/7a825db43e2beca0b219d2eadaec334cb81af0c7/docs/guide/environment.md
[vitest-coverage]: https://vitest.dev/guide/coverage.html
[vitest-coverage-config]: https://github.com/vitest-dev/vitest/blob/7a825db43e2beca0b219d2eadaec334cb81af0c7/docs/config/coverage.md#L515-L524
[vitest-collector]: https://github.com/vitest-dev/vitest/blob/7a825db43e2beca0b219d2eadaec334cb81af0c7/packages/coverage-v8/src/index.ts
[stryker-syntax]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/instrumenter/src/util/syntax-helpers.ts#L21-L67
[stryker-constants]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/api/src/core/instrument.ts
[stryker-runner]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/vitest-runner/src/vitest-test-runner.ts
[stryker-setup]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/vitest-runner/src/stryker-setup.ts
[stryker-sandbox]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/core/src/sandbox/sandbox.ts
[stryker-docs]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/docs/vitest-runner.md
[npm-package]: https://github.com/npm/cli/blob/d12b9434dd010b5fb7044c3cc149cdda317813f8/docs/lib/content/configuring-npm/package-json.md
[npx]: https://github.com/npm/cli/blob/d12b9434dd010b5fb7044c3cc149cdda317813f8/docs/lib/content/commands/npx.md
[npm-install-node]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/
[npm-trusted]: https://docs.npmjs.com/trusted-publishers/
[npm-registry]: https://registry.npmjs.org/npm/latest
[npm-current]: https://github.com/npm/cli/blob/136fc5dacc1a2f3d9a051dbf03a4951228144658/package.json
[npm-11]: https://github.com/npm/cli/blob/d12b9434dd010b5fb7044c3cc149cdda317813f8/package.json
[npm-trust]: https://github.com/npm/cli/blob/136fc5dacc1a2f3d9a051dbf03a4951228144658/docs/lib/content/commands/npm-trust.md
[npm-publish]: https://github.com/npm/cli/blob/d12b9434dd010b5fb7044c3cc149cdda317813f8/docs/lib/content/commands/npm-publish.md
