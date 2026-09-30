from typing import Protocol
from uuid import UUID

from app.dominio.tecnicas import TecnicaDetalle, TecnicaResumen


class RepositorioTecnicas(Protocol):
    async def listar_publicadas(self) -> list[TecnicaResumen]: ...

    async def obtener_publicada(self, tecnica_id: UUID) -> TecnicaDetalle | None: ...
