# CLAUDE.md — Contexto del proyecto para Claude Code

> Este archivo es leído automáticamente por Claude Code al abrir este repositorio.
> Contiene el contexto completo del proyecto de grado para que cualquier sesión de
> Claude Code (o cualquier colaborador) pueda trabajar sin tener que reconstruir
> este contexto desde cero ni depender del Drive del proyecto.

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
Mauricio, no solo SIVRI. Aunque originalmente se planeó una hoja de ruta escalonada
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
- **Consume** técnicas/instrumental de DataIQ (nunca guarda su propia copia
  permanente — cachea por sesión, ver "Comunicación entre módulos").
- **Estado**: en desarrollo.
- Núcleo del proyecto de grado (visión computacional), pero ya no es el único
  entregable — ver nota de arriba.

### M2 — DataIQ (Plataforma y Dataset de Técnicas Quirúrgicas)

- **Qué es**: fuente única de verdad de todas las técnicas quirúrgicas, su
  instrumental, suturas, equipos biomédicos, dispositivos y arreglos de mesa.
  Plataforma web (panel administrativo, uso interno por directores/docentes) +
  API que consumen SIVRI y SIMIQ3D.
- **Equipo**: colaborativo ING (Guebriel principalmente en backend) + IQ
  (documentación de técnicas).
- **Stack decidido** (excepto frontend):
  - Backend: **Python + FastAPI** (async nativo, tipado con Pydantic, Swagger
    automático; Python también reduce fricción con SIVRI que usa YOLO26).
  - Base de datos: **PostgreSQL** (esquema relacional, bien definido, ACID).
  - Frontend: **por definir.** Se decide después de que Juan entregue los
    mockups; depende también de la capa de navegación compartida — ver más
    abajo. (Candidato inicial: Svelte, por bundle liviano.)
  - Autenticación: **JWT + Argon2id**, implementación propia de endpoints (no
    FastAPI-Users, para control total del flujo). Argon2id se prefiere sobre
    bcrypt por ser más resistente a ataques con GPU y de canal lateral
    (recomendado por OWASP / RFC 9106). **DataIQ es el único emisor de JWT** en
    todo el ecosistema — SIVRI y SIMIQ3D solo validan la firma, no tienen su
    propia tabla de usuarios. **Firma asimétrica obligatoria** (RS256 o EdDSA):
    DataIQ firma con su clave privada y publica la clave pública (JWKS); los
    demás módulos validan solo con la pública. Nunca HS256 con secreto
    compartido (violaría la regla de no mezclar credenciales entre módulos).
  - Contenedorización: Docker / Podman (Dockerfiles compatibles entre ambos).
  - Arquitectura: **hexagonal** (dominio / puertos / adaptadores).
  - Migraciones: SQLAlchemy + Alembic.

- **Infraestructura de despliegue (decidida, capa gratuita, sin trampas de
  "trial" con vencimiento)**:
  - Backend → **Google Cloud Run** (Always Free: 2M requests/mes, 360K GB-seg,
    180K vCPU-seg, 1GB egress/mes por servicio). Región `us-central1`. **Nunca
    usar `min-instances=1`** (rompe el free tier). Cold start es aceptable para
    este caso de uso.
  - Base de datos → **Neon Postgres** (Free tier: 0.5GB almacenamiento, 100
    CU-hora/mes, 5GB egress/mes por proyecto, scale-to-zero). **Un proyecto Neon
    por módulo** (DataIQ, SIVRI, SIMIQ3D cada uno con el suyo). Región
    `aws-us-east-2` (no hay región Sudamérica en Neon; es la más cercana a
    `us-central1` de Cloud Run).
  - Frontend → **Vercel** (plan Hobby, 100GB bandwidth/mes). *Nota: Hobby es
    solo para uso no comercial — condición real de los términos de servicio, no
    solo un límite técnico.*
  - Registro de imágenes de contenedor → **GitHub Container Registry (ghcr.io)**,
    NO Artifact Registry de GCP (su free tier es solo 0.5GB).
  - CI/CD → **GitHub Actions** (build + push a ghcr.io + deploy a Cloud Run en
    cada push a `main`).
  - Se descartaron explícitamente: GCP con crédito gratis de $300/90 días (tiene
    fecha de vencimiento) y Oracle Cloud (no convenció).

- **Esquema de datos**: la fuente es **`dataiq/docs/esquema.dbml`** (DBML,
  se pega tal cual en dbdiagram.io). Diagrama:
  `https://dbdiagram.io/d/69fe17cd54a51d93d3d377a9`. Leer ese archivo antes de
  tocar modelos o migraciones; no duplicar el esquema en otro lado.

  Notas de diseño clave:
  - **Solo importa la posición, no la cantidad** (definido por IQ). No existe
    campo `cantidad`.
  - **Versionado**: `Tecnica` es solo la identidad (nombre + especialidad).
    Todo el contenido (datos clínicos, `codigo_cups`, items, posiciones,
    suturas, equipos, dispositivos) cuelga de `TecnicaVersion`. Editar una
    técnica publicada = crear una versión nueva (copia) en `borrador`; al
    aprobarla, en una misma transacción la anterior pasa a `reemplazada` y la
    nueva a `publicada`. Máximo una versión publicada y una en curso
    (`borrador`/`en_revision`) por técnica. Solo la versión publicada se expone
    a estudiantes, SIVRI y SIMIQ3D.
  - Transiciones de estado permitidas (se validan en el dominio, no en la BD):
    `borrador → en_revision`, `en_revision → borrador` (rechazo),
    `en_revision → publicada`, `publicada → reemplazada`,
    `publicada → archivada`.
  - `ItemTecnica` = un objeto físico de la versión, con su `numero_leyenda`
    (trazabilidad al número del documento fuente de IQ; nulo si la técnica aún
    no tiene diagrama de mesa) y `texto_fuente` literal. Único por
    `(version_id, numero_leyenda)`: la BD rechaza el caso "dos objetos
    reclaman el mismo número".
  - Objetos compuestos "X con Y" = **un** `ItemTecnica` con varios
    `ItemTecnicaComponente` (cada uno apunta a un `Instrumental` o a una
    `Sutura`, nunca a ambos ni a ninguno).
  - `PosicionMesa` = celda `(zona, fila, columna)` en grilla discreta — **no**
    coordenadas continuas x/y (los arreglos de IQ son diagramas a mano, no
    medidos). Un item puede ocupar varias celdas; una celda tiene un solo
    objeto por versión. `PosicionMesa.version_id` es redundante **a
    propósito**: sin él no se puede garantizar la unicidad de celda, y la FK
    compuesta `(item_id, version_id)` impide que quede inconsistente (por eso
    `ItemTecnica` necesita el `UNIQUE (id, version_id)`: PostgreSQL lo exige
    para esa FK). No "simplificar" quitándolos.
  - `InstrumentalAlias` guarda las variantes crudas del catálogo apuntando a
    su instrumento canónico (trazabilidad de la normalización 148 → 94).
  - `codigo_cups`: código CUPS (Clasificación Única de Procedimientos en
    Salud, Colombia) del procedimiento; opcional. CIE-10 no aplica porque
    clasifica diagnósticos, no procedimientos.
  - Roles en el enum `rol_usuario`: ver "Modelo de roles" abajo
    (**propuesta, no implementada ni cerrada**).

- **Modelo de roles — PROPUESTA (aprobada como dirección, NO implementada
  ni decidida como definitiva; no construir sobre ella sin confirmar con
  Mauricio)**:
  - Objetivo: el software debe servir a cualquier persona (estudiantes de
    cualquier institución, o alguien sin institución, p. ej. un bachiller
    curioso), no solo a la CURN. El riesgo a controlar no es la lectura sino
    la **publicación** de técnicas incorrectas.
  - Principio: separar lectura de escritura.

    | Quién | Qué puede hacer | Cómo lo obtiene |
    |---|---|---|
    | Visitante (sin cuenta) | Leer técnicas **publicadas** | Nada |
    | `usuario` | Lo mismo + funciones personales futuras (p. ej. progreso en SIVRI) | Autorregistro gratuito |
    | `colaborador` | Crear/editar versiones en **borrador** | Lo asigna un admin |
    | `revisor` | Aprobar y publicar (nunca lo propio) | Lo asigna un admin tras verificar que es docente o instrumentador titulado |
    | `admin` | Gestionar roles | Mauricio |

  - Un contenido incorrecto nunca llega a estudiantes: queda en borrador
    hasta que un revisor distinto al autor lo aprueba.
  - Una institución que quiera control total puede desplegar su propia
    instancia (open source, MIT), pero es opcional: nadie depende de que su
    institución tenga instancia.
  - El arreglo de mesa **no** varía por institución; se modela según los
    documentos de IQ. Quien quiera otro arreglo tiene el código.
  - Todo el esquema vive en un solo archivo, incluidas las restricciones: los
    CHECK van en bloques `checks { }` (se exportan al SQL) y los dos índices
    únicos parciales de `TecnicaVersion` van en su `Note`, porque DBML no los
    soporta. Verificado en PostgreSQL 17. Al pasarlo a SQLAlchemy, **declarar
    todo en los modelos** (`CheckConstraint`, `Index(..., unique=True,
    postgresql_where=...)`); si no, `alembic --autogenerate` no los incluye.
    La BD se crea con las migraciones de Alembic, nunca con el "Export" de
    dbdiagram (no trae los índices parciales).
  - El mapeo de clases de YOLO26 → `Instrumental.id` no está modelado todavía
    (depende de la definición de SIVRI).

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
  - **Pendiente de aclarar con IQ** (no inventar, esperar respuesta de IQ):
    - *Hemicolectomía laparoscópica*: el número "4" aparece reclamado por dos
      instrumentos distintos en el arreglo de mesa, y el número "9" no aparece
      en la grilla. Ver el documento fuente de IQ para el detalle exacto.
    - *Nefrectomía laparoscópica*: el listado de instrumental ya está
      documentado, pero el diagrama de posición de mesa (fila/columna) todavía
      no ha sido entregado por IQ.
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
  - Endpoint separado `/catalogo/completo` (bulk, para que SIVRI y SIMIQ3D lo
    cacheen una vez por sesión) distinto de los endpoints paginados/filtrables
    para usuarios humanos del frontend.
  - `orjson` para payloads grandes.

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
- **Estado**: por iniciar desarrollo (antes se planeaba para 2027, ahora en
  paralelo con los otros dos módulos este semestre).
- **Bloqueadores pendientes, no resueltos todavía**:
  - Origen de la biblioteca de modelos 3D del instrumental (¿modelado propio?
    ¿assets comprados? ¿otra vía?) — flaggeado como bloqueador real.
  - Stack de renderizado 3D: Unity/C# vs. Three.js/Babylon.js (web) — no
    decidido.

## Capa de navegación (NO es un módulo)

Se está considerando un punto de entrada único / shell de navegación con acceso
basado en rol a los tres módulos, usando el JWT emitido por DataIQ. **No se
categoriza como "M4"** porque, a diferencia de M1/M2/M3, no tiene backend ni
base de datos propios — es una capa de frontend/routing sobre los módulos
existentes. Dónde vivirá exactamente en el repo está **por definir**.

## Comunicación entre módulos (regla central, no romper)

- **Las bases de datos nunca se comunican entre sí.** Cada módulo tiene su
  propio Neon Postgres, aislado.
- Si SIVRI o SIMIQ3D necesitan datos de técnicas/instrumental que viven en
  DataIQ, **la única vía es HTTPS al backend de DataIQ** — nunca una conexión
  directa a la base de datos de otro módulo.
- DataIQ es la **fuente única de verdad** del catálogo de técnicas: SIVRI y
  SIMIQ3D no mantienen su propia copia permanente, cachean por sesión (ver
  `/catalogo/completo` arriba) para reducir latencia, no para duplicar la
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
│   ├── frontend/
│   └── docs/esquema.dbml   (esquema completo, se pega en dbdiagram.io)
├── simiq3d/
│   ├── backend/
│   └── frontend/
└── CLAUDE.md   (este archivo)
```

(La capa de navegación aún no tiene ubicación definitiva en esta estructura.)

## Dónde encontrar más detalle (Google Drive)

Este archivo es un resumen denso para desarrollo. Para más detalle o para ver
las decisiones originales con su razonamiento completo, están en Drive, carpeta
raíz **"Tesis IQ - CURN"**:
- `Estructura del Proyecto` — overview general, roles, roadmap.
- `Planificación Módulo 2 — DataIQ` — planificación detallada de DataIQ.
- `Stack Tecnológico — DataIQ` — stack con alternativas descartadas y por qué.
- `Stack Infraestructura - Costos y Límites` — tabla completa de
  proveedores/planes/límites/qué pasa al exceder cada límite gratuito.
- `Diseño/Catálogo Instrumental` — catálogo crudo y normalizado del
  instrumental quirúrgico (.xlsx).
- Carpeta `Tareas` — checklists por persona (Guebriel, Juan Caraballo).

**Importante**: los checklists y otros documentos del Drive solo se modifican
cuando Mauricio lo pide explícitamente. No editar el Drive por iniciativa
propia.

## Reglas para quien trabaje en este repo (Claude Code incluido)

1. **No inventar datos de catálogo ni de técnicas quirúrgicas.** Todo el
   instrumental, suturas, posiciones de mesa, etc. viene de documentos reales
   entregados por IQ. Si falta un dato (ej. posición de mesa de Nefrectomía
   laparoscópica), se deja pendiente y se marca para preguntarle a IQ — nunca se
   rellena por inferencia o suposición.
2. **No mezclar credenciales entre módulos.** Cada módulo tiene su propio Neon
   Postgres y su propio deploy en Cloud Run; no compartir variables de entorno
   de un módulo con otro.
3. **Todo endpoint GET nuevo debe llevar `Cache-Control`/`ETag`.**
4. **Si se cambia el esquema de datos de DataIQ, ese cambio debe reflejarse
   también en el Drive** (documento de Planificación Módulo 2 y/o el diagrama en
   dbdiagram.io), no solo en el código.
5. **Nunca acceso directo entre bases de datos de distintos módulos** — siempre
   HTTPS al backend correspondiente.
6. **DataIQ es la única fuente de verdad** del catálogo de técnicas — SIVRI y
   SIMIQ3D consumen, no duplican permanentemente.
