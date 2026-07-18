# configs/nginx

fmac-front 独立部署的 Nginx 参考配置。**主应用与各子应用独立部署、独立源**（qiankun 跨域拉取）。

| 文件          | 用途                                                           |
| ------------- | -------------------------------------------------------------- |
| `main.conf`   | 主应用（基座）：SPA history 回退 + `/api` 反代网关             |
| `subapp.conf` | 子应用模板：静态托管 + **qiankun 跨域 CORS**（复制改域名即可） |

## 要点

- **子应用必须放行 CORS**：qiankun 从基座跨域拉取子应用资源，缺 CORS 会加载失败。生产建议将 `Access-Control-Allow-Origin` 收敛为基座域名白名单。
- **base 与部署路径一致**：子应用部署在子路径时（如 `/user/`），构建须 `VITE_BASE=/user/`（见 [deployment.md](../../docs/development/deployment.md)）。
- **entry 指向部署地址**：主应用注册子应用的 `entry` 由 [`@fmac/env`](../env/README.md) 按环境提供，须与子应用实际部署地址一致。
- 完整发布流程见 [docs/development/deployment.md](../../docs/development/deployment.md)。
