/* Recomprime una imagen (PNG/JPG pesado, tipo captura o export de una IA)
   a JPG liviano, del ancho justo para el uso web.
   Uso: node tools/optimizar-imagen.js <entrada> <salida.jpg> [anchoMax=900] [calidad=0.82] */
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [entrada, salida, anchoMax = '900', calidad = '0.82'] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error('Uso: node tools/optimizar-imagen.js <entrada> <salida.jpg> [anchoMax] [calidad]');
  process.exit(1);
}

const PORT = 9700 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'opt-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let t = null;
  for (let i = 0; i < 40 && !t; i++) { await sleep(250);
    try { t = (await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json())).find(x => x.type === 'page'); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => { const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise(res => { const n = ++id; pend.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params })); });
  const evalJs = async (expr, awaitPromise) => (await send('Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise })).result?.value;

  await send('Page.enable');
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(300);

  const b64 = fs.readFileSync(entrada).toString('base64');
  const ext = path.extname(entrada).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

  const out = await evalJs(`(function(){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){
        var w = img.naturalWidth, h = img.naturalHeight;
        var maxW = ${anchoMax};
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0, 0, w, h);   // por si el PNG tiene alfa
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', ${calidad}));
      };
      img.src = 'data:${mime};base64,${b64}';
    });
  })()`, true);

  const jpg = Buffer.from(out.split(',')[1], 'base64');
  fs.writeFileSync(salida, jpg);
  const antes = fs.statSync(entrada).size, despues = jpg.length;
  console.log(`${salida}  ${(antes/1024).toFixed(0)}KB → ${(despues/1024).toFixed(0)}KB`);

  ws.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
})().catch(e => { console.error('ERROR', e.message); chrome.kill(); process.exit(1); });
