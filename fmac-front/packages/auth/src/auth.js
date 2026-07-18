/**
 * @fmac/auth —— 统一鉴权（登录态 + 权限），框架无关，仅依赖 @fmac/shared。
 *
 * 状态自持（in-memory）并对外提供 onChange 订阅；持久化（与 store / cache 协同）
 * 由 @fmac/core 在装配时决定，本包不直接触碰 storage（见 CLAUDE.md 第九节）。
 */
import { createEmitter, createLogger, isNil, toArray } from '@fmac/shared';

export function createAuth(options = {}) {
  const emitter = createEmitter();
  const logger = createLogger('auth');
  let token = options.token || null;
  let user = options.user || null;
  let permissions = new Set(toArray(options.permissions));
  let roles = new Set(toArray(options.roles));

  function isLogged() {
    return !isNil(token);
  }

  function snapshot() {
    return {
      token,
      user,
      permissions: [...permissions],
      roles: [...roles],
      logged: isLogged(),
    };
  }

  function notify() {
    emitter.emit('change', snapshot());
  }

  function setToken(next) {
    token = next || null;
    logger.debug('token 更新，logged =', isLogged());
    notify();
  }

  function setUser(next) {
    user = next || null;
    notify();
  }

  function setPermissions(list) {
    permissions = new Set(toArray(list));
    notify();
  }

  function setRoles(list) {
    roles = new Set(toArray(list));
    notify();
  }

  function logout() {
    token = null;
    user = null;
    permissions = new Set();
    roles = new Set();
    logger.debug('logout');
    notify();
  }

  return {
    isLogged,
    snapshot,
    getToken: () => token,
    setToken,
    getUser: () => user,
    setUser,
    setPermissions,
    hasPermission: (perm) => permissions.has(perm),
    setRoles,
    hasRole: (role) => roles.has(role),
    logout,
    /** 订阅鉴权状态变更；返回取消订阅函数。 */
    onChange: (handler) => emitter.on('change', handler),
  };
}
