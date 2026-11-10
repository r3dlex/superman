# Mutation testing ROI — evidence and recommendations for Superman

**Observed / sources accessed: 2026-11-08.**

**Skill: research; research/recommendation only; no policy change.**

This is a targeted primary-source synthesis, not a systematic review or a local performance benchmark. External findings below were checked against original studies, official documentation and pinned source. Local findings were supplied by the parent session for HEAD **`24123ae77f5367f877a124bb98cd738d38641510`**, branch `spec/superman-v0`; they are attributed separately in §4 and were not independently reexecuted by this researcher. Local links refer to that snapshot, even if the working tree later changes.

The sole deliverable is this note. No policy, specification, code, baseline or evidence artifact was changed; no tests, gates or mutation jobs were run, packages installed, Git writes performed, credentials used or hosted writes made. The selected `/implement` excerpt is context, not implementation authority.

## 1. Executive answer

**Mutation testing earns its cost when it exposes important missing assertions and leads to useful tests. The evidence does not justify mandatory whole-repository mutation on every PR and every platform as a universal default.** Successful deployments emphasize changed code, relevant tests, selective mutants, actionable feedback and control of both compute and developer-review cost. Their existence demonstrates practical use, not representative industry adoption. [Google scale][google-scale], [Facebook study][facebook], [Meta ACH][meta-ach], [practitioner survey][survey]

For Superman:

1. **Keep targeted mutation of critical gate behavior.** Fail-open authorization, stale or mismatched evidence, wrong policy, invalid scope and swallowed subprocess failures are valuable mutation targets. Bound the proposal by behavioral seams/branches or representative fault cases: selecting the six entire critical modules would retain **7,551/9,004 mutants (~84%)**. Establish that named negative controls actually detect their specific faults through the relevant gate boundary; a small demonstration does not settle every existing survivor.
2. **Do not spend the pre-ticket-01 phase repeatedly mutating roughly 9,000 harness mutants merely to perfect a global score.** The supplied snapshot has no product `src/` or `test/`, a mismatch between Node and Vitest test populations, and a failed full G6 receipt. Discovery, activation and assertion quality are more informative next questions than the aggregate percentage. This is a recommendation for a reviewed decision, not permission to bypass the current prerequisite. [Parent findings, §4](#4-parent-session-local-findings)
3. **Preserve the November 7 separation already made.** PR mutation is already product-`src`-only; broader work belongs to the owner/nightly lane. Further changes to bootstrap scope, cadence, platform requirements or timeout handling need a proposed **Gate 1 decision**. This note neither changes those requirements nor admits ticket 01. [Spec §5.4][local-spec], [bootstrap, lines 64–118][local-bootstrap]
4. **Treat the current `15.97067969791204%` as a diagnostic value, not proof of an accepted baseline.** The parent-supplied same-head full receipt reports G6 failure. Matching that receipt's ratio to a committed ratchet cannot turn the failed run into acceptance. [Full receipt][local-full], [ratchet][local-ratchet]
5. **For future repositories, adopt progressively:** a small risk-based pilot, bounded change-focused PR feedback, and broader scheduled audits where measured value justifies them. Use a language/runtime-compatible engine and explicit test-integration evidence. There is no evidence here for a universal 80%, 90% or 100% mutation target, or for applying Stryker indiscriminately to every runtime.

## 2. What the primary evidence actually establishes

### Deployment and study evidence

| Primary source / evidence quality | Verified observation | What it supports; important limits |
| --- | --- | --- |
| **Google, _Practical Mutation Testing at Scale: A view from Google_**, original study, pinned arXiv v2; publisher record also inspected. | §V's dataset contains **16,935,148 mutants**, **776,740 changelists**, **2,110,489 surfaced mutants**, and **66,798 explicit feedback responses**. **82%** were productive **among surfaced mutants with explicit feedback**. | Strong operational evidence for selective deployment at scale. It is one company with custom infrastructure and feedback selection; 82% is neither the productivity of all generated mutants nor a bug-prevention rate. [Paper §§II, V][google-scale], [publisher][google-scale-record] |
| **Google, _Does mutation testing improve testing practices?_**, ICSE 2021, DOI `10.1109/ICSE43902.2021.00087`, original full text. | Mutation dataset: **14,730,562 mutants / 662,584 changes / 446,604 files**. Coverage comparison: **8,788,791 changes / 3,398,085 files**. Greater exposure was associated with more test changes and lower later mutant survival. | Evidence that feedback can improve testing practice beyond line coverage. Not a fully randomized experiment; the authors tested alternative explanations but acknowledge possible residual confounding. These are a different dataset from the scale paper, not additive independent replications. [§§III, V][google-practices] |
| **Facebook, _What It Would Take to Use Mutation Testing in Industry—A Study at Facebook_**, ICSE-SEIP 2021, DOI `10.1109/ICSE-SEIP52600.2021.00036`, original full text. | Evaluated changed Java code in **100 prior-day diffs** using learned fault-like operators and off-peak execution. Table I totals **15,493 mutants for the displayed operators**; two low-frequency operators are omitted. **26 developers responded out of 29 approached**. | **22/26** identified a testing gap; roughly half expressed intent to add a test. This is a single-company mobile-Java case study, and intent is not verified completed work. Table III says **12/26 (46.2%)** intended to add a test, while adjacent prose says **11 (42.3%)**; the discrepancy precludes presenting one precise actionability rate as settled. [§§IV–V, Tables I and III][facebook] |
| **Meta, _Mutation-Guided LLM-based Test Generation at Meta_**, original arXiv v1 deployment report; first-party engineering explanation corroborates the approach. | October–December 2024 deployment: **10,795 Kotlin classes**, seven platforms plus a cross-app category; **31,677 generated mutants → 9,095 that build and pass → 4,660 believed non-equivalent → 571 generated mutant-killing tests**. **277/571 (49%)** added no line coverage. Test-a-thons recorded **140/191 usefulness reviews accepting tests (73%)**, and **63/175 relevance ratings identifying privacy relevance (36%)**. | Targeted, concern-driven mutation can generate useful tests even where coverage does not rise. This is offline/on-demand test improvement, not exhaustive all-mutant PR gating. Kotlin/Android, one company, manual prescreening in the initial Messenger phase, and reviewer/team effects limit generalization. Acceptance is not a measured reduction in incidents. [§§3–6, Tables 2, 4 and 8][meta-ach], [engineering account][meta-engineering] |
| **Sánchez et al., _Mutation Testing in Practice: Insights From Open-Source Software Developers_**, IEEE TSE 2024, DOI `10.1109/TSE.2024.3377378`; institutional full text. | **104 valid respondents**, recruited from projects already showing mutation-tool use. The process started from **3,581 repositories**, selected **503 contacted repositories**, and identified **1,192 initial potential participants**. **63.5%** reported CI/CD integration; **27.9%** reported build-time minimum-score enforcement; **89.4%** were satisfied or very satisfied. | Useful evidence about participating users' practices, **not adoption prevalence among developers or repositories generally**. Tool imports do not necessarily establish active use; self-selection and survivor bias exclude many discontinued or uninterested users. The paper explicitly acknowledges these threats. [§§III–V][survey], [institutional record][survey-record] |
| **Papadakis et al., _Are Mutation Scores Correlated with Real Fault Detection? A Large Scale Empirical Study_**, ICSE 2018, DOI `10.1145/3180155.3180183`; official conference abstract inspected. | Reports weak correlations after controlling for test-suite size, while higher-scoring equal-sized suites significantly improved real-fault detection. | A useful counterweight to treating mutation score as a quality guarantee: mutation can guide test selection without a strong unconditional score-to-defect relationship. Only the official abstract was verified here; no unverified study sample sizes are quoted. [Conference abstract][correlation] |

### The Google example is deliberately selective

The scale paper describes mutation of **changed, covered lines**, at most one generated mutant per selected line, suppression of unproductive contexts, and relevant-test selection using coverage. It caps surfaced surviving mutants at **7 × the number of files in the changelist** to limit review burden. Automated findings are optional unless a reviewer marks one mandatory. These are deployment choices, not universal thresholds or a mandate for every possible mutant. [§§II.A–D][google-scale]

The paper reports initial productivity around **15%**, improving to **89%** with filtering over the deployment's evolution; that narrative is distinct from the **82% feedback-bearing subset** in its evaluation dataset. Its suppression heuristics are contextual and can suppress relevant mutants too. Do not copy heuristics for “uninteresting” logging, caching or validation into Superman's policy/security logic without examining whether those behaviors are contractual. [Introduction, §§III, V][google-scale]

### Evidence of real-fault relevance is valuable but not a financial ROI estimate

The Google ICSE study's retrospective fault analysis began with **1,765 high-priority bug candidates**, excluded **41** unbuildable cases and **222** with excessive dependency/test-target cost, and retained **1,502**. **1,043 (~70%)** had fault-coupled mutants: a test associated with the fix could kill a mutant that had survived previously. The analysis required almost **400,000 mutants** and over **33 million test-target executions**. The authors expanded mutation beyond their ordinary selective workflow for this experiment. [§IV][google-practices]

That result demonstrates potential test sensitivity beyond coverage; it does **not** mean mutation testing prevented 70% of production bugs, that the excluded expensive cases would behave similarly, or that Superman should reproduce the experiment as its PR policy. Fault coupling is retrospective, operator-dependent and limited by the test oracle. Higher-level specification/protocol mistakes can escape the mutation model. [§§IV–V][google-practices]

Meta similarly uses the existing implementation as a regression oracle: generated tests can preserve its behavior, including an existing mistake. Its equivalent-mutant detector was judged on **381 mutants**; strong results after preprocessing apply to that particular generated-mutant population, including many trivial equivalents, rather than solving general equivalence. [§§5, 8][meta-ach]

### Is exhaustive mutation “industry standard”?

**Not established by these sources.** In the 104-respondent survey, reported frequencies included **38.5% on demand**, **26.9% every test execution**, **19.2% before commit**, and **19.2% before deployment**; multiple responses were allowed. Neither these categories nor CI/CD integration reveal whether respondents mutated every source file, used historical results, selected tests, or repeated execution on every platform. [§IV.B][survey]

The defensible conclusion is narrower: mutation testing has credible industrial and open-source use, and selective deployment can be useful. There is no representative adoption denominator here establishing how common it is across industry, much less a standard requiring whole-repository mutation for every PR/platform. Absence of that evidence establishes neither rarity nor ubiquity. None of the inspected studies establishes a portable dollar return, universal minute budget or optimal score threshold for this repository.

## 3. Stryker mechanics that determine cost and evidentiary value

### Version boundary and four different kinds of “full”

The parent's local pins are **Stryker core + Vitest runner 10.1.1** and **Vitest 5.0.5**. For version-specific assertions, this note uses upstream Stryker tag `v10.1.1`, resolved to commit **`959127763e5bbe2eb65f5341a8161780d6d8a476`**; tag metadata dates it **2026-10-23T19:13:57Z**. Public documentation was accessed on November 8; pinned source takes precedence where documentation drifts. [Tag metadata][stryker-tag], [parent package pin][local-package]

| Dimension | Meaning | Does not establish |
| --- | --- | --- |
| Mutation scope | Which source files/locations and operators generate mutants. | Which tests actually execute. |
| Test selection | All configured tests, or only tests related to/covering a mutant. | Whether all repository test frameworks were discovered. |
| Freshness | Whether each in-scope result was freshly evaluated or historically reused. | Whether scope covered the entire repository. |
| Execution boundary | Whether the mutated bytes ran, including in subprocesses, with a useful assertion. | A guarantee from line coverage or a successful runner exit alone. |

A fresh full-scope mutant run can use a limited test population. Running every test for a small mutant scope is not full-repository mutation. A complete-looking report can include historical results. Keeping these dimensions explicit avoids both inflated assurance and misleading cost estimates.

### Coverage-based test selection

Stryker's general `coverageAnalysis` modes are: `off` runs all selected tests for each mutant; `all` skips uncovered mutants but runs all selected tests for covered ones; `perTest` uses covering-test information. Per-test selection assumes tests can run independently. Mutants executed during static/module initialization generally require all selected tests because coverage cannot safely attribute them to an individual test. [Pinned configuration][stryker-config], [planner][stryker-planner]

**The 10.1.1 Vitest runner is special:** its documentation says `coverageAnalysis` is ignored and it always uses `perTest`; its implementation returns mutation coverage and selects Vitest task IDs. Consequently, setting `coverageAnalysis: "off"` is **not** a demonstrated fix for this runner's subprocess/discovery gaps. [Pinned runner documentation][stryker-vitest-doc], [runner source][stryker-vitest-src]

### Discovery is separate from related-test filtering

The runner loads the specified/default Vitest configuration and defaults `vitest.related` to `true`, using import relationships to limit relevant test files. Setting it to `false` can address API/integration tests without direct imports, but it neither expands Vitest's configured `include` globs nor creates mutation propagation into child processes. Vitest 5.0.5 `test.include` specifies its discovery patterns; custom patterns replace the defaults. [Runner docs/source][stryker-vitest-doc], [source][stryker-vitest-src], [Vitest 5.0.5 include][vitest-include]

Likewise, adding a file containing `node:test` registrations to a glob does not automatically make those registrations native Vitest tasks with Stryker per-test metadata. Node's test runner and Vitest have separate execution/reporting models; any adapter or migration requires actual discovery and behavioral evidence. [Vitest task collection][stryker-vitest-src], [Node test runner][node-test]

### Subprocess activation and coverage are separate obligations

In the Vitest runner, `stryker-setup.ts` receives the active mutant through injected context and sets the worker's global Stryker namespace, with hooks for current test identity and coverage. An arbitrary spawned process does **not** inherit JavaScript globals. Node documents separate memory/V8 instances for forked processes; environment inheritance is a different mechanism. [Setup source][stryker-setup], [Node child processes][node-child]

Stryker's instrumented code can fall back to environment variable **`__STRYKER_ACTIVE_MUTANT__`** when no active mutant is set in its process-local namespace. That capability is not evidence that a particular Vitest child actually receives the variable. Even successful activation would not automatically merge the child's dry-run coverage and per-test identity into the parent's report. [Instrumentation helper][stryker-instrument], [constants][stryker-constants]

For a process-boundary claim, evidence therefore needs to establish all of the following: the child executes the intended **instrumented snapshot bytes**; the selected mutant is active there; coverage/test association is correctly collected where required; and the child result reaches a behaviorally meaningful assertion. Discovering a test, importing the parent module, or observing ordinary Node coverage proves only part of that chain. This is an inference from the documented mechanisms, not a reproduced local child-process experiment.

### Command runner and `node:test`

Stryker's command runner executes a configured shell command, sets `__STRYKER_ACTIVE_MUTANT__`, and synthesizes a single **“All tests”** result from command success/failure. A command invoking `node --test …` is therefore possible in principle, assuming compatible execution of the instrumented files and correct failure propagation. It is **not a native per-test Node integration**: the runner has no mutation-coverage/test-selection integration, rejects `--testFiles`, and cannot identify test changes for incremental reuse. [Command-runner source][stryker-command], [incremental limitations][stryker-incremental], [Node CLI semantics][node-test]

The tradeoff is honest but potentially expensive all-command-per-mutant execution. A nonzero command exit caused by setup, configuration or infrastructure can resemble a killed mutant; verify that tests actually ran and that the fault caused the expected behavioral failure. This makes a small explicit command-runner lane a candidate to evaluate, not an automatic replacement for the current runner or permission to count arbitrary failures as useful kills.

### Incremental reuse and invalidation

Stryker incremental mode compares mutant/source and test-file information against a previous report; a dry run is still required. Its documentation explicitly lists blind spots: other files, dependency changes, environment, snapshots, and certain test changes affecting static mutants. The Vitest runner reports test locations; the command runner reports no individual test-file information. [Pinned incremental documentation][stryker-incremental]

**`--force` means re-evaluate in-scope mutants; it does not expand `--mutate` to the whole repository.** When incremental results are reused, a full-looking report can contain old out-of-scope results. By contrast, fresh changed-scope execution is a scope optimization, not historical caching. [Force/scope semantics][stryker-incremental]

Recommendation: if Superman later permits reuse, its invalidation model should cover source, tests, fixtures/snapshots, dependency and selection graphs, lockfiles, runner/tool versions, configuration, relevant environment and platform identity. Test-only changes can invalidate results for unchanged source. Unknown impact needs fresh execution of a sufficient scope, potentially full. Do not describe Stryker's incremental JSON alone as a complete evidence-validity ledger.

### Statuses, timeouts and equivalent mutants

Stryker's native metric is: [Official definitions][stryker-metrics]

```text
detected = Killed + Timeout
valid = Killed + Timeout + Survived + NoCoverage
native mutation score = detected / valid × 100
```

`CompileError` and `RuntimeError` do not enter that native denominator; `Ignored` and `Pending` are excluded too. The covered-code score additionally excludes `NoCoverage`. These choices differ from Superman's stricter completion policy; switching formulas would change meaning rather than repair a failed receipt. A survivor means the selected execution did not detect the mutation, not automatically that it is equivalent. `NoCoverage` means no mutation coverage was observed by that runner, not proof that no other test system ever executes the code. [States/metrics][stryker-metrics], [local receipt and driver][local-full], [driver][local-quality]

Stryker documents the mutant timeout calculation as **`netTimeMs * timeoutFactor + timeoutMS + overheadMs`**, with defaults **1.5** and **5,000 ms**. Its planner also sets a hit-count limit of **100 × dry-run hits**. A mutation can legitimately turn a terminating loop into a nonterminating one; timeout or hit-limit detection is then expected fault injection, not proof that the original loop is defective. A test framework's own timeout can surface as a test failure, which is a different reporting layer from Stryker's `Timeout` status. [Configuration][stryker-config], [planner source][stryker-planner], [Vitest setup/runner][stryker-setup], [runner][stryker-vitest-src]

Distinguish mutant-induced nontermination from flaky infrastructure, resource starvation and ordinary test timeouts before drawing conclusions. Raising all limits increases cost and may hide infrastructure trouble; rewriting correct production loops just to eradicate timeout statuses is metric gaming unless an original defect is independently demonstrated. Any change to Superman's present treatment of timeouts needs a reviewed policy decision and evidence for the distinction.

Equivalent mutants have the same observable behavior over the relevant domain, so more tests cannot necessarily kill them. There is no general automatic solution. The general equivalents page's statement about lacking ignore support must not be applied literally to StrykerJS 10.1.1: its pinned documentation supports comments, mutator exclusions and ignore plugins. Tool capability is not permission to use those mechanisms under Superman's policy. Preserve raw outcomes and require reviewed reasoning for any scope/suppression change; a universal 100% target can reward exclusions or brittle implementation-detail tests. [Equivalence][stryker-equivalent], [pinned disable mechanisms][stryker-disable]

## 4. Parent-session local findings

**Provenance:** the following inspection results were supplied by the parent session on 2026-11-08 for HEAD **`24123ae77f5367f877a124bb98cd738d38641510`**. The parent reported a clean checkout, ahead 20, before this note was created. This researcher did not duplicate the local code investigation, rerun the evidence, or establish hosted acceptance. Ignored reports are local artifacts, not necessarily available in a clean clone.

### Current lanes and populations

| Surface at the supplied HEAD | Parent-verified finding | Interpretation |
| --- | --- | --- |
| `package.json`; product tree | Core/runner **10.1.1**, Vitest **5.0.5**; no `src/` or `test/` exists. [Package][local-package] | Current mutation work concerns the bootstrap/harness, not implemented product behavior. |
| `.superman/ci/bootstrap.json:64–118` | Full inventory **`[src/**/*.ts, .superman/ci/**/*.ts, !**/*.test.ts]`**; PR inventory **`[src/**/*.ts, !**/*.test.ts]`**; four workers; eight critical cases mapped to six modules. [Bootstrap][local-bootstrap] | PR scope was already narrowed. Excluding test files does not exclude helper `.ts` files used by tests. |
| `vitest.config.ts:6` | Includes only **`test/**/*.test.ts`**, **`src/**/*.test.ts`**, **`.superman/ci/critical/**/*.test.ts`**. Eight critical test files are discoverable; twelve top-level **`.superman/ci/*.test.ts`** files use `node:test` outside these globs. [Vitest config][local-vitest] | “Full mutation” does not mean all repository test suites were exercised. Discoverable is not a claim that every task ran for every mutant. |
| `.superman/ci/coverage.json:11,72` | Separate Node coverage inventory/test suites. [Coverage config][local-coverage] | Historical **88–100% / 96%** coverage figures concern a different measurement/test population. They cannot establish assertion sensitivity or acceptance for unseen mutants. |
| `.superman/ci/quality.ts:1082–1130` | Explicit file scope with **`--inPlace --force --mutate`**, **`--concurrency 4`**, and validation of **`incremental=false`**. [Driver][local-quality] | Fresh selected execution in the driver's owned snapshot; historical cache reuse is not the explanation for these repeated measurements. |
| `.superman/ci/quality.ts:773,1397,1420–1437` | Critical execution happens fresh before empty PR scope becomes N/A; comparable base/candidate mutation scopes are enforced; nightly critical evaluation reuses the **same fresh full report**, rather than running a second full job. [Driver][local-quality] | No product mutations currently occur in the empty PR inventory. Do not count nightly report evaluation as another full mutation execution; other lane work may still overlap. |
| `.github/workflows/ci.yml:39`; spec §§5.4, 13 | PR job cap **15 minutes**, nightly cap **120 minutes**, across three native self-hosted legs. §13 separately targets **≤12 minutes for the slowest PR leg** and declares a **four-week / 25-PR pilot window**. §5.4 records an older **12-file / 8,881-mutant / ~24-minute / four-worker** measurement. [Workflow][local-ci], [spec][local-spec] | A performance target differs from a workflow cancellation cap. These and the older observation are not this note's measured runtime for the current 9,004-mutant population. Parallel platform wall time and total worker cost are different quantities. |

### Same-head full receipt: failed, not an accepted baseline

The ignored **`.superman-ci/g6-full.json`** has parent-reported SHA-256:

```text
75c947fde2804274c17a9715fa5aa6b38e5a2be749398ccd1225b884de930da9
```

It names evaluated/head **`24123ae77f5367f877a124bb98cd738d38641510`**, base **`57bcaba55ccd94f81f4362b0e4b3f8be6af31b7a`**, **verdict `fail`**, **G6 `fail`**, and an incomplete/ambiguous-outcomes reason. Its raw counts are: [Parent-inspected receipt][local-full]

| Status | Count |
| --- | ---: |
| Killed | 1,438 |
| Survived | 1,288 |
| NoCoverage | 6,253 |
| Timeout | 25 |
| CompileError / RuntimeError / Ignored / Pending | 0 each |
| **Total** | **9,004** |

The diagnostic calculation **`1438 / 9004 × 100 = 15.97067969791204%`** matches committed `superman.ratchet.json`, whose parent-reported SHA-256 is:

```text
b38010a038cbd3bc2ca13db5a44c59260f75a58f6358da6768b08413637c3406
```

**A matching number is not acceptance evidence.** Commit prose describing a clean run does not resolve the available same-head failed receipt. This does not establish that every earlier clean receipt is impossible, or imply misconduct; it establishes that the supplied evidence does not support claiming current accepted G6 merely from the ratchet's existence or commit message. The selected `/implement` excerpt's prerequisite is not established by its prose. [Ratchet][local-ratchet], [receipt][local-full]

### The smaller raw report is a different population

The parent also inspected **`.superman-ci/mutation.json`**: a **raw-gates-only** report containing **917 mutants**, **275 Killed**, **210 Survived**, **432 NoCoverage**, and **seven tests in two files**. Its effective configuration reports `coverageAnalysis=perTest`, `vitest.related=true`, `incremental=false`, `timeoutMS=5000`, `timeoutFactor=1.5`. These counts and test numbers must **not** be substituted for the full receipt's population. The shared tooling settings help explain runner behavior but do not make the two artifacts equivalent. [Smaller report][local-mutation]

### Timeout concentration and the next diagnostic question

Of the full receipt's **25 timeouts**, the parent located **nine in `fixture-env.ts`**, **14 in `raw-fixture.ts`**, and **two in `raw-gates.ts`**: **23/25 occur in fixture helpers** included by the broad implementation glob. `critical/fixture-context.ts` is also mutated. [Full receipt][local-full], [inventory][local-bootstrap]

The parent additionally verified that the **six currently declared critical modules contain 7,551 of 9,004 mutants (~84%)**: **1,300 Killed, 1,249 Survived, 5,000 NoCoverage and two Timeout**. Thus “mutate only critical modules” would retain most of the population and would not by itself fix discovery or establish a material cost reduction. A genuinely bounded proposal needs explicit behavioral seams/branches or representative fault-injection cases, not merely a shorter file list. This subtotal does not imply proportional runtime savings. [Full receipt][local-full], [critical inventory, lines 64–118][local-bootstrap]

The available evidence therefore points to **broad mutation of test infrastructure alongside limited discovery of core assertion suites**, rather than proving that “too many actual full tests” are running. The large `NoCoverage` population and timeout concentration warrant investigation of inventory, discovery, subprocess activation and assertion reach before interpreting the aggregate score. These facts do not establish a single reproduced cause for every survivor or uncovered mutant.

Some infrastructure is itself critical gate logic and deserves fault-sensitive tests. Reclassifying helpers or excluding them needs review of their actual role and the policy—not a blanket exclusion to make G6 green. The current failed receipt must retain its original meaning regardless of any later approved scope.

## 5. Recommendation before ticket 01

**Proposed decision:** retain strong, bounded evidence for critical contracts; stop using repeated whole-harness score improvement as the objective. Any replacement for a currently required full bootstrap measurement must first be approved through Gate 1. Until then, the current requirement still applies; this recommendation supplies neither a waiver nor implementation admission.

1. **Resolve acceptance provenance first.** Identify the exact accepted run, if one exists, with its head/base, scope, configuration and disposition. The supplied failed receipt cannot serve that role. Avoid another expensive run merely to rediscover the same discovery/activation uncertainty.
2. **Map the existing critical inventory to bounded behavioral evidence.** For each selected rejection, pair a valid passing case with a named negative-control assertion. Useful faults include removing/inverting an authorization or freshness rejection, accepting a wrong head/policy identity, accepting missing evidence, swallowing a subprocess failure, or admitting an invalid path/scope. Select explicit seams/branches or representative fault cases rather than all 7,551 mutants in the six modules. A fault should make its specific negative-control test fail through the real gate boundary; an unrelated setup error is not the desired signal. Record the exact contract each case supports and its untested remainder. Reuse the eight-case/six-module inventory as the mapping, rather than implying module membership establishes complete coverage. [Existing inventory][local-bootstrap]
3. **Prove test integration on a small representative scope and satisfy the runtime admission requirements.** Record discovered test files/tasks and demonstrate that a known meaningful mutant executes the instrumented bytes and fails the intended assertion. Where behavior crosses a process boundary, establish child activation and result propagation. A compatible Vitest-native integration or separately calibrated command lane can address Node tests; simply widening a glob is insufficient. The parent's reading of **spec §§5.4/5.10** also requires **actual-Deno activation, test attribution and worker isolation evidence before product admission**. A Node/Vitest demonstration or isolated Deno fixture does not establish the operational graph or discharge those requirements. [Spec][local-spec]
4. **Review what belongs in the mutation inventory.** Distinguish production gate decisions, integration adapters and test-only fixture machinery. Keep important boundary faults represented, while proposing narrowly justified changes for low-value helper mutations. Any approved scope change should retain the old result and start an explicitly different comparable measurement; do not retrospectively relabel the 9,004-mutant run.
5. **Triage survivors by required behavior.** Prioritize fail-open critical paths, then missing assertions, discovery/activation failures, and domain-specific equivalence or low-value implementation details. Add an assertion because the behavior matters, not solely because it raises the score. `NoCoverage` from Stryker cannot be excused by unrelated Node coverage. Suppression requires the applicable reviewed policy, not an author-added ignore.
6. **Decide timeout semantics explicitly if they are to change.** A proposed distinction between proven mutant-induced nontermination and infrastructure failure should retain raw statuses and have positive/negative fixtures. Do not silently adopt Stryker's native `Killed + Timeout` metric, increase limits, or rewrite correct loops to erase the current failure.
7. **Create acceptance evidence only after scope and runner meaning are clear.** It should bind exact inputs and show actual test execution, activation, attribution, isolation, statuses, survivor disposition and runtime. Judge critical behavior directly; preserve comparable base/candidate populations for any score ratchet. A small fault-injection demonstration supports only its named behavior and execution claims: it does not resolve all 1,249 surviving critical-module mutants or the remaining uncovered population, nor replace a required full comparison without an approved policy change. Do not require perfection of unimplemented product code or substitute a scalar score for this evidence.

This keeps mutation's distinctive benefit—testing whether assertions notice plausible faults—without mistaking harness-wide mutation volume for readiness.

## 6. Progressive use in Superman-managed repositories

The following is a **researcher's recommended operating profile**, not a description of current policy or a published standard. It combines selective-deployment evidence with the Stryker limitations above. Repo-specific risk, runtime support and measured costs should determine adoption.

| Stage / lane | Recommended scope and trigger | Useful outcome |
| --- | --- | --- |
| Initial adoption | Pilot stable, deterministic tests around a small high-risk module: policy decisions, money/data transformations, parsers, authorization or failure propagation as applicable. Verify runner/process support before broadening. | A meaningful missing assertion found and fixed, plus evidence that selected mutants really execute. |
| Local development | No compulsory whole-repository run on each edit. On-demand focused mutation when changing a risky behavior, reviewing weak tests or diagnosing a survivor. | Fast feedback close to the authoring decision. |
| PR feedback | Fresh changed/risk-affected mutation with relevant tests and explicit scope. Include new-code survivors; broaden impact for test, fixture, config, dependency or shared-contract changes even when source lines are unchanged. Start ordinary findings advisory unless the repository has approved a calibrated blocking contract. | Actionable survivors and preserved critical sensitivity before review completes. |
| Critical controls | A small declared set of important fault/negative-control checks when the guard, runner or its dependencies change; retain direct behavioral tests on required runtime/platform boundaries. | A lost critical rejection cannot be hidden by aggregate score gains elsewhere. |
| Owner / scheduled audit | Broader fresh mutation, full owned scope where affordable and useful; for large repositories, a reviewed rotating/risk-based schedule with explicit outstanding coverage. Revisit survivors and stale scope assumptions. | Find drift beyond the PR selection model and measure whether broader work adds value. |
| Mature enforcement | Promote only stable, useful checks after local calibration. Use comparable-scope ratchets plus critical-survivor review, with reviewed treatment of equivalence and incomplete results. | A defensible contract rather than a universal percentage copied between repositories. |

**Nightly detection is not pre-merge prevention.** Moving a check out of the PR lane changes when a defect can be discovered. Required critical checks should not be silently deferred to satisfy a time budget. A timed-out or partial required run remains incomplete; sampled/rotating results must say what was omitted.

For a concrete starting cadence, propose **weekly broader audits plus audits before major/risky releases**, with nightly execution where cost and additional findings justify it. This is a proposed default for calibration, not a published industry standard or Superman's current schedule. If a small repository's complete mutation run already fits its PR budget, keeping that simple full run can be preferable to building a complicated selection or caching layer.

### Budget and platform proposals

Use Superman's existing **spec §13 four-week / 25-PR pilot window** to measure ROI and its **≤12-minute slowest-PR-leg target** to constrain the total feedback path. The **15-minute PR / 120-minute nightly workflow caps** are separate cancellation limits, not performance targets. [Spec §13][local-spec], [workflow][local-ci]

Within that pilot, possible **mutation sub-budget targets** are **1–2 minutes** for focused local feedback, **2–5 additional minutes at p95** for PR mutation **only where the total leg still meets the existing target**, and a **30–60-minute** owner/scheduled analysis window. These are researcher recommendations for calibration, **not published industry standards, measured local performance, extra budget beyond §13, or replacement caps**. Record startup, dry-run, mutant execution and review cost separately before changing budgets.

For platform-neutral logic, a future Gate 1 proposal could run expensive mutation on one approved representative platform while retaining native behavioral/compatibility tests on all required platforms. Platform-dependent path, filesystem, shell, process and timing behavior still needs appropriately targeted native evidence. The representative-platform assumption needs evidence; it is not established by identical TypeScript source or the existence of a local fixture. Current three-leg obligations are not changed here.

For other repositories, select an engine and adapter that actually support the language, runtime and test framework. StrykerJS/Vitest behavior is not a universal recipe for Node `node:test`, Deno, Python or mixed-language systems. Integration should earn its complexity through useful findings before becoming a blanket template requirement.

### Measure local ROI in useful improvements, not just score movement

During the existing §13 pilot, record:

- **Value:** unique important test gaps identified; meaningful assertions added and retained; critical regressions caught; which findings led to a real behavior change or reviewed equivalence conclusion.
- **Cost:** machine/worker minutes, wall-clock and p95 PR latency, dry-run/setup fraction, timeouts/retries, and human minutes spent diagnosing and reviewing survivors. Parallel execution reduces latency differently from total compute.
- **Signal quality:** actionable findings per reviewed survivor, infrastructure-induced failures, equivalent/redundant findings, `NoCoverage`, and incomplete activation/discovery evidence. Killed mutants are sensitivity observations, not a count of production bugs prevented.
- **Marginal benefit:** what broader scope or extra platform legs found beyond the small risk-focused lane, and whether those findings justified their incremental compute and review cost.

Keep broader mutation when it continues to find consequential gaps at acceptable cost. Narrow or reschedule low-yield analysis through the applicable policy process; address measurement failures rather than masking them with exclusions. Product/code growth can justify expanding scope later. None of the cited studies determines that tradeoff for Superman in advance.

## 7. Evidence limits and remaining uncertainty

- This review is targeted rather than exhaustive. Industry examples and a survey of existing users cannot establish representative adoption or a universal return on investment.
- Google/Facebook/Meta findings come from distinct but concentrated large-company settings; the two Google datasets overlap in ecosystem and are not independent cross-company replications. Self-reported usefulness, developer intent, test acceptance, retrospective fault coupling and actual prevented incidents are different outcomes.
- Full original text was inspected for the Google studies, Facebook, Meta and the 2024 survey. The survey was read through its institutionally hosted text extraction. The ICSE 2018 conclusion is limited to the official abstract; its full PDF and the older FSE 2014 paper were not parsed here, so this note does not import their unverified counts from neighboring research.
- The Facebook actionability count discrepancy is disclosed in §2. The Meta arXiv v1 venue/DOI header is internally inconsistent; this note cites the versioned preprint and first-party engineering account without asserting an unverified final publication DOI.
- Some public Stryker prose drifts from versioned implementation: the Vitest page retains a “threads only” statement despite newer pool handling, and the general equivalents page's ignore statement does not describe pinned JS capabilities. No pool recommendation rests on that stale prose. Version-specific behavior above is grounded in 10.1.1 source. [Runner source][stryker-vitest-src], [disable documentation][stryker-disable]
- Node's accessed live pages identified themselves as **v26.13.0**; that is the documentation version, not an independently verified installed runtime. Vitest include behavior was checked against **v5.0.5** source rather than the moving website version.
- The parent-provided local receipt, hashes and source observations were not rerun here. No present hosted CI status, complete subprocess-activation chain, accepted baseline provenance or new performance measurement is certified by this research.

**Parent verification:** after the research agent completed, the parent independently checked Google's selective workflow and evaluation counts in the original scale paper, Meta's deployment/review counts and the 277/571 no-added-line-coverage finding, Stryker's official status formulas, and the pinned Vitest-runner/incremental documentation. Repository status showed this research note as the sole working-tree addition.

**Bottom line:** retain mutation as a focused test-quality technique, prioritize critical contract evidence before ticket 01, and make additional scope pay for itself in useful findings. Preserve existing gates until any proposed changes are explicitly reviewed and adopted.

## Sources

All external sources below were accessed **2026-11-08**. Study section/table references appear beside the claims; Stryker source links are pinned to the resolved 10.1.1 commit. Local paths and line references are parent-supplied observations at the HEAD stated above.

[google-scale]: https://arxiv.org/html/2102.11378v2
[google-scale-record]: https://research.google/pubs/practical-mutation-testing-at-scale-a-view-from-google/
[google-practices]: https://arxiv.org/html/2103.07189v1
[facebook]: https://arxiv.org/html/2010.13464v3
[meta-ach]: https://arxiv.org/html/2501.12862v1
[meta-engineering]: https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/
[survey]: https://idus.us.es/server/api/core/bitstreams/29852ded-6ab4-4dbf-ab73-c56ba0656c2c/content
[survey-record]: https://hdl.handle.net/11441/165700
[correlation]: https://conf.researchr.org/details/icse-2018/icse-2018-Technical-Papers/78/Are-Mutation-Scores-Correlated-with-Real-Fault-Detection-A-Large-Scale-Empirical-stu
[stryker-tag]: https://api.github.com/repos/stryker-mutator/stryker-js/git/tags/f6cf882c3f1936c10c41f4eb3ee0ac65aee2b37e
[stryker-config]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/docs/configuration.md
[stryker-vitest-doc]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/docs/vitest-runner.md
[stryker-vitest-src]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/vitest-runner/src/vitest-test-runner.ts
[stryker-setup]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/vitest-runner/src/stryker-setup.ts
[stryker-instrument]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/instrumenter/src/util/syntax-helpers.ts
[stryker-constants]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/api/src/core/instrument.ts
[stryker-command]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/core/src/test-runner/command-test-runner.ts
[stryker-incremental]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/docs/incremental.md
[stryker-planner]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/packages/core/src/mutants/mutant-test-planner.ts
[stryker-metrics]: https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/
[stryker-equivalent]: https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/
[stryker-disable]: https://github.com/stryker-mutator/stryker-js/blob/959127763e5bbe2eb65f5341a8161780d6d8a476/docs/disable-mutants.md
[vitest-include]: https://raw.githubusercontent.com/vitest-dev/vitest/v5.0.5/docs/config/include.md
[node-test]: https://nodejs.org/api/test.html#running-tests-from-the-command-line
[node-child]: https://nodejs.org/api/child_process.html#child_processforkmodulepath-args-options
[local-spec]: spec.md
[local-package]: ../../package.json
[local-bootstrap]: ../../.superman/ci/bootstrap.json
[local-vitest]: ../../vitest.config.ts
[local-coverage]: ../../.superman/ci/coverage.json
[local-quality]: ../../.superman/ci/quality.ts
[local-ci]: ../../.github/workflows/ci.yml
[local-full]: ../../.superman-ci/g6-full.json
[local-mutation]: ../../.superman-ci/mutation.json
[local-ratchet]: ../../superman.ratchet.json
