import json

import httpx

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
Usa solo los nombres de las listas. Si la pregunta no nombra la técnica, no la \
inventes: deja technique vacío. /no_think"""


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
        return _parse(data, vocabulary)


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


def _parse(data: dict, vocabulary: Vocabulary) -> Choice:
    """Lee la llamada a la herramienta. Lo que no está en las listas se descarta."""
    try:
        call = data["choices"][0]["message"]["tool_calls"][0]["function"]
        args = call["arguments"]
        args = json.loads(args) if isinstance(args, str) else args
        action = ChatAction(args["action"])
    except KeyError, IndexError, TypeError, ValueError:
        return Choice(ChatAction.no_answer)
    names = {
        n for name, aliases in vocabulary.instruments.items() for n in (name, *aliases)
    }
    technique = args.get("technique")
    instrument = args.get("instrument")
    field = args.get("field")
    return Choice(
        action,
        technique=technique if technique in vocabulary.techniques else None,
        instrument=instrument if instrument in names else None,
        field=ClinicalField(field) if field in set(ClinicalField) else None,
    )
