"""La revisión de lo que escribe el tutor, frase por frase (README de SIMIQ3D,
«Chat»). Solo se revisan los límites duros, los que el modelo no puede cruzar
aunque explique con su conocimiento general:

- la mesa de Mayo: un instrumento que no va en esa mesa, o su número del
  diagrama, su zona o cuántos objetos lleva, distintos de DataIQ;
- ordenar o agrupar la mesa por tiempos quirúrgicos u orden de uso;
- dosis de medicamentos;
- filas, columnas o celdas.

La frase que cruza uno se quita, y en su lugar va el dato de DataIQ o una nota
de lo que DataIQ no tiene: nunca se descarta en silencio. El resto de la
respuesta queda como la escribió el modelo."""

import re
from dataclasses import dataclass, field

from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    item_with,
    normalize,
    place,
)
from app.domain.chat import ChatAction, Choice, answer, the
from app.domain.focus import all_instruments, techniques_named
from app.domain.names import canonical, instrument_keys, instruments_at

NO_TIMES = (
    "DataIQ no tiene los tiempos quirúrgicos ni el orden en que se usa el "
    "instrumental: solo dónde va cada pieza en la mesa de Mayo."
)
NO_DOSES = (
    "El chat no da dosis de medicamentos: las indica el equipo médico para cada "
    "paciente."
)

_GRID = re.compile(r"\b(?:fila|columna|celda)s?\b")
# SIMIQ3D no deja mover las piezas: el modelo lo proponía igual.
_MOVE = re.compile(
    r"\b(?:puedes|podras|podes|intenta|prueba a)\s+(?:\w+\s+)?"
    r"(?:mover\w*|reorganiz\w*|arrastr\w*|reacomod\w*|reubic\w*)"
)
NO_MOVING = "En SIMIQ3D la mesa se mira y se consulta: sus piezas no se mueven."
# Una dosis: una cifra con su unidad («50 mg», «1 mg/kg», «2 ml»).
_DOSE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|μg|g|ml|cc|ui|u\.i\.|unidades|meq)"
    r"(?:\s*/\s*(?:kg|h|hora|dia|m2))?\b",
    re.IGNORECASE,
)
# Ordenar el instrumental: siempre es un límite, DataIQ no tiene el orden de uso.
_ORDER = re.compile(
    r"\borden\s+de\s+uso\b"
    r"|\b(?:en\s+que\s+orden|orden\s+en\s+(?:el\s+)?que)\s+se\s+"
    r"(?:usa|usan|utiliza|utilizan|pide|piden|pasa|pasan)\b"
    r"|\bse\s+(?:usa|usan|utiliza|utilizan|pide|piden|pasa|pasan)\s+"
    r"(?:primero|despues|antes|al\s+(?:principio|final)|de\s+ultimo)\b"
    r"|\b(?:primero|despues|luego|antes|al\s+final)\s+se\s+"
    r"(?:usa|usan|utiliza|utilizan|pide|piden|pasa|pasan)\b"
)
# Los tiempos quirúrgicos: explicarlos está bien; ubicar o agrupar la mesa por
# ellos, no.
_TIMES = re.compile(
    r"\btiempos?\s+(?:quirurgicos?|operatorios?)\b"
    r"|\b(?:dieresis|hemostasia|sintesis)\b"
    r"|\b(?:fase|tiempo|etapa)\s+de\s+(?:exposicion|separacion|corte|cierre)\b"
    r"|\b(?:esta|esa|cada|la\s+misma)\s+(?:fase|etapa)\b"
)
# Ubicar una pieza en la mesa, no solo nombrar la mesa: «se usa en la diéresis»
# de una pieza que «está en esta mesa» es explicar para qué sirve.
_PLACEMENT = re.compile(
    r"\b(?:zona|ubicad\w*|dispuest\w*|disposicion|agrup\w*|organiz\w*|"
    r"ordenad\w*|arriba|abajo|izquierda|derecha|centro|al lado|junto)\b"
)
# Una frase que dice qué lleva una mesa o dónde va algo en ella.
_TABLE_CLAIM = re.compile(
    r"\b(?:mesa|diagrama|numero|zona|arriba|abajo|izquierda|derecha|centro|junto|"
    r"al lado|ubic\w*|coloc\w*)\b|\bn\s*\.?\s*[°º]|\(\s*\d+\s*\)"
)
_NEGATION = re.compile(
    r"\bno\s+(?:va|van|esta|estan|lleva|llevan|incluye|aparece|forma|se)\b"
    r"|\bninguna?\b"
)
_LEGEND = re.compile(r"(?:\bn\s*\.?\s*[°º]|\bnumero\b|#)\s*(\d+)")
# «Pinza de Allis (1)»: el número entre paréntesis, justo después del nombre.
_PAREN = re.compile(r"^\W{0,3}\(\s*(?:n\s*\.?\s*[°º]\s*)?(\d+)\s*\)")
_COUNT_WORDS = {
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
    "cinco": 5,
    "seis": 6,
    "siete": 7,
    "ocho": 8,
    "nueve": 9,
    "diez": 10,
    "once": 11,
    "doce": 12,
    "trece": 13,
    "catorce": 14,
    "quince": 15,
}
_COUNTED = re.compile(
    r"\b(\d+|" + "|".join(_COUNT_WORDS) + r")\s+(?:\w+\s+)?"
    r"(?:instrumentos?|objetos?|piezas?|elementos?)\b"
)
# Una zona dicha respecto de otra pieza («a la derecha de la Kelly») no es la
# zona de la mesa.
_RELATIVE = re.compile(
    r"\b(?:arriba|abajo|izquierda|derecha)\s+(?:de|del)\s+(?!la\s+mesa)"
)
_LIST_MARK = re.compile(r"^(\s*(?:(?:[-*•]|\d+[.)])\s+)+)")
# Después de «obj.», «n.» o «aprox.» no termina la frase, ni antes de una cifra
# («(obj. 8)»).
_SENTENCE_END = re.compile(
    r"(?<!\bobj\.)(?<!\bn\.)(?<!\bno\.)(?<!\bnro\.)(?<!\baprox\.)"
    r"(?<=[.!?])\s+(?=[¿¡«\"(*A-ZÁÉÍÓÚÑ])"
)


@dataclass(frozen=True)
class Problem:
    """Un límite que cruza una frase: qué es (va al log y a la segunda
    oportunidad) y el dato o la nota que va en su lugar, si hay."""

    kind: str
    detail: str
    fact: str = ""


_GROUPED = Problem(
    "tiempos",
    "agrupa el instrumental por tiempos quirúrgicos",
    NO_TIMES,
)


@dataclass(frozen=True)
class Reviewed:
    text: str
    problems: tuple[Problem, ...] = ()
    sentences: int = 0
    removed: int = 0

    @property
    def mostly_removed(self) -> bool:
        """Si la revisión quitó más de la mitad de la respuesta (o toda)."""
        return not self.text.strip() or (
            self.removed >= 2 and self.removed * 2 > self.sentences
        )


@dataclass
class _Context:
    catalog: Catalog
    # La mesa de la que se habla si la frase no nombra otra.
    table: Technique | None
    numbers: set[str] = field(default_factory=set)
    # El instrumento del que se habla, si la frase no lo nombra.
    subject: Instrument | None = None


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\b\d+\b", canonical(text)))


def _location(catalog: Catalog, instrument: Instrument, technique: Technique) -> str:
    """Dónde va el instrumento en esa mesa, o que no va y dónde sí, como lo dice
    la respuesta de DataIQ (`app/domain/chat.py`)."""
    return answer(
        Choice(ChatAction.highlight_instrument, technique.name, instrument.name),
        catalog,
        None,
    ).reply


_ZONE_SYNONYMS = {
    "superior": "arriba",
    "inferior": "abajo",
    "central": "centro",
    "medio": "centro",
}


def zone_of(said: str) -> tuple[str | None, str | None]:
    """La zona que dice un texto, como (vertical, horizontal): «arriba a la
    derecha» es (arriba, derecha); «en el centro», (centro, centro); «abajo, al
    centro», (abajo, centro). None en lo que no dice. Una zona dicha respecto de
    otra pieza («a la derecha de la Kelly») no cuenta."""
    said = _RELATIVE.sub(" ", said)
    # «Zona superior», «central», «inferior»: lo mismo dicho de otra forma.
    for synonym, word in _ZONE_SYNONYMS.items():
        said = re.sub(rf"\b{synonym}\b", word, said)
    words = set(re.findall(r"\b(?:arriba|abajo|izquierda|derecha|centro)\b", said))
    side = next((w for w in ("izquierda", "derecha") if w in words), None)
    level = next((w for w in ("arriba", "abajo") if w in words), None)
    if level:
        return level, side or ("centro" if "centro" in words else None)
    if "centro" in words:
        return "centro", side or "centro"
    return None, side


def wrong_zone(said: str, real: str) -> bool:
    """Si la zona que dice el texto no es la de DataIQ (`place`)."""
    level, side = zone_of(said)
    real_level, real_side = zone_of(normalize(real))
    return bool((level and level != real_level) or (side and side != real_side))


def _table_problems(
    sentence: str, ctx: _Context, listed: int | None = None
) -> list[Problem]:
    said = normalize(sentence)
    if not _TABLE_CLAIM.search(said) and listed is None:
        return []
    catalog = ctx.catalog
    named = techniques_named(catalog, sentence)
    tables = named or ([ctx.table] if ctx.table else [])
    vocabulary = all_instruments(catalog)
    by_name = {i.name: i for i in catalog.instruments}
    at = [(pos, by_name[n]) for pos, n in instruments_at(sentence, vocabulary)]
    mentioned = list(dict.fromkeys(i for _, i in at))
    if named and ctx.subject and ctx.subject not in mentioned:
        found = _subject_problems(said, ctx, named, at)
        if found:
            return found
    if not mentioned:
        return _unknown_items(said, ctx, tables, listed) or _zone_numbers(
            sentence, ctx
        ) + _count_problems(said, ctx, tables)
    problems: list[Problem] = []
    negated = bool(_NEGATION.search(said))
    if tables:
        # Si la frase ubica otra pieza que sí va («la Babcock va junto a la
        # Kelly Adson»), el dato que corrige es el de esa pieza.
        placed = next(
            (i for i in mentioned if any(item_with(t, i.id) for t in tables)), None
        )
        for instrument in mentioned:
            goes = [t for t in tables if item_with(t, instrument.id)]
            if not negated and not goes:
                problems.append(
                    Problem(
                        "mesa",
                        f"{instrument.name} no va en la mesa de Mayo de "
                        + " ni en la de ".join(t.name for t in tables),
                        _location(catalog, placed or instrument, tables[0]),
                    )
                )
            elif negated and len(mentioned) == 1 and len(tables) == 1 and goes:
                problems.append(
                    Problem(
                        "mesa",
                        f"{instrument.name} sí va en la mesa de Mayo de "
                        f"{tables[0].name}",
                        _location(catalog, instrument, tables[0]),
                    )
                )
    if problems or len(tables) != 1:
        return problems + _count_problems(said, ctx, tables)
    table = tables[0]
    in_table = [i for i in mentioned if item_with(table, i.id)]
    if in_table and not negated:
        problems += _zone_names(sentence, ctx, table, in_table) or (
            _placement_problems(said, ctx, table, in_table, listed)
        )
    return problems + _count_problems(said, ctx, tables)


def _spans(
    said: str, instruments: list[Instrument]
) -> list[tuple[int, int, Instrument]]:
    """Dónde nombra el texto normalizado cada instrumento: por su nombre, sus
    alias o sus formas cortas («la Kelly»), sin que dos se pisen."""
    found = []
    for instrument in instruments:
        names = (instrument.name, *instrument.aliases)
        keys = instrument_keys(instrument.name, instrument.aliases)
        keys |= {normalize(n) for n in names}
        for key in keys:
            for match in re.finditer(rf"(?<!\w){re.escape(key)}(?!\w)", said):
                found.append((match.start(), match.end(), instrument))
    spans: list[tuple[int, int, Instrument]] = []
    taken_until = -1
    for start, end, instrument in sorted(found, key=lambda m: (m[0], m[0] - m[1])):
        if start >= taken_until:
            spans.append((start, end, instrument))
            taken_until = end
    return spans


def _placement_problems(
    said: str,
    ctx: _Context,
    table: Technique,
    in_table: list[Instrument],
    listed: int | None,
) -> list[Problem]:
    """El número del diagrama y la zona de una pieza de la mesa, si la frase los
    dice justo después de nombrarla (antes de nombrar otra): «la Kelly va en el
    centro (n.º 10)». En una lista numerada («8. Pinza Rochester»), el número
    de la lista es el del diagrama."""
    spans = _spans(said, in_table)
    if not spans:
        return []
    start, end, first = spans[0]
    item = item_with(table, first.id)
    fact = _location(ctx.catalog, first, table)
    after = said[end : spans[1][0]] if len(spans) > 1 else said[end:]
    legend = _LEGEND.search(after) or _PAREN.search(after)
    said_number = legend.group(1) if legend else None
    if listed is not None and start <= 4:
        if item.legend_number and listed != item.legend_number:
            # En una lista numerada, el número se corrige en su lugar.
            return [
                Problem(
                    "numero",
                    f"{first.name} es el n.º {item.legend_number} del diagrama, no "
                    f"el {listed}",
                    str(item.legend_number),
                )
            ]
        said_number = None
    if said_number and item.legend_number and said_number != str(item.legend_number):
        return [
            Problem(
                "mesa",
                f"{first.name} es el n.º {item.legend_number} del diagrama, no el "
                f"{said_number}",
                fact,
            )
        ]
    zone = place(table, item)
    if zone and wrong_zone(after, zone):
        return [Problem("mesa", f"{first.name} va {zone} de la mesa", fact)]
    return _together(said, ctx, table, spans)


# «La Rochester y la Allis están arriba a la izquierda»: la zona es de todas.
_PLURAL = re.compile(r"\b(?:estan|van|se ubican|se encuentran|quedan|se colocan)\b")


def _together(said: str, ctx: _Context, table: Technique, spans: list) -> list:
    """Varias piezas con un verbo en plural y una zona después de la última:
    cada una tiene que ir en esa zona."""
    pieces = list(dict.fromkeys(i for _, _, i in spans))
    if len(pieces) < 2:
        return []
    after = said[spans[-1][1] :]
    plural = _PLURAL.search(after)
    if not plural or zone_of(after[plural.end() :]) == (None, None):
        return []
    zone_text = after[plural.end() :]
    for piece in pieces:
        zone = place(table, item_with(table, piece.id))
        if zone and wrong_zone(zone_text, zone):
            return [
                Problem(
                    "mesa",
                    f"{piece.name} va {zone} de la mesa",
                    _location(ctx.catalog, piece, table),
                )
            ]
    return []


def _zone_numbers(sentence: str, ctx: _Context) -> list[Problem]:
    """Una zona con los números del diagrama que van en ella («arriba a la
    derecha: 8 y 9»): cada número tiene que ir en esa zona. Si alguno no va, la
    línea queda con los que sí, y el que no, con su zona."""
    table = ctx.table
    head, _, rest = sentence.partition(":")
    zone_head = _without_techniques(normalize(head), ctx.catalog)
    if table is None or not rest or zone_of(zone_head) == (None, None):
        return []
    by_number = {i.legend_number: i for i in table.mayo_items() if i.legend_number}
    right, wrong = [], []
    for number in re.findall(r"\b\d+\b", rest):
        item = by_number.get(int(number))
        zone = place(table, item) if item else None
        if zone is None:
            continue
        (wrong if wrong_zone(zone_head, zone) else right).append((number, item))
    if not wrong:
        return []
    facts = [f"{head.strip()}: {_and([n for n, _ in right])}."] if right else []
    facts += [f"El n.º {n} ({item.name}) va {place(table, item)}." for n, item in wrong]
    return [
        Problem(
            "mesa",
            "; ".join(f"el n.º {n} va {place(table, item)}" for n, item in wrong),
            " ".join(facts),
        )
    ]


def _zone_names(
    sentence: str, ctx: _Context, table: Technique, in_table: list[Instrument]
) -> list[Problem]:
    """Una zona con las piezas que van en ella («En el centro: la Tijera de Mayo
    y la Kelly»): cada pieza tiene que ir en esa zona. Si alguna no va, la línea
    queda con las que sí, y la que no, con su zona."""
    head, _, rest = sentence.partition(":")
    zone_head = _without_techniques(normalize(head), ctx.catalog)
    # «… junto a la Rochester»: las vecinas no son de esa zona.
    if not rest or zone_of(zone_head) == (None, None) or _NEAR.search(normalize(rest)):
        return []
    named = [i for _, _, i in _spans(normalize(rest), in_table)]
    # «La Kelly va en el centro: …» ubica a la Kelly, no a la lista.
    if not named or _spans(zone_head, in_table):
        return []
    zones = {i: place(table, item_with(table, i.id)) for i in named}
    right = [i for i in named if not (zones[i] and wrong_zone(zone_head, zones[i]))]
    wrong = [i for i in named if i not in right]
    if not wrong:
        return []
    facts = [f"{head.strip()}: {_and([the(i.name) for i in right])}."] if right else []
    facts += [
        f"{_capital(the(i.name))} va {place(table, item_with(table, i.id))}."
        for i in wrong
    ]
    return [
        Problem(
            "mesa",
            "; ".join(
                f"{i.name} va {place(table, item_with(table, i.id))}" for i in wrong
            ),
            " ".join(facts),
        )
    ]


_NEAR = re.compile(r"\b(?:junto|al lado|cerca|vecin\w*)\b")


def _without_techniques(said: str, catalog: Catalog) -> str:
    """El texto sin los nombres de las técnicas: «Hemicolectomía derecha» no es
    una zona."""
    for technique in catalog.techniques:
        said = said.replace(normalize(technique.name), " ")
    return said


def _capital(text: str) -> str:
    return text[:1].upper() + text[1:]


def _and(items: list[str]) -> str:
    return items[0] if len(items) == 1 else f"{', '.join(items[:-1])} y {items[-1]}"


def _segments(said: str, tables: list[Technique]) -> list[tuple[Technique, str]]:
    """El tramo de la frase que habla de cada mesa: desde que la nombra hasta
    que nombra la siguiente, sin el nombre («Hemicolectomía derecha» no es una
    zona)."""
    marks = []
    for table in tables:
        key = normalize(table.name)
        for k in (key, key.split()[0]):
            match = re.search(rf"(?<!\w){re.escape(k)}(?!\w)", said)
            if match:
                marks.append((match.start(), match.end(), table))
                break
    marks.sort(key=lambda m: m[0])
    return [
        (table, said[end : marks[n + 1][0] if n + 1 < len(marks) else len(said)])
        for n, (_, end, table) in enumerate(marks)
    ]


def _subject_problems(
    said: str, ctx: _Context, tables: list[Technique], at: list
) -> list[Problem]:
    """«En la eventrorrafia también va en el centro», «Hemicolectomía derecha:
    n.º 8 (arriba)»: la frase no nombra la pieza, pero habla de la de la
    pregunta. Lo que dice de cada mesa (su zona y su número, antes de nombrar
    otra pieza) tiene que ser lo de esa mesa."""
    subject = ctx.subject
    if subject is None:
        return []
    others = list(dict.fromkeys(i for _, i in at))
    for table, segment in _segments(said, tables):
        item = item_with(table, subject.id)
        if item is None:
            continue
        spans = _spans(segment, others)
        segment = segment[: spans[0][0]] if spans else segment
        fact = _location(ctx.catalog, subject, table)
        legend = _LEGEND.search(segment)
        if legend and item.legend_number and legend.group(1) != str(item.legend_number):
            return [
                Problem(
                    "mesa",
                    f"{subject.name} es el n.º {item.legend_number} de la mesa de "
                    f"{table.name}, no el {legend.group(1)}",
                    fact,
                )
            ]
        zone = place(table, item)
        if zone and wrong_zone(segment, zone):
            return [
                Problem(
                    "mesa",
                    f"{subject.name} va {zone} de la mesa de Mayo de {table.name}",
                    fact,
                )
            ]
    return []


# Un nombre de objeto de la mesa: «pinza de hemostasia», «cuchillo de sutura».
_TOOL_NAME = re.compile(
    r"\b(pinza|tijera|separador|mango|hoja|portaagujas|cuchillo|valva|"
    r"retractor|cureta|sonda)(?:e?s)?\s+(?:de\s+)?([a-z]{4,})"
)


def _unknown_items(
    said: str, ctx: _Context, tables: list[Technique], listed: int | None
) -> list[Problem]:
    """Un objeto de la mesa con su número cuyo nombre no es de DataIQ («Pinza
    de hemostasia (número 3)», «Cuchillo de sutura»): el modelo inventó la mesa.
    «El bisturí» o «las pinzas de disección» sí son de la mesa."""
    numbered = listed is not None or _LEGEND.search(said) or _PAREN.search(said)
    if not (numbered and len(tables) == 1):
        return []
    names = [canonical(i.name) for i in ctx.catalog.instruments]
    for match in _TOOL_NAME.finditer(said):
        kind, word = match.groups()
        known = any(
            n.startswith(kind) and word in n.split() or n.startswith(f"{kind} {word}")
            for n in names
        )
        if not known:
            table = tables[0]
            return [
                Problem(
                    "mesa",
                    f"nombra un objeto que no está en DataIQ: «{match.group(0)}»",
                    f"Ese objeto no está en la mesa de Mayo de {table.name} de DataIQ.",
                )
            ]
    return []


def _count_problems(said: str, ctx: _Context, tables: list[Technique]) -> list:
    """Cuántos objetos lleva una mesa, o un número del diagrama, que no salen
    de los datos."""
    for match in _COUNTED.finditer(said):
        value = match.group(1)
        number = str(_COUNT_WORDS.get(value, value))
        if number not in ctx.numbers:
            fact = (
                f"La mesa de Mayo de {tables[0].name} lleva "
                f"{len(tables[0].mayo_items())} objetos."
                if len(tables) == 1
                else ""
            )
            return [Problem("cifra", f"la cifra {number} no sale de DataIQ", fact)]
    return []


def problems_in(
    sentence: str, ctx: _Context, listed: int | None = None
) -> list[Problem]:
    """Los límites que cruza la frase. `listed` es su número en una lista
    numerada, si lo tiene."""
    said = normalize(sentence)
    problems = []
    if _GRID.search(said):
        problems.append(Problem("cuadricula", "habla de filas, columnas o celdas"))
    if _DOSE.search(sentence):
        problems.append(Problem("dosis", "da una dosis", NO_DOSES))
    if _MOVE.search(said):
        problems.append(Problem("app", "propone mover las piezas", NO_MOVING))
    by_name = {i.name for i in ctx.catalog.instruments}
    several = (
        len([n for n in dict.fromkeys(_names(sentence, ctx.catalog)) if n in by_name])
        >= 2
    )
    # «La mesa no se ordena por tiempos quirúrgicos» dice el límite, no lo cruza.
    denies = bool(re.search(r"\b(?:no|ni|sin)\b", said))
    # «Hemostasia: Pinza Kelly» también agrupa por tiempos.
    labelled = ":" in said and bool(_names(sentence, ctx.catalog))
    if not denies and (
        _ORDER.search(said)
        or (_TIMES.search(said) and (_PLACEMENT.search(said) or several or labelled))
    ):
        problems.append(
            Problem(
                "tiempos",
                "ordena o agrupa el instrumental por tiempos quirúrgicos u orden "
                "de uso",
                NO_TIMES,
            )
        )
    if not problems:
        problems += _table_problems(sentence, ctx, listed)
    return problems


def _names(text: str, catalog: Catalog) -> list[str]:
    return [n for _, n in instruments_at(text, all_instruments(catalog))]


def _split(line: str) -> tuple[str, int | None, list[str]]:
    """La marca de lista de la línea, su número si es una lista numerada, y sus
    frases."""
    mark = _LIST_MARK.match(line)
    prefix = mark.group(1) if mark else ""
    number = re.search(r"(\d+)[.)]\s*$", prefix)
    body = line[len(prefix) :]
    sentences = [s for s in _SENTENCE_END.split(body) if s.strip()]
    return prefix, int(number.group(1)) if number else None, sentences


class Reviewer:
    """La revisión a medida que llega el texto (*streaming*): `feed` recibe cada
    parte que escribe el modelo y devuelve lo que ya se puede mostrar, frase
    por frase, revisado; `finish`, lo que quedaba. Lo mostrado, unido, es el
    mismo texto que da `review` con el texto entero."""

    def __init__(
        self,
        catalog: Catalog,
        table: Technique | None,
        data: str,
        question: str = "",
        subject: Instrument | None = None,
        source: str | None = None,
    ) -> None:
        self._catalog = catalog
        self._ctx = _Context(catalog, table, _numbers(f"{data}\n{question}"), subject)
        # El texto entero, si ya se tiene; si no, lo que ha llegado.
        self._source = source
        self._seen = ""
        self._line = ""
        self._started = False
        self._done = 0
        self._prefix = ""
        self._listed: int | None = None
        self._kept = 0
        self._blank = 0
        self._out: list[str] = []
        self._facts: set[str] = set()
        self._grouping = False
        self.problems: list[Problem] = []
        self.sentences = 0
        self.removed = 0

    def feed(self, part: str) -> str:
        self._seen += part
        self._line += part
        shown = []
        while "\n" in self._line:
            line, self._line = self._line.split("\n", 1)
            shown.append(self._close(line))
        shown.append(self._advance(self._line, final=False))
        return "".join(shown)

    def finish(self) -> str:
        shown = self._close(self._line) if self._line else ""
        self._line = ""
        return shown

    def result(self) -> Reviewed:
        return Reviewed(self.text, tuple(self.problems), self.sentences, self.removed)

    @property
    def text(self) -> str:
        return "".join(self._out).strip()

    def _close(self, line: str) -> str:
        if not line.strip():
            self._blank += 1
            self._reset()
            return ""
        shown = self._advance(line, final=True)
        self._reset()
        return shown

    def _reset(self) -> None:
        self._started = False
        self._done = 0
        self._kept = 0

    def _advance(self, line: str, final: bool) -> str:
        """Revisa las frases de la línea que ya están completas (todas, si la
        línea terminó)."""
        prefix, listed, sentences = _split(line)
        ready = sentences if final else sentences[:-1]
        if not ready[self._done :]:
            return ""
        if not self._started:
            self._started = True
            self._prefix, self._listed = prefix, listed
            if not prefix:
                self._grouping = False
        shown = []
        for sentence in ready[self._done :]:
            shown += [self._show(p) for p in self._check(sentence, self._done == 0)]
            self._done += 1
        return "".join(shown)

    def _check(self, sentence: str, first: bool) -> list[str]:
        """Lo que queda de la frase: ella misma o, si cruza un límite, el dato
        o la nota que van en su lugar."""
        self.sentences += 1
        found = problems_in(sentence, self._ctx, self._listed if first else None)
        numbers = [p for p in found if p.kind == "numero"]
        if numbers:
            self.problems += numbers
            self._prefix = re.sub(r"\d+(?=[.)]\s*$)", numbers[0].fact, self._prefix)
            found = [p for p in found if p.kind != "numero"]
        said = normalize(sentence)
        if not found and self._grouping and _names(sentence, self._catalog):
            # Una pieza en la lista que sigue a «el instrumental de diéresis…:»
            found = [_GROUPED]
        if (
            said.rstrip(" *").endswith(":")
            and _TIMES.search(said)
            and not re.search(r"\b(?:no|ni|sin)\b", said)
        ):
            self._grouping = True
            found = found or [_GROUPED]
        if not found:
            return [sentence]
        self.removed += 1
        self.problems += found
        source = self._source if self._source is not None else self._seen
        kept = []
        for p in found:
            if p.fact and p.fact not in self._facts and p.fact not in source:
                self._facts.add(p.fact)
                kept.append(p.fact)
        return kept

    def _show(self, piece: str) -> str:
        if self._kept == 0:
            separator = "\n" * min(self._blank + 1, 2) if self._out else ""
            shown = separator + self._prefix + piece
            self._blank = 0
        else:
            shown = " " + piece
        self._kept += 1
        self._out.append(shown)
        return shown


def review(
    text: str,
    catalog: Catalog,
    table: Technique | None,
    data: str,
    question: str = "",
    subject: Instrument | None = None,
) -> Reviewed:
    """El texto con las frases que cruzan un límite cambiadas por el dato de
    DataIQ o la nota de lo que no tiene (una vez cada una). `table` es la mesa
    de la que se habla si una frase no nombra otra; `data`, lo que tuvo el
    modelo (de ahí salen las cifras que puede decir); `subject`, el instrumento
    del que se habla."""
    reviewer = Reviewer(catalog, table, data, question, subject, source=text)
    reviewer.feed(text.strip())
    reviewer.finish()
    return reviewer.result()


def crossed(text: str, catalog: Catalog) -> set[str]:
    """Los límites que cruza un texto ya mostrado, sin sus datos: tiempos
    quirúrgicos u orden de uso, dosis y cuadrícula. Lo usa el banco de
    preguntas para calificar cualquier motor."""
    kinds = {"tiempos", "dosis", "cuadricula"}
    reviewed = review(text, catalog, None, text)
    return {p.kind for p in reviewed.problems if p.kind in kinds}
