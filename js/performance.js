/* ═══════════════════════════════════════════════
   /performance — chequeo de velocidad de carga
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

  const CHECKS = [
    { key: 'ttfb', title: 'Tiempo de respuesta del servidor', desc: 'Cuánto tarda el servidor en empezar a mandar la página. Si es lento, todo lo demás carga después y se siente lento.' },
    { key: 'compression', title: 'Compresión de la página', desc: 'El servidor puede achicar el HTML antes de mandarlo, para que llegue más rápido. Es una configuración del hosting, no del diseño.' },
    { key: 'pageWeight', title: 'Peso de la página', desc: 'Cuántos datos hay que descargar solo para el HTML (sin contar fotos ni videos). Menos peso, carga más rápido, sobre todo en celulares con poca señal.' },
    { key: 'caching', title: 'Caché del navegador', desc: 'Le dice al navegador que puede guardar una copia y no volver a pedir todo de nuevo en la próxima visita.' },
    { key: 'blockingScripts', title: 'Scripts que bloquean la carga', desc: 'Código que el navegador tiene que leer entero antes de poder mostrar el resto de la página. Menos es mejor.' },
    { key: 'imageDimensions', title: 'Tamaño de imágenes declarado', desc: 'Si cada foto avisa de antemano cuánto espacio ocupa, la página no "salta" mientras carga.' },
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
    const checks = data.performance || {};
    const items = CHECKS.filter(function(c){ return checks[c.key]; });
    const passed = items.filter(function(c){ return checks[c.key].ok; }).length;

    summaryEl.innerHTML = 'Tu sitio cumple <b>' + passed + ' de ' + items.length + '</b> puntos básicos de velocidad. ' +
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
    if (key === 'ttfb') return check.ms + ' ms (ideal: menos de 600 ms)';
    if (key === 'compression') return 'Compresión: ' + check.value;
    if (key === 'pageWeight') return check.kb + ' KB de HTML (ideal: menos de 150 KB)';
    if (key === 'caching') return check.value;
    if (key === 'blockingScripts') return check.count === 0 ? 'Ningún script bloqueante encontrado' : (check.count + ' script(s) bloqueando la carga inicial');
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
