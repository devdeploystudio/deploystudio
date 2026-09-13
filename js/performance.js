/* ═══════════════════════════════════════════════
   /performance - chequeo de velocidad de carga
   Mismo Worker que /seo (worker/seo-check.js hace un único fetch a la
   URL y devuelve "checks" para SEO y "performance" para esto).
   ═══════════════════════════════════════════════ */
(function(){
  'use strict';

  const WORKER_URL = 'https://seo-check.contact-deploystudio.workers.dev';

  const form       = document.getElementById('perfForm');
  const urlInput    = document.getElementById('perfUrl');
  const submitBtn   = document.getElementById('perfSubmit');
  const statusEl    = document.getElementById('perfStatus');
  const resultsEl   = document.getElementById('perfResults');
  const summaryEl   = document.getElementById('perfSummary');
  const groupsEl    = document.getElementById('perfGroups');
  const resetBtn    = document.getElementById('perfReset');

  // "priority" (1 = más importante) elige qué mostrar primero en la
  // devolución concreta cuando hay varios puntos para arreglar.
  const CHECKS = [
    { key: 'ttfb', priority: 1, title: 'Tiempo de respuesta del servidor', desc: 'Cuánto tarda el servidor en empezar a mandar la página. Si es lento, todo lo demás carga después y se siente lento. Ideal menos de 800 ms (el umbral que usa Google para considerarlo "bueno").' },
    { key: 'blockingScripts', priority: 2, title: 'Scripts que bloquean la carga', desc: 'Código que el navegador tiene que leer entero antes de poder mostrar el resto de la página. Menos es mejor.' },
    { key: 'renderBlockingCss', priority: 3, title: 'Hojas de estilo que bloquean la carga', desc: 'El navegador espera a tener todo el CSS antes de mostrar algo en pantalla. Muchas hojas de estilo grandes demoran esa primera imagen.' },
    { key: 'pageWeight', priority: 4, title: 'Peso de la página', desc: 'Cuántos datos hay que descargar solo para el HTML (sin contar fotos ni videos). Menos peso, carga más rápido, sobre todo en celulares con poca señal.' },
    { key: 'imageDimensions', priority: 5, title: 'Tamaño de imágenes declarado', desc: 'Si cada foto avisa de antemano cuánto espacio ocupa, la página no "salta" mientras carga.' },
    { key: 'lazyLoading', priority: 6, title: 'Carga diferida de imágenes', desc: 'Las fotos que están más abajo en la página se cargan recién cuando el visitante llega a esa parte, no todas de entrada.' },
    { key: 'externalResources', priority: 7, title: 'Cantidad de recursos externos', desc: 'Cuántos archivos de código y estilo tiene que descargar el navegador aparte del HTML. Cada uno suma una espera más.' },
    { key: 'caching', priority: 8, title: 'Caché de tus archivos (CSS/JS)', desc: 'Le dice al navegador que puede guardar una copia de tu código durante un tiempo, así en la próxima visita no lo vuelve a descargar. El HTML de la página en sí no debería cachearse tanto tiempo (para que siempre se vea el contenido actualizado) - esto mide solo tus archivos de código y estilo.' },
  ];

  // Los mismos 8 chequeos de arriba, agrupados en cards temáticas (como
  // las de /analiticas) en vez de una grilla plana de renglones.
  const GROUPS = [
    { title: 'Velocidad del servidor', desc: 'Cuánto tarda en empezar a responder, antes de que cargue cualquier otra cosa.', span: 4, keys: ['ttfb'] },
    { title: 'Scripts y estilos que bloquean', desc: 'Código que frena el primer render de la página.', span: 4, keys: ['blockingScripts', 'renderBlockingCss'] },
    { title: 'Caché de tus archivos', desc: 'Que el navegador no tenga que volver a descargar todo en cada visita.', span: 4, keys: ['caching'] },
    { title: 'Peso y recursos', desc: 'Cuánto hay que descargar en total para mostrar la página.', span: 6, keys: ['pageWeight', 'externalResources'] },
    { title: 'Imágenes', desc: 'Que las fotos no hagan "saltar" la página ni demoren la carga.', span: 6, keys: ['imageDimensions', 'lazyLoading'], chart: 'images' },
  ];

  // Nota honesta: esto NO es un puntaje de Google Lighthouse / PageSpeed
  // Insights (esos miden con un navegador real: LCP, CLS, INP). Es un
  // chequeo liviano de señales que sí se pueden ver solo con el HTML y
  // las cabeceras del servidor, sin necesitar un navegador de por medio.

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
    const checks = data.performance || {};
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

  // Barritas chicas con el % de imágenes con tamaño declarado y con carga
  // diferida - único grupo con un gráfico propio además de la lista,
  // porque ya vienen como porcentaje.
  function renderImageBars(checks){
    const dims = checks.imageDimensions ? checks.imageDimensions.pct : 0;
    const lazy = checks.lazyLoading ? checks.lazyLoading.pct : 0;
    return '' +
      '<div class="dash-mini-bar seo-group__bars">' +
        '<div class="dash-mini-bar__row">' +
          '<span class="dash-mini-bar__label">Tamaño declarado</span>' +
          '<span class="dash-mini-bar__track"><span class="dash-mini-bar__fill" style="width:' + dims + '%"></span></span>' +
          '<span class="dash-mini-bar__value mono">' + dims + '%</span>' +
        '</div>' +
        '<div class="dash-mini-bar__row">' +
          '<span class="dash-mini-bar__label">Carga diferida</span>' +
          '<span class="dash-mini-bar__track"><span class="dash-mini-bar__fill" style="width:' + lazy + '%"></span></span>' +
          '<span class="dash-mini-bar__value mono">' + lazy + '%</span>' +
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

  // Aro de puntaje (SVG a mano, mismo componente que /seo) + devolución
  // concreta con los 2-3 puntos más importantes a corregir primero.
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
