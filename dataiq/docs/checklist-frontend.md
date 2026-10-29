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
- **Componentes de `shared/ui/`**: cada uno se construye en la primera fase
  que lo usa, según `DESIGN.md` y su mockup, con su prueba; las fases
  siguientes lo reutilizan.
- **«Por confirmar»**: cada fase dice cuáles tiene que resolver; se deciden con
  el equipo antes de escribir el código que depende de ellos.

### Fase 0 — Base del proyecto

- [x] Nombre del proyecto `dataiq` (`package.json` y `angular.json`); `index.html` en español (`lang="es"`, título «DataIQ»)
- [x] Presupuesto del código inicial: aviso a los 300 KB y error a los 500 KB, como SIMIQ3D
- [x] Quitar la página de ejemplo de la CLI (`app.html`); queda una página mínima hasta la fase 2
- [x] `shared/design/` en la raíz del repo, si SIMIQ3D no la creó antes: `tokens.css` con los tokens base de `DESIGN.md` (colores, tipografía, espaciado, radios, movimiento) y los nombres por uso como propiedades CSS (`--color-accent`), y `base.css` con lo mínimo común (`box-sizing`, tipografía base, `prefers-reduced-motion`). Fuentes de Google Fonts (Host Grotesk y Martian Mono)
- [x] `src/styles/theme.scss`: el tema de DataIQ sobre esos tokens; solo sobrescribe propiedades (ver «Sistema visual compartido» en `CLAUDE.md`)
- [x] `proxy.conf.json` (`/api/dataiq` → `http://127.0.0.1:8000`, sin el prefijo) y conectado a `ng serve` en `angular.json`
- [x] `npm run api:types`: genera `src/app/data/api/` desde el `/openapi.json` del backend con `openapi-typescript` (versión fija). Los tipos generados se versionan, para que el build no necesite el backend
- [x] Instalar Angular CDK (la misma versión de Angular)
- [x] Mockups de DataIQ (`tecnica`, `editor`, `instrumental`, `revision`): «Pinza Moninjan» pasa a «Pinza de Moynihan», como el catálogo (#28)

### Fase 1 — Núcleo

- [x] `domain/`: `Role` y `hasAtLeast()`, `VersionState` y transiciones permitidas
- [x] `data/`: un repositorio por recurso sobre los tipos generados
- [x] `core/http`: `provideHttpClient(withFetch())`, base `/api/dataiq`, interceptor de `X-IQ-Client: web` e interceptor de errores (401, 403, 409, 422)
- [x] Aviso en pantalla para los errores que traduce el interceptor (componente en `shared/ui/`)
- [x] `core/session`: `SessionService` (cuenta de `GET /auth/me` al arrancar, ingresar, salir), `sessionGuard` y `roleGuard(min)` con `?volver=`
- [x] Tokens de sombra en `shared/design/` (`--elevacion-*` y `--shadow-*`, con los valores de «Shadow Vocabulary» de `DESIGN.md`; las del lienzo de SIMIQ3D quedan para ese frontend) y el aviso los usa en vez del valor suelto

### Fase 2 — Shell

- [x] Esqueleto de rutas con carga diferida, con el título de la pestaña del navegador en cada ruta
- [x] Página «No encontrada» para una ruta que no existe
- [x] Barra: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda; un desplegable a la vez (CDK overlay), que se cierra con Escape, con un clic fuera y al cambiar de página; con Tab se recorre como si estuviera tras su botón
- [x] Menú de celular a pantalla completa (≤ 960 px)
- [x] Ingresar / Crear cuenta o «Mi cuenta» con los accesos de gestión según el rol
- [x] Pie oscuro
- [x] Enlaces de la barra y del pie a secciones del inicio (router con `anchorScrolling`): «Cómo funciona» a `/#camino`, «La investigación» a `/#investigacion`, «Preguntas frecuentes» a `/#preguntas`, y «Guía para estudiantes» y «Para docentes» a su perfil en «Para quién» (`/#quien`). La política de datos, a su página (fase 5). Sin «Quiénes somos» ni «Términos de uso» en el MVP: no tienen texto (Resuelto 26)
- [x] SIVRI y SIMIQ3D como enlaces a `/sivri/` y `/simiq3d/`, con navegación completa: son otras apps, servidas en el mismo origen (Resuelto 17)

### Fase 3 — Diagrama de mesa (`shared/table-diagram`)

- [x] Grilla del tamaño de la mesa (`zones`: `rows` × `columns`); las mesas con `used: false` no se dibujan
- [x] Un objeto en varias celdas es uno solo, con un número
- [x] Instrumental en acero y objetos planos; leyenda enlazada (señalar un número levanta la pieza y atenúa las demás)
- [ ] Hueco «Sin dato» para un número que la fuente no deja leer
- [ ] Variante de vista previa (recortada, sin números ni leyenda) para la puerta de cuenta
- [ ] Variante miniatura (celdas de 22 px) para el catálogo de instrumental

### Fase 4 — Páginas públicas

- [ ] Inicio (`inicio.html`), con las secciones a las que enlazan la barra y el pie (`id` `camino`, `investigacion`, `quien` y `preguntas`), cada una con `scroll-margin-top: var(--size-navbar)` para no quedar bajo la barra fija
- [ ] Catálogo de técnicas: filtro por especialidad (`GET /specialties`), buscador sin tildes con resaltado, lista agrupada, estado vacío
- [ ] Detalle de técnica: columna de técnicas, pestañas Datos clínicos / Instrumental / Mesa de Mayo / Mesa de reserva; una técnica que no existe (404) muestra «No encontrada»
- [ ] Datos clínicos: «Para qué sirve» es `description`, sin la marca «demostración» (Resuelto 23); el resto de campos clínicos de `GET /techniques/{id}`
- [ ] Instrumental: el instrumental, las suturas por plano, los equipos biomédicos y el equipo médico-quirúrgico, todo detrás de la puerta de cuenta (Resuelto 27). Las suturas se muestran una fila por plano: `data/` separa el `usage` («Piel; Fascia») en planos
- [ ] Puerta de cuenta sin sesión: vista previa real y tarjeta que no revela si a la técnica le falta una mesa
- [ ] «Ver en 3D» y «Comprobar con la cámara» llevan a la cuenta sin sesión. Con sesión, «Ver en 3D» va a `/simiq3d/tecnicas/:id` (`simiq3d/frontend/README.md`) y «Comprobar con la cámara» a `/sivri/` (SIVRI reconoce la técnica sola). Se muestran en todas las técnicas: si el módulo no cubre una (el MVP de los dos es la mesa de Mayo de Cirugía General), su propia pantalla lo dice (Resuelto 17)

### Fase 5 — Cuenta

- [ ] Página del aviso de privacidad, enlazada desde el registro y el pie; el texto sale de [`docs/privacidad.md`](../../docs/privacidad.md) (Resuelto 30)
- [ ] Ingresar y Crear cuenta en una pantalla, con la técnica que se quería abrir a la izquierda o el saludo según la hora. Sin «Continuar con Google» ni «¿Olvidaste tu contraseña?» en el MVP (Resuelto 20)
- [ ] Registro con la aceptación obligatoria del aviso (Decreto 1377): una casilla que dice que la persona es mayor de 18 años y acepta el aviso; la API exige `accepts_policy` (Resuelto 30)
- [ ] Volver a `?volver=` al ingresar; al catálogo si se entró directo
- [ ] Salir (`POST /auth/logout`) desde «Mi cuenta»

### Fase 6 — Gestión del colaborador

- [ ] `domain/`: avance de cada sección de una versión (completa, en curso, pendiente o sin mesa) con la regla de Resuelto 22, con pruebas. La usan Mis borradores y el editor
- [ ] Mis borradores: matriz de avance por sección, filtros, motivo de la devolución (`rejections`, con sus saltos de línea: ver Resuelto 18)
- [ ] «Nueva técnica»: el editor pide primero nombre y especialidad (`GET /specialties`) y crea la técnica con `POST /techniques` en cuanto tiene los dos (un 409 dice que ya existe ese nombre en la especialidad); el autoguardado empieza después. «Editar una publicada» (un 409 dice que ya hay una versión en curso)
- [ ] Descartar un borrador (`DELETE /versions/{id}`) desde «Más acciones» del editor, con confirmación en el mismo panel, como Archivar. Solo en borrador; si es la versión 1 de una técnica que nunca se publicó, la confirmación avisa que también se borra la técnica (Resuelto 25)
- [ ] Editor de 5 pasos con autoguardado (`PUT /versions/{id}` con debounce; reemplaza todo el contenido)
- [ ] Paso de datos clínicos: nombre y especialidad de solo lectura (Resuelto 28), los campos clínicos, la fuente de la versión (`source`, regla 1 de `CLAUDE.md`; el mockup no tiene el campo), suturas por plano, equipos biomédicos (`equipment`) y equipo médico-quirúrgico (`devices`)
- [ ] Suturas: una fila por plano con sutura, calibre y aguja (`name`, `gauge`, `needle_type`). `data/` junta en una sola sutura los planos que comparten esos tres datos, con los planos en `usage` separados por «; », como la carga inicial; la API rechaza una sutura repetida (Resuelto 29)
- [ ] Paso de instrumental: sugeridos de la especialidad y catálogo completo
- [ ] Pasos de mesa: arrastrar a la celda (CDK drag-drop) o tocar celda → elegir objeto; filas y columnas de la mesa en `zones`; «no lleva esta mesa» es `used: false`
- [ ] Revisar y enviar (colaborador) / Revisar y publicar (revisor o admin) con confirmación en la misma tarjeta; el envío se bloquea mientras una sección no esté completa (Resuelto 22). Sin «Nota para el revisor» en el MVP (Resuelto 18)
- [ ] Desde el detalle: «Editar técnica» / «Continuar borrador» / «Ver versión en revisión» según el rol y la versión en curso. Un revisor o un admin ve «En curso por …»; a un colaborador, la versión en curso de otra persona le llega como el 409 de «Editar técnica», y su texto se muestra en el mismo botón (Resuelto 24)

### Fase 7 — Gestión del revisor

- [ ] Por revisar: versiones `in_review` de otros
- [ ] Revisadas por mí (`?reviewed_by_me=true`)
- [ ] Revisión: publicada y propuesta lado a lado por sección, con los cambios calculados en el cliente
- [ ] Aprobar y publicar (409 si otro revisor ya decidió) y Devolver: los comentarios por sección y por objeto, y la nota general, se juntan en el `reason`, una línea por comentario (Resuelto 18)
- [ ] Archivar técnica desde «Más acciones» del detalle (409 con una versión en curso). Al archivar, el detalle se queda con el aviso «Técnica archivada…» y sin los módulos; no hay lista de archivadas (Resuelto 21)
- [ ] Catálogo de instrumental: índice por categoría, búsqueda por nombre o alias, «Dónde va» (calculado con `GET /catalog/full`, Resuelto 19), crear y editar en su sitio, alias incluidos (el `PATCH` reemplaza la lista); la descripción siempre con su fuente (`description_source`; sin ella la API responde 422)

### Fase 8 — Gestión del admin

- [ ] Usuarios y roles: personas por rol, buscador, ficha con la fecha de registro y la política aceptada, cambio de rol confirmado
- [ ] La cuenta propia no cambia su rol (el backend responde 409)
- [ ] Sin suspender ni historial de roles en el MVP (`docs/despues-del-mvp.md`)

### Fase 9 — Despliegue (Corte 3)

El backend ya está en Vercel (`dataiq-backend`, pieza 9 de
[`checklist-backend.md`](checklist-backend.md)).

- [ ] `vercel.json`: rewrites de `/api/dataiq/:path*` a `dataiq-backend`, de `/api/simiq3d/:path*` al backend de SIMIQ3D, y de `/simiq3d/:path*` y `/sivri/:path*` al proyecto de Vercel de cada módulo, con la ruta completa: cada app tiene ese prefijo como `baseHref` (Resuelto 17); el resto de rutas a `index.html`, y encabezados de seguridad (CSP)
- [ ] Confirmar que Vercel reenvía la cookie y el `Set-Cookie`
- [ ] GitHub Actions: despliegue con Vercel CLI (el plan Hobby no conecta repos de organizaciones) en `dataiq-frontend.yml`, que ya corre el build, las pruebas y la revisión de los tipos de la API en cada PR. El build lee `../../shared/design/`, fuera de `dataiq/frontend`: construir en Actions (`vercel build`) y subir con `vercel deploy --prebuilt`, o desplegar desde la raíz del repo con `dataiq/frontend` como Root Directory; si se sube solo `dataiq/frontend`, el build falla

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
| 17 | Para que los frontends de SIVRI y SIMIQ3D usen la misma cookie, tenían que servirse desde el mismo origen que este, y no estaba definido cómo | Por rewrites del proyecto de Vercel del shell hacia el de cada módulo, `/simiq3d/:path*` y `/sivri/:path*`, como el de `/api/dataiq/*`. Cada app conserva su `baseHref` (`/simiq3d/`, `/sivri/`) y el shell la enlaza con navegación completa. SIVRI manda los cuadros directo al Servidor PC1 con el token corto, así que su backend necesita CORS para el origen del shell. «Ver en 3D» y «Comprobar con la cámara» están en todas las técnicas: si el módulo no cubre una, su pantalla lo dice y ofrece las que sí (decidido por Juan el 2026-10-29) |
| 18 | La revisión del mockup comenta por sección y por celda, y el autor deja una nota al enviar; la API solo guarda un `reason` al rechazar y `submit` no recibe cuerpo | Sin cambiar la API. Los comentarios se juntan en el `reason`, primero la nota general y después una línea por comentario con su sección y, si es de la mesa, el número y el nombre del objeto («Mesa de Mayo · 6 Separador de Senn Miller: …»). El autor lo lee en Mis borradores y en el editor, con sus saltos de línea. Sin nota del autor al enviar ni nota de la versión al publicar. Guardar los comentarios aparte queda para después del MVP (decidido por Juan el 2026-10-29) |
| 19 | «Dónde va» (técnicas que usan un instrumento) no tenía endpoint | Se calcula en el cliente con `GET /catalog/full`, que trae las técnicas publicadas con sus objetos: el mismo recurso del editor, que la caché HTTP comparte (decidido por Juan el 2026-10-29) |
| 20 | «Continuar con Google» no tenía endpoint ni decisión; recuperar la contraseña es de después del MVP | En el MVP no hay ninguno de los dos: `cuenta.html` los muestra, pero la pantalla no. Quien olvide la contraseña no la recupera en el MVP. Los dos quedan en `docs/despues-del-mvp.md` (decidido por Juan el 2026-10-29) |
| 21 | El detalle mostraba técnicas archivadas a un revisor, pero `GET /techniques` solo devuelve publicadas | Sin archivadas en el MVP: la API no las expone y una archivada no vuelve a publicarse. Al archivar, el detalle se queda con el aviso «Técnica archivada…» y sin los módulos, con lo que ya tenía cargado, y la columna la marca «Archivada» mientras la página siga abierta; al volver a cargar ya no aparece, como en el catálogo. Consultar las archivadas queda para después del MVP (decidido por Juan el 2026-10-29) |
| 22 | Mis borradores y el editor marcan cada sección completa o pendiente y bloquean el envío; el backend no define cuándo una sección está completa | La regla vive solo en el frontend (`domain/`): el backend revisa que el contenido sea coherente, y lo que llega a estudiantes lo garantiza el revisor. **Datos clínicos:** completa con «Para qué sirve» (`description`), indicaciones, anestesia, ropa, posición del paciente, la fuente (`source`, regla 1 de `CLAUDE.md`) y al menos una sutura; complicaciones, técnica quirúrgica y CUPS son opcionales. **Instrumental:** al menos un objeto. **Cada mesa:** completa si la versión dice que no la lleva (`used: false`) o si la lleva y todos sus objetos tienen celda; «sin mesa» si la versión no dice nada de ella (la fuente no trae su diagrama). Una sección en curso o pendiente bloquea enviar y publicar; «sin mesa» no bloquea. Es la regla del mockup del editor, más la fuente y «sin mesa» (decidido por Juan el 2026-10-29) |
| 23 | «Para qué sirve» iba como texto de demostración; no estaba claro si era `description` | Es `description`: la carga inicial la llena con la columna `para_que_sirve` de `seed/tecnicas.xlsx` (las 18 técnicas). Se muestra sin la marca «demostración» (2026-10-29) |
| 24 | Un colaborador no sabe si otra persona tiene una versión en curso (solo ve las suyas); el mockup muestra «En curso por …» | Sin cambiar la API. Un revisor o un admin ve «En curso por …»: `GET /versions` le trae todas las versiones en curso. Un colaborador ve las suyas («Continuar borrador», «Ver versión en revisión»); la de otra persona le llega como el 409 de «Editar técnica» («La técnica ya tiene una versión en curso»), que se muestra en el mismo botón (decidido por Juan el 2026-10-29) |
| 25 | La API permite descartar un borrador, pero ningún mockup tenía la acción | «Descartar borrador» en «Más acciones» del editor, con la confirmación en el mismo panel, como Archivar en el detalle. Solo en borrador (la API responde 409 en revisión). Si es la versión 1 de una técnica que nunca se publicó, la confirmación avisa que también se borra la técnica (decidido por Juan el 2026-10-29) |
| 26 | La barra y el pie enlazaban páginas sin ruta ni contenido: Quiénes somos, La investigación, Guía para estudiantes, Para docentes, Preguntas frecuentes, Cómo funciona y Términos de uso | Llevan a la sección del inicio que ya trata el tema: «Cómo funciona» a `#camino`, «La investigación» a `#investigacion`, «Preguntas frecuentes» a `#preguntas`, y «Guía para estudiantes» y «Para docentes» a su perfil en `#quien`. «Quiénes somos» y «Términos de uso» no se muestran en el MVP: no tienen texto y no se inventa (decidido por Juan el 2026-10-29) |
| 27 | El detalle mostraba las suturas y los equipos en «Datos clínicos», que es pública, pero la API solo los entrega con cuenta (`GET /techniques/{id}/instruments`) | Pasan a la pestaña Instrumental, detrás de la puerta de cuenta, sin cambiar la API: lo libre son el catálogo y los datos clínicos, y lo que se usa en la mesa (instrumental, suturas, equipos y dispositivos) pide cuenta (`docs/flujos.md`). «Datos clínicos» queda con lo de `GET /techniques/{id}` (decidido por Juan el 2026-10-29) |
| 28 | El paso 1 del editor dejaba cambiar el nombre y la especialidad, pero `PUT /versions/{id}` no los recibe (son de `techniques`) y no hay ruta para cambiarlos | Se eligen en el primer paso de «Nueva técnica», que crea la técnica (`POST /techniques`) en cuanto tiene los dos; desde ahí son de solo lectura. Un error en el nombre de una técnica que nunca se publicó se corrige descartando el borrador y creándola otra vez. Cambiarlos en una técnica publicada queda para después del MVP (decidido por Juan el 2026-10-29) |
| 29 | El editor tomaba cada sutura como plano + un texto; la API pide `name`, `gauge`, `needle_type` y `usage` (la carga inicial pone el plano en `usage`) | Una fila por plano con sutura, calibre y aguja. `data/` junta en una sola sutura los planos que comparten esos tres datos, con los planos en `usage` separados por «; » (como la carga inicial: la API rechaza una sutura repetida), y al leer los vuelve a separar (decidido por Juan el 2026-10-29) |
| 30 | El registro exige aceptar la política de tratamiento de datos, pero su texto no estaba en el repo; tenía que declarar el registro anónimo del chat de SIMIQ3D (#29) | El aviso de privacidad, en [`docs/privacidad.md`](../../docs/privacidad.md) (versión 1.0, la de `POLICY_VERSION`): la responsable es la CURN, con su política (Acuerdo 02 de 2017); solo mayores de 18; declara el registro del chat y dónde se guardan los datos (#32, decidido por Mauricio el 2026-10-29) |

### Por confirmar

No queda ninguno.
