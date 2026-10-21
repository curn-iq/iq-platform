import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.dependencies import CurrentCaller, get_verifier
from app.adapters.inbound.api.session import CSRF_HEADER, cookie_name
from app.main import app, cors_options

ACCOUNT_ID = "0199e0d4-7f2a-7cc1-9b5e-3f1d2a4b5c6d"
FRONTEND = "https://app.dominio.com"

# Una app mínima con una ruta que pide cuenta: así se prueba la sesión sin
# depender de las rutas del chat.
protected = FastAPI()


@protected.get("/privado")
@protected.post("/privado")
async def private_route(caller: CurrentCaller) -> dict[str, str]:
    return {"account_id": str(caller.account_id)}


@pytest.fixture
async def private_client(verifier):
    protected.dependency_overrides[get_verifier] = lambda: verifier
    async with AsyncClient(
        transport=ASGITransport(app=protected), base_url="https://prueba"
    ) as c:
        yield c
    protected.dependency_overrides.clear()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def cookie(token: str) -> dict[str, str]:
    return {"Cookie": f"{cookie_name()}={token}"}


@pytest.mark.anyio
async def test_without_a_session_it_asks_to_log_in(private_client):
    response_ = await private_client.get("/privado")

    assert response_.status_code == 401
    assert response_.headers["www-authenticate"] == "Bearer"


@pytest.mark.anyio
async def test_a_bearer_token_from_dataiq_opens_the_route(private_client, dataiq):
    response_ = await private_client.get(
        "/privado", headers=bearer(dataiq.token(sub=ACCOUNT_ID))
    )

    assert response_.status_code == 200
    assert response_.json() == {"account_id": ACCOUNT_ID}


@pytest.mark.anyio
async def test_an_invalid_token_is_401(private_client):
    response_ = await private_client.get("/privado", headers=bearer("no-sirve"))

    assert response_.status_code == 401


@pytest.mark.anyio
async def test_the_browser_cookie_opens_the_route(private_client, dataiq):
    response_ = await private_client.get("/privado", headers=cookie(dataiq.token()))

    assert response_.status_code == 200


@pytest.mark.anyio
async def test_writes_with_the_cookie_need_the_csrf_header(private_client, dataiq):
    token = dataiq.token()

    without = await private_client.post("/privado", headers=cookie(token))
    with_header = await private_client.post(
        "/privado", headers=cookie(token) | {CSRF_HEADER: "web"}
    )

    assert without.status_code == 403
    assert with_header.status_code == 200


@pytest.mark.anyio
async def test_writes_with_bearer_do_not_need_the_csrf_header(private_client, dataiq):
    # Otro sitio no puede poner el Authorization: el CSRF solo toca a la cookie.
    response_ = await private_client.post("/privado", headers=bearer(dataiq.token()))

    assert response_.status_code == 200


@pytest.mark.anyio
async def test_if_dataiq_does_not_answer_it_is_503(private_client, dataiq):
    dataiq.down = True

    response_ = await private_client.get("/privado", headers=bearer(dataiq.token()))

    assert response_.status_code == 503


@pytest.mark.anyio
async def test_without_origins_no_other_site_is_allowed(client):
    # Con el proxy todo es mismo origen: por defecto no se autoriza a nadie.
    response_ = await client.options(
        "/health",
        headers={"Origin": FRONTEND, "Access-Control-Request-Method": "POST"},
    )

    assert response_.status_code == 400
    assert "access-control-allow-origin" not in response_.headers


@pytest.mark.anyio
async def test_api_on_its_own_domain_lets_the_frontend_send_the_session():
    # Si algún día la API pasa a su propio subdominio, basta con CORS_ORIGINS.
    with_origin = CORSMiddleware(app, **cors_options([FRONTEND]))
    async with AsyncClient(
        transport=ASGITransport(app=with_origin), base_url="https://api.dominio.com"
    ) as c:
        allowed = await c.options(
            "/health",
            headers={
                "Origin": FRONTEND,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": CSRF_HEADER,
            },
        )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == FRONTEND
    assert allowed.headers["access-control-allow-credentials"] == "true"
