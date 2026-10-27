# Backend de SIMIQ3D

La API del chat de SIMIQ3D: recibe la pregunta del estudiante, la responde con
datos del catálogo de DataIQ y le dice al visor qué mostrar. También entrega
qué modelo 3D dibuja cada instrumento. Qué es SIMIQ3D y por qué está hecho así
(alcance, modelos 3D, chat, cómo se arma la mesa): [`../README.md`](../README.md).
Avance: [`../docs/checklist-backend.md`](../docs/checklist-backend.md).

## Stack

| | |
|---|---|
| API | Python 3.14 y FastAPI, con arquitectura hexagonal (`domain/`, `ports/`, `adapters/`), como DataIQ |
| Base | PostgreSQL 18, su propio proyecto en Neon; SQLAlchemy async y Alembic. Esquema: [`../docs/esquema.dbml`](../docs/esquema.dbml) |
| Sesión | El JWT de DataIQ, validado con su clave pública (JWKS); SIMIQ3D no tiene usuarios |
| Modelo de lenguaje | Ollama en el Servidor PC2 (por defecto, `qwen3-vl:8b-instruct`), por su API compatible con OpenAI |

## Correr el backend

Hace falta [uv](https://docs.astral.sh/uv/), Podman (o Docker) y el backend de
DataIQ corriendo (ver [`../../dataiq/README.md`](../../dataiq/README.md)). Todo
se corre desde `simiq3d/backend`.

1. PostgreSQL 18 en un contenedor propio, aparte del de DataIQ:

   ```sh
   podman run -d --name simiq3d-db -p 5433:5432 \
     -e POSTGRES_USER=simiq3d -e POSTGRES_PASSWORD=<contraseña> -e POSTGRES_DB=simiq3d \
     -v simiq3d-db-datos:/var/lib/postgresql docker.io/library/postgres:18
   ```

2. Copiar `.env.example` a `.env` y poner la URL de esa base.
3. Crear las tablas y levantar la API:

   ```sh
   uv run alembic upgrade head
   uv run fastapi dev app/main.py --port 8001
   ```

   La documentación interactiva queda en http://127.0.0.1:8001/docs. Para
   «Authorize» hace falta un token de DataIQ (`POST /auth/token` de su API);
   en local sirven sus cuentas de desarrollo, como `admin@example.com` con la
   contraseña `desarrollo`.

4. Con el modelo de lenguaje: instalar [Ollama](https://ollama.com), bajar el
   modelo y ponerlo en el `.env`:

   ```sh
   ollama pull qwen3-vl:8b-instruct
   ```

   ```
   LANGUAGE_MODEL=ollama
   LLM_MODEL=qwen3-vl:8b-instruct
   ```

   Sin eso responde el motor de plantillas (`LANGUAGE_MODEL=fake`), que no
   necesita el modelo.

Pruebas y estilo:

```sh
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

Las pruebas usan su propia base (`simiq3d_test`) en el mismo servidor y un
DataIQ y un Ollama falsos: no necesitan nada más corriendo.

## API

| Ruta | Qué hace | Pide cuenta |
|---|---|---|
| `POST /chat` | Responde una pregunta | Sí (y `X-IQ-Client` si llega con cookie) |
| `GET /models` | Qué GLB dibuja cada instrumento (`instrument_id`, `model_file`), con `ETag` | Sí |
| `GET /health` | Si la API está arriba | No |

`POST /chat` recibe `{"question", "technique_id"}` (la técnica abierta en el
visor, opcional) y devuelve:

```json
{
  "action": "highlight_instrument",
  "technique_id": "…",
  "instrument_id": "…",
  "field": null,
  "reply": "La Pinza Kelly va en el centro de la mesa de Mayo de Colecistectomía, junto a la Tijera de Mayo (n.º 10 del diagrama).",
  "options": ["¿Qué es la Pinza Kelly?"]
}
```

| `action` | Qué hace el visor |
|---|---|
| `show_technique` | Abre la técnica (`technique_id`) |
| `highlight_instrument` | Abre la técnica y resalta el instrumento (`instrument_id`) |
| `show_clinical_data`, `list_instruments`, `describe_instrument` | Abre la técnica, si viene; el texto trae el dato |
| `answer` | Nada: es una respuesta en texto («¿en cuántas técnicas…?») |
| `clarify` | Nada: pide precisar (en qué técnica, o «¿Quizás quisiste decir…?»); las `options` son las preguntas para elegir |
| `no_answer` | Nada: la pregunta no trata de estas técnicas |

`options` son preguntas que se pueden mandar tal cual como la siguiente.
Errores: `401` sin sesión o si DataIQ rechaza el token; `429` si la cuenta pasó
el tope de preguntas (por defecto, 30 cada 10 minutos: «Espera unos minutos»);
`503` si DataIQ o el Servidor PC2 no responden (el chat queda no disponible; el
visor sigue). Si el Servidor PC2 está lento u ocupado, no hay error: responden
las plantillas.

## Cómo responde el chat

1. Si un nombre parece mal escrito, responde «¿Quizás quisiste decir…?» con la
   pregunta corregida (`app/domain/names.py`).
2. Con `LANGUAGE_MODEL=ollama`, el **agente** (`adapters/outbound/language/ollama.py`)
   deja que el modelo use las consultas de `app/domain/tools.py` y redacte la
   respuesta. Antes de enviarla, `app/domain/grounding.py` verifica que cada
   nombre, número y ubicación esté en lo consultado, que los conteos («7
   objetos») sean un total de los resultados y que no hable de la cuadrícula.
   Si no pasa, si no consultó nada o si no termina en 30 segundos
   (`LLM_DEADLINE`), responden las plantillas.
3. Las **plantillas** (`app/domain/chat.py`, con las reglas de
   `adapters/outbound/language/fake.py`) arman la respuesta solo con datos de
   DataIQ. Son el motor con `LANGUAGE_MODEL=fake` y el respaldo del agente.

El riesgo de que el modelo invente y cómo se controla:
[`../README.md`](../README.md), «Chat».

## Producción

La API corre en Vercel (plan Hobby) como funciones de Python, en el proyecto
`simiq3d-backend` (región `cle1`, junto a Neon). La base es Neon (proyecto
`simiq3d`, PostgreSQL 18, Ohio), aparte de la de DataIQ. El modelo de lenguaje
está en el Servidor PC2: [`../servidor-pc2/README.md`](../servidor-pc2/README.md).

- **Despliegue:** en GitHub Actions (`.github/workflows/simiq3d-backend.yml`),
  cada PR corre el estilo y las pruebas; cada push a `main` despliega en Vercel
  con el CLI y publica la imagen en `ghcr.io/curn-iq/simiq3d-backend`.
- **Variables de entorno del proyecto en Vercel:**

  | Variable | Valor |
  |---|---|
  | `DATABASE_URL` (secreta) | La cadena directa de Neon, con `postgresql+asyncpg://` y `?ssl=require` en vez de `?sslmode=require&channel_binding=require` |
  | `DATABASE_POOL`, `SQL_ECHO` | `false` |
  | `DATAIQ_URL` | `https://dataiq-backend.vercel.app` |
  | `LANGUAGE_MODEL`, `LLM_MODEL`, `LLM_TIMEOUT` | `ollama`, `qwen3-vl:8b-instruct`, `60` |
  | `LLM_URL` | La dirección de Tailscale Funnel del Servidor PC2 |
  | `LLM_API_KEY` (secreta) | La clave del filtro del Servidor PC2 |
  | `CHAT_LOG_ENABLED` | `false`, salvo en las sesiones de evaluación |
  | `CHAT_QUOTA_SECRET` (secreta) | La clave del tope de preguntas por cuenta |
  | `LLM_DEADLINE`, `CHAT_QUOTA_MAX`, `CHAT_QUOTA_WINDOW` | `30`, `30`, `600` (los valores por defecto) |

  Se agregan con `npx vercel@64.0.2 env add <NOMBRE> production` desde esta
  carpeta.

- **Migraciones en Neon:** desde un computador, con `DATABASE_URL` apuntando a
  Neon solo en esa terminal:

  ```fish
  read -s -x -P "Cadena de Neon: " DATABASE_URL
  uv run alembic upgrade head
  ```

- **El frontend** llega al backend por el rewrite `/api/simiq3d/*` →
  `https://simiq3d-backend.vercel.app/*` de su proyecto de Vercel, para que la
  cookie de sesión sea del mismo origen.

## Comandos

```sh
# Mapeo de modelos 3D: lee ../models/modelos.csv (columnas instrumento y archivo)
uv run python -m app.adapters.inbound.cli.load_models

# Registro de conversaciones (solo con CHAT_LOG_ENABLED=true)
uv run python -m app.adapters.inbound.cli.chat_log exportar registro.csv
uv run python -m app.adapters.inbound.cli.chat_log borrar
```

`load_models` pide una cuenta de DataIQ (o el token en `DATAIQ_TOKEN`) para
traducir cada nombre al id de ese entorno; si un nombre no existe, no carga
nada y dice cuál.

## Estructura

```
app/
├── domain/         catálogo, chat (plantillas), consultas del agente, verificación, nombres
├── ports/          contratos: catálogo, motor del chat, sesión, mapeo, registro
├── adapters/
│   ├── inbound/    API (rutas, sesión, esquemas) y comandos
│   └── outbound/   DataIQ, Ollama y plantillas, PostgreSQL, JWKS
├── config.py
└── main.py
migrations/         Alembic
tests/              dominio, adaptadores y API
```
