from dataclasses import replace

from app.domain import tools
from app.domain.catalog import Catalog
from app.domain.chat import ChatAction, Choice, answer
from tests.sample import CATALOG, CESAREA, COLECISTECTOMIA, MASTECTOMIA


def test_a_technique_is_found_by_what_its_description_says():
    found = tools.technique_described(CATALOG, "la cirugía para quitar la vesícula")

    assert found == COLECISTECTOMIA


def test_instrument_names_in_a_description_do_not_point_to_a_technique():
    # Como la colecistectomía, que se hace por una incisión de Kocher, siendo
    # «Kocher» un instrumento de estas mesas.
    kelly = replace(COLECISTECTOMIA, description="Por incisión de Kelly.")
    catalog = Catalog((kelly, MASTECTOMIA), CATALOG.instruments)

    assert tools.technique_described(catalog, "la Kelly") is None


def test_a_technique_of_another_specialty_is_found_apart():
    assert tools.out_of_scope_technique(CATALOG, "¿Qué lleva la cesárea?") == CESAREA
    assert tools.out_of_scope_technique(CATALOG, "¿Qué es la mastectomía?") is None


def test_a_short_word_matches_the_beginning_of_a_description_word():
    breast = replace(MASTECTOMIA, description="Extirpación de la glándula mamaria.")
    catalog = Catalog((COLECISTECTOMIA, breast), CATALOG.instruments)

    assert tools.technique_described(catalog, "la mesa para quitar la mama") == breast
    assert tools.technique_described(catalog, "¿Para qué sirve la mesa?") is None


def test_an_object_without_position_or_number_does_not_break_the_answer():
    kelly = next(i for i in COLECISTECTOMIA.items if i.name == "Pinza Kelly")
    broken = replace(kelly, cells=(), legend_number=None)
    technique = replace(
        COLECISTECTOMIA,
        items=tuple(broken if i is kelly else i for i in COLECISTECTOMIA.items),
    )
    catalog = Catalog(
        techniques=(technique, *CATALOG.techniques[1:]), instruments=CATALOG.instruments
    )

    reply = answer(
        Choice(ChatAction.highlight_instrument, "Colecistectomía", "Pinza Kelly"),
        catalog,
        None,
    )

    assert "DataIQ todavía no tiene su posición" in reply.reply
