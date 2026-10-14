import asyncio
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config as AlembicConfig
from httpx import ASGITransport, AsyncClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.adapters.inbound.api.dependencies import get_issuer, get_session
from app.adapters.outbound.persistence.models.catalog import (
    Instrument,
    InstrumentCategory,
)
from app.adapters.outbound.persistence.models.techniques import Specialty, Zone
from app.adapters.outbound.persistence.models.users import User
from app.config import config
from app.domain.users import Account, Role
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


# Los tests usan su propia base de datos en el mismo servidor, para no
# depender de lo que tenga la de desarrollo (por ejemplo, la carga inicial).
TEST_DATABASE_URL = make_url(config.database_url).set(database="dataiq_test")


async def create_test_database() -> None:
    server = TEST_DATABASE_URL.set(database="postgres")
    engine = create_async_engine(server, isolation_level="AUTOCOMMIT")
    async with engine.connect() as connection_:
        exists = await connection_.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DATABASE_URL.database},
        )
        if not exists:
            await connection_.execute(
                text(f'CREATE DATABASE "{TEST_DATABASE_URL.database}"')
            )
    await engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def test_database():
    asyncio.run(create_test_database())
    alembic = AlembicConfig(Path(__file__).parent.parent / "alembic.ini")
    alembic.attributes["database_url"] = TEST_DATABASE_URL.render_as_string(
        hide_password=False
    )
    command.upgrade(alembic, "head")


@pytest.fixture
async def session():
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.connect() as connection_:
        transaction = await connection_.begin()
        # expire_on_commit=False: la API hace commit y el test sigue usando
        # los objetos que guardó (en la app, SesionLocal hace lo mismo).
        async with AsyncSession(
            bind=connection_,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        ) as s:
            yield s
        await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def client(session):
    # La API usa la misma sesión del test, así ve lo que el test guardó y todo
    # se deshace al final.
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(
        # https: el cliente no manda por http las cookies Secure (la de sesión)
        transport=ASGITransport(app=app),
        base_url="https://prueba",
    ) as c:
        yield c
    app.dependency_overrides.clear()


async def save_user(session, name: str, email: str, role: Role = Role.user) -> User:
    user = User(
        name=name,
        email=email,
        role=role,
        password_hash="no-importa-en-los-tests",
        policy_accepted_at=datetime.now(UTC),
        policy_version="1.0",
    )
    session.add(user)
    await session.flush()
    return user


@pytest.fixture
async def author(session):
    return await save_user(session, "Autor", "autor@prueba.com")


def auth_headers(user: User) -> dict[str, str]:
    """Cabecera Authorization con un JWT de la cuenta, sin pasar por el login."""
    account = Account(id=user.id, name=user.name, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {get_issuer().issue_token(account)}"}


@pytest.fixture
async def user(session):
    return await save_user(session, "Usuaria", "usuaria@prueba.com")


@pytest.fixture
async def contributor(session):
    return await save_user(
        session, "Colaboradora", "colaboradora@prueba.com", Role.contributor
    )


@pytest.fixture
async def reviewer(session):
    return await save_user(session, "Revisor", "revisor@prueba.com", Role.reviewer)


@pytest.fixture
async def other_reviewer(session):
    return await save_user(
        session, "Otra revisora", "otra.revisora@prueba.com", Role.reviewer
    )


@pytest.fixture
async def admin(session):
    return await save_user(session, "Admin", "admin@prueba.com", Role.admin)


@pytest.fixture
async def specialty(session):
    specialty = Specialty(name="Especialidad de prueba")
    session.add(specialty)
    await session.flush()
    return specialty


@pytest.fixture
async def zone(session):
    zone = Zone(name="Mesa de prueba")
    session.add(zone)
    await session.flush()
    return zone


@pytest.fixture
async def instrument(session):
    category = InstrumentCategory(name="Categoría de prueba")
    session.add(category)
    await session.flush()
    instrument = Instrument(name="Pinza de prueba", category_id=category.id)
    session.add(instrument)
    await session.flush()
    return instrument
