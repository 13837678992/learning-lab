import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AnalysisResult,
  AnalysisWarning,
  AnalyzeOptions,
  ParsedFile,
  VueVersion,
} from '../types';
import { CacheStore } from '../cache/cache';
import { DependencyGraph } from '../graph/graph';
import { readAndParse } from '../parser';
import { loadAliases } from '../resolver/alias';
import { ModuleResolver, canonicalPath } from '../resolver/resolver';
import { scanProject } from '../scanner/scan';
import { discoverRouter } from '../router/discovery';
import { findImpact } from './impact';

export const DEFAULT_CACHE_DIR = '.node-impact-cache';

/** 向上查找项目根：最近的含 package.json 的目录 */
export function findProjectRoot(startPath: string): string {
  let dir = path.resolve(startPath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    dir = path.dirname(dir);
  }
  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function detectVueVersion(projectRoot: string): VueVersion | null {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const vue = deps.vue;
    if (typeof vue === 'string') {
      const cleaned = vue.replace(/^[\^~<>= ]+/, '');
      const major = parseInt(cleaned.split('.')[0], 10);
      if (major === 2) return 2;
      if (major === 3) return 3;
    }
    if (deps['vue-router']) {
      const vr = String(deps['vue-router']).replace(/^[\^~<>= ]+/, '');
      const major = parseInt(vr.split('.')[0], 10);
      if (major === 3) return 2; // vue-router 3 对应 Vue 2
      if (major === 4) return 3;
    }
    return null;
  } catch {
    return null;
  }
}

export function isVueProject(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return 'vue' in deps || 'vue-router' in deps || '@vue/cli-service' in deps;
  } catch {
    return false;
  }
}

export interface AnalysisContext {
  root: string;
  resolver: ModuleResolver;
  cache: CacheStore;
  parsed: Map<string, ParsedFile>;
  graph: DependencyGraph;
  warnings: AnalysisWarning[];
  filesScanned: number;
  cacheHits: number;
}

/**
 * 完整分析流程：
 * 扫描 -> 解析（缓存） -> 依赖图 -> Router 发现 -> 反向影响分析 -> 结构化结果
 */
export function analyze(targetFiles: string[], options: AnalyzeOptions = {}): AnalysisResult {
  const t0 = Date.now();
  const cacheDirName = options.cacheDir ?? DEFAULT_CACHE_DIR;

  const firstTarget = targetFiles[0] ? path.resolve(targetFiles[0]) : process.cwd();
  const root = options.projectRoot ? path.resolve(options.projectRoot) : findProjectRoot(firstTarget);
  const targets = targetFiles.map((f) => {
    const abs = path.resolve(f);
    return abs;
  });

  const ctx = buildContext(root, options, cacheDirName);

  if (!isVueProject(root)) {
    pushWarning(ctx.warnings, {
      type: 'no-vue-project',
      message: '当前 Workspace 未检测到 Vue 项目（package.json 中无 vue / vue-router / @vue/cli-service）。仍尝试继续分析。',
      file: path.join(root, 'package.json'),
    });
  }

  const routerInfo = discoverRouter({
    root,
    resolver: ctx.resolver,
    parsed: ctx.parsed,
    warnings: ctx.warnings,
  });

  const impact = findImpact(ctx.graph, routerInfo, targets);

  ctx.cache.save();

  return {
    projectRoot: root,
    vueVersion: detectVueVersion(root),
    targetFiles: targets,
    routes: impact.routes,
    chains: impact.chains,
    warnings: ctx.warnings,
    stats: {
      filesScanned: ctx.filesScanned,
      filesParsed: ctx.filesScanned - ctx.cacheHits,
      cacheHits: ctx.cacheHits,
      routesTotal: routerInfo.routes.length,
      directRefs: impact.directRefs,
      indirectRefs: impact.indirectRefs,
      impactedComponents: impact.impactedComponents,
      elapsedMs: Date.now() - t0,
    },
  };
}

function buildContext(root: string, options: AnalyzeOptions, cacheDirName: string): AnalysisContext {
  const warnings: AnalysisWarning[] = [];
  const aliases = loadAliases(root);
  const resolver = new ModuleResolver({ projectRoot: root, aliases });
  const cache = new CacheStore(path.join(root, cacheDirName));

  const files = scanProject(root, {
    exclude: options.exclude,
    cacheDir: cacheDirName,
    maxFiles: options.maxFiles,
  });

  const parsed = new Map<string, ParsedFile>();
  const graph = new DependencyGraph();
  let cacheHits = 0;

  for (const f of files) {
    const cached = options.useCache === false ? null : cache.getParsed(f.file, f.mtimeMs, f.size);
    if (cached) {
      cacheHits++;
      parsed.set(canonicalPath(f.file), cached);
      continue;
    }
    const outcome = readAndParse(f.file, f.mtimeMs, f.size);
    parsed.set(canonicalPath(f.file), outcome.parsed);
    cache.setParsed(outcome.parsed);
    if (outcome.error) {
      pushWarning(warnings, {
        type: 'parse-error',
        message: `无法解析文件：${outcome.error}`,
        file: f.file,
      });
    }
  }

  // 依赖图
  for (const p of parsed.values()) {
    for (const imp of p.imports) {
      const resolved = resolver.resolve(imp.specifier, p.file);
      if (resolved && parsed.has(canonicalPath(resolved))) {
        graph.addDependency(p.file, resolved);
      }
    }
  }

  return { root, resolver, cache, parsed, graph, warnings, filesScanned: files.length, cacheHits };
}

function pushWarning(warnings: AnalysisWarning[], w: AnalysisWarning) {
  if (warnings.length < 300) warnings.push(w);
}

/** 清除项目缓存（供 CLI / VS Code 使用） */
export function clearProjectCache(projectRoot: string, cacheDirName = DEFAULT_CACHE_DIR): string {
  const dir = path.join(projectRoot, cacheDirName);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return dir;
  } catch {
    return dir;
  }
}
