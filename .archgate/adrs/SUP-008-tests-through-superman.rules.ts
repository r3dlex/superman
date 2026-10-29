/// <reference path="../rules.d.ts" />

const WORKFLOWS = [".github/workflows/*.yml", ".github/workflows/*.yaml"];
const SUPERMAN_GATE = /\bsuperman\s+gate\b/u;
const NIGHTLY_GATE = /\bsuperman\s+gate\s+nightly\b/u;
const AFFECTED = /--affected\b/u;
const SCHEDULE = /^\s*schedule\s*:/u;
const IF_FALSE = /^\s*(-\s+)?if\s*:\s*(false|\$\{\{\s*false\s*\}\})\s*$/u;
const DIRECT = [
  /\b(vitest|jest|stryker|jscpd|knip|pytest)\b/u,
  /\bbiome\s+(check|ci|lint|format)\b/u,
  /\barchgate\s+check\b/u,
  /\bmix\s+(test|muex)\b/u,
  /\bcargo\s+(test|nextest)\b/u,
  /\bdotnet\s+test\b/u,
  /\b(cabal|stack|go)\s+test\b/u,
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/u,
  /\bnx\s+(affected|run-many)\b/u,
  /\bmoon\s+(run|ci)\b/u,
  /\bturbo\s+run\b/u,
];

interface Line {
  file: string;
  line: number;
  code: string;
}

async function workflowLines(ctx: RuleContext): Promise<Line[]> {
  const files = new Set<string>();
  for (const pattern of WORKFLOWS) for (const f of await ctx.glob(pattern)) files.add(f);
  const lines: Line[] = [];
  for (const file of [...files].sort()) {
    const text = await ctx.readFile(file);
    text.split(/\r?\n/u).forEach((raw, i) => {
      const code = raw.replace(/(^|\s)#.*$/u, "");
      if (code.trim() !== "") lines.push({ file, line: i + 1, code });
    });
  }
  return lines;
}

export default {
  rules: {
    "tests-only-through-superman": {
      description: "Once CI runs `superman gate`, workflows call no test runner or change-scoped gate tool directly",
      async check(ctx) {
        const lines = await workflowLines(ctx);
        if (!lines.some((l) => SUPERMAN_GATE.test(l.code))) return;
        for (const l of lines) {
          if (SUPERMAN_GATE.test(l.code) || !DIRECT.some((re) => re.test(l.code))) continue;
          ctx.report.violation({
            message: "Tests and change-scoped gates run only through `superman gate` (SUP-008)",
            file: l.file,
            line: l.line,
            fix: "Put the command in superman.config.json gate argv and call `superman gate ci`/`nightly`",
          });
        }
      },
    },
    "nightly-full-run": {
      description: "Affected mode needs a scheduled, full `superman gate nightly` that is not disabled",
      async check(ctx) {
        const lines = await workflowLines(ctx);
        const nightly = lines.filter((l) => NIGHTLY_GATE.test(l.code));
        for (const l of nightly) {
          if (!AFFECTED.test(l.code)) continue;
          ctx.report.violation({
            message: "`superman gate nightly` must run the full suite, never --affected",
            file: l.file,
            line: l.line,
            fix: "Drop --affected from the nightly gate",
          });
        }
        const nightlyFiles = new Set(nightly.map((l) => l.file));
        for (const l of lines) {
          if (!nightlyFiles.has(l.file) || !IF_FALSE.test(l.code)) continue;
          ctx.report.violation({
            message: "A workflow that runs the nightly full gate may not disable jobs or steps with `if: false`",
            file: l.file,
            line: l.line,
            fix: "Remove the `if: false`; changing the nightly run needs a spec PR that amends ADR 0010",
          });
        }
        const affected = lines.find((l) => AFFECTED.test(l.code) && !NIGHTLY_GATE.test(l.code));
        if (affected === undefined) return;
        const scheduled = [...nightlyFiles].some((f) => lines.some((l) => l.file === f && SCHEDULE.test(l.code)));
        if (scheduled) return;
        ctx.report.violation({
          message: "`--affected` is used but no scheduled workflow runs `superman gate nightly`",
          file: affected.file,
          line: affected.line,
          fix: "Add a `schedule:` trigger with a job running `superman gate nightly` (ADR 0010)",
        });
      },
    },
  },
} satisfies RuleSet;
