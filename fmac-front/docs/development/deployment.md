# 构建、版本与发布

## 构建

多环境经 Vite `--mode` 驱动（`import.meta.env` → [`@fmac/env`](../../configs/env/README.md) 解析网关与子应用 entry）。

```bash
pnpm build          # 全部 apps，生产模式（mode=production）
pnpm build:test     # 全部 apps，测试环境（mode=test）
pnpm --filter @fmac/app-user build                    # 单个子应用（生产）
VITE_BASE=/user/ pnpm --filter @fmac/app-user build   # 部署在子路径时指定 base
```

- 产物在各 app 的 `dist/`（已 gitignore）。`apps/main/dist` 为基座；子应用各自 `dist` 独立部署。
- `packages/*` / `configs/*` 以**源码**被 apps 直接打包，无需单独构建步骤。
- 子应用经 `vite-plugin-qiankun` 打包，产物同时支持 **qiankun 挂载**与 **standalone 独立运行**。

## 环境与配置中心

| 关注点             | 来源                                                   |
| ------------------ | ------------------------------------------------------ |
| 网关 / 接口前缀    | `@fmac/env`（`API_BASE`，按 mode）                     |
| 子应用 entry       | `@fmac/env`（`SUBAPPS`，按 mode）+ `VITE_SUB_*` 可覆盖 |
| 激活规则 / apiBase | `@fmac/constants`（`SUBAPPS`，环境无关，单一事实源）   |
| 部署 base          | 构建期 `VITE_BASE`（子路径部署时）                     |

## 部署（主应用 + 子应用独立部署）

**主应用与每个子应用独立构建、独立部署、独立源**；qiankun 从基座跨域拉取子应用。Nginx 参考见 [`configs/nginx`](../../configs/nginx/README.md)。

1. 构建：`pnpm build`（或 `pnpm build:test`），得到各 `apps/*/dist`。
2. 主应用：`apps/main/dist` → 基座域名。Nginx：[`configs/nginx/main.conf`](../../configs/nginx/main.conf)（SPA 回退 + `/api` 反代网关）。
3. 子应用：各 `dist` → 各自域名 / 路径。Nginx：[`configs/nginx/subapp.conf`](../../configs/nginx/subapp.conf)（静态托管 + **qiankun 跨域 CORS**）。
4. entry 对齐：`@fmac/env` 各环境 `SUBAPPS[appName]` 须等于子应用实际部署地址。

### 发布校验清单

- [ ] 子应用响应头含 `Access-Control-Allow-Origin`（qiankun 跨域拉取所需）。
- [ ] 子应用 `VITE_BASE` 与部署路径一致，`dist/index.html` 中资源引用可访问。
- [ ] 主应用 `/api` 反代到目标网关；`/micro/*`、`/finance` 均回退 `index.html`。
- [ ] `@fmac/env` 的 `SUBAPPS` entry 与实际部署地址一致（避免子应用加载 404）。
- [ ] `pnpm check`（守卫 + lint + 测试）与 `pnpm build` 均通过（CI 已固化，见 [ci-and-gates.md](./ci-and-gates.md)）。

## 版本管理（独立版本）

- 各 `packages/*` 采用**独立语义化版本**，相互解耦。
- 变更记录汇总于根 [`CHANGELOG.md`](../../CHANGELOG.md)。
- **推荐**引入 [`@changesets/cli`](https://github.com/changesets/changesets) 管理独立版本与自动生成 changelog：

```bash
# 未来接入示例
pnpm add -Dw @changesets/cli
pnpm changeset            # 记录一次变更（选择受影响的包 + 语义级别）
pnpm changeset version    # 生成版本与 changelog
pnpm changeset publish    # 发布到 npm
```

## 发布到 npm（未来）

当前所有包 `private: true`，尚未发布。发布前需：

1. 去除对应包的 `private`，补 `license` / `repository` / `publishConfig`。
2. 确认 `files` 仅含 `src`（源码发布）或补构建产物。
3. 通过 changesets 统一 `version` + `publish`。
