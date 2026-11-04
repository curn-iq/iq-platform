"""Técnicas que el estudiante no nombra como en DataIQ: una descrita sin
nombrarla («la cirugía para quitar la vesícula») o una de otra especialidad
(«la cesárea»). Las usan el tutor (`app/domain/focus.py`) y las reglas fijas."""

import re

from app.domain.catalog import (
    Catalog,
    Technique,
    in_scope,
    normalize,
    scope_instruments,
)
from app.domain.names import contains

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
