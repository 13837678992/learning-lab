import base from '@fmac/eslint-config';

/**
 * 根 ESLint 配置（扁平配置 / Flat Config）。
 *
 * 统一规则来源：@fmac/eslint-config（位于 configs/eslint-config）。
 * 各 app / package 如需扩展，请 import 该共享配置后再追加，禁止各自另立规则。
 */
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
  ...base,
];
