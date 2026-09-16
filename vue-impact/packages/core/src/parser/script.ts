import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type {
  ExportInfo,
  ImportInfo,
  RawRoute,
  RouteComponentRef,
  RouteSource,
  RouterUsage,
} from '../types';

export interface ScriptParseResult {
  imports: ImportInfo[];
  routerUsages: RouterUsage[];
  bindings: Record<string, string>;
  bindingKinds: Record<string, 'default' | 'named' | 'namespace'>;
  exports: ExportInfo[];
  localArrays: Record<string, RawRoute[]>;
  localObjects: Record<string, RawRoute>;
  localCalls: Record<string, string>;
}

const BABEL_PLUGINS: any[] = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'importMeta',
  'topLevelAwait',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'logicalAssignment',
  'numericSeparator',
  'optionalCatchBinding',
];

export function parseScript(code: string, filename: string): ScriptParseResult {
  const ast = parse(code, {
    sourceType: 'unambiguous',
    plugins: BABEL_PLUGINS,
    errorRecovery: false,
  });
  return extractFromAst(ast, filename);
}

function extractFromAst(ast: t.File, filename: string): ScriptParseResult {
  const imports: ImportInfo[] = [];
  const routerUsages: RouterUsage[] = [];
  const bindings: Record<string, string> = {};
  const bindingKinds: Record<string, 'default' | 'named' | 'namespace'> = {};
  const exports: ExportInfo[] = [];
  const localArrays: Record<string, RawRoute[]> = {};
  const localObjects: Record<string, RawRoute> = {};
  const localCalls: Record<string, string> = {};

  const addBinding = (local: string, specifier: string, kind: 'default' | 'named' | 'namespace' = 'named') => {
    if (local && specifier && !bindings[local]) {
      bindings[local] = specifier;
      bindingKinds[local] = kind;
    }
  };

  traverse(ast, {
    ImportDeclaration(path) {
      const spec = path.node.source.value;
      const names: string[] = [];
      for (const s of path.node.specifiers) {
        names.push(s.local.name);
        const kind = t.isImportDefaultSpecifier(s) ? 'default' : t.isImportNamespaceSpecifier(s) ? 'namespace' : 'named';
        addBinding(s.local.name, spec, kind);
      }
      imports.push({ kind: 'import', specifier: spec, names, isDynamic: false, line: lineOf(path) });
    },
    ExportNamedDeclaration(path) {
      const spec = path.node.source?.value;
      if (spec) {
        const names: string[] = [];
        for (const s of path.node.specifiers) {
          if (t.isExportSpecifier(s)) {
            names.push(s.exported.type === 'Identifier' ? s.exported.name : String(s.exported.value));
            if (s.local.type === 'Identifier') addBinding(s.local.name, spec);
          }
        }
        imports.push({ kind: 'export-from', specifier: spec, names, isDynamic: false, line: lineOf(path) });
        exports.push({ kind: 're-export', specifier: spec, name: names[0] });
        return;
      }
      // export const routes = [...] / export { x }
      if (path.node.declaration) {
        if (t.isVariableDeclaration(path.node.declaration)) {
          for (const decl of path.node.declaration.declarations) {
            if (t.isIdentifier(decl.id) && decl.init) {
              exports.push({
                kind: 'named',
                name: decl.id.name,
                localName: decl.id.name,
                routeSource: routeSourceFromExpr(decl.init),
              });
              recordLocalDef(decl.id.name, decl.init);
            }
          }
        } else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          exports.push({ kind: 'named', name: path.node.declaration.id.name, localName: path.node.declaration.id.name });
        }
      } else {
        for (const s of path.node.specifiers) {
          if (t.isExportSpecifier(s)) {
            exports.push({ kind: 'named', name: exportName(s.exported), localName: exportName(s.local) });
          }
        }
      }
    },
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      exports.push({ kind: 'default', localName: idOf(decl), routeSource: routeSourceFromExpr(decl) });
    },
    ExportAllDeclaration(path) {
      const spec = path.node.source.value;
      imports.push({ kind: 'export-from', specifier: spec, names: [], isDynamic: false, line: lineOf(path) });
      exports.push({ kind: 're-export', specifier: spec });
    },
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id) || !path.node.init) return;
      recordLocalDef(path.node.id.name, path.node.init);
      const spec = specifierFromCall(path.node.init);
      if (spec) {
        imports.push({
          kind: path.node.init.type === 'CallExpression' ? 'require' : 'dynamic-import',
          specifier: spec.specifier,
          names: [path.node.id.name],
          isDynamic: spec.isDynamic,
          line: lineOf(path),
        });
        // const X = require('./x') 绑定的是 module.exports
        addBinding(path.node.id.name, spec.specifier, 'default');
      }
    },
    CallExpression(path) {
      const callee = path.node.callee;
      // require('...') 裸调用
      if (t.isIdentifier(callee, { name: 'require' })) {
        const spec = specifierFromRequireArgs(path.node.arguments);
        if (spec) {
          imports.push({ kind: 'require', specifier: spec, names: [], isDynamic: false, line: lineOf(path) });
        }
        return;
      }
      // import('...') 动态导入
      if (t.isImport(callee)) {
        const spec = specifierFromRequireArgs(path.node.arguments);
        if (spec) {
          imports.push({ kind: 'dynamic-import', specifier: spec, names: [], isDynamic: true, line: lineOf(path) });
        }
        return;
      }
      // createRouter({ routes }) —— Vue 3 函数式创建
      if (t.isIdentifier(callee, { name: 'createRouter' })) {
        const usage: RouterUsage = { kind: 'create', callee: 'createRouter', line: lineOf(path) };
        const options = path.node.arguments[0];
        if (options && t.isObjectExpression(options)) {
          const routesProp = routesPropertyOf(options);
          if (routesProp) usage.source = routeSourceFromExpr(routesProp);
        }
        routerUsages.push(usage);
        return;
      }
      // router.addRoutes([...]) / router.addRoute(...)
      if (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.property)) {
        const prop = callee.property.name;
        if (prop === 'addRoutes' || prop === 'addRoute') {
          const usage: RouterUsage = {
            kind: prop === 'addRoutes' ? 'addRoutes' : 'addRoute',
            callee: objName(callee.object),
            line: lineOf(path),
          };
          if (prop === 'addRoutes') {
            usage.source = routeSourceFromExpr(path.node.arguments[0] ?? t.nullLiteral());
          } else {
            const arg = path.node.arguments[0];
            usage.route = arg && t.isObjectExpression(arg) ? parseRouteObject(arg) : routeFromArgs(path.node.arguments);
          }
          routerUsages.push(usage);
        }
      }
    },
    NewExpression(path) {
      if (!t.isIdentifier(path.node.callee)) return;
      const name = path.node.callee.name;
      if (!isRouterCtor(name)) return;
      const usage: RouterUsage = { kind: 'create', callee: name, line: lineOf(path) };
      const options = path.node.arguments[0];
      if (options && t.isObjectExpression(options)) {
        const routesProp = routesPropertyOf(options);
        if (routesProp) usage.source = routeSourceFromExpr(routesProp);
      }
      routerUsages.push(usage);
    },
    AssignmentExpression(path) {
      // module.exports = routes
      const left = path.node.left;
      if (
        t.isMemberExpression(left) &&
        !left.computed &&
        t.isIdentifier(left.object, { name: 'module' }) &&
        t.isIdentifier(left.property, { name: 'exports' })
      ) {
        exports.push({
          kind: 'module-exports',
          localName: idOf(path.node.right as t.Node),
          routeSource: routeSourceFromExpr(path.node.right),
        });
      }
    },
  });

  // 后处理：identifier 型 routes 来源 -> 关联本文件内数组 / 调用 / import 绑定
  for (const usage of routerUsages) {
    if (usage.source?.type === 'identifier') {
      const name = usage.source.name;
      if (localArrays[name]) {
        usage.source.inlineArray = localArrays[name];
      } else if (localCalls[name]) {
        usage.source = { type: 'call', name: localCalls[name] };
      } else if (bindings[name]) {
        usage.source.importSpecifier = bindings[name];
        usage.source.importKind = bindingKinds[name] ?? 'named';
      }
    }
    if (usage.source?.type === 'array') {
      for (const r of usage.source.routes) resolveRefs(r);
    }
    if (usage.route) resolveRefs(usage.route);
  }
  for (const exp of exports) {
    if (exp.routeSource?.type === 'identifier') {
      const name = exp.routeSource.name;
      if (localArrays[name]) {
        exp.routeSource.inlineArray = localArrays[name];
      } else if (localCalls[name]) {
        exp.routeSource = { type: 'call', name: localCalls[name] };
      } else if (bindings[name]) {
        exp.routeSource.importSpecifier = bindings[name];
        exp.routeSource.importKind = bindingKinds[name] ?? 'named';
      }
    }
    if (exp.routeSource?.type === 'array') {
      for (const r of exp.routeSource.routes) resolveRefs(r);
    }
  }
  for (const arr of Object.values(localArrays)) {
    for (const r of arr) resolveRefs(r);
  }
  for (const r of Object.values(localObjects)) resolveRefs(r);

  return { imports, routerUsages, bindings, bindingKinds, exports, localArrays, localObjects, localCalls };

  /** 把 spread / routeRef 引用关联到本文件定义或 import 绑定 */
  function resolveRefs(route: RawRoute) {
    if (route.spreadFrom) {
      const name = route.spreadFrom;
      if (localArrays[name]) {
        route.spreadInline = localArrays[name];
      } else if (bindings[name]) {
        route.spreadSpecifier = bindings[name];
        route.spreadKind = bindingKinds[name] ?? 'named';
      }
    }
    if (route.routeRef) {
      const name = route.routeRef;
      if (localObjects[name]) {
        route.routeRefInline = localObjects[name];
      } else if (localArrays[name] && localArrays[name].length === 1) {
        // 引用的是单元素数组里的路由对象
        route.routeRefInline = localArrays[name][0];
      } else if (bindings[name]) {
        route.routeRefSpecifier = bindings[name];
        route.routeRefKind = bindingKinds[name] ?? 'named';
      }
    }
    if (route.children) {
      for (const c of route.children) resolveRefs(c);
    }
  }

  function recordLocalDef(name: string, init: t.Node) {
    if (t.isArrayExpression(init)) {
      localArrays[name] = routesFromArrayExpression(init);
    } else if (t.isObjectExpression(init)) {
      localObjects[name] = parseRouteObject(init);
    } else if (t.isCallExpression(init)) {
      const spec = specifierFromCall(init);
      if (!spec) {
        const cc = routesFromConcat(init);
        if (cc.length > 0) {
          localArrays[name] = cc;
        } else if (t.isIdentifier(init.callee)) {
          localCalls[name] = init.callee.name;
        }
      }
    } else if (t.isNewExpression(init) && t.isIdentifier(init.callee) && isRouterCtor(init.callee.name)) {
      // const router = new Router({ routes }) —— create 型用法已在 NewExpression 记录
      void name;
    }
  }
}

function isRouterCtor(name: string): boolean {
  return name === 'Router' || name === 'VueRouter' || name === 'createRouter';
}

function routesPropertyOf(options: t.ObjectExpression): t.Expression | null {
  const routesProp = options.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) &&
      !p.computed &&
      t.isIdentifier(p.key, { name: 'routes' }),
  );
  if (!routesProp) return null;
  return routesProp.value as t.Expression;
}

function exportName(node: t.Identifier | t.StringLiteral): string {
  return node.type === 'StringLiteral' ? node.value : node.name;
}

function lineOf(path: { node: t.Node }): number {
  return (path.node.loc?.start?.line ?? 0) || 0;
}

function objName(node: t.Node | null | undefined): string {
  if (!node) return '';
  if (t.isIdentifier(node)) return node.name;
  if (t.isThisExpression(node)) return 'this';
  return '';
}

function idOf(node: t.Node | null | undefined): string | undefined {
  if (!node) return undefined;
  if (t.isIdentifier(node)) return node.name;
  return undefined;
}

function specifierFromRequireArgs(args: readonly t.Node[]): string | null {
  if (args.length === 0) return null;
  const first = args[0];
  if (t.isStringLiteral(first)) return first.value;
  // require(['./a.vue'], resolve) —— Vue 2 异步组件写法
  if (t.isArrayExpression(first)) {
    const el = first.elements[0];
    if (el && t.isStringLiteral(el)) return el.value;
  }
  return null;
}

function specifierFromCall(
  node: t.Node,
): { specifier: string; isDynamic: boolean } | null {
  if (t.isCallExpression(node)) {
    if (t.isIdentifier(node.callee, { name: 'require' })) {
      const s = specifierFromRequireArgs(node.arguments);
      return s ? { specifier: s, isDynamic: false } : null;
    }
    if (t.isImport(node.callee)) {
      const s = specifierFromRequireArgs(node.arguments);
      return s ? { specifier: s, isDynamic: true } : null;
    }
  }
  // const X = () => import('...')
  if (t.isArrowFunctionExpression(node) && t.isCallExpression(node.body)) {
    return specifierFromCall(node.body);
  }
  return null;
}

export function routeSourceFromExpr(node: t.Node | null | undefined): RouteSource {
  if (!node) return { type: 'unknown' };
  if (t.isArrayExpression(node)) {
    return { type: 'array', routes: routesFromArrayExpression(node) };
  }
  if (t.isIdentifier(node)) return { type: 'identifier', name: node.name };
  if (t.isObjectExpression(node)) return { type: 'object', route: parseRouteObject(node) };
  if (t.isCallExpression(node)) {
    const cc = routesFromConcat(node);
    if (cc.length > 0) return { type: 'array', routes: cc };
    const name = t.isIdentifier(node.callee) ? node.callee.name : t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.object) ? node.callee.object.name : '';
    return { type: 'call', name };
  }
  return { type: 'unknown', text: codeSnippet(node) };
}

function codeSnippet(node: t.Node): string {
  try {
    const start = node.start ?? 0;
    return '…';
  } catch {
    return '…';
  }
}

/** 数组元素 -> 路由条目：对象 / spread（...imported）/ 路由对象变量引用 */
function routesFromArrayExpression(node: t.ArrayExpression): RawRoute[] {
  const out: RawRoute[] = [];
  for (const el of node.elements) {
    if (!el) continue;
    if (t.isSpreadElement(el)) {
      if (t.isIdentifier(el.argument)) {
        out.push({ spreadFrom: el.argument.name, line: el.loc?.start?.line ?? 0 });
      } else {
        out.push({ spreadDynamic: true, line: el.loc?.start?.line ?? 0 });
      }
    } else if (t.isObjectExpression(el)) {
      out.push(parseRouteObject(el));
    } else if (t.isIdentifier(el)) {
      out.push({ routeRef: el.name, line: el.loc?.start?.line ?? 0 });
    } else {
      out.push({ spreadDynamic: true, line: el.loc?.start?.line ?? 0 });
    }
  }
  return out;
}

/** X.concat(Y, ...) / [...a, ...b] 形式的拼接：合并为条目列表（标识符按引用处理） */
function routesFromConcat(node: t.CallExpression): RawRoute[] {
  const callee = node.callee;
  if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property, { name: 'concat' })) {
    return [];
  }
  const out: RawRoute[] = [];
  const pushPart = (n: t.Node | null | undefined) => {
    if (!n) return;
    if (t.isArrayExpression(n)) out.push(...routesFromArrayExpression(n));
    else if (t.isIdentifier(n)) out.push({ spreadFrom: n.name });
    else out.push({ spreadDynamic: true });
  };
  pushPart(callee.object);
  for (const a of node.arguments) {
    if (t.isSpreadElement(a)) pushPart(a.argument);
    else pushPart(a);
  }
  return out;
}

export function parseRouteObject(node: t.ObjectExpression): RawRoute {
  const route: RawRoute = { line: node.loc?.start?.line ?? 0 };
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop) || prop.computed || !t.isIdentifier(prop.key)) continue;
    const key = prop.key.name;
    if (key === 'path') {
      const p = staticString(prop.value);
      if (p !== null) route.path = p;
    } else if (key === 'name') {
      const n = staticString(prop.value);
      if (n !== null) route.name = n;
    } else if (key === 'component') {
      route.component = componentRefFromExpr(prop.value as t.Expression);
    } else if (key === 'children') {
      if (t.isArrayExpression(prop.value)) {
        route.children = routesFromArrayExpression(prop.value);
      } else if (t.isIdentifier(prop.value)) {
        // children: routesVar —— 视为展开引用
        route.children = [{ spreadFrom: prop.value.name }];
      } else if (t.isCallExpression(prop.value)) {
        const cc = routesFromConcat(prop.value);
        route.children = cc.length > 0 ? cc : [{ spreadDynamic: true }];
      } else {
        route.children = [{ spreadDynamic: true }];
      }
    } else if (key === 'meta') {
      // HUI 等框架风格：{ path, meta: { title, component } }
      if (t.isObjectExpression(prop.value)) {
        for (const mp of prop.value.properties) {
          if (!t.isObjectProperty(mp) || mp.computed || !t.isIdentifier(mp.key, { name: 'component' })) continue;
          if (!route.component) route.component = componentRefFromExpr(mp.value as t.Expression);
        }
      }
    }
  }
  return route;
}

function routeFromArgs(args: readonly t.Node[]): RawRoute {
  // addRoute('/x', Component)
  const route: RawRoute = {};
  const p = staticString(args[0] ?? t.nullLiteral());
  if (p !== null) route.path = p;
  if (args[1]) route.component = componentRefFromExpr(args[1] as t.Expression);
  return route;
}

function staticString(node: t.Node): string | null {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) return node.quasis[0].value.cooked ?? null;
  return null;
}

export function componentRefFromExpr(node: t.Expression | null | undefined): RouteComponentRef {
  if (!node) return { type: 'missing' };
  if (t.isIdentifier(node)) return { type: 'identifier', name: node.name };
  if (t.isStringLiteral(node)) return { type: 'import', specifier: node.value };
  // () => import('@/views/User.vue')
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    const body = node.body;
    if (t.isCallExpression(body)) {
      const spec = specifierFromCall(body);
      if (spec) return { type: 'import', specifier: spec.specifier };
    }
  }
  if (t.isCallExpression(node)) {
    const spec = specifierFromCall(node);
    if (spec) return { type: 'import', specifier: spec.specifier };
  }
  if (t.isObjectExpression(node)) return { type: 'inline', text: '{…}' };
  return { type: 'inline', text: codeSnippet(node) };
}
