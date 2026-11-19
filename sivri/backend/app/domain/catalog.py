import unicodedata
from dataclasses import dataclass
from uuid import UUID

# Así se llama la mesa de Mayo en DataIQ (zones.name). El MVP solo valida esa.
MAYO = "Mesa de Mayo"
# El MVP: la mesa de Mayo de las técnicas de esta especialidad.
SCOPE_SPECIALTY = "Cirugía General"


@dataclass(frozen=True)
class Cell:
    """Una celda de la cuadrícula de una mesa; la fila 1 es la de arriba y la
    columna 1, la de la izquierda."""

    row: int
    column: int


@dataclass(frozen=True)
class Instrument:
    id: UUID
    name: str
    aliases: tuple[str, ...]


@dataclass(frozen=True)
class TableItem:
    """Un objeto de la mesa de Mayo: su número en el diagrama de IQ, las celdas
    que ocupa y lo que es (un objeto compuesto, «X y Y», trae varios
    instrumentos)."""

    legend_number: int | None
    name: str
    instrument_ids: tuple[UUID, ...]
    cells: tuple[Cell, ...]


@dataclass(frozen=True)
class Technique:
    """Una técnica con su mesa de Mayo: la cuadrícula es de `rows` × `columns` y
    cada objeto va en sus celdas."""

    id: UUID
    name: str
    rows: int
    columns: int
    items: tuple[TableItem, ...]


@dataclass(frozen=True)
class Catalog:
    """Lo que SIVRI le pide a DataIQ: las técnicas con su mesa de Mayo y el
    instrumental. Es una copia de paso, nunca la fuente de verdad."""

    techniques: tuple[Technique, ...]
    instruments: tuple[Instrument, ...]

    def technique(self, technique_id: UUID) -> Technique | None:
        return next((t for t in self.techniques if t.id == technique_id), None)


def normalize(text: str) -> str:
    """Para comparar nombres sin importar mayúsculas, tildes ni espacios."""
    without_accents = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        c for c in without_accents if unicodedata.category(c) != "Mn"
    )
    return " ".join(without_accents.split())
