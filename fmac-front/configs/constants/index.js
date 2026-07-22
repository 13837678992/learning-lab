/**
 * @fmac/constants —— 跨端共享常量（单一事实源）。
 *
 * 集中管理微应用命名、激活规则、API 前缀、事件名与共享 store key，避免各处硬编码与漂移。
 * 环境相关的 entry / gateway 属 @fmac/env；本包只放**与环境无关**的常量。
 */

/** qiankun 子应用挂载容器（位于主应用 Layout 内）。 */
export const SUBAPP_CONTAINER = '#subapp-viewport';

/** qiankun 子应用名。 */
export const MICRO_APPS = {
  USER: 'app-user',
  ORDER: 'app-order',
  REPORT: 'app-report',
  FINANCE: 'app-finance-demo',
};

/** 路由前缀（子应用激活规则的前缀）。 */
export const ROUTE_PREFIX = {
  MICRO: '/micro',
  FINANCE: '/finance',
};

/**
 * 子应用单一事实源：
 * - `activeRule` = qiankun 激活规则 = 子应用 vue-router base（主应用注册表与子应用路由共用，杜绝漂移）；
 * - `apiBase`    = 该子应用 request 的默认 baseURL。
 *
 * 主应用注册表 `apps/main/src/micro/apps.js` 与各子应用的 router / 请求配置均从此派生。
 */
export const SUBAPPS = {
  [MICRO_APPS.USER]: { activeRule: `${ROUTE_PREFIX.MICRO}/user`, apiBase: '/api/user' },
  [MICRO_APPS.ORDER]: { activeRule: `${ROUTE_PREFIX.MICRO}/order`, apiBase: '/api/order' },
  [MICRO_APPS.REPORT]: { activeRule: `${ROUTE_PREFIX.MICRO}/report`, apiBase: '/api/report' },
  [MICRO_APPS.FINANCE]: { activeRule: ROUTE_PREFIX.FINANCE, apiBase: '/api/finance' },
};

/** 跨应用事件名（@fmac/event）。 */
export const EVENTS = {
  USER_SELECTED: 'user:selected',
  ORDER_OPENED: 'order:opened',
  // —— 平台鉴权 / 导航协议（子应用发起，主应用统一处理）——
  AUTH_EXPIRED: 'auth:expired', // 登录态失效 / session 超时
  GO_LOGIN: 'nav:go-login', // 跳转登录页（携带 redirect）
  GO_HOME: 'nav:go-home', // 跳转首页
};

/** 跨应用共享状态 key（@fmac/store）。 */
export const STORE_KEYS = {
  CURRENT_USER: 'current:user',
  CURRENT_ORDER: 'current:order',
  MENU: 'platform:menu', // 登录后解析的菜单树
  MENU_ROUTES: 'platform:menu-routes', // 由菜单派生的子应用路由清单
  REDIRECT: 'auth:redirect', // 登录成功后的回跳地址
};
