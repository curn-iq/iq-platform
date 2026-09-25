from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base


class CategoriaInstrumental(Base):
    __tablename__ = "CategoriaInstrumental"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True)


class EquipoBiomedico(Base):
    __tablename__ = "EquipoBiomedico"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String)


class DispositivoMedico(Base):
    __tablename__ = "DispositivoMedico"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String)
