from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TecnicaResumenSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str
    especialidad: str
    numero_version: int
