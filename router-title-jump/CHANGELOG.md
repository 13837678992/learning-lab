# Changelog

本项目遵循语义化版本。

## [1.0.0] — 企业级重构

一次面向大型 Vue2/Vue3 项目的全面重构：解析全部基于 AST、别名自动解析、
拼音/路径/组件多维搜索、增量索引与文件监听，并补齐测试、类型检查、打包与文档。
**命令 id、快捷键、配置键保持不变，向下兼容。**

### ✨ 新增功能

- **AST 路由解析（插件化）**：以 `@babel/parser` + `@babel/traverse` 取代正则，
  兼容 Vue3 `createRouter`、Vue2 `new Router`/`new VueRouter`、`export default`、
  `module.exports`、`export const routes`、`children` 递归、`meta.title`、`redirect`、
  懒加载 `import()`、`resolve => require([...])`、普通 `require`、静态 `component` 标识符、
  `import.meta.glob`、`require.context`、TypeScript 语法。
- **别名自动解析**：聚合 `vite.config.*` / `webpack*.js` / `vue.config.js` /
  `tsconfig.json` / `jsconfig.json`（含 `extends`、`baseUrl`、`paths`），静态求值
  `path.resolve(__dirname,…)`、`fileURLToPath(new URL(…))` 等目标写法。**无需手动配置项目路径**。
- **智能搜索**：中文 / 全拼 / 首字母 / Router Path / 组件路径 / 文件名 / 多词 AND，
  分档评分排序（title 完全 > 前缀 > 包含 > 全拼 > 首字母 > 路径 > 文件名 > 组件）。
- **拼音索引**：建索引时用 `pinyin-pro` 预生成全拼/首字母/音节，搜索零转换。
- **增量索引 + 文件监听**：`FileSystemWatcher` 监听路由/配置/组件文件，按文件增量更新，
  mtime 缓存跳过未变文件。
- **QuickPick 体验**：`alwaysShow` 关闭内置 label 过滤，改由搜索引擎完全掌控候选与排序，
  修复「输入拼音被内置过滤隐藏」。

### ⚡ 性能

- 首次扫描惰性触发（激活零开销）；1000 路由约 75ms、3000 路由约 150ms（一次性、可缓存）。
- 搜索 3000 路由级仍 < 2ms（目标 100ms）。
- 增量更新单文件约 2–3ms。
- 移除旧 `findFiles` 200 条上限；别名/项目根解析改为整根一次并缓存（原为每路由重复读盘）。

详见 `PERFORMANCE.md`。

### ♻️ 重构

- 单文件 463 行 → 31 个高内聚模块（总 ~2280 行），`extension.js` 降到 61 行（仅装配接线）。
- 彻底解开旧 `parseRouterFile` 的「解析 + 解析路径 + 建索引 + 组装」四合一耦合。
- 解析层插件化（`parser/plugins` + `parser/extractors`）、别名来源可扩展（`resolver/loaders`），
  遵循开闭原则：新增框架/构建工具只加文件，不改既有代码。

### 🧪 质量

- 引入 `node:test`（61 用例全绿）、ESLint 扁平配置、`tsc --checkJs` 类型检查、esbuild 打包。
- 详见 `TEST_REPORT.md` 与 `ARCHITECTURE.md`。

### 🔧 涉及文件与原因

| 文件 | 变更 | 原因 |
|---|---|---|
| `extension.js`（根） | 删除 | 由 `src/extension.js` + 分层模块取代 |
| `src/**`（新增 31 模块） | 新增 | 分层实现解析/解析/索引/搜索/监听/UI |
| `package.json` | 改 | 加 babel 依赖、脚本、`main` 指向打包产物；vsce 移入 devDeps；版本 1.0.0 |
| `esbuild.js` / `tsconfig.json` / `eslint.config.js` | 新增 | 打包 / 类型检查 / lint |
| `tests/**` / `scripts/bench.js` | 新增 | 单元与集成测试、性能基准 |
| `.vscode/tasks.json` / `launch.json` | 改 | F5 调试挂 esbuild watch |
| `.vscodeignore` / `README.md` | 改 | 发布裁剪 / 文档更新 |

### ⚠️ 已知范围

- `import.meta.glob` / `require.context` 已被解析识别，但**尚未展开为逐文件可搜索条目**
  （宿主 Node 版本差异下的文件系统 glob 展开留待后续迭代）。
- 组件文件监听仅响应 create/delete（忽略编辑期 change），批量增删防抖后于下次打开生效。
