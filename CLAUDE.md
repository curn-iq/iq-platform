# CLAUDE.md — Contexto del proyecto para Claude Code

> Este archivo es leído automáticamente por Claude Code al abrir este repositorio.
> Contiene el contexto completo del proyecto de grado para que cualquier sesión de
> Claude Code (o cualquier colaborador) pueda trabajar sin tener que reconstruir
> este contexto desde cero ni depender del Drive del proyecto.

**Idioma: responder SIEMPRE en español.** Todo mensaje al usuario va en
español, sin excepción: respuestas, avisos cortos entre pasos, resúmenes y
preguntas. Nunca en inglés.

## Quiénes somos y qué es esto

Proyecto de grado de Ingeniería de Sistemas en la Corporación Universitaria Rafael
Núñez (CURN), en colaboración con estudiantes de Instrumentación Quirúrgica (IQ).

- **Equipo ING**: Mauricio Lugo Granados, Guebriel Garces, Juan Caraballo.
- **Equipo IQ**: 3 estudiantes del programa de Instrumentación Quirúrgica.
- **Tutor**: Yair Fernando Cardona Acuña.

El equipo de IQ identificó una brecha pedagógica: sus estudiantes no tienen
herramientas tecnológicas para practicar/verificar la distribución de instrumental
quirúrgico en mesa fuera del laboratorio. El equipo de ING construye el ecosistema
de software que responde a esa brecha.

**Importante**: todo el ecosistema (los 3 módulos) es el proyecto de grado de
los tres integrantes del equipo ING, no solo SIVRI. Aunque originalmente se planeó una hoja de ruta escalonada
(SIVRI y DataIQ en 2026, SIMIQ3D desde febrero 2027), el tutor presionó para que
**los 3 módulos avancen en paralelo este mismo semestre**.

## Los tres módulos

Cada módulo es independiente: **tiene su propio backend y su propia base de
datos**. Esa es la definición de "módulo" en este proyecto — por eso la capa de
navegación (ver más abajo) NO se considera un módulo.

### M1 — SIVRI (Sistema Inteligente de Visión y Retroalimentación para Instrumentación Quirúrgica)

- **Qué es**: visión artificial (YOLO26) que reconoce instrumental quirúrgico en
  tiempo real vía cámara y valida si la disposición en mesa es correcta según la
  técnica quirúrgica evaluada, dando retroalimentación inmediata al estudiante.
- **Valida por técnica**, no por tiempo quirúrgico (las fases del
  procedimiento: diéresis, hemostasia, etc.). Validar por tiempo quirúrgico
  queda como trabajo futuro, no para este semestre.
- **Consume** técnicas/instrumental de DataIQ (nunca guarda su propia copia
  permanente — cachea por sesión, ver "Comunicación entre módulos").
- Núcleo del proyecto de grado (visión computacional), pero ya no es el único
  entregable — ver nota de arriba.
- **MVP** (decidido por Mauricio el 2026-10-13): valida la **mesa de Mayo de
  las cinco técnicas de Cirugía General**. Dataset propio: fotos de la mesa
  real tomadas por el programa de IQ, etiquetadas por ING y publicadas en
  Kaggle; cada clase es un instrumento del catálogo. Alcance, decisiones por
  definir y avance:
  [`sivri/README.md`](sivri/README.md).

### M2 — DataIQ (Plataforma y Dataset de Técnicas Quirúrgicas)

- **Qué es**: fuente única de verdad de todas las técnicas quirúrgicas, su
  instrumental, suturas, equipos biomédicos, dispositivos y arreglos de mesa.
  Plataforma web (panel administrativo, uso interno por directores/docentes) +
  API que consumen SIVRI y SIMIQ3D.
- **Equipo**: colaborativo ING + IQ (documentación de técnicas).
- **Stack decidido**:
  - Backend: **Python + FastAPI** (async nativo, tipado con Pydantic, Swagger
    automático; Python también reduce fricción con SIVRI que usa YOLO26).
  - Base de datos: **PostgreSQL** (esquema relacional, bien definido, ACID).
  - Frontend: **Angular 22** (decidido el 2026-10-11, tras los mockups), en
    `dataiq/frontend`. Una sola app con el shell y DataIQ (ver «Capa de
    navegación»). **El código del frontend va en inglés**, como el del
    backend (ver «Idioma del código»); la interfaz, la documentación y las
    URL, en español.
  - Autenticación: **JWT + Argon2id**, implementación propia de endpoints (no
    FastAPI-Users, para control total del flujo). Argon2id se prefiere sobre
    bcrypt por ser más resistente a ataques con GPU y de canal lateral
    (recomendado por OWASP / RFC 9106). **DataIQ es el único emisor de JWT** en
    todo el ecosistema — SIVRI y SIMIQ3D solo validan la firma, no tienen su
    propia tabla de usuarios. **Firma asimétrica obligatoria** (RS256 o EdDSA):
    DataIQ firma con su clave privada y publica la clave pública (JWKS); los
    demás módulos validan solo con la pública. Nunca HS256 con secreto
    compartido (violaría la regla de no mezclar credenciales entre módulos).
    Se usa **EdDSA (Ed25519)**: la clave privada va en `JWT_PRIVATE_KEY`
    (solo en el entorno de DataIQ) y la pública se publica en
    `/.well-known/jwks.json`. El token dura **2 horas**.
  - Sesión del navegador (decidido por Mauricio el 2026-10-13): el JWT va en
    una **cookie `HttpOnly`** (`__Host-iq_session`, `Secure`,
    `SameSite=Strict`, `Path=/`, sin `Domain`), nunca en `localStorage`: un
    XSS no puede robarla (RFC 10017, OAuth 2.0 for Browser-Based Apps). Para
    que la cookie sea propia y no de terceros, el frontend y las APIs
    comparten origen con **rewrites de Vercel** (`/api/dataiq/*`,
    `/api/simiq3d/*`); un solo login sirve para los tres módulos. SIVRI no
    pasa por el proxy (los cuadros de la cámara irían por Vercel): su backend
    está en el Servidor PC1 del laboratorio, adonde la cookie no llega, y recibe
    un token corto de DataIQ en `Authorization: Bearer` (pieza 10 de la
    checklist del backend). Contra CSRF, las escrituras con cookie exigen el
    encabezado `X-IQ-Client`. `POST /auth/login` deja la cookie y no devuelve
    el token; `POST /auth/token` devuelve el token (Bearer) para lo que no es
    navegador (Swagger, servidores, apps). La API acepta las dos. Preparado
    para un dominio propio (`api.dominio.com`) si algún día se financia: basta
    con `CORS_ORIGINS`, ver [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md).
  - Contenedorización: Docker / Podman (Dockerfiles compatibles entre ambos).
  - Arquitectura: **hexagonal** (dominio / puertos / adaptadores).
  - Migraciones: SQLAlchemy + Alembic.
  - Idioma del código (decidido por el equipo el 2026-10-13): nombres en
    inglés en el backend (funciones, clases, variables), la base de datos
    (tablas, columnas, enums) y la API (rutas y campos JSON). Comentarios,
    docstrings, mensajes de error y etiquetas de Swagger, en español.
    `seed/tecnicas.xlsx` sigue en español; la carga traduce.

- **Avance del backend**: [`dataiq/docs/checklist-backend.md`](dataiq/docs/checklist-backend.md).
  Leerla al empezar a trabajar en el backend y marcar cada pieza al terminarla.
- **Avance del frontend**: [`dataiq/docs/checklist-frontend.md`](dataiq/docs/checklist-frontend.md),
  igual que la del backend. Cómo está hecho: [`dataiq/frontend/README.md`](dataiq/frontend/README.md).

- **Infraestructura de despliegue (decidida por Mauricio el 2026-10-14:
  servicios gratuitos que no exigen tarjeta de crédito, porque el equipo no
  dispone de recursos para prepagar un servicio en la nube)**:
  - Backend de DataIQ → **Vercel Hobby, como funciones de Python**
    (https://dataiq-backend.vercel.app). Región `cle1` (Cleveland, junto a
    Neon en Ohio). Cupo mensual de la cuenta: 4 horas de CPU activa (la espera
    por la base de datos no cuenta), 1M de invocaciones y 100GB de
    transferencia. Escala a cero; el arranque en frío tarda segundos. Con
    `DATABASE_POOL=false` usa `NullPool`: cada función abre y cierra su
    conexión, para no acumular conexiones en Neon. Las claves
    (`DATABASE_URL`, `JWT_PRIVATE_KEY`) son variables de entorno secretas del
    proyecto en Vercel. *Hobby es solo para uso no comercial* (condición de
    los términos de servicio; un proyecto de grado cumple) y es de una sola
    persona: el proyecto está en la cuenta de Mauricio.
  - Backend de SIVRI → **Servidor PC1**: un PC del laboratorio con Tailscale
    Funnel (plan gratuito: dirección HTTPS fija `*.ts.net`). SIVRI se usa en
    sesiones de laboratorio, y ningún servicio gratuito sin tarjeta ofrece CPU
    sostenida para YOLO. Detalle en [`sivri/docs/checklist.md`](sivri/docs/checklist.md).
  - Modelo de lenguaje de SIMIQ3D → **Servidor PC2**: un PC de escritorio con
    GPU, con Ollama y Tailscale Funnel, detrás de un filtro con clave. El
    backend de SIMIQ3D va en Vercel; si el Servidor PC2 se apaga, solo deja de
    funcionar el chat. Detalle en
    [`simiq3d/README.md`](simiq3d/README.md).
  - Base de datos → **Neon Postgres** (Free tier: 0.5GB almacenamiento, 100
    CU-hora/mes, 5GB egress/mes por proyecto, scale-to-zero). **Un proyecto Neon
    por módulo** (DataIQ, SIVRI, SIMIQ3D cada uno con el suyo). Región
    `aws-us-east-2` (Ohio; no hay región Sudamérica en Neon). Al exceder el
    plan gratis no se cobra: el cómputo se suspende hasta el siguiente ciclo, y
    por encima de 0.5GB fallan las escrituras. El de DataIQ ya existe, migrado
    y con la carga inicial.
  - Frontend → **Vercel** (plan Hobby, 100GB bandwidth/mes), con rewrites
    hacia las APIs (ver «Sesión del navegador»): ese tráfico también cuenta en
    los 100GB. **Hobby no permite conectar un proyecto a un repo de una
    organización de GitHub** (este repo es de `curn-iq`): se despliega con el
    CLI de Vercel desde GitHub Actions, con el secreto `VERCEL_TOKEN`.
  - Imagen de contenedor del backend → **GitHub Container Registry (ghcr.io)**,
    pública. Vercel no la usa (construye desde el código); sirve para correr
    el backend fuera de Vercel.
  - CI/CD → **GitHub Actions**: en cada PR, estilo y pruebas; en cada push a
    `main`, despliegue a Vercel (producción) e imagen a ghcr.io. No hay rama
    `dev`: `main` es producción y nada entra sin PR y CI. Las previews por PR
    (con una rama `dev` de la base en Neon) se agregan cuando haya usuarios
    que proteger.
  - Se descartaron: **Google Cloud Run** (en Colombia, crear la cuenta de
    facturación exige un prepago de COP 100.000; queda como opción si la
    institución financia, ver [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md)),
    Azure for Students (regiones restringidas por suscripción), Render y
    similares (512MB y 0,1 CPU, se suspenden por inactividad y pueden exigir tarjeta), Hugging
    Face Spaces (el cómputo gratis no sirve para SIVRI), GCP con crédito de
    $300/90 días (vence) y Oracle Cloud y Koyeb (exigen tarjeta).
  - Límites verificados en la documentación oficial de cada proveedor en
    oct-2026.

- **Esquema de datos**: la fuente es **`dataiq/docs/esquema.dbml`** (DBML,
  se pega tal cual en dbdiagram.io). Diagrama:
  `https://dbdiagram.io/d/69fe17cd54a51d93d3d377a9`. Leer ese archivo antes de
  tocar modelos o migraciones; no duplicar el esquema en otro lado.

  Notas de diseño clave:
  - **Ids: UUIDv7** en todas las tablas, generados por la BD con `uuidv7()`
    (requiere **PostgreSQL 18**, también en Neon). Motivo: DataIQ es open
    source y cada institución puede tener su instancia; con UUID el catálogo
    base tiene la misma identidad en todas, y los mapeos que guardan SIVRI
    (clases YOLO) y SIMIQ3D (modelos 3D) contra `instruments.id` sirven en
    cualquier instancia. Costo aceptado: un UUIDv7 revela su fecha de creación.
  - **Fechas: `timestamptz`** (instante exacto, se guarda en UTC). El
    servidor, la BD y los usuarios están en zonas horarias distintas.
    `created_at` y `updated_at` tienen `now()` por defecto.
  - **Solo importa la posición, no la cantidad** (definido por IQ). No existe
    campo `cantidad`.
  - **Versionado**: `techniques` es solo la identidad (nombre + especialidad).
    Todo el contenido (datos clínicos, `cups_code`, mesas, items, posiciones,
    suturas, equipos, dispositivos) cuelga de `technique_versions`. Editar una
    técnica publicada = crear una versión nueva (copia) en `draft`; al
    aprobarla, en una misma transacción la anterior pasa a `superseded` y la
    nueva a `published`. Máximo una versión publicada y una en curso
    (`draft`/`in_review`) por técnica. Solo la versión publicada se expone
    a estudiantes, SIVRI y SIMIQ3D.
  - Transiciones de estado permitidas (se validan en el dominio, no en la BD):
    `draft → in_review`, `in_review → draft` (rechazo),
    `in_review → published`, `published → superseded`,
    `published → archived`, y `draft → published` (el revisor o el admin
    publica lo suyo sin revisión). Publicar solo lo hace un revisor o un admin
    (`validate_publishing`).
  - `technique_versions.source`: de dónde salió el contenido de la versión
    (enlaces o libros), para validarlo.
  - Carga inicial: `dataiq/backend/seed/load.py` lee
    `seed/tecnicas.xlsx` y deja cada técnica con su versión 1 publicada; se
    puede correr varias veces (`uv run python -m seed.load`).
  - `version_zones` = lo que la versión dice de cada mesa: si la lleva
    (`used`; `false` es el «no lleva» de los documentos de IQ) y, si la lleva,
    el tamaño de su grilla (`grid_rows`, `grid_columns`). El dominio valida
    que cada objeto con mesa esté en una que la versión lleva y que sus celdas
    caigan dentro del tamaño.
  - `technique_items` = un objeto físico de la versión, con su `legend_number`
    (trazabilidad al número del documento fuente de IQ; nulo si la técnica aún
    no tiene diagrama de mesa) y `source_text` literal. **Cada mesa tiene su
    propia numeración** en los documentos (Mayo 1..n, Reserva 1..m), por eso
    el item lleva `zone_id` y es único por `(version_id, zone_id,
    legend_number)`: la BD rechaza "dos objetos reclaman el mismo número en
    la misma mesa". Un número siempre tiene mesa (CHECK `number_requires_zone`);
    un objeto solo del listado no tiene ni mesa ni número.
  - Objetos compuestos "X con Y" = **un** `technique_items` con varios
    `item_components` (cada uno apunta a un instrumento o a una sutura, nunca
    a ambos ni a ninguno).
  - `item_cells` = celda `(zona, fila, columna)` en grilla discreta — **no**
    coordenadas continuas x/y (los arreglos de IQ son diagramas a mano, no
    medidos). Las columnas son `grid_row` y `grid_column` (`column` es palabra
    reservada en SQL); en el dominio y el JSON son `row` y `column`. Un item
    puede ocupar varias celdas; una celda tiene un solo objeto por versión.
    `item_cells.version_id` y `item_cells.zone_id` son redundantes **a
    propósito**: sin ellos no se puede garantizar la unicidad de celda, y la
    FK compuesta `(item_id, version_id, zone_id)` impide que la celda quede en
    otra versión u otra mesa que su objeto (por eso `technique_items` necesita
    el `UNIQUE (id, version_id, zone_id)`: PostgreSQL lo exige para esa FK).
    No "simplificar" quitándolos.
  - `instrument_aliases` guarda las variantes crudas del catálogo apuntando a
    su instrumento canónico (trazabilidad de la normalización 148 → 94).
  - `cups_code`: código CUPS (Clasificación Única de Procedimientos en
    Salud, Colombia) del procedimiento; opcional. CIE-10 no aplica porque
    clasifica diagnósticos, no procedimientos.
  - `users.policy_accepted_at` y `users.policy_version` son la prueba de la
    autorización de tratamiento de datos personales que exige el Decreto 1377
    de 2013 (art. 8).
  - Roles en el enum `user_role`: ver "Modelo de roles" abajo.

- **Modelo de roles** (decidido por Mauricio el 2026-10-04; diagramas en
  [`docs/flujos.md`](docs/flujos.md)):
  - Objetivo: el software debe servir a cualquier persona (estudiantes de
    cualquier institución, o alguien sin institución, p. ej. un bachiller
    curioso), no solo a la CURN. El riesgo a controlar no es la lectura sino
    la **publicación** de técnicas incorrectas.
  - Principio: **ver el catálogo y los datos clínicos es libre; el
    instrumental, las mesas y los módulos requieren cuenta** (gratis, por
    autorregistro). Sin cuenta se entra al shell, se ve qué técnicas hay y se
    abre cualquiera con sus datos clínicos; su instrumental y sus mesas se
    muestran como vista previa y piden registrarse ahí mismo (cambio decidido
    por Mauricio el 2026-10-06: pedir la cuenta antes de dejar ver nada daba
    pereza). Usar SIVRI y SIMIQ3D también requiere cuenta. Escribir y publicar
    depende del rol.
  - Los roles son **acumulativos**: cada uno puede todo lo del anterior
    (`usuario` < `colaborador` < `revisor` < `admin`; en el código, `user` <
    `contributor` < `reviewer` < `admin`). Cada cuenta tiene un solo rol.

    | Quién | Qué puede hacer | Cómo lo obtiene |
    |---|---|---|
    | Visitante (sin cuenta) | Entrar al shell, ver el catálogo de técnicas publicadas y los datos clínicos de cada una | Nada |
    | `usuario` | Ver el instrumental y las mesas de las técnicas publicadas; usar SIVRI y SIMIQ3D; funciones personales futuras (p. ej. progreso en SIVRI) | **Autorregistro libre**, aceptando la política de datos |
    | `colaborador` | Crear técnicas y editar versiones en **borrador**; enviarlas a revisión | Lo asigna un admin |
    | `revisor` | Publicar directamente sus propias técnicas y versiones (sin pasar por revisión); aprobar o rechazar las de los colaboradores; archivar técnicas publicadas; crear y editar instrumental | Lo asigna un admin tras verificar que es docente o instrumentador titulado; la decanatura del programa también es revisor |
    | `admin` | Gestionar roles | El equipo operativo del proyecto (decidido por Mauricio el 2026-10-06) |

  - Un contenido incorrecto nunca llega a estudiantes: lo de un
    colaborador queda en borrador hasta que un revisor lo aprueba. Un
    revisor (docente o instrumentador titulado) publica lo suyo
    directamente, sin que otro lo revise; un colaborador nunca se
    autopublica (decidido por Mauricio el 2026-10-06).
  - **MVP: una sola plataforma, la de la CURN** (decidido el 2026-10-05). Se
    abre a estudiantes de cualquier institución, que usan el catálogo de la
    CURN; no hay catálogos ni espacios por institución. La prioridad es
    entregar algo bueno para la CURN, no la adopción por otras instituciones.
    Que cada institución monte su propia copia (como Moodle, Open edX o
    DHIS2) queda para después del MVP:
    [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md).
  - El arreglo de mesa **no** varía por institución; se modela según los
    documentos de IQ. Quien quiera otro arreglo tiene el código.
  - Todo el esquema vive en un solo archivo, incluidas las restricciones: los
    CHECK van en bloques `checks { }` (se exportan al SQL); los dos índices
    únicos parciales de `technique_versions` y el `NULLS NOT DISTINCT` del
    UNIQUE de `sutures` van en la `Note` de su tabla, porque DBML no los soporta.
    Verificado en PostgreSQL 17. Al pasarlo a SQLAlchemy, **declarar todo en
    los modelos** (`CheckConstraint`, `Index(..., unique=True,
    postgresql_where=...)`, `UniqueConstraint(...,
    postgresql_nulls_not_distinct=True)`); si no, `alembic --autogenerate` no
    los incluye. La BD se crea con las migraciones de Alembic, nunca con el
    "Export" de dbdiagram (no trae esas restricciones).
  - El mapeo de clases de YOLO26 → `instruments.id` no está modelado todavía
    (depende de la definición de SIVRI).
  - DataIQ **no guarda imágenes del instrumental** (fuera de alcance). Los
    modelos 3D son de SIMIQ3D: el mapeo modelo 3D → `instruments.id` vive en
    su propia BD, igual que las clases de YOLO en SIVRI. `instruments.description`
    es la descripción breve que SIMIQ3D muestra al hacer clic; se llena con
    fuentes citables.

- **Catálogo de instrumental (normalización)**:
  - Catálogo crudo: **148 variantes** (una fila por par técnica-instrumento,
    duplicado entre técnicas), **320 filas totales**.
  - Catálogo normalizado: **94 instrumentos canónicos** (reducción ~36.5%),
    agrupando sinónimos (ej. "Pinza Kelly" / "Pinzas Kelly" / "Pinza de Kelly" →
    un solo canónico).
  - Categorías del catálogo normalizado incluyen: instrumental quirúrgico
    estándar, y las agregadas tras revisar diagramas de mesa: **Recipiente**
    (Riñonera/Coca, Platón grande) e **Insumo** (Suero fisiológico).
  - Regla para objetos compuestos en la leyenda de mesa: si un mismo número trae
    "X con Y" (ej. "Compresa doblada con sutura porta aguja"), es **un solo
    objeto físico en una sola posición**, no dos instrumentos compitiendo por el
    mismo número. Un conflicto real es cuando dos instrumentos independientes
    reclaman el mismo número sin ese patrón "X con Y".
  - La carga inicial (`seed/tecnicas.xlsx`, hoja `catalogo`) suma a esos
    94 los objetos de los arreglos de mesa: 146 instrumentos en total.
  - Lo que no cuadra en los documentos de IQ (numeración repetida, mesas sin
    identificar, arreglos que faltan) y cómo quedó en la carga está en
    [`dataiq/docs/checklist-backend.md`](dataiq/docs/checklist-backend.md),
    sección «Datos de la fuente que no cuadraban».
  - Prostatectomía (Urología, abierta) y Prostatectomía laparoscópica (Cirugía
    Laparoscopia) **no son duplicados accidentales** — IQ confirmó que son dos
    procedimientos distintos con arreglos de mesa distintos, a pesar de que
    versiones tempranas de los documentos mostraban listas idénticas.

- **Buenas prácticas de API acordadas** (aplican a todo endpoint de lectura
  nuevo):
  - `async def` + `asyncpg`, connection pooling.
  - Evitar N+1 queries (usar joins / eager loading).
  - **`Cache-Control` / `ETag` en las rutas GET** — obligatorio en cualquier
    endpoint nuevo de lectura.
  - Endpoint separado `/catalog/full` (bulk, para que SIVRI y SIMIQ3D lo
    cacheen una vez por sesión) distinto de los endpoints paginados/filtrables
    para usuarios humanos del frontend.
  - El JSON lo genera Pydantic (serializa en Rust); no hace falta `orjson`.

- **API**: las rutas y sus reglas (quién puede qué) están en la checklist del
  backend; la documentación interactiva, en `/docs`. El primer admin se
  asigna por terminal: `uv run python -m app.adapters.inbound.cli.assign_role
  <correo> admin`; los demás roles los asigna un admin desde la API.

### M3 — SIMIQ3D (Sistema Interactivo de Modelado e Instrumentación Quirúrgica 3D)

- **Qué es**: herramienta conversacional (chat + visor 3D). El estudiante
  explora técnicas quirúrgicas en lenguaje natural y el sistema muestra una
  escena 3D con el instrumental correctamente dispuesto en mesa; se puede
  rotar/explorar y hacer clic en cada instrumento para ver su detalle.
  **No es** una herramienta de práctica/armado interactivo con puntaje — esa
  función es de SIVRI. SIMIQ3D es exploración/consulta enriquecida, no
  evaluación.
- **Consume** DataIQ como base de conocimiento (igual que SIVRI: vía HTTPS al
  backend de DataIQ, nunca acceso directo a su base de datos).
- **Calendario**: se desarrolla en paralelo con los otros dos módulos este
  semestre (antes se planeaba para 2027).
- **MVP** (decidido por Mauricio el 2026-10-15): la **mesa de Mayo de las
  cinco técnicas de Cirugía General**, el mismo alcance de SIVRI. Los modelos
  3D son **propios, modelados a mano en Blender**, por familias de
  instrumentos y a partir de fotos de catálogo de cada instrumento; cada uno
  queda en el repo con sus medidas y sus fuentes. El chat usa *tool calling*:
  un modelo local (Ollama, en el Servidor PC2, con Tailscale Funnel) convierte
  la pregunta en una acción y los datos salen de DataIQ, nunca del modelo.
  Alcance, por qué no se compran y avance:
  [`simiq3d/README.md`](simiq3d/README.md).
- **Stack**: el backend lo decide Guebriel, que lo desarrolla; el frontend de
  los tres módulos, Juan Caraballo. Backend: **Python + FastAPI**, como
  DataIQ y SIVRI (confirmado por Guebriel el 2026-10-15). Frontend:
  **Angular + Three.js** (decidido por Juan el 2026-10-15), app aparte en
  `simiq3d/frontend` servida bajo `/simiq3d/`; el visor corre en el navegador
  (WebGL), como pide el Formato 115. Cómo está hecho:
  [`simiq3d/frontend/README.md`](simiq3d/frontend/README.md); avance:
  [`simiq3d/docs/checklist-frontend.md`](simiq3d/docs/checklist-frontend.md).

## Capa de navegación (NO es un módulo)

Se está considerando un punto de entrada único / shell de navegación con acceso
basado en rol a los tres módulos, usando el JWT emitido por DataIQ. **No se
categoriza como "M4"** porque, a diferencia de M1/M2/M3, no tiene backend ni
base de datos propios — es una capa de frontend/routing sobre los módulos
existentes. Vive en la misma app Angular que DataIQ (`dataiq/frontend`),
aislada en `app/shell/` para poder separarla si algún día hace falta
(decidido el 2026-10-11). La sesión es la cookie de «Sesión del navegador»:
las APIs de DataIQ y SIMIQ3D la reciben por el proxy de Vercel; SIVRI, un
token corto. Para que los frontends de SIVRI y SIMIQ3D también la usen (el de
SIVRI, para pedir ese token), tienen que servirse desde ese mismo origen (p.
ej. bajo `/sivri/*` y `/simiq3d/*`); cómo se sirven está **por definir** con
esos módulos.

**Diseño (mockups)**: producto en `PRODUCT.md`, sistema visual en `DESIGN.md`,
mockups en `diseno/mockups/`; el método está en `.claude/rules/diseno.md`.

## Comunicación entre módulos (regla central, no romper)

- **Las bases de datos nunca se comunican entre sí.** Cada módulo tiene su
  propio Neon Postgres, aislado.
- Si SIVRI o SIMIQ3D necesitan datos de técnicas/instrumental que viven en
  DataIQ, **la única vía es HTTPS al backend de DataIQ** — nunca una conexión
  directa a la base de datos de otro módulo.
- DataIQ es la **fuente única de verdad** del catálogo de técnicas: SIVRI y
  SIMIQ3D no mantienen su propia copia permanente, cachean por sesión (ver
  `/catalog/full` arriba) para reducir latencia, no para duplicar la
  fuente de verdad.
- Autenticación centralizada: DataIQ emite los JWT; los demás módulos solo
  validan firma.

## Estructura del repositorio (monorepo)

- Organización GitHub: `curn-iq`.
- Licencia: MIT.
- Estructura de carpetas:

```
iq-platform/
├── sivri/
│   ├── backend/
│   └── frontend/
├── dataiq/
│   ├── backend/
│   ├── frontend/           (Angular: shell + DataIQ)
│   └── docs/esquema.dbml   (esquema completo, se pega en dbdiagram.io)
├── simiq3d/
│   ├── backend/
│   ├── frontend/           (Angular + Three.js)
│   └── models/             (modelos 3D: .blend, GLB y medidas)
├── shared/design/          (tokens base de DESIGN.md para los frontends)
└── CLAUDE.md   (este archivo)
```

(La capa de navegación vive en `dataiq/frontend`, junto con DataIQ.)

**Sistema visual compartido** (decidido por Juan el 2026-10-15): dos capas.
`shared/design/` tiene los tokens base de `DESIGN.md` (colores, tipografía,
espaciado, movimiento) y los nombres por uso (p. ej. `--color-accent`); cada
frontend tiene su tema (`src/styles/theme.scss`) y puede sobrescribir lo que
necesite sin tocar a los demás. Los componentes usan solo los nombres por uso.
Todo color nuevo se anota en `DESIGN.md`. La carpeta la crea el primer
frontend que llegue a su fase 0.

## Dónde vive cada cosa

Cada tipo de información tiene **un solo lugar**; los demás documentos
enlazan, no copian. Un cambio se documenta en su lugar dentro del mismo PR del
código (decidido por Mauricio el 2026-10-13: la información repartida entre el
repo, el Drive y las ramas obligaba a actualizar lo mismo en varios sitios).

| Información | Dónde |
|---|---|
| Decisiones técnicas y reglas del proyecto | Este archivo (resumen) |
| Cómo funciona y cómo se corre cada módulo | El README del módulo (p. ej. [`dataiq/README.md`](dataiq/README.md)) |
| Arquitectura e infraestructura (diagramas) | [`docs/arquitectura.md`](docs/arquitectura.md), con los SVG en `docs/diagramas/` |
| Esquema de la base de DataIQ | [`dataiq/docs/esquema.dbml`](dataiq/docs/esquema.dbml) y su diagrama (`diagramabd.png`, dbdiagram.io) |
| Roles y flujos | [`docs/flujos.md`](docs/flujos.md) |
| Lo que queda para después del MVP | [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md) |
| Avance | Las checklists del repo (p. ej. [`dataiq/docs/checklist-backend.md`](dataiq/docs/checklist-backend.md)) |
| Qué cambió | Los [Releases](https://github.com/curn-iq/iq-platform/releases) de GitHub: uno por semana y uno al cerrar cada corte, con notas generadas de los PR (cómo, en el README) |
| Entregables académicos (Formato 115, entregas por corte) | Drive, `ENTREGABLES/`: se arman al cerrar cada corte con lo que está en el repo |
| Documentos fuente de IQ y catálogo crudo | Drive (abajo) |

**Google Drive**, carpeta raíz **"Tesis ING-IQ - CURN"**. El tutor no lo exige;
se usa solo para lo que no es código:

- Vigentes:
  - `ENTREGABLES/` — entregas del proyecto de grado por corte.
  - `Modulo 2 - DataIQ/Documentos IQ/` — documentos fuente de las técnicas.
  - `Modulo 2 - DataIQ/Recursos/Catalogo Instrumental/` — catálogo crudo y
    normalizado del instrumental quirúrgico (.xlsx).
- Históricos (como quedaron al cerrar el Corte 2; **no se actualizan**, sirven
  para ver el razonamiento original, p. ej. las alternativas descartadas):
  `Estructura del Proyecto`, `Modulo 2 - DataIQ/Planificación Módulo 2 —
  DataIQ`, `Modulo 2 - DataIQ/Diseño/Stack Tecnológico — DataIQ`,
  `Modulo 2 - DataIQ/Diseño/Infraestructura de Despliegue` (.xlsx),
  `Modulo 2 - DataIQ/Diseño/Diagrama Entidad-Relacion DataIQ` y
  `Modulo 2 - DataIQ/Tareas/`.

**Importante**: el Drive solo se modifica cuando Mauricio lo pide
explícitamente. No editar el Drive por iniciativa propia.

## Reglas para quien trabaje en este repo (Claude Code incluido)

1. **No inventar datos de catálogo ni de técnicas quirúrgicas.** Todo el
   instrumental, suturas, posiciones de mesa, etc. sale de una fuente
   citable: los documentos de IQ o las fuentes anotadas en
   `technique_versions.source`. Lo que la fuente no trae (ej. el arreglo de mesa
   de Nefrectomía laparoscópica) solo se puede proponer con los principios
   publicados de armado de mesa y marcado como «propuesto» (columna `origen`
   de `seed/tecnicas.xlsx`), para que IQ lo valide. Nunca se rellena por
   suposición sin marcarlo.
2. **No mezclar credenciales entre módulos.** Cada módulo tiene su propio Neon
   Postgres y su propio despliegue; no compartir variables de entorno
   de un módulo con otro.
3. **Todo endpoint GET nuevo debe llevar `Cache-Control`/`ETag`.**
4. **Cada cambio se documenta en su único lugar, en el mismo PR del código**
   (ver «Dónde vive cada cosa»); los demás documentos enlazan, no copian. Si
   cambia el esquema de DataIQ: `esquema.dbml`, el diagrama (`diagramabd.png`
   y dbdiagram.io) y la migración van juntos. El Drive no se actualiza.
5. **Nunca acceso directo entre bases de datos de distintos módulos** — siempre
   HTTPS al backend correspondiente.
6. **DataIQ es la única fuente de verdad** del catálogo de técnicas — SIVRI y
   SIMIQ3D consumen, no duplican permanentemente.
7. **Navegador sin ventana desde un script** (capturas, pruebas): lanzarlo en
   su propio grupo de procesos y cerrarlo por grupo al terminar (el navegador
   deja procesos hijos), usar un puerto libre (`--remote-debugging-port=0`, no
   uno fijo) y borrar su perfil temporal. Si no, se acumulan procesos y
   memoria en el equipo de quien trabaja.
