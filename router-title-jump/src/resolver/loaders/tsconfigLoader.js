'use strict';

const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

/** @typedef {import('../../types').AliasRule} AliasRule */

/**
 * 容错解析 JSONC：去掉 // 与 /* *\/ 注释、尾逗号，再 JSON.parse。
 * 正则先「吞掉」字符串字面量，避免误删字符串内的 // 。
 * @param {string} text
 * @returns {any}
 */
function parseJsonc(text) {
  const stripped = text.replace(
    /"(?:\\.|[^"\\])*"|(\/\/[^\n\r]*|\/\*[\s\S]*?\*\/)/g,
    (match, comment) => (comment ? '' : match)
  );
  const noTrailingComma = stripped.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(noTrailingComma);
}

/**
 * 解析 extends 指向的父配置路径。
 * @param {string} ext
 * @param {string} dir
 * @returns {string | null}
 */
function resolveExtends(ext, dir) {
  let target = ext.startsWith('.')
    ? path.resolve(dir, ext)
    : path.resolve(dir, 'node_modules', ext);
  if (!target.endsWith('.json')) {
    if (fs.existsSync(`${target}.json`)) target = `${target}.json`;
    else if (fs.existsSync(path.join(target, 'tsconfig.json'))) {
      target = path.join(target, 'tsconfig.json');
    }
  }
  return fs.existsSync(target) ? target : null;
}

/**
 * 读取 tsconfig/jsconfig 的 baseUrl + paths（含 extends 有限递归），转成别名规则。
 * @param {string} filePath
 * @param {number} [depth]
 * @returns {AliasRule[]}
 */
function loadTsconfigAliases(filePath, depth = 0) {
  if (depth > 5) return [];
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  let json;
  try {
    json = parseJsonc(raw);
  } catch (err) {
    logger.error(`tsconfig 解析失败 ${filePath}`, err);
    return [];
  }

  const dir = path.dirname(filePath);
  /** @type {AliasRule[]} */
  let rules = [];

  // 先并入父配置（子配置优先，稍后 AliasResolver 去重时保留先出现者）。
  if (typeof json.extends === 'string') {
    const parent = resolveExtends(json.extends, dir);
    if (parent) rules = loadTsconfigAliases(parent, depth + 1);
  }

  const compilerOptions = json.compilerOptions || {};
  const baseUrl = compilerOptions.baseUrl
    ? path.resolve(dir, compilerOptions.baseUrl)
    : dir;
  const paths = compilerOptions.paths || {};

  /** @type {AliasRule[]} */
  const own = [];
  for (const key of Object.keys(paths)) {
    const targets = paths[key];
    if (!Array.isArray(targets) || targets.length === 0) continue;
    const prefix = key.replace(/\/\*$/, '');
    const targetRaw = String(targets[0]).replace(/\/\*$/, '');
    own.push({
      prefix,
      targetDir: path.resolve(baseUrl, targetRaw),
      source: filePath,
    });
  }

  // 自身规则在前，父配置在后。
  return [...own, ...rules];
}

module.exports = { loadTsconfigAliases, parseJsonc };
