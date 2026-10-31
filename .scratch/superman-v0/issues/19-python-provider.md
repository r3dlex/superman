# 19: Python provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by `pyproject.toml`, `setup.cfg` or `pytest.ini`. superman reads the target repo's `.py` files as text from TS (no Python in superman, SUP-003 and §3): `import a.b`, `from a.b import c`, relative imports (`from . import x`, `from ..y import z`), with roots from `src/` layout, `[tool.setuptools]`/`[tool.pytest.ini_options] pythonpath` where present, and top-level packages. The reverse closure gives affected test files (`test_*.py`, `*_test.py`); a `conftest.py` change selects every test below its directory. Test command: `pytest <files>`. If the repo already uses `pytest-testmon` (`.testmondata` or the plugin in its deps), `superman affected --staged` mentions `pytest --testmon` for local runs; CI keeps the static graph. Dynamic `importlib` use makes the package's tests affected (`confidence: "heuristic"`).

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] Fixture source trees are written from TS strings into temp dirs inside the tests (no tracked `*.py`, SUP-003); `pkg/a.py ← pkg/b.py ← tests/test_b.py` selects only `tests/test_b.py` for an `a.py` change (test-first).
- [ ] Relative imports, `src/` layout and a `conftest.py` change each have a fixture.
- [ ] `importlib.import_module(name)` with a non-literal name marks the package's tests `heuristic`.
- [ ] Root `pyproject.toml`, lockfiles (`uv.lock`, `poetry.lock`, `requirements*.txt`) and `.python-version` force full.
- [ ] Superman does not ship/spawn its own Python program; it invokes only the target repo's configured test/typecheck tools. The static test-import graph does not claim to prove a Python typecheck project.
- [ ] An explicitly verified configured/native project graph and typecheck argv can select complete projects; missing evidence invokes the full configured checker, or its reviewed not-applicable policy.

Start with the test-import fixture, then an unavailable-typecheck-graph fixture proving the conservative fallback.
