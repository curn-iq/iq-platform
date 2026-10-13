from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.users import User
from app.domain.errors import Conflict, NotFound
from app.domain.users import Account, Role


def _account(user: User) -> Account:
    return Account(id=user.id, name=user.name, email=user.email, role=user.role)


class SQLAlchemyUserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: UUID) -> Account | None:
        user = await self._session.get(User, user_id)
        return _account(user) if user else None

    async def get_with_hash(self, email: str) -> tuple[Account, str] | None:
        user = await self._session.scalar(select(User).where(User.email == email))
        return (_account(user), user.password_hash) if user else None

    async def create(
        self, name: str, email: str, password_hash: str, policy_version: str
    ) -> Account:
        exists = await self._session.scalar(select(User.id).where(User.email == email))
        if exists:
            raise Conflict("Ya hay una cuenta con ese correo")
        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=Role.user,
            policy_accepted_at=datetime.now(UTC),
            policy_version=policy_version,
        )
        self._session.add(user)
        await self._session.flush()
        account = _account(user)
        await self._session.commit()
        return account

    async def list_all(self) -> list[Account]:
        users = await self._session.scalars(
            select(User).order_by(User.name, User.email)
        )
        return [_account(u) for u in users]

    async def change_role(self, user_id: UUID, role: Role) -> Account:
        user = await self._session.get(User, user_id, with_for_update=True)
        if user is None:
            raise NotFound("La cuenta no existe")
        user.role = role
        await self._session.flush()
        account = _account(user)
        await self._session.commit()
        return account
