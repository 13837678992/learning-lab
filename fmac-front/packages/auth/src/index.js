/**
 * @fmac/auth
 * 统一鉴权能力：登录态与权限校验。
 *
 * 登录态与权限判断统一走本包，禁止业务各自维护 token / 权限逻辑。
 *
 * 用法：
 *   import auth from '@fmac/auth';
 *   auth.setToken('xxx');
 *   auth.setPermissions(['order:read']);
 *   if (auth.hasPermission('order:read')) {  ...  }
 *   auth.logout();
 */
import { createAuth } from './auth.js';

export { createAuth };

/** 平台默认鉴权实例（单例）。 */
const auth = createAuth();
export default auth;
