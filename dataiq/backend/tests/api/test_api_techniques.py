import uuid
from datetime import UTC, datetime

import pytest

from app.adapters.outbound.persistence.models.techniques import (
    Technique,
    TechniqueVersion,
)
from app.domain.techniques import VersionState
from tests.conftest import auth_headers


async def save_published(session, name, specialty, author, reviewer) -> Technique:
    technique = Technique(name=name, specialty_id=specialty.id, created_by=author.id)
    session.add(technique)
    await session.flush()
    session.add(
        TechniqueVersion(
            technique_id=technique.id,
            number=1,
            state=VersionState.published,
            created_by=author.id,
            reviewed_by=reviewer.id,
            reviewed_at=datetime.now(UTC),
        )
    )
    await session.flush()
    return technique


@pytest.mark.anyio
async def test_list_techniques_returns_published(
    client, session, author, reviewer, specialty
):
    technique = await save_published(session, "Técnica", specialty, author, reviewer)

    response_ = await client.get("/techniques")

    assert response_.status_code == 200
    assert response_.json() == [
        {
            "id": str(technique.id),
            "name": "Técnica",
            "specialty": "Especialidad de prueba",
            "version_number": 1,
        }
    ]
    assert response_.headers["cache-control"] == "public, max-age=60"
    assert response_.headers["etag"]


@pytest.mark.anyio
async def test_list_techniques_returns_304_when_unchanged(
    client, session, author, reviewer, specialty
):
    await save_published(session, "Técnica", specialty, author, reviewer)
    first_ = await client.get("/techniques")

    second = await client.get(
        "/techniques", headers={"If-None-Match": first_.headers["etag"]}
    )

    assert second.status_code == 304
    assert second.content == b""


@pytest.mark.anyio
async def test_list_techniques_changes_etag_when_data_changes(
    client, session, author, reviewer, specialty
):
    await save_published(session, "Técnica", specialty, author, reviewer)
    before = await client.get("/techniques")
    await save_published(session, "Otra técnica", specialty, author, reviewer)

    after = await client.get(
        "/techniques", headers={"If-None-Match": before.headers["etag"]}
    )

    assert after.status_code == 200
    assert len(after.json()) == 2


@pytest.mark.anyio
async def test_public_detail_has_clinical_data_without_instruments(
    client, session, author, reviewer, specialty
):
    technique = await save_published(session, "Técnica", specialty, author, reviewer)

    response_ = await client.get(f"/techniques/{technique.id}")

    assert response_.status_code == 200
    assert response_.json()["name"] == "Técnica"
    assert "items" not in response_.json()
    assert response_.headers["cache-control"] == "public, max-age=60"


@pytest.mark.anyio
async def test_detail_of_missing_technique_returns_404(client):
    response_ = await client.get(f"/techniques/{uuid.uuid7()}")

    assert response_.status_code == 404


@pytest.mark.anyio
async def test_technique_instruments_require_account(
    client, session, author, reviewer, user, specialty
):
    technique = await save_published(session, "Técnica", specialty, author, reviewer)

    without_account = await client.get(f"/techniques/{technique.id}/instruments")
    with_account = await client.get(
        f"/techniques/{technique.id}/instruments", headers=auth_headers(user)
    )

    assert without_account.status_code == 401
    assert with_account.status_code == 200
    assert with_account.json() == {
        "items": [],
        "sutures": [],
        "equipment": [],
        "devices": [],
    }
    assert with_account.headers["cache-control"] == "private, max-age=60"
    assert with_account.headers["vary"] == "Authorization"
