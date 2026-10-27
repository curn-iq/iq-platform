import logging
import time
from dataclasses import replace

from fastapi import APIRouter, HTTPException, status

from app.adapters.inbound.api.dependencies import (
    Catalogs,
    ChatLog,
    CurrentCaller,
    Engine,
)
from app.adapters.inbound.api.schemas import ChatIn, ChatOut
from app.domain.chat import Vocabulary, spelling_reply
from app.domain.chat_log import ChatLogEntry
from app.domain.names import suggest_spelling
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import ModelUnavailable

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatOut)
async def ask(
    body: ChatIn,
    caller: CurrentCaller,
    catalogs: Catalogs,
    engine: Engine,
    chat_log: ChatLog,
) -> ChatOut:
    """Responde la pregunta con datos del catálogo de DataIQ. `technique_id` es la
    técnica abierta en el visor, si hay una.

    Si un nombre parece mal escrito («masectomia»), responde «¿Quizás quisiste
    decir…?» con la pregunta corregida como opción, sin suponer. Con
    LANGUAGE_MODEL=ollama responde el agente del Servidor PC2 (ver
    OllamaAgent); si no, las plantillas."""
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
    corrected = suggest_spelling(body.question, Vocabulary.from_catalog(catalog))
    if corrected:
        reply = replace(spelling_reply(corrected), answered_by="corrector")
    else:
        try:
            reply = await engine.reply(body.question, catalog, body.technique_id)
        except ModelUnavailable as error:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "El chat no está disponible"
            ) from error
    latency_ms = round((time.perf_counter() - started) * 1000)
    if chat_log is not None:
        entry = ChatLogEntry.of(
            body.question,
            body.technique_id,
            reply,
            reply.answered_by or engine.name,
            latency_ms,
        )
        try:
            await chat_log.add(entry)
        except Exception:
            # Si no se puede guardar, igual se responde: el estudiante no tiene
            # por qué notarlo. Queda en el log del servidor.
            logger.exception("No se pudo guardar la conversación en el registro")
    return ChatOut.model_validate(reply)
