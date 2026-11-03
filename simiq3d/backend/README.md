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

`POST /chat` recibe `{"question", "technique_id", "previous"}`:
`technique_id` es la técnica abierta en el visor (opcional), y `previous`,
hasta 3 preguntas anteriores de la conversación, de la más antigua a la más
reciente, cada una con los `requests` que devolvió su respuesta (opcional; no
se guardan). Devuelve:

```json
{
  "action": "highlight_instrument",
  "technique_id": "…",
  "instrument_id": "…",
  "field": null,
  "reply": "La Pinza Kelly va en el centro de la mesa de Mayo de Colecistectomía, junto a la Tijera de Mayo (n.º 10 del diagrama).",
  "options": ["¿Qué es la Pinza Kelly?"],
  "requests": [{"kind": "locate", "technique": "Colecistectomía", "instrument": "Pinza Kelly", "field": null, "other_technique": null, "comparison": null, "topic": null}]
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
`requests` son los pedidos que se entendieron de la pregunta (ver «Cómo
responde el chat»): el frontend los manda de vuelta en `previous` con la
siguiente. Errores: `401` sin sesión o si DataIQ rechaza el token; `429` si la cuenta pasó
el tope de preguntas (por defecto, 30 cada 10 minutos: «Espera unos minutos»);
`503` si DataIQ o el Servidor PC2 no responden (el chat queda no disponible; el
visor sigue). Si el Servidor PC2 está lento u ocupado, no hay error: responden
las plantillas.

## Cómo responde el chat

El diseño y su porqué: [`../README.md`](../README.md), «Chat».

1. Si un nombre parece mal escrito, responde «¿Quizás quisiste decir…?» con la
   pregunta corregida (`app/domain/names.py`), sin llegar al modelo.
2. Con `LANGUAGE_MODEL=ollama`, el **agente**
   (`adapters/outbound/language/ollama.py`) le pide al modelo, en una sola
   llamada, que convierta la pregunta en **pedidos**: las funciones de
   `TOOLS`, una por cada cosa que pida, con los nombres como los dijo el
   estudiante. Las preguntas anteriores van como turnos de la conversación,
   cada una con sus pedidos como llamadas (hasta 3, `MAX_TURNS`). El texto que
   escriba el modelo no se usa.
3. Lo que pide el modelo se revisa contra DataIQ y contra las palabras de la
   conversación (`app/domain/requests.py`):
   - una técnica o un instrumento que nadie nombró, ni la técnica abierta, se
     toma como no dicho (`as_said`): sin técnica, se usa la abierta o se
     pregunta cuál;
   - si dice que la pregunta no trata de estas técnicas y nombra una de ellas o
     un instrumento de sus mesas (`contradicted`), o si no pidió nada que se
     entienda, responden las reglas fijas;
   - si la pregunta pide tiempos quirúrgicos y el modelo no lo marcó, se
     agrega la nota (`with_known_limits`).
4. **Cada pedido se responde con DataIQ** (`respond`, con las plantillas de
   `app/domain/chat.py`), y la respuesta los une en orden, con lo que está fuera
   de alcance al final. La escena es la del pedido más visual (`SCENE_ORDER`).
   Los nombres se resuelven como se dicen («el mango número 7», «la cirugía para
   quitar la vesícula»; `app/domain/tools.py`): una técnica de otra
   especialidad se responde como fuera de alcance, «el bisturí» en una mesa que
   lleva varios pregunta cuál, y un nombre parecido, «¿Quizás te refieres a…?».
5. Las **reglas fijas** (`adapters/outbound/language/fake.py`, con
   `app/domain/guards.py` y `asked_action` en `app/domain/names.py`)
   interpretan la pregunta sin el modelo, una sola cosa por mensaje y sin las
   preguntas anteriores, y responden con las mismas plantillas. Son el motor
   con `LANGUAGE_MODEL=fake` y el respaldo del agente si el Servidor PC2 está
   lento u ocupado (pasados `LLM_DEADLINE` segundos, o con un 429 del filtro).
   Si el Servidor PC2 está apagado, el chat queda no disponible (503).

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
  | `CHAT_LOG_ENABLED` | `true` (el valor por defecto) |
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

# Registro de conversaciones (se apaga con CHAT_LOG_ENABLED=false). Con --desde
# y --hasta (hora de Colombia), solo las preguntas de una sesión de evaluación
uv run python -m app.adapters.inbound.cli.chat_log exportar registro.csv
uv run python -m app.adapters.inbound.cli.chat_log exportar sesion.csv \
    --desde 2026-11-02T14:30 --hasta 2026-11-02T17:00
uv run python -m app.adapters.inbound.cli.chat_log borrar

# Banco de preguntas: corre eval/banco.csv contra el chat y mide su exactitud
uv run python -m app.adapters.inbound.cli.chat_bank --salida resultados.csv
```

`load_models` y `chat_bank` piden una cuenta de DataIQ (o el token en
`DATAIQ_TOKEN`). `load_models` traduce cada nombre al id de ese entorno; si un
nombre no existe, no carga nada y dice cuál.

## Banco de preguntas

[`eval/banco.csv`](eval/banco.csv) tiene las preguntas con que se mide la
exactitud del chat (evaluación formativa: ver
[`../README.md`](../README.md), «Cómo se evalúa»). Cada fila trae la
pregunta, la técnica abierta en el visor si la hay (`tecnica_abierta`), el
tipo de pregunta (`tipo`: directa, sinónimo, paráfrasis, error de escritura,
seguimiento, ambigua, fuera de alcance o intento de desviarlo) y lo que el
chat debe hacer (`espera`), con los nombres que hacen falta para calificarla
(`tecnica`, `instrumento`, `dato`, `otra_tecnica`).

`chat_bank` hace cada pregunta como la ruta del chat (corrector, agente y
plantillas), con el motor de `LANGUAGE_MODEL`, pero sin HTTP: no gasta el tope
de preguntas ni escribe en el registro. El banco guarda nombres, no datos: lo
que se compara (número de objetos, datos clínicos, descripciones) sale del
catálogo de DataIQ al correr, y si un nombre ya no está en DataIQ, no corre.

| `espera` | Es correcta si… |
|---|---|
| `mostrar` | el visor abre esa técnica |
| `ubicar` | el visor abre esa técnica y resalta ese instrumento |
| `no_va` | no resalta el instrumento en esa técnica (no va en su mesa) |
| `varias_mesas` | pide precisar en qué técnica, o nombra todas las técnicas donde va |
| `describir` | el texto trae al menos el 40 % de las palabras de cinco letras o más de la descripción de DataIQ, o casi toda una de sus frases (el 60 %): «¿Para qué sirve…?» se responde con una frase; y el visor abre la ficha de ese instrumento (`describe_instrument`) |
| `dato` | el texto trae al menos el 40 % de las palabras de cinco letras o más del dato clínico de DataIQ (`dato`: `description`, `indications`, `complications`, `anesthesia_position`, o `anesthesia` y `patient_position` por separado) y la acción es ese dato de esa técnica (`show_clinical_data`; anestesia y posición van juntas) |
| `listar` | nombra todos los instrumentos de la mesa de Mayo y el visor muestra la lista de esa técnica (`list_instruments`) |
| `contar_objetos`, `contar_tecnicas` | dice el número correcto, en cifras o en letras |
| `mas_objetos` | nombra la técnica con más objetos en la mesa de Mayo |
| `solo_en`, `comparten`, `diferencias` | nombra los instrumentos que corresponden y ninguno de los que no |
| `aclarar` | pide precisar (incluye el «¿Quizás quisiste decir…?» del corrector). Si la pregunta es ambigua, `instrumento` trae las opciones separadas por «\|», y también es correcto nombrarlas todas |
| `fuera` | no abre nada en el visor y dice que no tiene la respuesta |

Lo que hace el visor sale de la acción, como en el contrato de `POST /chat`:
`answer`, `clarify` y `no_answer` no lo cambian aunque traigan ids. Imprime la
exactitud total, por `espera` y por tipo, quién respondió (el modelo, las
plantillas o el corrector) y el tiempo por pregunta; `--salida` guarda cada
respuesta con su calificación y su motivo, para revisarla a mano. La
calificación compara nombres, números y palabras, no el sentido: una respuesta
que la calificación da por buena puede tener una afirmación falsa, y por eso se
revisa el detalle.

## Estructura

```
app/
├── domain/         catálogo, chat (plantillas), pedidos, nombres y reglas fijas
├── ports/          contratos: catálogo, motor del chat, sesión, mapeo, registro
├── adapters/
│   ├── inbound/    API (rutas, sesión, esquemas) y comandos
│   └── outbound/   DataIQ, Ollama y plantillas, PostgreSQL, JWKS
├── config.py
└── main.py
eval/               banco de preguntas del chat
migrations/         Alembic
tests/              dominio, adaptadores y API
```
