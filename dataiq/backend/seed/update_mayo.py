"""Publica solo las mesas de Mayo fotografiadas, y la fuente que las cita, en una nueva
versión de DataIQ."""

import argparse
import asyncio
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.database import engine
from app.adapters.outbound.persistence.models.catalog import Instrument
from app.adapters.outbound.persistence.models.techniques import Technique, Zone
from app.adapters.outbound.persistence.repositories.versions import (
    CLINICAL_FIELDS,
    SQLAlchemyVersionRepository,
)
from app.domain.techniques import (
    Cell,
    NewComponent,
    NewItem,
    NewSuture,
    NewZoneLayout,
    TechniqueDetail,
    VersionContent,
    VersionState,
    validate_content,
)
from seed.load import SOURCE_FILE, SeedTechnique, _seed_user, read_file

MAYO = "Mesa de Mayo"
SPECIALTY = "Cirugía General"
NAMES = (
    "Colecistectomía",
    "Eventrorrafia",
    "Hemicolectomía derecha",
    "Mastectomía",
    "Tiroidectomía",
)


def _existing_item(item) -> NewItem:
    return NewItem(
        item.zone_id,
        item.legend_number,
        item.source_text,
        tuple(NewComponent(c.instrument_id, c.suture_id) for c in item.components),
        tuple(sorted(item.cells, key=lambda c: (c.row, c.column))),
    )


def _updated_content(
    published: TechniqueDetail,
    seed: SeedTechnique,
    zone_id: UUID,
    instrument_ids: dict[str, UUID],
) -> VersionContent | None:
    rows, columns = seed.sizes[MAYO]
    new_zone = NewZoneLayout(zone_id, True, rows, columns)
    new_items = tuple(
        NewItem(
            zone_id,
            item.number,
            item.source_text,
            tuple(NewComponent(instrument_ids[name], None) for name in item.components),
            tuple(Cell(row, col) for row, col in sorted(item.cells)),
        )
        for item in seed.items
        if item.stand == MAYO
    )
    old_zones = tuple(
        NewZoneLayout(z.zone_id, z.used, z.rows, z.columns) for z in published.zones
    )
    old_items = tuple(map(_existing_item, published.items))
    source = seed.data["source"]
    if (
        new_zone in old_zones
        and set(new_items) == {item for item in old_items if item.zone_id == zone_id}
        and published.source == source
    ):
        return None

    clinical = {field: getattr(published, field) for field in CLINICAL_FIELDS}
    # La fuente cita de dónde sale la mesa de Mayo: cambia con ella.
    clinical["source"] = source
    return VersionContent(
        **clinical,
        zones=tuple(z for z in old_zones if z.zone_id != zone_id) + (new_zone,),
        items=tuple(i for i in old_items if i.zone_id != zone_id) + new_items,
        sutures=tuple(
            NewSuture(s.name, s.gauge, s.needle_type, s.usage)
            for s in published.sutures
        ),
        equipment=tuple(e.name for e in published.equipment),
        devices=tuple(d.name for d in published.devices),
    )


async def update_mayo(apply: bool) -> None:
    seeds, _ = read_file(SOURCE_FILE)
    async with (
        engine.begin() as connection,
        AsyncSession(
            connection, join_transaction_mode="create_savepoint", expire_on_commit=False
        ) as session,
    ):
        repo = SQLAlchemyVersionRepository(session)
        zone_id = await session.scalar(select(Zone.id).where(Zone.name == MAYO))
        if zone_id is None:
            raise SystemExit(f"No existe la zona {MAYO}.")
        instruments = dict(
            (await session.execute(select(Instrument.name, Instrument.id))).all()
        )
        versions = {
            v.technique: v
            for v in await repo.list_all([VersionState.published])
            if v.specialty == SPECIALTY
        }
        plan = []
        for name in NAMES:
            if name not in versions or seeds[name].specialty != SPECIALTY:
                raise SystemExit(f"No se encontró publicada la técnica {name}.")
            if seeds[name].sizes.get(MAYO) != (10, 6):
                raise SystemExit(f"{name} no tiene la cuadrícula esperada en el Excel.")
            summary = versions[name]
            locked = await session.scalar(
                select(Technique.id)
                .where(Technique.id == summary.technique_id)
                .with_for_update()
            )
            assert locked is not None
            current = await repo.get_published_of(summary.technique_id)
            if current is None or current.id != summary.id:
                raise SystemExit(f"Cambió la versión publicada de {name}.")
            detail = await repo.get(summary.id)
            assert detail is not None
            content = _updated_content(
                detail.content, seeds[name], zone_id, instruments
            )
            if content is None:
                print(f"{name}: ya tiene la Mesa de Mayo y la fuente del Excel.")
                continue
            if await repo.has_version_in_progress(summary.technique_id):
                raise SystemExit(
                    f"{name} tiene una versión en curso. No se publicó nada."
                )
            validate_content(content)
            plan.append((summary, content))
            print(
                f"{name}: nueva versión desde v{summary.number}, Mesa de Mayo y fuente."
            )

        if apply and plan:
            author = await _seed_user(session)
            for summary, content in plan:
                draft = await repo.create_from_published(
                    summary.technique_id, author.id
                )
                await repo.replace_content(draft, content)
                await repo.change_state(
                    draft, VersionState.draft, VersionState.published, author.id
                )
    print(f"{'Publicadas' if apply else 'Previstas'}: {len(plan)}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Publicar las versiones.")
    asyncio.run(update_mayo(parser.parse_args().apply))
