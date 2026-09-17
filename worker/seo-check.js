/* ═══════════════════════════════════════════════
   seo-check - Cloudflare Worker
   Analiza el SEO y la performance on-page de una URL: la trae
   server-to-server (evita el bloqueo de CORS que tendría el navegador al
   leer el HTML de otro sitio), la parsea con HTMLRewriter (nativo de
   Workers, sin DOM), y devuelve un JSON con los resultados para que
   js/seo.js y js/performance.js lo muestren.

   Nota sobre performance: esto NO reemplaza a Lighthouse/PageSpeed
   Insights real (LCP, CLS, INP) - esas métricas necesitan un navegador
   de verdad renderizando la página, algo que un Worker no puede hacer
   sin pagar Cloudflare Browser Rendering. Lo que sí podemos chequear sin
   navegador (tiempo de respuesta, peso, caché, scripts y hojas de estilo
   bloqueantes, carga diferida de imágenes, cantidad de recursos) son
   señales reales y útiles, pero son un proxy liviano, no el puntaje
   oficial de Google.
   ═══════════════════════════════════════════════ */

// Orígenes desde los que se puede llamar a este Worker: el sitio real, más
// localhost/127.0.0.1 en cualquier puerto (dev-server.js, Vite, Live
// Server, lo que sea) para poder probar en desarrollo sin deployar cada
// vez. Nunca poner "*" acá - dejaría que cualquier otro sitio use el
// Worker gratis y coma la cuota de Cloudflare.
const PRODUCTION_ORIGIN = 'https://deploystudio.com.ar';
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin){
  return origin === PRODUCTION_ORIGIN || LOCALHOST_ORIGIN.test(origin);
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN;

    const headers = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Origin',
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
  const startedAt = Date.now();
  const pageRes = await fetch(parsed.toString(), { redirect: 'follow' });
  const ttfbMs = Date.now() - startedAt;

  const contentType = pageRes.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error('not-html');

  // Cabeceras para los chequeos de performance - hay que leerlas ANTES de
  // consumir el body con HTMLRewriter (después ya no son confiables en
  // todos los runtimes de Workers).
  // Nota: NO se puede chequear compresión (Content-Encoding) desde acá.
  // fetch() - tanto en Workers como en el navegador - descomprime la
  // respuesta automáticamente y elimina ese header del objeto Response
  // (es el comportamiento estándar de la spec Fetch, no algo de Workers).
  // Confirmado con curl directo: deploystudio.com.ar SÍ manda
  // "Content-Encoding: br", pero acá siempre daría "ninguna" sin importar
  // el sitio - por eso no está entre los chequeos.
  // Ojo: el Cache-Control del HTML mismo NO es lo que hay que chequear acá
  // - la recomendación de "cachear mucho tiempo" (Lighthouse habla de
  // meses) es para los ARCHIVOS ESTÁTICOS (CSS, JS), no para el
  // documento HTML, que casi siempre conviene revalidar en cada visita
  // para no mostrar contenido viejo. Por eso este chequeo pide el
  // Cache-Control real de los propios CSS/JS del sitio más abajo, no el
  // de esta respuesta.
  const declaredLength = pageRes.headers.get('content-length');
  const hsts = pageRes.headers.get('strict-transport-security') || '';

  const data = {
    title: null,
    metaDescription: null,
    metaRobots: null,
    viewport: false,
    canonical: null,
    ogTitle: false,
    ogDescription: false,
    ogImage: false,
    favicon: false,
    h1Count: 0,
    h1Text: null,
    h2Count: 0,
    lang: null,
    structuredData: false,
    imgTotal: 0,
    imgWithAlt: 0,
    imgWithDims: 0,
    imgLazy: 0,
    mixedContent: 0,
    headScriptsBlocking: 0,
    headStylesheetsBlocking: 0,
    scriptsTotal: 0,
    stylesheetsTotal: 0,
    structuredDataText: '',
    assetUrls: [], // CSS/JS propios (mismo origen) para chequear su caché real más abajo
  };
  const MAX_ASSETS_TO_CHECK = 4;

  let capturingTitle = false;
  let capturingH1 = false;
  let capturingStructuredData = false;
  let structuredDataCaptured = false; // solo valida el PRIMER bloque ld+json - concatenar varios rompería el JSON.parse
  let inHead = false;

  // Junta URLs de CSS/JS del MISMO origen (no CDNs de terceros - su caché
  // no depende del cliente, chequearla no le sirve de nada) para pedirles
  // el Cache-Control real más abajo. Tope de 4 para no demorar el análisis.
  function trackAsset(rawUrl) {
    if (data.assetUrls.length >= MAX_ASSETS_TO_CHECK) return;
    try {
      const u = new URL(rawUrl, parsed.toString());
      if (u.origin === parsed.origin) data.assetUrls.push(u.toString());
    } catch (e) { /* URL inválida - se ignora */ }
  }

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(el) { data.lang = el.getAttribute('lang'); },
    })
    .on('head', {
      element(el) {
        inHead = true;
        el.onEndTag(() => { inHead = false; });
      },
    })
    .on('title', {
      element() { capturingTitle = true; data.title = ''; },
      text(t) { if (capturingTitle) data.title += t.text; },
    })
    .on('meta[name=description]', {
      element(el) { data.metaDescription = el.getAttribute('content'); },
    })
    .on('meta[name=robots]', {
      element(el) { data.metaRobots = el.getAttribute('content'); },
    })
    .on('meta[name=viewport]', {
      element() { data.viewport = true; },
    })
    .on('link[rel=canonical]', {
      element(el) { data.canonical = el.getAttribute('href'); },
    })
    .on('link[rel=icon]', { element() { data.favicon = true; } })
    .on('link[rel="shortcut icon"]', { element() { data.favicon = true; } })
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
    .on('h2', { element() { data.h2Count++; } })
    .on('script[type="application/ld+json"]', {
      element(el) {
        data.structuredData = true;
        if (!structuredDataCaptured) {
          capturingStructuredData = true;
          el.onEndTag(() => { capturingStructuredData = false; structuredDataCaptured = true; });
        }
      },
      text(t) { if (capturingStructuredData) data.structuredDataText += t.text; },
    })
    .on('img', {
      element(el) {
        data.imgTotal++;
        // alt="" (vacío pero presente) es correcto para imágenes
        // decorativas - le dice al lector de pantalla que la salte, a
        // propósito. Lo único que realmente falta es cuando el atributo
        // alt no existe en absoluto (getAttribute devuelve null): ahí sí
        // un lector de pantalla puede leer el nombre del archivo en su
        // lugar, que es el problema real de accesibilidad.
        if (el.getAttribute('alt') !== null) data.imgWithAlt++;
        if (el.getAttribute('width') && el.getAttribute('height')) data.imgWithDims++;
        if (el.getAttribute('loading') === 'lazy') data.imgLazy++;
      },
    })
    .on('img[src^="http://"], script[src^="http://"], link[href^="http://"]', {
      element() { data.mixedContent++; },
    })
    .on('script[src]', {
      element(el) {
        data.scriptsTotal++;
        if (inHead && el.getAttribute('async') == null && el.getAttribute('defer') == null && el.getAttribute('type') !== 'module') {
          data.headScriptsBlocking++;
        }
        const src = el.getAttribute('src');
        if (src) trackAsset(src);
      },
    })
    .on('link[rel=stylesheet]', {
      element(el) {
        data.stylesheetsTotal++;
        // Una hoja de estilo bloquea el render salvo que declare un media
        // que no aplica a la pantalla en uso (ej. media="print") - eso le
        // dice al navegador que no la espere para mostrar la página.
        const media = (el.getAttribute('media') || '').toLowerCase().trim();
        if (inHead && media !== 'print') data.headStylesheetsBlocking++;
        const href = el.getAttribute('href');
        if (href) trackAsset(href);
      },
    });

  // HTMLRewriter transforma en streaming: hay que consumir la respuesta
  // (.text()) para que dispare los handlers de arriba sobre todo el HTML,
  // y de paso nos da el peso real del documento si content-length no vino.
  const bodyText = await rewriter.transform(pageRes).text();
  const htmlBytes = declaredLength ? parseInt(declaredLength, 10) : new TextEncoder().encode(bodyText).length;

  const [robotsOk, sitemapOk, assetCacheResults] = await Promise.all([
    checkExists(parsed, '/robots.txt'),
    checkSitemap(parsed),
    Promise.all(data.assetUrls.map(checkAssetCaching)),
  ]);
  // 7 días es un punto medio razonable para un sitio chico (Lighthouse
  // pide varios meses para "excelente", pero eso es exigente para el
  // público de esta herramienta) - alcanza para notar si NO hay ninguna
  // caché configurada, que es el problema real más común.
  const GOOD_CACHE_SECONDS = 7 * 24 * 60 * 60;
  const assetsWithGoodCache = assetCacheResults.filter((a) => a.maxAge >= GOOD_CACHE_SECONDS).length;

  const title = (data.title || '').trim();
  const description = (data.metaDescription || '').trim();
  const h1 = (data.h1Text || '').trim();
  const robotsBlocksIndex = /noindex/i.test(data.metaRobots || '');

  // Doctype: HTMLRewriter no lo expone como elemento (no es una etiqueta
  // con nombre), así que se busca directo en el texto ya transformado.
  const hasDoctype = /^\s*<!doctype html>/i.test(bodyText);

  // El canonical puede ser una URL relativa - se resuelve contra la
  // página analizada antes de comparar. No hacemos fallar el chequeo si
  // apunta a otra URL (a veces es intencional, ej. una página que se
  // considera un duplicado de otra) - solo lo mostramos como dato extra.
  let canonicalSelf = null;
  if (data.canonical) {
    try {
      const canonicalUrl = new URL(data.canonical, parsed.toString());
      const norm = (u) => (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
      canonicalSelf = norm(canonicalUrl) === norm(parsed);
    } catch (e) { canonicalSelf = null; }
  }

  let structuredDataValid = false;
  if (data.structuredData && data.structuredDataText.trim()) {
    try { JSON.parse(data.structuredDataText); structuredDataValid = true; } catch (e) { structuredDataValid = false; }
  }

  return {
    url: parsed.toString(),
    checks: {
      https: { ok: parsed.protocol === 'https:' },
      mixedContent: { ok: data.mixedContent === 0, count: data.mixedContent },
      indexable: { ok: !robotsBlocksIndex, value: data.metaRobots || '(no declarado, indexable por default)' },
      title: { ok: title.length > 0 && title.length <= 60, value: title, length: title.length },
      metaDescription: { ok: description.length > 0 && description.length <= 160, value: description, length: description.length },
      // Google confirmó varias veces (2017, 2019, 2024) que tener más de
      // un H1 no afecta el ranking - lo único que sí importa es que haya
      // AL MENOS uno, para que quede claro de qué trata la página.
      h1: { ok: data.h1Count >= 1, count: data.h1Count, value: h1 },
      headingStructure: { ok: data.h2Count > 0, count: data.h2Count },
      viewport: { ok: data.viewport },
      canonical: { ok: !!data.canonical, value: data.canonical, self: canonicalSelf },
      favicon: { ok: data.favicon },
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
      structuredData: { ok: data.structuredData && structuredDataValid, present: data.structuredData, valid: structuredDataValid },
      lang: { ok: !!data.lang, value: data.lang },
      hsts: { ok: !!hsts, value: hsts || 'no configurado' },
      doctype: { ok: hasDoctype },
    },
    performance: {
      // 800ms es el umbral "bueno" real de web.dev para TTFB (no un
      // número inventado) - de 800 a 1800ms se considera "para mejorar".
      ttfb: { ok: ttfbMs < 800, ms: ttfbMs },
      pageWeight: { ok: htmlBytes < 150000, bytes: htmlBytes, kb: Math.round(htmlBytes / 1024) },
      caching: {
        ok: assetCacheResults.length === 0 || assetsWithGoodCache === assetCacheResults.length,
        checked: assetCacheResults.length,
        withGoodCache: assetsWithGoodCache,
      },
      blockingScripts: { ok: data.headScriptsBlocking === 0, count: data.headScriptsBlocking },
      renderBlockingCss: { ok: data.headStylesheetsBlocking <= 2, count: data.headStylesheetsBlocking },
      externalResources: {
        ok: (data.scriptsTotal + data.stylesheetsTotal) <= 10,
        scripts: data.scriptsTotal,
        stylesheets: data.stylesheetsTotal,
        total: data.scriptsTotal + data.stylesheetsTotal,
      },
      imageDimensions: {
        ok: data.imgTotal === 0 || data.imgWithDims === data.imgTotal,
        total: data.imgTotal,
        withDims: data.imgWithDims,
        pct: data.imgTotal ? Math.round((data.imgWithDims / data.imgTotal) * 100) : 100,
      },
      lazyLoading: {
        // Se excusa a 1 imagen (la primera, probablemente la principal -
        // "hero" - de la pantalla) de necesitar loading="lazy": esa es
        // justamente la que NO conviene demorar, porque suele ser la
        // primera en pintarse en pantalla.
        ok: data.imgTotal <= 1 || data.imgLazy >= data.imgTotal - 1,
        total: data.imgTotal,
        lazy: data.imgLazy,
        pct: data.imgTotal ? Math.round((data.imgLazy / data.imgTotal) * 100) : 100,
      },
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

// Sitios armados con @astrojs/sitemap (Astro) no generan /sitemap.xml, sino
// /sitemap-index.xml (el formato estándar de "índice de sitemaps") -
// confirmado real en santilli-aparts, marcaba error acá aunque el sitemap
// estaba bien armado y declarado en robots.txt. En vez de asumir el nombre
// clásico, leemos la línea "Sitemap:" de robots.txt (tiene que estar
// SIEMPRE, sea cual sea el nombre real del archivo) y confirmamos que esa
// URL responda. Si robots.txt no declara ninguna, caemos al nombre clásico
// /sitemap.xml como último intento (sitios sin este integration, o armados
// a mano).
async function checkSitemap(parsed) {
  try {
    const robotsRes = await fetch(new URL('/robots.txt', parsed.origin).toString());
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text();
      const match = /^\s*Sitemap:\s*(\S+)/im.exec(robotsText);
      if (match) {
        const sitemapRes = await fetch(match[1]);
        return sitemapRes.ok;
      }
    }
  } catch (e) {
    // sigue al fallback de abajo
  }
  return checkExists(parsed, '/sitemap.xml');
}

async function checkAssetCaching(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const cacheControl = res.headers.get('cache-control') || '';
    const match = /max-age=(\d+)/i.exec(cacheControl);
    return { url, maxAge: match ? parseInt(match[1], 10) : 0, cacheControl };
  } catch (e) {
    return { url, maxAge: 0, cacheControl: '' };
  }
}
