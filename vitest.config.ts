import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts", ".superman/ci/critical/**/*.test.ts"],
    passWithNoTests: false,
    testTimeout: 60_000,
    coverage: { provider: "v8" },
  },
});
