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
- [ ] `shared/design/` en la raíz del repo: tokens base de `DESIGN.md` (colores, tipografía, espaciado, movimiento) y estilos base, con `prefers-reduced-motion`. Lo crea el primer frontend que llegue a su fase 0 (este o el de DataIQ)
- [ ] `src/styles/theme.scss`: el tema de SIMIQ3D sobre esos tokens
- [ ] Instalar `three` y sus tipos; presupuesto aparte para el chunk del visor
- [ ] `npm run models`: comprime `simiq3d/models/*.glb` con `gltfpack` (meshopt) hacia `public/models/`, que no se versiona; corre también antes del build
- [ ] Script de npm que genera los tipos de la API de DataIQ desde su `/openapi.json` (y los de SIMIQ3D cuando exista su API)
- [ ] URL del shell por entorno (en desarrollo, `http://localhost:4200`; en producción, el mismo origen)

### Fase 1 — Núcleo

- [ ] `domain/`: las acciones del chat y la geometría de la mesa (celda → posición en metros, centro de varias celdas), con pruebas
- [ ] `data/`: repositorio de DataIQ (técnicas, mesa de una técnica, instrumentos) y de SIMIQ3D (chat y mapeo de modelos)
- [ ] `core/http`: `provideHttpClient(withFetch())`, interceptor de `X-IQ-Client: web` e interceptor de errores
- [ ] `core/session`: cuenta de `GET /api/dataiq/auth/me` y `sessionGuard`, que lleva al ingreso del shell con `?volver=`

### Fase 2 — Visor (técnico, sin la interfaz final)

- [ ] Escena, cámara y `OrbitControls` adaptados al tacto (girar, acercar), con límites para no perder la mesa
- [ ] Carga de GLB con meshopt; cada modelo se descarga una vez y se reutiliza
- [ ] La mesa de Mayo a su tamaño real, con cada instrumento en su celda
- [ ] Dibujar solo cuando algo cambia; `devicePixelRatio` hasta 2; luz sencilla
- [ ] Tocar un instrumento lo resalta (raycasting); lo mismo desde la leyenda
- [ ] Liberar la memoria al cambiar de técnica
- [ ] Sin WebGL: aviso y enlace a la mesa en DataIQ
- [ ] Medir en un celular modesto: tiempo hasta ver la mesa y cuadros por segundo al girar

### Fase 3 — Mockups

Con el método de [`.claude/rules/diseno.md`](../../.claude/rules/diseno.md);
toda decisión visual nueva va a `DESIGN.md`.

- [ ] Pantalla de exploración en celular (390 px): cómo conviven el chat y la escena
- [ ] La misma pantalla en escritorio (1310 px)
- [ ] Ficha del instrumento al tocarlo, leyenda, estados (cargando, chat no disponible, sin respuesta, sin WebGL)

### Fase 4 — Pantalla de exploración

- [ ] `/simiq3d`: chat con sugerencias y escena vacía
- [ ] `/simiq3d/tecnicas/:id`: la mesa de esa técnica (destino de «Ver en 3D» de DataIQ). El shell muestra «Ver en 3D» en todas las técnicas: si una no tiene sus modelos (el MVP es la mesa de Mayo de Cirugía General), se dice y se ofrecen las que sí
- [ ] Ficha del instrumento con su descripción de DataIQ
- [ ] Barra para volver al shell

### Fase 5 — Chat

Depende del backend de SIMIQ3D (ver «Dependencias del backend»).

- [ ] Pregunta → acción → escena (mostrar técnica, resaltar instrumento, describirlo, sin respuesta)
- [ ] Chat no disponible cuando el Servidor PC2 está apagado, con el visor funcionando
- [ ] Tiempo desde la pregunta hasta ver la escena (métrica de la evaluación sumativa)

### Fase 6 — Despliegue

- [ ] Servir la app bajo `/simiq3d/` en el mismo origen que el shell: el proyecto del shell la trae con un rewrite `/simiq3d/:path*` hacia el de SIMIQ3D, con la ruta completa (ver «Resuelto»)
- [ ] Encabezados de caché largos para `public/models/` y CSP
- [ ] GitHub Actions: build (con `npm run models`), pruebas y despliegue con el CLI de Vercel

### Dependencias del backend

Lo que no es del frontend pero lo bloquea. Se acuerda con quien desarrolla el
backend de SIMIQ3D.

- [ ] Ruta del chat: recibe la pregunta y devuelve la acción (ver «Por confirmar» 2). Bloquea la fase 5
- [ ] Ruta del mapeo de cada modelo 3D a su instrumento (`instruments.id`). Bloquea la fase 2 con datos reales
- [ ] Puerto de desarrollo (propuesto: 8001)

### Dependencias de datos

Del README de SIMIQ3D; bloquean que la mesa se vea como la real.

- [ ] El tamaño real de la mesa de Mayo del laboratorio (el área entre los marcadores ArUco)
- [ ] Hacia dónde apunta cada instrumento
- [ ] La descripción de los 23 instrumentos en DataIQ (`instruments.description`, hoy vacía)
- [ ] Los modelos 3D

Mientras falten, la escena funciona con valores provisionales marcados como
tales en el código, nunca presentados como datos.

## Por confirmar

| # | Qué falta | Dónde | Propuesta |
|---|---|---|---|
| 2 | El contrato del chat no existe: qué recibe y qué devuelve | `simiq3d/README.md`, «Chat» | `POST /chat` con la pregunta; responde la acción (`show_technique`, `highlight_instrument`, `describe_instrument` o `no_answer`), sus ids y un texto corto. Se acuerda con el backend |
| 3 | Si el mapeo modelo → instrumento cambia poco, podría ser un archivo estático junto a los modelos en vez de una ruta | `simiq3d/README.md`, «Backend y base de datos» (decidido: en la base de SIMIQ3D) | Mantener lo decidido; revisarlo si la ruta resulta ser solo una lista fija |
| 4 | Conversación con contexto («¿y dónde va la Kelly?» después de abrir una técnica) | `simiq3d/README.md`, «Chat» | El frontend manda la técnica abierta junto con la pregunta |

## Resuelto

| # | Qué faltaba | Cómo quedó |
|---|---|---|
| 1 | Cómo llega el navegador al proyecto de Vercel de SIMIQ3D por el mismo origen que el shell, para que reciba la cookie | Un rewrite `/simiq3d/:path*` en el proyecto del shell hacia el de SIMIQ3D, como el de `/api/dataiq/*`; la app conserva su `baseHref` `/simiq3d/`. Es el Resuelto 17 de la [checklist de DataIQ](../../dataiq/docs/checklist-frontend.md#resuelto) (decidido por Juan el 2026-10-29) |
