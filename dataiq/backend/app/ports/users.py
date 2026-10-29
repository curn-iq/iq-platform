from typing import Protocol
from uuid import UUID

from app.domain.users import Account, Role, Suppression, UserRecord


class UserRepository(Protocol):
    async def get(self, user_id: UUID) -> Account | None: ...

    async def get_with_hash(self, email: str) -> tuple[Account, str] | None: ...

    async def create(
        self, name: str, email: str, password_hash: str, policy_version: str
    ) -> Account: ...

    async def list_all(self) -> list[UserRecord]: ...

    async def change_role(self, user_id: UUID, role: Role) -> UserRecord: ...

    async def suppress(self, user_id: UUID) -> Suppression:
        """Borra la cuenta, o solo sus datos personales si creó o revisó contenido."""
        ...
