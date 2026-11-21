# DataIQ

Plataforma y dataset estructurado de técnicas quirúrgicas: catálogo de
instrumental normalizado, especialidades, técnicas y posiciones de mesa.
Es la fuente única de verdad del ecosistema: SIVRI y SIMIQ3D consumen su API.

## Stack

- Backend: Python + FastAPI
- Base de datos: PostgreSQL
- Autenticación: JWT firmado con EdDSA (clave pública en
  `/.well-known/jwks.json`) + Argon2id
- Arquitectura: hexagonal (dominio / puertos / adaptadores)
- Frontend: Angular, junto con el shell de navegación del ecosistema
  ([`frontend/README.md`](frontend/README.md); avance en
  [`docs/checklist-frontend.md`](docs/checklist-frontend.md))

## Esquema de datos

[`docs/esquema.dbml`](docs/esquema.dbml) — formato DBML, se puede pegar
directamente en [dbdiagram.io](https://dbdiagram.io/d/69fe17cd54a51d93d3d377a9).

## Correr el backend

Hace falta [uv](https://docs.astral.sh/uv/) y Podman (o Docker). Todo se corre
desde `dataiq/backend`.

1. PostgreSQL 18 en un contenedor (lo exige `uuidv7()`):

   ```sh
   podman run -d --name dataiq-db -p 5432:5432 \
     -e POSTGRES_USER=dataiq -e POSTGRES_PASSWORD=<contraseña> -e POSTGRES_DB=dataiq \
     -v dataiq-db-datos:/var/lib/postgresql docker.io/library/postgres:18
   ```

2. Copiar `.env.example` a `.env` y llenarlo: la URL de la base de datos y la
   clave con que se firman los JWT (el archivo trae el comando para generarla).
3. Crear las tablas, cargar las 18 técnicas y levantar la API:

   ```sh
   uv run alembic upgrade head
   uv run python -m seed.load
   uv run fastapi dev app/main.py
   ```

   La documentación interactiva queda en http://127.0.0.1:8000/docs. Su botón
   «Authorize» pide el token a `POST /auth/token`.

4. Cuentas para desarrollo, una por rol, todas con la contraseña `desarrollo`:
   `usuario@example.com`, `colaborador@example.com`, `revisor@example.com` y
   `admin@example.com`. Se crean con:

   ```sh
   uv run python -m seed.dev_accounts
   ```

   Solo funciona contra una base local; en Neon se niega. Para una cuenta
   propia: registrarse en `POST /auth/register` y asignarse el rol por terminal
   (`uv run python -m app.adapters.inbound.cli.assign_role <correo> admin`).

### Mesas de Mayo de Cirugía General

Decidido por Mauricio el 2026-11-19 a partir de las listas de IQ y las fotos
del 2026-11-18. En `seed/tecnicas.xlsx`, las cinco mesas de Mayo usan una
cuadrícula vertical de 10 filas por 6 columnas. Se proyecta el centro de
cada caja etiquetada sobre el rectángulo entre los centros de los cuatro
marcadores y se amplía cada eje un 10 % por lado. Cada objeto ocupa la unión
de las celdas observadas en las tres rondas «Bien Armada». Se numera por su
primera celda, de arriba abajo y de izquierda a derecha. No hubo choques
entre objetos.

Las tijeras de Mayo y Metzenbaum y los mangos 3 y 4 forman el objeto de
abajo, en orden libre. Las dos Kelly y los dos mosquitos de Tiroidectomía
se registran una vez por clase. Se agrupan las dos disecciones y se usa
«Pinza Mosquito curva», el nombre del catálogo. En Tiroidectomía, Babcock
reemplaza a Lahey. El mango 4 y la disección, vistos en las fotos de esa
técnica, quedan marcados «para confirmar con IQ» en el texto de la fuente.

### Posición métrica de los instrumentos

Mauricio decidió el 2026-11-20 que DataIQ es la fuente de la colocación fina.
La hoja `posiciones` de `backend/seed/tecnicas.xlsx` identifica cada componente
por técnica, mesa, número e instrumento. Guarda el centro en centímetros
desde el centro del marco calibrado y el giro desde +X hacia +Z, en grados.
La carga convierte las posiciones a metros. El catálogo y el detalle de la
técnica devuelven `position_x_m`, `position_z_m` y `yaw_deg` en cada
componente. Los campos pueden ser nulos, en cuyo caso sigue disponible la
colocación por celdas. Los datos con oclusión visual o una identificación
incierta se indican como «propuesto» en la columna `origen`. La columna
`ejemplar` distingue instrumentos iguales que se ven en sitios distintos.
El catálogo devuelve los ejemplares posteriores en `additional_placements`
dentro del mismo componente.

### Publicar las mesas actualizadas en una base existente

Desde `dataiq/backend`, selecciona el entorno con `DATABASE_URL`.
`uv run python -m seed.update_mayo` muestra las cinco mesas y las versiones
que se publicarían. Con `--apply`, el comando publica en una transacción
una versión nueva por técnica que necesite el cambio: la mesa de Mayo y la
fuente de la técnica (`source`), que cita de dónde sale esa mesa. Conserva el
historial y el resto del contenido publicado, y se detiene si alguna
técnica por actualizar tiene un borrador o una versión en revisión. Se puede
ejecutar nuevamente para comprobar que las cinco mesas coinciden con el
Excel.

## Cómo lo usa el frontend

La sesión del navegador va en una cookie `HttpOnly` que JavaScript no puede
leer (`__Host-iq_session`); el token nunca se guarda en `localStorage`. Para
que esa cookie sea propia y no de terceros, el frontend llama a la API por su
mismo origen, a través de un proxy:

- **Producción (Vercel):** `vercel.json` del frontend con un rewrite por
  módulo hacia la API de DataIQ, que también está en Vercel. Vercel reenvía la
  cookie y el `Set-Cookie`; confirmarlo al desplegar el frontend.

  ```json
  {
    "rewrites": [
      { "source": "/api/dataiq/:path*", "destination": "https://dataiq-backend.vercel.app/:path*" }
    ]
  }
  ```

- **Desarrollo (Angular):** `proxy.conf.json`, que se pasa a `ng serve` con
  `--proxy-config` (o en `angular.json`):

  ```json
  {
    "/api/dataiq": {
      "target": "http://127.0.0.1:8000",
      "pathRewrite": { "^/api/dataiq": "" }
    }
  }
  ```

  Chrome y Firefox aceptan la cookie `Secure` en `http://localhost`. Si un
  navegador la rechaza, poner `SESSION_COOKIE_SECURE=false` en el `.env` del
  backend (solo en desarrollo).

Reglas para las peticiones:

1. URLs relativas (`/api/dataiq/techniques`), nunca la de la API. Así el
   navegador manda la cookie solo; no hace falta `withCredentials`.
2. Todas las peticiones llevan el encabezado `X-IQ-Client: web` (un
   interceptor). La API lo exige en las escrituras con cookie, en el login y
   en el logout: es la protección contra CSRF.
3. Ingreso: `POST /auth/login` con JSON `{"email", "password"}`. Responde la
   cuenta y deja la cookie; no devuelve el token.
4. Quién está conectado y con qué rol: `GET /auth/me` (401 si no hay sesión).
   El rol solo decide qué se muestra; quien permite o niega es la API.
5. Salir: `POST /auth/logout`, que borra la cookie.
6. La sesión dura 2 horas. Un 401 en algo que pide cuenta significa que hay
   que volver a ingresar.
7. Sin manejar el ETag a mano: el navegador revalida solo con el `ETag` y el
   `Cache-Control` que manda la API.
8. CSP estricta en los encabezados de Vercel, y nada de `innerHTML` con datos
   de la API ni `bypassSecurityTrust…`: aun sin poder robar la cookie, un XSS
   puede hacer peticiones mientras la página está abierta.

Lo que no es navegador (Swagger, pruebas, servidores, una app) pide el token a
`POST /auth/token` (formulario OAuth2: `username` = correo, `password`) y lo
manda en `Authorization: Bearer`; con Bearer no hace falta `X-IQ-Client`.

Un módulo que corre en otro dominio (SIVRI, en el Servidor PC1) no recibe la cookie.
La página le pide a DataIQ `POST /auth/module-token` (con la cookie y
`X-IQ-Client`), que responde `{access_token, token_type, expires_in}`: un JWT de
DataIQ de `MODULE_TOKEN_MINUTES` minutos (5 por omisión), que la página manda al
módulo en `Authorization: Bearer` y renueva antes de que venza. Solo se pide con la
cookie: un token no puede pedir otro. El módulo lo valida con el JWKS y lo reenvía a
DataIQ para pedir el catálogo.

Un cambio de la API (una ruta o un esquema) va con `npm run api:types` en el
mismo PR: regenera los tipos del frontend
([`frontend/README.md`](frontend/README.md#correr-el-frontend)), y el CI falla
si no coinciden.

Tests y estilo:

```sh
uv run pytest      # crea y migra su propia base de datos, dataiq_test
uv run ruff format . && uv run ruff check .
```

Imagen de contenedor (sirve con Docker o Podman, para correr el backend fuera
de Vercel):

```sh
podman build -t dataiq-backend .
podman run --rm --network host --env-file .env -e PORT=8000 dataiq-backend
podman run --rm --network host --env-file .env dataiq-backend alembic upgrade head
```

La imagen lleva la API y las migraciones, no la carga inicial ni las pruebas.

## Producción

La API corre en Vercel (plan Hobby) como funciones de Python:
**https://dataiq-backend.vercel.app** (documentación en `/docs`). La base es
Neon (proyecto `dataiq`, PostgreSQL 18, Ohio).

- **Despliegue:** en GitHub Actions, cada PR corre el estilo y las pruebas;
  cada push a `main` despliega en Vercel con el CLI (Hobby no conecta repos de
  una organización de GitHub) y publica la imagen en
  `ghcr.io/curn-iq/dataiq-backend`.
- **Configuración en Vercel:** `vercel.json` (región `cle1`, junto a Neon, y
  lo que no entra en el paquete) y `[tool.vercel]` en `pyproject.toml` (dónde
  está la app).
- **Variables de entorno del proyecto en Vercel** (secretas): `DATABASE_URL`
  (cadena directa de Neon, con `postgresql+asyncpg://` y `?ssl=require`),
  `JWT_PRIVATE_KEY` (distinta de la de desarrollo), `DATABASE_POOL=false` y
  `SQL_ECHO=false`.
- **Migraciones y carga inicial en Neon:** desde un computador, con
  `DATABASE_URL` apuntando a Neon solo en esa terminal:

  ```fish
  read -s -x -P "Cadena de Neon: " DATABASE_URL
  uv run alembic upgrade head
  uv run python -m seed.load
  ```

  La carga solo llena la descripción de un instrumento si está vacía, para no
  pisar la que haya editado un revisor; las que son distintas de
  `seed/tecnicas.xlsx` las lista. Para reemplazarlas por las del archivo:
  `uv run python -m seed.load --descriptions`.

- **Suprimir una cuenta**, cuando su titular lo pide por el canal del
  [aviso de privacidad](../docs/privacidad.md). Desde `dataiq/backend`, con la
  cadena de Neon solo en esa terminal; pide escribir «suprimir» para confirmar:

  ```fish
  read -s -x -P "Cadena de Neon: " DATABASE_URL
  uv run python -m app.adapters.inbound.cli.delete_account <correo>
  ```

  Si la cuenta no creó ni revisó nada, se borra entera. Si creó o revisó
  técnicas o versiones, se borran su nombre, su correo y su contraseña, y lo
  que hizo se conserva sin su nombre; si tenía una sesión abierta, vence sola en
  menos de 2 horas. La ley da 15 días hábiles para atender el pedido (Ley 1581
  de 2012, art. 15).

- **Desplegar a mano** (si hiciera falta), desde `dataiq/backend` con la
  sesión de Vercel del dueño del proyecto: `npx vercel@latest deploy --prod`.

## Estructura

```
dataiq/
├── backend/
├── frontend/
└── docs/
```
