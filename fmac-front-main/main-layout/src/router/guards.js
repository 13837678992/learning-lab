import { getToken } from '@/utils/auth';
import store from '@/store';

export function beforeEach(router) {
  router.beforeEach(function(to, from, next) {
    var token = getToken();
    if (to.meta.requiresAuth !== false && !token) {
      store.dispatch('saveRedirect', to.fullPath);
      next({ path: '/login', query: { redirect: to.fullPath } });
    } else if (to.path === '/login' && token) {
      next({ path: '/' });
    } else {
      if (to.meta && to.meta.keepAlive === undefined && !(to.meta && to.meta.isSubApp)) {
        to.meta.keepAlive = true;
      }
      if (to.path === '/home') {
        to.meta.closable = false;
      }
      next();
    }
  });
}

export function afterEach(router) {
  router.afterEach(function(to) {
    var title = to.meta && to.meta.title;
    if (title) {
      document.title = title + ' - 微前端主应用';
    }
    store.dispatch('addTab', to);
    store.dispatch('persistTabs');
    store.dispatch('clearRedirect');
  });
}
