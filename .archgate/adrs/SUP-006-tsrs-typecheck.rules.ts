/// <reference path="../rules.d.ts" />

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/u;
const PINNED = ["tsrs", "typescript"] as const;
const FAST_FLAG = /--fast\b(?![\s"',=]*false)/u;
const FAST_ENV = /\bTSRS_FAST\b/u;
const GATE_FILES = /^(superman\.config\.json|\.github\/workflows\/[^/]+\.ya?ml)$/u;

// The Deno runtime graph as it exists today: the operational Deno root and the
// Deno candidate surface, plus the Deno configuration, import-map and lock
// inputs. The product `src/` tree stays Node until ticket 01 and row 11 port
// it, so it is not part of the Deno graph yet. Archgate 0.61.0's rule-file
// security scan blocks imports between rule files, so this vocabulary is
// repeated verbatim in SUP-001, SUP-002 and SUP-006 and must stay identical.
const SOURCE = /\.[cm]?[jt]sx?$/u;
const DENO_SOURCE = /^(?:\.superman\/deno-bootstrap\/|\.scratch\/superman-v0\/)/u;
const DENO_CONFIG = /(?:^|\/)(?:deno\.jsonc?|import_map\.json)$/u;
const DENO_LOCK = /(?:^|\/)deno\.lock$/u;

// ADR 0008 and ADR 0016: the Deno path keeps the same checker policy — an exact
// tsrs pin, default mode — and its type inputs stay local to the graph.
const TSRS_PIN = /\btsrs@([^\s"'`,)\]}]+)/u;
const TSRS_PINS = new RegExp(TSRS_PIN.source, "gu");
const REMOTE_TYPE = /"(?:types|typeRoots|lib)"\s*:\s*(?:\[\s*)?["'](?:npm|jsr|https?):/u;
// The Deno lock records the resolved dependency graph. The only third-party
// package the Deno graph may resolve is the exact-pinned tsrs dev tool.
const LOCK_PACKAGE = /"(?:npm|jsr|https?):[^"]*"/gu;
const PINNED_TOOL = /^npm:tsrs@/u;

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
    "deno-check-policy": {
      description: "The Deno path keeps the exact tsrs pin, default mode and local type inputs",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          const source = SOURCE.test(file) && DENO_SOURCE.test(file);
          const config = DENO_CONFIG.test(file);
          const lock = DENO_LOCK.test(file);
          if (!source && !config && !lock) continue;
          // ADR 0008 forbids the fast preset in the gate configuration and
          // allows it in a local editor or watch loop, so the ban stops at the
          // Deno configuration inputs.
          if (config) {
            for (const re of [FAST_FLAG, FAST_ENV]) {
              for (const m of await ctx.grep(file, re)) {
                ctx.report.violation({
                  message: "tsrs fast mode is not allowed in the Deno gate configuration",
                  file: m.file,
                  line: m.line,
                  fix: "Run the checker in default mode; use --fast only in a local editor or watch loop",
                });
              }
            }
          }
          for (const m of await ctx.grep(file, TSRS_PIN)) {
            for (const match of m.content.matchAll(TSRS_PINS)) {
              const version = match[1] ?? "";
              if (EXACT.test(version)) continue;
              ctx.report.violation({
                message: `The tsrs pin "${version}" on the Deno path is not an exact version`,
                file: m.file,
                line: m.line,
                fix: "Pin tsrs to an exact version; a range changes gate results without a reviewed PR",
              });
            }
          }
          // The lock is the resolved graph: a third-party package in it is a
          // runtime dependency the import map does not show.
          if (lock) {
            const text = await ctx.readFile(file);
            const packages = new Map<string, number>();
            text.split(/\r?\n/u).forEach((line, index) => {
              for (const match of line.matchAll(LOCK_PACKAGE)) {
                const specifier = match[0].slice(1, -1);
                if (PINNED_TOOL.test(specifier)) continue;
                if (!packages.has(specifier)) packages.set(specifier, index + 1);
              }
            });
            for (const [specifier, line] of packages) {
              ctx.report.violation({
                message: `The Deno lock records the third-party package "${specifier}"`,
                file,
                line,
                fix: "Remove the dependency; ADR 0016 allows no npm, JSR or HTTP runtime dependency",
              });
            }
          }
          if (config) {
            for (const m of await ctx.grep(file, REMOTE_TYPE)) {
              ctx.report.violation({
                message: "A Deno type input would be resolved outside the checked graph",
                file: m.file,
                line: m.line,
                fix: "Keep the type inputs local; ADR 0016 allows no npm, JSR or HTTP type dependency",
              });
            }
          }
        }
      },
    },
  },
} satisfies RuleSet;
