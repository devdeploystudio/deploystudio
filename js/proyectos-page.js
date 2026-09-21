/* ═══════════════════════════════════════════════
   /proyectos — página completa con todos los proyectos
   Mismo renderizado de tarjetas que la home (js/script.js, bloque
   "11. PROYECTOS"), pero sin filtros ni límite: acá se ven todos de
   una, separados en dos grupos (cliente:true vs. ejemplos).
   ═══════════════════════════════════════════════ */
(function(){
  const clientesGrid = document.getElementById('projPageClientes');
  const ejemplosGrid = document.getElementById('projPageEjemplos');
  if(!clientesGrid || !ejemplosGrid || typeof PROYECTOS === 'undefined') return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

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

  clientesGrid.innerHTML = PROYECTOS.filter(p => p.cliente).map(card).join('');
  ejemplosGrid.innerHTML = PROYECTOS.filter(p => !p.cliente).map(card).join('');
})();
