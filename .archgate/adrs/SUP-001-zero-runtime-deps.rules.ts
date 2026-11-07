/// <reference path="../rules.d.ts" />

const RUNTIME_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"] as const;

// ADR 0016: the Deno runtime uses stable Web/Deno APIs and verified `node:`
// compatibility built-ins only. npm/JSR/HTTP specifiers and import-map aliases
// to third-party libraries are runtime dependencies.
const THIRD_PARTY = /^(?:npm|jsr|https?):/u;
const THIRD_PARTY_SPECIFIER = /(?:\bfrom|\bimport|\bdeclare\s+module|\brequire)\s*\(?\s*["'](?:npm:|jsr:|https?:\/\/)/u;

// The Deno runtime graph as it exists today: the operational Deno root and the
// Deno candidate surface, plus the Deno configuration and import-map inputs.
// The product `src/` tree stays Node until ticket 01 and row 11 port it, so it
// is not part of the Deno graph yet. Archgate 0.61.0's rule-file security scan
// blocks imports between rule files, so this vocabulary is repeated verbatim
// in SUP-001, SUP-002, SUP-003 and SUP-006 and must stay identical.
const SOURCE = /\.[cm]?[jt]sx?$/u;
const DENO_SOURCE = /^(?:\.superman\/deno-bootstrap\/|\.scratch\/superman-v0\/)/u;
const DENO_CONFIG = /(?:^|\/)(?:deno\.jsonc?|import_map\.json)$/u;

// Deno's `deno.jsonc` is JSON with comments and optional trailing commas; a
// comment marker inside a string is not a comment.
function parseJsonc(text: string): unknown {
  let cleaned = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      cleaned += c;
      if (c === "\\") cleaned += text[++i] ?? "";
      else if (c === '"') quoted = false;
    } else if (c === '"') {
      quoted = true;
      cleaned += c;
    } else if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
      cleaned += "\n";
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) throw new Error("Unterminated Deno configuration comment");
      cleaned += " ";
      i = end + 1;
    } else {
      if (c === "}" || c === "]") cleaned = cleaned.replace(/,\s*$/u, "");
      cleaned += c;
    }
  }
  return JSON.parse(cleaned);
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

// The import map is the indirect route to a third-party runtime library: a bare
// specifier in the runtime resolves through `imports` or `scopes`.
function importMapAliases(config: Record<string, unknown>): [string, string][] {
  const aliases: [string, string][] = [];
  const collect = (entries: Record<string, unknown> | undefined) => {
    if (!entries) return;
    for (const [name, target] of Object.entries(entries)) {
      if (typeof target === "string") aliases.push([name, target]);
    }
  };
  collect(asObject(config.imports));
  const scopes = asObject(config.scopes);
  if (scopes) for (const scope of Object.values(scopes)) collect(asObject(scope));
  return aliases;
}

// A local alias target is resolved against the directory of the configuration
// file that declares it.
function resolveLocal(configFile: string, target: string): string | undefined {
  if (!target.startsWith("./") && !target.startsWith("../")) return undefined;
  const parts = configFile.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

// A local import specifier, which is how the chain continues.
const LOCAL_IMPORT = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["'](\.\.?\/[^"']+)["']/gu;

// The third-party specifiers a file reaches through its local import graph.
async function thirdPartyReachable(
  ctx: RuleContext,
  file: string,
  seen: Set<string>,
  depth: number,
): Promise<{ file: string; line: number }[]> {
  if (depth > 8 || seen.has(file)) return [];
  seen.add(file);
  let text: string;
  try {
    text = await ctx.readFile(file);
  } catch {
    return [];
  }
  const found: { file: string; line: number }[] = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    if (THIRD_PARTY_SPECIFIER.test(line)) found.push({ file, line: index + 1 });
  });
  for (const match of text.matchAll(LOCAL_IMPORT)) {
    const target = match[1];
    if (!target) continue;
    const resolved = resolveLocal(file, target);
    if (!resolved) continue;
    found.push(...(await thirdPartyReachable(ctx, resolved, seen, depth + 1)));
  }
  return found;
}

export default {
  rules: {
    "no-runtime-deps": {
      description: "package.json declares no runtime, optional or peer dependencies",
      async check(ctx) {
        if (!ctx.scopedFiles.includes("package.json")) return;
        const pkg = (await ctx.readJSON("package.json")) as Record<string, unknown>;
        for (const field of RUNTIME_FIELDS) {
          const value = pkg[field];
          if (value === undefined) continue;
          const names = typeof value === "object" && value !== null ? Object.keys(value) : ["<invalid>"];
          for (const name of names) {
            ctx.report.violation({
              message: `Runtime dependency "${name}" in ${field}`,
              file: "package.json",
              fix: "Use a node: built-in, or make it an exact-pinned devDependency of a tool superman spawns",
            });
          }
        }
      },
    },
    "no-deno-runtime-deps": {
      description: "The Deno runtime graph declares no third-party runtime dependency",
      async check(ctx) {
        for (const file of ctx.scopedFiles) {
          if (SOURCE.test(file) && DENO_SOURCE.test(file)) {
            for (const m of await ctx.grep(file, THIRD_PARTY_SPECIFIER)) {
              ctx.report.violation({
                message: "Third-party runtime import in the Deno runtime graph",
                file: m.file,
                line: m.line,
                fix: "Use a Deno or `node:` built-in; ADR 0016 allows no npm, JSR or HTTP runtime dependency",
              });
            }
            continue;
          }
          if (!DENO_CONFIG.test(file)) continue;
          const raw = await ctx.readFile(file);
          const value = file.endsWith(".jsonc") ? parseJsonc(raw) : await ctx.readJSON(file);
          const config = asObject(value);
          if (!config) throw new Error(`Deno configuration is not an object: ${file}`);
          for (const [name, target] of importMapAliases(config)) {
            if (THIRD_PARTY.test(target)) {
              ctx.report.violation({
                message: `Import map alias "${name}" resolves to the third-party runtime dependency "${target}"`,
                file,
                fix: "Remove the alias; ADR 0016 allows no npm, JSR or HTTP runtime dependency",
              });
              continue;
            }
            // The indirect route: the aliased file and the local import graph
            // it reaches are inspected, so a chain that ends in a third-party
            // import is reported however many hops it takes.
            const resolved = resolveLocal(file, target);
            if (!resolved) continue;
            for (const reached of await thirdPartyReachable(ctx, resolved, new Set(), 0)) {
              ctx.report.violation({
                message: `Import map alias "${name}" resolves to "${target}", whose import graph reaches a third-party runtime dependency`,
                file: reached.file,
                line: reached.line,
                fix: "Remove the alias; ADR 0016 allows no npm, JSR or HTTP runtime dependency",
              });
            }
          }
        }
      },
    },
  },
} satisfies RuleSet;
