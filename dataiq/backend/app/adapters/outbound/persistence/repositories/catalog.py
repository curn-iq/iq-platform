from collections import defaultdict
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.catalog import (
    BiomedicalEquipment,
    Instrument,
    InstrumentAlias,
    InstrumentCategory,
    MedicalDevice,
    Suture,
)
from app.adapters.outbound.persistence.models.techniques import (
    ItemComponent,
    Specialty,
    TechniqueItem,
    TechniqueVersion,
    VersionDevice,
    VersionEquipment,
    VersionSuture,
    Zone,
)
from app.domain.catalog import (
    CatalogInstrument,
    CatalogSuture,
    InstrumentChanges,
    Reference,
)
from app.domain.errors import Conflict, NotFound
from app.domain.techniques import Device, Equipment, VersionState


class SQLAlchemyCatalogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_instruments(
        self, instrument_id: UUID | None = None
    ) -> list[CatalogInstrument]:
        aliases: dict[UUID, list[str]] = defaultdict(list)
        alias_query = select(
            InstrumentAlias.instrument_id, InstrumentAlias.alias
        ).order_by(InstrumentAlias.alias)
        if instrument_id is not None:
            alias_query = alias_query.where(
                InstrumentAlias.instrument_id == instrument_id
            )
        for row in await self._session.execute(alias_query):
            aliases[row.instrument_id].append(row.alias)

        query = (
            select(
                Instrument.id,
                Instrument.name,
                InstrumentCategory.name.label("category"),
                Instrument.description,
                Instrument.description_source,
            )
            .join(
                InstrumentCategory,
                InstrumentCategory.id == Instrument.category_id,
            )
            .order_by(Instrument.name)
        )
        if instrument_id is not None:
            query = query.where(Instrument.id == instrument_id)
        return [
            CatalogInstrument(
                id=row.id,
                name=row.name,
                category=row.category,
                description=row.description,
                aliases=tuple(aliases[row.id]),
                description_source=row.description_source,
            )
            for row in await self._session.execute(query)
        ]

    async def get_instrument(self, instrument_id: UUID) -> CatalogInstrument | None:
        found = await self.list_instruments(instrument_id)
        return found[0] if found else None

    async def create_instrument(
        self,
        name: str,
        category_id: UUID,
        description: str | None,
        description_source: str | None = None,
    ) -> CatalogInstrument:
        await self._validate_instrument(name, category_id)
        instrument = Instrument(
            name=name,
            category_id=category_id,
            description=description,
            description_source=description_source,
        )
        self._session.add(instrument)
        await self._session.flush()
        instrument_id = instrument.id
        await self._session.commit()
        return await self.get_instrument(instrument_id)

    async def update_instrument(
        self, instrument_id: UUID, changes: InstrumentChanges
    ) -> CatalogInstrument:
        instrument = await self._session.get(
            Instrument, instrument_id, with_for_update=True
        )
        if instrument is None:
            raise NotFound("El instrumento no existe")
        await self._validate_instrument(
            changes.name, changes.category_id, excluding=instrument_id
        )
        if changes.name is not None:
            instrument.name = changes.name
        if changes.category_id is not None:
            instrument.category_id = changes.category_id
        if changes.description is not None:
            instrument.description = changes.description
        if changes.description_source is not None:
            instrument.description_source = changes.description_source
        if changes.aliases is not None:
            await self._replace_aliases(instrument_id, changes.aliases)
        await self._session.flush()
        await self._session.commit()
        return await self.get_instrument(instrument_id)

    async def _replace_aliases(
        self, instrument_id: UUID, aliases: tuple[str, ...]
    ) -> None:
        taken = await self._session.scalar(
            select(InstrumentAlias.alias).where(
                InstrumentAlias.alias.in_(aliases),
                InstrumentAlias.instrument_id != instrument_id,
            )
        )
        if taken:
            raise Conflict(f"El alias «{taken}» ya es de otro instrumento")
        await self._session.execute(
            delete(InstrumentAlias).where(
                InstrumentAlias.instrument_id == instrument_id
            )
        )
        self._session.add_all(
            InstrumentAlias(instrument_id=instrument_id, alias=a) for a in aliases
        )

    async def _validate_instrument(
        self,
        name: str | None,
        category_id: UUID | None,
        excluding: UUID | None = None,
    ) -> None:
        if category_id is not None and not await self._session.get(
            InstrumentCategory, category_id
        ):
            raise NotFound("La categoría no existe")
        if name is not None:
            query = select(Instrument.id).where(Instrument.name == name)
            if excluding is not None:
                query = query.where(Instrument.id != excluding)
            if await self._session.scalar(query):
                raise Conflict("Ya hay un instrumento con ese nombre")

    async def _references(self, model) -> list[Reference]:
        rows = await self._session.execute(
            select(model.id, model.name).order_by(model.name)
        )
        return [Reference(id=f.id, name=f.name) for f in rows]

    async def list_specialties(self) -> list[Reference]:
        return await self._references(Specialty)

    async def list_zones(self) -> list[Reference]:
        return await self._references(Zone)

    async def list_categories(self) -> list[Reference]:
        return await self._references(InstrumentCategory)

    async def list_sutures(self, published_only: bool = False) -> list[CatalogSuture]:
        query = select(
            Suture.id, Suture.name, Suture.gauge, Suture.needle_type
        ).order_by(Suture.name, Suture.gauge, Suture.needle_type, Suture.id)
        if published_only:
            query = query.where(Suture.id.in_(_published_sutures()))
        rows = await self._session.execute(query)
        return [CatalogSuture(**f._mapping) for f in rows]

    async def list_equipment(self, published_only: bool = False) -> list[Equipment]:
        query = select(
            BiomedicalEquipment.id,
            BiomedicalEquipment.name,
            BiomedicalEquipment.description,
        ).order_by(BiomedicalEquipment.name)
        if published_only:
            query = query.where(
                BiomedicalEquipment.id.in_(
                    _in_published(VersionEquipment.equipment_id, VersionEquipment)
                )
            )
        rows = await self._session.execute(query)
        return [Equipment(**f._mapping) for f in rows]

    async def list_devices(self, published_only: bool = False) -> list[Device]:
        query = select(
            MedicalDevice.id,
            MedicalDevice.name,
            MedicalDevice.description,
        ).order_by(MedicalDevice.name)
        if published_only:
            query = query.where(
                MedicalDevice.id.in_(
                    _in_published(VersionDevice.device_id, VersionDevice)
                )
            )
        rows = await self._session.execute(query)
        return [Device(**f._mapping) for f in rows]


def _in_published(column, link):
    """Los ids de `column` que usa alguna versión publicada."""
    return (
        select(column)
        .join(TechniqueVersion, TechniqueVersion.id == link.version_id)
        .where(TechniqueVersion.state == VersionState.published)
    )


def _published_sutures():
    """Suturas de una versión publicada: las de la lista de la técnica y las de
    los componentes de su mesa."""
    from_list = _in_published(VersionSuture.suture_id, VersionSuture)
    from_items = (
        select(ItemComponent.suture_id)
        .join(TechniqueItem, TechniqueItem.id == ItemComponent.item_id)
        .join(TechniqueVersion, TechniqueVersion.id == TechniqueItem.version_id)
        .where(
            TechniqueVersion.state == VersionState.published,
            ItemComponent.suture_id.is_not(None),
        )
    )
    return from_list.union(from_items)
