<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../design/brand/modules/dataiq-frontend-dark.svg">
    <img src="../../design/brand/modules/dataiq-frontend.svg" alt="DataIQ, FrontEnd" width="225">
  </picture>
</p>

Aplicación web en Angular que reúne el **shell de navegación** del ecosistema
(inicio, catálogo, cuenta) y **DataIQ** (consulta y gestión de técnicas). SIVRI
y SIMIQ3D tienen su propio frontend; desde aquí solo se enlazan. SIVRI es
AGPL-3.0 ([`sivri/README.md`](../../sivri/README.md)): esta app (MIT) no
importa código de `sivri/`. En producción: <https://dataiq-frontend.vercel.app>.

## Stack

- Angular 22: componentes standalone, signals, sin `zone.js`, TypeScript 6 y
  SCSS; solo Angular CDK, sin Angular Material.
- SPA sin SSR, desplegada como sitio estático en Vercel.
- Tipos de la API generados del `/openapi.json` del backend (`openapi-typescript`).
- Pruebas con Vitest.

## Correrlo

Hace falta Node.js y el backend corriendo (ver [`../backend/README.md`](../backend/README.md#correrlo)).
Todo se corre desde `dataiq/frontend`:

```sh
npm install
npm start          # http://localhost:4200
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
corriendo, pero sí `uv` (ver [`../backend/README.md`](../backend/README.md#correrlo)). El archivo se
versiona, para que el build no necesite el backend; cuando cambie una ruta o un
esquema de la API, se regenera y se sube en el mismo PR. El CI
([`dataiq-frontend.yml`](../../.github/workflows/dataiq-frontend.yml)) lo
regenera en cada PR que toque el backend o el frontend y falla si no coincide
con el que se subió. `openapi-typescript`
declara TypeScript 5 como peer, y el proyecto usa TypeScript 6: el `overrides` de
`package.json` lo resuelve solo para ese paquete.

Para probar cada rol hay una cuenta de desarrollo por rol, solo en la base
local: cuáles son y cómo se crean, en
[`../backend/README.md`, «Correrlo»](../backend/README.md#correrlo).

## Pruebas

```sh
npm test       # Vitest
npm run build  # producción, con los presupuestos de angular.json
```

## Despliegue

El proyecto de Vercel `dataiq-frontend` (cuenta de Mauricio, plan Hobby) sirve
la app como sitio estático en https://dataiq-frontend.vercel.app. El workflow
[`dataiq-frontend.yml`](../../.github/workflows/dataiq-frontend.yml) corre el
build, las pruebas y la revisión de los tipos en cada PR y, en cada push a
`main` que toque el frontend o lo que su build lee de fuera, construye en
GitHub Actions y publica con el CLI de Vercel. Vercel no la construye, porque
el build lee `../../shared/design/`, `../../shared/shell/` (la barra) y
`../../docs/privacidad.md`, que están fuera de esta carpeta.

- **Un solo origen** (`vercel.json`). El navegador pide todo a este dominio, y
  así la cookie de sesión llega a las APIs sin CORS:
  - `/api/dataiq/*` va a `https://dataiq-backend.vercel.app/*` y
    `/api/simiq3d/*` a `https://simiq3d-backend.vercel.app/*`, sin el prefijo,
    como `proxy.conf.json` en local;
  - `/simiq3d/*` va a `https://simiq3d-frontend.vercel.app/simiq3d/*`, con la
    ruta completa (Resuelto 17 de la
    [checklist](../docs/checklist-frontend.md#resuelto)). `/simiq3d/`, el
    enlace del shell, tiene su propia regla: `/simiq3d/:path*` no lo reconoce
    con la barra final y sin nada después;
  - el resto, a `index.html`. Un archivo que existe se sirve antes de cualquier
    rewrite.
  - `/sivri/*` va a `https://sivri-frontend.vercel.app/sivri/*` (el proyecto
    de SIVRI, en la cuenta de Juan), con la ruta completa y con su propia regla
    para `/sivri/`, como `/simiq3d`. El rewrite apunta solo a una dirección
    que ya es de un proyecto del equipo: una
    sin dueño entregaría en este origen lo que publique quien la registre, con
    la cookie de sesión. Su ruta se excluye de los encabezados de esta app
    (`/((?!api/|simiq3d|sivri).*)`): los que valen son los del proyecto que
    responde, y esta app lleva `Permissions-Policy: camera=()` y un CSP sin el
    backend de SIVRI, que le quitarían la cámara y el video continuo.
- **CSP** (`vercel.json`): todo sale de este mismo origen, salvo las fuentes de
  `fonts.gstatic.com`, porque el build incrusta el CSS de Google Fonts. Las
  excepciones:
  - `style-src 'unsafe-inline'`: Angular pone los estilos de cada componente
    en un `<style>`, y un sitio estático no puede firmarlos con un nonce;
  - `img-src data:`: la textura de tela de los tokens.

  Los scripts van sin `'unsafe-inline'`. Por eso el build de producción no
  incrusta el CSS crítico (`inlineCritical: false` en `angular.json`): esa
  optimización agrega un manejador `onload` en línea.

  Los encabezados no se aplican a `/api/` ni a `/simiq3d`, que traen los suyos.
  Si una respuesta lleva dos CSP, el navegador aplica las dos, y esta
  bloquearía el WebAssembly de SIMIQ3D.
- **Caché.** El código y los estilos llevan un hash en el nombre, así que se
  guardan un año (`immutable`). `index.html` va sin caché, como lo deja
  Vercel. Las respuestas de las APIs traen su propio `Cache-Control` y `ETag`.
- **Tiempo de espera.** Vercel espera hasta 120 segundos a que el destino de un
  rewrite empiece a responder
  ([changelog de Vercel](https://vercel.com/changelog/cdn-origin-timeout-increased-to-two-minutes)).
  El chat de SIMIQ3D corta el modelo de lenguaje a los 60 segundos
  (`llm_timeout`) y responde con las plantillas.

## Estructura

```
frontend/
├── public/        imágenes de «Nosotros» y de la marca, y el favicon
├── scripts/       generación de los tipos de la API
└── src/
    ├── styles/        el tema de DataIQ sobre los tokens de shared/design/
    ├── shared-shell/  enlace a la barra compartida de shared/shell/
    └── app/
        ├── core/      sesión, interceptores y títulos
        ├── data/      la única capa que habla con la API
        ├── domain/    reglas puras de la interfaz
        ├── features/  una carpeta por sección (inicio, catálogo, técnica, cuenta, gestión…)
        ├── shared/    componentes compartidos (diagrama de la mesa, avisos…)
        └── shell/     la barra y el pie del shell
```

## Más documentación

- Qué es DataIQ: [`../README.md`](../README.md).
- Decisiones y arquitectura por dentro (secciones, rutas, barra, errores, sesión):
  [`../docs/frontend.md`](../docs/frontend.md).
- Cómo se habla con la API (sesión, proxy, encabezados):
  [`../backend/README.md`, «Cómo lo usa el frontend»](../backend/README.md#cómo-lo-usa-el-frontend).
- Sistema de diseño: [`design/README.md`](../../design/README.md); las pantallas,
  en el [Figma del proyecto](https://www.figma.com/design/jHEduZTQNBs4CCJEWB8u5v/).
- Roles y flujos: [`docs/flujos.md`](../../docs/flujos.md).
- Avance por fases: [`../docs/checklist-frontend.md`](../docs/checklist-frontend.md).
