// Critical case: duplication-and-mutation-evidence.
// Declared critical module: .superman/ci/quality.ts
//
// The quality gate owns the reviewed clone floors and the owner-governed
// critical mutation cases. Two failures matter here and both hide behind an
// aggregate number: a lowered clone floor, and a declared critical case that
// is missing, undeclared or never actually executed. Every expectation below
// is the reviewed policy's own wording.
import { describe, expect, test } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { qualityGate } from "../quality.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/** A reviewed quality policy with the declared clone floors and mutation scope. */
function bootstrap(quality: Record<string, unknown>): string {
  return JSON.stringify({
    version: 1,
    tools: { node: "26", jscpd: "5.4.2", stryker: "10.1.1", vitest: "5.0.5", typescript: "7.1.0-beta" },
    policyInputs: ["tsconfig.json"],
    test: { files: ["test/**/*.test.ts"], support: ["test/**"] },
    quality,
  });
}

/**
 * The environment this case's own gate evaluation runs under.
 *
 * The G6 gate runs its declared cases with a recursion guard set, so that a
 * case which runs the gates cannot run the declared cases again. This case's
 * declared cases are plain files that never run the gates, so the recursion
 * the guard prevents cannot happen here — and the guard must not change
 * which refusal this evaluation reaches. The gate is evaluated as a fresh
 * evaluation would be.
 */
function fixtureGateEnvironment(): Record<string, string | undefined> {
  const environment = fixtureEnvironment();
  delete environment.SUPERMAN_CRITICAL_CASE_CHILD;
  return environment;
}

/** A refusal and the failure kind the gate taxonomy gives it. */
function refusal(run: () => unknown): { kind: string | undefined; message: string } {
  try {
    run();
  } catch (error) {
    const kind = (error as { kind?: unknown } | undefined)?.kind;
    return {
      kind: typeof kind === "string" ? kind : undefined,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return { kind: undefined, message: "no refusal" };
}

/** A declared critical case declaration. */
function criticalCase(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "declared-case",
    module: "src/value.ts",
    case: "case/passing.test.ts",
    runner: "node-test",
    ...overrides,
  };
}

describe("the reviewed measurement policy", () => {
  test("a lowered clone floor is refused instead of being applied", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 60, minLines: 5 },
        mutation: { scope: ["src/value.ts"] },
      }),
    );
    const headSha = repo.commit();

    expect(refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()))).toEqual({
      kind: "policy-refusal",
      message: "G6: the declared clone floors changed (60 tokens, 5 lines); Gate 1 baseline refresh required",
    });
  }, 120_000);
});

describe("a declared critical case the candidate does not carry", () => {
  test("a declared critical module the candidate does not carry blocks", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 },
        mutation: { scope: ["src/value.ts"], critical: [criticalCase({ module: ".superman/ci/absent.ts" })] },
      }),
    );
    const headSha = repo.commit();

    expect(refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()))).toEqual({
      kind: "skipped-required-work",
      message: "G6: missing critical module .superman/ci/absent.ts",
    });
  }, 120_000);

  test("a declared critical case the candidate does not carry blocks", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 },
        mutation: { scope: ["src/value.ts"], critical: [criticalCase({ case: "case/absent.test.ts" })] },
      }),
    );
    const headSha = repo.commit();

    expect(refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()))).toEqual({
      kind: "skipped-required-work",
      message: "G6: missing critical case case/absent.test.ts",
    });
  }, 120_000);

  test("a declared critical case must name a runner the pinned toolchain can execute", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 },
        mutation: { scope: ["src/value.ts"], critical: [criticalCase({ runner: "jest" })] },
      }),
    );
    const headSha = repo.commit();

    expect(refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()))).toEqual({
      kind: "policy-refusal",
      message: "G6: declared critical case declared-case must declare its runner as node-test or vitest",
    });
  }, 120_000);
});

describe("a declared critical case is executed fresh", () => {
  test("a declared critical case is executed fresh, and a failing case blocks the gate", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      "case/failing.test.ts",
      'import { test } from "node:test";\ntest("declared case", () => {\n  throw new Error("the declared critical case failed");\n});\n',
    );
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 },
        mutation: { scope: ["src/value.ts"], critical: [criticalCase({ case: "case/failing.test.ts" })] },
      }),
    );
    const headSha = repo.commit();

    const outcome = refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()));
    expect(outcome.message).toContain(
      "G6: declared critical case declared-case failed (case/failing.test.ts, node-test): 1",
    );
    expect(outcome.kind).toBe("failed-command");
  }, 120_000);

  test("a declared critical case that passes lets the gate continue to its baseline decision", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write("case/passing.test.ts", 'import { test } from "node:test";\ntest("declared case", () => {});\n');
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        duplication: { corpus: "src/**/*.ts", minTokens: 50, minLines: 5 },
        mutation: { scope: ["src/value.ts"], critical: [criticalCase({})] },
      }),
    );
    const headSha = repo.commit();

    expect(refusal(() => qualityGate("G6", repo.root, repo.baseSha, headSha, fixtureGateEnvironment()))).toEqual({
      kind: "policy-refusal",
      message: "G6: reviewed superman.ratchet.json is missing; first-source baseline follow-up required",
    });
  }, 120_000);
});
