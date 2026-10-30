"""Corre el banco de preguntas contra el chat y mide su exactitud.

    uv run python -m app.adapters.inbound.cli.chat_bank [--salida resultados.csv]

Lee `eval/banco.csv`: cada fila es una pregunta (con la técnica abierta en el
visor, si la hay) y lo que el chat debe hacer con ella (`espera`). Hace cada
pregunta como la ruta del chat (corrector, agente y plantillas), sin pasar por
HTTP: no gasta el tope de preguntas ni escribe en el registro de
conversaciones. El motor es el de `LANGUAGE_MODEL`: con `ollama`, el modelo del
Servidor PC2.

El banco guarda nombres, no datos: el número del diagrama, los conteos, los
datos clínicos y las descripciones con que se compara cada respuesta salen del
catálogo de DataIQ (`DATAIQ_URL`) al correr. Si un nombre del banco ya no está
en DataIQ, no corre y dice cuál.

Para leer el catálogo hace falta una cuenta de DataIQ: el token va en
`DATAIQ_TOKEN`, o se piden el correo y la contraseña.
"""

import argparse
import asyncio
import csv
import getpass
import os
import re
import statistics
import sys
import time
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, replace
from pathlib import Path

import httpx

from app.adapters.inbound.cli.load_models import MappingError, get_token
from app.adapters.outbound.dataiq.catalog import DataIQCatalogSource
from app.adapters.outbound.language.fake import TemplateChat
from app.adapters.outbound.language.ollama import OllamaAgent
from app.config import config
from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    find_instrument,
    find_technique,
    in_scope,
    normalize,
)
from app.domain.chat import (
    ChatAction,
    ClinicalField,
    Reply,
    Vocabulary,
    spelling_reply,
)
from app.domain.names import canonical, contains, instrument_keys, suggest_spelling
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import ChatEngine, ModelUnavailable

# simiq3d/backend/eval/banco.csv
DEFAULT_FILE = Path(__file__).resolve().parents[4] / "eval" / "banco.csv"

COLUMNS = (
    "id",
    "tipo",
    "pregunta",
    "tecnica_abierta",
    "espera",
    "tecnica",
    "instrumento",
    "dato",
    "otra_tecnica",
)

# Qué pide cada `espera`: técnica (T), instrumento (I), dato y otra técnica (O).
NEEDS = {
    "mostrar": "T",
    "ubicar": "TI",
    "no_va": "TI",
    "varias_mesas": "I",
    "describir": "I",
    "dato": "TD",
    "listar": "T",
    "contar_objetos": "T",
    "contar_tecnicas": "I",
    "mas_objetos": "",
    "solo_en": "TO",
    "comparten": "TO",
    "diferencias": "TO",
    "aclarar": "",
    "fuera": "",
}

# Cuánto de un dato clínico o de una descripción debe traer el texto: la
# proporción de sus palabras de cinco letras o más. El agente cita los datos
# como vienen, pero puede acortar.
COVERAGE = 0.4
# «¿Para qué sirve la Metzenbaum?» se responde con una frase de la descripción:
# basta con que el texto traiga casi toda una de sus frases.
SENTENCE_COVERAGE = 0.6

# Los datos clínicos que puede pedir una pregunta: los del chat, más la
# anestesia y la posición por separado («¿Cuál es la posición del paciente?»
# no pide la anestesia).
DATA_FIELDS = {f.value for f in ClinicalField} | {"anesthesia", "patient_position"}

NUMBERS = {
    1: ("uno", "una"),
    2: ("dos",),
    3: ("tres",),
    4: ("cuatro",),
    5: ("cinco",),
    6: ("seis",),
    7: ("siete",),
    8: ("ocho",),
    9: ("nueve",),
    10: ("diez",),
    11: ("once",),
    12: ("doce",),
}

# Las acciones que abren su técnica en el visor; solo highlight_instrument
# resalta. answer, clarify y no_answer no cambian la escena (contrato de
# POST /chat, en el README del backend).
OPENS = {
    ChatAction.show_technique,
    ChatAction.highlight_instrument,
    ChatAction.show_clinical_data,
    ChatAction.list_instruments,
    ChatAction.describe_instrument,
}

# Cómo dice el chat que no tiene la respuesta, cuando no responde la plantilla.
REFUSALS = (
    "solo puedo",
    "solo cubre",
    "no puedo",
    "no tengo",
    "no trata",
    "no esta",
    "no hay",
)


class BankError(Exception):
    pass


@dataclass(frozen=True)
class Question:
    id: str
    kind: str
    question: str
    open_technique: str
    expects: str
    technique: str
    instrument: str
    field: str
    other_technique: str


@dataclass(frozen=True)
class Outcome:
    question: Question
    reply: Reply | None
    seconds: float
    correct: bool
    reason: str


def read_bank(path: Path) -> list[Question]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        missing = set(COLUMNS) - set(reader.fieldnames or [])
        if missing:
            raise BankError(
                f"Al banco le faltan las columnas: {', '.join(sorted(missing))}"
            )
        return [
            Question(*((row[c] or "").strip() for c in COLUMNS))
            for row in reader
            if (row["pregunta"] or "").strip()
        ]


def check_bank(bank: list[Question], catalog: Catalog) -> None:
    """Que cada fila tenga lo que su `espera` pide y que cada nombre esté en el
    catálogo. Falla con todos los problemas, no solo con el primero."""
    problems = []
    for q in bank:
        needs = NEEDS.get(q.expects)
        if needs is None:
            problems.append(f"{q.id}: no se sabe calificar «{q.expects}»")
            continue
        names = {
            "T": ("tecnica", [q.technique], find_technique),
            "O": ("otra_tecnica", [q.other_technique], find_technique),
            # Una pregunta ambigua puede traer las opciones, separadas por «|».
            "I": ("instrumento", q.instrument.split("|"), find_instrument),
        }
        for need, (column, values, find) in names.items():
            if need in needs and not values[0]:
                problems.append(f"{q.id}: falta {column}")
            for name in values:
                if name and find(catalog, name) is None:
                    problems.append(f"{q.id}: «{name}» no está en DataIQ")
        if q.open_technique and find_technique(catalog, q.open_technique) is None:
            problems.append(f"{q.id}: «{q.open_technique}» no está en DataIQ")
        if "D" in needs and q.field not in DATA_FIELDS:
            problems.append(f"{q.id}: dato desconocido «{q.field}»")
    if problems:
        raise BankError("El banco no cuadra con DataIQ:\n" + "\n".join(problems))


# --- Calificar una respuesta ---------------------------------------------------


def _names_instrument(text: str, instrument: Instrument) -> bool:
    said = canonical(text).replace("mesa de mayo", "")
    keys = instrument_keys(instrument.name, instrument.aliases)
    return any(contains(said, key) for key in keys)


def _names_technique(text: str, technique: Technique) -> bool:
    said = normalize(text)
    key = normalize(technique.name)
    return contains(said, key) or contains(said, key.split()[0])


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"\w+", normalize(text)) if len(w) >= 5}


def _covers(text: str, source: str | None) -> bool:
    words = _words(source or "")
    if not words:
        return False
    return len(words & _words(text)) / len(words) >= COVERAGE


def _covers_a_sentence(text: str, source: str | None) -> bool:
    """El texto trae casi toda una frase de la fuente (de tres palabras de cinco
    letras o más, al menos)."""
    said = _words(text)
    for sentence in re.split(r"[.;:]", source or ""):
        words = _words(sentence)
        if len(words) >= 3 and len(words & said) / len(words) >= SENTENCE_COVERAGE:
            return True
    return False


def _says_number(text: str, n: int) -> bool:
    said = normalize(text)
    return contains(said, str(n)) or any(contains(said, w) for w in NUMBERS.get(n, ()))


def _instruments(technique: Technique, catalog: Catalog) -> list[Instrument]:
    ids = {i for item in technique.mayo_items() for i in item.instrument_ids}
    return [i for i in catalog.instruments if i.id in ids]


def _field_text(technique: Technique, field: str) -> str | None:
    if field == "anesthesia":
        return technique.anesthesia
    if field == "patient_position":
        return technique.patient_position
    if field == ClinicalField.anesthesia_position:
        parts = [technique.anesthesia, technique.patient_position]
        return " ".join(p for p in parts if p) or None
    return getattr(technique, field)


def _goes_in(technique: Technique, instrument: Instrument) -> bool:
    return any(instrument.id in item.instrument_ids for item in technique.mayo_items())


def _all_named(text: str, instruments: list[Instrument]) -> tuple[bool, str]:
    missing = [i.name for i in instruments if not _names_instrument(text, i)]
    return (not missing, "falta " + ", ".join(missing) if missing else "")


def _compare(
    expects: str, text: str, first: Technique, second: Technique, catalog: Catalog
) -> tuple[bool, str]:
    """Una comparación es correcta si nombra lo que corresponde y nada de lo que
    no: listar toda una mesa no responde qué comparten dos técnicas."""
    mine = _instruments(first, catalog)
    theirs = _instruments(second, catalog)
    mine_ids, their_ids = {x.id for x in mine}, {x.id for x in theirs}
    only_mine = [x for x in mine if x.id not in their_ids]
    only_theirs = [x for x in theirs if x.id not in mine_ids]
    shared = [x for x in mine if x.id in their_ids]
    wanted, unwanted = {
        "solo_en": (only_mine, shared),
        "comparten": (shared, only_mine + only_theirs),
        "diferencias": (only_mine + only_theirs, shared),
    }[expects]
    named, reason = _all_named(text, wanted)
    if not named:
        return False, reason
    extra = [x.name for x in unwanted if _names_instrument(text, x)]
    if extra:
        return False, "nombra también " + ", ".join(extra)
    return True, ""


def score(q: Question, reply: Reply, catalog: Catalog) -> tuple[bool, str]:
    """Si la respuesta hace lo que pide `espera`, y por qué no si no lo hace."""
    t = find_technique(catalog, q.technique)
    i = find_instrument(catalog, q.instrument)
    other = find_technique(catalog, q.other_technique)
    text = reply.reply
    opened = reply.technique_id if reply.action in OPENS else None
    highlighted = (
        reply.instrument_id if reply.action == ChatAction.highlight_instrument else None
    )
    match q.expects:
        case "mostrar":
            if opened == t.id:
                return True, ""
            return False, "el visor no abre la técnica"
        case "ubicar":
            if opened == t.id and highlighted == i.id:
                return True, ""
            return False, "el visor no resalta el instrumento en esa técnica"
        case "no_va":
            if opened == t.id and highlighted == i.id:
                return False, "resalta un instrumento que no va en esa mesa"
            return True, ""
        case "varias_mesas":
            where = [x for x in in_scope(catalog) if _goes_in(x, i)]
            if reply.action == ChatAction.clarify:
                return True, ""
            if all(_names_technique(text, x) for x in where):
                return True, ""
            return False, "ni pregunta en cuál técnica ni nombra todas"
        case "describir":
            if _covers(text, i.description) or _covers_a_sentence(text, i.description):
                return True, ""
            return False, "no trae la descripción de DataIQ"
        case "dato":
            if _covers(text, _field_text(t, q.field)):
                return True, ""
            return False, "no trae el dato de DataIQ"
        case "listar":
            return _all_named(text, _instruments(t, catalog))
        case "contar_objetos":
            n = len(t.mayo_items())
            return (True, "") if _says_number(text, n) else (False, f"no dice {n}")
        case "contar_tecnicas":
            n = sum(1 for x in in_scope(catalog) if _goes_in(x, i))
            return (True, "") if _says_number(text, n) else (False, f"no dice {n}")
        case "mas_objetos":
            most = max(len(x.mayo_items()) for x in in_scope(catalog))
            top = [x for x in in_scope(catalog) if len(x.mayo_items()) == most]
            if any(_names_technique(text, x) for x in top):
                return True, ""
            return False, "no nombra " + " o ".join(x.name for x in top)
        case "solo_en" | "comparten" | "diferencias":
            return _compare(q.expects, text, t, other, catalog)
        case "aclarar":
            if reply.action == ChatAction.clarify:
                return True, ""
            # Si la pregunta es ambigua («el bisturí» de una mesa que lleva dos),
            # también es correcto responder por cada opción.
            options = [find_instrument(catalog, n) for n in q.instrument.split("|")]
            if "|" in q.instrument and all(_names_instrument(text, o) for o in options):
                return True, ""
            return False, "no pide precisar"
        case "fuera":
            if opened or highlighted:
                return False, "abre algo en el visor"
            if reply.action == ChatAction.no_answer or any(
                r in normalize(text) for r in REFUSALS
            ):
                return True, ""
            return False, "responde en vez de decir que no tiene la respuesta"
    raise BankError(f"{q.id}: no se sabe calificar «{q.expects}»")


# --- Correr el banco ---------------------------------------------------------


async def ask(
    q: Question, catalog: Catalog, engine: ChatEngine
) -> tuple[Reply | None, float]:
    """Como la ruta del chat: si un nombre parece mal escrito, responde el
    corrector; si no, el motor."""
    started = time.perf_counter()
    open_technique = find_technique(catalog, q.open_technique)
    corrected = suggest_spelling(q.question, Vocabulary.from_catalog(catalog))
    if corrected:
        reply = replace(spelling_reply(corrected), answered_by="corrector")
    else:
        try:
            reply = await engine.reply(
                q.question, catalog, open_technique.id if open_technique else None
            )
        except ModelUnavailable:
            reply = None
        if reply is not None and not reply.answered_by:
            reply = replace(reply, answered_by=engine.name)
    return reply, time.perf_counter() - started


async def run(
    bank: list[Question],
    catalog: Catalog,
    engine: ChatEngine,
    progress: Callable[[int, int], None] = lambda done, total: None,
) -> list[Outcome]:
    outcomes = []
    for n, q in enumerate(bank, 1):
        reply, seconds = await ask(q, catalog, engine)
        if reply is None:
            outcomes.append(Outcome(q, None, seconds, False, "el modelo no respondió"))
        else:
            correct, reason = score(q, reply, catalog)
            outcomes.append(Outcome(q, reply, seconds, correct, reason))
        progress(n, len(bank))
    return outcomes


def who(reply: Reply | None) -> str:
    """Quién armó la respuesta, agrupado para el informe: el corrector, el
    modelo, las plantillas como motor o las plantillas como respaldo del
    modelo."""
    if reply is None:
        return "sin respuesta"
    by = reply.answered_by
    if by == "corrector":
        return "corrector"
    if by.startswith(TemplateChat.name):
        return "respaldo" if "respaldo" in by else TemplateChat.name
    return "modelo"


def summary(outcomes: list[Outcome]) -> str:
    def line(label: str, group: list[Outcome]) -> str:
        right = sum(o.correct for o in group)
        share = 100 * right / len(group)
        return f"  {label:<20} {right:>3}/{len(group):<3} {share:5.1f} %"

    total = sum(o.correct for o in outcomes)
    lines = [
        f"Exactitud: {total}/{len(outcomes)} ({100 * total / len(outcomes):.1f} %)"
    ]
    for title, key in (
        ("Por lo que se espera:", lambda q: q.expects),
        ("Por tipo de pregunta:", lambda q: q.kind),
    ):
        groups: dict[str, list[Outcome]] = {}
        for o in outcomes:
            groups.setdefault(key(o.question), []).append(o)
        lines += ["", title]
        lines += [line(label, group) for label, group in sorted(groups.items())]
    by_who = Counter(who(o.reply) for o in outcomes)
    lines += ["", "Quién respondió:"]
    lines += [f"  {label:<20} {n:>3}" for label, n in by_who.most_common()]
    seconds = [o.seconds for o in outcomes]
    lines += [
        "",
        f"Tiempo por pregunta: mediana {statistics.median(seconds):.1f} s, "
        f"máximo {max(seconds):.1f} s",
    ]
    return "\n".join(lines)


def write_results(path: Path, outcomes: list[Outcome], catalog: Catalog) -> None:
    techniques = {t.id: t.name for t in catalog.techniques}
    instruments = {i.id: i.name for i in catalog.instruments}
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            (
                "id",
                "tipo",
                "espera",
                "pregunta",
                "correcta",
                "motivo",
                "accion",
                "tecnica",
                "instrumento",
                "respondio",
                "segundos",
                "respuesta",
            )
        )
        for o in outcomes:
            r = o.reply
            writer.writerow(
                (
                    o.question.id,
                    o.question.kind,
                    o.question.expects,
                    o.question.question,
                    "sí" if o.correct else "no",
                    o.reason,
                    r.action.value if r else "",
                    techniques.get(r.technique_id, "") if r else "",
                    instruments.get(r.instrument_id, "") if r else "",
                    who(r),
                    f"{o.seconds:.1f}",
                    r.reply if r else "",
                )
            )


def _engine() -> ChatEngine:
    if config.language_model == "ollama":
        return OllamaAgent(
            config.llm_url,
            config.llm_model,
            config.llm_api_key,
            config.llm_timeout,
            config.llm_deadline,
        )
    return TemplateChat()


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Corre el banco de preguntas.")
    parser.add_argument(
        "--banco", dest="path", metavar="ARCHIVO", type=Path, default=DEFAULT_FILE
    )
    parser.add_argument(
        "--salida",
        dest="output",
        metavar="ARCHIVO",
        type=Path,
        help="CSV con cada pregunta, su respuesta y su calificación",
    )
    args = parser.parse_args(argv)
    try:
        bank = read_bank(args.path)
        token = os.environ.get("DATAIQ_TOKEN") or await get_token(
            config.dataiq_url,
            input("Correo de DataIQ: "),
            getpass.getpass("Contraseña: "),
        )
        catalog = await DataIQCatalogSource(config.dataiq_url).get(token)
        check_bank(bank, catalog)
    except (
        BankError,
        MappingError,
        CatalogDenied,
        CatalogUnavailable,
        OSError,
        httpx.HTTPError,
    ) as error:
        print(f"No se corrió el banco. {error}", file=sys.stderr)
        return 1
    engine = _engine()
    print(f"{len(bank)} preguntas con el motor «{engine.name}».", file=sys.stderr)
    if sys.stderr.isatty():
        outcomes = await run(
            bank,
            catalog,
            engine,
            lambda done, total: print(f"\r{done}/{total}", end="", file=sys.stderr),
        )
        print(file=sys.stderr)
    else:
        outcomes = await run(bank, catalog, engine)
    print(summary(outcomes))
    if args.output:
        write_results(args.output, outcomes, catalog)
        print(f"\nDetalle en {args.output}.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
