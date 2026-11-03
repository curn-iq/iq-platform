"""La redacción: el modelo de lenguaje escribe la respuesta, conversando, solo con
lo que el backend armó con DataIQ para cada pedido, y el texto se verifica antes
de mostrarlo. Si no pasa, se muestra lo armado (README de SIMIQ3D, «Chat»).

Como recomiendan Anthropic y Rasa: los datos van primero, cada uno en su
etiqueta, y la pregunta al final; la plantilla dice qué se responde y el modelo
cómo se dice; la mesa de Mayo no se reescribe, porque una lista pierde su
estructura, y va después del texto tal como sale de DataIQ."""

import re
from dataclasses import dataclass

from app.domain.catalog import Catalog, normalize, technique_by_id
from app.domain.chat import (
    FIELD_LABELS,
    ChatAction,
    ClinicalField,
    Reply,
    Vocabulary,
)
from app.domain.guards import surgical_time_phrases
from app.domain.names import contains, instruments_in

WRITER = """Eres el chat de SIMIQ3D: ayudas a estudiantes de Instrumentación \
Quirúrgica a conocer la mesa de Mayo de las técnicas de Cirugía General.
Responde la pregunta del estudiante conversando, en español, como alguien que le \
explica a un compañero de estudio, usando solo lo que dicen <datos> y <contexto>.
- No agregues nada que no esté en <datos> ni en <contexto>: ni instrumentos, ni \
números, ni datos clínicos, ni dosis, ni tiempos quirúrgicos, ni explicaciones \
propias. No expliques por qué un instrumento va o no va en una mesa.
- Une y ordena los datos en frases completas, sin cambiar lo que dicen. Los \
nombres de las técnicas y de los instrumentos van tal como vienen, y los números \
del diagrama también.
- Empieza por lo que se preguntó, e incluye todo lo que traen los datos. Usa el \
contexto solo si ayuda a responder, por ejemplo para decir qué es la técnica.
- Si los datos traen la mesa de Mayo, no enumeres sus objetos: la lista completa \
va después de tu texto. Si no la traen, no hables de la mesa.
- Si los datos dicen que algo no está en DataIQ, dilo con naturalidad; si no lo \
dicen, no digas que falta nada.
- Si basta una frase, responde con una frase: sin relleno, sin títulos ni \
listas, sin repetir. Nunca hables de filas, columnas ni celdas."""

# Las palabras de un número que el texto puede decir en vez de la cifra. «Uno» y
# «una» no, porque son también artículos.
NUMBER_WORDS = {
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
}
_GRID = re.compile(r"\b(fila|columna|celda)s?\b")
# Cómo dice el texto que algo no está en DataIQ, o que no puede responderlo, si
# los datos lo dicen.
_MISSING = (
    "no tiene",
    "no incluye",
    "no hay",
    "no esta",
    "no trae",
    "no cuenta",
    "no puedo",
    "no se puede",
    "solo puedo",
)
# Cómo se dice que DataIQ no tiene algo: si los datos no lo dicen, el texto
# tampoco (con «Muéstrame la colecistectomía», «No se muestra la mesa…»). Una
# comparación sí dice «no está en la mesa de…», y eso no es esto.
_ABSENT = (
    "dataiq no",
    "no esta en dataiq",
    "no esta disponible",
    "no se muestra",
    "en los datos",
    "no se indica",
    "no se menciona",
)
# Explicaciones y relleno que el modelo agregaba sin que los datos los dijeran,
# medidas con el juez del banco (2026-11-03): «no va porque… por eso no se
# necesita», «la mesa está preparada con los instrumentos necesarios para…».
# Solo pasan si están en los datos.
_INVENTED = (
    "por eso",
    "porque",
    "ya que",
    "debido a",
    "necesari",
    "preparad",
    "se requiere",
    "ayuda a",
    "ayudan a",
)
# Un texto mucho más largo que sus datos agrega cosas o se repite.
MAX_GROWTH = 2.5
# Cuánto de cada dato debe traer el texto: la proporción de sus palabras de
# cinco letras o más, como en el banco de preguntas («trae el dato»).
COVERAGE = 0.4


@dataclass(frozen=True)
class Draft:
    """Lo que el modelo puede usar para redactar, y lo que va después de su
    texto tal cual. `required` son los datos que el texto no puede omitir."""

    data: tuple[str, ...]
    context: tuple[str, ...] = ()
    after: tuple[str, ...] = ()
    missing: bool = False
    required: tuple[str, ...] = ()

    @property
    def sources(self) -> str:
        return "\n\n".join(self.data + self.context)


def draft(parts: list[Reply], catalog: Catalog) -> Draft | None:
    """Lo que se le da al modelo para redactar la respuesta a estos pedidos, o
    None si la respuesta no se redacta: si pide aclarar, sus opciones son la
    respuesta; si solo dice que no tiene la respuesta, reescribirla cambiaba su
    sentido («la cesárea no está en DataIQ», cuando es de otra especialidad)."""
    if not parts or any(p.action == ChatAction.clarify for p in parts):
        return None
    if all(p.action == ChatAction.no_answer for p in parts):
        return None
    described = {
        p.technique_id
        for p in parts
        if p.action == ChatAction.show_clinical_data
        and p.field == ClinicalField.description
    }
    context = []
    for technique_id in dict.fromkeys(p.technique_id for p in parts):
        technique = technique_by_id(catalog, technique_id)
        if technique and technique.description and technique.id not in described:
            context.append(f"Qué es {technique.name}: {technique.description}")
    return Draft(
        data=tuple(p.reply for p in parts),
        context=tuple(context),
        after=tuple(p.reply for p in parts if p.action == ChatAction.list_instruments),
        missing=any(p.action == ChatAction.no_answer for p in parts),
        required=tuple(
            p.reply
            for p in parts
            if p.action not in (ChatAction.list_instruments, ChatAction.no_answer)
        ),
    )


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"\w+", normalize(text)) if len(w) >= 5}


def messages(question: str, plan: Draft) -> list[dict]:
    """Los datos primero, cada uno en su etiqueta, y la pregunta al final."""
    data = "\n".join(f"<dato>\n{d}\n</dato>" for d in plan.data)
    user = f"<datos>\n{data}\n</datos>\n"
    if plan.context:
        context = "\n".join(plan.context)
        user += f"<contexto>\n{context}\n</contexto>\n"
    user += f"\nPregunta del estudiante: {question}"
    return [
        {"role": "system", "content": WRITER},
        {"role": "user", "content": user},
    ]


def unsupported(text: str, plan: Draft, question: str, catalog: Catalog) -> list[str]:
    """Lo que el texto dice y no está en sus datos, o lo que deja de decir: un
    instrumento, una técnica o un número que no vienen de DataIQ, la
    cuadrícula, o que falte decir que algo no está. Revisa nombres y números,
    no el sentido de las frases."""
    if not text.strip():
        return ["texto vacío"]
    said = normalize(text)
    allowed = normalize(f"{plan.sources}\n{question}")
    problems = []
    vocabulary = Vocabulary.from_catalog(catalog)
    extra = set(instruments_in(text, vocabulary)) - set(
        instruments_in(f"{plan.sources}\n{question}", vocabulary)
    )
    problems += [f"instrumento sin respaldo: {n}" for n in sorted(extra)]
    for technique in catalog.techniques:
        key = normalize(technique.name)
        named = contains(said, key) or contains(said, key.split()[0])
        if named and not (contains(allowed, key) or contains(allowed, key.split()[0])):
            problems.append(f"técnica sin respaldo: {technique.name}")
    # Solo los números que van solos: el 3 de «visor 3D» no es una cifra.
    numbers = set(re.findall(r"\b\d+\b", said)) | {
        str(n) for w, n in NUMBER_WORDS.items() if contains(said, w)
    }
    known = set(re.findall(r"\b\d+\b", allowed)) | {
        str(n) for w, n in NUMBER_WORDS.items() if contains(allowed, w)
    }
    problems += [f"número sin respaldo: {n}" for n in sorted(numbers - known)]
    if _GRID.search(said):
        problems.append("habla de la cuadrícula")
    # DataIQ no tiene tiempos quirúrgicos ni el orden de uso: el modelo los
    # inventaba («los instrumentos están dispuestos en orden de uso»).
    invented = surgical_time_phrases(text) - surgical_time_phrases(
        f"{plan.sources}\n{question}"
    )
    if invented:
        problems.append("habla de tiempos quirúrgicos u orden de uso")
    added = [c for c in _INVENTED if c in said and c not in allowed]
    if added:
        problems.append(f"agrega una explicación: «{added[0]}»")
    if plan.missing and not any(m in said for m in _MISSING):
        problems.append("no dice lo que DataIQ no tiene")
    if not plan.missing and any(c in said and c not in allowed for c in _ABSENT):
        problems.append("dice que falta algo que DataIQ tiene")
    said_words = _words(text)
    # Sin los nombres ni las etiquetas: lo que cuenta es lo que dice el dato.
    names = _words(
        " ".join(
            [t.name for t in catalog.techniques]
            + [i.name for i in catalog.instruments]
            + list(FIELD_LABELS.values())
        )
    )
    for datum in plan.required:
        words = _words(datum) - names
        if words and len(words & said_words) / len(words) < COVERAGE:
            problems.append(f"omite un dato: {datum[:40]}…")
    if len(text) > MAX_GROWTH * len(plan.sources) + 200:
        problems.append("mucho más largo que sus datos")
    return problems


def final_text(text: str, plan: Draft) -> str:
    """El texto redactado, y después la mesa de Mayo tal como sale de DataIQ."""
    return "\n\n".join([text.strip(), *plan.after])
