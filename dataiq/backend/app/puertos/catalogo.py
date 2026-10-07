from typing import Protocol

from app.dominio.catalogo import Instrumento


class RepositorioCatalogo(Protocol):
    async def listar_instrumental(self) -> list[Instrumento]: ...
