# @fmac/auth

统一鉴权能力：登录态与权限校验。

> 依赖：`@fmac/shared`。登录态与权限判断统一走本包，禁止业务各自维护 token / 权限逻辑。本包不直接触碰 storage，持久化由 `@fmac/core` 装配时与 `store` / `cache` 协同。

## API

| 方法                                                     | 说明                           |
| -------------------------------------------------------- | ------------------------------ |
| `auth.setToken(token)` / `auth.getToken()`               | 读写登录态 token               |
| `auth.isLogged()`                                        | 是否已登录（存在 token）       |
| `auth.setUser(user)` / `auth.getUser()`                  | 读写当前用户                   |
| `auth.setPermissions(list)` / `auth.hasPermission(perm)` | 权限点                         |
| `auth.setRoles(list)` / `auth.hasRole(role)`             | 角色                           |
| `auth.logout()`                                          | 清空全部鉴权状态               |
| `auth.snapshot()`                                        | 当前状态快照                   |
| `auth.onChange(handler)`                                 | 订阅状态变更，返回取消订阅函数 |

```js
import auth from '@fmac/auth';

const off = auth.onChange((s) => renderUser(s.user));
auth.setToken(token);
auth.setUser(profile);
auth.setPermissions(['order:read', 'order:write']);
```
