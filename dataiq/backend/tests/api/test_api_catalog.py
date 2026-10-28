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
        json={"description": "Corta tejido", "description_source": "Un libro"},
        headers=auth_headers(reviewer),
    )

    assert created.status_code == 201
    assert edited.status_code == 200
    assert edited.json() == {
        "id": created.json()["id"],
        "name": "Tijera nueva",
        "category": "Categoría de prueba",
        "description": "Corta tejido",
        "description_source": "Un libro",
        "aliases": [],
    }


@pytest.mark.anyio
async def test_a_description_needs_its_source(client, reviewer, instrument):
    headers = auth_headers(reviewer)

    created = await client.post(
        "/instruments",
        json={
            "name": "Tijera nueva",
            "category_id": str(instrument.category_id),
            "description": "Corta tejido",
        },
        headers=headers,
    )
    edited = await client.patch(
        f"/instruments/{instrument.id}",
        json={"description": "Sujeta tejido"},
        headers=headers,
    )

    assert created.status_code == 422
    assert edited.status_code == 422
    assert edited.json()["detail"] == [
        "La descripción necesita su fuente (description_source)"
    ]


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


@pytest.mark.anyio
async def test_specialties_are_public_and_cached(client, specialty):
    response_ = await client.get("/specialties")

    assert response_.status_code == 200
    assert response_.json() == [
        {"id": str(specialty.id), "name": "Especialidad de prueba"}
    ]
    assert response_.headers["cache-control"] == "public, max-age=300"
    assert response_.headers["etag"]


@pytest.mark.anyio
async def test_patch_replaces_the_aliases(client, reviewer, instrument):
    url = f"/instruments/{instrument.id}"
    headers = auth_headers(reviewer)

    first = await client.patch(
        url, json={"aliases": ["Pinza P", "Pinza P", "Pinzas P"]}, headers=headers
    )
    untouched = await client.patch(
        url, json={"description": "D", "description_source": "F"}, headers=headers
    )
    replaced = await client.patch(url, json={"aliases": ["Pinza Q"]}, headers=headers)
    emptied = await client.patch(url, json={"aliases": []}, headers=headers)

    assert first.json()["aliases"] == ["Pinza P", "Pinzas P"]  # sin repetidos
    assert untouched.json()["aliases"] == ["Pinza P", "Pinzas P"]  # no se mandaron
    assert replaced.json()["aliases"] == ["Pinza Q"]
    assert emptied.json()["aliases"] == []


@pytest.mark.anyio
async def test_an_alias_belongs_to_a_single_instrument(client, reviewer, instrument):
    headers = auth_headers(reviewer)
    other = await client.post(
        "/instruments",
        json={"name": "Otra pinza", "category_id": str(instrument.category_id)},
        headers=headers,
    )
    await client.patch(
        f"/instruments/{instrument.id}", json={"aliases": ["Pinza P"]}, headers=headers
    )

    response_ = await client.patch(
        f"/instruments/{other.json()['id']}",
        json={"aliases": ["Pinza P"]},
        headers=headers,
    )

    assert response_.status_code == 409
    assert response_.json()["detail"] == "El alias «Pinza P» ya es de otro instrumento"
