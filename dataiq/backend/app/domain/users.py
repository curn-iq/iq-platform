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
class Activity:
    """Lo que una cuenta hizo en DataIQ, para la ficha del admin («4 versiones en
    curso · 1 devuelta», «2 versiones revisadas · 1 técnica publicada»)."""

    # Sus versiones en borrador, devueltas incluidas
    drafts: int = 0
    # De esos borradores, los que tienen alguna devolución
    returned: int = 0
    # Sus versiones enviadas a revisión
    in_review: int = 0
    # Técnicas con una versión suya que llegó a publicarse (aunque ya esté
    # reemplazada o archivada)
    published_techniques: int = 0
    # Versiones de otras personas que aprobó o devolvió
    reviewed: int = 0


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
    activity: Activity = Activity()


class Suppression(StrEnum):
    """Qué pasó con una cuenta al suprimirla (derecho de supresión, Ley 1581 de
    2012, art. 8)."""

    # No creó ni revisó nada: se borra la fila completa.
    deleted = "deleted"
    # Creó o revisó técnicas o versiones: se borran su nombre, su correo y su
    # contraseña, y lo que hizo se conserva sin su nombre.
    anonymized = "anonymized"


SUPPRESSED_NAME = "Cuenta suprimida"
