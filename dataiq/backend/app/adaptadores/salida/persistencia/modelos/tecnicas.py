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
    # De dónde salió el contenido de la versión (enlaces o libros), para validarlo
    fuente: Mapped[str | None] = mapped_column(Text)
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


class RechazoVersion(Base):
    """Cada vez que un revisor devuelve una versión en revisión a borrador."""

    __tablename__ = "RechazoVersion"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("TecnicaVersion.id"), index=True
    )
    rechazado_por: Mapped[uuid.UUID] = mapped_column(ForeignKey("Usuario.id"))
    motivo: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (CheckConstraint("btrim(motivo) <> ''", name="motivo_no_vacio"),)


class ItemTecnica(Base):
    __tablename__ = "ItemTecnica"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("TecnicaVersion.id"))
    zona_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("Zona.id"))
    numero_leyenda: Mapped[int | None] = mapped_column()
    texto_fuente: Mapped[str] = mapped_column(String)

    __table_args__ = (
        UniqueConstraint("version_id", "zona_id", "numero_leyenda"),
        UniqueConstraint("id", "version_id", "zona_id"),
        CheckConstraint(
            "numero_leyenda IS NULL OR zona_id IS NOT NULL", name="numero_con_mesa"
        ),
    )


class ItemTecnicaComponente(Base):
    __tablename__ = "ItemTecnicaComponente"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ItemTecnica.id"))
    instrumental_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("Instrumental.id")
    )
    sutura_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("Sutura.id"))

    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(instrumental_id, sutura_id) = 1",
            name="componente_exactamente_uno",
        ),
    )


class PosicionMesa(Base):
    __tablename__ = "PosicionMesa"
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    item_id: Mapped[uuid.UUID] = mapped_column()
    version_id: Mapped[uuid.UUID] = mapped_column()
    zona_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Zona.id"))
    fila: Mapped[int] = mapped_column()
    columna: Mapped[int] = mapped_column()

    __table_args__ = (
        UniqueConstraint("version_id", "zona_id", "fila", "columna"),
        CheckConstraint("fila >= 1 AND columna >= 1", name="celda_valida"),
        ForeignKeyConstraint(
            ["item_id", "version_id", "zona_id"],
            ["ItemTecnica.id", "ItemTecnica.version_id", "ItemTecnica.zona_id"],
        ),
    )


class TecnicaVersionSutura(Base):
    __tablename__ = "TecnicaVersion_Sutura"
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("TecnicaVersion.id"), primary_key=True
    )
    sutura_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("Sutura.id"), primary_key=True
    )
    uso: Mapped[str | None] = mapped_column(Text)


class TecnicaVersionEquipoBiomedico(Base):
    __tablename__ = "TecnicaVersion_EquipoBiomedico"
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("TecnicaVersion.id"), primary_key=True
    )
    equipo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("EquipoBiomedico.id"), primary_key=True
    )


class TecnicaVersionDispositivoMedico(Base):
    __tablename__ = "TecnicaVersion_DispositivoMedico"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("TecnicaVersion.id"), primary_key=True
    )
    dispositivo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("DispositivoMedico.id"), primary_key=True
    )
