# superman workflows

**Status.** The `superman` CLI is **specified, not implemented**. This repository currently runs the Node bootstrap described in [Today's bootstrap](#todays-bootstrap-what-actually-runs); the Deno candidate beside it is parallel and non-admitting.

**How to read this.** The command *contract* — exact flags, exit codes, what each command must refuse — lives in [spec §5.2](.scratch/superman-v0/spec.md#52-cli-commands) and is not repeated here. This document holds the operational map: **which command answers which question, in what order, and what its result does and does not prove.** Where a row here says "contract", the spec is the authority; where it says a number or a path, the repository is the authority and the environment wins.

Every command exits `0` (ok), `1` (a gate failed) or `2` (misconfigured or a tool error). Every gate command writes a [receipt](GLOSSARY.md).

## The workflows

### Adopt superman in a repository

Once, in a reviewed spec-kind PR.

```text
superman init --repo-kind ts     # configs, lock, ratchet, hook, AGENTS block, CODEOWNERS, CI
superman doctor                   # is the installation coherent? identities, tools, pins, hook config
```

`init` is byte-stable: re-running it shows no diff, and it refuses a modified generated file unless `--force` is explicit. It sets only a safe repo-local `core.hooksPath`. It never force-resets, installs or stages.

### Work a ticket

The agent's loop. Each ticket is exactly one PR.

```text
superman next                    # which ticket is eligible, from merged-base state
superman claim <ticket>          # reserve it across the clone's worktrees
   … implement, one slice at a time …
superman pr open <ticket>        # one PR, as the agent identity
```

`next` reads eligibility from merged-base state and excludes tickets that are claimed or already have a PR. `claim` is explicit about release and recovery; it never steals a live claim. `pr open` refuses a conflicting claim or PR, and it never approves or merges.

### Get fast feedback before committing

```text
superman gate pre-commit
```

Runs on the staged files and nothing else: `archgate check --staged`, typecheck, `biome check --staged --no-errors-on-unmatched`, the affected tests, knip, a protected-path check, the duplication check over the changed files, and the assertion that the staged content is green. It is **partial staged feedback** and its receipt says so; it never satisfies the full bar.

### Propose a branch as a PR

```text
superman gate pre-pr --base origin/main
```

The full blocking quality portfolio: tsrs plus the supplemental Deno checks, tests and overall coverage, fresh critical acceptance, strict Archgate, Biome, Trivy, knip, the full-corpus duplication baseline, equivalent-scope Stryker, and the applicable policy, integrity, traceability, replay and wiki checks.

### Understand what a change requires

```text
superman affected --staged --json   # changed files, affected targets, each one's reason chain
superman gate pre-pr --affected      # only the selected checks; unknown graphs force the full selection
```

`affected` is read-only and prints the change model the gates use. `--affected` narrows the work; a missing or untrustworthy safety state forces the uncached full run, and a missing tool never becomes an `n/a`.

### Decide whether a PR can merge

André's side, against the live forge.

```text
superman merge-ready <pr>
```

It verifies the seven conditions of [spec §9.2](.scratch/superman-v0/spec.md) against the forge rather than against a receipt: the approver's latest review is `APPROVED` with `commit_id == headSha`; the required workflow/job/App identities are present and successful for the integration evidence, with head H, tested base B and tested merge M checked against each other; the PR kind matches its branch and its changed files obey that kind's path policy recomputed from the forge; the base is `main`, the PR is mergeable and the evidence covers the current base.

It **prints** the merge command with `--match-head-commit` and stops. The human merges. The head flag guards the head only; strict base freshness is a separate, independently verified condition.

### A gate refuses

Read the receipt before you retry. The taxonomy names the reason: a missing tool, an ignored failure, skipped or absent required work, an incomplete or stale report, and a policy refusal are different failures and none of them is green. Retrying until green is not a repair.

### Audit and maintenance

```text
superman audit --since <date>     # approval/merge/direct-push violations, selection misses, stale passes
superman skills sync              # make the installed catalog match the lock
superman skills verify            # locally a warning; in CI a hard gate (G7)
superman wiki check --pr <number> # the G12 validator for a governed-knowledge change
```

## The command map

One row per command. The question is the operational trigger; the contract is the spec.

| Command | The question it answers | Contract |
| --- | --- | --- |
| `superman init` | "Set this repository up." | [§5.2](.scratch/superman-v0/spec.md) |
| `superman doctor` | "Is this installation coherent?" | [§5.2](.scratch/superman-v0/spec.md) |
| `superman gate pre-commit` | "Is my staged change good enough to commit?" | [§5.2](.scratch/superman-v0/spec.md), [§5.4](.scratch/superman-v0/spec.md) |
| `superman gate pre-pr` | "Is this branch ready to propose as a PR?" | [§5.2](.scratch/superman-v0/spec.md), [§5.4](.scratch/superman-v0/spec.md) |
| `superman gate ci` | "Does this head's integration with the base hold?" | [§5.4](.scratch/superman-v0/spec.md) |
| `superman gate pre-pr\|ci --affected` | "Which checks does this change actually require?" | [§5.2](.scratch/superman-v0/spec.md), [§5.7](.scratch/superman-v0/spec.md) |
| `superman affected` | "Which targets does this change affect, and why?" | [§5.2](.scratch/superman-v0/spec.md), [§5.7](.scratch/superman-v0/spec.md) |
| `superman merge-ready <pr>` | "May this PR be merged right now?" | [§5.2](.scratch/superman-v0/spec.md), [§9.2](.scratch/superman-v0/spec.md) |
| `superman pr open <ticket>` | "Open this ticket's one PR." | [§5.2](.scratch/superman-v0/spec.md) |
| `superman next` | "Which ticket can I claim next?" | [§5.2](.scratch/superman-v0/spec.md) |
| `superman claim <ticket>` | "Reserve this ticket across the clone's worktrees." | [§5.2](.scratch/superman-v0/spec.md) |
| `superman audit` | "Has anything bypassed the approval rules?" | [§5.2](.scratch/superman-v0/spec.md) |
| `superman skills sync` | "Make the installed catalog match the lock." | [§5.2](.scratch/superman-v0/spec.md), [§5.6](.scratch/superman-v0/spec.md) |
| `superman skills lock --pocock <sha>` | "Move the pinned Pocock/overlay version." | [§5.2](.scratch/superman-v0/spec.md) |
| `superman skills verify` | "Does the installed plugin cache still match the lock?" | [§5.2](.scratch/superman-v0/spec.md) |
| `superman wiki check` | "Is the governed wiki valid for this change?" | [§5.2](.scratch/superman-v0/spec.md), [§5.8](.scratch/superman-v0/spec.md) |
| `superman --version` | "Which build is this?" | [§5.2](.scratch/superman-v0/spec.md) |

## Today's bootstrap — what actually runs

The CLI does not exist yet. These are the real entry points in this repository, and they are what the preparation measures.

| Command | What it does |
| --- | --- |
| `node .superman/ci/raw-gates.ts --stage pre-commit\|pre-pr\|ci [--gate G] [--base <ref>] [--receipt <path>]` | The raw evaluator. One policy for the full local pre-PR run and the CI run; a partial stage reports partial feedback and never the full bar. |
| `node .superman/ci/coverage.ts [--mode full\|incremental\|nightly]` | The coverage collector. Four disjoint inventories — `node`, `product`, `candidate` and `deno` — each measured and reported on its own. The `deno` inventory is not measured by this host: it is carried from the Deno collector's own receipt. |
| `<pinned deno> deno run --no-prompt --no-config --no-lock --no-npm --no-remote --allow-read --allow-write --allow-env --allow-run .superman/deno-bootstrap/coverage.ts` | The Deno candidate collector. Its receipt is what the Node collector binds; its floor is carried, not met. |
| `<pinned archgate> check --strict --output json` | The rule engine for `.archgate/adrs/**`. |
| `node --test .superman/ci/*.test.ts` | The bootstrap suites. |
| `node .superman/ci/raw-gates.ts --gate G6` | The mutation measurement, on its own: the whole declared scope, the change compared at base and at candidate. It is the lane that carries the first-measurement survivor treatment. It is not part of the pull-request leg. |
| `node .superman/ci/raw-gates.ts --stage nightly` | The uncached full run: the whole declared scope, measured whole, at the previous `main` and at `main`. The declared pull-request scope and the whole scope are two declared scopes, and each lane applies the one it declares. |

The declared gate inventory per stage lives in `.superman/ci/bootstrap.json` under `stages` — read it there, not from this document. The pinned tool versions live in the same file under `tools`.

## What a result proves

Each result is evidence for one question. Stating what it proves keeps the rest honest.

| Result | What it proves | What it does not prove |
| --- | --- | --- |
| A pre-commit receipt | The staged files pass the staged checks, and the staged snapshot is the one that was checked. | The full quality bar. Its verdict is `partial-feedback` and it says so. |
| A pre-pr receipt | The branch passes the full local blocking portfolio with the reviewed pins. | Live forge approval, the required native-matrix evidence, or that the merge base is fresh. |
| A coverage receipt | The four independent overall floors of the inventory it names. | PR H/B/M admission, merge authority, or that another inventory's floor is met. |
| A red–green replay | Regression sensitivity: the behaviour test fails on the approved base and passes on the candidate. | The order in which the change was authored. |
| A candidate measurement | The Deno surface's own numbers, attributed to the collector that produced them. | A substitute for the Node required result before approval and merge. |
| A green gate | That gate's own deterministic check passed on the evaluated revision. | An approval. Only the [approver](GLOSSARY.md) merges, on the exact head. |
| A pull-request G6 result | The declared pull-request mutation scope, compared at base and candidate, and the declared critical cases executed fresh outside affected selection and result caches. | The whole-scope measurement. That is the nightly's and the owner's, and the receipt names the scope it applied. |
| A full-corpus G6 result | The measurement of the whole declared scope against the full-repository baseline, with the raw survivors. | A pull-request result. It is its own lane, and it is the one that carries the survivor treatment. |

## Where the authority lives

| | |
| --- | --- |
| The command contract | [spec §5.2](.scratch/superman-v0/spec.md) |
| The gate contract and the local/CI/nightly behaviour | [spec §5.4](.scratch/superman-v0/spec.md) |
| The change model and affected selection | [spec §5.7](.scratch/superman-v0/spec.md) |
| The merge conditions | [spec §9.2](.scratch/superman-v0/spec.md) |
| What blocks ticket 01 | [spec §17](.scratch/superman-v0/spec.md) |
| How a preparation step is judged | [ADR 0018](docs/adr/0018-admission-evidence-not-tool-correctness.md) |
| The vocabulary | [GLOSSARY.md](GLOSSARY.md) |
| The decisions | [docs/adr/](docs/adr/) (why) and [.archgate/adrs/](.archgate/adrs/) (enforced) |
| The preparation's live status | [.scratch/superman-v0/gate1-preparation.md](.scratch/superman-v0/gate1-preparation.md) |
| The measurements | [.superman/ci/bootstrap-evidence.md](.superman/ci/bootstrap-evidence.md) |
