from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from app.dominio.errores import ContenidoInvalido
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


# Una técnica tiene a lo sumo una versión en curso (índice un_borrador_por_tecnica)
EN_CURSO = (EstadoVersion.borrador, EstadoVersion.en_revision)

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


@dataclass(frozen=True)
class VersionResumen:
    id: UUID
    tecnica_id: UUID
    tecnica: str
    especialidad: str
    numero: int
    estado: EstadoVersion
    creado_por: UUID
    autor: str
    fecha_actualizacion: datetime


@dataclass(frozen=True)
class Rechazo:
    motivo: str
    rechazado_por: str
    fecha: datetime


@dataclass(frozen=True)
class VersionDetalle:
    resumen: VersionResumen
    contenido: TecnicaDetalle
    rechazos: tuple[Rechazo, ...]


# Contenido que se escribe en una versión en borrador (el editor lo manda
# completo y reemplaza lo anterior).


@dataclass(frozen=True)
class ComponenteNuevo:
    instrumental_id: UUID | None
    sutura_id: UUID | None


@dataclass(frozen=True)
class ItemNuevo:
    zona_id: UUID | None
    numero_leyenda: int | None
    texto_fuente: str
    componentes: tuple[ComponenteNuevo, ...]
    celdas: tuple[Celda, ...]


@dataclass(frozen=True)
class SuturaNueva:
    nombre: str
    calibre: str | None
    tipo_aguja: str | None
    uso: str | None


@dataclass(frozen=True)
class ContenidoVersion:
    codigo_cups: str | None
    anestesia: str | None
    posicion_paciente: str | None
    ropa: str | None
    descripcion: str | None
    indicaciones: str | None
    complicaciones: str | None
    tecnica_quirurgica: str | None
    fuente: str | None
    items: tuple[ItemNuevo, ...]
    suturas: tuple[SuturaNueva, ...]
    equipos: tuple[str, ...]
    dispositivos: tuple[str, ...]


def validar_contenido(contenido: ContenidoVersion) -> None:
    """Revisa la mesa y las listas antes de escribir; junta todos los problemas."""
    problemas = []
    numeros = Counter()
    celdas = Counter()
    for item in contenido.items:
        nombre = f"«{item.texto_fuente}»"
        if not item.texto_fuente.strip():
            problemas.append("Hay un objeto sin texto")
        if item.zona_id is None and item.numero_leyenda is not None:
            problemas.append(f"{nombre} tiene número pero no tiene mesa")
        if item.zona_id is None and item.celdas:
            problemas.append(f"{nombre} tiene celdas pero no tiene mesa")
        for componente in item.componentes:
            if (componente.instrumental_id is None) == (componente.sutura_id is None):
                problemas.append(
                    f"Cada componente de {nombre} es un instrumento o una sutura"
                )
        for celda in item.celdas:
            if celda.fila < 1 or celda.columna < 1:
                problemas.append(f"{nombre} tiene una celda fuera de la mesa")
        if item.numero_leyenda is not None:
            numeros[(item.zona_id, item.numero_leyenda)] += 1
        for celda in set(item.celdas):
            celdas[(item.zona_id, celda.fila, celda.columna)] += 1
    for (_, numero), veces in numeros.items():
        if veces > 1:
            problemas.append(f"El número {numero} está repetido en la misma mesa")
    for (_, fila, columna), veces in celdas.items():
        if veces > 1:
            problemas.append(f"La celda ({fila}, {columna}) tiene más de un objeto")
    suturas = Counter((s.nombre, s.calibre, s.tipo_aguja) for s in contenido.suturas)
    if any(veces > 1 for veces in suturas.values()):
        problemas.append("Hay una sutura repetida (junta sus usos en una sola)")
    if len(set(contenido.equipos)) != len(contenido.equipos):
        problemas.append("Hay un equipo repetido")
    if len(set(contenido.dispositivos)) != len(contenido.dispositivos):
        problemas.append("Hay un dispositivo repetido")
    if problemas:
        raise ContenidoInvalido(problemas)
