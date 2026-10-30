"""Preguntas que se responden con reglas fijas, antes del modelo de lenguaje, como
el corrector de escritura: lo que se puede decidir sin el modelo no se le deja
al modelo. Las usan el agente y las plantillas, así que responden igual."""

import re
from uuid import UUID

from app.domain import tools
from app.domain.catalog import (
    Catalog,
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

# Comparar o contar no es listar («¿qué lleva la tiroidectomía que no lleve la
# colecistectomía?», «¿cuántos instrumentos…?»).
_NOT_A_LIST = re.compile(r"\b(?:no lleve|no tenga|comun|comparten|diferen|cuant)")
# «el bisturí», «la pinza»: un instrumento nombrado por su familia, sin decir cuál.
_FAMILY = re.compile(r"\b(?:el|la)\s+(bisturi|mango|hoja|pinza|tijera|separador)\b")


def before_the_model(
    question: str, catalog: Catalog, open_technique_id: UUID | None
) -> Reply | None:
    """La respuesta, si la pregunta nombra una técnica de otra especialidad, pide
    el instrumental de una técnica o nombra un instrumento que en esa mesa puede
    ser varios; si no, None."""
    vocabulary = Vocabulary.from_catalog(catalog)
    named = technique_in(question, vocabulary)
    if named is None:
        other = tools.out_of_scope_technique(catalog, question)
        if other:
            return Reply(
                ChatAction.no_answer,
                f"{other.name} es una técnica de {other.specialty}. {OUT_OF_SCOPE}",
            )
    if instrument_in(question, vocabulary) is not None:
        return None
    technique = find_technique(catalog, named) or technique_by_id(
        catalog, open_technique_id
    )
    # El instrumental de una técnica, completo: el modelo a veces lo resume
    # («bisturíes, tijeras y pinzas…»), y la lista está en DataIQ.
    named_count = sum(
        contains(normalize(question), normalize(t.name).split()[0])
        for t in in_scope(catalog)
    )
    if (
        technique
        and named_count <= 1
        and asks_for_list(question)
        and not _NOT_A_LIST.search(canonical(question))
    ):
        return answer(
            Choice(ChatAction.list_instruments, technique.name),
            catalog,
            open_technique_id,
        )
    family = _FAMILY.search(canonical(question))
    if family is None or technique is None:
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
