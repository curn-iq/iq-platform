from collections.abc import Iterable
from dataclasses import dataclass
from uuid import UUID

from app.domain.catalog import normalize


@dataclass(frozen=True)
class ClassEntry:
    """El nombre de la clase en el modelo y el id de su instrumento en DataIQ."""

    label: str
    instrument_id: UUID


class ClassMap:
    """El mapeo clase del modelo ↔ instrumento de DataIQ. Los ids cambian de una
    instalación a otra, por eso se traduce por nombre en cada entorno
    (`app.adapters.inbound.cli.load_classes`)."""

    def __init__(self, entries: Iterable[ClassEntry] = ()) -> None:
        entries = list(entries)
        self._by_label = {normalize(e.label): e for e in entries}
        self._by_instrument = {e.instrument_id: e for e in entries}

    def instrument_id(self, label: str) -> UUID | None:
        entry = self._by_label.get(normalize(label))
        return entry.instrument_id if entry else None

    def label(self, instrument_id: UUID) -> str | None:
        entry = self._by_instrument.get(instrument_id)
        return entry.label if entry else None

    def __len__(self) -> int:
        return len(self._by_instrument)
