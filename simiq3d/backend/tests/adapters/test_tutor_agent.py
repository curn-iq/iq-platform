import json
import logging

import httpx
import pytest

from app.adapters.outbound.language.tutor import TutorAgent
from app.domain.chat import ChatAction
from app.domain.requests import Turn
from app.domain.review import NO_TIMES
from tests.sample import CATALOG, COLECISTECTOMIA, KELLY


class ScriptedTutor:
    """Hace de Ollama: responde cada llamada con el texto siguiente de `texts`."""

    def __init__(self, *texts: str, status: int = 200, fail: bool = False) -> None:
        self.texts = list(texts)
        self.status = status
        self.fail = fail
        self.bodies: list[dict] = []

    def agent(self) -> TutorAgent:
        def handle(request: httpx.Request) -> httpx.Response:
            if self.fail:
                raise httpx.ConnectError("apagado")
            self.bodies.append(json.loads(request.content))
            if self.status != 200:
                return httpx.Response(self.status)
            text = self.texts.pop(0) if self.texts else ""
            message = {"role": "assistant", "content": text}
            return httpx.Response(200, json={"choices": [{"message": message}]})

        return TutorAgent(
            "https://pc2.prueba",
            "qwen3-vl:8b-instruct",
            "clave",
            transport=httpx.MockTransport(handle),
        )


@pytest.mark.anyio
async def test_the_model_writes_and_the_viewer_is_decided_by_the_code():
    ollama = ScriptedTutor("La **Pinza Kelly** es hemostática y va en el centro.")

    reply = await ollama.agent().reply(
        "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.reply == "La **Pinza Kelly** es hemostática y va en el centro."
    assert (reply.action, reply.technique_id, reply.instrument_id) == (
        ChatAction.highlight_instrument,
        COLECISTECTOMIA.id,
        KELLY.id,
    )
    assert reply.generated and reply.repairs == ()
    assert "Instrumento: Pinza Kelly" in reply.sources
    [body] = ollama.bodies
    assert body["temperature"] == 0.3
    assert "tools" not in body


@pytest.mark.anyio
async def test_a_misspelled_name_is_understood_without_asking():
    ollama = ScriptedTutor("Es hemostática.")

    reply = await ollama.agent().reply("¿Qué es la kely?", CATALOG, None)

    assert reply.instrument_id == KELLY.id
    assert ollama.bodies[0]["messages"][-1]["content"].endswith("¿Qué es la Kelly?")


@pytest.mark.anyio
async def test_the_previous_replies_go_as_the_conversation():
    ollama = ScriptedTutor("Se usa para pinzar vasos.")
    previous = (Turn("¿Qué es la Kelly?", reply="Es una pinza hemostática."),)

    await ollama.agent().reply("¿Y cuándo se usa?", CATALOG, None, previous)

    sent = ollama.bodies[0]["messages"]
    assert sent[1:3] == [
        {"role": "user", "content": "¿Qué es la Kelly?"},
        {"role": "assistant", "content": "Es una pinza hemostática."},
    ]
    assert "Instrumento: Pinza Kelly" in sent[-1]["content"]


@pytest.mark.anyio
async def test_a_sentence_over_a_limit_is_replaced_and_logged(caplog, monkeypatch):
    # La configuración de logging de Alembic (al migrar la base de pruebas)
    # apaga los loggers que ya existen.
    logger = logging.getLogger("app.adapters.outbound.language.tutor")
    monkeypatch.setattr(logger, "disabled", False)
    caplog.set_level(logging.WARNING, logger=logger.name)
    ollama = ScriptedTutor(
        "La Kelly es hemostática. Se pinza un vaso con ella. Bien. "
        "La Kelly se usa primero."
    )

    reply = await ollama.agent().reply("¿Qué es la Kelly?", CATALOG, COLECISTECTOMIA.id)

    assert reply.reply.endswith(NO_TIMES)
    assert reply.repairs
    assert "El tutor cambió 1 de 4 frases" in caplog.text
    assert "hemostática" not in caplog.text  # sin el texto en el log


@pytest.mark.anyio
async def test_mostly_wrong_gets_a_second_chance_with_what_was_wrong():
    ollama = ScriptedTutor(
        "La Kelly se usa primero. Después se usa la Allis.",
        "La Kelly es hemostática.",
    )

    reply = await ollama.agent().reply("¿Qué es la Kelly?", CATALOG, COLECISTECTOMIA.id)

    assert reply.reply == "La Kelly es hemostática."
    assert "segunda oportunidad" in reply.answered_by
    retry = ollama.bodies[1]["messages"]
    assert retry[-2]["role"] == "assistant"
    assert "orden de uso" in retry[-1]["content"]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "ollama", [ScriptedTutor(status=429), ScriptedTutor(fail=True)]
)
async def test_without_the_model_it_says_so_and_shows_dataiq(ollama):
    reply = await ollama.agent().reply(
        "¿Para qué sirve la Tijera de Mayo?", CATALOG, None
    )

    assert reply.reply.startswith("El modelo de IA no está disponible ahora.")
    assert "Tijera recta para cortar tejidos." in reply.reply
    assert not reply.generated
    assert reply.action == ChatAction.describe_instrument
