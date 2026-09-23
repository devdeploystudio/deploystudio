/* ═══════════════════════════════════════════════════════════
   Chrome compartido (nav + menú mobile) para páginas que no cargan
   js/script.js completo (/nosotros, /contacto) - script.js depende de
   elementos que solo existen en el home (hero, carrusel de servicios,
   etc.), así que estas páginas usan este archivo más chico en su lugar.
   El link a la página actual (Nosotros o Contacto) ya viene marcado
   .is-active directo en el HTML de cada página - acá no hace falta
   scroll-spy porque el resto de los links son anclas del home
   (/#servicios, etc.), no de esta página.
   ═══════════════════════════════════════════════════════════ */

(function cursor(){
  var cursors = document.querySelectorAll('[data-cursor]');
  if(!cursors.length) return;
  var on = true;
  setInterval(function(){
    on = !on;
    cursors.forEach(function(c){ c.classList.toggle('off', !on); });
  }, 530);
})();

(function nav(){
  var nav = document.getElementById('nav');
  var toTop = document.getElementById('toTop');
  if(!nav || !toTop) return;

  var onScroll = function(){
    var y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 40);
    toTop.classList.toggle('is-visible', y > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

(function mobileMenu(){
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  if(!burger || !menu) return;

  var toggle = function(open){
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  };

  burger.addEventListener('click', function(){
    toggle(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ toggle(false); });
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') toggle(false);
  });
})();
