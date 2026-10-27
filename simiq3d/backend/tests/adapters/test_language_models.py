import json

import httpx
import pytest

from app.adapters.outbound.language.fake import FakeModel
from app.adapters.outbound.language.ollama import OllamaModel
from app.domain.chat import ChatAction, Choice, ClinicalField, Vocabulary, answer
from app.ports.chat import ModelUnavailable
from tests.sample import CATALOG, COLECISTECTOMIA

VOCABULARY = Vocabulary.from_catalog(CATALOG)


async def fake(question: str, open_technique: str | None = None) -> Choice:
    return await FakeModel().choose(question, VOCABULARY, open_technique)


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("question", "open_technique", "expected"),
    [
        (
            "Muéstrame la mesa de colecistectomía",
            None,
            Choice(ChatAction.show_technique, "Colecistectomía"),
        ),
        (
            "¿Dónde va la Kelly?",
            None,
            Choice(ChatAction.highlight_instrument, instrument="Pinza Kelly"),
        ),
        (
            "¿dónde va la kelly adson?",
            None,
            Choice(ChatAction.highlight_instrument, instrument="Pinza Kelly Adson"),
        ),
        (
            "¿Qué es una pinza de Kelly?",
            None,
            Choice(ChatAction.describe_instrument, instrument="Pinza Kelly"),
        ),
        (
            "Indicaciones",
            "Colecistectomía",
            Choice(ChatAction.show_clinical_data, field=ClinicalField.indications),
        ),
        (
            "¿Qué lleva la mesa de Mayo?",
            "Mastectomía",
            Choice(ChatAction.list_instruments),
        ),
        (
            "Complicaciones de la tiroidectomía",
            None,
            Choice(
                ChatAction.show_clinical_data,
                "Tiroidectomía",
                field=ClinicalField.complications,
            ),
        ),
        ("¿Cuál es la capital de Francia?", None, Choice(ChatAction.no_answer)),
    ],
)
async def test_the_fake_model_understands_the_usual_questions(
    question, open_technique, expected
):
    assert await fake(question, open_technique) == expected


@pytest.mark.anyio
async def test_every_option_the_chat_offers_is_understood():
    # Las opciones son preguntas que el frontend manda tal cual: el modelo de
    # prueba tiene que entenderlas todas, con la técnica abierta de la respuesta.
    replies = [
        answer(Choice(ChatAction.show_technique, "Colecistectomía"), CATALOG, None),
        answer(
            Choice(ChatAction.highlight_instrument, instrument="Allis"), CATALOG, None
        ),
        answer(
            Choice(ChatAction.highlight_instrument, "Colecistectomía", "Pinza Kelly"),
            CATALOG,
            None,
        ),
        answer(
            Choice(ChatAction.show_clinical_data, field=ClinicalField.indications),
            CATALOG,
            None,
        ),
        answer(Choice(ChatAction.no_answer), CATALOG, None),
    ]
    for reply in replies:
        open_name = next(
            (t.name for t in CATALOG.techniques if t.id == reply.technique_id), None
        )
        for option in reply.options:
            choice = await fake(option, open_name)
            assert choice.action != ChatAction.no_answer, option


def ollama_reply(arguments: dict | str) -> dict:
    if isinstance(arguments, dict):
        arguments = json.dumps(arguments)
    return {
        "choices": [
            {
                "message": {
                    "tool_calls": [
                        {"function": {"name": "choose_action", "arguments": arguments}}
                    ]
                }
            }
        ]
    }


class FakeOllama:
    def __init__(self, body: dict | None = None, status: int = 200) -> None:
        self.body, self.status = body, status
        self.requests: list[httpx.Request] = []

    def model(self, **options) -> OllamaModel:
        def handle(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            return httpx.Response(self.status, json=self.body or {})

        return OllamaModel(
            "https://pc2.prueba",
            "qwen3:8b",
            transport=httpx.MockTransport(handle),
            **options,
        )


@pytest.mark.anyio
async def test_ollama_gets_the_names_as_closed_lists_and_the_open_technique():
    server = FakeOllama(
        ollama_reply({"action": "show_technique", "technique": "Colecistectomía"})
    )

    choice = await server.model(api_key="clave").choose(
        "¿y esta?", VOCABULARY, "Colecistectomía"
    )

    request = server.requests[0]
    assert request.url == "https://pc2.prueba/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer clave"
    body = json.loads(request.content)
    parameters = body["tools"][0]["function"]["parameters"]["properties"]
    assert parameters["technique"]["enum"] == list(VOCABULARY.techniques)
    assert "Pinzas Kelly" in parameters["instrument"]["enum"]
    assert "Técnica abierta: Colecistectomía." in body["messages"][1]["content"]
    assert choice == Choice(ChatAction.show_technique, "Colecistectomía")


@pytest.mark.anyio
async def test_names_outside_the_lists_are_dropped():
    server = FakeOllama(
        ollama_reply(
            {
                "action": "highlight_instrument",
                "technique": "Cesárea",
                "instrument": "Bisturí láser",
            }
        )
    )

    choice = await server.model().choose("x", VOCABULARY, None)

    assert choice == Choice(ChatAction.highlight_instrument)


@pytest.mark.anyio
@pytest.mark.parametrize(
    "body",
    [
        {"choices": [{"message": {"content": "Hola"}}]},
        ollama_reply({"action": "borrar_todo"}),
        ollama_reply("no es json"),
    ],
    ids=["sin-herramienta", "accion-inventada", "argumentos-rotos"],
)
async def test_anything_but_a_valid_action_is_no_answer(body):
    assert await FakeOllama(body).model().choose("x", VOCABULARY, None) == Choice(
        ChatAction.no_answer
    )


@pytest.mark.anyio
async def test_if_pc2_does_not_answer_the_model_is_unavailable():
    with pytest.raises(ModelUnavailable):
        await FakeOllama(status=502).model().choose("x", VOCABULARY, None)


def test_the_open_technique_name_is_in_the_sample():
    assert COLECISTECTOMIA.name in VOCABULARY.techniques


@pytest.mark.anyio
async def test_ollama_cannot_invent_a_technique_or_lose_the_instrument():
    # Lo que hizo qwen2.5:7b con «¿dónde se pone la pinza de allis?»
    server = FakeOllama(
        ollama_reply({"technique": "Colecistectomía", "action": "highlight_instrument"})
    )

    choice = await server.model().choose(
        "¿dónde se pone la pinza de allis?", VOCABULARY, None
    )

    assert choice == Choice(
        ChatAction.highlight_instrument, instrument="Pinza de Allis"
    )


@pytest.mark.anyio
async def test_the_action_as_a_key_and_a_close_name_are_understood():
    # Lo que hizo con «¿Qué es una pinza Babcock?» (en DataIQ: «Pinza de Babcock»)
    server = FakeOllama(
        ollama_reply({"describe_instrument": {"instrument": "Pinza Kelly"}})
    )

    choice = await server.model().choose("¿Qué es esto?", VOCABULARY, None)

    assert choice == Choice(ChatAction.describe_instrument, instrument="Pinza Kelly")


@pytest.mark.anyio
async def test_a_missing_action_is_deduced_from_the_field():
    # Lo que hizo con «¿Qué anestesia lleva la tiroidectomía?»
    server = FakeOllama(
        ollama_reply({"technique": "Tiroidectomía", "field": "anesthesia_position"})
    )

    choice = await server.model().choose(
        "¿Qué anestesia lleva la tiroidectomía?", VOCABULARY, None
    )

    assert choice == Choice(
        ChatAction.show_clinical_data,
        "Tiroidectomía",
        field=ClinicalField.anesthesia_position,
    )


@pytest.mark.anyio
async def test_the_open_technique_is_accepted_when_the_model_names_it():
    server = FakeOllama(
        ollama_reply({"action": "list_instruments", "technique": "Mastectomía"})
    )

    choice = await server.model().choose("¿Qué lleva?", VOCABULARY, "Mastectomía")

    assert choice == Choice(ChatAction.list_instruments, "Mastectomía")
