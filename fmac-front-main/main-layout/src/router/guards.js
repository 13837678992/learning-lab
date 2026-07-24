import { store } from '@/store';

/**
 * 路由守卫（见 TASK Phase 2「路由能力」）。
 * beforeEach：设置标题 + 登录鉴权（白名单 meta.public，其余需 token，否则跳登录并回传 redirect）。
 * afterEach：预留全局 loading 结束等收尾。
 * 以函数形式导出并接收 router 实例，避免与 router/index 形成循环依赖。
 */
export function registerGuards(router) {
  router.beforeEach((to, from, next) => {
    const title = to.meta && to.meta.title;
    document.title = title ? `${title} · FMAC 平台` : 'FMAC 平台';

    if (store.state.token) {
      // 已登录访问登录页 → 回首页。
      if (to.path === '/login') return next('/home');
      return next();
    }

    // 未登录：公开页放行，其余跳登录。
    if (to.meta && to.meta.public) return next();
    const query = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {};
    return next({ path: '/login', query });
  });

  router.afterEach(() => {
    // 预留：结束全局 loading / 埋点。
  });
}
