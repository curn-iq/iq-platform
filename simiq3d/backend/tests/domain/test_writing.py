from app.domain.chat import ChatAction, ClinicalField, Reply
from app.domain.requests import Request, RequestKind, Topic, answer_parts
from app.domain.writing import Draft, draft, final_text, messages, unsupported
from tests.sample import CATALOG, COLECISTECTOMIA

INDICATIONS = Request(
    RequestKind.clinical_data, "Colecistectomía", field=ClinicalField.indications
)
TABLE = Request(RequestKind.list_instruments, "Colecistectomía")
NO_TIMES = Request(RequestKind.out_of_scope, topic=Topic.surgical_times)


def plan_for(*requests: Request) -> Draft:
    return draft(answer_parts(list(requests), CATALOG, None), CATALOG)


def test_the_data_go_first_with_the_technique_as_context_and_the_question_last():
    plan = plan_for(INDICATIONS, TABLE)

    _, user = messages("Indicaciones y mesa", plan)

    assert user["content"].startswith(
        "<datos>\n<dato>\nIndicaciones · Colecistectomía."
    )
    assert "<contexto>\nQué es Colecistectomía: Extirpación" in user["content"]
    assert user["content"].endswith("Pregunta del estudiante: Indicaciones y mesa")


def test_the_table_goes_after_the_text_as_it_comes_from_dataiq():
    plan = plan_for(INDICATIONS, TABLE)

    text = final_text("Se indica en la colelitiasis sintomática.", plan)

    first, table = text.split("\n\n")
    assert first == "Se indica en la colelitiasis sintomática."
    assert table.startswith("Mesa de Mayo de Colecistectomía, 4 objetos:\n4. Tijera")


def test_a_question_to_clarify_or_a_plain_refusal_is_not_written():
    clarify = Reply(ChatAction.clarify, "¿Cuál?", options=("Una", "Otra"))
    refusal = Reply(ChatAction.no_answer, "Solo puedo responder sobre…")

    assert draft([clarify], CATALOG) is None
    assert draft([refusal], CATALOG) is None
    assert draft(answer_parts([INDICATIONS, NO_TIMES], CATALOG, None), CATALOG)


def test_a_faithful_text_passes():
    plan = plan_for(INDICATIONS, TABLE)
    text = (
        "La colecistectomía se indica en la colelitiasis sintomática, y su mesa de "
        "Mayo lleva cuatro objetos, entre ellos la Pinza Kelly, el número 10."
    )

    assert unsupported(text, plan, "Indicaciones y mesa", CATALOG) == []


CITED = "Se indica en la colelitiasis sintomática."


def problems_of(text: str, plan: Draft, question: str = "Indicaciones") -> list[str]:
    return unsupported(text, plan, question, CATALOG)


def test_names_and_numbers_that_dataiq_does_not_have_are_caught():
    plan = plan_for(INDICATIONS)

    assert problems_of(f"{CITED} Lleva la Pinza Lahey.", plan) == [
        "instrumento sin respaldo: Pinza Lahey"
    ]
    assert problems_of(f"{CITED} Es como la tiroidectomía.", plan) == [
        "técnica sin respaldo: Tiroidectomía"
    ]
    assert problems_of(f"{CITED} Dura unas 2 horas.", plan) == [
        "número sin respaldo: 2"
    ]
    assert problems_of(f"{CITED} Dura unas tres horas.", plan) == [
        "número sin respaldo: 3"
    ]


def test_the_grid_an_empty_text_and_a_rambling_one_are_caught():
    plan = plan_for(INDICATIONS)

    assert problems_of(f"{CITED} Va en la fila 1.", plan) == [
        "número sin respaldo: 1",
        "habla de la cuadrícula",
    ]
    assert problems_of("  ", plan) == ["texto vacío"]
    assert problems_of(CITED * 30, plan) == ["mucho más largo que sus datos"]


def test_leaving_out_a_datum_is_caught():
    plan = plan_for(INDICATIONS)

    [problem] = problems_of("La colecistectomía tiene indicaciones.", plan)
    assert problem.startswith("omite un dato: Indicaciones · Colecistectomía.")


def test_saying_that_something_is_missing_when_dataiq_has_it_is_caught():
    plan = plan_for(Request(RequestKind.show_technique, "Colecistectomía"))
    question = "Muéstrame la colecistectomía"

    shown = "La colecistectomía es la extirpación quirúrgica de la vesícula biliar."
    assert problems_of(shown, plan, question) == []
    absent = f"{shown} La mesa no está en los datos."
    assert problems_of(absent, plan, question) == [
        "dice que falta algo que DataIQ tiene"
    ]


def test_an_explanation_dataiq_does_not_give_is_caught():
    plan = plan_for(INDICATIONS)

    reason = f"{CITED} Por eso no se necesita la pinza."
    assert problems_of(reason, plan) == ["agrega una explicación: «por eso»"]
    filler = f"{CITED} La mesa está preparada para la cirugía."
    assert problems_of(filler, plan) == ["agrega una explicación: «preparad»"]


def test_what_dataiq_does_not_have_must_still_be_said():
    plan = plan_for(INDICATIONS, NO_TIMES)
    question = "Indicaciones y tiempos quirúrgicos de la colecistectomía"

    silent = CITED
    honest = f"{silent} DataIQ no tiene los tiempos quirúrgicos."
    assert unsupported(silent, plan, question, CATALOG) == [
        "no dice lo que DataIQ no tiene"
    ]
    assert unsupported(honest, plan, question, CATALOG) == []


def test_the_description_is_not_repeated_as_context_when_it_is_asked():
    description = Request(
        RequestKind.clinical_data, "Colecistectomía", field=ClinicalField.description
    )

    plan = plan_for(description)

    assert plan.context == ()
    assert plan.data[0].startswith(f"Para qué sirve · {COLECISTECTOMIA.name}.")


def test_talking_about_surgical_times_or_order_of_use_is_caught():
    plan = plan_for(INDICATIONS)

    assert problems_of(f"{CITED} Se dispone en orden de uso.", plan) == [
        "habla de tiempos quirúrgicos u orden de uso"
    ]
    with_note = plan_for(INDICATIONS, NO_TIMES)
    honest = f"{CITED} DataIQ no tiene los tiempos quirúrgicos (diéresis, hemostasia)."
    assert problems_of(honest, with_note, "Indicaciones y tiempos quirúrgicos") == []
