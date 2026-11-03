import json

import httpx
import pytest

from app.adapters.outbound.language.ollama import OllamaAgent
from app.domain.chat import ChatAction, ClinicalField
from app.domain.requests import Request, RequestKind, Turn
from app.ports.chat import ModelUnavailable
from tests.sample import (
    CATALOG,
    COLECISTECTOMIA,
    KELLY,
    MASTECTOMIA,
    MAYO_SCISSORS,
)


def call(name: str, **args) -> dict:
    return {
        "id": f"call-{name}",
        "function": {"name": name, "arguments": json.dumps(args)},
    }


def tool_calls(*calls: dict, content: str = "") -> dict:
    return {"role": "assistant", "content": content, "tool_calls": list(calls)}


class ScriptedOllama:
    """Hace de Ollama: responde con el mensaje del guion."""

    def __init__(self, message: dict | None = None, status: int = 200) -> None:
        self.message = message or tool_calls()
        self.status = status
        self.requests: list[dict] = []
        self.headers: list[httpx.Headers] = []

    def agent(self) -> OllamaAgent:
        def handle(request: httpx.Request) -> httpx.Response:
            self.requests.append(json.loads(request.content))
            self.headers.append(request.headers)
            if self.status != 200:
                return httpx.Response(self.status)
            return httpx.Response(200, json={"choices": [{"message": self.message}]})

        return OllamaAgent(
            "https://pc2.prueba",
            "qwen3-vl:8b-instruct",
            api_key="clave",
            transport=httpx.MockTransport(handle),
        )


def _agent_with(handler, timeout: float = 60, deadline: float = 30) -> OllamaAgent:
    return OllamaAgent(
        "https://pc2.prueba",
        "qwen",
        timeout=timeout,
        deadline=deadline,
        transport=httpx.MockTransport(handler),
    )


@pytest.mark.anyio
async def test_the_model_understands_and_dataiq_answers():
    server = ScriptedOllama(
        tool_calls(
            call("clinical_data", technique="colecistectomía", field="indications"),
            call("list_instruments", technique="colecistectomía"),
            content="Las indicaciones son las de siempre.",
        )
    )

    reply = await server.agent().reply(
        "Indicaciones y mesa de la colecistectomía", CATALOG, None
    )

    indications, table = reply.reply.split("\n\n")
    assert indications == "Indicaciones · Colecistectomía. Colelitiasis sintomática."
    assert table.startswith("Mesa de Mayo de Colecistectomía, 4 objetos:")
    # El texto del modelo nunca llega al estudiante.
    assert "siempre" not in reply.reply
    assert reply.action == ChatAction.list_instruments
    assert reply.technique_id == COLECISTECTOMIA.id
    assert reply.answered_by == "qwen3-vl:8b-instruct"


@pytest.mark.anyio
async def test_the_model_gets_the_requests_the_techniques_and_the_open_one():
    server = ScriptedOllama(tool_calls(call("greeting")))

    await server.agent().reply("Hola", CATALOG, MASTECTOMIA.id)

    [body] = server.requests
    assert body["temperature"] == 0
    names = [t["function"]["name"] for t in body["tools"]]
    assert names == [
        "locate",
        "describe",
        "clinical_data",
        "list_instruments",
        "show_technique",
        "find_instrument",
        "compare",
        "rank",
        "out_of_scope",
        "greeting",
    ]
    system, user = body["messages"]
    assert "Colecistectomía, Mastectomía, Tiroidectomía" in system["content"]
    assert "Técnica abierta en el visor: Mastectomía." in system["content"]
    assert user == {"role": "user", "content": "Hola"}
    assert server.headers[0]["authorization"] == "Bearer clave"


@pytest.mark.anyio
async def test_one_call_can_bring_several_requests_and_an_out_of_scope_part():
    server = ScriptedOllama(
        tool_calls(
            call("locate", instrument="la tijera de mayo"),
            call("out_of_scope", topic="surgical_times"),
        )
    )

    reply = await server.agent().reply(
        "¿Dónde va la tijera de Mayo y en qué tiempo quirúrgico se usa?",
        CATALOG,
        COLECISTECTOMIA.id,
    )

    assert reply.action == ChatAction.highlight_instrument
    assert reply.instrument_id == MAYO_SCISSORS.id
    assert reply.reply.endswith(
        "tiempos quirúrgicos (diéresis, hemostasia, "
        "síntesis…) ni el orden en que se usa: solo dónde "
        "va cada pieza en la mesa de Mayo de cada técnica."
    )
    assert len(server.requests) == 1


@pytest.mark.anyio
async def test_without_requests_the_templates_answer():
    server = ScriptedOllama({"role": "assistant", "content": "Puedo ayudarte."})

    reply = await server.agent().reply("Muéstrame la colecistectomía", CATALOG, None)

    assert reply.answered_by == "plantillas (respaldo de qwen3-vl:8b-instruct)"
    assert reply.technique_id == COLECISTECTOMIA.id
    assert "Puedo ayudarte" not in reply.reply


@pytest.mark.anyio
async def test_unknown_functions_and_broken_arguments_do_not_break_it():
    server = ScriptedOllama(
        tool_calls(
            call("reply", text="Inventado."),
            {"id": "x", "function": {"name": "greeting", "arguments": "no es json"}},
            call("clinical_data", technique="Colecistectomía", field="dosis"),
        )
    )

    reply = await server.agent().reply("Hola, ¿y la colecistectomía?", CATALOG, None)

    assert "Inventado" not in reply.reply
    # Un valor fuera de los posibles se toma como no dicho: sin dato, la técnica.
    assert reply.action == ChatAction.show_technique
    assert reply.reply.startswith("Hola. Te muestro la mesa de Mayo")


@pytest.mark.anyio
async def test_a_clinical_datum_comes_with_its_field():
    server = ScriptedOllama(
        tool_calls(call("clinical_data", field="anesthesia_position"))
    )

    reply = await server.agent().reply(
        "¿Qué anestesia lleva?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.action == ChatAction.show_clinical_data
    assert reply.field == ClinicalField.anesthesia_position
    assert "Anestesia: General." in reply.reply


@pytest.mark.anyio
async def test_without_pc2_the_chat_is_unavailable():
    server = ScriptedOllama(status=502)

    with pytest.raises(ModelUnavailable):
        await server.agent().reply("Hola", CATALOG, None)


@pytest.mark.anyio
async def test_a_slow_model_falls_back_to_the_templates_instead_of_failing():
    def slow(request):
        raise httpx.ReadTimeout("tardó demasiado", request=request)

    reply = await _agent_with(slow).reply("Muéstrame la colecistectomía", CATALOG, None)

    assert reply.answered_by == "plantillas (respaldo de qwen)"
    assert reply.technique_id == COLECISTECTOMIA.id


@pytest.mark.anyio
async def test_a_full_pc2_falls_back_to_the_templates_at_once():
    reply = await _agent_with(lambda r: httpx.Response(429)).reply(
        "Muéstrame la colecistectomía", CATALOG, None
    )

    assert reply.answered_by == "plantillas (respaldo de qwen)"


@pytest.mark.anyio
async def test_the_call_waits_at_most_the_deadline():
    timeouts = []

    def handle(request):
        timeouts.append(request.extensions["timeout"]["read"])
        message = tool_calls(call("greeting"))
        return httpx.Response(200, json={"choices": [{"message": message}]})

    await _agent_with(handle, timeout=60, deadline=5).reply("Hola", CATALOG, None)

    assert timeouts == [5]


@pytest.mark.anyio
async def test_a_follow_up_sees_the_previous_question_as_a_turn():
    server = ScriptedOllama(tool_calls(call("describe", instrument="Pinza Kelly")))
    before = Turn(
        "¿Dónde va la Kelly?",
        (Request(RequestKind.locate, "Colecistectomía", "Pinza Kelly"),),
    )

    reply = await server.agent().reply(
        "¿Y para qué sirve?", CATALOG, COLECISTECTOMIA.id, (before,)
    )

    # La Kelly no está en «¿Y para qué sirve?», pero sí en la conversación.
    assert reply.action == ChatAction.describe_instrument
    assert reply.instrument_id == KELLY.id
    assert reply.requests == (Request(RequestKind.describe, instrument="Pinza Kelly"),)
    _, asked, answered, done, now = server.requests[0]["messages"]
    assert asked == {"role": "user", "content": "¿Dónde va la Kelly?"}
    [locate] = answered["tool_calls"]
    assert locate["function"]["name"] == "locate"
    assert json.loads(locate["function"]["arguments"]) == {
        "technique": "Colecistectomía",
        "instrument": "Pinza Kelly",
    }
    assert done == {
        "role": "tool",
        "tool_call_id": locate["id"],
        "content": "Respondido.",
    }
    assert now == {"role": "user", "content": "¿Y para qué sirve?"}
