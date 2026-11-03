from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import distinct, exists, func, or_, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.persistence.models.techniques import (
    Technique,
    TechniqueVersion,
    VersionRejection,
)
from app.adapters.outbound.persistence.models.users import User
from app.domain.errors import Conflict, NotFound
from app.domain.techniques import VersionState
from app.domain.users import (
    SUPPRESSED_NAME,
    Account,
    Activity,
    Role,
    Suppression,
    UserRecord,
)

# Una versión que llegó a publicarse sigue contando aunque ya esté reemplazada o
# archivada
_PUBLISHED = (VersionState.published, VersionState.superseded, VersionState.archived)


def _account(user: User) -> Account:
    return Account(id=user.id, name=user.name, email=user.email, role=user.role)


def _record(user: User, activity: Activity | None = None) -> UserRecord:
    return UserRecord(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        policy_accepted_at=user.policy_accepted_at,
        policy_version=user.policy_version,
        activity=activity or Activity(),
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
        users = list(
            await self._session.scalars(select(User).order_by(User.name, User.email))
        )
        activities = await self._activities([u.id for u in users])
        return [_record(u, activities.get(u.id)) for u in users]

    async def change_role(self, user_id: UUID, role: Role) -> UserRecord:
        user = await self._session.get(User, user_id, with_for_update=True)
        if user is None:
            raise NotFound("La cuenta no existe")
        user.role = role
        await self._session.flush()
        activities = await self._activities([user.id])
        record = _record(user, activities.get(user.id))
        await self._session.commit()
        return record

    async def _activities(self, ids: list[UUID]) -> dict[UUID, Activity]:
        """La actividad de varias cuentas con las mismas cuatro consultas, sean
        una o muchas (sin una por cuenta). Una cuenta sin actividad no aparece."""
        if not ids:
            return {}
        counts: dict[UUID, dict[str, int]] = {}

        def add(user_id: UUID, field: str, n: int) -> None:
            counts.setdefault(user_id, {})[field] = n

        Version = TechniqueVersion
        own = (
            select(Version.created_by, Version.state, func.count())
            .where(
                Version.created_by.in_(ids),
                Version.state.in_([VersionState.draft, VersionState.in_review]),
            )
            .group_by(Version.created_by, Version.state)
        )
        for user_id, state, n in await self._session.execute(own):
            add(user_id, "drafts" if state == VersionState.draft else "in_review", n)

        returned = (
            select(Version.created_by, func.count())
            .where(
                Version.created_by.in_(ids),
                Version.state == VersionState.draft,
                exists().where(VersionRejection.version_id == Version.id),
            )
            .group_by(Version.created_by)
        )
        for user_id, n in await self._session.execute(returned):
            add(user_id, "returned", n)

        published = (
            select(Version.created_by, func.count(distinct(Version.technique_id)))
            .where(Version.created_by.in_(ids), Version.state.in_(_PUBLISHED))
            .group_by(Version.created_by)
        )
        for user_id, n in await self._session.execute(published):
            add(user_id, "published_techniques", n)

        # Revisar es sobre lo de otros: aprobar (reviewed_by) o devolver, sin
        # contar lo propio que publicó directo; una versión cuenta una vez
        decided = union(
            select(
                Version.reviewed_by.label("user_id"), Version.id.label("version_id")
            ).where(
                Version.reviewed_by.in_(ids),
                Version.created_by != Version.reviewed_by,
            ),
            select(
                VersionRejection.rejected_by.label("user_id"),
                VersionRejection.version_id.label("version_id"),
            )
            .join(Version, Version.id == VersionRejection.version_id)
            .where(
                VersionRejection.rejected_by.in_(ids),
                Version.created_by != VersionRejection.rejected_by,
            ),
        ).subquery()
        reviewed = select(decided.c.user_id, func.count()).group_by(decided.c.user_id)
        for user_id, n in await self._session.execute(reviewed):
            add(user_id, "reviewed", n)

        return {user_id: Activity(**fields) for user_id, fields in counts.items()}

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
