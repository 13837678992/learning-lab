import router from '@/router';
import { store } from '@/store';
import { getMenu } from '@/api/menu';
import { logout as apiLogout } from '@/api/user';
import { setupMicroApps } from '@/micro';
import { setupBridge } from '@/platform/bridge';
import { forceLogout } from '@/utils/logout';

/**
 * 平台会话装配（登录后 / 已登录启动时）。
 * loadPlatform：拉取菜单 → 注册并启动 qiankun；仅执行一次（store.platformLoaded 守卫）。
 * afterLogin：写入 token/userInfo → loadPlatform → 跳转目标页。
 * logout：通知后端 → 强制登出（整页刷新回登录页）。
 */
export async function loadPlatform() {
  if (store.state.platformLoaded) return;
  const menu = await getMenu();
  store.setMenu(menu);
  // 先建立通信桥（initGlobalState + window.microApp），再注册并启动 qiankun，
  // 确保子应用挂载时即可通过 props 拿到全局状态。
  setupBridge();
  setupMicroApps(menu);
  store.setPlatformLoaded(true);
}

export async function afterLogin(resp) {
  store.setToken(resp && resp.token);
  if (resp && resp.userInfo) store.setUserInfo(resp.userInfo);
  await loadPlatform();
  const redirect = router.currentRoute.query && router.currentRoute.query.redirect;
  router.replace(redirect || '/home').catch(() => {});
}

export async function logout() {
  try {
    await apiLogout();
  } catch (e) {
    /* 后端不可达时也要完成本地登出 */
  }
  forceLogout();
}
