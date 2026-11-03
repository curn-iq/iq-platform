from dataclasses import replace

from app.domain import tools
from app.domain.catalog import Catalog
from app.domain.requests import Request, RequestKind, respond
from tests.sample import CATALOG, COLECISTECTOMIA, MASTECTOMIA


def test_an_unknown_name_returns_suggestions_instead_of_guessing():
    result = tools.resolve_instrument(CATALOG, "pinza alis")

    assert "error" in result
    assert result["quizas"][0] == "Pinza de Allis"


def test_a_technique_is_found_by_what_its_description_says():
    found = tools.resolve_technique(CATALOG, "la cirugía para quitar la vesícula")

    assert found == COLECISTECTOMIA


def test_instrument_names_in_a_description_do_not_point_to_a_technique():
    # Como la colecistectomía, que se hace por una incisión de Kocher, siendo
    # «Kocher» un instrumento de estas mesas.
    kelly = replace(COLECISTECTOMIA, description="Por incisión de Kelly.")
    catalog = Catalog((kelly, MASTECTOMIA), CATALOG.instruments)

    assert tools.technique_described(catalog, "la Kelly") is None


def test_a_technique_of_another_specialty_is_out_of_scope():
    result = tools.resolve_technique(CATALOG, "cesárea")

    assert result["fuera_de_alcance"] is True
    assert "Cesárea es una técnica de Ginecología" in result["error"]
    assert "quizas" not in result


def test_only_a_misspelling_gets_suggestions():
    unknown = tools.resolve_technique(CATALOG, "apendicectomía")
    misspelled = tools.resolve_technique(CATALOG, "colecistetomia")

    assert unknown["fuera_de_alcance"] is True
    assert "quizas" not in unknown
    assert misspelled["quizas"] == ["Colecistectomía"]


def test_a_technique_asked_as_an_instrument_is_said_to_be_a_technique():
    result = tools.resolve_instrument(CATALOG, "mastectomía")

    assert result["error"] == "«mastectomía» es una técnica, no un instrumento"


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

    reply = respond(
        [Request(RequestKind.locate, "Colecistectomía", "Kelly")], catalog, None
    )

    assert reply.reply == (
        "La Pinza Kelly va en la mesa de Mayo de Colecistectomía, pero DataIQ "
        "todavía no tiene su posición."
    )
