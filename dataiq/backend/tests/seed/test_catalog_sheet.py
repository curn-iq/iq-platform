import re

from openpyxl import load_workbook

from seed.load import SOURCE_FILE, _rows, read_file

# SIMIQ3D muestra la descripción al estudiante, y ahí no se habla de la cuadrícula
GRID_WORDS = re.compile(r"\b(?:filas?|columnas?|celdas?|cuadr[ií]cula)\b", re.I)


def test_every_description_has_its_sources():
    workbook = load_workbook(SOURCE_FILE, read_only=True)
    described = [f for f in _rows(workbook, "catalogo") if f["descripcion"]]

    assert described
    for f in described:
        assert f["fuentes_descripcion"], f["nombre"]
        assert not GRID_WORDS.search(f["descripcion"]), f["nombre"]


def test_a_corrected_name_keeps_the_old_one_as_alias():
    techniques, catalog = read_file(SOURCE_FILE)

    aliases = {i.name: i.aliases for i in catalog}
    assert aliases["Pinza de Moynihan"] == ("Pinza Moninjan",)
    assert "Pinza Moninjan" not in aliases
    components = {
        c for t in techniques.values() for item in t.items for c in item.components
    }
    assert "Pinza de Moynihan" in components
