/* ═══════════════════════════════════════════════
   send-contract - Cloudflare Worker
   Recibe el PDF de un contrato ya firmado (armado en el navegador del
   cliente, ver firmar-contrato.html/js/firmar-contrato.js) y lo reenvía por mail a
   Deploy Studio como adjunto, usando la API de Resend. La llave de
   Resend vive como secret del Worker (RESEND_API_KEY) - nunca llega al
   navegador del cliente.

   Deploy: mismo patrón manual que worker/seo-check.js (pegar el código
   en el dashboard de Cloudflare, Workers & Pages → Create → Worker).
   Requiere:
   - Verificar el dominio deploystudio.com.ar en Resend (DNS en
     Cloudflare) para poder usar FROM_EMAIL.
   - Cargar el secret RESEND_API_KEY en el Worker (Settings → Variables
     and Secrets → Add → tipo "Secret").
   ═══════════════════════════════════════════════ */

const PRODUCTION_ORIGIN = 'https://deploystudio.com.ar';
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const TO_EMAIL = 'contact.deploystudio@gmail.com';
const FROM_EMAIL = 'contrato@deploystudio.com.ar';
// Tamaño máximo del string base64 recibido (~8MB reales de PDF, de sobra
// para un contrato firmado - un PDF de texto normal pesa unos cientos de KB).
const MAX_BASE64_LEN = 8 * 1024 * 1024 * 1.4;

function isAllowedOrigin(origin) {
  return origin === PRODUCTION_ORIGIN || LOCALHOST_ORIGIN.test(origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN;
    const headers = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400, headers });
    }

    const { pdfBase64, clientName, fileName } = body || {};
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el PDF' }), { status: 400, headers });
    }
    if (pdfBase64.length > MAX_BASE64_LEN) {
      return new Response(JSON.stringify({ error: 'El PDF es demasiado grande' }), { status: 413, headers });
    }

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
          text: `Firmó: ${safeName}\n\nAdjunto el contrato firmado desde deploystudio.com.ar/firmar-contrato.html`,
          attachments: [{ filename: safeFileName, content: pdfBase64 }],
        }),
      });
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo conectar con el servicio de mail' }), { status: 502, headers });
    }

    if (!resendRes.ok) {
      // Cubre tanto el límite diario/mensual de Resend como cualquier
      // otro error de su lado - en el navegador esto dispara el estado
      // de "no se pudo enviar, mandalo por WhatsApp" (ver js/firmar-contrato.js).
      const detail = await resendRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'No se pudo enviar el mail', status: resendRes.status, detail }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  },
};
