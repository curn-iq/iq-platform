from app.domain.chat import (
    OUT_OF_SCOPE,
    ChatAction,
    Choice,
    ClinicalField,
    Comparison,
    answer,
)
from app.domain.guards import NO_SURGICAL_TIMES
from app.domain.requests import (
    NO_CLINICAL_DATA,
    Request,
    RequestKind,
    Topic,
    as_said,
    contradicted,
    respond,
    with_known_limits,
)
from tests.sample import (
    ALLIS,
    CATALOG,
    COLECISTECTOMIA,
    MASTECTOMIA,
    MAYO_SCISSORS,
)

INDICATIONS = Request(
    RequestKind.clinical_data, "Colecistectomía", field=ClinicalField.indications
)


def test_one_request_is_answered_like_the_templates():
    reply = respond([INDICATIONS], CATALOG, None)

    choice = Choice(
        ChatAction.show_clinical_data,
        "Colecistectomía",
        field=ClinicalField.indications,
    )
    assert reply == answer(choice, CATALOG, None)


def test_several_requests_are_joined_with_what_is_missing_last():
    requests = [
        Request(RequestKind.out_of_scope, topic=Topic.surgical_times),
        INDICATIONS,
        Request(RequestKind.list_instruments),
    ]

    reply = respond(requests, CATALOG, COLECISTECTOMIA.id)

    indications, table, missing = reply.reply.split("\n\n")
    assert indications.startswith("Indicaciones · Colecistectomía.")
    assert table.startswith("Mesa de Mayo de Colecistectomía, 4 objetos:")
    assert missing == NO_SURGICAL_TIMES
    assert reply.action == ChatAction.list_instruments
    assert reply.technique_id == COLECISTECTOMIA.id


def test_the_scene_is_the_most_visual_request():
    requests = [
        Request(RequestKind.describe, instrument="Tijera de Mayo"),
        Request(RequestKind.locate, "Colecistectomía", "la tijera de mayo"),
    ]

    reply = respond(requests, CATALOG, None)

    assert reply.action == ChatAction.highlight_instrument
    assert reply.instrument_id == MAYO_SCISSORS.id
    assert "Tijera recta para cortar tejidos." in reply.reply


def test_repeated_requests_are_answered_once():
    reply = respond([INDICATIONS, INDICATIONS], CATALOG, None)

    assert reply == respond([INDICATIONS], CATALOG, None)


def test_what_a_technique_is_is_what_it_is_for():
    reply = respond(
        [Request(RequestKind.describe, instrument="colecistectomia")], CATALOG, None
    )

    assert reply.action == ChatAction.show_clinical_data
    assert reply.field == ClinicalField.description
    assert reply.technique_id == COLECISTECTOMIA.id


def test_a_technique_of_another_specialty_is_out_of_scope():
    reply = respond(
        [Request(RequestKind.list_instruments, "la cesárea")], CATALOG, None
    )

    assert reply.action == ChatAction.no_answer
    assert reply.reply == f"Cesárea es una técnica de Ginecología. {OUT_OF_SCOPE}"


def test_nothing_or_only_missing_data_says_what_there_is():
    assert respond([], CATALOG, None).reply == OUT_OF_SCOPE
    missing = Request(RequestKind.out_of_scope, topic=Topic.missing_clinical_data)
    reply = respond([missing], CATALOG, None)
    assert (reply.action, reply.reply) == (ChatAction.no_answer, NO_CLINICAL_DATA)


def test_a_greeting_offers_questions_without_opening_anything():
    reply = respond([Request(RequestKind.greeting)], CATALOG, MASTECTOMIA.id)

    assert reply.action == ChatAction.answer
    assert reply.technique_id is None
    assert reply.options == (
        "¿Qué lleva la mesa de Mastectomía?",
        "¿Dónde va la Pinza de Allis en Mastectomía?",
        "Indicaciones de Mastectomía",
    )


def comparing(what: Comparison) -> str:
    request = Request(
        RequestKind.compare,
        "Colecistectomía",
        other_technique="Mastectomía",
        comparison=what,
    )
    return respond([request], CATALOG, None).reply


def test_a_comparison_says_only_what_is_asked():
    assert comparing(Comparison.shared) == (
        "Las mesas de Mayo de Colecistectomía y Mastectomía comparten 2: "
        "la Pinza Kelly y la Pinza de Allis."
    )
    assert comparing(Comparison.only_first) == (
        "Solo la mesa de Mayo de Colecistectomía, y no la de Mastectomía, lleva 2: "
        "el Separador de Farabeuf y la Tijera de Mayo."
    )
    assert comparing(Comparison.differences) == (
        "Solo en Colecistectomía: el Separador de Farabeuf y la Tijera de Mayo."
    )


def test_where_an_instrument_goes_counts_its_tables():
    reply = respond(
        [Request(RequestKind.find_instrument, instrument="Allis")], CATALOG, None
    )

    assert reply.reply == (
        "La Pinza de Allis va en 2 mesas de Mayo: Colecistectomía y Mastectomía."
    )
    assert reply.instrument_id == ALLIS.id
    assert reply.action == ChatAction.answer


def test_the_techniques_are_ranked_by_objects():
    reply = respond([Request(RequestKind.rank)], CATALOG, None)

    assert reply.reply == (
        "Objetos en la mesa de Mayo, de más a menos: Colecistectomía (4), "
        "Mastectomía (2) y Tiroidectomía (2)."
    )


def test_a_family_name_asks_which_one():
    reply = respond(
        [Request(RequestKind.locate, instrument="pinza")],
        CATALOG,
        COLECISTECTOMIA.id,
        "¿Dónde va la pinza?",
    )

    assert reply.action == ChatAction.clarify
    assert reply.options == (
        "¿Dónde va la Pinza de Allis en Colecistectomía?",
        "¿Dónde va la Pinza Kelly en Colecistectomía?",
    )


def test_a_technique_nobody_named_is_taken_as_not_said():
    invented = Request(RequestKind.locate, "Colecistectomía", "Kelly")

    [kept] = as_said([invented], "¿Dónde va la Kelly?", CATALOG, None)
    assert kept.technique is None
    [opened] = as_said([invented], "¿Dónde va la Kelly?", CATALOG, COLECISTECTOMIA.id)
    assert opened.technique == "Colecistectomía"
    [named] = as_said(
        [invented], "¿Dónde va la Kelly en la colecistectomia?", CATALOG, None
    )
    assert named.technique == "Colecistectomía"


def test_a_described_technique_counts_as_said():
    request = Request(RequestKind.show_technique, "Colecistectomía")
    question = "Muéstrame la cirugía para quitar la vesícula"

    [kept] = as_said([request], question, CATALOG, None)

    assert kept.technique == "Colecistectomía"


def test_saying_it_is_off_topic_when_it_names_a_technique_is_a_mistake():
    off_topic = [Request(RequestKind.out_of_scope, topic=Topic.other)]

    assert contradicted(off_topic, "¿Y la Kelly?", CATALOG)
    assert contradicted(off_topic, "Abre la mastectomía", CATALOG)
    assert not contradicted(off_topic, "Escribe un poema", CATALOG)
    assert not contradicted(off_topic, "¿Qué lleva la cesárea?", CATALOG)
    with_data = [*off_topic, INDICATIONS]
    assert not contradicted(with_data, "¿Y la Kelly?", CATALOG)


def test_asking_for_surgical_times_always_gets_the_note():
    listing = [Request(RequestKind.list_instruments, "Colecistectomía")]
    note = Request(RequestKind.out_of_scope, topic=Topic.surgical_times)

    question = "¿Qué instrumentos de la colecistectomía son de diéresis?"
    assert with_known_limits(listing, question) == [*listing, note]
    assert with_known_limits([note], question) == [note]
    excluded = "Instrumental de la colecistectomía, sin tiempos quirúrgicos"
    assert with_known_limits(listing, excluded) == listing


def test_an_instrument_nobody_named_is_taken_as_not_said():
    invented = Request(RequestKind.locate, instrument="Pinza Kelly")

    [kept] = as_said([invented], "¿Y dónde va?", CATALOG, COLECISTECTOMIA.id)
    assert kept.instrument is None
    [named] = as_said([invented], "¿Dónde va la kelly?", CATALOG, None)
    assert named.instrument == "Pinza Kelly"
    reply = respond([kept], CATALOG, COLECISTECTOMIA.id)
    assert (reply.action, reply.reply) == (ChatAction.clarify, "¿De qué instrumento?")


def test_an_instrument_asked_as_a_technique_is_described():
    request = Request(
        RequestKind.clinical_data, "la tijera de mayo", field=ClinicalField.description
    )

    reply = respond([request], CATALOG, None)

    assert reply.action == ChatAction.describe_instrument
    assert reply.instrument_id == MAYO_SCISSORS.id
