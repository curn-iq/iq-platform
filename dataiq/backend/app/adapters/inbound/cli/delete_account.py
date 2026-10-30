"""Suprime una cuenta desde la terminal, cuando su titular lo pide por el canal
del aviso de privacidad (docs/privacidad.md).

Si la cuenta no creó ni revisó nada, se borra entera. Si creó o revisó técnicas
o versiones, se borran su nombre, su correo y su contraseña, y lo que hizo se
conserva sin su nombre; si tenía una sesión abierta, vence sola en menos de 2
horas. Pide confirmación.

Uso: uv run python -m app.adapters.inbound.cli.delete_account <correo> [--si]
"""

import asyncio
import sys

from app.adapters.outbound.persistence.database import SessionLocal
from app.adapters.outbound.persistence.repositories.users import (
    SQLAlchemyUserRepository,
)
from app.domain.users import Suppression
from app.ports.users import UserRepository

RESULTS = {
    Suppression.deleted: "borrada por completo",
    Suppression.anonymized: (
        "sin nombre, correo ni contraseña; lo que creó o revisó se conserva sin "
        "su nombre"
    ),
}


async def delete_account(users: UserRepository, email: str, confirmed: bool) -> str:
    found = await users.get_with_hash(email.strip().lower())
    if found is None:
        raise SystemExit(f"No hay una cuenta con el correo {email}")
    account = found[0]
    if not confirmed and (
        input(
            f"¿Suprimir la cuenta de {account.name} <{account.email}>? "
            "Escribe «suprimir»: "
        )
        != "suprimir"
    ):
        raise SystemExit("No se suprimió nada.")
    return RESULTS[await users.suppress(account.id)]


async def main(email: str, confirmed: bool) -> None:
    async with SessionLocal() as session:
        result = await delete_account(
            SQLAlchemyUserRepository(session), email, confirmed
        )
        print(f"Cuenta {email}: {result}.")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--si"]
    if len(args) != 1:
        raise SystemExit(__doc__)
    asyncio.run(main(args[0], "--si" in sys.argv[1:]))
