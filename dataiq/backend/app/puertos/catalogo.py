from typing import Protocol
from uuid import UUID

from app.dominio.catalogo import (
    CambiosInstrumento,
    Instrumento,
    Referencia,
    SuturaCatalogo,
)
from app.dominio.tecnicas import Dispositivo, Equipo


class RepositorioCatalogo(Protocol):
    async def listar_instrumental(self) -> list[Instrumento]: ...

    async def obtener_instrumento(self, instrumento_id: UUID) -> Instrumento | None: ...

    async def crear_instrumento(
        self, nombre: str, categoria_id: UUID, descripcion: str | None
    ) -> Instrumento: ...

    async def editar_instrumento(
        self, instrumento_id: UUID, cambios: CambiosInstrumento
    ) -> Instrumento: ...

    async def listar_especialidades(self) -> list[Referencia]: ...

    async def listar_zonas(self) -> list[Referencia]: ...

    async def listar_categorias(self) -> list[Referencia]: ...

    async def listar_suturas(self) -> list[SuturaCatalogo]: ...

    async def listar_equipos(self) -> list[Equipo]: ...

    async def listar_dispositivos(self) -> list[Dispositivo]: ...
