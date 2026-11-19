import pytest

from app.domain.validation import (
    Status,
    ValidationSettings,
    recognize,
    validate_technique,
)
from tests.domain.helpers import (
    ALLIS,
    CLASSES,
    KELLY,
    METZ,
    item,
    seen,
    technique,
)

# Una mesa de 4 × 4: la Kelly en la fila 2, columna 3; la Allis en la fila 1,
# columna 1; la Metzenbaum ocupa dos celdas (fila 4, columnas 1 y 2).
TABLE = technique(
    "Prueba",
    4,
    4,
    item(1, ALLIS, (1, 1)),
    item(2, KELLY, (2, 3)),
    item(3, METZ, (4, 1), (4, 2)),
)


def statuses(result):
    return {o.label: o.status for o in result.objects}


def test_everything_in_its_cell_is_in_place_with_100_percent():
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.5), seen(METZ, 3.5, 1.0)]

    result = validate_technique(TABLE, CLASSES, placed)

    assert set(statuses(result).values()) == {Status.IN_PLACE}
    assert result.percent == 1.0
    assert result.extras == []


def test_an_instrument_in_another_cell_says_where_to_move_it():
    # La Kelly va en la fila 2, columna 3 y está una celda a la izquierda.
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 1.5), seen(METZ, 3.5, 1.0)]

    result = validate_technique(TABLE, CLASSES, placed)

    kelly = next(o for o in result.objects if o.label == KELLY)
    assert kelly.status is Status.MOVE
    assert (kelly.move_rows, kelly.move_columns) == (0, 1)
    assert result.in_place == 2
    assert result.percent == 2 / 3


def test_the_center_near_a_border_is_doubtful_not_an_error():
    # 5 % del lado de la celda adentro del borde: dentro del margen del 10 %.
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.05), seen(METZ, 3.5, 1.0)]

    result = validate_technique(TABLE, CLASSES, placed)

    assert statuses(result)[KELLY] is Status.DOUBTFUL
    # Para el estudiante no es un error: cuenta como en su lugar.
    assert result.percent == 1.0


def test_just_outside_the_border_but_within_the_margin_is_doubtful():
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 1.95), seen(METZ, 3.5, 1.0)]

    result = validate_technique(TABLE, CLASSES, placed)

    assert statuses(result)[KELLY] is Status.DOUBTFUL


def test_the_margin_can_be_changed():
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.15), seen(METZ, 3.5, 1.0)]

    wide = validate_technique(TABLE, CLASSES, placed, ValidationSettings(margin=0.2))
    narrow = validate_technique(TABLE, CLASSES, placed, ValidationSettings(margin=0.1))

    assert statuses(wide)[KELLY] is Status.DOUBTFUL
    assert statuses(narrow)[KELLY] is Status.IN_PLACE


@pytest.mark.parametrize("column", [0.98, 1.02])
def test_the_border_between_two_cells_of_the_same_object_does_not_count(column):
    # La Metzenbaum ocupa las columnas 1 y 2 de la fila 4: su centro justo junto a
    # la línea entre las dos está bien, no en el margen.
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.5), seen(METZ, 3.5, column)]

    result = validate_technique(TABLE, CLASSES, placed)

    assert statuses(result)[METZ] is Status.IN_PLACE


def test_what_is_expected_and_does_not_appear_is_missing():
    placed = [seen(ALLIS, 0.5, 0.5), seen(METZ, 3.5, 1.0)]

    result = validate_technique(TABLE, CLASSES, placed)

    kelly = next(o for o in result.objects if o.label == KELLY)
    assert kelly.status is Status.MISSING
    assert kelly.detection is None
    assert result.percent == 2 / 3


def test_what_appears_and_is_not_expected_is_extra():
    placed = [
        seen(ALLIS, 0.5, 0.5),
        seen(KELLY, 1.5, 2.5),
        seen(METZ, 3.5, 1.0),
        seen("Pinza Kocher", 2.5, 3.5),
    ]

    result = validate_technique(TABLE, CLASSES, placed)

    assert [e.label for e in result.extras] == ["Pinza Kocher"]
    assert all(e.status is Status.EXTRA for e in result.extras)
    # Un sobrante no baja el porcentaje de lo esperado.
    assert result.percent == 1.0


def test_two_equal_instruments_are_matched_to_their_nearest_position():
    table = technique("Dos Kelly", 4, 4, item(1, KELLY, (1, 1)), item(2, KELLY, (4, 4)))
    # Las detecciones llegan en el orden contrario al de la leyenda.
    placed = [seen(KELLY, 3.5, 3.5), seen(KELLY, 0.5, 0.5)]

    result = validate_technique(table, CLASSES, placed)

    assert [o.status for o in result.objects] == [Status.IN_PLACE, Status.IN_PLACE]


def test_one_instrument_too_many_leaves_the_nearest_matched_and_one_extra():
    placed = [
        seen(ALLIS, 0.5, 0.5),
        seen(KELLY, 1.5, 2.5),
        seen(KELLY, 3.5, 3.5),
        seen(METZ, 3.5, 1.0),
    ]

    result = validate_technique(TABLE, CLASSES, placed)

    kelly = next(o for o in result.objects if o.label == KELLY)
    assert kelly.status is Status.IN_PLACE
    assert len(result.extras) == 1


def test_an_instrument_without_a_class_in_the_model_is_not_expected():
    # La hoja de bisturí va montada en su mango y no es clase: la mesa no la espera.
    table = technique("Con hoja", 4, 4, item(1, "Hoja de bisturí #20", (1, 1)))

    result = validate_technique(table, CLASSES, [])

    assert result.expected == 0
    assert result.percent == 0.0


def test_recognition_picks_the_technique_that_looks_most_like_the_table():
    other = technique(
        "Otra",
        4,
        4,
        item(1, ALLIS, (4, 4)),
        item(2, KELLY, (4, 3)),
        item(3, METZ, (3, 3)),
    )
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.5), seen(METZ, 3.5, 1.0)]

    recognition = recognize([other, TABLE], CLASSES, placed)

    assert [r.name for r in recognition.ranking] == ["Prueba", "Otra"]
    assert [r.name for r in recognition.shown] == ["Prueba"]


def test_two_very_close_techniques_are_both_shown():
    twin = technique(
        "Gemela",
        4,
        4,
        item(1, ALLIS, (1, 1)),
        item(2, KELLY, (2, 3)),
        item(3, METZ, (4, 1)),
    )
    placed = [seen(ALLIS, 0.5, 0.5), seen(KELLY, 1.5, 2.5), seen(METZ, 3.5, 1.0)]

    recognition = recognize([TABLE, twin], CLASSES, placed)

    assert {r.name for r in recognition.shown} == {"Prueba", "Gemela"}


def test_an_empty_table_scores_zero_everywhere():
    recognition = recognize([TABLE], CLASSES, [])

    assert recognition.ranking[0].percent == 0.0
    assert all(o.status is Status.MISSING for o in recognition.ranking[0].objects)
