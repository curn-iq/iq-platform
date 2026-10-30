---
paths:
  - "dataiq/backend/**"
  - "dataiq/docs/**"
---

# DataIQ: backend, esquema y catálogo

Cómo se corre y cómo lo usa el frontend: `dataiq/README.md`. Avance y reglas
de cada ruta (quién puede qué): `dataiq/docs/checklist-backend.md`; la
documentación interactiva de la API está en `/docs`.

## Código

- FastAPI con arquitectura hexagonal: `app/domain/` (reglas puras),
  `app/ports/`, `app/adapters/inbound|outbound/`. Las reglas del negocio (p.
  ej. las transiciones de estado) se validan en el dominio, no en la base.
- Lecturas: `async def` con `asyncpg`, sin consultas N+1 (joins o eager
  loading) y con `Cache-Control` y `ETag`. `/catalog/full` es el endpoint
  completo que SIVRI y SIMIQ3D cachean por sesión; los paginados y filtrables
  son para el frontend. El JSON lo genera Pydantic; no hace falta `orjson`.
- Autenticación propia (no FastAPI-Users): contraseñas con Argon2id; JWT con
  EdDSA (Ed25519) de 2 horas, clave privada en `JWT_PRIVATE_KEY` y pública en
  `/.well-known/jwks.json`. El rol se lee de la base en cada petición, no del
  token. `POST /auth/login` deja la cookie y no devuelve el token;
  `POST /auth/token` devuelve el token para lo que no es navegador.
- El primer admin se asigna por terminal
  (`uv run python -m app.adapters.inbound.cli.assign_role <correo> admin`); los
  demás roles, desde la API. Una cuenta se suprime con
  `uv run python -m app.adapters.inbound.cli.delete_account <correo>`.

## Esquema

La fuente es `dataiq/docs/esquema.dbml`: leerla antes de tocar modelos o
migraciones, y no duplicar el esquema en otro lado.

- **Restricciones declaradas en los modelos de SQLAlchemy** (`CheckConstraint`,
  `Index(..., unique=True, postgresql_where=...)`, `UniqueConstraint(...,
  postgresql_nulls_not_distinct=True)`): si no, `alembic --autogenerate` no
  las incluye. En el DBML, los CHECK van en bloques `checks { }`; los índices
  únicos parciales de `technique_versions` y el `NULLS NOT DISTINCT` de
  `sutures`, en la `Note` de su tabla. La base se crea con las migraciones,
  nunca con el «Export» de dbdiagram.
- **Ids UUIDv7** generados por la base (`uuidv7()`); **fechas `timestamptz`**,
  con `now()` por defecto en `created_at` y `updated_at`.
- **Versionado:** `techniques` es solo la identidad (nombre y especialidad);
  todo el contenido cuelga de `technique_versions`. Editar una técnica
  publicada es crear una versión nueva en `draft`; al aprobarla, en una misma
  transacción la anterior pasa a `superseded` y la nueva a `published`.
  Máximo una versión publicada y una en curso (`draft` o `in_review`) por
  técnica; solo la publicada se expone a estudiantes, SIVRI y SIMIQ3D.
- **Transiciones permitidas:** `draft → in_review`, `in_review → draft`
  (rechazo), `in_review → published`, `published → superseded`,
  `published → archived` y `draft → published` (un revisor o un admin
  publica lo suyo sin revisión). Publicar solo lo hace un revisor o un admin
  (`validate_publishing`).
- **Solo importa la posición, no la cantidad** (definido por IQ): no existe un
  campo de cantidad.
- `version_zones`: si la versión lleva cada mesa (`used`; `false` es el «no
  lleva» de los documentos de IQ) y el tamaño de su cuadrícula (`grid_rows`,
  `grid_columns`). El dominio valida que cada objeto esté en una mesa que la
  versión lleva y dentro de su tamaño.
- `technique_items`: un objeto físico, con su `legend_number` (el número del
  documento de IQ) y `source_text` literal. Cada mesa tiene su propia
  numeración: el objeto es único por `(version_id, zone_id, legend_number)`, y
  un número siempre tiene mesa (CHECK `number_requires_zone`).
- **Un objeto «X con Y»** (p. ej. «compresa doblada con sutura y
  portaagujas») es un solo `technique_items` con varios `item_components`;
  cada componente apunta a un instrumento o a una sutura, nunca a ambos ni a
  ninguno. Un conflicto real es solo cuando dos instrumentos independientes
  reclaman el mismo número.
- `item_cells`: celdas `(zona, fila, columna)` de una cuadrícula, no
  coordenadas (los arreglos de IQ son diagramas a mano). Las columnas son
  `grid_row` y `grid_column`; en el dominio y el JSON, `row` y `column`.
  `item_cells.version_id` y `item_cells.zone_id` son redundantes **a
  propósito**: garantizan una sola pieza por celda, y la FK compuesta
  `(item_id, version_id, zone_id)` (que necesita el `UNIQUE (id, version_id,
  zone_id)` de `technique_items`) impide que la celda quede en otra versión u
  otra mesa. No quitarlos.
- `instruments.description` es lo que SIMIQ3D muestra al tocar un
  instrumento: la API no la acepta sin `description_source`. DataIQ no guarda
  imágenes del instrumental.
- `users.policy_accepted_at` y `users.policy_version` prueban la autorización
  de tratamiento de datos (Decreto 1377 de 2013, art. 8). El aviso es
  `docs/privacidad.md` y su versión, `POLICY_VERSION`: si cambia, el texto y la
  constante cambian juntos.
- `cups_code` es el código CUPS del procedimiento (opcional); CIE-10 no
  aplica porque clasifica diagnósticos.

## Catálogo y carga inicial

- `seed/load.py` lee `seed/tecnicas.xlsx` (en español; la carga traduce a los
  nombres del esquema) y deja cada técnica con su versión 1 publicada. Se
  puede correr varias veces. Solo llena una descripción vacía, para no pisar
  la de un revisor; `--descriptions` las reemplaza por las del archivo.
- El catálogo crudo de IQ tiene 148 variantes de nombre; normalizado, 94
  instrumentos canónicos, más los objetos de los arreglos de mesa: 146 en la
  carga. `instrument_aliases` guarda las variantes apuntando a su canónico.
- Un epónimo escrito como suena se corrige al original y la forma de IQ queda
  como alias («Pinza Moninjan» → Pinza de Moynihan).
- Prostatectomía (Urología) y Prostatectomía laparoscópica (Cirugía
  Laparoscópica) son técnicas distintas, no un duplicado.
- Lo que no cuadraba en los documentos de IQ y cómo quedó: sección «Datos de
  la fuente que no cuadraban» de la checklist del backend.
