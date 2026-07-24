# Phase 1 · 主应用初始化（layout-init.md）

> 输出文件：`docs/layout-init.md`
> 阶段：Phase 1 主应用初始化
> 结果：✅ 构建通过

---

## 一、目标

建设 `main-layout` 主应用（基座）可构建骨架：Vue2 项目结构、Webpack4 配置、qiankun 依赖、Vue 入口、路由配置、axios 基础封装。

---

## 二、目录结构

```
main-layout/
├── package.json              # 独立依赖与脚本（npm）
├── babel.config.js           # CommonJS，preset-env
├── webpack.config.js         # CommonJS，webpack4 SPA 基座
├── .gitignore
├── public/
│   └── index.html            # HtmlWebpackPlugin 模板
└── src/
    ├── main.js               # Vue 入口（挂载 #app）
    ├── App.vue               # 根组件（router-view 壳）
    ├── router/
    │   ├── index.js          # VueRouter(history)
    │   └── routes.js         # 静态路由：/login /home
    ├── views/
    │   ├── Home.vue
    │   └── Login.vue         # 占位登录页
    └── utils/
        └── request.js        # axios 基础实例 + 拦截骨架
```

---

## 三、关键配置

### package.json（脚本）

| 脚本 | 命令 |
| --- | --- |
| `serve` / `dev` | `NODE_OPTIONS=--openssl-legacy-provider webpack-dev-server --mode development` |
| `build` | `NODE_OPTIONS=--openssl-legacy-provider webpack --mode production` |
| `build:test` | 追加 `APP_MODE=test` |

- 依赖：`vue@2.7.16`、`vue-router@3.6.5`、`qiankun@2.10.16`、`axios@1.7.9`。
- devDeps：`webpack@4.47.0`、`webpack-cli@3.3.12`、`webpack-dev-server@3.11.3`、`vue-loader@15.11.1`、`vue-template-compiler@2.7.16`、`@babel/*@7.24.0` 等。

### webpack.config.js

- CommonJS（`module.exports = (env, argv) => ({...})`）。
- `entry: src/main.js`；`output.publicPath` 取 `process.env.PUBLIC_PATH || '/'`。
- loaders：`vue-loader` / `babel-loader` / `vue-style-loader`+`css-loader` / `file-loader`。
- plugins：`VueLoaderPlugin`、`HtmlWebpackPlugin`、`DefinePlugin`（注入 `NODE_ENV` / `APP_MODE` / `API_BASE` / `SUBAPP_DEMO_ENTRY`）。
- devServer：`port 7100`、`historyApiFallback`、`hot`。

### babel.config.js

- CommonJS；`@babel/preset-env` 面向现代浏览器；`import()` 交由 webpack 代码分割。

---

## 四、构建验证

```
$ npm run build
Version: webpack 4.47.0
Time: 514ms
Built at: 2026/07/24 08:25:06
EXIT=0   （无 ERROR / 无 WARNING）

dist/
├── index.html
└── assets/
    ├── main.56d014f0.js     # 入口
    ├── 1.e3040100.js        # 路由懒加载 chunk（Home）
    └── 2.54f89efd.js        # 路由懒加载 chunk（Login）
```

**结论**：webpack4 + babel + Vue2 工具链在 Node v24.18.0（`--openssl-legacy-provider`）下构建通过；路由懒加载（`import()` 代码分割）正常。

---

## 五、说明与边界

- 本阶段基座为普通 SPA，**尚未接入 qiankun 注册 / 启动**（qiankun 依赖已装，逻辑留待 Phase 2）。
- `request.js` 仅基础实例，token 注入与 401/418 等在 Phase 2 补齐。
- Login 为占位页，直接跳 Home；真实登录在 Phase 2。

---

## 六、下一阶段

Phase 2 主应用能力建设：qiankun（registerMicroApps/start）、登录（token/session/单点登录）、菜单（/api/menu 动态加载子应用）、axios 完整拦截（401/418）、路由守卫（beforeEach/afterEach）。
