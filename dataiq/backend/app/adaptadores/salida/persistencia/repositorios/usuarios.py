from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.usuarios import Usuario
from app.dominio.errores import Conflicto, NoEncontrado
from app.dominio.usuarios import Cuenta, RolUsuario


def _cuenta(usuario: Usuario) -> Cuenta:
    return Cuenta(
        id=usuario.id, nombre=usuario.nombre, email=usuario.email, rol=usuario.rol
    )


class RepositorioUsuariosSQLAlchemy:
    def __init__(self, sesion: AsyncSession) -> None:
        self._sesion = sesion

    async def obtener(self, usuario_id: UUID) -> Cuenta | None:
        usuario = await self._sesion.get(Usuario, usuario_id)
        return _cuenta(usuario) if usuario else None

    async def obtener_con_hash(self, email: str) -> tuple[Cuenta, str] | None:
        usuario = await self._sesion.scalar(
            select(Usuario).where(Usuario.email == email)
        )
        return (_cuenta(usuario), usuario.password_hash) if usuario else None

    async def crear(
        self, nombre: str, email: str, password_hash: str, version_politica: str
    ) -> Cuenta:
        existe = await self._sesion.scalar(
            select(Usuario.id).where(Usuario.email == email)
        )
        if existe:
            raise Conflicto("Ya hay una cuenta con ese correo")
        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=password_hash,
            rol=RolUsuario.usuario,
            fecha_aceptacion_politica=datetime.now(UTC),
            version_politica=version_politica,
        )
        self._sesion.add(usuario)
        await self._sesion.flush()
        cuenta = _cuenta(usuario)
        await self._sesion.commit()
        return cuenta

    async def listar(self) -> list[Cuenta]:
        usuarios = await self._sesion.scalars(
            select(Usuario).order_by(Usuario.nombre, Usuario.email)
        )
        return [_cuenta(u) for u in usuarios]

    async def cambiar_rol(self, usuario_id: UUID, rol: RolUsuario) -> Cuenta:
        usuario = await self._sesion.get(Usuario, usuario_id, with_for_update=True)
        if usuario is None:
            raise NoEncontrado("La cuenta no existe")
        usuario.rol = rol
        await self._sesion.flush()
        cuenta = _cuenta(usuario)
        await self._sesion.commit()
        return cuenta
