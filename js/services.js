/* ═══════════════════════════════════════════════════════════
   /deploy_ — SERVICIOS
   ───────────────────────────────────────────────────────────
   De acá salen las tarjetas del carrusel Y las pantallas que
   se muestran dentro de la notebook.

   Identidad visual / Identidad de marca ya no viven acá (dejaron de
   ofrecerse como servicio aparte, ver el banner fijo en .svcs, en
   index.html, que las ofrece como un extra sobre el sitio). Este
   archivo ahora solo tiene servicios de sitios web.

   Campos:
   grupo    → "web" (queda el campo por si en el futuro vuelve a haber
              más de un grupo - por ahora las pestañas no se muestran,
              ver "9. SERVICIOS" en js/script.js)
   nombre   → título de la tarjeta
   sub      → bajada corta, en mono
   desc     → explicación en lenguaje de todos los días
   ej       → ejemplos concretos de clientes / casos
   incluye  → qué entra en la entrega (array)
   plazo    → tiempo estimado
   ajustes  → rondas de ajuste incluidas
   url      → lo que se ve en la barra de la notebook
   imagen       → (opcional) captura real en img/servicios/, se muestra
                  en la notebook en vez del dibujo SVG si está presente
   imagenMobile → (opcional) la misma captura pero en formato celular,
                  en img/servicios/mobile/. Se muestra en el teléfono.
                  Si no está, el teléfono usa "imagen" (la desktop),
                  recortada — sirve para no dejar la pantalla vacía,
                  pero lo ideal es sacar la mobile real (ver
                  tools/captura.js o tools/optimizar-imagen.js si es
                  una imagen que ya tenés, tipo un export de una IA).
   pantalla     → dibujo que aparece en la notebook cuando no hay
                  "imagen" (SVG 320×180). Clases disponibles: s-fg
                  (negro) · s-mut (gris claro) · s-stone (gris medio) ·
                  s-lime (verde) · s-line (contorno) · s-txt (texto mono)
   ═══════════════════════════════════════════════════════════ */

const SERVICIOS = [

  /* ─────────────── SITIOS WEB ─────────────── */
  {
    grupo: 'web',
    nombre: 'Landing page',
    sub: 'un objetivo, una página',
    desc: 'Una sola página para scrollear, pensada para llevar a una acción concreta, sin vueltas ni distracciones.',
    ej: 'lanzamiento de un producto, campaña de Instagram, un servicio puntual',
    incluye: [
      'Hasta 6 secciones',
      'Redacción y organización de los textos',
      'Generación de imágenes adaptadas al diseño completo',
      'Formulario de contacto y botón de WhatsApp'
    ],
    plazo: '2 semanas',
    ajustes: '2 rondas',
    url: 'tumarca.com/landing-page',
    imagen: 'img/servicios/landing-page.jpg',
    imagenSmall: 'img/servicios/landing-page-640.jpg',
    imagenMobile: 'img/servicios/mobile/landing-page.jpg',
    pantalla: `
      <rect class="s-fg" x="26" y="28" width="146" height="15"/>
      <rect class="s-fg" x="26" y="49" width="98" height="15"/>
      <rect class="s-mut" x="26" y="76" width="146" height="5"/>
      <rect class="s-mut" x="26" y="87" width="116" height="5"/>
      <rect class="s-lime" x="26" y="102" width="74" height="21"/>
      <rect class="s-mut" x="196" y="28" width="98" height="95"/>
      <rect class="s-line" x="26" y="142" width="82" height="26"/>
      <rect class="s-line" x="118" y="142" width="82" height="26"/>
      <rect class="s-line" x="210" y="142" width="84" height="26"/>
      <rect class="s-lime" x="36" y="152" width="16" height="6"/>
      <rect class="s-lime" x="128" y="152" width="16" height="6"/>
      <rect class="s-lime" x="220" y="152" width="16" height="6"/>`
  },
  {
    grupo: 'web',
    nombre: 'Sitio institucional',
    sub: 'la casa de la marca',
    desc: 'Un sitio completo con varias páginas y menú, pensado para presentar tu negocio, lo que hacés y toda la información que necesitan encontrar.',
    ej: 'un estudio contable, una clínica, una constructora, una escuela',
    incluye: [
      'Hasta 5 secciones (Inicio, Nosotros, Servicios, Contacto, etc.)',
      'Redacción y organización de los textos',
      'Generación de imágenes adaptadas al diseño completo',
      'Formulario de contacto y botón de WhatsApp'
    ],
    plazo: '3 a 4 semanas',
    ajustes: '3 rondas',
    url: 'tumarca.com/sitio-institucional',
    imagen: 'img/servicios/sitio-institucional.jpg',
    imagenMobile: 'img/servicios/mobile/sitio-institucional.jpg',
    pantalla: `
      <rect class="s-mut" x="0" y="0" width="320" height="26"/>
      <rect class="s-fg" x="18" y="9" width="38" height="9"/>
      <rect class="s-lime" x="146" y="11" width="24" height="5"/>
      <rect class="s-stone" x="178" y="11" width="24" height="5"/>
      <rect class="s-stone" x="210" y="11" width="24" height="5"/>
      <rect class="s-stone" x="242" y="11" width="24" height="5"/>
      <rect class="s-stone" x="274" y="11" width="28" height="5"/>
      <rect class="s-mut" x="18" y="38" width="284" height="66"/>
      <rect class="s-fg" x="34" y="58" width="126" height="13"/>
      <rect class="s-lime" x="34" y="78" width="56" height="13"/>
      <rect class="s-line" x="18" y="116" width="88" height="50"/>
      <rect class="s-fg" x="28" y="126" width="42" height="7"/>
      <rect class="s-line" x="116" y="116" width="88" height="50"/>
      <rect class="s-fg" x="126" y="126" width="42" height="7"/>
      <rect class="s-line" x="214" y="116" width="88" height="50"/>
      <rect class="s-fg" x="224" y="126" width="42" height="7"/>`
  },
  {
    grupo: 'web',
    nombre: 'Tienda online',
    sub: 'vender sin comisiones ajenas',
    desc: 'Tu propia tienda online: tus clientes encuentran lo que buscan, lo suman al carrito y pagan desde la web. Vos gestionás productos, pedidos y stock desde un mismo lugar.',
    ej: 'indumentaria, cosmética, alimentos, librería, vivero',
    incluye: [
      'Catálogo con categorías, buscador y filtros',
      'Fichas de hasta 30 productos, con fotos, variantes y stock',
      'Carrito, cobros online con Mercado Pago y opciones de envío o retiro',
      'Cálculo automático de envíos',
      'Sistema de cupones de descuento',
      'Mails automáticos de compra y estado del pedido'
    ],
    plazo: '4 a 6 semanas',
    ajustes: '3 rondas',
    url: 'tumarca.com/tienda-online',
    imagen: 'img/servicios/tienda-online.jpg',
    imagenMobile: 'img/servicios/mobile/tienda-online.jpg',
    pantalla: `
      <rect class="s-mut" x="0" y="0" width="320" height="26"/>
      <rect class="s-fg" x="18" y="9" width="32" height="9"/>
      <rect class="s-line" x="112" y="7" width="132" height="12" rx="6"/>
      <circle class="s-lime-f" cx="292" cy="13" r="7"/>
      <rect class="s-mut" x="18" y="38" width="88" height="54"/>
      <rect class="s-fg" x="18" y="96" width="40" height="6"/>
      <rect class="s-lime" x="18" y="106" width="30" height="10"/>
      <rect class="s-mut" x="116" y="38" width="88" height="54"/>
      <rect class="s-fg" x="116" y="96" width="40" height="6"/>
      <rect class="s-lime" x="116" y="106" width="30" height="10"/>
      <rect class="s-mut" x="214" y="38" width="88" height="54"/>
      <rect class="s-fg" x="214" y="96" width="40" height="6"/>
      <rect class="s-lime" x="214" y="106" width="30" height="10"/>
      <rect class="s-mut" x="18" y="128" width="88" height="40"/>
      <rect class="s-mut" x="116" y="128" width="88" height="40"/>
      <rect class="s-mut" x="214" y="128" width="88" height="40"/>`
  },
  {
    grupo: 'web',
    nombre: 'Web app',
    sub: 'cuando el sitio tiene que hacer cosas',
    desc: 'Una aplicación online donde cada usuario puede entrar y hacer lo que necesita: pedir un turno, cargar datos, hacer una reserva o consultar información. Menos planillas, menos tareas manuales.',
    ej: 'turnos de un consultorio, reservas de canchas, portal de clientes',
    incluye: [
      'Registro e ingreso de usuarios con distintos permisos',
      'Base de datos para guardar y organizar la información',
      'Avisos y mails automáticos según lo que necesite el sistema',
      'Exportación de información a Excel y PDF'
    ],
    plazo: 'desde 6 semanas',
    ajustes: 'por etapas',
    url: 'tumarca.com/web-app',
    imagen: 'img/servicios/sistema-de-gestion.jpg',
    imagenMobile: 'img/servicios/mobile/sistema-de-gestion.jpg',
    pantalla: `
      <rect class="s-fg" x="0" y="0" width="62" height="180"/>
      <rect class="s-lime" x="12" y="18" width="38" height="7"/>
      <rect class="s-stone" x="12" y="33" width="38" height="5"/>
      <rect class="s-stone" x="12" y="45" width="30" height="5"/>
      <rect class="s-stone" x="12" y="57" width="34" height="5"/>
      <rect class="s-line" x="76" y="14" width="120" height="9"/>
      <rect class="s-line" x="76" y="34" width="68" height="38"/>
      <rect class="s-fg" x="86" y="48" width="30" height="12"/>
      <rect class="s-line" x="152" y="34" width="68" height="38"/>
      <rect class="s-lime" x="162" y="48" width="30" height="12"/>
      <rect class="s-line" x="228" y="34" width="68" height="38"/>
      <rect class="s-fg" x="238" y="48" width="30" height="12"/>
      <rect class="s-fg" x="78" y="140" width="18" height="26"/>
      <rect class="s-fg" x="104" y="124" width="18" height="42"/>
      <rect class="s-lime" x="130" y="106" width="18" height="60"/>
      <rect class="s-fg" x="156" y="132" width="18" height="34"/>
      <rect class="s-fg" x="182" y="118" width="18" height="48"/>
      <rect class="s-mut" x="216" y="90" width="80" height="6"/>
      <rect class="s-mut" x="216" y="102" width="80" height="6"/>
      <rect class="s-mut" x="216" y="114" width="60" height="6"/>`
  },
  {
    grupo: 'web',
    nombre: 'Portfolio',
    sub: 'que hable tu trabajo',
    desc: 'Una galería pensada para que tu trabajo sea el protagonista: cada proyecto con su propio espacio y la libertad de sumar nuevos trabajos cuando quieras.',
    ej: 'fotógrafa, arquitecta, ilustradora, músico, estudio de diseño',
    incluye: [
      'Galería principal con proyectos destacados',
      'Página individual para cada proyecto, con imágenes y contenido',
      'Optimización de imágenes para mantener buena calidad y velocidad',
      'Página de presentación y contacto'
    ],
    plazo: '2 a 3 semanas',
    ajustes: '2 rondas',
    url: 'tumarca.com/portfolio',
    imagen: 'img/servicios/portfolio.jpg',
    imagenMobile: 'img/servicios/mobile/portfolio.jpg',
    pantalla: `
      <rect class="s-fg" x="20" y="16" width="52" height="8"/>
      <rect class="s-stone" x="238" y="17" width="26" height="5"/>
      <rect class="s-stone" x="272" y="17" width="26" height="5"/>
      <rect class="s-mut" x="20" y="36" width="120" height="76"/>
      <rect class="s-mut" x="148" y="36" width="70" height="44"/>
      <rect class="s-lime" x="226" y="36" width="72" height="60"/>
      <rect class="s-mut" x="20" y="120" width="120" height="44"/>
      <rect class="s-mut" x="148" y="88" width="70" height="76"/>
      <rect class="s-mut" x="226" y="104" width="72" height="60"/>`
  },
];
