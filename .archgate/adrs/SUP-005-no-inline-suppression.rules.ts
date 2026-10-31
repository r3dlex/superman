/// <reference path="../rules.d.ts" />

// Exact v0.61.0 suppression grammar: independent of source-language literals.
const ARCHGATE = /^[ \t]*(?:\/\/|#)\s*archgate-ignore(-file)?\s+([\w-]+)\/([\w-]+)(?:\s+(.+))?$/u;
const ARCHGATE_HTML = /^[ \t]*<!--\s*archgate-ignore(-file)?\s+([\w-]+)\/([\w-]+)(?:\s+(.+?))?\s*-->[ \t]*$/u;
const CATEGORY = "(?:lint|assist|syntax|parse|format)(?:/[A-Za-z0-9_-]+)*(?:\\([^()\\r\\n]*\\))?";
const BIOME = new RegExp(
  `^biome[-_]ignore(?:-all|-start|-end)?[ \\t]*${CATEGORY}(?:[ \\t]+${CATEGORY})*[ \\t]*:[ \\t]*\\S`,
  "iu",
);
const TRIVY = /(?:^|\s)trivy:ignore:[^\s:]+/u;

function forbidden(ctx: RuleContext, file: string, line: number | number[]) {
  // Omit `file`: Archgate applies file suppressions after this rule.
  const location = Array.isArray(line) ? `one of ${line.map((n) => `${file}:${n}`).join(", ")}` : `${file}:${line}`;
  ctx.report.violation({
    message: `Inline suppression is forbidden at ${location}`,
    fix: "Remove the directive; fix the finding or propose a Gate 1 policy change",
  });
}

function checkYaml(ctx: RuleContext, file: string, text: string) {
  const lines = text.split(/\r?\n/u);
  let scalarIndent: number | undefined;
  let quote = "";
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const indent = line.length - line.trimStart().length;
    if (scalarIndent !== undefined) {
      if (line.trim() === "" || indent > scalarIndent) continue;
      scalarIndent = undefined;
    }
    let scalarStart = true;
    let code = "";
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote !== "") {
        if (quote === '"' && c === "\\") i++;
        else if (c === quote) {
          if (quote === "'" && line[i + 1] === "'") i++;
          else quote = "";
        }
        code += " ";
      } else if (c === "&" && scalarStart) {
        const anchor = /^&[^\s,[\]{}]+/u.exec(line.slice(i));
        if (!anchor) throw new Error("Cannot inspect YAML anchor; inspection is incomplete");
        code += " ".repeat(anchor[0].length);
        i += anchor[0].length - 1;
        // An anchor is a node property, not the beginning of its scalar value.
      } else if ((c === '"' || c === "'") && scalarStart) {
        quote = c;
        scalarStart = false;
        code += " ";
      } else if (c === "#" && (i === 0 || /\s/u.test(line[i - 1]))) {
        const comment = line.slice(i + 1);
        if (TRIVY.test(comment)) forbidden(ctx, file, n + 1);
        break;
      } else {
        code += c;
        if (
          /[[\]{},]/u.test(c) ||
          (c === ":" && /\s|$/u.test(line.slice(i + 1, i + 2))) ||
          (c === "-" && scalarStart && /\s/u.test(line[i + 1] ?? ""))
        )
          scalarStart = true;
        else if (!/\s/u.test(c)) scalarStart = false;
      }
    }
    if (quote === "" && /(?:^|:\s*|-\s+)[|>](?:[1-9][+-]?|[+-][1-9]?)?\s*$/u.test(code)) scalarIndent = indent;
  }
}

function checkArchgate(ctx: RuleContext, file: string, text: string) {
  const markdown = file.endsWith(".md") || file.endsWith(".mdx");
  let fenced = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (markdown && /^[ \t]*(?:`{3,}|~{3,})/u.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const directive = ARCHGATE.exec(lines[i]) ?? (markdown ? ARCHGATE_HTML.exec(lines[i]) : null);
    // The engine requires a non-whitespace reason before a directive can act.
    if (directive?.[4]?.trim()) forbidden(ctx, file, i + 1);
  }
}

interface SourceComment extends CommentToken {
  offset: number;
  possibleLines?: number[];
}

// The sandbox disallows tokenizer imports. Validate JS/TS through ctx.ast, then
// preserve original literal/template/regex boundaries here; no text-only grep.
function sourceComments(
  text: string,
  javascript = false,
  regexes: string[] = [],
  hcl = false,
  jsx = false,
): SourceComment[] {
  const comments: SourceComment[] = [];
  const candidates = new Map<string, { offset: number; line: number; column: number }[]>();
  const expected = new Map<string, number>();
  for (const regex of regexes) expected.set(regex, (expected.get(regex) ?? 0) + 1);
  let i = 0;
  let line = 1;
  let column = 0;
  const advance = () => {
    const c = text[i++];
    if (c === "\r" || c === "\u2028" || c === "\u2029") {
      line++;
      column = 0;
    } else if (c === "\n") {
      if (text[i - 2] !== "\r") line++;
      column = 0;
    } else column++;
  };
  const jsxName = () => {
    const from = i;
    while (i < text.length && /[\p{ID_Continue}.$:-]/u.test(text[i])) advance();
    if (i === from) throw new Error("Cannot inspect JSX name; inspection is incomplete");
    return text.slice(from, i);
  };
  const whitespace = () => {
    while (i < text.length && /\s/u.test(text[i])) advance();
  };
  const jsxElement = (): void => {
    advance(); // <
    const name = text[i] === ">" ? "" : jsxName();
    if (/^(?:const|in|out)$/u.test(name))
      throw new Error("Ambiguous JSX/type-parameter syntax; inspection is incomplete");
    while (i < text.length) {
      whitespace();
      if (text[i] === ">") {
        advance();
        break;
      }
      if (text[i] === "/" && text[i + 1] === ">") {
        advance();
        advance();
        return;
      }
      if (text[i] === "{") {
        advance();
        scan(true);
        continue;
      }
      const attribute = jsxName();
      if (attribute === "extends") throw new Error("Ambiguous JSX/type-parameter syntax; inspection is incomplete");
      whitespace();
      if (text[i] !== "=") continue;
      advance();
      whitespace();
      const quote = text[i];
      if (quote === '"' || quote === "'") {
        advance();
        while (i < text.length && text[i] !== quote) advance();
        if (i === text.length) throw new Error("Unclosed JSX attribute; inspection is incomplete");
        advance();
      } else if (quote === "{") {
        advance();
        scan(true);
      } else if (quote === "<") jsxElement();
      else throw new Error("Cannot inspect JSX attribute value; inspection is incomplete");
    }
    if (name && /^\s*\(/u.test(text.slice(i)))
      throw new Error("Ambiguous JSX/type-parameter syntax; inspection is incomplete");
    while (i < text.length) {
      if (text.startsWith("</", i)) {
        advance();
        advance();
        const closing = text[i] === ">" ? "" : jsxName();
        whitespace();
        if (closing !== name || text[i] !== ">")
          throw new Error("Cannot reconcile JSX closing tag; inspection is incomplete");
        advance();
        return;
      }
      if (text[i] === "<") jsxElement();
      else if (text[i] === "{") {
        advance();
        scan(true);
      } else advance(); // JSX text is not JS string/comment syntax.
    }
    throw new Error("Unclosed or ambiguous JSX element; inspection is incomplete");
  };
  const scan = (expression = false): void => {
    let braces = 0;
    while (i < text.length) {
      const c = text[i];
      const regex = javascript && c === "/" ? regexes.find((raw) => text.startsWith(raw, i)) : undefined;
      const heredoc = hcl && c === "<" ? /^<<(-?)([A-Za-z_]\w*)[ \t]*\r?\n/u.exec(text.slice(i)) : null;
      if (jsx && c === "<" && /[\p{ID_Start}_$>]/u.test(text[i + 1] ?? "")) {
        const prefix = text.slice(0, i).trimEnd();
        if (
          prefix !== "" &&
          !/[=([{,:;?!|&+*%~^>-]$/u.test(prefix) &&
          !/\b(?:return|yield|await|case|throw|else|do)$/u.test(prefix)
        ) {
          throw new Error("Ambiguous JSX/angle expression; inspection is incomplete");
        }
        jsxElement();
      } else if (heredoc) {
        for (let n = 0; n < heredoc[0].length; n++) advance();
        while (i < text.length) {
          const start = i;
          while (i < text.length && text[i] !== "\n") advance();
          const lineText = text.slice(start, i).replace(/\r$/u, "");
          if (i < text.length) advance();
          if ((heredoc[1] ? lineText.trim() : lineText) === heredoc[2]) break;
        }
      } else if (c === '"' || (javascript && c === "'")) {
        advance();
        while (i < text.length && text[i] !== c) {
          if (text[i] === "\\") advance();
          advance();
        }
        if (i < text.length) advance();
      } else if (javascript && c === "`") {
        advance();
        while (i < text.length && text[i] !== "`") {
          if (text[i] === "\\") {
            advance();
            advance();
          } else if (text[i] === "$" && text[i + 1] === "{") {
            advance();
            advance();
            scan(true);
          } else advance();
        }
        if (i < text.length) advance();
      } else if ((hcl && c === "#") || (c === "/" && (text[i + 1] === "/" || text[i + 1] === "*"))) {
        const type = c === "#" || text[i + 1] === "/" ? "line" : "block";
        const start = { line, column };
        const offset = i;
        advance();
        if (c !== "#") advance();
        const from = i;
        while (
          i < text.length &&
          (type === "line" ? !/[\r\n\u2028\u2029]/u.test(text[i]) : !(text[i] === "*" && text[i + 1] === "/"))
        )
          advance();
        const value = text.slice(from, i);
        if (type === "block" && i < text.length) {
          advance();
          advance();
        }
        comments.push({ type, value, offset, loc: { start, end: { line, column } } });
      } else if (regex !== undefined) {
        const places = candidates.get(regex) ?? [];
        places.push({ offset: i, line, column });
        candidates.set(regex, places);
        for (let n = 0; n < regex.length; n++) advance();
      } else {
        advance();
        if (c === "{") braces++;
        else if (c === "}") {
          if (expression && braces === 0) return;
          if (braces > 0) braces--;
        }
      }
    }
  };
  scan();
  for (const [raw, count] of expected) {
    const places = candidates.get(raw) ?? [];
    if (places.length < count)
      throw new Error("Cannot reconcile AST regex literals with source; inspection is incomplete");
    if (places.length === count) continue;
    // Extra identical spellings are division expressions, not AST regexes.
    // Inspect them as code instead of guessing from preceding JS/TS tokens.
    const first = places[0];
    for (const comment of sourceComments(raw, true)) {
      comments.push({
        ...comment,
        offset: first.offset + comment.offset,
        possibleLines: places.map((place) => place.line + comment.loc.start.line - 1),
        loc: {
          start: { line: first.line + comment.loc.start.line - 1, column: first.column + comment.loc.start.column },
          end: { line: first.line + comment.loc.end.line - 1, column: first.column + comment.loc.end.column },
        },
      });
    }
  }
  return comments;
}

function checkComments(ctx: RuleContext, file: string, comments: SourceComment[], trivy = false) {
  for (const comment of comments) {
    const offset = comment.value
      .split(/\r\n?|[\n\u2028\u2029]/u)
      .findIndex((line) => (trivy ? TRIVY : BIOME).test(line.trimStart().replace(/^\*+/u, "").trimStart()));
    if (offset >= 0)
      forbidden(ctx, file, comment.possibleLines?.map((line) => line + offset) ?? comment.loc.start.line + offset);
  }
}

export default {
  rules: {
    "no-inline-suppression": {
      description: "No effective inline gate suppressions; inert strings and examples remain permitted",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          const text = await ctx.readFile(file);
          checkArchgate(ctx, file, text);
          if (/\.mdx?$/u.test(file)) continue;
          if (/\.ya?ml$/u.test(file)) {
            checkYaml(ctx, file, text);
            continue;
          }
          if (/\.jsonc?$/u.test(file)) {
            checkComments(ctx, file, sourceComments(text));
            continue;
          }
          if (/\.(?:tf|tfvars|hcl)$/u.test(file)) {
            checkComments(ctx, file, sourceComments(text, false, [], true), true);
            continue;
          }
          if (/(?:^|\/)(?:Dockerfile(?:\.[^/]*)?|[^/]+\.dockerfile)$/iu.test(file)) {
            const lines = text.split(/\r?\n/u);
            for (let i = 0; i < lines.length; i++) {
              const comment = /^\s*#(.*)$/u.exec(lines[i]);
              if (comment && TRIVY.test(comment[1])) forbidden(ctx, file, i + 1);
            }
            continue;
          }
          if (!/\.[cm]?[jt]sx?$/u.test(file)) continue;
          const language = /\.[cm]?tsx?$/u.test(file) ? "typescript" : "javascript";
          // Validate with the engine parser; its comment collector skips `${…}`.
          const tree = await ctx.ast(file, language);
          const regexes = ctx
            .findAstNodes(tree, "Literal")
            .flatMap((node) => {
              const regex = node.regex as { pattern?: unknown; flags?: unknown } | undefined;
              return typeof regex?.pattern === "string" && typeof regex.flags === "string"
                ? [`/${regex.pattern}/${regex.flags}`]
                : [];
            })
            .sort((a, b) => b.length - a.length);
          checkComments(ctx, file, sourceComments(text, true, regexes, false, /\.[jt]sx$/u.test(file)));
        }
      },
    },
  },
} satisfies RuleSet;
