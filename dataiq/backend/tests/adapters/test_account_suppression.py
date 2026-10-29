import pytest
from sqlalchemy import select

from app.adapters.inbound.cli.delete_account import delete_account
from app.adapters.outbound.persistence.models.techniques import VersionRejection
from app.adapters.outbound.persistence.models.users import User
from app.adapters.outbound.persistence.repositories.users import (
    SQLAlchemyUserRepository,
)
from app.domain.users import SUPPRESSED_NAME, Role, Suppression
from tests.adapters.test_version_rejection import save_version_in_review
from tests.conftest import auth_headers


@pytest.mark.anyio
async def test_an_account_without_content_is_deleted(session, user):
    result = await SQLAlchemyUserRepository(session).suppress(user.id)

    assert result == Suppression.deleted
    assert await session.get(User, user.id) is None


@pytest.mark.anyio
async def test_an_author_loses_its_personal_data_but_keeps_its_content(
    session, author, specialty
):
    version = await save_version_in_review(session, specialty, author)

    result = await SQLAlchemyUserRepository(session).suppress(author.id)

    saved = (await session.scalars(select(User).where(User.id == author.id))).one()
    assert result == Suppression.anonymized
    assert saved.name == SUPPRESSED_NAME
    assert saved.email == f"suprimida-{author.id}@cuenta.invalid"
    assert saved.password_hash == "!"
    assert saved.role == Role.user
    assert version.created_by == author.id


@pytest.mark.anyio
async def test_a_reviewer_who_rejected_something_is_anonymized(
    session, author, reviewer, specialty
):
    version = await save_version_in_review(session, specialty, author)
    session.add(
        VersionRejection(version_id=version.id, rejected_by=reviewer.id, reason="X")
    )
    await session.flush()

    assert (
        await SQLAlchemyUserRepository(session).suppress(reviewer.id)
        == Suppression.anonymized
    )


@pytest.mark.anyio
async def test_a_deleted_account_cannot_use_its_session(client, session, user):
    headers = auth_headers(user)

    await SQLAlchemyUserRepository(session).suppress(user.id)

    response_ = await client.get("/auth/me", headers=headers)
    assert response_.status_code == 401


@pytest.mark.anyio
async def test_the_command_asks_before_suppressing(session, user, monkeypatch):
    users = SQLAlchemyUserRepository(session)
    monkeypatch.setattr("builtins.input", lambda _: "no")

    with pytest.raises(SystemExit, match="No se suprimió nada"):
        await delete_account(users, user.email, confirmed=False)
    assert await session.get(User, user.id) is not None

    result = await delete_account(users, user.email.upper(), confirmed=True)
    assert result.startswith("borrada")


@pytest.mark.anyio
async def test_the_command_says_when_the_account_does_not_exist(session):
    with pytest.raises(SystemExit, match="No hay una cuenta"):
        await delete_account(
            SQLAlchemyUserRepository(session), "nadie@prueba.com", confirmed=True
        )
