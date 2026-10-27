from app.domain import tools
from app.domain.grounding import unsupported
from tests.sample import ALLIS, CATALOG, COLECISTECTOMIA, KELLY


def test_finding_an_instrument_lists_its_tables_and_counts_them():
    result = tools.find_instrument(CATALOG, "allis")

    assert result["instrumento"] == "Pinza de Allis"
    assert result["total_tecnicas"] == 2
    assert result["en_tecnicas"][0] == {
        "tecnica": "Colecistectomía",
        "numero_en_el_diagrama": 5,
        "ubicacion": "arriba a la izquierda",
        "junto_a": [],
    }
    # La cuadrícula no se le pasa al modelo.
    assert "fila" not in str(result) and "celda" not in str(result)
    assert result["descripcion"] == tools.NO_DATA


def test_an_unknown_name_returns_suggestions_instead_of_guessing():
    result = tools.find_instrument(CATALOG, "pinza alis")

    assert "error" in result
    assert result["quizas"][0] == "Pinza de Allis"


def test_a_technique_brings_its_clinical_data_and_table():
    result = tools.get_technique(CATALOG, "colecistectomia")

    assert result["tecnica"] == "Colecistectomía"
    assert result["indicaciones"] == "Colelitiasis sintomática."
    assert result["complicaciones"] == tools.NO_DATA
    assert result["total_objetos"] == 4


def test_techniques_outside_the_mvp_are_not_found():
    assert "error" in tools.get_technique(CATALOG, "Cesárea")


def test_the_scene_only_highlights_an_instrument_of_that_table():
    scene = tools.show_in_3d(CATALOG, "Colecistectomía", "Kelly")
    wrong = tools.show_in_3d(CATALOG, "Mastectomía", "Separador de Farabeuf")

    assert scene == tools.Scene(COLECISTECTOMIA, KELLY)
    assert "error" in wrong


def test_an_answer_backed_by_the_results_passes():
    results = [tools.find_instrument(CATALOG, "Allis")]

    text = (
        "La Pinza de Allis va en 2 técnicas: Colecistectomía (número 5) y Mastectomía."
    )

    assert unsupported(text, results, CATALOG) == []


def test_names_and_numbers_the_results_do_not_have_are_caught():
    results = [tools.find_instrument(CATALOG, "Allis")]

    text = "La Allis va en 7 técnicas, junto a la Pinza Kelly y la Pinza de Crile."

    assert unsupported(text, results, CATALOG) == ["Pinza Kelly", "Pinza de Crile", "7"]


def test_a_technique_not_consulted_is_caught():
    results = [tools.find_instrument(CATALOG, ALLIS.name)]

    assert unsupported("También va en la Tiroidectomía.", results, CATALOG) == [
        "Tiroidectomía"
    ]


def test_the_grid_is_never_mentioned_to_the_student():
    results = [tools.find_instrument(CATALOG, "Kelly")]

    assert (
        unsupported("Va en el centro, junto a la Tijera de Mayo.", results, CATALOG)
        == []
    )
    assert unsupported("Va en la fila 3, columna 4.", results, CATALOG) == [
        "3",
        "4",
        "habla de la cuadrícula",
    ]


def test_a_place_that_the_results_do_not_say_is_caught():
    results = [tools.find_instrument(CATALOG, "Kelly")]

    assert unsupported("Va abajo a la izquierda.", results, CATALOG) == [
        "abajo a la izquierda"
    ]


def test_the_technique_list_comes_ordered_by_objects():
    result = tools.list_techniques(CATALOG)

    assert result["tecnicas"][0] == {
        "tecnica": "Colecistectomía",
        "objetos_en_la_mesa": 4,
    }


def test_two_tables_can_be_compared():
    result = tools.compare_techniques(CATALOG, "colecistectomia", "Mastectomía")

    assert result["en_las_dos"] == ["Pinza Kelly", "Pinza de Allis"]
    assert result["solo_en_colecistectomia"] == [
        "Separador de Farabeuf",
        "Tijera de Mayo",
    ]
    assert result["solo_en_mastectomia"] == []


def test_generalizing_a_place_that_changes_is_caught():
    # La Allis: arriba a la izquierda en Colecistectomía, arriba al centro en
    # Mastectomía.
    results = [tools.find_instrument(CATALOG, "Allis")]

    assert unsupported("En todas va en el mismo lugar.", results, CATALOG) == [
        "generaliza una ubicación que cambia entre técnicas"
    ]
