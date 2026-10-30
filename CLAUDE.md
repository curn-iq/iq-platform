# IQ Platform

Monorepo del proyecto de grado de Ingeniería de Sistemas de la Corporación
Universitaria Rafael Núñez (CURN), hecho con el programa de Instrumentación
Quirúrgica (IQ): un ecosistema para aprender, fuera del laboratorio, cómo se
distribuye el instrumental quirúrgico en la mesa. Qué es cada módulo y en qué
fase está el proyecto: [README.md](README.md).

| Módulo | Qué es | Carpeta |
|---|---|---|
| DataIQ | Fuente única de verdad del catálogo (técnicas, instrumental, mesas): API y web | `dataiq/` |
| SIMIQ3D | Chat y visor 3D de la mesa de Mayo | `simiq3d/` |
| SIVRI | Visión artificial (YOLO26) que valida una mesa armada | `sivri/` |

Un módulo tiene su propio backend y su propia base de datos. El shell de
navegación vive en `dataiq/frontend/src/app/shell/` y no es un módulo.
Las reglas de cada módulo están en `.claude/rules/` y se cargan al trabajar en
su carpeta.

## Comandos

Las pruebas de los backends necesitan su PostgreSQL local corriendo
(`podman start dataiq-db` o `podman start simiq3d-db`); si no, fallan todas.

| Dónde | Para qué | Comando |
|---|---|---|
| `dataiq/backend` | Pruebas | `uv run pytest` |
| | Estilo | `uv run ruff format . && uv run ruff check .` |
| | Migrar y cargar el catálogo | `uv run alembic upgrade head && uv run python -m seed.load` |
| | Levantar la API (puerto 8000) | `uv run fastapi dev app/main.py` |
| | Cuentas de desarrollo (una por rol, contraseña `desarrollo`) | `uv run python -m seed.dev_accounts` |
| `simiq3d/backend` | Pruebas | `uv run pytest` |
| | Estilo | `uv run ruff check . && uv run ruff format --check .` |
| | Levantar la API (puerto 8001; necesita DataIQ en el 8000) | `uv run fastapi dev app/main.py --port 8001` |
| `dataiq/frontend`, `simiq3d/frontend` | Pruebas y build (con los presupuestos de `angular.json`) | `npm test`, `npm run build` |
| `dataiq/frontend` | Tipos de la API, tras cambiar una ruta o un esquema del backend (el CI falla si no coinciden) | `npm run api:types` |

## Reglas

1. **No inventar datos de catálogo ni de técnicas quirúrgicas.** Todo el
   instrumental, las suturas y las posiciones de mesa salen de una fuente
   citable: los documentos de IQ o las fuentes anotadas en
   `technique_versions.source`. Lo que la fuente no trae solo se propone con
   los principios publicados de armado de mesa, marcado como «propuesto»
   (columna `origen` de `seed/tecnicas.xlsx`), para que IQ lo valide.
2. **No mezclar credenciales entre módulos.** Cada módulo tiene su propio
   proyecto de Neon y su propio despliegue; ninguna variable de entorno se
   comparte.
3. **Todo endpoint GET nuevo lleva `Cache-Control` y `ETag`.**
4. **Cada cambio se documenta en su único lugar, en el mismo PR del código**
   (tabla «Dónde vive cada cosa»); los demás documentos enlazan, no copian.
5. **Nunca acceso directo entre bases de datos de distintos módulos**: SIVRI
   y SIMIQ3D leen DataIQ solo por HTTPS a su API.
6. **DataIQ es la única fuente de verdad del catálogo**: SIVRI y SIMIQ3D
   cachean `/catalog/full` por sesión y no guardan copia permanente.
7. **Navegador sin ventana desde un script** (capturas, pruebas): lanzarlo en
   su propio grupo de procesos y cerrarlo por grupo al terminar, con
   `--remote-debugging-port=0` y un perfil temporal que se borra después. Si
   no, quedan procesos hijos y memoria ocupada.
8. **El código de `sivri/` es AGPL-3.0** (depende de Ultralytics); el resto
   del repo es MIT y no importa código de `sivri/`.

## Convenciones

- **Idioma** (decidido por el equipo el 2026-10-13): nombres en inglés en el
  código, la base de datos (tablas, columnas, enums), la API (rutas y campos
  JSON) y el frontend. Comentarios, docstrings, mensajes de error, etiquetas
  de Swagger, la interfaz, las URL y la documentación, en español.
- **Documentación:** registro formal; quien la lee no estuvo en la
  conversación, así que cada decisión dice quién, qué, cómo y con qué
  instrumento, con los términos ya definidos en el repo y en el Formato 115.
  Cada decisión lleva quién la tomó y cuándo («decidido por … el
  AAAA-MM-DD»). El avance (hecho, pendiente) solo va en las checklists.
- **Avance:** cada área tiene su checklist, que se lee al empezar y se marca
  al terminar cada pieza: `dataiq/docs/checklist-backend.md`,
  `dataiq/docs/checklist-frontend.md`, `simiq3d/docs/checklist.md` (por
  actividad de DSRM), `simiq3d/docs/checklist-backend.md`,
  `simiq3d/docs/checklist-frontend.md` y `sivri/docs/checklist.md`.
- **Git:** todo entra por PR a `main` con CI; no hay rama `dev` y `main` es
  producción. Commits con Conventional Commits en español
  (`feat(dataiq): …`). El título del PR es la línea que aparece en el release
  semanal (proceso en el README).
- **Infraestructura gratuita y sin tarjeta de crédito** (decidido el
  2026-10-14): no proponer servicios que la exijan. Qué corre dónde y por
  qué: [`docs/arquitectura.md`](docs/arquitectura.md).

## Sistema visual compartido

Decidido por Juan el 2026-10-15 y el 2026-10-27: `shared/design/tokens.css`
tiene los tokens base de `DESIGN.md` como propiedades CSS (no variables de
Sass) y los nombres por uso (`--color-accent`). Cada frontend tiene su tema en
`src/styles/theme.scss`, que solo sobrescribe propiedades. Los componentes
usan solo los nombres por uso, y todo color nuevo se anota en `DESIGN.md`. El
método de diseño de los mockups está en `.claude/rules/diseno.md`.

## Trampas

- **Sesión:** DataIQ es el único emisor de JWT, firmados con EdDSA (nunca
  HS256 con un secreto compartido); los demás módulos validan con la clave
  pública de `/.well-known/jwks.json`. En el navegador el JWT va en la cookie
  `HttpOnly` `__Host-iq_session`, nunca en `localStorage`. Para que la cookie
  llegue, el frontend llama a las APIs por su mismo origen (`/api/dataiq/*`,
  `/api/simiq3d/*`, con rewrites de Vercel) y nunca a la URL directa. Las
  escrituras con cookie exigen `X-IQ-Client: web` (contra CSRF). SIVRI no
  recibe la cookie (su backend está en otro dominio): recibe un token corto
  en `Authorization: Bearer`.
- **Los ids del catálogo cambian entre instalaciones** (UUIDv7 generados al
  cargar). SIVRI y SIMIQ3D mapean por nombre del instrumento (o un alias) y lo
  traducen al id de cada entorno con la API de DataIQ; nunca guardar un id de
  DataIQ en el repo.
- **PostgreSQL 18** en todas partes: `uuidv7()` lo exige.
- **Producción:** las bases son proyectos de Neon y los backends, proyectos de
  Vercel. No escribir en producción sin que lo pida quien opera la
  plataforma. La cadena de Neon que usa el backend va con
  `postgresql+asyncpg://…?ssl=require`, no con el `?sslmode=require` que
  entrega Neon.
- **Los frontends se despliegan con el CLI de Vercel desde GitHub Actions**:
  el plan Hobby no conecta un proyecto a un repositorio de una organización.

## Dónde vive cada cosa

Cada tipo de información tiene un solo lugar (decidido por Mauricio el
2026-10-13).

| Información | Dónde |
|---|---|
| Qué es el proyecto, su fase y el proceso de releases | [`README.md`](README.md) |
| Cómo funciona y cómo se corre cada módulo | El README del módulo |
| Arquitectura e infraestructura, con su porqué | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Esquema de la base de DataIQ | [`dataiq/docs/esquema.dbml`](dataiq/docs/esquema.dbml), su diagrama (`diagramabd.png`, dbdiagram.io) y la migración, que cambian juntos |
| Roles y flujos | [`docs/flujos.md`](docs/flujos.md) |
| Aviso de privacidad | [`docs/privacidad.md`](docs/privacidad.md) |
| Lo que queda para después del MVP | [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md) |
| Producto y diseño visual | [`PRODUCT.md`](PRODUCT.md) y [`DESIGN.md`](DESIGN.md) |
| Avance | Las checklists (ver «Convenciones») |
| Qué cambió | Los [Releases](https://github.com/curn-iq/iq-platform/releases) de GitHub |
| La tesis (Formato 115), entregas por corte y documentos fuente de IQ | Google Drive del proyecto, carpeta «Tesis ING-IQ - CURN» |

El Drive no se modifica salvo pedido explícito de quien trabaja con el
agente. Allí, `ENTREGABLES/` tiene las entregas por corte,
`Modulo 2 - DataIQ/Documentos IQ/` los documentos fuente de las técnicas y
`Modulo 2 - DataIQ/Recursos/Catalogo Instrumental/` el catálogo crudo y
normalizado. El resto del Drive es histórico (como quedó al cerrar el Corte 2)
y no se actualiza.
