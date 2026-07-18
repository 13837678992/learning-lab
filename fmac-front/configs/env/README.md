# @fmac/env

环境配置中心。按 `mode`（`development` / `test` / `production`）解析**环境相关**配置：API 网关与子应用 entry。与环境无关的常量见 [`@fmac/constants`](../constants)。

```js
import { resolveEnv } from '@fmac/env';

const env = resolveEnv(import.meta.env.MODE); // 或在 vite.config.js 中 resolveEnv(mode)
env.API_BASE; // 网关
env.SUBAPPS['app-user']; // 子应用 entry
```

## 约定

- 环境差异（`API_BASE`、子应用 `SUBAPPS` entry、`DEBUG`）集中在此，禁止散落到各 app。
- `SUBAPPS` 键为 qiankun 应用名（与 `@fmac/constants` 的 `MICRO_APPS` 对齐）；主应用注册表 entry 由此派生，`import.meta.env.VITE_SUB_*` 可覆盖。
- 字段：`NODE_ENV` / `DEBUG` / `API_BASE` / `SUBAPPS{ app-user, app-order, app-report, app-finance-demo }`。
