# 06: Ratchets and the switch to `superman gate ci`

**Milestone:** M7

**What to build:** CLI full-mode quality orchestration replacing the existing raw checks only after parity. G6 compares equivalent changed-file scopes at base/candidate; new files initialize measured baselines and nightly separately checks the whole-repo baseline with forced fresh mutation. G5 full mode checks total percentage and clones. G10 and G11 retain their declared local/CI applicability. Ticket 13 later supplies shared-model selection and the accepted partial-corpus G5 limit. Spec §5.3–5.7 is authoritative; no undefined `mutationScorePr` floor is introduced.

**Blocked by:** 05

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** `spec/superman-v0-gate-ci` switches raw CI to the parity-proved CLI, preserving reviewed configs/pins, three-platform checks and non-blocking drift. Retire bootstrap scripts only after equivalent failure fixtures pass; do not remove privileged-writer helpers by deleting `.superman/ci/` wholesale.

- [ ] A same-scope mutation regression fails with survivors; a legacy file improving 20%→30% does not fail merely because the whole-repo baseline is 80%. New-file initialization and nightly whole-repo comparisons are separate cases.
- [ ] A fixture PR that adds a clone touching changed files fails G5.
- [ ] CI annotations and run/attempt/evaluated-SHA/leg-bound receipt artifacts preserve H/B/M identities.
- [ ] Whether Stryker `--since` exists is checked (VERIFY) and the PR records the result; `--mutate` with changed files is used either way.
- [ ] **(M1 amendment)** A fixture with a HIGH-severity vulnerable lockfile entry fails G11, and a fixture with a Biome error fails G10. Both show in the receipt with tool versions. A `.trivyignore` in a fixture makes G1 fail (SUP-007).
- [ ] `superman gate nightly` runs full Stryker with `--force` and full jscpd.

Start with the improving-legacy-file fixture and a genuine same-scope regression.
