// Critical case: approval-and-credential-boundaries.
// Declared critical module: .superman/ci/raw-gates.ts
//
// The raw driver is the enforcement core's process boundary: it decides which
// identity and which credentials the gates it runs inherit, and it publishes
// the one artifact the run leaves behind. Two false greens live here. A
// receipt that reads as a merge authority would let a candidate-generated
// artifact stand in for a human approval. A gate that runs under the caller's
// forge credentials or Git overrides would let the caller's repository, not
// the reviewed one, decide the outcome. Every expectation below is the
// reviewed policy's own wording, not a restatement of the implementation.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { fixture, interceptPnpm } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/**
 * The caller's credential and Git-override families. None of them may reach
 * a gate's tools: they are the caller's forge identity and the caller's
 * repository, not the reviewed run's.
 */
const CALLER_ONLY = [
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "SUPERMAN_APP_KEY_PATH",
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_CONFIG_COUNT",
  "HEAD_SHA",
  "HEAD_REF",
  "BASE_SHA",
  "BASE_REF",
];

/** The environment a gate's tool process inherits, as the tool itself saw it. */
function toolEnvironment(path: string): Record<string, string> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

/** The caller's credentials the tool process inherited, if any. */
function inherited(environment: Record<string, string>): string[] {
  return CALLER_ONLY.filter((key) => environment[key] !== undefined);
}

/** The Git environment variables the tool process inherited. */
function gitKeys(environment: Record<string, string>): string[] {
  return Object.keys(environment)
    .filter((key) => key.startsWith("GIT_"))
    .sort();
}

/**
 * The fixture's own test. The project's test process is the deepest child of
 * the run, so it observes the inherited environment from the inside.
 */
function fixtureTest(): string {
  return [
    'import { expect, test } from "vitest";',
    'test("the gate inherits no caller credential", () => {',
    ...CALLER_ONLY.map((key) => `  expect(process.env.${key}).toBeUndefined();`),
    "});",
    "",
  ].join("\n");
}

/** The caller's environment, as a caller would state it. */
function callerCredentials(root: string): Record<string, string> {
  return {
    GITHUB_TOKEN: "caller-forge-token",
    GH_TOKEN: "caller-gh-token",
    SUPERMAN_APP_KEY_PATH: "/caller/app-key.pem",
    // A Git directory that does not exist: an override that reached the run
    // would break every Git read the run makes, not merely mislabel it.
    GIT_DIR: join(root, ".git", "absent"),
    GIT_WORK_TREE: join(root, "absent"),
    GIT_INDEX_FILE: join(root, ".git", "absent-index"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/not-real",
    HEAD_SHA: "0".repeat(40),
    // The run's own pull-request identity is the caller's to state; the
    // question is whether it reaches the gate's tools.
    HEAD_REF: "ticket/demo-01",
    BASE_SHA: "1".repeat(40),
    BASE_REF: "main",
  };
}

describe("the merge authority a bootstrap receipt claims", () => {
  test("a bootstrap receipt claims no merge authority", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.commit();

    const result = repo.runGate("G9");

    expect(result.status).toBe(0);
    expect(result.receipt).toMatchObject({
      schema: "superman.receipt/1",
      kind: "bootstrap.raw",
      mergeAuthority: "none",
    });
  }, 120_000);
});

describe("the credentials a gate inherits", () => {
  test("the gates a driver runs inherit none of the caller's credentials or Git overrides", () => {
    const repo = fixture(fixtureContext(), "ticket/demo-01");
    repo.write("test/credentials.test.ts", fixtureTest());
    repo.write("src/value.ts", "export const value = 1;\n");
    repo.commit();
    const capture = join(repo.root, ".tools/gate-environment.json");
    interceptPnpm(repo.root, `writeFileSync(${JSON.stringify(capture)}, JSON.stringify(process.env));`);

    const result = repo.runGate("G2", [], callerCredentials(repo.root));

    expect(result.status, result.output).toBe(0);
    expect(result.receipt.results[0]).toMatchObject({ gate: "G2", status: "pass" });
    expect(existsSync(capture)).toBe(true);
    const environment = toolEnvironment(capture);
    expect(inherited(environment)).toEqual([]);
    // The caller's Git configuration is not consulted: the run reads the
    // reviewed repository with no global and no system configuration.
    expect(environment.GIT_CONFIG_GLOBAL).toBe("/dev/null");
    expect(environment.GIT_CONFIG_SYSTEM).toBe("/dev/null");
    expect(environment.GIT_CONFIG_NOSYSTEM).toBe("1");
    expect(gitKeys(environment)).toEqual([
      "GIT_CONFIG_GLOBAL",
      "GIT_CONFIG_NOSYSTEM",
      "GIT_CONFIG_SYSTEM",
      "GIT_OPTIONAL_LOCKS",
    ]);
  }, 120_000);
});

describe("a caller's Git overrides", () => {
  test("a caller's Git override does not redirect the run, and the caller's work and indexes survive it", () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    const external = fixture(fixtureContext(), "spec/other");
    external.write("caller.txt", "staged caller work\n");
    external.git("add", "caller.txt");
    external.write("caller.txt", "unstaged caller work\n");
    const externalIndex = readFileSync(join(external.root, ".git/index"), "utf8");
    const externalHead = external.git("rev-parse", "HEAD");
    repo.write(".scratch/demo/spec.md", "# Approved spec\n\nThe reviewed planning surface.\n");
    const headSha = repo.commit();
    const index = readFileSync(join(repo.root, ".git/index"), "utf8");
    const refs = repo.git("show-ref");

    const result = repo.runGate("G9", [], {
      GIT_DIR: join(external.root, ".git"),
      GIT_WORK_TREE: external.root,
      GIT_INDEX_FILE: join(external.root, ".git/index"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.hooksPath",
      GIT_CONFIG_VALUE_0: "/not-real",
    });

    // The run is about the repository it was started in: the receipt binds that
    // repository's revisions, and the path policy that guards it still passes.
    expect(result.status).toBe(0);
    expect(result.receipt.baseSha).toBe(repo.baseSha);
    expect(result.receipt.evaluatedSha).toBe(headSha);
    expect(result.receipt.headSha).toBe(headSha);
    expect(result.receipt.policyPreflight).toMatchObject({ gate: "G4", status: "pass" });
    // The reviewed repository is exactly as the caller left it.
    expect(readFileSync(join(repo.root, ".git/index"), "utf8")).toBe(index);
    expect(repo.git("show-ref")).toBe(refs);
    expect(repo.git("rev-parse", "HEAD").trim()).toBe(headSha);
    // And so is the caller's other repository, staged work and all.
    expect(readFileSync(join(external.root, ".git/index"), "utf8")).toBe(externalIndex);
    expect(external.git("rev-parse", "HEAD")).toBe(externalHead);
    expect(readFileSync(join(external.root, "caller.txt"), "utf8")).toBe("unstaged caller work\n");
  }, 120_000);
});
