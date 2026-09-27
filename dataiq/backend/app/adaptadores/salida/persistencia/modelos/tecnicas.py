import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base
from app.dominio.tecnicas import EstadoVersion


class Especialidad(Base):
    __tablename__ = "Especialidad"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String, unique=True)


class Zona(Base):
    __tablename__ = "Zona"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String, unique=True)


class Tecnica(Base):
    __tablename__ = "Tecnica"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String)
    especialidad_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Especialidad.id"))
    creado_por: Mapped[uuid.UUID] = mapped_column(ForeignKey("Usuario.id"))
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("nombre", "especialidad_id"),)


class TecnicaVersion(Base):
    __tablename__ = "TecnicaVersion"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    tecnica_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Tecnica.id"))
    numero: Mapped[int] = mapped_column()
    estado: Mapped[EstadoVersion] = mapped_column(
        Enum(EstadoVersion, name="estado_version"), server_default="borrador"
    )
    codigo_cups: Mapped[str | None] = mapped_column(String)
    anestesia: Mapped[str | None] = mapped_column(String)
    posicion_paciente: Mapped[str | None] = mapped_column(String)
    ropa: Mapped[str | None] = mapped_column(String)
    descripcion: Mapped[str | None] = mapped_column(Text)
    indicaciones: Mapped[str | None] = mapped_column(Text)
    complicaciones: Mapped[str | None] = mapped_column(Text)
    tecnica_quirurgica: Mapped[str | None] = mapped_column(Text)
    creado_por: Mapped[uuid.UUID] = mapped_column(ForeignKey("Usuario.id"))
    revisado_por: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("Usuario.id"))
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    fecha_revision: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("tecnica_id", "numero"),
        CheckConstraint(
            "(estado IN ('borrador', 'en_revision')) = "
            "(revisado_por IS NULL AND fecha_revision IS NULL)",
            name="revision_coherente",
        ),
        CheckConstraint("revisado_por <> creado_por", name="sin_autoaprobacion"),
        Index(
            "una_publicada_por_tecnica",
            "tecnica_id",
            unique=True,
            postgresql_where=text("estado = 'publicada'"),
        ),
        Index(
            "un_borrador_por_tecnica",
            "tecnica_id",
            unique=True,
            postgresql_where=text("estado IN ('borrador', 'en_revision')"),
        ),
    )
