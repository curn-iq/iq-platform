from typing import Protocol

from app.dominio.tecnicas import TecnicaResumen


class RepositorioTecnicas(Protocol):
    async def listar_publicadas(self) -> list[TecnicaResumen]: ...
