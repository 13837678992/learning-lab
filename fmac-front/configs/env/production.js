/**
 * 生产环境配置。SUBAPPS 键为 qiankun 应用名（与 @fmac/constants 的 MICRO_APPS 对齐）。
 */
export default {
  NODE_ENV: 'production',
  DEBUG: false,
  API_BASE: 'https://gateway.example.com/api',
  SUBAPPS: {
    'app-user': 'https://cdn.example.com/user/',
    'app-order': 'https://cdn.example.com/order/',
    'app-report': 'https://cdn.example.com/report/',
    'app-finance-demo': 'https://cdn.example.com/finance/',
  },
};
