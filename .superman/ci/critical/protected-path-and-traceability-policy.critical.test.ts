// Critical case: protected-path-and-traceability-policy.
// Declared critical module: .superman/ci/pr-policy.ts
//
// The path policy decides which paths a pull request kind may touch and
// whether the ticket it claims exists on the approved base. Two false greens
// live here: a ticket PR that changes protected policy, and a ticket PR whose
// traceability files are absent. The policy is a process, so the case runs it
// in-process against a fixture repository and reads what it decided.
import { spawnSync } from "node:child_process";
import { describe, expect, test, vi } from "vitest";
import { fixtureEnvironment } from "../fixture-env.ts";
import { fixture } from "../raw-fixture.ts";
import { fixtureContext } from "./fixture-context.ts";

/**
 * The Git and forge identity a policy process must not inherit from the
 * caller, plus the revisions this run is about. The returned function puts
 * the caller's environment back.
 */
function isolate(values: Record<string, string>): () => void {
  const saved = new Map<string, string | undefined>();
  const apply = (key: string, value: string | undefined) => {
    if (!saved.has(key)) saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  for (const key of Object.keys(process.env)) if (/^(?:GIT_|GITHUB_|GH_)/u.test(key)) apply(key, undefined);
  for (const [key, value] of Object.entries(values)) apply(key, value);
  return () => {
    for (const [key, value] of saved) apply(key, value);
  };
}

/** What the protected path policy decided about a fixture revision. */
type Decision = { exitCode: number | string | null | undefined; output: string };

/**
 * Whether this worker may resolve the module's inputs against a working
 * directory. A worker pool that cannot change the working directory runs the
 * module in its own process instead.
 */
function canChangeDirectory(): boolean {
  try {
    process.chdir(process.cwd());
    return true;
  } catch {
    return false;
  }
}

/** Run the protected path policy over a fixture revision and capture its verdict. */
async function decide(repo: { root: string; baseSha: string }, branch: string, headSha: string): Promise<Decision> {
  if (!canChangeDirectory()) {
    const result = spawnSync(process.execPath, [new URL("../pr-policy.ts", import.meta.url).pathname], {
      cwd: repo.root,
      env: { ...fixtureEnvironment(), HEAD_REF: branch, HEAD_SHA: headSha, BASE_SHA: repo.baseSha },
      encoding: "utf8",
      shell: false,
      timeout: 60_000,
    });
    return { exitCode: result.status, output: `${result.stdout}${result.stderr}` };
  }
  const previousCwd = process.cwd();
  const previousExitCode = process.exitCode;
  const restoreEnv = isolate({ HEAD_REF: branch, HEAD_SHA: headSha, BASE_SHA: repo.baseSha });
  const lines: string[] = [];
  const record = (...args: unknown[]) => lines.push(args.map((value) => String(value)).join(" "));
  const out = vi.spyOn(console, "log").mockImplementation(record);
  const err = vi.spyOn(console, "error").mockImplementation(record);
  try {
    process.chdir(repo.root);
    vi.resetModules();
    await import("../pr-policy.ts");
    return { exitCode: process.exitCode, output: lines.join("\n") };
  } finally {
    out.mockRestore();
    err.mockRestore();
    process.chdir(previousCwd);
    process.exitCode = previousExitCode;
    restoreEnv();
  }
}

describe("protected paths per pull request kind", () => {
  test("a ticket pull request that changes a protected policy input is refused", async () => {
    const repo = fixture(fixtureContext(), "ticket/demo-01");
    repo.write(
      "tsconfig.json",
      '{"compilerOptions":{"strict":true,"target":"ESNext","module":"NodeNext","noEmit":true,"allowImportingTsExtensions":true,"types":["node"]},"include":["src/**/*.ts","test/**/*.ts",".superman/ci/**/*.ts"]}\n',
    );
    const headSha = repo.commit();

    const decision = await decide(repo, "ticket/demo-01", headSha);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain(
      "::error file=tsconfig.json::G4: ticket PRs may not touch protected paths (use a spec-kind follow-up PR)",
    );
    expect(decision.output).toContain("pr-policy: fail (1)");
  }, 120_000);

  test("a spec pull request that changes product source is refused", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write("src/product.ts", "export const product = 1;\n");
    const headSha = repo.commit();

    const decision = await decide(repo, "spec/demo", headSha);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain(
      "::error file=src/product.ts::spec-kind PRs may not change this path (no source code at Gate 1)",
    );
    expect(decision.output).toContain("pr-policy: fail (1)");
  }, 120_000);

  test("a pull request kind the policy does not know is refused", async () => {
    const repo = fixture(fixtureContext(), "feature/demo");
    const headSha = repo.commit();

    const decision = await decide(repo, "feature/demo", headSha);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain(
      '::error::Unknown PR kind for branch "feature/demo"; use spec/<slug>, ticket/<slug>-<nn>, chore/skills-<name> or chore/wiki-<name>',
    );
  }, 120_000);
});

describe("ticket traceability on the approved base", () => {
  test("a ticket pull request without its approved-base ticket and spec is refused", async () => {
    const repo = fixture(fixtureContext(), "ticket/absent-01");
    const headSha = repo.commit();

    const decision = await decide(repo, "ticket/absent-01", headSha);

    expect(decision.exitCode).toBe(1);
    expect(decision.output).toContain("::error::G8: .scratch/absent/spec.md does not exist on");
    expect(decision.output).toContain("::error::G8: expected exactly one .scratch/absent/issues/01-*.md on");
    expect(decision.output).toContain("pr-policy: fail (2)");
  }, 120_000);

  test("a spec pull request that changes only its own planning surface passes", async () => {
    const repo = fixture(fixtureContext(), "spec/demo");
    repo.write(".scratch/demo/spec.md", "# Approved spec\n\nThe reviewed planning surface.\n");
    const headSha = repo.commit();

    const decision = await decide(repo, "spec/demo", headSha);

    expect(decision.exitCode).toBe(0);
    expect(decision.output).toContain("changed files: 1");
    expect(decision.output).toContain("pr-policy: pass");
  }, 120_000);
});
