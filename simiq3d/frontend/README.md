# Frontend de SIMIQ3D

Aplicación web en Angular con el chat y el visor 3D de SIMIQ3D: el estudiante
pregunta por una técnica y ve su mesa de Mayo en 3D, la gira y toca cada
instrumento para ver qué es. Se usa sobre todo en el celular, así que **lo
primero es que sea liviana**.

Este README dice cómo está hecho y cómo se corre. El avance por fases y lo que
falta decidir están en
[`../docs/checklist-frontend.md`](../docs/checklist-frontend.md). Lo que hace
SIMIQ3D y por qué (alcance, modelos, chat, cómo se arma la mesa) está en
[`../README.md`](../README.md).

Fuentes:

- Producto: [`PRODUCT.md`](../../PRODUCT.md). Diseño visual: [`DESIGN.md`](../../DESIGN.md).
- Cómo se habla con DataIQ (sesión, proxy, encabezados):
  [`dataiq/README.md`, «Cómo lo usa el frontend»](../../dataiq/README.md#cómo-lo-usa-el-frontend).
- El frontend de DataIQ y el shell, del que se toman las convenciones:
  [`dataiq/frontend/README.md`](../../dataiq/frontend/README.md).

## Decisiones

Decididas por Juan Caraballo el 2026-10-15.

| Decisión | Detalle |
|---|---|
| Tecnología | Angular 22, como el shell y DataIQ: componentes standalone, signals, sin `zone.js`, TypeScript 6, Vitest, SCSS |
| Visor 3D | **Three.js**, usado directamente en un componente, sin envoltorios. Se descarga solo al abrir el visor (`import()` dinámico): el chat aparece antes |
| Alcance | App aparte en `simiq3d/frontend`, servida bajo `/simiq3d/` en el mismo origen que el shell, para usar la misma cookie de sesión |
| Idioma | Código en inglés; interfaz, documentación y URL en español |
| Renderizado | SPA sin SSR, sitio estático en Vercel |
| Datos | La mesa, sus objetos y la descripción de cada instrumento salen **directo de DataIQ** (`/api/dataiq`). El backend de SIMIQ3D responde el chat (`POST /chat`, ver «El chat») y el mapeo de cada modelo 3D a su instrumento (`GET /models`) |
| Modelos 3D | GLB comprimidos con **meshopt** (`gltfpack`); el decodificador pesa unos 20 KB. Se sirven como archivos estáticos con caché |
| Sistema visual | Dos capas: tokens base compartidos en `shared/design/` (raíz del repo) y el tema de SIMIQ3D en `src/styles/theme.scss`, que puede cambiar lo que necesite. Todo color nuevo se anota en `DESIGN.md` |
| Sin conexión | No en el MVP: la caché HTTP guarda la app y los modelos después de la primera visita (ver `docs/despues-del-mvp.md`) |
| Presupuesto | Código inicial: aviso a los 300 KB, error a los 500 KB. Cada archivo de código, aviso a los 750 KB y error a los 900 KB: el del visor lleva Three.js, que con lo que usa mide 675 KB (169 KB comprimido). Cada GLB por debajo de 150 KB (`npm run models` falla si uno pasa) |
| Estado | Servicios con signals. Sin NgRx |
| Caché HTTP | Sin `ETag` a mano: el navegador revalida con lo que manda cada API |
| Sesión y seguridad | La cookie `HttpOnly` de DataIQ; la cuenta sale de `GET /api/dataiq/auth/me`. `X-IQ-Client: web` en todas las peticiones; CSP estricta, sin `innerHTML` con datos de las APIs |

## Arquitectura

La misma separación que el frontend de DataIQ: solo `data/` sabe que existe
HTTP; solo `viewer/` sabe que existe Three.js.

```
src/
├── styles/                 theme.scss: el tema de SIMIQ3D sobre shared/design/
└── app/
    ├── core/
    │   ├── http/           base /api/dataiq y /api/simiq3d, interceptores: X-IQ-Client y errores
    │   └── session/        SessionService (cuenta de /auth/me), sessionGuard → ingreso del shell
    ├── domain/             reglas puras, sin Angular ni Three.js: las acciones del chat y
    │                       la geometría de la mesa (celda → posición en metros)
    ├── data/
    │   ├── dataiq.repository.ts    técnicas, mesa de una técnica, instrumentos
    │   └── simiq3d.repository.ts   chat y mapeo modelo 3D → instrumento
    ├── viewer/             ★ el visor en Three.js; ver abajo
    ├── chat/               mensajes, sugerencias y campo de pregunta
    ├── explore/            la pantalla: chat + visor (rutas / y /tecnicas/:id), con la
    │                       cabeza, la leyenda, la ficha, los controles de vista y la hoja
    │                       inferior del celular
    ├── shell/              la barra del shell
    └── shared/             media queries e iniciales del avatar, como en DataIQ
```

**Reglas de dependencia**: `explore` usa `chat`, `viewer`, `data`, `domain` y
`core`; `viewer` y `chat` usan `domain`; `data` usa `domain`; `domain` no usa
nada de Angular, de Three.js ni de las APIs. Así la geometría de la mesa se
prueba sin navegador ni WebGL.

### El visor

La pieza central. Recibe la mesa ya calculada por `domain/` (qué modelo va en
qué posición) y la dibuja. Para que corra bien en un celular modesto:

- **Se carga aparte.** Three.js, el cargador de GLB y los controles van en un
  chunk que se descarga al abrir la escena, no con el chat.
- **Solo lo que se usa.** Se importa el núcleo de Three.js y, de sus
  complementos, `GLTFLoader`, `OrbitControls` y el decodificador de meshopt.
- **Dibuja solo cuando algo cambia** (al girar, al cargar un modelo, al
  resaltar, al cambiar el tamaño), no 60 veces por segundo: ahorra batería.
- **Resolución con tope:** `devicePixelRatio` hasta 2.
- **Luz sencilla, sin sombras en tiempo real.** El acero sale del material y
  de una luz ambiente; la sombra bajo cada instrumento, si hace falta, va
  dibujada.
- **Cada modelo se descarga una vez** y se reutiliza: la misma Kelly en dos
  técnicas es el mismo archivo en caché.
- **Libera la memoria** de la técnica anterior al cambiar de técnica.
- **Tocar un instrumento** (raycasting) lo resalta y muestra su descripción.
  La leyenda de la mesa, como lista, hace lo mismo y es la alternativa
  accesible para quien no puede usar la escena.
- **Sin WebGL**, se dice y se ofrece la mesa en DataIQ.

### Cómo se arma la mesa

La regla está en [`../README.md`, «Cómo se arma la mesa en 3D»](../README.md#cómo-se-arma-la-mesa-en-3d).
En código: la cuadrícula de la técnica (`zones`: `rows` × `columns`, de
`GET /techniques/{id}/instruments`) se reparte en partes iguales sobre la
mesa, de tamaño provisional y el mismo para todas las técnicas (56 × 40 cm,
el del mockup; `MAYO_TABLE_SIZE` en `domain/mayo-table.ts`); cada objeto
va con su centro en el centro de sus celdas (si ocupa varias, el centro de
todas). Unidades en metros, el eje Y hacia arriba, las columnas sobre X y las
filas sobre Z. Solo la mesa de Mayo (alcance del MVP).

- **Qué modelo va en cada objeto:** los componentes del objeto
  (`components[].instrument_id`) se buscan en `GET /models`. Un componente
  sin modelo (una sutura, o un instrumento sin GLB) no se dibuja; el objeto
  sigue en la leyenda.
- **Mango y hoja:** si un objeto trae un mango y su hoja, la hoja se cuelga
  del nodo `blade_mount` del mango, sin moverla ni girarla
  ([`../models/README.md`](../models/README.md), «Mango y hoja»). Dos
  instrumentos independientes en la misma celda van uno al lado del otro.
- **Todos apuntan igual**, a lo largo de X. Hacia dónde apunta cada uno es
  para después del MVP.
- **Dentro de la mesa y sin taparse:** `domain/arrangement.ts` parte del
  centro de las celdas de cada objeto y lo corre lo justo para que quede
  entero sobre la mesa (a 1 cm del borde) y a 3 mm de cualquier otra pieza.
  Dos piezas que se tapan se separan por el lado en que menos se tapan; como
  son largas y delgadas, casi siempre es a lo ancho, así que cada una sigue en
  su fila y en el mismo orden. Las medidas de cada pieza salen del modelo
  armado, en la escena.

### El chat

Contrato de `POST /api/simiq3d/chat/stream` (el porqué de cada cosa, en
[`../README.md`, «Chat»](../README.md#chat)):

- **Se envía** `{"question": "…", "technique_id": "<id>" | null, "previous":
  […]}`: la pregunta; la técnica abierta en el visor, si hay una, para que «¿y
  dónde va la Kelly?» se entienda en esa técnica; y las 3 últimas preguntas
  respondidas, cada una con los `requests` y el texto (`reply`) de su
  respuesta, para que «¿y para qué sirve?» se entienda por lo que se preguntó
  antes. Las guarda la conversación (`explore/conversation.service.ts`), solo
  mientras la página está abierta.
- **Se recibe a medida que se escribe**, una línea JSON por evento
  (`data/ndjson.ts` las lee de la respuesta como texto, con el progreso de
  `HttpClient`): `start` (lo que hace el visor, sin texto), cada `text` (una
  parte que se agrega) y `end` (la respuesta completa, que reemplaza lo
  mostrado). Con `start` aparece el mensaje y cambia el visor; los tres puntos
  siguen hasta la primera frase, y no se envía otra pregunta hasta `end`
  (`ConversationService`: `waiting` y `pending`). Si la respuesta se corta, lo
  escrito queda y el aviso lo dice. Cada evento con respuesta trae `action`,
  `technique_id`, `instrument_id`, `field`, `reply`
  (el texto), `generated` (si lo escribió el modelo de IA), `options`
  (preguntas que se pueden volver a enviar tal cual) y `requests` (de qué se
  habló; el visor no lo usa).
- **El texto viene en Markdown sencillo:** párrafos, `**negrita**` y listas
  con «- » o «1. ». `chat/rich-text.ts` lo convierte en datos (párrafos,
  listas y tramos en negrita) y la plantilla los dibuja, sin `innerHTML`: el
  texto nunca se interpreta como HTML. En celular, la última respuesta encima
  del campo va sin marcas (`plainText`). Bajo una respuesta con `generated`
  va la línea de fuentes («Línea de fuentes» en `DESIGN.md`).

Lo que hace el visor con cada `action`; los ids son de DataIQ y el visor
nunca saca nada del texto:

| `action` | En el visor |
|---|---|
| `show_technique` | Abre la mesa de `technique_id` |
| `highlight_instrument` | Abre esa mesa si no es la abierta, viaja a `instrument_id` y lo resalta en la escena y en la leyenda |
| `describe_instrument` | Lo mismo, y abre la ficha del instrumento |
| `show_clinical_data` | Abre la mesa; el dato (`field`: `description`, `indications`, `complications` o `anesthesia_position`) va en el texto |
| `list_instruments` | Abre la mesa y, bajo el texto, la lista numerada de sus objetos, que señala cada pieza al tocarla |
| `answer` | Nada: es una respuesta solo en texto («¿en cuántas técnicas va la Allis?», «¿qué es la hemostasia?») |
| `clarify` | Nada: pide precisar y ofrece las opciones |
| `no_answer` | Nada: lo dice, con las opciones para seguir |

Las opciones se muestran como botones y, al tocarlas, se envían como
pregunta.

La conversación vive en `explore/conversation.service.ts`, aparte de la
pantalla: al abrir otra técnica desde la bienvenida, la pantalla se vuelve a
crear y la conversación sigue. Si la respuesta pide otra técnica, la pantalla
la abre y, cuando llega su mesa, señala el instrumento (y abre su ficha, si se
pidió). Mientras llega una respuesta no se envía otra. Si el chat no responde,
el aviso lo dice y el campo sigue activo: la única forma de saber si volvió es
preguntar otra vez.

### Modelos 3D

```
simiq3d/models/                  la fuente (la llenan quienes modelan)
├── blender/<familia>.blend      una base por familia
├── glb/<instrumento>.glb        exportado de Blender, sin comprimir
└── modelos.csv                  medidas de cada instrumento, con su fuente
        │  npm run models (gltfpack, meshopt)
        ▼
simiq3d/frontend/public/models/  lo que se publica (generado, no se versiona)
```

Las convenciones de cada modelo (escala real en metros, origen en el centro
visto desde arriba y a la altura de su punto más bajo, eje largo sobre +X con
Y arriba, un GLB por instrumento con nombre en inglés) están en
[`../models/README.md`](../models/README.md), «Convenciones». Por qué se
modelan a mano: [`../README.md`, «Modelos 3D»](../README.md#modelos-3d).

### Glosario

El de DataIQ ([`dataiq/frontend/README.md`](../../dataiq/frontend/README.md#glosario-interfaz--código-y-api)),
más:

| Interfaz | Código |
|---|---|
| escena, visor | scene, viewer |
| modelo 3D | model |
| resaltar un instrumento | highlight |
| acción del chat | action |
| pregunta, respuesta | question, reply |

### Rutas

Relativas a `/simiq3d/`. Las rutas de las APIs son relativas a `/api/dataiq` y
`/api/simiq3d`.

| Ruta | Qué muestra | API |
|---|---|---|
| `/simiq3d` | El chat con sugerencias y la escena vacía | `GET /techniques` (DataIQ); `POST /chat` (SIMIQ3D) |
| `/simiq3d/tecnicas/:id` | La mesa de Mayo de esa técnica. Es el destino de «Ver en 3D» en el detalle de DataIQ | `GET /techniques/{id}`, `GET /techniques/{id}/instruments` y `GET /instruments` (DataIQ); `GET /models` y `POST /chat` (SIMIQ3D) |

Las dos piden cuenta. Sin sesión, se va al ingreso del shell:
`/cuenta/ingresar?volver=/simiq3d/…` (navegación completa, porque el shell es
otra app). Si DataIQ no responde, no se sabe si hay sesión: la ruta espera y
vuelve a preguntar sola, sin mandar a ingresar a quien quizá la tiene. Una
sesión que vence mientras se usa la app (un 401 de cualquiera de las dos APIs)
lleva al ingreso para volver a donde se estaba. La barra para volver al shell
también son enlaces normales.

### Errores de las APIs

Los de DataIQ, como en su frontend: un 401 lleva al ingreso del shell. Del
chat (`POST /chat`), además:

- **503 «El chat no está disponible»** (el Servidor PC2 está apagado o no
  responde, con un motor que no lo resuelve él mismo): el chat se muestra
  «no disponible» y el visor sigue funcionando; las técnicas se pueden abrir
  desde la lista. El tutor no lo usa: su respuesta dice que el modelo no está
  disponible y muestra lo que DataIQ tiene.
- **503 «DataIQ no responde»**: el backend no pudo pedir el catálogo; se dice
  y se puede volver a preguntar.
- **429**: el tope de preguntas seguidas por cuenta, que protege al Servidor
  PC2 (`CHAT_QUOTA_MAX` y `CHAT_QUOTA_WINDOW` del backend; 30 cada 10 minutos
  por defecto). Se muestra el texto de la API.
- **422**: la pregunta vacía o de más de 500 caracteres; el campo no deja
  enviarla.
- **Sin respuesta** (`no_answer`: fuera de alcance o un intento de desviarlo):
  se dice así, sin inventar.

## Correr el frontend

Hace falta Node.js y el backend de DataIQ corriendo (ver
[`dataiq/README.md`](../../dataiq/README.md)). Todo se corre desde
`simiq3d/frontend`:

```sh
npm install
npm start          # http://localhost:4300/simiq3d/
npm test           # Vitest
npm run build      # producción, con los presupuestos de angular.json
npm run models     # comprime los modelos 3D (corre solo antes de start y build)
npm run api:types  # tipos de las APIs, tras cambiar una ruta o un esquema de un backend
```

`npm run api:types` necesita `uv` (el de los backends), pero no que los
backends estén corriendo. Los tipos generados se versionan y se suben en el
mismo PR que cambia el backend.

`proxy.conf.json` manda `/api/dataiq` a `http://127.0.0.1:8000` y
`/api/simiq3d` a `http://127.0.0.1:8001`.

Para el chat hace falta también el backend de SIMIQ3D en el puerto 8001 (ver
[`../backend/README.md`](../backend/README.md)).

Para entrar con una cuenta: la cookie de sesión no distingue puertos, así que
sirve la que deja el ingreso del shell en `localhost:4200`. En desarrollo, el
shell no vuelve solo a `localhost:4300` después de ingresar (solo vuelve a
rutas de su mismo origen): hay que volver a mano. Sin el shell
corriendo, se puede pedir desde la consola del navegador, en
`localhost:4300/simiq3d/`:

```js
fetch('/api/dataiq/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-IQ-Client': 'web' },
  body: JSON.stringify({ email: '<correo>', password: '<contraseña>' }),
});
```

## Despliegue

El proyecto de Vercel `simiq3d-frontend` (cuenta de Mauricio, plan Hobby)
sirve la app como sitio estático. El workflow
[`simiq3d-frontend.yml`](../../.github/workflows/simiq3d-frontend.yml) corre
el build y las pruebas en cada PR y, en cada push a `main`, construye en
GitHub Actions y publica con el CLI de Vercel. Vercel no la construye, porque
el build lee `../../shared/design/` y `../models/glb/`, que están fuera de
esta carpeta.

- **La ruta completa.** El proyecto del shell trae la app con un rewrite
  `/simiq3d/:path*` hacia `https://simiq3d-frontend.vercel.app/simiq3d/:path*`
  (Resuelto 1 de la [checklist](../docs/checklist-frontend.md#resuelto)). Por
  eso la app se publica dentro de `simiq3d/`, y `vercel.json` manda a
  `simiq3d/index.html` toda ruta que no sea un archivo, como
  `/simiq3d/tecnicas/:id`.
- **CSP** (`vercel.json`): todo sale de este mismo origen, salvo las fuentes
  de `fonts.gstatic.com`, porque el build incrusta el CSS de Google Fonts. Las
  excepciones:
  - `'wasm-unsafe-eval'`: el decodificador meshopt de los modelos es
    WebAssembly;
  - `style-src 'unsafe-inline'`: Angular pone los estilos de cada componente
    en un `<style>`, y un sitio estático no puede firmarlos con un nonce;
  - `img-src data:`: la textura de tela de los tokens.

  Los scripts van sin `'unsafe-inline'`. Por eso el build de producción no
  incrusta el CSS crítico (`inlineCritical: false` en `angular.json`): esa
  optimización agrega un script en línea. Se comprobó el 2026-11-02 con la app
  completa (escena, fuentes y chat) en Brave: el navegador no bloqueó nada.
- **Caché.** El código y los estilos llevan un hash en el nombre, así que se
  guardan un año (`immutable`). Los modelos no lo llevan: se guardan un día y
  se siguen sirviendo una semana más mientras se revalidan
  (`stale-while-revalidate`), para que un modelo corregido llegue al día
  siguiente. `index.html` va sin caché, como lo deja Vercel.
- **Las APIs no pasan por este proyecto.** El navegador las pide al dominio
  del shell (`/api/dataiq/*`, `/api/simiq3d/*`), que tiene sus propios
  rewrites.
