import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base
from app.domain.techniques import VersionState


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)


class Technique(Base):
    __tablename__ = "techniques"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String)
    specialty_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("specialties.id"))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("name", "specialty_id"),)


class TechniqueVersion(Base):
    __tablename__ = "technique_versions"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    technique_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("techniques.id"))
    number: Mapped[int] = mapped_column()
    state: Mapped[VersionState] = mapped_column(
        Enum(VersionState, name="version_state"), server_default="draft"
    )
    cups_code: Mapped[str | None] = mapped_column(String)
    anesthesia: Mapped[str | None] = mapped_column(String)
    patient_position: Mapped[str | None] = mapped_column(String)
    drapes: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    indications: Mapped[str | None] = mapped_column(Text)
    complications: Mapped[str | None] = mapped_column(Text)
    surgical_technique: Mapped[str | None] = mapped_column(Text)
    # De dónde salió el contenido de la versión (enlaces o libros), para validarlo
    source: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("technique_id", "number"),
        CheckConstraint(
            "(state IN ('draft', 'in_review')) = "
            "(reviewed_by IS NULL AND reviewed_at IS NULL)",
            name="review_consistent",
        ),
        Index(
            "one_published_per_technique",
            "technique_id",
            unique=True,
            postgresql_where=text("state = 'published'"),
        ),
        Index(
            "one_in_progress_per_technique",
            "technique_id",
            unique=True,
            postgresql_where=text("state IN ('draft', 'in_review')"),
        ),
    )


class VersionRejection(Base):
    """Cada vez que un revisor devuelve una versión en revisión a borrador."""

    __tablename__ = "version_rejections"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("technique_versions.id"), index=True
    )
    rejected_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (CheckConstraint("btrim(reason) <> ''", name="reason_not_empty"),)


class VersionZone(Base):
    """Lo que una versión dice de cada mesa: si la lleva y de qué tamaño es."""

    __tablename__ = "version_zones"
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("technique_versions.id"), primary_key=True
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("zones.id"), primary_key=True)
    # False: la técnica no lleva esa mesa ("no lleva"), distinto de no tener fila
    used: Mapped[bool] = mapped_column()
    grid_rows: Mapped[int | None] = mapped_column()
    grid_columns: Mapped[int | None] = mapped_column()

    __table_args__ = (
        CheckConstraint(
            "used = (grid_rows IS NOT NULL AND grid_columns IS NOT NULL)",
            name="size_when_used",
        ),
        CheckConstraint(
            "(grid_rows IS NULL OR grid_rows >= 1) AND "
            "(grid_columns IS NULL OR grid_columns >= 1)",
            name="valid_size",
        ),
    )


class TechniqueItem(Base):
    __tablename__ = "technique_items"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("technique_versions.id"))
    zone_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("zones.id"))
    legend_number: Mapped[int | None] = mapped_column()
    source_text: Mapped[str] = mapped_column(String)

    __table_args__ = (
        UniqueConstraint("version_id", "zone_id", "legend_number"),
        UniqueConstraint("id", "version_id", "zone_id"),
        CheckConstraint(
            "legend_number IS NULL OR zone_id IS NOT NULL",
            name="number_requires_zone",
        ),
    )


class ItemComponent(Base):
    __tablename__ = "item_components"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("technique_items.id"))
    instrument_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("instruments.id")
    )
    suture_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sutures.id"))

    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(instrument_id, suture_id) = 1",
            name="component_exactly_one",
        ),
    )


class ItemCell(Base):
    __tablename__ = "item_cells"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    item_id: Mapped[uuid.UUID] = mapped_column()
    version_id: Mapped[uuid.UUID] = mapped_column()
    zone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("zones.id"))
    grid_row: Mapped[int] = mapped_column()
    grid_column: Mapped[int] = mapped_column()

    __table_args__ = (
        UniqueConstraint("version_id", "zone_id", "grid_row", "grid_column"),
        CheckConstraint("grid_row >= 1 AND grid_column >= 1", name="valid_cell"),
        ForeignKeyConstraint(
            ["item_id", "version_id", "zone_id"],
            [
                "technique_items.id",
                "technique_items.version_id",
                "technique_items.zone_id",
            ],
        ),
    )


class VersionSuture(Base):
    __tablename__ = "version_sutures"
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("technique_versions.id"), primary_key=True
    )
    suture_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sutures.id"), primary_key=True
    )
    usage: Mapped[str | None] = mapped_column(Text)


class VersionEquipment(Base):
    __tablename__ = "version_equipment"
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("technique_versions.id"), primary_key=True
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("biomedical_equipment.id"), primary_key=True
    )


class VersionDevice(Base):
    __tablename__ = "version_devices"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("technique_versions.id"), primary_key=True
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("medical_devices.id"), primary_key=True
    )
