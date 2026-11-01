from uuid import UUID

from app.domain import tools
from app.domain.catalog import Catalog, technique_by_id
from app.domain.chat import ChatAction, Choice, Reply, Vocabulary, answer
from app.domain.guards import before_the_model
from app.domain.names import (
    asks_for_list,
    asks_to_describe,
    field_in,
    instrument_in,
    technique_in,
)


class FakeModel:
    """Modelo de prueba: reglas por palabras clave, sin modelo de lenguaje. Sirve
    para desarrollar el frontend y para las pruebas; con Ollama se cambia por
    configuración (LANGUAGE_MODEL=ollama)."""

    name = "fake"

    async def choose(
        self,
        question: str,
        vocabulary: Vocabulary,
        open_technique: str | None,
        described: str | None = None,
    ) -> Choice:
        """`described`: la técnica que la pregunta describe sin nombrarla («la
        cirugía para quitar la vesícula»), si la hay."""
        technique = technique_in(question, vocabulary) or described
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


class TemplateChat:
    """El chat sin modelo de lenguaje: FakeModel elige la acción y las plantillas
    del dominio arman la respuesta. Es el motor por defecto (para desarrollar sin
    el Servidor PC2) y el respaldo del agente cuando su respuesta no pasa la
    verificación."""

    name = "plantillas"

    def __init__(self) -> None:
        self._model = FakeModel()

    async def reply(
        self, question: str, catalog: Catalog, open_technique_id: UUID | None
    ) -> Reply:
        early = before_the_model(question, catalog, open_technique_id)
        if early:
            return early
        vocabulary = Vocabulary.from_catalog(catalog)
        open_technique = technique_by_id(catalog, open_technique_id)
        described = None
        if technique_in(question, vocabulary) is None:
            # Si describe la técnica sin nombrarla («la cirugía para quitar la
            # vesícula»), cuál es. No con una técnica abierta ni si nombra un
            # instrumento: ahí la pregunta es por esa mesa o por el instrumento.
            if open_technique is None and instrument_in(question, vocabulary) is None:
                described = tools.technique_described(catalog, question)
        choice = await self._model.choose(
            question,
            vocabulary,
            open_technique.name if open_technique else None,
            described.name if described else None,
        )
        return answer(choice, catalog, open_technique_id)
