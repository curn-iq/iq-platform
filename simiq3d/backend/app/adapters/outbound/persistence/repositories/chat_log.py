from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.chat import ChatLog
from app.domain.chat_log import ChatLogEntry

FIELDS = (
    "question",
    "open_technique_id",
    "action",
    "technique_id",
    "instrument_id",
    "field",
    "language_model",
    "latency_ms",
)


class SQLAlchemyChatLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entry: ChatLogEntry) -> None:
        self._session.add(ChatLog(**{f: getattr(entry, f) for f in FIELDS}))
        await self._session.commit()

    async def list_all(self) -> list[ChatLogEntry]:
        rows = await self._session.scalars(select(ChatLog).order_by(ChatLog.id))
        return [ChatLogEntry(**{f: getattr(r, f) for f in FIELDS}) for r in rows]

    async def delete_all(self) -> int:
        count = await self._session.scalar(select(func.count()).select_from(ChatLog))
        await self._session.execute(delete(ChatLog))
        await self._session.commit()
        return count or 0
