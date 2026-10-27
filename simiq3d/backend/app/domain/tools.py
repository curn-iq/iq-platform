"""Las consultas que el agente del chat puede hacer sobre el catálogo de DataIQ.

Son funciones puras: reciben el catálogo y devuelven un diccionario que se le
pasa al modelo tal cual (en JSON). El modelo solo sabe lo que estas consultas
devuelven; con eso redacta la respuesta y el backend la verifica (grounding.py).
Los nombres se aceptan aunque vengan mal escritos o sin «Pinza de»: si no se
encuentra el exacto, se devuelven las sugerencias más parecidas.
"""

from dataclasses import dataclass
from difflib import SequenceMatcher

from app.domain.catalog import (
    Catalog,
    Instrument,
    TableItem,
    Technique,
    in_scope,
    item_with,
    neighbors,
    normalize,
    place,
    scope_instruments,
)
from app.domain.names import GENERIC

NO_DATA = "DataIQ no tiene este dato"


def _keys(name: str, aliases: tuple[str, ...] = ()) -> set[str]:
    keys = {normalize(n) for n in (name, *aliases)}
    keys |= {GENERIC.sub("", k) for k in keys}
    first = normalize(name).split()[0]
    return keys | {first}


def _score(text: str, keys: set[str]) -> float:
    wanted = normalize(text)
    return max(SequenceMatcher(None, wanted, k).ratio() for k in keys)


def resolve_technique(catalog: Catalog, name: str) -> Technique | list[str]:
    """La técnica del MVP con ese nombre; si no está, las más parecidas."""
    techniques = in_scope(catalog)
    for t in techniques:
        if normalize(name) in _keys(t.name):
            return t
    ranked = sorted(techniques, key=lambda t: -_score(name, _keys(t.name)))
    return [t.name for t in ranked if _score(name, _keys(t.name)) >= 0.6][:3]


def resolve_instrument(catalog: Catalog, name: str) -> Instrument | list[str]:
    """El instrumento de las mesas del MVP con ese nombre o alias; si no está, los
    más parecidos."""
    instruments = scope_instruments(catalog)
    for i in instruments:
        if normalize(name) in _keys(i.name, i.aliases):
            return i
    ranked = sorted(instruments, key=lambda i: -_score(name, _keys(i.name, i.aliases)))
    return [i.name for i in ranked if _score(name, _keys(i.name, i.aliases)) >= 0.6][:3]


def _where(technique: Technique, item: TableItem) -> dict:
    """Dónde va un objeto, como se dice en la práctica: la zona de la mesa, lo
    que tiene al lado y su número en el diagrama de IQ. La fila y la columna no
    se le pasan al modelo: en la mesa real no hay cuadrícula."""
    # DataIQ permite publicar un objeto de la mesa sin número o sin posición:
    # se dice que falta, en vez de inventarlo o de romperse.
    return {
        "numero_en_el_diagrama": item.legend_number or NO_DATA,
        "ubicacion": place(technique, item) or NO_DATA,
        "junto_a": [n.name for n in neighbors(technique, item)],
    }


def _or_missing(value: str | None) -> str:
    return value or NO_DATA


def list_techniques(catalog: Catalog) -> dict:
    """Las técnicas, de la que lleva más objetos en la mesa de Mayo a la que
    lleva menos: así el modelo no tiene que contar."""
    techniques = sorted(in_scope(catalog), key=lambda t: -len(t.mayo_items()))
    return {
        "tecnicas": [
            {"tecnica": t.name, "objetos_en_la_mesa": len(t.mayo_items())}
            for t in techniques
        ],
        "total": len(techniques),
    }


def compare_techniques(catalog: Catalog, first: str, second: str) -> dict:
    """Qué instrumental comparten dos mesas de Mayo y cuál lleva solo una."""
    a, b = resolve_technique(catalog, first), resolve_technique(catalog, second)
    for name, found in ((first, a), (second, b)):
        if not isinstance(found, Technique):
            return {"error": f"No hay una técnica «{name}»", "quizas": found}

    def names(t: Technique) -> set[str]:
        ids = {i for item in t.mayo_items() for i in item.instrument_ids}
        return {i.name for i in catalog.instruments if i.id in ids}

    in_a, in_b = names(a), names(b)
    only_a = f"solo_en_{normalize(a.name).replace(' ', '_')}"
    only_b = f"solo_en_{normalize(b.name).replace(' ', '_')}"
    # Con los conteos ya hechos: el modelo no tiene que contar (y la
    # verificación necesita ver el número en los resultados).
    return {
        "tecnica_1": a.name,
        "tecnica_2": b.name,
        "en_las_dos": sorted(in_a & in_b),
        "cuantos_en_las_dos": len(in_a & in_b),
        only_a: sorted(in_a - in_b),
        f"cuantos_{only_a}": len(in_a - in_b),
        only_b: sorted(in_b - in_a),
        f"cuantos_{only_b}": len(in_b - in_a),
        "objetos_en_la_mesa": {
            a.name: len(a.mayo_items()),
            b.name: len(b.mayo_items()),
        },
    }


def get_technique(catalog: Catalog, technique: str) -> dict:
    found = resolve_technique(catalog, technique)
    if not isinstance(found, Technique):
        return {"error": f"No hay una técnica «{technique}»", "quizas": found}
    items = sorted(found.mayo_items(), key=lambda i: i.legend_number or 99)
    return {
        "tecnica": found.name,
        "especialidad": found.specialty,
        "para_que_sirve": _or_missing(found.description),
        "indicaciones": _or_missing(found.indications),
        "complicaciones": _or_missing(found.complications),
        "anestesia": _or_missing(found.anesthesia),
        "posicion_del_paciente": _or_missing(found.patient_position),
        "mesa_de_mayo": [{"objeto": i.name} | _where(found, i) for i in items],
        "total_objetos": len(items),
    }


def find_instrument(catalog: Catalog, instrument: str) -> dict:
    found = resolve_instrument(catalog, instrument)
    if not isinstance(found, Instrument):
        return {"error": f"No hay un instrumento «{instrument}»", "quizas": found}
    tables = []
    for t in in_scope(catalog):
        item = item_with(t, found.id)
        if item:
            tables.append({"tecnica": t.name} | _where(t, item))
    return {
        "instrumento": found.name,
        "descripcion": _or_missing(found.description),
        "otros_nombres": list(found.aliases),
        "en_tecnicas": tables,
        "total_tecnicas": len(tables),
    }


@dataclass(frozen=True)
class Scene:
    """Lo que el visor abre y resalta. Sale de una consulta, con ids reales."""

    technique: Technique
    instrument: Instrument | None = None


def show_in_3d(
    catalog: Catalog, technique: str, instrument: str | None
) -> Scene | dict:
    found = resolve_technique(catalog, technique)
    if not isinstance(found, Technique):
        return {"error": f"No hay una técnica «{technique}»", "quizas": found}
    if not instrument:
        return Scene(found)
    tool = resolve_instrument(catalog, instrument)
    if not isinstance(tool, Instrument):
        return {"error": f"No hay un instrumento «{instrument}»", "quizas": tool}
    if item_with(found, tool.id) is None:
        return {"error": f"{tool.name} no va en la mesa de Mayo de {found.name}"}
    return Scene(found, tool)
