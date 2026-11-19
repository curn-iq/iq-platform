# Backend de SIVRI

Reconoce el instrumental en cada cuadro de la cámara, ubica la mesa con los cuatro
marcadores ArUco y valida cada instrumento contra la mesa de Mayo de la técnica,
según el arreglo de DataIQ. Qué valida y por qué: [`../README.md`](../README.md).
Dataset y protocolo de fotos: [`../docs/dataset.md`](../docs/dataset.md). Licencia
AGPL-3.0 (ver [`../LICENSE`](../LICENSE)).

## Cómo está armado

Capas, como el backend de SIMIQ3D. Todo se corre desde `sivri/backend`.

| Dónde | Qué tiene |
|---|---|
| `app/domain/` | La lógica, sin framework ni modelo: la mesa a partir de los marcadores (`board.py`), lo que cada técnica espera (`expected.py`), el emparejamiento, los estados y el reconocimiento de la técnica (`validation.py`) y cómo se le dice al estudiante dónde va cada instrumento (`location.py`: zona, vecinos y número del diagrama) |
| `app/application/` | `FrameAnalyzer`: reduce el cuadro, busca marcadores e instrumentos y valida |
| `app/ports/` | Lo que el dominio necesita de afuera: detector, marcadores, catálogo, mapeo de clases, tokens |
| `app/adapters/inbound/` | La API (FastAPI) y el comando que carga el mapeo de clases |
| `app/adapters/outbound/` | OpenCV (marcadores), YOLO26 y el detector de pruebas, el catálogo de DataIQ, la validación de tokens (JWKS) y la base (SQLAlchemy) |
| `classes.csv` | Las 19 clases del modelo: el instrumento y su número al entrenar |
| `migrations/` | Alembic: una tabla, `class_mappings` |

## Qué expone

| Ruta | Para qué |
|---|---|
| `GET /health` | Que está en pie y dónde está el código fuente (la AGPL obliga a ofrecerlo) |
| `GET /techniques` | Las técnicas cuya mesa valida, con cuántos instrumentos espera de cada una |
| `POST /validate` | Un cuadro (JPEG o PNG, campo `image`) y, opcional, `technique_id`: el resultado |
| `WS /ws/validate` | El video continuo: el mismo resultado, cuadro por cuadro |

Todas, salvo `/health`, piden `Authorization: Bearer <token corto de DataIQ>`. La
documentación interactiva queda en `/docs`.

**El resultado de un cuadro** (`FrameOut`): `markers` (los que encontró),
`board_found` (están los cuatro), `detections` (cada instrumento, con su clase,
su id de DataIQ y su caja como fracción del cuadro), `recognized`, `techniques` (la
técnica que más se parece o, si quedan muy cerca, las dos que más; cada una con su
porcentaje, sus objetos y sus sobrantes) y `ranking` (las cinco). Cada objeto trae
su estado: `in_place`, `move` (con cuántas celdas hacia dónde), `doubtful`,
`missing` o `extra`. Sin los cuatro marcadores se nombra lo que se ve, pero no se
valida nada (`board_found: false`). Las imágenes se procesan y no se guardan.

### Video continuo

El celular manda 2 o 3 cuadros por segundo por un WebSocket (`/ws/validate`, con
`technique_id` opcional en la dirección):

1. Primer mensaje, de texto: `{"token": "<token corto>"}`. No va en la dirección
   porque un navegador no puede poner encabezados en un WebSocket y quedaría en los
   registros.
2. Después, cada cuadro como mensaje binario; la respuesta es
   `{"type": "result", "frame_number": N, "frame": {…}}`. `frame_number` es el orden
   del cuadro en la conexión (el primero que llega es el 1): la página los cuenta al
   enviarlos y así sabe a qué imagen corresponde cada resultado.
3. El token dura 5 minutos: la página manda otro `{"token": "…"}` antes de que
   venza. Si vence sin renovarlo, el servidor avisa (`token_expired`) y cierra con
   el código 4401.

Si llegan cuadros más rápido de lo que se procesan, solo se procesa el último: la
respuesta tiene que ser de lo que la cámara ve ahora, y los cuadros descartados no
tienen respuesta (su número se salta). Los errores de un cuadro (`invalid_image`,
`too_large`, `catalog_unavailable`) se avisan, con su `frame_number`, y la conexión
sigue.
Códigos de cierre: 4400 (el primer mensaje no lleva el token), 4401 (token inválido,
vencido o rechazado por DataIQ) y 4404 (técnica que no valida).

## Para quien hace el frontend

Lo que la página necesita de este backend, en el orden en que lo usa. El contrato
exacto de `POST /validate` está en `/docs`; los mensajes del WebSocket, en la
sección anterior (no salen en OpenAPI: sus tipos se escriben a mano).

**1. Token.** La página llama a DataIQ por su mismo origen (`/api/dataiq/auth/module-token`,
con la cookie y `X-IQ-Client: web`) y recibe `{access_token, expires_in}`. Lo renueva
poco antes de que venza y lo manda a SIVRI: en `Authorization: Bearer` (`/techniques`,
`/validate`) o en el primer mensaje del WebSocket y en cada renovación. Si DataIQ
responde 401, la sesión terminó: hay que ingresar de nuevo.

**2. Qué mandar.** El cuadro completo del video (sin recortar), desde un `canvas` en
JPEG, 2 o 3 por segundo y uno por vez: no mandar otro hasta recibir el resultado del
anterior o un error. El servidor reduce el lado mayor a `MAX_IMAGE_SIDE` (1280); mandar
menos baja el consumo de datos. Qué tamaño y calidad conviene está sin medir: se
decide con el celular real.

**3. Cómo dibujar.** Todo viene en fracciones del cuadro que se mandó (0 a 1), así que
se multiplican por el tamaño del dibujo. Si el `<video>` se muestra recortado
(`object-fit: cover`), la conversión tiene que contar el recorte. El resultado llega con
la demora de la red y el procesamiento: con `frame_number` se sabe de qué cuadro es, y
conviene dibujarlo sobre ese cuadro y no sobre el video de ahora.

**4. Qué trae el resultado** (`FrameOut`):

| Campo | Cómo leerlo |
|---|---|
| `board_found` | `false` si falta algún marcador de los cuatro (`markers` dice cuáles se ven, por su `id` 0 a 3). Entonces solo hay `detections`; `techniques` y `ranking` vienen vacíos |
| `detections[].label` | Nombre del instrumento tal como está en DataIQ, listo para mostrar; `instrument_id` es `null` si la clase no está mapeada |
| `techniques` | La técnica que más se parece o, si quedan muy cerca, las dos. Cada una trae `objects` (lo esperado) y `extras` (lo que sobra) |
| `percent` | De 0 a 1 (no de 0 a 100). `in_place` cuenta también los dudosos: es el numerador del porcentaje |
| `objects[].status` | `in_place`, `move`, `doubtful` (no se le muestra nada al estudiante), `missing` (sin `box`) o `extra` |
| `objects[].message` | Lo que se le dice al estudiante, ya escrito: la zona de la mesa, lo que tiene al lado y su número del diagrama («Pinza Kelly (n.º 2): va en el centro, a la derecha, junto a Pinza Rochester (n.º 3).»). `null` si está en su lugar o dudoso. Se muestra tal cual |
| `objects[].move` | Solo con `move`, para dibujar una flecha: `rows` hacia abajo y `columns` hacia la derecha; negativos, hacia arriba y hacia la izquierda. No se le dice al estudiante en filas ni celdas: para eso es `message` |
| `objects[].legend_number` | El número del instrumento en el diagrama de IQ |

Un objeto que hay que mover, recortado de una respuesta real (`frame` de un resultado):

```json
{
  "board_found": true,
  "recognized": true,
  "techniques": [{
    "name": "Prueba", "percent": 0.667, "in_place": 2, "expected": 3,
    "objects": [{
      "status": "move", "label": "Pinza Kelly", "legend_number": 2,
      "expected_cells": [{"row": 2, "column": 3}],
      "found_cell": {"row": 2, "column": 2},
      "box": {"x1": 0.375, "y1": 0.391, "x2": 0.435, "y2": 0.438},
      "move": {"rows": 0, "columns": 1},
      "message": "Pinza Kelly (n.º 2): va en el centro."
    }],
    "extras": []
  }]
}
```

**5. Cuándo mostrar la técnica.** El backend valida todos los cuadros, y el porcentaje y
la técnica cambian de uno a otro. Propuesta de punto de partida, a ajustar con el
celular (no está decidida): mientras arma, nombrar lo que ve (`detections`); mostrar la
técnica cuando `board_found` sea `true` y la misma técnica salga primera en 5 resultados
seguidos (unos 2 segundos); dejar de mostrarla si `board_found` es `false` durante unos
segundos.

**6. Probar sin el modelo entrenado.** Con el detector de pruebas, que siempre
devuelve las mismas cajas, se ve cada estado sin cámara ni YOLO. En `examples/` hay un
cuadro con los cuatro marcadores (`frame.jpg`, 840 × 640) y las cajas de seis
instrumentos en píxeles de ese cuadro (`detections.json`). Con `.env` en
`DETECTOR=fake` y `FAKE_DETECTIONS=examples/detections.json`, y la API levantada
(ver «Correrlo»):

```sh
curl -H "Authorization: Bearer $TOKEN" -F image=@examples/frame.jpg \
  http://127.0.0.1:8002/validate
```

Las cajas están fijas en píxeles: con otro tamaño de cuadro, o con la cámara, la
estructura del resultado es la misma pero las cajas no coinciden con la imagen. Con
las pruebas (`uv run pytest`) también se puede ver cada mensaje: `tests/api/`.

**7. Ojo.**
- La cámara del navegador solo abre con HTTPS (o `localhost`): probar desde un celular
  contra un servidor local en http no funciona.
- Vercel no pasa WebSockets por sus reescrituras: la página se conecta directo a
  `wss://` del Servidor PC1 (el Funnel, aún sin dirección). La dirección de SIVRI va
  en la configuración del frontend, no en una ruta del mismo origen.
- Desde el navegador, `CORS_ORIGINS` tiene que incluir el origen de la página, también
  en desarrollo (por ejemplo `["http://localhost:4200"]`). El WebSocket no pasa por
  CORS; lo protege el token.
- Los errores HTTP: 401 (DataIQ no aceptó el token), 404 (técnica que no valida), 413
  (cuadro demasiado grande), 422 (no es una imagen) y 503 (DataIQ no responde).

## Correrlo

Hace falta [uv](https://docs.astral.sh/uv/), Podman y el backend de DataIQ corriendo
(ver [`../../dataiq/README.md`](../../dataiq/README.md)).

1. PostgreSQL 18 en un contenedor propio (puerto 5434), aparte de los de DataIQ y
   SIMIQ3D:

   ```sh
   podman run -d --name sivri-db -p 5434:5432 \
     -e POSTGRES_USER=sivri -e POSTGRES_PASSWORD=<contraseña> -e POSTGRES_DB=sivri \
     -v sivri-db-datos:/var/lib/postgresql docker.io/library/postgres:18
   ```

2. Copiar `.env.example` a `.env` y poner la URL de esa base.
3. Crear la tabla y cargar el mapeo de clases (necesita una cuenta de DataIQ; en
   local sirven las de desarrollo):

   ```sh
   uv run alembic upgrade head
   DATAIQ_TOKEN=<token de POST /auth/token de DataIQ> \
     uv run python -m app.adapters.inbound.cli.load_classes
   ```

   Cada nombre de `classes.csv` tiene que existir en DataIQ (o ser un alias); si no,
   no carga nada y dice cuáles faltan. Hay que volver a correrlo en cada entorno,
   porque los ids de DataIQ cambian de una instalación a otra.
4. Levantar la API:

   ```sh
   uv run fastapi dev app/main.py --port 8002
   ```

5. Con el modelo entrenado: `uv sync --extra yolo` (PyTorch solo para CPU), poner
   los pesos en `models/sivri.pt` y en el `.env` `DETECTOR=yolo`. Cada clase del
   modelo tiene que llamarse como en `classes.csv`. Sin eso corre el detector de
   pruebas (`DETECTOR=fake`), que no ve nada o lee las detecciones de un archivo
   JSON (`FAKE_DETECTIONS`) para probar la API y la página.

Pruebas y estilo (las pruebas crean y migran su propia base, `sivri_test`, en el
mismo servidor):

```sh
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## Decisiones de la implementación

Lo que el README de SIVRI no fija y quedó así (puntos de partida que se ajustan con
las fotos de la sesión de validación; decididos al implementar, el 2026-11-18, a
confirmar por Mauricio):

- **La mesa** va entre los **centros** de los cuatro marcadores (0 arriba a la
  izquierda, 1 arriba a la derecha, 2 abajo a la derecha, 3 abajo a la izquierda,
  como en `marcadores-aruco.pdf`: diccionario 4x4 de 50). La cuadrícula de cada
  técnica se reparte en partes iguales sobre ella. Si falta un marcador no se
  valida.
- **Emparejar:** clase por clase, con el algoritmo húngaro, minimizando la
  distancia del centro de la caja al centro de las celdas esperadas.
- **Margen técnico:** 10 % del lado de la celda (`CELL_MARGIN`). Un objeto de varias
  celdas no tiene margen en el borde entre ellas.
- **Porcentaje:** instrumentos «en su lugar» o «dudosos» sobre los esperados: un
  dudoso no es un error para el estudiante (el README dice que no se le muestra
  nada), así que cuenta como bien.
- **Muy cerca:** se muestran las dos técnicas cuando su porcentaje difiere en 5
  puntos o menos (`CLOSE_GAP`); el README no da la cifra.
- **Qué se espera:** un instrumento por componente de cada objeto, solo si es clase
  del modelo. Las hojas de bisturí no lo son (van montadas en su mango), así que la
  mesa no las espera.
- **Cuándo está «armada» la mesa:** el backend siempre valida y devuelve el
  porcentaje; la página decide qué mostrar mientras el estudiante arma (nombrar lo
  que ve) y cuándo mostrar la técnica.

## Lo que falta

- Los pesos entrenados (dependen de etiquetar las fotos de IQ).
- La base guarda solo el mapeo de clases: no guarda imágenes ni resultados.
- Despliegue en el Servidor PC1 con Tailscale Funnel, y el origen del shell en
  `CORS_ORIGINS`.
- El frontend de SIVRI (la cámara y el dibujo sobre el video).
