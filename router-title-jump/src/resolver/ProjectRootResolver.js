'use strict';

const path = require('path');
const fs = require('fs');

/**
 * 项目根解析：从某文件向上找最近含 package.json 的目录。带缓存，避免旧实现里
 * 「每个路由都重新向上遍历磁盘」的冗余 I/O（分析问题 #3）。
 */

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * @param {string} startPath 起始文件绝对路径
 * @returns {string} 项目根目录
 */
function findProjectRoot(startPath) {
  const startDir = path.dirname(startPath);
  const cached = cache.get(startDir);
  if (cached) return cached;

  const root = path.parse(startDir).root;
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      cache.set(startDir, dir);
      return dir;
    }
    if (dir === root) break;
    dir = path.dirname(dir);
  }

  // 找不到时退回起始目录，保持行为可预期。
  cache.set(startDir, startDir);
  return startDir;
}

function clearCache() {
  cache.clear();
}

module.exports = { findProjectRoot, clearCache };
