from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.classes import ClassMapping
from app.domain.classes import ClassEntry


class SQLAlchemyClassRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[ClassEntry]:
        rows = await self._session.scalars(
            select(ClassMapping).order_by(ClassMapping.label)
        )
        return [ClassEntry(r.label, r.instrument_id) for r in rows]

    async def replace_all(self, entries: list[ClassEntry]) -> None:
        # Todo en una transacción: o queda la lista nueva completa o la anterior.
        await self._session.execute(delete(ClassMapping))
        self._session.add_all(
            ClassMapping(label=e.label, instrument_id=e.instrument_id) for e in entries
        )
        await self._session.commit()
