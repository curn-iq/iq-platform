import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(
        # https: el cliente no manda por http las cookies Secure (la de sesión)
        transport=ASGITransport(app=app),
        base_url="https://prueba",
    ) as c:
        yield c
