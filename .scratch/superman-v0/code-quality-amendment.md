# Code-quality enforcement amendment — design interview

Status: interview complete (Q35); amendment synthesis/approval not authorized. Updated: 2026-11-01.

This file records human-confirmed design choices and unresolved questions. It is
not the canonical spec, a Gate 1 approval, implementation authorization, or
evidence of merge readiness. Existing policy and ticket blockers remain in force.
No glossary, ADR, spec, source, bootstrap enforcement, CI, or configuration change
is authorized by these interview answers.

## Current proposed contract

This is the selected design for the eventual amendment, not activated policy.
U2 and Q32 supersede earlier infrastructure selections in the history below.

### Scope and execution

- Quality-first, repository-owned CI is the standard for both local and remote
  checks. Retain the PR-owned checker plus human review as an explicit limit;
  do not claim fully adversarially isolated or tamper-proof evaluation.
- Superman-owned implementation/orchestration is Deno. Retained real Node/pnpm
  are external quality-tool or bounded measurement hosts, not a Node operational
  fallback. Preserve the separately confirmed Deno source/binary plan.
- Use only currently available self-hosted images/environments. No hosted pilot,
  hosted fallback, new VM platform, external admission App/control repository,
  policy-generation rollout, or credential-brokering project is in scope.
- Pre-commit is fast, explicitly partial feedback. Full pre-PR and CI enforce
  the same blocking quality contract; remote forge/approval evidence remains
  additional. Job-local approved tool provisioning is allowed; global host or
  image modification is not implicit permission.
- André is accountable for the quality policy, existing CI profiles,
  calibration, protected changes and recovery. Existing actor/approval policy
  remains; this design grants no access to his credentials.

### Blocking quality portfolio

Concrete routing baseline is the existing `.github/workflows/ci.yml` matrix:

| Required job title | Expected platform | Existing requested self-hosted labels |
| --- | --- | --- |
| `bootstrap (macos-15)` | `darwin-arm64` | `self-hosted`, `macOS`, `ARM64`, `r3dlex-org` |
| `bootstrap (ubuntu-24.04)` | `linux-x64` | `self-hosted`, `Linux`, `X64`, `r3dlex-org` |
| `bootstrap (ubuntu-24.04-arm)` | `linux-arm64` | `self-hosted`, `Linux`, `ARM64`, `r3dlex-linux-arm64` |

These are source-configured check titles/selectors, not a fresh runner inventory
or image approval. Hosted-looking titles do not select hosted workers. Reconcile
with actual currently available self-hosted environments and tool identities
before any route change; no invented image name, automatic hosted substitution,
or skipped required leg. The current Node bootstrap workflow remains current,
not evidence that the Deno replacement is implemented or verified.

| Surface | Required bar |
| --- | --- |
| Archgate | Strict approved architecture/policy rules, effective protected inputs and suppression checks; no ignored failure or agent-authored waiver. Prove Deno rule/input extensions before relying on them. |
| Biome | Deterministic formatting and explicit error severity for selected vetted correctness rules, including explicit-any, ts-ignore and resolved runtime import-cycle findings; validate the actual Deno graph and directive semantics. |
| Typechecking | Primary pinned tsrs plus supplemental complete-graph deno check for Deno code; no incomplete-project substitution. Preserve the separate nonblocking reference-tsc drift job. |
| Tests and replay | All required tests pass; meaningful behavior red-on-base/green-on-candidate replay remains distinct from authoring-order proof. Owner-governed critical cases run fresh outside narrowing/caches. |
| Coverage | At least 90% independently for lines/statements/branches/functions over the complete source inventory, including unloaded runtime/bootstrap/rule files; 100% target. Actual-Deno source-bound conversion is required, not a relabeled Node or three-metric Deno report. |
| Mutation | Equivalent-scope no-regression and complete conservative outcome accounting; no unresolved introduced critical survivors. Include the enforcement core through reviewed mappings and real Deno known-kill/attribution/worker fixtures. No universal new score floor or invented first baseline. |
| Duplication | Full approved-corpus baseline enforcement before merge; incremental replacement only after equivalent cross-scope/total-percentage detection is proved. |
| Knip | Zero configured issues, with a verified entry/project model rather than author-added ignores or blind deletion. |
| Trivy | Preserve the required HIGH/CRITICAL vulnerability/secret/misconfiguration policy and approved applicability; missing/failed required scanning is not success. State actual scan scope rather than claiming unsupported artifact coverage. |
| Other existing gates | Preserve applicable skills, traceability, path/pin/integrity, wiki and approval obligations; this amendment does not waive or silently deactivate them. |

Green means every applicable blocking gate actually passed on the declared
evaluated source, tools, policy and complete gate-specific scope. Missing tools,
bad exit codes, skipped required work, missing/stale/malformed reports, incomplete
inventories, or a partial run cannot manufacture green. A trusted policy-defined
not-applicable outcome is distinct from claiming the tool passed.

### Advisory and incremental policy

- Structural triggers remain advisory during calibration: cognitive complexity
  15, function-body lines 50, parameters 4, reported by runtime/bootstrap/test
  cohort and per function. They are not universal hard caps or a composite
  quality score. Promotion requires a reviewed scoped policy and useful evidence.
- Conservative affected selection only; unknown ownership/graph/inputs select
  all required targets. Verified result reuse is a separate decision. A cache
  lookup miss is not a selection miss; uncertainty about complete coverage or
  trusted safety state requires the existing uncached full fallback.
- Bind source/tests/dependencies/config/tool/runtime/permission/launch/producer
  and comparison scope identities. No assumed Node/Deno or source/binary reuse.
  Retain the fresh-only gate list and critical suite. Main selects all targets;
  nightly is uncached full on all required native platforms.
- Quarantine implicated selection on the first confirmed miss and implicated
  reuse on the first confirmed stale pass. Recovery needs a reviewed fix and
  fresh full evidence, not a reset, changed hash or retry-until-green.
- Preserve the <=12-minute slowest-leg goal, <10-second pre-commit p50 goal and
  20-minute CI performance-review threshold; measure cold/warm and end-to-end
  costs. Budgets never turn partial/failed quality work into a pass.

Existing Deno integration, actual self-hosted environment/tool availability,
native-platform, source/compiled conformance and other readiness prerequisites
remain evidence obligations. Do not invent them or introduce deferred VM/App
projects as hidden substitutes. No implementation or activation is authorized.

## Interview decision log

### U2 — Quality-first CI; existing self-hosted environments only

Latest user steering supersedes conflicting infrastructure choices below:

> Use Archgate and CI with Biome and the other tools; green only when code
> quality passes. CI is the standard locally and remotely. Do not go overboard
> on isolation/VM features. Use only self-hosted, currently available images.

Current scope:

- One governing quality contract and gate pipeline for local verification and
  remote CI. Keep Archgate, Biome and the retained compiler/test/coverage/
  mutation/duplication/unused-code/security tools; Deno remains the owned
  operational implementation baseline.
- A green required quality result means every applicable blocking quality gate
  actually passed for its declared complete scope and evaluated source. Missing
  tools/evidence, failed commands, skipped required work, empty/incomplete scans
  and invalid/stale reports must not be converted into success. Legitimate
  inapplicability is explicit and policy-defined, not a fabricated tool pass.
- Use only existing self-hosted execution environments/currently available
  images. Q28's hosted pilot is superseded; no hosted fallback or newly
  provisioned VM/image platform is part of this amendment.
- Remove Q29's new authoring-VM project from the required delivery scope. Retain
  sensible credential separation and safe handling of untrusted project code,
  without making broad new VM/isolation infrastructure the centerpiece.
- Actual existing runner/image identities and tool availability must be
  established, not invented from labels or an unused image setting. Unavailable
  required checks remain blocking; this constraint does not waive quality,
  Deno-integration, or native-platform evidence.

Q32 resolves the infrastructure choice: use lean repository-owned CI with the
explicitly accepted human-review trust boundary. Q18's separate-authority/VM
release prerequisite is superseded, not silently retained as a new blocker.
Do not claim full hostile-code containment on persistent self-hosted workers.

Earlier numbered selections remain below as history; U2 takes precedence where
they conflict. This steering authorizes no code, CI/config, infrastructure,
credential, hosted-setting, or canonical-document change in this interview.

### D1 — Deno is the operational and implementation baseline

User steering: **Deno, rather than Node.js, is the default implementation
platform.** Reconcile this interview with the already confirmed
[Deno amendment](deno-amendment.md), not an assumed Node product architecture.

This applies to Superman-owned CLI/hooks/bootstrap/verifiers/orchestration and
the proposed independent controller/publisher. Retained real Node/pnpm are
explicit external quality-tool hosts or bounded development/test/measurement
drivers, not an operational fallback or a second implementation.

Keep the Deno amendment's selected tools, complete supplemental `deno check`,
source/assets plus three native binary releases, no npm/npx distribution, and
source-versus-compiled evidence distinction. Do not reopen those confirmed
choices merely because the quality research inspected a Node bootstrap snapshot.

The current Node evaluator remains current only until separately authorized
replacement proof and exact-head approval. Deno is the target; historical Node
results are not Deno results. No runtime installation, port, numerical Deno pin,
grant profile, execution, or canonical-document edit is authorized here.

### Q1 — Deliberate evasion is in scope

Human selection: **Assume deliberate evasion**.

The amendment must account for attempts by the running agent or candidate
code/tests to weaken checks, fabricate reports, poison caches, or reach approval
credentials. Agent-controlled inputs and outputs are untrusted. The design must
identify which human and infrastructure components it trusts instead.

Why: safeguards for a cooperative but fallible agent do not address an agent or
candidate deliberately attempting to influence its own evaluation.

This reopens the accepted PR-owned-checker boundary in
[ADR 0001](../../docs/adr/0001-human-approval-on-head-sha.md) for design discussion;
it does not replace that ADR or activate a new evaluator. The enforcement
mechanism, assurance limits, and rollout timing are unresolved. CI cannot provide
a general proof of program correctness.

### Q2 — Common contract, language-specific profiles

Human selection: **Common contract**.

The amendment will define a common Superman enforcement/evidence contract for
adopting repositories. Integrity, incremental-CI safety, and admission requirements
are shared; compiler, lint, coverage, mutation, and other metric implementations
must have separately verified language-specific profiles.

Initial concrete metrics will be calibrated against Superman's TypeScript code.
This is not permission to transplant TypeScript thresholds to other languages,
add providers, change runtime decisions, or admit implementation tickets.

Why: common guarantees should not depend on a particular language's tooling, and
unlike metric definitions must not be presented as equivalent measurements.

### Q3 — Independent evaluation and admission authority

Human selection: **Independent authority**.

The target architecture requires an independently governed evaluator and
admission publisher. Neither the authoring agent nor candidate code may select
its governing policy, replace its examiner, or publish the authoritative passing
result. Approved policy/evaluator revisions are selected outside the candidate's
control; untrusted project execution has no authoritative check-publishing
credentials.

Why: protecting configuration or signing a candidate-generated pass does not
prevent the candidate from controlling the judgment used to admit itself.

The target boundary is confirmed, not its deployment mechanism, implementation,
dynamic-measurement assurance, or rollout timing. Current v0 enforcement is not
retroactively independent.

### Q4 — Isolate authoring agents as well as CI

Human selection: **Isolate authoring and CI**.

The target boundary includes local authoring-agent isolation from human approval
credentials and privileged host access. Authoring agents receive narrowly scoped
authoring permissions, not approver credentials, evaluator/admin authority, or
privileged host access. CI execution also requires isolation appropriate to the
adversarial candidate model.

Why: independent CI cannot preserve human approval authority if the authoring
agent can reach the approver's credentials or control the trusted infrastructure.

This reopens ADR 0001's same-OS credential-reachability acceptance for the target
design. Exact mechanisms and rollout remain undecided; no local environment,
credential, runtime, or hosted setting has been changed.

### Q5 — Required dynamic metrics are bounded evidence

Human selection: **Bounded dynamic evidence**.

Retain required coverage and mutation gates, including the four 90% coverage
floors and 100% target, while explicitly accepting residual same-runtime
reporter/instrumentation tampering and test-aware behavior. Validate execution
and provenance; do not claim those alone make in-process counters adversarially
unforgeable or prove program correctness.

Why: an independent supervisor and a signature authenticate bounded execution
evidence, not the truth of every counter produced alongside candidate code.

This is an explicit assurance limit of the target design, not permission to
accept known fabrication, missing reports, invalid provenance, incomplete
inventory, or a failed required measurement. The stronger alternative of
requiring independent observation of all dynamic counters before activation was
not selected.

### Q6 — Protect critical behavioral oracles

Human selection: **Protect critical oracles**.

Critical safety, authorization, and gate-integrity behaviors require
owner-governed acceptance contracts selected by the independent evaluator and
not replaceable by a ticket PR. Prefer observation through the real
CLI/API/process boundary where applicable. These tests need not all be secret.

Ordinary unit/regression tests remain proposed and reviewed with code. Neither
an externally governed entire test suite nor wholly PR-owned behavioral
evidence was selected. The critical-behavior inventory and oracle-update
mechanism remain to be decided.

Why: reviewed candidate tests can supplement evidence but must not be the sole
authority for behaviors that protect evaluation and approval themselves.

### Q7 — Calibrate structural gates before making them blocking

Human selection: **Calibrate structural gates**.

High-signal correctness/security/approved architecture rules and existing
required gates remain blocking. Cognitive complexity, function length, and
parameter count start as measured advisories. They become blocking only after
useful, scoped calibration and a separately reviewed policy decision.

Biome's 15 cognitive-complexity, 50 function-body-line, and 4 parameter defaults
are starting points, not adopted universal hard limits. The target permits later
useful no-new/no-worse structural rules; permanent advisory-only treatment was
not selected. Do not fragment code merely to satisfy defaults.

Why: a maintainability proxy should improve cohesive design, not reward tiny
helpers, compressed formatting, or options objects hiding independent inputs.

### Q8 — Initial protected critical-behavior inventory

Human selection: **Protect this critical core**.

For Superman itself, the initial protected behavioral contracts cover:

- Policy/evaluator selection and gate-result completeness.
- Head/base/integration and artifact identity.
- Approval and credential boundaries.
- Path/process safety and failure propagation.
- Incremental-selection, cache, and coverage-inventory safety.

Adopting repositories additionally declare their domain-critical behaviors.
Exact cases, oracle-update governance, critical-scope mappings, and activation
evidence still require review. This is an inventory for independent acceptance
contracts, not a claim that all cases exist or pass today.

Why: prioritize behaviors that protect the judgment itself and prevent an
optimization or authority error from manufacturing admission.

### Q9 — Dedicated admission App for the initial public GitHub implementation

Human selection: **Dedicated admission App**.

Use an expected-source required check from a separately controlled GitHub App as
the initial public GitHub enforcement root. The admission App is separate from
the authoring identity. Its credentials remain outside candidate repositories
and authoring agents; evidence is independently verified before publication.

Why: ordinary public-repository protection can enforce a dedicated producer
without depending on unverified Enterprise Cloud required-workflow entitlement.
The shared GitHub Actions App and a check name alone do not select an independent
evaluator.

The controller's workflow-versus-service deployment remains unresolved. No App
registration, permission change, credential provisioning, or required-check
setting has been authorized or performed. Other host adapters must demonstrate
equivalent contract enforcement rather than merely reuse a GitHub check name.

### Q10 — Block unresolved introduced critical mutation survivors

Human selection: **Block unresolved critical survivors**.

Within an owner-governed critical-code scope, new or introduced undetected
mutants block until killed or resolved through a separately reviewed Gate 1
measurement/equivalence policy decision. Percentage gains elsewhere cannot
excuse losing a critical assertion.

Require explicit critical-scope mapping and preserve raw outcomes. No
agent-authored ignore, silent denominator change, or inline waiver is permitted.
Noncritical survivors remain visible under the existing ratchet; no universal
mutation-score floor is newly selected.

Why: aggregate no-regression percentages and new-file initialization alone do
not prevent weak new critical code or compensation for a lost critical test.

The critical mapping, mutant identity/comparison, reviewed equivalence handling,
and blocking fixtures require design and evidence before activation. This is a
new target policy, not a claim that current G6 already enforces it.

### Q11 — Full-corpus pre-merge duplication prevention

Human selection: **Full-corpus prevention**.

Initially require complete approved-corpus duplication measurement against its
baseline before merge. A later incremental method is permissible only after
equivalent detection of cross-scope clones and total-percentage regressions is
demonstrated.

Why: a changed-file scan cannot prevent a clone against an unscanned file, and
nightly detection cannot retroactively prevent that merge.

This reopens the planned affected-mode G5 blind spot in spec §5.7. It does not
change the duplication baseline, authorize exclusions, or resolve the existing
undersized/partial-corpus measurement blocker. Bootstrap full scanning is not
evidence that future incremental equivalence has been proven.

### Q12 — Critical acceptance stays outside selection and result reuse

Human selection: **Keep critical suite fresh**.

Run the independently governed critical acceptance suite fresh for every
applicable PR. Trusted policy decides applicability; the candidate's change
graph cannot prune critical cases, and cached passes cannot replace current
execution. Ordinary tests/typechecks/lint remain eligible for proven-safe
incremental execution under the governing gate-specific contract.

Why: the optimization being checked must not be able to suppress the cases that
detect its own safety or authority failure.

### Q13 — Quarantine affected selection on the first confirmed miss

Human selection: **Quarantine on first miss**.

One confirmed affected-selection miss disables the implicated provider pending a
reviewed fix and fresh full verification. Unknown attribution conservatively
disables affected selection. An unconfirmed flake is not a confirmed miss.
Retain the existing first-confirmed-stale-pass disablement for implicated
gate/input-model reuse.

Why: a known omission should not remain enabled while accumulating a tolerable
miss rate. Resetting a ledger or retrying until green does not repair it.

This tightens the existing rolling-50 / >2% and early-history selection-miss
thresholds; it does not assert that every unconfirmed nightly failure has an
attributed introducing PR. Recovery requires evidence, not a changed model hash
alone. Exact confirmation/recovery fixtures remain to be specified.

### Q14 — Governed Actions controller, not an initial always-on service

Human selection: **Governed Actions controller**.

Start with an owner-governed Actions controller workflow in a separate trust
boundary, using the dedicated admission App. Safe polling or independently
authenticated triggering may introduce latency. Missing or delayed evaluation
remains blocking; scheduled execution has no guaranteed delivery deadline.

Why: avoid a new always-on service until measured scheduling/supervision needs
justify one, without placing publisher credentials in candidate-repository
workflows or weakening the independent authority boundary.

The control repository, trigger authentication, App provisioning/permissions,
credential custody, and operational owner are not selected or provisioned by
this answer. Queue/trigger latency must be measured rather than hidden from CI
cost reporting.

### Q15 — Validate externally provisioned isolation

Human selection: **Validate external isolation**.

The initial scope consumes externally provisioned, operator-approved authoring
and CI isolation profiles with independently verifiable launch/lifecycle
evidence. Require demonstrated credential, filesystem/process/network, and
clean-worker boundaries. Agent assertions, runner labels, and Deno permissions
alone do not establish them. Unproven profiles block activation.

Why: Superman should enforce an explicit isolation contract without becoming a
VM/container provisioning and operations platform in this amendment.

Actual providers, launchers, image identities, evidence sources, approval roles,
and recovery procedures require preparation and verification. No existing local
agent session or CI runner is declared conforming by this interview.

### Q16 — Conservative selection for required PR checks

Human selection: **Conservative selection only**.

Every provider narrowing required PR checks must demonstrate conservative
impact coverage for its declared supported profile. Unknown ownership, graphs,
or inputs force full selection. Over-selection is acceptable; knowingly
incomplete required-check selection is not.

Why: nightly detection and first-miss quarantine do not justify knowingly
omitting required pre-merge work.

This retires the accepted heuristic Elixir post-merge selection blind spot for
the target contract. The provider may still operate in full-selection mode
until safe narrowing is demonstrated. Require modeled inputs and conformance/
adversarial fixtures, not a claim of universal proof of dynamic reachability.
The v0 provider roster is not silently reduced by this decision.

### Q17 — Strict admission and explicitly lower-assurance audit mode

Human selection: **Strict plus labeled audit**.

Where required host protection or isolation cannot be demonstrated, strict
activation/admission is unavailable. A separately labeled audit-only mode may
provide diagnostics but does not satisfy the independent enforcement contract.
No automatic promotion or false readiness claim is permitted.

Why: constrained repositories can benefit from honest diagnostics without
turning missing safeguards into a strict-mode exemption.

Do not infer current private-repository plan/protection capabilities from a
public repository's settings. An audit-only result cannot satisfy a strict
readiness requirement.

### Q18 — Minimum strict baseline before the first usable v0

Human selection: **Strict baseline before v0**.

The first usable v0 requires a demonstrated minimum strict baseline: independent
admission, approved authoring/CI isolation, the critical behavioral contracts,
and required quality/incremental safeguards. Structural metrics may remain
advisory during calibration.

Only separately approved preparation needed to establish that baseline may use
the explicitly existing trust boundary. Dependent activation and ticket
readiness remain blocked until their evidence exists. This interview does not
authorize such preparation or admit an implementation ticket.

Why: releasing the old-trust system as the usable target would defer the
independent enforcement that this amendment is intended to establish.

Existing Gate 1/platform/tool-asset and other bootstrap blockers are additional
requirements, not superseded by these new prerequisites. Existing concurrent
planning or approvals retain their own exact scope and are not broadened here.

### Q19 — Retain feedback goals; measure actual end-to-end cost

Human selection: **Retain and measure end-to-end**.

Retain the existing <10-second pre-commit p50 goal and 20-minute PR-CI p50 review
threshold. Report cold/warm p50/p95 and end-to-end PR feedback including
controller polling, queues, and worker startup.

Why: runner execution duration alone can hide scheduling overhead introduced by
the independent controller or by isolation.

These are performance-review targets, not permission to skip a required gate,
accept partial execution, retry until green, or downgrade assurance. A budget
breach prompts explicit reviewed optimization or capacity work. Missing,
failed, and incomplete required evidence remains blocking.

### Q20 — Remove authoring-agent approval and merge capability

Human selection: **Remove merge capability**.

Strict activation requires independent permission/host evidence that authoring
credentials cannot approve or merge target-repository PRs. A verified read/fork
contribution model or independently enforced actor restrictions may satisfy the
requirement; an instruction saying not to merge does not.

Why: malicious-agent containment must not rely on the agent voluntarily
declining an authority its credentials actually possess.

This removes ADR 0001's accepted technical merge-after-approval capability from
the target strict contract. Exact identity/token/host mechanisms remain to be
selected and verified; no credential or repository permission was changed.
Q26 below refines approval to the effective required human approval, not the
impossibility of submitting every review event.

### Q21 — Evaluate under previous authority before promotion

Human selection: **Previous authority then promotion**.

Changes to governing evaluator/policy revisions, critical contracts, isolation
profiles, and baseline definitions require human Gate 1 review and evaluation
under the previously approved authority before separate promotion. A candidate
cannot declare its proposed revision authoritative.

Initial root bootstrap requires explicit human-controlled evidence. Existing
narrowly permitted, verified ratchet tightening remains separate; this decision
does not authorize baseline redefinition in an ordinary ticket.

Why: a replacement evaluator's self-reported success cannot establish its own
authority, and an old passing result must not silently authorize a new policy.

The concrete promotion/fencing and invalidation mechanism requires design:
old-policy successes must not satisfy a newly selected policy merely because
the source head and App check name are unchanged.

### Q22 — Resolve deployment details before closing the interview

Human selection: **Resolve deployment details first**.

Continue until concrete repositories, operational owners, and profile choices
are selected. The alternative of closing now with a target contract and blocking
preparation checklist was not selected.

Investigate available facts rather than asking the human lookup questions.
Selecting a proposed name, role, or profile is not creating/provisioning it or
proving readiness. Missing evidence remains explicit; no infrastructure,
credential, canonical-document, or implementation change is authorized here.

### Q23 — Initial accountable operator

Human selection: **André until explicit delegation**.

André (`br4vesirrobin`) is the initial accountable operator and Gate 1 approver
for the controller/App, policy and critical-contract promotion, isolation-profile
approval, and recovery. He may explicitly delegate named, bounded operator roles.

Why: an operation or recovery prerequisite must not become silently ownerless.

This assigns responsibility, not new host permissions. Actual account
permissions still need verification, and the selected owner is not permission
for an agent to use that person's credentials.

### Q24 — Initial TypeScript static-analysis profile

Human selection: **Select this TypeScript profile**.

Retain the approved pinned toolchain, strict compilation, and existing Archgate
boundaries. Explicitly block vetted correctness findings including explicit-any,
ts-ignore, and resolved runtime import cycles. In pinned Biome these correspond
to `suspicious/noExplicitAny`, `suspicious/noTsIgnore`, and
`suspicious/noImportCycles`; selected rules require explicit error severity and
valid/invalid conformance fixtures.

Govern effective suppressions through protected policy. The noTsIgnore rule
alone does not ban every type-checking suppression; actual consuming-tool
semantics and declared fixture/runtime cohorts require verification. Do not
claim complete type soundness, external-data validation, or graph completeness
from a clean result.

Optional compiler flags and nursery promise rules are separate compatibility
pilots, not an overlapping new linter suite. No runtime/pin migration or
configuration edit is authorized by selecting this target profile. Proposed
Deno choices retain their separate approval and tool-host evidence requirements.

D1 reconciles this profile as Deno-native TypeScript: complete supplemental
`deno check` complements primary tsrs; actual Deno declarations, import maps,
launch/config inputs and graph resolution require fixtures. Retained Node hosts
must be identified as real Node, not Deno's Node-compatible version string.
Biome cycle analysis must demonstrate coverage of the selected Deno graph;
unknown or unsupported resolution cannot be called a complete zero-cycle pass.

Why: make high-signal checks genuinely blocking without turning unproven or
informational optional rules into either false assurance or arbitrary failures.

### Q25 — Separate structural advisory cohorts

Human selection: **Separate declared cohorts**.

Report the advisory triggers of cognitive complexity 15, function-body length
50, and parameter count 4 separately for product runtime code, bootstrap/rule
code, and tests/fixtures, using pinned counting semantics. No average may hide a
difficult function. Promotion requires representative calibration and Gate 1.

Why: test boilerplate, deep validators, and ordinary product functions need
context rather than one aggregate score. Keep all cohorts visible.

Cohort declarations must not become a way for candidate code to launder runtime
files into unmeasured fixtures. This profile neither excludes runtime code from
coverage nor introduces hard structural caps.

### Q26 — Deny effective approval/merge, not every review event

Human selection: **No effective approval or merge**.

Authoring credentials must not satisfy the required designated-human approval
or merge the target PR. Non-counting approval events remain prohibited by
workflow/audit. Do not claim that read/fork access alone prevents every review
API event; that stronger requirement was not selected.

Why: GitHub permits read/fork identities to submit reviews that do not satisfy
required approval. State the capability actually denied rather than promise a
property the selected role cannot establish.

The authoring credential/host model must reconcile ADR 0005 as well as 0001 and
prove that a non-human review cannot substitute for the designated approval.

### Q27 — Proposed controller repository and admission App identities

Human selection: **Select proposed identities**.

Select proposed public control repository `r3dlex/superman-control` and dedicated
App name `r3dlex-superman-admission`, governed by André. Authoring identities have
no write/admin access to the control repository or admission authority.

Anonymous lookup found no public match; this is not reservation, proof of private
nonexistence, or registration availability. Actual repository/App/installation
IDs, grants, permission scopes, and credential custody must be verified during
separately authorized setup. Nothing was created or provisioned here.

### Q28 — Hosted strict pilot with explicit route approvals

Human selection: **Hosted strict pilot**.

Select proposed routes:

| Role | Initial route |
| --- | --- |
| Trusted Deno controller | Separate trusted GitHub-hosted `ubuntu-24.04` x64 job |
| Trusted Deno evidence verifier/publisher | Separate trusted GitHub-hosted `ubuntu-24.04` x64 job, no candidate execution |
| Candidate/static/test execution, macOS arm64 | Explicitly reviewed hosted `macos-15` ARM64 exception |
| Candidate/static/test execution, Linux x64 | Explicitly reviewed hosted `ubuntu-24.04` x64 exception |
| Candidate/static/test execution, Linux arm64 | Explicitly reviewed hosted `ubuntu-24.04-arm` ARM64 exception |

Why: the inspected persistent runner manager/Colima workers do not supply the
disposable strict-isolation contract. A hosted pilot avoids relabeling those
workers as conforming while preserving native three-platform obligations.

Moving labels are not immutable image identities or approval evidence. Require
explicit exception/image/provider/lifecycle records, per-role authority and
fresh acceptance. No assertion/coverage/security failure triggers a hosted
fallback, and these selected routes are not activated by the interview. Reconcile
them with proposed ADR 0015's preference/exception policy. Admission publication
is not the separately scoped Deno release uploader or an npm-provider exception.

### Q29 — Authoring VM selection, superseded by U2

Historical human selection: **Tart macOS authoring VM**.

A per-session native macOS ARM64 Tart VM was selected, covering the full
agent/tool capability boundary rather than shell commands alone, excluding host
home/credentials, privileged sockets and approver-browser/MCP bridges. No VM
was created or proved conforming. **U2 removes this new-VM project from the
required scope; it is not an activation prerequisite for the narrowed amendment.**

### Q30 — Versioned admission generation and promotion hold

Human selection before U2: **Versioned generation plus hold**.

If the separate admission controller is retained, its initial required result
is `superman/admission/g0001`, bound to the dedicated App and exact Deno
evaluator/policy/launch identities. Governing changes and rollbacks receive new
generations. Add the new host requirement before retiring the old, verify
effective state, and use an owner-controlled merge hold with proved retirement/
credential fencing of old publishers. Retired evidence cannot be relabeled
into a new generation.

Context names alone do not restrict what an App token can publish; administration
stays outside the publisher, and no atomic transaction across GitHub APIs is
assumed. **U2 leaves retention of the separate controller open; this protocol
must not become an unconditional infrastructure requirement if it is deferred.**

### Q31 — Include the enforcement core in critical measurements

Human selection: **Include the enforcement core**.

Critical scope includes operational Deno bootstrap/verifiers and governing rule
code, not only product `src`; include a separate controller only if that
component remains in scope. Use reviewed module/scope mappings and declared real
tool hosts. Require actual-Deno known-kill mutation fixtures, complete four-metric
source coverage including unloaded files, and native compiled conformance.

First critical-scope measurement needs owner-reviewed survivor treatment, not a
fabricated baseline or silent weak initialization. Unsupported measurement must
not become an invented pass. U2 changes infrastructure scope, not these quality
measurement requirements.

### Q32 — Lean existing CI is the selected delivery scope

Human selection: **Lean existing CI**.

Strengthen the existing repository CI and protected local/remote quality
pipeline. Defer the new controller repository/admission App, promotion
generations, VM platform, and credential-brokering project. These are outside
this amendment, not promised follow-up deliveries or v0 prerequisites.

Use Archgate, Biome, and all approved blocking quality gates through the same
repository-owned contract. CI is the authoritative quality standard; local
checks use that contract rather than a weaker parallel implementation.

The existing PR-owned checker plus human review remains the explicitly accepted
trust boundary. Prevent agent self-waivers through protected effective policy,
pin/scope/suppression checks and human-governed changes; do not equate those
safeguards with an independently isolated evaluator or tamper-proof dynamic
results. Existing human approval/merge and identity policy remain in force.

Supersession of earlier selections:

- Q3/Q9/Q14/Q27/Q30's external authority/controller/App and generation rollout
  are deferred, not implementation requirements.
- Q4/Q15/Q18/Q20/Q26/Q29 do not introduce a VM platform, new sandbox attestation,
  authoring-identity redesign, or credential issuer as a delivery prerequisite.
  Keep ordinary credential/permission hygiene and existing actor rules; retain
  their documented technical limits instead of claiming new denial evidence.
- Q12's critical suite and Q16's conservative selection remain quality rules;
  owner-governed critical cases are governed in the existing repository policy,
  not a newly required control repository. Q31 excludes a new external
  controller because it is no longer a component of this delivery.
- Q23 makes André accountable for the in-scope quality policy, CI configuration,
  calibration and recovery. It authorizes no use of his credentials.
- Q22's request for concrete deployment decisions is satisfied by selecting the
  existing workflow/self-hosted environments and current quality-tool profiles;
  exact available environment identities still require factual verification,
  not new infrastructure creation or invented image names.

The usable v0 quality bar, existing Deno/platform/tool integration prerequisites,
and all independently existing readiness blockers remain. Missing tools, a
missing required runner leg, incomplete Deno measurement, or failed code-quality
evidence cannot be made green to accommodate the infrastructure constraint.

### Q33 — Fast commit feedback; full pre-PR/CI quality bar

Human selection: **Fast commit; full pre-PR/CI**.

Use one policy/driver with explicit stage scope. Pre-commit is fast staged
feedback, not a full quality pass. Full local pre-PR and remote CI enforce the
same blocking Archgate/Biome/type/test/coverage/mutation/duplication/unused-code/
security contract without hidden local exemptions. Remote forge/approval checks
are additional admission evidence, not something local success proves.

### Q34 — Approved locked tools within existing environments

Human selection: **Allow locked job-local tools**.

CI may verify and provision approved exact-pinned tools into owned job
directories while using the selected existing self-hosted images/environments.
Use verified artifacts/frozen dependencies and suppressed lifecycle hooks;
record actual tool/runtime identities. This includes approved Deno and retained
real Node/pnpm hosts where required.

Missing, mismatched, or failed provisioning blocks the quality result. This
does not authorize building an image, changing global host installations, or
installing/running tools during this planning interview.

### Q35 — Final shared understanding confirmed

Human selection: **Confirm shared understanding**.

The confirmed final scope is the current proposed contract above: Deno-owned,
quality-first repository CI with Archgate/Biome and retained tools; identical
full local/remote quality obligations; four 90% coverage floors/100% target;
mutation/duplication/critical-test safeguards; calibrated structural advisories;
safe incremental execution/full fallback/uncached nightly; existing self-hosted
environments only with approved job-local tools; no new hosted/VM/controller/App
project. Retain the explicit PR-owned-checker/human-review trust limit.

This completes the interview only. It does not authorize canonical spec/ADR/
glossary/ticket edits, implementation, installations, credentials, hosted
operations, commits/pushes, approvals/merges, or activation. Do not automatically
invoke to-spec, to-tickets, or an implementation workflow. Existing blockers and
concurrent work remain intact.

## Preserved requirements

These are existing constraints, not additional interview approvals:

- Coverage remains at least 90% independently for lines, statements, branches,
  and functions over the complete inventory, with 100% as the target. No new
  per-file floor or automatic coverage ratchet is selected.
- Affected selection, gate-result reuse, and admission are distinct. A full run
  selects all applicable targets; only an uncached full run necessarily executes
  them all without reusing gate results.
- The bootstrap has no activated trusted incremental coverage ledger and retains
  its uncached full fallback. Planned main selection and uncached full nightly
  requirements are not claims that those product capabilities exist today.
- No inline waivers; a governing policy change requires separate Gate 1 review.
- Exact-head approval, tested base/integration identity, and existing readiness
  blockers remain in force. Research and local receipts grant no merge authority.
- The spec's <=12-minute slowest-leg PR-CI goal is not replaced by Q19's
  20-minute performance-review threshold. Report execution, scheduling and
  human-decision waiting time separately rather than hiding costs or confusing
  CI feedback latency with the time a human takes to approve.

## Deno reconciliation: concrete effects on the grill and future spec amendment

This is an impact map, not edits to the canonical documents. The Deno amendment
has completed its own planning/review and explicitly preserves this interview;
its activation still requires Gate 1 evidence and cross-amendment reconciliation.

| Surface | Required reconciliation |
| --- | --- |
| Owned gate orchestration | Deno/built-ins run the owned CLI/hooks/bootstrap/verifiers; retained real Node is a tool/measurement host, not an operational fallback. Bind executable, startup/config/capability and asset inputs. No new external controller/publisher is in the selected scope. |
| Types and static policy | Preserve primary tsrs plus complete supplemental `deno check` and nonblocking reference tsc drift. Test actual Deno globals/declarations/resolution and Biome/Archgate coverage; do not replace tools with deno lint/fmt by assumption. Extend governing import/spawn/suppression/bypass rules through separately approved preparation. |
| Coverage | Keep 90% independently for all four metrics. Native Deno's line/branch/function output is not a statement denominator or an unloaded-file inventory. Prove source-bound four-metric conversion and disjoint aggregation of actual Deno, retained Node drivers and actual rule code. Missing child data or mapping blocks; old Node evidence cannot satisfy this. |
| Mutation and replay | Vitest/Stryker hosting in Node does not demonstrate Deno execution or mutation. Prove instrumented snapshot selection, active mutant before module load, meaningful known kill through actual Deno, test attribution and concurrent-worker isolation. Runtime/config/permission failure is not G9 feature-red evidence. |
| Incremental selection/reuse | Bind actual engine/channel/executable, V8/bundled TypeScript/declarations, entry graph, source/compiled launch form, config/permission/environment policy, assets and relevant build/denort identities. No assumed Node-to-Deno or source-to-binary reuse. Unknown complete coverage evidence invokes uncached full checks; missing required runtime/isolation approval still blocks admission. |
| Existing workers and startup | Use existing self-hosted environments; do not introduce a VM delivery/attestation project. Deno grants do not sandbox spawned Node/native tools. Preserve no all-access flag, prompt escalation or Deno permission broker; reviewed broader compiled grants are not repository least privilege. The separately confirmed pre-runtime startup/config/environment controls still need proof; do not claim current persistent hosts provide hostile-code isolation. |
| Releases | Source execution is the canonical measured path. Each exact compiled artifact additionally passes the same public CLI conformance suite natively on macOS arm64, Linux x64 and Linux arm64. Bind source/compiler/denort/build/assets/capability/artifact identities; do not call source coverage binary coverage. Admission and the separately restricted release uploader are different authorities. |
| Activation | Retain the current evaluator until authorized Deno replacement proof and exact-head review. Reconcile the in-scope quality rules and Deno prerequisites before activation; neither amendment satisfies the other's evidence. Deferred independent-App/VM requirements are not v0 blockers under U2/Q32. |

Canonical amendment targets after a separate authorization are spec §§5.3–5.4,
5.7, 5.10, 8–9, 12, 16–17; ADRs 0003/0008/0009 for runtime/type/lint boundaries,
0010/0011/0014 for optimization/measurement, and proposed 0015/0016 for execution
and Deno. Retain ADR 0001/0005's accepted authority/identity limits instead of
silently importing the deferred independent-App design. Reconcile existing ticket
dependencies without renumbering or silently admitting them. Preserve the
Deno release-assets follow-up and ticket 33 ordering.

Exact Deno patch/artifact/grant/launcher and measurement acceptance remains
unverified, as recorded in the Deno interview. A proposed deployment choice is
not proof that it exists, that its artifact is accepted, or that its profile is
safe.

## Proposed terminology and ADR work

Canonical documents are unchanged. Candidate terms for later review:

- **Deliberate evasion:** an attempt to influence or bypass a quality judgment,
  rather than an ordinary implementation mistake.
- **Common enforcement contract:** shared acceptance and evidence obligations
  implemented through separately verified language-specific profiles.

Q32 retains the existing trust boundary rather than replacing ADR 0001/0005 with
an independent-admission architecture. Any later authority redesign needs its
own decision. Proposed spec/ADR work here records the quality rules, self-hosted
execution scope and honest retained limits, not the deferred controller design.

## Planning completion and remaining evidence

The narrowed design frontier is closed by Q35. Actual environment/tool and
measurement evidence has not been produced by this interview; design completion
does not turn those outstanding facts into readiness.

Implementation/evidence work remains after design confirmation: actual existing
runner/environment inventory and tool identities; Deno integration and public
process/measurement fixtures; exact critical module mappings and valid/invalid
rule fixtures; calibration and approved baselines; safe selection/reuse and
incident recovery. These are not facts the interview can manufacture and do not
authorize execution or implementation.

Questions will be asked at their dependency frontier; unresolved implementation
facts are investigated rather than assumed or delegated to the human as trivia.

## Sources and evidence boundaries

- [Research and primary-source citations](code-quality-gates-research.md):
  snapshot-bound findings and recommendations, not adopted policy or fresh CI.
- [Current spec](spec.md), especially §§5.4, 5.7, 9, and 17.
- [Existing glossary](../../GLOSSARY.md).
- [Accepted trust boundary](../../docs/adr/0001-human-approval-on-head-sha.md).
- [No waivers](../../docs/adr/0004-no-waivers.md).
- [Affected analysis](../../docs/adr/0010-affected-analysis-and-change-aware-ci.md).
- [Gate cache security](../../docs/adr/0011-remote-gate-cache-security.md).
- [Overall coverage](../../docs/adr/0014-overall-coverage-in-incremental-ci.md).
- [Deno interview and its confirmed/withdrawn decisions](deno-amendment.md).
- [Deno operational/runtime design](../../docs/adr/0016-deno-operational-runtime-and-release-bundles.md).
- [Deno source/tool/coverage/mutation research](deno-runtime-research.md).
- [Compiled capability and startup research](deno-capability-research.md).

Additional read-only deployment fact-finding found two enforcement primitives:
a dedicated App's required check under ordinary public-repository protection,
or an organization/enterprise-required workflow with its own entitlement and
governance prerequisites. An editable reusable-workflow caller or a familiar
check name is not mandatory independent execution. No mechanism was selected by
that research, and Enterprise Cloud entitlement remains unverified.

Primary references:
[expected-source checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging),
[required workflows](https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-workflows-to-pass-before-merging),
[App CI integration](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-ci-checks-with-a-github-app),
and [reusable workflow pinning](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#calling-a-reusable-workflow).

Concurrent Deno planning, spec edits, and existing source/test changes are outside
this interview's write scope and must be preserved. Shared understanding was
confirmed in Q35 for the narrowed U2/Q32 contract, not the superseded infrastructure
design. Do not invoke spec synthesis, ticketing, or implementation automatically.
