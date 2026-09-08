/* ═══════════════════════════════════════════════
   /analiticas — lee los CSV "Resumen" que exporta Google
   Analytics (uno por sección del menú) y arma una devolución
   en palabras simples + gráficos.
   Todo pasa en el navegador: nada se sube a ningún lado.

   Cada CSV de un Resumen de GA4 no es UNA tabla: son VARIAS
   tablas (una por tarjetita de esa pantalla) pegadas una
   debajo de la otra, separadas por líneas en blanco y
   comentarios "# ...". Por eso el parser primero corta el
   archivo en "bloques" (cada uno con su propio header), y
   recién después busca en esos bloques cuál es cuál (canales,
   páginas, dispositivo, país, eventos...).
   ═══════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ─────────── 0. Cursor titilante del logo + año del footer
     (mismo comportamiento que js/script.js) ─────────── */
  (function cursorBlink(){
    const cursors = document.querySelectorAll('[data-cursor]');
    if (!cursors.length) return;
    let on = true;
    setInterval(() => {
      on = !on;
      cursors.forEach(c => c.classList.toggle('off', !on));
    }, 530);
  })();
  const yearEl = document.getElementById('dashYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ─────────── 1. DOM ─────────── */
  const dropzone   = document.getElementById('dashDropzone');
  const fileInput  = document.getElementById('dashFileInput');
  const statusEl   = document.getElementById('dashStatus');
  const resultsEl  = document.getElementById('dashResults');
  const summaryEl  = document.getElementById('dashSummary');
  const kpisEl     = document.getElementById('dashKpis');
  const resetBtn   = document.getElementById('dashReset');
  const warningEl      = document.getElementById('dashWarning');
  const warningTextEl  = document.getElementById('dashWarningText');
  const warningContinueBtn = document.getElementById('dashWarningContinue');
  const warningIgnoreBtn   = document.getElementById('dashWarningIgnore');

  const chartBoxes = {
    traffic:  document.getElementById('dashChartTraffic'),
    pages:    document.getElementById('dashChartPages'),
    device:   document.getElementById('dashChartDevice'),
    country:  document.getElementById('dashChartCountry'),
    city:     document.getElementById('dashChartCity'),
    events:   document.getElementById('dashChartEvents'),
    os:       document.getElementById('dashChartOs'),
    browser:  document.getElementById('dashChartBrowser'),
    language: document.getElementById('dashChartLanguage'),
    newReturning: document.getElementById('dashChartNewReturning'),
  };

  // Un bloque elegido por categoría (el primero que matchea, ver §5).
  const EMPTY_STORE = { traffic: null, pages: null, device: null, country: null, city: null,
    events: null, audience: null, os: null, browser: null, language: null,
    newUsers: null, returningUsers: null };
  const store = Object.assign({}, EMPTY_STORE);

  /* ─────────── 2. CSV: una línea, respetando comillas ─────────── */
  function parseCSVLine(line){
    const out = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++){
      const c = line[i];
      if (inQuotes){
        if (c === '"'){
          if (line[i+1] === '"'){ cur += '"'; i++; }
          else inQuotes = false;
        } else cur += c;
      } else if (c === '"'){
        inQuotes = true;
      } else if (c === ','){
        out.push(cur); cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  // Corta un CSV de GA4 en sus tablas internas. Cada bloque: una línea de
  // header seguida de filas, terminado por una línea en blanco, un
  // comentario "#..." o el fin del archivo.
  function splitBlocks(text){
    // Los CSV que exporta Google suelen traer un BOM al principio; si no
    // se saca, la primera línea de metadata no matchea el '#' y arruina
    // la detección de bloques.
    const clean = text.replace(/^﻿/, '');
    const lines = clean.split(/\r\n|\n|\r/);
    const blocks = [];
    let i = 0;
    while (i < lines.length){
      while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().startsWith('#'))) i++;
      if (i >= lines.length) break;
      const headers = parseCSVLine(lines[i]); i++;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().startsWith('#')){
        rows.push(parseCSVLine(lines[i])); i++;
      }
      if (headers.length && headers[0]) blocks.push({ headers, rows, hLower: headers.map(h => h.toLowerCase()) });
    }
    return blocks;
  }

  /* ─────────── 3. Números: GA exporta con punto decimal (no coma),
     sin separador de miles — pero por las dudas cubrimos ambos casos. ─────────── */
  function normalizeNumber(raw){
    if (raw == null) return 0;
    let s = String(raw).trim().replace(/[^\d.,\-]/g, '');
    if (s === '') return 0;
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot){
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma){
      const parts = s.split(',');
      s = parts[parts.length - 1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function findCol(headers, keywords){
    for (const k of keywords){
      const idx = headers.findIndex(h => h.toLowerCase().includes(k));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  /* ─────────── 4. A qué categoría pertenece cada bloque ───────────
     Cada categoría tiene matchers en orden de prioridad: se recorren
     TODOS los bloques con el primer matcher antes de probar el
     siguiente, así una coincidencia exacta ("Categoría de dispositivo")
     no pierde contra una parecida pero menos precisa ("...o plataforma"),
     sin importar en qué archivo apareció primero.

     Además de matchear el nombre de la dimensión (primera columna), cada
     categoría exige que el bloque tenga la MÉTRICA que después vamos a
     graficar (ver CATEGORY_METRIC). Sin esto, un reporte individual que
     comparte la misma dimensión pero mide otra cosa — por ejemplo
     "Adquisición de clientes potenciales" también agrupa por canal, pero
     mide leads, no usuarios — le robaría el lugar a un archivo que sí
     sirve, y se quedaría sin nada para mostrar. */
  const CATEGORY_MATCHERS = {
    device:   [ h => h[0] === 'categoría de dispositivo', h => h.join(' ').includes('categoría de dispositivo') ],
    country:  [ h => h[0] === 'país' ],
    city:     [ h => h[0] === 'ciudad' ],
    events:   [ h => h[0] === 'nombre del evento' ],
    traffic:  [ h => h[0].includes('canales') || h[0].includes('canal'), h => h.join(' ').includes('fuente manual de la sesión') ],
    pages:    [ h => h[0] === 'título de página y clase de pantalla', h => h[0] === 'ruta de página y clase de pantalla', h => h.join(' ').includes('página y clase de pantalla') ],
    audience: [ h => h[0] === 'nombre de la audiencia' ],
    os:       [ h => h[0] === 'sistema operativo' ],
    browser:  [ h => h[0] === 'navegador' ],
    language: [ h => h[0] === 'idioma' ],
    // Estos dos son series por día ("Día N"), no por categoría — la
    // dimensión no importa, solo sumamos el total del período.
    newUsers:       [ h => h[0] === 'día n' && h[1] === 'usuarios nuevos' ],
    returningUsers: [ h => h[0] === 'día n' && h[1] === 'usuarios recurrentes' ],
  };

  // Nombres EXACTOS (no sustrings sueltos) de columnas de conteo de
  // usuarios que usa GA4. Nada de keywords sueltas tipo "usuarios": varios
  // reportes tienen columnas de TASA o PROMEDIO que también contienen esa
  // palabra ("Tasa de evento clave de usuarios", "Tiempo... por usuario
  // activo") sin ser un conteo real, y terminan matcheando por error.
  const USER_COUNT_KEYWORDS = ['usuarios activos', 'total de usuarios', 'usuarios nuevos', 'usuarios recurrentes'];

  const CATEGORY_METRIC = {
    device: USER_COUNT_KEYWORDS, country: USER_COUNT_KEYWORDS, city: USER_COUNT_KEYWORDS,
    traffic: USER_COUNT_KEYWORDS, os: USER_COUNT_KEYWORDS, browser: USER_COUNT_KEYWORDS,
    language: USER_COUNT_KEYWORDS, audience: USER_COUNT_KEYWORDS,
    pages: ['vistas', 'views'],
    events: ['número de eventos', 'eventos', 'events'],
    newUsers: ['usuarios nuevos'], returningUsers: ['usuarios recurrentes'],
  };

  function classifyAll(blocks){
    const found = {};
    Object.keys(CATEGORY_MATCHERS).forEach(cat => {
      const metricKeywords = CATEGORY_METRIC[cat];
      for (const matcher of CATEGORY_MATCHERS[cat]){
        const block = blocks.find(b => b.rows.length && matcher(b.hLower) && findCol(b.headers, metricKeywords) !== -1);
        if (block){ found[cat] = block; return; }
      }
    });
    return found;
  }

  // Un CSV "Resumen" siempre trae esta línea de metadata al principio;
  // un reporte individual (ej. "Páginas y pantallas: Ruta de página...")
  // en cambio no la tiene — así distinguimos uno de otro.
  function isResumenFile(text){
    const clean = text.replace(/^﻿/, '');
    const lines = clean.split(/\r\n|\n|\r/).slice(0, 15);
    return lines.some(l => /^#\s*resumen de/i.test(l.trim()));
  }

  /* ─────────── 5. Cargar archivos ─────────── */
  function handleFiles(fileList){
    const files = Array.from(fileList).filter(f => /\.csv$/i.test(f.name));
    if (!files.length){
      showStatus('Ese archivo no parece un CSV. Exportalo desde Google Analytics con formato CSV.', true);
      return;
    }
    warningEl.hidden = true;
    let pending = files.length;
    const fileResults = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        fileResults.push({ name: file.name, isResumen: isResumenFile(text), blocks: splitBlocks(text) });
        pending--;
        if (pending === 0) finishLoad(fileResults);
      };
      reader.onerror = () => {
        pending--;
        if (pending === 0) finishLoad(fileResults);
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  function finishLoad(fileResults){
    const resumenBlocks = fileResults.filter(f => f.isResumen).flatMap(f => f.blocks);
    const detailFiles = fileResults.filter(f => !f.isResumen);

    if (!detailFiles.length){
      applyBlocks(resumenBlocks);
      return;
    }

    const detailBlocks = detailFiles.flatMap(f => f.blocks);
    const names = detailFiles.map(f => f.name).join(', ');
    const plural = detailFiles.length > 1;
    warningTextEl.textContent = `${plural ? 'Estos archivos no parecen' : 'Este archivo no parece'} un "Resumen" de Analytics (${names}). Es un reporte individual: puede traer menos datos, o datos distintos, de los que espera esta página. ¿Querés procesarlo${plural ? 's' : ''} igual?`;
    warningEl.hidden = false;
    statusEl.hidden = true;

    warningContinueBtn.onclick = () => {
      warningEl.hidden = true;
      applyBlocks(resumenBlocks.concat(detailBlocks));
    };
    warningIgnoreBtn.onclick = () => {
      warningEl.hidden = true;
      if (resumenBlocks.length) applyBlocks(resumenBlocks);
      else showStatus('No quedó ningún archivo para procesar.', true);
    };
  }

  function applyBlocks(allBlocks){
    const found = classifyAll(allBlocks);
    Object.assign(store, EMPTY_STORE, found);

    const recognized = Object.keys(found).length;
    if (recognized === 0){
      showStatus('No encontramos ningún dato que podamos usar en estos archivos. Probá cargando alguno de los "Resumen" indicados abajo.', true);
      return;
    }
    statusEl.hidden = true;
    render();
  }

  function showStatus(msg, isError){
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
    statusEl.classList.toggle('is-ok', !isError);
  }

  /* ─────────── 6. Leer datos de un bloque ─────────── */
  // La columna 0 es siempre la dimensión (canal / página / país / etc.)
  // en todos los bloques que nos interesan; la métrica se busca por nombre.
  function seriesFromBlock(block, metricKeywords, opts){
    if (!block) return null;
    opts = opts || {};
    const metricIdx = findCol(block.headers, metricKeywords);
    if (metricIdx === -1) return null;

    const exclude = opts.exclude || [];
    const items = block.rows
      .filter(r => r[0] && !/^total$/i.test(r[0].trim()))
      .filter(r => !exclude.includes(r[0].trim().toLowerCase()))
      .map(r => ({ label: r[0], value: normalizeNumber(r[metricIdx]) }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);

    return items;
  }

  function sumFromBlock(block, metricKeywords){
    if (!block) return null;
    const idx = findCol(block.headers, metricKeywords);
    if (idx === -1) return null;
    return block.rows.reduce((acc, r) => acc + normalizeNumber(r[idx]), 0);
  }

  function findRowValue(block, labelRegex, metricKeywords){
    if (!block) return null;
    const idx = findCol(block.headers, metricKeywords);
    if (idx === -1) return null;
    const row = block.rows.find(r => labelRegex.test((r[0] || '').trim()));
    return row ? normalizeNumber(row[idx]) : null;
  }

  // Eventos automáticos que manda GA4 solo (no son una acción real del
  // visitante contra el negocio) — se ocultan para dejar ver las
  // acciones que sí importan (clics a WhatsApp, formularios, etc.).
  const AUTOMATIC_EVENTS = ['page_view', 'session_start', 'user_engagement', 'first_visit', 'scroll', 'click'];

  /* ─────────── 7. Barra horizontal (SVG a mano, sin librerías) ─────────── */
  function renderBars(container, items, opts){
    opts = opts || {};
    container.innerHTML = '';
    if (!items || !items.length) return;
    const max = Math.max(...items.map(i => i.value));
    const top = items.slice(0, opts.limit || 6);

    top.forEach(item => {
      const pct = max > 0 ? Math.max((item.value / max) * 100, 2) : 0;
      const row = document.createElement('div');
      row.className = 'dash-bar';
      row.innerHTML = `
        <span class="dash-bar__label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
        <span class="dash-bar__track">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <rect x="0" y="0" width="100" height="20" fill="var(--mist)"></rect>
            <rect x="0" y="0" width="${pct}" height="20" fill="var(--lime)"></rect>
          </svg>
        </span>
        <span class="dash-bar__value mono">${formatNumber(item.value)}${opts.suffix || ''}</span>
      `;
      container.appendChild(row);
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatNumber(n){
    return Math.round(n).toLocaleString('es-AR');
  }

  function formatPct(n){
    return (Math.round(n * 10) / 10).toLocaleString('es-AR');
  }

  /* ─────────── 8. KPIs ─────────── */
  const KPI_HINTS = {
    'Usuarios': 'Personas distintas que entraron a tu sitio.',
    'Sesiones': 'Veces que entraron en total (una persona puede entrar varias veces).',
    'Páginas vistas': 'Cuántas páginas se abrieron en total.',
    'Desde el celular': 'De tus visitantes, cuántos entraron desde el teléfono.',
  };
  function renderKpi(label, value){
    const hint = KPI_HINTS[label] || '';
    return `
      <div class="dash-kpi">
        <div class="dash-kpi__num">${value}</div>
        <div class="dash-kpi__label mono">${label}</div>
        ${hint ? `<span class="dash-kpi__hint">${hint}</span>` : ''}
      </div>
    `;
  }

  /* ─────────── 9. Armar todo ─────────── */
  function render(){
    resultsEl.hidden = false;

    const trafficItems = seriesFromBlock(store.traffic, USER_COUNT_KEYWORDS);
    const pagesItems   = seriesFromBlock(store.pages, ['vistas', 'views']);
    const deviceItems  = seriesFromBlock(store.device, USER_COUNT_KEYWORDS);
    const countryItems = seriesFromBlock(store.country, USER_COUNT_KEYWORDS);
    const cityItems    = seriesFromBlock(store.city, USER_COUNT_KEYWORDS);
    const osItems      = seriesFromBlock(store.os, USER_COUNT_KEYWORDS);
    const browserItems = seriesFromBlock(store.browser, USER_COUNT_KEYWORDS);
    const languageItemsRaw = seriesFromBlock(store.language, USER_COUNT_KEYWORDS);
    const languageItems = languageItemsRaw && languageItemsRaw.map(i => ({ label: labelLanguage(i.label), value: i.value }));
    const eventItems  = seriesFromBlock(store.events, ['número de eventos', 'eventos', 'events'], { exclude: AUTOMATIC_EVENTS });

    const totalUsers = findRowValue(store.audience, /^all users$/i, USER_COUNT_KEYWORDS)
      ?? sumFromBlock(store.device, USER_COUNT_KEYWORDS)
      ?? sumFromBlock(store.country, USER_COUNT_KEYWORDS);
    const totalSessions = findRowValue(store.events, /^session_start$/i, ['número de eventos', 'eventos', 'events']);
    const totalViews = findRowValue(store.events, /^page_view$/i, ['número de eventos', 'eventos', 'events'])
      ?? sumFromBlock(store.pages, ['vistas', 'views']);

    const totalNewUsers = sumFromBlock(store.newUsers, ['usuarios nuevos']);
    const totalReturningUsers = sumFromBlock(store.returningUsers, ['usuarios recurrentes']);
    const newReturningItems = (totalNewUsers != null && totalReturningUsers != null && (totalNewUsers + totalReturningUsers > 0))
      ? [{ label: 'Nuevos', value: totalNewUsers }, { label: 'Recurrentes', value: totalReturningUsers }]
      : null;

    const totalDevice = deviceItems ? deviceItems.reduce((a, i) => a + i.value, 0) : 0;
    const mobile = deviceItems && deviceItems.find(i => /mobile|celular|móvil/i.test(i.label));
    const pctMobile = mobile && totalDevice > 0 ? (mobile.value / totalDevice) * 100 : null;

    // KPIs
    const kpis = [];
    if (totalUsers != null) kpis.push(renderKpi('Usuarios', formatNumber(totalUsers)));
    if (totalSessions != null) kpis.push(renderKpi('Sesiones', formatNumber(totalSessions)));
    if (totalViews != null) kpis.push(renderKpi('Páginas vistas', formatNumber(totalViews)));
    if (pctMobile != null) kpis.push(renderKpi('Desde el celular', formatPct(pctMobile) + '%'));
    kpisEl.innerHTML = kpis.join('');

    // Resumen en palabras simples
    const parts = [];
    if (totalSessions != null && totalUsers != null){
      parts.push(`Tu sitio recibió <b>${formatNumber(totalSessions)} sesiones</b> de <b>${formatNumber(totalUsers)} visitantes</b> distintos en este período.`);
    } else if (totalUsers != null){
      parts.push(`Tu sitio recibió <b>${formatNumber(totalUsers)} visitantes</b> en este período.`);
    }
    if (trafficItems && trafficItems.length){
      parts.push(`Tu principal fuente de tráfico fue <b>${escapeHtml(trafficItems[0].label)}</b>.`);
    }
    if (pagesItems && pagesItems.length){
      parts.push(`La página más visitada fue <b>${escapeHtml(pagesItems[0].label)}</b>.`);
    }
    if (pctMobile != null){
      parts.push(`El <b>${formatPct(pctMobile)}%</b> de tus visitantes entró desde el celular.`);
    }
    if (eventItems && eventItems.length){
      parts.push(`La acción de contacto más frecuente fue <b>${escapeHtml(labelEvent(eventItems[0].label))}</b>, con ${formatNumber(eventItems[0].value)} veces.`);
    }
    if (newReturningItems){
      const pctReturning = (totalReturningUsers / (totalNewUsers + totalReturningUsers)) * 100;
      parts.push(`De esos visitantes, el <b>${formatPct(pctReturning)}%</b> ya te conocía (volvió a entrar) y el resto era gente nueva.`);
    }
    summaryEl.innerHTML = parts.length
      ? parts.join(' ')
      : 'No encontramos lo suficiente para armar un resumen en palabras, pero revisá los datos más abajo. Probá cargando alguno de los "Resumen" indicados arriba para una devolución más completa.';

    // Gráficos
    toggleChart('traffic', trafficItems);
    toggleChart('pages', pagesItems, { limit: 5 });
    toggleChart('device', deviceItems);
    toggleChart('newReturning', newReturningItems);
    toggleChart('events', eventItems && eventItems.map(i => ({ label: labelEvent(i.label), value: i.value })), { limit: 6 });
    toggleChart('country', countryItems, { limit: 6 });
    toggleChart('city', cityItems, { limit: 6 });
    toggleChart('os', osItems, { limit: 5 });
    toggleChart('browser', browserItems, { limit: 5 });
    toggleChart('language', languageItems, { limit: 5 });
  }

  // Traduce los nombres técnicos de eventos a algo legible para el cliente.
  const EVENT_LABELS = {
    click_whatsapp: 'Clics a WhatsApp',
    click_instagram: 'Clics a Instagram',
    click_email: 'Clics a email',
    form_start: 'Formularios iniciados',
    generate_lead: 'Formularios enviados',
    navigation_click: 'Clics de navegación',
  };
  function labelEvent(name){
    return EVENT_LABELS[name] || name;
  }

  // GA4 devuelve el nombre del idioma en inglés aunque la cuenta esté en
  // español; traducimos los más comunes.
  const LANGUAGE_LABELS = {
    Spanish: 'Español', English: 'Inglés', Portuguese: 'Portugués',
    French: 'Francés', Italian: 'Italiano', German: 'Alemán',
    Chinese: 'Chino', Japanese: 'Japonés', 'Chinese (Taiwan)': 'Chino (Taiwán)',
  };
  function labelLanguage(name){
    return LANGUAGE_LABELS[name] || name;
  }

  function toggleChart(key, items, opts){
    const box = chartBoxes[key];
    if (!items || !items.length){
      box.hidden = true;
      return;
    }
    box.hidden = false;
    renderBars(box.querySelector('.dash-bars'), items, opts);
  }

  /* ─────────── 10. Eventos de carga ─────────── */
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });
  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  resetBtn.addEventListener('click', () => {
    Object.keys(store).forEach(k => store[k] = null);
    resultsEl.hidden = true;
    statusEl.hidden = true;
    warningEl.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
