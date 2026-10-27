import logging
import time

from fastapi import APIRouter, HTTPException, status

from app.adapters.inbound.api.dependencies import (
    Catalogs,
    ChatLog,
    CurrentCaller,
    Model,
)
from app.adapters.inbound.api.schemas import ChatIn, ChatOut
from app.domain.catalog import technique_by_id
from app.domain.chat import Vocabulary, answer
from app.domain.chat_log import ChatLogEntry
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import ModelUnavailable

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatOut)
async def ask(
    body: ChatIn,
    caller: CurrentCaller,
    catalogs: Catalogs,
    model: Model,
    chat_log: ChatLog,
) -> ChatOut:
    """Convierte la pregunta en una acción del chat y arma la respuesta con datos
    de DataIQ. El modelo de lenguaje solo elige la acción: el texto sale de
    plantillas. `technique_id` es la técnica abierta en el visor, si hay una."""
    started = time.perf_counter()
    try:
        catalog = await catalogs.get(caller.token)
    except CatalogUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "DataIQ no responde"
        ) from error
    except CatalogDenied as error:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "DataIQ no aceptó la sesión",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    open_technique = technique_by_id(catalog, body.technique_id)
    try:
        choice = await model.choose(
            body.question,
            Vocabulary.from_catalog(catalog),
            open_technique.name if open_technique else None,
        )
    except ModelUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "El chat no está disponible"
        ) from error
    reply = answer(choice, catalog, body.technique_id)
    latency_ms = round((time.perf_counter() - started) * 1000)
    if chat_log is not None:
        entry = ChatLogEntry.of(
            body.question, body.technique_id, reply, model.name, latency_ms
        )
        try:
            await chat_log.add(entry)
        except Exception:
            # Si no se puede guardar, igual se responde: el estudiante no tiene
            # por qué notarlo. Queda en el log del servidor.
            logger.exception("No se pudo guardar la conversación en el registro")
    return ChatOut.model_validate(reply)
