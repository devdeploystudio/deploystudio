/* ═══════════════════════════════════════════════
   firmar-contrato.js
   Firmador de contratos en el navegador:
   1. El cliente sube el PDF que Deploy le mandó por WhatsApp/mail.
   2. Buscamos con pdf.js el renglón "EL CLIENTE / Firma" en la ÚLTIMA
      página (siempre ahí, sea cual sea el largo del contrato - ver "MD
      para creacion de panel.md" si esto se documenta más adelante).
   3. El cliente firma en un canvas aparte; recortamos la tinta a su
      bounding box y la insertamos con pdf-lib exactamente sobre ese
      renglón, en las coordenadas reales del PDF.
   4. Mandamos el PDF final (base64) al Worker send-contract, que lo
      reenvía por mail via Resend. Si falla (cuota, red, lo que sea),
      nunca se pierde nada: se puede descargar y mandar por WhatsApp.

   Requiere pdf-lib.min.js y pdf.min.js/pdf.worker.min.js cargados antes
   (ver firmar-contrato.html) - ambos vendored en js/vendor/, sin CDN externo.
   ═══════════════════════════════════════════════ */

(function () {
  const WORKER_URL = 'https://send-contract.contact-deploystudio.workers.dev';
  const WHATSAPP_NUMBER = '5491125851237';

  const $ = (id) => document.getElementById(id);
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const uploadError = $('uploadError');

  const stepUpload = $('stepUpload');
  const stepSign = $('stepSign');
  const stepSending = $('stepSending');
  const stepSuccess = $('stepSuccess');
  const stepFailure = $('stepFailure');

  const fileNameEl = $('fileName');
  const pageCanvas = $('pageCanvas');
  const clientNameInput = $('clientName');
  const sigCanvas = $('sigCanvas');
  const clearSigBtn = $('clearSig');
  const sendBtn = $('sendBtn');
  const signError = $('signError');
  const downloadSuccess = $('downloadSuccess');
  const downloadFailure = $('downloadFailure');

  let originalBytes = null;
  let originalFileName = 'contrato.pdf';
  let anchor = null; // { pageIndex, x, y, width, pageWidth, pageHeight }
  let hasInk = false;

  function showStep(step) {
    [stepUpload, stepSign, stepSending, stepSuccess, stepFailure].forEach((s) => {
      s.hidden = s !== step;
    });
  }

  function showUploadError(msg) {
    uploadError.textContent = msg;
    uploadError.hidden = false;
  }

  // ── Paso 1: subir el PDF ──────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    uploadError.hidden = true;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showUploadError('Eso no es un PDF. Subí el contrato tal cual te lo mandamos.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showUploadError('El archivo pesa demasiado - no debería ser tanto para un contrato. Probá con el PDF original que te enviamos.');
      return;
    }

    try {
      originalFileName = file.name;
      originalBytes = new Uint8Array(await file.arrayBuffer());
      fileNameEl.textContent = '📄 ' + file.name;

      anchor = await findSignatureAnchor(originalBytes.slice());
      await renderLastPage(originalBytes.slice(), anchor);

      showStep(stepSign);
      resizeSignaturePad();
    } catch (err) {
      console.error(err);
      showUploadError('No pudimos leer ese PDF. Puede estar dañado o protegido - probá subir de nuevo el que te mandamos.');
    }
  }

  // ── Detección del renglón de firma (pdf.js) ───────────────────────
  async function findSignatureAnchor(bytes) {
    const doc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const pageIndex = doc.numPages - 1;
    const page = await doc.getPage(doc.numPages);
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
  async function renderLastPage(bytes, anchorInfo) {
    const doc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(doc.numPages);
    const scale = Math.min(2, 900 / page.getViewport({ scale: 1 }).width);
    const viewport = page.getViewport({ scale });

    pageCanvas.width = viewport.width;
    pageCanvas.height = viewport.height;
    const ctx = pageCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

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
  window.addEventListener('resize', () => { if (!stepSign.hidden) resizeSignaturePad(); });

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

      const { PDFDocument } = PDFLib;
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
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: bytesToBase64(signedBytes),
          clientName: clientNameInput.value.trim() || 'Sin nombre',
          fileName: signedFileName,
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
