# 部署文档（deploy.md）

> 输出文件：`docs/deploy.md`
> 阶段：Phase 5 部署能力建设

主应用 `main-layout` 与子应用 `app-demo` **各自独立构建、独立部署**。

---

## 一、多环境配置

每个应用各自维护三套环境文件（webpack 依 `APP_MODE` 读取，`process.env` 优先级更高，供部署期覆盖）：

| 文件 | 触发脚本 | APP_MODE |
| --- | --- | --- |
| `.env.dev` | `npm run serve` | development |
| `.env.test` | `npm run build:test` | test |
| `.env.prod` | `npm run build` | production |

**main-layout 变量**：

| 变量 | 含义 | dev | prod |
| --- | --- | --- | --- |
| `API_BASE` | 请求基地址 | `/api`（走 mock） | `https://api.fmac.example.com` |
| `PUBLIC_PATH` | 基座部署根路径 | `/` | `/` |
| `SUBAPP_DEMO_ENTRY` | 子应用注册地址（qiankun entry） | `//localhost:7201` | `https://fmac.example.com/app-demo/` |

**app-demo 变量**：

| 变量 | 含义 | dev | prod |
| --- | --- | --- | --- |
| `API_BASE` | 请求基地址 | `/api` | `https://api.fmac.example.com` |
| `PUBLIC_PATH` | 资源根路径 | `//localhost:7201/` | `/app-demo/` |

> 部署期临时覆盖示例：`SUBAPP_DEMO_ENTRY=https://app-demo.cdn.com/ npm run build`。

---

## 二、构建

```bash
# 主应用
cd main-layout
npm install
npm run build           # 生产 → dist/（读 .env.prod）
npm run build:test      # 测试 → dist/（读 .env.test）

# 子应用（独立仓库/独立流水线）
cd app-demo
npm install
npm run build           # 生产 → dist/（读 .env.prod）
```

> 构建脚本已内置 `NODE_OPTIONS=--openssl-legacy-provider`（webpack4 + 新版 Node 必需）。
> Windows 下 `NODE_OPTIONS=...` 内联写法不生效，需改用 `cross-env` 或在 CI 中导出环境变量。

产物：`dist/index.html` + `dist/assets/*`（带 contenthash）。

---

## 三、静态资源与目录布局

### 单域名（推荐）

```
/usr/share/nginx/html/
├── index.html          ← main-layout/dist/*     （PUBLIC_PATH=/）
├── assets/
└── app-demo/           ← app-demo/dist/*         （PUBLIC_PATH=/app-demo/）
    ├── index.html
    └── assets/
```

部署命令示意：

```bash
rsync -a --delete main-layout/dist/  /usr/share/nginx/html/
rsync -a --delete app-demo/dist/     /usr/share/nginx/html/app-demo/
```

nginx 配置见 `deploy/nginx/fmac-single-domain.conf`（用 `root` 而非 `alias`，规避 history 回退陷阱）。

### 多域名 / 独立部署

子应用部署到独立域名或 CDN，主应用 `SUBAPP_DEMO_ENTRY` 指向子应用地址；**子应用响应须带 CORS 头**。见 `deploy/nginx/fmac-multi-domain.conf`。

---

## 四、nginx 关键点

- **history 路由回退**：主应用 `try_files $uri $uri/ /index.html`；子应用 `try_files $uri $uri/ /app-demo/index.html`。
- **子应用前缀优先**：`location /app-demo` 需在 `location /` 之前（更具体前缀优先匹配）。
- **CORS（分域必配）**：子应用 `add_header Access-Control-Allow-Origin`，否则 qiankun 无法跨源拉取入口 HTML/JS。
- **缓存策略**：`assets/*`（含 hash）长缓存 immutable；`*.html` 不缓存，保证发布即时生效。
- **API 反代**：`location /api/ { proxy_pass http://<后端>; }`。

---

## 五、独立部署能力

| 能力 | 说明 |
| --- | --- |
| 独立构建 | 各应用自有 `package.json` / `webpack` / `node_modules` / 流水线，互不依赖 |
| 独立发布 | 子应用可单独重建、单独 `rsync`，不影响主应用 |
| 注册地址解耦 | 主应用经 `SUBAPP_DEMO_ENTRY` 配置子应用地址，改址无需改码 |
| 运行期资源路径 | 子应用 `public-path.js` 于 qiankun 运行期修正，支持任意部署位置 |

---

## 六、下一阶段

Phase 6 测试验收：主应用 / 子应用 / 通信端到端验证，输出 `docs/test-report.md` 与最终文档（architecture / develop / api）。
