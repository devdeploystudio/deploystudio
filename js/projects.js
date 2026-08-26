/* ═══════════════════════════════════════════════════════════
   /deploy_ — BASE DE PROYECTOS
   ───────────────────────────────────────────────────────────
   Para sumar un proyecto nuevo, copiá un bloque { ... } y
   pegalo ARRIBA de la lista (el primero es el más reciente).

   Campos:
   nombre    → título del proyecto                        (obligatorio)
   categoria → una de: "Landing page" | "Sitio institucional" |
               "Tienda online" | "Web app" | "Portfolio" |
               "Rediseño web" | "Logo / identidad"          (obligatorio)
               Los filtros se arman solos con lo que uses acá. Usá
               los mismos nombres que las tarjetas de "Qué hacemos"
               (js/services.js) y los botones del formulario de
               contacto (index.html), para que todo coincida.
   anio      → año de entrega, ej: "2026"
   desc      → 1–2 oraciones sobre qué se hizo
   tags      → tecnologías / entregables (array de textos)
   url       → link al sitio en vivo. Si no hay, poné ""
   imagen    → ruta a la captura, ej: "img/proyectos/marca.jpg"
               Si la dejás en "", se dibuja un mock automático.
   mock      → estilo del mock automático (solo si no hay imagen):
               "landing" | "shop" | "app" | "brand"

   ───────────────────────────────────────────────────────────
   Para sacar la captura de un sitio nuevo:
     node tools/captura.js <url> img/proyectos/<nombre>.jpg
   ═══════════════════════════════════════════════════════════ */

const PROYECTOS = [
  {
    nombre: "BRASA",
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Parrilla de leña y vermutería con tres sucursales en CABA. Menú completo, reserva de mesa integrada con Woki (y WhatsApp como respaldo) y ubicación de cada sede en el mapa.",
    tags: ["Menú", "Reservas Woki", "WhatsApp", "Mapas"],
    url: "https://devdeploystudio.github.io/brasa-parrilla/",
    imagen: "img/proyectos/brasa.jpg",
    mock: "landing"
  },
  {
    nombre: "NOEMA",
    categoria: "Tienda online",
    anio: "2026",
    desc: "Tienda de indumentaria y accesorios de autor. Catálogo por categoría, carrito, guía de talles, lista de deseados, seguimiento de envío y captación de suscriptores con descuento de bienvenida.",
    tags: ["Tienda online", "Favoritos", "Seguimiento de envío", "Guía de talles"],
    url: "https://devdeploystudio.github.io/noema-indumentaria/",
    imagen: "img/proyectos/noema.jpg",
    mock: "shop"
  },
  {
    nombre: "VITTA",
    categoria: "Web app",
    anio: "2026",
    desc: "Centro de salud con tres sedes. Sitio institucional más portal de turnos: los pacientes piden, cambian o cancelan solos, y acceden a resultados e historia clínica compartida.",
    tags: ["Portal de turnos", "Login", "Historia clínica", "Multi-sede"],
    url: "https://devdeploystudio.github.io/vitta-consultorios/",
    imagen: "img/proyectos/vitta.jpg",
    mock: "app"
  },
  {
    nombre: "BLOOM",
    categoria: "Landing page",
    anio: "2026",
    desc: "Lanzamiento de un lip oil de cosmética natural. Cuenta regresiva hasta el día de salida, las tres variantes de color y registro anticipado con descuento por pre-compra.",
    tags: ["Lanzamiento", "Cuenta regresiva", "Pre-venta", "Animaciones"],
    url: "https://devdeploystudio.github.io/bloom-producto/",
    imagen: "img/proyectos/bloom.jpg",
    mock: "landing"
  },
  {
    nombre: "Martina Duarte",
    categoria: "Portfolio",
    anio: "2026",
    desc: "Portfolio de una fotógrafa de retrato y arquitectura. Galería de trabajos, ficha por serie, servicios y testimonios, con foco en que las fotos se vean grandes y carguen rápido.",
    tags: ["Portfolio", "Galería", "Fotografía", "Contacto"],
    url: "https://devdeploystudio.github.io/portfolio/",
    imagen: "img/proyectos/portfolio.jpg",
    mock: "landing"
  }
];
