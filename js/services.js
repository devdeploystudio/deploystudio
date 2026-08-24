/* ═══════════════════════════════════════════════════════════
   /deploy_ — SERVICIOS
   ───────────────────────────────────────────────────────────
   De acá salen las tarjetas del carrusel Y las pantallas que
   se muestran dentro de la notebook.

   Campos:
   grupo    → "web" | "marca"   (las dos pestañas)
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
    desc: 'Una sola página para scrollear, enfocada en una acción concreta, sin vueltas ni distracciones.',
    ej: 'lanzamiento de un producto, campaña de Instagram, un servicio puntual',
    incluye: [
      'Una página con hasta 6 secciones (no incluye menú)',
      'Los textos los escribimos nosotros',
      'Formulario que llega a tu mail y botón de WhatsApp',
      'Píxel de Meta y etiqueta de Google Ads listos',
      'Imagen de preview para cuando comparten el link'
    ],
    plazo: '2 semanas',
    ajustes: '2 rondas',
    url: 'tumarca.com/landing-page',
    imagen: 'img/servicios/landing-page.jpg',
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
    desc: 'Un sitio completo con varias páginas y menú, pensado para presentar tu empresa, servicios e información de forma profesional.',
    ej: 'un estudio contable, una clínica, una constructora, una escuela',
    incluye: [
      'Entre 5 y 8 páginas (incluye menú)',
      'Panel para editar textos e imágenes sin tocar código',
      'Sección de novedades o blog',
      'Formulario de contacto, ubicación y datos de tu negocio',
      'Opcional: un segundo idioma'
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
    nombre: 'E-commerce',
    sub: 'vender sin comisiones ajenas',
    desc: 'Tu propia tienda online: tus clientes ven los productos, los suman al carrito y pagan desde la web. Vos gestionás productos y pedidos desde un panel.',
    ej: 'indumentaria, cosmética, alimentos, librería, vivero',
    incluye: [
      'Catálogo con categorías, buscador y filtros',
      'Ficha de producto con fotos, talles y colores',
      'Carrito y pago en pocos pasos',
      'Cobros con Mercado Pago: tarjeta, transferencia y efectivo',
      'Costos de envío y opción de retiro en el local',
      'Panel para cargar productos y ver los pedidos',
      'Mails automáticos de compra y de envío',
      'Cupones de descuento'
    ],
    plazo: '4 a 6 semanas',
    ajustes: '3 rondas',
    url: 'tumarca.com/e-commerce',
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
    desc: 'Un sitio con usuario y contraseña donde cada uno entra y hace algo: pedir un turno, cargar datos, ver sus pedidos. Reemplaza planillas y cuadernos.',
    ej: 'turnos de un consultorio, reservas de canchas, portal de clientes',
    incluye: [
      'Relevamiento de cómo trabajás hoy, antes de programar',
      'Registro e ingreso de usuarios, con permisos por perfil',
      'Base de datos segura con respaldos diarios',
      'Panel con las métricas del negocio, no solo de visitas',
      'Avisos automáticos por mail',
      'Exportar todo a Excel y PDF',
      'Manual de uso por escrito para el equipo'
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
    desc: 'Una galería para mostrar tu trabajo con la mejor cara: imágenes protagonistas, una ficha por proyecto y la libertad de sumar nuevos trabajos cuando quieras.',
    ej: 'fotógrafa, arquitecta, ilustradora, músico, estudio de diseño',
    incluye: [
      'Galería principal con el trabajo destacado',
      'Una ficha por proyecto, con varias imágenes',
      'Cargás los trabajos nuevos vos misma',
      'Fotos en alta resolución sin perder nitidez',
      'Página de biografía y contacto',
      'Animaciones entre proyectos'
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
  {
    grupo: 'web',
    nombre: 'Rediseño',
    sub: 'más rápido y actualizado',
    desc: 'Si tu sitio tarda en cargar, se ve mal en el celular o quedó viejo, lo revisamos, detectamos qué falla y lo dejamos rápido, claro y actualizado.',
    ej: 'sitios hechos hace años, plantillas lentas, webs que no andan en el celular',
    incluye: [
      'Informe claro de qué está fallando y por qué',
      'Optimización del tiempo de carga',
      'Arreglo de la versión celular',
      'Revisión de que Google pueda encontrar e interpretar bien el sitio',
      'Actualización visual sin necesidad de rehacer todo',
      'Comparación antes / después con números'
    ],
    plazo: '1 a 2 semanas',
    ajustes: '2 rondas',
    url: 'informe-de-mejoras.pdf',
    imagen: 'img/servicios/pagina-existente.jpg',
    imagenMobile: 'img/servicios/mobile/pagina-existente.jpg',
    pantalla: `
      <text class="s-txt" x="24" y="34">ANTES</text>
      <rect class="s-mut" x="24" y="42" width="240" height="20"/>
      <rect class="s-stone" x="24" y="42" width="72" height="20"/>
      <text class="s-txt-b" x="272" y="57">4,2s</text>
      <text class="s-txt" x="24" y="94">DESPUÉS</text>
      <rect class="s-mut" x="24" y="102" width="240" height="20"/>
      <rect class="s-lime" x="24" y="102" width="216" height="20"/>
      <text class="s-txt-b" x="272" y="117">0,8s</text>
      <circle class="s-lime-f" cx="28" cy="146" r="4"/>
      <rect class="s-mut" x="38" y="143" width="90" height="6"/>
      <circle class="s-lime-f" cx="152" cy="146" r="4"/>
      <rect class="s-mut" x="162" y="143" width="60" height="6"/>
      <circle class="s-lime-f" cx="246" cy="146" r="4"/>
      <rect class="s-mut" x="256" y="143" width="46" height="6"/>`
  },

  /* ─────────────── IDENTIDAD DE MARCA ─────────────── */
  {
    grupo: 'marca',
    nombre: 'Logo e identidad básica',
    sub: 'lo esencial para arrancar',
    desc: 'El logo de tu marca con su sistema de color y tipografía, listo para usar en cualquier lado. Tres propuestas distintas, elegís una y la ajustamos.',
    ej: 'un emprendimiento nuevo, un rediseño chico, cuando necesitás solo lo esencial',
    incluye: [
      '3 propuestas de logo realmente distintas',
      'Versión principal, horizontal, reducida y en un solo color',
      'Ícono para el navegador y fotos de perfil de cada red',
      'Paleta de colores oficial, con códigos para pantalla e imprenta',
      'Tipografías para títulos, texto y detalles, listas para instalar',
      'Archivos para web y para imprenta'
    ],
    plazo: '2 a 3 semanas',
    ajustes: '2 rondas',
    url: 'propuestas-de-logo.pdf',
    imagen: 'img/servicios/logo-identidad-basica.jpg',
    imagenMobile: 'img/servicios/mobile/logo-identidad-basica.jpg',
    pantalla: `
      <rect class="s-line" x="20" y="30" width="76" height="56"/>
      <circle class="s-fg-f" cx="58" cy="58" r="17"/>
      <rect class="s-line" x="20" y="98" width="76" height="56"/>
      <rect class="s-fg" x="44" y="112" width="28" height="28"/>
      <rect class="s-frame-lime" x="120" y="30" width="180" height="124"/>
      <path class="s-lime-f" d="M196 62 L208 62 L184 122 L172 122 Z"/>
      <rect class="s-fg" x="212" y="86" width="52" height="16"/>
      <rect class="s-lime" x="268" y="94" width="20" height="8"/>
      <text class="s-txt" x="120" y="24">ELEGIDA</text>`
  },
  {
    grupo: 'marca',
    nombre: 'Identidad de marca completa',
    sub: 'branding de punta a punta',
    desc: 'Todo el sistema de marca: del logo al manual de uso, con el naming y las piezas para que se vea igual en todos lados.',
    ej: 'una marca que ya factura y necesita verse consistente en todo, franquicias, negocios con varios puntos de venta',
    incluye: [
      'Todo lo de "Logo e identidad básica"',
      'Naming: varias propuestas de nombre, con chequeo de dominio y usuario de Instagram libres',
      'La frase corta que acompaña al logo',
      'Tono de voz de la marca, con ejemplos escritos para usar',
      'Reglas de uso: qué sí y qué no',
      'Manual de marca completo en PDF',
      'Tarjetas, papelería, packaging y cartelería',
      'Plantillas editables para redes y firma de mail'
    ],
    plazo: '3 a 4 semanas',
    ajustes: '3 rondas',
    url: 'manual-de-marca.pdf',
    imagen: 'img/servicios/identidad-completa.jpg',
    pantalla: `
      <rect class="s-lime" x="24" y="24" width="62" height="62"/>
      <rect class="s-fg" x="94" y="24" width="62" height="62"/>
      <rect class="s-stone" x="164" y="24" width="62" height="62"/>
      <rect class="s-line" x="234" y="24" width="62" height="62"/>
      <text class="s-txt" x="24" y="98">#84E600</text>
      <text class="s-txt" x="94" y="98">#0D0D0D</text>
      <text class="s-txt" x="164" y="98">#B7B7B7</text>
      <text class="s-txt" x="234" y="98">#FAFAF8</text>
      <text class="s-aa" x="24" y="160">Aa</text>
      <rect class="s-mut" x="112" y="122" width="184" height="7"/>
      <rect class="s-mut" x="112" y="136" width="140" height="7"/>
      <rect class="s-mut" x="112" y="150" width="164" height="7"/>`
  }
];
