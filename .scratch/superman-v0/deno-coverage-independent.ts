// Independent four-count derivation. Counting lives here; the production converter is not called.
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export type MetricTuple = [number, number, number];
export type Metrics = Record<"lines" | "statements" | "branches" | "functions", MetricTuple>;
export type MappedSpan = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};
export type DerivedStatement = { generatedOffset: number; loc: MappedSpan; hits: number };
export type DerivedFunction = {
  generatedOffset: number;
  decl: MappedSpan;
  loc: MappedSpan;
  name: string;
  hits: number;
};
export type DerivedBranch = {
  type: string;
  loc: MappedSpan;
  arms: Array<{ loc: MappedSpan | { implicit: true }; hits: number }>;
};
export type DerivedFile = {
  path: string;
  statements: DerivedStatement[];
  functions: DerivedFunction[];
  branches: DerivedBranch[];
  metrics: Metrics;
};
type CoverageRange = { startOffset: number; endOffset: number; count: number };
type FunctionCoverage = { functionName: string; ranges: CoverageRange[]; isBlockCoverage: boolean };
export type Profile = { scriptId: string; url: string; functions: FunctionCoverage[] };
export type SourceMap = {
  version: number;
  sources: string[];
  sourcesContent?: string[];
  names: string[];
  mappings: string;
};
export type DeriveInput = {
  filePath: string;
  code: string;
  original: Buffer;
  sourceMap?: SourceMap;
  profile: Profile;
  role: "loaded" | "unloaded";
  allowOversizedTopLevel?: boolean;
};

type AstNode = {
  type?: string;
  start?: number;
  end?: number;
  body?: unknown;
  init?: unknown;
  id?: { name?: string; start?: number; end?: number } | null;
  [key: string]: unknown;
};
type Position = { line: number; column: number; source: string | null };
type Tracer = {
  TraceMap: new (map: unknown) => unknown;
  originalPositionFor: (map: unknown, needle: { line: number; column: number; bias?: number }) => Position;
  allGeneratedPositionsFor: (
    map: unknown,
    needle: { source: string; line: number; column: number; bias: number },
  ) => Array<{ line: number | null; column: number }>;
  LEAST_UPPER_BOUND: number;
};

const HITS_ARRAY_LIMIT = 2_000_000;
const TOKEN = /(\w+|\s|[^\w\s])/g;
const STATEMENTS = new Set([
  "ReturnStatement",
  "BreakStatement",
  "ContinueStatement",
  "DebuggerStatement",
  "ThrowStatement",
  "TryStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "WithStatement",
  "LabeledStatement",
]);

function sharedRequire(): NodeRequire {
  return createRequire(import.meta.resolve("@vitest/coverage-v8"));
}

async function parseRuntime(code: string): Promise<unknown> {
  const { parseAstAsync } = (await import(pathToFileURL(sharedRequire().resolve("vite")).href)) as {
    parseAstAsync: (code: string) => Promise<unknown>;
  };
  return parseAstAsync(code);
}

async function tracer(): Promise<Tracer> {
  const umd = sharedRequire().resolve("@jridgewell/trace-mapping");
  return import(
    pathToFileURL(fileURLToPath(new URL("./trace-mapping.mjs", pathToFileURL(umd)))).href
  ) as Promise<Tracer>;
}

function lineStarts(code: string): number[] {
  const starts = [0];
  for (let index = 0; index < code.length; index++) if (code.charCodeAt(index) === 10) starts.push(index + 1);
  return starts;
}

function offsetToNeedle(starts: number[], offset: number): { line: number; column: number } {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (starts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return { line: high + 1, column: offset - starts[high] };
}

function identityMap(filePath: string, code: string): unknown {
  const mappings = code.split("\n").map((line, lineIndex) => {
    const segments: number[][] = [];
    let column = 0;
    for (const token of line.match(TOKEN) ?? []) {
      segments.push([column, 0, lineIndex, column]);
      column += token.length;
    }
    return segments;
  });
  return { version: 3, file: filePath, sources: [filePath], sourcesContent: [code], names: [], mappings };
}

function positionFor(map: unknown, library: Tracer, needle: { line: number; column: number }): Position | null {
  let found = library.originalPositionFor(map, needle);
  if (found.source == null) found = library.originalPositionFor(map, { ...needle, bias: library.LEAST_UPPER_BOUND });
  return found.source == null ? null : found;
}

function mapSpan(code: string, map: unknown, library: Tracer, start: number, end: number): MappedSpan | null {
  const starts = lineStarts(code);
  const startNeedle = offsetToNeedle(starts, start);
  const startPosition = positionFor(map, library, startNeedle);
  if (!startPosition?.source || startPosition.line == null || startPosition.column == null) return null;
  const endNeedle = offsetToNeedle(starts, end);
  endNeedle.column -= 1;
  let endPosition = positionFor(map, library, endNeedle);
  if (!endPosition) {
    for (let line = endNeedle.line; line >= startNeedle.line && !endPosition; line--) {
      endPosition = positionFor(map, library, { line, column: Number.POSITIVE_INFINITY });
    }
  }
  if (!endPosition?.line || endPosition.column == null || endPosition.source == null) return null;
  const generated = library.allGeneratedPositionsFor(map, {
    source: endPosition.source,
    line: endPosition.line,
    column: endPosition.column + 1,
    bias: library.LEAST_UPPER_BOUND,
  });
  let endColumn = generated.length === 0 ? Number.POSITIVE_INFINITY : endPosition.column;
  if (generated.length > 0) {
    for (const candidate of generated) {
      if (candidate.line == null) continue;
      const original = library.originalPositionFor(map, { line: candidate.line, column: candidate.column });
      if (original.line === endPosition.line && original.column != null) {
        endColumn = original.column;
        break;
      }
    }
  }
  return {
    start: { line: startPosition.line, column: startPosition.column },
    end: { line: endPosition.line, column: endColumn },
  };
}

function hitAt(functions: FunctionCoverage[], offset: number): number {
  const ranges = functions.flatMap((fn) =>
    fn.ranges.map((range, order) => ({
      start: range.startOffset,
      end: range.endOffset,
      count: range.count,
      area: range.endOffset - range.startOffset,
      order,
    })),
  );
  let maxEnd = 0;
  for (const range of ranges) if (range.end > maxEnd) maxEnd = range.end;
  if (maxEnd > HITS_ARRAY_LIMIT) throw new Error("coverage file exceeds the hits-array threshold");
  if (maxEnd === 0) return 0;
  ranges.sort((left, right) => right.area - left.area || left.end - right.end);
  const hits = new Uint32Array(maxEnd);
  for (const range of ranges) hits.fill(range.count, range.start, range.end);
  return offset >= 0 && offset < hits.length ? hits[offset] : 0;
}

function bindUrl(filePath: string, profile: Profile): void {
  const url = new URL(profile.url);
  if (url.protocol !== "file:" || url.search || url.hash)
    throw new Error(`coverage profile URL is not a plain local file URL: ${profile.url}`);
  if (fileURLToPath(url) !== filePath) throw new Error(`coverage profile URL is aliased: ${profile.url}`);
}

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const record = node as AstNode;
  if (typeof record.type === "string") visit(record);
  for (const [key, value] of Object.entries(record)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "start" || key === "end") continue;
    walk(value, visit);
  }
}

function metricsOf(statements: DerivedStatement[], functions: DerivedFunction[], branches: DerivedBranch[]): Metrics {
  const lineHits = new Map<number, number>();
  for (const statement of statements) {
    const previous = lineHits.get(statement.loc.start.line);
    if (previous === undefined || previous < statement.hits) lineHits.set(statement.loc.start.line, statement.hits);
  }
  const count = (hits: number[]): MetricTuple => [hits.filter((hit) => hit > 0).length, hits.length, 0];
  const truthy = (hits: number[]): MetricTuple => [hits.filter((hit) => !!hit).length, hits.length, 0];
  return {
    lines: truthy([...lineHits.values()]),
    statements: truthy(statements.map((statement) => statement.hits)),
    branches: count(branches.flatMap((branch) => branch.arms.map((arm) => arm.hits))),
    functions: truthy(functions.map((fn) => fn.hits)),
  };
}

function spanKey(loc: MappedSpan): string {
  return `${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`;
}

export async function deriveFile(input: DeriveInput): Promise<DerivedFile> {
  if (input.role === "loaded" && input.profile.functions.length === 0) {
    throw new Error(`loaded coverage profile is empty: ${input.filePath}`);
  }
  bindUrl(input.filePath, input.profile);
  const library = await tracer();
  const map = new library.TraceMap(input.sourceMap ?? identityMap(input.filePath, input.code));
  const ast = await parseRuntime(input.code);
  const statements: DerivedStatement[] = [];
  const statementBySpan = new Map<string, DerivedStatement>();
  const functions: DerivedFunction[] = [];
  const functionBySpan = new Map<string, DerivedFunction>();
  const branches: DerivedBranch[] = [];
  const branchByArms = new Map<string, DerivedBranch>();
  const logicalMembers = new Set<AstNode>();
  const methodValues = new Set<AstNode>();
  const addStatement = (locationNode: AstNode, hitNode: AstNode): void => {
    if (
      !Number.isInteger(locationNode.start) ||
      !Number.isInteger(locationNode.end) ||
      !Number.isInteger(hitNode.start)
    )
      return;
    const loc = mapSpan(input.code, map, library, locationNode.start as number, locationNode.end as number);
    if (!loc) throw new Error(`statement has no original source location: ${input.filePath}`);
    const hits = hitAt(input.profile.functions, hitNode.start as number);
    const existing = statementBySpan.get(spanKey(loc));
    if (existing) {
      existing.hits = hits;
      return;
    }
    const statement = {
      generatedOffset: hitNode.start as number,
      loc,
      hits,
    };
    statementBySpan.set(spanKey(loc), statement);
    statements.push(statement);
  };
  const addBranch = (type: string, node: AstNode, armNodes: Array<AstNode | null | undefined>): void => {
    const loc = mapSpan(input.code, map, library, node.start as number, node.end as number);
    if (!loc) throw new Error(`branch has no original source location: ${input.filePath}`);
    const arms: DerivedBranch["arms"] = [];
    for (const arm of armNodes) {
      if (!arm) {
        arms.push({
          loc: { implicit: true },
          hits: hitAt(input.profile.functions, node.start as number) - (arms.at(-1)?.hits ?? 0),
        });
        continue;
      }
      const armLoc = mapSpan(input.code, map, library, arm.start as number, arm.end as number);
      if (!armLoc) throw new Error("branch arm has no original source location");
      arms.push({
        loc: type === "if" && arms.length === 0 ? loc : armLoc,
        hits: hitAt(
          input.profile.functions,
          (arm.start as number) + (type === "if" || arm.type === "BlockStatement" ? 1 : 0),
        ),
      });
    }
    const key = arms.map((arm) => ("implicit" in arm.loc ? "implicit" : spanKey(arm.loc))).join("|");
    const existing = branchByArms.get(key);
    if (existing) {
      for (const [index, arm] of arms.entries()) existing.arms[index].hits += arm.hits;
    } else {
      const branch = { type, loc, arms };
      branchByArms.set(key, branch);
      branches.push(branch);
    }
  };
  const logicalLeaves = (node: AstNode): AstNode[] => {
    if (node.type === "ParenthesizedExpression") return logicalLeaves(node.expression as AstNode);
    if (node.type !== "LogicalExpression") return [node];
    logicalMembers.add(node);
    return [...logicalLeaves(node.left as AstNode), ...logicalLeaves(node.right as AstNode)];
  };
  walk(ast, (node) => {
    if (!Number.isInteger(node.start) || !Number.isInteger(node.end)) return;
    const value = node.value as AstNode | undefined;
    const method =
      (node.type === "MethodDefinition" || node.type === "Property") && value?.type === "FunctionExpression";
    if (method) methodValues.add(value);
    if (
      method ||
      (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type ?? "") &&
        !methodValues.has(node))
    ) {
      const body = (method ? value.body : node.body) as AstNode;
      const id = method ? (node.key as NonNullable<AstNode["id"]>) : node.id;
      const loc = mapSpan(input.code, map, library, body.start as number, body.end as number);
      const decl =
        id?.start != null && id.end != null
          ? mapSpan(input.code, map, library, id.start, id.end)
          : mapSpan(input.code, map, library, node.start as number, (node.start as number) + 1);
      if (!loc || !decl) throw new Error(`function has no original source location: ${input.filePath}`);
      const hits = hitAt(input.profile.functions, node.start as number);
      const existing = functionBySpan.get(spanKey(decl));
      if (existing) existing.hits += hits;
      else {
        const fn = {
          generatedOffset: node.start as number,
          decl,
          loc,
          name: id?.name ?? `(anonymous_${functions.length})`,
          hits,
        };
        functionBySpan.set(spanKey(decl), fn);
        functions.push(fn);
      }
      if (node.type === "ArrowFunctionExpression" && body.type !== "BlockStatement") addStatement(body, node);
    }
    if (node.type === "ClassBody") {
      for (const field of node.body as AstNode[]) {
        if (["PropertyDefinition", "ClassProperty", "ClassPrivateProperty"].includes(field.type ?? "") && field.value)
          addStatement(field.value as AstNode, field.value as AstNode);
      }
    }
    if (node.type === "VariableDeclarator" && node.init && typeof node.init === "object")
      addStatement(node.init as AstNode, node);
    if (STATEMENTS.has(node.type ?? "")) addStatement(node, node);
    if (node.type === "ExpressionStatement") {
      const expression = node.expression as AstNode;
      if (expression.type !== "Literal" || expression.value !== "use strict") addStatement(node, node);
    }
    if (node.type === "IfStatement") {
      addStatement(node, node);
      addBranch("if", node, [node.consequent as AstNode, node.alternate as AstNode | null]);
    }
    if (node.type === "ConditionalExpression")
      addBranch("cond-expr", node, [node.consequent as AstNode, node.alternate as AstNode]);
    if (node.type === "LogicalExpression" && !logicalMembers.has(node))
      addBranch("binary-expr", node, logicalLeaves(node));
    if (node.type === "SwitchStatement") {
      addStatement(node, node);
      addBranch("switch", node, node.cases as AstNode[]);
    }
    if (node.type === "AssignmentPattern") addBranch("default-arg", node, [node.right as AstNode]);
  });
  return { path: input.filePath, statements, functions, branches, metrics: metricsOf(statements, functions, branches) };
}

export function deriveAggregate(files: DerivedFile[]): { total: Metrics; files: string[] } {
  const total = metricsOf([], [], []);
  const paths = new Set<string>();
  for (const file of files) {
    const canonical = realpathSync(file.path);
    if (paths.has(canonical)) throw new Error(`aggregate repeats an aliased source: ${canonical}`);
    paths.add(canonical);
    for (const metric of ["lines", "statements", "branches", "functions"] as const) {
      for (let index = 0; index < 3; index++) total[metric][index] += file.metrics[metric][index];
    }
  }
  return { total, files: [...paths].sort() };
}
