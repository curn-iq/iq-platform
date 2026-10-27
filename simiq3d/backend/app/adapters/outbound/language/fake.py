from app.adapters.outbound.language.names import (
    asks_for_list,
    asks_to_describe,
    field_in,
    instrument_in,
    technique_in,
)
from app.domain.chat import ChatAction, Choice, Vocabulary


class FakeModel:
    """Modelo de prueba: reglas por palabras clave, sin modelo de lenguaje. Sirve
    para desarrollar el frontend y para las pruebas; con Ollama se cambia por
    configuración (LANGUAGE_MODEL=ollama)."""

    name = "fake"

    async def choose(
        self, question: str, vocabulary: Vocabulary, open_technique: str | None
    ) -> Choice:
        technique = technique_in(question, vocabulary)
        instrument = instrument_in(question, vocabulary)
        field = field_in(question)

        if instrument:
            action = (
                ChatAction.describe_instrument
                if asks_to_describe(question)
                else ChatAction.highlight_instrument
            )
            return Choice(action, technique=technique, instrument=instrument)
        if technique or open_technique:
            if field:
                return Choice(ChatAction.show_clinical_data, technique, field=field)
            if asks_for_list(question):
                return Choice(ChatAction.list_instruments, technique)
            if technique:
                return Choice(ChatAction.show_technique, technique)
        elif field or asks_for_list(question):
            # Pidió un dato de una técnica sin decir cuál: el dominio pregunta.
            action = (
                ChatAction.show_clinical_data if field else ChatAction.list_instruments
            )
            return Choice(action, field=field)
        return Choice(ChatAction.no_answer)
