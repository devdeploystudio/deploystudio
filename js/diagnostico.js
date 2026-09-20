/* ═══════════════════════════════════════════════
   diagnostico.html - analizador gratis para visitantes del sitio
   (lead magnet, no confundir con /post-deploy/seo y /performance, que
   son la versión para clientes ya entregados). Mismo Worker
   (worker/seo-check.js) y mismos chequeos que esas dos páginas, pero
   unificados en una sola devolución con SEO + Performance juntos, y
   terminando en un pitch para que el visitante nos escriba.
   ═══════════════════════════════════════════════ */
(function(){
  'use strict';

  const WORKER_URL = 'https://seo-check.contact-deploystudio.workers.dev';

  const form       = document.getElementById('diagForm');
  const urlInput   = document.getElementById('diagUrl');
  const submitBtn  = document.getElementById('diagSubmit');
  const statusEl   = document.getElementById('diagStatus');
  const resultsEl  = document.getElementById('diagResults');
  const summaryEl  = document.getElementById('diagSummary');
  const groupsEl   = document.getElementById('diagGroups');
  const resetBtn   = document.getElementById('diagReset');

  // Mismos 20 chequeos de SEO (js/seo.js) + 8 de Performance (js/performance.js),
  // acá juntos en una sola lista porque el Worker los separa en dos objetos
  // ("checks" y "performance") pero para el visitante es un solo diagnóstico.
  const CHECKS = [
    { key: 'indexable', priority: 1, title: 'Indexable por Google', desc: 'Si esto falla, tu página directamente no puede aparecer en Google, sin importar qué tan bien esté todo lo demás.' },
    { key: 'https', priority: 2, title: 'Conexión segura (HTTPS)', desc: 'Tu sitio carga con candado, no como "no seguro". Google lo pide y los visitantes lo esperan.' },
    { key: 'mixedContent', priority: 3, title: 'Sin contenido mixto', desc: 'Que ninguna imagen o script cargue todavía por "http://" en vez de "https://" - si pasa, el navegador puede mostrar el candado como inseguro igual.' },
    { key: 'ttfb', priority: 4, title: 'Tiempo de respuesta del servidor', desc: 'Cuánto tarda el servidor en empezar a mandar la página. Si es lento, todo lo demás carga después y se siente lento. Ideal menos de 800 ms.' },
    { key: 'title', priority: 5, title: 'Título de la página', desc: 'El texto que aparece en la pestaña del navegador y en el resultado de Google. Ideal hasta 60 caracteres.' },
    { key: 'metaDescription', priority: 6, title: 'Descripción (meta description)', desc: 'El resumen que Google muestra debajo del título en los resultados de búsqueda. Ideal hasta 160 caracteres.' },
    { key: 'h1', priority: 7, title: 'Título principal (H1)', desc: 'Que haya al menos un título principal que diga de qué trata la página.' },
    { key: 'viewport', priority: 8, title: 'Preparado para celular', desc: 'Le dice al navegador cómo ajustarse a pantallas chicas. Sin esto, tu sitio se ve mal en el teléfono.' },
    { key: 'altText', priority: 9, title: 'Texto alternativo en imágenes', desc: 'Una descripción de cada foto para personas con discapacidad visual y para que Google entienda qué muestra.' },
    { key: 'blockingScripts', priority: 10, title: 'Scripts que bloquean la carga', desc: 'Código que el navegador tiene que leer entero antes de poder mostrar el resto de la página.' },
    { key: 'renderBlockingCss', priority: 11, title: 'Hojas de estilo que bloquean la carga', desc: 'El navegador espera a tener todo el CSS antes de mostrar algo en pantalla.' },
    { key: 'pageWeight', priority: 12, title: 'Peso de la página', desc: 'Cuántos datos hay que descargar solo para el HTML. Menos peso, carga más rápido.' },
    { key: 'imageDimensions', priority: 13, title: 'Tamaño de imágenes declarado', desc: 'Si cada foto avisa de antemano cuánto espacio ocupa, la página no "salta" mientras carga.' },
    { key: 'lazyLoading', priority: 14, title: 'Carga diferida de imágenes', desc: 'Las fotos que están más abajo se cargan recién cuando el visitante llega a esa parte.' },
    { key: 'canonical', priority: 15, title: 'URL canónica', desc: 'Le indica a Google cuál es la versión "oficial" de la página, para que no la confunda con una copia.' },
    { key: 'sitemapXml', priority: 16, title: 'Mapa del sitio (sitemap.xml)', desc: 'Una lista de todas tus páginas para que Google las encuentre más rápido.' },
    { key: 'robotsTxt', priority: 17, title: 'Archivo robots.txt', desc: 'Le dice a Google qué partes de tu sitio puede recorrer.' },
    { key: 'externalResources', priority: 18, title: 'Cantidad de recursos externos', desc: 'Cuántos archivos de código y estilo tiene que descargar el navegador aparte del HTML.' },
    { key: 'caching', priority: 19, title: 'Caché de tus archivos (CSS/JS)', desc: 'Que el navegador pueda guardar una copia de tu código y no descargarlo de nuevo en cada visita.' },
    { key: 'ogTitle', priority: 20, title: 'Título para compartir (Open Graph)', desc: 'El título que se muestra cuando alguien comparte tu link en WhatsApp, Instagram o Facebook.' },
    { key: 'ogDescription', priority: 21, title: 'Descripción para compartir', desc: 'El texto que acompaña al link cuando lo compartís en redes sociales.' },
    { key: 'ogImage', priority: 22, title: 'Imagen para compartir', desc: 'La foto que aparece cuando compartís el link de tu sitio.' },
    { key: 'headingStructure', priority: 23, title: 'Estructura de subtítulos (H2)', desc: 'Subtítulos que ordenan el contenido de la página.' },
    { key: 'structuredData', priority: 24, title: 'Datos estructurados', desc: 'Información extra que ayuda a Google a mostrar tu sitio con más detalle en los resultados.' },
    { key: 'favicon', priority: 25, title: 'Favicon', desc: 'El ícono que aparece en la pestaña del navegador.' },
    { key: 'lang', priority: 26, title: 'Idioma declarado', desc: 'Le dice al navegador y a Google en qué idioma está tu contenido.' },
    { key: 'hsts', priority: 27, title: 'HSTS (conexión segura reforzada)', desc: 'Le dice al navegador que jamás intente cargar tu sitio por http://, ni la primera vez.' },
    { key: 'doctype', priority: 28, title: 'Declaración de tipo de documento', desc: 'La primera línea del HTML, técnica pero debería estar siempre.' },
  ];

  // Agrupadas en cards temáticas (mismo lenguaje visual que /analiticas y
  // que las versiones para clientes de /post-deploy/seo y /performance).
  const GROUPS = [
    { title: 'Indexación, seguridad y velocidad', desc: 'Que Google pueda encontrar tu página, que cargue segura y que no tarde.', span: 6, keys: ['indexable', 'https', 'mixedContent', 'ttfb', 'hsts'] },
    { title: 'Título y descripción', desc: 'Lo que se ve en el resultado de Google antes de entrar al sitio.', span: 6, keys: ['title', 'metaDescription'] },
    { title: 'Estructura y accesibilidad', desc: 'Cómo está organizado el contenido de la página.', span: 6, keys: ['h1', 'headingStructure', 'lang', 'viewport'] },
    { title: 'Imágenes', desc: 'Que las fotos no demoren la carga y tengan lo necesario para accesibilidad.', span: 6, keys: ['altText', 'imageDimensions', 'lazyLoading'], chart: 'images' },
    { title: 'Scripts, estilos y recursos', desc: 'Código que puede estar frenando la carga de la página.', span: 6, keys: ['blockingScripts', 'renderBlockingCss', 'pageWeight', 'externalResources', 'caching'] },
    { title: 'Compartir en redes', desc: 'Cómo se ve el link cuando lo compartís en WhatsApp o Instagram.', span: 6, keys: ['ogTitle', 'ogDescription', 'ogImage'] },
    { title: 'Archivos técnicos', desc: 'Configuración de base que Google espera encontrar.', span: 12, keys: ['canonical', 'sitemapXml', 'robotsTxt', 'doctype', 'favicon', 'structuredData'] },
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
        submitBtn.innerHTML = 'Analizar mi sitio <span class="btn__arrow">→</span>';
      });
  });

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
    // El Worker separa SEO ("checks") de Performance ("performance") -
    // acá se combinan en un solo objeto, no hay claves repetidas entre
    // los dos así que un merge simple alcanza.
    const checks = Object.assign({}, data.checks, data.performance);
    const items = CHECKS.filter(function(c){ return checks[c.key]; });
    const passed = items.filter(function(c){ return checks[c.key].ok; });
    const failed = items.filter(function(c){ return !checks[c.key].ok; })
      .sort(function(a, b){ return a.priority - b.priority; });

    summaryEl.innerHTML = renderScoreSummary(passed.length, items.length, failed);
    groupsEl.innerHTML = renderGroups(checks);

    resultsEl.hidden = false;
  }

  function renderGroups(checks){
    return GROUPS.map(function(group){
      const groupChecks = CHECKS.filter(function(c){ return group.keys.indexOf(c.key) !== -1 && checks[c.key]; });
      if (!groupChecks.length) return '';
      const okCount = groupChecks.filter(function(c){ return checks[c.key].ok; }).length;

      const chart = group.chart === 'images' ? renderImageBars(checks) : '';

      const rows = groupChecks.map(function(c){
        const check = checks[c.key];
        const detail = formatDetail(c.key, check);
        return '' +
          '<div class="seo-check-row ' + (check.ok ? 'is-ok' : 'is-fail') + '">' +
            '<span class="seo-check-row__mark">' + (check.ok ? '✓' : '✕') + '</span>' +
            '<div class="seo-check-row__body">' +
              '<p class="seo-check-row__title">' + c.title + '</p>' +
              '<p class="seo-check-row__desc">' + c.desc + '</p>' +
              (detail ? '<p class="seo-check-row__detail">' + detail + '</p>' : '') +
            '</div>' +
          '</div>';
      }).join('');

      return '' +
        '<article class="dash-card dash-card--span' + group.span + '">' +
          '<header class="dash-card__head dash-card__head--row">' +
            '<div>' +
              '<h2 class="dash-card__title">' + group.title + '</h2>' +
              '<p class="dash-card__desc">' + group.desc + '</p>' +
            '</div>' +
            '<span class="seo-group__badge mono' + (okCount === groupChecks.length ? ' is-full' : '') + '">' + okCount + '/' + groupChecks.length + '</span>' +
          '</header>' +
          chart +
          '<div class="seo-group__list">' + rows + '</div>' +
        '</article>';
    }).join('');
  }

  function renderImageBars(checks){
    const bars = [
      checks.altText && { label: 'Con alt correcto', pct: checks.altText.pct, fail: !checks.altText.ok },
      checks.imageDimensions && { label: 'Tamaño declarado', pct: checks.imageDimensions.pct, fail: !checks.imageDimensions.ok },
      checks.lazyLoading && { label: 'Carga diferida', pct: checks.lazyLoading.pct, fail: !checks.lazyLoading.ok },
    ].filter(Boolean);
    if (!bars.length) return '';
    return '' +
      '<div class="dash-mini-bar seo-group__bars">' +
        bars.map(function(b){
          return '' +
            '<div class="dash-mini-bar__row">' +
              '<span class="dash-mini-bar__label">' + b.label + '</span>' +
              '<span class="dash-mini-bar__track"><span class="dash-mini-bar__fill' + (b.fail ? ' is-fail' : '') + '" style="width:' + b.pct + '%"></span></span>' +
              '<span class="dash-mini-bar__value mono">' + b.pct + '%</span>' +
            '</div>';
        }).join('') +
      '</div>';
  }

  function scoreTag(pct){
    if (pct >= 90) return 'Excelente';
    if (pct >= 70) return 'Bien encaminado';
    if (pct >= 50) return 'Para mejorar';
    return 'Necesita atención';
  }
  function scoreColor(pct){
    if (pct >= 90) return 'var(--lime)';
    if (pct >= 70) return '#E6C200';
    if (pct >= 50) return '#E68A00';
    return '#E64545';
  }

  function renderScoreSummary(passedCount, total, failedSorted){
    const pct = total ? Math.round((passedCount / total) * 100) : 0;
    const r = 42, c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;
    const color = scoreColor(pct);

    const ring = '' +
      '<svg viewBox="0 0 100 100" class="seo-score__ring">' +
        '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/>' +
        '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" ' +
          'stroke-dasharray="' + dash.toFixed(1) + ' ' + (c - dash).toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
      '</svg>';

    const tag = '<b style="color:' + color + '">' + scoreTag(pct) + '.</b>';
    let text;
    if (!failedSorted.length){
      text = tag + ' No encontramos nada urgente para corregir.';
    } else {
      const top = failedSorted.slice(0, 3).map(function(c){ return c.title; });
      text = tag + ' Lo más importante para corregir primero: <b>' + top.join('</b>, <b>') + '</b>' +
        (failedSorted.length > 3 ? ', y ' + (failedSorted.length - 3) + ' punto(s) más abajo.' : '.');
    }

    return '' +
      '<div class="seo-score">' +
        '<div class="seo-score__gauge">' + ring +
          '<div class="seo-score__num">' +
            '<span class="seo-score__pct" style="color:' + color + '">' + pct + '%</span>' +
            '<span class="seo-score__frac mono">' + passedCount + ' de ' + total + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="seo-score__text">' + text + '</p>' +
      '</div>';
  }

  function formatDetail(key, check){
    if (key === 'title' && check.value) return '"' + escapeHtml(check.value) + '" (' + check.length + ' caracteres)';
    if (key === 'metaDescription' && check.value) return '"' + escapeHtml(check.value) + '" (' + check.length + ' caracteres)';
    if (key === 'h1') return check.count === 0 ? '0 encontrados' : (check.count + ' encontrado(s)' + (check.count === 1 ? ': "' + escapeHtml(check.value || '') + '"' : ''));
    if (key === 'headingStructure') return check.count + ' subtítulo(s) H2 encontrados';
    if (key === 'altText') return check.withAlt + ' de ' + check.total + ' imágenes con el atributo alt (' + check.pct + '%)';
    if (key === 'indexable') return check.ok ? 'Sin restricciones de indexado' : ('Encontrado: "' + escapeHtml(check.value) + '" - esto le dice a Google que NO indexe la página');
    if (key === 'lang' && check.value) return 'Declarado como "' + check.value + '"';
    if (key === 'mixedContent') return check.ok ? 'Todo carga por https://' : (check.count + ' recurso(s) cargando todavía por http://');
    if (key === 'canonical' && check.value) return '"' + escapeHtml(check.value) + '"' + (check.self === false ? ' - apunta a otra URL, distinta de la que se analizó' : '');
    if (key === 'structuredData') return check.present ? (check.valid ? 'Encontrado y es JSON válido' : 'Encontrado, pero no es JSON válido') : '';
    if (key === 'hsts') return check.ok ? 'Configurado: "' + escapeHtml(check.value) + '"' : 'No configurado';
    if (key === 'doctype') return check.ok ? '' : 'No se encontró "<!DOCTYPE html>" al principio del HTML';
    if (key === 'ttfb') return check.ms + ' ms (ideal: menos de 800 ms)';
    if (key === 'pageWeight') return check.kb + ' KB de HTML (ideal: menos de 150 KB)';
    if (key === 'caching') return check.checked === 0 ? 'No encontramos archivos propios (CSS/JS) para chequear' : (check.withGoodCache + ' de ' + check.checked + ' archivo(s) con caché de al menos una semana');
    if (key === 'blockingScripts') return check.count === 0 ? 'Ningún script bloqueante encontrado' : (check.count + ' script(s) bloqueando la carga inicial');
    if (key === 'renderBlockingCss') return check.count === 0 ? 'Ninguna hoja de estilo bloqueante' : (check.count + ' hoja(s) de estilo bloqueando la carga inicial');
    if (key === 'externalResources') return check.scripts + ' script(s) + ' + check.stylesheets + ' hoja(s) de estilo = ' + check.total + ' recursos externos';
    if (key === 'imageDimensions') return check.withDims + ' de ' + check.total + ' imágenes con tamaño declarado (' + check.pct + '%)';
    if (key === 'lazyLoading') return check.lazy + ' de ' + check.total + ' imágenes con carga diferida (' + check.pct + '%)';
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

  (function spotlight(){
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spot = document.getElementById('spot');
    if (!spot || REDUCED || window.matchMedia('(hover:none)').matches) return;
    const root = document.documentElement;
    let tx = window.innerWidth / 2, ty = window.innerHeight * .4;
    let cx = tx, cy = ty, raf = null, idle = null;
    window.addEventListener('pointermove', function(e){
      tx = e.clientX; ty = e.clientY;
      root.style.setProperty('--spot-op', '1');
      if (!raf) raf = requestAnimationFrame(loop);
      clearTimeout(idle);
      idle = setTimeout(function(){ root.style.setProperty('--spot-op', '.55'); }, 2600);
    }, { passive: true });
    document.addEventListener('mouseleave', function(){ root.style.setProperty('--spot-op', '0'); });
    function loop(){
      cx += (tx - cx) * .085;
      cy += (ty - cy) * .085;
      root.style.setProperty('--mx', cx.toFixed(1) + 'px');
      root.style.setProperty('--my', cy.toFixed(1) + 'px');
      if (Math.abs(tx - cx) < .4 && Math.abs(ty - cy) < .4){ raf = null; return; }
      raf = requestAnimationFrame(loop);
    }
  })();

})();
