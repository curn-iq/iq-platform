# Checklist — Backend DataIQ

Avance del backend de DataIQ. Se marca cada pieza al terminarla.

Meta del Corte 2 (12 de octubre, según la Planificación del Módulo 2):
base de datos, backend hexagonal, CRUD, autenticación y dataset cargado.

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14)
- [x] Dependencias base: FastAPI, SQLAlchemy async, asyncpg, Alembic, pydantic-settings
- [x] `.gitignore` en la raíz
- [x] Estructura hexagonal (`domain/`, `ports/`, `adapters/inbound|outbound`)
- [x] Configuración con `pydantic-settings` + `.env.example`
- [x] PostgreSQL local en contenedor (Podman)
- [x] Conexión async (`database.py`) con `naming_convention`
- [x] Ruff (formato + lint)
- [x] Pasar el contenedor local a PostgreSQL 18 (lo exige `uuidv7()`)
- [x] Ids UUIDv7 en los modelos ya escritos
- [x] Código, base de datos y API en inglés; comentarios y mensajes en español

## Modelos SQLAlchemy (según `esquema.dbml`)

- [x] Tablas simples: `specialties`, `zones`, `instrument_categories`, `biomedical_equipment`, `medical_devices`
- [x] `sutures` (UNIQUE compuesto con `NULLS NOT DISTINCT`)
- [x] `users` (enum `user_role`, campos de consentimiento)
- [x] `instruments` (con `description` y su fuente, `description_source`; sin imagen), `instrument_aliases`, `techniques` (FK)
- [x] `technique_versions` (enum `version_state`, CHECKs, índices únicos parciales)
- [x] `technique_items` (`zone_id`, CHECK `number_requires_zone`), `item_components` (CHECK `num_nonnulls`)
- [x] `item_cells` (FK compuesta de 3 columnas)
- [x] `version_zones`: si la versión lleva cada mesa («no lleva») y su tamaño
- [x] Tablas intermedias de `technique_versions` (PK compuesta)

## Migraciones

- [x] Configurar Alembic en modo async
- [x] Primera migración y comparación contra `esquema.dbml` (rehecha como una
  sola al pasar a inglés: no había base de datos desplegada)

## Siguientes piezas (en este orden)

Cada pieza lleva sus tests al hacerla; no hay una etapa de tests al final.

1. [x] Dominio: reglas del versionado (transiciones de estado; solo un revisor o un admin publica)
2. [x] Puertos y repositorios
3. [x] Endpoints de lectura (con `Cache-Control`/`ETag`) y `/catalog/full`
   - Sin cuenta: `GET /techniques` y `GET /techniques/{id}` (datos clínicos)
   - Con cuenta: `GET /techniques/{id}/instruments` (mesas con su tamaño,
     objetos, suturas, equipos y dispositivos), `GET /instruments` y
     `GET /catalog/full`
   - [x] Sin cuenta: `GET /specialties` (para filtrar y para crear técnicas)
   - [x] Cada objeto trae `zone_id` además del nombre de la mesa (lo que pide
     el `PUT` del borrador)
4. [x] Endpoints de escritura:
   - [x] Técnicas: crear técnica nueva y crear versión desde la publicada
     (desde colaborador), editar el borrador propio (`PUT`, reemplaza todo el
     contenido), enviar a revisión, aprobar, rechazar con motivo, publicar
     directo (revisor o admin, lo suyo) y archivar (desde revisor, no con una
     versión en curso). Consultar versiones: `GET /versions` y
     `GET /versions/{id}`; «Revisadas por mí» con `?reviewed_by_me=true`
     (las de otros que el revisor aprobó o rechazó)
   - [x] Tabla `version_rejections`: al rechazar se guarda quién, por qué y cuándo
     (el motivo es obligatorio) y la versión vuelve a borrador
   - [x] Aprobar y rechazar solo si la versión sigue `in_review`: la fila se
     bloquea (`SELECT ... FOR UPDATE`) y se vuelve a revisar el estado; si otro
     revisor ya la decidió, se responde 409
   - [x] Instrumental: crear y editar, sin borrar, solo admin o revisor (editarlo
     cambia las técnicas publicadas que lo usan sin pasar por revisión). El
     `PATCH` también reemplaza los alias
   - [x] Una descripción del instrumental va siempre con su fuente
     (`description_source`); sin ella, la API responde 422
   - [x] Descartar un borrador (`DELETE /versions/{id}`): solo su autor o un
     admin; si la técnica nunca se publicó, se borra con él. Lo publicado no se
     borra, se archiva
   - [x] Roles: `GET /users` (con la fecha de registro y la política aceptada)
     y `PATCH /users/{id}/role`, solo admin y no
     sobre su propia cuenta. El primer admin se asigna por terminal:
     `uv run python -m app.adapters.inbound.cli.assign_role <correo> admin`
   - [x] Supresión de una cuenta por terminal, cuando su titular la pide por
     el canal del aviso de privacidad ([`docs/privacidad.md`](../../docs/privacidad.md)):
     `uv run python -m app.adapters.inbound.cli.delete_account <correo>`. Sin
     contenido se borra entera; si creó o revisó técnicas o versiones, se
     borran su nombre, su correo y su contraseña, y lo que hizo se conserva
     sin su nombre
   - [ ] Pedir que se acepte de nuevo el aviso cuando cambie su versión
     (`users.policy_version` distinta de `POLICY_VERSION`), antes de publicar
     la versión 1.1; el aviso lo promete (Decreto 1377 de 2013, art. 5)
5. [x] Autenticación: JWT asimétrico (EdDSA) + JWKS, Argon2id
   - `POST /auth/register` (autorregistro con la política aceptada),
     `POST /auth/login`, `GET /auth/me` y `GET /.well-known/jwks.json`
   - El rol se lee de la base de datos en cada petición, no del token
   - [x] Token de 2 horas
   - [x] Sesión del navegador en cookie `HttpOnly` (`POST /auth/login` y
     `POST /auth/logout`), encabezado `X-IQ-Client` contra CSRF y
     `POST /auth/token` (Bearer) para lo que no es navegador
   - [x] CORS configurable (`CORS_ORIGINS`), vacío por defecto: con el proxy
     de Vercel todo es mismo origen
   - [x] Dos peticiones que chocan contra un `UNIQUE` responden 409, no 500
   - SIVRI y SIMIQ3D piden `/catalog/full` con el token de quien usa el
     módulo
6. [x] Datos: completar el catálogo con los objetos de los arreglos de mesa y
   transcribir las posiciones a fila/columna (en paralelo con 1–5, empezando
   por la mesa de Mayo de Tiroidectomía)
7. [x] Script de carga inicial (seed): catálogo normalizado + técnicas
8. [—] Completar la documentación Swagger: fuera del MVP. FastAPI ya genera
   `/docs` con las rutas, los esquemas y la explicación de cada ruta; faltaría
   declarar las respuestas de error (401, 403, 409, 422), que siempre traen
   `{"detail": ...}`
9. [ ] Despliegue (Corte 3)
   - [x] `Dockerfile` (dos etapas con uv, sin root, sin `.env`) y `.dockerignore`
   - [x] GitHub Actions: estilo y pruebas en cada PR (con PostgreSQL 18); en
     `main`, la imagen a `ghcr.io/curn-iq/dataiq-backend` con un tag por commit
   - [x] Imagen pública en ghcr.io
   - [x] Neon: proyecto `dataiq`, migraciones y carga inicial
   - [x] Vercel: proyecto `dataiq-backend` (región `cle1`, `NullPool`,
     variables de entorno secretas), probado de punta a punta
   - [x] Despliegue automático a Vercel desde GitHub Actions en cada push a
     `main` (`.github/workflows/dataiq-backend.yml`, desde el 2026-10-14)
   - [ ] Previews por PR con una rama `dev` de la base en Neon (cuando haya
     usuarios que proteger)
10. [ ] Token corto para los módulos (lo necesita SIVRI): el navegador llama al
    backend de SIVRI en otro dominio (el Servidor PC1 del laboratorio, por
    Tailscale), así que la cookie de sesión no viaja. Un endpoint con la
    cookie y `X-IQ-Client` devuelve un JWT de pocos minutos, renovable, que la
    página manda a SIVRI en `Authorization: Bearer`; SIVRI lo valida con el
    JWKS y lo reenvía a DataIQ para pedir los datos. Revisar que la ruta del
    JWKS quede accesible en el despliegue (Vercel reserva `/.well-known`)
11. [x] Contenido de las versiones en la lista de `GET /versions`. A cargo de
    Mauricio Lugo (asignado por Juan el 2026-11-02; hallazgo de la revisión
    de la fase 6 del frontend)
    - **Por qué:** Mis borradores muestra el avance de cada sección y la nota
      de la última devolución, y los dos salen del contenido y de los
      rechazos de cada versión. `GET /versions` no los trae, así que la
      pantalla hace 1 + N peticiones: la lista y un `GET /versions/{id}` por
      cada versión en curso (`VersionsRepository.getMany` del frontend). Cada
      una devuelve el contenido completo y, en Vercel, es una invocación
      aparte con su propia conexión a Neon (`NullPool`). Además es todo o
      nada: si una falla, la matriz entera dice que no pudo cargar, y
      «Reintentar» vuelve a pedir las N.
    - **Hecho el 2026-11-02:** `GET /versions?include=content` trae cada
      versión como `GET /versions/{id}` (resumen, contenido y rechazos), con
      los mismos filtros y permisos, `Cache-Control` y `ETag`. El contenido de
      todas sale con las mismas consultas, sean una o muchas: el repositorio
      lo arma con `build_details`, como `/catalog/full`, y una prueba compara
      las consultas con una versión y con tres. `GET /versions/{id}` usa el
      mismo código, así que las dos rutas devuelven lo mismo. Sin `include`,
      la lista sigue como estaba. El avance se sigue calculando en el
      frontend (`versionProgress`, Resuelto 22 de
      [`checklist-frontend.md`](checklist-frontend.md)).
    - **Después:** Mis borradores la usa en lugar de `getMany` (fase 6 de
      [`checklist-frontend.md`](checklist-frontend.md)). Los tipos del
      frontend ya se regeneraron con la ruta (`npm run api:types`)
    - [x] Limitar `reviewed_by_me=true&include=content` antes de que una
      pantalla la use: «Revisadas por mí» (fase 7 del frontend) la pedía así,
      y solo muestra el estado y los rechazos, no el contenido, que es casi
      todo el peso (unos 14 KB por versión, contra 0,3 KB del resumen).
      Decidido por Mauricio Lugo el 2026-11-03, en lugar de la paginación del
      issue #61: `include=rejections` trae cada versión con su resumen y sus
      rechazos, sin el contenido (una «vista» parcial, como recomienda la guía
      AIP-157 de Google). Así la lista se mantiene pequeña sin páginas: el
      límite de 4,5 MB de una respuesta de Vercel llegaría pasadas unas
      10 000 versiones decididas por un mismo revisor. Paginar queda para si
      la lista se vuelve larga de leer; con `limit` y `offset` opcionales no
      rompe nada. Mis borradores no la pide así (observación de
      Juan en el PR #55, 2026-11-02)
      - **Decidido por Juan el 2026-11-02: con paginación**, porque «Revisadas
        por mí» (fase 7 del frontend) ya la pide. A cargo de Mauricio Lugo.
        `GET /versions` recibe `limit` (como máximo 100) y `offset`, ambos
        opcionales; sin `limit` la lista sigue como hoy, así que Mis borradores
        no cambia. El orden, de la más reciente a la más vieja, lleva el `id`
        como desempate para que dos páginas no repitan ni salten una versión.
        Siguen `Cache-Control` y `ETag`, con su prueba, su documentación en
        Swagger y los tipos del frontend regenerados (`npm run api:types`)
      - **Después:** «Revisadas por mí» pide de a 20 y «Cargar más» trae las
        siguientes (fase 7 de [`checklist-frontend.md`](checklist-frontend.md)),
        en el PR de la fase 7 del frontend, después de que el del backend entre
        a `main`
12. [ ] Filtro por técnica en `GET /versions`. A cargo de Mauricio Lugo
    (asignado por Juan el 2026-11-02; hallazgo de la revisión de la fase 7
    del frontend)
    - **Por qué:** la pantalla de revisión compara una edición con la versión
      publicada de su técnica. Para encontrarla pide
      `GET /versions?state=published`, que trae las publicadas de todo el
      catálogo, y la busca por `technique_id` en el navegador
      (`features/management/review/review.ts`). Esa respuesta crece con el
      catálogo y es una petición más antes de `GET /versions/{id}`, así que
      la revisión tarda más en cargar a medida que hay más técnicas.
    - **Qué falta:** un parámetro `technique_id` en `GET /versions` que
      filtre en la consulta, combinable con `state` y con los mismos permisos
      (un revisor ve las de todos), con `Cache-Control` y `ETag`, su prueba,
      su documentación en Swagger y los tipos del frontend regenerados
      (`npm run api:types`).
    - **Después:** la pantalla de revisión pide
      `GET /versions?state=published&technique_id=…` en lugar de la lista
      completa (fase 7 de [`checklist-frontend.md`](checklist-frontend.md)).
      Va en el PR de la fase 7 del frontend, después de que el del backend
      entre a `main`

## Hallazgos de seguridad pendientes

Cosas que se vieron al construir el frontend y que el backend aún no resuelve. Se anotan
aquí para que quien opere el backend las decida.

- [x] **Enumeración de usuarios en `POST /auth/register`** (hallazgo de la fase 5 del frontend,
  decidido por Juan el 2026-11-01). Un correo que ya tiene cuenta responde `409 «Ya hay una
  cuenta con ese correo»` (`UserRepository.create`), y uno nuevo responde `201`: cualquiera
  puede probar correos con una petición directa y saber cuáles tienen cuenta. El ingreso ya
  está cuidado (compara contra un hash de relleno para que tarde igual y dice lo mismo si el
  correo no existe), así que el registro es la diferencia observable.
  - **Recomendado:** respuestas externas uniformes para un correo nuevo y uno existente, sin
    diferencias observables en el mensaje, el código HTTP ni el tiempo de respuesta; sin un
    servicio de correo, quien ya tiene cuenta lo sabría al fallar su ingreso. Y **limitar los
    intentos** (rate limiting) en el registro y en el ingreso, para frenar a quien prueba
    correos de forma automática (ítem siguiente).
  - **Decidido por Mauricio Lugo el 2026-11-01: en el MVP el 409 se queda, como riesgo
    aceptado**, con [OWASP ASVS 5.0](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x15-V6-Authentication.md).
    Que no se pueda deducir qué cuentas existen, también en el registro, es el requisito
    6.3.8, de nivel 3, y aquí solo revela que una persona usa una plataforma de estudio; la
    [guía de autenticación de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
    deja el mensaje genérico a criterio, según lo crítica que sea la aplicación. Lo que sí pide
    el nivel 1 es limitar los intentos (ítem siguiente), que además impide probar correos a
    gran escala. Responder igual sin verificar el correo no lo cerraría: quien se registra y
    luego ingresa con esa misma contraseña sabe, por el resultado, si el correo ya tenía
    cuenta. La respuesta única, con verificación del correo, queda para después del MVP
    ([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).
  - **Mientras tanto:** el frontend no repite el texto del 409 ni marca el campo del correo
    (Resuelto 43 de [`checklist-frontend.md`](checklist-frontend.md)); es una mitigación
    visual temporal que no impide la consulta directa a la API. El backend y sus contratos no
    se tocan en la fase 5.
- [ ] **Límite de intentos en la autenticación** (decidido por Mauricio Lugo el 2026-11-01, con
  los requisitos 6.1.1 y 6.3.1 de OWASP ASVS 5.0, de nivel 1): una regla del firewall de
  Vercel en `dataiq-backend`, con su configuración y su porqué en
  [`docs/arquitectura.md`](../../docs/arquitectura.md), «Límite de intentos de autenticación».
  - [x] Crear y publicar la regla con el comando de `docs/arquitectura.md`
  - [x] Comprobar el 429 desde la petición 101 de una misma IP, con peticiones que no llegan a
    la base ni a Argon2 (sin `X-IQ-Client` responden 403). Probado el 2026-11-01: 100 × 403 y
    luego 429, también en `/auth/register`, con el cuerpo
    `{"error": {"code": "429", "message": "Too Many Requests", …}}`, sin `detail`
  - [ ] Con el shell desplegado (fase 9 del frontend), confirmar qué IP ve el firewall del
    backend en una petición que pasa por el rewrite (`vercel firewall traffic list`); si es la
    de Vercel, pasar la regla al proyecto del shell
  - [x] Avisar al frontend, en la descripción del PR que agrega este ítem, que hoy no tiene
    texto para un 429 (`describeApiError`, en `core/http/error-message.ts`, solo lee
    `detail`): el registro diría «No se pudo completar el registro»

## Datos de la fuente que no cuadraban

Criterio: lo que los documentos de IQ traen completo se carga tal cual. Lo que
no cuadra se corrige cuando el mismo documento lo aclara (`IQ corregido`), y
lo que falta se propone con los principios publicados de armado de mesa
(`propuesto`). La columna `origen` de `seed/tecnicas.xlsx` lo marca en cada
mesa y cada objeto: lo corregido y lo propuesto es lo que IQ debe validar.

Criterios para los arreglos sin nombre:

- Un arreglo sin nombre, en una técnica que no tiene mesa de reserva, se toma
  como mesa de Mayo.
- Si el dibujo trae un recuadro chico dentro de uno grande (Histerectomía
  vaginal, Colporrafia, Reemplazo total de cadera y de rodilla), el chico es
  la mesa de Mayo y el resto la de reserva. Así lo indica el contenido: el
  recuadro chico tiene el instrumental de las mesas de Mayo que IQ sí nombra
  (por ejemplo, la de Cesárea y la de Ooforectomía), y el resto tiene lo de sus
  mesas de reserva (compresa con sutura y portaagujas, pinza Foerster,
  riñonera, instrumental sobrante).
- Si la técnica ya tiene una mesa de Mayo con nombre, el otro arreglo sin
  nombre es la de reserva (Histerectomía laparoscópica).

| Técnica | Qué no cuadraba en la fuente | Cómo quedó en la carga |
|---|---|---|
| Mastectomía | Mesa de Mayo, número 8: "Mb 4 h.b 2º" no dice qué hoja de bisturí es; la mesa de reserva usa letras sin significado definido | Mango n.° 4 con hoja #20 (IQ corregido); mesa de reserva propuesta |
| Cesárea, Ooforectomía con salpingectomía | La mesa de reserva usa letras (A, B, a, c, E) sin significado definido | A y B se leyeron por su texto (IQ corregido); la mesa de reserva, propuesta |
| Hemicolectomía laparoscópica | Mesa de Mayo: el número 4 lo reclaman dos objetos y el 9 no aparece en la grilla; hay una segunda mesa sin identificar | El 4 es la aguja de Veress (IQ corregido); las dos mesas, propuestas |
| Hemicolectomía derecha (abierta) | Los dos documentos de hemicolectomía de IQ son de la técnica laparoscópica | Las dos mesas, propuestas |
| Colecistectomía | Mesa de reserva: 12 números en la grilla y 11 objetos en la leyenda | Mesa de reserva propuesta |
| Prostatectomía laparoscópica | Mesa de reserva: la leyenda tiene 13 objetos; la grilla llega hasta el 14 y le falta el 8 | Mesa de reserva propuesta |
| Prostatectomía | No trae una mesa de reserva que se pueda cargar | Mesa de reserva propuesta |
| Histerectomía laparoscópica | "Mayo tiempo abdominal": 10 números en la grilla y 9 objetos en la leyenda | El 9 se separó en los trocares de 10-12 mm y de 5 mm (IQ corregido); la mesa de Mayo, propuesta |
| Nefrectomía laparoscópica | No tiene arreglo de mesa | Las dos mesas, propuestas |
| Cistolitotomía endoscópica | Mesa de reserva: el número 3 dice "elementos" sin decir cuáles y el número 4 no dice qué evacuador | Varilla del Lithoclast y evacuador de Ellik (IQ corregido) |
| Colecistectomía, Tiroidectomía | El instrumento aparece como "Moninjan", la escritura fonética de Moynihan | Pinza de Moynihan; "Pinza Moninjan" queda como alias (hoja `catalogo`, columna `alias`) |
