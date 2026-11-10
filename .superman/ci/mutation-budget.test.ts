// The declared measurement's budget; a policy input, stated as a rule.
//
// The measurement's per-mutant budget must cover the contended cost of the
// suite a mutant runs, not the solo cost of its dry run. The budget is a
// policy input — it is hashed into qualityInputsHash — so it is declared
// rather than inherited from a tool's defaults, and the declaration is a rule
// over the declared concurrency: the factor covers half the workers, and the
// floor covers the per-file start-up the sequenced run pays.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");

/** The declared mutation policy: the workers, the critical cases, the lanes. */
const mutation = (
  JSON.parse(readFileSync(join(root, ".superman/ci/bootstrap.json"), "utf8")) as {
    quality: { mutation: { concurrency: number; critical: unknown[] } };
  }
).quality.mutation;

/** The measured measurement's own configuration. */
const stryker = JSON.parse(readFileSync(join(root, "stryker.config.json"), "utf8")) as {
  timeoutFactor?: number;
  timeoutMS?: number;
};

test("the measurement declares its timeout budget instead of inheriting one", () => {
  // An inherited default is not a declaration: it is the tool's number, and
  // nobody reviewed it as this repository's policy.
  assert.equal(typeof stryker.timeoutFactor, "number", "the timeout factor is not declared");
  assert.equal(typeof stryker.timeoutMS, "number", "the timeout floor is not declared");
});

test("the declared factor covers the contention of the declared workers", () => {
  // The factor multiplies the dry run's own solo figure, so it has to cover
  // the contention ratio of the workers, not their number: four workers on the
  // measured machine stretch a suite by about 1.9x, and half the workers is
  // the declared rule that covers it. Raise the workers and the declaration
  // has to follow.
  assert.ok(
    (stryker.timeoutFactor ?? 0) >= mutation.concurrency / 2,
    `the declared factor ${stryker.timeoutFactor} does not cover half of the ${mutation.concurrency} declared workers`,
  );
});

test("the declared floor covers the start-up the sequenced run pays", () => {
  // The measurement runs the suite file by file, so it pays a process start-up
  // per declared critical case. The floor is the part of the budget that
  // covers it.
  const startUp = 1_000 * mutation.critical.length;
  assert.ok(
    (stryker.timeoutMS ?? 0) >= startUp,
    `the declared floor ${stryker.timeoutMS} does not cover the ${startUp} ms of start-up the ${mutation.critical.length} declared critical cases pay`,
  );
});
