import pytest

from tests.conftest import auth_headers


@pytest.mark.anyio
async def test_full_catalog_requires_account_and_returns_everything(
    client, user, instrument, zone
):
    assert (await client.get("/catalog/full")).status_code == 401

    response_ = await client.get("/catalog/full", headers=auth_headers(user))

    assert response_.status_code == 200
    body = response_.json()
    assert set(body) == {
        "specialties",
        "zones",
        "categories",
        "instruments",
        "sutures",
        "equipment",
        "devices",
        "techniques",
    }
    assert [i["name"] for i in body["instruments"]] == ["Pinza de prueba"]
    assert [z["name"] for z in body["zones"]] == ["Mesa de prueba"]
    assert response_.headers["cache-control"] == "private, max-age=300"
    assert response_.headers["etag"]


@pytest.mark.anyio
async def test_contributor_cannot_create_instruments(client, contributor, instrument):
    response_ = await client.post(
        "/instruments",
        json={"name": "Nuevo", "category_id": str(instrument.category_id)},
        headers=auth_headers(contributor),
    )

    assert response_.status_code == 403


@pytest.mark.anyio
async def test_reviewer_creates_and_updates_instruments(client, reviewer, instrument):
    created = await client.post(
        "/instruments",
        json={"name": "Tijera nueva", "category_id": str(instrument.category_id)},
        headers=auth_headers(reviewer),
    )
    edited = await client.patch(
        f"/instruments/{created.json()['id']}",
        json={"description": "Corta tejido"},
        headers=auth_headers(reviewer),
    )

    assert created.status_code == 201
    assert edited.status_code == 200
    assert edited.json() == {
        "id": created.json()["id"],
        "name": "Tijera nueva",
        "category": "Categoría de prueba",
        "description": "Corta tejido",
        "alias": [],
    }


@pytest.mark.anyio
async def test_instrument_name_cannot_repeat(client, reviewer, instrument):
    response_ = await client.post(
        "/instruments",
        json={
            "name": "Pinza de prueba",
            "category_id": str(instrument.category_id),
        },
        headers=auth_headers(reviewer),
    )

    assert response_.status_code == 409
