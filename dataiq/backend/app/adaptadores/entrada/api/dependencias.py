from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.base_datos import SesionLocal
from app.adaptadores.salida.persistencia.repositorios.tecnicas import (
    RepositorioTecnicasSQLAlchemy,
)
from app.puertos.tecnicas import RepositorioTecnicas


async def obtener_sesion() -> AsyncIterator[AsyncSession]:
    async with SesionLocal() as sesion:
        yield sesion


def obtener_repositorio_tecnicas(
    sesion: Annotated[AsyncSession, Depends(obtener_sesion)],
) -> RepositorioTecnicas:
    return RepositorioTecnicasSQLAlchemy(sesion)
