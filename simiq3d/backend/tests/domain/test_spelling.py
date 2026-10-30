import pytest

from app.domain.chat import Vocabulary
from app.domain.names import (
    canonical,
    instrument_keys,
    instruments_in,
    suggest_spelling,
)
from tests.sample import CATALOG

VOCABULARY = Vocabulary.from_catalog(CATALOG)


@pytest.mark.parametrize(
    ("question", "corrected"),
    [
        (
            "¿Dónde va la kely en la masectomia?",
            "¿Dónde va la Kelly en la Mastectomía?",
        ),
        (
            "¿En cuántas técnicas se usa la pinza allys?",
            "¿En cuántas técnicas se usa la pinza Allis?",
        ),
        ("colecistetomia", "Colecistectomía"),
        ("¿Y la Kelly adzon?", "¿Y la Kelly Adson?"),
    ],
)
def test_misspelled_names_are_suggested_well_written(question, corrected):
    assert suggest_spelling(question, VOCABULARY) == corrected


@pytest.mark.parametrize(
    "question",
    [
        "Muéstrame la mastectomía",
        "¿Qué es una tiroidectomia?",  # sin tilde no es un error
        "¿Cuál es el mayor riesgo?",  # «mayor» no es «Mayo»
        "¿Cómo se acuesta al paciente?",
        "Escribe un poema",
    ],
)
def test_well_written_questions_are_left_alone(question):
    assert suggest_spelling(question, VOCABULARY) is None


def test_instruments_are_listed_in_the_order_they_are_named():
    text = "La Pinza Lahey va junto a la Pinza Kelly Adson, en la mesa de Mayo."

    # «Kelly Adson» no es además la Kelly, y «mesa de Mayo» no es la Tijera.
    assert instruments_in(text, VOCABULARY) == ["Pinza Lahey", "Pinza Kelly Adson"]


@pytest.mark.parametrize(
    ("name", "said"),
    [
        ("Mango de bisturí N.° 3", "mango de bisturí número 3"),
        ("Mango de bisturí N.° 7", "el mango número 7"),
        ("Mango de bisturí N.° 4", "mango nro. 4"),
        ("Hoja de bisturí #15", "la hoja 15"),
        ("Hoja de bisturí #20", "hoja de bisturí número 20"),
    ],
)
def test_numbers_are_said_in_many_ways(name, said):
    keys = instrument_keys(name)

    assert any(k in canonical(said) for k in keys)
