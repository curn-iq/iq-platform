import pytest
from httpx import ASGITransport, AsyncClient
from starlette.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.session import CSRF_HEADER
from app.main import app, cors_options

FRONTEND = "https://app.dominio.com"


@pytest.mark.anyio
async def test_without_origins_no_other_site_is_allowed(client):
    # Con el proxy todo es mismo origen: por defecto no se autoriza a nadie.
    response_ = await client.options(
        "/versions",
        headers={"Origin": FRONTEND, "Access-Control-Request-Method": "PUT"},
    )

    assert response_.status_code == 400
    assert "access-control-allow-origin" not in response_.headers


@pytest.mark.anyio
async def test_api_on_its_own_domain_lets_the_frontend_send_the_session():
    # Si algún día la API pasa a su propio subdominio, basta con CORS_ORIGINS.
    with_origin = CORSMiddleware(app, **cors_options([FRONTEND]))
    async with AsyncClient(
        transport=ASGITransport(app=with_origin), base_url="https://api.dominio.com"
    ) as client:
        allowed = await client.options(
            "/versions",
            headers={
                "Origin": FRONTEND,
                "Access-Control-Request-Method": "DELETE",
                "Access-Control-Request-Headers": f"content-type, {CSRF_HEADER}",
            },
        )
        other = await client.options(
            "/versions",
            headers={
                "Origin": "https://otro-sitio.com",
                "Access-Control-Request-Method": "DELETE",
            },
        )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == FRONTEND
    assert allowed.headers["access-control-allow-credentials"] == "true"
    assert other.status_code == 400
