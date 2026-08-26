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
│   ├── services.js       Base de servicios (tarjetas + notebook/teléfono)
│   └── projects.js       Base de proyectos — el único archivo que vas a editar seguido
├── tools/
│   ├── captura.js         Saca una captura de un sitio en vivo (Chrome headless)
│   └── optimizar-imagen.js  Redimensiona/comprime una imagen pesada a JPG liviano
└── img/
    ├── logo.png / favicon.png
    ├── servicios/         Capturas desktop que se muestran en la notebook
    │   └── mobile/         Las mismas, en formato celular, para el teléfono
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
  categoria: "Landing page",     // Landing page | Sitio institucional | Tienda online | Web app | Portfolio | Rediseño web | Logo / identidad
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
- **WhatsApp:** `5491125851237` (+54 9 11 2585-1237)

El formato de `wa.me` es sin `+`, sin espacios y sin guiones: código de país, un 9,
y el número sin el 15. Está en tres lugares:

1. `index.html` → los dos links `https://wa.me/...` (sección `#contacto` y `footer`).
2. `js/script.js` → bloque `11. FORMULARIO`, constante `WHATSAPP`.

Si preferís no mostrar WhatsApp, borrá esos dos `<li>` / `<a>` del HTML **y** el
link que aparece en el mensaje de error del formulario, al final del bloque
`11. FORMULARIO` de `js/script.js`.

El link del mail **abre Gmail en una pestaña nueva** con el destinatario ya
cargado (`https://mail.google.com/mail/?view=cm&fs=1&to=...`), en vez de un
`mailto:` que depende del programa de correo que tenga instalado cada persona.

El formulario envía directo a `contact.deploystudio@gmail.com` a través de
[FormSubmit.co](https://formsubmit.co) (sin backend ni cuenta). La primera vez
que alguien lo complete, llega un mail de confirmación con un link — hay que
clickearlo una sola vez para activarlo.

## Secciones de la página

1. **Qué hacemos** — carrusel de tarjetas + notebook/teléfono interactivos. Sale todo de
   `js/services.js`. Ver abajo.
2. **Proceso** — las 4 etapas del trabajo.
3. **Proyectos** — la grilla que se llena desde `js/projects.js`.
4. **Contacto** — formulario y datos.

## El bloque de servicios

Dos pestañas (*Sitios web* / *Identidad de marca*) y, dentro de cada una, una
tarjeta por servicio con lo que incluye, el plazo y las rondas de ajuste. Al
lado, un mockup del servicio elegido — una notebook o un teléfono, según qué
versión estés mirando.

- Se ve **una tarjeta a la vez** y van **pasando solas cada 5,5 segundos**.
- El pase se frena mientras tenés el mouse encima, cuando el bloque no está en
  pantalla, cuando el dispositivo que se está mostrando está "cerrado"
  (notebook) o "bloqueado" (teléfono), y por 12 segundos después de que
  toques algo.
- Al final vuelve a la primera, así que nunca se traba.
- En celular y tablet **no hay flechas**: las tarjetas se pasan deslizando con
  el dedo (el riel usa scroll horizontal con `scroll-snap`). El contador y la
  barra de progreso se quedan para saber en cuál estás. La regla está atada a
  `(hover:none) and (pointer:coarse)` más un corte en 760px, así que depende
  del tipo de dispositivo y no solo del ancho de la ventana.

### Notebook y teléfono: dos vistas del mismo servicio

El botón de abajo del mockup (**"Versión mobile" / "Versión desktop"**)
intercambia cuál de los dos dispositivos se ve. Las dos pantallas están
siempre pintadas por detrás (`mostrar()` actualiza las dos juntas cada vez que
cambiás de tarjeta), así que el cambio es instantáneo, sin esperar a que
cargue nada.

**El botón y la etiqueta de abajo (`.laptop__tools`) nunca se mueven**, sin
importar cuál de los dos dispositivos se esté mostrando ni cuánto midan entre
sí. Notebook y teléfono ocupan la misma celda de grid, superpuestos
(`grid-column:1;grid-row:1` los dos), y el que no se muestra usa
`visibility:hidden` — no `hidden`/`display:none` — a propósito: así sigue
ocupando su lugar en el cálculo de alto de esa celda, que queda fijo (lo
define el más alto de los dos), y todo lo que viene después en el flujo
normal (el botón) no salta de posición al cambiar de vista.

Los dos se abren/cierran **tocando el marco del dispositivo, no la pantalla**
— tocar la pantalla abre la foto en grande (el lightbox); tocar el resto (el
teclado, los bordes, la tapa cerrada) abre o cierra. La pista de que se puede
tocar es un globito con un ícono de mano fuera del marco (`.device__hint`,
arriba a la derecha), con un destello lima que sale disparado de la esquina
cada tanto — el globito en sí es neutro (papel + ink), el color de marca
vive solo en ese detalle que se mueve. Es decorativo (`aria-hidden`) — la
accesibilidad real va por `role="button"` + `aria-label`/`aria-pressed` en
el propio `.laptop`/`.phone`, que también se manejan con teclado (foco +
Enter/Espacio).

- **Notebook cerrada** → tapa abajo, muestra el logo `/deploy_` grabado.
- **Teléfono bloqueado** → pantalla de bloqueo negra con el mismo logo y el
  cursor titilando, más un "tocá para ver". Elegí esto (bloqueo, no un giro
  físico) porque un teléfono no tiene tapa que cerrar — pedirle una animación
  de "cerrarse" hubiera quedado raro; bloquearse es lo que hace un teléfono
  de verdad.

Elegir una tarjeta nueva siempre despierta el dispositivo que esté activo en
ese momento (si estaba cerrado/bloqueado, se abre), para que se vea el cambio.

### La captura del teléfono nunca se recorta a lo ancho

A diferencia de la notebook (que sí usa `object-fit:cover` — las capturas de
escritorio son anchas y el recorte ahí no pierde nada importante), la del
teléfono usa `width:100%; height:auto`: la imagen entra de costado a costado
completa siempre, sea cual sea su relación de aspecto, y si es más alta que el
espacio disponible lo que sobra se recorta **abajo** (nunca a los lados). Al
abrirla en grande en el lightbox se ve la imagen entera, sin este recorte.

El marco (`aspect-ratio: 9/18`) ya no necesita coincidir con la relación de
la imagen para evitar el recorte lateral — eso ya lo garantiza la técnica de
arriba, no importa qué relación de aspecto tenga la próxima captura que
subas. El valor de 9/18 es puramente estético (una proporción de teléfono
real, ni achatada ni exagerada) y está calibrado a ojo contra las capturas
actuales para que el recorte de abajo sea mínimo — si notás que con una
imagen nueva queda un borde blanco abajo (la captura no llega a cubrir todo
el alto), el arreglo es hacer el marco **más bajo** — 9/17, 9/16 — no al
revés.

Arriba de la captura, un `.phone__statusbar` color crema reserva el lugar de
la isla (el notch): así la isla nunca queda flotando sobre el logo o el menú
de la captura, que arranca siempre debajo. Abajo, un `.phone__urlbar` con la
misma URL que muestra la notebook (estilo Safari mobile, que la lleva abajo
y no arriba como los navegadores de escritorio) — refuerza que es el mismo
sitio en las dos vistas.

### Cómo agregar la versión mobile de un servicio

Cada servicio en `js/services.js` puede tener un campo `imagenMobile`

Cada servicio en `js/services.js` puede tener un campo `imagenMobile`
(ruta a `img/servicios/mobile/`). Si no lo tiene, el teléfono muestra la
captura de escritorio (`imagen`) como respaldo, recortada — sirve para no
dejar la pantalla vacía, pero lo ideal es sacar la mobile real:

- Si es un sitio en vivo: `node tools/captura.js <url> img/servicios/mobile/<nombre>.jpg`
  con la ventana angosta, por ejemplo `... 700 6000 390 900` (ancho 390px).
- Si ya tenés la imagen (un export de una IA, una captura de otro lado) y
  pesa mucho: `node tools/optimizar-imagen.js <entrada> <salida.jpg> [anchoMax] [calidad]`
  — la redimensiona y la recomprime a JPG liviano sin perder nitidez visible.
  Así se armaron las capturas mobile actuales: bajaron de ~1,5MB cada una a
  ~90KB.

Para editar los textos, los plazos o lo que se ve en la pantalla, todo está en
`js/services.js` — cada servicio es un bloque. Si no tiene el campo `imagen`
(ni el de respaldo), se dibuja el `pantalla` (un SVG de 320×180 con las
clases `s-*` del sistema de color) tanto en la notebook como en el teléfono.
Hoy los 6 servicios de "Sitios web" y los 2 de "Identidad de marca" ya tienen
su captura real, desktop y mobile.

### Cómo está hecha la notebook

Es una escena 3D en CSS, sin imágenes. La tapa y el teclado comparten la línea
de bisagra y giran sobre ella:

| Pieza | Ángulo |
|---|---|
| Teclado (base) | `rotateX(75deg)` — casi horizontal, hacia el observador |
| Tapa abierta | `rotateX(8deg)` — levemente reclinada |
| Tapa cerrada | `rotateX(-105deg)` |

El `-105` no es arbitrario: es `180 − 75`, el único valor con el que las dos
caras quedan paralelas y la tapa apoya exacto sobre la base.

**No lleva `perspective`, a propósito.** Con perspectiva, el borde más cercano
a la cámara (el frente del teclado) se agranda, y cuánto se agranda lo decide
cada motor: Chrome lo dejaba en ~2% y WebKit lo exageraba, así que en iPhone la
base se veía más ancha que la pantalla. Sin perspectiva la proyección es
ortográfica: el teclado mide exactamente lo mismo que la tapa en todos los
navegadores. El giro y el orden de dibujado siguen funcionando, porque
`preserve-3d` no depende de `perspective`. La base tiene la
misma profundidad que el alto de la tapa (68% del ancho), como una notebook
real. Si cambiás una, cambiá la otra o la tapa va a sobrepasar la base.

El teléfono, en cambio, **no tiene escena 3D** — es un marco plano (sin
bisagra que animar), porque un teléfono no se abre como una notebook.

## Sistema de diseño
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
