"""Los pedidos: lo que el modelo de lenguaje entiende de una pregunta, varios si
pide varias cosas. Cada uno se responde con datos de DataIQ y su plantilla, y la
respuesta los une (README de SIMIQ3D, «Chat»). El modelo no escribe el texto."""

import re
from dataclasses import dataclass, replace
from enum import StrEnum
from uuid import UUID

from app.domain import tools
from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    in_scope,
    normalize,
    technique_by_id,
)
from app.domain.chat import (
    OUT_OF_SCOPE,
    ChatAction,
    Choice,
    ClinicalField,
    Comparison,
    Reply,
    Vocabulary,
    answer,
    by_objects,
    compare,
    greeting,
    where_it_goes,
)
from app.domain.guards import (
    NO_SURGICAL_TIMES,
    asks_surgical_times,
    which_of_the_family,
)
from app.domain.names import (
    canonical,
    contains,
    instrument_in,
    instruments_in,
    technique_in,
)


class RequestKind(StrEnum):
    locate = "locate"
    describe = "describe"
    clinical_data = "clinical_data"
    list_instruments = "list_instruments"
    show_technique = "show_technique"
    # En qué técnicas va un instrumento, o en cuántas.
    find_instrument = "find_instrument"
    compare = "compare"
    # Las técnicas por número de objetos en la mesa de Mayo.
    rank = "rank"
    out_of_scope = "out_of_scope"
    greeting = "greeting"


class Topic(StrEnum):
    """Lo que DataIQ no tiene, en una pregunta fuera de alcance."""

    surgical_times = "surgical_times"
    # Dosis, diagnósticos, tratamientos: datos clínicos que DataIQ no trae.
    missing_clinical_data = "missing_clinical_data"
    other_technique = "other_technique"
    other = "other"


NO_CLINICAL_DATA = (
    "DataIQ no tiene dosis, diagnósticos ni tratamientos: de cada técnica tiene "
    "para qué sirve, sus indicaciones, sus complicaciones, y la anestesia y la "
    "posición del paciente."
)


@dataclass(frozen=True)
class Request:
    """Un pedido, con los nombres como los dijo el estudiante («la Kelly», «la
    cirugía para quitar la vesícula»): nunca ids ni texto de la respuesta."""

    kind: RequestKind
    technique: str | None = None
    instrument: str | None = None
    field: ClinicalField | None = None
    other_technique: str | None = None
    comparison: Comparison | None = None
    topic: Topic | None = None


@dataclass(frozen=True)
class Turn:
    """Una pregunta anterior de la conversación, con los pedidos que salieron de
    ella. La manda el frontend; el backend no guarda la conversación."""

    question: str
    requests: tuple[Request, ...] = ()


def requests_of(reply: Reply, catalog: Catalog) -> tuple[Request, ...]:
    """Los pedidos de una respuesta que no vino del modelo (las reglas fijas): lo
    que hizo el visor, como pedido, para que el seguimiento se entienda igual."""
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


# La escena de una respuesta con varios pedidos es la del más visual: resaltar
# una pieza, la lista de la mesa, la ficha de un instrumento, un dato clínico, la
# técnica; las respuestas en texto no cambian el visor.
SCENE_ORDER = (
    ChatAction.highlight_instrument,
    ChatAction.list_instruments,
    ChatAction.describe_instrument,
    ChatAction.show_clinical_data,
    ChatAction.show_technique,
    ChatAction.answer,
    ChatAction.clarify,
    ChatAction.no_answer,
)
ANSWERED = set(SCENE_ORDER[:6])
MAX_OPTIONS = 5
# «la Kelly», «el bisturí»: el modelo a veces copia el artículo con el nombre.
_ARTICLE = re.compile(r"^\s*(?:el|la|los|las|un|una)\s+", re.IGNORECASE)


def _name(text: str | None) -> str:
    return _ARTICLE.sub("", text or "").strip()


def as_said(
    requests: list[Request],
    question: str,
    catalog: Catalog,
    open_technique_id: UUID | None,
    previous: tuple[Turn, ...] = (),
) -> list[Request]:
    """Los pedidos con solo los nombres que dice el estudiante: la técnica que
    nombra o describe la pregunta, o la abierta en el visor, y el instrumento
    que nombra. Lo que el modelo puso sin que nadie lo nombrara
    («Colecistectomía» para «¿Dónde va la Kelly?», sin técnica abierta) se toma
    como no dicho. En un seguimiento cuenta también lo que dijo la conversación
    («¿Y para qué sirve?» después de «¿Dónde va la Kelly Adson?»)."""
    vocabulary = Vocabulary.from_catalog(catalog)
    words = _conversation(question, previous)

    def said(name: str | None) -> str | None:
        if not name:
            return None
        if contains(normalize(words), normalize(_name(name))):
            return name
        found = tools.resolve_technique(catalog, _name(name))
        if not isinstance(found, Technique):
            return None
        if found.id == open_technique_id or _mentions(words, found):
            return name
        described = tools.technique_described(catalog, words)
        return name if described and described.id == found.id else None

    def said_instrument(name: str | None) -> str | None:
        if not name or contains(canonical(words), canonical(_name(name))):
            return name
        found = tools.resolve_instrument(catalog, _name(name))
        if isinstance(found, Instrument):
            return name if found.name in instruments_in(words, vocabulary) else None
        # Una técnica pedida como instrumento («¿Qué es la mastectomía?»)
        return name if said(name) else None

    return [
        replace(
            r,
            technique=said(r.technique),
            other_technique=said(r.other_technique),
            instrument=said_instrument(r.instrument),
        )
        for r in requests
    ]


def _conversation(question: str, previous: tuple[Turn, ...]) -> str:
    """Lo que dijo la conversación: las preguntas y los nombres de sus pedidos."""
    parts = []
    for turn in previous:
        parts.append(turn.question)
        for r in turn.requests:
            parts += [n for n in (r.technique, r.instrument, r.other_technique) if n]
    return " ".join([*parts, question])


def _mentions(text: str, technique: Technique) -> bool:
    """«colecistectomía» basta para «Colecistectomía»; «hemicolectomía», para
    «Hemicolectomía derecha»."""
    key = normalize(technique.name)
    return contains(normalize(text), key) or contains(normalize(text), key.split()[0])


def contradicted(requests: list[Request], question: str, catalog: Catalog) -> bool:
    """El modelo dice que el mensaje no trata de estas técnicas, pero nombra una
    de ellas o un instrumento de sus mesas: el modelo se equivocó."""
    outside = {Topic.other, Topic.other_technique}
    if not requests or any(
        r.kind != RequestKind.out_of_scope or r.topic not in outside for r in requests
    ):
        return False
    if tools.out_of_scope_technique(catalog, question):
        return False
    vocabulary = Vocabulary.from_catalog(catalog)
    return bool(
        technique_in(question, vocabulary)
        or instrument_in(question, vocabulary)
        or tools.technique_described(catalog, question)
    )


def with_known_limits(requests: list[Request], question: str) -> list[Request]:
    """Si la pregunta pide tiempos quirúrgicos y el modelo no lo marcó, se agrega
    la nota: la respuesta no debe parecer un orden por tiempos."""
    marked = any(
        r.kind == RequestKind.out_of_scope and r.topic == Topic.surgical_times
        for r in requests
    )
    if marked or not asks_surgical_times(question):
        return requests
    return [*requests, Request(RequestKind.out_of_scope, topic=Topic.surgical_times)]


def respond(
    requests: list[Request],
    catalog: Catalog,
    open_technique_id: UUID | None,
    question: str = "",
) -> Reply:
    """La respuesta a los pedidos, en el orden en que se pidieron. Lo que está
    fuera de alcance va al final, después de lo que sí se responde."""
    unique = list(dict.fromkeys(requests)) or [Request(RequestKind.out_of_scope)]
    answerable = [r for r in unique if r.kind != RequestKind.out_of_scope]
    outside = [r for r in unique if r.kind == RequestKind.out_of_scope]
    replies = [_one(r, catalog, open_technique_id, question) for r in answerable]
    notes = [_outside(r, catalog, open_technique_id, question) for r in outside]
    return _join(replies + notes)


def _join(replies: list[Reply]) -> Reply:
    if len(replies) == 1:
        return replies[0]
    answered = [r for r in replies if r.action in ANSWERED]
    scene = min(answered or replies, key=lambda r: SCENE_ORDER.index(r.action))
    options = list(scene.options)
    for r in replies:
        options += [o for o in r.options if o not in options]
    # Sin la nota de lo que falta repetida: dos pedidos fuera de alcance del
    # mismo tema dicen lo mismo.
    texts = list(dict.fromkeys(r.reply for r in replies))
    return Reply(
        scene.action,
        "\n\n".join(texts),
        technique_id=scene.technique_id,
        instrument_id=scene.instrument_id,
        field=scene.field,
        options=tuple(options[:MAX_OPTIONS]),
    )


def _outside(
    request: Request,
    catalog: Catalog,
    open_technique_id: UUID | None,
    question: str,
) -> Reply:
    technique = technique_by_id(catalog, open_technique_id)
    match request.topic:
        case Topic.surgical_times:
            return Reply(
                ChatAction.no_answer,
                NO_SURGICAL_TIMES,
                options=(
                    (f"¿Qué lleva la mesa de {technique.name}?",) if technique else ()
                ),
            )
        case Topic.missing_clinical_data:
            return Reply(ChatAction.no_answer, NO_CLINICAL_DATA)
    other = tools.out_of_scope_technique(catalog, question)
    text = f"{other.name} es una técnica de {other.specialty}. " if other else ""
    return Reply(
        ChatAction.no_answer,
        text + OUT_OF_SCOPE,
        options=tuple(t.name for t in in_scope(catalog)),
    )


def _one(
    request: Request,
    catalog: Catalog,
    open_technique_id: UUID | None,
    question: str,
) -> Reply:
    open_technique = technique_by_id(catalog, open_technique_id)
    match request.kind:
        case RequestKind.greeting:
            return greeting(catalog, open_technique)
        case RequestKind.rank:
            return by_objects(catalog)
    technique = open_technique
    if request.technique:
        found = tools.resolve_technique(catalog, _name(request.technique))
        if not isinstance(found, Technique):
            # Un instrumento pedido como técnica («para qué sirve la pinza
            # Lahey»): se responde como instrumento.
            as_instrument = tools.resolve_instrument(catalog, _name(request.technique))
            if isinstance(as_instrument, Instrument):
                kind = (
                    RequestKind.describe
                    if request.kind == RequestKind.clinical_data
                    else RequestKind.locate
                )
                again = Request(kind, instrument=as_instrument.name)
                return _one(again, catalog, open_technique_id, question)
            return _unknown_technique(found, _name(request.technique), catalog)
        technique = found
    named = technique.name if technique else None
    match request.kind:
        case RequestKind.clinical_data:
            action = ChatAction.show_clinical_data
            choice = Choice(action, named, field=request.field)
            return answer(choice, catalog, open_technique_id)
        case RequestKind.list_instruments | RequestKind.show_technique:
            choice = Choice(ChatAction(request.kind.value), named)
            return answer(choice, catalog, open_technique_id)
        case RequestKind.compare:
            return _compare(request, technique, catalog)
    instrument = _instrument(request, technique, catalog, question)
    if isinstance(instrument, Reply):
        return instrument
    if isinstance(instrument, Technique):
        # El nombre es de una técnica («¿Qué es la mastectomía?»): es para qué
        # sirve esa técnica, o la técnica en el visor.
        if request.kind == RequestKind.describe:
            choice = Choice(
                ChatAction.show_clinical_data,
                instrument.name,
                field=ClinicalField.description,
            )
        else:
            choice = Choice(ChatAction.show_technique, instrument.name)
        return answer(choice, catalog, open_technique_id)
    match request.kind:
        case RequestKind.locate:
            choice = Choice(ChatAction.highlight_instrument, named, instrument.name)
            return answer(choice, catalog, open_technique_id)
        case RequestKind.describe:
            choice = Choice(ChatAction.describe_instrument, named, instrument.name)
            return answer(choice, catalog, open_technique_id)
    return where_it_goes(catalog, instrument)


def _instrument(
    request: Request,
    technique: Technique | None,
    catalog: Catalog,
    question: str,
) -> Instrument | Technique | Reply:
    """El instrumento del pedido, o la técnica si el nombre es de una técnica. Si
    no se sabe cuál, la respuesta que pregunta (cuál de la familia, o
    «¿Quizás…?»)."""
    # «El bisturí» en una mesa que lleva varios: cuál. Como en las reglas fijas,
    # solo si la pregunta no nombra uno («la pinza Kelly» ya dice cuál).
    vocabulary = Vocabulary.from_catalog(catalog)
    if technique and instrument_in(question, vocabulary) is None:
        family = which_of_the_family(catalog, technique, question)
        if family:
            return family
    name = _name(request.instrument)
    if not name:
        return Reply(
            ChatAction.clarify,
            "¿De qué instrumento?",
            options=(f"Instrumental de la mesa de {technique.name}",)
            if technique
            else (),
        )
    found = tools.resolve_instrument(catalog, name)
    if isinstance(found, Instrument):
        return found
    as_technique = tools.technique_named(catalog, name)
    if as_technique:
        return as_technique
    if tools.out_of_scope_technique(catalog, name):
        return _outside(
            Request(RequestKind.out_of_scope, topic=Topic.other_technique),
            catalog,
            None,
            name,
        )
    close = found.get("quizas") or []
    if close:
        return Reply(
            ChatAction.clarify,
            f"¿Quizás te refieres a {' o '.join(close)}?",
            options=tuple(close),
        )
    return Reply(
        ChatAction.no_answer,
        f"Las mesas de Mayo de Cirugía General no llevan «{request.instrument}».",
        options=tuple(t.name for t in in_scope(catalog)),
    )


def _unknown_technique(found: dict, name: str, catalog: Catalog) -> Reply:
    """Una técnica que no es del MVP: «¿Quizás…?» si se parece a una, y si no,
    que está fuera de alcance (de otra especialidad, si DataIQ la tiene)."""
    close = found.get("quizas") or []
    if close:
        return Reply(
            ChatAction.clarify,
            f"¿Quizás te refieres a {' o '.join(close)}?",
            options=tuple(close),
        )
    return _outside(
        Request(RequestKind.out_of_scope, topic=Topic.other_technique),
        catalog,
        None,
        name,
    )


def _compare(request: Request, technique: Technique | None, catalog: Catalog) -> Reply:
    name = _name(request.other_technique)
    second = tools.resolve_technique(catalog, name)
    if not isinstance(second, Technique):
        return _unknown_technique(second, name, catalog)
    if technique is None or technique.id == second.id:
        return Reply(
            ChatAction.clarify,
            f"¿Con qué técnica comparo {second.name}?",
            options=tuple(
                f"¿Qué comparten {t.name} y {second.name}?"
                for t in in_scope(catalog)
                if t.id != second.id
            ),
        )
    return compare(
        catalog, technique, second, request.comparison or Comparison.differences
    )
