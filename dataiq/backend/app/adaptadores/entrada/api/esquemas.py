from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.dominio.usuarios import RolUsuario

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Salida(BaseModel):
    """Base de las respuestas: se arman directo desde los dataclasses del dominio."""

    model_config = ConfigDict(from_attributes=True)


class TecnicaResumenSalida(Salida):
    id: UUID
    nombre: str
    especialidad: str
    numero_version: int


class TecnicaPublicaSalida(TecnicaResumenSalida):
    """Lo que ve cualquiera, sin cuenta: la técnica y sus datos clínicos."""

    codigo_cups: str | None
    anestesia: str | None
    posicion_paciente: str | None
    ropa: str | None
    descripcion: str | None
    indicaciones: str | None
    complicaciones: str | None
    tecnica_quirurgica: str | None
    fuente: str | None


class CeldaSalida(Salida):
    fila: int
    columna: int


class ComponenteSalida(Salida):
    instrumental_id: UUID | None
    sutura_id: UUID | None
    nombre: str


class ItemSalida(Salida):
    id: UUID
    zona: str | None
    numero_leyenda: int | None
    texto_fuente: str
    componentes: list[ComponenteSalida]
    celdas: list[CeldaSalida]


class SuturaSalida(Salida):
    id: UUID
    nombre: str
    calibre: str | None
    tipo_aguja: str | None
    uso: str | None


class ElementoSalida(Salida):
    """Equipo biomédico o dispositivo médico."""

    id: UUID
    nombre: str
    descripcion: str | None


class InstrumentalDeTecnicaSalida(Salida):
    """Lo que pide cuenta: objetos con su mesa, suturas, equipos y dispositivos."""

    items: list[ItemSalida]
    suturas: list[SuturaSalida]
    equipos: list[ElementoSalida]
    dispositivos: list[ElementoSalida]


class TecnicaDetalleSalida(TecnicaPublicaSalida, InstrumentalDeTecnicaSalida):
    pass


class ReferenciaSalida(Salida):
    id: UUID
    nombre: str


class InstrumentoSalida(Salida):
    id: UUID
    nombre: str
    categoria: str
    descripcion: str | None
    alias: list[str]


class SuturaCatalogoSalida(Salida):
    id: UUID
    nombre: str
    calibre: str | None
    tipo_aguja: str | None


class CatalogoCompletoSalida(BaseModel):
    """Todo lo publicado de una vez, para que SIVRI y SIMIQ3D lo guarden por sesión."""

    especialidades: list[ReferenciaSalida]
    zonas: list[ReferenciaSalida]
    categorias: list[ReferenciaSalida]
    instrumental: list[InstrumentoSalida]
    suturas: list[SuturaCatalogoSalida]
    equipos: list[ElementoSalida]
    dispositivos: list[ElementoSalida]
    tecnicas: list[TecnicaDetalleSalida]


# --- Cuentas -------------------------------------------------------------


class CuentaSalida(Salida):
    id: UUID
    nombre: str
    email: str
    rol: RolUsuario


class RegistroEntrada(BaseModel):
    nombre: Texto
    email: EmailStr
    # OWASP: mínimo 8 caracteres y sin tope corto
    contrasena: str = Field(min_length=8, max_length=128)
    acepta_politica: bool = Field(
        description="Autorización de tratamiento de datos (Decreto 1377 de 2013)"
    )


class TokenSalida(BaseModel):
    # Nombres fijos de OAuth2: así funciona el botón «Authorize» de /docs.
    access_token: str
    token_type: str = "bearer"


class RolEntrada(BaseModel):
    rol: RolUsuario
