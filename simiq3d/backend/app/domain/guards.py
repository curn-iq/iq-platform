"""Preguntas que se responden con reglas fijas, antes del modelo de lenguaje, como
el corrector de escritura: lo que se puede decidir sin el modelo no se le deja
al modelo. Las usan el agente y las plantillas, así que responden igual."""

import re
from uuid import UUID

from app.domain import tools
from app.domain.catalog import (
    Catalog,
    Technique,
    find_technique,
    in_scope,
    normalize,
    scope_instruments,
    technique_by_id,
)
from app.domain.chat import (
    OUT_OF_SCOPE,
    ChatAction,
    Choice,
    Reply,
    Vocabulary,
    answer,
    the,
)
from app.domain.names import (
    asks_for_list,
    canonical,
    contains,
    instrument_in,
    technique_in,
)

# «el bisturí», «la pinza»: un instrumento nombrado por su familia, sin decir cuál.
_FAMILY = re.compile(r"\b(?:el|la)\s+(bisturi|mango|hoja|pinza|tijera|separador)\b")
# Los tiempos quirúrgicos y el orden en que se usa el instrumental: DataIQ no los
# tiene, y el modelo presentaba las posiciones de la mesa como un orden por
# tiempos (fuera del MVP, decidido por Mauricio el 2026-11-02).
_SURGICAL_TIMES = re.compile(
    r"\btiempos?\s+(?:quirurgicos?|operatorios?)\b"
    r"|\b(?:dieresis|hemostasia|sintesis)\b"
    r"|\b(?:en\s+que\s+orden|orden\s+en\s+(?:el\s+)?que)\s+se\s+"
    r"(?:usa|usan|utiliza|utilizan|pide|piden|pasa|pasan)\b"
    r"|\bse\s+(?:usa|usan|utiliza|utilizan|pide|piden|pasa|pasan)\s+"
    r"(?:primero|despues|antes|al\s+(?:principio|final)|de\s+ultimo)\b"
    r"|\borden\s+de\s+uso\b"
)
# «Sin tiempos quirúrgicos» los excluye: no es preguntar por ellos.
_WITHOUT_SURGICAL_TIMES = re.compile(
    r"\bsin\s+(?:los\s+|el\s+)?tiempos?\s+(?:quirurgicos?|operatorios?)\b"
)
NO_SURGICAL_TIMES = (
    "DataIQ no tiene el instrumental por tiempos quirúrgicos (diéresis, hemostasia, "
    "síntesis…) ni el orden en que se usa: solo dónde va cada pieza en la mesa de "
    "Mayo de cada técnica."
)


def asks_surgical_times(question: str) -> bool:
    """Si la pregunta pide tiempos quirúrgicos o el orden de uso del
    instrumental; «sin tiempos quirúrgicos» no los pide."""
    asked = _WITHOUT_SURGICAL_TIMES.sub("", canonical(question))
    return _SURGICAL_TIMES.search(asked) is not None


def before_the_model(
    question: str, catalog: Catalog, open_technique_id: UUID | None
) -> Reply | None:
    """La respuesta, si la pregunta nombra una técnica de otra especialidad, trata
    de tiempos quirúrgicos, pide el instrumental de una técnica o nombra un
    instrumento que en esa mesa puede ser varios; si no, None."""
    vocabulary = Vocabulary.from_catalog(catalog)
    named = technique_in(question, vocabulary)
    if named is None:
        other = tools.out_of_scope_technique(catalog, question)
        if other:
            return Reply(
                ChatAction.no_answer,
                f"{other.name} es una técnica de {other.specialty}. {OUT_OF_SCOPE}",
            )
    technique = find_technique(catalog, named) or technique_by_id(
        catalog, open_technique_id
    )
    if asks_surgical_times(question):
        return Reply(
            ChatAction.no_answer,
            NO_SURGICAL_TIMES,
            options=(f"¿Qué lleva la mesa de {technique.name}?",) if technique else (),
        )
    if instrument_in(question, vocabulary) is not None:
        return None
    # El instrumental de una técnica, completo: el modelo a veces lo resume
    # («bisturíes, tijeras y pinzas…»), y la lista está en DataIQ.
    named_count = sum(
        contains(normalize(question), normalize(t.name).split()[0])
        for t in in_scope(catalog)
    )
    if technique and named_count <= 1 and asks_for_list(question):
        return answer(
            Choice(ChatAction.list_instruments, technique.name),
            catalog,
            open_technique_id,
        )
    if technique is None:
        return None
    return which_of_the_family(catalog, technique, question)


def which_of_the_family(
    catalog: Catalog, technique: Technique, text: str
) -> Reply | None:
    """Si el texto nombra un instrumento por su familia («el bisturí», «la
    pinza») y esa mesa lleva varios, pregunta cuál, con cada uno como opción."""
    family = _FAMILY.search(canonical(text))
    if family is None:
        return None
    # Un objeto por opción: el mango y su hoja son uno solo («el bisturí»).
    word = family.group(1)
    by_id = {i.id: i for i in scope_instruments(catalog)}
    options = []
    for item in technique.mayo_items():
        members = [by_id[i] for i in item.instrument_ids if i in by_id]
        matching = [i for i in members if word in canonical(i.name).split()]
        if matching:
            # Por el que lleva la palabra al comienzo («la hoja»); si ninguno, el
            # primero del objeto («el bisturí» es el mango con su hoja).
            first = [i for i in matching if canonical(i.name).startswith(word)]
            options.append((item, (first or members)[0]))
    if len(options) < 2:
        return None
    options.sort(key=lambda o: o[0].legend_number or 99)
    listed = "; ".join(
        f"n.º {item.legend_number}, {item.name}" if item.legend_number else item.name
        for item, _ in options
    )
    return Reply(
        ChatAction.clarify,
        f"¿Cuál? La mesa de Mayo de {technique.name} lleva {len(options)}: {listed}.",
        technique_id=technique.id,
        options=tuple(
            f"¿Dónde va {the(i.name)} en {technique.name}?" for _, i in options
        ),
    )
