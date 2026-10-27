"""Encontrar en un texto las técnicas, el instrumental y los datos clínicos del
vocabulario. Lo usan el modelo de prueba y el de Ollama: de qué técnica o de qué
instrumento se habla se decide con estas reglas, no con lo que diga el modelo."""

import re

from app.domain.catalog import normalize
from app.domain.chat import ClinicalField, Vocabulary

DESCRIBE = ("que es", "para que sirve", "describe", "como es", "que hace")
LIST = ("instrumental", "instrumentos", "que lleva", "que va en la mesa", "lista")
FIELDS = (
    (("indicacion",), ClinicalField.indications),
    (("complicacion",), ClinicalField.complications),
    (("anestesia", "posicion"), ClinicalField.anesthesia_position),
    (("para que sirve", "en que consiste"), ClinicalField.description),
)
# Primeras palabras que no distinguen un instrumento de otro («pinza de»).
GENERIC = re.compile(r"^(pinzas?|tijeras?|separador|portaagujas)( de)? ")


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


def instrument_in(text: str, vocabulary: Vocabulary) -> str | None:
    """El instrumento cuyo nombre (o alias, o nombre sin «pinza de») aparece en el
    texto. Si coinciden varios, gana el más largo: «Kelly Adson» antes que
    «Kelly». «mesa de Mayo» no es la Tijera de Mayo."""
    text = normalize(text).replace("mesa de mayo", "")
    best: tuple[int, str] | None = None
    for name, aliases in vocabulary.instruments.items():
        keys = {normalize(n) for n in (name, *aliases)} | {
            GENERIC.sub("", normalize(name))
        }
        for key in keys:
            if key and contains(text, key) and (best is None or len(key) > best[0]):
                best = (len(key), name)
    return best[1] if best else None


def field_in(text: str) -> ClinicalField | None:
    text = normalize(text)
    return next((f for keys, f in FIELDS if any(k in text for k in keys)), None)


def asks_to_describe(text: str) -> bool:
    return any(k in normalize(text) for k in DESCRIBE)


def asks_for_list(text: str) -> bool:
    return any(k in normalize(text) for k in LIST)
