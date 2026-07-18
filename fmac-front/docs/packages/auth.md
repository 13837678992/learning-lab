# @fmac/auth

统一鉴权：登录态与权限。包内 [README](../../packages/auth/README.md)。

```js
import { auth } from '@fmac/core';
auth.setToken(token);
auth.setUser({ name: '管理员' });
auth.setPermissions(['order:read']);
auth.hasPermission('order:read'); // true
auth.isLogged();
const off = auth.onChange((s) => renderUser(s.user));
auth.logout();
```

## 约束

- 登录态与权限**统一走本包**，禁止业务各自维护 token / 权限。
- 本包不直接触碰 storage；持久化由 `core` 装配时与 `store` / `cache` 协同。
