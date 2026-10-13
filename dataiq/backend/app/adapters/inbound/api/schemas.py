from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.domain.catalog import InstrumentChanges
from app.domain.techniques import (
    Cell,
    NewComponent,
    NewItem,
    NewSuture,
    VersionContent,
    VersionState,
)
from app.domain.users import Role

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class OutModel(BaseModel):
    """Base de las respuestas: se arman directo desde los dataclasses del dominio."""

    model_config = ConfigDict(from_attributes=True)


# --- Técnicas ------------------------------------------------------------


class TechniqueSummaryOut(OutModel):
    id: UUID
    name: str
    specialty: str
    version_number: int


class TechniquePublicOut(TechniqueSummaryOut):
    """Lo que ve cualquiera, sin cuenta: la técnica y sus datos clínicos."""

    cups_code: str | None
    anesthesia: str | None
    patient_position: str | None
    drapes: str | None
    description: str | None
    indications: str | None
    complications: str | None
    surgical_technique: str | None
    source: str | None


class CellOut(OutModel):
    row: int
    column: int


class ComponentOut(OutModel):
    instrument_id: UUID | None
    suture_id: UUID | None
    name: str


class ItemOut(OutModel):
    id: UUID
    zone: str | None
    legend_number: int | None
    source_text: str
    components: list[ComponentOut]
    cells: list[CellOut]


class SutureOut(OutModel):
    id: UUID
    name: str
    gauge: str | None
    needle_type: str | None
    usage: str | None


class ElementOut(OutModel):
    """Equipo biomédico o dispositivo médico."""

    id: UUID
    name: str
    description: str | None


class TechniqueInstrumentsOut(OutModel):
    """Lo que pide cuenta: objetos con su mesa, suturas, equipos y dispositivos."""

    items: list[ItemOut]
    sutures: list[SutureOut]
    equipment: list[ElementOut]
    devices: list[ElementOut]


class TechniqueDetailOut(TechniquePublicOut, TechniqueInstrumentsOut):
    pass


# --- Versiones -----------------------------------------------------------


class VersionSummaryOut(OutModel):
    id: UUID
    technique_id: UUID
    technique: str
    specialty: str
    number: int
    state: VersionState
    created_by: UUID
    author: str
    updated_at: datetime


class RejectionOut(OutModel):
    reason: str
    rejected_by: str
    created_at: datetime


class VersionDetailOut(OutModel):
    summary: VersionSummaryOut
    content: TechniqueDetailOut
    rejections: list[RejectionOut]


class TechniqueCreateIn(BaseModel):
    name: NonEmptyStr
    specialty_id: UUID


class ComponentIn(BaseModel):
    instrument_id: UUID | None = None
    suture_id: UUID | None = None


class CellIn(BaseModel):
    row: int = Field(ge=1)
    column: int = Field(ge=1)


class ItemIn(BaseModel):
    zone_id: UUID | None = None
    legend_number: int | None = Field(default=None, ge=1)
    source_text: NonEmptyStr
    components: list[ComponentIn] = []
    cells: list[CellIn] = []


class SutureIn(BaseModel):
    name: NonEmptyStr
    gauge: str | None = None
    needle_type: str | None = None
    usage: str | None = None


class ContentIn(BaseModel):
    """Todo el contenido de la versión; reemplaza lo que tenía."""

    cups_code: str | None = None
    anesthesia: str | None = None
    patient_position: str | None = None
    drapes: str | None = None
    description: str | None = None
    indications: str | None = None
    complications: str | None = None
    surgical_technique: str | None = None
    source: str | None = None
    items: list[ItemIn] = []
    sutures: list[SutureIn] = []
    equipment: list[NonEmptyStr] = Field(
        default=[], description="Nombres de los equipos"
    )
    devices: list[NonEmptyStr] = Field(
        default=[], description="Nombres de los dispositivos"
    )

    def to_domain(self) -> VersionContent:
        return VersionContent(
            cups_code=self.cups_code,
            anesthesia=self.anesthesia,
            patient_position=self.patient_position,
            drapes=self.drapes,
            description=self.description,
            indications=self.indications,
            complications=self.complications,
            surgical_technique=self.surgical_technique,
            source=self.source,
            items=tuple(
                NewItem(
                    zone_id=i.zone_id,
                    legend_number=i.legend_number,
                    source_text=i.source_text,
                    components=tuple(
                        NewComponent(
                            instrument_id=c.instrument_id, suture_id=c.suture_id
                        )
                        for c in i.components
                    ),
                    cells=tuple(Cell(row=c.row, column=c.column) for c in i.cells),
                )
                for i in self.items
            ),
            sutures=tuple(
                NewSuture(
                    name=s.name,
                    gauge=s.gauge,
                    needle_type=s.needle_type,
                    usage=s.usage,
                )
                for s in self.sutures
            ),
            equipment=tuple(self.equipment),
            devices=tuple(self.devices),
        )


class RejectionIn(BaseModel):
    reason: NonEmptyStr


# --- Catálogo ------------------------------------------------------------


class ReferenceOut(OutModel):
    id: UUID
    name: str


class InstrumentOut(OutModel):
    id: UUID
    name: str
    category: str
    description: str | None
    alias: list[str]


class CatalogSutureOut(OutModel):
    id: UUID
    name: str
    gauge: str | None
    needle_type: str | None


class FullCatalogOut(BaseModel):
    """Todo lo publicado de una vez, para que SIVRI y SIMIQ3D lo guarden por sesión."""

    specialties: list[ReferenceOut]
    zones: list[ReferenceOut]
    categories: list[ReferenceOut]
    instruments: list[InstrumentOut]
    sutures: list[CatalogSutureOut]
    equipment: list[ElementOut]
    devices: list[ElementOut]
    techniques: list[TechniqueDetailOut]


class InstrumentCreateIn(BaseModel):
    name: NonEmptyStr
    category_id: UUID
    description: str | None = None


class InstrumentUpdateIn(BaseModel):
    """Solo se cambia lo que se manda."""

    name: NonEmptyStr | None = None
    category_id: UUID | None = None
    description: str | None = None

    def to_domain(self) -> InstrumentChanges:
        return InstrumentChanges(
            name=self.name,
            category_id=self.category_id,
            description=self.description,
        )


# --- Cuentas -------------------------------------------------------------


class AccountOut(OutModel):
    id: UUID
    name: str
    email: str
    role: Role


class RegisterIn(BaseModel):
    name: NonEmptyStr
    email: EmailStr
    # OWASP: mínimo 8 caracteres y sin tope corto
    password: str = Field(min_length=8, max_length=128)
    accepts_policy: bool = Field(
        description="Autorización de tratamiento de datos (Decreto 1377 de 2013)"
    )


class TokenOut(BaseModel):
    # Nombres fijos de OAuth2: así funciona el botón «Authorize» de /docs.
    access_token: str
    token_type: str = "bearer"


class RoleIn(BaseModel):
    role: Role
