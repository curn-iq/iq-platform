import pytest


@pytest.mark.anyio
async def test_health_answers_without_cache(client):
    response_ = await client.get("/health")

    assert response_.status_code == 200
    assert response_.json() == {"status": "ok"}
    assert response_.headers["cache-control"] == "no-store"
