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
  const checklistEl = document.getElementById('perfChecklist');
  const resetBtn    = document.getElementById('perfReset');

  // "priority" (1 = más importante) elige qué mostrar primero en la
  // devolución concreta cuando hay varios puntos para arreglar.
  const CHECKS = [
    { key: 'ttfb', priority: 1, title: 'Tiempo de respuesta del servidor', desc: 'Cuánto tarda el servidor en empezar a mandar la página. Si es lento, todo lo demás carga después y se siente lento.' },
    { key: 'blockingScripts', priority: 2, title: 'Scripts que bloquean la carga', desc: 'Código que el navegador tiene que leer entero antes de poder mostrar el resto de la página. Menos es mejor.' },
    { key: 'pageWeight', priority: 3, title: 'Peso de la página', desc: 'Cuántos datos hay que descargar solo para el HTML (sin contar fotos ni videos). Menos peso, carga más rápido, sobre todo en celulares con poca señal.' },
    { key: 'imageDimensions', priority: 4, title: 'Tamaño de imágenes declarado', desc: 'Si cada foto avisa de antemano cuánto espacio ocupa, la página no "salta" mientras carga.' },
    { key: 'externalResources', priority: 5, title: 'Cantidad de recursos externos', desc: 'Cuántos archivos de código y estilo tiene que descargar el navegador aparte del HTML. Cada uno suma una espera más.' },
    { key: 'caching', priority: 6, title: 'Caché del navegador', desc: 'Le dice al navegador que puede guardar una copia y no volver a pedir todo de nuevo en la próxima visita.' },
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

  // Aro de puntaje (SVG a mano, mismo componente que /seo) + devolución
  // concreta con los 2-3 puntos más importantes a corregir primero.
  function renderScoreSummary(passedCount, total, failedSorted){
    const pct = total ? Math.round((passedCount / total) * 100) : 0;
    const r = 42, c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;

    const ring = '' +
      '<svg viewBox="0 0 100 100" class="seo-score__ring">' +
        '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/>' +
        '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--lime)" stroke-width="10" stroke-linecap="round" ' +
          'stroke-dasharray="' + dash.toFixed(1) + ' ' + (c - dash).toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
      '</svg>';

    let text;
    if (!failedSorted.length){
      text = 'Está muy bien encaminado, no encontramos nada urgente para corregir.';
    } else {
      const top = failedSorted.slice(0, 3).map(function(c){ return c.title; });
      text = 'Lo más importante para corregir primero: <b>' + top.join('</b>, <b>') + '</b>' +
        (failedSorted.length > 3 ? ', y ' + (failedSorted.length - 3) + ' punto(s) más abajo.' : '.');
    }

    return '' +
      '<div class="seo-score">' +
        '<div class="seo-score__gauge">' + ring +
          '<div class="seo-score__num">' +
            '<span class="seo-score__pct">' + pct + '%</span>' +
            '<span class="seo-score__frac mono">' + passedCount + ' de ' + total + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="seo-score__text">' + text + '</p>' +
      '</div>';
  }

  function formatDetail(key, check){
    if (key === 'ttfb') return check.ms + ' ms (ideal: menos de 600 ms)';
    if (key === 'pageWeight') return check.kb + ' KB de HTML (ideal: menos de 150 KB)';
    if (key === 'caching') return check.value;
    if (key === 'blockingScripts') return check.count === 0 ? 'Ningún script bloqueante encontrado' : (check.count + ' script(s) bloqueando la carga inicial');
    if (key === 'externalResources') return check.scripts + ' script(s) + ' + check.stylesheets + ' hoja(s) de estilo = ' + check.total + ' recursos externos';
    if (key === 'imageDimensions') return check.withDims + ' de ' + check.total + ' imágenes con tamaño declarado (' + check.pct + '%)';
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
