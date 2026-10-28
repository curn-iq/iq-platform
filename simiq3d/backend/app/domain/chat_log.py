from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.chat import ChatAction, ClinicalField, Reply


@dataclass(frozen=True)
class ChatLogEntry:
    """Una pregunta y lo que el chat hizo con ella, para medir su exactitud y su
    tiempo de respuesta. Sin nada de quién preguntó."""

    question: str
    open_technique_id: UUID | None
    action: ChatAction
    technique_id: UUID | None
    instrument_id: UUID | None
    field: ClinicalField | None
    language_model: str
    latency_ms: int
    # Cuándo llegó la pregunta: lo pone la base al guardarla, y sirve para
    # separar las de cada sesión de evaluación
    created_at: datetime | None = None

    @classmethod
    def of(
        cls,
        question: str,
        open_technique_id: UUID | None,
        reply: Reply,
        language_model: str,
        latency_ms: int,
    ) -> ChatLogEntry:
        return cls(
            question,
            open_technique_id,
            reply.action,
            reply.technique_id,
            reply.instrument_id,
            reply.field,
            language_model,
            latency_ms,
        )
