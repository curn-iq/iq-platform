import pytest

from app.config import config


@pytest.mark.anyio
async def test_health_says_ok_and_where_the_source_code_is(client):
    response_ = await client.get("/health")

    assert response_.status_code == 200
    assert response_.json() == {"status": "ok", "source": config.source_url}
