---
Status: accepted
---

# CodeGraph supplies optional context, never gate authority

**M1 amendment 4, André, 2026-10-30.** Agents benefit from a source-navigation graph without putting a probabilistic/best-effort graph in the merge trust boundary. Use external `@colbymchenry/codegraph@1.6.2`, commit `6560052a6f856855d3f71eee838fd66ccfa4285d`, as optional session-scoped stdio MCP context. Superman's change providers, source/tests and deterministic gates remain authoritative; upstream MCP guidance to "trust" its graph cannot override that boundary. Launch/write controls live in spec §5.9 and ticket 31.

## Rejected alternatives and limits

- **Installer-managed instructions:** rejected. Bare invocation/`install` can edit AGENTS/CLAUDE instructions; upgrade can refresh them. Superman init writes only the reviewed host MCP config and root ignore entries, never runs that installer or launches `npx` to install on demand. Doctor warns and never repairs/installs.
- **Default resident service:** rejected. Direct stdio with separate daemon/watchdog/watch/telemetry/download opt-outs gives a bounded session without intentional persistent service startup. Transient workers/Git calls and ignored index writes are allowed; "no unmanaged persistent processes" is useful, "no child processes" is not.
- **Read-only/sandbox claims:** rejected. Even no-watch direct mode synchronizes indexes. Existing daemons and cross-project paths are not isolated by environment flags; this is not OS isolation or guaranteed absence of global state. Restrict use to the configured repo and report conflicts; verify actual session/platform behavior before enabling.
- **Graph decides gates:** rejected. No CodeGraph-derived acceptance verdict, test selection, approval evidence or mandatory gate prerequisite. Its absence or wrong version is a context warning, not a merge blocker.

## License verification

The actual [LICENSE at the pin](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/LICENSE) is **MIT**, copyright (c) 2026 Colby Mchenry; [npm 1.6.2 metadata](https://registry.npmjs.org/@colbymchenry%2Fcodegraph/1.6.2) independently agrees. Copies/substantial redistributed portions must preserve copyright/permission notices. The inspected npm tarball lacks LICENSE/NOTICE and bundled dependencies were not comprehensively audited; Superman does **not** redistribute those bundles. External execution does not add an npm runtime dependency or relicense Superman.

## Primary runtime sources (source inspection, not execution)

- [CLI](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/bin/codegraph.ts): `serve --mcp --no-watch --path`, installer routes and separate upgrade behavior.
- [MCP startup/lifetime](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/mcp/index.ts), [watchdog opt-out](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/mcp/liveness-watchdog.ts), [watch policy](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/sync/watch-policy.ts).
- [Telemetry](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/telemetry/index.ts) and [npm shim](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/scripts/npm-shim.js): telemetry/update and missing-bundle download are separate opt-outs.
- [MCP instructions](https://github.com/colbymchenry/codegraph/blob/6560052a6f856855d3f71eee838fd66ccfa4285d/src/mcp/server-instructions.ts): guidance is untrusted context subordinate to Superman policy.
