from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base


class ChatQuotaRow(Base):
    """Cuántas preguntas lleva una cuenta en la ventana actual. account_key es el
    id de la cuenta cifrado con una clave (HMAC): sin ella no se sabe de quién
    es, y no se cruza con el registro de conversaciones."""

    __tablename__ = "chat_quota"

    account_key: Mapped[str] = mapped_column(String, primary_key=True)
    window_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    questions: Mapped[int]
