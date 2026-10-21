import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base
from app.domain.chat import ChatAction, ClinicalField


class ChatLog(Base):
    """Registro anónimo de una pregunta y la acción que eligió el chat. No guarda
    quién preguntó; ver la nota de la tabla en docs/esquema.dbml."""

    __tablename__ = "chat_logs"
    __table_args__ = (
        CheckConstraint("latency_ms >= 0", name="latency_not_negative"),
        CheckConstraint(
            "(field IS NOT NULL) = (action = 'show_clinical_data')",
            name="field_only_for_clinical_data",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    question: Mapped[str] = mapped_column(Text)
    # Ids de DataIQ: no son claves foráneas, viven en otra base.
    open_technique_id: Mapped[uuid.UUID | None]
    action: Mapped[ChatAction] = mapped_column(Enum(ChatAction, name="chat_action"))
    technique_id: Mapped[uuid.UUID | None]
    instrument_id: Mapped[uuid.UUID | None]
    field: Mapped[ClinicalField | None] = mapped_column(
        Enum(ClinicalField, name="clinical_field")
    )
    language_model: Mapped[str] = mapped_column(String)
    latency_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
