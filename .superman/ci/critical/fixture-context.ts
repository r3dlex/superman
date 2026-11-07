// The shared raw fixture cleans up through node:test's context; Vitest's equivalent is a per-test finalizer.
import type { TestContext } from "node:test";
import { onTestFinished } from "vitest";

export function fixtureContext(): TestContext {
  return { after: (finalizer: () => void) => void onTestFinished(finalizer) } as unknown as TestContext;
}
