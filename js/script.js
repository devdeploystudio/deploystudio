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
      bar.style.width = `${((i + 1) / lines.length) * 100}%`;
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

/* ─────────── 9. SERVICIOS: carrusel + notebook ─────────── */
(function servicios(){
  const rail = document.getElementById('svcRail');
  const tabsEl = document.getElementById('svcTabs');
  if(!rail || typeof SERVICIOS === 'undefined') return;

  const lapView = document.getElementById('lapView');
  const lapUrl  = document.getElementById('lapUrl');
  const lapNow  = document.getElementById('lapNow');
  const laptop  = document.getElementById('laptop');
  const lapWrap = document.querySelector('.laptop-wrap');
  const toggle  = document.getElementById('lapToggle');
  const togTxt  = document.getElementById('lapToggleTxt');
  const count   = document.getElementById('railCount');
  const bar     = document.getElementById('railBar');
  const prev    = document.getElementById('railPrev');
  const next    = document.getElementById('railNext');

  const GRUPOS = [
    { id: 'web',   label: 'Sitios web' },
    { id: 'marca', label: 'Identidad de marca' }
  ];

  let lista = [];
  let activo = 0;
  const dosDig = (n) => String(n).padStart(2, '0');

  // Precarga las capturas para que el cambio de tarjeta no espere a que
  // la imagen baje de la red (eso era lo que se veía "trucho").
  SERVICIOS.forEach(s => { if(s.imagen) new Image().src = s.imagen; });

  /* Lightbox: ver la captura de la notebook en grande, con flechas para
     recorrer todas las fotos del grupo actual y un título que indica cuál
     es cada una. */
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
  const abrirLightbox = (imagenActual) => {
    galeria = lista.filter(s => s.imagen).map(s => ({ imagen: s.imagen, nombre: s.nombre }));
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
    <article class="svc-card" data-i="${i}" tabindex="0" role="button"
             aria-label="Ver ${esc(s.nombre)} en la pantalla">
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
        <div><b>Plazo</b>${esc(s.plazo)}</div>
        <div><b>Ajustes</b>${esc(s.ajustes)}</div>
      </div>
      <span class="svc-card__see mono">ver en la pantalla</span>
    </article>`;

  /* Pinta la pantalla de la notebook con un crossfade real: la captura
     anterior se desvanece mientras entra la nueva, en vez de cortarse
     de golpe (con las capturas ya precargadas, entra al toque). */
  let mostrando = null;   // índice ya pintado en la pantalla, para no repetir
  const mostrar = (i) => {
    const s = lista[i];
    if(!s || i === mostrando) return;
    mostrando = i;

    const viejos = [...lapView.children];
    const temp = document.createElement('div');
    temp.innerHTML = s.imagen
      ? `<img src="${esc(s.imagen)}" alt="Ejemplo de ${esc(s.nombre)}" />`
      : `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"
            role="img" aria-label="Ejemplo de ${esc(s.nombre)}">${s.pantalla}</svg>`;
    const nuevo = temp.firstElementChild;
    lapView.appendChild(nuevo);
    // Fuerza el reflow para que el navegador registre opacity:0 ANTES de
    // pasar a is-in — si no, no hay transición de la que colgarse.
    void nuevo.offsetHeight;
    nuevo.classList.add('is-in');

    // Desvanece TODO lo que hubiera antes (normalmente una sola captura) y
    // lo saca del DOM. El setTimeout es una red de seguridad: si por lo
    // que sea transitionend no llega a disparar, igual se limpia solo.
    viejos.forEach(anterior => {
      anterior.classList.remove('is-in');
      let sacado = false;
      const sacar = () => { if(sacado) return; sacado = true; anterior.remove(); };
      anterior.addEventListener('transitionend', sacar, { once: true });
      setTimeout(sacar, 600);
    });

    lapUrl.textContent = s.url;
    lapNow.textContent = s.nombre;
  };

  // Click en la captura de la notebook: verla en grande, con flechas
  // para pasar a la foto anterior / siguiente del mismo grupo.
  lapView.addEventListener('click', () => {
    if(laptop.classList.contains('is-closed')) return;
    const img = lapView.querySelector('img.is-in') || lapView.querySelector('img');
    if(img) abrirLightbox(img.getAttribute('src'));
  });

  const marcar = (i) => {
    activo = i;
    [...rail.children].forEach((c, n) => {
      const on = n === i;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-current', on ? 'true' : 'false');
    });
    count.textContent = `${dosDig(i + 1)}/${dosDig(lista.length)}`;
    bar.style.width = `${((i + 1) / lista.length) * 100}%`;
    mostrar(i);
  };

  // Mientras el scroll lo dispara el propio código (traer), el listener de
  // scroll de más abajo tiene que ignorarlo: si no, durante la animación
  // del scroll "cree" que la tarjeta activa todavía es la vieja y llama a
  // mostrar() de nuevo con el índice anterior, pisando el crossfade que
  // recién arrancó. Eso era lo que se veía "trucho" en el cambio de foto.
  let scrollProgramatico = false;
  let scrollLockTimer = null;

  const traer = (i) => {
    const c = rail.children[i];
    if(!c) return;
    const delta = c.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    if(Math.abs(delta) < 1) return;
    scrollProgramatico = true;
    clearTimeout(scrollLockTimer);
    scrollLockTimer = setTimeout(() => { scrollProgramatico = false; }, 500);
    rail.scrollBy({ left: delta, behavior: REDUCED ? 'auto' : 'smooth' });
  };

  /* Da la vuelta en los extremos, así el pase automático nunca se traba */
  const ir = (i, dePersona = true) => {
    if(!lista.length) return;
    const n = (i + lista.length) % lista.length;
    marcar(n);
    traer(n);
    if(dePersona){
      esperaHasta = Date.now() + ESPERA;   // pausa el pase automático
      abrir();                             // y si estaba cerrada, la abre
    }
  };

  /* Abrir / cerrar la notebook */
  const setTapa = (cerrada) => {
    laptop.classList.toggle('is-closed', cerrada);
    lapWrap.classList.toggle('is-closed', cerrada);
    toggle.setAttribute('aria-pressed', String(cerrada));
    togTxt.textContent = cerrada ? 'abrir notebook' : 'cerrar notebook';
  };
  const abrir = () => { if(laptop.classList.contains('is-closed')) setTapa(false); };

  toggle.addEventListener('click', () =>
    setTapa(!laptop.classList.contains('is-closed')));

  // Con la tapa cerrada, tocar la notebook la abre
  laptop.addEventListener('click', () => {
    if(laptop.classList.contains('is-closed')) setTapa(false);
  });

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

  rail.addEventListener('click', e => {
    const c = e.target.closest('.svc-card');
    if(c) ir(+c.dataset.i);
  });

  rail.addEventListener('keydown', e => {
    if(e.key === 'ArrowRight'){ e.preventDefault(); ir(activo + 1); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); ir(activo - 1); }
    const c = e.target.closest('.svc-card');
    if(c && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); ir(+c.dataset.i); }
  });

  prev.addEventListener('click', () => ir(activo - 1));
  next.addEventListener('click', () => ir(activo + 1));

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
     no está en pantalla, cuando la notebook está cerrada (si no, cambia
     la pantalla sin que se vea, y al abrir podía verse un resto de la
     transición) y por 12 segundos después de cada clic. */
  if(!REDUCED){
    ['pointerenter', 'focusin'].forEach(ev => {
      rail.addEventListener(ev, () => encima = true);
      lapWrap.addEventListener(ev, () => encima = true);
    });
    ['pointerleave', 'focusout'].forEach(ev => {
      rail.addEventListener(ev, () => encima = false);
      lapWrap.addEventListener(ev, () => encima = false);
    });

    if('IntersectionObserver' in window){
      new IntersectionObserver(([e]) => { aLaVista = e.isIntersecting; },
        { threshold: .25 }).observe(document.getElementById('servicios'));
    }

    setInterval(() => {
      if(encima || !aLaVista || Date.now() < esperaHasta) return;
      if(laptop.classList.contains('is-closed')) return;
      ir(activo + 1, false);
    }, PASO);
  }

  render('web');
})();

/* ─────────── 10. PROYECTOS: render + filtros ─────────── */
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

/* ─────────── 11. FORMULARIO ─────────── */
(function form(){
  const form = document.getElementById('form');
  const note = document.getElementById('formNote');
  if(!form) return;

  const EMAIL = 'contact.deploystudio@gmail.com';
  // FormSubmit.co: sin cuenta ni API key. El primer envío te manda un mail
  // de confirmación a EMAIL con un link — lo clickeás una vez y ya queda
  // activo para siempre.
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;
  const WHATSAPP = '5490000000000';   // ⚙️  falta el número real
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

      form.reset();
      note.textContent = 'Listo, recibimos tu consulta. Te respondemos a la brevedad.';
      note.classList.add('ok');
    } catch(err){
      note.innerHTML = `No pudimos enviar el formulario. Escribinos por
        <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" style="text-decoration:underline">WhatsApp</a>
        o a <a href="mailto:${EMAIL}">${EMAIL}</a>.`;
      note.classList.add('err');
    } finally {
      btn.disabled = false;
    }
  });
})();

/* ─────────── 12. AÑO EN EL FOOTER ─────────── */
document.getElementById('year').textContent = new Date().getFullYear();
