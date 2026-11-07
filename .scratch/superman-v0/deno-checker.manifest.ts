// Step 3 conditional D1 derived-representation manifest builder.
// Measurement code only. It is not an operational launcher and not product code.
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";

export type DirectiveEdit = {
  start: number;
  end: number;
  original: string;
  replacement: string;
  adaptedStart: number;
  adaptedEnd: number;
  logical?: string;
  target?: string;
};

export type Transform = {
  name: string;
  rawSha256: string;
  adaptedSha256: string;
  edits: DirectiveEdit[];
  exactReverse: boolean;
};

export type InputVerification = {
  transforms: Transform[];
  files?: number;
  libNames?: number;
  changedFiles?: number;
  defaultLibOccurrences?: number;
};

export type UndiciSite = { file: string; line: number; column: number };

export type RealmSite = { file: string; label: string; before: string; after: string };

export type ManifestEdit = {
  family: "directive" | "undici-literal" | "realm-guard";
  coordinate: string;
  rawStart: number;
  rawEnd: number;
  derivedStart: number;
  derivedEnd: number;
  original: string;
  replacement: string;
  originalSha256: string;
  replacementSha256: string;
};

export type ManifestFile = {
  path: string;
  gitBlob: string;
  mode: string;
  rawSha256: string;
  derivedSha256: string;
  edits: ManifestEdit[];
};

export type Manifest = {
  schema: "superman.step3.d1-manifest/1";
  sourceCommit: string;
  sourceTree: string;
  inventorySha256: string;
  mappingSha256: string;
  inputVerificationSha256: string;
  rawTreeSha256: string;
  counts: {
    declarations: number;
    legal: number;
    mechanisms: number;
    edits: number;
    filesEdited: number;
    directive: { sites: number; files: number };
    undiciLiteral: { sites: number; files: number };
    realmGuard: { sites: number; files: number };
  };
  files: ManifestFile[];
  noOtherSpans: true;
  releaseBundleLoaded: false;
  reverse: { restored: number; mismatches: number; manifestSha256: string };
};

export const UNDICI_SITES: UndiciSite[] = [
  { file: "agent", line: 2, column: 18 },
  { file: "agent", line: 3, column: 24 },
  { file: "agent", line: 4, column: 26 },
  { file: "agent", line: 5, column: 24 },
  { file: "api", line: 3, column: 24 },
  { file: "balanced-pool", line: 1, column: 18 },
  { file: "balanced-pool", line: 2, column: 24 },
  { file: "client-stats", line: 1, column: 20 },
  { file: "client", line: 2, column: 24 },
  { file: "client", line: 3, column: 28 },
  { file: "client", line: 4, column: 26 },
  { file: "diagnostics-channel", line: 3, column: 28 },
  { file: "diagnostics-channel", line: 4, column: 24 },
  { file: "dispatcher", line: 5, column: 37 },
  { file: "dispatcher", line: 6, column: 26 },
  { file: "dispatcher", line: 7, column: 26 },
  { file: "dispatcher", line: 8, column: 20 },
  { file: "dispatcher", line: 9, column: 30 },
  { file: "env-http-proxy-agent", line: 1, column: 19 },
  { file: "env-http-proxy-agent", line: 2, column: 24 },
  { file: "errors", line: 1, column: 37 },
  { file: "errors", line: 2, column: 20 },
  { file: "eventsource", line: 1, column: 42 },
  { file: "eventsource", line: 2, column: 24 },
  { file: "eventsource", line: 8, column: 8 },
  { file: "fetch", line: 7, column: 26 },
  { file: "fetch", line: 8, column: 30 },
  { file: "fetch", line: 9, column: 24 },
  { file: "formdata", line: 4, column: 38 },
  { file: "global-dispatcher", line: 1, column: 24 },
  { file: "h2c-client", line: 2, column: 24 },
  { file: "h2c-client", line: 3, column: 28 },
  { file: "handlers", line: 1, column: 24 },
  { file: "header", line: 1, column: 30 },
  { file: "index", line: 1, column: 24 },
  { file: "index", line: 2, column: 58 },
  { file: "index", line: 3, column: 50 },
  { file: "index", line: 4, column: 18 },
  { file: "index", line: 5, column: 51 },
  { file: "index", line: 7, column: 26 },
  { file: "index", line: 8, column: 20 },
  { file: "index", line: 9, column: 23 },
  { file: "index", line: 10, column: 28 },
  { file: "index", line: 11, column: 20 },
  { file: "index", line: 12, column: 19 },
  { file: "index", line: 13, column: 24 },
  { file: "index", line: 14, column: 22 },
  { file: "index", line: 15, column: 23 },
  { file: "index", line: 16, column: 53 },
  { file: "index", line: 17, column: 24 },
  { file: "index", line: 18, column: 24 },
  { file: "index", line: 19, column: 31 },
  { file: "index", line: 20, column: 26 },
  { file: "index", line: 21, column: 24 },
  { file: "index", line: 22, column: 61 },
  { file: "index", line: 23, column: 26 },
  { file: "index", line: 25, column: 15 },
  { file: "index", line: 26, column: 15 },
  { file: "index", line: 27, column: 15 },
  { file: "index", line: 28, column: 15 },
  { file: "index", line: 29, column: 15 },
  { file: "index", line: 30, column: 15 },
  { file: "index", line: 31, column: 15 },
  { file: "index", line: 32, column: 15 },
  { file: "index", line: 33, column: 15 },
  { file: "index", line: 34, column: 31 },
  { file: "interceptors", line: 1, column: 26 },
  { file: "interceptors", line: 2, column: 24 },
  { file: "interceptors", line: 3, column: 26 },
  { file: "mock-agent", line: 1, column: 19 },
  { file: "mock-agent", line: 2, column: 24 },
  { file: "mock-agent", line: 3, column: 48 },
  { file: "mock-agent", line: 5, column: 33 },
  { file: "mock-call-history", line: 1, column: 24 },
  { file: "mock-client", line: 1, column: 20 },
  { file: "mock-client", line: 2, column: 24 },
  { file: "mock-client", line: 3, column: 23 },
  { file: "mock-client", line: 4, column: 48 },
  { file: "mock-errors", line: 1, column: 20 },
  { file: "mock-interceptor", line: 1, column: 37 },
  { file: "mock-interceptor", line: 2, column: 24 },
  { file: "mock-interceptor", line: 3, column: 35 },
  { file: "mock-pool", line: 1, column: 18 },
  { file: "mock-pool", line: 2, column: 23 },
  { file: "mock-pool", line: 3, column: 48 },
  { file: "mock-pool", line: 4, column: 24 },
  { file: "pool-stats", line: 1, column: 18 },
  { file: "pool", line: 1, column: 20 },
  { file: "pool", line: 2, column: 24 },
  { file: "pool", line: 4, column: 24 },
  { file: "proxy-agent", line: 1, column: 19 },
  { file: "proxy-agent", line: 2, column: 28 },
  { file: "proxy-agent", line: 3, column: 24 },
  { file: "proxy-agent", line: 4, column: 37 },
  { file: "retry-agent", line: 1, column: 24 },
  { file: "retry-agent", line: 2, column: 26 },
  { file: "retry-handler", line: 1, column: 24 },
  { file: "websocket", line: 10, column: 8 },
  { file: "websocket", line: 11, column: 24 },
  { file: "websocket", line: 12, column: 29 },
];

const GLOBAL_ALIASES: Array<[string, string]> = [
  ["_Request", "Request"],
  ["_Response", "Response"],
  ["_FormData", "FormData"],
  ["_Headers", "Headers"],
  ["_MessageEvent", "MessageEvent"],
  ["_WebSocket", "WebSocket"],
  ["_EventSource", "EventSource"],
  ["_CloseEvent", "CloseEvent"],
];

export const REALM_SITES: RealmSite[] = [
  ...GLOBAL_ALIASES.map(([alias, typeName]) => ({
    file: "node/globals.d.cts",
    label: `${alias}`,
    before: `type ${alias} = typeof globalThis extends { onmessage: any } ? {} : import("./undici/index.d.ts").${typeName};`,
    after: `type ${alias} = typeof globalThis extends { onmessage: any } ? {} : typeof globalThis extends { Deno: unknown } ? {} : import("./undici/index.d.ts").${typeName};`,
  })),
  {
    file: "node/perf_hooks.d.cts",
    label: "PerformanceObserver",
    before: `        var PerformanceObserver: typeof globalThis extends {
            onmessage: any;
            PerformanceObserver: infer T;
        } ? T
            : typeof _PerformanceObserver;`,
    after: `        var PerformanceObserver: typeof globalThis extends {
            onmessage: any;
            PerformanceObserver: infer T;
        } ? T
            : typeof globalThis extends { Deno: unknown; PerformanceObserver: infer T } ? T
            : typeof _PerformanceObserver;`,
  },
  {
    file: "node/perf_hooks.d.cts",
    label: "PerformanceObserverEntryList",
    before: `        var PerformanceObserverEntryList: typeof globalThis extends {
            onmessage: any;
            PerformanceObserverEntryList: infer T;
        } ? T
            : typeof _PerformanceObserverEntryList;`,
    after: `        var PerformanceObserverEntryList: typeof globalThis extends {
            onmessage: any;
            PerformanceObserverEntryList: infer T;
        } ? T
            : typeof globalThis extends { Deno: unknown; PerformanceObserverEntryList: infer T } ? T
            : typeof _PerformanceObserverEntryList;`,
  },
];

export type BuildOptions = {
  rawRoot: string;
  adaptedRoot: string;
  outputRoot: string;
  verification: InputVerification;
  acquisition?: {
    commit?: string;
    tree?: string;
    inventorySha256?: string;
    mappingSha256?: string;
    sourceRecords?: Array<{ source: string; kind: string; mode: string; gitBlob: string }>;
  };
  verificationSha256?: string;
  legalRoot?: string;
  mechanismsRoot?: string;
  undiciSites?: UndiciSite[];
  realmSites?: RealmSite[];
  write?: boolean;
  expected?: {
    declarations?: number;
    legal?: number;
    mechanisms?: number;
    directive?: number;
    undici?: number;
    realm?: number;
    filesEdited?: number;
  };
};

type ComputedEdit = { edit: ManifestEdit; original: string; replacement: string };

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message: string): never {
  throw new Error(`D1 manifest: ${message}`);
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) fail(`root is missing: ${root}`);
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail(`root is not a regular directory: ${root}`);
  const files: string[] = [];
  for (const relativePath of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const absolutePath = join(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) fail(`symlink is not allowed: ${relativePath}`);
    if (stat.isFile()) files.push(relativePath.split(sep).join("/"));
  }
  return files.sort();
}

function readText(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function offsetAt(text: string, line: number, column: number): number {
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 1 || column < 1)
    fail(`invalid coordinate ${line}:${column}`);
  const starts = lineStarts(text);
  const start = starts[line - 1];
  if (start === undefined) fail(`line is outside the file: ${line}`);
  return start + column - 1;
}

function stringLiteralSuffix(
  text: string,
  line: number,
  column: number,
): { start: number; end: number; content: string } {
  const start = offsetAt(text, line, column);
  const quote = text[start];
  if (quote !== '"' && quote !== "'" && quote !== "`")
    fail(`coordinate does not open a string literal: ${line}:${column}`);
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text[index] === quote) break;
    index += 1;
  }
  if (index >= text.length) fail(`string literal is unterminated: ${line}:${column}`);
  const content = text.slice(start + 1, index);
  if (!content.endsWith(".d.ts")) fail(`string literal does not end in .d.ts: ${line}:${column}`);
  return { start: index - 5, end: index, content };
}

function targetForLiteral(site: UndiciSite, literal: string, rawFiles: Set<string>): string {
  const base = `node/undici/${site.file}.d.ts`;
  if (literal.split(/[\\/]/u).includes("..")) fail(`Undici target contains a parent segment: ${literal}`);
  const target = normalize(join(dirname(base), literal));
  if (target.startsWith("..") || target.includes("/../")) fail(`Undici target escapes the corpus: ${literal}`);
  if (!/\.d\.(?:ts|cts)$/u.test(target)) fail(`Undici target is not a declaration: ${target}`);
  if (!rawFiles.has(target)) fail(`Undici target is missing: ${target}`);
  return target;
}

function applyComputedEdits(text: string, edits: ComputedEdit[]): string {
  let result = text;
  for (const item of [...edits].sort((left, right) => right.edit.derivedStart - left.edit.derivedStart)) {
    const current = result.slice(item.edit.derivedStart, item.edit.derivedEnd);
    if (current !== item.replacement) fail(`derived span does not match replacement: ${item.edit.coordinate}`);
    result = `${result.slice(0, item.edit.derivedStart)}${item.original}${result.slice(item.edit.derivedEnd)}`;
  }
  return result;
}

function buildUndiciEdits(text: string, file: string, sites: UndiciSite[], rawFiles: Set<string>): ComputedEdit[] {
  const edits: ComputedEdit[] = [];
  let delta = 0;
  for (const site of [...sites].sort((left, right) => left.line - right.line || left.column - right.column)) {
    const span = stringLiteralSuffix(text, site.line, site.column);
    const literal = text.slice(span.start, span.end);
    if (literal !== ".d.ts") fail(`Undici suffix is not .d.ts: ${file}:${site.line}:${site.column}`);
    const target = targetForLiteral(site, span.content, rawFiles);
    const edit: ManifestEdit = {
      family: "undici-literal",
      coordinate: `${site.line}:${site.column} -> ${target}`,
      rawStart: span.start,
      rawEnd: span.end,
      derivedStart: span.start + delta,
      derivedEnd: span.start + delta + ".js".length,
      original: literal,
      replacement: ".js",
      originalSha256: sha256(literal),
      replacementSha256: sha256(".js"),
    };
    edits.push({ edit, original: literal, replacement: ".js" });
    delta += ".js".length - literal.length;
  }
  return edits;
}

function buildRealmEdits(text: string, file: string, sites: RealmSite[]): ComputedEdit[] {
  const edits: ComputedEdit[] = [];
  let delta = 0;
  for (const site of sites) {
    if (site.file !== file) continue;
    const start = text.indexOf(site.before);
    if (start < 0) fail(`realm guard preimage is missing: ${site.label}`);
    if (text.indexOf(site.before, start + 1) >= 0) fail(`realm guard preimage is not unique: ${site.label}`);
    const edit: ManifestEdit = {
      family: "realm-guard",
      coordinate: site.label,
      rawStart: start,
      rawEnd: start + site.before.length,
      derivedStart: start + delta,
      derivedEnd: start + delta + site.after.length,
      original: site.before,
      replacement: site.after,
      originalSha256: sha256(site.before),
      replacementSha256: sha256(site.after),
    };
    edits.push({ edit, original: site.before, replacement: site.after });
    delta += site.after.length - site.before.length;
  }
  return edits;
}

function buildDirectiveEdits(transform: Transform): ComputedEdit[] {
  if (!transform.exactReverse) fail(`transform is not marked exactReverse: ${transform.name}`);
  return transform.edits.map((edit) => ({
    edit: {
      family: "directive",
      coordinate: `${edit.logical ?? "directive"} -> ${edit.target ?? "target"}`,
      rawStart: edit.start,
      rawEnd: edit.end,
      derivedStart: edit.adaptedStart,
      derivedEnd: edit.adaptedEnd,
      original: edit.original,
      replacement: edit.replacement,
      originalSha256: sha256(edit.original),
      replacementSha256: sha256(edit.replacement),
    },
    original: edit.original,
    replacement: edit.replacement,
  }));
}

function verifyDirectiveAdaptation(raw: string, adapted: string, transform: Transform): void {
  let expected = raw;
  for (const edit of [...transform.edits].sort((left, right) => right.start - left.start)) {
    if (expected.slice(edit.start, edit.end) !== edit.original) fail(`directive preimage mismatch: ${transform.name}`);
    expected = `${expected.slice(0, edit.start)}${edit.replacement}${expected.slice(edit.end)}`;
  }
  if (expected !== adapted) fail(`directive adaptation mismatch: ${transform.name}`);
  let reversed = adapted;
  for (const edit of [...transform.edits].sort((left, right) => right.adaptedStart - left.adaptedStart)) {
    if (reversed.slice(edit.adaptedStart, edit.adaptedEnd) !== edit.replacement)
      fail(`directive reversal preimage mismatch: ${transform.name}`);
    reversed = `${reversed.slice(0, edit.adaptedStart)}${edit.original}${reversed.slice(edit.adaptedEnd)}`;
  }
  if (reversed !== raw) fail(`directive reversal mismatch: ${transform.name}`);
}

export function buildDerivedManifest(options: BuildOptions): {
  manifest: Manifest;
  reversal: { restored: number; mismatches: string[] };
} {
  const write = options.write ?? false;
  const expected = {
    declarations: 202,
    legal: 3,
    mechanisms: 4,
    directive: 162,
    undici: 100,
    realm: 10,
    filesEdited: 89,
    ...options.expected,
  };
  const undiciSites = options.undiciSites ?? UNDICI_SITES;
  const realmSites = options.realmSites ?? REALM_SITES;
  const transforms = options.verification.transforms;
  for (const [name, value] of Object.entries({
    files: expected.declarations,
    libNames: 103,
    changedFiles: 57,
    defaultLibOccurrences: 17,
  })) {
    const actual = options.verification[name as keyof InputVerification];
    if (actual !== undefined && actual !== value) fail(`input verification ${name} is ${actual}, expected ${value}`);
  }
  if (
    options.verificationSha256 !== undefined &&
    options.verificationSha256 !== "7dc22aa1b9ffa59f336b9ce417c4777de62b401c99f73f89b04923fd501d4d88"
  )
    fail("input-verification hash differs from the approved input");
  if (options.acquisition) {
    if (
      options.acquisition.commit !== undefined &&
      options.acquisition.commit !== "fe7ed012d92c642fd8e5607ac5a45d517538b5c5"
    )
      fail("acquisition commit differs from the approved source");
    if (
      options.acquisition.tree !== undefined &&
      options.acquisition.tree !== "ad29daf52a8c383f8f6d564979d2056c760471a5"
    )
      fail("acquisition tree differs from the approved source tree");
    if (
      options.acquisition.inventorySha256 !== undefined &&
      options.acquisition.inventorySha256 !== "f41bc544f978ddf9500bc349333a3fdb22434c4cd90934dfe1a5a3b51bffc760"
    )
      fail("inventory hash differs from the approved closure");
    if (
      options.acquisition.mappingSha256 !== undefined &&
      options.acquisition.mappingSha256 !== "c6cb237eb62c185b856a6f4a78c8c348c2a07f7861563683f8479def7da984fd"
    )
      fail("mapping hash differs from the approved map");
    const declarations = options.acquisition.sourceRecords?.filter((record) => record.kind === "declaration") ?? [];
    if (declarations.length !== expected.declarations) fail(`acquisition declaration count is ${declarations.length}`);
  }
  if (options.legalRoot && listFiles(options.legalRoot).length !== expected.legal) fail("legal file count differs");
  if (options.mechanismsRoot && listFiles(options.mechanismsRoot).length !== expected.mechanisms)
    fail("mechanism file count differs");
  if (transforms.length !== expected.declarations)
    fail(`expected ${expected.declarations} transforms, got ${transforms.length}`);
  const rawFiles = new Set(listFiles(options.rawRoot));
  const adaptedFiles = new Set(listFiles(options.adaptedRoot));
  if (rawFiles.size !== expected.declarations || adaptedFiles.size !== expected.declarations)
    fail(`expected ${expected.declarations} raw/adapted files`);
  for (const file of rawFiles) if (!adaptedFiles.has(file)) fail(`adapted file is missing: ${file}`);

  const byName = new Map(transforms.map((transform) => [transform.name, transform]));
  if (byName.size !== expected.declarations) fail(`transform names are not unique`);

  const acquisition = new Map(
    (options.acquisition?.sourceRecords ?? [])
      .filter((record) => record.kind === "declaration")
      .map((record) => [record.source.replace(/^cli\/tsc\/dts\//u, ""), record]),
  );

  const undiciByFile = new Map<string, UndiciSite[]>();
  for (const site of undiciSites) {
    const list = undiciByFile.get(`node/undici/${site.file}.d.ts`) ?? [];
    list.push(site);
    undiciByFile.set(`node/undici/${site.file}.d.ts`, list);
  }
  const realmByFile = new Map<string, RealmSite[]>();
  for (const site of realmSites) {
    const list = realmByFile.get(site.file) ?? [];
    list.push(site);
    realmByFile.set(site.file, list);
  }

  if (undiciSites.length !== expected.undici)
    fail(`expected ${expected.undici} Undici sites, got ${undiciSites.length}`);
  if (realmSites.length !== expected.realm) fail(`expected ${expected.realm} realm sites, got ${realmSites.length}`);

  const manifestFiles: ManifestFile[] = [];
  const derivedTexts = new Map<string, string>();
  const computedEdits = new Map<string, ComputedEdit[]>();
  let directiveCount = 0;
  let undiciCount = 0;
  let realmCount = 0;
  const modifiedFiles = new Set<string>();
  const directiveFiles = new Set<string>();
  const undiciFiles = new Set<string>();
  const realmFiles = new Set<string>();

  for (const file of rawFiles) {
    if (!/\.d\.(?:ts|cts)$/u.test(file)) fail(`declaration name is unexpected: ${file}`);
    const transform = byName.get(file);
    if (!transform) fail(`raw file has no transform record: ${file}`);
    const raw = readText(options.rawRoot, file);
    const adapted = readText(options.adaptedRoot, file);
    if (sha256(raw) !== transform.rawSha256) fail(`raw hash mismatch: ${file}`);
    if (sha256(adapted) !== transform.adaptedSha256) fail(`adapted hash mismatch: ${file}`);
    verifyDirectiveAdaptation(raw, adapted, transform);

    const directive = buildDirectiveEdits(transform);
    const undici = buildUndiciEdits(adapted, file, undiciByFile.get(file) ?? [], rawFiles);
    const realm = buildRealmEdits(adapted, file, realmByFile.get(file) ?? []);
    if (directive.length && (undici.length || realm.length))
      fail(`directive and derived edits overlap in one file: ${file}`);
    if (undici.length && realm.length) fail(`Undici and realm edits overlap in one file: ${file}`);

    const all = [...directive, ...undici, ...realm];
    let derived = adapted;
    for (const item of [...undici, ...realm].sort((left, right) => right.edit.rawStart - left.edit.rawStart)) {
      const current = derived.slice(item.edit.rawStart, item.edit.rawEnd);
      if (current !== item.original) fail(`derived forward preimage mismatch: ${file} ${item.edit.coordinate}`);
      derived = `${derived.slice(0, item.edit.rawStart)}${item.replacement}${derived.slice(item.edit.rawEnd)}`;
    }

    derivedTexts.set(file, derived);
    computedEdits.set(file, all);
    if (write) {
      mkdirSync(dirname(join(options.outputRoot, file)), { recursive: true });
      writeFileSync(join(options.outputRoot, file), derived);
    }
    if (directive.length) {
      directiveCount += directive.length;
      modifiedFiles.add(file);
      directiveFiles.add(file);
    }
    if (undici.length) {
      undiciCount += undici.length;
      modifiedFiles.add(file);
      undiciFiles.add(file);
    }
    if (realm.length) {
      realmCount += realm.length;
      modifiedFiles.add(file);
      realmFiles.add(file);
    }
    if (options.acquisition) {
      const record = acquisition.get(file);
      if (!record) fail(`acquisition record is missing: ${file}`);
    }
    const record = acquisition.get(file);
    manifestFiles.push({
      path: file,
      gitBlob: record?.gitBlob ?? "",
      mode: record?.mode ?? "100644",
      rawSha256: sha256(raw),
      derivedSha256: sha256(derived),
      edits: all.map((item) => item.edit),
    });
  }

  if (directiveCount !== expected.directive)
    fail(`expected ${expected.directive} directive edits, got ${directiveCount}`);
  if (undiciCount !== expected.undici) fail(`expected ${expected.undici} Undici edits, got ${undiciCount}`);
  if (realmCount !== expected.realm) fail(`expected ${expected.realm} realm edits, got ${realmCount}`);
  if (modifiedFiles.size !== expected.filesEdited)
    fail(`expected ${expected.filesEdited} edited files, got ${modifiedFiles.size}`);

  const rawTreeSha256 = treeHash(options.rawRoot);
  const reversal = { restored: 0, mismatches: [] as string[] };
  for (const file of rawFiles) {
    const derived = derivedTexts.get(file);
    if (derived === undefined) fail(`derived text is missing: ${file}`);
    const reversed = applyComputedEdits(derived, computedEdits.get(file) ?? []);
    if (reversed !== readText(options.rawRoot, file)) {
      reversal.mismatches.push(file);
      continue;
    }
    reversal.restored += 1;
  }
  if (reversal.restored !== expected.declarations || reversal.mismatches.length)
    fail(
      `reversal failed: ${reversal.restored}/${expected.declarations} restored, ${reversal.mismatches.length} mismatches`,
    );

  const manifest: Manifest = {
    schema: "superman.step3.d1-manifest/1",
    sourceCommit: "fe7ed012d92c642fd8e5607ac5a45d517538b5c5",
    sourceTree: "ad29daf52a8c383f8f6d564979d2056c760471a5",
    inventorySha256: "f41bc544f978ddf9500bc349333a3fdb22434c4cd90934dfe1a5a3b51bffc760",
    mappingSha256: "c6cb237eb62c185b856a6f4a78c8c348c2a07f7861563683f8479def7da984fd",
    inputVerificationSha256: "7dc22aa1b9ffa59f336b9ce417c4777de62b401c99f73f89b04923fd501d4d88",
    rawTreeSha256,
    counts: {
      declarations: expected.declarations,
      legal: expected.legal,
      mechanisms: expected.mechanisms,
      edits: expected.directive + expected.undici + expected.realm,
      filesEdited: expected.filesEdited,
      directive: { sites: expected.directive, files: directiveFiles.size },
      undiciLiteral: { sites: expected.undici, files: undiciFiles.size },
      realmGuard: { sites: expected.realm, files: realmFiles.size },
    },
    files: manifestFiles,
    noOtherSpans: true,
    releaseBundleLoaded: false,
    reverse: { restored: reversal.restored, mismatches: reversal.mismatches.length, manifestSha256: "" },
  };
  manifest.reverse.manifestSha256 = sha256(JSON.stringify(manifest));
  if (write) {
    mkdirSync(join(options.outputRoot, "..", "evidence"), { recursive: true });
    writeFileSync(
      join(options.outputRoot, "..", "evidence", "derived-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    writeFileSync(join(options.outputRoot, "..", "evidence", "reversal.json"), JSON.stringify(reversal, null, 2));
  }
  return { manifest, reversal };
}

export function treeHash(root: string): string {
  const hash = createHash("sha256");
  for (const file of listFiles(root)) {
    hash.update(`${file}\0`);
    hash.update(readFileSync(join(root, file)));
  }
  return hash.digest("hex");
}
