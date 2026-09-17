/* ═══════════════════════════════════════════════
   contacto - Cloudflare Worker
   Backend del formulario de contacto de deploystudio.com.ar (#contacto,
   ver js/script.js, bloque "12. FORMULARIO"). Reemplaza a FormSubmit.co:
   mismo resultado (un mail a Deploy con la consulta), pero sin depender
   de un tercero ni de activar el mail a mano la primera vez.

   POST /   Recibe los datos del formulario (nombre, email, marca,
             servicios, mensaje), valida lo mínimo del lado del server
             (por si alguien pega directo al Worker salteando el
             formulario) y lo manda por mail a Deploy Studio usando la
             API de Resend, con reply_to al mail de quien escribió (así
             se puede responder directo desde el mail, sin copiar y
             pegar la dirección).

   La llave de Resend vive como secret del Worker (RESEND_API_KEY) -
   nunca llega al navegador.

   Deploy: mismo patrón manual que worker/contract.js y worker/seo-check.js
   (pegar el código en el dashboard de Cloudflare, Workers & Pages →
   Create → Worker). Nombrar el Worker "contacto" para que la URL le
   quede contacto.contact-deploystudio.workers.dev (coincide con
   FORM_ENDPOINT en js/script.js). Requiere:
   - El dominio deploystudio.com.ar ya está verificado en Resend (se hizo
     para worker/contract.js) - no hace falta verificarlo de nuevo, FROM_EMAIL
     usa ese mismo dominio.
   - Secret RESEND_API_KEY: la MISMA key que ya se cargó en el Worker
     "contrato" (Settings → Variables → Secrets → Add). Se puede reusar
     la misma key de Resend en los dos Workers sin problema.
   ═══════════════════════════════════════════════ */

const PRODUCTION_ORIGIN = 'https://deploystudio.com.ar';
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const TO_EMAIL = 'contact.deploystudio@gmail.com';
const FROM_EMAIL = 'contacto@deploystudio.com.ar';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LEN = { nombre: 120, email: 200, marca: 120, mensaje: 4000, servicio: 60 };

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

// Escapa texto de usuario antes de meterlo en el HTML del mail (evita que
// alguien inyecte tags/estilos raros en el correo que recibe Deploy).
function escHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, headers);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body inválido' }, 400, headers);
    }

    const nombre = (body?.nombre || '').toString().trim().slice(0, MAX_LEN.nombre);
    const email = (body?.email || '').toString().trim().slice(0, MAX_LEN.email);
    const marca = (body?.marca || '').toString().trim().slice(0, MAX_LEN.marca);
    const mensaje = (body?.mensaje || '').toString().trim().slice(0, MAX_LEN.mensaje);
    const servicios = Array.isArray(body?.servicios)
      ? body.servicios.map(s => (s || '').toString().trim().slice(0, MAX_LEN.servicio)).filter(Boolean)
      : [];

    // Mismas reglas que ya valida js/script.js del lado del cliente - acá
    // se repiten por si alguien le pega directo al Worker salteando el
    // formulario (el cliente no es una fuente confiable).
    if (!nombre) return json({ error: 'Falta el nombre' }, 400, headers);
    if (!EMAIL_RE.test(email)) return json({ error: 'Email inválido' }, 400, headers);
    if (!mensaje) return json({ error: 'Falta el mensaje' }, 400, headers);

    const marcaLinea = marca || '—';
    const serviciosLinea = servicios.length ? servicios.join(', ') : '—';

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
          reply_to: [email],
          subject: `Consulta Deploy Studio - ${marca || nombre}`,
          text: `Nombre: ${nombre}\nEmail: ${email}\nProyecto / marca: ${marcaLinea}\nServicios: ${serviciosLinea}\n\nMensaje:\n${mensaje}`,
          html: `<p><b>Nombre:</b> ${escHtml(nombre)}</p>
<p><b>Email:</b> ${escHtml(email)}</p>
<p><b>Proyecto / marca:</b> ${escHtml(marcaLinea)}</p>
<p><b>Servicios:</b> ${escHtml(serviciosLinea)}</p>
<p><b>Mensaje:</b><br>${escHtml(mensaje).replace(/\n/g, '<br>')}</p>`,
        }),
      });
    } catch {
      return json({ error: 'No se pudo conectar con el servicio de mail' }, 502, headers);
    }

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => '');
      return json({ error: 'No se pudo enviar el mail', status: resendRes.status, detail }, 502, headers);
    }

    return json({ ok: true }, 200, headers);
  },
};
