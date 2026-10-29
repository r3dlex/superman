/// <reference path="../rules.d.ts" />

const EXEC_MODULE = "src/exec.ts";
const CHILD_PROCESS =
  /(from\s+["'](node:)?child_process["'])|(require\(\s*["'](node:)?child_process["']\s*\))|(import\(\s*["'](node:)?child_process["']\s*\))/u;
const SHELL_TRUE = /\bshell\s*:\s*true\b/u;

export default {
  rules: {
    "child-process-only-in-exec": {
      description: "Only src/exec.ts may import node:child_process",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (file === EXEC_MODULE) continue;
          for (const m of await ctx.grep(file, CHILD_PROCESS)) {
            ctx.report.violation({
              message: "child_process imported outside src/exec.ts",
              file: m.file,
              line: m.line,
              fix: "Call the spawn helper exported by src/exec.ts instead",
            });
          }
        }
      },
    },
    "no-shell-true": {
      description: "No process is spawned with shell: true",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          for (const m of await ctx.grep(file, SHELL_TRUE)) {
            ctx.report.violation({
              message: "shell: true is not allowed",
              file: m.file,
              line: m.line,
              fix: "Pass an argv array and spawn with shell: false",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
