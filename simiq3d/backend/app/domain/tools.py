"""Las consultas que el agente del chat puede hacer sobre el catálogo de DataIQ.

Son funciones puras: reciben el catálogo y devuelven un diccionario que se le
pasa al modelo tal cual (en JSON). El modelo solo sabe lo que estas consultas
devuelven; con eso redacta la respuesta y el backend la verifica (grounding.py).
Los nombres se aceptan aunque vengan mal escritos o sin «Pinza de»: si no se
encuentra el exacto, se devuelven las sugerencias más parecidas.
"""

import re
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
from app.domain.names import canonical, contains, instrument_keys

NO_DATA = "DataIQ no tiene este dato"


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
            "error": f"«{name}» es una técnica, no un instrumento: su mesa de Mayo "
            "y su instrumental se consultan con get_technique",
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
    for found in (a, b):
        if not isinstance(found, Technique):
            return found

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
        return found
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
        return found
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
        return {
            "error": f"No hay una técnica «{technique}»",
            "buscado": technique,
            "quizas": found,
        }
    if not instrument:
        return Scene(found)
    tool = resolve_instrument(catalog, instrument)
    if not isinstance(tool, Instrument):
        return {
            "error": f"No hay un instrumento «{instrument}»",
            "buscado": instrument,
            "quizas": tool,
        }
    if item_with(found, tool.id) is None:
        return {"error": f"{tool.name} no va en la mesa de Mayo de {found.name}"}
    return Scene(found, tool)
