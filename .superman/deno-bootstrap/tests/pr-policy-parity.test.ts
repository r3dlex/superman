// Parity case: the twin's policy reads.
//
// The twin is the Deno runtime of the same policy the Node original
// enforces, and no mutation lane covers the twin, so the proof that the
// twin's own copies of the policy's readers carry the same behaviour is a
// comparison: the same corpus, run through the Node original's declaration
// and through the twin's, with the two results compared item by item.
//
// Both declarations are read out of their own module's source and run in a
// module of their own, so the comparison is between what the two ship and
// not between two copies of one of them. The twin never imports the Node
// original; this case is the one place the two are held side by side, and
// it holds them as text.
//
// The corpus is the policy's own: every glob the policy declares, every
// shape of policy file the policy reads, and the shapes that a reader can
// get wrong — an empty block comment, a trailing line comment with no
// newline after it, a trailing escape, an unterminated comment, and a
// comment marker inside a string.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const nodePolicy = join(repository, ".superman/ci/pr-policy.ts");
const twinPolicy = join(repository, ".superman/deno-bootstrap/pr-policy.ts");

/**
 * The declaration of `name`, read out of a module's own source.
 *
 * A declaration is a top-level function, so its closing brace is the first
 * one in the column zero, and everything between is the declaration itself.
 */
function declaration(path: string, name: string): string {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`the ${name} declaration was not found in ${path}`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`the ${name} declaration in ${path} has no closing brace`);
  return source.slice(start, end + 3);
}

/**
 * The result of running one declaration over a corpus.
 *
 * The declaration is written into a module of its own and imported, so the
 * corpus exercises the shipped source rather than a transcription of it:
 * both runtimes read the types away. The module is named after the policy
 * it came from, because a module is imported once per URL.
 */
async function overCorpus(
  path: string,
  name: string,
  label: string,
  corpus: unknown,
  driver: string,
): Promise<unknown> {
  const root = mkdtempSync(join(tmpdir(), "superman-deno-parity-"));
  try {
    const probe = join(root, `probe-${label}.ts`);
    writeFileSync(probe, `${declaration(path, name)}\n${driver}\n`);
    const module = (await import(pathToFileURL(probe).href)) as {
      results: (corpus: string) => string;
    };
    return JSON.parse(module.results(JSON.stringify(corpus)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The driver that reports what a glob matches. */
const GLOB_DRIVER = `export function results(corpus: string): string {
  const { globs, files } = JSON.parse(corpus) as { globs: string[]; files: string[] };
  return JSON.stringify(globs.map((glob) => {
    const pattern = globToRegExp(glob);
    return { glob, pattern: pattern.source, flags: pattern.flags, matches: files.filter((file) => pattern.test(file)) };
  }));
}`;

/** The driver that reports what a policy file reads as. */
const JSONC_DRIVER = `export function results(corpus: string): string {
  const { texts } = JSON.parse(corpus) as { texts: string[] };
  return JSON.stringify(texts.map((text) => {
    try {
      return { ok: true, value: readJSONC(text) };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }));
}`;

/** Every glob the policy declares, in the order it declares them. */
const GLOBS = [
  ".agents/plugins/**",
  ".archgate/**",
  ".claude-plugin/**",
  ".codex-plugin/**",
  ".config/lefthook/**",
  ".github/hooks/**",
  ".github/workflows/**",
  ".superman/**",
  ".superman/vault/candidates/**.md",
  ".superman/vault/raw/**",
  "**/.gitignore",
  "**/.jscpd.json",
  "**/.pnpmfile.*",
  "**/deno.json",
  "**/deno.jsonc",
  "**/deno.lock",
  "**/import_map.json",
  "**/knip.json",
  "**/stryker.config.*",
  "**/tsconfig*.json",
  "**/vitest.config.*",
  "docs/adr/**",
  "skills/**",
  "wiki/**.md",
];

/** The paths the globs are asked about. */
const FILES = [
  ".agents/plugins/one/two.md",
  ".github/workflows/ci.yml",
  ".superman/ci/raw-gates.ts",
  ".superman/vault/candidates/one.md",
  ".superman/vault/raw/one.json",
  "docs/adr/0005-github-app-agent-identity.md",
  "node_modules/pnpm/bin/pnpm.mjs",
  "skills/one/SKILL.md",
  "src/value.ts",
  "wiki/notes.md",
  "tsconfig.base.json",
  "vitest.config.ts",
];

/** The policy files the reader is asked about, and the shapes it must survive. */
const TEXTS = [
  // The shape the policy reads: an extends and a references list.
  '{ "extends": "./base.json", "references": [{ "path": "./tsconfig.base.json" }] }',
  // A line comment and a trailing comma.
  '{ "a": 1, // the first\n  "b": [1, 2,], }',
  // An empty block comment between a key and its value.
  '{ "a": /**/ 1 }',
  // A trailing line comment with no newline after it.
  '{ "a": 1 } // the last',
  // A trailing escape at the end of the text.
  '{ "a": "a backslash \\',
  // An unterminated block comment.
  '{ "a": 1 /* never closed',
  // Comment markers inside a string.
  '{ "a": "// not a comment", "b": "/* also not */" }',
  // A block comment that spans lines.
  '{ /*\n  the first\n  the second\n  */ "a": 1 }',
  // An empty object.
  "{}",
  // A policy file that is not an object.
  "[1, 2]",
];

test("the twin's glob reader matches the Node original's on every glob the policy declares", async () => {
  const corpus = { globs: GLOBS, files: FILES };
  const node = await overCorpus(nodePolicy, "globToRegExp", "node", corpus, GLOB_DRIVER);
  const twin = await overCorpus(twinPolicy, "globToRegExp", "twin", corpus, GLOB_DRIVER);

  assert.deepEqual(twin, node);
  // The corpus is not vacuous: the policy's own globs do match, and the
  // shapes that differ do not.
  const results = twin as { glob: string; matches: string[] }[];
  const matched = (glob: string): string[] => results.find((entry) => entry.glob === glob)?.matches ?? [];
  assert.deepEqual(matched(".github/workflows/**"), [".github/workflows/ci.yml"]);
  assert.deepEqual(matched("**/vitest.config.*"), ["vitest.config.ts"]);
  assert.deepEqual(matched(".superman/**"), [
    ".superman/ci/raw-gates.ts",
    ".superman/vault/candidates/one.md",
    ".superman/vault/raw/one.json",
  ]);
  assert.deepEqual(matched("**/.gitignore"), []);
});

test("the twin's policy reader matches the Node original's on every policy file shape", async () => {
  const corpus = { texts: TEXTS };
  const node = await overCorpus(nodePolicy, "readJSONC", "node", corpus, JSONC_DRIVER);
  const twin = await overCorpus(twinPolicy, "readJSONC", "twin", corpus, JSONC_DRIVER);

  assert.deepEqual(twin, node);
  // The corpus is not vacuous: the shapes it must survive are survived, and
  // the shape it must refuse is refused.
  const results = twin as { ok: boolean; value?: unknown; message?: string }[];
  assert.deepEqual(results[0], {
    ok: true,
    value: { extends: "./base.json", references: [{ path: "./tsconfig.base.json" }] },
  });
  assert.deepEqual(results[1], { ok: true, value: { a: 1, b: [1, 2] } });
  assert.deepEqual(results[2], { ok: true, value: { a: 1 } });
  assert.deepEqual(results[3], { ok: true, value: { a: 1 } });
  assert.equal(results[4].ok, false);
  assert.equal(results[5].ok, false);
  assert.equal(results[5].message, "Unterminated policy comment");
  assert.deepEqual(results[6], { ok: true, value: { a: "// not a comment", b: "/* also not */" } });
  assert.equal(results[9].ok, false);
  assert.equal(results[9].message, "Expected a policy object");
});
