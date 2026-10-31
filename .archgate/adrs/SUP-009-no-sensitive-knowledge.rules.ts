/// <reference path="../rules.d.ts" />

// Deliberately bounded text detection, not a general confidentiality classifier.
// Start URL-userinfo detection at ://, not at every possible scheme character.
const CREDENTIAL =
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b|:\/\/[^:\s/@]+:[^\s/@]+@/iu;
const CREDENTIAL_FIELD =
  /(?:^|[\s{,])["']?(?:password|api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key)["']?\s*[:=]\s*\S+/iu;
// Bound email components so punctuation-heavy non-addresses cannot rescan suffixes quadratically.
const PERSONAL =
  /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,63}\b|\b\d{3}-\d{2}-\d{4}\b|(?:^|[\s{,])["']?(?:e-?mail|phone|telephone|ssn|date_of_birth|dob|home_address)["']?\s*[:=]\s*\S+/iu;

export default {
  rules: {
    "no-sensitive-knowledge": {
      description: "No recognizable secrets or personal data in wiki/vault content",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          const lines = (await ctx.readFile(file)).split(/\r?\n/u);
          for (let i = 0; i < lines.length; i++) {
            const category =
              CREDENTIAL.test(lines[i]) || CREDENTIAL_FIELD.test(lines[i])
                ? "Credential material"
                : PERSONAL.test(lines[i])
                  ? "Personal data"
                  : null;
            if (category === null) continue;
            ctx.report.violation({
              message: `${category} is forbidden in wiki/vault`,
              file,
              line: i + 1,
              fix: "Stop and report suspected exposure; revoke live credentials and review the source/history before continuing",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
