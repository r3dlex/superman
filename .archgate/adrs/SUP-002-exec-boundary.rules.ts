/// <reference path="../rules.d.ts" />

// One exec-seam definition: the runtime's exec module, one per runtime. The
// product's seam is `src/exec.ts` (ADR 0016); the operational Deno root's seam
// is `.superman/deno-bootstrap/exec.ts`.
const EXEC_SEAMS = ["src/exec.ts", ".superman/deno-bootstrap/exec.ts"];
// The Node-side rules keep exactly the scope they had at HEAD: the `src/`
// sources. The ADR's declared scope is wider, so the filter has to be the
// source files under `src/`, not merely the paths that begin with `src/`.
const NODE_SOURCE = /^(?:src\/).*\.[cm]?[jt]sx?$/u;
const CHILD_PROCESS =
  /(from\s+["'](node:)?child_process["'])|(require\(\s*["'](node:)?child_process["']\s*\))|(import\(\s*["'](node:)?child_process["']\s*\))/u;
const SHELL_TRUE = /\bshell\s*:\s*true\b/u;

// The Deno runtime graph as it exists today: the operational Deno root and the
// Deno candidate surface, plus the Deno configuration inputs. The product
// `src/` tree stays Node until ticket 01 and row 11 port it, so it is not part
// of the Deno graph yet. Archgate 0.61.0's rule-file security scan blocks
// imports between rule files, so this vocabulary is repeated verbatim in
// SUP-001, SUP-002, SUP-003 and SUP-006 and must stay identical.
const SOURCE = /\.[cm]?[jt]sx?$/u;
const DENO_SOURCE = /^(?:\.superman\/deno-bootstrap\/|\.scratch\/superman-v0\/)/u;
const DENO_CONFIG = /(?:^|\/)(?:deno\.jsonc?|import_map\.json)$/u;
const DENO_ROOT = /^\.superman\/deno-bootstrap\//u;

// ADR 0016: `Deno.Command` is the sole Deno spawn API and it belongs to the
// runtime's exec seam. No shell, no `node:child_process` bypass and no blanket
// permission grant.
const DENO_SPAWN = /\bDeno\.(Command|run|spawn)\b/u;
// A shell interpreter as the spawned executable, which covers the `sh -c`,
// `bash -c` and `cmd /c` command-string forms.
const SHELL_EXECUTABLE =
  /\bDeno\.(?:Command|run|spawn)\([^)]*["'](?:[^"']*\/)?(?:sh|bash|zsh|dash|ksh|cmd)(?:\.exe)?["']/u;
const BLANKET_PERMISSION = /(?:--allow-all\b|(?<![\w-])-A(?![\w-]))/u;
// A literal that holds only the flag names it; it does not grant it.
const FLAG_DECLARATION = /\[\s*["'](?:--allow-all|-A)["']\s*\]|[:=]\s*["'](?:--allow-all|-A)["']\s*[,;}]/u;

function isExecSeam(file: string): boolean {
  return EXEC_SEAMS.includes(file);
}

export default {
  rules: {
    "child-process-only-in-exec": {
      description: "Only src/exec.ts may import node:child_process",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (!NODE_SOURCE.test(file)) continue;
          if (isExecSeam(file)) continue;
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
          if (!NODE_SOURCE.test(file)) continue;
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
    "deno-exec-boundary": {
      description: "Deno spawns go through the exec seam, without a shell or a blanket permission grant",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          const source = SOURCE.test(file) && DENO_SOURCE.test(file);
          if (source) {
            if (!isExecSeam(file)) {
              for (const m of await ctx.grep(file, DENO_SPAWN)) {
                const api = DENO_SPAWN.exec(m.content)?.[1] ?? "Command";
                ctx.report.violation({
                  message: `Deno.${api} outside the exec seam`,
                  file: m.file,
                  line: m.line,
                  fix: "Call the spawn helper exported by the runtime's exec.ts instead",
                });
              }
            }
            for (const m of await ctx.grep(file, SHELL_TRUE)) {
              ctx.report.violation({
                message: "shell: true is not allowed",
                file: m.file,
                line: m.line,
                fix: "Pass an argv array to Deno.Command; never spawn a shell interpreter",
              });
            }
            for (const m of await ctx.grep(file, SHELL_EXECUTABLE)) {
              ctx.report.violation({
                message: "Deno shell-equivalent spawn is not allowed",
                file: m.file,
                line: m.line,
                fix: "Pass an argv array to Deno.Command; never spawn a shell interpreter",
              });
            }
          }
          if (DENO_ROOT.test(file)) {
            for (const m of await ctx.grep(file, CHILD_PROCESS)) {
              ctx.report.violation({
                message: "node:child_process is not a Deno spawn API",
                file: m.file,
                line: m.line,
                fix: "Use Deno.Command through the runtime's exec.ts instead",
              });
            }
          }
          // The permission and launch profile is an effective runtime input: a
          // blanket grant would widen every reviewed boundary at once.
          if (!DENO_ROOT.test(file) && !DENO_CONFIG.test(file)) continue;
          // The Deno configuration inputs are JSON by definition; in the
          // operational root only source and JSON files carry a permission.
          if (!DENO_CONFIG.test(file) && !source && !/\.jsonc?$/u.test(file)) continue;
          for (const m of await ctx.grep(file, BLANKET_PERMISSION)) {
            if (FLAG_DECLARATION.test(m.content)) continue;
            ctx.report.violation({
              message: "Deno blanket permission grant is not allowed",
              file: m.file,
              line: m.line,
              fix: "Use the reviewed explicit permission profile; ADR 0016 forbids -A and --allow-all",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
