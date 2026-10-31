/// <reference path="../rules.d.ts" />

export default {
  rules: {
    "no-trivy-ignore": {
      description: "No .trivyignore or trivy.yaml file exists",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          ctx.report.violation({
            message: "Trivy ignore and config files are waivers and are not allowed",
            file,
            fix: "Delete it; fix the finding, or change G11 in a spec PR",
          });
        }
      },
    },
  },
} satisfies RuleSet;
