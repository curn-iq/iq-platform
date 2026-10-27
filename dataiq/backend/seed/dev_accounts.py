"""Cuentas para desarrollo local, una por rol, con una contraseña conocida.

    uv run python -m seed.dev_accounts

Sirven para probar DataIQ, el shell y los módulos sin registrarse cada vez. Solo
se crean en una base local: si DATABASE_URL no apunta a este equipo, el script
se niega (en Neon nunca debe haber cuentas con una contraseña publicada en el
repo). Se puede correr varias veces: deja cada cuenta con su rol y su contraseña.
"""

import asyncio
import sys
from datetime import UTC, datetime

from sqlalchemy import make_url, select

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.models.users import User
from app.adapters.outbound.security.passwords import Argon2PasswordHasher
from app.config import config
from app.domain.users import Role

PASSWORD = "desarrollo"
# example.com está reservado para documentación y pruebas (RFC 2606).
ACCOUNTS = [
    ("Usuario de prueba", "usuario@example.com", Role.user),
    ("Colaborador de prueba", "colaborador@example.com", Role.contributor),
    ("Revisor de prueba", "revisor@example.com", Role.reviewer),
    ("Admin de prueba", "admin@example.com", Role.admin),
]
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def is_local(database_url: str) -> bool:
    return make_url(database_url).host in LOCAL_HOSTS


async def create_accounts(session) -> None:
    password_hash = Argon2PasswordHasher().hash_password(PASSWORD)
    for name, email, role in ACCOUNTS:
        user = (await session.scalars(select(User).where(User.email == email))).first()
        if user is None:
            user = User(
                name=name,
                email=email,
                policy_accepted_at=datetime.now(UTC),
                policy_version=config.policy_version,
            )
            session.add(user)
        user.password_hash = password_hash
        user.role = role
    await session.commit()


async def main() -> int:
    if not is_local(config.database_url):
        print(
            "No se crearon cuentas: DATABASE_URL no es una base local. "
            "Las cuentas de desarrollo nunca van en Neon.",
            file=sys.stderr,
        )
        return 1
    async with SessionLocal() as session:
        await create_accounts(session)
    print(f"Cuentas de desarrollo listas (contraseña «{PASSWORD}»):")
    for _, email, role in ACCOUNTS:
        print(f"  {email:<26} {role.value}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
