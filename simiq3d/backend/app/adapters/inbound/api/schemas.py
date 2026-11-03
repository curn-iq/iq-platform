from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.domain.chat import ChatAction, ClinicalField, Comparison
from app.domain.requests import RequestKind, Topic

Question = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class ChatRequest(BaseModel):
    """Un pedido: lo que se entendió de una parte de la pregunta (README de
    SIMIQ3D, «Chat»)."""

    model_config = ConfigDict(from_attributes=True)

    kind: RequestKind
    technique: Name | None = None
    instrument: Name | None = None
    field: ClinicalField | None = None
    other_technique: Name | None = None
    comparison: Comparison | None = None
    topic: Topic | None = None


class PreviousTurn(BaseModel):
    question: Question
    requests: list[ChatRequest] = Field(default=[], max_length=10)


class ChatIn(BaseModel):
    question: Question
    technique_id: UUID | None = Field(
        default=None, description="La técnica abierta en el visor, si hay una"
    )
    previous: list[PreviousTurn] = Field(
        default=[],
        max_length=3,
        description="Las preguntas anteriores de la conversación, de la más "
        "antigua a la más reciente, cada una con los `requests` que devolvió su "
        "respuesta. Sirven para entender un seguimiento; no se guardan.",
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
    requests: list[ChatRequest] = Field(
        description="Lo que se entendió de la pregunta: va de vuelta en "
        "`previous` con la siguiente"
    )


class ModelFileOut(OutModel):
    instrument_id: UUID
    model_file: str
