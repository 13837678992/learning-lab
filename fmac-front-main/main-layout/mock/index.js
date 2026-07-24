/**
 * 开发态 Mock 后端 —— 仅用于 webpack-dev-server（`npm run serve`）。
 * 生产环境由真实后端提供同名接口；本文件不参与生产构建。
 * 见 CLAUDE.md 第六节：Node 文件使用 CommonJS。
 *
 * 提供接口：
 *   POST /api/login       登录
 *   POST /api/logout      退出
 *   GET  /api/user/info   用户信息
 *   GET  /api/menu        菜单（含子应用注册信息）
 */

// 菜单：带 microApp 字段者会被主应用注册为 qiankun 子应用。
const MENU = [
  { title: '首页', path: '/home', icon: '🏠' },
  {
    title: '示例子应用',
    path: '/app-demo',
    icon: '🧩',
    microApp: 'app-demo',
    entry: '//localhost:7201',
    activeRule: '/app-demo',
  },
];

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = function setupMock(app) {
  app.post('/api/login', async (req, res) => {
    const body = await readJson(req);
    const username = body.username || 'admin';
    res.json({
      code: 0,
      message: 'ok',
      data: {
        token: `mock-token-${Date.now()}`,
        userInfo: {
          username,
          name: username === 'admin' ? '管理员' : username,
          roles: ['admin'],
        },
      },
    });
  });

  app.post('/api/logout', (req, res) => {
    res.json({ code: 0, message: 'ok', data: null });
  });

  app.get('/api/user/info', (req, res) => {
    res.json({
      code: 0,
      data: { username: 'admin', name: '管理员', roles: ['admin'] },
    });
  });

  app.get('/api/menu', (req, res) => {
    res.json({ code: 0, data: MENU });
  });
};
