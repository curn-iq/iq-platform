import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base


class ClassMapping(Base):
    """Qué instrumento de DataIQ es cada clase del modelo. Los ids de DataIQ
    cambian de una instalación a otra, así que el repo guarda el mapeo por nombre
    (`classes.csv`) y esta tabla, el de cada entorno."""

    __tablename__ = "class_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    # Nombre de la clase tal como la tiene el modelo (el del instrumento).
    label: Mapped[str] = mapped_column(String, unique=True)
    # instruments.id de DataIQ: no es clave foránea, vive en otra base.
    instrument_id: Mapped[uuid.UUID] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
