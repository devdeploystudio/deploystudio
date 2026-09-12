/* ═══════════════════════════════════════════════
   seo-check — Cloudflare Worker
   Analiza el SEO on-page de una URL: la trae server-to-server (evita el
   bloqueo de CORS que tendría el navegador al leer el HTML de otro
   sitio), la parsea con HTMLRewriter (nativo de Workers, sin DOM), y
   devuelve un JSON con los resultados para que js/seo.js lo muestre.

   ── CÓMO DEPLOYARLO ──
   1. Cloudflare Dashboard → Workers & Pages → Create → Create Worker.
   2. Pegá TODO este archivo en el editor, reemplazando el ejemplo.
   3. Deploy. Cloudflare te da una URL tipo
      https://seo-check.<tu-subdominio>.workers.dev
   4. Copiá esa URL y pegala en WORKER_URL, arriba de js/seo.js.
   ═══════════════════════════════════════════════ */

// Dominio desde el que se puede llamar a este Worker. Cambiar si el sitio
// se sirve desde otro dominio.
const ALLOWED_ORIGIN = 'https://deploystudio.com.ar';

export default {
  async fetch(request) {
    const headers = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Falta el parámetro url' }), { status: 400, headers });
    }

    let parsed;
    try {
      parsed = new URL(target);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol');
    } catch (e) {
      return new Response(JSON.stringify({ error: 'URL inválida' }), { status: 400, headers });
    }

    try {
      const result = await analyze(parsed);
      return new Response(JSON.stringify(result), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'No pudimos analizar esa URL' }), { status: 502, headers });
    }
  },
};

async function analyze(parsed) {
  const pageRes = await fetch(parsed.toString(), { redirect: 'follow' });
  const contentType = pageRes.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error('not-html');

  const data = {
    title: null,
    metaDescription: null,
    viewport: false,
    canonical: null,
    ogTitle: false,
    ogDescription: false,
    ogImage: false,
    h1Count: 0,
    h1Text: null,
    lang: null,
    structuredData: false,
    imgTotal: 0,
    imgWithAlt: 0,
  };

  let capturingTitle = false;
  let capturingH1 = false;

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(el) { data.lang = el.getAttribute('lang'); },
    })
    .on('title', {
      element() { capturingTitle = true; data.title = ''; },
      text(t) { if (capturingTitle) data.title += t.text; },
    })
    .on('meta[name=description]', {
      element(el) { data.metaDescription = el.getAttribute('content'); },
    })
    .on('meta[name=viewport]', {
      element() { data.viewport = true; },
    })
    .on('link[rel=canonical]', {
      element(el) { data.canonical = el.getAttribute('href'); },
    })
    .on('meta[property="og:title"]', { element() { data.ogTitle = true; } })
    .on('meta[property="og:description"]', { element() { data.ogDescription = true; } })
    .on('meta[property="og:image"]', { element() { data.ogImage = true; } })
    .on('h1', {
      element() {
        data.h1Count++;
        capturingH1 = data.h1Count === 1;
        if (capturingH1) data.h1Text = '';
      },
      text(t) { if (capturingH1) data.h1Text += t.text; },
    })
    .on('script[type="application/ld+json"]', { element() { data.structuredData = true; } })
    .on('img', {
      element(el) {
        data.imgTotal++;
        const alt = el.getAttribute('alt');
        if (alt && alt.trim()) data.imgWithAlt++;
      },
    });

  // HTMLRewriter transforma en streaming: hay que consumir la respuesta
  // (.text()) para que dispare los handlers de arriba sobre todo el HTML.
  await rewriter.transform(pageRes).text();

  const [robotsOk, sitemapOk] = await Promise.all([
    checkExists(parsed, '/robots.txt'),
    checkExists(parsed, '/sitemap.xml'),
  ]);

  const title = (data.title || '').trim();
  const description = (data.metaDescription || '').trim();
  const h1 = (data.h1Text || '').trim();

  return {
    url: parsed.toString(),
    checks: {
      https: { ok: parsed.protocol === 'https:' },
      title: { ok: title.length > 0 && title.length <= 60, value: title, length: title.length },
      metaDescription: { ok: description.length > 0 && description.length <= 160, value: description, length: description.length },
      h1: { ok: data.h1Count === 1, count: data.h1Count, value: h1 },
      viewport: { ok: data.viewport },
      canonical: { ok: !!data.canonical, value: data.canonical },
      ogTitle: { ok: data.ogTitle },
      ogDescription: { ok: data.ogDescription },
      ogImage: { ok: data.ogImage },
      altText: {
        ok: data.imgTotal === 0 || data.imgWithAlt === data.imgTotal,
        total: data.imgTotal,
        withAlt: data.imgWithAlt,
        pct: data.imgTotal ? Math.round((data.imgWithAlt / data.imgTotal) * 100) : 100,
      },
      robotsTxt: { ok: robotsOk },
      sitemapXml: { ok: sitemapOk },
      structuredData: { ok: data.structuredData },
      lang: { ok: !!data.lang, value: data.lang },
    },
  };
}

async function checkExists(parsed, path) {
  try {
    const res = await fetch(new URL(path, parsed.origin).toString());
    return res.ok;
  } catch (e) {
    return false;
  }
}
