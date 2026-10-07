from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.dominio.usuarios import RolUsuario


class EstadoVersion(StrEnum):
    borrador = "borrador"
    en_revision = "en_revision"
    publicada = "publicada"
    reemplazada = "reemplazada"
    archivada = "archivada"


class TransicionNoPermitida(Exception):
    pass


class PublicacionNoPermitida(Exception):
    pass


TRANSICIONES_PERMITIDAS = {
    # borrador → publicada: el revisor o el admin publica lo suyo sin pasar por revisión
    EstadoVersion.borrador: {EstadoVersion.en_revision, EstadoVersion.publicada},
    EstadoVersion.en_revision: {EstadoVersion.borrador, EstadoVersion.publicada},
    EstadoVersion.publicada: {EstadoVersion.reemplazada, EstadoVersion.archivada},
    EstadoVersion.reemplazada: set(),
    EstadoVersion.archivada: set(),
}


def validar_transicion(actual: EstadoVersion, nuevo: EstadoVersion) -> None:
    if nuevo not in TRANSICIONES_PERMITIDAS[actual]:
        raise TransicionNoPermitida(f"No se puede pasar de {actual} a {nuevo}")


# Solo un revisor o un admin publica: aprueba lo de un colaborador o publica lo suyo.
ROLES_QUE_PUBLICAN = {RolUsuario.revisor, RolUsuario.admin}


def validar_publicacion(rol: RolUsuario) -> None:
    if rol not in ROLES_QUE_PUBLICAN:
        raise PublicacionNoPermitida(f"El rol {rol} no puede publicar")


@dataclass(frozen=True)
class TecnicaResumen:
    id: UUID
    nombre: str
    especialidad: str
    numero_version: int


@dataclass(frozen=True)
class TecnicaDetalle:
    id: UUID
    nombre: str
    especialidad: str
    numero_version: int
    codigo_cups: str | None
    anestesia: str | None
    posicion_paciente: str | None
    ropa: str | None
    descripcion: str | None
    indicaciones: str | None
    complicaciones: str | None
    tecnica_quirurgica: str | None
