# Frontend de DataIQ y del shell de IQ Platform

Aplicación web en Angular que reúne el **shell de navegación** del ecosistema
(inicio, catálogo, cuenta) y **DataIQ** (consulta y gestión de técnicas). SIVRI
y SIMIQ3D tienen su propio frontend; desde aquí solo se enlazan.

Este documento es la arquitectura acordada, el plan de implementación por
fases y el registro de lo que no cuadraba entre la documentación, los mockups
y la API. Se marca cada pieza al terminarla, como en
[`../docs/checklist-backend.md`](../docs/checklist-backend.md).

Fuentes que respaldan este plan:

- Producto: [`PRODUCT.md`](../../PRODUCT.md). Diseño visual: [`DESIGN.md`](../../DESIGN.md).
- Mockups: [`diseno/mockups/`](../../diseno/mockups/) y sus briefs en
  [`.impeccable/surfaces/`](../../.impeccable/surfaces/).
- Roles y flujos: [`docs/flujos.md`](../../docs/flujos.md).
- API: [`../backend/app/adaptadores/entrada/api/`](../backend/app/adaptadores/entrada/api/)
  (rutas y esquemas) y la documentación interactiva en `/docs` del backend.

## Decisiones

| Decisión | Detalle |
|---|---|
| Tecnología | Angular 22 (confirmado el 2026-10-11). Componentes standalone, signals, sin `zone.js`, TypeScript 6, pruebas con Vitest, estilos en SCSS |
| Alcance de la app | Shell + DataIQ en una sola aplicación, en `dataiq/frontend`. El shell queda aislado en `app/shell/` para poder separarlo si algún día hace falta |
| Idioma del código | **Inglés**, sin importar que el backend esté en español. La documentación y la interfaz van en español |
| Renderizado | SPA sin SSR, desplegada como sitio estático en Vercel |
| Carga | Cada sección se carga al visitarla (lazy loading); el inicio no arrastra la gestión. Presupuestos de `angular.json` activos (principio «Liviano» de `PRODUCT.md`) |
| Estado | Servicios con signals por funcionalidad. Sin NgRx |
| Lecturas | `httpResource` / `resource` (estables desde 22.0, verificado en la versión instalada) |
| Formularios | Signal Forms (estables desde 22.0, verificado en la versión instalada) |
| Caché HTTP | No se maneja `ETag` a mano: el navegador revalida solo con el `ETag` y el `Cache-Control` que manda la API |
| Componentes de interfaz | Propios, según `DESIGN.md`. Sin Angular Material. Solo Angular CDK: drag-drop (mesa del editor), overlay (desplegables y paneles) y a11y |
| Tipos de la API | Se generan del `/openapi.json` de FastAPI (p. ej. `openapi-typescript`) para que no se desfasen del backend |
| Sesión | El JWT se guarda en `localStorage` y viaja como `Authorization: Bearer`. El rol se lee de `GET /auth/yo`, nunca del token (el backend lo lee de la base en cada petición). Riesgo aceptado: XSS; se mitiga con una CSP estricta |
| Desarrollo local | `proxy.conf.json` hacia `http://127.0.0.1:8000`, así `ng serve` no depende de CORS |
| Producción | El backend habilita CORS para el dominio del frontend (decidido el 2026-10-11) |

## Arquitectura

Estructura por funcionalidad, con una separación ligera inspirada en la
arquitectura hexagonal del backend: la API (con sus nombres en español) solo
se conoce en `data/`; el resto de la app trabaja con modelos en inglés.

```
src/
├── styles/                 tokens.scss (traducción literal de DESIGN.md), tipografía, base, motion
├── environments/           URL de la API por entorno
└── app/
    ├── core/               servicios únicos de toda la app
    │   ├── http/           provideHttpClient(withFetch()), interceptores: token y errores
    │   └── session/        SessionService (signal con la cuenta), sessionGuard, roleGuard(min)
    ├── domain/             modelos y reglas puras, sin Angular: Role, hasAtLeast(),
    │                       VersionState, transiciones, avance por sección
    ├── data/
    │   ├── api/            tipos generados del OpenAPI (campos en español, tal cual)
    │   └── *.repository.ts un adaptador por recurso (techniques, versions, catalog, auth,
    │                       users) con su mapper: API en español → modelo en inglés
    ├── shared/
    │   ├── ui/             button, tabs con raya, segmented control, status pill,
    │   │                   progress mark (22 px), search field, demo tag, floating panel
    │   └── table-diagram/  ★ el diagrama de mesa en SVG (grilla, acero, números,
    │                       leyenda enlazada); ver abajo
    ├── shell/              barra con desplegables, menú de celular, Mi cuenta, pie
    └── features/
        ├── home/  catalog/  technique/  account/
        └── management/
            ├── drafts/  editor/  review/  instruments/  users/
```

**Reglas de dependencia**: `features` usa `data`, `domain`, `shared` y `core`;
`data` usa `domain`; `domain` no usa nada de Angular ni de la API. Ninguna
funcionalidad importa a otra.

**El diagrama de mesa es la pieza central.** Aparece en el detalle de técnica,
en la puerta de cuenta (vista previa recortada), en el editor (con arrastrar y
soltar), en la revisión (dos mesas lado a lado) y en el catálogo de
instrumental (miniatura). Se construye una sola vez, con variantes, antes que
las pantallas que lo usan.

### Glosario (dominio → código)

| Español (API y UI) | Inglés (código) |
|---|---|
| técnica, especialidad | technique, specialty |
| versión; borrador, en revisión, publicada, reemplazada, archivada | version; draft, in review, published, superseded, archived |
| mesa de Mayo, mesa de reserva, zona | Mayo stand, back table, zone |
| celda (fila, columna) | cell (row, column) |
| objeto de la mesa (`ItemTecnica`), componente | item, component |
| número de leyenda | legend number |
| instrumental, alias, categoría | instrument, alias, category |
| sutura, equipo biomédico, dispositivo médico | suture, biomedical equipment, medical device |
| usuario, colaborador, revisor, admin | user, contributor, reviewer, admin |
| rechazo (motivo) | rejection (reason) |

### Rutas

Las URL son parte de la interfaz, por eso van en español aunque el código
esté en inglés (confirmado el 2026-10-11).

| Ruta | Mockup | Acceso | API |
|---|---|---|---|
| `/` | `inicio.html` | público | `GET /tecnicas` |
| `/tecnicas?especialidad=` | `catalogo.html` | público | `GET /tecnicas` |
| `/tecnicas/:id/:pestana` | `tecnica.html` | público; instrumental y mesas con puerta de cuenta | `GET /tecnicas/{id}`, `GET /tecnicas/{id}/instrumental` |
| `/cuenta/ingresar`, `/cuenta/crear` (`?volver=`) | `cuenta.html` | público | `POST /auth/login` (form-urlencoded, correo en `username`), `POST /auth/registro`, `GET /auth/yo` |
| `/gestion/borradores` | `borradores.html` | colaborador o más | `GET /versiones`, `POST /tecnicas`, `POST /tecnicas/{id}/versiones` |
| `/gestion/editor/nueva`, `/gestion/editor/:versionId/:paso` | `editor.html` | colaborador o más | `GET`/`PUT /versiones/{id}`, `POST .../enviar`, `POST .../publicar`, `GET /catalogo/completo` |
| `/gestion/revision`, `/gestion/revision/:versionId` | `revision.html` | revisor o más | `GET /versiones`, `GET /versiones/{id}`, `POST .../aprobar`, `POST .../rechazar` |
| `/gestion/instrumental/:id?` | `instrumental.html` | revisor o más | `GET`/`POST /instrumental`, `PATCH /instrumental/{id}`, `GET /catalogo/completo` |
| `/gestion/usuarios` | `usuarios.html` | admin | `GET /usuarios`, `PATCH /usuarios/{id}/rol` |

La técnica va por su `id` (UUID): la API no tiene slug (el mockup usa
`#tec-<slug>`). Al iniciar sesión se vuelve a la ruta de `?volver=`. Un 401
cierra la sesión y lleva a `/cuenta/ingresar?volver=<ruta actual>`.

## Plan de implementación por fases

Cada fase lleva sus pruebas al hacerla; no hay una etapa de pruebas al final.
Una fase está lista cuando pasa `ng build` (con los presupuestos) y `ng test`,
y se ve bien a 1310 px y a 390 px.

### Fase 0 — Base del proyecto

- [ ] `index.html` en español (`lang="es"`, título) y nombre del proyecto
- [ ] `styles/`: tokens, tipografía (Host Grotesk y Martian Mono de Google Fonts), base y motion desde `DESIGN.md`, con `prefers-reduced-motion`
- [ ] `environments/` con la URL de la API y `proxy.conf.json` para desarrollo
- [ ] Generar los tipos de la API desde `/openapi.json` (script de npm)
- [ ] Instalar Angular CDK

### Fase 1 — Núcleo

- [ ] `domain/`: `Role` y `hasAtLeast()`, `VersionState` y transiciones permitidas, modelos de técnica, versión, mesa e instrumento
- [ ] `data/`: repositorios con sus mappers (API en español → modelo en inglés)
- [ ] `core/http`: `provideHttpClient(withFetch())`, interceptor de token e interceptor de errores (401, 403, 409, 422 con la lista de problemas de `ContenidoInvalido`)
- [ ] `core/session`: `SessionService` (token, cuenta de `/auth/yo`, cerrar sesión), `sessionGuard` y `roleGuard(min)` con `?volver=`

### Fase 2 — Shell

- [ ] Esqueleto de rutas con carga diferida
- [ ] Barra: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda; un desplegable a la vez (CDK overlay), Escape y clic fuera
- [ ] Menú de celular a pantalla completa (≤ 960 px)
- [ ] Ingresar / Crear cuenta o «Mi cuenta» con los accesos de gestión según el rol
- [ ] Pie oscuro
- [ ] SIVRI y SIMIQ3D como enlaces externos (ver «Sesión entre módulos»)

### Fase 3 — Diagrama de mesa (`shared/table-diagram`)

- [ ] Grilla desde las celdas de los objetos; un objeto en varias celdas es uno solo, con un número
- [ ] Instrumental en acero y objetos planos; leyenda enlazada (señalar un número levanta la pieza y atenúa las demás)
- [ ] Hueco «Sin dato» para un número que la fuente no deja leer
- [ ] Variante de vista previa (recortada, sin números ni leyenda) para la puerta de cuenta
- [ ] Variante miniatura (celdas de 22 px) para el catálogo de instrumental

### Fase 4 — Páginas públicas

- [ ] Inicio (`inicio.html`)
- [ ] Catálogo de técnicas: filtro por especialidad, buscador sin tildes con resaltado, lista agrupada, estado vacío
- [ ] Detalle de técnica: columna de técnicas, pestañas Datos clínicos / Instrumental / Mesa de Mayo / Mesa de reserva
- [ ] Puerta de cuenta sin sesión: vista previa real y tarjeta que no revela si a la técnica le falta una mesa
- [ ] «Ver en 3D» y «Comprobar con la cámara» llevan a la cuenta sin sesión

### Fase 5 — Cuenta

- [ ] Ingresar y Crear cuenta en una pantalla, con la técnica que se quería abrir a la izquierda o el saludo según la hora
- [ ] Registro con la aceptación de la política obligatoria (Decreto 1377)
- [ ] Volver a `?volver=` al ingresar; al catálogo si se entró directo

### Fase 6 — Gestión del colaborador

- [ ] Mis borradores: matriz de avance por sección, filtros, comentario de la devolución (`rechazos`)
- [ ] «Nueva técnica» y «Editar una publicada» (un 409 dice que ya hay una versión en curso)
- [ ] Editor de 5 pasos con autoguardado (`PUT /versiones/{id}` con debounce; reemplaza todo el contenido)
- [ ] Paso de instrumental: sugeridos de la especialidad y catálogo completo
- [ ] Pasos de mesa: arrastrar a la celda (CDK drag-drop) o tocar celda → elegir objeto; contador de filas y columnas
- [ ] Revisar y enviar (colaborador) / Revisar y publicar (revisor o admin) con confirmación en la misma tarjeta
- [ ] Desde el detalle: «Editar técnica» / «Continuar borrador» según el rol y la versión en curso

### Fase 7 — Gestión del revisor

- [ ] Por revisar: lista de versiones `en_revision` ajenas
- [ ] Revisión: publicada y propuesta lado a lado por sección, con los cambios calculados en el cliente
- [ ] Aprobar y publicar (409 si otro revisor ya decidió) y Devolver con motivo
- [ ] Archivar técnica desde «Más acciones» del detalle (no con una versión en curso)
- [ ] Catálogo de instrumental: índice por categoría, búsqueda por nombre o alias, «Dónde va», crear y editar en su sitio

### Fase 8 — Gestión del admin

- [ ] Usuarios y roles: personas por rol, buscador, ficha con cambio de rol confirmado
- [ ] La cuenta propia no cambia su rol (el backend responde 409)

### Fase 9 — Despliegue (Corte 3)

- [ ] `vercel.json`: reescritura de rutas a `index.html` y cabeceras de seguridad (CSP)
- [ ] GitHub Actions: build, pruebas y despliegue con Vercel CLI (el plan Hobby no conecta repos de organizaciones)
- [ ] URL de la API de Cloud Run por entorno y su dominio en el CORS del backend

### Dependencias del backend

Trabajo que no es del frontend pero lo bloquea. Se coordina con quien lleva el
backend; los cambios de esquema también se reflejan en el Drive (regla 4 de
`CLAUDE.md`).

- [ ] `CORSMiddleware` con los orígenes permitidos por variable de entorno (`localhost:4200` y el dominio de Vercel). Bloquea la fase 9
- [ ] Tamaño de cada mesa por versión (filas × columnas) en el esquema y en la API. Bloquea el contador de la fase 6
- [ ] Completar Swagger (pieza 8 de la checklist del backend). Mejora los tipos generados
- [ ] Lo que se decida en «Por confirmar»

## Lo que no cuadraba

### Resuelto

| # | Qué no cuadraba | Decisión (2026-10-11) | Pendiente |
|---|---|---|---|
| 1 | La documentación decía «frontend por definir, candidato Svelte» (`CLAUDE.md`, `README.md`, `dataiq/README.md`, `PRODUCT.md`) | Angular, confirmado | Hecho: los cuatro archivos ya dicen Angular |
| 2 | `CLAUDE.md` decía que la ubicación de la capa de navegación estaba por definir | Shell y DataIQ en una sola app, en `dataiq/frontend` | Hecho: «Capa de navegación» y la estructura de `CLAUDE.md` |
| 3 | El backend está en español | El código del frontend va en inglés; `data/` traduce la API | Hecho: anotado en `CLAUDE.md` |
| 4 | El backend no tiene CORS (`dataiq/backend/app/main.py`) | Se habilita CORS en el backend | Ver «Dependencias del backend» |
| 5 | `PRODUCT.md` decía que los datos clínicos no estaban en la base; `semilla/cargar.py:102-105` sí los carga | La base está cargada (verificado) | Hecho: `PRODUCT.md` corregido |
| 6 | `docs/flujos.md:26` decía que el admin lo asigna «solo Mauricio»; `CLAUDE.md` dice que el admin es el equipo operativo | El admin es el equipo operativo del proyecto (verificado) | `docs/flujos.md` corregido. Falta su versión visual (Artifact enlazado en ese archivo) |
| 7 | El editor permite cambiar filas y columnas de la mesa, pero el esquema no guarda el tamaño de la mesa | Se mantiene: en la práctica hay bandejas de Mayo de varios tamaños | Cambio de esquema y API (ver «Dependencias del backend») |
| 8 | No se sabía si `httpResource` y Signal Forms eran estables en Angular 22 | Son `@publicApi 22.0` en la versión instalada (22.2.2): se usan | — |
| 9 | Las URL en español con el código en inglés | Las URL van en español: son parte de la interfaz | — |

### Por confirmar

| # | Qué no cuadra | Dónde | Opciones |
|---|---|---|---|
| 1 | **Sesión entre módulos.** Si SIVRI y SIMIQ3D tienen su frontend en otro dominio, el token en `localStorage` no les llega. Ningún documento dice cómo se pasa la sesión | `docs/flujos.md` §5 | Mismo dominio con rutas (reescrituras de Vercel) o pasar el token al abrir el módulo. Se deja como apunte |
| 2 | **Autoría.** `CLAUDE.md:26-27` dice que el ecosistema es el proyecto de grado de Mauricio; el proyecto es de los tres integrantes de ING | `CLAUDE.md:26-27` | Se corrige en otro momento |
| 3 | «Esta técnica no lleva mesa de reserva» (editor) no está en el esquema | `editor.html`, `esquema.dbml` | Guardarlo en la base o inferirlo de que no haya objetos en esa zona |
| 4 | `ItemSalida` devuelve `zona` como nombre, pero `ItemEntrada` pide `zona_id`; el editor tiene que traducir por nombre | `api/esquemas.py` | Que la API devuelva también `zona_id` |
| 5 | La revisión del mockup comenta por sección y por celda; el autor deja una nota al enviar. La API solo guarda un `motivo` de texto al rechazar, y `enviar` no recibe cuerpo | `revision.html`, `rutas/versiones.py` | Ampliar la API, o en el MVP juntar los comentarios en el motivo y quitar la nota del autor |
| 6 | «Revisadas por mí»: no hay forma de filtrar por revisor (`mias` filtra por autor) | `revision.html`, `rutas/versiones.py` | Ampliar la API o quitar la pestaña en el MVP |
| 7 | El catálogo de instrumental edita alias, pero `PATCH /instrumental/{id}` no los recibe | `instrumental.html`, `api/esquemas.py` | Ampliar la API o dejar los alias de solo lectura |
| 8 | «Dónde va» (técnicas que usan un instrumento) no tiene endpoint | `instrumental.html` | Calcularlo en el cliente con `/catalogo/completo` o pedir un endpoint |
| 9 | Usuarios: suspender e historial de roles quedan para después del MVP; la ficha muestra registro y política aceptada, que `CuentaSalida` no trae | `usuarios.html`, `docs/despues-del-mvp.md` | Ocultarlos en el MVP o ampliar `CuentaSalida` |
| 10 | «Continuar con Google» no tiene endpoint ni decisión documentada; «¿Olvidaste tu contraseña?» queda para después del MVP | `cuenta.html`, `docs/despues-del-mvp.md` | Ocultarlos en el MVP o decidir el ingreso con Google |
| 11 | El detalle muestra técnicas archivadas a un revisor, pero `GET /tecnicas` y `GET /tecnicas/{id}` solo devuelven publicadas | `tecnica.html`, `rutas/tecnicas.py` | Ampliar la API o no mostrar archivadas en el MVP |
| 12 | No hay endpoint público de especialidades. El catálogo puede sacarlas de `GET /tecnicas`, pero el editor necesita `especialidad_id` (solo en `/catalogo/completo`, que pide cuenta) | `rutas/catalogo.py` | Usar `/catalogo/completo` en la gestión o pedir `GET /especialidades` |
| 13 | Mis borradores y el editor marcan cada sección como completa o pendiente, y bloquean el envío mientras falte algo; el backend no define cuándo una sección está completa (`validar_contenido` solo revisa coherencia) | `borradores.html`, `editor.html`, `dominio/tecnicas.py` | Definir la regla con IQ y decidir si vive solo en el frontend o también en el backend |
| 14 | «Para qué sirve» va como texto de demostración en el mockup; no está claro si corresponde a `descripcion` ahora que la base tiene datos clínicos | `tecnica.html`, `api/esquemas.py` | Confirmar con IQ |
| 15 | Un colaborador no puede saber si otra persona tiene una versión en curso de una técnica (solo lista las suyas); el mockup muestra «En curso por …» | `tecnica.html`, `rutas/versiones.py` | En el MVP, mostrar el 409 al intentar editar |

## Correr el frontend

Hace falta Node.js y el backend corriendo (ver [`../README.md`](../README.md)).
Todo se corre desde `dataiq/frontend`:

```sh
npm install
npm start      # http://localhost:4200
npm test       # Vitest
npm run build  # producción, con los presupuestos de angular.json
```

El proxy hacia la API (`proxy.conf.json`) llega en la fase 0; mientras tanto,
el navegador bloquea las peticiones al backend por CORS.
