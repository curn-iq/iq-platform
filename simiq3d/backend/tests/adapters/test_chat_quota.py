from uuid import uuid4

import pytest
from sqlalchemy import select, text

from app.adapters.outbound.persistence.models.quota import ChatQuotaRow
from app.adapters.outbound.persistence.repositories.quota import SQLAlchemyChatQuota


def quota(session, max_questions=3):
    return SQLAlchemyChatQuota(session, "clave-de-prueba", max_questions, window=600)


@pytest.mark.anyio
async def test_an_account_can_ask_up_to_the_limit(session):
    account = uuid4()
    limit = quota(session)

    allowed = [await limit.take(account) for _ in range(4)]

    assert allowed == [True, True, True, False]


@pytest.mark.anyio
async def test_each_account_has_its_own_count(session):
    limit = quota(session, max_questions=1)

    assert await limit.take(uuid4())
    assert await limit.take(uuid4())


@pytest.mark.anyio
async def test_after_the_window_the_count_starts_again(session):
    account = uuid4()
    limit = quota(session, max_questions=1)
    await limit.take(account)
    await session.execute(
        text("UPDATE chat_quota SET window_start = now() - interval '11 minutes'")
    )

    assert await limit.take(account)


@pytest.mark.anyio
async def test_the_account_is_not_stored_as_it_is(session):
    account = uuid4()

    await quota(session).take(account)

    [row] = (await session.scalars(select(ChatQuotaRow))).all()
    assert str(account) not in row.account_key
    assert account.hex not in row.account_key
    assert len(row.account_key) == 64  # HMAC-SHA256


@pytest.mark.anyio
async def test_rows_older_than_a_day_are_forgotten(session):
    await quota(session).take(uuid4())
    await session.execute(
        text("UPDATE chat_quota SET window_start = now() - interval '2 days'")
    )

    await quota(session).take(uuid4())

    assert len((await session.scalars(select(ChatQuotaRow))).all()) == 1
