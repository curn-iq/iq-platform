import json
from uuid import uuid4

import httpx
import pytest

from app.adapters.outbound.dataiq.catalog import DataIQCatalogSource
from app.ports.catalog import CatalogDenied, CatalogUnavailable

KELLY, MANGO, HOJA = (str(uuid4()) for _ in range(3))
TECHNIQUE = str(uuid4())


def payload() -> dict:
    mayo = {"zone": "Mesa de Mayo", "used": True, "rows": 4, "columns": 5}
    return {
        "instruments": [
            {"id": KELLY, "name": "Pinza Kelly", "aliases": [], "description": "x"},
            {"id": MANGO, "name": "Mango de bisturí N.° 4", "aliases": ["Mango 4"]},
            {"id": HOJA, "name": "Hoja de bisturí #20", "aliases": []},
        ],
        "techniques": [
            {
                "id": TECHNIQUE,
                "name": "Colecistectomía",
                "specialty": "Cirugía General",
                "zones": [
                    mayo,
                    {"zone": "Mesa de reserva", "used": True, "rows": 3, "columns": 3},
                ],
                "items": [
                    {
                        "zone": "Mesa de Mayo",
                        "legend_number": 1,
                        "source_text": "Mango 4 con hoja 20",
                        "components": [
                            {"instrument_id": MANGO, "name": "Mango de bisturí N.° 4"},
                            {"instrument_id": HOJA, "name": "Hoja de bisturí #20"},
                        ],
                        "cells": [{"row": 4, "column": 3}],
                    },
                    {
                        "zone": "Mesa de Mayo",
                        "legend_number": 2,
                        "source_text": "Kelly",
                        "components": [{"instrument_id": KELLY, "name": "Pinza Kelly"}],
                        "cells": [{"row": 1, "column": 1}, {"row": 1, "column": 2}],
                    },
                    # Otra mesa: SIVRI solo valida la de Mayo.
                    {
                        "zone": "Mesa de reserva",
                        "legend_number": 3,
                        "source_text": "Kelly",
                        "components": [{"instrument_id": KELLY, "name": "Pinza Kelly"}],
                        "cells": [{"row": 1, "column": 1}],
                    },
                    # Solo en el listado: sin mesa.
                    {
                        "zone": None,
                        "legend_number": None,
                        "source_text": "Suturas",
                        "components": [],
                        "cells": [],
                    },
                ],
            },
            {
                "id": str(uuid4()),
                "name": "Cesárea",
                "specialty": "Ginecología y obstetricia",
                "zones": [mayo],
                "items": [],
            },
            {
                "id": str(uuid4()),
                "name": "Sin mesa de Mayo",
                "specialty": "Cirugía General",
                "zones": [dict(mayo, used=False)],
                "items": [],
            },
        ],
    }


class FakeDataIQ:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.status = 200
        self.etag = '"v1"'
        self.denied: set[str] = set()

    def transport(self) -> httpx.MockTransport:
        def handle(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            if request.headers["authorization"].removeprefix("Bearer ") in self.denied:
                return httpx.Response(401)
            if self.status != 200:
                return httpx.Response(self.status)
            if request.headers.get("if-none-match") == self.etag:
                return httpx.Response(304)
            return httpx.Response(
                200, content=json.dumps(payload()), headers={"etag": self.etag}
            )

        return httpx.MockTransport(handle)


@pytest.fixture
def server() -> FakeDataIQ:
    return FakeDataIQ()


def source(server, **options) -> DataIQCatalogSource:
    return DataIQCatalogSource("http://dataiq", transport=server.transport(), **options)


@pytest.mark.anyio
async def test_only_the_mayo_table_of_the_scope_techniques_is_kept(server):
    catalog = await source(server).get("tok")

    assert [t.name for t in catalog.techniques] == ["Colecistectomía"]
    technique = catalog.techniques[0]
    assert (technique.rows, technique.columns) == (4, 5)
    assert [i.legend_number for i in technique.items] == [1, 2]
    # Un objeto compuesto se nombra con «y» y trae sus dos instrumentos.
    assert technique.items[0].name == "Mango de bisturí N.° 4 y Hoja de bisturí #20"
    assert [str(i) for i in technique.items[0].instrument_ids] == [MANGO, HOJA]
    assert [(c.row, c.column) for c in technique.items[1].cells] == [(1, 1), (1, 2)]
    assert catalog.technique(technique.id) is technique
    assert {i.name for i in catalog.instruments} >= {"Pinza Kelly"}


@pytest.mark.anyio
async def test_it_asks_with_the_token_of_whoever_uses_sivri(server):
    await source(server).get("el-token-de-ana")

    assert server.requests[0].headers["authorization"] == "Bearer el-token-de-ana"
    assert str(server.requests[0].url) == "http://dataiq/catalog/full"


@pytest.mark.anyio
async def test_the_copy_is_shared_and_asked_again_with_the_etag(server):
    catalogs = source(server, max_age=0)

    first = await catalogs.get("a")
    second = await catalogs.get("b")

    assert second is first
    assert len(server.requests) == 2
    assert server.requests[1].headers["if-none-match"] == '"v1"'


@pytest.mark.anyio
async def test_within_the_max_age_it_does_not_ask_again(server):
    catalogs = source(server)

    await catalogs.get("a")
    await catalogs.get("a")

    assert len(server.requests) == 1


@pytest.mark.anyio
@pytest.mark.parametrize("status", [401, 403])
async def test_a_rejected_token_is_denied(server, status):
    server.status = status

    with pytest.raises(CatalogDenied):
        await source(server).get("tok")


@pytest.mark.anyio
async def test_without_dataiq_and_without_a_copy_it_is_unavailable(server):
    server.status = 503

    with pytest.raises(CatalogUnavailable):
        await source(server).get("tok")


@pytest.mark.anyio
async def test_with_a_copy_it_keeps_answering_while_dataiq_is_down(server):
    catalogs = source(server, max_age=0)
    first = await catalogs.get("a")
    server.status = 503

    assert await catalogs.get("a") is first


@pytest.mark.anyio
async def test_a_new_token_is_checked_with_dataiq_even_with_a_fresh_copy(server):
    catalogs = source(server)

    first = await catalogs.get("token-de-ana")
    second = await catalogs.get("token-de-luis")

    # La copia se comparte (no se vuelve a bajar), pero DataIQ ve el token nuevo.
    assert second is first
    assert len(server.requests) == 2
    assert server.requests[1].headers["authorization"] == "Bearer token-de-luis"
    assert server.requests[1].headers["if-none-match"] == '"v1"'


@pytest.mark.anyio
async def test_a_verified_token_is_not_asked_again_within_the_verify_ttl(server):
    catalogs = source(server)

    await catalogs.get("token-de-ana")
    await catalogs.get("token-de-ana")

    assert len(server.requests) == 1


@pytest.mark.anyio
async def test_a_token_is_checked_again_after_the_verify_ttl(server):
    catalogs = source(server, verify_ttl=0)

    await catalogs.get("token-de-ana")
    await catalogs.get("token-de-ana")

    assert len(server.requests) == 2


@pytest.mark.anyio
async def test_the_token_of_a_deleted_account_is_denied_with_a_fresh_copy(server):
    catalogs = source(server, verify_ttl=0)
    await catalogs.get("token-de-ana")
    server.denied.add("token-de-ana")

    with pytest.raises(CatalogDenied):
        await catalogs.get("token-de-ana")
