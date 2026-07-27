module.exports = function(app) {
  app.post('/api/user/login', function(req, res) {
    var body = req.body || {};
    if (body.username && body.password) {
      res.json({
        code: 200,
        data: {
          token: 'mock-token-' + Date.now(),
          username: body.username
        },
        message: 'success'
      });
    } else {
      res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
  });

  app.get('/api/user/info', function(req, res) {
    var auth = req.headers.authorization;
    if (!auth) {
      res.status(401).json({ code: 401, message: '未授权' });
      return;
    }
    res.json({
      code: 200,
      data: {
        username: 'admin',
        role: '管理员',
        avatar: ''
      },
      message: 'success'
    });
  });

  app.get('/api/menu', function(req, res) {
    var auth = req.headers.authorization;
    if (!auth) {
      res.status(401).json({ code: 401, message: '未授权' });
      return;
    }
    res.json({
      code: 200,
      data: [
        {
          app_code: 'home',
          app_name: '首页',
          entry: '',
          route: '/home',
          permission: ['view']
        },
        {
          app_code: 'app-demo',
          app_name: '示例应用',
          entry: '//localhost:9001',
          route: '/app-demo',
          permission: ['view']
        }
      ],
      message: 'success'
    });
  });
};
