# Checklist — Frontend SIVRI

Avance del frontend de SIVRI (la app que usa el estudiante en el celular: abre
la cámara, manda cuadros al backend y dice qué está en su lugar, qué mover y qué
falta). Se marca cada pieza al terminarla. Cómo está hecho:
[`../frontend/README.md`](../frontend/README.md). El avance de todo SIVRI, por
actividad de DSRM, está en [`checklist.md`](checklist.md). El contrato con el
backend está en [`../backend/README.md`](../backend/README.md), «Para quien hace
el frontend».

## Plan por fases

Cada fase lleva sus pruebas al hacerla; no hay una etapa de pruebas al final.
Una fase está lista cuando pasan `ng build` (con los presupuestos) y `ng test`,
y se ve bien a 390 px (celular, lo principal) y a 1310 px.

### Fase 1 — Frontend de SIVRI

Mockups: sección «SIVRI · Mockups», ronda 2, del Figma del proyecto (archivo
`jHEduZTQNBs4CCJEWB8u5v`), y «SIVRI: celular y computador (mockups)» en
[`DESIGN.md`](../../DESIGN.md), que manda sobre cualquier otra sección para SIVRI.

#### Base

- [x] Proyecto Angular 22 en `sivri/frontend` (sin SSR, sin `zone.js`, SCSS, Vitest), con `index.html` en español, `baseHref` `/sivri/`, puerto 4400 y `proxy.conf.json` hacia DataIQ (8000) para `/api/dataiq`; presupuesto del código inicial con aviso a los 300 KB y error a los 500 KB
- [x] `src/shared-shell` (enlace a `shared/shell/`, guardado en Git como enlace simbólico) y `src/styles/theme.scss` con el tema de SIVRI: sin verde de marca en el contenido (botón primario en tinta, enlaces con flecha en tinta, número de pieza en `tinta-3`); `shared/design/` no se toca
- [x] `src/environments/`: URL del shell y dirección del backend de SIVRI, directa y no por el mismo origen (Vercel no pasa WebSockets): `http://127.0.0.1:8002` y `ws://127.0.0.1:8002/ws/validate` en desarrollo; la del Servidor PC1 en producción
- [x] `npm run api:types`: tipos de DataIQ (`/auth/module-token`, `/auth/me`) y de SIVRI (`/techniques`, `/validate`) desde su OpenAPI; los mensajes del WebSocket, escritos a mano en `data/`
- [x] Fotos de `dataiq/frontend/public/nosotros/` (`carrusel-3-*` y `carrusel-4-*`) copiadas a `public/` en dos anchos (800 y 1500 px, 297 KB en total; sin la de 2400 px) en `public/fotos/`: `quirofano-simulacion` (47 KB y 150 KB) y `mesa-de-mayo-vestida` (26 KB y 74 KB)

#### Núcleo

- [x] `core/http` y `core/session` como en SIMIQ3D: `withFetch`, `X-IQ-Client: web`, 401 → ingreso del shell, espera con reintentos si DataIQ no responde. `X-IQ-Client` y el 401 valen solo para DataIQ: el CORS de SIVRI solo admite `Authorization` y `Content-Type`, y un 401 de SIVRI es un token rechazado, no la sesión
- [x] La barra compartida: `SHELL_HOST` con la marca `{ label: 'SIVRI', entrance: true }`, menú y cuenta como en SIMIQ3D
- [x] Token corto: `POST /api/dataiq/auth/module-token`, una petición a la vez, renovado antes de los 5 minutos; un 401 de DataIQ es sesión terminada
- [x] `domain/` (lógica pura, con pruebas): cómo se lee un `FrameOut` (en su lugar sobre esperados, con los dudosos contados como en su lugar y sin mostrarse; grupos por mover, falta, sobra y en su lugar, en el orden del número del diagrama), qué marcador falta y su frase, el paso de fracciones del cuadro al dibujo con `object-fit: cover`, y la máquina de estados del flujo (permiso → encuadrar → armar → resultado → pieza por mover → revisar de nuevo, y los estados de error)

#### Cámara y conexión

- [x] Cámara trasera con `getUserMedia` (`facingMode: 'environment'`); errores de permiso (`NotAllowedError`) y de equipo sin cámara (`NotFoundError`); se apaga al salir de la pantalla o al ocultarse la pestaña
- [x] Envío del cuadro completo desde un `canvas`: JPEG de calidad 0,75 y 640 px de lado mayor, 2 o 3 por segundo y uno a la vez (no se manda otro hasta recibir el resultado o un error)
- [x] Cliente del WebSocket: primer mensaje `{"token": …}`, cuadros binarios contados para conocer su `frame_number`, renovación del token en la misma conexión, errores por cuadro (`invalid_image`, `too_large`, `catalog_unavailable`) sin cortar, cierres 4400, 4401 y 4404, y reconexión con espera creciente cuando vuelve la red
- [x] El resultado se dibuja sobre el cuadro que se mandó (guardado por `frame_number`), no sobre el video de ahora

#### Pantallas

Cada una con su prueba y su revisión visual a 390 y 1310 px contra su nodo del Figma.

- [x] Computador: la página del nodo 217:2320, con el código QR (SVG estático de `https://dataiq-frontend.vercel.app/sivri`) y «Descargar los marcadores (PDF)» enlazado al archivo `marcadores-aruco.pdf` de la carpeta de SIVRI del Drive del proyecto
- [x] Celular: entrada (224:2592)
- [x] Celular: encuadrar la mesa (223:2421)
- [x] Celular: mientras arma (sin mockup en la ronda 2; ver «Por confirmar»)
- [ ] Celular: resultado (221:2463)
- [ ] Celular: pieza por mover (223:2566)
- [ ] Celular: dos técnicas muy cerca (sin mockup en la ronda 2; ver «Por confirmar»)
- [ ] Estados, como páginas de texto con titular, párrafo y una acción: sin conexión con SIVRI (224:2666), cámara bloqueada (224:2691), técnica fuera del alcance (224:2716), equipo sin cámara, sesión vencida y técnica no reconocida (`recognized: false` con la mesa a la vista)
- [ ] El pie: «Las imágenes se procesan y no se guardan.» y «Código fuente (AGPL-3.0)», enlazado a https://github.com/curn-iq/iq-platform/tree/main/sivri

#### Cierre

- [ ] Accesibilidad y movimiento: foco visible, orden de tabulación, lector de pantalla (el resultado se anuncia con `aria-live` cortés y sin repetirse en cada cuadro), objetivos táctiles de 44 px y `prefers-reduced-motion`; revisado con `web-design-guidelines`
- [ ] Peso: `npm run build` contra los presupuestos, con lo medido anotado aquí
- [ ] Despliegue, como SIMIQ3D: `vercel.json` con la ruta `/sivri/:path*`, CSP con `connect-src 'self'` más las direcciones `https://` y `wss://` del backend, y `Permissions-Policy: camera=(self)`; `.github/workflows/sivri-frontend.yml` (build y pruebas en cada PR, despliegue en `main`, con `shared/shell/**` y `shared/design/**` en sus rutas); en `dataiq/frontend/vercel.json`, los rewrites de `/sivri/` y `/sivri/:path*` hacia el proyecto de SIVRI (cierra la pieza pendiente de la [fase 9 de DataIQ](../../dataiq/docs/checklist-frontend.md)); comprobar que la cámara abre detrás del rewrite
- [ ] `README.md` del frontend, `DESIGN.md` con lo nuevo que se decida y `CLAUDE.md` al día en la misma rama

### Dependencias de otros

Lo que no es de esta fase pero la limita.

- [ ] Proyecto de Vercel de SIVRI (`VERCEL_PROJECT_ID`): lo crea quien opera la plataforma
- [ ] Backend del piloto en el Servidor PC1: debe usar el JWKS y el catálogo del DataIQ de producción, y `CORS_ORIGINS` debe incluir el origen del shell (y `http://localhost:4400` en desarrollo); configuración de Mauricio
- [ ] Probar en un celular real: la cámara solo abre con HTTPS o en `localhost`; en desarrollo se prueba en el computador con el detector de pruebas (`DETECTOR=fake`) y en el celular con el despliegue de vista previa

## Resuelto

Decidido por Juan el 2026-11-22. Lo visual está también en
[`DESIGN.md`](../../DESIGN.md), «SIVRI: celular y computador (mockups)».

| # | Qué faltaba | Cómo quedó |
|---|---|---|
| 1 | Cuándo se compara la mesa | El botón «Ya armé la mesa», activo solo con los cuatro marcadores a la vista. Después de pulsarlo, el resultado se fija cuando la misma técnica sale primera en 5 resultados seguidos; si `board_found` es `false` durante unos segundos, vuelve a «Encuadra la mesa» |
| 2 | Cómo se nombra lo que se ve mientras se arma | Etiqueta en Martian Mono con el nombre de la clase (`label`), sin confianza, en `tinta` sobre `superficie` con filete de 1 px; sin caja ni color |
| 3 | «VA AQUÍ» y el hueco de la pieza que falta, sin que el backend devuelva la caja esperada | Una flecha punteada en `alerta-noche` desde la caja actual, en la dirección de `move`. La pieza que falta va solo en la lista, sin hueco dibujado. Pedir la caja esperada al backend cambia el contrato y lo decide Mauricio |
| 4 | Dos técnicas muy cerca | Titular «Puede ser una de dos.» y dos filas, cada una con su nombre, su porcentaje y «n de m en su lugar»; debajo, los grupos de la primera. «Ver dónde va» queda desactivado mientras haya dos |
| 5 | Cómo decide la app que muestra la página del computador | `(hover: hover) and (pointer: fine)`; esa vista no tiene camino a la cámara |
| 6 | El código QR | SVG estático en `public/`, generado una vez con `https://dataiq-frontend.vercel.app/sivri`, sin librería en el código que baja el navegador |
| 7 | «Descargar los marcadores (PDF)» | Enlaza al archivo `marcadores-aruco.pdf` de la carpeta de SIVRI, en recursos, del Drive del proyecto |
| 8 | Destinos de los enlaces | «Cómo se prepara la mesa →» va a la sección «Lo que hace falta» de la misma página; «Ver la mesa de referencia →», a `/tecnicas/{technique_id}/mesa-de-mayo` de DataIQ, con navegación completa |
| 9 | Qué pide cuenta | La entrada y la página del computador son públicas; la cámara pide cuenta (`sessionGuard` → ingreso del shell con `?volver=`) |
| 10 | El grupo «Sobra» | Va después de «Falta», con el mismo estilo; no se muestra si está vacío |
| 11 | Los encabezados del shell cubrían `/sivri/` | En `dataiq/frontend/vercel.json`, la regla de encabezados excluye también `sivri`, para que valgan los del proyecto de SIVRI (`camera=(self)` y su CSP) |
