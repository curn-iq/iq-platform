from enum import StrEnum


class ChatAction(StrEnum):
    """Lo que el chat puede hacer con una pregunta. El modelo de lenguaje solo
    elige una de estas; los datos de la respuesta salen de DataIQ."""

    show_technique = "show_technique"
    highlight_instrument = "highlight_instrument"
    describe_instrument = "describe_instrument"
    show_clinical_data = "show_clinical_data"
    list_instruments = "list_instruments"
    no_answer = "no_answer"


class ClinicalField(StrEnum):
    """Los datos clínicos de una técnica que el chat sabe mostrar."""

    description = "description"
    indications = "indications"
    complications = "complications"
    anesthesia_position = "anesthesia_position"
