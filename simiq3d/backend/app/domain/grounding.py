"""Verificar que la respuesta del modelo no diga nada que las consultas no
devolvieron: es el control del riesgo de que el modelo invente (ver el README de
SIMIQ3D, «Chat»). No entiende el texto: compara nombres y números."""

import json
import re

from app.domain.catalog import PLACE_PHRASES, Catalog, normalize
from app.domain.names import GENERIC, contains

# «Pinza de Crile», «Tijera Iris»…: algo que parece un instrumento.
_INSTRUMENT_LIKE = re.compile(
    r"\b(?:pinzas?|tijeras?|separador(?:es)?|portaagujas|mango|hoja)\s+(?:de\s+)?"
    r"([a-záéíóúñ]{4,})",
    re.IGNORECASE,
)


def unsupported(text: str, results: list[dict], catalog: Catalog) -> list[str]:
    """Lo que el texto dice y ninguna consulta devolvió. Vacío si todo cuadra."""
    facts = normalize(json.dumps(results, ensure_ascii=False))
    said = normalize(text)
    problems: list[str] = []

    for t in catalog.techniques:
        if contains(said, normalize(t.name)) and not contains(facts, normalize(t.name)):
            problems.append(t.name)
    for i in catalog.instruments:
        keys, proper = _mention_keys(i.name, i.aliases)
        mentioned = any(len(k) >= 5 and contains(said, k) for k in keys) or (
            proper is not None and len(proper) >= 5 and contains(text, proper)
        )
        if mentioned and not contains(facts, normalize(i.name)):
            problems.append(i.name)
    # Lo que parece un instrumento pero no es del catálogo (inventado).
    catalog_words = {w for i in catalog.instruments for w in normalize(i.name).split()}
    for match in _INSTRUMENT_LIKE.finditer(text):
        word = normalize(match.group(1))
        if word in _NUMBER_WORDS_IN_NAMES:
            continue  # «el mango número 7»
        if word not in catalog_words and not contains(facts, word):
            problems.append(match.group(0))
    numbers = set(re.findall(r"\d+", facts))
    problems += [n for n in _NUMBER.findall(text) if n not in numbers]
    # Un conteo («7 objetos», «cinco técnicas») tiene que ser uno de los totales
    # que devolvieron las consultas, no cualquier número que aparezca en ellas
    # (el 7 puede ser el número de un objeto en el diagrama).
    totals = set(_totals_in(results))
    for match in _COUNT.finditer(said):
        amount = match.group(1)
        value = int(amount) if amount.isdigit() else _NUMBER_WORDS[amount]
        if value not in totals:
            problems.append(match.group(0))
    # La cuadrícula es interna: en la mesa real no hay filas ni columnas.
    if _GRID_WORDS.search(said):
        problems.append("habla de la cuadrícula")
    # Las zonas («arriba a la derecha») tienen que venir en los resultados.
    for phrase in PLACE_PHRASES:
        if contains(said, normalize(phrase)) and not contains(facts, normalize(phrase)):
            problems.append(phrase)
    # «En todas va en el mismo lugar»: solo si de verdad es uno solo.
    if _SAME_PLACE.search(said) and len(set(_places_in(results))) > 1:
        problems.append("generaliza una ubicación que cambia entre técnicas")
    return problems


# «el mango número 7»: no es un instrumento que se llame «Número».
_NUMBER_WORDS_IN_NAMES = {"numero", "nro"}
# La palabra con que se nombra todo el instrumental, aunque en el catálogo haya un
# objeto que se llame así.
_PLAIN_WORDS = {"instrumental"}


def _mention_keys(name: str, aliases: tuple[str, ...]) -> tuple[set[str], str | None]:
    """Cómo se menciona un instrumento en una respuesta: su nombre o un alias
    (sin mayúsculas ni tildes) y, sin «pinza de», el nombre propio que queda,
    tal como se escribe («la Kelly»). Un adjetivo no cuenta («largo»,
    «abdominal»), ni el nombre propio en minúscula («el campo operatorio» no es
    la Pinza de Campo)."""
    keys = {normalize(n) for n in (name, *aliases)} - _PLAIN_WORDS
    rest = GENERIC.sub("", normalize(name))
    dropped = len(normalize(name).split()) - len(rest.split())
    proper = " ".join(name.split()[dropped:]) if dropped else None
    if proper is not None and not proper[:1].isupper():
        proper = None
    return keys, proper


# Los números del texto, menos el de «3D» (el visor), que no es un dato.
_NUMBER = re.compile(r"(?<!\d)\d+(?!\d)(?![dD]\b)")
_GRID_WORDS = re.compile(r"\b(?:filas?|columnas?|celdas?|cuadricula)\b")
_SAME_PLACE = re.compile(
    r"\b(?:en cada una|en todas|misma (?:ubicacion|posicion|zona|parte)|"
    r"mismo (?:lugar|sitio)|(?:ubicaciones|posiciones|lugares) similares)\b"
)


def _places_in(value) -> list[str]:
    """Todas las ubicaciones que aparecen en los resultados de las consultas."""
    if isinstance(value, dict):
        own = [value["ubicacion"]] if "ubicacion" in value else []
        return own + [p for v in value.values() for p in _places_in(v)]
    if isinstance(value, list):
        return [p for v in value for p in _places_in(v)]
    return []


_NUMBER_WORDS = {
    w: i
    for i, w in enumerate(
        "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece "
        "catorce quince dieciseis diecisiete dieciocho diecinueve veinte".split()
    )
} | {"una": 1}
_COUNT = re.compile(
    rf"\b(\d+|{'|'.join(_NUMBER_WORDS)})\s+"
    r"(?:objetos?|instrumentos?|instrumentales|tecnicas?|piezas?|elementos?)\b"
)
_TOTAL_KEYS = {"total", "total_objetos", "total_tecnicas", "objetos_en_la_mesa"}


def _totals_in(value, key: str = "") -> list[int]:
    """Los conteos que traen los resultados: los campos total…, cuantos_… y
    objetos_en_la_mesa (que puede venir por técnica)."""
    is_total = key in _TOTAL_KEYS or key.startswith("cuantos_")
    if isinstance(value, bool):
        return []
    if isinstance(value, int):
        return [value] if is_total else []
    if isinstance(value, dict):
        if is_total:
            return [v for v in value.values() if isinstance(v, int)]
        return [t for k, v in value.items() for t in _totals_in(v, k)]
    if isinstance(value, list):
        return [t for v in value for t in _totals_in(v, key if is_total else "")]
    return []
