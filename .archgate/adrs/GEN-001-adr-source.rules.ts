/// <reference path="../rules.d.ts" />

const SOURCE_LINE = /^Source: (docs\/adr\/\d{4}-[a-z0-9-]+\.md)$/u;

function firstBodyLine(text: string): string | undefined {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/u.exec(text);
  const body = match ? text.slice(match[0].length) : text;
  return body
    .split(/\r?\n/u)
    .find((line) => line.trim() !== "")
    ?.trim();
}

export default {
  rules: {
    "source-link": {
      description:
        "The first body line of an Archgate ADR is `Source: docs/adr/NNNN-slug.md` and points to an existing file",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          const line = firstBodyLine(await ctx.readFile(file));
          const match = line === undefined ? null : SOURCE_LINE.exec(line);
          if (!match) {
            ctx.report.violation({
              message: "First body line must be `Source: docs/adr/NNNN-slug.md`",
              file,
              fix: "Add the Source line right below the frontmatter",
            });
            continue;
          }
          const target = match[1];
          const found = await ctx.glob(target);
          if (found.length === 0) {
            ctx.report.violation({
              message: `Source points to a missing file: ${target}`,
              file,
              fix: "Create the docs/adr decision first, or fix the path",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
