/* ═══════════════════════════════════════════════
   Guardia de acceso para /post-deploy/*.html (menos login.html). Se
   incluye SIN defer, antes que nada del contenido de la página, para que
   el chequeo arranque lo antes posible - la página igual empieza oculta
   (ver el <style> inline en el <head> de cada página protegida:
   "html:not(.dp-auth-ok) .dash-main{display:none}") hasta que este script
   confirma la sesión, así nadie sin sesión llega a ver el contenido ni
   por una fracción de segundo.

   Válida el token contra worker/post-deploy-auth.js (no alcanza con leer
   el token del lado del cliente: la firma solo se puede verificar del
   lado del Worker, que es el único que conoce AUTH_SECRET).
   ═══════════════════════════════════════════════ */
(function(){
  const WORKER_URL = 'https://post-deploy-auth.contact-deploystudio.workers.dev';
  const TOKEN_KEY = 'dpAuthToken';
  const EMAIL_KEY = 'dpAuthEmail';

  function irALogin(){
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    const aca = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    location.href = `login?next=${encodeURIComponent(aca)}`;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if(!token){ irALogin(); return; }

  fetch(`${WORKER_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
    .then(res => res.json())
    .then(data => {
      if(!data.ok){ irALogin(); return; }
      document.documentElement.classList.add('dp-auth-ok');
      localStorage.setItem(EMAIL_KEY, data.email);
      pintarSesion(data.email);
    })
    .catch(() => irALogin());

  // Arma "mail · Salir" en el header, sin tener que tocar el HTML de cada
  // página protegida a mano - el header (.dash-header) ya existe en las 5.
  // El header solo trae 2 hijos (logo, .dash-back) pensados para las
  // puntas con justify-content:space-between - un 3er hijo quedaría
  // centrado en el medio, así que en vez de eso se envuelve .dash-back +
  // la sesión juntos en un grupo a la derecha (mismo truco que si esos
  // dos ya hubieran venido agrupados en el HTML original).
  function pintarSesion(email){
    const header = document.querySelector('.dash-header');
    const back = header?.querySelector('.dash-back');
    if(!header || !back || document.getElementById('dpSession')) return;

    const wrap = document.createElement('div');
    wrap.id = 'dpSession';
    wrap.className = 'dp-session mono';
    wrap.innerHTML = `<span class="dp-session__email">${email}</span><button type="button" class="dp-session__logout">Salir</button>`;

    const grupo = document.createElement('div');
    grupo.className = 'dp-session-group';
    back.replaceWith(grupo);
    grupo.append(back, wrap);

    wrap.querySelector('.dp-session__logout').addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
      location.href = 'login';
    });
  }
})();
