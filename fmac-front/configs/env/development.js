/**
 * 开发环境配置。
 * 所有环境变量统一在 configs/env 管理，经 resolveEnv(mode) 选择。
 * SUBAPPS 键为 qiankun 应用名（与 @fmac/constants 的 MICRO_APPS 对齐）。
 */
export default {
  NODE_ENV: 'development',
  DEBUG: true,
  // 网关 / 接口前缀
  API_BASE: '/api',
  // 子应用 entry（主应用注册 qiankun 时使用）
  SUBAPPS: {
    'app-user': '//localhost:7101',
    'app-order': '//localhost:7102',
    'app-report': '//localhost:7103',
    'app-finance-demo': '//localhost:7104',
  },
};
