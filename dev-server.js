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

function exists(file) {
  return new Promise(resolve => fs.access(file, fs.constants.F_OK, err => resolve(!err)));
}

function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) return serve404(res);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

// Como el hosting real, si nada matchea servimos 404.html (si existe) con
// status 404, en vez de un texto plano sin estilo.
function serve404(res) {
  fs.readFile(path.join(ROOT, '404.html'), (err, data) => {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(err ? '404 - no encontrado' : data);
  });
}

http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const safeRel = path.normalize(rel);
  if (path.join(ROOT, safeRel).indexOf(ROOT) !== 0) { res.writeHead(403); return res.end('403'); }

  // Raíz, ruta con "/" al final, o archivo con extensión: sin ambigüedad,
  // se sirve directo.
  if (rel === '/') return serveFile(res, path.join(ROOT, 'index.html'));
  if (rel.endsWith('/')) return serveFile(res, path.join(ROOT, safeRel, 'index.html'));
  if (path.extname(rel)) return serveFile(res, path.join(ROOT, safeRel));

  // Sin extensión y sin "/" al final: puede ser una clean URL de archivo
  // (/seo → seo.html, se sirve directo) o una carpeta sin la barra final
  // (/post-deploy → post-deploy/index.html). Estos dos casos NO se pueden
  // tratar igual: si la carpeta se sirve directo en vez de redirigir, el
  // navegador queda pensando que la página vive en la raíz (por la URL
  // sin barra), y todos los links relativos de esa página apuntan mal
  // (ej. "seo.html" resolvería a /seo.html en vez de /post-deploy/seo.html).
  const htmlFile = path.join(ROOT, safeRel + '.html');
  if (await exists(htmlFile)) return serveFile(res, htmlFile);

  const dirIndex = path.join(ROOT, safeRel, 'index.html');
  if (await exists(dirIndex)) {
    res.writeHead(302, { Location: rel + '/' });
    return res.end();
  }

  serve404(res);
}).listen(PORT, () => console.log(`/deploy_ → http://localhost:${PORT}`));
