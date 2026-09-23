/* ═══════════════════════════════════════════════════════════
   contacto.html — formulario + acordeón de preguntas
   El cursor parpadeando y el nav/menú mobile ya los pone js/site-nav.js
   (compartido con /nosotros) - esto es lo específico de esta página:
   año del footer, acordeón de FAQ y el submit del formulario. La
   lógica del form y del acordeón es la misma que tenía script.js
   cuando estas secciones vivían en el home.
   ═══════════════════════════════════════════════════════════ */

(function year(){
  var y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
})();

/* ─────────── FORMULARIO ─────────── */
(function form(){
  const form = document.getElementById('form');
  const note = document.getElementById('formNote');
  if(!form) return;

  const EMAIL = 'contact.deploystudio@gmail.com';
  // Cloudflare Worker propio (worker/contact.js) que manda el mail vía
  // Resend - reemplaza a FormSubmit.co.
  const FORM_ENDPOINT = 'https://contacto.contact-deploystudio.workers.dev';
  const WHATSAPP = '5491125851237';
  const btn = form.querySelector('button[type="submit"]');

  let formStarted = false;
  form.addEventListener('input', e => {
    e.target.closest('.field')?.classList.remove('has-error');
    if(!formStarted){
      formStarted = true;
      if(typeof gtag === 'function') gtag('event', 'form_start');
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    note.className = 'form__note mono';
    form.querySelectorAll('.has-error').forEach(f => f.classList.remove('has-error'));

    const data = new FormData(form);
    const nombre = (data.get('nombre') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const marca = (data.get('marca') || '').toString().trim();
    const mensaje = (data.get('mensaje') || '').toString().trim();
    const servicios = data.getAll('servicio');

    let firstInvalid = null;
    const markError = (field, focusEl) => {
      field?.classList.add('has-error');
      firstInvalid ??= focusEl || field;
    };

    if(!nombre) markError(form.querySelector('[name="nombre"]').closest('.field'), form.querySelector('[name="nombre"]'));
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      markError(form.querySelector('[name="email"]').closest('.field'), form.querySelector('[name="email"]'));
    if(!servicios.length) markError(form.querySelector('.field--chips'));
    if(!mensaje) markError(form.querySelector('[name="mensaje"]').closest('.field'), form.querySelector('[name="mensaje"]'));

    if(form.querySelector('.has-error')){
      note.textContent = 'Revisá los campos marcados con !.';
      note.classList.add('err');
      firstInvalid?.focus?.();
      return;
    }

    btn.disabled = true;
    note.textContent = 'Enviando…';

    try{
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, marca, servicios, mensaje }),
      });
      if(!res.ok) throw new Error('submit failed');

      if(typeof gtag === 'function'){
        gtag('event', 'generate_lead');
      }

      form.reset();
      note.textContent = 'Listo, recibimos tu consulta. Te respondemos a la brevedad.';
      note.classList.add('ok');
    } catch(err){
      note.innerHTML = `No pudimos enviar el formulario. Escribinos por
        <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" style="text-decoration:underline">WhatsApp</a>
        o a <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}" target="_blank" rel="noopener">${EMAIL}</a>.`;
      note.classList.add('err');
    } finally {
      btn.disabled = false;
    }
  });
})();

/* ─────────── PREGUNTAS (ACORDEÓN) ─────────── */
(function faq(){
  const list = document.querySelector('.faq__list');
  if(!list) return;

  const items = [...list.querySelectorAll('.faq__item')];

  const cerrar = item => {
    item.classList.remove('is-open');
    item.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    item.querySelector('.faq__a').style.maxHeight = null;
  };

  const abrir = item => {
    item.classList.add('is-open');
    item.querySelector('.faq__q').setAttribute('aria-expanded', 'true');
    const panel = item.querySelector('.faq__a');
    panel.style.maxHeight = panel.scrollHeight + 'px';
  };

  items.forEach(item => {
    item.querySelector('.faq__q').addEventListener('click', () => {
      const yaAbierto = item.classList.contains('is-open');
      items.forEach(cerrar);
      if(!yaAbierto) abrir(item);
    });
  });
})();
