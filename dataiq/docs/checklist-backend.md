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
- [x] `instruments` (con `description`, sin imagen), `instrument_aliases`, `techniques` (FK)
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
   - [x] Descartar un borrador (`DELETE /versions/{id}`): solo su autor o un
     admin; si la técnica nunca se publicó, se borra con él. Lo publicado no se
     borra, se archiva
   - [x] Roles: `GET /users` (con la fecha de registro y la política aceptada)
     y `PATCH /users/{id}/role`, solo admin y no
     sobre su propia cuenta. El primer admin se asigna por terminal:
     `uv run python -m app.adapters.inbound.cli.assign_role <correo> admin`
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
   - [ ] Hacer pública la imagen en ghcr.io (Cloud Run solo baja imágenes
     públicas de ghcr.io)
   - [ ] Neon: proyecto, migraciones y carga inicial
   - [ ] Cloud Run: servicio con las variables de entorno y despliegue desde
     GitHub Actions
10. [ ] Token corto para los módulos (lo necesita SIVRI): el navegador llama al
    backend de SIVRI en otro dominio (el portátil del laboratorio, por
    Tailscale), así que la cookie de sesión no viaja. Un endpoint con la
    cookie y `X-IQ-Client` devuelve un JWT de pocos minutos, renovable, que la
    página manda a SIVRI en `Authorization: Bearer`; SIVRI lo valida con el
    JWKS y lo reenvía a DataIQ para pedir los datos. Revisar que la ruta del
    JWKS quede accesible en el despliegue (Vercel reserva `/.well-known`)

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
