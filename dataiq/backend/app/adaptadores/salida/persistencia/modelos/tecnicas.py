import uuid

from sqlalchemy import String, text
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
