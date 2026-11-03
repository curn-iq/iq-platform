"""Cómo se encuentran en DataIQ los nombres que dice el estudiante, en los
pedidos del modelo y en las reglas fijas: una técnica nombrada o descrita sin
nombrarla, un instrumento por su nombre o un alias, una técnica de otra
especialidad. Si no se encuentra el exacto, se devuelven las sugerencias más
parecidas, sin adivinar.
"""

import re
from difflib import SequenceMatcher

from app.domain.catalog import (
    Catalog,
    Instrument,
    Technique,
    in_scope,
    normalize,
    scope_instruments,
)
from app.domain.names import canonical, contains, instrument_keys


def _keys(name: str) -> set[str]:
    keys = {normalize(name)}
    return keys | {normalize(name).split()[0]}


def _score(text: str, keys: set[str]) -> float:
    wanted = canonical(text)
    return max(SequenceMatcher(None, wanted, k).ratio() for k in keys)


# Para sugerir una técnica tiene que ser un error de escritura («colecistetomia»),
# no otra técnica con la misma terminación («apendicectomía»).
TECHNIQUE_SIMILARITY = 0.8
OUT_OF_SCOPE = "SIMIQ3D solo cubre la mesa de Mayo de las técnicas de Cirugía General"


# Palabras que no describen una técnica: las de la especialidad y las de cómo
# se pregunta por la mesa («¿en qué parte de la mesa…?», «quiero ver…»).
_NOT_DESCRIPTIVE = {
    "cirugia",
    "general",
    "tecnica",
    "parte",
    "lugar",
    "donde",
    "para",
    "como",
    "cual",
    "cuales",
    "mesa",
    "esta",
    "este",
    "sobre",
    "dime",
    "dame",
    "tiene",
    "lleva",
    "quiero",
    "muestrame",
    "ensename",
    "operar",
    "quitar",
}


def _words(text: str, shortest: int = 5) -> set[str]:
    """Las palabras completas de `shortest` letras o más."""
    return {w for w in re.findall(r"[a-zñ]+", normalize(text)) if len(w) >= shortest}


def _matches(word: str, words: set[str]) -> bool:
    """La palabra está, o es el comienzo de una («mama» de «mamaria»)."""
    return word in words or any(w.startswith(word) for w in words)


def technique_described(catalog: Catalog, text: str) -> Technique | None:
    """La técnica que el texto describe sin nombrarla («la cirugía para quitar
    la vesícula»): la única cuya descripción en DataIQ (y su nombre, menos la
    primera palabra) tiene más palabras del texto, completas, que solo están en
    ella. Si hay
    empate, ninguna. Sin la primera palabra del nombre: un nombre mal escrito
    («colecistetomia») no se adivina, se pregunta («¿Quizás…?»)."""
    techniques = in_scope(catalog)
    words = {
        t.id: _words(t.description or "") | _words(" ".join(t.name.split()[1:]))
        for t in techniques
    }
    # «Kocher» es un instrumento de estas mesas, aunque la colecistectomía se
    # haga por una incisión de Kocher: sus nombres no describen técnicas.
    instrument_words = _words(" ".join(i.name for i in scope_instruments(catalog)))
    score: dict = {}
    for word in _words(text, shortest=4) - instrument_words - _NOT_DESCRIPTIVE:
        owners = [t for t in techniques if _matches(word, words[t.id])]
        if len(owners) == 1:
            score[owners[0]] = score.get(owners[0], 0) + 1
    if not score:
        return None
    best = max(score.values())
    top = [t for t, n in score.items() if n == best]
    return top[0] if len(top) == 1 else None


def out_of_scope_technique(catalog: Catalog, text: str) -> Technique | None:
    """Una técnica de DataIQ que no es del MVP (otra especialidad) nombrada en el
    texto: por su nombre o por su primera palabra («cesárea»)."""
    said = normalize(text)
    scope = {t.id for t in in_scope(catalog)}
    others = [t for t in catalog.techniques if t.id not in scope]
    full = [t for t in others if contains(said, normalize(t.name))]
    if full:
        return max(full, key=lambda t: len(t.name))
    # Por la primera palabra, la que comparte más palabras con el texto
    # («reemplazo total de rodilla», no «de cadera»).
    first = [t for t in others if contains(said, normalize(t.name).split()[0])]
    return max(
        first,
        key=lambda t: sum(contains(said, w) for w in normalize(t.name).split()),
        default=None,
    )


def technique_named(catalog: Catalog, name: str) -> Technique | None:
    """La técnica del MVP con ese nombre («hemicolectomía» basta)."""
    return next(
        (t for t in in_scope(catalog) if normalize(name) in _keys(t.name)), None
    )


def resolve_technique(catalog: Catalog, name: str) -> Technique | dict:
    """La técnica del MVP con ese nombre, o la que su descripción deja clara. Si
    no, el error que el modelo debe decir: que es de otra especialidad, que
    DataIQ no la tiene o, si es un error de escritura, cuál quiso decir."""
    techniques = in_scope(catalog)
    named = technique_named(catalog, name)
    if named:
        return named
    other = out_of_scope_technique(catalog, name)
    if other:
        return {
            "error": f"{other.name} es una técnica de {other.specialty}. "
            f"{OUT_OF_SCOPE}.",
            "fuera_de_alcance": True,
        }
    described = technique_described(catalog, name)
    if described:
        return described
    ranked = sorted(techniques, key=lambda t: -_score(name, _keys(t.name)))
    close = [
        t.name for t in ranked if _score(name, _keys(t.name)) >= TECHNIQUE_SIMILARITY
    ][:3]
    if close:
        return {
            "error": f"No hay una técnica «{name}»",
            "buscado": name,
            "quizas": close,
        }
    return {
        "error": f"DataIQ no tiene la técnica «{name}». {OUT_OF_SCOPE}.",
        "fuera_de_alcance": True,
    }


def resolve_instrument(catalog: Catalog, name: str) -> Instrument | dict:
    """El instrumento de las mesas del MVP con ese nombre o alias («el mango
    número 7» es el Mango de bisturí N.° 7). Si el nombre es de una técnica, se
    dice cómo consultarla; si no, los instrumentos más parecidos."""
    instruments = scope_instruments(catalog)
    wanted = canonical(name)
    for i in instruments:
        if wanted in instrument_keys(i.name, i.aliases):
            return i
    if technique_named(catalog, name) or out_of_scope_technique(catalog, name):
        return {
            "error": f"«{name}» es una técnica, no un instrumento",
        }
    ranked = sorted(
        instruments, key=lambda i: -_score(name, instrument_keys(i.name, i.aliases))
    )
    close = [
        i.name
        for i in ranked
        if _score(name, instrument_keys(i.name, i.aliases)) >= 0.6
    ][:3]
    return {
        "error": f"No hay un instrumento «{name}»",
        "buscado": name,
        "quizas": close,
    }
