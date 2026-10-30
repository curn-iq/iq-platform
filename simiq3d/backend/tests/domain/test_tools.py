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

    assert unsupported(text, results, CATALOG) == [
        "Pinza Kelly",
        "Pinza de Crile",
        "7",
        "7 tecnicas",
    ]


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
    assert result["cuantos_en_las_dos"] == 2
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


def test_the_tools_do_not_break_with_an_object_without_position_or_number():
    from dataclasses import replace

    from app.domain.catalog import Catalog

    kelly = next(i for i in COLECISTECTOMIA.items if i.name == "Pinza Kelly")
    broken = replace(kelly, cells=(), legend_number=None)
    technique = replace(
        COLECISTECTOMIA,
        items=tuple(broken if i is kelly else i for i in COLECISTECTOMIA.items),
    )
    catalog = Catalog(
        techniques=(technique, *CATALOG.techniques[1:]), instruments=CATALOG.instruments
    )

    found = tools.find_instrument(catalog, "Kelly")["en_tecnicas"][0]
    table = tools.get_technique(catalog, "Colecistectomía")

    assert found["ubicacion"] == tools.NO_DATA
    assert found["numero_en_el_diagrama"] == tools.NO_DATA
    assert table["total_objetos"] == 4


def test_a_count_must_be_one_of_the_totals():
    # El 7 aparece (es el número del Farabeuf en el diagrama), pero la mesa
    # lleva 4 objetos.
    results = [tools.get_technique(CATALOG, "Colecistectomía")]

    assert unsupported("La mesa lleva 4 objetos.", results, CATALOG) == []
    assert unsupported("La mesa lleva 7 objetos.", results, CATALOG) == ["7 objetos"]
    assert unsupported("Lleva cuatro instrumentos.", results, CATALOG) == []
    assert unsupported("Lleva siete instrumentos.", results, CATALOG) == [
        "siete instrumentos"
    ]


def test_counts_from_comparisons_and_lists_are_accepted():
    results = [
        tools.compare_techniques(CATALOG, "Colecistectomía", "Mastectomía"),
        tools.list_techniques(CATALOG),
        tools.find_instrument(CATALOG, "Allis"),
    ]

    assert unsupported("Comparten 2 instrumentos.", results, CATALOG) == []
    assert unsupported("Hay tres técnicas.", results, CATALOG) == []
    assert unsupported("La Allis va en dos técnicas.", results, CATALOG) == []
    assert unsupported("Comparten 6 instrumentos.", results, CATALOG) == [
        "6",
        "6 instrumentos",
    ]


def test_3d_is_not_a_number_to_check():
    results = [tools.get_technique(CATALOG, "Colecistectomía")]

    assert unsupported("Ya está abierta en el visor 3D.", results, CATALOG) == []
    assert unsupported("¿Quieres verla en 3D?", results, CATALOG) == []
    assert unsupported("Mide 3 cm.", results, CATALOG) == ["3"]
