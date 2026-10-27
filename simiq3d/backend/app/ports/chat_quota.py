from typing import Protocol
from uuid import UUID


class ChatQuota(Protocol):
    async def take(self, account_id: UUID) -> bool:
        """Cuenta una pregunta de esa cuenta. False si ya llegó al tope de la
        ventana de tiempo: entonces no se le pregunta al modelo."""
        ...
