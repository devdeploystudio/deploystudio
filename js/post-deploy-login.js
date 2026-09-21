/* ═══════════════════════════════════════════════
   post-deploy/login.html — pide el mail, lo valida contra el Worker
   (worker/post-deploy-auth.js) y guarda el token que devuelve. El resto
   de las páginas de /post-deploy/ lo chequean con js/post-deploy-auth.js.
   ═══════════════════════════════════════════════ */
(function(){
  const WORKER_URL = 'https://post-deploy-auth.contact-deploystudio.workers.dev';
  const TOKEN_KEY = 'dpAuthToken';
  const EMAIL_KEY = 'dpAuthEmail';

  const form = document.getElementById('loginForm');
  const input = document.getElementById('loginEmail');
  const btn = document.getElementById('loginSubmit');
  const status = document.getElementById('loginStatus');
  if(!form) return;

  // Si ya había una sesión guardada, no hacerla escribir el mail de nuevo -
  // directo al panel (o a la página de la que la mandó el guard, si vino
  // con ?next=).
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || 'index';
  if(localStorage.getItem(TOKEN_KEY)){
    location.href = next;
    return;
  }

  const showStatus = (text, isError) => {
    status.hidden = false;
    status.textContent = text;
    status.className = `dash-upload__status mono ${isError ? 'is-error' : 'is-ok'}`;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = input.value.trim();
    if(!email) return;

    btn.disabled = true;
    showStatus('Verificando…', false);

    try{
      const res = await fetch(`${WORKER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if(!res.ok || !data.ok){
        showStatus(data.error || 'No pudimos verificar el acceso. Probá de nuevo.', true);
        btn.disabled = false;
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(EMAIL_KEY, data.email);
      location.href = next;
    } catch(err){
      showStatus('No pudimos conectar. Revisá tu conexión e intentá de nuevo.', true);
      btn.disabled = false;
    }
  });
})();
