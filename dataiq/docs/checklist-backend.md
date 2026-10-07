# Checklist — Backend DataIQ

Avance del backend de DataIQ. Se marca cada pieza al terminarla.

Meta del Corte 2 (12 de octubre, según la Planificación del Módulo 2):
base de datos, backend hexagonal, CRUD, autenticación y dataset cargado.

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14)
- [x] Dependencias base: FastAPI, SQLAlchemy async, asyncpg, Alembic, pydantic-settings
- [x] `.gitignore` en la raíz
- [x] Estructura hexagonal (`dominio/`, `puertos/`, `adaptadores/entrada|salida`)
- [x] Configuración con `pydantic-settings` + `.env.example`
- [x] PostgreSQL local en contenedor (Podman)
- [x] Conexión async (`base_datos.py`) con `naming_convention`
- [x] Ruff (formato + lint)
- [x] Pasar el contenedor local a PostgreSQL 18 (lo exige `uuidv7()`)
- [x] Ids UUIDv7 en los modelos ya escritos

## Modelos SQLAlchemy (según `esquema.dbml`)

- [x] Tablas simples: `Especialidad`, `Zona`, `CategoriaInstrumental`, `EquipoBiomedico`, `DispositivoMedico`
- [x] `Sutura` (UNIQUE compuesto con `NULLS NOT DISTINCT`)
- [x] `Usuario` (enum `rol_usuario`, campos de consentimiento)
- [x] `Instrumental` (con `descripcion`, sin imagen), `InstrumentalAlias`, `Tecnica` (FK)
- [x] `TecnicaVersion` (enum `estado_version`, CHECKs, índices únicos parciales)
- [x] `ItemTecnica` (`zona_id`, CHECK `numero_con_mesa`), `ItemTecnicaComponente` (CHECK `num_nonnulls`)
- [x] `PosicionMesa` (FK compuesta de 3 columnas)
- [x] Tablas intermedias de `TecnicaVersion` (PK compuesta)

## Migraciones

- [x] Configurar Alembic en modo async
- [x] Primera migración y comparación contra `esquema.dbml`

## Siguientes piezas (en este orden)

Cada pieza lleva sus tests al hacerla; no hay una etapa de tests al final.

1. [x] Dominio: reglas del versionado (transiciones de estado; solo un revisor o un admin publica)
2. [x] Puertos y repositorios
3. [x] Endpoints de lectura (con `Cache-Control`/`ETag`) y `/catalogo/completo`
   - Sin cuenta: `GET /tecnicas` y `GET /tecnicas/{id}` (datos clínicos)
   - Con cuenta: `GET /tecnicas/{id}/instrumental` (objetos, mesas, suturas,
     equipos y dispositivos), `GET /instrumental` y `GET /catalogo/completo`
4. [x] Endpoints de escritura:
   - [x] Técnicas: crear técnica nueva y crear versión desde la publicada
     (desde colaborador), editar el borrador propio (`PUT`, reemplaza todo el
     contenido), enviar a revisión, aprobar, rechazar con motivo, publicar
     directo (revisor o admin, lo suyo) y archivar (desde revisor, no con una
     versión en curso). Consultar versiones: `GET /versiones` y
     `GET /versiones/{id}`
   - [x] Tabla `RechazoVersion`: al rechazar se guarda quién, por qué y cuándo
     (el motivo es obligatorio) y la versión vuelve a borrador
   - [x] Aprobar y rechazar solo si la versión sigue `en_revision`: la fila se
     bloquea (`SELECT ... FOR UPDATE`) y se vuelve a revisar el estado; si otro
     revisor ya la decidió, se responde 409
   - [x] Instrumental: crear y editar, sin borrar, solo admin o revisor (editarlo
     cambia las técnicas publicadas que lo usan sin pasar por revisión)
   - [x] Roles: `GET /usuarios` y `PATCH /usuarios/{id}/rol`, solo admin y no
     sobre su propia cuenta. El primer admin se asigna por terminal:
     `uv run python -m app.adaptadores.entrada.cli.asignar_rol <correo> admin`
5. [x] Autenticación: JWT asimétrico (EdDSA) + JWKS, Argon2id
   - `POST /auth/registro` (autorregistro con la política aceptada),
     `POST /auth/login`, `GET /auth/yo` y `GET /.well-known/jwks.json`
   - El rol se lee de la base de datos en cada petición, no del token
   - SIVRI y SIMIQ3D piden `/catalogo/completo` con el token de quien usa el
     módulo
6. [x] Datos: completar el catálogo con los objetos de los arreglos de mesa y
   transcribir las posiciones a fila/columna (en paralelo con 1–5, empezando
   por la mesa de Mayo de Tiroidectomía)
7. [x] Script de carga inicial (seed): catálogo normalizado + técnicas
8. [ ] Revisar y completar la documentación Swagger
9. [ ] Dockerfile, CI/CD (GitHub Actions → ghcr.io → Cloud Run), Neon (Corte 3)

## Datos de la fuente que no cuadraban

Criterio: lo que los documentos de IQ traen completo se carga tal cual. Lo que
no cuadra se corrige cuando el mismo documento lo aclara (`IQ corregido`), y
lo que falta se propone con los principios publicados de armado de mesa
(`propuesto`). La columna `origen` de `semilla/tecnicas.xlsx` lo marca en cada
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
