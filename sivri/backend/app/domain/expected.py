from dataclasses import dataclass
from uuid import UUID

from app.domain.catalog import Cell, Technique
from app.domain.classes import ClassMap


@dataclass(frozen=True)
class ExpectedObject:
    """Un instrumento que la técnica espera en la mesa y las celdas donde va."""

    legend_number: int | None
    instrument_id: UUID
    label: str
    cells: tuple[Cell, ...]


def expected_objects(technique: Technique, classes: ClassMap) -> list[ExpectedObject]:
    """Lo que la mesa de Mayo de la técnica debe llevar y el modelo puede ver.

    Un objeto compuesto da un instrumento por componente («Pinza de disección con
    garra y sin garra» son dos en la misma celda). Lo que el modelo no tiene como
    clase (las hojas de bisturí, que van montadas en su mango) no se espera: no
    hay cómo verlo.
    """
    expected = []
    for item in technique.items:
        for instrument_id in item.instrument_ids:
            label = classes.label(instrument_id)
            if label is not None:
                expected.append(
                    ExpectedObject(item.legend_number, instrument_id, label, item.cells)
                )
    return expected
