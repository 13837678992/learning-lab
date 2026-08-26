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

export function notifyTabOpen(tab) {
  sendToSubApps({
    action: 'TAB_OPEN',
    title: tab.title,
    path: tab.path,
    params: tab.params
  });
}

export function notifyTabClose(path) {
  sendToSubApps({
    action: 'TAB_CLOSE',
    path: path
  });
}

export function notifyTabRefresh(path) {
  sendToSubApps({
    action: 'TAB_REFRESH',
    path: path
  });
}

export function initBridge() {
  var actions = getActions();
  if (actions && actions.onGlobalStateChange) {
    actions.onGlobalStateChange(function(state) {
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
      if (state.action === 'TAB_OPEN') {
        var route = {
          path: state.path,
          meta: { title: state.title },
          params: state.params || {},
          query: state.query || {},
          fullPath: state.path
        };
        store.dispatch('addTab', route);
        if (state.path) {
          var router = require('@/router').default;
          if (router && router.currentRoute.path !== state.path) {
            router.push(state.path);
          }
        }
      }
      if (state.action === 'TAB_CLOSE') {
        var closePath = state.path;
        if (closePath) {
          var view = store.state.visitedViews.find(function(v) { return v.path === closePath; });
          if (view) {
            store.dispatch('closeTab', view);
            var router2 = require('@/router').default;
            if (router2 && router2.currentRoute.path === closePath) {
              var views = store.state.visitedViews;
              if (views.length > 0) {
                var last = views[views.length - 1];
                router2.push({ path: last.path, query: last.query, params: last.params });
              } else {
                router2.push('/home');
              }
            }
          }
        }
      }
      if (state.action === 'TAB_REFRESH') {
        var refreshPath = state.path;
        if (refreshPath) {
          var view2 = store.state.visitedViews.find(function(v) { return v.path === refreshPath; });
          if (view2) {
            store.dispatch('refreshTab', view2);
          }
        }
      }
    });
  }
}
