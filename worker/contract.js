/* ═══════════════════════════════════════════════
   contract - Cloudflare Worker
   Backend del firmador de contratos (ver firmar-contrato.html y
   armar-contrato.html). Tres rutas:

   POST /upload   Deploy sube el PDF del contrato de un cliente (con
                  clave de administrador) junto con el número de
                  presupuesto y los datos del cliente
                  (?budget=003&name=Juan&lastname=Pérez&email=...) → lo
                  guarda en KV bajo un id "003-a1b2c3" (número + 6
                  caracteres random) y devuelve ese id. El número solo
                  es para que Deploy reconozca el link de un vistazo -
                  los 6 caracteres random son la protección real: sin
                  ellos, cualquiera podría probar
                  /contrato/firmar-contrato/001, /002... y ver contratos
                  ajenos (nombre, CUIT/DNI, domicilio de otro cliente).
                  name/lastname/email quedan como metadata de KV (no en
                  el PDF en sí) - firmar-contrato.html los pide para
                  prellenar el nombre del firmante y armar el nombre de
                  archivo. Deploy arma el link
                  contrato/firmar-contrato.html?id=<id> (reescrito a
                  /contrato/firmar-contrato/<id> por _redirects) y se lo
                  pasa al cliente.
                  Si además viene ?id=<id existente>, en vez de generar
                  un link nuevo se pisa el PDF (y la metadata) de ESE id,
                  siempre que todavía exista en KV sin firmar - así
                  Deploy puede corregir un error en el PDF sin tener que
                  reenviarle al cliente un link distinto. Si el id ya no
                  existe (se firmó, se usó o expiró), devuelve 404 en vez
                  de crear silenciosamente un link nuevo bajo otro id.
   GET  /contract?id=...
                  El cliente lo pide desde firmar-contrato.html para
                  cargar su contrato sin tener que subir el archivo.
                  Público (sin clave) - el id (con su parte random) ES
                  la protección, como cualquier link para compartir.
                  Devuelve el PDF y la metadata (name/lastname/email) en
                  headers X-Client-*.
   POST /send     Recibe el PDF ya firmado (armado en el navegador del
                  cliente, con el nombre de archivo ya armado ahí) y lo
                  reenvía por mail a Deploy Studio como adjunto, usando
                  la API de Resend. Si vino un mail de cliente, le manda
                  ADEMÁS una copia con diseño propio (logo, más prolijo)
                  directo al cliente. Si venía de un link con id, borra
                  esa entrada de KV (un solo uso).

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
const LINK_TTL_SECONDS = 60 * 60 * 24; // los links sin firmar expiran solos a las 24 horas
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
    // Por default el navegador solo deja leer desde JS un puñado de
    // headers de respuesta "seguros" en pedidos cross-origin (Content-
    // Type, Content-Length, etc.) - sin esto, firmar-contrato.js no
    // podría leer los X-Client-* que devuelve /contract con fetch().
    'Access-Control-Expose-Headers': 'X-Client-Name, X-Client-Lastname, X-Client-Email, X-Budget',
    'Vary': 'Origin',
  };
}

// Los headers HTTP solo aceptan texto ASCII - un nombre con tilde
// ("Pérez") rompería el header tal cual. encodeURIComponent lo deja en
// ASCII seguro; el otro lado (js/firmar-contrato.js) hace
// decodeURIComponent para recuperar el texto real.
function encodeHeader(value) {
  return encodeURIComponent((value || '').toString().slice(0, 200));
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

  // name/lastname/email van como metadata de KV, no como parte del PDF -
  // sirven para prellenar el nombre del firmante en firmar-contrato.html
  // y armar el nombre de archivo ("contrato-apellido-nombre-numero.pdf"),
  // y el email para mandarle ahí la copia con diseño una vez que firme.
  const metadata = {
    budget: url.searchParams.get('budget') || '',
    name: url.searchParams.get('name') || '',
    lastname: url.searchParams.get('lastname') || '',
    email: url.searchParams.get('email') || '',
  };

  // Reemplazo de un link ya emitido: si viene ?id=<id>, se pisa el PDF (y
  // la metadata) de ese id en vez de crear uno nuevo, siempre que
  // todavía exista sin firmar en KV. Se chequea existencia antes de
  // escribir para no crear silenciosamente un "link nuevo" bajo un id
  // que en realidad ya expiró o se usó - eso confundiría a Deploy, que
  // esperaría estar corrigiendo el link que ya le pasó al cliente.
  const replaceId = (url.searchParams.get('id') || '').toString();
  if (replaceId) {
    if (!ID_RE.test(replaceId)) return json({ error: 'Id inválido' }, 400, headers);
    const existing = await env.CONTRACTS.get(replaceId);
    if (existing === null) {
      return json({ error: 'Ese link ya no existe (se firmó, se usó o expiró) - armá uno nuevo dejando el campo de reemplazo vacío' }, 404, headers);
    }
    await env.CONTRACTS.put(replaceId, bytes, { expirationTtl: LINK_TTL_SECONDS, metadata });
    return json({ id: replaceId }, 200, headers);
  }

  // El número de presupuesto es solo para que el id sea reconocible de
  // un vistazo - se limpia a alfanumérico (nada de espacios/símbolos que
  // compliquen la URL) y se recorta. Si no llega ninguno, "contrato" a
  // secas como prefijo por default.
  const rawBudget = (url.searchParams.get('budget') || 'contrato').toString();
  const budgetSlug = (rawBudget.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'contrato').toLowerCase();
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
  const id = `${budgetSlug}-${suffix}`;

  await env.CONTRACTS.put(id, bytes, { expirationTtl: LINK_TTL_SECONDS, metadata });

  return json({ id }, 200, headers);
}

// ── GET /contract?id=... ────────────────────────────────────────────
async function handleGetContract(url, env, headers) {
  const id = url.searchParams.get('id') || '';
  if (!ID_RE.test(id)) return json({ error: 'Id inválido' }, 400, headers);

  const { value: bytes, metadata } = await env.CONTRACTS.getWithMetadata(id, 'arrayBuffer');
  if (!bytes) return json({ error: 'No encontramos ese contrato - puede haber expirado o ya haberse firmado' }, 404, headers);

  return new Response(bytes, {
    headers: {
      ...headers,
      'Content-Type': 'application/pdf',
      'X-Client-Name': encodeHeader(metadata && metadata.name),
      'X-Client-Lastname': encodeHeader(metadata && metadata.lastname),
      'X-Client-Email': encodeHeader(metadata && metadata.email),
      'X-Budget': encodeHeader(metadata && metadata.budget),
    },
  });
}

// ── POST /send ───────────────────────────────────────────────────────
async function handleSend(request, env, headers) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400, headers);
  }

  const { pdfBase64, clientName, clientEmail, fileName, id } = body || {};
  if (!pdfBase64 || typeof pdfBase64 !== 'string') return json({ error: 'Falta el PDF' }, 400, headers);
  if (pdfBase64.length > MAX_PDF_BYTES * 1.4) return json({ error: 'El PDF es demasiado grande' }, 413, headers);

  const safeName = (clientName || 'Sin nombre').toString().slice(0, 120);
  // fileName ya viene prolijo desde el navegador
  // (contrato-apellido-nombre-numero.pdf, ver buildFileName en
  // js/firmar-contrato.js) - acá solo se lo sanitiza por las dudas.
  const safeFileName = (fileName || 'contrato-firmado.pdf').toString().replace(/[^\w.\- ]/g, '_').slice(0, 120);
  const attachment = { filename: safeFileName, content: pdfBase64 };

  // Mail interno a Deploy con el PDF firmado adjunto.
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
        text: `Firmó: ${safeName}`,
        attachments: [attachment],
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

  // Mail de cortesía al cliente, con diseño propio y el PDF adjunto -
  // solo si Deploy cargó su mail al armar el link (armar-contrato.html).
  // No es bloqueante: si este falla, el contrato ya quedó recibido por
  // Deploy de todas formas (el mail de arriba ya se mandó bien), así
  // que no vale la pena mostrarle un error al cliente por esto.
  const safeEmail = (clientEmail || '').toString().trim();
  if (safeEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Deploy Studio <${FROM_EMAIL}>`,
          to: [safeEmail],
          subject: 'Tu contrato con Deploy Studio ya está firmado',
          html: clientEmailHtml(safeName),
          attachments: [attachment],
        }),
      });
    } catch (err) {
      console.error('mail al cliente falló (no bloqueante):', err);
    }
  }

  // Link de un solo uso: una vez que se mandó bien el mail, borramos el
  // contrato sin firmar de KV para que ese link no sirva para "firmar de
  // nuevo" ni quede ocupando espacio indefinidamente.
  if (id && ID_RE.test(id)) {
    await env.CONTRACTS.delete(id).catch(() => {});
  }

  return json({ ok: true }, 200, headers);
}

// Mail HTML simple para el cliente - estilos inline a propósito (los
// clientes de mail no soportan <style> ni CSS moderno de forma
// confiable), con los colores/tipografía de la marca. La imagen del
// logo apunta al sitio en vivo (deploystudio.com.ar) porque los mails
// no pueden traer archivos propios embebidos de forma confiable.
// logo-mail.png es una copia de img/logo.png recortada (sharp .trim())
// a solo el isotipo - el original es un cuadrado de 4961x4961 con
// mucho margen alrededor, que en un header angosto de mail se veía
// como un recuadro alto de más.
//
// Modo oscuro del cliente de mail: Gmail (sobre todo la app de
// Android/iOS) reinterpreta solo por su cuenta los colores de un mail
// que no diga lo contrario - el header con el logo (fondo crema
// #FAFAF8) quedaba invertido a un gris oscuro random, mientras el resto
// del mail no siempre corría la misma suerte, un despelote visual sin
// ninguna lógica de marca. <meta name="color-scheme"/"supported-color-
// schemes" content="light"> es la forma estándar de decirle a Gmail/
// Apple Mail/Outlook.com "este mail ya está diseñado para verse así,
// no lo reinterpretes" - en los clientes que lo respetan (la mayoría),
// esto alcanza y el mail se ve igual siempre, oscuro o no.
// Como red de contención para el puñado de clientes que igual llegan a
// aplicar su propio modo oscuro (Gmail no lee @media prefers-color-
// scheme en absoluto, pero Apple Mail y algunos otros sí), el <style>
// de abajo pide explícitamente: si el dispositivo está en oscuro, el
// header pierde el fondo crema (para no chocar con lo que sea que el
// cliente pintó alrededor) y el isotipo PNG (negro, pensado para fondo
// claro) se cambia por un wordmark de texto blanco - no existe una
// versión blanca del logo como imagen, así que se arma con HTML/CSS en
// vez de mantener un archivo aparte para este único caso.
function clientEmailHtml(name) {
  const firstName = (name || '').toString().split(' ')[0] || '';
  // Tabla con bgcolor (no un <div> con background) para el fondo
  // cremita a propósito: Gmail/Outlook suelen ignorar el background de
  // un <div> suelto en mails, pero sí respetan el bgcolor/background de
  // una <table> - así se ve igual en el cliente de mail real, no solo
  // en el navegador.
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Deploy Studio</title>
<style>
  @media (prefers-color-scheme: dark) {
    .ds-logo-header { background:#0D0D0D !important; border-bottom-color:#242424 !important; }
    .ds-logo-img { display:none !important; }
    .ds-logo-fallback { display:block !important; }
    .ds-footer { background:#0D0D0D !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FAFAF8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FAFAF8" style="background:#FAFAF8;">
  <tr>
    <td align="center" style="padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:480px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #DDDDDD;">
        <tr>
          <td class="ds-logo-header" bgcolor="#FAFAF8" style="padding:28px 32px;background:#FAFAF8;text-align:center;border-bottom:1px solid #DDDDDD;">
            <img class="ds-logo-img" src="https://deploystudio.com.ar/img/logo-mail.png" alt="Deploy Studio" width="170" style="display:block;margin:0 auto;border:0;" />
            <div class="ds-logo-fallback" style="display:none;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;color:#ffffff;">
              <span style="color:#84E600;">/</span>deploy<span style="color:#84E600;">_</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5c9900;font-weight:bold;margin:0 0 12px;">Contrato firmado</p>
            <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#0D0D0D;">¡Listo${firstName ? ', ' + firstName : ''}!</h1>
            <p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0 0 16px;">
              Tu contrato con Deploy Studio quedó firmado correctamente. Te dejamos una copia adjunta en este mail para que la guardes.
            </p>
            <p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0;">
              Cualquier duda, escribinos y lo vemos.
            </p>
          </td>
        </tr>
        <tr>
          <td class="ds-footer" bgcolor="#FAFAF8" style="padding:18px 32px;background:#FAFAF8;text-align:center;">
            <p style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:.5px;color:#B7B7B7;margin:0;">deploy studio_ · deploystudio.com.ar</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}
