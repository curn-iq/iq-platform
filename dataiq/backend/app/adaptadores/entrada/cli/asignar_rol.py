"""Asigna el rol de una cuenta desde la terminal.

Sirve para nombrar al primer admin: los demás roles los asigna un admin desde
la API (PATCH /usuarios/{id}/rol). La cuenta tiene que existir (autorregistro).

Uso: uv run python -m app.adaptadores.entrada.cli.asignar_rol <correo> <rol>
"""

import asyncio
import sys

from app.adaptadores.salida.persistencia.base_datos import SesionLocal
from app.adaptadores.salida.persistencia.repositorios.usuarios import (
    RepositorioUsuariosSQLAlchemy,
)
from app.dominio.usuarios import RolUsuario


async def asignar_rol(email: str, rol: RolUsuario) -> None:
    async with SesionLocal() as sesion:
        usuarios = RepositorioUsuariosSQLAlchemy(sesion)
        encontrada = await usuarios.obtener_con_hash(email.strip().lower())
        if encontrada is None:
            raise SystemExit(f"No hay una cuenta con el correo {email}")
        cuenta = await usuarios.cambiar_rol(encontrada[0].id, rol)
        print(f"{cuenta.nombre} <{cuenta.email}> ahora es {cuenta.rol}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[2] not in RolUsuario.__members__:
        raise SystemExit(__doc__)
    asyncio.run(asignar_rol(sys.argv[1], RolUsuario(sys.argv[2])))
