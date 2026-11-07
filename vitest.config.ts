import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts", ".superman/ci/critical/**/*.test.ts"],
    passWithNoTests: false,
    coverage: { provider: "v8" },
  },
});
