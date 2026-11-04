from dataclasses import dataclass
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


# --- Una respuesta que se muestra a medida que se escribe (POST /chat/stream) ---


@dataclass(frozen=True)
class ReplyStart:
    """Lo primero: lo que hace el visor y las preguntas sugeridas, sin texto."""

    reply: Reply


@dataclass(frozen=True)
class ReplyText:
    """Una parte del texto, ya revisada: se agrega a lo que ya se mostró."""

    text: str


@dataclass(frozen=True)
class ReplyEnd:
    """La respuesta completa, que reemplaza lo mostrado y va al registro."""

    reply: Reply


ReplyEvent = ReplyStart | ReplyText | ReplyEnd
