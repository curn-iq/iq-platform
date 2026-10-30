from app.domain.chat import ChatAction
from app.domain.guards import before_the_model
from tests.sample import CATALOG, COLECISTECTOMIA


def test_a_technique_of_another_specialty_is_answered_without_the_model():
    reply = before_the_model("¿Dónde va la Kelly en la cesárea?", CATALOG, None)

    assert reply.action == ChatAction.no_answer
    assert reply.reply.startswith("Cesárea es una técnica de Ginecología.")


def test_a_family_name_with_several_options_in_the_table_asks_which():
    reply = before_the_model("¿Dónde va la pinza en la colecistectomía?", CATALOG, None)

    assert reply.action == ChatAction.clarify
    assert reply.technique_id == COLECISTECTOMIA.id
    assert reply.options == (
        "¿Dónde va la Pinza de Allis en Colecistectomía?",
        "¿Dónde va la Pinza Kelly en Colecistectomía?",
    )


def test_a_family_name_with_one_option_or_a_full_name_goes_to_the_model():
    # La colecistectomía de muestra lleva una sola tijera.
    assert before_the_model("¿Dónde va la tijera?", CATALOG, COLECISTECTOMIA.id) is None
    assert before_the_model("¿Dónde va la pinza Kelly?", CATALOG, None) is None
    assert before_the_model("¿Qué pinzas lleva?", CATALOG, COLECISTECTOMIA.id) is None


def test_the_instrumental_of_one_technique_is_listed_complete():
    reply = before_the_model("¿Qué lleva esta mesa?", CATALOG, COLECISTECTOMIA.id)

    assert reply.action == ChatAction.list_instruments
    assert reply.reply.startswith("Mesa de Mayo de Colecistectomía, 4 objetos:")


def test_comparing_or_counting_is_not_listing():
    for question in (
        "¿Qué lleva la mastectomía que no lleve la colecistectomía?",
        "¿Cuántos instrumentos lleva la colecistectomía?",
    ):
        assert before_the_model(question, CATALOG, None) is None
