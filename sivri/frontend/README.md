# Frontend de SIVRI

Aplicación web en Angular que usa el estudiante en el celular: abre la cámara,
manda cuadros al backend de SIVRI por un WebSocket y le dice qué está en su
lugar, qué mover y qué falta. En el computador, la misma app solo explica y lleva
al celular. Código bajo la licencia AGPL-3.0 de [`../LICENSE`](../LICENSE); puede
usar código MIT del repo (`shared/shell/`, `shared/design/`).

Este README dice cómo está hecho y cómo se corre. El avance está en
[`../docs/checklist-frontend.md`](../docs/checklist-frontend.md). Qué hace SIVRI y
por qué (alcance, qué es una mesa correcta, cómo se valida) está en
[`../README.md`](../README.md); el contrato con el backend, en
[`../backend/README.md`](../backend/README.md), «Para quien hace el frontend».

Fuentes:

- Diseño: [`DESIGN.md`](../../DESIGN.md), «SIVRI: celular y computador (mockups)»,
  que manda sobre cualquier otra sección para SIVRI. Mockups en el Figma del
  proyecto (archivo `jHEduZTQNBs4CCJEWB8u5v`, sección «SIVRI · Mockups», ronda 2).
- Cómo se habla con DataIQ (sesión, proxy, encabezados):
  [`dataiq/README.md`, «Cómo lo usa el frontend»](../../dataiq/README.md#cómo-lo-usa-el-frontend).
- El frontend de SIMIQ3D, del que se toman las convenciones:
  [`simiq3d/frontend/README.md`](../../simiq3d/frontend/README.md).

## Decisiones

Decididas por Juan el 2026-11-22.

| Decisión | Detalle |
|---|---|
| Tecnología | Angular 22, como el shell y SIMIQ3D: componentes standalone, signals, sin `zone.js`, TypeScript 6, Vitest, SCSS. SPA sin SSR, sitio estático en Vercel |
| Dónde se sirve | Bajo `/sivri/` (`baseHref`) en el mismo origen que el shell, para usar la misma cookie de sesión. Puerto de desarrollo 4400 |
| Computador o celular | `(hover: hover) and (pointer: fine)` es un computador: la entrada explica y muestra la dirección con un código QR, y la ruta de la cámara vuelve a la entrada. No hay camino a la cámara del computador, que no ve la mesa desde arriba |
| Qué pide cuenta | La entrada y la página del computador son públicas; la cámara pide cuenta (`sessionGuard` → ingreso del shell con `?volver=`) |
| Código QR | SVG estático (`public/qr-sivri.svg`) generado una vez con `https://dataiq-frontend.vercel.app/sivri`, sin librería en el código que baja el navegador. Si cambia la dirección, hay que generarlo de nuevo |
| Cuándo se compara la mesa | «Ya armé la mesa» se activa con los cuatro marcadores a la vista. Al pulsarlo, el resultado se fija cuando la misma técnica sale primera en 5 resultados seguidos; si la mesa se deja de ver 3 segundos, se vuelve a encuadrar |
| Qué se manda | El cuadro completo desde un `canvas`, JPEG de calidad 0,75 y 640 px de lado mayor (45 kB y 248 ms de mediana por Tailscale Funnel, medido en el Servidor PC1), 2,5 por segundo (uno cada 400 ms) y uno a la vez |
| Dónde se dibuja | Mientras se encuadra y se arma, sobre el video, con la demora del resultado. El resultado fijado, sobre el cuadro que se mandó (guardado por `frame_number`), no sobre el video de ahora |
| Mientras arma | Cada instrumento lleva su nombre en Martian Mono, sin caja ni color |
| Pieza por mover | Caja y etiqueta en `alerta-noche` y una flecha punteada en la dirección de `move`, girada con la mesa según los marcadores. El destino exacto no lo da el backend |
| Pieza que falta | Solo en la lista: el backend no da la caja esperada. Pedirla cambia el contrato y lo decide Mauricio |
| Dos técnicas muy cerca | «Puede ser una de dos.», con las dos y su porcentaje; «Ver dónde va» desactivado hasta que una gane |
| Grupo «Sobra» | Después de «Falta», con el mismo estilo; no se muestra si está vacío |
| Marcadores para imprimir | «Descargar los marcadores (PDF)» enlaza a `marcadores-aruco.pdf`, en la carpeta de SIVRI, en recursos, del Drive del proyecto (`src/app/links.ts`) |
| Sin verde en el contenido | El tema (`src/styles/theme.scss`) cambia el acento a tinta solo dentro de `.content`; la barra conserva su verde |
| Presupuesto | Código inicial: aviso a los 300 KB y error a los 500 KB; cada componente, aviso a los 4 KB y error a los 8 KB de estilo. Medido: 339,8 kB, con la barra compartida (ver la checklist) |
| Estado | Servicios con signals. Sin NgRx |
| Sesión y seguridad | La cookie `HttpOnly` de DataIQ; la cuenta sale de `GET /api/dataiq/auth/me`. `X-IQ-Client: web` en las peticiones a DataIQ; CSP estricta, sin `innerHTML` con datos de las APIs |

## Arquitectura

Solo `data/` sabe que existe HTTP o un WebSocket; `domain/` es lógica pura, sin
Angular, y es lo que se prueba más a fondo.

```
src/
├── shared-shell            enlace a shared/shell/ (la barra del shell)
├── styles/                 theme.scss: el tema de SIVRI sobre shared/design/
├── environments/           URL del shell, del backend de SIVRI y la pública
└── app/
    ├── core/
    │   ├── http/           bases, interceptores (X-IQ-Client y 401 solo para DataIQ)
    │   ├── session/        SessionService, sessionGuard, notDesktopGuard, ModuleTokenService
    │   └── layout/         Layout: la cámara va sin la barra del shell
    ├── domain/             lectura del resultado, marcadores, geometría y recorrido
    ├── data/               repositorio de DataIQ, mensajes del WebSocket y su cliente
    ├── camera/             cámara, captura del cuadro, ritmo de envío y cuadros mandados
    ├── check/              CheckService (une todo), la página de la cámara y sus paneles
    ├── entry/              la entrada (celular y computador)
    ├── shell/              el adaptador de la barra compartida
    ├── ui/                 botón, enlace con flecha, grupo y pie
    └── shared/             media queries
```

**Reglas de dependencia:** `check` usa `camera`, `data`, `domain` y `core`; `camera`
y `data` no usan `check`; `domain` no usa nada de Angular ni de las APIs.

### El recorrido (`domain/flow.ts`)

Una máquina de estados pura: permiso → encuadrar → armar → resultado → pieza por
mover → revisar de nuevo, más los estados de error. `reduce(estado, evento)` no
toca la cámara ni la red; `CheckService` le avisa lo que pasa (cámara abierta,
resultado de un cuadro, conexión perdida…) y deja la cámara, la conexión y el
envío como los pide el estado (`shouldShowCamera`, `shouldSendFrames`).

- Con el resultado fijado se apagan la cámara y la conexión: el resultado se queda
  sobre el cuadro que se mandó y no se gastan datos.
- Los dudosos (`doubtful`) cuentan como en su lugar y no se marcan.
- Lo que hay que corregir se recorre en el orden por mover, falta y sobra, cada
  grupo por el número del diagrama.
- La frase de cada pieza es la del backend (`message`), sin repetir el nombre y
  el número, que ya van de título.

### Cámara y conexión

- **Cámara** (`camera/camera.service.ts`): `getUserMedia` con la cámara trasera
  (`facingMode: 'environment'`). `NotAllowedError` es «cámara bloqueada»; lo demás
  (sin cámara, otra app la usa, sin `mediaDevices` fuera de HTTPS) es «equipo sin
  cámara». Se apaga al salir de la pantalla y al ocultarse la pestaña, y vuelve
  sola.
- **Token corto** (`core/session/module-token.service.ts`): `POST
  /api/dataiq/auth/module-token` con la cookie, una petición a la vez, reutilizado
  mientras le quede más de un minuto de los 5 que dura. Un 401 es que la sesión
  terminó.
- **WebSocket** (`data/validation-connection.ts`): el primer mensaje es
  `{"token": …}`; cada cuadro, un mensaje binario, contado al enviarlo (el primero
  de cada conexión es el 1). El token se renueva por la misma conexión. Los errores
  de un cuadro (`invalid_image`, `too_large`, `catalog_unavailable`) no cortan.
  Si se corta, reconecta esperando 1, 2, 4, 8 y 15 segundos (o ya, si el
  navegador avisa que volvió la red), y la cuenta de cuadros vuelve a 1. Un cierre
  4401 se reintenta una vez con un token nuevo; un segundo 4401 seguido es sesión
  terminada. 4404 es «técnica fuera del alcance».
- **La dirección del backend** va directa y no por el mismo origen, porque Vercel
  no pasa WebSockets (`environments/`). Por eso `X-IQ-Client` solo se manda a
  DataIQ: el CORS de SIVRI solo admite `Authorization` y `Content-Type`, y un 401
  de SIVRI es un token rechazado, no la sesión.

### Rutas

Relativas a `/sivri/`.

| Ruta | Qué muestra | Cuenta |
|---|---|---|
| `/sivri` | La entrada: en el celular, qué hace falta y «Abrir la cámara»; en el computador, la dirección y el código QR | No |
| `/sivri/camara` | La cámara: encuadrar, armar, resultado y pieza por mover, sin la barra del shell. `?tecnica=<id de DataIQ>` valida esa técnica en vez de reconocerla | Sí; desde un computador vuelve a la entrada |

Es el destino de «Comprobar con la cámara» de DataIQ, que lleva a `/sivri/`.

### Errores

Cada uno es una página de texto con titular, párrafo y una acción, con la barra
del shell (`check/error-page/error-copy.ts`):

| Estado | Cuándo | Acción |
|---|---|---|
| Sin conexión | El WebSocket se corta o el navegador avisa que no hay red | Intentar de nuevo |
| Cámara bloqueada | El estudiante no dio el permiso | Ya la permití |
| Equipo sin cámara | No hay cámara, otra app la usa o no es HTTPS | Intentar de nuevo |
| Sesión vencida | 401 de DataIQ o dos cierres 4401 seguidos | Ingresar |
| Técnica fuera del alcance | Cierre 4404 | Revisar de nuevo, o ver las técnicas en DataIQ |
| Técnica no reconocida | La mesa se ve (`board_found`) pero `recognized` es `false` | Revisar de nuevo |

Los errores HTTP de las APIs (401 a DataIQ → ingreso del shell) son como en
SIMIQ3D.

## Correr el frontend

Hace falta Node.js y el backend de DataIQ corriendo (ver
[`dataiq/README.md`](../../dataiq/README.md)). Todo se corre desde `sivri/frontend`:

```sh
npm install
npm start          # http://localhost:4400/sivri/
npm test           # Vitest
npm run build      # producción, con los presupuestos de angular.json
npm run api:types  # tipos de DataIQ y de SIVRI, tras cambiar una ruta o un esquema
```

`npm run api:types` necesita `uv` (el de los backends), pero no que estén
corriendo. Los tipos generados se versionan y se suben en el mismo PR que cambia
el backend. Los mensajes del WebSocket no salen en OpenAPI: sus tipos están
escritos a mano en `src/app/data/socket-messages.ts`.

`proxy.conf.json` manda `/api/dataiq` a `http://127.0.0.1:8000`. El backend de
SIVRI se llama directo (`http://127.0.0.1:8002` y `ws://127.0.0.1:8002/ws/validate`,
`src/environments/`), y su `CORS_ORIGINS` tiene que incluir
`http://localhost:4400`.

La cámara solo abre con HTTPS o en `localhost`. En el computador se puede probar
todo el recorrido con el backend en `DETECTOR=fake` y las detecciones de
`../backend/examples/` («Probar sin el modelo entrenado» del README del backend),
y la cámara falsa del navegador. En el celular, con el despliegue de vista previa.

Para entrar con una cuenta: la cookie de sesión no distingue puertos, así que
sirve la que deja el ingreso del shell en `localhost:4200`. En desarrollo el shell
no vuelve solo a `localhost:4400`: hay que volver a mano.

**En Windows** este clon tiene `core.symlinks=false`, así que `src/shared-shell`
es un archivo de texto con `../../../shared/shell` (guardado en Git como enlace,
modo 120000) y el build falla ahí. Para compilar y probar, se hace en una copia de
la carpeta con un junction en lugar del archivo (`fs.symlinkSync(destino, enlace,
'junction')`); al terminar, se quita el junction antes de borrar la copia, o se
borra `shared/shell`. En el CI (Linux) el enlace funciona solo.

## Despliegue

Un proyecto de Vercel aparte (`sivri-frontend`, en la cuenta de Mauricio) sirve la
app como sitio estático. El workflow
[`sivri-frontend.yml`](../../.github/workflows/sivri-frontend.yml) corre el build
y las pruebas en cada PR y, en cada push a `main` que toque el frontend o lo que
su build lee de fuera (`shared/design/`, `shared/shell/`), construye en GitHub
Actions y publica con el CLI de Vercel. Mientras `VERCEL_PROJECT_ID` del workflow
valga `POR_DEFINIR`, el despliegue se omite.

- **La ruta completa.** El proyecto del shell trae la app con un rewrite
  `/sivri/:path*` hacia `https://<proyecto de SIVRI>/sivri/:path*`
  (`dataiq/frontend/vercel.json`); por eso la app se publica dentro de `sivri/` y
  `vercel.json` manda a `sivri/index.html` toda ruta que no sea un archivo. El
  rewrite se agrega cuando el proyecto de Vercel exista y su dirección sea del
  equipo (decidido por Juan el 2026-11-23); hasta entonces `/sivri/` del shell
  muestra «No encontrada».
- **Encabezados.** Valen los del proyecto que responde: con el rewrite, el shell
  excluye `sivri` de los suyos. `vercel.json` pone `Permissions-Policy: camera=(self)` y una CSP
  con `connect-src 'self'` más la dirección `https://` y `wss://` del backend de
  SIVRI. Al cambiar la dirección del backend (`environments/`), se cambia también
  ahí. `img-src` admite `blob:` (el cuadro que se mandó) y `data:` (la textura de
  la funda); los scripts van sin `'unsafe-inline'`, y `style-src 'unsafe-inline'`
  es por los estilos de cada componente.
- **Caché.** El código y los estilos llevan un hash en el nombre: un año
  (`immutable`). `index.html` va sin caché, como lo deja Vercel.
- **Las APIs no pasan por este proyecto.** DataIQ se pide al dominio del shell
  (`/api/dataiq/*`) y SIVRI, directo a su servidor.
- **Licencia.** La interfaz lleva el enlace «Código fuente (AGPL-3.0)» a
  [`sivri/`](https://github.com/curn-iq/iq-platform/tree/main/sivri), el mismo de
  `GET /health`.
