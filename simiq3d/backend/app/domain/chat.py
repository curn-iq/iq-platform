from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING
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

if TYPE_CHECKING:
    from app.domain.requests import Request


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


class Comparison(StrEnum):
    """Qué se pregunta al comparar dos mesas de Mayo."""

    shared = "shared"
    # Lo que lleva la primera técnica y no la segunda.
    only_first = "only_first"
    differences = "differences"


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
    # Lo que se entendió de la pregunta: el frontend lo devuelve con la
    # siguiente, para entender un seguimiento.
    requests: tuple[Request, ...] = ()


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
        parts = [
            f"Anestesia: {technique.anesthesia}." if technique.anesthesia else "",
            f"Posición del paciente: {technique.patient_position}."
            if technique.patient_position
            else "",
        ]
        text = " ".join(p for p in parts if p)
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
    lines = "\n".join(
        f"{i.legend_number}. {i.name}" if i.legend_number else f"- {i.name}"
        for i in items
    )
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
    is_feminine = name.split()[0].lower() in {
        "pinza",
        "pinzas",
        "tijera",
        "hoja",
        "cánula",
    }
    article = "la" if is_feminine else "el"
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
        # Dice dónde sí va: «no va aquí» solo, deja a la persona sin salida.
        elsewhere = [t for t in in_scope(catalog) if item_with(t, instrument.id)]
        text = (
            f"{_the(instrument.name, start=True)} no va en la mesa de Mayo de "
            f"{technique.name}."
        )
        if len(elsewhere) == 1:
            text += f" Va en la de {elsewhere[0].name}."
        elif elsewhere:
            text += f" Va en las de {_join([t.name for t in elsewhere])}."
        return Reply(
            ChatAction.answer if elsewhere else ChatAction.no_answer,
            text,
            technique_id=technique.id,
            instrument_id=instrument.id,
            options=tuple(f"{where} en {t.name}?" for t in elsewhere) or (LIST_OPTION,),
        )
    near = neighbors(technique, item)
    beside = f", junto a {_join([_the(n.name) for n in near])}" if near else ""
    number = f" (n.º {item.legend_number} del diagrama)" if item.legend_number else ""
    where = place(technique, item)
    # Sin posición en DataIQ: se dice que va en la mesa, y que falta dónde.
    text = (
        f"{_the(instrument.name, start=True)} va {where} de la mesa de Mayo de "
        f"{technique.name}{beside}{number}."
        if where
        else f"{_the(instrument.name, start=True)} va en la mesa de Mayo de "
        f"{technique.name}{number}, pero DataIQ todavía no tiene su posición."
    )
    return Reply(
        ChatAction.highlight_instrument,
        text,
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


def _names(instruments: list[Instrument]) -> str:
    return _join([_the(i.name) for i in sorted(instruments, key=lambda i: i.name)])


def where_it_goes(catalog: Catalog, instrument: Instrument) -> Reply:
    """En qué mesas de Mayo va un instrumento, con el total."""
    techniques = [t for t in in_scope(catalog) if item_with(t, instrument.id)]
    the_name = _the(instrument.name, start=True)
    if not techniques:
        text = f"{the_name} no va en ninguna mesa de Mayo de Cirugía General."
    elif len(techniques) == 1:
        text = f"{the_name} va en 1 mesa de Mayo: {techniques[0].name}."
    else:
        names = _join([t.name for t in techniques])
        text = f"{the_name} va en {len(techniques)} mesas de Mayo: {names}."
    return Reply(
        ChatAction.answer,
        text,
        instrument_id=instrument.id,
        options=tuple(
            f"{question_where(instrument.name)} en {t.name}?" for t in techniques
        ),
    )


def _instruments_of(catalog: Catalog, technique: Technique) -> list[Instrument]:
    ids = {i for item in technique.mayo_items() for i in item.instrument_ids}
    return [i for i in catalog.instruments if i.id in ids]


def compare(
    catalog: Catalog, first: Technique, second: Technique, what: Comparison
) -> Reply:
    """Qué instrumental comparten dos mesas de Mayo, o cuál lleva solo una. Dice
    solo lo que se pregunta: la lista completa no responde qué comparten."""
    mine = _instruments_of(catalog, first)
    theirs = _instruments_of(catalog, second)
    mine_ids, their_ids = {i.id for i in mine}, {i.id for i in theirs}
    shared = [i for i in mine if i.id in their_ids]
    only_mine = [i for i in mine if i.id not in their_ids]
    only_theirs = [i for i in theirs if i.id not in mine_ids]
    a, b = first.name, second.name
    if what == Comparison.shared:
        text = (
            f"Las mesas de Mayo de {a} y {b} comparten {len(shared)}: {_names(shared)}."
            if shared
            else f"Las mesas de Mayo de {a} y {b} no comparten instrumental."
        )
    elif what == Comparison.only_first:
        text = (
            f"Solo la mesa de Mayo de {a}, y no la de {b}, lleva {len(only_mine)}: "
            f"{_names(only_mine)}."
            if only_mine
            else f"Todo lo de la mesa de Mayo de {a} está también en la de {b}."
        )
    else:
        parts = [
            f"Solo en {name}: {_names(only)}."
            for name, only in ((a, only_mine), (b, only_theirs))
            if only
        ]
        text = " ".join(parts) or f"Las mesas de Mayo de {a} y {b} llevan lo mismo."
    return Reply(
        ChatAction.answer,
        text,
        options=(f"Instrumental de la mesa de {a}", f"Instrumental de la mesa de {b}"),
    )


def by_objects(catalog: Catalog) -> Reply:
    """Las técnicas, de la que lleva más objetos en la mesa de Mayo a la que
    lleva menos."""
    ranked = sorted(in_scope(catalog), key=lambda t: -len(t.mayo_items()))
    listed = _join([f"{t.name} ({len(t.mayo_items())})" for t in ranked])
    return Reply(
        ChatAction.answer,
        f"Objetos en la mesa de Mayo, de más a menos: {listed}.",
        options=(f"Instrumental de la mesa de {ranked[0].name}",) if ranked else (),
    )


def greeting(catalog: Catalog, open_technique: Technique | None) -> Reply:
    """Qué hace el chat, con preguntas para empezar armadas con nombres de
    DataIQ: de la técnica abierta, si la hay."""
    technique = open_technique or next(iter(in_scope(catalog)), None)
    options: tuple[str, ...] = ()
    if technique:
        # El primer objeto del diagrama que es un solo instrumento: «¿Dónde va el
        # Mango de bisturí y Hoja…?» no se pregunta así.
        by_id = {i.id: i for i in catalog.instruments}
        single = sorted(
            (item for item in technique.mayo_items() if len(item.instrument_ids) == 1),
            key=lambda item: item.legend_number or 99,
        )
        first = by_id.get(single[0].instrument_ids[0]) if single else None
        options = (
            f"¿Qué lleva la mesa de {technique.name}?",
            *((f"{question_where(first.name)} en {technique.name}?",) if first else ()),
            f"Indicaciones de {technique.name}",
        )
    return Reply(
        ChatAction.answer,
        "Hola. Te muestro la mesa de Mayo de las técnicas de Cirugía General: "
        "puedes preguntarme qué lleva una mesa, dónde va un instrumento y qué es, "
        "o los datos clínicos de una técnica (para qué sirve, indicaciones, "
        "complicaciones, anestesia y posición).",
        options=options,
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
