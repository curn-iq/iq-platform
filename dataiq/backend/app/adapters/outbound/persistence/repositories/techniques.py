from collections import defaultdict
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.catalog import (
    BiomedicalEquipment,
    Instrument,
    MedicalDevice,
    Suture,
)
from app.adapters.outbound.persistence.models.techniques import (
    ItemCell,
    ItemComponent,
    Specialty,
    Technique,
    TechniqueItem,
    TechniqueVersion,
    VersionDevice,
    VersionEquipment,
    VersionSuture,
    VersionZone,
    Zone,
)
from app.domain.techniques import (
    Cell,
    ComponentDetail,
    Device,
    Equipment,
    ItemDetail,
    SutureDetail,
    TechniqueDetail,
    TechniqueSummary,
    VersionState,
    ZoneLayout,
)


class SQLAlchemyTechniqueRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_published(self) -> list[TechniqueSummary]:
        query = (
            select(
                Technique.id,
                Technique.name,
                Specialty.name.label("specialty"),
                TechniqueVersion.number,
            )
            .join(Specialty, Specialty.id == Technique.specialty_id)
            .join(TechniqueVersion, TechniqueVersion.technique_id == Technique.id)
            .where(TechniqueVersion.state == VersionState.published)
            .order_by(Technique.name, Specialty.name)
        )
        result = await self._session.execute(query)
        return [
            TechniqueSummary(
                id=row.id,
                name=row.name,
                specialty=row.specialty,
                version_number=row.number,
            )
            for row in result
        ]

    async def get_published(self, technique_id: UUID) -> TechniqueDetail | None:
        details = await build_details(
            self._session,
            Technique.id == technique_id,
            TechniqueVersion.state == VersionState.published,
        )
        return details[0] if details else None

    async def list_published_details(self) -> list[TechniqueDetail]:
        return await build_details(
            self._session, TechniqueVersion.state == VersionState.published
        )


async def build_details(session: AsyncSession, *filters) -> list[TechniqueDetail]:
    # Las partes del detalle se piden para todas las versiones a la vez y se
    # agrupan en Python: ocho consultas sin importar cuántas técnicas sean.
    query = (
        select(
            Technique.id,
            Technique.name,
            Specialty.name.label("specialty"),
            TechniqueVersion.id.label("version_id"),
            TechniqueVersion.number,
            TechniqueVersion.cups_code,
            TechniqueVersion.anesthesia,
            TechniqueVersion.patient_position,
            TechniqueVersion.drapes,
            TechniqueVersion.description,
            TechniqueVersion.indications,
            TechniqueVersion.complications,
            TechniqueVersion.surgical_technique,
            TechniqueVersion.source,
        )
        .join(Specialty, Specialty.id == Technique.specialty_id)
        .join(TechniqueVersion, TechniqueVersion.technique_id == Technique.id)
        .where(*filters)
        .order_by(Technique.name, Specialty.name)
    )
    rows = (await session.execute(query)).all()
    if not rows:
        return []
    versions = [row.version_id for row in rows]
    zones = await _zones(session, versions)
    items = await _items(session, versions)
    sutures = await _sutures(session, versions)
    equipment = await _equipment(session, versions)
    devices = await _devices(session, versions)
    return [
        TechniqueDetail(
            id=row.id,
            name=row.name,
            specialty=row.specialty,
            version_number=row.number,
            cups_code=row.cups_code,
            anesthesia=row.anesthesia,
            patient_position=row.patient_position,
            drapes=row.drapes,
            description=row.description,
            indications=row.indications,
            complications=row.complications,
            surgical_technique=row.surgical_technique,
            source=row.source,
            zones=tuple(zones[row.version_id]),
            items=tuple(items[row.version_id]),
            sutures=tuple(sutures[row.version_id]),
            equipment=tuple(equipment[row.version_id]),
            devices=tuple(devices[row.version_id]),
        )
        for row in rows
    ]


async def _zones(
    session: AsyncSession, versions: list[UUID]
) -> dict[UUID, list[ZoneLayout]]:
    zones: dict[UUID, list[ZoneLayout]] = defaultdict(list)
    query = (
        select(
            VersionZone.version_id,
            VersionZone.zone_id,
            Zone.name.label("zone"),
            VersionZone.used,
            VersionZone.grid_rows,
            VersionZone.grid_columns,
        )
        .join(Zone, Zone.id == VersionZone.zone_id)
        .where(VersionZone.version_id.in_(versions))
        .order_by(Zone.name)
    )
    for row in await session.execute(query):
        zones[row.version_id].append(
            ZoneLayout(
                zone_id=row.zone_id,
                zone=row.zone,
                used=row.used,
                rows=row.grid_rows,
                columns=row.grid_columns,
            )
        )
    return zones


async def _items(
    session: AsyncSession, versions: list[UUID]
) -> dict[UUID, list[ItemDetail]]:
    components: dict[UUID, list[ComponentDetail]] = defaultdict(list)
    components_query = (
        select(
            ItemComponent.item_id,
            ItemComponent.instrument_id,
            ItemComponent.suture_id,
            func.coalesce(Instrument.name, Suture.name).label("name"),
        )
        .join(TechniqueItem, TechniqueItem.id == ItemComponent.item_id)
        .outerjoin(Instrument, Instrument.id == ItemComponent.instrument_id)
        .outerjoin(Suture, Suture.id == ItemComponent.suture_id)
        .where(TechniqueItem.version_id.in_(versions))
        .order_by(ItemComponent.id)
    )
    for row in await session.execute(components_query):
        components[row.item_id].append(
            ComponentDetail(
                instrument_id=row.instrument_id,
                suture_id=row.suture_id,
                name=row.name,
            )
        )

    cells: dict[UUID, list[Cell]] = defaultdict(list)
    cells_query = (
        select(ItemCell.item_id, ItemCell.grid_row, ItemCell.grid_column)
        .where(ItemCell.version_id.in_(versions))
        .order_by(ItemCell.grid_row, ItemCell.grid_column)
    )
    for row in await session.execute(cells_query):
        cells[row.item_id].append(Cell(row=row.grid_row, column=row.grid_column))

    items: dict[UUID, list[ItemDetail]] = defaultdict(list)
    items_query = (
        select(
            TechniqueItem.id,
            TechniqueItem.version_id,
            TechniqueItem.zone_id,
            Zone.name.label("zone"),
            TechniqueItem.legend_number,
            TechniqueItem.source_text,
            TechniqueItem.id,
        )
        .outerjoin(Zone, Zone.id == TechniqueItem.zone_id)
        .where(TechniqueItem.version_id.in_(versions))
        .order_by(
            Zone.name.nulls_last(),
            TechniqueItem.legend_number.nulls_last(),
            TechniqueItem.source_text,
            TechniqueItem.id,
        )
    )
    for row in await session.execute(items_query):
        items[row.version_id].append(
            ItemDetail(
                id=row.id,
                zone_id=row.zone_id,
                zone=row.zone,
                legend_number=row.legend_number,
                source_text=row.source_text,
                components=tuple(components[row.id]),
                cells=tuple(cells[row.id]),
            )
        )
    return items


async def _sutures(
    session: AsyncSession, versions: list[UUID]
) -> dict[UUID, list[SutureDetail]]:
    sutures: dict[UUID, list[SutureDetail]] = defaultdict(list)
    query = (
        select(
            VersionSuture.version_id,
            Suture.id,
            Suture.name,
            Suture.gauge,
            Suture.needle_type,
            VersionSuture.usage,
        )
        .join(VersionSuture, VersionSuture.suture_id == Suture.id)
        .where(VersionSuture.version_id.in_(versions))
        .order_by(Suture.name, Suture.gauge, Suture.needle_type, Suture.id)
    )
    for row in await session.execute(query):
        sutures[row.version_id].append(
            SutureDetail(
                id=row.id,
                name=row.name,
                gauge=row.gauge,
                needle_type=row.needle_type,
                usage=row.usage,
            )
        )
    return sutures


async def _equipment(
    session: AsyncSession, versions: list[UUID]
) -> dict[UUID, list[Equipment]]:
    equipment: dict[UUID, list[Equipment]] = defaultdict(list)
    query = (
        select(
            VersionEquipment.version_id,
            BiomedicalEquipment.id,
            BiomedicalEquipment.name,
            BiomedicalEquipment.description,
        )
        .join(
            VersionEquipment,
            VersionEquipment.equipment_id == BiomedicalEquipment.id,
        )
        .where(VersionEquipment.version_id.in_(versions))
        .order_by(BiomedicalEquipment.name)
    )
    for row in await session.execute(query):
        equipment[row.version_id].append(
            Equipment(id=row.id, name=row.name, description=row.description)
        )
    return equipment


async def _devices(
    session: AsyncSession, versions: list[UUID]
) -> dict[UUID, list[Device]]:
    devices: dict[UUID, list[Device]] = defaultdict(list)
    query = (
        select(
            VersionDevice.version_id,
            MedicalDevice.id,
            MedicalDevice.name,
            MedicalDevice.description,
        )
        .join(
            VersionDevice,
            VersionDevice.device_id == MedicalDevice.id,
        )
        .where(VersionDevice.version_id.in_(versions))
        .order_by(MedicalDevice.name)
    )
    for row in await session.execute(query):
        devices[row.version_id].append(
            Device(id=row.id, name=row.name, description=row.description)
        )
    return devices
