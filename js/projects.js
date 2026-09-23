/* ═══════════════════════════════════════════════════════════
   /deploy_ — BASE DE PROYECTOS
   ───────────────────────────────────────────────────────────
   Para sumar un proyecto nuevo, copiá un bloque { ... } y
   pegalo ARRIBA de la lista (el primero es el más reciente).

   Campos:
   nombre    → título del proyecto                        (obligatorio)
   cliente   → true si es un cliente real (paga). Si no está el campo (o
               es false), se trata como ejemplo hecho por Deploy para
               mostrar capacidad - la sección "Ideas que ya hicimos
               realidad" solo muestra los que tienen cliente:true; los
               demás aparecen abajo, atrás del link "Ver sitios de
               ejemplo hechos por Deploy". Ver js/script.js, bloque
               "11. PROYECTOS".
   categoria → una de: "Landing page" | "Sitio institucional" |
               "Tienda online" | "Web app" | "Portfolio" |
               "Logo / identidad"                            (obligatorio)
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
    nombre: "Santilli Aparts",
    cliente: true,
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Alquiler temporario de departamentos en Recoleta y Palermo. Más de 60 departamentos para 1 a 5 personas, sin seña, con asesoramiento personalizado y consulta directa por WhatsApp.",
    tags: ["Alquiler temporario", "WhatsApp", "Múltiples zonas", "Atención personalizada"],
    url: "https://santilliaparts.com.ar",
    imagen: "img/proyectos/santilliaparts.jpg",
    mock: "landing"
  },
  {
    nombre: "Proyecto S3",
    cliente: true,
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Estudio familiar de arquitectura y construcción, de padre a hijo. Sitio institucional con la historia del estudio, sus proyectos y su marca de muebles, Objeto, integrada.",
    tags: ["Arquitectura", "Construcción", "Estudio familiar", "Portfolio de proyectos"],
    url: "https://proyecto-s3.com.ar",
    imagen: "img/proyectos/proyecto-s3.jpg",
    mock: "landing"
  },
  {
    nombre: "Mariana Mungo",
    cliente: true,
    categoria: "Portfolio",
    anio: "2026",
    desc: "Portfolio personal de una arquitecta recibida en la UBA. Presentación profesional con foto, bio, contacto directo y currículum descargable, en español e inglés.",
    tags: ["Portfolio", "Arquitectura", "Bilingüe (ES/EN)", "Contacto directo"],
    url: "https://marumungo.github.io/Portfolio/",
    imagen: "img/proyectos/marumungo.jpg",
    mock: "landing"
  },
  {
    nombre: "Nativa Vivero",
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Vivero familiar especializado en plantas de interior y exterior. Catálogo de destacadas con filtros, guía de cuidados por especie y consulta directa por WhatsApp para asesorarte antes de elegir.",
    tags: ["Catálogo", "Guía de cuidados", "WhatsApp", "Plantas destacadas"],
    url: "https://devdeploystudio.github.io/nativa-vivero/",
    imagen: "img/proyectos/nativa.jpg",
    mock: "landing"
  },
  {
    nombre: "TERRA",
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Estudio de arquitectura enfocado en viviendas de autor. Sitio institucional con fotografía a pantalla completa y una tipografía editorial que acompaña la estética atemporal de los espacios que diseñan.",
    tags: ["Arquitectura", "Fotografía a pantalla completa", "Diseño editorial", "Formulario de contacto"],
    url: "https://devdeploystudio.github.io/terra-arquitectura/",
    imagen: "img/proyectos/terra.jpg",
    mock: "landing"
  },
  {
    nombre: "EPSILON",
    categoria: "Sitio institucional",
    anio: "2026",
    desc: "Empresa de ingeniería en robótica colaborativa, visión artificial e inteligencia predictiva para líneas de producción industrial. Sitio institucional con sus capacidades, la tecnología que desarrollan y su proceso de trabajo.",
    tags: ["Robótica industrial", "Diseño oscuro", "Animaciones", "Formulario de contacto"],
    url: "https://devdeploystudio.github.io/epsilon-robotics/",
    imagen: "img/proyectos/epsilon.jpg",
    mock: "landing"
  },
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
