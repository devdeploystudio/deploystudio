// Saca la captura de un sitio para usarla en una tarjeta de Proyectos.
// Uso: node tools/captura.js <url> img/proyectos/<nombre>.jpg [esperaMs] [ancho] [alto] [jsPrevio]
// Ej:  node tools/captura.js https://misitio.com img/proyectos/misitio.jpg
// El jsPrevio sirve para cerrar popups antes de la foto.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [url, out, waitMs = '6000', W = '1440', H = '900', evalJs = ''] = process.argv.slice(2);
const PORT = 9333 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cshot-'));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json());
      target = list.find(t => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error('no se pudo conectar con Chrome');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id; pend.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',
    { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(+waitMs);                      // deja pasar preloaders y animaciones
  if (evalJs) {                              // cerrar popups, aceptar avisos, etc
    await send('Runtime.evaluate', { expression: evalJs });
    await sleep(1400);
  }
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`${out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);

  ws.close();
  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
})().catch(e => { console.error('ERROR', e.message); chrome.kill(); process.exit(1); });
