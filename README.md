# Toyota — Showroom Digital (Concepto)

Prototipo funcional de un rework conceptual de experiencia digital para
Toyota: un sitio de "pantallas" (Modelos, Ficha del vehículo, Explorador 3D,
Exterior, Interior, Tecnología, Servicios, Configurador, Reseñas) que
cambian con una transición, en vez de una sola página de scroll continuo —
y donde el automóvil se convierte en una interfaz 3D interactiva **solo
cuando el usuario lo pide**, no de entrada.

> Proyecto conceptual, no afiliado oficialmente a Toyota Motor Corporation
> ni a Toyota El Salvador. No usa layouts, código ni fotografías del sitio
> oficial (salvo las fotos reales en `/img/`, ver abajo). Los vehículos son
> geometría 3D procedural creada para este prototipo.
>
> **Datos reales, fuentes citadas.** Precios, motorización, potencia/torque,
> transmisión, colores, airbags y conectividad de los 5 modelos en
> `js/vehicle-data.js` conservan la información del catálogo consultado en
> toyota.com.sv (2026-09-13) — se citan como hechos (no protegidos por
> derecho de autor), no se copió texto de marketing ni imágenes. Pueden
> cambiar sin previo aviso; confirma siempre en el sitio oficial o en el
> concesionario. Todo campo sin dato público confirmado permanece como
> `[DATOS]`.

## Arquitectura: pantallas, no scroll

`js/router.js` implementa un selector de "vistas" (`.view[data-view]`):
solo una está visible a la vez, y cambiar de una a otra (clic en el nav, en
un modelo, en "Explorar en 3D", etc.) dispara una transición con Web Animations —
la sensación de cambiar de pantalla, sin el costo de una recarga real.
Cada transición tiene un **temporizador de seguridad** independiente del
la animación (`setTimeout`, ver comentarios en `router.js`): si el navegador
llegara a suspender la animación (pestaña en segundo plano, por ejemplo),
la vista de todos modos termina visible — el contenido nunca puede quedar
invisible para siempre por una animación que no corrió.

Vistas:
- **Modelos** (`#modelos`, inicio): hero de marketing normal (foto real +
  título + CTA) y el selector de los 5 modelos — **sin WebGL**.
- **Ficha** (`#ficha`): fotos + specs reales del modelo elegido, con un
  botón "Explorar en 3D →".
- **Explorador 3D** (`#explorador`): la escena Three.js interactiva
  (hotspots, cámara cinematográfica, capó/maletero/puertas que abren).
- **Exterior / Interior / Tecnología**: contenido de marca genérico.
- **Servicios / Configurador / Reseñas**: como antes, ahora como pantallas
  propias en vez de secciones de scroll.

## La escena 3D es perezosa (lazy), no carga con la página

`js/main.js` no importa Three.js ni construye la escena al cargar el sitio.
Solo cuando el usuario hace clic en **"Explorar en 3D"** (o toca el
Configurador), `ensureEngine()` hace `import()` dinámico de `scene.js`,
`vehicle.js`, `camera.js`, `hotspots.js`, `animations.js` y `three` — el
motor 3D se construye una sola vez y se reutiliza después. Esto significa
que Modelos/Ficha (lo que la mayoría de visitas van a ver) son HTML/CSS
normales, sin el costo de WebGL, exactamente lo que se pidió al notar que
la página se sentía pesada.

## Qué incluye este prototipo (funcional, no pseudocódigo)

- **Escena 3D real** (Three.js + WebGL, cargada bajo demanda): showroom
  oscuro, piso reflectante, iluminación de estudio, tone mapping ACES.
- **Vehículo procedural interactivo**: capó, maletero y 4 puertas se abren
  con animaciones GSAP sobre pivotes de bisagra reales; las ruedas giran;
  los faros encienden con material emissive.
- **Sistema de hotspots** proyectados desde posiciones 3D reales a
  coordenadas de pantalla, actualizados cada frame — solo mientras la
  vista "Explorador 3D" está realmente en pantalla (el render loop se
  pausa vía `IntersectionObserver` en cualquier otra vista).
- **Cámara cinematográfica** con estados nombrados y transiciones GSAP.
- **Ficha de vehículo con fotos reales**: Corolla Sedán Híbrido, Corolla
  Cross Híbrida (6 fotos), RAV4 Híbrida y Hilux tienen fotos reales
  (proporcionadas directamente por quien encargó este prototipo, no
  descargadas del sitio oficial — ver `/img/`); Land Cruiser Prado todavía
  muestra `[FOTOGRAFÍA OFICIAL PENDIENTE]` en vez de inventar una.
- **Reseñas y reconocimientos**: un reconocimiento real y verificable (RAV4
  — SUV del Año según FIPA, enlaza a la noticia real) y placeholders
  rotulados como *ilustrativos* — nunca testimonios inventados.
- **Pantalla de carga con puerta de entrada**: fondo negro, logo Toyota
  rojo enorme que se balancea como un dije, rayos de luz roja que
  irradian desde atrás cada pocos segundos, y un botón "Continuar" — la
  experiencia no arranca hasta el clic, no se oculta sola con un timer.
- **Cursor personalizado = logo de Toyota en blanco**, activo en **todo**
  el sitio (no solo sobre el 3D) — se agranda y tiñe de rojo sobre zonas
  interactivas.
- **Navegación realmente funcional**: el selector de vehículos, los
  "Servicios", el CTA final y el reconocimiento de FIPA enlazan de verdad
  a toyota.com.sv (`target="_blank"`) — nada es un botón decorativo.
- **Configurador** funcional: color de pintura, aros e interior — cambia
  materiales en vivo sobre el modelo cargado en el Explorador 3D.
- **Fallback sin WebGL**: si `detectWebGL()` falla, el botón "Explorar en
  3D" se deshabilita y la Ficha (fotos + specs) sigue siendo una
  alternativa completa.
- **Accesibilidad**: skip-link, `prefers-reduced-motion` (transiciones de
  vista instantáneas, sin cross-fade), foco visible, `Escape` para volver
  al vehículo dentro del Explorador 3D.
- **Mobile**: cursor personalizado desactivado, gestos táctiles (pinch to
  zoom vía FOV, swipe para orbitar), nav con scroll horizontal en vez de
  ocultarse (las vistas ya no son alcanzables por scroll, así que el nav
  no puede desaparecer en móvil).

## Qué queda como arquitectura preparada (no assets aún)

- Carga de modelos `.glb` reales vía `GLTFLoader` + `DRACOLoader` — ver
  `assets/models/README.md`.
- Fotografía real para el Land Cruiser Prado (el único modelo que aún no
  la tiene).
- Integración real de reseñas de clientes (p. ej. Google Reviews API).
- Efectos de sonido discretos — el toggle de audio existe en la UI pero no
  reproduce audio real todavía.

## Estructura

```
index.html
css/
  style.css        tokens, layout, header, componentes compartidos
  views.css        el sistema de vistas, hero estático, ficha de vehículo
  3d.css           loading screen, cursor personalizado, fallback
  animations.css   keyframes (reveal de texto, hotspots, panel de info)
  responsive.css   breakpoints y adaptaciones táctiles
js/
  main.js          orquestador: router, selector, lazy-boot del motor 3D
  router.js        selector de vistas con cross-fade + temporizador de seguridad
  scene.js         renderer/escena/luces/entorno/resize (import bajo demanda)
  camera.js        estados de cámara + tweening GSAP
  vehicle-data.js  catálogo independiente de Three.js
  vehicle.js       constructor procedural 3D
  hotspots.js      definición de hotspots + proyección 3D->2D
  interactions.js  cursor personalizado, pointer tracking, gestos táctiles
  animations.js    aperturas de piezas (capó/maletero/puertas/ruedas)
  configurator.js  swatches de color/aros/interior
  ui.js            selector, ficha de vehículo, reseñas, loading, WebGL
img/               fotos reales: Corolla Sedán (1.png), Corolla Cross (Galeria-1..6.jpg),
                   RAV4 (3.avif), Hilux (4.jpg). 2.jpg y 5.avif (Toyota Tacoma, no es
                   un modelo de esta gama) se usan solo como fondo decorativo en
                   Configurador/Reseñas — nunca etiquetadas como un vehículo real.
assets/
  models/  images/dealership/   (placeholders / stock libre, ver READMEs internos)
```

## Cómo probarlo

Sirve la carpeta con cualquier servidor estático (por ejemplo, ya está
dentro de la raíz de WAMP, así que basta con abrir
`http://localhost/consecionario/` con Apache activo).

## Siguientes pasos sugeridos

1. Sustituir la geometría procedural por modelos GLB reales por categoría.
2. Fotografiar (o conseguir licencia oficial para) los otros 4 modelos.
3. Reemplazar los placeholders `[DATOS]` restantes con especificaciones
   oficiales completas (consumo, maletero, dimensiones, seguridad).
4. Implementar diseño de sonido profesional si se decide usar audio.

## Rediseño de materiales — septiembre 2026

La capa `css/materials.css` organiza cuatro recursos visuales:

- **Glassmorfismo:** panel de descubrimiento y paneles contextuales del explorador. Blur limitado a superficies pequeñas, desactivado en móvil y con transparencia reducida.
- **Neumorfismo:** filtros, especificaciones y configurador sobre una base mate clara. Las selecciones también tienen bordes, texto y estados ARIA.
- **Claymorfismo:** tarjetas de modelos y servicios con esquinas suaves, bordes gruesos y sombras interiores estáticas.
- **Brutalismo editorial:** títulos condensados de gran escala, composición asimétrica, franja roja y llamadas a la acción con sombra sólida.

El inicio mantiene la presentación Toyota con rayos y entrada manual. Los filtros Todos/Híbridos/SUV/Pickup muestran modelos reales del catálogo existente. El explorador sigue siendo optativo y procedural; no es una reproducción oficial del vehículo.

### Fluidez y accesibilidad

- Datos del catálogo separados del constructor: ningún módulo inicial importa Three.js estáticamente.
- Cursor actualizado con eventos de puntero, sin interpolación ni bucle perpetuo de animación.
- Transiciones interrumpibles y botones Atrás/Adelante del navegador mediante historial real.
- Inicio y fichas navegables aunque no se descargue la librería de animación 3D.
- Controles de configuración con flechas, Home/End, etiqueta de selección y mensaje de error cuando falla el motor 3D.
- La combinación elegida se conserva al cambiar de vehículo.
- Respeto de movimiento reducido, transparencia reducida y contraste aumentado.
- Esta revisión conserva las cifras y las fuentes anteriores; no constituye una actualización de precios ni una nueva verificación de especificaciones.

### Ejecutar y comprobar

Requiere Node.js 20 o posterior. No hay dependencias npm que instalar.

```sh
npm run dev
# Abrir http://127.0.0.1:4173
npm test
```

También funciona como sitio estático en WAMP o GitHub Pages, sin compilar.

Las pruebas de regresión cubren el grafo de importaciones inicial (sin WebGL), las fotografías del catálogo, las rutas locales de assets, la navegación interrumpida y el historial del navegador. La revisión visual se realiza en escritorio y móvil; el desempeño real del 3D depende de la GPU y de las librerías externas servidas por CDN.
