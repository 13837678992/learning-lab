import * as path from 'node:path';
import type {
  AnalysisWarning,
  ParsedFile,
  RawRoute,
  RouteEntry,
  RouterInfo,
  RouteSource,
  RouterUsage,
} from '../types';
import { ModuleResolver, canonicalPath } from '../resolver/resolver';

export interface DiscoveryContext {
  root: string;
  resolver: ModuleResolver;
  parsed: Map<string, ParsedFile>;
  warnings: AnalysisWarning[];
}

/**
 * Router 自动发现：
 * 1. 扫描全部文件中的 Router 用法（new Router / new VueRouter / createRouter / addRoutes / addRoute）
 * 2. 追踪 routes 变量：本文件数组 -> 本文件 import 绑定 -> 跨文件 export（含 re-export，防循环）
 * 3. 展开 children / Layout / 动态 import / 变量 component
 * 4. 无法静态确定的标记 warning，不让整体失败
 */
export function discoverRouter(ctx: DiscoveryContext): RouterInfo {
  const info: RouterInfo = {
    routerFiles: [],
    routes: [],
    componentRoutes: new Map(),
    layoutRoutes: new Map(),
    routeByPath: new Map(),
    warnings: [],
    frameworkRouter: false,
  };

  const seenFiles = new Set<string>();
  const seenRoutes = new Set<string>();

  for (const [file, parsed] of ctx.parsed) {
    if (parsed.routerUsages.length === 0) continue;
    info.routerFiles.push(file);

    for (const usage of parsed.routerUsages) {
      const resolved = resolveUsageRoutes(usage, file, ctx, seenFiles);
      if (resolved.kind === 'dynamic') {
        pushWarning(ctx.warnings, {
          type: 'dynamic-route',
          message: `routes 来源于运行时数据（${usage.source && usage.source.type === 'call' ? usage.source.name || '函数调用' : '动态表达式'}），当前无法静态确定最终页面。`,
          file,
          line: usage.line,
        });
        continue;
      }
      if (resolved.kind === 'unknown') {
        const externalCallee = isExternalBinding(parsed, usage.callee, ctx.resolver);
        if (externalCallee) {
          info.frameworkRouter = true;
          pushWarning(ctx.warnings, {
            type: 'framework-router',
            message: `Router 由框架封装创建（${usage.callee} 来自 node_modules），内部路由定义无法解析，已标记为 Framework Router。`,
            file,
            line: usage.line,
          });
        }
        continue;
      }
      expandRoutes(resolved.routes, resolved.definingFile, ctx, info, seenRoutes);
    }
  }

  info.routes.sort((a, b) => a.path.localeCompare(b.path));
  return info;
}

type UsageResolution =
  | { kind: 'routes'; routes: RawRoute[]; definingFile: string }
  | { kind: 'dynamic' }
  | { kind: 'unknown' };

function resolveUsageRoutes(
  usage: RouterUsage,
  file: string,
  ctx: DiscoveryContext,
  seenFiles: Set<string>,
  depth = 0,
): UsageResolution {
  if (depth > 8) return { kind: 'unknown' };
  if (usage.route) {
    // addRoute('/x', Component) 单条路由
    const routes = usage.route.path !== undefined ? [usage.route] : [];
    return routes.length > 0 ? { kind: 'routes', routes, definingFile: file } : { kind: 'unknown' };
  }
  const source = usage.source;
  if (!source) return { kind: 'unknown' };

  if (source.type === 'array') return { kind: 'routes', routes: source.routes, definingFile: file };
  if (source.type === 'call') return { kind: 'dynamic' };

  if (source.type === 'identifier') {
    if (source.inlineArray) return { kind: 'routes', routes: source.inlineArray, definingFile: file };
    if (source.importSpecifier) {
      const resolvedFile = ctx.resolver.resolve(source.importSpecifier, file);
      if (!resolvedFile) return { kind: 'unknown' };
      return resolveExportedRoutes(resolvedFile, source.name, source.importKind ?? 'named', ctx, seenFiles, depth + 1);
    }
    return { kind: 'unknown' };
  }
  return { kind: 'unknown' };
}

/** 跨文件追踪：routes.js 的 export default / export const routes / module.exports */
function resolveExportedRoutes(
  resolvedFile: string,
  importedName: string,
  importedKind: 'default' | 'named' | 'namespace',
  ctx: DiscoveryContext,
  seenFiles: Set<string>,
  depth: number,
): UsageResolution {
  const key = canonicalPath(resolvedFile);
  if (seenFiles.has(key)) return { kind: 'unknown' };
  seenFiles.add(key);

  const parsed = ctx.parsed.get(key);
  if (!parsed) return { kind: 'unknown' };

  // namespace 导入（import * as R）无法静态确定成员
  if (importedKind === 'namespace') return { kind: 'unknown' };

  // 查找匹配 export
  for (const exp of parsed.exports) {
    const nameMatches =
      importedKind === 'default'
        ? exp.kind === 'default' || exp.kind === 'module-exports'
        : exp.kind === 'named' && (exp.name === importedName || exp.localName === importedName);
    if (!nameMatches) continue;

    if (exp.routeSource) {
      const src = exp.routeSource;
      if (src.type === 'array') return { kind: 'routes', routes: src.routes, definingFile: resolvedFile };
      if (src.type === 'object') return { kind: 'routes', routes: [src.route], definingFile: resolvedFile };
      if (src.type === 'call') return { kind: 'dynamic' };
      if (src.type === 'identifier') {
        if (src.inlineArray) return { kind: 'routes', routes: src.inlineArray, definingFile: resolvedFile };
        if (src.importSpecifier) {
          const nextFile = ctx.resolver.resolve(src.importSpecifier, resolvedFile);
          if (!nextFile) return { kind: 'unknown' };
          return resolveExportedRoutes(nextFile, src.name, src.importKind ?? 'named', ctx, seenFiles, depth + 1);
        }
        // export { routes } 指向本文件其他变量 —— 查找本文件所有 export 的数组
        const fromLocal = findLocalArray(parsed, src.name);
        if (fromLocal) return { kind: 'routes', routes: fromLocal, definingFile: resolvedFile };
      }
      return { kind: 'unknown' };
    }
    if (exp.kind === 're-export' && exp.specifier) {
      const nextFile = ctx.resolver.resolve(exp.specifier, resolvedFile);
      if (!nextFile) return { kind: 'unknown' };
      return resolveExportedRoutes(nextFile, importedName, importedKind, ctx, seenFiles, depth + 1);
    }
    if (exp.localName) {
      const fromLocal = findLocalArray(parsed, exp.localName);
      if (fromLocal) return { kind: 'routes', routes: fromLocal, definingFile: resolvedFile };
      const binding = parsed.bindings[exp.localName];
      if (binding) {
        const nextFile = ctx.resolver.resolve(binding, resolvedFile);
        if (!nextFile) return { kind: 'unknown' };
        return resolveExportedRoutes(nextFile, 'default', parsed.bindingKinds[exp.localName] ?? 'named', ctx, seenFiles, depth + 1);
      }
    }
  }

  return { kind: 'unknown' };
}

function findLocalArray(parsed: ParsedFile, name: string): RawRoute[] | null {
  // exports 中带数组的（export const x = [...]）
  for (const exp of parsed.exports) {
    if (exp.kind === 'named' && (exp.name === name || exp.localName === name) && exp.routeSource?.type === 'array') {
      return exp.routeSource.routes;
    }
    if ((exp.kind === 'default' || exp.kind === 'module-exports') && exp.localName === name && exp.routeSource?.type === 'array') {
      return exp.routeSource.routes;
    }
  }
  return null;
}

function isExternalBinding(parsed: ParsedFile, name: string, resolver: ModuleResolver): boolean {
  const spec = parsed.bindings[name];
  if (!spec) return false;
  return resolver.classify(spec) === 'external';
}

/** 展开 RawRoute[] -> RouteEntry[]，处理 children / path 拼接 / component 解析 / spread 子配置 */
function expandRoutes(
  rawRoutes: RawRoute[],
  definingFile: string,
  ctx: DiscoveryContext,
  info: RouterInfo,
  seenRoutes: Set<string>,
  parentPath = '',
  layoutChain: string[] = [],
  depth = 0,
): void {
  if (depth > 10) return;
  for (const raw of rawRoutes) {
    // 子配置展开：...importedRoutes / routes: [routesVar]
    if (raw.spreadFrom !== undefined) {
      const resolved = resolveSpreadEntry(raw, definingFile, ctx, depth);
      if (resolved.kind === 'dynamic') {
        pushWarning(ctx.warnings, {
          type: 'dynamic-route',
          message: `路由子配置来自无法静态解析的动态表达式，跳过该部分。`,
          file: definingFile,
          line: raw.line,
        });
        continue;
      }
      if (resolved.kind === 'unknown') {
        pushWarning(ctx.warnings, {
          type: 'unresolved-import',
          message: `路由子配置 ${raw.spreadFrom} 无法解析（${raw.spreadSpecifier ?? '未找到定义'}）。`,
          file: definingFile,
          line: raw.line,
        });
        continue;
      }
      expandRoutes(resolved.routes, resolved.definingFile, ctx, info, seenRoutes, parentPath, layoutChain, depth + 1);
      continue;
    }
    if (raw.spreadDynamic) {
      pushWarning(ctx.warnings, {
        type: 'dynamic-route',
        message: `路由子配置来自动态表达式，无法静态确定。`,
        file: definingFile,
        line: raw.line,
      });
      continue;
    }
    // 路由对象变量引用：const x = {...}; routes: [x]
    if (raw.routeRef !== undefined) {
      const resolved = resolveRouteRefEntry(raw, definingFile, ctx, depth);
      if (resolved.kind === 'routes') {
        expandRoutes(resolved.routes, resolved.definingFile, ctx, info, seenRoutes, parentPath, layoutChain, depth + 1);
      } else if (resolved.kind === 'dynamic') {
        pushWarning(ctx.warnings, {
          type: 'dynamic-route',
          message: `路由对象 ${raw.routeRef} 来自动态表达式，无法静态确定。`,
          file: definingFile,
          line: raw.line,
        });
      } else {
        pushWarning(ctx.warnings, {
          type: 'unresolved-import',
          message: `路由对象 ${raw.routeRef} 无法解析（${raw.routeRefSpecifier ?? '未找到定义'}）。`,
          file: definingFile,
          line: raw.line,
        });
      }
      continue;
    }
    if (raw.routeRefDynamic) continue;

    const fullPath = joinRoutePaths(parentPath, raw.path ?? '');
    const componentFile = resolveComponent(raw, definingFile, ctx);

    if (raw.children && raw.children.length > 0) {
      // 有 children：本条是 Layout/分组路由，继续展开子路由
      const chain = componentFile ? [...layoutChain, componentFile] : layoutChain;
      expandRoutes(raw.children, definingFile, ctx, info, seenRoutes, fullPath, chain, depth + 1);
      continue;
    }

    // 叶子页面
    const key = fullPath + '|' + componentFile;
    if (seenRoutes.has(key)) continue;
    seenRoutes.add(key);

    const entry: RouteEntry = {
      path: fullPath,
      name: raw.name,
      component: componentFile,
      layoutFiles: layoutChain,
      file: definingFile,
      line: raw.line,
      dynamic: !componentFile,
    };
    info.routes.push(entry);
    info.routeByPath.set(fullPath, entry);
    if (componentFile) {
      const c = canonicalPath(componentFile);
      if (!info.componentRoutes.has(c)) info.componentRoutes.set(c, new Set());
      info.componentRoutes.get(c)!.add(fullPath);
    }
    // Layout -> 所有子路由：目标文件被 Layout 引用时，其下所有页面都受影响
    for (const layoutFile of layoutChain) {
      const l = canonicalPath(layoutFile);
      if (!info.layoutRoutes.has(l)) info.layoutRoutes.set(l, new Set());
      info.layoutRoutes.get(l)!.add(fullPath);
    }
  }
}

type EntryResolution = { kind: 'routes'; routes: RawRoute[]; definingFile: string } | { kind: 'dynamic' } | { kind: 'unknown' };

function resolveSpreadEntry(raw: RawRoute, definingFile: string, ctx: DiscoveryContext, depth: number): EntryResolution {
  if (raw.spreadInline) return { kind: 'routes', routes: raw.spreadInline, definingFile };
  if (raw.spreadSpecifier) {
    const f = ctx.resolver.resolve(raw.spreadSpecifier, definingFile);
    if (!f) return { kind: 'unknown' };
    const res = resolveExportedRoutes(f, raw.spreadFrom!, raw.spreadKind ?? 'named', ctx, new Set(), depth + 1);
    return res.kind === 'routes' ? { kind: 'routes', routes: res.routes, definingFile: res.definingFile } : res;
  }
  return { kind: 'unknown' };
}

function resolveRouteRefEntry(raw: RawRoute, definingFile: string, ctx: DiscoveryContext, depth: number): EntryResolution {
  if (raw.routeRefInline) return { kind: 'routes', routes: [raw.routeRefInline], definingFile };
  if (raw.routeRefSpecifier) {
    const f = ctx.resolver.resolve(raw.routeRefSpecifier, definingFile);
    if (!f) return { kind: 'unknown' };
    const res = resolveExportedRoutes(f, raw.routeRef!, raw.routeRefKind ?? 'named', ctx, new Set(), depth + 1);
    return res.kind === 'routes' ? { kind: 'routes', routes: res.routes, definingFile: res.definingFile } : res;
  }
  return { kind: 'unknown' };
}

function resolveComponent(raw: RawRoute, definingFile: string, ctx: DiscoveryContext): string {
  const ref = raw.component;
  if (!ref || ref.type === 'missing') return '';
  if (ref.type === 'import') {
    const resolved = ctx.resolver.resolve(ref.specifier, definingFile);
    if (!resolved) {
      pushWarning(ctx.warnings, {
        type: 'dynamic-import',
        message: `动态 import 无法静态确定具体文件（${ref.specifier}）。`,
        file: definingFile,
        line: raw.line,
      });
      return '';
    }
    return resolved;
  }
  if (ref.type === 'identifier') {
    const parsed = ctx.parsed.get(canonicalPath(definingFile));
    const spec = parsed?.bindings[ref.name];
    if (spec) {
      if (ctx.resolver.classify(spec) === 'external') {
        // 第三方组件（如 element-ui 的 Layout），非业务文件，无法追踪
        return '';
      }
      const resolved = ctx.resolver.resolve(spec, definingFile);
      return resolved ?? '';
    }
    pushWarning(ctx.warnings, {
      type: 'unresolved-import',
      message: `组件变量 ${ref.name} 无法解析为具体文件。`,
      file: definingFile,
      line: raw.line,
    });
    return '';
  }
  // inline 对象 / 动态表达式
  pushWarning(ctx.warnings, {
    type: 'dynamic-import',
    message: `组件表达式无法静态确定具体文件。`,
    file: definingFile,
    line: raw.line,
  });
  return '';
}

/** 拼接路由 path：子路径以 / 开头则绝对，否则拼接；处理尾部/开头斜杠 */
export function joinRoutePaths(parent: string, child: string): string {
  if (!parent || parent === '/') return normalizePath(child);
  if (child.startsWith('/')) return normalizePath(child);
  return normalizePath(parent + '/' + child);
}

function normalizePath(p: string): string {
  if (!p) return '/';
  let out = p.startsWith('/') ? p : '/' + p;
  out = out.replace(/\/+/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function pushWarning(warnings: AnalysisWarning[], w: AnalysisWarning) {
  if (warnings.length < 200) warnings.push(w);
}

/** 供 reporter 使用：相对路径 */
export function relativeTo(root: string, file: string): string {
  if (!file) return '';
  return path.relative(root, file).split(path.sep).join('/');
}

// 保留导出供单测使用
export type { RouteSource };
