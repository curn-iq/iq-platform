from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.adaptadores.salida.persistencia.modelos.tecnicas import Especialidad
from app.adaptadores.salida.persistencia.modelos.usuarios import Usuario
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


async def guardar_usuario(sesion, nombre: str, email: str) -> Usuario:
    usuario = Usuario(
        nombre=nombre,
        email=email,
        password_hash="no-importa-en-los-tests",
        fecha_aceptacion_politica=datetime.now(UTC),
        version_politica="1.0",
    )
    sesion.add(usuario)
    await sesion.flush()
    return usuario


@pytest.fixture
async def autor(sesion):
    return await guardar_usuario(sesion, "Autor", "autor@prueba.com")


@pytest.fixture
async def revisor(sesion):
    return await guardar_usuario(sesion, "Revisor", "revisor@prueba.com")


@pytest.fixture
async def especialidad(sesion):
    especialidad = Especialidad(nombre="Especialidad de prueba")
    sesion.add(especialidad)
    await sesion.flush()
    return especialidad
