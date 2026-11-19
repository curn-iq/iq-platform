from uuid import NAMESPACE_DNS, UUID, uuid5

from app.domain.catalog import Cell, TableItem, Technique
from app.domain.classes import ClassEntry, ClassMap
from app.domain.validation import PlacedDetection
from app.domain.vision import Box, Detection


def uid(name: str) -> UUID:
    return uuid5(NAMESPACE_DNS, name)


KELLY = "Pinza Kelly"
ALLIS = "Pinza de Allis"
METZ = "Tijera de Metzenbaum"
MAYO_SCISSORS = "Tijera de Mayo"

CLASSES = ClassMap(ClassEntry(n, uid(n)) for n in (KELLY, ALLIS, METZ, MAYO_SCISSORS))


def item(number: int, name: str, *cells: tuple[int, int]) -> TableItem:
    return TableItem(number, name, (uid(name),), tuple(Cell(r, c) for r, c in cells))


def technique(name: str, rows: int, columns: int, *items: TableItem) -> Technique:
    return Technique(uid(name), name, rows, columns, tuple(items))


def seen(
    label: str, row: float, column: float, confidence: float = 0.9
) -> PlacedDetection:
    """Un instrumento visto con el centro de su caja en (row, column) de la
    cuadrícula, en unidades de celda (la celda 1,1 va de 0 a 1). Ya en la mesa:
    u y v se calculan con la cuadrícula de la técnica de las pruebas (4 × 4)."""
    box = Box(0, 0, 1, 1)
    return PlacedDetection(Detection(label, box, confidence), column / 4, row / 4)
