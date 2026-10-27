import re

from app.domain.catalog import normalize
from app.domain.chat import ChatAction, Choice, ClinicalField, Vocabulary

# Palabras de una pregunta y lo que indican. Comparan sin tildes ni mayúsculas.
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


class FakeModel:
    """Modelo de prueba: reglas por palabras clave, sin modelo de lenguaje. Sirve
    para desarrollar el frontend y para las pruebas; con Ollama se cambia por
    configuración (LANGUAGE_MODEL=ollama)."""

    name = "fake"

    async def choose(
        self, question: str, vocabulary: Vocabulary, open_technique: str | None
    ) -> Choice:
        text = normalize(question)
        technique = _find_technique(text, vocabulary)
        # «mesa de Mayo» no es la Tijera de Mayo.
        instrument = _find_instrument(text.replace("mesa de mayo", ""), vocabulary)
        field = next((f for keys, f in FIELDS if any(k in text for k in keys)), None)

        if instrument:
            action = (
                ChatAction.describe_instrument
                if any(k in text for k in DESCRIBE)
                else ChatAction.highlight_instrument
            )
            return Choice(action, technique=technique, instrument=instrument)
        if technique or open_technique:
            if field:
                return Choice(ChatAction.show_clinical_data, technique, field=field)
            if any(k in text for k in LIST):
                return Choice(ChatAction.list_instruments, technique)
            if technique:
                return Choice(ChatAction.show_technique, technique)
        elif field or any(k in text for k in LIST):
            # Pidió un dato de una técnica sin decir cuál: el dominio pregunta.
            action = (
                ChatAction.show_clinical_data if field else ChatAction.list_instruments
            )
            return Choice(action, field=field)
        return Choice(ChatAction.no_answer)


def _contains(text: str, key: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(key)}(?!\w)", text) is not None


def _find_technique(text: str, vocabulary: Vocabulary) -> str | None:
    for name in vocabulary.techniques:
        # «colecistectomía» basta para «Colecistectomía»; «hemicolectomía», para
        # «Hemicolectomía derecha».
        if _contains(text, normalize(name)) or _contains(
            text, normalize(name).split()[0]
        ):
            return name
    return None


def _find_instrument(text: str, vocabulary: Vocabulary) -> str | None:
    """El instrumento cuyo nombre (o alias, o nombre sin «pinza de») aparece en la
    pregunta. Si coinciden varios, gana el más largo: «Kelly Adson» antes que
    «Kelly»."""
    best: tuple[int, str] | None = None
    for name, aliases in vocabulary.instruments.items():
        for key in {normalize(n) for n in (name, *aliases)} | {
            GENERIC.sub("", normalize(name))
        }:
            if key and _contains(text, key) and (best is None or len(key) > best[0]):
                best = (len(key), name)
    return best[1] if best else None
