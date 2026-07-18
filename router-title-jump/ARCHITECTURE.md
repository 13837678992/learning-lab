# 架构说明（ARCHITECTURE）

Router Title Jump 的目标：在大型 Vue2/Vue3 项目里，输入中文/拼音/首字母/路径/文件名，
快速跳转到路由对应的页面文件。本文档说明整体架构、模块关系与四条核心工作流。

## 分层总览

```
src/
├── extension.js                 装配入口（仅接线，61 行）
├── config/ConfigService         读取 workspace 配置（向下兼容旧键）
├── parser/                      【AST 解析，纯逻辑】
│   ├── ast                      @babel/parser 封装 + traverse 复用
│   ├── nodeUtils                AST 通用工具（unwrap / getProp / resolveToArray …）
│   ├── RouterParser             编排器：单次遍历分派给插件 + 递归 walk
│   ├── plugins/                 路由「来源」插件（开放扩展点）
│   │   ├── vue3                 createRouter({ routes })
│   │   ├── vue2                 new Router / new VueRouter
│   │   ├── exportDefault        export default / module.exports / export const routes
│   │   └── moduleGlob           import.meta.glob / require.context
│   └── extractors/              字段提取（与写法正交）
│       ├── title                title + meta.title
│       ├── component            import()/require()/字符串/标识符（策略集）
│       └── redirect             redirect 字符串
├── resolver/                    【别名 + 文件定位】
│   ├── staticEval               静态求值路径表达式（path.resolve/fileURLToPath…）
│   ├── ProjectRootResolver      向上找 package.json（缓存）
│   ├── AliasResolver            汇总所有别名来源为统一规则表（缓存）
│   ├── loaders/tsconfigLoader   JSONC 容错 + extends + baseUrl/paths
│   ├── loaders/jsConfigLoader   AST 提取 vite/webpack/vue 的 alias
│   └── FileResolver             说明符 → 真实文件（补扩展名 / index，跨平台）
├── index/                       【索引】
│   ├── PinyinIndexer            全拼/首字母/音节（建索引时一次）
│   ├── RecordBuilder            组装 RouteRecord（派生字段 + keywords + id + mtime）
│   ├── InvertedIndex            token -> id 倒排（增量增删）
│   ├── RouterIndex              内存索引：按 routerFile 分组，增量替换/删除
│   └── IndexBuilder             纯管线：解析 → 解析文件 → 组装记录
├── search/                      【搜索】
│   ├── scoring                  分档评分权重表
│   └── SearchEngine             单词扫描 + 多词倒排 AND
├── watcher/RouterWatcher        FileSystemWatcher：路由/配置/组件增量更新
├── services/                    VSCode 适配
│   ├── WorkspaceScanner         findFiles + 读文件 + mtime 缓存 + 填索引
│   └── JumpService              在编辑器打开文件
├── providers/QuickPickProvider  QuickPick UI（alwaysShow 关闭内置过滤）
├── cache/CacheManager           routerFile -> { mtime, records }
└── utils/logger                 日志 + 计时（可注入 OutputChannel，可脱宿主测试）
```

## 依赖方向（单向、低耦合）

```
extension → { ConfigService, RouterIndex, CacheManager, WorkspaceScanner, RouterWatcher, QuickPickProvider }
WorkspaceScanner → IndexBuilder → { RouterParser, AliasResolver, FileResolver, RecordBuilder }
RouterParser → { ast, nodeUtils, plugins/*, extractors/* }
AliasResolver → { loaders/*, staticEval }   FileResolver → { AliasResolver, ProjectRootResolver }
QuickPickProvider → { SearchEngine, JumpService }   SearchEngine → { scoring, RouterIndex(结构化) }
```

- 纯逻辑层（parser/resolver/index/search）**不 import vscode**，可用 `node:test` 脱宿主直测。
- VSCode 只出现在 extension/services/watcher/providers/config 这一薄适配层。
- 无循环依赖。

## 核心数据结构

`RawRoute`（解析产物）→ 经 IndexBuilder → `RouteRecord`（索引单元）：

```
RouteRecord = { id, title, routePath, component, absoluteFile, relativeFile,
                routerFile, fileName, fullPinyin, initials, keywords[], mtime }
```

## 工作流一：解析（Parser）

1. `ast.parse(code)` → babel File（sourceType module、errorRecovery、jsx+typescript）。
2. `buildBindings` / `buildImportMap` 预扫顶层绑定与 import。
3. **单次 `traverse`**，每个节点分派给所有插件：
   - vue3/vue2/exportDefault 命中构造/导出 → `resolveToArray` 还原路由数组容器；
   - moduleGlob 命中 → 记录 glob。
4. 对每个容器数组递归 `walkRoutes`：逐路由对象用 extractors 取 title/path/component/redirect，
   `children` 递归（depth+1）。
5. 关键事实：babel 8 中动态 `import()` 是 `ImportExpression`（值在 `.source`），
   `ComponentExtractor` 据此取值。
6. 扩展新框架 = 新增一个 plugin 并登记，既有插件零改动（开闭原则）。

## 工作流二：别名（Alias）

1. `AliasResolver.getAliasRules(projectRoot)`（整根一次、缓存）。
2. JS 配置（vite/webpack/vue）：`jsConfigLoader` 遍历 AST 找所有 `alias` 属性 →
   `staticEval` 把目标表达式求值为绝对路径。
3. TS/JS 配置：`tsconfigLoader` JSONC 容错解析，处理 `extends`、`baseUrl`、`paths`。
4. 合并（构建配置优先）→ 同前缀去重 → **按前缀长度降序**（`@components` 不被 `@` 抢配）。
5. 兜底 `@`/`~` → `src`。

## 工作流三：文件定位（FileResolver）

`resolveComponentFile(request, routerFile, { projectRoot, aliasRules })`：
相对路径 → 基于 routerFile 目录；别名 → 最长前缀替换；绝对/`@/` 兜底/项目根相对。
再 `findExistingFile` 依次补 `.vue/.js/.ts/.jsx/.tsx` 与 `index.*`，全程 `path.resolve/join`
跨平台。

## 工作流四：索引与搜索（Index & Search）

1. `WorkspaceScanner.scanAll` → `findFiles` 得路由文件 → 每文件 `scanFile`：
   mtime 命中缓存则复用，否则 `IndexBuilder.buildRecordsForFile` → `RouterIndex.replaceRouterFile`。
2. `RecordBuilder` 生成拼音、keywords、id、mtime；`RouterIndex` 同步维护 `InvertedIndex`。
3. `SearchEngine.search`：
   - 单词：全量分档打分（正确覆盖跨音节子串），每记录短路到最优档；
   - 多词：倒排前缀候选并集（空则回退全量）+ 每词必须打分，分值求和。
4. `RouterWatcher`：路由文件 create/change/delete → 增量；配置文件 → 清别名缓存；
   组件 create/delete → 防抖标脏，下次打开重扫。
5. QuickPick 只读索引，绝不重解析。

## 设计原则落点

- **单一职责**：解析/解析路径/索引/搜索彻底分离。
- **开闭原则**：`parser/plugins`、`parser/extractors`、`resolver/loaders` 三个扩展点。
- **依赖倒置**：SearchEngine 依赖结构化 `SearchableIndex` 而非具体实现。
- **高内聚低耦合**：UI 只读索引，纯逻辑不碰 UI，可独立测试。
