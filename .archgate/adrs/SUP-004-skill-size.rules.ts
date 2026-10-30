/// <reference path="../rules.d.ts" />

const BUDGETS: Record<string, number> = { ship: 150, "adr-rule": 80, "plan-critic": 60, "wiki-ingest": 100, "wiki-lint": 80 };
const TOTAL_BUDGET = 470;

export default {
  rules: {
    "skill-budget": {
      description: "Only the five reviewed overlay names exist within individual budgets and 470 total lines, user-invoked only",
      async check(ctx) {
        let total = 0;
        for (const file of ctx.scopedFiles) {
          const name = file.split("/")[1] ?? "";
          const text = await ctx.readFile(file);
          const lines = text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
          total += lines;
          const budget = BUDGETS[name];
          if (budget === undefined) {
            ctx.report.violation({
              message: `Unknown overlay skill "${name}"; only ${Object.keys(BUDGETS).join(", ")} are allowed`,
              file,
              fix: "Remove it, or propose it in a spec PR with the observed failure",
            });
            continue;
          }
          if (lines > budget) {
            ctx.report.violation({
              message: `${name} has ${lines} lines; the budget is ${budget}`,
              file,
              fix: "Move detail into the CLI or a file the skill reads on demand",
            });
          }
          const { frontmatter } = await ctx.readYAML(file);
          if (frontmatter?.["disable-model-invocation"] !== true) {
            ctx.report.violation({
              message: "Overlay skills must set disable-model-invocation: true",
              file,
              line: 1,
              fix: "Add `disable-model-invocation: true` to the frontmatter",
            });
          }
        }
        if (total > TOTAL_BUDGET) {
          ctx.report.violation({ message: `Overlay skills total ${total} lines; the budget is ${TOTAL_BUDGET}` });
        }
      },
    },
  },
} satisfies RuleSet;
