"""De qué se habla en una pregunta del chat tutor, decidido por el código y no por
el modelo de lenguaje (README de SIMIQ3D, «Chat»): las técnicas y los
instrumentos que nombra, la técnica abierta en el visor y, en un seguimiento
(«¿y cuándo se usa?»), lo de las preguntas anteriores. Con esto se traen los
datos de DataIQ (`app/domain/tutor.py`) y se decide qué hace el visor."""

import re
from dataclasses import dataclass
from uuid import UUID

from app.domain import tools
from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    in_scope,
    item_with,
    normalize,
    technique_by_id,
)
from app.domain.chat import Vocabulary
from app.domain.guards import family_members
from app.domain.names import contains, instruments_in
from app.domain.requests import Turn

# «¿Y la Allis?», «¿y en la tiroidectomía?»: sigue hablando de lo anterior.
_FOLLOW_UP = re.compile(r"^\W*(?:y|e|tambien|entonces|pero|ahora)\b")
# «¿Cómo se usa en la colecistectomía?», «¿cuándo usarla?»: habla de usar algo sin
# nombrarlo, así que es lo de la pregunta anterior. «¿Para qué sirve la
# colecistectomía?» no: ahí lo que sirve es la técnica.
_USE = re.compile(
    r"\b(?:como|cuando|donde|para que)\s+se\s+(?:usa|utiliza|emplea|coloca|pone)\b"
    r"|\b(?:usarla|usarlo|utilizarla|utilizarlo)\b"
)
# «Esta técnica», «su mesa», «aquí»: la técnica abierta en el visor.
_THIS = re.compile(
    r"\b(?:esta|esa|la misma)\s+(?:tecnica|cirugia|mesa|operacion|intervencion)\b"
    r"|\baqui\b|\bsu mesa\b"
)
# Pedirle al visor que muestre algo: con esto, una técnica descrita sin nombrarla
# («quiero ver la cirugía para quitar la vesícula») cuenta aunque haya otra
# abierta.
_SHOW = re.compile(r"\b(?:muestra|muestrame|abre|abreme|ver|ensename|cambia)\b")
# La salud de quien pregunta o de alguien cercano: se responde en general, sin
# abrir en el visor la técnica que describe («si tengo cáncer de mama…»).
_PERSONAL = re.compile(
    r"\b(?:tengo|conmigo|me\s+(?:van|vas|quieren|operan|hicieron)|"
    r"mi\s+(?:mama|papa|madre|padre|hij\w+|espos\w+|abuel\w+|herman\w+|familiar))\b"
)


@dataclass(frozen=True)
class Focus:
    """De qué habla la pregunta. `techniques` son las del MVP (Cirugía General),
    en el orden en que se nombran; `others`, las de DataIQ de otra especialidad.
    `named` dice si las técnicas salen de la pregunta misma (o de «esta
    técnica»), y `carried`, si salen de las preguntas anteriores. `family` dice
    si los instrumentos son los de una familia nombrada sin decir cuál («el
    bisturí» en una mesa que lleva varios)."""

    techniques: tuple[Technique, ...] = ()
    instruments: tuple[Instrument, ...] = ()
    others: tuple[Technique, ...] = ()
    open_technique: Technique | None = None
    named: bool = False
    carried: bool = False
    family: bool = False

    @property
    def empty(self) -> bool:
        return not (self.techniques or self.instruments or self.others)

    def table(self) -> Technique | None:
        """La técnica de cuya mesa se habla: la primera nombrada, o la abierta."""
        return self.techniques[0] if self.techniques else self.open_technique

    def where(self, instrument: Instrument, catalog: Catalog) -> Technique | None:
        """La mesa en la que se ubica el instrumento: la de la pregunta o la
        abierta; si no hay ninguna, la única de Cirugía General que lo lleva."""
        technique = self.table()
        if technique:
            return technique
        holding = [t for t in in_scope(catalog) if item_with(t, instrument.id)]
        return holding[0] if len(holding) == 1 else None


def all_instruments(catalog: Catalog) -> Vocabulary:
    """El vocabulario con todo el instrumental de DataIQ, no solo el de las mesas
    del MVP: el tutor también explica qué es un instrumento de otra mesa."""
    return Vocabulary(
        techniques=tuple(t.name for t in in_scope(catalog)),
        instruments={i.name: i.aliases for i in catalog.instruments},
    )


def techniques_named(catalog: Catalog, text: str) -> list[Technique]:
    """Las técnicas del MVP que nombra el texto, en el orden en que aparecen:
    «colecistectomía» basta para «Colecistectomía»; «hemicolectomía», para
    «Hemicolectomía derecha». Si el nombre completo es de una técnica de otra
    especialidad («hemicolectomía laparoscópica»), es esa y no la del MVP."""
    said = normalize(text)
    others = {
        m.start()
        for t in catalog.techniques
        if t not in in_scope(catalog)
        for m in re.finditer(rf"(?<!\w){re.escape(normalize(t.name))}(?!\w)", said)
    }
    found: list[tuple[int, Technique]] = []
    for technique in in_scope(catalog):
        key = normalize(technique.name)
        for k in (key, key.split()[0]):
            match = re.search(rf"(?<!\w){re.escape(k)}(?!\w)", said)
            if match:
                if k != key and match.start() in others:
                    break
                found.append((match.start(), technique))
                break
    return [t for _, t in sorted(found, key=lambda f: f[0])]


def _instruments_named(catalog: Catalog, text: str) -> list[Instrument]:
    by_name = {i.name: i for i in catalog.instruments}
    return [by_name[n] for n in instruments_in(text, all_instruments(catalog))]


def _named(question: str, catalog: Catalog, open_technique: Technique | None) -> Focus:
    """Lo que nombra la pregunta sola, sin las anteriores."""
    techniques = techniques_named(catalog, question)
    named = bool(techniques)
    instruments = _instruments_named(catalog, question)
    # Lo de otra especialidad solo si no se nombra a la vez una del MVP con la
    # misma palabra: «hemicolectomía» sola es la derecha (la del MVP).
    other = tools.out_of_scope_technique(catalog, question)
    others = (other,) if other and other not in techniques else ()
    if not techniques and not instruments and not others:
        # Descrita sin nombrarla («la cirugía para quitar la vesícula»): con otra
        # técnica abierta, solo si pide verla.
        said = normalize(question)
        if open_technique is None or _SHOW.search(said):
            described = tools.technique_described(catalog, question)
            if described:
                techniques = [described]
                named = not _PERSONAL.search(said)
    if not techniques and open_technique and _THIS.search(normalize(question)):
        techniques, named = [open_technique], True
    family = False
    table = techniques[0] if techniques else open_technique
    if not instruments and table:
        members = family_members(catalog, table, question)
        if members:
            instruments = [i for _, i in members]
            family = len(members) > 1
    return Focus(
        techniques=tuple(techniques),
        instruments=tuple(instruments),
        others=others,
        open_technique=open_technique,
        named=named,
        family=family,
    )


def _turn_text(turn: Turn) -> str:
    """La pregunta anterior con los nombres de lo que se entendió de ella."""
    names = [n for r in turn.requests for n in (r.technique, r.instrument) if n]
    return " ".join([turn.question, *names])


def focus_of(
    question: str,
    catalog: Catalog,
    open_technique_id: UUID | None,
    previous: tuple[Turn, ...] = (),
) -> Focus:
    """De qué habla la pregunta. Si no nombra nada, es lo de la última pregunta
    anterior que nombró algo («¿y cuándo se usa?» después de «¿qué es la
    Kelly?»). Si empieza como un seguimiento («¿y la Allis?», «¿y en la
    tiroidectomía?»), lo que no nombra sale de la anterior. Una técnica nombrada
    gana a la abierta."""
    open_technique = technique_by_id(catalog, open_technique_id)
    focus = _named(question, catalog, open_technique)
    before = next(
        (
            f
            for turn in reversed(previous)
            if not (f := _named(_turn_text(turn), catalog, open_technique)).empty
        ),
        None,
    )
    if before is None:
        return focus
    if focus.empty:
        return Focus(
            techniques=before.techniques,
            instruments=before.instruments,
            others=before.others,
            open_technique=open_technique,
            carried=True,
            family=before.family,
        )
    said = normalize(question)
    if _FOLLOW_UP.search(said) or (not focus.instruments and _USE.search(said)):
        return Focus(
            techniques=focus.techniques or before.techniques,
            instruments=focus.instruments or before.instruments,
            others=focus.others,
            open_technique=open_technique,
            named=focus.named,
            carried=True,
            family=focus.family,
        )
    return focus


def mentions(text: str, technique: Technique) -> bool:
    key = normalize(technique.name)
    said = normalize(text)
    return contains(said, key) or contains(said, key.split()[0])
