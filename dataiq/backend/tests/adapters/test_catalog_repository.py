import pytest

from app.adapters.outbound.persistence.models.catalog import (
    Instrument,
    InstrumentAlias,
    InstrumentCategory,
)
from app.adapters.outbound.persistence.repositories.catalog import (
    SQLAlchemyCatalogRepository,
)
from app.domain.catalog import CatalogInstrument


@pytest.mark.anyio
async def test_list_instruments_returns_category_and_aliases(session):
    category = InstrumentCategory(name="Categoría de prueba")
    session.add(category)
    await session.flush()
    forceps = Instrument(
        name="Pinza de prueba", category_id=category.id, description="Sujeta"
    )
    scissors = Instrument(name="Tijera de prueba", category_id=category.id)
    session.add_all([forceps, scissors])
    await session.flush()
    session.add_all(
        [
            InstrumentAlias(instrument_id=forceps.id, alias="Pinzas de prueba"),
            InstrumentAlias(instrument_id=forceps.id, alias="Pinza prueba"),
        ]
    )
    await session.flush()

    repository = SQLAlchemyCatalogRepository(session)

    assert await repository.list_instruments() == [
        CatalogInstrument(
            id=forceps.id,
            name="Pinza de prueba",
            category="Categoría de prueba",
            description="Sujeta",
            alias=("Pinza prueba", "Pinzas de prueba"),
        ),
        CatalogInstrument(
            id=scissors.id,
            name="Tijera de prueba",
            category="Categoría de prueba",
            description=None,
            alias=(),
        ),
    ]
