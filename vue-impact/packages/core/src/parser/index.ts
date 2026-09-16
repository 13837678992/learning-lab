import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParsedFile } from '../types';
import { parseScript, type ScriptParseResult } from './script';
import { parseVueScripts } from './vue';

export interface ParseOutcome {
  parsed: ParsedFile;
  error?: string;
}

const JS_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const MINIFIED_THRESHOLD = 200_000;

export function parseFileContent(absPath: string, content: string, mtimeMs: number, size: number): ParseOutcome {
  const ext = path.extname(absPath).toLowerCase();
  const empty: ParsedFile = {
    file: absPath,
    imports: [],
    routerUsages: [],
    bindings: {},
    bindingKinds: {},
    exports: [],
    mtimeMs,
    size,
  };

  if (ext === '.json') return { parsed: empty };

  // 压缩产物（bundle/min.js）跳过解析
  if (content.length > MINIFIED_THRESHOLD) {
    const newlines = content.split('\n').length;
    if (newlines < 5) return { parsed: empty };
  }

  if (ext === '.vue') {
    const { scripts, errors } = parseVueScripts(content, absPath);
    if (scripts.length === 0) {
      return { parsed: empty, error: errors.length > 0 ? errors[0] : undefined };
    }
    const results: ScriptParseResult[] = [];
    let firstError: string | undefined = errors.length > 0 ? errors[0] : undefined;
    for (const script of scripts) {
      try {
        results.push(parseScript(script.content, absPath));
      } catch (err) {
        firstError = firstError ?? (err instanceof Error ? err.message : String(err));
      }
    }
    return { parsed: { ...empty, ...mergeResults(results) }, error: firstError };
  }

  if (JS_EXTS.has(ext)) {
    try {
      const r = parseScript(content, absPath);
      return { parsed: { ...empty, ...r } };
    } catch (err) {
      return { parsed: empty, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { parsed: empty };
}

function mergeResults(results: ScriptParseResult[]): ScriptParseResult {
  const merged: ScriptParseResult = {
    imports: [],
    routerUsages: [],
    bindings: {},
    bindingKinds: {},
    exports: [],
    localArrays: {},
    localObjects: {},
    localCalls: {},
  };
  for (const r of results) {
    merged.imports.push(...r.imports);
    merged.routerUsages.push(...r.routerUsages);
    merged.exports.push(...r.exports);
    for (const [k, v] of Object.entries(r.bindings)) {
      if (!merged.bindings[k]) {
        merged.bindings[k] = v;
        merged.bindingKinds[k] = r.bindingKinds[k] ?? 'named';
      }
    }
    Object.assign(merged.localArrays, r.localArrays);
    Object.assign(merged.localObjects, r.localObjects);
    Object.assign(merged.localCalls, r.localCalls);
  }
  return merged;
}

export function readAndParse(absPath: string, mtimeMs: number, size: number): ParseOutcome {
  const content = fs.readFileSync(absPath, 'utf8');
  return parseFileContent(absPath, content, mtimeMs, size);
}
