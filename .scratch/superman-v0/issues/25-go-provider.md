# 25: Go provider

**Milestone:** post-v0 **(M1 amendment 3)**

**What to build:** Detected by `go.mod` or `go.work`. `go list -deps -json ./...` gives each package's `ImportPath`, `Dir`, `Imports` and `Deps`; a changed file belongs to the package whose `Dir` contains it; affected targets are the packages whose `Deps` include an affected package, plus the package itself. Test command: `go test <import paths>`. `go.mod`, `go.sum` and `go.work` force full.

**Blocked by:** 12

**Status:** post-v0

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fake `go` replaying recorded `go list -deps -json` output selects `pkg/a` and its importers for an `a` change (test-first).
- [ ] A `_test.go`-only change selects only that package.
- [ ] Build-tagged files are claimed by their directory's package.
