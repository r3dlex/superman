# Deno compiled capabilities — Superman v0 decision research

**Observed: 2026-11-01. Planning only. No runtime/platform verification. No policy decision or selected Deno pin.**

Research candidate: upstream `v2.9.8`, resolved to immutable source commit **`fe7ed012d92c642fd8e5607ac5a45d517538b5c5`**. Source conclusions below concern that implementation's ordinary V8 `denort` route, not arbitrary custom runtimes or all future releases. Deno permits replacing the compile base through `DENORT_BIN` or an adjacent `denort`, so inspecting source does not establish the identity/behavior of a released executable. [Tag resolution][tag]; [compile runtime][compile-doc]

Task-supplied scope: Deno product CLI, hooks, owned bootstrap and writers; retain Node/pnpm, tsrs, Vitest, Stryker and Biome quality tooling. V0 distributes Deno source/assets **and** precompiled CLI binaries for macOS arm64, Linux x64 and Linux arm64, without npm distribution. Compiled CLI users need no installed Deno; hooks require Deno separately. Earlier Q9 disallows `-A`/`--allow-all`, permission prompts and a broker; exact per-class profiles remain Gate 1 work. This note does not amend that scope or approve broader grants.

The earlier [runtime research](deno-runtime-research.md) was read and left unchanged. Only this new note was written. No Deno execution/installation, platform probe, credentials, hosted writes, Git operations, configuration/pin/code changes or additional agents were used.

## Popup-sized factual summary

- **The contradiction is narrower than “compiled means build-machine paths.”** Relative **CLI permission flags** survive as strings and bind to the binary's **startup cwd**. Paths supplied through a `deno.json` permission set instead become **absolute relative to that config during compilation**. These routes are not interchangeable. [Flag conversion][flags-options]; [config bases][config-base]; [runtime construction][rt-permissions]; [upstream relative-path fixture][relative-test]
- **No noninteractive self-expansion:** appended `--allow-*` arguments are application arguments, not runtime grants. `Deno.permissions.request()` cannot override a denial or add an ungranted resource with prompting disabled. No stable or unstable compiled permission-flag passthrough/path-variable feature was found in the inspected implementation. [Runtime argv][rt-argv]; [request implementation][request]; [flag definitions][compile-flags]; [path parser][descriptor-parser]
- **Portable names are possible, not identity guarantees:** embedded `--allow-run=git,pnpm` names resolve using the **runtime startup PATH**. An unlisted direct executable is not admitted; a permitted interpreter/package runner does not sandbox what it runs. [Run initialization][run-init]; [name resolution][run-parse]; [security model][security-doc]
- **Broker warning needs route qualification:** full `deno` startup reads `DENO_PERMISSION_BROKER_PATH`; an active broker overrides permission checks even under `--no-prompt`. Standard `denort` startup in this candidate does **not** initialize it from that variable. Do not claim a demonstrated compiled-grant override merely from the generic docs. [Broker setup][broker-init]; [decision precedence][broker-check]; [compiled startup][rt-main]
- **Decision remains open:** A portable broader-class binary, B deployment-specific compile/profile, or C a constrained startup-cwd envelope are factually distinguishable options. C does not solve arbitrary external paths/endpoints. None proves repository or subprocess isolation. [Options below](#options-for-a-human-decision--none-selected)

## 1. What is fixed, and what can change at launch?

Deno documents compile-time runtime flags, including permissions. In source, compilation serializes `PermissionsOptions` into metadata; ordinary compiled startup reconstructs permissions from that metadata. Runtime argv is appended to `metadata.argv`, without running the full Deno CLI flag parser. Thus `./superman --allow-read=/another/repo`, `--no-prompt`, `--config=...` or `-P=...` cannot themselves change the embedded Deno settings. Application code could interpret those spellings, but that does not grant Deno capabilities. [Compile flags][compile-doc]; [metadata producer][metadata-build]; [metadata type][metadata-type]; [runtime argv][rt-argv]; [permission construction][rt-permissions]

With **embedded no-prompt behavior** and no broker, the stable permission API is inspection/request/revocation, not a grant setter:

| Operation | Source-established behavior |
| --- | --- |
| `query()` / `querySync()` | Reports the current permission; does not confer it. An ungranted descriptor can report `prompt` even when prompting is disabled. [API declarations][permission-api]; [request state handling][request] |
| `request()` / `requestSync()` | Already granted returns granted. A non-`prompt` state, including explicit denial, returns unchanged. A `prompt` state with prompting disabled returns denied. It does not discover a repository/cache/endpoint and silently authorize it. [Request implementation][request] |
| `revoke()` / `revokeSync()` | Removes grants; it does not override explicit denials or create replacements. Revoking a whole category clears its global grant **and its entire granted list**. Therefore “request one path under global read, then revoke global read to keep only that path” is not a supported narrowing recipe. [Revocation implementation][revoke] |

**Do not infer that compilation alone disables prompts.** The candidate compile parser does not unconditionally set `no_prompt`; permission options use `prompt: !resolve_no_prompt(...)`. The standalone prompter even contains compile-specific prompt text. Explicit compile-time `--no-prompt` makes the intended noninteractive behavior independent of build environment/TTY; launch-time `--no-prompt` is too late. This source qualification is stronger than the blanket “never prompted” wording in the current compile example. [Compile parser][compile-parser]; [prompt derivation][no-prompt]; [standalone prompter][standalone-prompt]; [example wording][compile-example]

## 2. Filesystem scope: startup cwd, build config, and assets are different bases

| Input to compilation | Binding in the inspected implementation |
| --- | --- |
| CLI `--allow-read=.` / `--allow-write=./out` / corresponding deny paths | Flag values are copied unchanged into options/metadata. At compiled startup, the path descriptor parser joins relative values to the **real process cwd**, then normalizes them. They are not implicitly relative to the build cwd, source file or executable location. [Flag/options conversion][flags-options]; [metadata producer][metadata-build]; [runtime construction][rt-permissions]; [path normalization][path-resolution]; [real cwd adapter][rt-cwd] |
| Config permissions selected with `-P` (either `compile.permissions` or a named set), containing `"read": ["./data"]` | Config permission paths are converted to absolute paths relative to the declaring config's directory **before metadata is written**. A config-path grant therefore normally points into the build machine's layout, not the eventual caller's cwd. CLI permission values bypass that config-path conversion. Config run entries containing path separators receive the same base treatment; bare executable names stay names. [Set selection][config-selection]; [config conversion][config-base]; [metadata producer][metadata-build] |
| Absolute CLI path | Remains that absolute host path; moving the binary does not relocate it. [Unchanged flag values][flags-options]; [path normalization][path-resolution] |
| Embedded assets / `import.meta.dirname` | These use the compiled module/VFS layout, a separate concern from caller-repository grants. Runtime adds the VFS root to the read allowlist, preserving existing global grants; deny rules still have their normal precedence. This is not permission to arbitrary neighboring files beside the installed executable. [Asset docs][compile-doc]; [VFS grant][vfs-read]; [permission precedence][permissions-doc] |

The upstream Unix fixture compiles with `--allow-read=a.txt --no-prompt`, then launches both in the original directory and in a new subdirectory, expecting **file-not-found**, not a permission error, in each. That corroborates launch-cwd rebinding; it is an upstream fixture read here, **not a test executed by this worker**. [Fixture][relative-test]; [fixture program][relative-main]

Once startup constructs the descriptors, they contain resolved paths. Later changing cwd changes how a new relative operation is resolved; it does not rebuild the startup allowlist. Starting in a subdirectory or passing an application `--repo` outside startup cwd consequently does not automatically grant the detected repository root. These are deductions from one-time construction and descriptor resolution, not tested Superman behavior. [Runtime construction][rt-permissions]; [path normalization][path-resolution]

### No runtime path-template substitution was found

The inspected filesystem parser feeds permission text to `Path::new` and normalizes/joins it; the config converter does likewise. There is no Deno expansion there for `$HOME`, `${HOME}`, `$PWD`, a hypothetical `$CWD`/`$EXE_DIR`, or `~`, nor a read/write path-glob evaluator. A shell-expanded `$HOME` supplied to **the build command** instead becomes the build caller's concrete value. Environment-name suffix wildcards and network host patterns described in the permissions reference are different facilities, not path interpolation. [Parser][descriptor-parser]; [path handling][path-resolution]; [config conversion][config-base]; [permission syntax][permissions-doc]

### A path grant is not a repository sandbox

Deno documents that ordinary access through an existing symlink is authorized by the **symlink's location**, not its target; special system paths receive additional checks. Thus a directory allowlist is not a realpath/chroot confinement promise. Separately, Git documents linked-worktree `.git` files pointing to private/common metadata under another repository directory. A cwd-scoped **direct Deno** read/write cannot simply be assumed to cover that other directory. If an allowed Git child performs the operation instead, its filesystem authority is outside Deno's restrictions. [Symlinks][permissions-doc]; [Git worktree layout][git-worktree]; [subprocess authority][security-doc]

## 3. Executable names: portable runtime lookup, not build-time tool identities

For `--allow-run=git,pnpm` supplied as flags, the metadata retains names. When compiled startup calls `Permissions::from_options`, each allowed name is resolved using the then-current **PATH and cwd**. Entries containing `/` on the requested Unix targets are treated as paths; relative paths use cwd. A name that cannot be found is logged and omitted; if all named entries fail resolution, the implementation converts the result to **no run permissions**, not the empty-list allow-everything sentinel. The allowlist is not a lazy promise to permit a tool installed later. [Metadata producer][metadata-build]; [runtime construction][rt-permissions]; [resolution/empty handling][run-init]; [PATH parsing][run-parse]

At an actual spawn, Deno separately computes the child's cwd/environment, resolves the command using **that** effective PATH/cwd, and checks the resolved absolute path against the allowed executable paths. Run grants match exact paths, not every program inside an allowed directory. A later PATH change or a custom child PATH can therefore select a different, ungranted executable. Neither startup lookup nor matching proves executable content, tool version, signature or trust. [Spawn resolution and check][spawn-resolution]; [child environment and lookup][spawn-env]; [run matching][run-match]

Consequences for the requested portable product, not a chosen profile:

- Fixed supported names can work across different installation paths without compiling on each caller's machine. Arbitrarily configured **additional direct command names/paths** are not automatically covered by that finite list. [Run initialization][run-init]; [PATH parsing][run-parse]; [no-prompt requests][request]
- Run permission bounds which executable is started, **not its arguments, scripts, descendants, repository accesses or endpoints**. Allowing a shell, Deno, Node or a package runner to execute arbitrary gates/providers is trust delegation, not an escape-free capability broker. The official security guidance treats subprocess capability as effectively full host authority for trust decisions. [Security model][security-doc]; [permission reference][permissions-doc]
- Named env permissions do not sanitize the environment inherited by a child. `Deno.Command` defaults `clearEnv` to false, and Rust constructs inherited env separately from JS `Deno.env` reads. Under scoped run permissions, nonempty `LD_*`/`DYLD_*` child variables also require unscoped run authority; upstream recommends unsetting them when not needed. This matters for portable fake-tool and real-tool launches. [Command options][command-options]; [spawn environment][spawn-env]; [linker-variable check][spawn-linker]; [permission reference][permissions-doc]

## 4. Arbitrary endpoints/caches and possible dynamic mechanisms

Filesystem grants cover paths/subtrees; net grants cover specified hosts/IPs with optional ports, or the whole category when no list is supplied. Env grants name variables (with documented suffix patterns). A future user-configured cache outside all granted paths, or an endpoint outside all granted net scopes, cannot be authorized simply by reading that configuration under `--no-prompt`. **Whether the CLI itself performs the I/O or an allowed child does it is essential:** a child needing an external cache/endpoint does not inherit the parent's Deno read/write/net restrictions. [Permission scopes][permissions-doc]; [request limits][request]; [subprocess model][security-doc]

No compiled-runtime permission-flag passthrough was found among the candidate's compile options, granular unstable flags or startup argv handling. There is no evidence for a stable **or** unstable `./superman --allow-*`/runtime permission-file route. This is a bounded finding about inspected sources, not a claim that upstream can never add one. [Compile and unstable flag definitions][compile-flags]; [unstable flag inventory][unstable-flags]; [runtime argv][rt-argv]

Two real mechanisms must not be overstated:

1. **Source launch:** installed Deno can receive fresh scoped `deno run --no-prompt --allow-...` flags at each invocation. This can make paths/endpoints invocation-specific without recompilation, provided the launcher/profile is trusted and ambient startup inputs are controlled. It is appropriate to investigate for the already separate source/hooks route; it does **not** supply the required no-installed-Deno binary route. [Permissions][permissions-doc]; [compile/runtime boundary][compile-doc]
2. **Narrowed Web Workers:** `deno.permissions` in worker options is guarded by **`--unstable-worker-options`**. Runtime-computed worker scopes must be allowed by the parent, or creation fails with permission escalation. It cannot widen a narrow compiled parent; a broad supervisor remains broad, and its subprocesses remain unsandboxed. This is a genuine unstable narrowing mechanism, not stable permission passthrough or a selected Superman design. [Unstable docs][worker-doc]; [feature gate][worker-gate]; [parent ceiling][worker-ceiling]

## 5. Startup environment and configuration: distinguish full Deno from denort

### Broker authority

**Full Deno, including source/hooks and the compiler:** `cli/lib.rs` reads `DENO_PERMISSION_BROKER_PATH` and installs a broker during startup, before ordinary CLI flag processing/application execution. Its setup emits an **experimental feature** warning; no extra unstable flag gates this setup. The permission-check implementation consults the broker **before** the normal granted/denied/prompt logic. An allowing broker can therefore authorize an I/O check despite allow/deny flags or no-prompt. Application `--allow-env`/`--deny-env` does not gate that Rust startup read, and `Deno.permissions.query()` is not proof that no broker governs later I/O. [Setup/call site][broker-init]; [query versus check][request]; [check precedence][broker-check]; [official broker description][security-doc]

**Ordinary compiled CLI in this candidate:** `denort` has a separate entrypoint. Its startup reads the embedded metadata and builds permissions; it does **not** call full-Deno `maybe_setup_permission_broker` or initialize the broker from the environment. The broker's global state is unset unless `set_broker` is called. Consequently, the inspected source does **not** support the claim “setting `DENO_PERMISSION_BROKER_PATH` overrides embedded grants/no-prompt in a standard 2.9.8 compiled binary.” This is source evidence only, not a runtime/platform security result, and does not certify a custom `DENORT_BIN`. [Denort package/entrypoint][denort-package]; [compiled main][rt-main]; [permission construction][rt-permissions]; [broker state][broker-state]; [full-Deno setup][broker-init]

The supplied **no-broker** constraint still matters for hooks/source and for Deno children launched by the binary: inherited environment can reach full Deno. Checking or deleting the variable in the application's JS entrypoint is not equivalent to preventing full-Deno startup activation. [Full-Deno startup order][broker-init]; [default child inheritance][spawn-env]

### Other build/runtime inputs

| Surface | Source-established distinction |
| --- | --- |
| Build and source/hooks config | Full Deno discovers config and supports explicit `--config`/`--no-config`, lock controls, import maps and package.json resolution. Permission sets require opt-in `-P`; the compiler serializes the resolved options/import-map/workspace data. `--no-config` is not by itself a claim that lock/package/env inputs disappeared. [Configuration discovery][configuration-doc]; [permission sets][sets-doc]; [CLI config/lock flags][resolution-flags]; [environment controls][env-doc]; [metadata production][metadata-build] |
| Compiled startup config | The ordinary runtime initializes its workspace resolver from **embedded** import-map JSON/package metadata; it does not repeat the full CLI's cwd `deno.json`/permission-set/lock discovery to replace those startup settings. This does not exclude later host-filesystem module resolution, application config reads or child-tool configuration. [Compiled startup][rt-main]; [embedded resolver construction][runtime-resolver]; [host/package resolver creation][runtime-package-resolver] |
| `DENO_NO_PROMPT` | Full Deno combines the flag with this env setting when making options; that resulting `prompt` boolean is what compilation stores. Standard compiled permission construction consumes the stored boolean, not a fresh `DENO_NO_PROMPT` lookup. A runtime env value cannot turn an embedded false `prompt` back on; relying on an ambient build env value instead of explicit flags would leave an undeclared build input. [No-prompt derivation][no-prompt]; [metadata][metadata-build]; [runtime permissions][rt-permissions] |
| `DENO_V8_FLAGS` | Full Deno has an env reader. Standard compiled V8 initialization instead passes metadata flags and an empty env-flag vector. Do not apply the general environment-reference table wholesale to compiled startup. This is about this variable/path, not a proof that all inherited env is ignored. [Full-Deno reader][v8-env]; [compiled V8 startup][rt-v8]; [flag combiner][v8-combiner] |
| `--env-file` at compile time | Values enter metadata; runtime fills only variables absent from its inherited environment. This is not runtime dotenv-file discovery or environment sanitization. [Metadata field/producer][metadata-type]; [runtime env loading][rt-main] |
| Ambient compiled-runtime behavior | A concrete counterexample to “compiled means ambient-free”: the candidate supports `DENO_INTERNAL_CHILD_ENTRYPOINT` with `NODE_CHANNEL_FD` for Node-compatible `fork()`, including fallback to an on-disk cwd-relative module. Its own source explicitly says a hostile environment is **not** a security boundary here. Runtime cwd/PATH lookup also remains real. No exhaustive safe startup-env profile was established. [Fork startup logic/comment][fork-env]; [real runtime env/cwd adapter][rt-cwd] |

## Options for a human decision — none selected

| Option | Feasible mechanism | Honest limitation |
| --- | --- | --- |
| **A. Portable release binaries with explicitly broader per-class grants** | Compile fixed profiles; use relative paths where their envelope suffices, runtime-PATH names for a finite tool list, and broader read/write/run/net classes **where actually required and separately approved**. Other categories can remain unavailable. Class-wide grants do not require spelling `-A`. [Permission categories][permissions-doc]; [relative binding][relative-test]; [run binding][run-init] | This may conflict with the intended meaning of Q9's “bounded”; research cannot resolve that policy question. Do not call broad filesystem/net/run authority repository least privilege. Explicitly exclude subprocess/repository sandbox claims; retain application writer/command validation and external execution boundaries as separate controls. [Security model][security-doc] |
| **B. Repository/deployment-specific compile and reviewed profile** | Supply exact repo/common-Git-dir/output/cache paths, endpoint scopes and executable paths/names at compile time, with no-prompt. Rebuild/reapprove when required resources fall outside the compiled envelope. Source release enables investigation of this route. [Compile flags][compile-doc]; [path bases][config-base]; [request ceiling][request] | Not one universal narrow binary for arbitrary caller layouts. Repository relocation, a new external cache/provider host or additional command can invalidate the profile. Even exact run paths do not sandbox child behavior or pin executable bytes. [Path handling][path-resolution]; [run matching][run-match]; [security model][security-doc] |
| **C. Constrained portable startup-cwd envelope** | Embed relative **CLI** grants such as `.`/owned subdirectories, fixed tool names and fixed endpoint scopes; require startup cwd/layout to fit the reviewed envelope. This works by runtime binding, not variable interpolation or new grants. [Relative fixture][relative-test]; [options/path construction][flags-options]; [runtime construction][rt-permissions] | Cannot silently cover arbitrary outside Git metadata, caches, repo paths or endpoints. Expanding to a broad common ancestor changes the exposure. If broad parent authority plus narrowed workers is considered, classify it honestly as A plus an unstable worker boundary, not a narrow whole binary. [Git layout][git-worktree]; [request ceiling][request]; [worker ceiling][worker-ceiling] |

An invocation-specific **source/hook launcher** is another documented route, but requiring installed Deno for that launcher cannot replace the explicitly required self-contained CLI binaries. A broker would change authority and is already excluded. No other stable runtime grant mechanism satisfying all those constraints was established. [Source permissions][permissions-doc]; [compiled flags][compile-doc]; [broker model][security-doc]

## Evidence still absent — not authorization to run probes

No product profile, compatibility pass, platform acceptance or least-privilege result follows from reading source. Future separately authorized evidence would need to cover: both flag/config path bases from unrelated cwd; subdirectory and external `--repo`; moved/symlinked paths and linked-worktree common dirs; runtime PATH/fake-tool resolution and changes; missing/new tools; child env/linker controls; endpoint/cache changes; actual compiled no-prompt/API-denial behavior; broker presence for full Deno versus denort; hostile cwd configs and startup env; and independent macOS arm64/Linux x64/Linux arm64 execution. The retained Node quality-tool contract and existing Gate 1 blockers are not waived.

## Sources

Official docs were read on 2026-11-01 and may change. All implementation links below use the same immutable candidate commit; fixture citations mean **inspected upstream expectations**, not locally executed evidence.

[tag]: https://api.github.com/repos/denoland/deno/git/ref/tags/v2.9.8
[compile-doc]: https://docs.deno.com/runtime/reference/cli/compile/
[compile-example]: https://docs.deno.com/examples/deno_compile/
[permissions-doc]: https://docs.deno.com/runtime/reference/permissions/
[security-doc]: https://docs.deno.com/runtime/fundamentals/security/
[configuration-doc]: https://docs.deno.com/runtime/fundamentals/configuration/
[sets-doc]: https://docs.deno.com/runtime/reference/deno_json/#permissions
[env-doc]: https://docs.deno.com/runtime/reference/env_variables/
[worker-doc]: https://docs.deno.com/runtime/reference/cli/unstable_flags/#--unstable-worker-options
[git-worktree]: https://git-scm.com/docs/git-worktree/2.56.0#_details
[flags-options]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/args/mod.rs#L1752-L1813
[config-base]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/args/mod.rs#L1815-L1962
[config-selection]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/args/mod.rs#L1204-L1313
[metadata-build]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/standalone/binary.rs#L1073-L1192
[metadata-type]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/lib/standalone/binary.rs#L74-L117
[rt-main]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/lib.rs#L58-L115
[rt-argv]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/binary.rs#L69-L156
[rt-permissions]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L1724-L1739
[descriptor-parser]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/runtime_descriptor_parser.rs#L45-L79
[path-resolution]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L1377-L1415
[rt-cwd]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/file_system.rs#L1159-L1191
[relative-test]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tests/specs/compile/relative_permissions/__test__.jsonc
[relative-main]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/tests/specs/compile/relative_permissions/main.ts
[vfs-read]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L2126-L2148
[run-init]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L3816-L3893
[run-parse]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L2830-L2872
[run-match]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L2739-L2757
[spawn-resolution]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/ext/process/lib.rs#L1314-L1344
[spawn-env]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/ext/process/lib.rs#L1411-L1512
[spawn-linker]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/ext/process/lib.rs#L1524-L1580
[command-options]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/lib.deno.ns.d.ts#L4140-L4159
[permission-api]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/tsc/dts/lib.deno.ns.d.ts#L4740-L4822
[request]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L1028-L1157
[revoke]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L1159-L1176
[compile-parser]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/libs/cli_parser/src/convert.rs#L2087-L2142
[no-prompt]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/args/mod.rs#L1689-L1692
[standalone-prompt]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/prompter.rs#L549-L558
[compile-flags]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/libs/cli_parser/src/defs.rs#L1764-L1885
[unstable-flags]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/libs/cli_parser/src/defs.rs#L403-L552
[worker-gate]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/ops/worker_host.rs#L316-L332
[worker-ceiling]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L1238-L1289
[broker-init]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/lib.rs#L821-L885
[broker-check]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/lib.rs#L522-L580
[broker-state]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/runtime/permissions/broker.rs#L19-L29
[denort-package]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/Cargo.toml#L3-L20
[resolution-flags]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/libs/cli_parser/src/defs.rs#L198-L265
[runtime-resolver]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L1622-L1678
[runtime-package-resolver]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L1458-L1500
[v8-env]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/util/v8.rs#L7-L13
[rt-v8]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L1853-L1857
[v8-combiner]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/lib/util/v8.rs#L3-L14
[fork-env]: https://github.com/denoland/deno/blob/fe7ed012d92c642fd8e5607ac5a45d517538b5c5/cli/rt/run.rs#L1425-L1456
