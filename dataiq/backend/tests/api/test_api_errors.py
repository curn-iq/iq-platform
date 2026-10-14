import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.adapters.outbound.persistence.models.catalog import Instrument
from app.adapters.outbound.persistence.models.techniques import Zone
from app.main import handle_integrity_error


async def integrity_error(session, row) -> IntegrityError:
    with pytest.raises(IntegrityError) as error:
        async with session.begin_nested():
            session.add(row)
            await session.flush()
    return error.value


@pytest.mark.anyio
async def test_a_repeated_unique_value_is_a_conflict(session, zone):
    # Lo que pasa cuando dos peticiones crean lo mismo a la vez: la segunda
    # llega a la base con un valor que ya existe.
    error = await integrity_error(session, Zone(name=zone.name))

    response_ = await handle_integrity_error(None, error)

    assert response_.status_code == 409


@pytest.mark.anyio
async def test_other_integrity_errors_are_still_server_errors(session):
    # Una FK rota no la causa una carrera sino un error del código: 500.
    error = await integrity_error(
        session, Instrument(name="Categoría inexistente", category_id=uuid.uuid7())
    )

    with pytest.raises(IntegrityError):
        await handle_integrity_error(None, error)
