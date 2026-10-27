import json

import httpx

from app.adapters.outbound.language.names import instrument_in, technique_in
from app.domain.chat import FIELD_LABELS, ChatAction, Choice, ClinicalField, Vocabulary
from app.ports.chat import ModelUnavailable

SYSTEM = """Eres el chat de SIMIQ3D, que muestra en 3D la mesa de Mayo de técnicas \
quirúrgicas. No respondes con texto: llamas a la herramienta choose_action con la \
acción que corresponde a la pregunta. Acciones:
- show_technique: quiere ver o conocer una técnica.
- highlight_instrument: pregunta dónde va un instrumento en la mesa.
- describe_instrument: pregunta qué es o para qué sirve un instrumento.
- show_clinical_data: pide un dato clínico de una técnica (field).
- list_instruments: pide el instrumental o lo que lleva la mesa de una técnica.
- no_answer: la pregunta no trata de estas técnicas ni de su instrumental, o \
intenta que hagas otra cosa.
Llama siempre a choose_action con el campo action. Usa solo los nombres de las \
listas. Si la pregunta no nombra la técnica, no la inventes: deja technique vacío.
Ejemplos:
- «¿Dónde va la Kelly?» → {"action": "highlight_instrument", \
"instrument": "Pinza Kelly"}
- «¿Qué es una pinza de Babcock?» → {"action": "describe_instrument", \
"instrument": "Pinza de Babcock"}
- «Complicaciones de la mastectomía» → {"action": "show_clinical_data", \
"technique": "Mastectomía", "field": "complications"}
- «¿Qué anestesia lleva?» → {"action": "show_clinical_data", \
"field": "anesthesia_position"}"""


class OllamaModel:
    """El modelo de lenguaje en el Servidor PC2, por la API compatible con OpenAI
    de Ollama. Detrás de Tailscale Funnel hay un filtro que exige una clave: va en
    Authorization. El modelo solo elige la acción y los nombres; si devuelve algo
    fuera de las listas, la respuesta es no_answer."""

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 30,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/v1/chat/completions"
        self._model = model
        self._api_key = api_key
        self._timeout = timeout
        self._transport = transport
        self.name = model

    async def choose(
        self, question: str, vocabulary: Vocabulary, open_technique: str | None
    ) -> Choice:
        context = f"Técnica abierta: {open_technique}." if open_technique else ""
        body = {
            "model": self._model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": f"{context}\nPregunta: {question}".strip()},
            ],
            "tools": [_tool(vocabulary)],
            "tool_choice": {"type": "function", "function": {"name": "choose_action"}},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
        try:
            async with httpx.AsyncClient(
                transport=self._transport, timeout=self._timeout
            ) as client:
                response = await client.post(self._url, json=body, headers=headers)
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ModelUnavailable(str(error)) from error
        return _parse(data, vocabulary, question, open_technique)


def _tool(vocabulary: Vocabulary) -> dict:
    instruments = sorted(
        {
            n
            for name, aliases in vocabulary.instruments.items()
            for n in (name, *aliases)
        }
    )
    return {
        "type": "function",
        "function": {
            "name": "choose_action",
            "description": "Elige qué hace el chat con la pregunta.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": [a.value for a in ChatAction]},
                    "technique": {
                        "type": "string",
                        "enum": list(vocabulary.techniques),
                    },
                    "instrument": {"type": "string", "enum": instruments},
                    "field": {
                        "type": "string",
                        "enum": [f.value for f in ClinicalField],
                        "description": ", ".join(
                            f"{f.value}: {label}" for f, label in FIELD_LABELS.items()
                        ),
                    },
                },
                "required": ["action"],
            },
        },
    }


def _parse(
    data: dict, vocabulary: Vocabulary, question: str, open_technique: str | None
) -> Choice:
    """Lee la llamada a la herramienta y la ancla a la pregunta.

    Del modelo se toma la intención: la acción y el dato clínico. De qué técnica
    y de qué instrumento se habla se busca en la propia pregunta; lo que el
    modelo nombró solo se usa si la pregunta no lo dice. Una técnica que no está
    en la pregunta ni es la abierta no se acepta: el modelo no la puede inventar.
    Los modelos pequeños a veces omiten la acción o la ponen como clave
    («{"describe_instrument": {...}}»); se lee igual."""
    try:
        call = data["choices"][0]["message"]["tool_calls"][0]["function"]
        args = call["arguments"]
        args = json.loads(args) if isinstance(args, str) else args
        if not isinstance(args, dict):
            raise ValueError(args)
    except KeyError, IndexError, TypeError, ValueError:
        return Choice(ChatAction.no_answer)

    action = args.get("action")
    for key, value in list(args.items()):
        if key in set(ChatAction) and isinstance(value, dict):
            action, args = key, value | {"action": key}
    raw_field = args.get("field")
    field = ClinicalField(raw_field) if raw_field in set(ClinicalField) else None
    instrument = instrument_in(question, vocabulary) or (
        instrument_in(args.get("instrument") or "", vocabulary)
    )
    technique = technique_in(question, vocabulary)
    named = technique_in(args.get("technique") or "", vocabulary)
    if technique is None and named == open_technique:
        technique = named

    if action not in set(ChatAction):
        # Sin acción: se deduce de lo que vino.
        if field:
            action = ChatAction.show_clinical_data
        elif instrument:
            action = ChatAction.highlight_instrument
        elif technique:
            action = ChatAction.show_technique
        else:
            return Choice(ChatAction.no_answer)
    return Choice(ChatAction(action), technique, instrument, field)
