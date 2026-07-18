# @fmac/constants

跨端共享常量（**单一事实源**），避免魔法字符串散落与配置漂移。仅存放**与环境无关**的常量；环境相关的 entry/gateway 见 [`@fmac/env`](../env)。

| 导出               | 说明                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `SUBAPP_CONTAINER` | qiankun 挂载容器（`#subapp-viewport`）                                                    |
| `MICRO_APPS`       | qiankun 子应用名（`app-user` / `app-order` / `app-report` / `app-finance-demo`）          |
| `ROUTE_PREFIX`     | 路由前缀（`MICRO = '/micro'`、`FINANCE = '/finance'`）                                    |
| `SUBAPPS`          | 每个子应用的 `activeRule`（= 注册表激活规则 = 子应用 router base）与 `apiBase`（baseURL） |
| `EVENTS`           | 跨应用事件名（配合 `@fmac/event`）                                                        |
| `STORE_KEYS`       | 跨应用共享状态 key（配合 `@fmac/store`）                                                  |

## 单一事实源

`apps/main/src/micro/apps.js` 的注册表、各子应用的 `router` base 与 `request` baseURL 均从 `SUBAPPS` 派生，杜绝「主应用 activeRule 与子应用 base 不一致」这类漂移。

```js
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';
SUBAPPS[MICRO_APPS.USER]; // { activeRule: '/micro/user', apiBase: '/api/user' }
```
