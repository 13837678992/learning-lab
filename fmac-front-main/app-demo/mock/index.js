/**
 * 开发态 Mock 后端 —— 仅用于 webpack-dev-server（`npm run serve`），子应用独立联调用。
 * 生产由真实后端提供。CommonJS（见 CLAUDE.md 第六节）。
 *
 * 提供接口：
 *   GET /api/demo/summary   示例数据
 *   GET /api/demo/expire    模拟 418（会话超时）
 *   GET /api/demo/unauth    模拟 401（未登录）
 */
module.exports = function setupMock(app) {
  app.get('/api/demo/summary', (req, res) => {
    res.json({
      code: 0,
      data: {
        name: 'app-demo',
        items: [
          { id: 1, name: '示例记录 A' },
          { id: 2, name: '示例记录 B' },
          { id: 3, name: '示例记录 C' },
        ],
        time: new Date().toISOString(),
      },
    });
  });

  app.get('/api/demo/expire', (req, res) => {
    res.status(418).json({ code: 418, message: '会话已超时' });
  });

  app.get('/api/demo/unauth', (req, res) => {
    res.status(401).json({ code: 401, message: '未登录' });
  });
};
