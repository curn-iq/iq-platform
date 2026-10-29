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
    │                       y transiciones, avance por sección
    ├── data/
    │   ├── api/            tipos generados del OpenAPI
    │   └── *.repository.ts un adaptador por recurso (techniques, versions, catalog,
    │                       auth, users)
    ├── shared/
    │   ├── ui/             button, avatar, brand mark, not-found, tabs con raya, segmented control, status pill,
    │   │                   progress mark (22 px), search field, demo tag, floating panel,
    │   │                   notice stack (los avisos: error y confirmación)
    │   └── table-diagram/  ★ el diagrama de mesa en SVG; ver abajo
    ├── shell/              barra con desplegables, menú de celular, Mi cuenta, pie
    └── features/
        ├── home/  catalog/  technique/  account/
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
  diagrama: su tamaño y sus `TableItem` (`id`, `legendNumber`, `cells`).
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
  número. Un objeto sin celda (la fuente no lo ubica) no se dibuja, y uno ubicado
  sin número se dibuja sin número. `piece-layout.ts` pone el círculo del número:
  en la esquina inferior derecha de la celda si el objeto ocupa una, y a un lado
  de la línea que une su primera y su última celda si ocupa varias. El círculo
  (`noche` al 72 %) mide lo mismo en pantalla a cualquier ancho de la mesa: un
  `ResizeObserver` mide el dibujo y fija `--number-scale`. Todavía no se dibuja el
  instrumental; eso, la leyenda y las variantes llegan con las demás casillas de
  la fase 3.

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
| `/tecnicas/:id/:pestana` | `tecnica.html` | público; instrumental y mesas con puerta de cuenta | `GET /techniques/{id}`, `GET /techniques/{id}/instruments` |
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
«Revisar versión») hasta que su pantalla ponga el nombre real. El router
(`provideAppRouter`, en `core/router/`) tiene `anchorScrolling`: los enlaces de la
barra y del pie a `/#camino`, `/#investigacion`, `/#preguntas` y `/#quien` bajan a
esa sección del inicio, también desde otra página y al tocar de nuevo el mismo
enlace. Cada sección del inicio lleva `scroll-margin-top: var(--size-navbar)` para
no quedar bajo la barra fija. Mientras una
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
  es `true` no se muestra ni lo uno ni lo otro. El panel se cierra si la sesión
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
lleva `inFooter: false` en `nav-menus.ts`); la política de datos se suma con su
página (fase 5). Las especialidades las da `Specialties` (`GET /specialties`,
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
shell lo usa para no mostrar «Ingresar» un instante a quien sí tiene sesión), y
si la API no responde o da 401, queda como visitante. Solo el 401 es
definitivo: si la API no respondió (sin conexión o un 5xx en un arranque en
frío), el próximo `load()` —el de un guard, por ejemplo— vuelve a preguntar.
Ingresar, salir o `clear()` también ponen `loaded()` en `true`, y una respuesta
tardía de `GET /auth/me` no pisa un ingreso hecho mientras tanto.

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
