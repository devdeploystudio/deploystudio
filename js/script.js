/* ═══════════════════════════════════════════════
   /deploy_ — interacciones
   ═══════════════════════════════════════════════ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ─────────── 1. CURSOR TITILANTE ───────────
   Ritmo de consola real: 530ms encendido / 530ms apagado. */
(function blinkCursors(){
  const cursors = document.querySelectorAll('[data-cursor]');
  if(!cursors.length) return;
  let on = true;
  setInterval(() => {
    on = !on;
    cursors.forEach(c => c.classList.toggle('off', !on));
  }, 530);
})();

/* ─────────── 2. BOOT SEQUENCE ─────────── */
(function boot(){
  const boot = document.getElementById('boot');
  const log  = document.getElementById('bootLog');
  const bar  = document.getElementById('bootBar');
  if(!boot) return;

  const arrancar = () => { startReveals(); watchTerminal(); };

  const finish = () => {
    boot.classList.add('is-done');
    document.body.classList.remove('is-locked');
    setTimeout(() => boot.remove(), 600);
    arrancar();
  };

  // Ya se vio en esta sesión → no repetir
  if(sessionStorage.getItem('deploy_booted') || REDUCED){
    boot.remove();
    arrancar();
    return;
  }

  sessionStorage.setItem('deploy_booted', '1');
  document.body.classList.add('is-locked');

  const lines = [
    '<b>$</b> deploy init',
    '<span>✓ resolviendo identidad de marca…</span>',
    '<span>✓ compilando sistema de diseño…</span>',
    '<span>✓ optimizando assets · 100%</span>',
    '<b>→</b> <em>listo. bienvenida a /deploy_</em>'
  ];

  let i = 0;
  const step = () => {
    if(i < lines.length){
      log.insertAdjacentHTML('beforeend', `<div>${lines[i]}</div>`);
      bar.style.transform = `scaleX(${(i + 1) / lines.length})`;
      i++;
      setTimeout(step, i === 1 ? 300 : 240);
    } else {
      setTimeout(finish, 380);
    }
  };
  setTimeout(step, 150);
})();

/* ─────────── 3. TERMINAL DEL HERO ───────────
   Se re-escribe cada vez que el hero vuelve a entrar en pantalla. */
let termToken = 0;

function typeTerminal(){
  const el = document.getElementById('termBody');
  if(!el) return;

  const script = [
    { t: '<span class="p">~/tu-marca $</span> ', speed: 0 },
    { t: 'deploy build --brand --web', speed: 34 },
    { t: '<br><span class="cm">// generando identidad + sitio</span>', speed: 0, pause: 420 },
    { t: '<br><span class="ok">✓ logo, paleta y tipografías</span>', speed: 0, pause: 380 },
    { t: '<br><span class="ok">✓ diseño responsive · 60 fps</span>', speed: 0, pause: 380 },
    { t: '<br><span class="ok">✓ SEO + performance 98/100</span>', speed: 0, pause: 420 },
    { t: '<br><span class="p">✓ deployed →</span> tumarca.com ', speed: 0 },
    { t: '<span class="cur"></span>', speed: 0 }
  ];

  const token = ++termToken;      // invalida cualquier tipeo anterior
  el.innerHTML = '';

  if(REDUCED){
    el.innerHTML = script.map(s => s.t).join('');
    return;
  }

  let li = 0;
  const next = () => {
    if(token !== termToken || li >= script.length) return;
    const item = script[li];

    if(item.speed === 0){
      el.insertAdjacentHTML('beforeend', item.t);
      li++;
      setTimeout(next, item.pause || 60);
      return;
    }

    let ci = 0;
    const holder = document.createElement('span');
    el.appendChild(holder);
    const tick = setInterval(() => {
      if(token !== termToken){ clearInterval(tick); return; }
      holder.textContent += item.t[ci++];
      if(ci >= item.t.length){
        clearInterval(tick);
        li++;
        setTimeout(next, item.pause || 200);
      }
    }, item.speed);
  };
  next();
}

function watchTerminal(){
  const term = document.querySelector('.terminal');
  if(!term) return;

  if(!('IntersectionObserver' in window)){ typeTerminal(); return; }

  let dentro = false;
  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting && !dentro){
        dentro = true;
        typeTerminal();
      } else if(!e.isIntersecting && dentro){
        dentro = false;              // al volver, se escribe de nuevo
      }
    });
  }, { threshold: .35 }).observe(term);
}

/* ─────────── 4. REVEALS AL SCROLL ───────────
   Se repiten: al salir de pantalla se resetean y vuelven a animarse. */
function startReveals(){
  const items = document.querySelectorAll('.reveal');
  if(REDUCED){ items.forEach(i => i.classList.add('is-in')); return; }

  // Red de seguridad: si el observer no llega a disparar, mostramos
  // igual todo lo que ya está en pantalla.
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
      if(el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
    });
  }, 2500);

  if(!('IntersectionObserver' in window)){
    items.forEach(i => i.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;

      if(entry.isIntersecting && entry.intersectionRatio >= .08){
        // Delay escalonado entre hermanos
        const siblings = [...(el.parentElement?.children || [])]
          .filter(c => c.classList.contains('reveal'));
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(idx * 80, 400)}ms`;
        el.classList.add('is-in');
      } else if(!entry.isIntersecting){
        // Fuera de pantalla: se rearma para la próxima pasada
        el.style.transitionDelay = '0ms';
        el.classList.remove('is-in');
      }
    });
  }, { threshold: [0, .08], rootMargin: '0px 0px -6% 0px' });

  items.forEach(i => io.observe(i));
}

/* ─────────── 5. NAV: sticky + link activo ─────────── */
(function nav(){
  const nav = document.getElementById('nav');
  const toTop = document.getElementById('toTop');
  const links = [...document.querySelectorAll('.nav__links a')];
  const sections = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 40);
    toTop.classList.toggle('is-visible', y > 700);

    let current = -1;
    sections.forEach((s, i) => {
      if(s.getBoundingClientRect().top <= 140) current = i;
    });
    links.forEach((l, i) => l.classList.toggle('is-active', i === current));
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ─────────── 6. MENÚ MOBILE ─────────── */
(function mobileMenu(){
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  if(!burger || !menu) return;

  const toggle = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  };

  burger.addEventListener('click', () =>
    toggle(burger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') toggle(false); });
})();

/* ─────────── 7. SPOTLIGHT LIME (toda la página) ───────────
   Escribe --mx / --my en :root; el CSS los usa tanto en .spot como
   en la copia que llevan los bloques oscuros. */
(function spotlight(){
  const spot = document.getElementById('spot');
  if(!spot || REDUCED || window.matchMedia('(hover:none)').matches) return;

  const root = document.documentElement;
  const darkBlocks = [...document.querySelectorAll('.footer,.marquee')];
  let tx = window.innerWidth / 2, ty = window.innerHeight * .4;
  let cx = tx, cy = ty, raf = null, idle = null;

  // Cada bloque oscuro recibe su propia copia de --mx/--my, en
  // coordenadas LOCALES a su caja (mx real - su offset en el viewport),
  // para que el brillo quede alineado al cursor real aunque el
  // bloque no empiece en (0,0) por el scroll.
  function paintDarkBlocks(){
    darkBlocks.forEach(el => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(cx - r.left).toFixed(1)}px`);
      el.style.setProperty('--my', `${(cy - r.top).toFixed(1)}px`);
    });
  }

  window.addEventListener('pointermove', e => {
    tx = e.clientX;
    ty = e.clientY;
    root.style.setProperty('--spot-op', '1');
    if(!raf) raf = requestAnimationFrame(loop);

    clearTimeout(idle);
    idle = setTimeout(() => root.style.setProperty('--spot-op', '.55'), 2600);
  }, { passive: true });

  window.addEventListener('scroll', paintDarkBlocks, { passive: true });

  document.addEventListener('mouseleave', () => root.style.setProperty('--spot-op', '0'));

  function loop(){
    cx += (tx - cx) * .085;
    cy += (ty - cy) * .085;
    root.style.setProperty('--mx', `${cx.toFixed(1)}px`);
    root.style.setProperty('--my', `${cy.toFixed(1)}px`);
    paintDarkBlocks();

    if(Math.abs(tx - cx) < .4 && Math.abs(ty - cy) < .4){ raf = null; return; }
    raf = requestAnimationFrame(loop);
  }
})();

/* ─────────── 8. CONTADORES ───────────
   También se reinician al salir de pantalla. */
(function counters(){
  const nums = document.querySelectorAll('[data-count]');
  if(!nums.length) return;

  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix ?? '+';
    if(REDUCED){ el.textContent = target + suffix; return; }

    const dur = 1500;
    const t0 = performance.now();
    const token = (el._t = (el._t || 0) + 1);

    const frame = (now) => {
      if(token !== el._t) return;
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if(p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  if(!('IntersectionObserver' in window)){ nums.forEach(run); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting && !e.target._on){
        e.target._on = true;
        run(e.target);
      } else if(!e.isIntersecting && e.target._on){
        e.target._on = false;
        e.target._t = (e.target._t || 0) + 1;   // corta la animación en curso
        e.target.textContent = '0';
      }
    });
  }, { threshold: .6 });

  nums.forEach(n => io.observe(n));

  // Fallback por si el observer no dispara
  setTimeout(() => {
    nums.forEach(n => {
      const r = n.getBoundingClientRect();
      if(n.textContent === '0' && r.top < window.innerHeight && r.bottom > 0 && !n._on){
        n._on = true; run(n);
      }
    });
  }, 2600);
})();

/* ─────────── 9. SERVICIOS: carrusel + notebook + teléfono ─────────── */
(function servicios(){
  const rail = document.getElementById('svcRail');
  const tabsEl = document.getElementById('svcTabs');
  if(!rail || typeof SERVICIOS === 'undefined') return;

  const lapView  = document.getElementById('lapView');
  const lapUrl   = document.getElementById('lapUrl');
  const phoneUrl = document.getElementById('phoneUrl');
  const lapNow   = document.getElementById('lapNow');
  const lapNowGroup = document.getElementById('lapNowGroup');
  const laptop   = document.getElementById('laptop');
  const phoneView = document.getElementById('phoneView');
  const phone    = document.getElementById('phone');
  const lapWrap  = document.querySelector('.laptop-wrap');
  const devToggle = document.getElementById('deviceToggle');
  const devToggleTxt = document.getElementById('deviceToggleTxt');
  const count    = document.getElementById('railCount');
  const bar      = document.getElementById('railBar');
  const prev     = document.getElementById('railPrev');
  const next     = document.getElementById('railNext');

  /* Botón desktop/mobile: en mobile va arriba, a la par de las pestañas
     (sitios web/identidad de marca), no abajo del dispositivo — así no
     depende de si el teléfono (bien alto) empujó todo hacia abajo y hay
     que scrollear para encontrarlo. En desktop tiene que seguir DENTRO de
     .laptop-wrap (ver el comentario de más abajo, en la media query):
     ahí es donde .laptop-wrap arma su propia fila con la notebook/celu
     así el botón no salta de posición al cambiar de vista. Como es el
     mismo nodo movido de lugar (no una copia), el resto del código
     (setDevice, el listener de click, etc.) no se entera del cambio. */
  const railHead = document.querySelector('.rail__head');
  const laptopTools = document.querySelector('.laptop__tools');
  const toolsHome = document.createComment('laptop__tools-home');
  if(laptopTools) laptopTools.after(toolsHome);
  /* El contador "01/06" se suma al mismo renglón del botón (adentro de
     .laptop__tools, primero) en vez de quedarse solo en .rail__nav: así
     no le queda un renglón aparte, casi vacío, arriba (las flechas de al
     lado ya están ocultas en táctil) mientras el botón y el nombre del
     servicio quedan abajo en el suyo. Mismo truco que .laptop__tools:
     se mueve el nodo real, no una copia, así el resto del código
     (setCount, etc.) no se entera. */
  const countHome = document.createComment('rail-count-home');
  if(count) count.after(countHome);
  const mqToolsArriba = window.matchMedia('(max-width:1000px)');
  const ubicarTools = () => {
    if(!laptopTools) return;
    if(mqToolsArriba.matches){
      railHead?.appendChild(laptopTools);
      if(count && lapNowGroup) lapNowGroup.appendChild(count);
    } else {
      toolsHome.after(laptopTools);
      if(count) countHome.after(count);
    }
  };
  ubicarTools();
  mqToolsArriba.addEventListener('change', ubicarTools);

  const GRUPOS = [
    { id: 'web',   label: 'Presencia digital' },
    { id: 'marca', label: 'Identidad de marca' }
  ];

  let lista = [];
  let activo = 0;
  let deviceMode = 'desktop';   // 'desktop' muestra la notebook · 'mobile' muestra el teléfono
  const dosDig = (n) => String(n).padStart(2, '0');

  /* Lightbox: ver la captura en grande, con flechas para recorrer todas
     las fotos del grupo actual. La galería se arma según qué pantalla
     tocaron (la de la notebook o la del teléfono), así "siguiente foto"
     no mezcla capturas desktop con mobile. */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let galeria = [];
  let galIdx = 0;

  const pintarLightbox = () => {
    const item = galeria[galIdx];
    if(!item) return;
    lightboxImg.src = item.imagen;
    lightboxImg.alt = `Ejemplo de ${item.nombre}`;
    lightboxTitle.textContent = `${item.nombre} · ${galIdx + 1}/${galeria.length}`;
  };
  const irLightbox = (delta) => {
    if(galeria.length < 2) return;
    galIdx = (galIdx + delta + galeria.length) % galeria.length;
    pintarLightbox();
  };
  const abrirLightbox = (imagenActual, tipo) => {
    galeria = lista
      .map(s => ({ imagen: tipo === 'mobile' ? (s.imagenMobile || s.imagen) : s.imagen, nombre: s.nombre }))
      .filter(g => g.imagen);
    const idx = galeria.findIndex(g => g.imagen === imagenActual);
    galIdx = idx >= 0 ? idx : 0;
    const multi = galeria.length > 1;
    lightboxPrev.hidden = !multi;
    lightboxNext.hidden = !multi;
    pintarLightbox();
    lightbox.hidden = false;
    lightboxClose.focus();
  };
  const cerrarLightbox = () => { lightbox.hidden = true; lightboxImg.src = ''; };

  lightboxClose.addEventListener('click', cerrarLightbox);
  lightboxPrev.addEventListener('click', () => irLightbox(-1));
  lightboxNext.addEventListener('click', () => irLightbox(1));
  lightbox.addEventListener('click', e => { if(e.target === lightbox) cerrarLightbox(); });
  document.addEventListener('keydown', e => {
    if(lightbox.hidden) return;
    if(e.key === 'Escape') cerrarLightbox();
    if(e.key === 'ArrowRight') irLightbox(1);
    if(e.key === 'ArrowLeft') irLightbox(-1);
  });

  /* Estado del pase automático */
  const PASO = 5500;          // cada cuánto pasa de tarjeta
  const ESPERA = 12000;       // pausa después de que la persona toca algo
  let encima = false;         // mouse o foco sobre el bloque
  let aLaVista = true;        // el bloque está en pantalla
  let esperaHasta = 0;

  /* Pestañas */
  tabsEl.innerHTML = GRUPOS.map((g, i) => `
    <button class="svcs__tab${i === 0 ? ' is-active' : ''}" data-grupo="${g.id}"
            role="tab" aria-selected="${i === 0}">
      ${esc(g.label)} <span>${SERVICIOS.filter(s => s.grupo === g.id).length}</span>
    </button>`).join('');

  /* Tarjeta */
  const card = (s, i) => `
    <article class="svc-card" data-i="${i}">
      <button
        type="button"
        class="svc-card__trigger"
        aria-label="Ver ${esc(s.nombre)} en la pantalla">
      </button>
      <div class="svc-card__top">
        <span class="svc-card__n mono">${dosDig(i + 1)}</span>
        <span class="svc-card__sub mono">${esc(s.sub)}</span>
      </div>
      <h3>${esc(s.nombre)}</h3>
      <p class="svc-card__desc">${esc(s.desc)}</p>
      <p class="svc-card__ex mono"><span>ej.</span>${esc(s.ej)}</p>
      <span class="svc-card__k mono">Qué incluye</span>
      <ul class="svc-card__list">${s.incluye.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="svc-card__meta mono">
        <div><b>Plazo estimado</b>${esc(s.plazo)}</div>
        <div><b>Ajustes</b>${esc(s.ajustes)}</div>
      </div>
      <p class="svc-card__disclaimer">Plazo y ajustes estimados: empiezan a contar una vez que tenemos todo el material necesario para arrancar.</p>
    </article>`;

  /* Pinta una pantalla (notebook o teléfono) con un crossfade real: la
     captura anterior se desvanece mientras entra la nueva, en vez de
     cortarse de golpe (con las capturas ya precargadas, entra al toque).
     Se llama una vez por dispositivo cada vez que cambia la tarjeta, así
     las dos quedan siempre listas y cambiar de vista es instantáneo. */
  const pintarVista = (el, imagenSrc, s) => {
    const viejos = [...el.children];
    const temp = document.createElement('div');
    const esDesktop = imagenSrc === s.imagen;
    const srcset = esDesktop && s.imagenSmall
      ? `srcset="${esc(s.imagenSmall)} 640w, ${esc(imagenSrc)} 1300w"
         sizes="(max-width: 760px) 320px, 561px"`
      : '';

    temp.innerHTML = imagenSrc
      ? `<img
           src="${esc(imagenSrc)}"
           ${srcset}
           alt="Ejemplo de ${esc(s.nombre)}"
           loading="lazy"
           decoding="async"
         />`
      : `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"
            role="img" aria-label="Ejemplo de ${esc(s.nombre)}">${s.pantalla}</svg>`;
    const nuevo = temp.firstElementChild;
    el.appendChild(nuevo);
    // Fuerza el reflow para que el navegador registre opacity:0 ANTES de
    // pasar a is-in — si no, no hay transición de la que colgarse.
    void nuevo.offsetHeight;
    nuevo.classList.add('is-in');

    viejos.forEach(anterior => {
      anterior.classList.remove('is-in');
      let sacado = false;
      const sacar = () => { if(sacado) return; sacado = true; anterior.remove(); };
      anterior.addEventListener('transitionend', sacar, { once: true });
      setTimeout(sacar, 600);
    });
  };

  let mostrando = null;   // índice ya pintado, para no repetir
  const mostrar = (i) => {
    const s = lista[i];
    if(!s || i === mostrando) return;
    mostrando = i;

    pintarVista(lapView, s.imagen, s);
    pintarVista(phoneView, s.imagenMobile || s.imagen, s);

    lapUrl.textContent = s.url;
    phoneUrl.textContent = s.url;
    lapNow.textContent = s.nombre;
  };

  // Click en la captura: verla en grande, con flechas para pasar a la
  // foto anterior / siguiente del mismo grupo y del mismo dispositivo.
  lapView.addEventListener('click', () => {
    if(laptop.classList.contains('is-closed')) return;
    const img = lapView.querySelector('img.is-in') || lapView.querySelector('img');
    if(img) abrirLightbox(img.getAttribute('src'), 'desktop');
  });
  phoneView.addEventListener('click', () => {
    if(phone.classList.contains('is-locked')) return;
    const img = phoneView.querySelector('img.is-in') || phoneView.querySelector('img');
    if(img) abrirLightbox(img.getAttribute('src'), 'mobile');
  });

  const marcar = (i) => {
    activo = i;
    [...rail.children].forEach((c, n) => {
      const on = n === i;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-current', on ? 'true' : 'false');
    });
    count.textContent = `${dosDig(i + 1)}/${dosDig(lista.length)}`;
    bar.style.transform = `scaleX(${(i + 1) / lista.length})`;
    mostrar(i);
  };

  // Mientras el scroll lo dispara el propio código (traer), el listener de
  // scroll de más abajo tiene que ignorarlo: si no, durante la animación
  // del scroll "cree" que la tarjeta activa todavía es la vieja y llama a
  // mostrar() de nuevo con el índice anterior, pisando el crossfade que
  // recién arrancó. Eso era lo que se veía "trucho" en el cambio de foto.
  let scrollProgramatico = false;
  let scrollLockTimer = null;

  const traer = (i, instant = false) => {
    const c = rail.children[i];
    if(!c) return;
    const delta = c.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    if(Math.abs(delta) < 1) return;
    scrollProgramatico = true;
    clearTimeout(scrollLockTimer);
    scrollLockTimer = setTimeout(() => { scrollProgramatico = false; }, 500);
    rail.scrollBy({ left: delta, behavior: instant ? 'instant' : (REDUCED ? 'auto' : 'smooth') });
  };

  /* El scrollLeft del riel es un número de píxeles fijo — cuando cambia el
     ancho de la ventana, el ANCHO DE CADA TARJETA cambia con él, pero
     scrollLeft se queda con el valor viejo (el navegador solo lo clampea
     si se pasa del máximo, no lo re-alinea). Resultado: si redimensionás
     la ventana estando en, digamos, la tarjeta 3, esa tarjeta deja de
     estar alineada con el borde del riel — a veces por decenas de
     píxeles, no un problema de redondeo — y se le corta el borde. Este
     listener re-trae la tarjeta activa (sin animación, instant) cada vez
     que el viewport cambia de tamaño, así siempre queda encuadrada bien
     sea cual sea el ancho final. Debounce de 120ms para no recalcular en
     cada frame mientras se arrastra el borde de la ventana. */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => traer(activo, true), 120);
  });

  /* Abrir / cerrar la notebook, bloquear / desbloquear el teléfono.
     Los dos se manejan tocando el marco del dispositivo (no la pantalla:
     eso abre la foto en grande) — con la tapa cerrada o el teléfono
     bloqueado, tocar cualquier parte lo despierta. El puntito lima de
     la esquina (.device__hint) es la única pista visual de que se puede
     tocar; el resto de la accesibilidad va por aria-label/aria-pressed. */
  const setTapaLaptop = (cerrada) => {
    laptop.classList.toggle('is-closed', cerrada);
    laptop.setAttribute('aria-pressed', String(cerrada));
    laptop.setAttribute('aria-label', cerrada ? 'Abrir notebook' : 'Cerrar notebook');
  };
  const abrirLaptop = () => { if(laptop.classList.contains('is-closed')) setTapaLaptop(false); };

  laptop.addEventListener('click', e => {
    if(laptop.classList.contains('is-closed')){ setTapaLaptop(false); return; }
    if(e.target.closest('.laptop__screen')) return;   // eso ya abrió (o no) el lightbox
    setTapaLaptop(true);
  });
  laptop.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setTapaLaptop(!laptop.classList.contains('is-closed'));
  });

  const setLockPhone = (bloqueado) => {
    phone.classList.toggle('is-locked', bloqueado);
    phone.setAttribute('aria-pressed', String(bloqueado));
    phone.setAttribute('aria-label', bloqueado ? 'Ver teléfono' : 'Bloquear teléfono');
  };
  const desbloquearPhone = () => { if(phone.classList.contains('is-locked')) setLockPhone(false); };

  phone.addEventListener('click', e => {
    if(phone.classList.contains('is-locked')){ setLockPhone(false); return; }
    if(e.target.closest('.phone__screen')) return;    // eso ya abrió (o no) el lightbox
    setLockPhone(true);
  });
  phone.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setLockPhone(!phone.classList.contains('is-locked'));
  });

  /* Da la vuelta en los extremos, así el pase automático nunca se traba */
  const ir = (i, dePersona = true) => {
    if(!lista.length) return;
    const n = (i + lista.length) % lista.length;
    marcar(n);
    traer(n);
    if(dePersona){
      esperaHasta = Date.now() + ESPERA;   // pausa el pase automático
      abrirLaptop();                       // si el dispositivo activo estaba
      desbloquearPhone();                  // "cerrado", se despierta para mostrar
    }
  };

  /* Switch desktop ⇄ mobile: intercambia qué dispositivo se ve, sin
     tocar el estado abierto/cerrado de ninguno de los dos (así, si
     volvés a un dispositivo que habías cerrado, lo encontrás como lo
     dejaste). Las dos pantallas ya están pintadas de antes (mostrar()
     las actualiza siempre a la vez), así que el cambio es instantáneo. */
  const setDevice = (modo) => {
    deviceMode = modo;
    const mobile = modo === 'mobile';
    // is-off (visibility:hidden), no hidden/display:none: el que está
    // apagado sigue ocupando su lugar en el grid, así el alto de la fila
    // (y la posición del botón de abajo) no cambia al cambiar de vista.
    laptop.classList.toggle('is-off', mobile);
    phone.classList.toggle('is-off', !mobile);
    devToggle.dataset.mode = modo;
    devToggle.setAttribute('aria-pressed', String(mobile));
    devToggle.setAttribute('aria-label',
      mobile ? 'Ver la versión desktop de este servicio' : 'Ver la versión mobile de este servicio');
    devToggleTxt.textContent = mobile ? 'Versión desktop' : 'Versión mobile';
  };
  devToggle.addEventListener('click', () => setDevice(deviceMode === 'desktop' ? 'mobile' : 'desktop'));

  /* Render de un grupo */
  const render = (grupoId) => {
    lista = SERVICIOS.filter(s => s.grupo === grupoId);
    rail.innerHTML = lista.map(card).join('');
    rail.scrollLeft = 0;
    mostrando = null;   // grupo nuevo: el índice 0 es un servicio distinto
    marcar(0);
  };

  /* Eventos */
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.svcs__tab');
    if(!btn) return;
    tabsEl.querySelectorAll('.svcs__tab').forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    render(btn.dataset.grupo);
  });

  let dragged = false;
  rail.addEventListener('click', e => {
    if(dragged){ dragged = false; return; }
    const c = e.target.closest('.svc-card');
    if(c) ir(+c.dataset.i);
  });

  rail.addEventListener('keydown', e => {
    if(e.key === 'ArrowRight'){ e.preventDefault(); ir(activo + 1); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); ir(activo - 1); }
  });

  prev.addEventListener('click', () => ir(activo - 1));
  next.addEventListener('click', () => ir(activo + 1));

  /* Arrastre con mouse en desktop. El táctil queda afuera (pointerType
     === 'touch') y usa el scroll nativo del navegador: con
     scroll-snap-type:x mandatory el propio navegador ya garantiza que
     el swipe encaje una tarjeta entera, de forma mucho más confiable
     que reimplementarlo a mano con pointer events (probado en
     dispositivo real: a veces no respondía en ningún sentido). Umbral
     de 6px antes de considerarlo "arrastre" para no interferir con un
     click normal sobre la tarjeta; ese mismo flag (dragged) frena al
     listener de click de arriba para que soltar no dispare su ir(). */
  let arrastrando = false, startX = 0, startScroll = 0, lastDelta = 0;
  rail.addEventListener('pointerdown', e => {
    if(e.pointerType === 'touch') return;
    arrastrando = true;
    startX = e.clientX;
    startScroll = rail.scrollLeft;
    lastDelta = 0;
    try { rail.setPointerCapture(e.pointerId); } catch {}
  });
  rail.addEventListener('pointermove', e => {
    if(!arrastrando) return;
    lastDelta = e.clientX - startX;
    if(!dragged && Math.abs(lastDelta) > 6){
      dragged = true;
      rail.classList.add('is-dragging');
    }
    if(dragged) rail.scrollLeft = startScroll - lastDelta;
  });
  const soltarRail = () => {
    if(!arrastrando) return;
    arrastrando = false;
    rail.classList.remove('is-dragging');
    if(!dragged) return;
    const umbral = rail.clientWidth * 0.18;
    if(lastDelta < -umbral) ir(activo + 1);
    else if(lastDelta > umbral) ir(activo - 1);
    else ir(activo);
  };
  rail.addEventListener('pointerup', soltarRail);
  rail.addEventListener('pointercancel', soltarRail);

  // Al arrastrar / scrollear el riel, se activa la tarjeta más a la izquierda
  let raf = null;
  rail.addEventListener('scroll', () => {
    if(raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      if(scrollProgramatico) return;   // este scroll lo iniciamos nosotros, no la persona
      const base = rail.getBoundingClientRect().left;
      let mejor = 0, min = Infinity;
      [...rail.children].forEach((c, i) => {
        const d = Math.abs(c.getBoundingClientRect().left - base);
        if(d < min){ min = d; mejor = i; }
      });
      if(mejor !== activo) marcar(mejor);
    });
  }, { passive: true });

  /* ── Pase automático ──
     Se frena cuando el mouse o el foco están encima, cuando el bloque
     no está en pantalla, cuando el dispositivo que se está mostrando
     está "cerrado" (si no, cambia la pantalla sin que se vea, y al
     abrir podía verse un resto de la transición) y por 12 segundos
     después de cada clic. */
  if(!REDUCED){
    /* rail (las tarjetas), no solo lapWrap (la notebook/celu): antes
       apoyar el mouse en una tarjeta no frenaba el pase automático, así
       que podía cambiar de tarjeta mientras la estabas leyendo. */
    [lapWrap, rail].forEach(el => {
      ['pointerenter', 'focusin'].forEach(ev => el.addEventListener(ev, () => encima = true));
      ['pointerleave', 'focusout'].forEach(ev => el.addEventListener(ev, () => encima = false));
    });

    if('IntersectionObserver' in window){
      new IntersectionObserver(([e]) => { aLaVista = e.isIntersecting; },
        { threshold: .25 }).observe(document.getElementById('servicios'));
    }

    setInterval(() => {
      if(encima || !aLaVista || Date.now() < esperaHasta) return;
      if(deviceMode === 'desktop' && laptop.classList.contains('is-closed')) return;
      if(deviceMode === 'mobile' && phone.classList.contains('is-locked')) return;
      ir(activo + 1, false);
    }, PASO);
  }

  setDevice('desktop');
  render('web');
})();

/* ─────────── 10. A QUIÉN APUNTAMOS: carrusel infinito ─────────── */
(function audienceCarousel(){
  const viewport = document.querySelector('.audience__viewport');
  const track = document.getElementById('audienceTrack');
  const prevBtn = document.getElementById('audiencePrev');
  const nextBtn = document.getElementById('audienceNext');
  if(!viewport || !track) return;

  // Clonamos las cards originales una vez y las sumamos al final de la
  // tira: así, cuando el scroll llega a la mitad (setW), podemos restar
  // setW a la posición sin que se note el salto — el loop es infinito.
  const originales = Array.from(track.children);
  originales.forEach(li => {
    const clon = li.cloneNode(true);
    clon.classList.remove('reveal', 'is-in');
    clon.setAttribute('aria-hidden', 'true');
    clon.setAttribute('tabindex', '-1');
    track.appendChild(clon);
  });

  const VELOCIDAD = 34; // px/s
  let setW = 0, paso = 0, pos = 0, encima = false, aLaVista = true;

  function medir(){
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    paso = originales[0].getBoundingClientRect().width + gap;
    setW = originales.reduce((sum, li) => sum + li.getBoundingClientRect().width + gap, 0);
  }
  medir();
  window.addEventListener('resize', medir);

  const mover = () => { track.style.transform = `translateX(${-pos}px)`; };

  new IntersectionObserver(([e]) => { aLaVista = e.isIntersecting; }, { threshold: .1 }).observe(viewport);

  ['pointerenter', 'focusin'].forEach(ev => viewport.addEventListener(ev, () => encima = true));
  ['pointerleave', 'focusout'].forEach(ev => viewport.addEventListener(ev, () => encima = false));

  prevBtn?.addEventListener('click', () => {
    pos = (pos - paso + setW) % setW;
    mover();
  });
  nextBtn?.addEventListener('click', () => {
    pos = (pos + paso) % setW;
    mover();
  });

  /* Arrastre táctil (o con mouse): igual que el rail de servicios, pero
     ahí el scroll es nativo (overflow-x) — acá la tira se mueve con
     transform vía JS (para el loop infinito), así que no hay scroll
     nativo que aproveche el dedo solo. Lo simulamos a mano: mientras se
     arrastra, "encima" se pone true (mismo flag que el hover, pausa el
     autoplay) y pos sigue el delta del dedo/mouse. touch-action:pan-y en
     el CSS deja pasar el scroll vertical de la página; el horizontal lo
     toma este listener.
     Al soltar sin inercia quedaba tosco — el dedo se despega y la tira
     frena en seco, nada que ver con un scroll nativo. Ahora se mide la
     velocidad de los últimos pointermove (px/ms) y, al soltar, esa
     velocidad "sigue" unos frames más con fricción hasta apagarse (coast
     de abajo) — recién ahí retoma el autoplay, desde donde haya quedado. */
  let arrastrando = false, startX = 0, startPos = 0;
  let velX = 0, lastMoveX = 0, lastMoveT = 0;
  const clampPos = p => ((p % setW) + setW) % setW;

  viewport.addEventListener('pointerdown', e => {
    arrastrando = true; encima = true;
    startX = e.clientX; startPos = pos;
    lastMoveX = e.clientX; lastMoveT = performance.now(); velX = 0;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', e => {
    if(!arrastrando) return;
    const now = performance.now();
    const dt = now - lastMoveT;
    if(dt > 0) velX = (lastMoveX - e.clientX) / dt; // px/ms, + = va hacia la izquierda
    lastMoveX = e.clientX; lastMoveT = now;
    pos = clampPos(startPos + (startX - e.clientX));
    mover();
  });
  const inercia = () => {
    let v = velX, last = performance.now();
    (function coast(now){
      const dt = now - last; last = now;
      v *= Math.pow(0.94, dt / 16);
      if(Math.abs(v) < 0.02){ encima = false; return; }
      pos = clampPos(pos + v * dt);
      mover();
      requestAnimationFrame(coast);
    })(last);
  };
  const soltar = () => {
    if(!arrastrando) return;
    arrastrando = false;
    viewport.classList.remove('is-dragging');
    if(Math.abs(velX) > 0.02) inercia();
    else encima = false;
  };
  viewport.addEventListener('pointerup', soltar);
  viewport.addEventListener('pointercancel', soltar);

  if(REDUCED) return;

  let last = performance.now();
  requestAnimationFrame(function tick(now){
    const dt = (now - last) / 1000;
    last = now;
    if(!encima && aLaVista){
      pos = (pos + VELOCIDAD * dt) % setW;
      mover();
    }
    requestAnimationFrame(tick);
  });
})();

/* ─────────── 11. PROYECTOS: render + filtros ─────────── */
(function projects(){
  const grid = document.getElementById('projGrid');
  const filtersEl = document.getElementById('filters');
  const empty = document.getElementById('projEmpty');
  const more = document.getElementById('projMore');
  if(!grid || typeof PROYECTOS === 'undefined') return;

  const LIMIT = 3;
  let expanded = false;

  /* Mocks dibujados en CSS según el tipo de proyecto */
  const mocks = {
    landing: `<div class="mock__body">
        <div class="mock__h"></div><div class="mock__l"></div><div class="mock__l"></div>
        <div class="mock__row"><div class="mock__pill"></div><div class="mock__pill mock__pill--o"></div></div>
      </div>`,
    shop: `<div class="mock__body">
        <div class="mock__h2"></div><div class="mock__l"></div>
        <div class="mock__cards"><span></span><span></span><span></span></div>
        <div class="mock__row"><div class="mock__pill"></div></div>
      </div>`,
    app: `<div class="mock__body">
        <div class="mock__h2"></div>
        <div class="mock__cards"><span></span><span></span></div>
        <div class="mock__l"></div><div class="mock__l"></div>
        <div class="mock__row"><div class="mock__pill mock__pill--o"></div><div class="mock__pill"></div></div>
      </div>`,
    brand: `<div class="mock__body">
        <div class="mock__row"><div class="mock__pill"></div><div class="mock__pill mock__pill--o"></div></div>
        <div class="mock__h"></div><div class="mock__l"></div>
        <div class="mock__cards"><span></span><span></span><span></span></div>
      </div>`
  };

  const shot = (p) => {
    if(p.imagen){
      return `<img src="${esc(p.imagen)}" alt="Captura del sitio ${esc(p.nombre)}" loading="lazy" />`;
    }
    const host = p.url
      ? esc(p.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))
      : `${esc(p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}.com`;
    return `<div class="mock">
      <div class="mock__bar"><i></i><i></i><i></i>
        <div class="mock__url">${host}</div>
      </div>
      ${mocks[p.mock] || mocks.landing}
    </div>`;
  };

  const card = (p) => `
    <article class="proj" data-cat="${esc(p.categoria)}">
      <div class="proj__shot">${shot(p)}</div>
      <div class="proj__body">
        <div class="proj__meta">
          <span class="proj__cat">${esc(p.categoria)}</span>
          <span class="proj__year">${esc(p.anio)}</span>
        </div>
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="proj__tags">${(p.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
        ${p.url
          ? `<a class="proj__link" href="${esc(p.url)}" target="_blank" rel="noopener">
               Ver sitio en vivo <span>→</span></a>`
          : `<span class="proj__link" style="color:var(--stone)">Caso de estudio · próximamente</span>`}
      </div>
    </article>`;

  const cats = ['Todos', ...new Set(PROYECTOS.map(p => p.categoria))];
  filtersEl.innerHTML = cats.map((c, i) => `
    <button class="filter${i === 0 ? ' is-active' : ''}" data-filter="${esc(c)}" role="tab"
      aria-selected="${i === 0}">${esc(c)}
      <span style="opacity:.5">${c === 'Todos' ? PROYECTOS.length : PROYECTOS.filter(p => p.categoria === c).length}</span>
    </button>`).join('');

  const render = (cat) => {
    const list = cat === 'Todos' ? PROYECTOS : PROYECTOS.filter(p => p.categoria === cat);
    const visible = expanded ? list : list.slice(0, LIMIT);
    const hiddenCount = list.length - visible.length;

    grid.innerHTML = visible.map(card).join('');
    [...grid.children].forEach((el, i) => { el.style.animationDelay = `${i * 55}ms`; });
    empty.hidden = list.length > 0;

    more.hidden = hiddenCount <= 0;
    more.innerHTML = hiddenCount > 0
      ? `<button type="button">Ver todos los proyectos <span>→</span></button>`
      : '';
  };

  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if(!btn) return;
    expanded = false;
    filtersEl.querySelectorAll('.filter').forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    render(btn.dataset.filter);
  });

  more.addEventListener('click', e => {
    if(!e.target.closest('button')) return;
    expanded = true;
    render(filtersEl.querySelector('.filter.is-active')?.dataset.filter || 'Todos');
  });

  render('Todos');
})();

/* ─────────── 12. FORMULARIO ─────────── */
(function form(){
  const form = document.getElementById('form');
  const note = document.getElementById('formNote');
  if(!form) return;

  const EMAIL = 'contact.deploystudio@gmail.com';
  // FormSubmit.co: sin cuenta ni API key. El primer envío te manda un mail
  // de confirmación a EMAIL con un link — lo clickeás una vez y ya queda
  // activo para siempre.
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;
  const WHATSAPP = '5491125851237';
  const btn = form.querySelector('button[type="submit"]');

  // Saca el "!" del campo apenas la persona empieza a corregirlo.
  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('has-error'));

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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Consulta Deploy Studio — ${marca || nombre}`,
          nombre, email,
          'proyecto / marca': marca || '—',
          servicios: servicios.join(', '),
          mensaje: mensaje || '—',
        }),
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

/* ─────────── 13. AÑO EN EL FOOTER ─────────── */
document.getElementById('year').textContent = new Date().getFullYear();

/* ─────────── 14. ANALYTICS ─────────── */
(function analytics(){
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if(!link || typeof gtag !== 'function') return;

    const href = link.href;

    if(href.includes('wa.me/')){
      gtag('event', 'click_whatsapp');
    }

    if(href.includes('instagram.com/')){
      gtag('event', 'click_instagram');
    }

    if(href.includes('mail.google.com/')){
      gtag('event', 'click_email');
    }
  });

  /* Navegación interna: navbar + footer */
  document.addEventListener('click', e => {
    const link = e.target.closest('nav a[href^="#"], footer a[href^="#"]');

    if(!link || typeof gtag !== 'function') return;

    const href = link.getAttribute('href');

    const sectionName =
      href === '#' || href === '#inicio'
        ? 'inicio'
        : href.replace('#', '');

    const navigationArea =
      link.closest('footer')
        ? 'footer'
        : 'navbar';

    gtag('event', 'navigation_click', {
      navigation_area: navigationArea,
      section_name: sectionName
    });
  });
})();

/* ─────────── 15. PREGUNTAS (ACORDEÓN) ─────────── */
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
