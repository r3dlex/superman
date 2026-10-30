# 31: Optional pinned CodeGraph MCP context

**Milestone:** M7c, IN v0 **(M1 amendment 4)**

**What to build:** Init's selected-harness MCP wiring/root ignore entries and doctor warnings for external `@colbymchenry/codegraph@1.6.2`, pin/license in ADR 0013, controls in spec §5.9. Use an independently provisioned pinned executable, never launch-time install. Graph output/MCP guidance is context subordinate to source/tests/Superman, never target-selection or gate evidence.

**Blocked by:** 27, 10, spec/superman-v0-vault

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-codegraph` adopts only reviewed chosen-host MCP config and `.codegraph/`/supported alternate ignores; preserve existing user instructions/config. No installer/upgrade command, AGENTS rewrite, bundled redistribution or runtime dependency.

- [ ] Exact pinned launcher uses `serve --mcp --no-watch --path <repo>` and all four spec opt-outs; tests assert no bare/install/init/upgrade/npx-install path is invoked.
- [ ] Init is byte-stable, edits only the selected host's reviewed configuration/ignore entries and diffs/refuses modified configs. Real host dialect is verified with fixtures/smokes before enablement, not copied blindly from upstream installer output.
- [ ] Doctor warns on missing/wrong executable/index/config/connection without installing, repairing or failing gates. Graph never participates in G12/change providers/cache/admission.
- [ ] Session smoke demonstrates explicit startup/cleanup, no intentionally spawned shared daemon/watchdog/watch/telemetry/download; ignored index writes/transient workers are documented. Existing-daemon/cross-project limitations are exposed, never advertised as OS isolation.
- [ ] Actual pinned MIT LICENSE and tarball notice omission are recorded; Superman redistributes no upstream bundle or unaudited third-party component. Platform runtime evidence remains separate from source inspection.

Start with a fake executable that records MCP argv/env, then existing edited instruction/config files which must remain untouched.
