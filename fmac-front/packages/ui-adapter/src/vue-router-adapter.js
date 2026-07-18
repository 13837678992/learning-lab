/**
 * @fmac/ui-adapter —— vue-router → @fmac/router 适配器（框架适配）。
 *
 * 把基座 / 子应用的 vue-router 实例适配为 @fmac/router 期望的
 * { push, replace, back, forward, go, current, reload } 契约（依赖倒置）。
 *
 * 说明：
 * - 本文件不 import vue-router —— 实例由调用方注入，此处仅封装其 API 形状，
 *   因此 ui-adapter 仍保持零框架依赖；但「认识具体框架 API」这一职责本就归属
 *   ui-adapter（除本包外禁止依赖具体框架，见 CLAUDE.md 第七节）。
 * - 收敛到此处后，各 app 不再各自重复实现（DRY）；未来 Vue3 / react-router
 *   迁移只需在本包新增对应适配器，业务与其它 package 无感（见迁移文档）。
 */
export function createVueRouterAdapter(vueRouter) {
  // vue-router 3 的 push/replace 返回 Promise，重复导航会 reject，这里吞掉冗余导航异常。
  const safe = (result) => {
    if (result && typeof result.catch === 'function') result.catch(() => {});
    return result;
  };
  return {
    push: (location) => safe(vueRouter.push(location)),
    replace: (location) => safe(vueRouter.replace(location)),
    back: () => vueRouter.back(),
    forward: () => vueRouter.forward(),
    go: (delta) => vueRouter.go(delta),
    current: () => vueRouter.currentRoute.fullPath,
    reload: () => vueRouter.go(0),
  };
}
