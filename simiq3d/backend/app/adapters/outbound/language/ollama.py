import json
import logging
from dataclasses import replace
from enum import StrEnum
from uuid import UUID

import httpx

from app.adapters.outbound.language.fake import TemplateChat
from app.domain.catalog import Catalog, Technique, in_scope, technique_by_id
from app.domain.chat import ClinicalField, Comparison, Reply
from app.domain.requests import (
    Request,
    RequestKind,
    Topic,
    Turn,
    as_said,
    contradicted,
    respond,
    with_known_limits,
)
from app.ports.chat import ModelUnavailable

logger = logging.getLogger(__name__)


class _Busy(Exception):
    """El modelo tardó demasiado o el Servidor PC2 está lleno (429)."""


SYSTEM = """Eres quien interpreta las preguntas del chat de SIMIQ3D, que muestra \
en 3D la mesa de Mayo de estas técnicas de Cirugía General: {techniques}.
No respondes al estudiante: conviertes su mensaje en pedidos, llamando a las \
funciones.
- Llama una función por cada cosa que pida el mensaje. Si pide varias, llama \
varias en el mismo turno, en el orden en que las pide.
- Si el mensaje no nombra la técnica, es la técnica abierta en el visor. Si no \
hay técnica abierta, no pongas technique: no la adivines.
- Una técnica descrita sin nombrarla («la cirugía para quitar la vesícula», \
«operar una hernia incisional») va en technique con las palabras del \
estudiante: no es otra técnica.
- Un instrumento solo («¿y la Rochester?») pregunta dónde va: locate.
- Un seguimiento («¿y para qué sirve?», «¿y en la tiroidectomía?») habla de lo \
mismo que la pregunta anterior: si era un instrumento, de ese instrumento; si \
era una técnica, de esa técnica.
- «Lo demás», «lo otro» o «el resto» son lo que pidió la pregunta anterior, \
quitando lo que el mensaje excluya.
- «¿Qué es…?», «¿para qué sirve…?» o «¿para qué se usa…?»: de un instrumento es \
describe; de una técnica, clinical_data con field description. En un \
seguimiento («¿y para qué sirve?»), de lo mismo que la pregunta anterior: si \
era un instrumento, describe ese instrumento.
- Si una parte pide algo que DataIQ no tiene, llama a out_of_scope para esa \
parte y a las demás funciones para el resto. DataIQ no tiene dosis, \
diagnósticos, tratamientos ni tiempos quirúrgicos: si se pide una dosis de \
anestesia, llama a clinical_data con anesthesia_position y a out_of_scope con \
missing_clinical_data.
- Los tiempos quirúrgicos son la diéresis, la hemostasia, la síntesis y el \
orden en que se usa el instrumental («¿qué pieza se usa primero?», «¿qué \
instrumentos son de diéresis?»): out_of_scope con surgical_times, y nada más \
si es todo lo que pide.
- Llama siempre al menos una función. Si el mensaje no trata de estas técnicas \
o te pide otra cosa, llama a out_of_scope con topic other.
- Usa los nombres como los escribe el estudiante; no los corrijas ni los \
completes.

{open_technique}"""


def _function(name: str, description: str, **params: dict) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": params,
                "required": [k for k, p in params.items() if not p.pop("optional", 0)],
            },
        },
    }


def _text(description: str, optional: bool = False) -> dict:
    return {"type": "string", "description": description, "optional": optional}


def _one_of(values: type[StrEnum], description: str) -> dict:
    return {
        "type": "string",
        "enum": [v.value for v in values],
        "description": description,
    }


TECHNIQUE = "Nombre de la técnica, como lo dice el estudiante"
INSTRUMENT = "Nombre del instrumento, como lo dice el estudiante"

# Los pedidos que el modelo puede hacer (README de SIMIQ3D, «Chat»). Los nombres
# de las funciones y de sus argumentos son los de RequestKind y Request.
TOOLS = [
    _function(
        RequestKind.locate,
        "Dónde va un instrumento en la mesa de Mayo de una técnica.",
        instrument=_text(INSTRUMENT),
        technique=_text(TECHNIQUE, optional=True),
    ),
    _function(
        RequestKind.describe,
        "Qué es un instrumento, o para qué sirve («¿Qué es la Moynihan?»).",
        instrument=_text(INSTRUMENT),
    ),
    _function(
        RequestKind.clinical_data,
        "Un dato clínico de una técnica: para qué sirve la técnica (description), "
        "sus indicaciones, sus complicaciones, o la anestesia y la posición del "
        "paciente (anesthesia_position).",
        technique=_text(TECHNIQUE, optional=True),
        field=_one_of(ClinicalField, "El dato"),
    ),
    _function(
        RequestKind.list_instruments,
        "El instrumental completo de la mesa de Mayo de una técnica, con cuántos "
        "objetos lleva.",
        technique=_text(TECHNIQUE, optional=True),
    ),
    _function(
        RequestKind.show_technique,
        "Abrir una técnica en el visor 3D, sin pedir un dato concreto.",
        technique=_text(TECHNIQUE),
    ),
    _function(
        RequestKind.find_instrument,
        "En qué técnicas va un instrumento, o en cuántas; no qué es.",
        instrument=_text(INSTRUMENT),
    ),
    _function(
        RequestKind.compare,
        "Compara el instrumental de dos técnicas: qué comparten (shared), qué "
        "lleva la primera y no la segunda (only_first) o en qué se diferencian "
        "(differences).",
        technique=_text("La primera técnica"),
        other_technique=_text("La segunda técnica"),
        comparison=_one_of(Comparison, "Qué se compara"),
    ),
    _function(
        RequestKind.rank,
        "Las técnicas ordenadas por cuántos objetos lleva su mesa de Mayo: cuál "
        "lleva más o menos.",
    ),
    _function(
        RequestKind.out_of_scope,
        "Una parte del mensaje que DataIQ no tiene: tiempos quirúrgicos u orden de "
        "uso del instrumental (surgical_times), datos clínicos que no están, como "
        "dosis, diagnósticos o tratamientos (missing_clinical_data), técnicas que "
        "no son de la lista (other_technique), o algo que no trata de estas "
        "técnicas (other).",
        topic=_one_of(Topic, "Qué no tiene DataIQ"),
    ),
    _function(
        RequestKind.greeting,
        "Un saludo, o la pregunta de qué puede hacer el chat.",
    ),
]


# Cuántas preguntas anteriores ve el modelo: un seguimiento mira a la última, y
# más turnos alargan el prompt (y el tiempo de cada respuesta).
MAX_TURNS = 3


class OllamaAgent:
    """El chat con el modelo de lenguaje del Servidor PC2 (Ollama, API compatible
    con OpenAI). El modelo solo entiende: convierte la pregunta en pedidos, en una
    sola llamada, y la respuesta la arman las plantillas con datos de DataIQ
    (decidido por Mauricio el 2026-11-03, README de SIMIQ3D, «Chat»). El texto del
    modelo nunca llega al estudiante.

    Si el Servidor PC2 está lento u ocupado, o si el modelo no pide nada que se
    entienda, responden las plantillas con sus reglas fijas. Si está apagado, el
    chat queda no disponible (ModelUnavailable)."""

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 60,
        deadline: float = 30,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/v1/chat/completions"
        # Tiempo máximo de una pregunta: pasado ese tiempo responden las
        # plantillas, para que el estudiante no espere minutos.
        self._wait = min(timeout, deadline)
        self._model = model
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._transport = transport
        self._fallback = TemplateChat()
        self.name = model

    async def reply(
        self,
        question: str,
        catalog: Catalog,
        open_technique_id: UUID | None,
        previous: tuple[Turn, ...] = (),
    ) -> Reply:
        open_technique = technique_by_id(catalog, open_technique_id)
        messages = [
            {"role": "system", "content": _system(catalog, open_technique)},
            *_turns(previous[-MAX_TURNS:]),
            {"role": "user", "content": question},
        ]
        try:
            message = await self._ask(messages)
        except _Busy:
            return await self._fall_back(question, catalog, open_technique_id)
        requests = [
            r
            for r in (_request(call) for call in message.get("tool_calls") or [])
            if r is not None
        ]
        # Lo que pide el modelo se revisa contra las palabras del estudiante:
        # una técnica que nadie nombró no cuenta (as_said).
        requests = as_said(requests, question, catalog, open_technique_id, previous)
        if not requests or contradicted(requests, question, catalog):
            # Respondió con texto, con funciones que no existen, o dijo que la
            # pregunta no trata de estas técnicas cuando nombra una: responden
            # las reglas fijas. Sin la pregunta en el log (docs/privacidad.md).
            logger.warning("El modelo no pidió nada que se pueda responder")
            return await self._fall_back(question, catalog, open_technique_id)
        requests = with_known_limits(requests, question)
        reply = respond(requests, catalog, open_technique_id, question)
        return replace(reply, answered_by=self.name, requests=tuple(requests))

    async def _ask(self, messages: list[dict]) -> dict:
        body = {
            "model": self._model,
            "temperature": 0,
            "messages": messages,
            "tools": TOOLS,
        }
        try:
            async with httpx.AsyncClient(transport=self._transport) as client:
                response = await client.post(
                    self._url, json=body, headers=self._headers, timeout=self._wait
                )
        except httpx.TimeoutException as error:
            raise _Busy() from error
        except httpx.HTTPError as error:
            # Apagado o inalcanzable: el chat queda no disponible (503).
            raise ModelUnavailable(str(error)) from error
        if response.status_code == 429:
            raise _Busy()  # el filtro del Servidor PC2 está lleno
        try:
            response.raise_for_status()
            return response.json()["choices"][0]["message"]
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
            raise ModelUnavailable(str(error)) from error

    async def _fall_back(self, question, catalog, open_technique_id) -> Reply:
        reply = await self._fallback.reply(question, catalog, open_technique_id)
        return replace(
            reply, answered_by=f"{self._fallback.name} (respaldo de {self.name})"
        )


def _system(catalog: Catalog, open_technique: Technique | None) -> str:
    return SYSTEM.format(
        techniques=", ".join(t.name for t in in_scope(catalog)),
        open_technique=(
            f"Técnica abierta en el visor: {open_technique.name}."
            if open_technique
            # «ninguna» lo tomaba como el nombre de una técnica.
            else "No hay técnica abierta en el visor."
        ),
    )


def _turns(previous: tuple[Turn, ...]) -> list[dict]:
    """Las preguntas anteriores como turnos de la conversación, cada una con sus
    pedidos como llamadas: con un resumen, el modelo se quedaba con la técnica
    abierta en vez de lo que se preguntó antes (2026-11-03)."""
    messages: list[dict] = []
    for n, turn in enumerate(previous):
        calls = [
            {
                "id": f"turno-{n}-{i}",
                "type": "function",
                "function": {
                    "name": r.kind.value,
                    "arguments": json.dumps(_arguments(r), ensure_ascii=False),
                },
            }
            for i, r in enumerate(turn.requests)
        ]
        messages.append({"role": "user", "content": turn.question})
        if not calls:
            messages.append({"role": "assistant", "content": "Respondido."})
            continue
        messages.append({"role": "assistant", "content": "", "tool_calls": calls})
        messages += [
            {"role": "tool", "tool_call_id": c["id"], "content": "Respondido."}
            for c in calls
        ]
    return messages


def _arguments(request: Request) -> dict:
    values = {
        "technique": request.technique,
        "instrument": request.instrument,
        "field": request.field,
        "other_technique": request.other_technique,
        "comparison": request.comparison,
        "topic": request.topic,
    }
    return {k: str(v) for k, v in values.items() if v is not None}


def _read_call(call: dict) -> tuple[str, dict]:
    """Nombre y argumentos de una llamada. Los modelos pequeños a veces mandan
    los argumentos como texto o mal formados: se leen como se puede."""
    function = call.get("function") or {}
    args = function.get("arguments") or {}
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except ValueError:
            args = {}
    return str(function.get("name", "")), args if isinstance(args, dict) else {}


def _request(call: dict) -> Request | None:
    """El pedido de una llamada, o None si la función no existe. Un argumento
    que no es de los valores posibles se toma como no dicho."""
    name, args = _read_call(call)
    try:
        kind = RequestKind(name)
    except ValueError:
        return None

    def text(key: str) -> str | None:
        value = args.get(key)
        return value.strip() or None if isinstance(value, str) else None

    def one_of[E: StrEnum](values: type[E], key: str) -> E | None:
        try:
            return values(args.get(key))
        except ValueError:
            return None

    return Request(
        kind,
        technique=text("technique"),
        instrument=text("instrument"),
        field=one_of(ClinicalField, "field"),
        other_technique=text("other_technique"),
        comparison=one_of(Comparison, "comparison"),
        topic=one_of(Topic, "topic"),
    )
