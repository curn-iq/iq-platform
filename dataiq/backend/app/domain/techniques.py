from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from app.domain.errors import InvalidContent
from app.domain.users import Role


class VersionState(StrEnum):
    draft = "draft"
    in_review = "in_review"
    published = "published"
    superseded = "superseded"
    archived = "archived"


class TransitionNotAllowed(Exception):
    pass


class PublishingNotAllowed(Exception):
    pass


# A lo sumo una versión en curso por técnica (índice one_in_progress_per_technique)
IN_PROGRESS = (VersionState.draft, VersionState.in_review)

ALLOWED_TRANSITIONS = {
    # borrador → publicada: el revisor o el admin publica lo suyo sin pasar por revisión
    VersionState.draft: {VersionState.in_review, VersionState.published},
    VersionState.in_review: {VersionState.draft, VersionState.published},
    VersionState.published: {VersionState.superseded, VersionState.archived},
    VersionState.superseded: set(),
    VersionState.archived: set(),
}


def validate_transition(current: VersionState, new_: VersionState) -> None:
    if new_ not in ALLOWED_TRANSITIONS[current]:
        raise TransitionNotAllowed(f"No se puede pasar de {current} a {new_}")


# Solo un revisor o un admin publica: aprueba lo de un colaborador o publica lo suyo.
PUBLISHING_ROLES = {Role.reviewer, Role.admin}


def validate_publishing(role: Role) -> None:
    if role not in PUBLISHING_ROLES:
        raise PublishingNotAllowed(f"El rol {role} no puede publicar")


@dataclass(frozen=True)
class TechniqueSummary:
    id: UUID
    name: str
    specialty: str
    version_number: int


@dataclass(frozen=True)
class Cell:
    row: int
    column: int


@dataclass(frozen=True)
class ComponentDetail:
    """Una parte de un objeto: un instrumento o una sutura, nunca ambos."""

    instrument_id: UUID | None
    suture_id: UUID | None
    name: str


@dataclass(frozen=True)
class ItemDetail:
    """Un objeto físico de la técnica; sin zona ni celdas si solo va en el listado."""

    id: UUID
    zone_id: UUID | None
    zone: str | None
    legend_number: int | None
    source_text: str
    components: tuple[ComponentDetail, ...]
    cells: tuple[Cell, ...]


@dataclass(frozen=True)
class SutureDetail:
    id: UUID
    name: str
    gauge: str | None
    needle_type: str | None
    usage: str | None


@dataclass(frozen=True)
class Equipment:
    id: UUID
    name: str
    description: str | None


@dataclass(frozen=True)
class Device:
    id: UUID
    name: str
    description: str | None


@dataclass(frozen=True)
class ZoneLayout:
    """Lo que la versión dice de una mesa: si la lleva y de qué tamaño es."""

    zone_id: UUID
    zone: str
    used: bool
    rows: int | None
    columns: int | None


@dataclass(frozen=True)
class TechniqueDetail:
    id: UUID
    name: str
    specialty: str
    version_number: int
    cups_code: str | None
    anesthesia: str | None
    patient_position: str | None
    drapes: str | None
    description: str | None
    indications: str | None
    complications: str | None
    surgical_technique: str | None
    source: str | None
    zones: tuple[ZoneLayout, ...]
    items: tuple[ItemDetail, ...]
    sutures: tuple[SutureDetail, ...]
    equipment: tuple[Equipment, ...]
    devices: tuple[Device, ...]


@dataclass(frozen=True)
class VersionSummary:
    id: UUID
    technique_id: UUID
    technique: str
    specialty: str
    number: int
    state: VersionState
    created_by: UUID
    author: str
    updated_at: datetime


@dataclass(frozen=True)
class Rejection:
    reason: str
    rejected_by: str
    created_at: datetime


@dataclass(frozen=True)
class VersionDetail:
    summary: VersionSummary
    content: TechniqueDetail
    rejections: tuple[Rejection, ...]


# Contenido que se escribe en una versión en borrador (el editor lo manda
# completo y reemplaza lo anterior).


@dataclass(frozen=True)
class NewZoneLayout:
    zone_id: UUID
    used: bool
    rows: int | None
    columns: int | None


@dataclass(frozen=True)
class NewComponent:
    instrument_id: UUID | None
    suture_id: UUID | None


@dataclass(frozen=True)
class NewItem:
    zone_id: UUID | None
    legend_number: int | None
    source_text: str
    components: tuple[NewComponent, ...]
    cells: tuple[Cell, ...]


@dataclass(frozen=True)
class NewSuture:
    name: str
    gauge: str | None
    needle_type: str | None
    usage: str | None


@dataclass(frozen=True)
class VersionContent:
    cups_code: str | None
    anesthesia: str | None
    patient_position: str | None
    drapes: str | None
    description: str | None
    indications: str | None
    complications: str | None
    surgical_technique: str | None
    source: str | None
    zones: tuple[NewZoneLayout, ...]
    items: tuple[NewItem, ...]
    sutures: tuple[NewSuture, ...]
    equipment: tuple[str, ...]
    devices: tuple[str, ...]


def validate_content(content: VersionContent) -> None:
    """Revisa la mesa y las listas antes de escribir; junta todos los problemas."""
    problems = []
    layouts = {}
    for layout in content.zones:
        if layout.zone_id in layouts:
            problems.append("Una mesa aparece dos veces")
        layouts[layout.zone_id] = layout
        has_size = layout.rows is not None and layout.columns is not None
        if layout.used and not (has_size and layout.rows >= 1 and layout.columns >= 1):
            problems.append("Una mesa que se lleva necesita filas y columnas")
        if not layout.used and (layout.rows is not None or layout.columns is not None):
            problems.append("Una mesa que no se lleva no tiene tamaño")
    numbers = Counter()
    cells = Counter()
    for item in content.items:
        name = f"«{item.source_text}»"
        if not item.source_text.strip():
            problems.append("Hay un objeto sin texto")
        if item.zone_id is None and item.legend_number is not None:
            problems.append(f"{name} tiene número pero no tiene mesa")
        if item.zone_id is None and item.cells:
            problems.append(f"{name} tiene celdas pero no tiene mesa")
        for component in item.components:
            if (component.instrument_id is None) == (component.suture_id is None):
                problems.append(
                    f"Cada componente de {name} es un instrumento o una sutura"
                )
        layout = layouts.get(item.zone_id)
        if item.zone_id is not None and (layout is None or not layout.used):
            problems.append(f"{name} está en una mesa que la versión no lleva")
        for cell in item.cells:
            outside = cell.row < 1 or cell.column < 1
            if layout is not None and layout.used and layout.rows and layout.columns:
                outside = (
                    outside or cell.row > layout.rows or cell.column > layout.columns
                )
            if outside:
                problems.append(f"{name} tiene una celda fuera de la mesa")
        if item.legend_number is not None:
            numbers[(item.zone_id, item.legend_number)] += 1
        for cell in set(item.cells):
            cells[(item.zone_id, cell.row, cell.column)] += 1
    for (_, number), times in numbers.items():
        if times > 1:
            problems.append(f"El número {number} está repetido en la misma mesa")
    for (_, row, column), times in cells.items():
        if times > 1:
            problems.append(f"La celda ({row}, {column}) tiene más de un objeto")
    sutures = Counter((s.name, s.gauge, s.needle_type) for s in content.sutures)
    if any(times > 1 for times in sutures.values()):
        problems.append("Hay una sutura repetida (junta sus usos en una sola)")
    if len(set(content.equipment)) != len(content.equipment):
        problems.append("Hay un equipo repetido")
    if len(set(content.devices)) != len(content.devices):
        problems.append("Hay un dispositivo repetido")
    if problems:
        raise InvalidContent(problems)
