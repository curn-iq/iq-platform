"""Encontrar en un texto las técnicas, el instrumental y los datos clínicos del
vocabulario. Lo usan el modelo de prueba y el de Ollama: de qué técnica o de qué
instrumento se habla se decide con estas reglas, no con lo que diga el modelo."""

import re
from difflib import SequenceMatcher

from app.domain.catalog import normalize
from app.domain.chat import ClinicalField, Vocabulary

DESCRIBE = (
    "que es",
    "para que sirve",
    "para que se usa",
    "describe",
    "como es",
    "que hace",
)
LIST = ("instrumental", "instrumentos", "que lleva", "que va en la mesa", "lista")
FIELDS = (
    (("indicacion", "por que se hace", "cuando se hace"), ClinicalField.indications),
    (("complicacion", "riesgo"), ClinicalField.complications),
    (("anestesia", "posicion"), ClinicalField.anesthesia_position),
    (("para que sirve", "en que consiste"), ClinicalField.description),
)
# Primeras palabras que no distinguen un instrumento de otro («pinza de»).
GENERIC = re.compile(r"^(pinzas?|tijeras?|separador|portaagujas)( de)? ")


# «N.° 3», «número 3», «nro. 3» y «#3» se dicen distinto y son lo mismo.
_NUMBER_MARK = re.compile(
    r"(?:\bn\s*\.?\s*[°º]|\bnro\b\.?|\bnumero\b|\bnum\b\.?|#)\s*(?=\d)"
)


def canonical(text: str) -> str:
    """Normalizado y sin la marca de número: «Mango de bisturí N.° 3» y «mango
    de bisturí número 3» quedan iguales («mango de bisturi 3»)."""
    return " ".join(_NUMBER_MARK.sub("", normalize(text)).split())


def instrument_keys(name: str, aliases: tuple[str, ...] = ()) -> set[str]:
    """Cómo se puede nombrar un instrumento: su nombre o un alias, sin «pinza
    de» («la Kelly») y sin «de bisturí» («el mango 7», «la hoja 15»)."""
    names = {canonical(n) for n in (name, *aliases)}
    keys = names | {GENERIC.sub("", n) for n in names}
    keys |= {n.replace(" de bisturi", "") for n in names}
    return {k for k in keys if k}


def contains(text: str, key: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(key)}(?!\w)", text) is not None


def technique_in(text: str, vocabulary: Vocabulary) -> str | None:
    """«colecistectomía» basta para «Colecistectomía»; «hemicolectomía», para
    «Hemicolectomía derecha»."""
    text = normalize(text)
    for name in vocabulary.techniques:
        key = normalize(name)
        if contains(text, key) or contains(text, key.split()[0]):
            return name
    return None


def instruments_in(text: str, vocabulary: Vocabulary) -> list[str]:
    """Los instrumentos que nombra el texto, en el orden en que aparecen. Donde
    dos nombres empiezan igual, cuenta el más largo: «Kelly Adson» no es además
    la Kelly. «mesa de Mayo» no es la Tijera de Mayo."""
    text = canonical(text).replace("mesa de mayo", "")
    found: list[tuple[int, int, str]] = []
    for name, aliases in vocabulary.instruments.items():
        for key in instrument_keys(name, aliases):
            for match in re.finditer(rf"(?<!\w){re.escape(key)}(?!\w)", text):
                found.append((match.start(), match.end(), name))
    names: list[str] = []
    taken_until = -1
    for start, end, name in sorted(found, key=lambda m: (m[0], m[0] - m[1])):
        if start < taken_until:
            continue
        taken_until = end
        if name not in names:
            names.append(name)
    return names


def instrument_in(text: str, vocabulary: Vocabulary) -> str | None:
    """El instrumento cuyo nombre (o alias, o nombre sin «pinza de») aparece en el
    texto. Si coinciden varios, gana el más largo: «Kelly Adson» antes que
    «Kelly». «mesa de Mayo» no es la Tijera de Mayo."""
    text = canonical(text).replace("mesa de mayo", "")
    best: tuple[int, str] | None = None
    for name, aliases in vocabulary.instruments.items():
        for key in instrument_keys(name, aliases):
            if contains(text, key) and (best is None or len(key) > best[0]):
                best = (len(key), name)
    return best[1] if best else None


def field_in(text: str) -> ClinicalField | None:
    text = normalize(text)
    return next((f for keys, f in FIELDS if any(k in text for k in keys)), None)


def asks_to_describe(text: str) -> bool:
    return any(k in normalize(text) for k in DESCRIBE)


def asks_for_list(text: str) -> bool:
    return any(k in normalize(text) for k in LIST)


# --- Errores de escritura ---------------------------------------------------

# Palabras de los nombres que no distinguen nada (o que son palabras comunes):
# no se corrigen hacia ellas.
_PLAIN = {
    "pinza",
    "pinzas",
    "tijera",
    "tijeras",
    "separador",
    "mango",
    "hoja",
    "bisturi",
    "portaagujas",
    "diseccion",
    "garra",
    "curva",
    "largo",
    "derecha",
    "con",
    "sin",
}
# Qué tan parecida tiene que ser una palabra a un nombre para sugerirlo
# (0 a 1). «masectomia» → «mastectomia» da 0,95; «allys» → «allis», 0,8.
SIMILARITY = 0.8


def _proper_words(vocabulary: Vocabulary) -> dict[str, str]:
    """Las palabras propias de cada nombre, normalizadas, con su forma escrita:
    «mastectomia» → «Mastectomía», «allis» → «Allis». Solo de 5 letras o más:
    las cortas («Mayo», «Senn») se confunden con palabras comunes."""
    words: dict[str, str] = {}
    names = list(vocabulary.techniques) + list(vocabulary.instruments)
    for name in names:
        for word in name.split():
            key = normalize(word)
            if len(key) >= 5 and key.isalpha() and key not in _PLAIN:
                words.setdefault(key, word)
    return words


def suggest_spelling(question: str, vocabulary: Vocabulary) -> str | None:
    """La pregunta con los nombres bien escritos, si alguna palabra se parece
    mucho a una técnica o a un instrumento sin ser igual («¿Dónde va la kely en
    la masectomia?» → «¿Dónde va la Kelly en la Mastectomía?»). None si no hay
    nada que corregir. No adivina: solo propone, como un buscador."""
    known = _proper_words(vocabulary)
    changed = False

    def fix(match: re.Match) -> str:
        nonlocal changed
        word = match.group(0)
        key = normalize(word)
        if len(key) < 4 or key in known or key in _PLAIN:
            return word
        best = max(
            known, key=lambda k: SequenceMatcher(None, key, k).ratio(), default=None
        )
        if best and SequenceMatcher(None, key, best).ratio() >= SIMILARITY:
            changed = True
            return known[best]
        return word

    fixed = re.sub(r"[^\W\d_]+", fix, question)
    return fixed if changed else None
