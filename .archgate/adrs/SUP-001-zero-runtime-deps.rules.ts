/// <reference path="../rules.d.ts" />

const RUNTIME_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"] as const;

export default {
  rules: {
    "no-runtime-deps": {
      description: "package.json declares no runtime, optional or peer dependencies",
      async check(ctx) {
        if (!ctx.scopedFiles.includes("package.json")) return;
        const pkg = (await ctx.readJSON("package.json")) as Record<string, unknown>;
        for (const field of RUNTIME_FIELDS) {
          const value = pkg[field];
          if (value === undefined) continue;
          const names = typeof value === "object" && value !== null ? Object.keys(value) : ["<invalid>"];
          for (const name of names) {
            ctx.report.violation({
              message: `Runtime dependency "${name}" in ${field}`,
              file: "package.json",
              fix: "Use a node: built-in, or make it an exact-pinned devDependency of a tool superman spawns",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
