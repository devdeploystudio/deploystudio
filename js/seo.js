/* ═══════════════════════════════════════════════
   /seo - chequeo de SEO de una URL
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
  const groupsEl     = document.getElementById('seoGroups');
  const resetBtn     = document.getElementById('seoReset');

  // Orden, título y explicación en palabras simples de cada chequeo.
  // La clave tiene que coincidir con lo que devuelve el Worker en "checks".
  // "priority" (1 = más importante) se usa solo para elegir qué 3 mostrar
  // primero en la devolución concreta cuando hay varias cosas para arreglar.
  const CHECKS = [
    { key: 'indexable', priority: 1, title: 'Indexable por Google', desc: 'Si esto falla, tu página directamente no puede aparecer en Google, sin importar qué tan bien esté todo lo demás.' },
    { key: 'https', priority: 2, title: 'Conexión segura (HTTPS)', desc: 'Tu sitio carga con candado, no como "no seguro". Google lo pide y los visitantes lo esperan.' },
    { key: 'mixedContent', priority: 3, title: 'Sin contenido mixto', desc: 'Que ninguna imagen o script cargue todavía por "http://" en vez de "https://" - si pasa, el navegador puede mostrar el candado como inseguro igual.' },
    { key: 'title', priority: 4, title: 'Título de la página', desc: 'El texto que aparece en la pestaña del navegador y en el resultado de Google. Ideal hasta 60 caracteres, para que no se corte en el resultado de búsqueda.' },
    { key: 'metaDescription', priority: 5, title: 'Descripción (meta description)', desc: 'El resumen que Google muestra debajo del título en los resultados de búsqueda. Ideal hasta 160 caracteres.' },
    { key: 'h1', priority: 6, title: 'Título principal (H1)', desc: 'Que haya al menos un título principal que diga de qué trata la página. Tener más de uno no es un problema para Google (lo confirmaron varias veces), lo que sí conviene evitar es no tener ninguno.' },
    { key: 'viewport', priority: 7, title: 'Preparado para celular', desc: 'Le dice al navegador cómo ajustarse a pantallas chicas. Sin esto, tu sitio se ve mal en el teléfono.' },
    { key: 'altText', priority: 8, title: 'Texto alternativo en imágenes', desc: 'Una descripción de cada foto para personas con discapacidad visual y para que Google entienda qué muestra. Las imágenes decorativas pueden llevarlo vacío a propósito, eso también cuenta como correcto.' },
    { key: 'canonical', priority: 9, title: 'URL canónica', desc: 'Le indica a Google cuál es la versión "oficial" de la página, para que no la confunda con una copia.' },
    { key: 'sitemapXml', priority: 10, title: 'Mapa del sitio (sitemap.xml)', desc: 'Una lista de todas tus páginas para que Google las encuentre más rápido.' },
    { key: 'robotsTxt', priority: 11, title: 'Archivo robots.txt', desc: 'Le dice a Google qué partes de tu sitio puede recorrer. Es técnico, pero conviene que exista.' },
    { key: 'ogTitle', priority: 12, title: 'Título para compartir (Open Graph)', desc: 'El título que se muestra cuando alguien comparte tu link en WhatsApp, Instagram o Facebook.' },
    { key: 'ogDescription', priority: 13, title: 'Descripción para compartir', desc: 'El texto que acompaña al link cuando lo compartís en redes sociales.' },
    { key: 'ogImage', priority: 14, title: 'Imagen para compartir', desc: 'La foto que aparece cuando compartís el link de tu sitio. Sin esto, se ve un link pelado, sin foto.' },
    { key: 'headingStructure', priority: 15, title: 'Estructura de subtítulos (H2)', desc: 'Subtítulos que ordenan el contenido de la página. Ayudan a Google (y a la gente) a entender de qué trata cada parte.' },
    { key: 'structuredData', priority: 16, title: 'Datos estructurados', desc: 'Información extra que ayuda a Google a mostrar tu sitio con más detalle en los resultados.' },
    { key: 'favicon', priority: 17, title: 'Favicon', desc: 'El ícono que aparece en la pestaña del navegador y al guardar tu sitio como acceso directo.' },
    { key: 'lang', priority: 18, title: 'Idioma declarado', desc: 'Le dice al navegador y a Google en qué idioma está tu contenido.' },
    { key: 'hsts', priority: 19, title: 'HSTS (conexión segura reforzada)', desc: 'Le dice al navegador que jamás intente cargar tu sitio por http:// (sin el candado), ni siquiera la primera vez. Es una configuración del hosting, no del diseño.' },
    { key: 'doctype', priority: 20, title: 'Declaración de tipo de documento', desc: 'La primera línea del HTML, que le dice al navegador cómo interpretar el resto de la página. Es técnico, pero debería estar siempre.' },
  ];

  // Los mismos 20 chequeos de arriba, agrupados en cards temáticas (como
  // las de /analiticas) en vez de una grilla plana de renglones. "chart:
  // 'images'" marca la única card con una barrita propia además de la
  // lista - el resto son solo lista, no hace falta un gráfico para cada una.
  const GROUPS = [
    { title: 'Indexación y seguridad', desc: 'Que Google pueda encontrar tu página y que cargue de forma segura.', span: 6, keys: ['indexable', 'https', 'mixedContent', 'hsts'] },
    { title: 'Título y descripción', desc: 'Lo que se ve en el resultado de Google antes de entrar al sitio.', span: 6, keys: ['title', 'metaDescription'] },
    { title: 'Estructura y accesibilidad', desc: 'Cómo está organizado el contenido de la página.', span: 6, keys: ['h1', 'headingStructure', 'lang', 'viewport'] },
    { title: 'Imágenes', desc: 'Que las fotos tengan lo necesario para accesibilidad y buen SEO.', span: 6, keys: ['altText'], chart: 'images' },
    { title: 'Compartir en redes', desc: 'Cómo se ve el link cuando lo compartís en WhatsApp o Instagram.', span: 6, keys: ['ogTitle', 'ogDescription', 'ogImage'] },
    { title: 'Archivos técnicos', desc: 'Configuración de base que Google espera encontrar.', span: 6, keys: ['canonical', 'sitemapXml', 'robotsTxt', 'doctype', 'favicon', 'structuredData'] },
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
  // completa con protocolo - si falta el protocolo, asumimos https.
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
    const passed = items.filter(function(c){ return checks[c.key].ok; });
    const failed = items.filter(function(c){ return !checks[c.key].ok; })
      .sort(function(a, b){ return a.priority - b.priority; });

    summaryEl.innerHTML = renderScoreSummary(passed.length, items.length, failed, 'SEO');
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

  // Barrita chica con el % de imágenes con alt - único chequeo con un
  // gráfico propio además de la lista, porque ya viene como porcentaje.
  function renderImageBars(checks){
    const pct = checks.altText ? checks.altText.pct : 0;
    const fail = checks.altText && !checks.altText.ok;
    return '' +
      '<div class="dash-mini-bar seo-group__bars">' +
        '<div class="dash-mini-bar__row">' +
          '<span class="dash-mini-bar__label">Con alt correcto</span>' +
          '<span class="dash-mini-bar__track"><span class="dash-mini-bar__fill' + (fail ? ' is-fail' : '') + '" style="width:' + pct + '%"></span></span>' +
          '<span class="dash-mini-bar__value mono">' + pct + '%</span>' +
        '</div>' +
      '</div>';
  }

  // Etiqueta y color según el % de puntaje - mismos 4 cortes para las
  // dos cosas, así que se entienda de un vistazo cómo está el sitio sin
  // tener que leer el detalle de abajo (semáforo: lima/amarillo/naranja/rojo).
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

  // Aro de puntaje (SVG a mano) + devolución concreta: en vez de solo
  // "cumple X de Y", nombra los 2-3 puntos más importantes a corregir
  // primero (según "priority" de CHECKS), no una lista genérica.
  function renderScoreSummary(passedCount, total, failedSorted, label){
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
    if (key === 'altText') return check.withAlt + ' de ' + check.total + ' imágenes tienen el atributo alt (con descripción, o vacío a propósito en las decorativas) (' + check.pct + '%)';
    if (key === 'indexable') return check.ok ? 'Sin restricciones de indexado' : ('Encontrado: "' + escapeHtml(check.value) + '" - esto le dice a Google que NO indexe la página');
    if (key === 'lang' && check.value) return 'Declarado como "' + check.value + '"';
    if (key === 'mixedContent') return check.ok ? 'Todo carga por https://' : (check.count + ' recurso(s) cargando todavía por http://');
    if (key === 'canonical' && check.value) return '"' + escapeHtml(check.value) + '"' + (check.self === false ? ' - apunta a otra URL, distinta de la que se analizó' : '');
    if (key === 'structuredData') return check.present ? (check.valid ? 'Encontrado y es JSON válido' : 'Encontrado, pero no es JSON válido - revisalo') : '';
    if (key === 'hsts') return check.ok ? 'Configurado: "' + escapeHtml(check.value) + '"' : 'No configurado';
    if (key === 'doctype') return check.ok ? '' : 'No se encontró "<!DOCTYPE html>" al principio del HTML';
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
