import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * FMAC Front 统一 ESLint 基线配置。
 *
 * 设计原则：
 * - 框架无关：不绑定 Vue / React / ElementUI，框架相关规则由具体 app 自行叠加。
 * - 只约束代码质量，格式交给 Prettier（末尾 prettier 关闭所有风格类规则）。
 * - 统一 ES Module。
 */
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  // 关闭与 Prettier 冲突的格式类规则，必须放在最后。
  prettier,
];
