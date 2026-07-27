import { getToken } from '@/utils/auth';

export function beforeEach(router) {
  router.beforeEach((to, from, next) => {
    const token = getToken();
    if (to.meta.requiresAuth !== false && !token) {
      next({ path: '/login', query: { redirect: to.fullPath } });
    } else if (to.path === '/login' && token) {
      next({ path: '/' });
    } else {
      next();
    }
  });
}

export function afterEach(router) {
  router.afterEach((to, from) => {
    const title = to.meta && to.meta.title;
    if (title) {
      document.title = title + ' - 微前端主应用';
    }
  });
}
