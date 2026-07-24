import router from '@/router';
import { store } from '@/store';
import { setupGlobalState, setGlobalState } from '@/micro/globalState';
import { forceLogout } from '@/utils/logout';
import { logout as apiLogout } from '@/api/user';

/**
 * 主 ↔ 子通信桥接（TASK Phase 4）。
 *
 * 下发（主 → 子）：initGlobalState 携带 token/userInfo/menu/permissions；
 *   qiankun 自动把 onGlobalStateChange/setGlobalState 注入子应用 props。
 * 上行（子 → 主）：子应用 setGlobalState({ from, action }) → 本模块 onGlobalStateChange 派发。
 *   支持 action.type：route（主应用跳转）/ refresh（广播刷新）/ logout（退出登录）。
 * 另提供 window.microApp 直连桥（子应用 request.js 的 418 → window.microApp.logout()）。
 */

// 退出：通知后端后强制登出。
async function doLogout() {
  try {
    await apiLogout();
  } catch (e) {
    /* 后端不可达也要完成本地登出 */
  }
  forceLogout();
}

// 广播全局刷新给所有子应用。
function broadcastRefresh() {
  setGlobalState({ event: { type: 'global:refresh', ts: Date.now() } });
}

// 去重：避免主应用 setGlobalState 回显导致重复处理同一 action。
let lastActionId = null;

function handleSubAction(action) {
  if (!action || !action.type || action.id === lastActionId) return;
  lastActionId = action.id;
  switch (action.type) {
    case 'route':
      if (action.payload) router.push(action.payload).catch(() => {});
      break;
    case 'refresh':
      broadcastRefresh();
      break;
    case 'logout':
      doLogout();
      break;
    default:
      break;
  }
}

let bridged = false;

export function setupBridge() {
  if (bridged) return;
  bridged = true;

  setupGlobalState(
    {
      token: store.state.token,
      userInfo: store.state.userInfo,
      menu: store.state.menu,
      permissions: (store.state.userInfo && store.state.userInfo.roles) || [],
    },
    (state) => {
      if (state && state.action) handleSubAction(state.action);
    },
  );

  // window.microApp 直连桥（供子应用无 qiankun props 场景直接调用）。
  window.microApp = {
    logout: () => doLogout(),
    navigate: (path) => router.push(path).catch(() => {}),
    refresh: () => broadcastRefresh(),
    getGlobalState: () => ({
      token: store.state.token,
      userInfo: store.state.userInfo,
      menu: store.state.menu,
    }),
  };
}

/** 主应用主动下发最新用户态（登录后 / 信息变更时）。 */
export function pushUserState() {
  setGlobalState({
    token: store.state.token,
    userInfo: store.state.userInfo,
    menu: store.state.menu,
    permissions: (store.state.userInfo && store.state.userInfo.roles) || [],
  });
}
