// .eslintrc.js
module.exports = {
  root: true, // 必须放在最顶部，标识根目录配置
  env: {
    node: true,
    browser: true, // 新增：适配浏览器环境（Vue 项目必备）
  },
  extends: [
    'plugin:vue/essential', // Vue 2 基础规则
    'eslint:recommended', // ESLint 推荐规则
  ],
  parserOptions: {
    parser: '@babel/eslint-parser', // 适配 Babel 7
    sourceType: 'module', // 新增：支持 ES 模块
    ecmaVersion: 2020, // 新增：适配 ES2020 语法
  },
  rules: {
    // 基础规则（按需调整）
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // 解决之前的报错规则
    'vue/multi-word-component-names': 'off', // 禁用组件名多单词规则
    'no-import-assign': 'off', // 禁用修改导入模块规则
  },
}
