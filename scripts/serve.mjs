// 로컬 미리보기 서버: node scripts/serve.mjs → http://localhost:5178/
import http from 'node:http';
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const file = new URL('노원구_부동산_대시보드.html', root);
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(file));
}).listen(5178, () => console.log('http://localhost:5178/'));
