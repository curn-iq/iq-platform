from typing import Protocol

from app.domain.chat import Choice, Vocabulary


class LanguageModel(Protocol):
    # Se guarda en el registro de conversaciones, para comparar modelos.
    name: str

    async def choose(
        self, question: str, vocabulary: Vocabulary, open_technique: str | None
    ) -> Choice:
        """Convierte la pregunta en una acción del chat. Lanza ModelUnavailable si
        el modelo no responde."""
        ...


class ModelUnavailable(Exception):
    """El modelo de lenguaje (Servidor PC2) no respondió."""
