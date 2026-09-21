/* ═══════════════════════════════════════════════
   post-deploy-auth - Cloudflare Worker
   Login por mail (sin contraseña) para el panel de clientes en
   /post-deploy/. La lista de mails permitidos vive acá abajo, hardcodeada
   a propósito: Mariana va pasando los mails de cada cliente nuevo a
   medida que se suman, y agregarlos es editar esta lista y volver a
   pegar el código en el dashboard de Cloudflare (mismo mecanismo manual
   que el resto de los Workers de Deploy).

   POST /login   { email } → si el mail está en la lista, devuelve un
                 token firmado (HMAC-SHA256) con el mail adentro y
                 vencimiento a los 30 días. El token no es una contraseña
                 real: cualquiera con ese link/token entra, así que esto
                 es un filtro simple para que no cualquiera encuentre el
                 panel por casualidad, no una protección contra alguien
                 decidido a entrar sin invitación.
   POST /verify  { token } → valida firma + vencimiento, devuelve el mail
                 si es válido. Lo llama js/post-deploy-auth.js en cada
                 página del panel antes de mostrar el contenido.

   Requiere un secret AUTH_SECRET (Settings → Variables → Secrets →
   Add) - cualquier texto largo y random, elegido una sola vez. Cambiarlo
   invalida todos los tokens ya entregados (obliga a todos a loguearse de
   nuevo), así que no hace falta rotarlo salvo sospecha de filtración.
   ═══════════════════════════════════════════════ */

const PRODUCTION_ORIGIN = 'https://deploystudio.com.ar';
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

// Mails con acceso al panel. Agregar uno nuevo: sumarlo acá (en
// minúsculas) y volver a pegar el archivo entero en el Worker.
const ALLOWED_EMAILS = [
  'contact.deploystudio@gmail.com',
  'proyecto.s3object@gmail.com',
  'francosantilli71@gmail.com',
];

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

function isAllowedOrigin(origin) {
  return origin === PRODUCTION_ORIGIN || LOCALHOST_ORIGIN.test(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// base64url sin relleno (=) - el estándar para usar base64 adentro de una
// URL/token sin que los caracteres +/= compliquen nada.
function toBase64Url(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

async function makeToken(email, secret) {
  const payload = JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

async function readToken(token, secret) {
  const [payloadB64, sig] = String(token || '').split('.');
  if (!payloadB64 || !sig) return null;
  const expected = await hmac(secret, payloadB64);
  if (expected !== sig) return null; // firma no coincide - token falso o secret rotado
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
  } catch {
    return null;
  }
  if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, headers);

    const url = new URL(request.url);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body inválido' }, 400, headers);
    }

    if (url.pathname === '/login') {
      const email = (body?.email || '').toString().trim().toLowerCase();
      if (!email) return json({ error: 'Falta el mail' }, 400, headers);
      if (!ALLOWED_EMAILS.includes(email)) {
        return json({ error: 'Ese mail no tiene acceso al panel. Si creés que es un error, escribinos.' }, 403, headers);
      }
      const token = await makeToken(email, env.AUTH_SECRET);
      return json({ ok: true, token, email }, 200, headers);
    }

    if (url.pathname === '/verify') {
      const payload = await readToken(body?.token, env.AUTH_SECRET);
      if (!payload) return json({ ok: false }, 200, headers);
      return json({ ok: true, email: payload.email }, 200, headers);
    }

    return json({ error: 'No encontrado' }, 404, headers);
  },
};
