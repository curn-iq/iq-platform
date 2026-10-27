import unicodedata
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
    # Filas y columnas de la cuadrícula de su mesa de Mayo. La cuadrícula es
    # cómo se guarda el arreglo: no se le muestra al estudiante (la mesa real es
    # un campo sin líneas); de ella salen la zona y los vecinos de cada objeto.
    mayo_size: tuple[int, int] | None = None

    def mayo_items(self) -> tuple[TableItem, ...]:
        return tuple(i for i in self.items if i.zone == MAYO)


@dataclass(frozen=True)
class Catalog:
    """Lo que SIMIQ3D le pide a DataIQ: las técnicas publicadas y el
    instrumental. Es una copia de paso, nunca la fuente de verdad."""

    techniques: tuple[Technique, ...]
    instruments: tuple[Instrument, ...]


# El MVP de SIMIQ3D: la mesa de Mayo de las técnicas de esta especialidad.
SCOPE_SPECIALTY = "Cirugía General"


def normalize(text: str) -> str:
    """Para comparar nombres sin importar mayúsculas, tildes ni espacios."""
    without_accents = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        c for c in without_accents if unicodedata.category(c) != "Mn"
    )
    return " ".join(without_accents.split())


def in_scope(catalog: Catalog) -> tuple[Technique, ...]:
    """Las técnicas que SIMIQ3D muestra en 3D."""
    return tuple(
        t
        for t in catalog.techniques
        if t.specialty == SCOPE_SPECIALTY and t.mayo_items()
    )


def find_technique(catalog: Catalog, name: str | None) -> Technique | None:
    if not name:
        return None
    wanted = normalize(name)
    return next((t for t in in_scope(catalog) if normalize(t.name) == wanted), None)


def technique_by_id(catalog: Catalog, technique_id: UUID | None) -> Technique | None:
    if technique_id is None:
        return None
    return next((t for t in in_scope(catalog) if t.id == technique_id), None)


def find_instrument(catalog: Catalog, name: str | None) -> Instrument | None:
    """Por su nombre o por cualquiera de sus alias."""
    if not name:
        return None
    wanted = normalize(name)
    for instrument in catalog.instruments:
        if wanted in (normalize(n) for n in (instrument.name, *instrument.aliases)):
            return instrument
    return None


def scope_instruments(catalog: Catalog) -> tuple[Instrument, ...]:
    """El instrumental de las mesas de Mayo del MVP."""
    ids = {
        i
        for t in in_scope(catalog)
        for item in t.mayo_items()
        for i in item.instrument_ids
    }
    return tuple(i for i in catalog.instruments if i.id in ids)


def item_with(technique: Technique, instrument_id: UUID) -> TableItem | None:
    """El objeto de la mesa de Mayo que lleva ese instrumento."""
    return next(
        (i for i in technique.mayo_items() if instrument_id in i.instrument_ids), None
    )


# --- Dónde está un objeto, dicho como en la práctica ---------------------------

_PLACES = {
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
PLACE_PHRASES = tuple(_PLACES.values())


def _third(position: float, size: int, low: str, high: str) -> str:
    fraction = (position - 0.5) / size
    return low if fraction < 1 / 3 else high if fraction >= 2 / 3 else "centro"


def place(technique: Technique, item: TableItem) -> str | None:
    """La zona de la mesa donde va el objeto, como se ve en el diagrama y en el
    visor (la fila 1 arriba): «arriba a la derecha», «abajo, al centro». Se usa
    en vez de la fila y la columna. None si DataIQ no tiene sus celdas: DataIQ
    permite publicar un objeto de la mesa sin posición."""
    if not item.cells:
        return None
    all_cells = [c for i in technique.mayo_items() for c in i.cells]
    rows, columns = technique.mayo_size or (
        max(c.row for c in all_cells),
        max(c.column for c in all_cells),
    )
    row = sum(c.row for c in item.cells) / len(item.cells)
    column = sum(c.column for c in item.cells) / len(item.cells)
    return _PLACES[
        (
            _third(row, rows, "arriba", "abajo"),
            _third(column, columns, "izquierda", "derecha"),
        )
    ]


def neighbors(technique: Technique, item: TableItem) -> tuple[TableItem, ...]:
    """Los objetos que tiene al lado (en las celdas vecinas, también en diagonal),
    en orden del diagrama: así se ubica una pieza en una mesa real."""
    near = []
    for other in technique.mayo_items():
        if other is item:
            continue
        if any(
            abs(a.row - b.row) <= 1 and abs(a.column - b.column) <= 1
            for a in item.cells
            for b in other.cells
        ):
            near.append(other)
    return tuple(sorted(near, key=lambda i: i.legend_number or 99))
