import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base


class ModelMapping(Base):
    """Qué modelo 3D dibuja cada instrumento de DataIQ."""

    __tablename__ = "model_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    # instruments.id de DataIQ: no es clave foránea, vive en otra base.
    instrument_id: Mapped[uuid.UUID] = mapped_column(unique=True)
    model_file: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
