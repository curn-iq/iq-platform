from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.mappings import ModelMapping
from app.domain.models3d import ModelFile


class SQLAlchemyModelMappingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[ModelFile]:
        rows = await self._session.scalars(
            select(ModelMapping).order_by(ModelMapping.model_file)
        )
        return [ModelFile(r.instrument_id, r.model_file) for r in rows]

    async def replace_all(self, files: list[ModelFile]) -> None:
        # Todo en una transacción: o queda la lista nueva completa o la anterior.
        await self._session.execute(delete(ModelMapping))
        self._session.add_all(
            ModelMapping(instrument_id=f.instrument_id, model_file=f.model_file)
            for f in files
        )
        await self._session.commit()
