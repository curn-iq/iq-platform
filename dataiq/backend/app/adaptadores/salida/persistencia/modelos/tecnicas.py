import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base


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
