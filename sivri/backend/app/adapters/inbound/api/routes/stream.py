"""Video continuo: el celular manda 2 o 3 cuadros por segundo y recibe el resultado de
cada uno.

Protocolo (WebSocket `/ws/validate?technique_id=…`, `technique_id` opcional):

1. El cliente manda un mensaje de texto `{"token": "<JWT corto de DataIQ>"}`. Un
   navegador no puede poner encabezados en un WebSocket, y el token en la dirección
   quedaría en los registros.
2. Después manda cada cuadro como mensaje binario (JPEG o PNG) y recibe
   `{"type": "result", "frame_number": N, "frame": {…}}` (`frame` es el mismo cuerpo
   de `POST /validate`). `frame_number` es el número de orden del cuadro en esta
   conexión (el primero que llegó es el 1): el cliente lo cuenta al enviarlos y así
   sabe a qué imagen corresponde cada resultado.
3. El token corto vence en pocos minutos: antes de que venza, el cliente manda otro
   `{"token": "…"}` con el renovado. Si vence sin renovarlo, el servidor avisa con
   `{"type": "error", "code": "token_expired"}` y cierra con el código 4401.

Si llegan cuadros más rápido de lo que se procesan, solo se procesa el último: el
resultado tiene que ser de lo que la cámara ve ahora, no de hace un segundo; los
cuadros descartados no tienen respuesta y su número se salta. Los errores de un
cuadro (`invalid_image`, `too_large`, `catalog_unavailable`) se avisan con
`{"type": "error", "code": …, "frame_number": N}` y la conexión sigue.
"""

import asyncio
import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.adapters.inbound.api.dependencies import (
    Analyzer,
    Caller,
    Catalogs,
    ClassMaps,
    Verifier,
    authenticate,
)
from app.adapters.inbound.api.schemas import frame_out
from app.application.analysis import InvalidImage, UnknownTechnique
from app.config import config
from app.ports.catalog import CatalogDenied, CatalogUnavailable

router = APIRouter(tags=["Validación"])

# Códigos de cierre propios (4000 a 4999).
UNAUTHORIZED = 4401
UNKNOWN_TECHNIQUE = 4404
PROTOCOL_ERROR = 4400


def _token_of(text: str) -> str | None:
    try:
        token = json.loads(text).get("token")
    except ValueError, AttributeError:
        return None
    return token if isinstance(token, str) and token else None


async def _error(
    websocket: WebSocket, code: str, frame_number: int | None = None
) -> None:
    message: dict = {"type": "error", "code": code}
    if frame_number is not None:
        message["frame_number"] = frame_number
    await websocket.send_json(message)


@router.websocket("/ws/validate")
async def validate_stream(
    websocket: WebSocket,
    verifier: Verifier,
    catalogs: Catalogs,
    class_maps: ClassMaps,
    analyzer: Analyzer,
    technique_id: UUID | None = None,
) -> None:
    await websocket.accept()
    first = await websocket.receive()
    token = _token_of(first["text"]) if first.get("text") else None
    if token is None:
        await websocket.close(PROTOCOL_ERROR, "El primer mensaje lleva el token")
        return
    try:
        caller = await authenticate(verifier, token)
    except Exception:
        await websocket.close(UNAUTHORIZED, "El token no es válido o ya venció")
        return

    # `frame` guarda el cuadro más reciente sin procesar, como (número, bytes); el
    # número cuenta los cuadros que llegan en esta conexión, desde el 1.
    state: dict = {"caller": caller, "frame": None, "count": 0, "closed": False}
    wake = asyncio.Event()

    async def read() -> None:
        # Guarda solo el cuadro más reciente y atiende los tokens renovados.
        try:
            while True:
                message = await websocket.receive()
                if message["type"] == "websocket.disconnect":
                    break
                if message.get("bytes") is not None:
                    state["count"] += 1
                    state["frame"] = (state["count"], message["bytes"])
                    wake.set()
                elif message.get("text") is not None:
                    renewed = _token_of(message["text"])
                    if renewed is None:
                        continue
                    try:
                        state["caller"] = await authenticate(verifier, renewed)
                    except Exception:
                        await _error(websocket, "invalid_token")
        except WebSocketDisconnect:
            pass
        finally:
            state["closed"] = True
            wake.set()

    reader = asyncio.create_task(read())
    try:
        while True:
            await wake.wait()
            wake.clear()
            if state["closed"]:
                break
            pending, state["frame"] = state["frame"], None
            if pending is None:
                continue
            number, data = pending
            current: Caller = state["caller"]
            if current.principal.expires_at <= datetime.now(UTC):
                await _error(websocket, "token_expired", number)
                await websocket.close(UNAUTHORIZED, "El token venció")
                break
            if len(data) > config.max_upload_bytes:
                await _error(websocket, "too_large", number)
                continue
            try:
                image = await asyncio.to_thread(analyzer.decode, data)
                catalog = await catalogs.get(current.token)
                classes = await class_maps.get()
                analysis = await asyncio.to_thread(
                    analyzer.analyze, image, catalog, classes, technique_id
                )
            except InvalidImage:
                await _error(websocket, "invalid_image", number)
                continue
            except CatalogUnavailable:
                await _error(websocket, "catalog_unavailable", number)
                continue
            except CatalogDenied:
                await websocket.close(UNAUTHORIZED, "DataIQ no aceptó el token")
                break
            except UnknownTechnique:
                await websocket.close(UNKNOWN_TECHNIQUE, "SIVRI no valida esa técnica")
                break
            await websocket.send_json(
                {
                    "type": "result",
                    "frame_number": number,
                    "frame": frame_out(analysis, classes).model_dump(mode="json"),
                }
            )
    finally:
        reader.cancel()
