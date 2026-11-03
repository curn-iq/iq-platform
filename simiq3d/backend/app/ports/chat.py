from typing import Protocol
from uuid import UUID

from app.domain.catalog import Catalog
from app.domain.chat import Reply
from app.domain.requests import Turn


class ChatEngine(Protocol):
    # Se guarda en el registro de conversaciones, para comparar motores.
    name: str

    async def reply(
        self,
        question: str,
        catalog: Catalog,
        open_technique_id: UUID | None,
        previous: tuple[Turn, ...] = (),
    ) -> Reply:
        """Responde la pregunta solo con datos del catálogo; `previous` son las
        preguntas anteriores de la conversación, para entender un seguimiento.
        Lanza ModelUnavailable si el modelo de lenguaje no responde."""
        ...


class ModelUnavailable(Exception):
    """El modelo de lenguaje (Servidor PC2) no respondió."""
