# Frontend de DataIQ y del shell de IQ Platform

Aplicación web en Angular que reúne el **shell de navegación** del ecosistema
(inicio, catálogo, cuenta) y **DataIQ** (consulta y gestión de técnicas). SIVRI
y SIMIQ3D tienen su propio frontend; desde aquí solo se enlazan. SIVRI es
AGPL-3.0 ([`sivri/README.md`](../../sivri/README.md)): esta app (MIT) no
importa código de `sivri/`.

Este README dice cómo está hecho y cómo se corre. El avance por fases y lo que
falta decidir están en
[`../docs/checklist-frontend.md`](../docs/checklist-frontend.md).

Fuentes:

- Producto: [`PRODUCT.md`](../../PRODUCT.md). Diseño visual: [`DESIGN.md`](../../DESIGN.md).
- Mockups: [`diseno/mockups/`](../../diseno/mockups/) y sus briefs en
  [`.impeccable/surfaces/`](../../.impeccable/surfaces/).
- Roles y flujos: [`docs/flujos.md`](../../docs/flujos.md).
- Cómo se habla con la API (sesión, proxy, encabezados):
  [`../README.md`, «Cómo lo usa el frontend»](../README.md#cómo-lo-usa-el-frontend).
- API: `/docs` del backend; rutas y esquemas en
  [`../backend/app/adapters/inbound/api/`](../backend/app/adapters/inbound/api/).

## Decisiones

| Decisión | Detalle |
|---|---|
| Tecnología | Angular 22: componentes standalone, signals, sin `zone.js`, TypeScript 6, pruebas con Vitest, estilos en SCSS |
| Alcance | Shell + DataIQ en una sola app. El shell queda aislado en `app/shell/` para poder separarlo si algún día hace falta |
| Idioma | Código en inglés, como el backend y la API. Interfaz, documentación y URL en español |
| Renderizado | SPA sin SSR, desplegada como sitio estático en Vercel |
| Carga | Cada sección se carga al visitarla (lazy loading); el inicio no arrastra la gestión. Presupuesto del código inicial en `angular.json`: aviso a los 300 KB y error a los 500 KB, como SIMIQ3D (principio «Liviano» de `PRODUCT.md`) |
| Estado | Servicios con signals por funcionalidad. Sin NgRx |
| Lecturas | `httpResource` / `resource` (estables desde 22.0) |
| Formularios | Signal Forms (estables desde 22.0) |
| Caché HTTP | Sin `ETag` a mano: el navegador revalida con el `ETag` y el `Cache-Control` de la API |
| Sistema visual | Tokens base compartidos como propiedades CSS en `shared/design/` y el tema de DataIQ en `src/styles/theme.scss`, que solo las sobrescribe (ver «Sistema visual compartido» en `CLAUDE.md`) |
| Componentes | Propios, según `DESIGN.md`. Sin Angular Material; solo Angular CDK: drag-drop (mesa del editor), overlay (desplegables y paneles) y a11y |
| Tipos de la API | Generados del `/openapi.json` de FastAPI (`openapi-typescript`), para que no se desfasen del backend |
| Sesión | Cookie `HttpOnly` que pone la API; el frontend nunca ve el token. La cuenta y el rol salen de `GET /auth/me`. El rol solo decide qué se muestra; quien permite o niega es la API |
| Acceso a la API | URL relativa `/api/dataiq`, por el mismo origen: `proxy.conf.json` en desarrollo y rewrites de Vercel en producción. Sin CORS ni `withCredentials` |
| Seguridad | Encabezado `X-IQ-Client: web` en todas las peticiones (contra CSRF). CSP estricta en Vercel; nada de `innerHTML` con datos de la API ni `bypassSecurityTrust…` |

## Arquitectura

Estructura por funcionalidad, con una separación ligera inspirada en la
arquitectura hexagonal del backend: solo `data/` sabe que existe HTTP y cómo
son las rutas de la API.

```
src/
├── styles/                 theme.scss: el tema de DataIQ sobre los tokens de shared/design/
└── app/
    ├── core/               servicios únicos de toda la app
    │   ├── http/           provideApi(): provideHttpClient(withFetch()), base /api/dataiq,
    │   │                   interceptores: X-IQ-Client y errores
    │   ├── notice/         NoticeService: los avisos que hay en pantalla (error o confirmación)
    │   ├── session/        SessionService (signal con la cuenta), sessionGuard, roleGuard(min)
    │   └── title/          PageTitleStrategy: el título de la pestaña del navegador
    ├── domain/             reglas puras, sin Angular: Role y hasAtLeast(), VersionState
    │                       y transiciones, avance por sección, técnicas agrupadas
    │                       por especialidad, búsqueda sin tildes, pestañas del detalle, lector de Markdown
    ├── data/
    │   ├── api/            tipos generados del OpenAPI
    │   └── *.repository.ts un adaptador por recurso (techniques, versions, catalog,
    │                       auth, users)
    ├── shared/
    │   ├── ui/             button, arrow link, avatar, brand mark, not-found, tabs con raya, segmented control,
    │   │                   status pill, progress mark (22 px), search field, text field, demo tag, floating panel,
    │   │                   notice stack (los avisos: error y confirmación)
    │   ├── media-query.ts  mediaQuery(): una señal con lo que dice una media query (celular, movimiento reducido)
    │   └── table-diagram/  ★ el diagrama de mesa en SVG; ver abajo
    ├── shell/              barra con desplegables, menú de celular, Mi cuenta, pie
    └── features/
        ├── home/  catalog/  technique/  account/  privacy/
        └── management/
            ├── drafts/  editor/  review/  instruments/  users/
```

**Reglas de dependencia**: `features` usa `data`, `domain`, `shared` y `core`;
`data` usa `domain`; `domain` no usa nada de Angular ni de la API. Ninguna
funcionalidad importa a otra.

**Modelos**: la API ya habla inglés, así que los repositorios devuelven los
tipos generados tal cual. Un repositorio solo transforma cuando la forma de la
API no le sirve a la pantalla (p. ej. agrupar los objetos por mesa para el
diagrama), y esa transformación vive en `data/`, no en el componente.

**Repositorios** (`data/*.repository.ts`): uno por recurso, con un método por
operación de la API. `techniques` incluye las especialidades; `catalog`, el
instrumental. `POST /auth/token` y el JWKS no tienen método: no son del
navegador.

- Las **lecturas** devuelven un `httpResource` (se crean en un contexto de
  inyección, p. ej. al declarar el campo del componente). Reciben el `id` o el
  filtro como función (`() => id()`, normalmente una señal): si devuelve
  `undefined`, el recurso no pide nada. `VersionsFilter` traduce `reviewedByMe`
  a `reviewed_by_me` y manda cada estado como un parámetro repetido.
- Las **escrituras** y `AuthRepository` (que no se muestra en una pantalla)
  devuelven `Observable`.
- `data/` no puede usar `core/`, así que no conoce la base de la API: la recibe
  del token `API_BASE_URL`, que `core/http` provee con `/api/dataiq`.
- Para probarlos: `provideRepositoryTesting()` (`data/testing.ts`) con
  `HttpTestingController`; un recurso se prueba con `TestBed.tick()`. La base
  de prueba (`TEST_API_BASE`) es distinta a `/api/dataiq` a propósito: así se
  comprueba que cada repositorio usa la que recibe.

**El diagrama de mesa es la pieza central.** Aparece en el detalle de técnica,
en la puerta de cuenta (vista previa recortada), en el editor (con arrastrar y
soltar), en la revisión (dos mesas lado a lado) y en el catálogo de
instrumental (miniatura). Se construye una sola vez, con variantes, antes que
las pantallas que lo usan. El tamaño de cada mesa viene de `zones` (`rows`,
`columns`); `used: false` es una mesa que la técnica no lleva.

- **Modelo:** `Table` (`domain/table.ts`) es la mesa tal como la dibuja el
  diagrama: su tamaño y sus `TableItem` (`id`, `legendNumber`, `name`, `components`,
  `instruments`, `cells`). El `name` es lo que dice la leyenda (`itemName()`, en
  `domain/`); `instruments` son los componentes que no son suturas, los que se
  dibujan.
  `toTables(zones, items)` (`data/tables.ts`) la arma desde `zones` e `items` de la
  API: deja fuera la mesa con `used: false` y la usada sin tamaño (no se inventa
  uno) con sus objetos, y reparte cada objeto a su mesa por `zone_id` (el que no
  tiene mesa es solo del listado). El componente (`shared/table-diagram`,
  `<app-table-diagram [table]>`) no importa `data/`: recibe la `Table` ya armada.
- **Grilla:** el SVG mide 100 unidades por celda (`viewBox` de
  `columnas × 100` por `filas × 100`) y se escala al ancho que le dé quien lo use;
  la mesa toma la proporción de su grilla (`--aspect`). Las líneas de la rejilla
  son de 1 px a cualquier ancho (`vector-effect: non-scaling-stroke`) y solo van
  entre celdas, sin borde.
- **Objetos:** cada objeto con celdas es **una** pieza (`.piece`, con
  `data-n` = su número), aunque ocupe varias: una zona de clic por celda y un solo
  número. Las formas de todas las piezas van en una capa aparte (`.shapes`), debajo
  de las piezas y con una sola sombra: un número nunca queda tapado por la forma de
  otra pieza, y atenuar las demás no recalcula una sombra por pieza. La primera
  celda en orden de lectura (`readingOrder()`, en `domain/table.ts`) es la del
  número, también en la miniatura. Un objeto sin celda (la fuente no lo ubica) no se dibuja, y uno ubicado
  sin número se dibuja sin número. `piece-layout.ts` pone el círculo del número:
  en la esquina inferior derecha de la celda si el objeto ocupa una, y a un lado
  de la línea que une su primera y su última celda si ocupa varias. El círculo
  (`noche` al 72 %) mide lo mismo en pantalla a cualquier ancho de la mesa: un
  `ResizeObserver` mide el dibujo y `--number-scale` sale de ese ancho y del de la
  mesa en celdas, así que otra mesa en el mismo espacio también lo cambia.
- **Formas** (decidido por Juan el 2026-10-29; ver «Detalle de técnica» en
  `DESIGN.md`): los dibujos del mockup (16 de acero y 5 planos) están en
  `drawings.ts` como **datos**, que la plantilla pinta como SVG: sin `innerHTML`.
  `shape-catalog.ts` elige el dibujo de cada componente por palabras clave de su
  nombre (sin tildes ni mayúsculas) y arma las formas del objeto: cada dibujo una
  sola vez (mango y hoja de bisturí son un bisturí), una compresa con portaagujas
  es la compresa con su hilo, y lo que no tiene dibujo propio es **un recuadro
  punteado**, nunca la silueta de otro instrumento. Los dibujos son de cirugía
  abierta: un nombre con «laparoscópico» no toma el dibujo de su homónimo abierto.
  Las suturas no se dibujan solas ni suman el recuadro punteado: no son un
  instrumento sin dibujo; un objeto que solo tiene suturas es el recuadro.
  `placeShapes()` las coloca:
  en una celda, lo plano al centro y el acero inclinado 40° encima (si son dos,
  a los lados); en varias, el acero a lo largo de la línea que une sus celdas.
  Para dar un dibujo a un instrumento nuevo hay que sumarlo a `DRAWINGS`, a la
  tabla de palabras clave y, si es de acero, a `SCALE` (`piece-layout.ts`): el
  tipo `SteelKey` hace que falte una escala no compile. Las claves de los dibujos
  van en inglés (`scalpel`, `needleHolder`, `drapePack`…), como el resto del código. Cada diagrama tiene sus propios degradados de acero
  (`id` únicos), porque puede haber dos en una página.
- **Leyenda enlazada:** `app-table-legend` lista cada objeto con número
  (nombre = componentes unidos con «y», o «e» ante el sonido /i/: «Compresa e
  Hilo») por número. Mesa y leyenda comparten
  `[(highlighted)]`, el número señalado: pasar el puntero o enfocar (Tab) una pieza
  o una fila lo señala, y el foco manda: si el puntero pasa por otra y se va, vuelve
  a la enfocada, porque el número con el foco también se comparte con
  `[(focused)]` (lo guarda quien las use; ver «Detalle de técnica»); la pieza se levanta, las demás se atenúan al 38 % (la tela,
  al 55 %; nunca los números) y la fila toma `marca-claro`. Quien las use pone un
  `highlighted` por mesa, porque cada mesa tiene su propia numeración.
- **Hueco «Sin dato»** (`domain/legend.ts`, decidido por Juan el 2026-10-29): un
  objeto con número tiene su fila según lo que la fuente dice de él. Con celdas
  (`placed`) está en la mesa y se señala. Sin celdas pero con componentes
  (`unplaced`) se sabe qué es, no dónde va: se lista con su nombre, apagado y sin
  enlace. Sin celdas ni componentes (`gap`) es un número que la fuente da y no
  deja leer: dice «Sin dato», sin el texto crudo. Las filas apagadas tienen el
  círculo vacío con filete `filete-2` y no se llegan con Tab: no hay pieza que
  levantar. Un objeto sin número no tiene fila. La carga inicial de la CURN hoy no
  trae ningún caso (lo ilegible se corrigió o se propuso, ver
  [`checklist-backend.md`](../docs/checklist-backend.md)); la regla cubre los que
  lleguen.
- **Vista previa** (`variant="preview"`, para la puerta de cuenta; ver «Puerta de
  cuenta» en `DESIGN.md`): la misma mesa recortada a sus primeras **2,5 filas** y
  difuminada hacia abajo, centrada y con celdas de **104 px** (en celular, el ancho
  de la pantalla). Sigue dibujando la grilla y el instrumental, pero sin números,
  sin enlace con la leyenda (no se señala ni se llega con Tab, y no lleva
  `data-n`) y oculta a los lectores de pantalla (`aria-hidden`). La geometría sale
  de CSS: el componente solo fija `--columns`, `--visible-rows` y `data-cropped`, y
  el 4,5 % de margen y el 91 % del dibujo son variables de Sass en
  `table-diagram.scss`. El margen de arriba es un `margin` en %, que se mide sobre
  el ancho, como el alto que le reserva el `aspect-ratio` (un `top` en % se mediría
  sobre el alto y mostraría más de 2,5 filas). Una mesa de 2 filas o menos se ve entera, sin difuminar.
  Una mesa sin objetos se dibuja igual (cuadrícula vacía): sin sesión no se
  revela si la técnica tiene la mesa, y quien decide mostrar la cuadrícula en
  vez de «Sin mesa» es la página (fase 4).
- **Miniatura** (`app-table-miniature`, para «Dónde va» del catálogo de
  instrumental; ver «Catálogo de instrumental» en `DESIGN.md`): es un componente
  hermano del diagrama, no un SVG, porque lleva su propia estructura: una rejilla
  de celdas de **22 px** (18 px en celular) con las celdas de **un** objeto
  encendidas en `marca` y la primera (en orden de lectura) como círculo con su
  número. Recibe la mesa (`table`, solo para su tamaño), el objeto (`item`) y el
  turno de su fila en la lista (`index`), que escalona cuándo se enciende cada una
  (70 ms por turno). Todas las mesas van a la **misma escala**: una mesa ancha se
  desplaza dentro de su marco, con el borde derecho desvanecido. Es decorativa
  (`aria-hidden`): quien la use pone al lado, en texto, la técnica, la mesa y el
  número («Mesa de Mayo · n.° 4»). Un objeto con varias celdas lleva un solo
  número; sin número, sus celdas se encienden sin círculo.

### Inicio (`features/home/`)

El inicio (`/`, `inicio.html`) son seis secciones, cada una un componente con su fondo y su fundido hacia las vecinas (`_section.scss`; ver «The Fondos Neutros Rule» en [`DESIGN.md`](../../DESIGN.md)): la portada (`inicio`), «Tres formas de recorrer una técnica» (`camino`), las técnicas por especialidad (`especialidades`), lo que dice la investigación (`investigacion`), para quién es (`quien`) y las preguntas frecuentes (`preguntas`). Los `id` son los que enlazan la barra y el pie, y cada sección lleva `scroll-margin-top: var(--size-navbar)`. La lista de especialidades llega después de que el router bajó a la sección y empuja lo que sigue, y no todo navegador lo compensa: al llegar, `Home` vuelve a bajar al fragmento, salvo que la persona ya se haya movido.

- **Mesa de ejemplo** (decidido por Juan el 2026-10-31, Resuelto 31 de la [checklist](../docs/checklist-frontend.md)): la API solo entrega las mesas con cuenta, así que la portada y las ventanas de los productos dibujan una **mesa de Mayo de ejemplo** (`demo-table.ts`), que no es de ninguna técnica y se marca «demostración». `app-home-table` la dibuja con los dibujos del acero del diagrama de mesa (`shared/table-diagram`: `DrawingParts` y `SteelGradients` los comparten el diagrama y el inicio) y, si se pide, la capa de la cámara: cajas, etiquetas que no se pisan (`detections.ts`) y el destino «Va aquí» de la pieza fuera de lugar.
- **Escenario de la portada** (`hero-stage`, con su riel en `stage-rail`): el selector Referencia · 3D · Cámara cambia solo cada 5,5 s, se pausa con el puntero encima o el foco dentro y se detiene al interactuar; con movimiento reducido no corre. Tocar con el dedo no pausa. Mientras cambia sola, la línea de estado va con `aria-live="off"`, para no interrumpir al lector de pantalla cada 5,5 s. Tocar una pieza la elige y el riel la muestra de cerca. La lista «Ver las 10 piezas» se cierra con Escape, y al cerrarse, también al elegir una pieza, el foco vuelve al botón que la abre.
- **Carril de herramientas** (`products`): en escritorio la sección queda fija y el carril se traslada con el scroll (`rail-scroll.ts`: avance, trazos y traslado); en celular y con movimiento reducido es un desplazamiento horizontal con `scroll-snap`. «Conocer DataIQ» va a `/tecnicas` por el router; «Conocer SIMIQ3D» y «Conocer SIVRI», a `/simiq3d/` y `/sivri/` con navegación completa.
- **Técnicas por especialidad**: `HomeCatalog` (provisto en `Home`) pide `GET /techniques` y `GET /specialties` una sola vez para esta sección y para la ventana de DataIQ, y las agrupa con `groupBySpecialty()` (`domain/technique-groups.ts`). Cada técnica enlaza a `/tecnicas/:id`.
- **Espiral de la investigación** (`research`): la geometría y el tiempo están en `spiral.ts` (puro, con pruebas); el componente solo pinta cada cuadro. Corre mientras se ve (`IntersectionObserver`); con movimiento reducido se queda en su dibujo completo.

### Catálogo (`features/catalog/`)

El catálogo (`/tecnicas`, `catalogo.html`) pide `GET /techniques` y `GET /specialties` y los muestra con el filtro de especialidades a la izquierda («Todas» y las de la API, con una placa que se desliza a la elegida) y, a la derecha, el buscador y la lista agrupada. Lo puro vive en `domain/`: `groupBySpecialty()` (`technique-groups.ts`) agrupa, y `filterGroups()` y `highlight()` (`technique-search.ts`) filtran y resaltan sin tildes ni mayúsculas; `plain()` compone el texto (NFC) y quita las tildes **letra por letra**, así que un índice del texto plano vale en el texto compuesto, que es el que resalta `highlight()`. Buscar el nombre de una especialidad trae todas sus técnicas.

- **La especialidad elegida va en la URL** (`?especialidad=<id>`), por eso la barra y el pie llegan al catálogo ya filtrado. `selectedId` es un `linkedSignal` de la URL: la sigue cuando cambia y, al elegir, se pone al momento y la URL la alcanza (`replaceUrl`, sin sumar entradas al historial). Un `id` que no existe es como no haber elegido. La búsqueda no va en la URL.
- **Al buscar o filtrar** las filas que siguen a la vista se deslizan a su sitio y las nuevas entran subiendo (FLIP, con la Web Animations API). Con movimiento reducido no se anima.
- **Estados:** mientras llegan las dos listas dice «Cargando…»; si no hay coincidencias, el estado vacío nombra la búsqueda y ofrece «Ver todas las técnicas»; si la API falla no dice «no hay técnicas», porque no se sabe.
- Cada técnica enlaza a `/tecnicas/:id`, que redirige a su primera pestaña (ver «Detalle de técnica»).

### Detalle de técnica (`features/technique/`)

El detalle (`/tecnicas/:id/:pestana`, `tecnica.html`) es la ventana de DataIQ: a la izquierda la **columna de técnicas** (`technique-column/`, con su buscador compacto y todas las técnicas agrupadas por especialidad, la abierta marcada) y a la derecha el nombre de la técnica con su especialidad, las pestañas y la hoja de la elegida. Pide `GET /techniques/{id}` (los datos clínicos, públicos) y la columna, las mismas dos listas del catálogo.

- **La URL manda.** La pestaña vive en la ruta (`datos-clinicos`, `instrumental`, `mesa-de-mayo`, `mesa-de-reserva`; `domain/technique-tabs.ts`), así que se comparte y Atrás la recuerda. `/tecnicas/:id` redirige a `datos-clinicos` (`app.routes.ts`). Las pestañas son `shared/ui/tabs` (`app-tabs`): enlaces con `role="tab"`, la raya de 2 px que se desliza, flechas/Inicio/Fin, candado en las que piden cuenta; la hoja va en un `role="tabpanel"` con `id="panel-<key>"`. Las teclas solo cuentan solas (`tab-keys.ts`, que también usa el selector de la portada): con un modificador son del navegador, y Alt+Izquierda sigue siendo Atrás.
- **«No encontrada»** (`shared/ui/not-found`) cuando la API responde 404, la pestaña no es una de las cuatro o el `id` no es un UUID (`domain/uuid.ts`: un id imposible ni se pide, porque la API respondería 422 y el interceptor lo avisaría como error). Cambiar de pestaña no vuelve a pedir la técnica: el `id` que alimenta el `httpResource` es un `computed`, que no cambia con la pestaña.
- **Si la API no responde** (5xx, sin conexión): el interceptor lo avisa y el aviso se va solo, así que la página también lo dice y no se queda en esqueleto (`aria-busy` vuelve a `false`): el titular dice «No se pudo cargar la técnica» y la hoja, «No se pudo cargar esta hoja.» con «Reintentar», que vuelve a pedir solo lo que falló. Lo mismo si falla `/instruments` o, en las pestañas que piden cuenta, `GET /auth/me`. Al reintentar el recurso conserva el error hasta la respuesta, así que `techniqueFailed` mira también `isLoading()`; y como el botón desaparece, el foco pasa al panel.
- **Título de la pestaña del navegador:** el nombre de la técnica. El router pone el título genérico de la ruta justo antes de `NavigationEnd`, y un efecto de la página lo cambia por el nombre cuando llega y tras cada navegación (si no, cambiar de pestaña lo devolvería a «Técnica»).
- **Celular:** la columna se pliega en un selector («Cirugía general · Tiroidectomía») y la tira de pestañas se desplaza hasta la elegida.
- **Datos clínicos** (`technique-clinical/`): «Para qué sirve» es `description`, sin «demostración» (Resuelto 23); las fichas (anestesia, ropa, posición del paciente, CUPS), los textos largos (indicaciones, complicaciones, técnica quirúrgica) y la fuente salen de `GET /techniques/{id}`, que es público (Resuelto 34). `domain/clinical-sheet.ts` los ordena y descarta lo que falta o está en blanco, con pruebas; el componente solo pinta. Suturas y equipos están en Instrumental (Resuelto 27).
- **Instrumental** (`technique-instrumental/`, Resuelto 35): los objetos (`itemName`), los equipos y el equipo médico-quirúrgico, y las suturas por plano. Todo sale de `GET /techniques/{id}/instruments`, que pide cuenta: se monta solo con sesión, y es la misma petición de las mesas (pasar de Instrumental a una mesa no la repite). `data/sutures.ts` (`toPlaneSutures()`) separa el `usage` («Piel; Fascia») en una sutura por plano (Resuelto 29; la fase 6 le suma el camino de vuelta para guardar), y `domain/instrumental-sheet.ts` ordena la hoja y escribe cada sutura, con pruebas.
- **Hojas de mesa** (`technique-table/`, una por Mesa de Mayo y Mesa de reserva): título, indicación, leyenda y diagrama de `shared/table-diagram`, o un recuadro si no hay mesa que dibujar: «Sin mesa de Mayo.» si la versión dice que no la lleva (`isZoneOmitted()`, `used: false`) y «Mesa de Mayo sin arreglo disponible.» si no dice nada de ella o la usa sin tamaño (Resuelto 37). Las mesas salen de `GET /techniques/{id}/instruments` (`toTables()`), que **pide cuenta**: sin sesión no se pide, y la vista previa de la puerta es otra casilla. Se piden solo al abrir una pestaña que lo necesita, y pasar de una mesa a otra no lo repite (el `id` del recurso es un `computed`). La mesa de la pestaña es la zona cuyo nombre es `zone` de la pestaña (`domain/technique-tabs.ts`).
- **Foco compartido entre mesa y leyenda:** la hoja de mesa guarda `highlighted` (el número señalado) y `focused` (el de lo que tiene el foco) y se los pasa a `app-table-diagram` y a `app-table-legend` con `[(highlighted)]` y `[(focused)]`. Antes cada componente recordaba solo su foco, y una pieza enfocada se soltaba al pasar el puntero por la leyenda y irse (y al revés; hallazgo de la revisión de la fase 3). Cada mesa tiene su numeración: cada hoja tiene sus dos números, y cambiar de técnica los borra (`linkedSignal`).
- **Puerta de cuenta** (`technique-gate/`, Resuelto 36): sin sesión, Instrumental, Mesa de Mayo y Mesa de reserva muestran un vistazo difuminado y, debajo, la tarjeta («Crear cuenta gratis» y «Ya tengo cuenta»), ambos a `/cuenta/...?volver=<la pestaña>`. El vistazo no lleva datos (la API los entrega solo con cuenta): una cuadrícula vacía con la variante `preview` de `app-table-diagram`, o barras en lugar de objetos, igual en toda técnica, así que no revela si le falta una mesa. Solo aparece cuando ya se sabe que no hay sesión (`SessionService.loaded()`), y sin sesión no se pide `/instruments`. Mientras no se sabe, la hoja dice «Cargando…»; si `GET /auth/me` falló por algo que no es un 401, tampoco se sabe (`loadFailed()`): no hay puerta ni candados, y la hoja ofrece «Reintentar».
- **«Ver en 3D» y «Comprobar con la cámara»** (cabecera, `domain/module-links.ts`): con sesión son enlaces normales (`href`, no `routerLink`) a `/simiq3d/tecnicas/:id` y `/sivri/`, porque SIMIQ3D y SIVRI son apps aparte servidas en el mismo origen (Resuelto 17) y el router de esta no las conoce; sin sesión, `routerLink` a `/cuenta/crear?volver=<la pestaña>`. Están en toda técnica (si el módulo no cubre una, su pantalla lo dice) y no se muestran hasta que `SessionService.loaded()` es verdadero. En desarrollo (`ng serve`) esas dos rutas no existen: hace falta el rewrite de Vercel o los módulos corriendo en el mismo origen.

### Cuenta (`features/account/`)

Ingresar y Crear cuenta son una sola pantalla (`AccountEntry`, `cuenta.html`) en **una sola ruta**, `cuenta/:modo` (`ingresar` o `crear`; otro segmento es «No encontrada», por `canMatch`). Con una ruta por pestaña, pasar de una a otra volvería a crear la pantalla y no habría raya que se deslice ni mitades que cambien de lado. El modo y el título de la pestaña del navegador salen de `domain/account-entry.ts` (`accountModeOf()`), que también tiene el saludo según la hora (`greeting()`) y saca de `?volver=` la técnica a la que se iba (`techniqueIdOfReturnUrl()`; un id que no es un UUID ni se pide). Los dos formularios son Signal Forms (`form()` y `[formField]`) y cada pantalla pinta solo el de la pestaña abierta.

- **La mitad izquierda** es la técnica que se quería abrir (`LockedTechnique`): ruta, nombre, especialidad y una vista bloqueada con las cuatro pestañas del detalle y un candado, igual para toda técnica, así que no revela si le falta una mesa (Resuelto 36). Pide `GET /techniques/{id}`, que es público; mientras llega, nombre y especialidad son barras y la mitad dice `aria-busy`. Si la técnica no existe o la API falla, vuelve a ser el saludo: no se queda en blanco ni ofrece un candado sin técnica. Sin técnica (ingreso directo) es el saludo con su ilustración (`LoginIllustration` y `RegisterIllustration`, SVG del mockup, decorativas; no se muestran en celular).
- **Cambio de lado** (FLIP, 700 ms): solo en el ingreso directo y solo al pasar a Crear cuenta; con una técnica las mitades no se mueven. Cada mitad parte de donde estaba la última vez que se pintó (se vuelve a medir al cambiar el tamaño de la ventana) y no corre con movimiento reducido.
- **Pestañas:** `shared/ui/tabs` con enlaces a `/cuenta/ingresar` y `/cuenta/crear` que **conservan la consulta** (`TabItem.queryParamsHandling: 'preserve'`), para no perder `?volver=` al cambiar de una a otra, con el ratón o con las flechas.
- **Campos:** `shared/ui/text-field` (`app-text-field`) es un control de Signal Forms (`FormValueControl<string>`) con su etiqueta, y «Mostrar» / «Ocultar» para las contraseñas, que no le quita el foco a la caja.
- **Sin Google ni «¿Olvidaste tu contraseña?»** (Resuelto 20). Los formularios todavía no envían (solo evitan que el navegador recargue con los datos en la URL): el registro, con la aceptación del aviso, y el ingreso, con la vuelta a `?volver=`, son las casillas siguientes de la fase 5.

### Aviso de privacidad (`features/privacy/`)

El aviso (`/politica-de-datos`) es el texto de [`docs/privacidad.md`](../../docs/privacidad.md), que el registro obliga a aceptar (Resuelto 30 de la [checklist](../docs/checklist-frontend.md)). La ruta, el diseño y el enlace del pie los decidió Juan el 2026-11-01 (Resuelto 41); el diseño está en «Aviso de privacidad (página)» de [`DESIGN.md`](../../DESIGN.md).

- **El texto no se copia.** `angular.json` carga los `.md` como texto (`loader`), la página importa el documento de la raíz del repo y `domain/markdown.ts` (`parseMarkdown()`, sin Angular y con pruebas) lo vuelve nodos: titulares, párrafos, listas con viñetas o numeradas, tablas, negrita, cursiva y enlaces. La plantilla los pinta como elementos, sin `innerHTML`, y un enlace solo se dibuja si va a `https:` o `mailto:`. Cambiar `docs/privacidad.md` cambia la página; `POLICY_VERSION` del backend cambia en el mismo PR (`.claude/rules/dataiq.md`).
- **Forma del documento.** `readPrivacyDocument()` (`privacy-document.ts`) separa el titular y el párrafo de versión y vigencia, que van a la izquierda, del resto del aviso. Si el documento deja de abrir con un titular de nivel 1 y ese párrafo, falla: su prueba lee el `docs/privacidad.md` real, así que un cambio de forma lo detecta el CI y no un lector. También comprueba que estén las secciones de la autorización y que la tabla de datos tenga tres columnas en todas sus filas.
- **Enlaces.** Desde el pie («Aviso de privacidad», junto al derecho de autor). El registro lo enlaza en su casilla de aceptación (fase 5).

### Glosario (interfaz → código y API)

| Interfaz | Código y API |
|---|---|
| técnica, especialidad | technique, specialty |
| versión; borrador, en revisión, publicada, reemplazada, archivada | version; `draft`, `in_review`, `published`, `superseded`, `archived` |
| mesa de Mayo, mesa de reserva | zone (la API trae su nombre en `zone`) |
| celda (fila, columna) | cell (`row`, `column`) |
| objeto de la mesa, componente | item, component |
| número de leyenda, texto de la fuente | `legend_number`, `source_text` |
| instrumental, alias, categoría | instrument, `aliases`, category |
| sutura, equipo biomédico, dispositivo médico | suture, equipment, device |
| usuario, colaborador, revisor, admin | `user`, `contributor`, `reviewer`, `admin` |
| devolución (motivo) | rejection (`reason`) |

### Rutas

Las URL son parte de la interfaz: van en español. Las rutas de la API son
relativas a `/api/dataiq`.

| Ruta | Mockup | Acceso | API |
|---|---|---|---|
| `/` | `inicio.html` | público | `GET /techniques`, `GET /specialties` |
| `/tecnicas?especialidad=` | `catalogo.html` | público | `GET /techniques`, `GET /specialties` |
| `/tecnicas/:id` → `/tecnicas/:id/:pestana` | `tecnica.html` | público; instrumental y mesas con puerta de cuenta | `GET /techniques/{id}`, `GET /techniques/{id}/instruments` |
| `/politica-de-datos` | (sin mockup; ver `DESIGN.md`) | público | ninguna |
| `/cuenta/ingresar`, `/cuenta/crear` (`?volver=`) | `cuenta.html` | público | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/logout` |
| `/gestion/borradores` | `borradores.html` | colaborador o más | `GET /versions?mine=true`, `POST /techniques`, `POST /techniques/{id}/versions`, `DELETE /versions/{id}` |
| `/gestion/editor/nueva`, `/gestion/editor/:versionId/:paso` | `editor.html` | colaborador o más | `GET`/`PUT /versions/{id}`, `POST .../submit`, `POST .../publish`, `GET /catalog/full`, `GET /specialties` |
| `/gestion/revision`, `/gestion/revision/:versionId` | `revision.html` | revisor o más | `GET /versions?state=in_review`, `GET /versions?reviewed_by_me=true`, `GET /versions/{id}`, `POST .../approve`, `POST .../reject` |
| `/gestion/instrumental/:id?` | `instrumental.html` | revisor o más | `GET`/`POST /instruments`, `PATCH /instruments/{id}`, `GET /catalog/full` |
| `/gestion/usuarios` | `usuarios.html` | admin | `GET /users`, `PATCH /users/{id}/role` |

Cada ruta carga su pantalla al visitarla (`loadComponent`, en
`app/app.routes.ts`), y las de gestión llevan su `roleGuard`. El título de la
pestaña es `title` de la ruta más « · IQ Platform» (`PageTitleStrategy`), como
en los mockups; el inicio lleva solo «IQ Platform». Las rutas con dato (técnica,
editor, revisión) llevan un título genérico («Técnica», «Editar técnica»,
«Revisar versión») hasta que su pantalla ponga el nombre real; el detalle de técnica ya lo pone. El router
(`provideAppRouter`, en `core/router/`) tiene `anchorScrolling`: los enlaces de la
barra y del pie a `/#camino`, `/#investigacion`, `/#preguntas` y `/#quien` bajan a
esa sección del inicio, también desde otra página y al tocar de nuevo el mismo
enlace. El router calcula la posición por su cuenta y no mira `scroll-margin-top`,
así que `provideAppRouter` le da el alto real de la barra con `setOffset`, para que
la sección no quede bajo ella (`scroll-margin-top`, que también lleva cada sección,
es para el desplazamiento del navegador). Mientras una
pantalla no se construye, su ruta carga un marcador vacío. Una ruta que no
existe (`**`, la última) abre «No encontrada»: el aviso es
`shared/ui/not-found`, que la fase 4 reutiliza para una técnica que no existe.

La técnica va por su `id` (UUID): la API no tiene slug (el mockup usa
`#tec-<slug>`). Al iniciar sesión se vuelve a la ruta de `?volver=` (solo si es
una ruta propia: ver «Sesión»).

### Barra (`shell/navbar/`)

La barra (`Navbar`) tiene la marca y cuatro menús; cada botón abre su
desplegable (`NavPanel`), un overlay de CDK a todo el ancho bajo la barra. Solo
hay uno abierto a la vez; se cierra con Escape (el foco vuelve a su botón), con
un clic fuera, al elegir una opción o al cambiar de página por otro camino
(Atrás, un guard, la sesión vencida). Si el foco estaba en el panel, al cerrarse
vuelve a su botón. Con el teclado el foco entra al primer enlace, y aunque el
panel queda al final del documento, Tab lo recorre como si estuviera tras su
botón: Mayús+Tab desde la primera opción vuelve al botón y Tab desde la última
sigue con lo que viene después. Un segundo clic sobre «Especialidades» lleva al
catálogo. El contenido de Herramientas, ¿Por qué IQ Platform? y Ayuda está en
`nav-menus.ts`, con el destino de cada opción (`NavTarget`): rutas de esta app
(los fragmentos del inicio: `/#camino`, `/#investigacion`, `/#preguntas`,
`/#quien`) y `/simiq3d/` y `/sivri/` como enlaces normales, con navegación
completa (Resuelto 17): son otras apps, servidas en el mismo origen por los
rewrites de Vercel (fase 9). La barra, el menú de celular y el pie dibujan esos
enlaces con la directiva `NavLink` (`nav-link.ts`, `<a [appNavLink]>`), que abre
las rutas con el router y deja `href` al navegador. Con `npm start` esas dos rutas no existen: el router
las toma por una ruta desconocida y abre «No encontrada».

- **Peso:** el overlay de CDK (78 KB) y el desplegable se cargan con import
  dinámico la primera vez que se abre un menú: la barra está en todas las
  páginas y no debe engordar el código inicial.
- **Especialidades** salen de la API (`SpecialtiesNav`): las especialidades son
  las de `Specialties`, que ya pidió el pie al cargar la app, y sus técnicas
  (`GET /techniques`) se piden la primera vez que se abre ese desplegable. Cada
  una lleva a `/tecnicas?especialidad=<id>`: el parámetro es el `id` de la
  especialidad.
- «Especialidades» lleva `aria-current` en `/tecnicas` y en el detalle de
  técnica. Mientras llegan las especialidades, el desplegable dice «Cargando…»;
  si la API falla, queda vacío (el interceptor ya avisó), y abrirlo de nuevo (o
  abrir el menú de celular) vuelve a pedir lo que falló.
- **Sesión:** a la derecha, un visitante ve Ingresar (`/cuenta/ingresar`) y Crear
  cuenta (`/cuenta/crear`), sin `?volver=`: es un ingreso directo. Con sesión va
  «Mi cuenta» (avatar con iniciales), que abre `AccountMenu`, un panel anclado a la
  derecha con nombre, correo, rol y los accesos de gestión del rol
  (`management-links.ts`: Mis borradores, Por revisar, Instrumental, Usuarios y
  roles; la página actual lleva `aria-current`). Hasta que `SessionService.loaded()`
  es `true` no se muestra ni lo uno ni lo otro. Solo la API dice si hay sesión: si `GET /auth/me`
  falla por algo que no es un 401 (sin conexión, 5xx en un arranque en frío), `loaded()` sigue en
  `false`, `loadFailed()` pasa a `true` y se vuelve a preguntar al cambiar de página
  (`provideSession`). El panel se cierra si la sesión
  cambia (p. ej. vence) y si la ventana cruza los 760 px, donde la barra cambia de
  alto: al abrirlo de nuevo se ancla a la altura nueva. Todavía faltan: la cifra junto a
  cada acceso, que llega con su pantalla (borradores, por revisar, instrumental), y
  «Cerrar sesión», de la fase 5.
- **Celular (≤ 960 px):** los cuatro botones se esconden y aparece el botón de
  menú (`MobileMenu`), un panel a pantalla completa bajo la barra con un grupo
  plegable por menú y las mismas opciones. Se cierra con el botón, con Escape
  (el foco vuelve al botón), al elegir una opción, al cambiar de página o si la
  ventana vuelve a pasar de 960 px; abrirlo cierra el desplegable de escritorio y
  al revés, y si la ventana baja de 961 px con un desplegable abierto, este se
  cierra. Al
  final lleva, según la sesión, Crear cuenta gratis e Ingresar, o quién es y los
  mismos accesos de gestión. En la barra compacta quedan Ingresar y «Mi cuenta»
  solo con el avatar.

### Pie (`shell/footer/`)

El pie oscuro (`Footer`) va en todas las páginas, bajo `<main>`, que crece para
que el pie quede abajo aunque la página sea corta. Lleva la marca con su frase y
las cuatro columnas de la barra (Herramientas, Especialidades, ¿Por qué IQ
Platform?, Ayuda) con los mismos destinos, tomados de `nav-menus.ts`. En el MVP
no lleva «Quiénes somos» ni «Términos de uso» (Resuelto 26), y Ayuda solo
«Preguntas frecuentes» y «Para docentes» (la opción que va solo en la barra
lleva `inFooter: false` en `nav-menus.ts`); «Aviso de privacidad», que abre su
página, va en la franja de abajo, junto al derecho de autor. Las especialidades las da `Specialties` (`GET /specialties`,
una sola petición al cargar la app, porque el pie está en todas las páginas, que
comparte con el desplegable de la barra) y dicen «Cargando…» mientras llegan. Si
fallaron (p. ej. un 5xx en un arranque en frío), se vuelven a pedir al cambiar
de página.

### Errores de la API

Todos traen `{"detail": ...}`. El interceptor los traduce a un aviso:

- **401**: no hay sesión o venció (dura 2 horas). Si la petición salió con
  sesión, se limpia la cuenta y se lleva a `/cuenta/ingresar?volver=<ruta
  actual>`. Un visitante no tiene sesión que vencer: ver las excepciones abajo.
- **403**: el rol no alcanza (o falta `X-IQ-Client`, que sería un error del
  frontend).
- **409**: otro cambio llegó primero o el estado no lo permite (otro revisor
  ya decidió, ya hay una versión en curso, la técnica tiene una versión en
  curso). `detail` trae el texto para mostrar.
- **422**: `detail` es una lista. Del dominio llega como lista de textos (lo
  que no cuadra en el contenido); de la validación de FastAPI, como lista de
  objetos con el campo que falló.

Qué texto se muestra (`core/http/error-message.ts`): el `detail` de la API,
que ya viene en español, si es un texto o una lista de textos. Si no lo es (la
lista de objetos de FastAPI trae mensajes en inglés) o falta, un texto de
respaldo con la misma voz impersonal. Sin respuesta (estado 0) dice que no hay
conexión, y un 5xx lleva un texto fijo, sin mostrar lo que responda el
servidor. El resto de códigos (p. ej. el 404, que cada pantalla trata a su
manera) no genera aviso. El error siempre vuelve a quien hizo la petición.

- Un 401 que no es una sesión vencida no avisa, no redirige ni olvida la
  cuenta; lo trata la pantalla:
  - el de `GET /auth/me` (visitante) y el de `POST /auth/login` (contraseña mal
    puesta);
  - el de un visitante, p. ej. la vista previa de la puerta de cuenta en una
    página pública: no lo saca de ahí;
  - el de una petición que salió antes de ingresar o salir
    (`SessionService.generation` cambió): viene de la cookie vieja y no debe
    borrar la sesión nueva.
- Varias peticiones que fallan a la vez dan un solo aviso, y quien ya está en
  `/cuenta/…` no se vuelve a enviar a ingresar. Si la navegación falla, se queda
  donde está.
- Los demás 401 también olvidan la cuenta (`SessionService.clear()`).

**Avisos**: el interceptor y cualquier pantalla (p. ej. «Guardado») los dan a
`NoticeService` (`core/notice/`) con `show('error' | 'confirmation', mensajes)`.
`App` los pasa a `shared/ui/notice-stack`, que solo dibuja: recibe la lista y
avisa con `dismissed` cuál quitar, así que no importa `core/`. El error es
neutro (nunca rojo) y se queda hasta cerrarlo; la confirmación es oscura y se va
sola a los 3,2 s. Un error igual a uno a la vista no se repite, y caben tres
(`MAX_ERRORS`): si llega otro, se va el más antiguo. Una confirmación igual a
una a la vista la reemplaza y vuelve a contar su tiempo. Un aviso sin mensajes
no se muestra. Aspecto y razones: «Avisos» en
[`DESIGN.md`](../../DESIGN.md).

### Sesión

`SessionService` (`core/session/`) guarda la cuenta en un signal. Se pide a la
API al arrancar (`provideSession()`), pero **el arranque no espera la
respuesta**: el backend puede tardar segundos en arrancar en frío y las páginas
públicas no deben quedar en blanco. Hasta que llega, `loaded()` es `false` (el
shell lo usa para no mostrar «Ingresar» un instante a quien sí tiene sesión).
Solo el 401 dice que es un visitante, y es definitivo. Si la API no respondió
(sin conexión o un 5xx en un arranque en frío) no se sabe si hay sesión:
`loaded()` sigue en `false`, `loadFailed()` pasa a `true` y el próximo `load()`
vuelve a preguntar; lo llaman los guards y `provideSession()`, al cambiar de
página. Ingresar, salir o `clear()` también ponen `loaded()` en `true`, y una
respuesta tardía de `GET /auth/me` no pisa un ingreso hecho mientras tanto.

- `login()` y `logout()` devuelven `Observable` y actualizan la cuenta solo si
  la API respondió bien. `clear()` la olvida sin llamar a la API (la usa el
  interceptor ante un 401).
- `sessionGuard` y `roleGuard(minimo)` **esperan** a que se sepa si hay sesión
  (`load()`). Al visitante lo llevan a `/cuenta/ingresar?volver=<ruta>`. A quien
  tiene sesión pero no alcanza el rol, `roleGuard` lo lleva al inicio con el
  aviso de que no hay permiso (`NO_PERMISSION`, el mismo texto de respaldo del
  403). Es solo para
  no mostrar pantallas que no se pueden usar: la API decide en cada petición.
- `?volver=` lo puede escribir cualquiera, así que quien lo use al ingresar tiene
  que pasarlo por `safeReturnUrl()`: solo acepta rutas de esta misma app (no
  `//sitio`, `https://…`, `\` ni caracteres de control).

## Correr el frontend

Hace falta Node.js y el backend corriendo (ver [`../README.md`](../README.md)).
Todo se corre desde `dataiq/frontend`:

```sh
npm install
npm start      # http://localhost:4200
npm test       # Vitest
npm run build  # producción, con los presupuestos de angular.json
npm run api:types  # regenera los tipos de la API (necesita uv)
```

`npm start` llega a la API por `proxy.conf.json`: `/api/dataiq/...` se
reenvía a `http://127.0.0.1:8000/...`, sin el prefijo. El backend no sabe de
ese prefijo (igual que detrás del rewrite de Vercel), así que toda URL
absoluta que arme apunta a la raíz del sitio y no a `/api/dataiq`. Por eso:

- Las rutas de la API van **sin barra final** (`/api/dataiq/techniques`, no
  `/techniques/`): con barra, FastAPI responde un 307 hacia `/techniques`, que
  ya es la SPA y no la API.
- Swagger se abre directo en el backend (`http://127.0.0.1:8000/docs`), no por
  el proxy: por `/api/dataiq/docs` pediría `/openapi.json` en la raíz.

`npm run api:types` genera `src/app/data/api/schema.d.ts` con
`openapi-typescript` (versión fija) a partir de `app.openapi()` del backend, el
mismo documento que sirve `/openapi.json`: no hace falta que el backend esté
corriendo, pero sí `uv` (ver [`../README.md`](../README.md)). El archivo se
versiona, para que el build no necesite el backend; cuando cambie una ruta o un
esquema de la API, se regenera y se sube en el mismo PR. El CI
([`dataiq-frontend.yml`](../../.github/workflows/dataiq-frontend.yml)) lo
regenera en cada PR que toque el backend o el frontend y falla si no coincide
con el que se subió. `openapi-typescript`
declara TypeScript 5 como peer, y el proyecto usa TypeScript 6: el `overrides` de
`package.json` lo resuelve solo para ese paquete.

Para probar cada rol hay una cuenta de desarrollo por rol, solo en la base
local: cuáles son y cómo se crean, en
[`../README.md`, «Correr el backend»](../README.md#correr-el-backend).
