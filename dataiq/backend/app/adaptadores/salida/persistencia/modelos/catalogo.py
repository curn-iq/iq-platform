import uuid

from sqlalchemy import String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base


class CategoriaInstrumental(Base):
    __tablename__ = "CategoriaInstrumental"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String, unique=True)


class EquipoBiomedico(Base):
    __tablename__ = "EquipoBiomedico"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String)


class DispositivoMedico(Base):
    __tablename__ = "DispositivoMedico"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String)


class Sutura(Base):
    __tablename__ = "Sutura"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String)
    calibre: Mapped[str | None] = mapped_column(String)
    tipo_aguja: Mapped[str | None] = mapped_column(String)

    __table_args__ = (
        UniqueConstraint(
            "nombre", "calibre", "tipo_aguja", postgresql_nulls_not_distinct=True
        ),
    )
