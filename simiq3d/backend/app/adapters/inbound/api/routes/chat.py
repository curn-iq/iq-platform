import logging
import time
from collections.abc import AsyncIterator
from dataclasses import replace

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.adapters.inbound.api.dependencies import (
    Catalogs,
    ChatLog,
    CurrentCaller,
    Engine,
    Quota,
)
from app.adapters.inbound.api.schemas import (
    ChatIn,
    ChatOut,
    ChatStreamEnd,
    ChatStreamEvent,
    ChatStreamStart,
    ChatStreamText,
)
from app.domain.catalog import Catalog
from app.domain.chat import Reply, Vocabulary, spelling_reply
from app.domain.chat_log import ChatLogEntry
from app.domain.names import suggest_spelling
from app.domain.requests import Request, Turn
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import (
    ChatEngine,
    ModelUnavailable,
    ReplyEnd,
    ReplyEvent,
    ReplyStart,
    ReplyText,
)

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatOut)
async def ask(
    body: ChatIn,
    caller: CurrentCaller,
    catalogs: Catalogs,
    engine: Engine,
    chat_log: ChatLog,
    quota: Quota,
) -> ChatOut:
    """Responde la pregunta con datos del catálogo de DataIQ. `technique_id` es la
    técnica abierta en el visor, si hay una, y `previous`, las preguntas
    anteriores con los `requests` y el texto de su respuesta, para entender un
    seguimiento.

    Con LANGUAGE_MODEL=ollama responde el tutor del Servidor PC2 (TutorAgent),
    que corrige solo los nombres mal escritos; si no, las plantillas, que ante
    un nombre mal escrito («masectomia») responden «¿Quizás quisiste decir…?»
    con la pregunta corregida como opción."""
    started = time.perf_counter()
    catalog = await _catalog(catalogs, caller.token)
    reply = _spelling(body, catalog, engine)
    if reply is None:
        await _take_quota(quota, caller.account_id)
        try:
            reply = await engine.reply(
                body.question, catalog, body.technique_id, _previous(body)
            )
        except ModelUnavailable as error:
            raise _unavailable() from error
    await _log(chat_log, body, reply, engine, started)
    return ChatOut.model_validate(reply)


@router.post(
    "/chat/stream",
    response_class=StreamingResponse,
    responses={
        200: {
            "model": ChatStreamEvent,
            "description": "Una línea JSON por evento (NDJSON): `start`, cada "
            "`text` y `end`",
            "content": {
                "application/x-ndjson": {
                    "schema": {"$ref": "#/components/schemas/ChatStreamEvent"}
                }
            },
        }
    },
)
async def ask_streamed(
    body: ChatIn,
    caller: CurrentCaller,
    catalogs: Catalogs,
    engine: Engine,
    chat_log: ChatLog,
    quota: Quota,
) -> StreamingResponse:
    """Como `POST /chat`, pero la respuesta llega a medida que se escribe, una
    línea JSON por evento: `start` (lo que hace el visor, sin texto), cada
    `text` (una parte ya revisada, que se agrega a lo mostrado) y `end` (la
    respuesta completa, que reemplaza lo mostrado). Los errores antes de
    empezar son los de `POST /chat`. Con un motor que no escribe por partes
    (las plantillas), llegan los tres eventos juntos."""
    started = time.perf_counter()
    catalog = await _catalog(catalogs, caller.token)
    reply = _spelling(body, catalog, engine)
    if reply is None:
        await _take_quota(quota, caller.account_id)
        stream = getattr(engine, "stream", None)
        if stream is not None:
            events = stream(body.question, catalog, body.technique_id, _previous(body))
        else:
            try:
                reply = await engine.reply(
                    body.question, catalog, body.technique_id, _previous(body)
                )
            except ModelUnavailable as error:
                raise _unavailable() from error
    if reply is not None:
        events = _at_once(reply)

    async def lines() -> AsyncIterator[str]:
        async for event in events:
            match event:
                case ReplyStart(reply=part):
                    out = ChatStreamStart(
                        type="start", **ChatOut.model_validate(part).model_dump()
                    )
                case ReplyText(text=text):
                    out = ChatStreamText(type="text", text=text)
                case ReplyEnd(reply=whole):
                    await _log(chat_log, body, whole, engine, started)
                    out = ChatStreamEnd(
                        type="end", **ChatOut.model_validate(whole).model_dump()
                    )
            yield out.model_dump_json() + "\n"

    # Sin caché ni acumulación en un proxy: cada línea sale cuando está lista.
    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


async def _at_once(reply: Reply) -> AsyncIterator[ReplyEvent]:
    yield ReplyStart(replace(reply, reply=""))
    yield ReplyText(reply.reply)
    yield ReplyEnd(reply)


async def _catalog(catalogs, token: str) -> Catalog:
    try:
        return await catalogs.get(token)
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


def _spelling(body: ChatIn, catalog: Catalog, engine: ChatEngine) -> Reply | None:
    """«¿Quizás quisiste decir…?», si el motor no corrige los nombres él mismo
    (el tutor sí) y un nombre parece mal escrito."""
    if getattr(engine, "fixes_spelling", False):
        return None
    corrected = suggest_spelling(body.question, Vocabulary.from_catalog(catalog))
    return (
        replace(spelling_reply(corrected), answered_by="corrector")
        if corrected
        else None
    )


async def _take_quota(quota, account_id) -> None:
    # El tope protege al Servidor PC2: cualquiera con una cuenta gratis podría
    # llenarlo de preguntas. La corrección de nombres no lo gasta.
    if quota is not None and not await quota.take(account_id):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Hiciste muchas preguntas seguidas. Espera unos minutos.",
        )


def _previous(body: ChatIn) -> tuple[Turn, ...]:
    return tuple(
        Turn(
            turn.question,
            tuple(Request(**r.model_dump()) for r in turn.requests),
            turn.reply,
        )
        for turn in body.previous
    )


def _unavailable() -> HTTPException:
    return HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE, "El chat no está disponible"
    )


async def _log(chat_log, body: ChatIn, reply: Reply, engine, started: float) -> None:
    if chat_log is None:
        return
    latency_ms = round((time.perf_counter() - started) * 1000)
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
