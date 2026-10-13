import pytest

FRONTEND = "http://localhost:4200"


@pytest.mark.anyio
async def test_preflight_from_the_frontend_is_allowed(client):
    response_ = await client.options(
        "/versions",
        headers={
            "Origin": FRONTEND,
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )

    assert response_.status_code == 200
    assert response_.headers["access-control-allow-origin"] == FRONTEND
    assert "PUT" in response_.headers["access-control-allow-methods"]
    assert "access-control-allow-credentials" not in response_.headers


@pytest.mark.anyio
async def test_response_lets_the_frontend_read_the_etag(client):
    response_ = await client.get("/techniques", headers={"Origin": FRONTEND})

    assert response_.headers["access-control-allow-origin"] == FRONTEND
    assert response_.headers["access-control-expose-headers"] == "ETag"


@pytest.mark.anyio
async def test_other_origins_are_not_allowed(client):
    preflight = await client.options(
        "/versions",
        headers={
            "Origin": "https://otro-sitio.com",
            "Access-Control-Request-Method": "PUT",
        },
    )
    simple = await client.get(
        "/techniques", headers={"Origin": "https://otro-sitio.com"}
    )

    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers
    assert "access-control-allow-origin" not in simple.headers
