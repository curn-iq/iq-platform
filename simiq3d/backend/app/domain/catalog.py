from dataclasses import dataclass
from uuid import UUID

# Así se llama la mesa de Mayo en DataIQ (zones.name). El MVP solo muestra esa.
MAYO = "Mesa de Mayo"


@dataclass(frozen=True)
class Instrument:
    id: UUID
    name: str
    aliases: tuple[str, ...]
    # La descripción breve que se muestra al tocar el instrumento; puede faltar.
    description: str | None


@dataclass(frozen=True)
class Cell:
    row: int
    column: int


@dataclass(frozen=True)
class TableItem:
    """Un objeto de una mesa: su número en la leyenda, sus celdas y lo que es
    (un objeto compuesto, «X con Y», trae varios instrumentos)."""

    zone: str
    legend_number: int | None
    # Con los nombres del catálogo, para mostrar («Mango de bisturí N.° 4 y
    # Hoja de bisturí #20»); el texto literal del documento de IQ, aparte.
    name: str
    source_text: str
    instrument_ids: tuple[UUID, ...]
    cells: tuple[Cell, ...]


@dataclass(frozen=True)
class Technique:
    """Una técnica publicada, con lo que el chat sabe responder de ella."""

    id: UUID
    name: str
    specialty: str
    description: str | None
    indications: str | None
    complications: str | None
    anesthesia: str | None
    patient_position: str | None
    items: tuple[TableItem, ...]

    def mayo_items(self) -> tuple[TableItem, ...]:
        return tuple(i for i in self.items if i.zone == MAYO)


@dataclass(frozen=True)
class Catalog:
    """Lo que SIMIQ3D le pide a DataIQ: las técnicas publicadas y el
    instrumental. Es una copia de paso, nunca la fuente de verdad."""

    techniques: tuple[Technique, ...]
    instruments: tuple[Instrument, ...]
