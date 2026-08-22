# Deploy Studio — sitio oficial

Sitio de una sola página, HTML + CSS + JS sin frameworks ni dependencias que instalar.
Se puede abrir directo con doble clic en `index.html`.

## Estructura de carpetas

```
├── index.html          Estructura y todo el contenido de texto
├── dev-server.js        Servidor local opcional para desarrollo
├── css/
│   └── styles.css       Sistema de diseño completo (colores, tipografía, componentes)
├── js/
│   ├── script.js         Interacciones: cursor titilante, boot, terminal, scroll, filtros, formulario
│   ├── services.js       Base de servicios (tarjetas + notebook)
│   └── projects.js       Base de proyectos — el único archivo que vas a editar seguido
└── img/
    ├── logo.png / favicon.png
    ├── servicios/         Capturas reales que se muestran en la notebook
    └── proyectos/         Capturas de los proyectos (opcional, ver más abajo)
```

## Ver el sitio

Doble clic en `index.html` alcanza. Si querés servirlo con un servidor local
(recomendado para probar rutas de imágenes):

```bash
node dev-server.js
```

Y abrís `http://localhost:4321`.

## Sumar un proyecto nuevo

Abrí `js/projects.js` y pegá un bloque nuevo **arriba** de la lista:

```js
{
  nombre: "Nombre del cliente",
  categoria: "Landing page",     // Landing page | Sitio institucional | E-commerce | Web app | Portfolio | Rediseño | Logo / identidad
  anio: "2026",
  desc: "Una o dos oraciones sobre qué se hizo.",
  tags: ["Diseño UI", "Desarrollo", "SEO"],
  url: "https://sitiodelcliente.com",   // "" si todavía no está online
  imagen: "img/proyectos/cliente.jpg",  // "" para usar el mock automático
  mock: "landing"                        // landing | shop | app | brand
},
```

- Los **filtros de categoría se generan solos** a partir de las categorías que uses,
  con el contador de proyectos incluido. No hay que tocar nada más.
- Si dejás `imagen: ""`, la tarjeta dibuja un mock de navegador en los colores de la
  marca. Sirve perfecto mientras no tengas la captura.
- Para capturas reales: guardá las imágenes en `img/proyectos/`. No hace falta
  sacarlas a mano — hay una herramienta que las saca sola:

  ```bash
  node tools/captura.js https://sitiodelcliente.com img/proyectos/cliente.jpg
  ```

  Abre el sitio en Chrome sin ventana, espera 6 segundos a que terminen los
  preloaders y las animaciones, y guarda una captura de 1440×900 en JPG.
  Si el sitio tiene un popup que tapa todo, se le puede pasar código para
  cerrarlo antes de la foto (sexto argumento; ver los comentarios del archivo).
- La grilla solo muestra los primeros **3 proyectos**; si hay más, aparece un botón
  "Ver todos" debajo. Ese límite se cambia en `js/script.js`, bloque
  `10. PROYECTOS`, constante `LIMIT`.

## Datos de contacto

Ya cargados:

- **Email:** `contact.deploystudio@gmail.com`
- **Instagram:** [@deploystudio_](https://instagram.com/deploystudio_)

**Falta el WhatsApp.** Hoy tiene un número de relleno (`5490000000000`) en dos lugares:

1. `index.html` → los dos links `https://wa.me/...` (sección `#contacto` y `footer`).
2. `js/script.js` → bloque `11. FORMULARIO`, constante `WHATSAPP`.

El formato de `wa.me` es sin `+`, sin espacios y sin guiones: código de país, un 9,
y el número sin el 15. Por ejemplo, para un celular de Buenos Aires
`11 2345-6789` sería `5491123456789`.

Si preferís no mostrar WhatsApp, borrá esos dos `<li>` / `<a>` del HTML **y** el
link que aparece en el mensaje de error del formulario, al final del bloque
`11. FORMULARIO` de `js/script.js`.

El formulario envía directo a `contact.deploystudio@gmail.com` a través de
[FormSubmit.co](https://formsubmit.co) (sin backend ni cuenta). La primera vez
que alguien lo complete, llega un mail de confirmación con un link — hay que
clickearlo una sola vez para activarlo.

## Secciones de la página

1. **Qué hacemos** — carrusel de tarjetas + notebook interactiva. Sale todo de
   `js/services.js`. Ver abajo.
2. **Proceso** — las 4 etapas del trabajo.
3. **Proyectos** — la grilla que se llena desde `js/projects.js`.
4. **Contacto** — formulario y datos.

## El bloque de servicios

Dos pestañas (*Sitios web* / *Identidad de marca*) y, dentro de cada una, una
tarjeta por servicio con lo que incluye, el plazo y las rondas de ajuste.

- Se ve **una tarjeta a la vez** y van **pasando solas cada 5,5 segundos**.
- El pase se frena mientras tenés el mouse encima, cuando el bloque no está en
  pantalla, y por 12 segundos después de que toques algo.
- Al final vuelve a la primera, así que nunca se traba.
- La **notebook** de al lado muestra un ejemplo dibujado de ese servicio y
  cambia junto con la tarjeta. Se abre y cierra con el botón (o tocándola):
  cerrada muestra el logo grabado en la tapa.

Para editar los textos, los plazos o lo que se ve en la pantalla, todo está en
`js/services.js` — cada servicio es un bloque. Si tiene el campo `imagen`
(ruta a una captura en `img/servicios/`), se muestra esa foto real; si no,
se dibuja el `pantalla` (un SVG de 320×180 con las clases `s-*` del sistema
de color). Hoy los 6 servicios de "Sitios web" y los 2 de "Identidad de
marca" ya tienen su captura real.

### Cómo está hecha la notebook

Es una escena 3D en CSS, sin imágenes. La tapa y el teclado comparten la línea
de bisagra y giran sobre ella:

| Pieza | Ángulo |
|---|---|
| Teclado (base) | `rotateX(75deg)` — casi horizontal, hacia el observador |
| Tapa abierta | `rotateX(8deg)` — levemente reclinada |
| Tapa cerrada | `rotateX(-105deg)` |

El `-105` no es arbitrario: es `180 − 75`, el único valor con el que las dos
caras quedan paralelas y la tapa apoya exacto sobre la base. La base tiene la
misma profundidad que el alto de la tapa (68% del ancho), como una notebook
real. Si cambiás una, cambiá la otra o la tapa va a sobrepasar la base.

## Sistema de diseño

**Colores** (los cinco oficiales, sin agregados)

| Nombre | Hex | Uso |
|---|---|---|
| Lime | `#84E600` | `/` y `_` del logo, acentos, hover, estados activos |
| Ink | `#0D0D0D` | `deploy`, títulos, fondos oscuros |
| Stone | `#B7B7B7` | Líneas, info secundaria, interfaz |
| Mist | `#EDEDED` | Fondos alternativos y divisores |
| Paper | `#FAFAF8` | Fondo principal |

**Tipografía** — Geist Sans (Bold para logo y títulos, Regular/Medium para texto)
y Geist Mono para numeraciones, etiquetas técnicas y la terminal. Se cargan desde
jsDelivr; si no hay internet, cae a la sans del sistema sin romper el layout.

**Ritmo vertical** — el aire entre secciones se controla con dos variables al
inicio de `css/styles.css`:

- `--sec` → padding arriba y abajo de cada sección. Ojo: el de dos secciones
  vecinas **se suma**, así que el hueco visible es el doble.
- `--gap-head` → distancia entre el título de sección y su contenido.

Todo está en variables CSS al inicio de `css/styles.css`, así que cambiar un
color, una tipografía o el aire general se hace en un solo lugar.
