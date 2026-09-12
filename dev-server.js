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

// Prueba, en orden, las mismas variantes que resuelve el hosting real
// (clean URLs sin ".html", e index.html implícito en una carpeta), así
// un link tipo /post-deploy/ o /post-deploy/seo funciona igual en local.
function resolveCandidates(rel) {
  if (rel === '/') return ['/index.html'];
  if (rel.endsWith('/')) return [rel + 'index.html'];
  if (path.extname(rel)) return [rel];
  return [rel + '.html', rel + '/index.html'];
}

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const candidates = resolveCandidates(rel);

  const tryNext = (i) => {
    if (i >= candidates.length) return serve404();
    const file = path.join(ROOT, path.normalize(candidates[i]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
    fs.readFile(file, (err, data) => {
      if (err) return tryNext(i + 1);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  };

  // Como el hosting real, si nada matchea servimos 404.html (si existe)
  // con status 404, en vez de un texto plano sin estilo.
  function serve404() {
    fs.readFile(path.join(ROOT, '404.html'), (err, data) => {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(err ? '404 — no encontrado' : data);
    });
  }

  tryNext(0);
}).listen(PORT, () => console.log(`/deploy_ → http://localhost:${PORT}`));
