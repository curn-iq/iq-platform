import jwt
import pytest

from app.adapters.inbound.api.session import CSRF_HEADER, cookie_name
from app.config import config
from tests.conftest import auth_headers

ANA = {"email": "ana@prueba.com", "password": "una-contraseña-larga"}
WEB = {CSRF_HEADER: "web"}


async def login(client) -> None:
    await client.post(
        "/auth/register", json=ANA | {"name": "Ana", "accepts_policy": True}
    )
    await client.post("/auth/login", json=ANA, headers=WEB)


@pytest.mark.anyio
async def test_the_session_cookie_gets_a_short_token_that_works_as_bearer(client):
    await login(client)

    response_ = await client.post("/auth/module-token", headers=WEB)

    assert response_.status_code == 200
    body = response_.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == config.module_token_minutes * 60
    claims = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert claims["exp"] - claims["iat"] == body["expires_in"]
    # Es un JWT de DataIQ como cualquier otro: el módulo lo reenvía para pedir
    # datos y DataIQ lo acepta.
    client.cookies.clear()
    me = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == ANA["email"]


@pytest.mark.anyio
async def test_it_needs_the_csrf_header(client):
    await login(client)

    response_ = await client.post("/auth/module-token")

    assert response_.status_code == 403


@pytest.mark.anyio
async def test_without_a_session_it_responds_401(client):
    response_ = await client.post("/auth/module-token", headers=WEB)

    assert response_.status_code == 401


@pytest.mark.anyio
async def test_a_bearer_token_alone_cannot_renew_itself(client, user):
    response_ = await client.post(
        "/auth/module-token", headers=WEB | auth_headers(user)
    )

    assert response_.status_code == 401


@pytest.mark.anyio
async def test_a_bearer_token_with_a_garbage_cookie_cannot_renew_itself(client, user):
    client.cookies.set(cookie_name(), "basura")

    response_ = await client.post(
        "/auth/module-token", headers=WEB | auth_headers(user)
    )

    assert response_.status_code == 401


@pytest.mark.anyio
async def test_the_identity_comes_from_the_cookie_not_from_the_bearer_token(
    client, user
):
    await login(client)

    response_ = await client.post(
        "/auth/module-token", headers=WEB | auth_headers(user)
    )

    assert response_.status_code == 200
    token = response_.json()["access_token"]
    client.cookies.clear()
    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == ANA["email"]
