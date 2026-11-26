<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../design/brand/modules/sivri-backend-dark.svg">
    <img src="../../design/brand/modules/sivri-backend.svg" alt="SIVRI, BackEnd" width="173">
  </picture>
</p>

La API de SIVRI: reconoce el instrumental en cada cuadro de la cámara, ubica la
mesa con los cuatro marcadores ArUco y valida cada instrumento contra la mesa de
Mayo de la técnica, según el arreglo de DataIQ. Corre en el
[Servidor PC1](../servidor-pc1/README.md). Licencia AGPL-3.0
([`../LICENSE`](../LICENSE)).

## Stack

- Python 3.14 y FastAPI, con arquitectura hexagonal, como DataIQ y SIMIQ3D.
- YOLO26 de Ultralytics en CPU (extra `yolo`), OpenCV para los marcadores y
  SciPy para el emparejamiento.
- PostgreSQL 18 con SQLAlchemy y Alembic: una sola tabla, `class_mappings`.
- Sesión con el token corto de DataIQ, validado con su clave pública (JWKS).

## Correrlo

Hace falta [uv](https://docs.astral.sh/uv/), Podman y el backend de DataIQ
corriendo ([`dataiq/backend/README.md`](../../dataiq/backend/README.md#correrlo)).
Todo se corre desde `sivri/backend`.

1. PostgreSQL 18 en un contenedor propio (puerto 5434):

   ```sh
   podman run -d --name sivri-db -p 127.0.0.1:5434:5432 \
     -e POSTGRES_USER=sivri -e POSTGRES_PASSWORD=<contraseña> -e POSTGRES_DB=sivri \
     -v sivri-db-datos:/var/lib/postgresql docker.io/library/postgres:18
   ```

2. Copiar `.env.example` a `.env` y poner la URL de esa base.
3. Crear la tabla y cargar el mapeo de clases (necesita una cuenta de DataIQ; en
   local sirven las de desarrollo). Cada fila de `classes.csv` debe resolver a un
   instrumento de DataIQ, y hay que correrlo en cada entorno, porque los ids de
   DataIQ cambian de una instalación a otra:

   ```sh
   uv run alembic upgrade head
   DATAIQ_TOKEN=<token de POST /auth/token de DataIQ> \
     uv run python -m app.adapters.inbound.cli.load_classes
   ```

4. Levantar la API: `uv run fastapi dev app/main.py --port 8002`
   (documentación interactiva en `/docs`).
5. Con el modelo entrenado: `uv sync --extra yolo` (PyTorch solo para CPU), los
   pesos en `models/sivri.pt` y `DETECTOR=yolo` en el `.env`. Sin eso corre el
   detector de pruebas (`DETECTOR=fake`).

## Pruebas

```sh
uv run pytest      # crea y migra su propia base, sivri_test
uv run ruff check . && uv run ruff format --check .
```

**Sin el modelo entrenado:** con `DETECTOR=fake` y
`FAKE_DETECTIONS=examples/detections.json`, el detector devuelve siempre las
mismas cajas, y se ve cada estado sin cámara ni YOLO:

```sh
curl -H "Authorization: Bearer $TOKEN" -F image=@examples/frame.jpg \
  http://127.0.0.1:8002/validate
```

## API

| Ruta | Para qué |
|---|---|
| `GET /health` | Que está en pie y dónde está el código fuente (lo pide la AGPL) |
| `GET /techniques` | Las técnicas cuya mesa valida |
| `POST /validate` | Un cuadro (JPEG o PNG, campo `image`) y, opcional, `technique_id`: el resultado |
| `WS /ws/validate` | El video continuo: el mismo resultado, cuadro por cuadro |

Todas, salvo `/health`, piden `Authorization: Bearer <token corto de DataIQ>`.

**El resultado de un cuadro** (`FrameOut`): los marcadores que encontró y si
están los cuatro (`board_found`), cada instrumento detectado con su caja como
fracción del cuadro, y las técnicas que más se parecen, cada una con su
porcentaje (de 0 a 1) y el estado de cada objeto: `in_place`, `move`,
`doubtful`, `missing` o `extra`. Sin los cuatro marcadores solo se nombra lo que
se ve. Cada objeto por corregir trae `message`, la frase para el estudiante, ya
escrita por zona, vecinos y número del diagrama.

### Video continuo

El celular manda 2 o 3 cuadros por segundo por `/ws/validate`:

1. El primer mensaje es `{"token": "<token corto>"}`; no va en la dirección,
   porque quedaría en los registros.
2. Después, cada cuadro como mensaje binario. La respuesta es
   `{"type": "result", "frame_number": N, "frame": {…}}`, con el orden del cuadro
   en la conexión.
3. El token dura 5 minutos: la página manda otro antes de que venza.

Si llegan cuadros más rápido de lo que se procesan, solo se procesa el último.
Los errores de un cuadro (`invalid_image`, `too_large`, `catalog_unavailable`) se
avisan y la conexión sigue. Códigos de cierre: 4400 (falta el token), 4401
(token inválido o vencido) y 4404 (técnica que no valida).

## Cómo lo usa el frontend

1. **Token:** la página lo pide a DataIQ (`/api/dataiq/auth/module-token`, con la
   cookie y `X-IQ-Client: web`) y lo renueva antes de que venza.
2. **Qué mandar:** el cuadro completo, en JPEG desde un `canvas`, uno por vez;
   el servidor reduce el lado mayor a 1280 px (`MAX_IMAGE_SIDE`) y rechaza, antes
   de decodificarla, la imagen de más de 25 millones de píxeles
   (`MAX_IMAGE_PIXELS`).
3. **Cómo dibujar:** todo viene en fracciones del cuadro mandado (0 a 1); con
   `frame_number` se dibuja sobre ese cuadro y no sobre el video de ahora.
4. **Qué mostrar:** `message` tal cual. `move` (filas y columnas) es solo para
   dibujar la flecha: al estudiante nunca se le habla de filas ni celdas.

La dirección del backend va directa, no por el mismo origen, porque Vercel no
pasa WebSockets. `CORS_ORIGINS` tiene que incluir el origen de la página. Errores
HTTP: 401 (token rechazado), 404 (técnica que no valida), 413 (cuadro muy
grande), 422 (no es una imagen) y 503 (DataIQ no responde).

## Despliegue

Corre en el Servidor PC1 con servicios de systemd y Tailscale Funnel:
[`../servidor-pc1/README.md`](../servidor-pc1/README.md).

## Estructura

```
backend/
├── app/
│   ├── domain/        la mesa por los marcadores, lo esperado, la validación y las frases
│   ├── application/   FrameAnalyzer: reduce el cuadro, busca marcadores e instrumentos y valida
│   ├── ports/         detector, marcadores, catálogo, mapeo de clases y tokens
│   └── adapters/      API, comandos, OpenCV, YOLO26, DataIQ, JWKS y la base
├── classes.csv        las 16 clases del detector
├── examples/          un cuadro y detecciones para probar sin el modelo
├── migrations/        Alembic
└── tests/
```

## Más documentación

- Qué es SIVRI: [`../README.md`](../README.md).
- Cómo se valida la mesa y con qué valores: [`../docs/validacion.md`](../docs/validacion.md).
- Dataset y métricas del detector: [`../docs/dataset.md`](../docs/dataset.md).
- Mediciones y diagnósticos: [`../docs/diagnosticos.md`](../docs/diagnosticos.md).
- Avance: [`../docs/checklist.md`](../docs/checklist.md).
