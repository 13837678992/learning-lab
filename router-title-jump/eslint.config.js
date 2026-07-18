'use strict';

/**
 * ESLint 扁平配置（ESLint 10）。
 * - 源码 src/ 走 recommended + 少量强约束（prefer-const / eqeqeq）。
 * - 忽略产物 dist/、依赖 node_modules/、测试样例 tests/fixtures/（样例故意写各种奇怪写法）。
 * - 迁移期间忽略根目录旧 extension.js，接线完成后删除。
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'tests/fixtures/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
    },
  },
];
