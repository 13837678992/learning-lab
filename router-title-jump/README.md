# 路由标题跳转（Router Title Jump）

面向大型 Vue2 / Vue3 项目的 VS Code 插件：输入 **中文 / 拼音 / 首字母 / 路径 / 文件名**，快速跳转到路由对应的页面文件。解析全部基于 AST，别名自动识别，无需手动配置项目路径。

## 功能特性

- **多维度搜索** — 中文标题、拼音全拼、首字母缩写、路由路径、文件名、组件路径，一个输入框全覆盖
- **多词 AND 搜索** — 输入 `yonghu guanli` 同时匹配"用户"和"管理"，精确定位深层菜单
- **17 级加权排序** — 标题精确匹配 > 拼音匹配 > 路径匹配 > 包含匹配，结果始终符合直觉
- **AST 解析** — 基于 `@babel/parser`，兼容 Vue2 / Vue3 各种路由写法（详见下方）
- **别名零配置** — 自动读取 vite / webpack / tsconfig / jsconfig 中的 alias 配置，无需手动填写
- **增量更新** — 文件监听器实时感知路由文件与配置变更，2-3ms 完成增量刷新
- **极致性能** — 3000 条路由首次扫描 ~150ms，搜索 <2ms，零感延迟

## 使用

1. 按 `Ctrl+Alt+P`（Windows / Linux）或 `Cmd+Alt+P`（macOS）
2. 输入关键词搜索，例如：

   | 搜索方式 | 示例 |
   | --- | --- |
   | 中文标题 | `产品`、`用户管理` |
   | 拼音全拼 | `chanpin`、`baoxian` |
   | 首字母 | `cp`、`bxcp` |
   | 路由路径 | `/home`、`/login` |
   | 文件名 | `login`、`product` |
   | 多词组合 | `yonghu guanli` |

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

支持 `resolve.alias`（对象与数组形式）、`paths` + `baseUrl` + `extends`，以及 `@` `~` `src` 等前缀。会自动补 `.vue` / `.js` / `.ts` / `.jsx` / `.tsx` 与 `index.*`，跨 Windows / macOS / Linux。

## 性能

| 规模 | 首次扫描 | 搜索 | 增量更新 |
| --- | --- | --- | --- |
| 1000 条路由 | ~75ms | <1ms | 2-3ms |
| 3000 条路由 | ~150ms | <2ms | 2-3ms |

- 懒激活：首次打开命令面板时才扫描，插件激活零开销
- mtime 缓存：未修改文件跳过解析
- 拼音预计算：索引时一次性生成，搜索时无转换开销
- 倒排索引：多词 AND 查询直接取交集，无需全量遍历

## 配置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `routerJump.routerGlobs` | `**/router/**/*.{js,ts,jsx,tsx}` 等 | 路由文件扫描 glob |
| `routerJump.exclude` | `**/{node_modules,dist,build,out,.git}/**` | 排除路径 |

## 开发

```bash
npm install
npm run check      # lint + typecheck + test（61 用例）
npm run watch      # esbuild 监听（配合 F5 调试）
npm run build      # 生产打包到 dist/
npm run bench 3000 # 性能基准（生成 3000 条路由的合成项目）
npm run package    # 打包 .vsix
```

按 `F5` 启动 Extension Development Host，在新窗口打开前端项目后测试。

## 架构

```
extension.js（入口，仅组装）
  ├── config/        配置读取
  ├── parser/        AST 解析（插件架构：vue2 / vue3 / export / glob）
  │   ├── plugins/     路由来源识别
  │   └── extractors/  字段提取（title / component / redirect）
  ├── resolver/      别名解析（vite / webpack / tsconfig 自动合并）
  ├── index/         索引构建（拼音、倒排索引、增量更新）
  ├── search/        搜索引擎（17 级加权排序）
  ├── services/      VS Code 适配（扫描、跳转）
  ├── providers/     QuickPick UI
  ├── watcher/       文件监听
  └── cache/         mtime 缓存
```

纯逻辑层（parser / resolver / index / search）不依赖 `vscode` 模块，可独立测试。

## 文档

仓库内含：`ARCHITECTURE.md`（架构与工作流）、`CHANGELOG.md`（变更记录）、`TEST_REPORT.md`（测试报告）、`PERFORMANCE.md`（性能报告）。

## License

MIT
