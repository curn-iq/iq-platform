import uuid
from datetime import UTC, datetime

import pytest

from app.adapters.outbound.persistence.models.catalog import (
    BiomedicalEquipment,
    Instrument,
    InstrumentCategory,
    MedicalDevice,
    Suture,
)
from app.adapters.outbound.persistence.models.techniques import (
    ItemCell,
    ItemComponent,
    Technique,
    TechniqueItem,
    TechniqueVersion,
    VersionDevice,
    VersionEquipment,
    VersionSuture,
    VersionZone,
    Zone,
)
from app.adapters.outbound.persistence.repositories.techniques import (
    SQLAlchemyTechniqueRepository,
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


async def save_technique(session, name, specialty, author) -> Technique:
    technique = Technique(name=name, specialty_id=specialty.id, created_by=author.id)
    session.add(technique)
    await session.flush()
    return technique


def reviewed_version(technique, number, state, author, reviewer, **data):
    return TechniqueVersion(
        technique_id=technique.id,
        number=number,
        state=state,
        created_by=author.id,
        reviewed_by=reviewer.id,
        reviewed_at=datetime.now(UTC),
        **data,
    )


def draft_version(technique, number, author):
    return TechniqueVersion(
        technique_id=technique.id, number=number, created_by=author.id
    )


@pytest.mark.anyio
async def test_list_published_returns_only_published(
    session, author, reviewer, specialty
):
    published = await save_technique(session, "Técnica publicada", specialty, author)
    in_draft = await save_technique(session, "Técnica en borrador", specialty, author)
    session.add_all(
        [
            reviewed_version(published, 1, VersionState.published, author, reviewer),
            draft_version(in_draft, 1, author),
        ]
    )
    await session.flush()

    repository = SQLAlchemyTechniqueRepository(session)
    result = await repository.list_published()

    assert result == [
        TechniqueSummary(
            id=published.id,
            name="Técnica publicada",
            specialty="Especialidad de prueba",
            version_number=1,
        )
    ]


@pytest.mark.anyio
async def test_get_published_returns_the_published_version(
    session, author, reviewer, specialty
):
    technique = await save_technique(session, "Técnica", specialty, author)
    session.add_all(
        [
            reviewed_version(
                technique,
                1,
                VersionState.superseded,
                author,
                reviewer,
                anesthesia="Anestesia de la v1",
            ),
            reviewed_version(
                technique,
                2,
                VersionState.published,
                author,
                reviewer,
                cups_code="000000",
                anesthesia="Anestesia de la v2",
            ),
            draft_version(technique, 3, author),
        ]
    )
    await session.flush()

    repository = SQLAlchemyTechniqueRepository(session)
    result = await repository.get_published(technique.id)

    assert result == TechniqueDetail(
        id=technique.id,
        name="Técnica",
        specialty="Especialidad de prueba",
        version_number=2,
        cups_code="000000",
        anesthesia="Anestesia de la v2",
        patient_position=None,
        drapes=None,
        description=None,
        indications=None,
        complications=None,
        surgical_technique=None,
        source=None,
        zones=(),
        items=(),
        sutures=(),
        equipment=(),
        devices=(),
    )


@pytest.mark.anyio
async def test_get_published_returns_none_when_only_draft(session, author, specialty):
    technique = await save_technique(session, "Técnica", specialty, author)
    session.add(draft_version(technique, 1, author))
    await session.flush()

    repository = SQLAlchemyTechniqueRepository(session)

    assert await repository.get_published(technique.id) is None


@pytest.mark.anyio
async def test_get_published_returns_none_for_missing_technique(session):
    repository = SQLAlchemyTechniqueRepository(session)

    assert await repository.get_published(uuid.uuid7()) is None


@pytest.mark.anyio
async def test_get_published_returns_items_stands_and_elements_of_the_version(
    session, author, reviewer, specialty
):
    technique = await save_technique(session, "Técnica", specialty, author)
    v1 = reviewed_version(technique, 1, VersionState.superseded, author, reviewer)
    v2 = reviewed_version(technique, 2, VersionState.published, author, reviewer)
    category = InstrumentCategory(name="Categoría de prueba")
    mayo_stand = Zone(name="Mesa de prueba")
    session.add_all([v1, v2, category, mayo_stand])
    await session.flush()

    forceps = Instrument(name="Pinza de prueba", category_id=category.id)
    scissors = Instrument(name="Tijera de prueba", category_id=category.id)
    suture = Suture(name="Sutura de prueba", gauge="3/0")
    equipment_item = BiomedicalEquipment(name="Equipo de prueba")
    device = MedicalDevice(name="Dispositivo de prueba", description="D")
    composite = TechniqueItem(
        version_id=v2.id,
        zone_id=mayo_stand.id,
        legend_number=1,
        source_text="Pinza con sutura",
    )
    list_only = TechniqueItem(version_id=v2.id, source_text="Tijera")
    from_other_version = TechniqueItem(
        version_id=v1.id, zone_id=mayo_stand.id, legend_number=1, source_text="Viejo"
    )
    session.add_all(
        [forceps, scissors, suture, equipment_item, device, composite, list_only]
    )
    session.add(from_other_version)
    await session.flush()

    session.add_all(
        [
            ItemComponent(item_id=composite.id, instrument_id=forceps.id),
            ItemComponent(item_id=list_only.id, instrument_id=scissors.id),
            ItemComponent(item_id=from_other_version.id, instrument_id=forceps.id),
            ItemCell(
                item_id=composite.id,
                version_id=v2.id,
                zone_id=mayo_stand.id,
                grid_row=2,
                grid_column=1,
            ),
            ItemCell(
                item_id=composite.id,
                version_id=v2.id,
                zone_id=mayo_stand.id,
                grid_row=1,
                grid_column=1,
            ),
            ItemCell(
                item_id=from_other_version.id,
                version_id=v1.id,
                zone_id=mayo_stand.id,
                grid_row=1,
                grid_column=1,
            ),
            VersionSuture(version_id=v2.id, suture_id=suture.id, usage="Piel"),
            VersionEquipment(version_id=v2.id, equipment_id=equipment_item.id),
            VersionDevice(version_id=v2.id, device_id=device.id),
            VersionZone(
                version_id=v2.id,
                zone_id=mayo_stand.id,
                used=True,
                grid_rows=3,
                grid_columns=2,
            ),
            VersionZone(version_id=v1.id, zone_id=mayo_stand.id, used=False),
        ]
    )
    await session.flush()
    # El segundo componente va después del primero (los ids UUIDv7 crecen).
    session.add(ItemComponent(item_id=composite.id, suture_id=suture.id))
    await session.flush()

    repository = SQLAlchemyTechniqueRepository(session)
    result = await repository.get_published(technique.id)

    assert result.items == (
        ItemDetail(
            id=composite.id,
            zone_id=mayo_stand.id,
            zone="Mesa de prueba",
            legend_number=1,
            source_text="Pinza con sutura",
            components=(
                ComponentDetail(
                    instrument_id=forceps.id, suture_id=None, name="Pinza de prueba"
                ),
                ComponentDetail(
                    instrument_id=None, suture_id=suture.id, name="Sutura de prueba"
                ),
            ),
            cells=(Cell(row=1, column=1), Cell(row=2, column=1)),
        ),
        ItemDetail(
            id=list_only.id,
            zone_id=None,
            zone=None,
            legend_number=None,
            source_text="Tijera",
            components=(
                ComponentDetail(
                    instrument_id=scissors.id, suture_id=None, name="Tijera de prueba"
                ),
            ),
            cells=(),
        ),
    )
    assert result.zones == (
        ZoneLayout(
            zone_id=mayo_stand.id, zone="Mesa de prueba", used=True, rows=3, columns=2
        ),
    )
    assert result.sutures == (
        SutureDetail(
            id=suture.id,
            name="Sutura de prueba",
            gauge="3/0",
            needle_type=None,
            usage="Piel",
        ),
    )
    assert result.equipment == (
        Equipment(id=equipment_item.id, name="Equipo de prueba", description=None),
    )
    assert result.devices == (
        Device(id=device.id, name="Dispositivo de prueba", description="D"),
    )


@pytest.mark.anyio
async def test_list_published_details_groups_items_by_technique(
    session, author, reviewer, specialty
):
    first_ = await save_technique(session, "A técnica", specialty, author)
    second = await save_technique(session, "B técnica", specialty, author)
    in_draft = await save_technique(session, "C técnica", specialty, author)
    v_first = reviewed_version(first_, 1, VersionState.published, author, reviewer)
    v_second = reviewed_version(second, 1, VersionState.published, author, reviewer)
    v_draft = draft_version(in_draft, 1, author)
    session.add_all([v_first, v_second, v_draft])
    await session.flush()
    session.add_all(
        [
            TechniqueItem(version_id=v_first.id, source_text="De la primera"),
            TechniqueItem(version_id=v_draft.id, source_text="Del borrador"),
        ]
    )
    await session.flush()

    repository = SQLAlchemyTechniqueRepository(session)
    result = await repository.list_published_details()

    assert [t.name for t in result] == ["A técnica", "B técnica"]
    assert [i.source_text for i in result[0].items] == ["De la primera"]
    assert result[1].items == ()
    assert result == [
        await repository.get_published(first_.id),
        await repository.get_published(second.id),
    ]
