/* ═══════════════════════════════════════════════
   contract - Cloudflare Worker
   Backend del firmador de contratos (ver firmar-contrato.html y
   armar-contrato.html). Tres rutas:

   POST /upload   Deploy sube el PDF del contrato de un cliente (con
                  clave de administrador) junto con el número de
                  presupuesto (?budget=003) → lo guarda en KV bajo un id
                  "003-a1b2c3" (número + 6 caracteres random) y devuelve
                  ese id. El número solo es para que Deploy reconozca el
                  link de un vistazo - los 6 caracteres random son la
                  protección real: sin ellos, cualquiera podría probar
                  /firmar-contrato/001, /002... y ver contratos ajenos
                  (nombre, CUIT/DNI, domicilio de otro cliente). Deploy
                  arma el link firmar-contrato.html?id=<id> (reescrito a
                  /firmar-contrato/<id> por _redirects) y se lo pasa al
                  cliente.
   GET  /contract?id=...
                  El cliente lo pide desde firmar-contrato.html para
                  cargar su contrato sin tener que subir el archivo.
                  Público (sin clave) - el id (con su parte random) ES
                  la protección, como cualquier link para compartir.
   POST /send     Recibe el PDF ya firmado (armado en el navegador del
                  cliente) y lo reenvía por mail a Deploy Studio como
                  adjunto, usando la API de Resend. Si venía de un link
                  con id, borra esa entrada de KV (un solo uso).

   La llave de Resend y la clave de administrador viven como secrets
   del Worker (RESEND_API_KEY, ADMIN_TOKEN) - nunca llegan al navegador.

   Deploy: mismo patrón manual que worker/seo-check.js (pegar el código
   en el dashboard de Cloudflare, Workers & Pages → Create → Worker).
   Nombrar el Worker "contrato" para que la URL le quede
   contrato.contact-deploystudio.workers.dev (coincide con WORKER_URL
   en js/firmar-contrato.js y js/armar-contrato.js).
   Requiere:
   - Un namespace de KV (Workers & Pages → KV → Create) bindeado a este
     Worker como CONTRACTS (Settings → Variables → KV Namespace
     Bindings).
   - Verificar el dominio deploystudio.com.ar en Resend (DNS en
     Cloudflare) para poder usar FROM_EMAIL.
   - Secret RESEND_API_KEY (la key que da Resend).
   - Secret ADMIN_TOKEN (una clave que elijas vos, para que solo vos
     puedas subir contratos nuevos vía /upload).
   ═══════════════════════════════════════════════ */

const PRODUCTION_ORIGIN = 'https://deploystudio.com.ar';
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const TO_EMAIL = 'contact.deploystudio@gmail.com';
const FROM_EMAIL = 'contrato@deploystudio.com.ar';
const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB, de sobra para un contrato
const LINK_TTL_SECONDS = 60 * 60 * 6; // los links sin firmar expiran solos a las 6 horas
const ID_RE = /^[a-z0-9]{1,24}-[a-f0-9]{6}$/i;

function isAllowedOrigin(origin) {
  return origin === PRODUCTION_ORIGIN || LOCALHOST_ORIGIN.test(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);

    if (url.pathname === '/upload' && request.method === 'POST') return handleUpload(request, url, env, headers);
    if (url.pathname === '/contract' && request.method === 'GET') return handleGetContract(url, env, headers);
    if (url.pathname === '/send' && request.method === 'POST') return handleSend(request, env, headers);

    return json({ error: 'No encontrado' }, 404, headers);
  },
};

// ── POST /upload?budget=003 ───────────────────────────────────────────
async function handleUpload(request, url, env, headers) {
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'No autorizado' }, 401, headers);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: 'Falta el PDF' }, 400, headers);
  if (bytes.length > MAX_PDF_BYTES) return json({ error: 'El PDF es demasiado grande' }, 413, headers);

  // El número de presupuesto es solo para que el id sea reconocible de
  // un vistazo - se limpia a alfanumérico (nada de espacios/símbolos que
  // compliquen la URL) y se recorta. Si no llega ninguno, "contrato" a
  // secas como prefijo por default.
  const rawBudget = (url.searchParams.get('budget') || 'contrato').toString();
  const budgetSlug = (rawBudget.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'contrato').toLowerCase();
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
  const id = `${budgetSlug}-${suffix}`;

  await env.CONTRACTS.put(id, bytes, { expirationTtl: LINK_TTL_SECONDS });

  return json({ id }, 200, headers);
}

// ── GET /contract?id=... ────────────────────────────────────────────
async function handleGetContract(url, env, headers) {
  const id = url.searchParams.get('id') || '';
  if (!ID_RE.test(id)) return json({ error: 'Id inválido' }, 400, headers);

  const bytes = await env.CONTRACTS.get(id, 'arrayBuffer');
  if (!bytes) return json({ error: 'No encontramos ese contrato - puede haber expirado o ya haberse firmado' }, 404, headers);

  return new Response(bytes, { headers: { ...headers, 'Content-Type': 'application/pdf' } });
}

// ── POST /send ───────────────────────────────────────────────────────
async function handleSend(request, env, headers) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400, headers);
  }

  const { pdfBase64, clientName, fileName, id } = body || {};
  if (!pdfBase64 || typeof pdfBase64 !== 'string') return json({ error: 'Falta el PDF' }, 400, headers);
  if (pdfBase64.length > MAX_PDF_BYTES * 1.4) return json({ error: 'El PDF es demasiado grande' }, 413, headers);

  const safeName = (clientName || 'Sin nombre').toString().slice(0, 120);
  const safeFileName = (fileName || 'contrato-firmado.pdf').toString().replace(/[^\w.\- ]/g, '_').slice(0, 120);

  let resendRes;
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Deploy Studio <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: `Contrato firmado - ${safeName}`,
        text: `Firmó: ${safeName}\n\nAdjunto el contrato firmado desde deploystudio.com.ar/firmar-contrato`,
        attachments: [{ filename: safeFileName, content: pdfBase64 }],
      }),
    });
  } catch {
    return json({ error: 'No se pudo conectar con el servicio de mail' }, 502, headers);
  }

  if (!resendRes.ok) {
    // Cubre tanto el límite diario/mensual de Resend como cualquier otro
    // error de su lado - en el navegador esto dispara el estado de "no
    // se pudo enviar, mandalo por WhatsApp" (ver js/firmar-contrato.js).
    const detail = await resendRes.text().catch(() => '');
    return json({ error: 'No se pudo enviar el mail', status: resendRes.status, detail }, 502, headers);
  }

  // Link de un solo uso: una vez que se mandó bien el mail, borramos el
  // contrato sin firmar de KV para que ese link no sirva para "firmar de
  // nuevo" ni quede ocupando espacio indefinidamente.
  if (id && ID_RE.test(id)) {
    await env.CONTRACTS.delete(id).catch(() => {});
  }

  return json({ ok: true }, 200, headers);
}
