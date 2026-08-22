/* Servidor local mínimo para ver el sitio en desarrollo.
   Uso:  node dev-server.js   →   http://localhost:4321          */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.json': 'application/json'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404 — no encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`/deploy_ → http://localhost:${PORT}`));
