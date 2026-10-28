from datetime import datetime
from typing import Protocol

from app.domain.chat_log import ChatLogEntry


class ChatLogRepository(Protocol):
    async def add(self, entry: ChatLogEntry) -> None: ...

    async def list_all(
        self, since: datetime | None = None, until: datetime | None = None
    ) -> list[ChatLogEntry]:
        """En orden de llegada, para exportarlo y analizarlo. Con since y until,
        solo lo que llegó en ese lapso (until no se incluye)."""
        ...

    async def delete_all(self) -> int:
        """Lo borra todo al terminar la evaluación; devuelve cuántas filas eran."""
        ...
