import pytest
from httpx import ASGITransport, AsyncClient

from app.adapters.inbound.api.dependencies import (
    get_catalog_source,
    get_language_model,
    get_session,
    get_verifier,
)
from app.adapters.inbound.api.session import CSRF_HEADER, cookie_name
from app.adapters.outbound.language.fake import FakeModel
from app.adapters.outbound.persistence.models.mappings import ModelMapping
from app.main import app
from app.ports.catalog import CatalogDenied, CatalogUnavailable
from app.ports.chat import ModelUnavailable
from tests.sample import CATALOG, COLECISTECTOMIA, KELLY, MASTECTOMIA


class FakeCatalogs:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.tokens: list[str] = []

    async def get(self, token: str):
        self.tokens.append(token)
        if self.error:
            raise self.error
        return CATALOG


class DownModel:
    name = "caido"

    async def choose(self, *args):
        raise ModelUnavailable("Servidor PC2 apagado")


@pytest.fixture
def catalogs() -> FakeCatalogs:
    return FakeCatalogs()


@pytest.fixture
async def api(verifier, catalogs, session):
    app.dependency_overrides |= {
        get_verifier: lambda: verifier,
        get_catalog_source: lambda: catalogs,
        get_language_model: FakeModel,
        get_session: lambda: session,
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="https://prueba"
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def bearer(dataiq) -> dict[str, str]:
    return {"Authorization": f"Bearer {dataiq.token()}"}


@pytest.mark.anyio
async def test_the_chat_answers_with_the_action_and_dataiq_text(api, bearer, catalogs):
    response_ = await api.post(
        "/chat",
        json={
            "question": "¿Dónde va la Kelly?",
            "technique_id": str(COLECISTECTOMIA.id),
        },
        headers=bearer,
    )

    assert response_.status_code == 200
    assert response_.json() == {
        "action": "highlight_instrument",
        "technique_id": str(COLECISTECTOMIA.id),
        "instrument_id": str(KELLY.id),
        "field": None,
        "reply": (
            "La Pinza Kelly es el número 10 de la mesa de Mayo de "
            "Colecistectomía: fila 3, columna 4."
        ),
        "options": ["¿Qué es la Pinza Kelly?"],
    }
    # El catálogo se pide a DataIQ con el token de quien pregunta.
    assert catalogs.tokens == [bearer["Authorization"].removeprefix("Bearer ")]


@pytest.mark.anyio
async def test_the_open_technique_gives_context(api, bearer):
    response_ = await api.post(
        "/chat",
        json={"question": "Indicaciones", "technique_id": str(MASTECTOMIA.id)},
        headers=bearer,
    )

    assert response_.json()["action"] == "show_clinical_data"
    assert response_.json()["technique_id"] == str(MASTECTOMIA.id)


@pytest.mark.anyio
async def test_the_chat_asks_for_an_account(api):
    response_ = await api.post("/chat", json={"question": "Hola"})

    assert response_.status_code == 401


@pytest.mark.anyio
async def test_with_the_cookie_the_chat_needs_the_csrf_header(api, dataiq):
    cookie = {"Cookie": f"{cookie_name()}={dataiq.token()}"}

    without = await api.post("/chat", json={"question": "Hola"}, headers=cookie)
    with_header = await api.post(
        "/chat", json={"question": "Hola"}, headers=cookie | {CSRF_HEADER: "web"}
    )

    assert without.status_code == 403
    assert with_header.status_code == 200


@pytest.mark.anyio
@pytest.mark.parametrize("question", ["", "   ", "x" * 501])
async def test_empty_or_huge_questions_are_rejected(api, bearer, question):
    response_ = await api.post("/chat", json={"question": question}, headers=bearer)

    assert response_.status_code == 422


@pytest.mark.anyio
async def test_without_pc2_the_chat_is_unavailable(api, bearer):
    app.dependency_overrides[get_language_model] = DownModel

    response_ = await api.post("/chat", json={"question": "Hola"}, headers=bearer)

    assert response_.status_code == 503
    assert response_.json()["detail"] == "El chat no está disponible"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("error", "code"), [(CatalogUnavailable("caído"), 503), (CatalogDenied("401"), 401)]
)
async def test_dataiq_errors_reach_the_frontend(api, bearer, catalogs, error, code):
    catalogs.error = error

    response_ = await api.post("/chat", json={"question": "Hola"}, headers=bearer)

    assert response_.status_code == code


@pytest.mark.anyio
async def test_models_list_each_instrument_with_its_glb_and_cache(api, bearer, session):
    session.add(ModelMapping(instrument_id=KELLY.id, model_file="kelly_forceps.glb"))
    await session.flush()

    first = await api.get("/models", headers=bearer)
    again = await api.get(
        "/models", headers=bearer | {"If-None-Match": first.headers["etag"]}
    )

    assert first.status_code == 200
    assert first.json() == [
        {"instrument_id": str(KELLY.id), "model_file": "kelly_forceps.glb"}
    ]
    assert first.headers["cache-control"] == "private, max-age=300"
    assert again.status_code == 304


@pytest.mark.anyio
async def test_models_ask_for_an_account(api):
    assert (await api.get("/models")).status_code == 401
