import platform from '@fmac/core';
import { EVENTS, STORE_KEYS } from '@fmac/constants';

/**
 * 主应用平台职责 —— 统一处理子应用发起的「鉴权 / 导航协议」（经 @fmac/event）。
 * 子应用禁止自行弹窗 / 跳转 / 操作全局态，一律 emit 事件，交由 main 处理：
 *   - AUTH_EXPIRED：登录态失效 / session 超时 → 弹窗确认 → 清理 → 跳登录
 *   - GO_LOGIN    ：跳转登录页（携带 redirect，登录后回跳）
 *   - GO_HOME     ：跳转首页
 */
const { event, message, auth, tab, cache, store, router } = platform;

let installed = false;

/** 清理登录态、标签、缓存、菜单。 */
export function clearSession() {
  auth.logout();
  tab.clear();
  cache.clear();
  store.remove(STORE_KEYS.MENU);
}

/** 保存回跳地址并跳转登录页。 */
export function goLogin(redirect) {
  const target = redirect || (router.current ? router.current() : '');
  if (target && target !== '/login') store.set(STORE_KEYS.REDIRECT, target);
  router.push('/login');
}

/** 注册平台鉴权 / 导航事件监听（幂等）。 */
export function setupSession() {
  if (installed) return;
  installed = true;

  // Session 超时 / token 失效：Element UI 弹窗 → 确认 → 清理 → 跳登录。
  event.on(EVENTS.AUTH_EXPIRED, async () => {
    const ok = await message.confirm({
      title: '提示',
      content: '登录状态已失效，请重新登录',
      confirmText: '重新登录',
    });
    if (!ok) return;
    const redirect = router.current ? router.current() : '';
    clearSession();
    goLogin(redirect);
  });

  // 子应用请求跳转登录页（payload.redirect 可选，登录后回跳）。
  event.on(EVENTS.GO_LOGIN, (payload) => {
    goLogin(payload && payload.redirect);
  });

  // 子应用请求跳转首页。
  event.on(EVENTS.GO_HOME, () => {
    router.push('/');
  });
}
