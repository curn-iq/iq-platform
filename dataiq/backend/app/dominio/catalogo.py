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
