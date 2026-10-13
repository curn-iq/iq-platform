import pytest

from app.adapters.outbound.persistence.repositories.versions import (
    SQLAlchemyVersionRepository,
)
from app.domain.errors import Conflict
from app.domain.techniques import VersionState
from app.domain.users import Role
from tests.conftest import auth_headers, save_user


async def create_technique(client, account, specialty, name="Técnica nueva") -> dict:
    response_ = await client.post(
        "/techniques",
        json={"name": name, "specialty_id": str(specialty.id)},
        headers=auth_headers(account),
    )
    assert response_.status_code == 201, response_.text
    return response_.json()["summary"]


def content(zone, instrument, **changes) -> dict:
    return {
        "anesthesia": "General",
        "zones": [{"zone_id": str(zone.id), "used": True, "rows": 4, "columns": 6}],
        "items": [
            {
                "zone_id": str(zone.id),
                "legend_number": 1,
                "source_text": "Pinza",
                "components": [{"instrument_id": str(instrument.id)}],
                "cells": [{"row": 1, "column": 1}, {"row": 1, "column": 2}],
            },
            {"source_text": "Solo del listado"},
        ],
        "sutures": [{"name": "Seda", "gauge": "3/0", "usage": "Piel"}],
        "equipment": ["Electrobisturí"],
        "devices": ["Sonda"],
    } | changes


async def edit(client, account, version_id, body):
    return await client.put(
        f"/versions/{version_id}", json=body, headers=auth_headers(account)
    )


async def action(client, account, version_id, name, **kwargs):
    return await client.post(
        f"/versions/{version_id}/{name}", headers=auth_headers(account), **kwargs
    )


@pytest.mark.anyio
async def test_contributor_cycle_until_published(
    client, contributor, reviewer, specialty, zone, instrument
):
    version = await create_technique(client, contributor, specialty)
    assert (version["state"], version["number"]) == ("draft", 1)

    edited = await edit(client, contributor, version["id"], content(zone, instrument))
    assert edited.status_code == 200, edited.text
    detail = edited.json()["content"]
    assert detail["anesthesia"] == "General"
    assert [i["source_text"] for i in detail["items"]] == [
        "Pinza",
        "Solo del listado",
    ]
    assert detail["items"][0]["cells"] == [
        {"row": 1, "column": 1},
        {"row": 1, "column": 2},
    ]
    assert [s["usage"] for s in detail["sutures"]] == ["Piel"]
    assert detail["zones"] == [
        {
            "zone_id": str(zone.id),
            "zone": zone.name,
            "used": True,
            "rows": 4,
            "columns": 6,
        }
    ]

    assert (
        await action(client, contributor, version["id"], "submit")
    ).status_code == 204
    # En revisión ya no se edita
    locked = await edit(client, contributor, version["id"], content(zone, instrument))
    assert locked.status_code == 409

    rejection = await action(
        client, reviewer, version["id"], "reject", json={"reason": "Falta la ropa"}
    )
    assert rejection.status_code == 204
    returned = await client.get(
        f"/versions/{version['id']}", headers=auth_headers(contributor)
    )
    assert returned.json()["summary"]["state"] == "draft"
    assert [r["reason"] for r in returned.json()["rejections"]] == ["Falta la ropa"]

    corrected = content(zone, instrument, drapes="Campos estériles")
    assert (
        await edit(client, contributor, version["id"], corrected)
    ).status_code == 200
    assert (
        await action(client, contributor, version["id"], "submit")
    ).status_code == 204
    assert (await action(client, reviewer, version["id"], "approve")).status_code == 204

    published_list = (await client.get("/techniques")).json()
    assert [t["name"] for t in published_list] == ["Técnica nueva"]
    instruments = await client.get(
        f"/techniques/{version['technique_id']}/instruments",
        headers=auth_headers(contributor),
    )
    assert len(instruments.json()["items"]) == 2


@pytest.mark.anyio
async def test_contributor_never_publishes(
    client, contributor, specialty, zone, instrument
):
    version = await create_technique(client, contributor, specialty)

    direct = await action(client, contributor, version["id"], "publish")
    await action(client, contributor, version["id"], "submit")
    approved = await action(client, contributor, version["id"], "approve")

    assert direct.status_code == 403
    assert approved.status_code == 403


@pytest.mark.anyio
async def test_reviewer_publishes_own_without_review(client, reviewer, specialty):
    version = await create_technique(client, reviewer, specialty)

    response_ = await action(client, reviewer, version["id"], "publish")

    assert response_.status_code == 204
    assert [t["name"] for t in (await client.get("/techniques")).json()] == [
        "Técnica nueva"
    ]


@pytest.mark.anyio
async def test_returns_409_when_another_reviewer_already_decided(
    client, contributor, reviewer, other_reviewer, specialty
):
    version = await create_technique(client, contributor, specialty)
    await action(client, contributor, version["id"], "submit")
    await action(client, reviewer, version["id"], "approve")

    other_approval = await action(client, other_reviewer, version["id"], "approve")
    other_rejection = await action(
        client, other_reviewer, version["id"], "reject", json={"reason": "Tarde"}
    )

    assert other_approval.status_code == 409
    assert other_rejection.status_code == 409


@pytest.mark.anyio
async def test_repository_checks_the_state_with_the_row_locked(
    session, client, contributor, reviewer, specialty
):
    # Dos revisores leyeron "en_revision" a la vez; el segundo llega tarde.
    version = await create_technique(client, contributor, specialty)
    await action(client, contributor, version["id"], "submit")
    await action(client, reviewer, version["id"], "approve")
    repository = SQLAlchemyVersionRepository(session)

    with pytest.raises(Conflict):
        await repository.change_state(
            version["id"],
            VersionState.in_review,
            VersionState.published,
            reviewer.id,
        )


@pytest.mark.anyio
async def test_reject_requires_reason(client, contributor, reviewer, specialty):
    version = await create_technique(client, contributor, specialty)
    await action(client, contributor, version["id"], "submit")

    response_ = await action(
        client, reviewer, version["id"], "reject", json={"reason": "   "}
    )

    assert response_.status_code == 422


@pytest.mark.anyio
async def test_editing_a_published_one_copies_its_content_into_a_new_version(
    client, reviewer, specialty, zone, instrument
):
    v1 = await create_technique(client, reviewer, specialty)
    await edit(client, reviewer, v1["id"], content(zone, instrument))
    await action(client, reviewer, v1["id"], "publish")

    new = await client.post(
        f"/techniques/{v1['technique_id']}/versions", headers=auth_headers(reviewer)
    )
    another_one = await client.post(
        f"/techniques/{v1['technique_id']}/versions", headers=auth_headers(reviewer)
    )

    assert new.status_code == 201
    assert another_one.status_code == 409  # ya hay una versión en curso
    v2 = new.json()
    assert (v2["summary"]["number"], v2["summary"]["state"]) == (2, "draft")
    copy_ = v2["content"]
    assert copy_["anesthesia"] == "General"
    assert [i["source_text"] for i in copy_["items"]] == ["Pinza", "Solo del listado"]
    assert len(copy_["items"][0]["cells"]) == 2
    assert [(z["rows"], z["columns"]) for z in copy_["zones"]] == [(4, 6)]
    assert [e["name"] for e in copy_["equipment"]] == ["Electrobisturí"]

    await action(client, reviewer, v2["summary"]["id"], "publish")
    published = (await client.get(f"/techniques/{v1['technique_id']}")).json()
    previous = await client.get(f"/versions/{v1['id']}", headers=auth_headers(reviewer))
    assert published["version_number"] == 2
    assert previous.json()["summary"]["state"] == "superseded"


@pytest.mark.anyio
async def test_only_the_author_edits_and_contributors_see_only_their_own(
    session, client, contributor, reviewer, specialty, zone, instrument
):
    other = await save_user(session, "Otra", "otra@prueba.com", Role.contributor)
    version = await create_technique(client, contributor, specialty)

    foreign = await edit(client, other, version["id"], content(zone, instrument))
    foreign_view = await client.get(
        f"/versions/{version['id']}", headers=auth_headers(other)
    )
    reviewer_view = await client.get(
        f"/versions/{version['id']}", headers=auth_headers(reviewer)
    )
    other_list = await client.get("/versions", headers=auth_headers(other))
    reviewer_list = await client.get("/versions", headers=auth_headers(reviewer))

    assert foreign.status_code == 403
    assert foreign_view.status_code == 403
    assert reviewer_view.status_code == 200
    assert other_list.json() == []
    assert [v["id"] for v in reviewer_list.json()] == [version["id"]]


@pytest.mark.anyio
async def test_user_cannot_write(client, user, specialty):
    response_ = await client.post(
        "/techniques",
        json={"name": "Técnica", "specialty_id": str(specialty.id)},
        headers=auth_headers(user),
    )

    assert response_.status_code == 403


@pytest.mark.anyio
async def test_technique_cannot_repeat_in_the_same_specialty(
    client, contributor, specialty
):
    await create_technique(client, contributor, specialty)

    response_ = await client.post(
        "/techniques",
        json={"name": "Técnica nueva", "specialty_id": str(specialty.id)},
        headers=auth_headers(contributor),
    )

    assert response_.status_code == 409


@pytest.mark.anyio
async def test_editing_with_an_invalid_stand_explains_the_problem(
    client, contributor, specialty, zone, instrument
):
    version = await create_technique(client, contributor, specialty)
    duplicate = content(zone, instrument)
    duplicate["items"].append(duplicate["items"][0])
    ghost = content(zone, instrument)
    ghost["items"][0]["components"] = [
        {"instrument_id": "01a10317-0000-7000-8000-000000000000"}
    ]

    with_duplicate = await edit(client, contributor, version["id"], duplicate)
    with_ghost = await edit(client, contributor, version["id"], ghost)

    assert with_duplicate.status_code == 422
    assert (
        "El número 1 está repetido en la misma mesa" in with_duplicate.json()["detail"]
    )
    assert with_ghost.status_code == 422
    assert with_ghost.json()["detail"] == [
        "No existe el instrumento 01a10317-0000-7000-8000-000000000000"
    ]


@pytest.mark.anyio
async def test_archive_is_blocked_by_a_version_in_progress(
    client, reviewer, contributor, specialty
):
    v1 = await create_technique(client, reviewer, specialty)
    await action(client, reviewer, v1["id"], "publish")
    technique = v1["technique_id"]

    forbidden = await client.post(
        f"/techniques/{technique}/archive", headers=auth_headers(contributor)
    )
    await client.post(
        f"/techniques/{technique}/versions", headers=auth_headers(contributor)
    )
    with_version_in_progress = await client.post(
        f"/techniques/{technique}/archive", headers=auth_headers(reviewer)
    )

    assert forbidden.status_code == 403
    assert with_version_in_progress.status_code == 409


@pytest.mark.anyio
async def test_archiving_removes_the_technique_from_the_catalog(
    client, reviewer, specialty
):
    v1 = await create_technique(client, reviewer, specialty)
    await action(client, reviewer, v1["id"], "publish")

    response_ = await client.post(
        f"/techniques/{v1['technique_id']}/archive", headers=auth_headers(reviewer)
    )

    assert response_.status_code == 204
    assert (await client.get("/techniques")).json() == []
    assert (await client.get(f"/techniques/{v1['technique_id']}")).status_code == 404


@pytest.mark.anyio
async def test_discarding_the_first_draft_deletes_the_technique(
    client, contributor, specialty, zone, instrument
):
    version = await create_technique(client, contributor, specialty)
    await edit(client, contributor, version["id"], content(zone, instrument))

    discarded = await action_delete(client, contributor, version["id"])
    again = await client.get(
        f"/versions/{version['id']}", headers=auth_headers(contributor)
    )

    assert discarded.status_code == 204
    assert again.status_code == 404
    # El nombre queda libre: la técnica se puede crear de nuevo
    await create_technique(client, contributor, specialty)


@pytest.mark.anyio
async def test_discarding_a_new_version_keeps_the_published_one(
    client, reviewer, specialty, zone, instrument
):
    v1 = await create_technique(client, reviewer, specialty)
    await edit(client, reviewer, v1["id"], content(zone, instrument))
    await action(client, reviewer, v1["id"], "publish")
    v2 = (
        await client.post(
            f"/techniques/{v1['technique_id']}/versions",
            headers=auth_headers(reviewer),
        )
    ).json()

    discarded = await action_delete(client, reviewer, v2["summary"]["id"])
    published = await client.get(f"/techniques/{v1['technique_id']}")
    new_draft = await client.post(
        f"/techniques/{v1['technique_id']}/versions", headers=auth_headers(reviewer)
    )

    assert discarded.status_code == 204
    assert published.json()["version_number"] == 1
    assert new_draft.status_code == 201  # ya no hay una versión en curso


@pytest.mark.anyio
async def test_only_drafts_are_discarded_and_only_by_author_or_admin(
    session, client, contributor, reviewer, admin, specialty
):
    other = await save_user(session, "Otro", "otro@prueba.com", Role.contributor)
    draft = await create_technique(client, contributor, specialty)
    in_review = await create_technique(client, contributor, specialty, "En revisión")
    await action(client, contributor, in_review["id"], "submit")
    published = await create_technique(client, reviewer, specialty, "Publicada")
    await action(client, reviewer, published["id"], "publish")

    assert (await action_delete(client, other, draft["id"])).status_code == 403
    assert (
        await action_delete(client, contributor, in_review["id"])
    ).status_code == 409
    assert (await action_delete(client, reviewer, published["id"])).status_code == 409
    assert (await action_delete(client, admin, draft["id"])).status_code == 204


@pytest.mark.anyio
async def test_a_rejected_draft_can_be_discarded(
    client, contributor, reviewer, specialty
):
    version = await create_technique(client, contributor, specialty)
    await action(client, contributor, version["id"], "submit")
    await action(client, reviewer, version["id"], "reject", json={"reason": "No sirve"})

    assert (await action_delete(client, contributor, version["id"])).status_code == 204


async def action_delete(client, account, version_id):
    return await client.delete(f"/versions/{version_id}", headers=auth_headers(account))
