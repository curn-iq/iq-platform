import httpx
import pytest

from app.adapters.outbound.dataiq.catalog import DataIQCatalogSource
from app.domain.catalog import MAYO, Cell
from app.ports.catalog import CatalogDenied, CatalogUnavailable

KELLY = "0199e0d4-0000-7000-8000-000000000009"
MASTECTOMIA = "0199e0d4-0000-7000-8000-0000000000a1"

# Misma forma que GET /catalog/full de DataIQ (FullCatalogOut), recortada.
CATALOG = {
    "specialties": [{"id": "0199e0d4-0000-7000-8000-0000000000c1", "name": "x"}],
    "zones": [],
    "categories": [],
    "instruments": [
        {
            "id": KELLY,
            "name": "Pinza Kelly",
            "category": "Hemostasia",
            "description": None,
            "aliases": ["Pinzas Kelly", "Pinza de Kelly"],
        }
    ],
    "sutures": [],
    "equipment": [],
    "devices": [],
    "techniques": [
        {
            "id": MASTECTOMIA,
            "name": "Mastectomía",
            "specialty": "Cirugía general",
            "version_number": 1,
            "cups_code": None,
            "anesthesia": "General",
            "patient_position": "Decúbito supino",
            "drapes": None,
            "description": "Extirpación quirúrgica de la glándula mamaria.",
            "indications": None,
            "complications": None,
            "surgical_technique": None,
            "source": None,
            "zones": [],
            "items": [
                {
                    "id": "0199e0d4-0000-7000-8000-0000000000b1",
                    "zone_id": "0199e0d4-0000-7000-8000-0000000000d1",
                    "zone": MAYO,
                    "legend_number": 9,
                    "source_text": "Pinzas kelly",
                    "components": [
                        {
                            "instrument_id": KELLY,
                            "suture_id": None,
                            "name": "Pinza Kelly",
                        }
                    ],
                    "cells": [{"row": 3, "column": 4}],
                },
                {
                    # Solo del listado: sin mesa ni número.
                    "id": "0199e0d4-0000-7000-8000-0000000000b2",
                    "zone_id": None,
                    "zone": None,
                    "legend_number": None,
                    "source_text": "Compresas",
                    "components": [],
                    "cells": [],
                },
            ],
            "sutures": [],
            "equipment": [],
            "devices": [],
        }
    ],
}


class FakeCatalogServer:
    """Hace de DataIQ en GET /catalog/full, con ETag como el de verdad."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.status = 200

    def transport(self) -> httpx.MockTransport:
        def handle(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            if self.status != 200:
                return httpx.Response(self.status)
            if request.headers.get("if-none-match") == '"v1"':
                return httpx.Response(304, headers={"ETag": '"v1"'})
            return httpx.Response(200, json=CATALOG, headers={"ETag": '"v1"'})

        return httpx.MockTransport(handle)


@pytest.fixture
def server() -> FakeCatalogServer:
    return FakeCatalogServer()


def source(server, **options) -> DataIQCatalogSource:
    return DataIQCatalogSource(
        "https://dataiq.prueba", transport=server.transport(), **options
    )


@pytest.mark.anyio
async def test_the_catalog_comes_from_dataiq_with_the_callers_token(server):
    catalog = await source(server).get("token-de-ana")

    request = server.requests[0]
    assert request.url == "https://dataiq.prueba/catalog/full"
    assert request.headers["authorization"] == "Bearer token-de-ana"
    [technique] = catalog.techniques
    assert technique.name == "Mastectomía"
    assert technique.anesthesia == "General"
    [instrument] = catalog.instruments
    assert instrument.aliases == ("Pinzas Kelly", "Pinza de Kelly")


@pytest.mark.anyio
async def test_the_mayo_table_keeps_numbers_cells_and_instruments(server):
    catalog = await source(server).get("token")

    [kelly] = catalog.techniques[0].mayo_items()
    assert kelly.name == "Pinza Kelly"
    assert kelly.source_text == "Pinzas kelly"
    assert kelly.legend_number == 9
    assert kelly.cells == (Cell(3, 4),)
    assert [str(i) for i in kelly.instrument_ids] == [KELLY]


@pytest.mark.anyio
async def test_objects_without_a_table_are_left_out(server):
    catalog = await source(server).get("token")

    assert [i.name for i in catalog.techniques[0].items] == ["Pinza Kelly"]


@pytest.mark.anyio
async def test_the_catalog_is_kept_and_shared_while_fresh(server):
    catalogs = source(server)

    await catalogs.get("token-de-ana")
    await catalogs.get("token-de-luis")

    assert len(server.requests) == 1


@pytest.mark.anyio
async def test_when_it_gets_old_it_only_asks_if_it_changed(server):
    catalogs = source(server, max_age=0)
    first = await catalogs.get("token")

    second = await catalogs.get("token")

    assert server.requests[1].headers["if-none-match"] == '"v1"'
    assert second is first


@pytest.mark.anyio
async def test_without_dataiq_and_without_a_copy_it_is_unavailable(server):
    server.status = 503

    with pytest.raises(CatalogUnavailable):
        await source(server).get("token")


@pytest.mark.anyio
async def test_if_dataiq_goes_down_the_last_copy_is_used(server):
    catalogs = source(server, max_age=0)
    first = await catalogs.get("token")
    server.status = 503

    again = await catalogs.get("token")
    # Dentro de retry_after no se le vuelve a preguntar a DataIQ.
    await catalogs.get("token")

    assert again is first
    assert len(server.requests) == 2


@pytest.mark.anyio
async def test_a_token_dataiq_rejects_is_denied(server):
    server.status = 401

    with pytest.raises(CatalogDenied):
        await source(server).get("token")


@pytest.mark.anyio
async def test_an_object_with_several_components_names_them_all():
    compound = CATALOG | {
        "techniques": [
            CATALOG["techniques"][0]
            | {
                "items": [
                    CATALOG["techniques"][0]["items"][0]
                    | {
                        "source_text": "M.B#4 H.B#20",
                        "components": [
                            {
                                "instrument_id": KELLY,
                                "suture_id": None,
                                "name": "Mango",
                            },
                            {"instrument_id": None, "suture_id": None, "name": "Hoja"},
                        ],
                    }
                ]
            }
        ]
    }
    transport = httpx.MockTransport(lambda r: httpx.Response(200, json=compound))
    catalogs = DataIQCatalogSource("https://dataiq.prueba", transport=transport)

    [item] = (await catalogs.get("token")).techniques[0].mayo_items()

    assert item.name == "Mango y Hoja"
    assert item.source_text == "M.B#4 H.B#20"
