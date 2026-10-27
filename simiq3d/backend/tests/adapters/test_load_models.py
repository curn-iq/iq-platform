import httpx
import pytest
from sqlalchemy import select

from app.adapters.inbound.cli.load_models import (
    MappingError,
    fetch_instruments,
    get_token,
    read_rows,
    resolve,
)
from app.adapters.outbound.persistence.models.mappings import ModelMapping
from app.adapters.outbound.persistence.repositories.mappings import (
    SQLAlchemyModelMappingRepository,
)
from app.domain.models3d import ModelFile
from tests.sample import FARABEUF, KELLY

INSTRUMENTS = [
    {"id": str(KELLY.id), "name": "Pinza Kelly", "aliases": ["Pinzas Kelly"]},
    {"id": str(FARABEUF.id), "name": "Separador de Farabeuf", "aliases": []},
]


def test_rows_come_from_the_instrument_and_file_columns(tmp_path):
    path = tmp_path / "modelos.csv"
    path.write_text(
        "instrumento,archivo,largo_total_mm,fuente\n"
        "Pinza Kelly,kelly_forceps.glb,140,https://catalogo\n\n",
        encoding="utf-8",
    )

    assert read_rows(path) == [("Pinza Kelly", "kelly_forceps.glb")]


def test_a_file_without_the_columns_is_rejected(tmp_path):
    path = tmp_path / "modelos.csv"
    path.write_text("nombre,glb\nPinza Kelly,kelly.glb\n", encoding="utf-8")

    with pytest.raises(MappingError, match="instrumento"):
        read_rows(path)


def test_names_and_aliases_become_the_ids_of_this_dataiq():
    files = resolve(
        [
            ("pinzas kelly", "kelly_forceps.glb"),
            ("Separador de Farabeuf", "farabeuf.glb"),
        ],
        INSTRUMENTS,
    )

    assert files == [
        ModelFile(str(KELLY.id), "kelly_forceps.glb"),
        ModelFile(str(FARABEUF.id), "farabeuf.glb"),
    ]


def test_every_unknown_name_is_reported():
    with pytest.raises(MappingError, match="Pinza Kocher; Tijera láser"):
        resolve([("Pinza Kocher", "a.glb"), ("Tijera láser", "b.glb")], INSTRUMENTS)


def test_an_instrument_cannot_have_two_models():
    with pytest.raises(MappingError, match="más de un modelo"):
        resolve([("Pinza Kelly", "a.glb"), ("Pinzas Kelly", "b.glb")], INSTRUMENTS)


@pytest.mark.anyio
async def test_the_instruments_are_read_from_dataiq_with_a_token():
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/auth/token":
            return httpx.Response(
                200, json={"access_token": "tok", "token_type": "bearer"}
            )
        return httpx.Response(200, json=INSTRUMENTS)

    transport = httpx.MockTransport(handle)
    token = await get_token(
        "https://dataiq.prueba", "ana@prueba.com", "clave", transport
    )
    instruments = await fetch_instruments("https://dataiq.prueba", token, transport)

    assert b"username=ana%40prueba.com" in requests[0].content
    assert requests[1].headers["authorization"] == "Bearer tok"
    assert instruments == INSTRUMENTS


@pytest.mark.anyio
async def test_the_table_ends_equal_to_the_file(session):
    repository = SQLAlchemyModelMappingRepository(session)
    await repository.replace_all(
        [ModelFile(KELLY.id, "vieja.glb"), ModelFile(FARABEUF.id, "f.glb")]
    )

    await repository.replace_all([ModelFile(KELLY.id, "kelly_forceps.glb")])

    rows = (await session.scalars(select(ModelMapping))).all()
    assert [(r.instrument_id, r.model_file) for r in rows] == [
        (KELLY.id, "kelly_forceps.glb")
    ]
