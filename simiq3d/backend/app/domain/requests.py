"""De qué se habló en cada respuesta del chat, como pedidos (README de SIMIQ3D,
«Chat»): `POST /chat` los devuelve y el frontend los manda de vuelta con la
siguiente pregunta, para que un seguimiento («¿y para qué sirve?») se entienda
por lo que se preguntó antes (`app/domain/focus.py`)."""

from dataclasses import dataclass
from enum import StrEnum

from app.domain.catalog import Catalog, technique_by_id
from app.domain.chat import ChatAction, ClinicalField, Reply


class RequestKind(StrEnum):
    """De qué trató la respuesta: dónde va un instrumento, qué es, un dato
    clínico, la mesa o la técnica; o una técnica que SIMIQ3D no muestra."""

    locate = "locate"
    describe = "describe"
    clinical_data = "clinical_data"
    list_instruments = "list_instruments"
    show_technique = "show_technique"
    out_of_scope = "out_of_scope"


class Topic(StrEnum):
    """Lo que SIMIQ3D no muestra, en un pedido fuera de alcance."""

    other_technique = "other_technique"


@dataclass(frozen=True)
class Request:
    """Un pedido, con los nombres de DataIQ: nunca ids ni texto de la respuesta."""

    kind: RequestKind
    technique: str | None = None
    instrument: str | None = None
    field: ClinicalField | None = None
    topic: Topic | None = None


@dataclass(frozen=True)
class Turn:
    """Una pregunta anterior de la conversación, con los pedidos que salieron de
    ella y el texto de su respuesta. La manda el frontend; el backend no guarda
    la conversación."""

    question: str
    requests: tuple[Request, ...] = ()
    reply: str = ""


def requests_of(reply: Reply, catalog: Catalog) -> tuple[Request, ...]:
    """Los pedidos de una respuesta de las reglas fijas: lo que hizo el visor,
    como pedido, para que el seguimiento se entienda igual."""
    technique = technique_by_id(catalog, reply.technique_id)
    instrument = next(
        (i for i in catalog.instruments if i.id == reply.instrument_id), None
    )
    t = technique.name if technique else None
    i = instrument.name if instrument else None
    match reply.action:
        case ChatAction.highlight_instrument:
            return (Request(RequestKind.locate, t, i),)
        case ChatAction.describe_instrument:
            return (Request(RequestKind.describe, t, i),)
        case ChatAction.show_clinical_data:
            return (Request(RequestKind.clinical_data, t, field=reply.field),)
        case ChatAction.list_instruments | ChatAction.show_technique:
            return (Request(RequestKind(reply.action.value), t),)
    return ()
