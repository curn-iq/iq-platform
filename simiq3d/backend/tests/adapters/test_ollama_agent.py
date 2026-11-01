import json

import httpx
import pytest

from app.adapters.outbound.language.ollama import OllamaAgent
from app.domain.chat import ChatAction
from app.ports.chat import ModelUnavailable
from tests.sample import (
    ALLIS,
    CATALOG,
    COLECISTECTOMIA,
    KELLY,
    LAHEY,
    MASTECTOMIA,
    TIROIDECTOMIA,
)


def call(name: str, **args) -> dict:
    return {
        "id": f"call-{name}",
        "function": {"name": name, "arguments": json.dumps(args)},
    }


def tool_calls(*calls: dict) -> dict:
    return {"role": "assistant", "content": "", "tool_calls": list(calls)}


class ScriptedOllama:
    """Hace de Ollama: responde, paso a paso, los mensajes del guion."""

    def __init__(self, *steps: dict, status: int = 200) -> None:
        self.steps = list(steps)
        self.status = status
        self.requests: list[dict] = []

    def agent(self) -> OllamaAgent:
        def handle(request: httpx.Request) -> httpx.Response:
            self.requests.append(json.loads(request.content))
            if self.status != 200:
                return httpx.Response(self.status)
            message = (
                self.steps.pop(0) if self.steps else tool_calls(call("list_techniques"))
            )
            return httpx.Response(200, json={"choices": [{"message": message}]})

        return OllamaAgent(
            "https://pc2.prueba",
            "qwen2.5:7b",
            api_key="clave",
            transport=httpx.MockTransport(handle),
        )


@pytest.mark.anyio
async def test_the_agent_consults_the_catalog_and_writes_the_answer():
    # «¿En cuántas técnicas se usa la Allis?»: ninguna plantilla lo responde.
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Pinza de Allis")),
        tool_calls(
            call(
                "reply",
                text="La Allis se usa en 2 técnicas: Colecistectomía y Mastectomía.",
                suggestions=["¿Dónde va en Colecistectomía?"],
            )
        ),
    )

    reply = await server.agent().reply(
        "¿En cuántas técnicas se usa la pinza de Allis?", CATALOG, None
    )

    assert reply.action == ChatAction.answer
    assert (
        reply.reply == "La Allis se usa en 2 técnicas: Colecistectomía y Mastectomía."
    )
    # Las opciones las arma el backend con lo que se consultó: siempre se
    # pueden responder.
    assert reply.options == (
        "¿Qué es la Pinza de Allis?",
        "¿Dónde va la Pinza de Allis en Colecistectomía?",
        "¿Dónde va la Pinza de Allis en Mastectomía?",
    )
    assert reply.answered_by == "qwen2.5:7b"
    # El segundo paso lleva lo que devolvió la consulta.
    tool_message = server.requests[1]["messages"][-1]
    assert tool_message["role"] == "tool"
    assert json.loads(tool_message["content"])["total_tecnicas"] == 2


@pytest.mark.anyio
async def test_the_scene_comes_from_show_in_3d_with_real_ids():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Kelly")),
        tool_calls(call("show_in_3d", technique="Colecistectomía", instrument="Kelly")),
        tool_calls(
            call(
                "reply",
                text="La Pinza Kelly es el número 10 de la mesa de Colecistectomía.",
            )
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.action == ChatAction.highlight_instrument
    assert (reply.technique_id, reply.instrument_id) == (COLECISTECTOMIA.id, KELLY.id)
    assert (
        "Técnica abierta en el visor: Colecistectomía."
        in server.requests[0]["messages"][1]["content"]
    )


@pytest.mark.anyio
async def test_an_invented_fact_falls_back_to_the_templates():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Allis")),
        tool_calls(
            call(
                "reply",
                text="La Pinza de Allis va en 7 técnicas, como la Pinza de Crile.",
            )
        ),
    )

    reply = await server.agent().reply("¿Dónde va la Allis?", CATALOG, None)

    assert reply.answered_by == "plantillas (respaldo de qwen2.5:7b)"
    assert reply.action == ChatAction.clarify
    assert reply.instrument_id == ALLIS.id


@pytest.mark.anyio
async def test_an_agent_that_never_finishes_falls_back_to_the_templates():
    reply = (
        await ScriptedOllama()
        .agent()
        .reply("Muéstrame la colecistectomía", CATALOG, None)
    )

    assert reply.answered_by == "plantillas (respaldo de qwen2.5:7b)"
    assert reply.technique_id == COLECISTECTOMIA.id


@pytest.mark.anyio
async def test_an_answer_without_consulting_anything_falls_back():
    server = ScriptedOllama(
        {"role": "assistant", "content": "Solo puedo ayudarte con la mesa de Mayo."}
    )

    reply = await server.agent().reply("Escribe un poema", CATALOG, None)

    assert reply.answered_by == "plantillas (respaldo de qwen2.5:7b)"
    assert reply.action == ChatAction.no_answer


@pytest.mark.anyio
async def test_suggestions_written_in_the_text_are_removed():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Kelly")),
        {
            "role": "assistant",
            "content": "La **Pinza Kelly** va en 2 técnicas.\n-reply\n"
            "Sugerencias: ¿Dónde va en Mastectomía? ¿Qué es?",
        },
    )

    reply = await server.agent().reply("¿Dónde va la Kelly?", CATALOG, None)

    assert reply.reply == "La Pinza Kelly va en 2 técnicas."
    assert "¿Qué es?" not in reply.options


@pytest.mark.anyio
async def test_the_filter_key_goes_to_pc2_and_without_pc2_the_chat_is_unavailable():
    server = ScriptedOllama(status=502)

    with pytest.raises(ModelUnavailable):
        await server.agent().reply("Hola", CATALOG, None)


@pytest.mark.anyio
async def test_broken_arguments_do_not_break_the_agent():
    server = ScriptedOllama(
        tool_calls(
            {
                "id": "x",
                "function": {"name": "find_instrument", "arguments": "no es json"},
            }
        ),
        tool_calls(call("reply", text="No encontré ese instrumento.")),
    )

    reply = await server.agent().reply("¿Qué es eso?", CATALOG, None)

    assert reply.reply == "No encontré ese instrumento."
    assert "error" in json.loads(server.requests[1]["messages"][-1]["content"])


@pytest.mark.anyio
async def test_the_open_technique_instrument_is_highlighted_without_show_in_3d():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Kelly")),
        tool_calls(
            call(
                "reply",
                text="La Kelly va en el centro de la mesa. ¿Quieres ver otra técnica?",
            )
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.action == ChatAction.highlight_instrument
    assert (reply.technique_id, reply.instrument_id) == (COLECISTECTOMIA.id, KELLY.id)
    assert reply.reply == "La Kelly va en el centro de la mesa."
    assert reply.options[0] == "¿Qué es la Pinza Kelly?"


@pytest.mark.anyio
async def test_a_single_technique_in_the_answer_sets_the_scene():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Kelly")),
        tool_calls(
            call("reply", text="En Mastectomía la Kelly va en el centro, a la derecha.")
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Kelly en Mastectomía?", CATALOG, None
    )

    assert reply.action == ChatAction.highlight_instrument
    assert (reply.technique_id, reply.instrument_id) == (MASTECTOMIA.id, KELLY.id)


@pytest.mark.anyio
async def test_the_asked_instrument_is_highlighted_not_its_neighbor():
    # La respuesta nombra también al vecino, de nombre más largo.
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Tiroidectomía")),
        tool_calls(
            call("reply", text="La Pinza Lahey va junto a la Pinza Kelly Adson.")
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Lahey en la tiroidectomía?", CATALOG, TIROIDECTOMIA.id
    )

    assert reply.action == ChatAction.highlight_instrument
    assert (reply.technique_id, reply.instrument_id) == (TIROIDECTOMIA.id, LAHEY.id)


@pytest.mark.anyio
async def test_an_asked_instrument_that_is_not_in_the_table_is_not_replaced():
    server = ScriptedOllama(
        tool_calls(
            call("get_technique", technique="Mastectomía"),
            call("find_instrument", instrument="Lahey"),
        ),
        tool_calls(
            call(
                "reply",
                text="La Pinza Lahey no va en Mastectomía; esa mesa lleva la "
                "Pinza Kelly.",
            )
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Lahey en la mastectomía?", CATALOG, MASTECTOMIA.id
    )

    assert reply.action == ChatAction.show_technique
    assert (reply.technique_id, reply.instrument_id) == (MASTECTOMIA.id, None)


@pytest.mark.anyio
async def test_mentioning_the_3d_viewer_does_not_fall_back():
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Colecistectomía")),
        tool_calls(
            call("reply", text="La Colecistectomía ya está abierta en el visor 3D.")
        ),
    )

    reply = await server.agent().reply(
        "Muéstrame la colecistectomía", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.answered_by == "qwen2.5:7b"
    assert reply.technique_id == COLECISTECTOMIA.id


@pytest.mark.anyio
async def test_the_technique_of_the_question_wins_over_the_open_one():
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Mastectomía")),
        tool_calls(call("reply", text="La Pinza Kelly va al centro.")),
    )

    reply = await server.agent().reply(
        "¿Y dónde va la Kelly en la mastectomía?", CATALOG, COLECISTECTOMIA.id
    )

    assert (reply.technique_id, reply.instrument_id) == (MASTECTOMIA.id, KELLY.id)


@pytest.mark.anyio
async def test_the_consulted_technique_is_shown_when_the_answer_does_not_name_it():
    server = ScriptedOllama(
        tool_calls(
            call("get_technique", technique="la cirugía para quitar la vesícula")
        ),
        tool_calls(call("reply", text="Su mesa de Mayo lleva 4 objetos.")),
    )

    reply = await server.agent().reply(
        "Quiero ver la mesa de la cirugía para quitar la vesícula", CATALOG, None
    )

    assert reply.action == ChatAction.show_technique
    assert reply.technique_id == COLECISTECTOMIA.id


@pytest.mark.anyio
async def test_the_rules_before_the_model_answer_without_calling_it():
    server = ScriptedOllama()

    reply = await server.agent().reply(
        "¿Qué lleva la mesa de Mayo de la cesárea?", CATALOG, None
    )

    assert reply.action == ChatAction.no_answer
    assert reply.answered_by == "plantillas"
    assert server.requests == []


@pytest.mark.anyio
async def test_only_the_sentence_that_names_a_tool_is_removed():
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Colecistectomía")),
        tool_calls(
            call(
                "reply",
                text="La Kelly va al centro. Puedes verla con el comando show_in_3d.",
            )
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.reply == "La Kelly va al centro."


@pytest.mark.anyio
async def test_the_model_is_told_which_technique_the_question_describes():
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Colecistectomía")),
        tool_calls(call("reply", text="Su mesa de Mayo lleva 4 objetos.")),
    )

    reply = await server.agent().reply(
        "¿Cómo se ve la mesa para quitar la vesícula?", CATALOG, None
    )

    question = server.requests[0]["messages"][1]["content"]
    assert question.startswith("La pregunta describe la técnica Colecistectomía.")
    assert reply.technique_id == COLECISTECTOMIA.id


@pytest.mark.anyio
async def test_offers_and_quoted_places_are_cleaned():
    server = ScriptedOllama(
        tool_calls(call("get_technique", technique="Colecistectomía")),
        tool_calls(
            call(
                "reply",
                text='La Kelly va en la ubicación "en el centro". '
                "¿Quieres verla en 3D? Puedo resaltarla para ti.",
            )
        ),
    )

    reply = await server.agent().reply(
        "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id
    )

    assert reply.reply == "La Kelly va en el centro."


@pytest.mark.anyio
async def test_asking_what_it_is_always_says_when_there_is_no_description():
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="Kelly")),
        tool_calls(call("reply", text="La Pinza Kelly va en el centro.")),
    )

    reply = await server.agent().reply("¿Qué es la Pinza Kelly?", CATALOG, None)

    assert (
        reply.reply
        == "La Pinza Kelly va en el centro. DataIQ todavía no tiene su descripción."
    )


@pytest.mark.anyio
async def test_the_model_did_you_mean_is_kept_with_the_corrected_question():
    # El caso de la revisión del PR #26: antes el estudiante veía solo
    # «No encontré la Kellyy.», sin opciones.
    server = ScriptedOllama(
        tool_calls(call("find_instrument", instrument="pinza kelyx")),
        tool_calls(
            call(
                "reply",
                text="No encontré la pinza kelyx. "
                "¿Quizás te refieres a la Pinza Kelly?",
            )
        ),
    )

    reply = await server.agent().reply("¿Dónde va la pinza kelyx?", CATALOG, None)

    assert reply.action == ChatAction.clarify
    assert (
        reply.reply
        == "No encontré la pinza kelyx. ¿Quizás te refieres a la Pinza Kelly?"
    )
    assert reply.options[0] == "¿Dónde va la Pinza Kelly?"


def _agent_with(handle, **options) -> OllamaAgent:
    return OllamaAgent(
        "https://pc2.prueba", "qwen", transport=httpx.MockTransport(handle), **options
    )


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
async def test_when_the_time_is_up_the_templates_answer():
    calls = []

    def endless(request):
        calls.append(request)
        return httpx.Response(
            200, json={"choices": [{"message": tool_calls(call("list_techniques"))}]}
        )

    reply = await _agent_with(endless, deadline=0).reply(
        "Muéstrame la colecistectomía", CATALOG, None
    )

    assert reply.answered_by == "plantillas (respaldo de qwen)"
    assert calls == []


@pytest.mark.anyio
async def test_each_call_waits_at_most_what_is_left_of_the_deadline():
    timeouts = []

    def handle(request):
        timeouts.append(request.extensions["timeout"]["read"])
        return httpx.Response(
            200,
            json={"choices": [{"message": tool_calls(call("reply", text="Hola."))}]},
        )

    await _agent_with(handle, timeout=60, deadline=5).reply("Hola", CATALOG, None)

    assert timeouts[0] <= 5
