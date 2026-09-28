import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adaptadores.salida.persistencia.base_datos import Base
from app.dominio.usuarios import RolUsuario


class Usuario(Base):
    __tablename__ = "Usuario"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    nombre: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str] = mapped_column(String)
    rol: Mapped[RolUsuario] = mapped_column(
        Enum(RolUsuario, name="rol_usuario"), server_default="usuario"
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fecha_aceptacion_politica: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    version_politica: Mapped[str] = mapped_column(String)
