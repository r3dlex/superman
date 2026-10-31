/// <reference path="../rules.d.ts" />

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/u;
const PINNED = ["tsrs", "typescript"] as const;
const FAST_FLAG = /--fast\b(?![\s"',=]*false)/u;
const FAST_ENV = /\bTSRS_FAST\b/u;
const GATE_FILES = /^(superman\.config\.json|\.github\/workflows\/[^/]+\.ya?ml)$/u;

export default {
  rules: {
    "exact-pin": {
      description: "tsrs and typescript devDependencies are exact versions",
      async check(ctx) {
        if (!ctx.scopedFiles.includes("package.json")) return;
        const pkg = (await ctx.readJSON("package.json")) as { devDependencies?: Record<string, string> };
        for (const name of PINNED) {
          const version = pkg.devDependencies?.[name];
          if (version === undefined || EXACT.test(version)) continue;
          ctx.report.violation({
            message: `devDependencies.${name} is "${version}", not an exact version`,
            file: "package.json",
            fix: `Pin ${name} to an exact version and upgrade it only in a PR that passes full CI`,
          });
        }
      },
    },
    "no-fast-in-gates": {
      description: "Workflows and gate config never use tsrs --fast or TSRS_FAST",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (!GATE_FILES.test(file)) continue;
          for (const re of [FAST_FLAG, FAST_ENV]) {
            for (const m of await ctx.grep(file, re)) {
              ctx.report.violation({
                message: "tsrs fast mode is not allowed in CI or gates",
                file: m.file,
                line: m.line,
                fix: "Run `tsrs --noEmit` in default mode; use --fast only in a local editor or watch loop",
              });
            }
          }
        }
      },
    },
    "typecheck-uses-tsrs": {
      description: "gates.typecheck in superman.config.json runs tsrs --noEmit",
      async check(ctx) {
        if (!ctx.scopedFiles.includes("superman.config.json")) return;
        const config = (await ctx.readJSON("superman.config.json")) as { gates?: { typecheck?: unknown } };
        const argv = config.gates?.typecheck;
        if (Array.isArray(argv) && argv.includes("tsrs") && argv.includes("--noEmit")) return;
        ctx.report.violation({
          message: "gates.typecheck must run the pinned tsrs with --noEmit",
          file: "superman.config.json",
          fix: 'Use ["pnpm", "exec", "tsrs", "--noEmit"], or revert to tsc through a spec PR (ADR 0008)',
        });
      },
    },
  },
} satisfies RuleSet;
