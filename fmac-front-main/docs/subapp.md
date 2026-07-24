# Phase 3 · 子应用 app-demo（subapp.md）

> 输出文件：`docs/subapp.md`
> 阶段：Phase 3 子应用建设
> 结果：✅ 构建通过 + dev-server（:7201）联调通过

子应用 `app-demo`：**独立运行** 与 **qiankun 接入** 双模式。端口 **7201**。

---

## 一、目录结构

```
app-demo/
├── package.json          # 独立依赖（vue/vue-router/axios + webpack4 工具链，无 qiankun 依赖）
├── babel.config.js       # CommonJS
├── webpack.config.js     # CommonJS，UMD 输出
├── .gitignore
├── mock/index.js         # 开发态 mock：/api/demo/{summary,expire,unauth}
├── public/index.html     # 挂载点 #app-demo-root
└── src/
    ├── public-path.js    # qiankun 运行期 __webpack_public_path__ 修正（最先执行）
    ├── main.js           # 生命周期 bootstrap/mount/unmount + 独立运行渲染
    ├── App.vue           # 壳（导航 + router-view + 运行模式标识）
    ├── context.js        # 保存主应用下发上下文（token/userInfo/menu）
    ├── router/index.js   # createRouter(powered)：base = /app-demo | /
    ├── utils/request.js  # 独立 axios：401 未登录 / 418 → window.microApp.logout()
    ├── api/index.js      # getSummary / triggerExpire / triggerUnauth
    └── views/{Home,About}.vue
```

---

## 二、qiankun 接入要点

| 要点 | 实现 |
| --- | --- |
| UMD 导出 | `output.library='app-demo'`、`libraryTarget:'umd'`、`globalObject:'window'`、`jsonpFunction:'webpackJsonp_app-demo'` |
| 运行期 publicPath | `src/public-path.js`：`__POWERED_BY_QIANKUN__` 时用 `__INJECTED_PUBLIC_PATH_BY_QIANKUN__` |
| 生命周期 | `main.js` 导出 `bootstrap/mount/unmount`；独立运行（非 qiankun）时立即 `render()` |
| 挂载容器 | `mount` 时 `container.querySelector('#app-demo-root')`；独立时 `#app-demo-root` |
| 路由 base | qiankun 下 `/app-demo`（对齐主应用 activeRule），独立下 `/` |
| 跨域 | devServer `Access-Control-Allow-Origin: *`（基座跨源拉取子应用资源） |
| 内存泄漏 | `unmount` 中 `$destroy` + 清空 DOM + 置空 router |

---

## 三、独立运行

```
cd app-demo && npm install && npm run serve   # :7201
```

- `window.__POWERED_BY_QIANKUN__` 为假 → `main.js` 直接 `render()`。
- 自带 mock 后端，可独立联调 `/api/demo/*`。

---

## 四、请求规范（request.js）

- 请求：注入 `Authorization`（token 来自 `context`）、`X-Client: app-demo`。
- 响应：约定 `{code,data,message}`，成功剥离 data。
- **401**（未登录）：qiankun 下调用 `window.microApp.logout()`（交主应用处理）；独立运行自处理。
- **418**（会话超时）：调用 `window.microApp.logout()` 通知主应用退出登录（TASK Phase 3）。
- 与主应用请求逻辑**相互独立**（各自 `request.js`）。

> `window.microApp.logout` 由主应用注入（Phase 4 通信桥接）；子应用侧做存在性判断，缺失时降级打印。

---

## 五、验证结果

**构建**：`npm run build` → exit 0，webpack 4.47.0，~1.1s，无 ERROR；产物 UMD（含 `app-demo` 库名、`webpackJsonp_app-demo`）+ 3 chunk。

**dev-server 联调**（`npm run serve`，:7201）：

| 请求 | 结果 |
| --- | --- |
| `GET /` | HTTP 200；响应头含 `Access-Control-Allow-Origin: *`；title 正确 |
| `GET /api/demo/summary` | `{code:0,data:{...}}` |
| `GET /api/demo/expire` | HTTP 418 |
| `GET /home` | HTTP 200（history fallback） |

> qiankun 环境下实际挂载/卸载与 401/418 桥接的端到端验证在 Phase 6（主子同时运行）完成。

---

## 六、下一阶段

Phase 4 主子应用通信：主应用 `initGlobalState` 下发 token/userInfo/menu/权限；子应用 `onGlobalStateChange` 订阅 + `setGlobalState` 回传（route/refresh/logout）；主应用注入 `window.microApp.logout`。
