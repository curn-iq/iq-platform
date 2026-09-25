from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base


class Especialidad(Base):
    __tablename__ = "Especialidad"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True)


class Zona(Base):
    __tablename__ = "Zona"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True)
