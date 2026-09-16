import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * 自动从 vue.config.js / webpack.config.js / jsconfig.json / tsconfig.json 读取 alias。
 * 不要求用户任何手动配置。
 */
export function loadAliases(projectRoot: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const name of ['vue.config.js', 'vue.config.cjs', 'webpack.config.js', 'webpack.config.cjs']) {
    const file = path.join(projectRoot, name);
    if (!fs.existsSync(file)) continue;
    collectFromJsConfig(file, aliases);
  }
  for (const name of ['jsconfig.json', 'tsconfig.json']) {
    const file = path.join(projectRoot, name);
    if (!fs.existsSync(file)) continue;
    collectFromTsConfig(file, projectRoot, aliases);
  }
  return aliases;
}

function addAlias(aliases: Map<string, string>, key: string, value: string) {
  const k = key.replace(/\/\*$/, '');
  if (!k || k.includes('*')) return;
  if (!aliases.has(k)) aliases.set(k, path.normalize(value));
}

function collectFromJsConfig(file: string, aliases: Map<string, string>) {
  let code: string;
  try {
    code = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch {
    return;
  }
  const configDir = path.dirname(file);
  traverse(ast, {
    ObjectProperty(p) {
      if (t.isObjectProperty(p.node) && !p.node.computed && t.isIdentifier(p.node.key, { name: 'alias' })) {
        const obj = p.node.value;
        if (!t.isObjectExpression(obj)) return;
        for (const prop of obj.properties) {
          if (!t.isObjectProperty(prop) || prop.computed) continue;
          const keyNode = prop.key;
          const key = t.isIdentifier(keyNode) ? keyNode.name : t.isStringLiteral(keyNode) ? keyNode.value : null;
          if (!key) continue;
          const value = evaluatePathExpr(prop.value as t.Expression, configDir);
          if (value) addAlias(aliases, key, value);
        }
      }
    },
  });
}

function collectFromTsConfig(file: string, projectRoot: string, aliases: Map<string, string>) {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  let cfg: any;
  try {
    cfg = JSON.parse(stripJsonComments(raw));
  } catch {
    return;
  }
  const co = cfg?.compilerOptions;
  if (!co || typeof co !== 'object') return;
  const paths: Record<string, string[]> = co.paths;
  if (!paths || typeof paths !== 'object') return;
  const baseUrl = typeof co.baseUrl === 'string' ? co.baseUrl : '.';
  const configDir = path.dirname(file);
  const base = path.isAbsolute(baseUrl) ? baseUrl : path.resolve(projectRoot, baseUrl);
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0 || typeof targets[0] !== 'string') continue;
    if (!pattern.endsWith('/*')) continue;
    const target = targets[0].replace(/\/\*$/, '');
    const value = path.isAbsolute(target) ? target : path.resolve(base, target);
    addAlias(aliases, pattern, value);
  }
}

function stripJsonComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1');
}

/**
 * 安全求值 webpack 配置里的路径表达式（绝不使用 eval）：
 * 支持字符串、__dirname、path.resolve/join、new URL('./x', import.meta.url)、fileURLToPath(...)
 */
function evaluatePathExpr(node: t.Expression, configDir: string): string | null {
  if (t.isStringLiteral(node)) return path.resolve(configDir, node.value);
  if (t.isIdentifier(node, { name: '__dirname' })) return configDir;
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return path.resolve(configDir, node.quasis[0].value.cooked ?? '');
  }
  if (t.isCallExpression(node)) {
    const callee = node.callee;
    // path.resolve(__dirname, 'src') / path.join(...)
    if (t.isMemberExpression(callee) && !callee.computed) {
      if (t.isIdentifier(callee.object, { name: 'path' }) && t.isIdentifier(callee.property)) {
        const fn = callee.property.name;
        if (fn === 'resolve' || fn === 'join') {
          const parts: string[] = [];
          for (const arg of node.arguments) {
            if (t.isSpreadElement(arg)) return null;
            const v = evaluatePathExpr(arg as t.Expression, configDir);
            if (v === null) return null;
            parts.push(v);
          }
          if (parts.length === 0) return null;
          return fn === 'resolve' ? path.resolve(...parts) : path.join(...parts);
        }
      }
    }
    // fileURLToPath(new URL('./src', import.meta.url))
    if (t.isIdentifier(callee, { name: 'fileURLToPath' }) && node.arguments.length === 1) {
      return evaluatePathExpr(node.arguments[0] as t.Expression, configDir);
    }
  }
  // new URL('./src', import.meta.url)
  if (t.isNewExpression(node) && t.isIdentifier(node.callee, { name: 'URL' })) {
    const first = node.arguments[0];
    if (first && t.isStringLiteral(first)) {
      return path.resolve(configDir, first.value);
    }
  }
  return null;
}

export const DEFAULT_EXTENSIONS = ['.vue', '.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs'];
