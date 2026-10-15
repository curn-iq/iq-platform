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
| Datos | La mesa, sus objetos y la descripción de cada instrumento salen **directo de DataIQ** (`/api/dataiq`). El backend de SIMIQ3D solo responde el chat (la acción elegida) y el mapeo de cada modelo 3D a su instrumento |
| Modelos 3D | GLB comprimidos con **meshopt** (`gltfpack`); el decodificador pesa unos 20 KB. Se sirven como archivos estáticos con caché |
| Sistema visual | Dos capas: tokens base compartidos en `shared/design/` (raíz del repo) y el tema de SIMIQ3D en `src/styles/theme.scss`, que puede cambiar lo que necesite. Todo color nuevo se anota en `DESIGN.md` |
| Sin conexión | No en el MVP: la caché HTTP guarda la app y los modelos después de la primera visita (ver `docs/despues-del-mvp.md`) |
| Presupuesto | Código inicial: aviso a los 300 KB, error a los 500 KB. Cada GLB por debajo de 150 KB |
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
    └── explore/            la pantalla: chat + visor (rutas / y /tecnicas/:id)
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
En código: la cuadrícula de la técnica (`zones`: `rows` × `columns`) se
reparte en partes iguales sobre la mesa a su tamaño real; cada objeto va con
su centro en el centro de sus celdas (si ocupa varias, el centro de todas).
Unidades en metros, el eje Y hacia arriba, las columnas sobre X y las filas
sobre Z. Solo la mesa de Mayo (alcance del MVP).

### Modelos 3D

```
simiq3d/models/                  la fuente (la llenan quienes modelan)
├── <familia>.blend              una base por familia
├── <instrumento>.glb            exportado de Blender, sin comprimir
└── medidas.md                   medidas de cada instrumento, con su fuente
        │  npm run models (gltfpack, meshopt)
        ▼
simiq3d/frontend/public/models/  lo que se publica (generado, no se versiona)
```

Las convenciones de cada modelo (escala real, origen en el centro, eje largo
sobre +X, un GLB por instrumento con nombre en inglés) están en
[`../README.md`, «Modelos 3D»](../README.md#modelos-3d).

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
| `/simiq3d` | El chat con sugerencias y la escena vacía | `GET /techniques` (DataIQ) |
| `/simiq3d/tecnicas/:id` | La mesa de Mayo de esa técnica. Es el destino de «Ver en 3D» en el detalle de DataIQ | `GET /techniques/{id}/instruments`, `GET /instruments` (DataIQ); mapeo de modelos y chat (SIMIQ3D, por definir) |

Las dos piden cuenta. Sin sesión, se va al ingreso del shell:
`/cuenta/ingresar?volver=/simiq3d/…` (navegación completa, porque el shell es
otra app). La barra para volver al shell también son enlaces normales.

### Errores de las APIs

Los de DataIQ, como en su frontend (401, 403, 409, 422). Del chat, además:

- **Servidor PC2 apagado** (el backend de SIMIQ3D no llega al modelo): el chat
  se muestra «no disponible» y el visor sigue funcionando; las técnicas se
  pueden abrir desde la lista.
- **La pregunta no tiene respuesta** (fuera de alcance o un intento de
  desviarlo): se dice así, sin inventar.

## Correr el frontend

Hace falta Node.js y el backend de DataIQ corriendo (ver
[`dataiq/README.md`](../../dataiq/README.md)). Todo se corre desde
`simiq3d/frontend`:

```sh
npm install
npm start      # http://localhost:4300/simiq3d/
npm test       # Vitest
npm run build  # producción, con los presupuestos de angular.json
```

`proxy.conf.json` manda `/api/dataiq` a `http://127.0.0.1:8000` y
`/api/simiq3d` a `http://127.0.0.1:8001`.

Para entrar con una cuenta: la cookie de sesión no distingue puertos, así que
sirve la que deja el shell en `localhost:4200`. Mientras el shell no tenga
ingreso, se puede pedir desde la consola del navegador, en
`localhost:4300/simiq3d/`:

```js
fetch('/api/dataiq/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-IQ-Client': 'web' },
  body: JSON.stringify({ email: '<correo>', password: '<contraseña>' }),
});
```
