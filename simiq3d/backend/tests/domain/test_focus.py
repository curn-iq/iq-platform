from app.domain.focus import focus_of, techniques_named
from app.domain.requests import Request, RequestKind, Turn
from tests.sample import (
    ALLIS,
    CATALOG,
    CESAREA,
    COLECISTECTOMIA,
    KELLY,
    LAHEY,
    MASTECTOMIA,
    TIROIDECTOMIA,
)


def test_the_techniques_and_instruments_named_in_order():
    focus = focus_of(
        "¿La Kelly va en la mastectomía o en la colecistectomía?", CATALOG, None
    )

    assert focus.techniques == (MASTECTOMIA, COLECISTECTOMIA)
    assert focus.instruments == (KELLY,)
    assert focus.named


def test_a_technique_of_another_specialty_is_known_but_apart():
    focus = focus_of("¿Qué es una cesárea?", CATALOG, None)

    assert focus.techniques == ()
    assert focus.others == (CESAREA,)


def test_the_open_technique_is_the_table_unless_another_is_named():
    open_ = focus_of("¿Dónde va la Allis?", CATALOG, MASTECTOMIA.id)
    named = focus_of(
        "¿Dónde va la Allis en la colecistectomía?", CATALOG, MASTECTOMIA.id
    )

    assert open_.table() == MASTECTOMIA and not open_.named
    assert named.table() == COLECISTECTOMIA


def test_this_technique_names_the_open_one():
    focus = focus_of("¿Qué complicaciones tiene esta técnica?", CATALOG, MASTECTOMIA.id)

    assert focus.techniques == (MASTECTOMIA,)
    assert focus.named


def test_without_a_table_an_instrument_in_only_one_goes_there():
    focus = focus_of("¿Dónde va la Lahey?", CATALOG, None)

    assert focus.where(LAHEY, CATALOG) == TIROIDECTOMIA
    assert focus.where(KELLY, CATALOG) is None  # va en dos mesas


def test_a_question_that_names_nothing_takes_the_previous_one():
    previous = (
        Turn(
            "¿Qué es la Kelly?", (Request(RequestKind.describe, None, "Pinza Kelly"),)
        ),
    )

    focus = focus_of("¿Y cuándo se usa?", CATALOG, None, previous)

    assert focus.instruments == (KELLY,)
    assert focus.carried


def test_a_follow_up_keeps_what_it_does_not_name():
    previous = (Turn("¿Dónde va la Kelly en la mastectomía?"),)

    other_table = focus_of("¿Y en la colecistectomía?", CATALOG, None, previous)
    other_piece = focus_of("¿Y la Allis?", CATALOG, None, previous)

    assert other_table.techniques == (COLECISTECTOMIA,)
    assert other_table.instruments == (KELLY,)
    assert other_piece.techniques == (MASTECTOMIA,)
    assert other_piece.instruments == (ALLIS,)


def test_a_new_question_does_not_carry_the_previous_one():
    previous = (Turn("¿Qué es la Kelly?"),)

    focus = focus_of("¿Qué es la mastectomía?", CATALOG, None, previous)

    assert focus.instruments == ()
    assert not focus.carried


def test_a_described_technique_counts_as_named():
    focus = focus_of("Quiero ver la cirugía para quitar la vesícula", CATALOG, None)

    assert focus.techniques == (COLECISTECTOMIA,)
    assert focus.named


def test_the_first_word_of_a_name_is_enough():
    assert techniques_named(CATALOG, "la tiroidectomia y la colecistectomia") == [
        TIROIDECTOMIA,
        COLECISTECTOMIA,
    ]


def test_asking_how_it_is_used_in_a_technique_keeps_the_previous_instrument():
    previous = (Turn("Háblame de la pinza Kelly"),)

    focus = focus_of("¿Cómo se usa en la colecistectomía?", CATALOG, None, previous)

    assert focus.techniques == (COLECISTECTOMIA,)
    assert focus.instruments == (KELLY,)


def test_what_a_technique_is_for_does_not_keep_the_previous_instrument():
    previous = (Turn("Háblame de la pinza Kelly"),)

    focus = focus_of("¿Para qué sirve la colecistectomía?", CATALOG, None, previous)

    assert focus.instruments == ()
