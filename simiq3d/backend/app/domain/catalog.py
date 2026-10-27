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
    sin_tildes = unicodedata.normalize("NFD", text.lower())
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return " ".join(sin_tildes.split())


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
