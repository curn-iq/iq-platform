import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import jwt
import pytest
from alembic import command
from alembic.config import Config as AlembicConfig
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from httpx import ASGITransport, AsyncClient
from jwt.algorithms import OKPAlgorithm
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.adapters.outbound.security.tokens import JWKSVerifier
from app.config import config
from app.main import app

JWKS_URL = "https://dataiq.prueba/.well-known/jwks.json"


@pytest.fixture
def anyio_backend():
    return "asyncio"


# Los tests usan su propia base de datos en el mismo servidor, para no
# depender de lo que tenga la de desarrollo.
TEST_DATABASE_URL = make_url(config.database_url).set(database="simiq3d_test")


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
        async with AsyncSession(
            bind=connection_,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        ) as s:
            yield s
        await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def client():
    async with AsyncClient(
        # https: el cliente no manda por http las cookies Secure (la de sesión)
        transport=ASGITransport(app=app),
        base_url="https://prueba",
    ) as c:
        yield c


class FakeDataIQ:
    """Hace de DataIQ en las pruebas: firma tokens como él y publica su clave
    pública en el JWKS. Cuenta cuántas veces le piden las claves."""

    def __init__(self) -> None:
        self.keys: list[tuple[str, Ed25519PrivateKey]] = []
        self.jwks_requests = 0
        self.down = False
        self.add_key()

    def add_key(self) -> str:
        kid = f"clave-{len(self.keys) + 1}"
        self.keys.append((kid, Ed25519PrivateKey.generate()))
        return kid

    def jwks(self) -> dict:
        return {
            "keys": [
                OKPAlgorithm.to_jwk(key.public_key(), as_dict=True)
                | {"kid": kid, "alg": "EdDSA", "use": "sig"}
                for kid, key in self.keys
            ]
        }

    def token(self, kid: str | None = None, **claims) -> str:
        kid = kid or self.keys[-1][0]
        key = dict(self.keys)[kid]
        now = datetime.now(UTC)
        data = {
            "sub": str(uuid4()),
            "role": "user",
            "iss": "dataiq",
            "aud": "iq-platform",
            "iat": now,
            "exp": now + timedelta(hours=2),
        } | claims
        return jwt.encode(data, key, algorithm="EdDSA", headers={"kid": kid})

    def transport(self) -> httpx.MockTransport:
        def handle(request: httpx.Request) -> httpx.Response:
            self.jwks_requests += 1
            if self.down:
                return httpx.Response(503)
            return httpx.Response(200, json=self.jwks())

        return httpx.MockTransport(handle)


@pytest.fixture
def dataiq() -> FakeDataIQ:
    return FakeDataIQ()


@pytest.fixture
def verifier(dataiq) -> JWKSVerifier:
    return JWKSVerifier(JWKS_URL, "dataiq", "iq-platform", transport=dataiq.transport())
