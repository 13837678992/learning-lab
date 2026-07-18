'use strict';

/**
 * AST 节点操作工具集（与具体 Router 写法无关，可被所有插件/提取器复用）。
 * 节点一律按 any 处理，见 types.d.ts 说明。
 */

/** @typedef {any} Node */

// 需要「透过」的包装类型：TS 断言、非空断言、括号表达式等。
const UNWRAP_TYPES = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'ParenthesizedExpression',
]);

/**
 * 剥离 TS 断言 / 括号包装，取内层真实表达式。
 * @param {Node} node
 * @returns {Node | null}
 */
function unwrapExpr(node) {
  let n = node;
  while (n && UNWRAP_TYPES.has(n.type)) {
    n = n.expression;
  }
  return n || null;
}

/**
 * 若节点是箭头/函数，取其返回表达式；否则原样返回。
 * 处理 `() => import('x')`、`resolve => require([...], resolve)`、
 * `() => { return import('x') }` 等写法。
 * @param {Node} node
 * @returns {Node | null}
 */
function unwrapReturn(node) {
  const n = unwrapExpr(node);
  if (!n) return null;
  if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') {
    const body = n.body;
    if (body.type === 'BlockStatement') {
      const ret = body.body.find(
        (/** @type {any} */ s) => s.type === 'ReturnStatement'
      );
      return ret && ret.argument ? unwrapExpr(ret.argument) : null;
    }
    return unwrapExpr(body);
  }
  return n;
}

/**
 * 从 ObjectExpression 取指定 key 的属性节点（忽略计算属性）。
 * @param {Node} objExpr
 * @param {string} name
 * @returns {Node | null}
 */
function getProp(objExpr, name) {
  if (!objExpr || objExpr.type !== 'ObjectExpression') return null;
  for (const p of objExpr.properties) {
    if ((p.type !== 'ObjectProperty' && p.type !== 'Property') || p.computed) {
      continue;
    }
    const k = p.key;
    const keyName =
      k.type === 'Identifier'
        ? k.name
        : k.type === 'StringLiteral'
          ? k.value
          : k.type === 'NumericLiteral'
            ? String(k.value)
            : null;
    if (keyName === name) return p;
  }
  return null;
}

/**
 * 取指定属性的值节点（已 unwrap）。
 * @param {Node} objExpr
 * @param {string} name
 * @returns {Node | null}
 */
function getPropValue(objExpr, name) {
  const p = getProp(objExpr, name);
  return p ? unwrapExpr(p.value) : null;
}

/**
 * 取字符串字面量或「无插值模板串」的值。
 * @param {Node} node
 * @returns {string | null}
 */
function getStringValue(node) {
  const n = unwrapExpr(node);
  if (!n) return null;
  if (n.type === 'StringLiteral') return n.value;
  if (
    n.type === 'TemplateLiteral' &&
    n.expressions.length === 0 &&
    n.quasis.length === 1
  ) {
    return n.quasis[0].value.cooked;
  }
  return null;
}

/**
 * 把「应当是路由数组」的节点解析为 ArrayExpression：
 * 支持数组字面量 / 标识符（查顶层绑定）/ 含 `routes` 属性的对象。
 * 带 seen 防止循环引用。
 * @param {Node} node
 * @param {Map<string, Node>} bindings
 * @param {Set<string>} [seen]
 * @returns {Node | null}
 */
function resolveToArray(node, bindings, seen = new Set()) {
  const n = unwrapExpr(node);
  if (!n) return null;
  if (n.type === 'ArrayExpression') return n;
  if (n.type === 'Identifier') {
    if (seen.has(n.name)) return null;
    seen.add(n.name);
    const init = bindings.get(n.name);
    return init ? resolveToArray(init, bindings, seen) : null;
  }
  if (n.type === 'ObjectExpression') {
    const routesVal = getPropValue(n, 'routes');
    return routesVal ? resolveToArray(routesVal, bindings, seen) : null;
  }
  return null;
}

/**
 * 收集模块顶层 const/let/var 及 export 变量声明：name -> init 节点。
 * 用于把 `new Router({ routes })` 里的 routes 标识符解析回其数组字面量。
 * @param {Node} program
 * @returns {Map<string, Node>}
 */
function buildBindings(program) {
  /** @type {Map<string, Node>} */
  const map = new Map();
  /** @param {Node} decl */
  const addDecl = (decl) => {
    for (const d of decl.declarations) {
      if (d.id.type === 'Identifier' && d.init) {
        map.set(d.id.name, unwrapExpr(d.init));
      }
    }
  };
  for (const stmt of program.body) {
    if (stmt.type === 'VariableDeclaration') {
      addDecl(stmt);
    } else if (
      stmt.type === 'ExportNamedDeclaration' &&
      stmt.declaration &&
      stmt.declaration.type === 'VariableDeclaration'
    ) {
      addDecl(stmt.declaration);
    }
  }
  return map;
}

/**
 * 收集 import 绑定：localName -> 模块说明符。
 * 用于解析 `component: Home` 这类静态引入的组件标识符。
 * @param {Node} program
 * @returns {Map<string, string>}
 */
function buildImportMap(program) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const stmt of program.body) {
    if (stmt.type === 'ImportDeclaration') {
      const src = stmt.source.value;
      for (const spec of stmt.specifiers) {
        map.set(spec.local.name, src);
      }
    }
  }
  return map;
}

module.exports = {
  unwrapExpr,
  unwrapReturn,
  getProp,
  getPropValue,
  getStringValue,
  resolveToArray,
  buildBindings,
  buildImportMap,
};
