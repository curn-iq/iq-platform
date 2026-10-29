from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.techniques import (
    Technique,
    TechniqueVersion,
    VersionRejection,
)
from app.adapters.outbound.persistence.models.users import User
from app.domain.errors import Conflict, NotFound
from app.domain.users import (
    SUPPRESSED_NAME,
    Account,
    Role,
    Suppression,
    UserRecord,
)


def _account(user: User) -> Account:
    return Account(id=user.id, name=user.name, email=user.email, role=user.role)


def _record(user: User) -> UserRecord:
    return UserRecord(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        policy_accepted_at=user.policy_accepted_at,
        policy_version=user.policy_version,
    )


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

    async def list_all(self) -> list[UserRecord]:
        users = await self._session.scalars(
            select(User).order_by(User.name, User.email)
        )
        return [_record(u) for u in users]

    async def change_role(self, user_id: UUID, role: Role) -> UserRecord:
        user = await self._session.get(User, user_id, with_for_update=True)
        if user is None:
            raise NotFound("La cuenta no existe")
        user.role = role
        await self._session.flush()
        record = _record(user)
        await self._session.commit()
        return record

    async def suppress(self, user_id: UUID) -> Suppression:
        user = await self._session.get(User, user_id, with_for_update=True)
        if user is None:
            raise NotFound("La cuenta no existe")
        authored = await self._session.scalar(
            select(
                or_(
                    exists().where(Technique.created_by == user_id),
                    exists().where(
                        or_(
                            TechniqueVersion.created_by == user_id,
                            TechniqueVersion.reviewed_by == user_id,
                        )
                    ),
                    exists().where(VersionRejection.rejected_by == user_id),
                )
            )
        )
        if authored:
            user.name = SUPPRESSED_NAME
            # .invalid es un dominio reservado (RFC 2606): no es el correo de nadie
            user.email = f"suprimida-{user.id}@cuenta.invalid"
            user.password_hash = "!"  # no corresponde a ninguna contraseña
            user.role = Role.user
            result = Suppression.anonymized
        else:
            await self._session.delete(user)
            result = Suppression.deleted
        await self._session.commit()
        return result
