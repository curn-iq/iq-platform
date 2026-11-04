import logging
import time
from dataclasses import replace
from uuid import UUID

import httpx

from app.domain.catalog import Catalog
from app.domain.chat import Reply, Vocabulary
from app.domain.focus import focus_of
from app.domain.names import suggest_spelling
from app.domain.requests import Turn
from app.domain.review import review
from app.domain.tutor import (
    data_of,
    max_tokens,
    messages,
    requests_of,
    retry_messages,
    scene_of,
    without_model,
)
from app.ports.chat import ModelUnavailable

logger = logging.getLogger(__name__)

# Cuántas preguntas anteriores ve el modelo, con su respuesta recortada.
MAX_TURNS = 3
# La segunda oportunidad (si la revisión quitó más de la mitad) solo se da si la
# primera respuesta tardó menos que esto: dos respuestas largas no caben en la
# espera que se acepta en el MVP.
RETRY_IF_UNDER = 12.0


class _Busy(Exception):
    """El modelo tardó demasiado o el Servidor PC2 está lleno (429)."""


class TutorAgent:
    """El chat tutor (`app/domain/tutor.py`, decidido por Mauricio el
    2026-11-03): el código decide de qué se habla, trae esos datos de DataIQ y
    decide qué hace el visor; el modelo del Servidor PC2 conversa con esos
    datos en una sola llamada, y su texto se revisa frase por frase
    (`app/domain/review.py`). Si la revisión quita más de la mitad, el modelo
    tiene una segunda oportunidad, con lo que estuvo mal.

    Si el Servidor PC2 no responde a tiempo, o está apagado, la respuesta lo
    dice y muestra lo que DataIQ tiene de lo que se nombró: el chat no queda en
    blanco."""

    # Los nombres mal escritos se corrigen aquí, sin preguntar «¿Quizás…?»: el
    # corrector solo cambia un nombre por uno del catálogo muy parecido.
    fixes_spelling = True

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 60,
        deadline: float = 30,
        temperature: float = 0.3,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/v1/chat/completions"
        self._wait = min(timeout, deadline)
        self._model = model
        self._temperature = temperature
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._transport = transport
        self.name = f"{model} (tutor)"
        self.last_usage: dict = {}

    async def reply(
        self,
        question: str,
        catalog: Catalog,
        open_technique_id: UUID | None,
        previous: tuple[Turn, ...] = (),
    ) -> Reply:
        # Con los nombres de las mesas del MVP: con todo el instrumental,
        # «vesícula» se corregía a «vesical» (Separador vesical).
        asked = suggest_spelling(question, Vocabulary.from_catalog(catalog)) or question
        previous = previous[-MAX_TURNS:]
        focus = focus_of(asked, catalog, open_technique_id, previous)
        scene = scene_of(focus, asked, catalog)
        data = data_of(focus, asked, catalog, scene)
        base = Reply(
            scene.action,
            "",
            technique_id=scene.technique.id if scene.technique else None,
            instrument_id=scene.instrument.id if scene.instrument else None,
            field=scene.field,
            options=scene.options,
            requests=requests_of(focus, scene),
        )
        prompt = messages(asked, data, scene, previous, not focus.empty)
        tokens = max_tokens(focus, asked, scene)
        table = scene.technique or focus.table()
        started = time.perf_counter()
        try:
            text = await self._ask(prompt, tokens)
        except _Busy, ModelUnavailable:
            # Sin la pregunta en el log (docs/privacidad.md).
            logger.warning("El tutor no respondió a tiempo o el modelo no está")
            return replace(
                base,
                reply=without_model(focus, asked, catalog, scene),
                answered_by=f"{self.name}, sin modelo",
            )
        subject = scene.instrument or (
            focus.instruments[0] if len(focus.instruments) == 1 else None
        )
        checked = review(text, catalog, table, data, asked, subject)
        answered_by = self.name
        if checked.mostly_removed and time.perf_counter() - started < RETRY_IF_UNDER:
            details = [p.detail for p in checked.problems]
            try:
                again = await self._ask(retry_messages(prompt, text, details), tokens)
            except _Busy, ModelUnavailable:
                again = ""
            second = (
                review(again, catalog, table, data, asked, subject) if again else None
            )
            if second and second.text and second.removed <= checked.removed:
                checked, answered_by = second, f"{self.name}, segunda oportunidad"
        if checked.problems:
            # Solo el tipo de límite y nombres de DataIQ, nunca el texto.
            logger.warning(
                "El tutor cambió %d de %d frases: %s",
                checked.removed,
                checked.sentences,
                sorted({p.kind for p in checked.problems}),
            )
        if not checked.text:
            return replace(
                base,
                reply=without_model(focus, asked, catalog, scene),
                answered_by=f"{self.name}, sin texto",
            )
        return replace(
            base,
            reply=checked.text,
            answered_by=answered_by,
            sources=data,
            generated=True,
            repairs=tuple(p.detail for p in checked.problems),
        )

    async def _ask(self, prompt: list[dict], tokens: int) -> str:
        body = {
            "model": self._model,
            "temperature": self._temperature,
            "top_p": 0.8,
            "messages": prompt,
            "max_tokens": tokens,
        }
        try:
            async with httpx.AsyncClient(transport=self._transport) as client:
                response = await client.post(
                    self._url, json=body, headers=self._headers, timeout=self._wait
                )
        except httpx.TimeoutException as error:
            raise _Busy() from error
        except httpx.HTTPError as error:
            raise ModelUnavailable(str(error)) from error
        if response.status_code == 429:
            raise _Busy()  # el filtro del Servidor PC2 está lleno
        try:
            response.raise_for_status()
            answer = response.json()
            content = answer["choices"][0]["message"].get("content")
            # Cuánto leyó y escribió el modelo: lo cuenta el banco de preguntas.
            self.last_usage = answer.get("usage") or {}
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
            raise ModelUnavailable(str(error)) from error
        return (content or "").strip()
