import pytest
from sqlalchemy import select

from app.adapters.outbound.persistence.models.users import User
from app.domain.users import Role
from seed.dev_accounts import ACCOUNTS, PASSWORD, create_accounts, is_local


@pytest.mark.parametrize(
    ("url", "local"),
    [
        ("postgresql+asyncpg://dataiq:x@localhost:5432/dataiq", True),
        ("postgresql+asyncpg://dataiq:x@127.0.0.1/dataiq", True),
        (
            "postgresql+asyncpg://u:x@ep-algo.us-east-2.aws.neon.tech/dataiq?ssl=require",
            False,
        ),
    ],
)
def test_only_local_databases_get_dev_accounts(url, local):
    assert is_local(url) is local


@pytest.mark.anyio
async def test_there_is_one_account_per_role_and_running_twice_is_safe(session):
    await create_accounts(session)
    await create_accounts(session)

    emails = [email for _, email, _ in ACCOUNTS]
    users = (await session.scalars(select(User).where(User.email.in_(emails)))).all()
    assert sorted(u.role for u in users) == sorted(Role)


@pytest.mark.anyio
async def test_the_dev_accounts_can_log_in(client, session):
    await create_accounts(session)

    response_ = await client.post(
        "/auth/token", data={"username": "admin@example.com", "password": PASSWORD}
    )

    assert response_.status_code == 200
    assert "access_token" in response_.json()
