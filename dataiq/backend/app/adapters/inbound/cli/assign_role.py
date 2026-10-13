"""Asigna el rol de una cuenta desde la terminal.

Sirve para nombrar al primer admin: los demás roles los asigna un admin desde
la API (PATCH /users/{id}/role). La cuenta tiene que existir (autorregistro).

Uso: uv run python -m app.adapters.inbound.cli.assign_role <correo> <rol>
"""

import asyncio
import sys

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.users import (
    SQLAlchemyUserRepository,
)
from app.domain.users import Role


async def assign_role(email: str, role: Role) -> None:
    async with SessionLocal() as session:
        users = SQLAlchemyUserRepository(session)
        found = await users.get_with_hash(email.strip().lower())
        if found is None:
            raise SystemExit(f"No hay una cuenta con el correo {email}")
        account = await users.change_role(found[0].id, role)
        print(f"{account.name} <{account.email}> ahora es {account.role}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[2] not in Role.__members__:
        raise SystemExit(__doc__)
    asyncio.run(assign_role(sys.argv[1], Role(sys.argv[2])))
