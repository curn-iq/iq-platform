from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class EstadoVersion(StrEnum):
    borrador = "borrador"
    en_revision = "en_revision"
    publicada = "publicada"
    reemplazada = "reemplazada"
    archivada = "archivada"


class TransicionNoPermitida(Exception):
    pass


class AutoAprobacionNoPermitida(Exception):
    pass


TRANSICIONES_PERMITIDAS = {
    EstadoVersion.borrador: {EstadoVersion.en_revision},
    EstadoVersion.en_revision: {EstadoVersion.borrador, EstadoVersion.publicada},
    EstadoVersion.publicada: {EstadoVersion.reemplazada, EstadoVersion.archivada},
    EstadoVersion.reemplazada: set(),
    EstadoVersion.archivada: set(),
}


def validar_transicion(actual: EstadoVersion, nuevo: EstadoVersion) -> None:
    if nuevo not in TRANSICIONES_PERMITIDAS[actual]:
        raise TransicionNoPermitida(f"No se puede pasar de {actual} a {nuevo}")


def validar_aprobacion(creado_por: UUID, revisor: UUID) -> None:
    if creado_por == revisor:
        raise AutoAprobacionNoPermitida("Quien creó la versión no puede aprobarla")


@dataclass(frozen=True)
class TecnicaResumen:
    id: UUID
    nombre: str
    especialidad: str
    numero_version: int
