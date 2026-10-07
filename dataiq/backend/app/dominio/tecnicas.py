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
class Celda:
    fila: int
    columna: int


@dataclass(frozen=True)
class ComponenteItem:
    """Una parte de un objeto: un instrumento o una sutura, nunca ambos."""

    instrumental_id: UUID | None
    sutura_id: UUID | None
    nombre: str


@dataclass(frozen=True)
class ItemDetalle:
    """Un objeto físico de la técnica; sin zona ni celdas si solo va en el listado."""

    id: UUID
    zona: str | None
    numero_leyenda: int | None
    texto_fuente: str
    componentes: tuple[ComponenteItem, ...]
    celdas: tuple[Celda, ...]


@dataclass(frozen=True)
class SuturaDetalle:
    id: UUID
    nombre: str
    calibre: str | None
    tipo_aguja: str | None
    uso: str | None


@dataclass(frozen=True)
class Equipo:
    id: UUID
    nombre: str
    descripcion: str | None


@dataclass(frozen=True)
class Dispositivo:
    id: UUID
    nombre: str
    descripcion: str | None


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
    fuente: str | None
    items: tuple[ItemDetalle, ...]
    suturas: tuple[SuturaDetalle, ...]
    equipos: tuple[Equipo, ...]
    dispositivos: tuple[Dispositivo, ...]
