from app.domain.chat import ChatAction, ClinicalField
from app.domain.focus import focus_of
from app.domain.requests import RequestKind, Turn
from app.domain.tutor import (
    NOTHING_NAMED,
    TIMES_ASKED,
    TUTOR,
    UNAVAILABLE,
    data_of,
    messages,
    requests_of,
    retry_messages,
    scene_of,
    without_model,
)
from tests.sample import (
    CATALOG,
    COLECISTECTOMIA,
    KELLY,
    LAHEY,
    MASTECTOMIA,
    MAYO_SCISSORS,
    TIROIDECTOMIA,
)


def scene(question: str, open_id=None, previous=()):
    focus = focus_of(question, CATALOG, open_id, previous)
    return focus, scene_of(focus, question, CATALOG)


def test_where_an_instrument_goes_highlights_it():
    _, s = scene("¿Dónde va la Kelly?", COLECISTECTOMIA.id)

    assert (s.action, s.technique, s.instrument) == (
        ChatAction.highlight_instrument,
        COLECISTECTOMIA,
        KELLY,
    )
    assert "señala" in s.note


def test_what_it_is_or_when_it_is_used_opens_its_card():
    for question in ("¿Para qué sirve la Kelly?", "¿Cuándo debemos usar la Kelly?"):
        _, s = scene(question, COLECISTECTOMIA.id)
        assert s.action == ChatAction.describe_instrument


def test_without_a_table_the_card_opens_and_the_tables_are_options():
    _, s = scene("¿Qué es una pinza Kelly?")

    assert (s.action, s.instrument, s.technique) == (
        ChatAction.describe_instrument,
        KELLY,
        None,
    )
    assert s.options == (
        "¿Dónde va la Pinza Kelly en Colecistectomía?",
        "¿Dónde va la Pinza Kelly en Mastectomía?",
    )


def test_an_instrument_that_is_not_in_the_table_does_not_move_the_viewer():
    _, s = scene("¿Dónde va la Lahey?", COLECISTECTOMIA.id)

    assert s.action == ChatAction.answer
    assert s.options == ("¿Dónde va la Pinza Lahey en Tiroidectomía?",)


def test_a_technique_named_opens_with_the_datum_or_the_list_asked():
    _, what = scene("¿Qué es la mastectomía?")
    _, risks = scene("¿Qué complicaciones tiene la colecistectomía?")
    _, table = scene("¿Cómo debo ordenar la mesa?", COLECISTECTOMIA.id)
    _, shown = scene("Muéstrame la colecistectomía")

    assert (what.action, what.technique, what.field) == (
        ChatAction.show_clinical_data,
        MASTECTOMIA,
        ClinicalField.description,
    )
    assert risks.field == ClinicalField.complications
    assert (table.action, table.technique) == (
        ChatAction.list_instruments,
        COLECISTECTOMIA,
    )
    assert "lista numerada" in table.note
    assert shown.action == ChatAction.show_technique


def test_talking_in_general_does_not_change_the_viewer():
    _, concept = scene("¿Qué es la hemostasia?", COLECISTECTOMIA.id)
    _, two = scene("Diferencias entre mastectomía y tiroidectomía")
    _, outside = scene("¿Qué tiempo hace hoy?")

    assert concept.action == two.action == outside.action == ChatAction.answer
    assert two.options == (
        "¿Qué lleva la mesa de Mastectomía?",
        "¿Qué lleva la mesa de Tiroidectomía?",
    )


def test_a_greeting_gets_questions_to_start():
    _, s = scene("Hola")

    assert s.action == ChatAction.answer
    assert len(s.options) >= 2


def test_the_data_bring_what_is_talked_about_and_say_what_dataiq_lacks():
    focus, s = scene("¿Qué lleva la mesa de la mastectomía?")

    data = data_of(focus, "¿Qué lleva la mesa de la mastectomía?", CATALOG, s)

    assert "Técnica: Mastectomía (Cirugía General)" in data
    assert "- Qué es: DataIQ no lo tiene." in data
    assert "Mesa de Mayo de Mastectomía: 2 objetos." in data
    assert "1. Pinza de Allis: arriba, al centro" in data
    assert "Colecistectomía (4 objetos)" in data  # el resumen de las técnicas


def test_an_instrument_says_where_it_goes_in_each_table():
    focus, s = scene("¿Qué es la Kelly?")

    data = data_of(focus, "¿Qué es la Kelly?", CATALOG, s)

    assert "Instrumento: Pinza Kelly (también se le dice Pinzas Kelly" in data
    assert "- Va en 2 mesas de Mayo de Cirugía General: Colecistectomía (n.º 10" in data
    assert "Mastectomía (n.º 9" in data


def test_two_techniques_bring_what_they_share():
    question = "¿En qué se parecen las mesas de colecistectomía y mastectomía?"
    focus, s = scene(question)

    data = data_of(focus, question, CATALOG, s)

    assert "- En las dos: Pinza de Allis, Pinza Kelly" in data
    assert "- Solo en Colecistectomía: Tijera de Mayo, Separador de Farabeuf" in data
    assert "- Solo en Mastectomía: ninguno" in data


def test_the_question_goes_last_after_the_data_and_the_conversation():
    previous = (Turn("¿Qué es la Kelly?", reply="La **Pinza Kelly** es…"),)
    focus, s = scene("¿Y dónde va?", COLECISTECTOMIA.id, previous)

    prompt = messages("¿Y dónde va?", "DATOS", s, previous)

    assert prompt[0] == {"role": "system", "content": TUTOR}
    assert prompt[1:3] == [
        {"role": "user", "content": "¿Qué es la Kelly?"},
        {"role": "assistant", "content": "La **Pinza Kelly** es…"},
    ]
    assert prompt[3]["content"].startswith("<datos>\nDATOS\n</datos>\n<visor>")
    assert prompt[3]["content"].endswith("Pregunta del estudiante: ¿Y dónde va?")


def test_asking_for_surgical_times_warns_the_model():
    _, s = scene("¿Qué instrumentos son de diéresis?", COLECISTECTOMIA.id)

    prompt = messages("¿Qué instrumentos son de diéresis?", "", s)

    assert f"<aviso>{TIMES_ASKED}</aviso>" in prompt[-1]["content"]


def test_the_second_chance_says_what_was_wrong():
    base = [{"role": "user", "content": "P"}]

    again = retry_messages(base, "texto", ["la Lahey no va en esa mesa"])

    assert again[1] == {"role": "assistant", "content": "texto"}
    assert "- la Lahey no va en esa mesa" in again[2]["content"]


def test_what_was_talked_about_goes_back_as_requests():
    focus, s = scene("¿Para qué sirve la Kelly?", COLECISTECTOMIA.id)

    [request] = requests_of(focus, s)

    assert (request.kind, request.technique, request.instrument) == (
        RequestKind.describe,
        "Colecistectomía",
        "Pinza Kelly",
    )


def test_without_the_model_it_says_so_and_shows_dataiq():
    focus, s = scene("¿Para qué sirve la Tijera de Mayo?")
    empty, nothing = scene("Hola")

    text = without_model(focus, "¿Para qué sirve la Tijera de Mayo?", CATALOG, s)

    assert text.startswith("El modelo de IA no está disponible ahora.")
    assert f"**{MAYO_SCISSORS.name}**: Tijera recta para cortar tejidos." in text
    assert "Va en 1 mesa de Mayo de Cirugía General: Colecistectomía" in text
    assert without_model(empty, "Hola", CATALOG, nothing) == UNAVAILABLE


def test_an_instrument_in_only_one_table_is_highlighted_there():
    _, s = scene("¿Dónde va la Lahey?")

    assert (s.action, s.technique, s.instrument) == (
        ChatAction.highlight_instrument,
        TIROIDECTOMIA,
        LAHEY,
    )


def test_a_personal_health_question_does_not_open_the_technique():
    question = "Si tengo cálculos en la vesícula, ¿qué cirugía me harían?"
    focus, s = scene(question)

    assert focus.techniques == (COLECISTECTOMIA,)
    assert s.action == ChatAction.answer


def test_not_wanting_the_list_does_not_show_it():
    _, s = scene("No quiero la lista, solo para qué sirve la colecistectomía")

    assert (s.action, s.field) == (
        ChatAction.show_clinical_data,
        ClinicalField.description,
    )


def test_a_question_that_names_nothing_warns_that_it_may_be_off_topic():
    _, s = scene("¿Cuál es la capital de Francia?")

    prompt = messages("¿Cuál es la capital de Francia?", "", s, data_named=False)

    assert f"<aviso>{NOTHING_NAMED}</aviso>" in prompt[-1]["content"]


def test_the_table_of_the_only_technique_always_goes_with_the_data():
    question = "¿Y sus complicaciones?"
    focus, s = scene(question, previous=(Turn("¿Qué es la colecistectomía?"),))

    data = data_of(focus, question, CATALOG, s)

    assert "Mesa de Mayo de Colecistectomía: 4 objetos." in data
