import { getActions } from '@/micro/globalState';
import store from '@/store';

export function sendToSubApps(data) {
  var actions = getActions();
  if (actions && actions.setGlobalState) {
    actions.setGlobalState(data);
  }
}

export function syncUserState() {
  sendToSubApps({
    user: {
      token: store.state.token,
      userInfo: store.state.userInfo
    }
  });
}

export function syncMenuState() {
  sendToSubApps({
    menu: store.state.menu
  });
}

export function notifyLogout() {
  sendToSubApps({
    action: 'logout'
  });
}

export function initBridge() {
  var actions = getActions();
  if (actions && actions.onGlobalStateChange) {
    actions.onGlobalStateChange(function(state, prev) {
      if (state.action === 'route') {
        var path = state.path;
        if (path) {
          window.location.href = path;
        }
      }
      if (state.action === 'logout') {
        var logoutFn = require('@/utils/logout').logout;
        logoutFn();
      }
    });
  }
}
