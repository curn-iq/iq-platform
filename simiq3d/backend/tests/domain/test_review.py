import pytest

from app.domain.review import NO_DOSES, NO_TIMES, review, wrong_zone, zone_of
from tests.sample import CATALOG, COLECISTECTOMIA, KELLY, MASTECTOMIA


def check(text: str, table=COLECISTECTOMIA, subject=None, data="Colecistectomía"):
    return review(text, CATALOG, table, data, "", subject)


def test_general_knowledge_and_explanations_pass():
    text = (
        "La **Pinza Kelly** es una pinza hemostática: en general se usa para pinzar "
        "vasos, porque así se controla el sangrado. La hemostasia es detener el "
        "sangrado."
    )

    reviewed = check(text)

    assert reviewed.text == text
    assert reviewed.problems == ()


def test_an_instrument_that_is_not_in_that_table_is_replaced_by_where_it_goes():
    reviewed = check("La Pinza Lahey va arriba en la mesa de la colecistectomía.")

    assert reviewed.text == (
        "La Pinza Lahey no va en la mesa de Mayo de Colecistectomía. Va en la de "
        "Tiroidectomía."
    )
    assert reviewed.problems[0].kind == "mesa"


def test_a_wrong_diagram_number_or_zone_is_replaced_by_dataiq():
    number = check("La Pinza Kelly va en el centro (n.º 4 del diagrama).")
    zone = check("La Pinza Kelly va abajo a la izquierda.")
    right = check("La Pinza Kelly va en el centro (n.º 10).")

    expected = "La Pinza Kelly va en el centro de la mesa de Mayo"
    assert number.text.startswith(expected)
    assert zone.text.startswith(expected)
    assert right.problems == ()


def test_the_number_and_zone_after_another_piece_are_that_piece():
    text = "La Allis va arriba a la izquierda, y la Kelly en el centro (n.º 10)."

    assert check(text).problems == ()


def test_in_a_numbered_list_the_number_is_the_diagrams():
    wrong = check("- 4. Pinza Kelly")
    right = check("- 10. Pinza Kelly")

    assert wrong.problems[0].detail == "Pinza Kelly es el n.º 10 del diagrama, no el 4"
    assert right.problems == ()


def test_a_zone_with_its_numbers_keeps_the_right_ones():
    reviewed = check("- **Arriba a la izquierda**: 5 y 10.")

    assert reviewed.text == (
        "- **Arriba a la izquierda**: 5. El n.º 10 (Pinza Kelly) va en el centro."
    )


def test_a_sentence_about_the_piece_asked_without_naming_it():
    reviewed = check("En la mastectomía también va abajo.", table=None, subject=KELLY)

    assert reviewed.problems[0].detail.startswith("Pinza Kelly va en el centro")


def test_saying_it_does_not_go_when_it_does_is_caught():
    reviewed = check("La Pinza Kelly no va en la mesa de la colecistectomía.")

    assert reviewed.problems[0].detail == (
        "Pinza Kelly sí va en la mesa de Mayo de Colecistectomía"
    )


def test_a_count_that_dataiq_does_not_have_is_replaced():
    reviewed = check("La mesa de la colecistectomía lleva 12 instrumentos.", data="4")

    assert reviewed.text == "La mesa de Mayo de Colecistectomía lleva 4 objetos."


def test_ordering_or_grouping_the_table_by_surgical_times_is_replaced():
    ordered = check("La Kelly se usa primero y luego la Allis.")
    placed = check("La Kelly va en el centro porque es de hemostasia.")
    grouped = check(
        "El instrumental de diéresis de esta mesa es:\n\n- Tijera de Mayo\n"
        "- Pinza Kelly\n\nLo demás es general."
    )
    denied = check("DataIQ no ordena la mesa por tiempos quirúrgicos.")

    assert ordered.text == NO_TIMES
    assert placed.text == NO_TIMES
    assert grouped.text == f"{NO_TIMES}\n\nLo demás es general."
    assert denied.problems == ()


def test_a_dose_and_the_grid_are_removed():
    dose = check("Se usan 2 mg/kg de lidocaína. Lo decide el anestesiólogo.")
    grid = check("La Kelly va en la fila 3. Es hemostática.")

    assert dose.text == f"{NO_DOSES} Lo decide el anestesiólogo."
    assert grid.text == "Es hemostática."


def test_the_same_fact_goes_once_and_mostly_removed_is_known():
    reviewed = check("La Kelly se usa primero. Después se usa la Allis. Bien.")

    assert reviewed.text == f"{NO_TIMES} Bien."
    assert reviewed.removed == 2 and reviewed.sentences == 3
    assert reviewed.mostly_removed


def test_zones_are_read_as_dataiq_says_them():
    assert zone_of("arriba a la derecha") == ("arriba", "derecha")
    assert zone_of("en el centro") == ("centro", "centro")
    assert zone_of("abajo, al centro") == ("abajo", "centro")
    assert zone_of("a la derecha de la kelly") == (None, None)
    assert wrong_zone("arriba", "arriba a la derecha") is False
    assert wrong_zone("en el centro", "en el centro, a la derecha") is True


def test_a_table_other_than_the_open_one_is_checked_against_itself():
    reviewed = check("En la mastectomía, la Pinza Kelly va en el centro, a la derecha.")

    assert reviewed.problems == ()
    assert MASTECTOMIA.name in "Mastectomía"


def test_each_table_in_a_sentence_is_checked_with_its_own_part():
    right = check(
        "Va en Colecistectomía (n.º 10, en el centro) y en Mastectomía (n.º 9, en "
        "el centro, a la derecha).",
        table=None,
        subject=KELLY,
    )
    wrong = check("- Mastectomía: n.º 4 (arriba)", table=None, subject=KELLY)

    assert right.problems == ()
    assert wrong.problems[0].detail == (
        "Pinza Kelly es el n.º 9 de la mesa de Mastectomía, no el 4"
    )


def test_an_object_with_a_number_that_dataiq_does_not_have_is_caught():
    reviewed = check(
        "- **Pinza de hemostasia** (número 3)\n- Cuchillo de sutura (número 9)"
    )

    assert reviewed.text == (
        "- Ese objeto no está en la mesa de Mayo de Colecistectomía de DataIQ."
    )
    assert reviewed.removed == 2


def test_explaining_what_an_instrument_is_for_is_not_ordering_the_table():
    text = (
        "Es parte del objeto de esta mesa, y se usa para incisiones durante la "
        "diéresis. La posición permite una exposición óptima y la colocación de "
        "la malla."
    )

    assert check(text).problems == ()


def test_a_numbered_list_gets_the_diagram_numbers_in_place():
    reviewed = check("1. Tijera de Mayo\n2. Pinza Kelly")

    assert reviewed.text == "4. Tijera de Mayo\n10. Pinza Kelly"
    assert reviewed.removed == 0


def test_a_zone_with_its_pieces_keeps_the_right_ones():
    reviewed = check("- **Arriba a la izquierda**: Pinza de Allis y Pinza Kelly.")

    assert reviewed.text == (
        "- **Arriba a la izquierda**: la Pinza de Allis. La Pinza Kelly va en el "
        "centro."
    )


def test_a_number_in_brackets_after_a_piece_is_its_diagram_number():
    assert check("- **Pinza Kelly (4)**: hemostática.").problems
    assert check("- **Pinza Kelly (10)**: hemostática.").problems == ()


def test_the_scalpel_or_the_dissecting_forceps_are_not_invented():
    assert check("- **Bisturí** (n.º 1)").problems == ()
    assert check("Las pinzas de Allis (n.º 5) van juntas.").problems == ()


def test_the_neighbours_after_a_zone_are_not_in_that_zone():
    near = check("- Arriba a la izquierda: la Pinza de Allis, junto a la Pinza Kelly.")

    assert near.problems == ()


def test_a_technique_name_is_not_a_zone():
    from app.domain.review import _without_techniques
    from tests.sample import CATALOG as catalog

    assert zone_of(_without_techniques("mastectomia: arriba", catalog)) == (
        "arriba",
        None,
    )
    assert "mastectomia" not in _without_techniques("en la mastectomia", catalog)


def test_upper_central_and_lower_are_zones_too():
    assert zone_of("zona superior derecha") == ("arriba", "derecha")
    assert zone_of("zona central") == ("centro", "centro")
    reviewed = check("- **Zona superior izquierda**: Pinza de Allis y Pinza Kelly.")
    assert reviewed.problems[0].detail == "Pinza Kelly va en el centro"


def test_grouping_by_the_exposure_phase_is_caught():
    reviewed = check(
        "La Kelly y la Allis van en el centro: se usan en la fase de exposición."
    )

    assert reviewed.text == NO_TIMES


def test_an_abbreviation_does_not_end_the_sentence():
    reviewed = check("- **Pinza Kelly** (obj. 10) va en el centro.")

    assert reviewed.text == "- **Pinza Kelly** (obj. 10) va en el centro."


def test_a_zone_said_of_several_pieces_is_checked_for_each():
    reviewed = check("La Pinza Kelly y la Pinza de Allis están en el centro.")

    assert (
        reviewed.problems[0].detail
        == "Pinza de Allis va arriba a la izquierda de la mesa"
    )


def test_proposing_to_move_the_pieces_is_replaced():
    from app.domain.review import NO_MOVING

    reviewed = check("Si quieres, puedes moverlos en el visor 3D. Bien.")

    assert reviewed.text == f"{NO_MOVING} Bien."


STREAMED = [
    "La **Pinza Kelly** es hemostática. Va en el centro (n.º 4 del diagrama).",
    "Va así:\n\n1. Tijera de Mayo\n2. Pinza Kelly\n\n"
    "- **Arriba a la izquierda**: 5 y 10.",
    "El instrumental de diéresis de esta mesa es:\n\n- Tijera de Mayo\n- Pinza Kelly"
    "\n\nLo demás es general. La Kelly se usa primero. Después se usa la Allis.",
    "Se usan 2 mg/kg de lidocaína. Lo decide el anestesiólogo.\n\n\n\nFin.",
    "- **Pinza Kelly** (obj. 10) va en el centro.\n"
    "La Pinza Lahey va arriba en la mesa.",
]


@pytest.mark.parametrize("text", STREAMED)
@pytest.mark.parametrize("size", [1, 3, 7, 1000])
def test_reviewing_as_it_comes_shows_the_same_as_reviewing_it_whole(text, size):
    from app.domain.review import Reviewer

    whole = check(text)
    reviewer = Reviewer(CATALOG, COLECISTECTOMIA, "Colecistectomía", "")
    shown = [reviewer.feed(text[i : i + size]) for i in range(0, len(text), size)]
    shown.append(reviewer.finish())

    assert "".join(shown).strip() == whole.text
    assert reviewer.result().problems == whole.problems


def test_a_sentence_is_shown_as_soon_as_the_next_one_starts():
    from app.domain.review import Reviewer

    reviewer = Reviewer(CATALOG, COLECISTECTOMIA, "", "")

    assert reviewer.feed("La Kelly es hemostática.") == ""
    assert reviewer.feed(" Sirve") == "La Kelly es hemostática."
    assert reviewer.feed(" para pinzar.") == ""
    assert reviewer.finish() == " Sirve para pinzar."
