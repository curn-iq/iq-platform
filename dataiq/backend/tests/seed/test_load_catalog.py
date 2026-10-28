import pytest
from sqlalchemy import select

from app.adapters.outbound.persistence.models.catalog import (
    Instrument,
    InstrumentAlias,
)
from seed.load import SeedInstrument, load_catalog

KELLY = SeedInstrument(
    name="Pinza de prueba",
    category="Categoría de prueba",
    description="Pinza hemostática",
    description_source="Un libro",
)


async def _saved(session, name):
    return (
        await session.scalars(select(Instrument).where(Instrument.name == name))
    ).one()


@pytest.mark.anyio
async def test_an_empty_description_is_filled_with_its_source(session, instrument):
    outdated = await load_catalog(session, [KELLY])

    saved = await _saved(session, "Pinza de prueba")
    assert (saved.description, saved.description_source) == (
        "Pinza hemostática",
        "Un libro",
    )
    assert outdated == []


@pytest.mark.anyio
async def test_a_different_description_is_kept_unless_asked(session, instrument):
    instrument.description = "La escribió un revisor"
    instrument.description_source = "Otro libro"
    await session.flush()

    kept = await load_catalog(session, [KELLY])
    assert instrument.description == "La escribió un revisor"
    replaced = await load_catalog(session, [KELLY], replace_descriptions=True)

    assert kept == ["Pinza de prueba"]
    assert replaced == []
    assert (instrument.description, instrument.description_source) == (
        "Pinza hemostática",
        "Un libro",
    )


@pytest.mark.anyio
async def test_a_corrected_name_keeps_the_id_and_the_old_name(session, instrument):
    renamed = SeedInstrument(
        name="Pinza corregida",
        category="Categoría de prueba",
        aliases=("Pinza de prueba",),
    )

    await load_catalog(session, [renamed])

    saved = await _saved(session, "Pinza corregida")
    aliases = await session.scalars(
        select(InstrumentAlias.alias).where(InstrumentAlias.instrument_id == saved.id)
    )
    assert saved.id == instrument.id
    assert list(aliases) == ["Pinza de prueba"]
