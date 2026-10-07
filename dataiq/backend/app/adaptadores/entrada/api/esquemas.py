from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.dominio.catalogo import CambiosInstrumento
from app.dominio.tecnicas import (
    Celda,
    ComponenteNuevo,
    ContenidoVersion,
    EstadoVersion,
    ItemNuevo,
    SuturaNueva,
)
from app.dominio.usuarios import RolUsuario

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Salida(BaseModel):
    """Base de las respuestas: se arman directo desde los dataclasses del dominio."""

    model_config = ConfigDict(from_attributes=True)


# --- Técnicas ------------------------------------------------------------


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


# --- Versiones -----------------------------------------------------------


class VersionResumenSalida(Salida):
    id: UUID
    tecnica_id: UUID
    tecnica: str
    especialidad: str
    numero: int
    estado: EstadoVersion
    creado_por: UUID
    autor: str
    fecha_actualizacion: datetime


class RechazoSalida(Salida):
    motivo: str
    rechazado_por: str
    fecha: datetime


class VersionDetalleSalida(Salida):
    resumen: VersionResumenSalida
    contenido: TecnicaDetalleSalida
    rechazos: list[RechazoSalida]


class TecnicaNuevaEntrada(BaseModel):
    nombre: Texto
    especialidad_id: UUID


class ComponenteEntrada(BaseModel):
    instrumental_id: UUID | None = None
    sutura_id: UUID | None = None


class CeldaEntrada(BaseModel):
    fila: int = Field(ge=1)
    columna: int = Field(ge=1)


class ItemEntrada(BaseModel):
    zona_id: UUID | None = None
    numero_leyenda: int | None = Field(default=None, ge=1)
    texto_fuente: Texto
    componentes: list[ComponenteEntrada] = []
    celdas: list[CeldaEntrada] = []


class SuturaEntrada(BaseModel):
    nombre: Texto
    calibre: str | None = None
    tipo_aguja: str | None = None
    uso: str | None = None


class ContenidoEntrada(BaseModel):
    """Todo el contenido de la versión; reemplaza lo que tenía."""

    codigo_cups: str | None = None
    anestesia: str | None = None
    posicion_paciente: str | None = None
    ropa: str | None = None
    descripcion: str | None = None
    indicaciones: str | None = None
    complicaciones: str | None = None
    tecnica_quirurgica: str | None = None
    fuente: str | None = None
    items: list[ItemEntrada] = []
    suturas: list[SuturaEntrada] = []
    equipos: list[Texto] = Field(default=[], description="Nombres de los equipos")
    dispositivos: list[Texto] = Field(
        default=[], description="Nombres de los dispositivos"
    )

    def al_dominio(self) -> ContenidoVersion:
        return ContenidoVersion(
            codigo_cups=self.codigo_cups,
            anestesia=self.anestesia,
            posicion_paciente=self.posicion_paciente,
            ropa=self.ropa,
            descripcion=self.descripcion,
            indicaciones=self.indicaciones,
            complicaciones=self.complicaciones,
            tecnica_quirurgica=self.tecnica_quirurgica,
            fuente=self.fuente,
            items=tuple(
                ItemNuevo(
                    zona_id=i.zona_id,
                    numero_leyenda=i.numero_leyenda,
                    texto_fuente=i.texto_fuente,
                    componentes=tuple(
                        ComponenteNuevo(
                            instrumental_id=c.instrumental_id, sutura_id=c.sutura_id
                        )
                        for c in i.componentes
                    ),
                    celdas=tuple(
                        Celda(fila=c.fila, columna=c.columna) for c in i.celdas
                    ),
                )
                for i in self.items
            ),
            suturas=tuple(
                SuturaNueva(
                    nombre=s.nombre,
                    calibre=s.calibre,
                    tipo_aguja=s.tipo_aguja,
                    uso=s.uso,
                )
                for s in self.suturas
            ),
            equipos=tuple(self.equipos),
            dispositivos=tuple(self.dispositivos),
        )


class RechazoEntrada(BaseModel):
    motivo: Texto


# --- Catálogo ------------------------------------------------------------


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


class InstrumentoNuevoEntrada(BaseModel):
    nombre: Texto
    categoria_id: UUID
    descripcion: str | None = None


class InstrumentoCambiosEntrada(BaseModel):
    """Solo se cambia lo que se manda."""

    nombre: Texto | None = None
    categoria_id: UUID | None = None
    descripcion: str | None = None

    def al_dominio(self) -> CambiosInstrumento:
        return CambiosInstrumento(
            nombre=self.nombre,
            categoria_id=self.categoria_id,
            descripcion=self.descripcion,
        )


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
