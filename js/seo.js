/* ═══════════════════════════════════════════════
   /seo — chequeo de SEO de una URL
   Llama a un Cloudflare Worker (worker/seo-check.js) que hace el fetch
   server-to-server (el navegador no puede leer el HTML de otro sitio
   por CORS) y devuelve un JSON con los resultados.
   ═══════════════════════════════════════════════ */
(function(){
  'use strict';

  const WORKER_URL = 'https://seo-check.contact-deploystudio.workers.dev';

  const form        = document.getElementById('seoForm');
  const urlInput     = document.getElementById('seoUrl');
  const submitBtn    = document.getElementById('seoSubmit');
  const statusEl     = document.getElementById('seoStatus');
  const resultsEl    = document.getElementById('seoResults');
  const summaryEl    = document.getElementById('seoSummary');
  const checklistEl  = document.getElementById('seoChecklist');
  const resetBtn     = document.getElementById('seoReset');

  // Orden, título y explicación en palabras simples de cada chequeo.
  // La clave tiene que coincidir con lo que devuelve el Worker en "checks".
  const CHECKS = [
    { key: 'https', title: 'Conexión segura (HTTPS)', desc: 'Tu sitio carga con candado, no como "no seguro". Google lo pide y los visitantes lo esperan.' },
    { key: 'title', title: 'Título de la página', desc: 'El texto que aparece en la pestaña del navegador y en el resultado de Google. Ideal entre 30 y 60 caracteres.' },
    { key: 'metaDescription', title: 'Descripción (meta description)', desc: 'El resumen que Google muestra debajo del título en los resultados de búsqueda. Ideal entre 70 y 160 caracteres.' },
    { key: 'h1', title: 'Título principal (H1)', desc: 'Cada página debería tener un único título principal que diga de qué trata.' },
    { key: 'viewport', title: 'Preparado para celular', desc: 'Le dice al navegador cómo ajustarse a pantallas chicas. Sin esto, tu sitio se ve mal en el teléfono.' },
    { key: 'canonical', title: 'URL canónica', desc: 'Le indica a Google cuál es la versión "oficial" de la página, para que no la confunda con una copia.' },
    { key: 'ogTitle', title: 'Título para compartir (Open Graph)', desc: 'El título que se muestra cuando alguien comparte tu link en WhatsApp, Instagram o Facebook.' },
    { key: 'ogDescription', title: 'Descripción para compartir', desc: 'El texto que acompaña al link cuando lo compartís en redes sociales.' },
    { key: 'ogImage', title: 'Imagen para compartir', desc: 'La foto que aparece cuando compartís el link de tu sitio. Sin esto, se ve un link pelado, sin foto.' },
    { key: 'altText', title: 'Texto alternativo en imágenes', desc: 'Una descripción de cada foto, para personas con discapacidad visual y para que Google entienda qué muestra la imagen.' },
    { key: 'robotsTxt', title: 'Archivo robots.txt', desc: 'Le dice a Google qué partes de tu sitio puede recorrer. Es técnico, pero conviene que exista.' },
    { key: 'sitemapXml', title: 'Mapa del sitio (sitemap.xml)', desc: 'Una lista de todas tus páginas para que Google las encuentre más rápido.' },
    { key: 'structuredData', title: 'Datos estructurados', desc: 'Información extra que ayuda a Google a mostrar tu sitio con más detalle en los resultados.' },
    { key: 'lang', title: 'Idioma declarado', desc: 'Le dice al navegador y a Google en qué idioma está tu contenido.' },
  ];

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const raw = urlInput.value.trim();
    if (!raw) return;

    const url = normalizeUrl(raw);
    if (!url){
      showStatus('Esa URL no parece válida. Escribí algo como "tusitio.com" o "https://tusitio.com".', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Analizando…';
    showStatus('Analizando tu sitio, puede tardar unos segundos…', false);
    resultsEl.hidden = true;

    fetch(WORKER_URL + '?url=' + encodeURIComponent(url))
      .then(function(res){
        if (!res.ok) throw new Error('bad-response');
        return res.json();
      })
      .then(function(data){
        if (data.error) throw new Error(data.error);
        render(data);
        statusEl.hidden = true;
      })
      .catch(function(){
        showStatus('No pudimos analizar esa URL. Revisá que esté bien escrita y que el sitio esté online.', true);
      })
      .finally(function(){
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Analizar <span class="btn__arrow">→</span>';
      });
  });

  // Acepta "deploystudio.com.ar", "www.deploystudio.com.ar" o una URL
  // completa con protocolo — si falta el protocolo, asumimos https.
  function normalizeUrl(input){
    let s = input.trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      if (!u.hostname.includes('.')) return null;
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  function showStatus(msg, isError){
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
    statusEl.classList.toggle('is-ok', !isError);
  }

  function render(data){
    const checks = data.checks || {};
    const items = CHECKS.filter(function(c){ return checks[c.key]; });
    const passed = items.filter(function(c){ return checks[c.key].ok; }).length;

    summaryEl.innerHTML = 'Tu sitio cumple <b>' + passed + ' de ' + items.length + '</b> puntos básicos de SEO. ' +
      (passed === items.length ? 'Está muy bien encaminado.' : 'Revisá abajo qué falta y por qué importa.');

    checklistEl.innerHTML = items.map(function(c){
      const check = checks[c.key];
      const detail = formatDetail(c.key, check);
      return '' +
        '<div class="seo-item ' + (check.ok ? 'is-ok' : 'is-fail') + '">' +
          '<div class="seo-item__head">' +
            '<span class="seo-item__mark">' + (check.ok ? '✓' : '✕') + '</span>' +
            '<span class="seo-item__title">' + c.title + '</span>' +
          '</div>' +
          '<p class="seo-item__desc">' + c.desc + '</p>' +
          (detail ? '<p class="seo-item__detail">' + detail + '</p>' : '') +
        '</div>';
    }).join('');

    resultsEl.hidden = false;
  }

  function formatDetail(key, check){
    if (key === 'title' && check.value) return '"' + escapeHtml(check.value) + '" (' + check.length + ' caracteres)';
    if (key === 'metaDescription' && check.value) return '"' + escapeHtml(check.value) + '" (' + check.length + ' caracteres)';
    if (key === 'h1') return check.count === 1 ? ('1 encontrado: "' + escapeHtml(check.value || '') + '"') : (check.count + ' encontrados (debería haber solo 1)');
    if (key === 'altText') return check.withAlt + ' de ' + check.total + ' imágenes tienen texto alternativo (' + check.pct + '%)';
    if (key === 'lang' && check.value) return 'Declarado como "' + check.value + '"';
    return '';
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  resetBtn.addEventListener('click', function(){
    resultsEl.hidden = true;
    statusEl.hidden = true;
    urlInput.value = '';
    urlInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Cursor titilante del logo (mismo comportamiento que el resto del panel). */
  (function cursorBlink(){
    const cursors = document.querySelectorAll('[data-cursor]');
    if (!cursors.length) return;
    let on = true;
    setInterval(function(){
      on = !on;
      cursors.forEach(function(c){ c.classList.toggle('off', !on); });
    }, 530);
  })();
  const yearEl = document.getElementById('dashYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
