'use strict';

const path = require('path');
const fs = require('fs');
const { loadTsconfigAliases } = require('./loaders/tsconfigLoader');
const { loadJsConfigAliases } = require('./loaders/jsConfigLoader');
const logger = require('../utils/logger');

/** @typedef {import('../types').AliasRule} AliasRule */

// 构建配置在前（运行时权威），ts/js 配置在后；同名前缀保留先出现者。
const JS_CONFIG_FILES = [
  'vite.config.js',
  'vite.config.ts',
  'vite.config.mjs',
  'webpack.config.js',
  'webpack.common.js',
  'build/webpack.base.conf.js',
  'config/webpack.common.js',
  'vue.config.js',
];
const TS_CONFIG_FILES = ['tsconfig.json', 'jsconfig.json'];

/** @type {Map<string, AliasRule[]>} */
const cache = new Map();

/**
 * 汇总一个项目根下所有别名来源，产出「按前缀长度降序」的统一规则表（带缓存）。
 *
 * 解决旧实现的问题：只认 tsconfig/jsconfig、用正则读 JSON、只匹配 @ 前缀
 * （分析问题 #4）；且每个路由都重复读盘（问题 #3）——现在整根只算一次。
 *
 * @param {string} projectRoot
 * @returns {AliasRule[]}
 */
function getAliasRules(projectRoot) {
  const cached = cache.get(projectRoot);
  if (cached) return cached;

  /** @type {AliasRule[]} */
  const collected = [];

  for (const rel of JS_CONFIG_FILES) {
    const file = path.join(projectRoot, rel);
    if (fs.existsSync(file)) collected.push(...loadJsConfigAliases(file));
  }
  for (const rel of TS_CONFIG_FILES) {
    const file = path.join(projectRoot, rel);
    if (fs.existsSync(file)) collected.push(...loadTsconfigAliases(file));
  }

  // 兜底：@ / ~ -> src（仅当配置里没定义且 src 存在）。
  const srcDir = path.join(projectRoot, 'src');
  if (fs.existsSync(srcDir)) {
    for (const alias of ['@', '~']) {
      if (!collected.some((r) => r.prefix === alias)) {
        collected.push({ prefix: alias, targetDir: srcDir, source: 'fallback' });
      }
    }
  }

  // 同前缀去重（保留先出现者），再按前缀长度降序，保证长前缀先匹配。
  const seen = new Set();
  /** @type {AliasRule[]} */
  const rules = [];
  for (const rule of collected) {
    if (seen.has(rule.prefix)) continue;
    seen.add(rule.prefix);
    rules.push(rule);
  }
  rules.sort((a, b) => b.prefix.length - a.prefix.length);

  logger.debug(`别名规则(${projectRoot}): ${rules.map((r) => r.prefix).join(', ')}`);
  cache.set(projectRoot, rules);
  return rules;
}

/**
 * 清理缓存（配置文件变更时由 watcher 调用）。
 * @param {string} [projectRoot] 不传则清全部
 */
function clearCache(projectRoot) {
  if (projectRoot) cache.delete(projectRoot);
  else cache.clear();
}

module.exports = { getAliasRules, clearCache };
