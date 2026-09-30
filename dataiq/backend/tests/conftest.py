import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import config


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def sesion():
    motor = create_async_engine(config.url_base_datos, poolclass=NullPool)
    async with motor.connect() as conexion:
        transaccion = await conexion.begin()
        async with AsyncSession(
            bind=conexion, join_transaction_mode="create_savepoint"
        ) as s:
            yield s
        await transaccion.rollback()
    await motor.dispose()
