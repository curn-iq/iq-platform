import pytest
from httpx import ASGITransport, AsyncClient

from app.adapters.inbound.api.dependencies import (
    get_catalog_source,
    get_chat_engine,
    get_chat_log,
    get_chat_quota,
    get_session,
    get_verifier,
)
from app.adapters.inbound.api.session import CSRF_HEADER, cookie_name
from app.adapters.outbound.language.fake import TemplateChat
from app.adapters.outbound.persistence.models.chat import ChatLog
from app.adapters.outbound.persistence.models.mappings import ModelMapping
from app.adapters.outbound.persistence.repositories.chat_log import (
    SQLAlchemyChatLogRepository,
)
from app.domain.chat import ChatAction
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


class DownEngine:
    name = "caido"

    async def reply(self, *args):
        raise ModelUnavailable("Servidor PC2 apagado")


@pytest.fixture
def catalogs() -> FakeCatalogs:
    return FakeCatalogs()


@pytest.fixture
async def api(verifier, catalogs, session):
    app.dependency_overrides |= {
        get_verifier: lambda: verifier,
        get_catalog_source: lambda: catalogs,
        get_chat_engine: TemplateChat,
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
            "La Pinza Kelly va en el centro de la mesa de Mayo de Colecistectomía, "
            "junto a la Tijera de Mayo (n.º 10 del diagrama)."
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
    app.dependency_overrides[get_chat_engine] = DownEngine

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


class BrokenLog:
    async def add(self, entry):
        raise RuntimeError("la base no responde")


@pytest.mark.anyio
async def test_with_the_log_on_each_question_is_saved_without_who_asked(
    api, bearer, session
):
    app.dependency_overrides[get_chat_log] = lambda: SQLAlchemyChatLogRepository(
        session
    )

    await api.post(
        "/chat",
        json={
            "question": "¿Dónde va la Kelly?",
            "technique_id": str(COLECISTECTOMIA.id),
        },
        headers=bearer,
    )

    [entry] = await SQLAlchemyChatLogRepository(session).list_all()
    assert entry.question == "¿Dónde va la Kelly?"
    assert entry.open_technique_id == COLECISTECTOMIA.id
    assert entry.action == ChatAction.highlight_instrument
    assert (entry.technique_id, entry.instrument_id) == (COLECISTECTOMIA.id, KELLY.id)
    assert entry.language_model == "plantillas"
    assert entry.latency_ms >= 0
    # Nada de la cuenta: ni el id ni el token.
    assert set(ChatLog.__table__.columns.keys()) == {
        "id",
        "question",
        "open_technique_id",
        "action",
        "technique_id",
        "instrument_id",
        "field",
        "language_model",
        "latency_ms",
        "created_at",
    }


@pytest.mark.anyio
async def test_with_the_log_off_nothing_is_saved(api, bearer, session):
    await api.post("/chat", json={"question": "Hola"}, headers=bearer)

    assert await SQLAlchemyChatLogRepository(session).list_all() == []


@pytest.mark.anyio
async def test_if_the_log_fails_the_student_still_gets_the_answer(api, bearer):
    app.dependency_overrides[get_chat_log] = BrokenLog

    response_ = await api.post("/chat", json={"question": "Hola"}, headers=bearer)

    assert response_.status_code == 200


@pytest.mark.anyio
async def test_a_misspelled_name_gets_a_did_you_mean(api, bearer):
    app.dependency_overrides[get_chat_engine] = DownEngine  # no se llega al motor

    response_ = await api.post(
        "/chat",
        json={"question": "¿Dónde va la kely en la masectomia?"},
        headers=bearer,
    )

    assert response_.status_code == 200
    assert response_.json()["action"] == "clarify"
    assert response_.json()["reply"] == (
        "¿Quizás quisiste decir «¿Dónde va la Kelly en la Mastectomía?»?"
    )
    assert response_.json()["options"] == ["¿Dónde va la Kelly en la Mastectomía?"]


class FullQuota:
    async def take(self, account_id):
        return False


@pytest.mark.anyio
async def test_over_the_limit_the_chat_asks_to_wait(api, bearer):
    app.dependency_overrides[get_chat_quota] = FullQuota

    response_ = await api.post("/chat", json={"question": "Hola"}, headers=bearer)

    assert response_.status_code == 429
    assert "Espera unos minutos" in response_.json()["detail"]


@pytest.mark.anyio
async def test_the_spelling_suggestion_does_not_use_the_quota(api, bearer):
    app.dependency_overrides[get_chat_quota] = FullQuota

    response_ = await api.post(
        "/chat", json={"question": "¿Dónde va la kely?"}, headers=bearer
    )

    assert response_.status_code == 200
    assert response_.json()["action"] == "clarify"
