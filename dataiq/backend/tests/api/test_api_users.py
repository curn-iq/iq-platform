import pytest

from tests.conftest import auth_headers


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
