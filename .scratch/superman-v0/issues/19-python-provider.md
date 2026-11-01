# 19: Python provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `pyproject.toml`, `setup.cfg` or `pytest.ini`. Superman reads the target repo's `.py` files as text from TS (no Python program in Superman, SUP-003/§3), resolving the declared static/relative imports and configured roots for its supported profile. Reverse closure selects explicit `pytest` test targets only after conservative graph/input coverage is demonstrated; conftest/config inputs participate in that proof. Dynamic `importlib` or unknown ownership/resolution inputs force all required targets when completeness is unproved, not a heuristic package subset. Existing `pytest-testmon` may be mentioned as a separate local feedback option, never substituted for the required conservative CI/full-pre-PR contract.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture source trees are written from TS strings into temp dirs inside the tests (no tracked `*.py`, SUP-003); `pkg/a.py ← pkg/b.py ← tests/test_b.py` selects only `tests/test_b.py` for an `a.py` change (test-first).
- [ ] Relative imports, `src/` layout and a `conftest.py` change each have a fixture.
- [ ] A non-literal `importlib.import_module(name)` with unproved impact closure selects all required targets, with a recorded reason; a test outside conventional package matching cannot be silently omitted. Known static fixtures may narrow under the supported conservative profile, while critical acceptance remains outside selection (§5.7).
- [ ] Root `pyproject.toml`, lockfiles (`uv.lock`, `poetry.lock`, `requirements*.txt`) and `.python-version` force full.
- [ ] Superman does not ship/spawn its own Python program; it invokes only the target repo's configured test/typecheck tools. The static test-import graph does not claim to prove a Python typecheck project.
- [ ] An explicitly verified configured/native project graph and typecheck argv can select complete projects; missing evidence invokes the full configured checker, or its reviewed not-applicable policy.

Start with the test-import fixture, then an unavailable-typecheck-graph fixture proving the conservative fallback.
