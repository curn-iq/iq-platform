import jwt
import pytest

from tests.conftest import auth_headers

REGISTRATION = {
    "name": "Ana",
    "email": "Ana@Prueba.com",
    "password": "una-contraseña-larga",
    "accepts_policy": True,
}


async def register_and_get_token(client) -> str:
    await client.post("/auth/register", json=REGISTRATION)
    response_ = await client.post(
        "/auth/token",
        data={"username": "ana@prueba.com", "password": REGISTRATION["password"]},
    )
    return response_.json()["access_token"]


@pytest.mark.anyio
async def test_register_creates_account_with_user_role(client):
    response_ = await client.post("/auth/register", json=REGISTRATION)

    assert response_.status_code == 201
    body = response_.json()
    assert body["email"] == "ana@prueba.com"
    assert body["role"] == "user"
    assert "password" not in body


@pytest.mark.anyio
async def test_register_rejects_duplicate_email(client):
    await client.post("/auth/register", json=REGISTRATION)

    response_ = await client.post(
        "/auth/register", json=REGISTRATION | {"email": "ANA@prueba.com"}
    )

    assert response_.status_code == 409


@pytest.mark.anyio
@pytest.mark.parametrize(
    "change",
    [{"accepts_policy": False}, {"password": "corta"}, {"email": "no-es-correo"}],
)
async def test_register_validates_policy_password_and_email(client, change):
    response_ = await client.post("/auth/register", json=REGISTRATION | change)

    assert response_.status_code == 422


@pytest.mark.anyio
async def test_token_endpoint_returns_a_working_token(client):
    token = await register_and_get_token(client)

    response_ = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response_.status_code == 200
    assert response_.json()["name"] == "Ana"
    assert response_.headers["cache-control"] == "private, max-age=0"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "credentials",
    [
        {"username": "ana@prueba.com", "password": "otra-contraseña"},
        {"username": "nadie@prueba.com", "password": "una-contraseña-larga"},
    ],
)
async def test_token_fails_with_wrong_credentials(client, credentials):
    await client.post("/auth/register", json=REGISTRATION)

    response_ = await client.post("/auth/token", data=credentials)

    assert response_.status_code == 401
    assert response_.json()["detail"] == "Correo o contraseña incorrectos"


@pytest.mark.anyio
async def test_missing_or_fake_token_returns_401(client):
    assert (await client.get("/auth/me")).status_code == 401
    fake = {"Authorization": "Bearer no.es.token"}
    assert (await client.get("/auth/me", headers=fake)).status_code == 401


@pytest.mark.anyio
async def test_other_module_validates_token_with_public_key_only(client, contributor):
    token = auth_headers(contributor)["Authorization"].removeprefix("Bearer ")

    jwks = (await client.get("/.well-known/jwks.json")).json()
    key_ = jwt.PyJWKSet.from_dict(jwks).keys[0]
    data = jwt.decode(token, key_.key, algorithms=["EdDSA"], audience="iq-platform")

    assert jwks["keys"][0]["kty"] == "OKP"
    assert "d" not in jwks["keys"][0]  # la parte privada nunca se publica
    assert data["sub"] == str(contributor.id)
    assert data["role"] == "contributor"
