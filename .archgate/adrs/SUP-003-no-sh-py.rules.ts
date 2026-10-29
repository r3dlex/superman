/// <reference path="../rules.d.ts" />

const NODE_SHEBANG = "#!/usr/bin/env node";

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
  },
} satisfies RuleSet;
