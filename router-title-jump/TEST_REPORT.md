# 测试报告（TEST_REPORT）

- 运行器：`node:test`（零依赖内置）
- 命令：`npm test`（或 `npm run check` 一并跑 lint + typecheck + test）
- 结果：**61 用例全部通过（0 失败）**，lint ✅，typecheck ✅，生产打包 ✅

## 用例分布

| 套件 | 用例数 | 覆盖内容 |
|---|---:|---|
| `tests/parser/router-parser.test.js` | 16 | 路由写法矩阵（见下） |
| `tests/resolver/static-eval.test.js` | 8 | 路径表达式静态求值 |
| `tests/resolver/alias-resolver.test.js` | 4 | vite + tsconfig 别名聚合、排序、缓存 |
| `tests/resolver/file-resolver.test.js` | 8 | 别名/相对/扩展名/index/不存在 |
| `tests/resolver/integration.test.js` | 1 | 解析 → 解析文件 端到端 |
| `tests/index/pinyin-indexer.test.js` | 4 | 全拼/首字母/多音字/空串 |
| `tests/index/router-index.test.js` | 2 | 增量增删改 + 倒排联动 + 派生字段 |
| `tests/index/index-builder.test.js` | 2 | 纯管线装配 + 跳过不可解析路由 |
| `tests/search/search-engine.test.js` | 13 | 各搜索维度 + 排序 + 多词 |
| `tests/cache/cache-manager.test.js` | 2 | mtime 新鲜判定 + 删除/清空 |
| `tests/smoke.test.js` | 1 | 运行器就绪 |
| **合计** | **61** | |

## 兼容的 Router 写法（parser 套件）

Vue3 `createRouter` · Vue2 `new Router` · `new VueRouter` · `children` 递归 ·
`meta.title` · 直接 `title` · `redirect` · 懒加载 `import()` · `resolve => require([...])` ·
普通 `require('')` · `export default [..]` · `export default 标识符` · `export const routes` ·
`module.exports=`（CJS）· 静态 `component: Home` · `import.meta.glob` · `require.context` ·
TypeScript（类型注解 + `as` 断言）· 语法错误容错 · 无路由文件返回空。

## 兼容的别名来源（resolver 套件）

- `vite.config.*` 的 `resolve.alias`（`@`、`~` → src）
- `tsconfig.json` / `jsconfig.json` 的 `paths` + `baseUrl`（`@comp/*` → src/components）+ JSONC 注释/尾逗号 + `extends`
- 路径目标表达式：`path.resolve/join(__dirname, …)`、`resolve(…)`、`fileURLToPath(new URL('./src', import.meta.url))`、纯字符串
- 规则按前缀长度降序（长前缀优先）、整根一次并缓存

## 拼音与搜索评分

- 拼音：`保险产品` → 全拼 `baoxianchanpin` / 首字母 `bxcp` / 音节 `['bao','xian','chan','pin']`；
  多音字上下文（`银行` → `yinhang`）。
- 搜索命中维度与首位断言：`产品`(包含)、`cp`/`bxcp`(首字母)、`chanpin`/`xian`(全拼子串)、
  `user`(文件名/路径)、`login`(文件名)、`/home`(Router Path)、`product`(组件/文件名)、
  多词 `yonghu guanli`(AND)。
- 排序优先级：title 完全 > 前缀 > 包含 > 全拼 > 首字母 > Router Path > 文件名 > 组件 > 其它。

## 性能测试

见 [PERFORMANCE.md](./PERFORMANCE.md)（`npm run bench [路由数] [模块数]`）。摘要：
1000 路由首扫 ~75ms、搜索 <1ms；3000 路由首扫 ~150ms、搜索 <2ms；增量单文件 2–3ms。

## 复现

```bash
npm install
npm run check     # lint + typecheck + test
npm run bench 3000 40
```
