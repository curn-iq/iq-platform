from typing import Protocol
from uuid import UUID

from app.dominio.usuarios import Cuenta, RolUsuario


class RepositorioUsuarios(Protocol):
    async def obtener(self, usuario_id: UUID) -> Cuenta | None: ...

    async def obtener_con_hash(self, email: str) -> tuple[Cuenta, str] | None: ...

    async def crear(
        self, nombre: str, email: str, password_hash: str, version_politica: str
    ) -> Cuenta: ...

    async def listar(self) -> list[Cuenta]: ...

    async def cambiar_rol(self, usuario_id: UUID, rol: RolUsuario) -> Cuenta: ...
