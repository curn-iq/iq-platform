import asyncio
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config as ConfigAlembic
from httpx import ASGITransport, AsyncClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.adaptadores.entrada.api.dependencias import obtener_emisor, obtener_sesion
from app.adaptadores.salida.persistencia.modelos.catalogo import (
    CategoriaInstrumental,
    Instrumental,
)
from app.adaptadores.salida.persistencia.modelos.tecnicas import Especialidad, Zona
from app.adaptadores.salida.persistencia.modelos.usuarios import Usuario
from app.config import config
from app.dominio.usuarios import Cuenta, RolUsuario
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


# Los tests usan su propia base de datos en el mismo servidor, para no
# depender de lo que tenga la de desarrollo (por ejemplo, la carga inicial).
URL_BASE_DATOS_TESTS = make_url(config.url_base_datos).set(database="dataiq_test")


async def crear_base_datos_tests() -> None:
    servidor = URL_BASE_DATOS_TESTS.set(database="postgres")
    motor = create_async_engine(servidor, isolation_level="AUTOCOMMIT")
    async with motor.connect() as conexion:
        existe = await conexion.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :nombre"),
            {"nombre": URL_BASE_DATOS_TESTS.database},
        )
        if not existe:
            await conexion.execute(
                text(f'CREATE DATABASE "{URL_BASE_DATOS_TESTS.database}"')
            )
    await motor.dispose()


@pytest.fixture(scope="session", autouse=True)
def base_datos_tests():
    asyncio.run(crear_base_datos_tests())
    alembic = ConfigAlembic(Path(__file__).parent.parent / "alembic.ini")
    alembic.attributes["url_base_datos"] = URL_BASE_DATOS_TESTS.render_as_string(
        hide_password=False
    )
    command.upgrade(alembic, "head")


@pytest.fixture
async def sesion():
    motor = create_async_engine(URL_BASE_DATOS_TESTS, poolclass=NullPool)
    async with motor.connect() as conexion:
        transaccion = await conexion.begin()
        # expire_on_commit=False: la API hace commit y el test sigue usando
        # los objetos que guardó (en la app, SesionLocal hace lo mismo).
        async with AsyncSession(
            bind=conexion,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        ) as s:
            yield s
        await transaccion.rollback()
    await motor.dispose()


@pytest.fixture
async def cliente(sesion):
    # La API usa la misma sesión del test, así ve lo que el test guardó y todo
    # se deshace al final.
    app.dependency_overrides[obtener_sesion] = lambda: sesion
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://prueba"
    ) as c:
        yield c
    app.dependency_overrides.clear()


async def guardar_usuario(
    sesion, nombre: str, email: str, rol: RolUsuario = RolUsuario.usuario
) -> Usuario:
    usuario = Usuario(
        nombre=nombre,
        email=email,
        rol=rol,
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


def cabeceras(usuario: Usuario) -> dict[str, str]:
    """Cabecera Authorization con un JWT de la cuenta, sin pasar por el login."""
    cuenta = Cuenta(
        id=usuario.id, nombre=usuario.nombre, email=usuario.email, rol=usuario.rol
    )
    return {"Authorization": f"Bearer {obtener_emisor().emitir(cuenta)}"}


@pytest.fixture
async def usuario(sesion):
    return await guardar_usuario(sesion, "Usuaria", "usuaria@prueba.com")


@pytest.fixture
async def colaborador(sesion):
    return await guardar_usuario(
        sesion, "Colaboradora", "colaboradora@prueba.com", RolUsuario.colaborador
    )


@pytest.fixture
async def revisor(sesion):
    return await guardar_usuario(
        sesion, "Revisor", "revisor@prueba.com", RolUsuario.revisor
    )


@pytest.fixture
async def otro_revisor(sesion):
    return await guardar_usuario(
        sesion, "Otra revisora", "otra.revisora@prueba.com", RolUsuario.revisor
    )


@pytest.fixture
async def admin(sesion):
    return await guardar_usuario(sesion, "Admin", "admin@prueba.com", RolUsuario.admin)


@pytest.fixture
async def especialidad(sesion):
    especialidad = Especialidad(nombre="Especialidad de prueba")
    sesion.add(especialidad)
    await sesion.flush()
    return especialidad


@pytest.fixture
async def zona(sesion):
    zona = Zona(nombre="Mesa de prueba")
    sesion.add(zona)
    await sesion.flush()
    return zona


@pytest.fixture
async def instrumento(sesion):
    categoria = CategoriaInstrumental(nombre="Categoría de prueba")
    sesion.add(categoria)
    await sesion.flush()
    instrumento = Instrumental(nombre="Pinza de prueba", categoria_id=categoria.id)
    sesion.add(instrumento)
    await sesion.flush()
    return instrumento
