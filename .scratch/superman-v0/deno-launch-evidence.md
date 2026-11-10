# Deno bootstrap launch — preparation evidence

Status: local observed-runtime source launch. Not a pin, not evaluator activation, not a grant selection, and not Gate 1 admission.

The probe is `.scratch/superman-v0/deno-launch.probe.test.ts`. The `.test.ts` suffix was approved so the existing coverage exclusion applies. The file is outside `.superman/ci/**/*.test.ts`, so `coverage.ts` does not execute it. No evaluator, ticket, workflow, package, ADR, glossary, or historical evidence file was edited.

## Command

```text
SUPERMAN_DENO_BIN=/opt/homebrew/Cellar/deno/2.9.8/bin/deno node --test --test-reporter=tap .scratch/superman-v0/deno-launch.probe.test.ts
```

Final result: **9 passed, 0 failed, 0 skipped**, exit 0, duration 634 ms. Measurement driver: Node `v26.5.0`. The driver process was not claimed to be isolated; the Deno child received only the explicit allowlist.

An earlier run of the same file exited 1 with 7 passed and 2 failed. Both failures were in the probe, not in Deno: the canary fake omitted the `v8` and `typescript` lines the parser requires, and the config fixture created `child` without its parent. Those two driver corrections were applied before this green command. Assertions were not weakened.

## Observed runtime

| Field | Observed value |
|---|---|
| Explicit path | `/opt/homebrew/Cellar/deno/2.9.8/bin/deno` |
| `deno --version` | `deno 2.9.8 (stable, release, aarch64-apple-darwin)`; V8 `15.0.245.2-rusty`; TypeScript `6.0.3` |
| sha256 | `2e5e5177a25d6a89847f229996fc8f104db8985356f7608067de7a59a42059fe` |
| Size | 131575696 bytes |
| Signature | adhoc, TeamIdentifier not set |

This digest is the measured local bottle. It is not hardcoded as a pass condition and was not verified against an upstream release checksum. Homebrew is not provenance. No install, download, or upgrade was performed.

## Process outcomes

| Test | Observed outcome |
|---|---|
| Missing explicit path | Driver throws before spawn. No Node fallback. |
| `process.execPath` supplied as the binary | Driver rejects it as a Node fallback. |
| Canary fake `--version` | Driver rejects `canary` / `aarch64-apple-darwin` before treating the launch as success. |
| Stable identity launch | Exit 0, empty stderr, identity JSON matches that binary, `standalone` false. Cache files, including `node_compat_bin/node`, stayed under the owned `DENO_DIR`. Owned `HOME` stayed empty. That shim was not placed on `PATH` and is not real Node. |
| Parent `deno.json` `unstable: ["not-a-feature"]` | Without `--no-config`, stderr warns. With the control flags, exit 0 and stderr is empty. |
| `DENO_V8_FLAGS=--not-a-real-v8-flag` passed to the child | Exit 1, empty stdout, V8 rejects the flag. |
| `DENO_PERMISSION_BROKER_PATH` set to a missing owned path | Exit 87, empty stdout, experimental-broker warning. |
| Ungranted read of an owned file | Exit 1, `NotCapable`, secret text not printed. No `-A` or `--allow-*`. |
| PATH shim named `deno` | The name `deno` runs the shim. The explicit binary path does not, and the shim marker is not recreated. |

Launch argv for the controlled cases was `run --no-prompt --no-config --no-lock --no-npm --no-remote` plus the fixture script. Child env was only `PATH`, `HOME`, `TMPDIR`, and `DENO_DIR`, plus the hostile variable in the two negative pairs. Absence of a startup variable was shown by Deno failing when that variable was passed, not by the script reading its environment.

## Limits

`--no-lock`, `--no-npm`, and `--no-remote` are required argv. Their effect on a no-import script was not demonstrated. This run is darwin-arm64 only. It does not select grants, port `raw-gates`, switch hooks or the evaluator, run `deno check`, coverage, or mutation, or prove three-platform acceptance. The current Node evaluator remains the active one. Historical Node evidence was not rewritten.
