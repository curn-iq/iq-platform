import pytest

from app.adapters.outbound.language.fake import FakeModel
from app.domain.chat import ChatAction, Choice, ClinicalField, Vocabulary, answer
from tests.sample import CATALOG

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
        (
            "¿Para qué se usa la tijera de mayo?",
            None,
            Choice(ChatAction.describe_instrument, instrument="Tijera de Mayo"),
        ),
        (
            "¿Qué riesgos tiene?",
            "Mastectomía",
            Choice(ChatAction.show_clinical_data, field=ClinicalField.complications),
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
