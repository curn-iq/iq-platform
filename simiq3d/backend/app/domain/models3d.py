from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class ModelFile:
    """Qué modelo 3D (GLB servido con el frontend) dibuja un instrumento de DataIQ."""

    instrument_id: UUID
    model_file: str
