import time

from fastapi import APIRouter, HTTPException, status

from app.adapters.inbound.api.dependencies import Catalogs, CurrentCaller, Model
from app.adapters.inbound.api.schemas import ChatIn, ChatOut
from app.domain.catalog import technique_by_id
from app.domain.chat import Vocabulary, answer
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import ModelUnavailable

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatOut)
async def ask(
    body: ChatIn, caller: CurrentCaller, catalogs: Catalogs, model: Model
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
    # La demora va al registro de conversaciones (pieza 6).
    _latency_ms = round((time.perf_counter() - started) * 1000)
    return ChatOut.model_validate(reply)
