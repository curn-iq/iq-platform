import pytest
from sqlalchemy import update

from app.adapters.inbound.api.session import CSRF_HEADER, cookie_name
from app.adapters.outbound.persistence.models.users import User
from app.domain.users import Role

ANA = {"email": "ana@prueba.com", "password": "una-contraseña-larga"}
WEB = {CSRF_HEADER: "web"}


async def register(client) -> None:
    await client.post(
        "/auth/register", json=ANA | {"name": "Ana", "accepts_policy": True}
    )


async def login(client):
    return await client.post("/auth/login", json=ANA, headers=WEB)


@pytest.mark.anyio
async def test_login_leaves_an_httponly_cookie_and_no_token(client):
    await register(client)

    response_ = await login(client)

    assert response_.status_code == 200
    assert response_.json()["email"] == "ana@prueba.com"
    assert "access_token" not in response_.json()
    cookie = response_.headers["set-cookie"]
    assert cookie.startswith(f"{cookie_name()}=")
    for attribute in ("HttpOnly", "Path=/", "SameSite=strict", "Max-Age=7200"):
        assert attribute in cookie
    assert "Domain" not in cookie


@pytest.mark.anyio
async def test_login_needs_the_csrf_header_and_right_credentials(client):
    await register(client)

    without_header = await client.post("/auth/login", json=ANA)
    wrong = await client.post(
        "/auth/login", json=ANA | {"password": "otra-contraseña"}, headers=WEB
    )

    assert without_header.status_code == 403
    assert wrong.status_code == 401
    assert "set-cookie" not in wrong.headers


@pytest.mark.anyio
async def test_the_cookie_identifies_the_account(client):
    await register(client)
    await login(client)

    response_ = await client.get("/auth/me")

    assert response_.status_code == 200
    assert response_.json()["name"] == "Ana"


@pytest.mark.anyio
async def test_writing_with_the_cookie_needs_the_csrf_header(
    client, session, specialty
):
    await register(client)
    await session.execute(
        update(User).where(User.email == ANA["email"]).values(role=Role.contributor)
    )
    await login(client)
    technique = {"name": "Técnica nueva", "specialty_id": str(specialty.id)}

    forged = await client.post("/techniques", json=technique)
    from_the_app = await client.post("/techniques", json=technique, headers=WEB)

    assert forged.status_code == 403
    assert CSRF_HEADER in forged.json()["detail"]
    assert from_the_app.status_code == 201


@pytest.mark.anyio
async def test_logout_clears_the_cookie(client):
    await register(client)
    await login(client)

    response_ = await client.post("/auth/logout", headers=WEB)

    assert response_.status_code == 204
    assert "Max-Age=0" in response_.headers["set-cookie"]
    assert (await client.get("/auth/me")).status_code == 401


@pytest.mark.anyio
async def test_an_expired_cookie_is_like_having_no_session(client):
    client.cookies.set(cookie_name(), "no.es.token")

    public = await client.get("/techniques")
    private = await client.get("/auth/me")

    assert public.status_code == 200
    assert private.status_code == 401
