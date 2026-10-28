from typing import Protocol
from uuid import UUID

from app.domain.catalog import (
    CatalogInstrument,
    CatalogSuture,
    InstrumentChanges,
    Reference,
)
from app.domain.techniques import Device, Equipment


class CatalogRepository(Protocol):
    async def list_instruments(self) -> list[CatalogInstrument]: ...

    async def get_instrument(self, instrument_id: UUID) -> CatalogInstrument | None: ...

    async def create_instrument(
        self,
        name: str,
        category_id: UUID,
        description: str | None,
        description_source: str | None = None,
    ) -> CatalogInstrument: ...

    async def update_instrument(
        self, instrument_id: UUID, changes: InstrumentChanges
    ) -> CatalogInstrument: ...

    async def list_specialties(self) -> list[Reference]: ...

    async def list_zones(self) -> list[Reference]: ...

    async def list_categories(self) -> list[Reference]: ...

    async def list_sutures(self) -> list[CatalogSuture]: ...

    async def list_equipment(self) -> list[Equipment]: ...

    async def list_devices(self) -> list[Device]: ...
