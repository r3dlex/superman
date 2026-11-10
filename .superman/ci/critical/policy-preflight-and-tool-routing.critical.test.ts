// Critical case: policy-preflight-and-tool-routing.
// Declared critical module: .superman/ci/direct-gates.ts
//
// The enforcement core decides, before any tool runs, which gate inventory a
// stage may claim and which tool owns a gate. A defect here lets a run claim
// work it never did, or let two hosts disagree about the same policy. Every
// expectation below is the reviewed policy's own wording, not a restatement
// of the implementation.
import { delimiter, join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  ALL_GATES,
  assertFullStage,
  directGate,
  failureKind,
  type GateContext,
  GateFailure,
  stagePolicy,
} from "../direct-gates.ts";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/**
 * The environment a gate runs under, with the fixture's own pinned toolchain
 * first on PATH. The gate resolves its tools through this environment, so a
 * case that ran against the caller's PATH would prove the caller's pnpm
 * rather than the reviewed one.
 */
function fixtureToolchain(root: string): Record<string, string | undefined> {
  const env = fixtureEnvironment();
  return { ...env, PATH: `${join(root, ".tools")}${delimiter}${env.PATH ?? ""}` };
}

/** The reviewed policy of a fixture repository. */
function bootstrap(stages: Record<string, unknown>): string {
  return JSON.stringify({
    version: 1,
    tools: { node: "26" },
    policyInputs: [],
    test: { files: ["test/**/*.test.ts"], support: ["test/**"] },
    stages,
  });
}

/** A refusal and the failure kind the gate taxonomy gives it. */
function refusal(run: () => unknown): { kind: string | undefined; message: string } {
  try {
    run();
  } catch (error) {
    return { kind: failureKind(error), message: error instanceof Error ? error.message : String(error) };
  }
  return { kind: undefined, message: "no refusal" };
}

/** The same refusal, for a gate that refuses asynchronously. */
async function asyncRefusal(run: () => Promise<unknown>): Promise<{ kind: string | undefined; message: string }> {
  try {
    await run();
  } catch (error) {
    return { kind: failureKind(error), message: error instanceof Error ? error.message : String(error) };
  }
  return { kind: undefined, message: "no refusal" };
}

describe("a declared stage inventory", () => {
  test("a declared stage is applied exactly as the reviewed policy declares it", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({ "pre-pr": { gates: ["G1", "G4", "G9"], feedback: "partial", scope: "staged" } }),
    );
    repo.commit();

    expect(stagePolicy(repo.root, "pre-pr")).toEqual({
      gates: ["G1", "G4", "G9"],
      feedback: "partial",
      declared: true,
      scope: "staged",
    });
  }, 120_000);

  test("a stage the reviewed policy does not declare is refused, not run with a built-in inventory", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".superman/ci/bootstrap.json", bootstrap({}));
    // The reviewed quality module lives in the tree, so an undeclared stage is
    // a policy refusal rather than a permissive fallback.
    repo.write(".superman/ci/quality.ts", "export {};\n");
    repo.commit();

    expect(refusal(() => stagePolicy(repo.root, "pre-pr"))).toEqual({
      kind: "skipped-required-work",
      message: "Raw stage pre-pr has no declared inventory; the reviewed stage declaration is required",
    });
  }, 120_000);
});

describe("a stage declaration that contradicts itself", () => {
  test("a stage declaration that contradicts itself is refused by name", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({
        "partial-but-complete": { gates: [...ALL_GATES], feedback: "partial", scope: "staged" },
        "partial-but-full-scope": { gates: ["G1"], feedback: "partial", scope: "full" },
        "unknown-gate": { gates: ["G99"], feedback: "partial", scope: "staged" },
      }),
    );
    repo.commit();

    expect(refusal(() => stagePolicy(repo.root, "partial-but-complete")).message).toBe(
      "Raw stage partial-but-complete is declared partial but runs every gate",
    );
    expect(refusal(() => stagePolicy(repo.root, "partial-but-full-scope")).message).toBe(
      "Raw stage partial-but-full-scope is declared partial but its scope is full; partial feedback must be staged",
    );
    expect(refusal(() => stagePolicy(repo.root, "unknown-gate")).message).toBe(
      "Raw stage unknown-gate declares an invalid gate inventory",
    );
  }, 120_000);

  test("a stage declared full must declare the complete inventory exactly once", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(
      ".superman/ci/bootstrap.json",
      bootstrap({ "pre-pr": { gates: [...ALL_GATES], feedback: "full", scope: "full" } }),
    );
    repo.commit();

    const missing = ALL_GATES.filter((gate) => gate !== "G9");
    expect(
      refusal(() => assertFullStage("pre-pr", { gates: missing, feedback: "full", declared: true, scope: "full" })),
    ).toEqual({
      kind: "skipped-required-work",
      message: "Raw stage pre-pr is declared full but omits G9",
    });
    expect(
      refusal(() =>
        assertFullStage("pre-pr", {
          gates: [...ALL_GATES, "G1"],
          feedback: "full",
          declared: true,
          scope: "full",
        }),
      ).message,
    ).toBe("Raw stage pre-pr is declared full but names a gate more than once");
  }, 120_000);
});

describe("gate tool routing", () => {
  test("the mutation gates belong to the quality module, not to the direct gate runner", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const context: GateContext = {
      root: repo.root,
      baseSha: repo.baseSha,
      headSha: repo.baseSha,
      branch: "spec/demo",
      env: fixtureToolchain(repo.root),
      tools: {},
    };

    expect(await asyncRefusal(() => directGate("G5", context))).toEqual({
      kind: "policy-refusal",
      message: "Raw gate G5 is dispatched by the driver; the quality module owns it",
    });
    expect(await asyncRefusal(() => directGate("G6", context))).toEqual({
      kind: "policy-refusal",
      message: "Raw gate G6 is dispatched by the driver; the quality module owns it",
    });
    expect(failureKind(new Error("an untyped failure"))).toBeUndefined();
    expect(failureKind(new GateFailure("policy-refusal", "an example"))).toBe("policy-refusal");
  }, 120_000);

  test("G4 is decided by the reviewed path-policy process, not by the runner", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const headSha = repo.commit();
    const context: GateContext = {
      root: repo.root,
      baseSha: repo.baseSha,
      headSha,
      branch: "spec/demo",
      env: fixtureToolchain(repo.root),
      tools: {},
    };

    await expect(directGate("G4", context)).resolves.toEqual({ gate: "G4", status: "pass" });
  }, 120_000);
});
