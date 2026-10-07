from collections.abc import Iterable
from typing import Protocol
from uuid import UUID

from app.dominio.tecnicas import (
    ContenidoVersion,
    EstadoVersion,
    TecnicaDetalle,
    TecnicaResumen,
    VersionDetalle,
    VersionResumen,
)


class RepositorioTecnicas(Protocol):
    async def listar_publicadas(self) -> list[TecnicaResumen]: ...

    async def obtener_publicada(self, tecnica_id: UUID) -> TecnicaDetalle | None: ...

    async def listar_detalles_publicadas(self) -> list[TecnicaDetalle]: ...


class RepositorioVersiones(Protocol):
    async def listar(
        self, estados: Iterable[EstadoVersion], creado_por: UUID | None = None
    ) -> list[VersionResumen]: ...

    async def obtener_resumen(self, version_id: UUID) -> VersionResumen | None: ...

    async def obtener(self, version_id: UUID) -> VersionDetalle | None: ...

    async def obtener_publicada_de(self, tecnica_id: UUID) -> VersionResumen | None: ...

    async def tiene_version_en_curso(self, tecnica_id: UUID) -> bool: ...

    async def crear_tecnica(
        self, nombre: str, especialidad_id: UUID, autor_id: UUID
    ) -> UUID: ...

    async def crear_desde_publicada(self, tecnica_id: UUID, autor_id: UUID) -> UUID: ...

    async def reemplazar_contenido(
        self, version_id: UUID, contenido: ContenidoVersion
    ) -> None: ...

    async def cambiar_estado(
        self,
        version_id: UUID,
        desde: EstadoVersion,
        hacia: EstadoVersion,
        revisor_id: UUID | None = None,
    ) -> None: ...

    async def rechazar(
        self, version_id: UUID, revisor_id: UUID, motivo: str
    ) -> None: ...
