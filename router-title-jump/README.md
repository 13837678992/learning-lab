# 路由标题跳转（Router Title Jump）

面向大型 Vue2 / Vue3 项目的 VS Code 插件：输入 **中文 / 拼音 / 首字母 / 路径 / 文件名**，
快速跳转到路由对应的页面文件。解析全部基于 AST，别名自动识别，无需手动配置项目路径。

## 使用

1. 按 `Ctrl+Alt+P`（Windows / Linux）或 `Cmd+Alt+P`（macOS）
2. 输入关键词搜索，例如：
   - 中文：`产品`、`用户管理`
   - 拼音全拼：`chanpin`、`baoxian`
   - 首字母：`cp`、`bxcp`
   - 路径 / 文件名：`/home`、`login`、`product`
3. 回车打开对应页面组件

## 支持的 Router 写法

基于 `@babel/parser` 的 AST 解析，兼容：

- Vue3 `createRouter({ routes })`、Vue2 `new Router` / `new VueRouter`
- `export default [...]` / `export default routes` / `export const routes` / `module.exports = [...]`
- `children` 递归、`meta.title` 与直接 `title`、`redirect`
- 懒加载 `() => import('@/x.vue')`、Vue2 `resolve => require(['./x.vue'], resolve)`、普通 `require`
- 静态引入 `component: Home`（`import Home from '@/x.vue'`）
- `import.meta.glob` / `require.context`（已识别）
- TypeScript 语法（类型注解、`as` 断言）

## 别名自动解析

自动读取并合并以下配置，无需手动填项目路径：

`vite.config.*` · `webpack*.js` · `vue.config.js` · `tsconfig.json` · `jsconfig.json`
（支持 `resolve.alias`、`paths` + `baseUrl` + `extends`，以及 `@` `~` `src` 等前缀）。

会自动补 `.vue` / `.js` / `.ts` / `.jsx` / `.tsx` 与 `index.*`，跨 Windows / macOS / Linux。

## 配置

- `routerJump.routerGlobs`：router 文件扫描 glob
- `routerJump.exclude`：排除目录

## 开发

```bash
npm install
npm run check      # lint + typecheck + test（61 用例）
npm run watch      # esbuild 监听（配合 F5 调试）
npm run build      # 生产打包到 dist/
npm run bench 3000 # 性能基准
```

按 `F5` 启动 Extension Development Host，在新窗口打开前端项目后测试。

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构与工作流
- [CHANGELOG.md](./CHANGELOG.md) — 变更记录
- [TEST_REPORT.md](./TEST_REPORT.md) — 测试报告
- [PERFORMANCE.md](./PERFORMANCE.md) — 性能报告
