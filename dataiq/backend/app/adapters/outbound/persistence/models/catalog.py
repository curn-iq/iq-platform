import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base


class InstrumentCategory(Base):
    __tablename__ = "instrument_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)


class BiomedicalEquipment(Base):
    __tablename__ = "biomedical_equipment"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String)


class MedicalDevice(Base):
    __tablename__ = "medical_devices"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String)


class Suture(Base):
    __tablename__ = "sutures"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String)
    gauge: Mapped[str | None] = mapped_column(String)
    needle_type: Mapped[str | None] = mapped_column(String)

    __table_args__ = (
        UniqueConstraint(
            "name", "gauge", "needle_type", postgresql_nulls_not_distinct=True
        ),
    )


class Instrument(Base):
    __tablename__ = "instruments"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String, unique=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("instrument_categories.id")
    )
    description: Mapped[str | None] = mapped_column(String)


class InstrumentAlias(Base):
    __tablename__ = "instrument_aliases"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("instruments.id"))
    alias: Mapped[str] = mapped_column(String, unique=True)
