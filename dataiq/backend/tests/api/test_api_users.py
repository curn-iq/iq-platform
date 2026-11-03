import pytest
from sqlalchemy import event

from tests.api.test_api_versions import action, create_technique
from tests.conftest import auth_headers, save_user


@pytest.mark.anyio
async def test_admin_changes_another_accounts_role(client, admin, user):
    response_ = await client.patch(
        f"/users/{user.id}/role",
        json={"role": "contributor"},
        headers=auth_headers(admin),
    )
    list_ = await client.get("/users", headers=auth_headers(admin))

    assert response_.status_code == 200
    assert response_.json()["role"] == "contributor"
    roles = {c["email"]: c["role"] for c in list_.json()}
    assert roles["usuaria@prueba.com"] == "contributor"


@pytest.mark.anyio
async def test_new_role_applies_from_the_next_request(client, admin, user):
    # El token de la usuaria dice "usuario", pero el rol se lee de la BD.
    old_token = auth_headers(user)
    await client.patch(
        f"/users/{user.id}/role",
        json={"role": "contributor"},
        headers=auth_headers(admin),
    )

    response_ = await client.get("/auth/me", headers=old_token)

    assert response_.json()["role"] == "contributor"


@pytest.mark.anyio
async def test_admin_cannot_change_own_role(client, admin):
    response_ = await client.patch(
        f"/users/{admin.id}/role", json={"role": "user"}, headers=auth_headers(admin)
    )

    assert response_.status_code == 409


@pytest.mark.anyio
async def test_only_admin_manages_roles(client, reviewer, user):
    list_ = await client.get("/users", headers=auth_headers(reviewer))
    change = await client.patch(
        f"/users/{user.id}/role",
        json={"role": "reviewer"},
        headers=auth_headers(reviewer),
    )

    assert list_.status_code == 403
    assert change.status_code == 403


@pytest.mark.anyio
async def test_admin_sees_registration_and_accepted_policy(client, admin, user):
    response_ = await client.get("/users", headers=auth_headers(admin))

    record = next(u for u in response_.json() if u["email"] == "usuaria@prueba.com")
    assert record["policy_version"] == "1.0"
    assert record["policy_accepted_at"]
    assert record["created_at"]


NO_ACTIVITY = {
    "drafts": 0,
    "returned": 0,
    "in_review": 0,
    "published_techniques": 0,
    "reviewed": 0,
}


@pytest.mark.anyio
async def test_admin_sees_what_each_account_did_in_dataiq(
    client, admin, user, contributor, reviewer, specialty
):
    async def technique(account, name) -> dict:
        return await create_technique(client, account, specialty, name)

    # La colaboradora: un borrador, uno devuelto, uno en revisión y uno aprobado
    await technique(contributor, "Borrador")
    returned = await technique(contributor, "Devuelta")
    waiting = await technique(contributor, "En revisión")
    approved = await technique(contributor, "Aprobada")
    for version in (returned, waiting, approved):
        await action(client, contributor, version["id"], "submit")
    await action(client, reviewer, returned["id"], "reject", json={"reason": "Falta"})
    await action(client, reviewer, approved["id"], "approve")
    # El revisor publica algo suyo, que no cuenta como revisado
    own = await technique(reviewer, "Propia")
    await action(client, reviewer, own["id"], "publish")

    response_ = await client.get("/users", headers=auth_headers(admin))

    activity = {u["email"]: u["activity"] for u in response_.json()}
    assert activity[contributor.email] == {
        "drafts": 2,
        "returned": 1,
        "in_review": 1,
        "published_techniques": 1,
        "reviewed": 0,
    }
    assert activity[reviewer.email] == NO_ACTIVITY | {
        "published_techniques": 1,
        "reviewed": 2,
    }
    assert activity[user.email] == NO_ACTIVITY


@pytest.mark.anyio
async def test_changing_the_role_answers_with_the_activity(
    client, admin, contributor, specialty
):
    await create_technique(client, contributor, specialty)

    response_ = await client.patch(
        f"/users/{contributor.id}/role",
        json={"role": "reviewer"},
        headers=auth_headers(admin),
    )

    assert response_.json()["activity"] == NO_ACTIVITY | {"drafts": 1}


@pytest.mark.anyio
async def test_the_activity_asks_the_same_queries_for_one_account_or_many(
    session, client, admin
):
    """Sin N+1: la actividad de todas las cuentas sale con las mismas consultas."""

    async def queries_for_the_list() -> int:
        connection_ = (await session.connection()).sync_connection
        statements: list[str] = []

        def count(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        event.listen(connection_, "before_cursor_execute", count)
        try:
            response_ = await client.get("/users", headers=auth_headers(admin))
            assert response_.status_code == 200
        finally:
            event.remove(connection_, "before_cursor_execute", count)
        return len(statements)

    with_one = await queries_for_the_list()
    for n in range(3):
        await save_user(session, f"Persona {n}", f"persona{n}@prueba.com")

    assert await queries_for_the_list() == with_one
