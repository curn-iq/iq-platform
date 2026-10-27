import pytest

from app.domain.chat import Vocabulary
from app.domain.names import suggest_spelling
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
