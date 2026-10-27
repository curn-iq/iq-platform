from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    find_instrument,
    find_technique,
    in_scope,
    item_with,
    neighbors,
    place,
    scope_instruments,
    technique_by_id,
)


class ChatAction(StrEnum):
    """Lo que el chat hace con una pregunta, sobre todo lo que cambia en el visor.
    Los datos de la respuesta salen siempre de DataIQ."""

    show_technique = "show_technique"
    highlight_instrument = "highlight_instrument"
    describe_instrument = "describe_instrument"
    show_clinical_data = "show_clinical_data"
    list_instruments = "list_instruments"
    # Una respuesta en texto que no cambia la escena («¿en cuántas técnicas…?»).
    answer = "answer"
    # Pide precisar: en qué técnica, o si quiso decir otro nombre.
    clarify = "clarify"
    no_answer = "no_answer"


class ClinicalField(StrEnum):
    """Los datos clínicos de una técnica que el chat sabe mostrar."""

    description = "description"
    indications = "indications"
    complications = "complications"
    anesthesia_position = "anesthesia_position"


# Cómo se nombra cada dato en las respuestas y en las opciones.
FIELD_LABELS = {
    ClinicalField.description: "Para qué sirve",
    ClinicalField.indications: "Indicaciones",
    ClinicalField.complications: "Complicaciones",
    ClinicalField.anesthesia_position: "Anestesia y posición",
}
LIST_OPTION = "Instrumental de la mesa"


@dataclass(frozen=True)
class Vocabulary:
    """Los nombres entre los que el modelo de lenguaje puede elegir: las técnicas
    del MVP y su instrumental, con los alias de cada instrumento."""

    techniques: tuple[str, ...]
    instruments: dict[str, tuple[str, ...]]

    @classmethod
    def from_catalog(cls, catalog: Catalog) -> Vocabulary:
        return cls(
            techniques=tuple(t.name for t in in_scope(catalog)),
            instruments={i.name: i.aliases for i in scope_instruments(catalog)},
        )


@dataclass(frozen=True)
class Choice:
    """Lo que devuelve el modelo de lenguaje: una acción y, por nombre, la técnica,
    el instrumento o el dato que nombra la pregunta. Nunca ids ni texto propio."""

    action: ChatAction
    technique: str | None = None
    instrument: str | None = None
    field: ClinicalField | None = None


@dataclass(frozen=True)
class Reply:
    """La respuesta del chat. El texto sale de plantillas con datos de DataIQ; las
    opciones son preguntas que el frontend puede volver a mandar tal cual."""

    action: ChatAction
    reply: str
    technique_id: UUID | None = None
    instrument_id: UUID | None = None
    field: ClinicalField | None = None
    options: tuple[str, ...] = ()
    # Quién la armó (el modelo, o las plantillas): va al registro.
    answered_by: str = ""


OUT_OF_SCOPE = (
    "Solo puedo responder sobre las técnicas de Cirugía General y su mesa de Mayo: "
    "qué es cada una, sus datos clínicos y dónde va cada instrumento."
)


def answer(choice: Choice, catalog: Catalog, open_technique_id: UUID | None) -> Reply:
    """Convierte la acción elegida en la respuesta, solo con datos de DataIQ.

    Si la pregunta no nombra una técnica, se usa la abierta. Lo que no cuadra con
    el catálogo (una técnica que no existe, un instrumento que no está en esa
    mesa) se dice así, sin inventar."""
    technique = find_technique(catalog, choice.technique) or technique_by_id(
        catalog, open_technique_id
    )
    instrument = find_instrument(catalog, choice.instrument)

    match choice.action:
        case ChatAction.show_technique if technique:
            return _show_technique(technique)
        case ChatAction.show_clinical_data if technique:
            if choice.field is None:
                return _show_technique(technique)
            return _show_clinical_data(technique, choice.field)
        case ChatAction.list_instruments if technique:
            return _list_instruments(technique)
        case ChatAction.highlight_instrument if instrument:
            return _highlight(catalog, instrument, technique)
        case ChatAction.describe_instrument if instrument:
            return _describe(instrument, technique)
        case (
            ChatAction.show_technique
            | ChatAction.show_clinical_data
            | (ChatAction.list_instruments)
        ):
            return _which_technique(catalog, choice)
    return _no_answer(catalog)


def _technique_options(
    skip: ClinicalField | None = None, with_list: bool = True
) -> tuple[str, ...]:
    """Los otros datos de la técnica, para seguir preguntando."""
    labels = tuple(label for f, label in FIELD_LABELS.items() if f != skip)
    return labels + ((LIST_OPTION,) if with_list else ())


def _show_technique(technique: Technique) -> Reply:
    text = technique.description or (
        f"DataIQ todavía no tiene la descripción de {technique.name}."
    )
    return Reply(
        ChatAction.show_technique,
        f"{technique.name}. {text}",
        technique_id=technique.id,
        options=_technique_options(skip=ClinicalField.description),
    )


def _show_clinical_data(technique: Technique, field_: ClinicalField) -> Reply:
    label = FIELD_LABELS[field_]
    if field_ == ClinicalField.anesthesia_position:
        partes = [
            f"Anestesia: {technique.anesthesia}." if technique.anesthesia else "",
            f"Posición del paciente: {technique.patient_position}."
            if technique.patient_position
            else "",
        ]
        text = " ".join(p for p in partes if p)
    else:
        text = getattr(technique, field_.value)
    if not text:
        text = f"DataIQ todavía no tiene este dato de {technique.name}."
    return Reply(
        ChatAction.show_clinical_data,
        f"{label} · {technique.name}. {text}",
        technique_id=technique.id,
        field=field_,
        options=_technique_options(skip=field_),
    )


def _list_instruments(technique: Technique) -> Reply:
    items = sorted(technique.mayo_items(), key=lambda i: i.legend_number or 99)
    lines = "\n".join(f"{i.legend_number}. {i.name}" for i in items)
    return Reply(
        ChatAction.list_instruments,
        f"Mesa de Mayo de {technique.name}, {len(items)} objetos:\n{lines}",
        technique_id=technique.id,
        options=_technique_options(with_list=False),
    )


def _join(names: list[str]) -> str:
    """«la Kelly», «la Kelly y la Rochester», «la Kelly, la Allis y la Rochester»."""
    return names[0] if len(names) == 1 else f"{', '.join(names[:-1])} y {names[-1]}"


def _the(name: str, start: bool = False) -> str:
    """«la Pinza Kelly», «el Separador de Farabeuf»: el artículo por la primera
    palabra del nombre del catálogo. Con start=True, «La…», para empezar la
    frase sin tocar las mayúsculas del nombre."""
    femenino = name.split()[0].lower() in {
        "pinza",
        "pinzas",
        "tijera",
        "hoja",
        "cánula",
    }
    article = "la" if femenino else "el"
    return f"{article.capitalize() if start else article} {name}"


def _highlight(
    catalog: Catalog, instrument: Instrument, technique: Technique | None
) -> Reply:
    where = question_where(instrument.name)
    if technique is None:
        # Sin técnica: si el instrumento está en una sola mesa, es esa; si está en
        # varias, se pregunta en cuál, como en el mockup.
        techniques = [t for t in in_scope(catalog) if item_with(t, instrument.id)]
        if len(techniques) == 1:
            technique = techniques[0]
        elif not techniques:
            return Reply(
                ChatAction.no_answer,
                f"{_the(instrument.name, start=True)} no va en ninguna mesa de Mayo "
                "de Cirugía General.",
                instrument_id=instrument.id,
            )
        else:
            return Reply(
                ChatAction.clarify,
                f"¿En qué técnica? {_the(instrument.name, start=True)} está en "
                f"{len(techniques)} mesas de Mayo.",
                instrument_id=instrument.id,
                options=tuple(f"{where} en {t.name}?" for t in techniques),
            )
    item = item_with(technique, instrument.id)
    if item is None:
        return Reply(
            ChatAction.no_answer,
            f"{_the(instrument.name, start=True)} no va en la mesa de Mayo de "
            f"{technique.name}.",
            technique_id=technique.id,
            instrument_id=instrument.id,
            options=(LIST_OPTION,),
        )
    near = neighbors(technique, item)
    beside = f", junto a {_join([_the(n.name) for n in near])}" if near else ""
    return Reply(
        ChatAction.highlight_instrument,
        f"{_the(instrument.name, start=True)} va {place(technique, item)} de la mesa "
        f"de Mayo de {technique.name}{beside} (n.º {item.legend_number} del "
        "diagrama).",
        technique_id=technique.id,
        instrument_id=instrument.id,
        options=(f"¿Qué es {_the(instrument.name)}?",),
    )


def _of(name: str) -> str:
    """«de la Pinza Kelly», «del Separador de Farabeuf»."""
    the = _the(name)
    return f"del {the[3:]}" if the.startswith("el ") else f"de {the}"


def question_where(name: str) -> str:
    """El comienzo de la pregunta «¿Dónde va la Pinza Kelly…»."""
    return f"¿Dónde va {_the(name)}"


def _describe(instrument: Instrument, technique: Technique | None) -> Reply:
    text = instrument.description or (
        f"DataIQ todavía no tiene la descripción {_of(instrument.name)}."
    )
    return Reply(
        ChatAction.describe_instrument,
        f"{instrument.name}. {text}",
        technique_id=technique.id if technique else None,
        instrument_id=instrument.id,
        options=(f"{question_where(instrument.name)}?",),
    )


def _which_technique(catalog: Catalog, choice: Choice) -> Reply:
    """Preguntó por una técnica sin decir cuál y no hay ninguna abierta."""
    if choice.action == ChatAction.list_instruments:
        options = tuple(
            f"Instrumental de la mesa de {t.name}" for t in in_scope(catalog)
        )
    elif choice.action == ChatAction.show_clinical_data and choice.field:
        label = FIELD_LABELS[choice.field]
        options = tuple(f"{label} de {t.name}" for t in in_scope(catalog))
    else:
        options = tuple(t.name for t in in_scope(catalog))
    return Reply(ChatAction.clarify, "¿De qué técnica?", options=options)


def _no_answer(catalog: Catalog) -> Reply:
    return Reply(
        ChatAction.no_answer,
        OUT_OF_SCOPE,
        options=tuple(t.name for t in in_scope(catalog)),
    )


def spelling_reply(corrected: str) -> Reply:
    """«¿Quizás quisiste decir…?», con la pregunta corregida para mandarla."""
    return Reply(
        ChatAction.clarify,
        f"¿Quizás quisiste decir «{corrected}»?",
        options=(corrected,),
    )


def the(name: str) -> str:
    """«la Pinza Kelly», «el Separador de Farabeuf», para otros módulos."""
    return _the(name)
