/* ═══════════════════════════════════════════════
   armar-contrato.js
   Herramienta interna (solo para Deploy, no para clientes): sube el PDF
   de un contrato al Worker (POST /upload, protegido con la clave de
   administrador y el número de presupuesto) y arma el link
   /contrato/firmar-contrato/<id> para pasarle al cliente. Ese link ya
   carga el contrato solo - ver js/firmar-contrato.js.

   La clave se guarda en localStorage de este navegador nomás, para no
   tener que tipearla cada vez - nunca sale de acá excepto en el header
   Authorization hacia el propio Worker.
   ═══════════════════════════════════════════════ */

(function () {
  const WORKER_URL = 'https://contrato.contact-deploystudio.workers.dev';
  const TOKEN_KEY = 'deploy_contrato_admin_token';

  const $ = (id) => document.getElementById(id);
  const adminToken = $('adminToken');
  const budgetNumber = $('budgetNumber');
  const clientFirstName = $('clientFirstName');
  const clientLastName = $('clientLastName');
  const clientEmail = $('clientEmail');
  const replaceLink = $('replaceLink');
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const fileNameEl = $('fileName');
  const uploadBtn = $('uploadBtn');
  const uploadError = $('uploadError');

  const stepForm = $('stepForm');
  const stepUploading = $('stepUploading');
  const stepResult = $('stepResult');

  const resultLink = $('resultLink');
  const resultDetail = $('resultDetail');
  const copyBtn = $('copyBtn');
  const resetBtn = $('resetBtn');

  let selectedFile = null;

  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) adminToken.value = saved;
  } catch (_) { /* localStorage puede fallar en modo privado - no pasa nada, se pide de nuevo */ }

  function updateBtn() {
    uploadBtn.disabled = !(
      selectedFile &&
      adminToken.value.trim() &&
      clientFirstName.value.trim() &&
      clientLastName.value.trim()
    );
  }
  [adminToken, clientFirstName, clientLastName].forEach((el) => el.addEventListener('input', updateBtn));

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-dragover');
    if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) selectFile(fileInput.files[0]);
  });

  // Acepta tanto el link completo (.../firmar-contrato/79-a1b2c3) como el
  // id pegado a mano (79-a1b2c3) - mismo patrón que ID_RE en el Worker.
  // Si no matchea nada, se manda tal cual y el Worker lo rechaza con
  // "Id inválido" (mejor que tragarse el error acá silenciosamente).
  function extractReplaceId(raw) {
    const value = (raw || '').trim();
    if (!value) return '';
    const match = value.match(/([a-z0-9]{1,24}-[a-f0-9]{6})\/?$/i);
    return match ? match[1] : value;
  }

  function selectFile(file) {
    uploadError.hidden = true;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      uploadError.textContent = 'Eso no es un PDF.';
      uploadError.hidden = false;
      return;
    }
    selectedFile = file;
    fileNameEl.textContent = '📄 ' + file.name;
    updateBtn();
  }

  uploadBtn.addEventListener('click', async () => {
    uploadError.hidden = true;
    const token = adminToken.value.trim();
    if (!selectedFile || !token) return;

    try { localStorage.setItem(TOKEN_KEY, token); } catch (_) { /* ver arriba */ }

    stepForm.hidden = true;
    stepUploading.hidden = false;

    try {
      const params = new URLSearchParams({
        budget: budgetNumber.value.trim(),
        name: clientFirstName.value.trim(),
        lastname: clientLastName.value.trim(),
        email: clientEmail.value.trim(),
      });
      const replaceId = extractReplaceId(replaceLink.value);
      if (replaceId) params.set('id', replaceId);

      const res = await fetch(WORKER_URL + '/upload?' + params.toString(), {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/pdf',
        },
        body: selectedFile,
      });

      if (res.status === 401) throw new Error('clave incorrecta');
      if (!res.ok) {
        // El Worker manda un mensaje puntual (ej. "Ese link ya no existe...")
        // para 404/400 - mejor mostrar eso que un genérico "no pudimos
        // subir", sobre todo en el caso de reemplazo de un link vencido.
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : 'upload-failed');
      }

      const data = await res.json();
      // Sin ".html" a propósito - Cloudflare redirige (307) cada página
      // .html a su versión sin extensión en este sitio (ver el MD de
      // Search Console). /contrato/firmar-contrato/<id> lo reescribe
      // _redirects.
      const link = location.origin + '/contrato/firmar-contrato/' + data.id;

      resultLink.value = link;
      resultDetail.textContent = replaceId
        ? 'Reemplazamos el PDF. El link del cliente es el mismo de antes, no hace falta volver a mandárselo.'
        : 'Pasale este link al cliente (por WhatsApp, mail, donde sea). Vence solo a las 24 horas, y también deja de funcionar apenas firme (un solo uso).';
      stepUploading.hidden = true;
      stepResult.hidden = false;
    } catch (err) {
      console.error(err);
      stepUploading.hidden = true;
      stepForm.hidden = false;
      uploadError.textContent = err.message === 'clave incorrecta'
        ? 'Clave incorrecta.'
        : (err.message && err.message !== 'upload-failed'
          ? err.message
          : 'No pudimos subir el contrato. Probá de nuevo.');
      uploadError.hidden = false;
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultLink.value);
      copyBtn.textContent = 'Copiado ✓';
      setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1800);
    } catch (_) {
      resultLink.select();
    }
  });

  resetBtn.addEventListener('click', () => {
    selectedFile = null;
    fileNameEl.textContent = '';
    fileInput.value = '';
    budgetNumber.value = '';
    clientFirstName.value = '';
    clientLastName.value = '';
    clientEmail.value = '';
    replaceLink.value = '';
    stepResult.hidden = true;
    stepForm.hidden = false;
    updateBtn();
  });
})();
