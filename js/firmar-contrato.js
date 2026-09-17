/* ═══════════════════════════════════════════════
   firmar-contrato.js
   Firmador de contratos en el navegador. Siempre se entra por un link
   armado desde armar-contrato.html (/contrato/firmar-contrato/<id>) -
   no hay subida manual de PDF acá, el cliente nunca tiene que elegir
   ningún archivo:
   1. Pedimos el PDF al Worker (/contract?id=...).
   2. Buscamos con pdf.js el renglón "EL CLIENTE / Firma" en la ÚLTIMA
      página (siempre ahí, sea cual sea el largo del contrato - la
      posición se detecta por texto, no es una coordenada fija, así que
      da igual si el texto previo la corre más arriba o más abajo).
   3. El cliente firma en un canvas aparte; recortamos la tinta a su
      bounding box y la insertamos con pdf-lib exactamente sobre ese
      renglón, en las coordenadas reales del PDF.
   4. Mandamos el PDF final (base64) al Worker contract (/send), que lo
      reenvía por mail via Resend. Si falla (cuota, red, lo que sea),
      nunca se pierde nada: se puede descargar y mandar por WhatsApp.

   Requiere pdf-lib.min.js y pdf.min.js/pdf.worker.min.js cargados antes
   (ver firmar-contrato.html) - ambos vendored en js/vendor/, sin CDN externo.
   ═══════════════════════════════════════════════ */

(function () {
  const WORKER_URL = 'https://contrato.contact-deploystudio.workers.dev';
  const WHATSAPP_NUMBER = '5491125851237';

  const $ = (id) => document.getElementById(id);

  const stepAutoLoading = $('stepAutoLoading');
  const stepAutoError = $('stepAutoError');
  const stepRead = $('stepRead');
  const stepSign = $('stepSign');
  const stepSending = $('stepSending');
  const stepSuccess = $('stepSuccess');
  const stepFailure = $('stepFailure');

  const fileNameReadEl = $('fileNameRead');
  const pdfPagesEl = $('pdfPages');
  const downloadReadBtn = $('downloadReadBtn');
  const confirmReadBtn = $('confirmReadBtn');

  const fileNameEl = $('fileName');
  const pageCanvas = $('pageCanvas');
  const previewCaption = $('previewCaption');
  const clientNameInput = $('clientName');
  const sigCanvas = $('sigCanvas');
  const clearSigBtn = $('clearSig');
  const sendBtn = $('sendBtn');
  const signError = $('signError');
  const downloadSuccess = $('downloadSuccess');
  const downloadFailure = $('downloadFailure');

  // El link lindo /contrato/firmar-contrato/<id> lo reescribe
  // _redirects a esta misma página con ?id=<id> (la URL en la barra del
  // navegador se queda como /contrato/firmar-contrato/<id> - por eso
  // hay que leer el id del pathname primero). El query string queda
  // como respaldo para probar a mano sin pasar por el rewrite de
  // Cloudflare. No hace falta anclar el regex al principio del path -
  // "/firmar-contrato/<algo>" sigue apareciendo igual aunque la ruta
  // real tenga /contrato/ antes.
  const pathMatch = location.pathname.match(/\/firmar-contrato\/([^/]+)\/?$/);
  const linkId = (pathMatch && pathMatch[1]) || new URLSearchParams(location.search).get('id');

  let originalBytes = null;
  let originalFileName = 'contrato.pdf';
  let anchor = null; // { pageIndex, x, y, width, pageWidth, pageHeight }
  let pdfPage = null; // la misma página de pdf.js para detección y preview
  let hasInk = false;

  function showStep(step) {
    [stepRead, stepSign, stepSending, stepSuccess, stepFailure].forEach((s) => {
      s.hidden = s !== step;
    });
  }

  // ── Carga del contrato desde el link ──────────────────────────────
  if (linkId) {
    stepAutoLoading.hidden = false;
    fetch(WORKER_URL + '/contract?id=' + encodeURIComponent(linkId))
      .then((res) => {
        if (!res.ok) throw new Error('fetch-contract-failed');
        return res.arrayBuffer();
      })
      .then((buf) => {
        // loadPdf ya muestra stepRead de entrada (ver comentario ahí) -
        // ocultamos el "Cargando..." ANTES de llamarlo, para que no
        // queden los dos estados superpuestos.
        stepAutoLoading.hidden = true;
        return loadPdf(new Uint8Array(buf), 'contrato.pdf');
      })
      .catch((err) => {
        console.error(err);
        stepAutoLoading.hidden = true;
        stepAutoError.hidden = false;
      });
  } else {
    // Sin id en la URL no hay nada que cargar - esta página no se
    // pensó para entrar directo, siempre por un link de
    // armar-contrato.html.
    stepAutoError.hidden = false;
  }

  // Común a los dos caminos (subida a mano o cargado por link): primero
  // muestra el contrato COMPLETO para leer (stepRead) - recién al
  // confirmar "ya lo leí" se pasa al paso de firma. La detección del
  // renglón se hace acá igual (es rápida, con getTextContent) para
  // tenerla lista de antemano; el render de la preview de la última
  // página se deja para el momento de mostrar stepSign, no antes.
  async function loadPdf(bytes, fileName) {
    originalFileName = fileName;
    originalBytes = bytes;
    fileNameEl.textContent = '📄 ' + fileName;
    fileNameReadEl.textContent = '📄 ' + fileName;

    // Para quien prefiera leerlo tranquilo aparte (su propio lector de
    // PDF) en vez de scrollear el visor de acá abajo.
    showDownload(downloadReadBtn, new Blob([bytes], { type: 'application/pdf' }), fileName);

    const doc = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    pdfPage = await doc.getPage(doc.numPages);
    anchor = await findSignatureAnchor(pdfPage);

    showStep(stepRead);
    await renderAllPages(doc);
  }

  // Todas las hojas del contrato apiladas como imágenes, para leer
  // scrolleando ahí mismo - el visor nativo de PDF del navegador (un
  // <iframe>) queda chico e incómodo en mobile, una sola página a la
  // vez con su propia UI encima. Mismo timeout defensivo por hoja que
  // renderLastPage: si el render de pdf.js tarda demasiado en una, esa
  // hoja queda en blanco pero no traba ver/leer el resto.
  async function renderAllPages(doc) {
    pdfPagesEl.innerHTML = '<p class="contrato-pdfview__loading mono">Cargando el contrato...</p>';
    const containerWidth = Math.max(pdfPagesEl.clientWidth - 32, 280);

    const pages = await Promise.all(
      Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1))
    );

    // Se arman los <canvas> de todas las hojas EN ORDEN primero (así el
    // orden de lectura queda bien sin importar en qué orden terminen de
    // renderizar), y recién después se renderiza cada una EN PARALELO,
    // no una por una - siete hojas en serie con un timeout de 6s cada
    // una podrían tardar hasta 42s en el peor caso; en paralelo, como
    // mucho tarda lo que tarde la más lenta.
    pdfPagesEl.innerHTML = '';
    const targets = pages.map((page) => {
      const scale = Math.min(2, containerWidth / page.getViewport({ scale: 1 }).width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.className = 'contrato-pdfview__page';
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pdfPagesEl.appendChild(canvas);
      return { page, canvas, viewport };
    });

    await Promise.all(targets.map(async ({ page, canvas, viewport }) => {
      const renderDone = page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const timedOut = new Promise((resolve) => setTimeout(resolve, 6000, 'timeout'));
      const result = await Promise.race([renderDone, timedOut]).catch(() => 'error');
      if (result === 'timeout' || result === 'error') markPageUnavailable(canvas, viewport);
    }));
  }

  // Si una hoja puntual no llegó a renderizar a tiempo, mostrar un
  // aviso claro en su lugar (en vez de dejarla en blanco sin
  // explicación) que apunte al botón de descarga de más arriba.
  function markPageUnavailable(canvas, viewport) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = '#8a8a86';
    ctx.font = Math.max(12, viewport.width * 0.045) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No pudimos mostrar esta página.', viewport.width / 2, viewport.height / 2 - 10);
    ctx.fillText('Descargá el PDF arriba para verla.', viewport.width / 2, viewport.height / 2 + 12);
  }

  // El cliente confirma que ya leyó el contrato completo (mostrado en
  // stepRead) - recién ahí aparece el cuadro para firmar. Coherente con
  // la cláusula del propio contrato (DÉCIMA SÉPTIMA) que pide una
  // conformidad expresa, no solo la firma.
  confirmReadBtn.addEventListener('click', async () => {
    showStep(stepSign);
    resizeSignaturePad();
    // pdf.js puede colgarse si el <canvas> destino está dentro de un
    // contenedor "hidden" (display:none) en ese momento - por eso el
    // render recién pasa acá, con stepSign ya visible.
    await renderLastPage(pdfPage, anchor);
  });

  // ── Detección del renglón de firma (pdf.js) ───────────────────────
  async function findSignatureAnchor(page) {
    const pageIndex = page.pageNumber - 1;
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items = content.items.map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      width: it.width,
    }));

    const clienteItem = items.find((it) => it.str.trim().toUpperCase() === 'EL CLIENTE');

    const fallback = {
      pageIndex,
      x: viewport.width * 0.55,
      y: viewport.height * 0.28,
      width: 170,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    };
    if (!clienteItem) return fallback;

    // La línea de guiones bajos vive arriba de la etiqueta "EL CLIENTE",
    // en la misma columna (x parecido) y unos puntos más arriba (y mayor,
    // el origen del PDF crece hacia arriba).
    const underline = items
      .filter((it) => /^_{5,}$/.test(it.str.trim()) && Math.abs(it.x - clienteItem.x) < 80 && it.y > clienteItem.y && it.y < clienteItem.y + 40)
      .sort((a, b) => a.y - b.y)[0];

    if (underline) {
      return {
        pageIndex,
        x: underline.x,
        y: underline.y,
        width: Math.max(underline.width || 170, 90),
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      };
    }
    return {
      pageIndex,
      x: clienteItem.x,
      y: clienteItem.y + 16,
      width: 170,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    };
  }

  // ── Preview de la última página ───────────────────────────────────
  // Puramente visual/informativa - dónde va a caer la firma ya se
  // decidió en findSignatureAnchor. Si el render() de pdf.js tarda
  // demasiado (o no responde, visto en algún entorno puntual durante
  // pruebas), no bloqueamos poder firmar: seguimos sin la imagen de
  // fondo, con el marco punteado igual dibujado sobre el canvas en
  // blanco para que se entienda dónde va a ir.
  async function renderLastPage(page, anchorInfo) {
    const scale = Math.min(2, 900 / page.getViewport({ scale: 1 }).width);
    const viewport = page.getViewport({ scale });

    pageCanvas.width = viewport.width;
    pageCanvas.height = viewport.height;
    const ctx = pageCanvas.getContext('2d');

    const renderDone = page.render({ canvasContext: ctx, viewport }).promise;
    const timedOut = new Promise((resolve) => setTimeout(resolve, 6000, 'timeout'));
    const result = await Promise.race([renderDone, timedOut]).catch(() => 'error');

    if (result === 'timeout' || result === 'error') {
      console.warn('renderLastPage: no se pudo generar la vista previa a tiempo, seguimos sin ella');
      previewCaption.textContent = 'No pudimos generar la vista previa de la página, pero podés firmar igual - se va a ubicar sobre el renglón de "Firma" de EL CLIENTE.';
    }

    // Marco punteado sobre el renglón detectado, para que se vea claro
    // dónde va a caer la firma antes de firmar.
    if (anchorInfo) {
      const boxW = Math.max(anchorInfo.width, 90) * scale;
      const boxH = 34 * scale;
      const boxX = anchorInfo.x * scale;
      const boxY = viewport.height - anchorInfo.y * scale - boxH;
      ctx.save();
      ctx.strokeStyle = '#84E600';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.restore();
    }
  }

  // ── Paso 2: canvas de firma ────────────────────────────────────────
  let sigCtx = null;
  function resizeSignaturePad() {
    const rect = sigCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sigCanvas.width = rect.width * dpr;
    sigCanvas.height = rect.height * dpr;
    sigCtx = sigCanvas.getContext('2d');
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.4;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#0D0D0D';
    hasInk = false;
    sendBtn.disabled = true;
  }
  // Solo reaccionamos a cambios de ANCHO (rotar el teléfono, cambiar de
  // ventana) - un cambio de alto solo, sin el ancho, es casi siempre la
  // barra de direcciones del navegador mobile escondiéndose/apareciendo
  // al scrollear, no un resize real. Sin este filtro, resizeSignaturePad()
  // borraba la firma que el cliente ya había dibujado (y desactivaba el
  // botón de enviar) apenas scrolleaba un poco - lo que se veía como
  // "se rompe" al firmar en el celular.
  let lastInnerWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastInnerWidth) return;
    lastInnerWidth = window.innerWidth;
    if (!stepSign.hidden) resizeSignaturePad();
  });

  let drawing = false;
  function pointerPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  sigCanvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    hasInk = true;
    sendBtn.disabled = false;
    const p = pointerPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(p.x, p.y);
    sigCanvas.setPointerCapture(e.pointerId);
  });
  sigCanvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pointerPos(e);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    sigCanvas.addEventListener(ev, () => { drawing = false; })
  );

  clearSigBtn.addEventListener('click', () => {
    resizeSignaturePad();
  });

  // Recorta el canvas de firma a la zona con tinta real, para que al
  // escalarla al ancho del renglón no quede rodeada de espacio vacío.
  function cropSignature() {
    const w = sigCanvas.width, h = sigCanvas.height;
    const data = sigCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    const pad = 6;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);

    const cropped = document.createElement('canvas');
    cropped.width = maxX - minX;
    cropped.height = maxY - minY;
    cropped.getContext('2d').drawImage(sigCanvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return cropped;
  }

  // ── Paso 2 → 3: mergear y enviar ──────────────────────────────────
  sendBtn.addEventListener('click', async () => {
    signError.hidden = true;
    if (!hasInk) return;

    const cropped = cropSignature();
    if (!cropped) {
      signError.textContent = 'No detectamos ninguna firma dibujada.';
      signError.hidden = false;
      return;
    }

    showStep(stepSending);

    // El merge se hace ANTES de intentar el envío: así, si el mail falla
    // más abajo, ya tenemos el PDF firmado listo para ofrecer de
    // respaldo (nunca el original sin firma).
    let signedBytes, signedBlob, signedFileName;
    try {
      const pngDataUrl = cropped.toDataURL('image/png');
      const pngBytes = dataUrlToBytes(pngDataUrl);

      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const pdfDoc = await PDFDocument.load(originalBytes);
      const pages = pdfDoc.getPages();
      const targetPage = pages[Math.min(anchor.pageIndex, pages.length - 1)];
      const pngImage = await pdfDoc.embedPng(pngBytes);

      const targetWidth = Math.max(anchor.width, 90);
      let drawW = targetWidth;
      let drawH = (pngImage.height / pngImage.width) * drawW;
      const maxH = 40;
      if (drawH > maxH) { drawH = maxH; drawW = (pngImage.width / pngImage.height) * drawH; }

      targetPage.drawImage(pngImage, {
        x: anchor.x + (targetWidth - drawW) / 2,
        y: anchor.y + 3,
        width: drawW,
        height: drawH,
      });

      // Aclaración con el nombre tipeado, debajo de la firma - mismo
      // criterio que un contrato en papel (firma + nombre impreso).
      // Va bastante por debajo del renglón para no pisar la etiqueta
      // "EL CLIENTE"/"Firma" que ya trae la plantilla en ese espacio.
      const clientNameValue = clientNameInput.value.trim();
      if (clientNameValue) {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 8;
        const label = 'Aclaración: ' + clientNameValue;
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        targetPage.drawText(label, {
          x: anchor.x + Math.max(0, (targetWidth - textWidth) / 2),
          y: anchor.y - 42,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      signedBytes = await pdfDoc.save();
      signedBlob = new Blob([signedBytes], { type: 'application/pdf' });
      signedFileName = originalFileName.replace(/\.pdf$/i, '') + ' - firmado.pdf';
    } catch (err) {
      console.error(err);
      signError.textContent = 'No pudimos armar el PDF firmado. Probá de nuevo.';
      signError.hidden = false;
      showStep(stepSign);
      return;
    }

    try {
      const res = await fetch(WORKER_URL + '/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: bytesToBase64(signedBytes),
          clientName: clientNameInput.value.trim() || 'Sin nombre',
          fileName: signedFileName,
          id: linkId || undefined,
        }),
      });
      if (!res.ok) throw new Error('worker-error');

      showDownload(downloadSuccess, signedBlob, signedFileName);
      showStep(stepSuccess);
    } catch (err) {
      console.error(err);
      showDownload(downloadFailure, signedBlob, signedFileName);
      showStep(stepFailure);
    }
  });

  function showDownload(anchorEl, blob, fileName) {
    const url = URL.createObjectURL(blob);
    anchorEl.href = url;
    anchorEl.download = fileName;
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
})();
