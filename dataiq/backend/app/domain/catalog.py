from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CatalogInstrument:
    id: UUID
    name: str
    category: str
    description: str | None
    # Variantes del nombre en los documentos fuente (InstrumentAlias)
    aliases: tuple[str, ...]


@dataclass(frozen=True)
class Reference:
    """Algo del catálogo que solo tiene nombre: especialidad, zona o categoría."""

    id: UUID
    name: str


@dataclass(frozen=True)
class CatalogSuture:
    id: UUID
    name: str
    gauge: str | None
    needle_type: str | None


@dataclass(frozen=True)
class InstrumentChanges:
    """Lo que se cambia de un instrumento; None deja el valor como está."""

    name: str | None = None
    category_id: UUID | None = None
    description: str | None = None
    # Si se manda, reemplaza todos los alias del instrumento
    aliases: tuple[str, ...] | None = None
