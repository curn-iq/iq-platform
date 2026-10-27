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
        keys = {normalize(n) for n in (i.name, *i.aliases)} | {
            GENERIC.sub("", normalize(i.name))
        }
        mentioned = any(len(k) >= 5 and contains(said, k) for k in keys)
        if mentioned and not contains(facts, normalize(i.name)):
            problems.append(i.name)
    # Lo que parece un instrumento pero no es del catálogo (inventado).
    catalog_words = {w for i in catalog.instruments for w in normalize(i.name).split()}
    for match in _INSTRUMENT_LIKE.finditer(text):
        word = normalize(match.group(1))
        if word not in catalog_words and not contains(facts, word):
            problems.append(match.group(0))
    numbers = set(re.findall(r"\d+", facts))
    problems += [n for n in re.findall(r"\d+", text) if n not in numbers]
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


_GRID_WORDS = re.compile(r"\b(?:filas?|columnas?|celdas?|cuadricula)\b")
_SAME_PLACE = re.compile(
    r"\b(?:en cada una|en todas|misma (?:ubicacion|posicion|zona|parte)|"
    r"mismo (?:lugar|sitio))\b"
)


def _places_in(value) -> list[str]:
    """Todas las ubicaciones que aparecen en los resultados de las consultas."""
    if isinstance(value, dict):
        own = [value["ubicacion"]] if "ubicacion" in value else []
        return own + [p for v in value.values() for p in _places_in(v)]
    if isinstance(value, list):
        return [p for v in value for p in _places_in(v)]
    return []
