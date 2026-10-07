from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.dominio.errores import SinPermiso


class RolUsuario(StrEnum):
    usuario = "usuario"
    colaborador = "colaborador"
    revisor = "revisor"
    admin = "admin"


# Los roles son acumulativos: cada uno puede todo lo del anterior.
ORDEN_ROLES = [
    RolUsuario.usuario,
    RolUsuario.colaborador,
    RolUsuario.revisor,
    RolUsuario.admin,
]


def tiene_al_menos(rol: RolUsuario, minimo: RolUsuario) -> bool:
    return ORDEN_ROLES.index(rol) >= ORDEN_ROLES.index(minimo)


def exigir_rol(rol: RolUsuario, minimo: RolUsuario) -> None:
    if not tiene_al_menos(rol, minimo):
        raise SinPermiso(f"Hace falta el rol {minimo} o uno mayor")


@dataclass(frozen=True)
class Cuenta:
    id: UUID
    nombre: str
    email: str
    rol: RolUsuario
