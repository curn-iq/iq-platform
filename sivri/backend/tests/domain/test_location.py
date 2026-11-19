from app.domain.catalog import Cell
from app.domain.location import (
    extra_message,
    missing_message,
    move_message,
    neighbors,
    where,
    zone,
)
from tests.domain.helpers import ALLIS, KELLY, METZ, item, technique

# Una mesa de 4 × 4 con tres objetos juntos arriba a la izquierda y uno lejos.
A = item(1, ALLIS, (1, 1))
B = item(2, KELLY, (1, 2))
C = item(3, METZ, (2, 2))
FAR = item(4, "Pinza Kocher", (4, 4))
TABLE = technique("Prueba", 4, 4, A, B, C, FAR)


def test_the_zone_is_said_by_thirds_of_the_table():
    assert zone(TABLE, (Cell(1, 1),)) == "arriba a la izquierda"
    assert zone(TABLE, (Cell(1, 4),)) == "arriba a la derecha"
    assert zone(TABLE, (Cell(2, 2),)) == "en el centro"
    assert zone(TABLE, (Cell(4, 4),)) == "abajo a la derecha"


def test_an_object_of_several_cells_uses_their_middle():
    assert zone(TABLE, (Cell(4, 1), Cell(4, 2))) == "abajo a la izquierda"


def test_an_object_without_cells_has_no_zone():
    assert zone(TABLE, ()) is None


def test_neighbors_include_the_diagonal_and_follow_the_diagram_order():
    assert neighbors(TABLE, C.cells) == [A, B]
    assert neighbors(TABLE, FAR.cells) == []


def test_where_names_the_zone_and_what_is_beside():
    assert where(TABLE, C.cells) == (
        "en el centro, junto a Pinza de Allis (n.º 1) y Pinza Kelly (n.º 2)"
    )
    assert where(TABLE, FAR.cells) == "abajo a la derecha"


def test_where_names_at_most_three_neighbors():
    crowded = technique(
        "Llena",
        4,
        4,
        item(1, "A", (2, 2)),
        item(2, "B", (1, 1)),
        item(3, "C", (1, 2)),
        item(4, "D", (1, 3)),
        item(5, "E", (2, 3)),
    )

    text = where(crowded, (Cell(2, 2),))

    assert text.count("(n.º") == 3
    assert "E" not in text.split("junto a")[1]


def test_the_messages_never_mention_rows_columns_or_cells():
    texts = [
        move_message(TABLE, KELLY, 2, B.cells),
        missing_message(TABLE, KELLY, 2, B.cells),
        extra_message(KELLY),
    ]

    for text in texts:
        assert not any(w in text.lower() for w in ("fila", "columna", "celda"))


def test_the_messages():
    assert move_message(TABLE, KELLY, 2, B.cells) == (
        "Pinza Kelly (n.º 2): va arriba, al centro, junto a "
        "Pinza de Allis (n.º 1) y Tijera de Metzenbaum (n.º 3)."
    )
    assert missing_message(TABLE, "Pinza Kocher", 4, FAR.cells) == (
        "Falta Pinza Kocher (n.º 4): va abajo a la derecha."
    )
    assert extra_message("Pinza Lahey") == "Sobra Pinza Lahey: no va en esta mesa."


def test_without_cells_the_messages_do_not_invent_a_place():
    assert move_message(TABLE, KELLY, 2, ()) == "Pinza Kelly (n.º 2): hay que moverlo."
    assert missing_message(TABLE, KELLY, None, ()) == "Falta Pinza Kelly."
