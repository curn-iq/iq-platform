from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from app.domain.errors import Forbidden


class Role(StrEnum):
    user = "user"
    contributor = "contributor"
    reviewer = "reviewer"
    admin = "admin"


# Los roles son acumulativos: cada uno puede todo lo del anterior.
ROLE_ORDER = [
    Role.user,
    Role.contributor,
    Role.reviewer,
    Role.admin,
]


def has_at_least(role: Role, minimum: Role) -> bool:
    return ROLE_ORDER.index(role) >= ROLE_ORDER.index(minimum)


def require_role(role: Role, minimum: Role) -> None:
    if not has_at_least(role, minimum):
        raise Forbidden(f"Hace falta el rol {minimum} o uno mayor")


@dataclass(frozen=True)
class Account:
    id: UUID
    name: str
    email: str
    role: Role


@dataclass(frozen=True)
class UserRecord:
    """La ficha de una cuenta para el admin: incluye la prueba de que aceptó la
    política de datos (Decreto 1377 de 2013, art. 8)."""

    id: UUID
    name: str
    email: str
    role: Role
    created_at: datetime
    policy_accepted_at: datetime
    policy_version: str


class Suppression(StrEnum):
    """Qué pasó con una cuenta al suprimirla (derecho de supresión, Ley 1581 de
    2012, art. 8)."""

    # No creó ni revisó nada: se borra la fila completa.
    deleted = "deleted"
    # Creó o revisó técnicas o versiones: se borran su nombre, su correo y su
    # contraseña, y lo que hizo se conserva sin su nombre.
    anonymized = "anonymized"


SUPPRESSED_NAME = "Cuenta suprimida"
