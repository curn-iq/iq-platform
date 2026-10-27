from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.domain.chat import ChatAction, ClinicalField

Question = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]


class ChatIn(BaseModel):
    question: Question
    technique_id: UUID | None = Field(
        default=None, description="La técnica abierta en el visor, si hay una"
    )


class OutModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ChatOut(OutModel):
    action: ChatAction
    technique_id: UUID | None
    instrument_id: UUID | None
    field: ClinicalField | None
    reply: str = Field(description="Texto armado con datos de DataIQ")
    options: list[str] = Field(description="Preguntas que se pueden mandar tal cual")


class ModelFileOut(OutModel):
    instrument_id: UUID
    model_file: str
