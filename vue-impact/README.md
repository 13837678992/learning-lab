# Vue Impact Analyzer

> Vue 项目的 **路由级代码影响分析工具**：分析一个文件 / 符号 / 搜索结果最终影响了哪些 Vue Router 页面，输出建议的回归测试范围。

```
Vue Impact Core（分析引擎）
        │
        ├── CLI（vue-impact 命令）
        │
        └── VS Code Extension（Vue Impact 插件）
```

## 核心价值

修改了 `src/components/CommonTable.vue`，到底要回归测试哪些页面？

```
目标代码
   ↓ 反向依赖
组件
   ↓
Layout
   ↓
Page
   ↓
Router
   ↓
最终页面（回归测试范围）
```

```
Vue Impact

目标文件
────────────────────────
src/components/CommonTable.vue

依赖分析
────────────────────────
直接引用：2
间接引用：6
影响组件：7

影响路由
────────────────────────
/order
/system/user
/user
/user/list

────────────────────────
共 4 个路由页面
```

与普通 "Find References" 的区别：本工具不输出"引用它的文件"，而是输出**最终受影响的路由页面**。

## 目录结构

```
vue-impact/
├── packages/
│   ├── core/          # vue-impact-core：AST 解析、Router 自动发现、依赖图、影响分析
│   ├── cli/           # vue-impact-cli：命令行工具
│   └── vscode/        # vscode-vue-impact：VS Code 扩展（命令 / TreeView / Webview）
├── tests/
│   ├── fixtures/      # vue2-demo / vue3-demo / circular / dynamic-router-demo
│   └── *.test.js      # node:test 测试（26 个用例）
├── package.json       # npm workspaces monorepo
└── README.md
```

---

# 1. Windows 10 安装要求

优先支持环境（开发与运行均已验证兼容）：

| 组件 | 要求 |
| --- | --- |
| 操作系统 | Windows 10（同时兼容 macOS / Linux） |
| Node.js | **18 LTS**（推荐 18.19.x），兼容 20 LTS |
| npm | 随 Node.js 安装 |
| VS Code | 1.85+（插件侧） |

**不使用任何 Unix 命令作为运行依赖**。工具内部全部使用 Node.js API（`fs`、`path`）与纯 JS 依赖，运行时不依赖 `rm / grep / sed / awk / bash / WSL / Git Bash / Cygwin`。

# 2. Node.js 版本

- 最低要求：`Node.js >= 18`
- 推荐：`18.19.x`（Node 18 LTS）
- 不依赖 Node 22+ 特性（构建产物 target 为 `node18`）

# 3. 安装与构建（开发）

```powershell
cd vue-impact
npm install
npm run build      # 构建 core + cli + vscode
npm test           # 运行 26 个测试
npm run package    # 打包 VSIX
```

# 4. 插件安装（VSIX）

### 方式一：Install from VSIX

1. 生成 VSIX：`npm run package` → 根目录生成 `vue-impact-0.2.0.vsix`
2. VS Code → 扩展面板 → `...` → **Install from VSIX** → 选择该文件
3. 重启 / 重新加载窗口

### 方式二：命令行

```powershell
code --install-extension vue-impact-0.2.0.vsix
```

### 方式三：开发调试

```powershell
code packages/vscode
# F5 启动 Extension Development Host
```

# 5. CLI 使用

### 安装 vue-impact 命令

`vue-impact` 命令不会自动出现在 PATH 中，需要先安装（任选其一）：

```powershell
# 方式一：全局安装（推荐，之后在任意目录可用）
cd vue-impact\packages\cli
npm install -g .

# 方式二：npm link（开发模式，改代码后重新 build 即可生效）
cd vue-impact\packages\cli
npm link
```

若不想安装，也可以在仓库内直接使用（等价方式）：

```powershell
# 仓库根目录下：npm run cli
npm run cli -- src\utils\request.js --json

# 或 npx
npx vue-impact src\utils\request.js

# 或直接执行构建产物
node packages\cli\dist\cli.cjs src\utils\request.js
```

### 用法

```powershell
# 单个文件
vue-impact src\components\CommonTable.vue

# 多个文件（自动合并去重）
vue-impact src\utils\request.js src\utils\auth.js

# JSON 输出
vue-impact src\utils\request.js --json

# 详细输出（含影响链与警告）
vue-impact src\utils\request.js --verbose

# 指定项目根（默认自动发现）
vue-impact --project D:\my-vue-app src\components\A.vue

# 清除缓存
vue-impact --clear-cache
```

Windows 反斜杠路径与正斜杠路径均支持（内部统一 `path.resolve()`，绝不手工拼接分隔符）。

# 6. 当前文件分析（VS Code）

1. 打开任意文件（`.vue` / `.js` / `.ts` …）
2. 编辑器**右键** → `Vue Impact: 分析当前文件影响范围`
3. 或命令面板（`Ctrl+Shift+P`）执行同名命令
4. 或快捷键 **`Ctrl+Alt+I`**（可在 Keyboard Shortcuts 中修改）

结果展示在：

- **Webview 面板**：目标、影响页面、可展开的影响链、警告、按钮（复制测试范围 / 复制 Markdown / 导出 JSON / 重新分析）
- **资源管理器 TreeView（VUE IMPACT）**：当前分析 / 影响页面（可点击跳转）/ 分析链 / 警告

点击任何路由或文件直接跳转到源码（含行号定位）。

# 7. 搜索结果分析（VS Code）

1. `Ctrl+Shift+F` 搜索 `someGlobalMethod`（或直接在命令中输入）
2. 执行 `Vue Impact: 分析工作区搜索匹配`
3. 扩展自行执行工作区搜索（VS Code 公共 API `findFiles` + 读文件，**不依赖系统 grep**）
4. 所有命中文件聚合去重 → 反向分析 → 输出最终影响路由集合

```
搜索命中 17
   ↓
涉及文件 11
   ↓
依赖分析
   ↓
影响路由 8
```

# 8. 其他命令

| 命令 | 说明 |
| --- | --- |
| `Vue Impact: 分析当前文件影响范围` | 分析活动/右键文件 |
| `Vue Impact: 分析当前符号影响范围` | 光标处符号 → 所属文件 → 文件级影响分析 |
| `Vue Impact: 分析工作区搜索匹配` | 搜索 → 聚合 → 影响路由 |
| `Vue Impact: 重新分析` | 使用上次目标重新分析 |
| `Vue Impact: 清除缓存` | 删除 `.node-impact-cache/` 并重分析 |
| `Vue Impact: 复制测试范围` | 复制纯路径列表（每行一个路由） |
| `Vue Impact: 复制 Markdown` | 复制 Markdown 报告 |
| `Vue Impact: 导出 JSON` | 保存 JSON 报告 |
| `Vue Impact: 导出 Markdown` | 保存 Markdown 报告 |

# 9. Router 自动发现机制

**零配置**：不要求指定 router 文件、routes 文件或项目结构，不要求任何配置文件。

扫描项目源码（排除 `node_modules` / `dist` / `coverage` / `.git` 及 `.gitignore` 命中的目录），通过 **AST**（`@babel/parser` + `@babel/traverse`，禁止正则作为核心分析手段）识别：

```js
new Router({ routes })            // Vue 2
new VueRouter({ routes })         // Vue 2
createRouter({ routes })          // Vue 3
router.addRoutes([...])           // Vue 2 动态注册
router.addRoute('/x', Component)  // Vue 3 动态注册
```

并自动追踪：

- **routes 变量**：`const routes = [...]` → `new Router({ routes })`
- **跨文件 routes**：`import routes from './routes'` → 递归追踪 `export default` / `export const routes` / `module.exports`（防循环，深度限制 8）
- **Router 封装**：`const router = createAppRouter()` → 函数体内 `new Router({ routes })`
- **框架封装**：`initRouter()` 等来自 `node_modules` 时标记 `Framework Router` 警告，**不让整体分析失败**

不依赖文件名猜测（如 `router/index.js`），任何位置的 Router 创建都会被 AST 扫描发现。

# 10. Vue 2 支持（第一阶段最高优先级）

已验证支持：

- Vue 2.7.x + Vue CLI + Webpack 4 + Vue Router 3 + JavaScript
- `new Router({ routes })`、`import Router from 'vue-router'`
- 变量 component：`import User from '@/views/User.vue'` + `component: User`
- 动态 import：`component: () => import('@/views/User.vue')`
- Vue 2 异步组件：`component: resolve => require(['./a.vue'], resolve)`
- `router.addRoutes([...])`
- `.vue` 文件的 `<script>` 块提取使用 **@vue/compiler-sfc**（工具自带编译器，与目标项目的 Vue 版本无关，无兼容问题）

### HUI / 框架风格路由（已验证支持）

部分框架（如 HUI）把组件放在 `meta` 中，并通过子配置文件组织路由：

```js
// src/router/index.js —— 通过 ...子配置 展开引入
import reportRoutes from './modules/report'
import homeRoutes from './modules/home'

const routes = [
  ...homeRoutes,
  ...reportRoutes
]
const router = new Router({ routes })
```

```js
// src/router/modules/report.js —— component 在 meta 内
const report = {
  path: 'frontwms/report-manager',   // 无前导斜杠的 path 自动规范化为 /frontwms/report-manager
  meta: {
    title: '紫配覆盖率报表',
    component: () => import('@/views/reportmanager/PersonalDetailReport/index.vue')
  }
}
export default [report]
```

支持的路由组织方式：

| 写法 | 支持 |
| --- | --- |
| `routes: [...a, ...b]`（spread 子配置） | ✅ 跨文件追踪 export |
| `const x = {...}; routes: [x]`（路由对象变量） | ✅ 本文件 / import 均可 |
| `children: childRoutes`（children 为标识符） | ✅ 按展开引用追踪 |
| `routes = a.concat(b)` | ✅ |
| `meta: { title, component }` | ✅ 顶层 `component` 优先，其次 `meta.component` |

# 11. Vue 3 支持情况

架构不限制 Vue 3，已验证支持：

- `createRouter({ history, routes })`
- `<script setup>` SFC
- TypeScript（`.ts` / `.tsx` / `<script lang="ts">`）
- `router.addRoute(...)`
- `jsconfig.json` / `tsconfig.json` 的 `paths` alias（Vite 项目常见形态）

# 12. 模块解析能力

- `import A from './A.vue'`、`import { x } from '@/utils/test'`、`import * as Utils from '@/utils'`
- `const A = require('./A.vue')`、`require('@/utils/request')`
- `import('./A.vue')` 动态导入
- `export { A } from './A'`、`export * from './A'`
- 扩展名自动补全：`.vue / .js / .jsx / .ts / .tsx / .json / .mjs / .cjs`，目录 `index` 解析
- **Webpack alias 自动识别**：从 `vue.config.js` / `webpack.config.js` 读取 `resolve.alias`（安全求值 `path.resolve(__dirname, 'src')`，绝不使用 `eval`），从 `jsconfig.json` / `tsconfig.json` 读取 `compilerOptions.paths`
- 检测到 `@vue/cli-service` 自动理解 Vue CLI 项目并读取 `vue.config.js`

# 13. 影响分析语义

- **页面定义**：Router → Route → Component，或 Router → Layout → Page。普通组件（如 `components/CommonTable.vue`）不会被误判为页面。
- **children**：`{ path: '/system', children: [{ path: 'user' }] }` → `/system/user`（而非 `/user`）
- **Layout 传播**：目标文件被 Layout 引用时，该 Layout 下**所有子页面**均受影响
- **依赖链可解释**：每条受影响路由都附带 `路由 → 组件 → … → 目标文件` 的完整链路，回答"为什么这个页面受影响"
- **多目标合并**：`analyze([a.js, b.vue])` 自动 `Set` 去重
- **循环依赖**：BFS + visited 集合，A→B→C→A 不会死循环

# 14. 动态路由与动态 import 限制

静态分析无法确定的部分，**宁可标记不确定，绝不猜测**：

```js
const routes = getRoutesFromServer()   // ⚠️ 检测到动态路由，无法静态确定最终页面
import(`./views/${name}.vue`)           // ⚠️ 动态 import，无法静态确定具体文件
```

这些只会产生警告，不影响其他静态路由的分析结果。

# 15. 性能与缓存

- 缓存目录：**`.node-impact-cache/`**（项目根，仅写入该目录，不修改任何业务文件）
- 缓存内容：每个文件的解析结果（imports / router 用法 / exports），以 **mtime + size** 校验；文件未变化不重新解析
- 数据结构：`Map` / `Set`，反向 BFS，防循环
- 压缩产物（bundle/min.js）自动跳过解析
- 单个文件解析失败不影响整体分析（记录警告，继续输出已成功分析的结果）
- 适合 1000+ ~ 5000+ 源码文件的工程

# 16. 项目自动识别

- 启动后自动读取 `package.json` 检测 Vue 版本（vue / vue-router / @vue/cli-service）
- 分析范围默认当前 Workspace，不写死 `src/`（支持 `app/`、`packages/`、`frontend/` 等结构，通过 package.json 等定位项目根）
- 非 Vue 项目：显示"当前 Workspace 未检测到 Vue 项目"，不报错

# 17. 已知限制（第一阶段）

- 符号分析为文件级（符号 → 所属文件 → 文件级影响分析），函数调用图留待后续版本
- 运行时动态路由（服务端下发）无法静态确定
- 模板字符串动态 import（`import(\`./views/\${name}.vue\`)`）标记警告
- `import * as R from './routes'` 命名空间导入的成员无法静态追踪
- Monorepo 以当前 Workspace 单项目为第一优先级
- 全局注册组件（无 import 的 `Vue.component`）无法追踪
- 不修改业务项目：插件只读取和分析，缓存只写入 `.node-impact-cache/`

# 18. 测试

```powershell
npm test
```

- `tests/fixtures/vue2-demo`：模拟真实 Vue 2 + Vue CLI + Webpack 4 + Vue Router 3 项目，覆盖直接 component / 变量 component / 动态 import / children / Layout / 跨文件 routes / Router 封装 / alias。断言：分析 `CommonTable.vue` → `/user` `/user/list` `/order` `/system/user`，**不含** `/dashboard`
- `tests/fixtures/hui-style-demo`：HUI 风格路由——`meta.component`、`...子配置` 展开、路由对象变量、无前导斜杠 path、目录 `index.vue`。断言：共享组件被多个二级标签页 + 入口文件使用 → 全部路由命中
- `tests/fixtures/vue3-demo`：createRouter + jsconfig alias + script setup
- `tests/fixtures/circular`：A→B→C→A 循环依赖不死循环
- `tests/fixtures/dynamic-router-demo`：动态路由警告 + 静态 addRoutes 仍被提取

# 19. 架构分层

- **`vue-impact-core`**：文件扫描 → AST 解析 → 模块解析 → 依赖图 → Router 自动发现 → 反向影响分析 → 结构化结果。与 UI 完全解耦，可独立被 CLI / VS Code / CI 使用。
- **`vue-impact-cli`**：参数解析 + 调用 core + 输出（text / markdown / json）。
- **`vscode-vue-impact`**：只负责 UI —— 当前文件、搜索、用户交互、TreeView、Webview、跳转、复制、导出。
