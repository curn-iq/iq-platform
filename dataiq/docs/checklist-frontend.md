# Checklist — Frontend DataIQ

Avance del frontend de DataIQ y del shell. Se marca cada pieza al terminarla.
Cómo está hecho (decisiones, arquitectura y rutas):
[`../frontend/README.md`](../frontend/README.md).

## Plan por fases

Cada fase lleva sus pruebas al hacerla; no hay una etapa de pruebas al final.
Una fase está lista cuando pasan `ng build` (con los presupuestos) y `ng test`,
y se ve bien a 1310 px y a 390 px.

Cómo se trabaja (decidido por Juan el 2026-10-27):

- **Una sesión por fase**, con un modelo que escribe el código (Sonnet) y que
  lee esta checklist y el [README](../frontend/README.md) al empezar.
- **Un commit por pieza**, con su prueba y su casilla marcada en el mismo
  commit; cada commit deja pasar `ng build` y `ng test`.
- **Un PR por fase.** Antes de abrirlo, una sesión corta con otro modelo
  (Opus) revisa la rama con `/code-review`; lo que corrija va en commits
  nuevos, sin reescribir los anteriores.

### Fase 0 — Base del proyecto

- [x] Nombre del proyecto `dataiq` (`package.json` y `angular.json`); `index.html` en español (`lang="es"`, título «DataIQ»)
- [x] Presupuesto del código inicial: aviso a los 300 KB y error a los 500 KB, como SIMIQ3D
- [x] Quitar la página de ejemplo de la CLI (`app.html`); queda una página mínima hasta la fase 2
- [x] `shared/design/` en la raíz del repo, si SIMIQ3D no la creó antes: `tokens.css` con los tokens base de `DESIGN.md` (colores, tipografía, espaciado, radios, movimiento) y los nombres por uso como propiedades CSS (`--color-accent`), y `base.css` con lo mínimo común (`box-sizing`, tipografía base, `prefers-reduced-motion`). Fuentes de Google Fonts (Host Grotesk y Martian Mono)
- [x] `src/styles/theme.scss`: el tema de DataIQ sobre esos tokens; solo sobrescribe propiedades (ver «Sistema visual compartido» en `CLAUDE.md`)
- [ ] `proxy.conf.json` (`/api/dataiq` → `http://127.0.0.1:8000`, sin el prefijo) y conectado a `ng serve` en `angular.json`
- [ ] `npm run api:types`: genera `src/app/data/api/` desde el `/openapi.json` del backend con `openapi-typescript` (versión fija). Los tipos generados se versionan, para que el build no necesite el backend
- [ ] Instalar Angular CDK (la misma versión de Angular)
- [ ] Mockups de DataIQ (`tecnica`, `editor`, `instrumental`, `revision`): «Pinza Moninjan» pasa a «Pinza de Moynihan», como el catálogo (#28)

### Fase 1 — Núcleo

- [ ] `domain/`: `Role` y `hasAtLeast()`, `VersionState` y transiciones permitidas
- [ ] `data/`: un repositorio por recurso sobre los tipos generados
- [ ] `core/http`: `provideHttpClient(withFetch())`, base `/api/dataiq`, interceptor de `X-IQ-Client: web` e interceptor de errores (401, 403, 409, 422)
- [ ] `core/session`: `SessionService` (cuenta de `GET /auth/me` al arrancar, ingresar, salir), `sessionGuard` y `roleGuard(min)` con `?volver=`

### Fase 2 — Shell

- [ ] Esqueleto de rutas con carga diferida
- [ ] Barra: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda; un desplegable a la vez (CDK overlay), Escape y clic fuera
- [ ] Menú de celular a pantalla completa (≤ 960 px)
- [ ] Ingresar / Crear cuenta o «Mi cuenta» con los accesos de gestión según el rol
- [ ] Pie oscuro
- [ ] SIVRI y SIMIQ3D como enlaces (ver «Por confirmar» 1)

### Fase 3 — Diagrama de mesa (`shared/table-diagram`)

- [ ] Grilla del tamaño de la mesa (`zones`: `rows` × `columns`); las mesas con `used: false` no se dibujan
- [ ] Un objeto en varias celdas es uno solo, con un número
- [ ] Instrumental en acero y objetos planos; leyenda enlazada (señalar un número levanta la pieza y atenúa las demás)
- [ ] Hueco «Sin dato» para un número que la fuente no deja leer
- [ ] Variante de vista previa (recortada, sin números ni leyenda) para la puerta de cuenta
- [ ] Variante miniatura (celdas de 22 px) para el catálogo de instrumental

### Fase 4 — Páginas públicas

- [ ] Inicio (`inicio.html`)
- [ ] Catálogo de técnicas: filtro por especialidad (`GET /specialties`), buscador sin tildes con resaltado, lista agrupada, estado vacío
- [ ] Detalle de técnica: columna de técnicas, pestañas Datos clínicos / Instrumental / Mesa de Mayo / Mesa de reserva
- [ ] Puerta de cuenta sin sesión: vista previa real y tarjeta que no revela si a la técnica le falta una mesa
- [ ] «Ver en 3D» y «Comprobar con la cámara» llevan a la cuenta sin sesión

### Fase 5 — Cuenta

- [ ] Ingresar y Crear cuenta en una pantalla, con la técnica que se quería abrir a la izquierda o el saludo según la hora
- [ ] Registro con la aceptación de la política obligatoria (Decreto 1377); la política declara el registro anónimo del chat de SIMIQ3D (ver «Por confirmar» 10)
- [ ] Volver a `?volver=` al ingresar; al catálogo si se entró directo
- [ ] Salir (`POST /auth/logout`) desde «Mi cuenta»

### Fase 6 — Gestión del colaborador

- [ ] Mis borradores: matriz de avance por sección, filtros, motivo de la devolución (`rejections`)
- [ ] «Nueva técnica» (especialidad de `GET /specialties`) y «Editar una publicada» (un 409 dice que ya hay una versión en curso)
- [ ] Descartar un borrador (`DELETE /versions/{id}`), con confirmación (ver «Por confirmar» 9)
- [ ] Editor de 5 pasos con autoguardado (`PUT /versions/{id}` con debounce; reemplaza todo el contenido)
- [ ] Paso de instrumental: sugeridos de la especialidad y catálogo completo
- [ ] Pasos de mesa: arrastrar a la celda (CDK drag-drop) o tocar celda → elegir objeto; filas y columnas de la mesa en `zones`; «no lleva esta mesa» es `used: false`
- [ ] Revisar y enviar (colaborador) / Revisar y publicar (revisor o admin) con confirmación en la misma tarjeta
- [ ] Desde el detalle: «Editar técnica» / «Continuar borrador» según el rol y la versión en curso

### Fase 7 — Gestión del revisor

- [ ] Por revisar: versiones `in_review` de otros
- [ ] Revisadas por mí (`?reviewed_by_me=true`)
- [ ] Revisión: publicada y propuesta lado a lado por sección, con los cambios calculados en el cliente
- [ ] Aprobar y publicar (409 si otro revisor ya decidió) y Devolver con motivo
- [ ] Archivar técnica desde «Más acciones» del detalle (409 con una versión en curso)
- [ ] Catálogo de instrumental: índice por categoría, búsqueda por nombre o alias, «Dónde va», crear y editar en su sitio, alias incluidos (el `PATCH` reemplaza la lista); la descripción siempre con su fuente (`description_source`; sin ella la API responde 422)

### Fase 8 — Gestión del admin

- [ ] Usuarios y roles: personas por rol, buscador, ficha con la fecha de registro y la política aceptada, cambio de rol confirmado
- [ ] La cuenta propia no cambia su rol (el backend responde 409)
- [ ] Sin suspender ni historial de roles en el MVP (`docs/despues-del-mvp.md`)

### Fase 9 — Despliegue (Corte 3)

El backend ya está en Vercel (`dataiq-backend`, pieza 9 de
[`checklist-backend.md`](checklist-backend.md)).

- [ ] `vercel.json`: rewrites de `/api/dataiq/:path*` a `dataiq-backend`, de `/api/simiq3d/:path*` al backend de SIMIQ3D y de `/simiq3d/:path*` al frontend de SIMIQ3D (ver «Por confirmar» 1); el resto de rutas a `index.html`, y encabezados de seguridad (CSP)
- [ ] Confirmar que Vercel reenvía la cookie y el `Set-Cookie`
- [ ] GitHub Actions: build, pruebas y despliegue con Vercel CLI (el plan Hobby no conecta repos de organizaciones)

## Lo que no cuadraba

Entre la documentación, los mockups y la API.

### Resuelto

| # | Qué no cuadraba | Cómo quedó |
|---|---|---|
| 1 | La documentación decía «frontend por definir, candidato Svelte» | Angular (2026-10-11) |
| 2 | La ubicación de la capa de navegación estaba por definir | Shell y DataIQ en una sola app, en `dataiq/frontend` (2026-10-11) |
| 3 | El backend estaba en español y el frontend iba en inglés | Todo el código y la API en inglés (#11); el frontend ya no traduce |
| 4 | El backend no tenía CORS | No hace falta: cookie `HttpOnly` y proxy de mismo origen (#12). El token ya no va en `localStorage` |
| 5 | `PRODUCT.md` decía que los datos clínicos no estaban en la base | Sí están; `PRODUCT.md` corregido |
| 6 | `docs/flujos.md` decía que el admin lo asigna «solo Mauricio» | Es el equipo operativo del proyecto; `docs/flujos.md` y su versión visual corregidos |
| 7 | El editor cambia filas y columnas, pero el esquema no guardaba el tamaño de la mesa | `version_zones` con `rows` y `columns` (#11) |
| 8 | No se sabía si `httpResource` y Signal Forms eran estables | Son `@publicApi 22.0` en la versión instalada (22.2.2) |
| 9 | ¿URL en español con el código en inglés? | Sí: son parte de la interfaz |
| 10 | Autoría: `CLAUDE.md` decía que el ecosistema era el proyecto de grado de Mauricio | Es de los tres integrantes de ING (#10) |
| 11 | «Esta técnica no lleva mesa de reserva» no estaba en el esquema | `used: false` en `zones` (#11) |
| 12 | Cada objeto devolvía el nombre de la mesa, pero el `PUT` pide `zone_id` | Cada objeto trae `zone_id` (#12) |
| 13 | «Revisadas por mí» no tenía filtro | `GET /versions?reviewed_by_me=true` (#12) |
| 14 | El `PATCH` del instrumental no recibía alias | Recibe `aliases` y reemplaza la lista (#12) |
| 15 | La ficha de usuario muestra registro y política, que la API no traía | `GET /users` los trae (#12); suspender e historial quedan para después del MVP |
| 16 | No había endpoint público de especialidades | `GET /specialties` (#12) |

### Por confirmar

| # | Qué no cuadra | Dónde | Propuesta |
|---|---|---|---|
| 1 | Para que los frontends de SIVRI y SIMIQ3D usen la misma cookie, tienen que servirse desde el mismo origen que este. SIMIQ3D ya tiene su propio proyecto de Vercel ([`docs/arquitectura.md`](../../docs/arquitectura.md)); SIVRI, por definir | `CLAUDE.md`, «Capa de navegación» | Un rewrite desde este proyecto hacia el de cada módulo (`/simiq3d/:path*`, `/sivri/:path*`) |
| 2 | La revisión del mockup comenta por sección y por celda, y el autor deja una nota al enviar; la API solo guarda un `reason` al rechazar y `submit` no recibe cuerpo | `revision.html`, `routes/versions.py` | En el MVP, juntar los comentarios en el motivo y quitar la nota del autor; o ampliar la API |
| 3 | «Dónde va» (técnicas que usan un instrumento) no tiene endpoint | `instrumental.html` | Calcularlo en el cliente con `GET /catalog/full` |
| 4 | «Continuar con Google» no tiene endpoint ni decisión; recuperar la contraseña es de después del MVP | `cuenta.html`, `docs/despues-del-mvp.md` | Ocultar los dos en el MVP |
| 5 | El detalle muestra técnicas archivadas a un revisor, pero `GET /techniques` solo devuelve publicadas | `tecnica.html`, `routes/techniques.py` | No mostrar archivadas en el MVP, o ampliar la API |
| 6 | Mis borradores y el editor marcan cada sección completa o pendiente y bloquean el envío; el backend no define cuándo una sección está completa | `borradores.html`, `editor.html`, `domain/techniques.py` | Definir la regla con IQ y decidir si vive solo en el frontend |
| 7 | «Para qué sirve» va como texto de demostración; no está claro si es `description` | `tecnica.html` | Confirmar con IQ |
| 8 | Un colaborador no sabe si otra persona tiene una versión en curso (solo ve las suyas); el mockup muestra «En curso por …» | `tecnica.html`, `routes/versions.py` | En el MVP, mostrar el 409 al intentar editar |
| 9 | La API permite descartar un borrador, pero ningún mockup tiene la acción | `borradores.html`, `editor.html` | «Descartar borrador» en «Más acciones», con confirmación |
| 10 | El registro exige aceptar la política de tratamiento de datos, pero su texto no está en el repo. Tiene que declarar el registro anónimo del chat de SIMIQ3D, que está siempre encendido (#29) | `cuenta.html`, `simiq3d/README.md` («Backend y base de datos»), `POLICY_VERSION` del backend | Redactarla con el equipo antes de la fase 5; al cambiarla, subir `POLICY_VERSION` |
