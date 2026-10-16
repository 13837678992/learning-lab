// 静态文件服务器：托管 build/web-mobile（Cocos 引擎需要 http 协议加载资源）
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || '/Users/weicheng/code/learning-lab/cocos-big-watermelon/build/web-mobile';
const PORT = Number(process.argv[3] || 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.plist': 'text/xml',
  '.dbbin': 'application/octet-stream',
  '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found: ' + p);
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log('serving ' + ROOT + ' on http://127.0.0.1:' + PORT));
