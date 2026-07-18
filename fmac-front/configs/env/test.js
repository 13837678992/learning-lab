/**
 * 测试环境配置。SUBAPPS 键为 qiankun 应用名（与 @fmac/constants 的 MICRO_APPS 对齐）。
 */
export default {
  NODE_ENV: 'test',
  DEBUG: true,
  API_BASE: 'https://test-gateway.example.com/api',
  SUBAPPS: {
    'app-user': 'https://test.example.com/user/',
    'app-order': 'https://test.example.com/order/',
    'app-report': 'https://test.example.com/report/',
    'app-finance-demo': 'https://test.example.com/finance/',
  },
};
