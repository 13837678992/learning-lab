module.exports = function(app) {
  app.get('/api/demo/data', function(req, res) {
    var auth = req.headers.authorization;
    if (!auth) {
      res.status(401).json({ code: 401, message: '未授权' });
      return;
    }
    res.json({
      code: 200,
      data: {
        items: [
          { id: 1, name: '数据项 1', status: 'active' },
          { id: 2, name: '数据项 2', status: 'inactive' },
          { id: 3, name: '数据项 3', status: 'active' }
        ]
      },
      message: 'success'
    });
  });
};
