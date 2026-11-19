"""Cómo se le dice al estudiante dónde va un instrumento.

A estudiantes y docentes no se les habla de filas, columnas ni celdas (la cuadrícula
de DataIQ es solo cómo se guarda el arreglo): se les dice la zona de la mesa, lo que
tiene al lado y su número en el diagrama de IQ. Es la misma forma que usa SIMIQ3D.
"""

from app.domain.catalog import Cell, TableItem, Technique

# Cuántos vecinos se nombran: con más, la frase deja de servir para ubicarse.
MAX_NEIGHBORS = 3

_ZONES = {
    ("arriba", "izquierda"): "arriba a la izquierda",
    ("arriba", "centro"): "arriba, al centro",
    ("arriba", "derecha"): "arriba a la derecha",
    ("centro", "izquierda"): "en el centro, a la izquierda",
    ("centro", "centro"): "en el centro",
    ("centro", "derecha"): "en el centro, a la derecha",
    ("abajo", "izquierda"): "abajo a la izquierda",
    ("abajo", "centro"): "abajo, al centro",
    ("abajo", "derecha"): "abajo a la derecha",
}


def _third(position: float, size: int, low: str, high: str) -> str:
    fraction = (position - 0.5) / size
    return low if fraction < 1 / 3 else high if fraction >= 2 / 3 else "centro"


def zone(technique: Technique, cells: tuple[Cell, ...]) -> str | None:
    """La zona de la mesa donde van esas celdas, con la fila 1 arriba: «arriba a la
    derecha», «abajo, al centro». None si el objeto no tiene celdas (DataIQ permite
    publicar un objeto sin posición)."""
    if not cells:
        return None
    row = sum(c.row for c in cells) / len(cells)
    column = sum(c.column for c in cells) / len(cells)
    return _ZONES[
        (
            _third(row, technique.rows, "arriba", "abajo"),
            _third(column, technique.columns, "izquierda", "derecha"),
        )
    ]


def neighbors(technique: Technique, cells: tuple[Cell, ...]) -> list[TableItem]:
    """Los objetos que quedan al lado de esas celdas (también en diagonal), en el
    orden del diagrama."""
    near = [
        other
        for other in technique.items
        if other.cells
        and other.cells != cells
        and any(
            abs(a.row - b.row) <= 1 and abs(a.column - b.column) <= 1
            for a in cells
            for b in other.cells
        )
    ]
    return sorted(near, key=lambda i: i.legend_number or 99)


def _numbered(name: str, legend_number: int | None) -> str:
    return f"{name} (n.º {legend_number})" if legend_number else name


def _list(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return f"{', '.join(names[:-1])} y {names[-1]}"


def where(technique: Technique, cells: tuple[Cell, ...]) -> str | None:
    """«en el centro, a la derecha, junto a Pinza Rochester (n.º 3)»: la zona y lo
    que tiene al lado. None si no se puede ubicar."""
    place = zone(technique, cells)
    if place is None:
        return None
    near = [
        _numbered(i.name, i.legend_number)
        for i in neighbors(technique, cells)[:MAX_NEIGHBORS]
    ]
    return f"{place}, junto a {_list(near)}" if near else place


def move_message(
    technique: Technique, label: str, legend_number: int | None, cells: tuple[Cell, ...]
) -> str:
    """Lo que se le dice al estudiante de un instrumento que hay que mover."""
    name = _numbered(label, legend_number)
    place = where(technique, cells)
    return f"{name}: va {place}." if place else f"{name}: hay que moverlo."


def missing_message(
    technique: Technique, label: str, legend_number: int | None, cells: tuple[Cell, ...]
) -> str:
    """Lo que se le dice al estudiante de un instrumento que no aparece."""
    name = _numbered(label, legend_number)
    place = where(technique, cells)
    return f"Falta {name}: va {place}." if place else f"Falta {name}."


def extra_message(label: str) -> str:
    """Lo que se le dice al estudiante de un instrumento que no va en la mesa."""
    return f"Sobra {label}: no va en esta mesa."
