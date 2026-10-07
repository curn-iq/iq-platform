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
- Frontend: por definir (se decide con los mockups)

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
   uv run python -m semilla.cargar
   uv run fastapi dev app/main.py
   ```

   La documentación interactiva queda en http://127.0.0.1:8000/docs.

4. Para escribir hace falta una cuenta con rol: registrarse en
   `POST /auth/registro` y asignarse el rol por terminal:

   ```sh
   uv run python -m app.adaptadores.entrada.cli.asignar_rol <correo> admin
   ```

Tests y estilo:

```sh
uv run pytest      # crea y migra su propia base de datos, dataiq_test
uv run ruff format . && uv run ruff check .
```

## Estructura

```
dataiq/
├── backend/
├── frontend/
└── docs/
```
