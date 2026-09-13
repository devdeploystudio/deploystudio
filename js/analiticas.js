/* ═══════════════════════════════════════════════
   /analiticas - lee los CSV "Resumen" que exporta Google
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

  // Cards de barras (rankings): tráfico, páginas, acciones de contacto.
  const chartBoxes = {
    traffic:  document.getElementById('dashChartTraffic'),
    pages:    document.getElementById('dashChartPages'),
    events:   document.getElementById('dashChartEvents'),
  };
  const deviceBox   = document.getElementById('dashChartDevice');
  const splitBox    = document.getElementById('dashChartNewReturning');
  const trendBox    = document.getElementById('dashChartTrend');
  const ecommerceBox = document.getElementById('dashChartEcommerce');
  const leadsBox    = document.getElementById('dashChartLeads');
  const detailPanel = document.getElementById('dashDetailPanel');
  const detailBoxes = {
    country:  document.getElementById('dashDetailCountry'),
    city:     document.getElementById('dashDetailCity'),
    os:       document.getElementById('dashDetailOs'),
    browser:  document.getElementById('dashDetailBrowser'),
    language: document.getElementById('dashDetailLanguage'),
    platform: document.getElementById('dashDetailPlatform'),
    screenResolution: document.getElementById('dashDetailScreenRes'),
  };

  // Un bloque elegido por categoría (el primero que matchea, ver §5).
  const EMPTY_STORE = { traffic: null, pages: null, device: null, country: null, city: null,
    events: null, audience: null, os: null, browser: null, language: null,
    newUsers: null, returningUsers: null, activeUsersDaily: null, engagementTimeDaily: null,
    retentionCohort: null, retentionWeekly: null, platform: null, screenResolution: null,
    revenueDaily: null, buyersDaily: null, newBuyersDaily: null, itemsPurchasedDaily: null };
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
     sin separador de miles - pero por las dudas cubrimos ambos casos. ─────────── */
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
     comparte la misma dimensión pero mide otra cosa - por ejemplo
     "Adquisición de clientes potenciales" también agrupa por canal, pero
     mide leads, no usuarios - le robaría el lugar a un archivo que sí
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
    // Estos son series por día ("Día N"), no por categoría - la dimensión
    // no importa, solo sumamos (o promediamos) el total del período. El
    // orden de las filas se conserva porque también sirven para el
    // gráfico de tendencia (línea día a día), no solo para el total.
    newUsers:       [ h => h[0] === 'día n' && h[1] === 'usuarios nuevos' ],
    returningUsers: [ h => h[0] === 'día n' && h[1] === 'usuarios recurrentes' ],
    activeUsersDaily:    [ h => h[0] === 'día n' && h[1] === 'usuarios activos' ],
    engagementTimeDaily: [ h => h[0] === 'día n' && h[1] && h[1].includes('tiempo de interacción medio') ],
    revenueDaily:        [ h => h[0] === 'día n' && h[1] && h[1].includes('ingresos') ],
    buyersDaily:         [ h => h[0] === 'día n' && h[1] === 'compradores' ],
    newBuyersDaily:      [ h => h[0] === 'día n' && h[1] && h[1].includes('compradores nuevos') ],
    itemsPurchasedDaily: [ h => h[0] === 'día n' && h[1] && h[1].includes('artículos') ],
    // Retención: dos formatos posibles según de qué Resumen salga (una
    // fila por cohorte con columnas "Día N", o una fila por fecha con
    // columnas "Semana N") - se soportan los dos, se usa el que aparezca.
    retentionCohort: [ h => h[0] === 'cohorte' ],
    retentionWeekly: [ h => h[0] === 'fecha' && h.some(c => c.startsWith('semana')) ],
    // Plataforma y resolución de pantalla salen del Resumen de "Tecnología",
    // mismo patrón que sistema operativo / navegador.
    platform:         [ h => h[0] === 'plataforma' ],
    screenResolution: [ h => h[0] === 'resolución de pantalla' ],
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
    platform: USER_COUNT_KEYWORDS, screenResolution: USER_COUNT_KEYWORDS,
    pages: ['vistas', 'views'],
    events: ['número de eventos', 'eventos', 'events'],
    newUsers: ['usuarios nuevos'], returningUsers: ['usuarios recurrentes'],
    activeUsersDaily: ['usuarios activos'], engagementTimeDaily: ['tiempo de interacción medio'],
    revenueDaily: ['ingresos'], buyersDaily: ['compradores'],
    newBuyersDaily: ['compradores nuevos'], itemsPurchasedDaily: ['artículos'],
    retentionCohort: ['día'], retentionWeekly: ['semana'],
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
  // en cambio no la tiene - así distinguimos uno de otro.
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

  // Serie día a día para el gráfico de tendencia: a diferencia de
  // seriesFromBlock, acá NO se ordena por valor - el orden cronológico
  // ("Día 0", "Día 1"...) es el punto de la línea.
  function dailySeriesFromBlock(block, metricKeywords){
    if (!block) return null;
    const idx = findCol(block.headers, metricKeywords);
    if (idx === -1) return null;
    const items = block.rows
      .filter(r => r[0] && !/^total$/i.test(r[0].trim()))
      .map(r => ({ label: r[0], value: normalizeNumber(r[idx]) }));
    return items.length ? items : null;
  }

  // Promedio de una serie "Día N" ignorando los días en 0: Analytics
  // exporta 0 para los días sin datos todavía (no es un promedio real de
  // ese día), así que promediarlos junto con los días reales lo distorsiona.
  function avgDailyIgnoringZero(block, metricKeywords){
    if (!block) return null;
    const idx = findCol(block.headers, metricKeywords);
    if (idx === -1) return null;
    const vals = block.rows.map(r => normalizeNumber(r[idx])).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // Retención: promedia la columna pedida ("día 7" o "semana 1") entre las
  // cohortes/fechas que ya tienen dato. GA4 usa -1 como "todavía no hay
  // dato para esta cohorte" y 0 para cohortes muy nuevas sin datos reales
  // todavía - ambos se excluyen del promedio, no solo el -1.
  function averageRetentionPct(block, colKeyword){
    if (!block) return null;
    const idx = findCol(block.headers, [colKeyword]);
    if (idx === -1) return null;
    const vals = block.rows.map(r => normalizeNumber(r[idx])).filter(v => v > 0);
    if (!vals.length) return null;
    let avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    // Algunos exports dan la retención como fracción (0.23 = 23%) y otros
    // ya como porcentaje (23.4) - si da 1 o menos, asumimos fracción.
    if (avg <= 1) avg *= 100;
    return avg;
  }

  // GA4 exporta "Plataforma" con un formato de array sucio: ["Web"].
  // Después de parsear el CSV (que ya desescapa comillas dobles) queda
  // como el string literal ["Web"] - hay que sacarle los corchetes/comillas.
  function cleanPlatformLabel(raw){
    const s = String(raw || '').trim();
    const m = s.match(/\[?"?([^"\[\]]+)"?\]?/);
    return m && m[1] ? m[1].trim() : s;
  }

  function formatDuration(seconds){
    const s = Math.round(seconds);
    if (s < 60) return s + ' seg';
    const m = Math.floor(s / 60), r = s % 60;
    return m + ' min' + (r ? ' ' + r + ' seg' : '');
  }

  // Eventos automáticos que manda GA4 solo (no son una acción real del
  // visitante contra el negocio) - se ocultan para dejar ver las
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

  /* ─────────── 7b. Dona (dispositivo) - SVG a mano ─────────── */
  // Color fijo por categoría de dispositivo (no por orden), así el
  // celular siempre es lima sin importar si es la categoría más grande
  // o no - coherente con el resto de la página, donde lima = celular.
  const DEVICE_COLORS = { mobile: 'var(--lime)', desktop: 'var(--ink)', tablet: 'var(--stone)' };
  const DONUT_FALLBACK = ['#8a8a8a', '#c7c7c7'];
  function renderDonut(container, items){
    container.innerHTML = '';
    if (!items || !items.length) return;
    const total = items.reduce((a, i) => a + i.value, 0);
    if (total <= 0) return;

    const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
    let acc = 0, fallbackIdx = 0;
    const segments = items.map(item => {
      const known = DEVICE_COLORS[item.label.toLowerCase()];
      const color = known || DONUT_FALLBACK[fallbackIdx++ % DONUT_FALLBACK.length];
      const dash = (item.value / total) * circumference;
      const seg = { item, color, dash, offset: acc };
      acc += dash;
      return seg;
    });

    const circles = segments.map(s => `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}"
        stroke-width="16" stroke-dasharray="${s.dash} ${(circumference - s.dash).toFixed(2)}"
        stroke-dashoffset="${(-s.offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"></circle>
    `).join('');

    const legend = segments.map(s => `
      <div class="dash-donut__item">
        <span class="dash-donut__dot" style="background:${s.color}"></span>
        <span class="dash-donut__label">${escapeHtml(s.item.label)}</span>
        <span class="dash-donut__value mono">${formatPct((s.item.value / total) * 100)}%</span>
      </div>
    `).join('');

    container.innerHTML = `<svg viewBox="0 0 100 100">${circles}</svg><div class="dash-donut__legend">${legend}</div>`;
  }

  /* ─────────── 7c. Barra partida (nuevos vs. recurrentes) ─────────── */
  const SPLIT_COLORS = { Nuevos: 'var(--lime)', Recurrentes: 'var(--ink)' };
  function renderSplit(container, items){
    container.innerHTML = '';
    if (!items || !items.length) return;
    const total = items.reduce((a, i) => a + i.value, 0);
    if (total <= 0) return;

    const segs = items.map(item => {
      const pct = (item.value / total) * 100;
      const color = SPLIT_COLORS[item.label] || 'var(--stone)';
      return `<div class="dash-split__seg" style="width:${pct}%;background:${color}">${pct >= 14 ? formatPct(pct) + '%' : ''}</div>`;
    }).join('');

    const labels = items.map(item => {
      const pct = (item.value / total) * 100;
      return `<span><b>${escapeHtml(item.label)}</b> · ${formatNumber(item.value)} (${formatPct(pct)}%)</span>`;
    }).join('');

    container.innerHTML = `<div class="dash-split__track">${segs}</div><div class="dash-split__labels">${labels}</div>`;
  }

  /* ─────────── 7c-bis. Línea de tendencia (SVG a mano) ───────────
     Path relativo (0-100 x 0-40) con preserveAspectRatio="none": se
     estira al ancho real de la card vía CSS, así no hace falta recalcular
     puntos en resize. */
  function renderLine(container, items){
    container.innerHTML = '';
    if (!items || items.length < 2) return;
    const max = Math.max(...items.map(i => i.value), 1);
    const w = 100, h = 40, n = items.length;
    const points = items.map((it, idx) => {
      const x = (idx / (n - 1)) * w;
      const y = h - (it.value / max) * h;
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
    const area = '0,' + h + ' ' + points + ' ' + w + ',' + h;

    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="dash-line__svg">
        <polygon points="${area}" fill="var(--lime)" opacity=".12"></polygon>
        <polyline points="${points}" fill="none" stroke="var(--lime)" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>
      </svg>
      <div class="dash-line__labels mono">
        <span>Día ${Number(items[0].label) + 1}</span>
        <span>Día ${Number(items[items.length - 1].label) + 1}</span>
      </div>
    `;
  }

  /* ─────────── 7d. Lista compacta (datos secundarios/técnicos) ─────────── */
  function renderMini(container, items, opts){
    opts = opts || {};
    container.innerHTML = '';
    if (!items || !items.length) return;
    const top = items.slice(0, opts.limit || 5);
    container.innerHTML = top.map(item => `
      <div class="dash-mini__row">
        <span class="dash-mini__label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
        <span class="dash-mini__value mono">${formatNumber(item.value)}</span>
      </div>
    `).join('');
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
    'Tiempo de interacción medio': 'Cuánto tiempo pasó en promedio activamente en tu sitio cada visitante (sin contar el tiempo con la pestaña en segundo plano).',
    'Retención a 7 días': 'De la gente que te visitó por primera vez, qué porcentaje volvió a entrar 7 días después.',
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

    // Tendencia diaria de usuarios activos (gráfico de línea).
    const trendItems = dailySeriesFromBlock(store.activeUsersDaily, ['usuarios activos']);

    // Tiempo de interacción medio y retención (KPIs).
    const avgEngagementTime = avgDailyIgnoringZero(store.engagementTimeDaily, ['tiempo de interacción medio']);
    const retentionPct = averageRetentionPct(store.retentionCohort, 'día 7')
      ?? averageRetentionPct(store.retentionWeekly, 'semana 1');

    // Plataforma y resolución de pantalla (columnas del panel técnico).
    const platformItemsRaw = seriesFromBlock(store.platform, USER_COUNT_KEYWORDS);
    const platformItems = platformItemsRaw && platformItemsRaw.map(i => ({ label: cleanPlatformLabel(i.label), value: i.value }));
    const screenResItems = seriesFromBlock(store.screenResolution, USER_COUNT_KEYWORDS);

    // Ventas / ecommerce (card condicional - solo aparece con datos reales).
    const totalRevenue = sumFromBlock(store.revenueDaily, ['ingresos']);
    const totalBuyers = sumFromBlock(store.buyersDaily, ['compradores']);
    const totalNewBuyers = sumFromBlock(store.newBuyersDaily, ['compradores nuevos']);
    const totalItemsPurchased = sumFromBlock(store.itemsPurchasedDaily, ['artículos']);
    const hasEcommerce = [totalRevenue, totalBuyers, totalNewBuyers, totalItemsPurchased].some(v => v > 0);

    // Embudo de clientes potenciales (card condicional) - reutiliza el
    // mismo bloque de eventos que "Acciones de contacto": generate_lead,
    // qualify_lead y close_convert_lead son los 3 eventos estándar que
    // GA4 recomienda para medir este embudo.
    const leadsNew = findRowValue(store.events, /^generate_lead$/i, ['número de eventos', 'eventos', 'events']);
    const leadsQualified = findRowValue(store.events, /^qualify_lead$/i, ['número de eventos', 'eventos', 'events']);
    const leadsConverted = findRowValue(store.events, /^close_convert_lead$/i, ['número de eventos', 'eventos', 'events']);
    const leadsItems = [
      leadsNew != null && { label: 'Nuevos', value: leadsNew },
      leadsQualified != null && { label: 'Cualificados', value: leadsQualified },
      leadsConverted != null && { label: 'Convertidos', value: leadsConverted },
    ].filter(Boolean);
    const hasLeadsFunnel = leadsItems.some(i => i.value > 0);

    const totalDevice = deviceItems ? deviceItems.reduce((a, i) => a + i.value, 0) : 0;
    const mobile = deviceItems && deviceItems.find(i => /mobile|celular|móvil/i.test(i.label));
    const pctMobile = mobile && totalDevice > 0 ? (mobile.value / totalDevice) * 100 : null;

    // KPIs
    const kpis = [];
    if (totalUsers != null) kpis.push(renderKpi('Usuarios', formatNumber(totalUsers)));
    if (totalSessions != null) kpis.push(renderKpi('Sesiones', formatNumber(totalSessions)));
    if (totalViews != null) kpis.push(renderKpi('Páginas vistas', formatNumber(totalViews)));
    if (pctMobile != null) kpis.push(renderKpi('Desde el celular', formatPct(pctMobile) + '%'));
    if (avgEngagementTime != null) kpis.push(renderKpi('Tiempo de interacción medio', formatDuration(avgEngagementTime)));
    if (retentionPct != null) kpis.push(renderKpi('Retención a 7 días', formatPct(retentionPct) + '%'));
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

    // Gráficos principales
    toggleChart('traffic', trafficItems);
    toggleChart('pages', pagesItems, { limit: 5 });
    toggleChart('events', eventItems && eventItems.map(i => ({ label: labelEvent(i.label), value: i.value })), { limit: 6 });

    deviceBox.hidden = !(deviceItems && deviceItems.length);
    if (deviceItems && deviceItems.length) renderDonut(deviceBox.querySelector('.dash-donut'), deviceItems);

    splitBox.hidden = !newReturningItems;
    if (newReturningItems) renderSplit(splitBox.querySelector('.dash-split'), newReturningItems);

    // Tendencia diaria de usuarios activos.
    trendBox.hidden = !trendItems;
    if (trendItems) renderLine(trendBox.querySelector('.dash-line'), trendItems);

    // Ventas y embudo de leads - solo aparecen con datos reales (la
    // mayoría de los sitios de Deploy no tiene ecommerce ni este embudo
    // armado en GA4, así que quedan ocultos sin romper nada).
    ecommerceBox.hidden = !hasEcommerce;
    if (hasEcommerce){
      renderMini(ecommerceBox.querySelector('.dash-mini'), [
        totalRevenue > 0 && { label: 'Ingresos totales', value: totalRevenue },
        totalBuyers > 0 && { label: 'Compradores', value: totalBuyers },
        totalNewBuyers > 0 && { label: 'Compradores nuevos', value: totalNewBuyers },
        totalItemsPurchased > 0 && { label: 'Artículos comprados', value: totalItemsPurchased },
      ].filter(Boolean), { limit: 4 });
    }

    leadsBox.hidden = !hasLeadsFunnel;
    if (hasLeadsFunnel) renderBars(leadsBox.querySelector('.dash-bars'), leadsItems, { limit: 3 });

    // Panel de datos secundarios/técnicos: se agrupan en una sola card,
    // que solo aparece si al menos uno tiene datos. Ojo: no encadenar con
    // || - eso corta apenas uno da true y se saltea renderizar el resto.
    const detailResults = [
      toggleDetail('country', countryItems, { limit: 6 }),
      toggleDetail('city', cityItems, { limit: 6 }),
      toggleDetail('os', osItems, { limit: 5 }),
      toggleDetail('browser', browserItems, { limit: 5 }),
      toggleDetail('language', languageItems, { limit: 5 }),
      toggleDetail('platform', platformItems, { limit: 3 }),
      toggleDetail('screenResolution', screenResItems, { limit: 5 }),
    ];
    detailPanel.hidden = !detailResults.some(Boolean);
  }

  // Traduce los nombres técnicos de eventos a algo legible para el cliente.
  const EVENT_LABELS = {
    click_whatsapp: 'Clics a WhatsApp',
    click_instagram: 'Clics a Instagram',
    click_email: 'Clics a email',
    form_start: 'Formularios iniciados',
    generate_lead: 'Formularios enviados',
    navigation_click: 'Clics de navegación',
    qualify_lead: 'Contacto cualificado',
    close_convert_lead: 'Cliente convertido',
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

  // Devuelve true/false según si ese detalle tenía datos, para que el
  // panel contenedor sepa si tiene que mostrarse o no.
  function toggleDetail(key, items, opts){
    const box = detailBoxes[key];
    if (!items || !items.length){
      box.hidden = true;
      return false;
    }
    box.hidden = false;
    renderMini(box.querySelector('.dash-mini'), items, opts);
    return true;
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
