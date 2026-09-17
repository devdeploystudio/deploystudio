/* ═══════════════════════════════════════════════
   armar-contrato.js
   Herramienta interna (solo para Deploy, no para clientes): sube el PDF
   de un contrato al Worker (POST /upload, protegido con la clave de
   administrador y el número de presupuesto) y arma el link
   /firmar-contrato/<id> para pasarle al cliente. Ese link ya carga el
   contrato solo - ver js/firmar-contrato.js.

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
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const fileNameEl = $('fileName');
  const uploadBtn = $('uploadBtn');
  const uploadError = $('uploadError');

  const stepForm = $('stepForm');
  const stepUploading = $('stepUploading');
  const stepResult = $('stepResult');

  const resultLink = $('resultLink');
  const copyBtn = $('copyBtn');
  const resetBtn = $('resetBtn');

  let selectedFile = null;

  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) adminToken.value = saved;
  } catch (_) { /* localStorage puede fallar en modo privado - no pasa nada, se pide de nuevo */ }

  function updateBtn() {
    uploadBtn.disabled = !(selectedFile && adminToken.value.trim());
  }
  adminToken.addEventListener('input', updateBtn);

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
      const budget = encodeURIComponent(budgetNumber.value.trim());
      const res = await fetch(WORKER_URL + '/upload?budget=' + budget, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/pdf',
        },
        body: selectedFile,
      });

      if (res.status === 401) throw new Error('clave incorrecta');
      if (!res.ok) throw new Error('upload-failed');

      const data = await res.json();
      // Sin ".html" a propósito - Cloudflare redirige (307) cada página
      // .html a su versión sin extensión en este sitio (ver el MD de
      // Search Console). /firmar-contrato/<id> lo reescribe _redirects.
      const link = location.origin + '/firmar-contrato/' + data.id;

      resultLink.value = link;
      stepUploading.hidden = true;
      stepResult.hidden = false;
    } catch (err) {
      console.error(err);
      stepUploading.hidden = true;
      stepForm.hidden = false;
      uploadError.textContent = err.message === 'clave incorrecta'
        ? 'Clave incorrecta.'
        : 'No pudimos subir el contrato. Probá de nuevo.';
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
    stepResult.hidden = true;
    stepForm.hidden = false;
    updateBtn();
  });
})();
