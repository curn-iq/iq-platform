from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class Instrumento:
    id: UUID
    nombre: str
    categoria: str
    descripcion: str | None
    # Variantes del nombre en los documentos fuente (InstrumentalAlias)
    alias: tuple[str, ...]


@dataclass(frozen=True)
class Referencia:
    """Algo del catálogo que solo tiene nombre: especialidad, zona o categoría."""

    id: UUID
    nombre: str


@dataclass(frozen=True)
class SuturaCatalogo:
    id: UUID
    nombre: str
    calibre: str | None
    tipo_aguja: str | None


@dataclass(frozen=True)
class CambiosInstrumento:
    """Lo que se cambia de un instrumento; None deja el valor como está."""

    nombre: str | None = None
    categoria_id: UUID | None = None
    descripcion: str | None = None
