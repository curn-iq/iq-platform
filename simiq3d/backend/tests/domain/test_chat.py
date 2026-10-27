from app.domain.chat import (
    OUT_OF_SCOPE,
    ChatAction,
    Choice,
    ClinicalField,
    Vocabulary,
    answer,
)
from tests.sample import (
    ALLIS,
    CATALOG,
    COLECISTECTOMIA,
    FARABEUF,
    KELLY,
    KOCHER,
    LAHEY,
    MASTECTOMIA,
    TIROIDECTOMIA,
)


def ask(action, technique=None, instrument=None, field=None, open_technique=None):
    return answer(Choice(action, technique, instrument, field), CATALOG, open_technique)


def test_showing_a_technique_tells_what_it_is_and_offers_its_data():
    reply = ask(ChatAction.show_technique, "Colecistectomía")

    assert (
        reply.reply == "Colecistectomía. Extirpación quirúrgica de la vesícula biliar."
    )
    assert reply.technique_id == COLECISTECTOMIA.id
    assert reply.options == (
        "Indicaciones",
        "Complicaciones",
        "Anestesia y posición",
        "Instrumental de la mesa",
    )


def test_a_technique_without_description_says_so():
    reply = ask(ChatAction.show_technique, "Mastectomía")

    assert (
        reply.reply
        == "Mastectomía. DataIQ todavía no tiene la descripción de Mastectomía."
    )


def test_where_an_instrument_goes_comes_from_the_table():
    reply = ask(ChatAction.highlight_instrument, "Colecistectomía", "Pinza Kelly")

    assert reply.action == ChatAction.highlight_instrument
    assert reply.reply == (
        "La Pinza Kelly es el número 10 de la mesa de Mayo de Colecistectomía: "
        "fila 3, columna 4."
    )
    assert (reply.technique_id, reply.instrument_id) == (COLECISTECTOMIA.id, KELLY.id)
    assert reply.options == ("¿Qué es la Pinza Kelly?",)


def test_without_naming_the_technique_the_open_one_is_used():
    reply = ask(
        ChatAction.highlight_instrument,
        instrument="Pinza Kelly",
        open_technique=MASTECTOMIA.id,
    )

    assert reply.technique_id == MASTECTOMIA.id
    assert "número 9 de la mesa de Mayo de Mastectomía" in reply.reply


def test_an_instrument_in_several_tables_asks_which_technique():
    # Como en el mockup: sin técnica abierta, la Allis está en dos mesas.
    reply = ask(ChatAction.highlight_instrument, instrument="Allis")

    assert reply.action == ChatAction.no_answer
    assert reply.reply == "¿En qué técnica? La Pinza de Allis está en 2 mesas de Mayo."
    assert reply.instrument_id == ALLIS.id
    assert reply.options == (
        "¿Dónde va la Pinza de Allis en Colecistectomía?",
        "¿Dónde va la Pinza de Allis en Mastectomía?",
    )


def test_an_instrument_in_a_single_table_needs_no_technique():
    reply = ask(ChatAction.highlight_instrument, instrument="Pinza Lahey")

    assert reply.technique_id == TIROIDECTOMIA.id
    assert reply.instrument_id == LAHEY.id


def test_an_instrument_that_is_not_in_that_table_is_not_placed():
    reply = ask(ChatAction.highlight_instrument, "Mastectomía", "Separador de Farabeuf")

    assert reply.action == ChatAction.no_answer
    assert (
        reply.reply
        == "El Separador de Farabeuf no va en la mesa de Mayo de Mastectomía."
    )
    assert reply.instrument_id == FARABEUF.id


def test_an_instrument_outside_the_mvp_tables_is_not_placed():
    reply = ask(ChatAction.highlight_instrument, instrument="Pinza Kocher")

    assert (
        reply.reply
        == "La Pinza Kocher no va en ninguna mesa de Mayo de Cirugía General."
    )
    assert reply.instrument_id == KOCHER.id


def test_an_empty_description_is_said_as_it_is():
    reply = ask(ChatAction.describe_instrument, instrument="Pinza Kelly")

    assert (
        reply.reply
        == "Pinza Kelly. DataIQ todavía no tiene la descripción de la Pinza Kelly."
    )
    assert reply.options == ("¿Dónde va la Pinza Kelly?",)


def test_a_description_comes_from_dataiq():
    reply = ask(ChatAction.describe_instrument, instrument="Tijera de Mayo")

    assert reply.reply == "Tijera de Mayo. Tijera recta para cortar tejidos."


def test_clinical_data_comes_from_dataiq_or_says_it_is_missing():
    indications = ask(
        ChatAction.show_clinical_data,
        "Colecistectomía",
        field=ClinicalField.indications,
    )
    complications = ask(
        ChatAction.show_clinical_data,
        "Colecistectomía",
        field=ClinicalField.complications,
    )

    assert (
        indications.reply == "Indicaciones · Colecistectomía. Colelitiasis sintomática."
    )
    assert indications.field == ClinicalField.indications
    assert "Indicaciones" not in indications.options
    assert complications.reply == (
        "Complicaciones · Colecistectomía. "
        "DataIQ todavía no tiene este dato de Colecistectomía."
    )


def test_anesthesia_and_position_go_together():
    reply = ask(
        ChatAction.show_clinical_data,
        field=ClinicalField.anesthesia_position,
        open_technique=COLECISTECTOMIA.id,
    )

    assert reply.reply == (
        "Anestesia y posición · Colecistectomía. Anestesia: General. "
        "Posición del paciente: Decúbito supino."
    )


def test_the_instrument_list_follows_the_legend():
    reply = ask(ChatAction.list_instruments, "Colecistectomía")

    assert reply.reply == (
        "Mesa de Mayo de Colecistectomía, 4 objetos:\n"
        "4. Tijera de Mayo\n5. Pinza de Allis\n"
        "7. Separador de Farabeuf\n10. Pinza Kelly"
    )
    assert "Instrumental de la mesa" not in reply.options


def test_a_technique_question_without_technique_asks_which():
    reply = ask(ChatAction.show_clinical_data, field=ClinicalField.indications)

    assert reply.action == ChatAction.no_answer
    assert reply.reply == "¿De qué técnica?"
    assert reply.options == (
        "Indicaciones de Colecistectomía",
        "Indicaciones de Mastectomía",
        "Indicaciones de Tiroidectomía",
    )


def test_out_of_scope_questions_offer_the_mvp_techniques():
    reply = ask(ChatAction.no_answer)

    assert reply.reply == OUT_OF_SCOPE
    assert reply.options == ("Colecistectomía", "Mastectomía", "Tiroidectomía")


def test_techniques_outside_the_mvp_do_not_exist_for_the_chat():
    reply = ask(ChatAction.show_technique, "Cesárea")

    assert reply.action == ChatAction.no_answer


def test_the_vocabulary_only_has_the_mvp_tables():
    vocabulary = Vocabulary.from_catalog(CATALOG)

    assert vocabulary.techniques == ("Colecistectomía", "Mastectomía", "Tiroidectomía")
    assert "Pinza Kocher" not in vocabulary.instruments
    assert vocabulary.instruments["Pinza Kelly"] == ("Pinzas Kelly", "Pinza de Kelly")
