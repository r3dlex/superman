/// <reference path="../rules.d.ts" />

const NODE_SHEBANG = "#!/usr/bin/env node";
// ADR 0003 and ADR 0016: the tracked runtime glue is TypeScript on Node or
// Deno. A shell or Python entry point is not a supported runtime. The shebang
// is read as an interpreter line, so `#!/bin/sh -c deno run x` is a shell
// helper and not a Deno entry point.
const RUNTIME_INTERPRETERS = new Set(["node", "deno"]);
// The Deno runtime graph as it exists today: the operational Deno root and the
// Deno candidate surface. The product `src/` tree stays Node until ticket 01
// and row 11 port it.
const DENO_SOURCE = /^(?:\.superman\/deno-bootstrap\/|\.scratch\/superman-v0\/)/u;

// The interpreter is the first token after `#!`, or the first token after
// `/usr/bin/env` and its options.
function shebangInterpreter(line: string): string | undefined {
  if (!line.startsWith("#!")) return undefined;
  const parts = line.slice(2).trim().split(/\s+/u);
  let index = 0;
  if (parts[index]?.endsWith("/env")) index += 1;
  while (parts[index]?.startsWith("-")) index += 1;
  const token = parts[index];
  if (!token) return undefined;
  return token.split("/").pop() ?? token;
}

export default {
  rules: {
    "no-sh-py-files": {
      description: "No *.sh or *.py file is tracked",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (!file.endsWith(".sh") && !file.endsWith(".py")) continue;
          ctx.report.violation({
            message: "Shell and Python files are not allowed",
            file,
            fix: "Rewrite it in TypeScript run by Node, or as a superman subcommand",
          });
        }
      },
    },
    "node-hooks": {
      description: "Every .superman/hooks file starts with the Node shebang",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (!file.startsWith(".superman/hooks/")) continue;
          const first = (await ctx.readFile(file)).split(/\r?\n/u)[0];
          if (first !== NODE_SHEBANG) {
            ctx.report.violation({
              message: `Hook must start with ${NODE_SHEBANG}`,
              file,
              line: 1,
              fix: "Regenerate the hook with `superman init`",
            });
          }
        }
      },
    },
    "deno-runtime-shebang": {
      description: "Every shebang in the Deno runtime graph runs on node or deno",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (!DENO_SOURCE.test(file)) continue;
          const first = (await ctx.readFile(file)).split(/\r?\n/u)[0];
          const interpreter = shebangInterpreter(first);
          if (interpreter === undefined || RUNTIME_INTERPRETERS.has(interpreter)) continue;
          ctx.report.violation({
            message: "Deno runtime shebang must run on node or deno",
            file,
            line: 1,
            fix: "Use a Node or Deno shebang; the repository tracks no shell or Python helper (ADR 0003)",
          });
        }
      },
    },
  },
} satisfies RuleSet;
