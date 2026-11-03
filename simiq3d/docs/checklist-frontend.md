# Checklist — Frontend SIMIQ3D

Avance del frontend de SIMIQ3D (chat y visor 3D). Se marca cada pieza al
terminarla. Cómo está hecho: [`../frontend/README.md`](../frontend/README.md).
El avance de todo SIMIQ3D, por actividad de DSRM, está en
[`checklist.md`](checklist.md).

## Plan por fases

Cada fase lleva sus pruebas al hacerla; no hay una etapa de pruebas al final.
Una fase está lista cuando pasan `ng build` (con los presupuestos) y `ng test`,
y se ve bien a 390 px (celular, lo principal) y a 1310 px.

### Fase 0 — Base del proyecto

- [x] Proyecto Angular 22 en `simiq3d/frontend` (sin SSR, sin `zone.js`, SCSS, Vitest)
- [x] Servido bajo `/simiq3d/` (`baseHref`), puerto 4300 y `proxy.conf.json` hacia DataIQ (8000) y SIMIQ3D (8001)
- [x] Presupuesto estricto: código inicial con aviso a los 300 KB y error a los 500 KB
- [x] `index.html` en español
- [x] `shared/design/` en la raíz del repo: tokens base de `DESIGN.md` (colores, tipografía, espaciado, movimiento) y estilos base, con `prefers-reduced-motion`. Lo creó el frontend de DataIQ
- [x] `src/styles/theme.scss`: el tema de SIMIQ3D sobre esos tokens (el azul de quirófano en vez del verde de interfaz)
- [x] Sin la página de ejemplo de la CLI de Angular
- [x] Instalar `three` y sus tipos (0.187.0, versión fija); presupuesto aparte para el chunk del visor: cada archivo de código, aviso a los 750 KB y error a los 900 KB (Three.js con lo que usa el visor mide 675 KB, 169 KB comprimido; medido el 2026-11-01)
- [x] `npm run models`: comprime `simiq3d/models/glb/*.glb` con `gltfpack` (meshopt) hacia `public/models/`, que no se versiona; corre también antes del build y de `npm start`. Conserva los nodos con nombre (`blade_mount`); los 23 modelos pasan de 698 KB a 172 KB
- [x] `npm run api:types`: genera los tipos de las APIs de DataIQ y de SIMIQ3D (`src/app/data/api/`) desde el OpenAPI de cada backend, como el frontend de DataIQ
- [x] URL del shell por entorno (en desarrollo, `http://localhost:4200`; en producción, el mismo origen): `src/environments/`

### Fase 1 — Núcleo

- [x] `domain/`: las acciones del chat (`sceneFor`: qué cambia en el visor con cada una) y la geometría de la mesa (celda → posición en metros, centro de varias celdas), con pruebas; el nombre de cada objeto de la leyenda, con la misma regla de DataIQ (`itemName`)
- [x] `data/`: repositorio de DataIQ (cuenta, técnicas, mesa de una técnica, instrumentos) y de SIMIQ3D (chat y mapeo de modelos); `toMayoTable` saca la mesa de Mayo de la respuesta de DataIQ
- [x] `core/http`: `provideHttpClient(withFetch())`, interceptor de `X-IQ-Client: web` e interceptor del 401 (sesión vencida → ingreso del shell); los demás errores los dice cada pantalla en su sitio
- [x] `core/session`: cuenta de `GET /api/dataiq/auth/me` y `sessionGuard`, que lleva al ingreso del shell con `?volver=`. Si DataIQ no responde, la ruta espera y vuelve a preguntar (5, 10, 20 y 30 s, al volver la conexión y con «Reintentar»), sin mandar a ingresar a quien quizá tiene sesión

### Fase 2 — Visor (técnico, sin la interfaz final)

- [x] Escena, cámara y `OrbitControls` adaptados al tacto (girar, acercar), con límites para no perder la mesa
- [x] Carga de GLB con meshopt; cada modelo se descarga una vez y se reutiliza (`viewer/model-library.ts`)
- [x] La mesa de Mayo, de tamaño provisional, con cada instrumento a escala real y su centro en el de su celda; el mango con su hoja montada en `blade_mount` (README, «Cómo se arma la mesa»)
- [x] Dibujar solo cuando algo cambia; `devicePixelRatio` hasta 2; luz sencilla
- [x] Tocar un instrumento lo resalta (raycasting); lo mismo desde la leyenda
- [x] Liberar la memoria al cambiar de técnica (la geometría de cada modelo queda en la biblioteca para reutilizarla)
- [x] Sin WebGL: aviso y enlace a la mesa en DataIQ
- [x] Las piezas quedan dentro de la mesa y no se tapan entre sí: cada una se corre lo justo desde el centro de su celda (`domain/arrangement.ts`; decidido por Mauricio el 2026-11-01)
- [x] Página técnica para ver el visor con datos reales (`explore/`): técnicas, visor y leyenda; la pantalla final es la fase 4
- [ ] Medir en un celular modesto: tiempo hasta ver la mesa y cuadros por segundo al girar

### Fase 3 — Mockups

Con el método de [`.claude/rules/diseno.md`](../../.claude/rules/diseno.md);
toda decisión visual nueva va a `DESIGN.md`.

El mockup es [`diseno/mockups/simiq3d.html`](../../diseno/mockups/simiq3d.html)
(decidido por Mauricio el 2026-10-20), y su diseño, «SIMIQ3D: explorar en 3D»
y sus componentes en `DESIGN.md`. El mockup es anterior al backend: donde no
coinciden, manda `DESIGN.md`, que ya está al día (filas y columnas, acciones
del chat, descripciones con fuente).

- [x] Pantalla de exploración en celular (390 px): cómo conviven el chat y la escena
- [x] La misma pantalla en escritorio (1310 px)
- [x] Ficha del instrumento al tocarlo, leyenda, estados (cargando, chat no disponible, sin respuesta, sin WebGL)
- [x] Publicar el mockup como página del [Artifact de los mockups](https://claude.ai/artifact/C6U12G8i7EMtfREt8YnTiK) (versión 32, 2026-11-02): en el rol «Usuario», el flujo «Explorar una mesa en 3D». El mockup se ve como producción: bandeja de acero y funda azul, sin cuadrícula ni celdas, instrumentos a tamaño real acomodados como en la app y la ficha nueva

### Fase 4 — Pantalla de exploración

- [x] `/simiq3d`: la bienvenida «Elige una técnica para verla en 3D», con una opción por técnica de Cirugía General, y la mesa vacía. Las sugerencias del chat van con la fase 5
- [x] `/simiq3d/tecnicas/:id`: la mesa de esa técnica (destino de «Ver en 3D» de DataIQ). El shell muestra «Ver en 3D» en todas las técnicas: si una no tiene sus modelos (el MVP es la mesa de Mayo de Cirugía General), se dice y se ofrecen las que sí
- [x] Ficha del instrumento con su descripción de DataIQ: se abre al tocar la pieza; un objeto de varios instrumentos muestra la de cada uno
- [x] Barra para volver al shell: «Técnicas» y «Herramientas» llevan al shell, «Explorar en 3D» es esta pantalla; la marca sigue verde
- [x] La pantalla como el mockup: el chat como panel ajustable (300 a 560 px), la cabeza con el selector de técnica y la marca «provisional», la leyenda plegable, la insignia del número, los controles de vista (3D · Arriba, acercar, alejar, centrar) y la pista para girar. En celular, el lienzo a pantalla completa, el campo fijo abajo, el historial desde la izquierda y la técnica en una hoja inferior

### Fase 5 — Chat

Contra `POST /chat` del backend de SIMIQ3D (README, «El chat»).

- [x] Pregunta → acción → escena, con las ocho acciones del contrato; las opciones se envían como pregunta. La conversación sigue al abrir otra técnica (`explore/conversation.service.ts`); si la respuesta pide otra técnica, se abre y, cuando llega su mesa, se señala el instrumento
- [x] Mensajes con quién habla, el chip de la acción, la lista de «Instrumental» que señala cada pieza, los tres puntos mientras llega la respuesta y las sugerencias para empezar, armadas con nombres de DataIQ. En celular, la última respuesta encima del campo
- [x] Chat no disponible (503) cuando el Servidor PC2 está apagado, con el visor funcionando; el campo sigue activo para volver a intentar
- [x] Tope de preguntas seguidas (429): el texto de la API, con la mesa funcionando
- [x] Revisión de la fase 5 (2026-11-02): la rueda y el pellizco acercan hacia el puntero; en celular, los tres puntos mientras llega la respuesta y la leyenda que se pliega al elegir; la ficha como nota translúcida en el azul claro de SIMIQ3D, con el número de la pieza, la primera oración de la descripción y «Ver más»
- [ ] Tiempo desde la pregunta hasta ver la escena (métrica de la evaluación sumativa)

### Fase 6 — Despliegue

- [x] Proyecto de Vercel del frontend de SIMIQ3D, en la cuenta de Mauricio (el plan Hobby es de una sola persona): `simiq3d-frontend`, creado el 2026-11-02
- [x] Servir la app bajo `/simiq3d/` en el mismo origen que el shell: el proyecto del shell la trae con un rewrite `/simiq3d/:path*` hacia el de SIMIQ3D, con la ruta completa (ver «Resuelto»). Del lado de SIMIQ3D está listo (la app se publica en `simiq3d/`, con las rutas de la app hacia `index.html`, comprobado en un despliegue de prueba). El rewrite está en el `vercel.json` del shell desde el 2026-11-02 (`dataiq/frontend/README.md`, «Despliegue»)
- [x] Encabezados de caché y CSP en `vercel.json` (README, «Despliegue»), comprobados en un despliegue de prueba
- [x] GitHub Actions: build (con `npm run models`), pruebas y despliegue con el CLI de Vercel (`.github/workflows/simiq3d-frontend.yml`)

### Dependencias del backend

Lo que no es del frontend pero lo bloquea. Se acuerda con quien desarrolla el
backend de SIMIQ3D.

- [x] Ruta del chat: `POST /chat` (Resuelto 2)
- [x] Ruta del mapeo de cada modelo 3D a su instrumento: `GET /models` (Resuelto 3)
- [x] Puerto de desarrollo: 8001

### Dependencias de datos

Para el MVP, la mesa es de tamaño provisional y todos los instrumentos
apuntan igual (decidido por Mauricio el 2026-10-30); medir la mesa y orientar
cada instrumento es para después del MVP
([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).

- [x] La descripción de los 23 instrumentos en DataIQ (`instruments.description`, con su fuente en `description_source`)
- [x] Los modelos 3D de las cinco mesas de Mayo de Cirugía General (`simiq3d/models/modelos.csv`), comprobado el 2026-11-02 contra DataIQ local: ningún instrumento sin modelo

Mientras falten, la escena funciona con valores provisionales marcados como
tales en el código, nunca presentados como datos.

## Por confirmar

Nada por ahora.

## Resuelto

| # | Qué faltaba | Cómo quedó |
|---|---|---|
| 1 | Cómo llega el navegador al proyecto de Vercel de SIMIQ3D por el mismo origen que el shell, para que reciba la cookie | Un rewrite `/simiq3d/:path*` en el proyecto del shell hacia el de SIMIQ3D, como el de `/api/dataiq/*`; la app conserva su `baseHref` `/simiq3d/`. Es el Resuelto 17 de la [checklist de DataIQ](../../dataiq/docs/checklist-frontend.md#resuelto) (decidido por Juan el 2026-10-29) |
| 2 | El contrato del chat no existía: qué recibe y qué devuelve | `POST /chat` recibe la pregunta y la técnica abierta, y devuelve la acción, sus ids, el texto y las opciones; las ocho acciones y qué hace el visor con cada una, en el README («El chat»). Contrato decidido por Mauricio el 2026-10-20; desde el 2026-10-27 el chat es un agente que redacta el texto con lo que consulta en DataIQ ([`../README.md`](../README.md), «Chat») |
| 3 | Si el mapeo modelo → instrumento podía ser un archivo estático en vez de una ruta | Una ruta, `GET /models`, sobre la tabla `model_mappings` de la base de SIMIQ3D, que se carga desde `simiq3d/models/modelos.csv` (lo decidido) |
| 4 | Conversación con contexto («¿y dónde va la Kelly?» después de abrir una técnica) | El frontend manda la técnica abierta (`technique_id`) junto con la pregunta |
| 5 | El mockup tenía un selector de escala («a la celda», «escala real»), pero lo decidido es que los instrumentos van a escala real | Solo escala real, sin selector (decidido por Mauricio el 2026-11-01); `DESIGN.md` al día |
| 6 | El mockup dejaba ver la cuadrícula sobre la mesa y pintaba la celda de la pieza señalada, una cuadrícula que la mesa real no tiene | Sin rejilla ni celda pintada: la pieza señalada se levanta y se tiñe, con su número (decidido por Mauricio el 2026-11-01); `DESIGN.md` y `shared/design/tokens.css` sin `rejilla-escena`, `celda-escena` ni `celda-quirofano` |
| 7 | El estado «Conectado» del chat: `GET /health` del backend no mira el Servidor PC2, así que solo se sabe si el chat responde al preguntar | Sin estado al entrar; «No disponible» después de un 503, hasta la siguiente respuesta (decidido por Mauricio el 2026-11-01) |
