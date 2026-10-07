from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.catalogo import (
    CategoriaInstrumental,
    Instrumental,
    InstrumentalAlias,
)
from app.dominio.catalogo import Instrumento


class RepositorioCatalogoSQLAlchemy:
    def __init__(self, sesion: AsyncSession) -> None:
        self._sesion = sesion

    async def listar_instrumental(self) -> list[Instrumento]:
        alias: dict[UUID, list[str]] = defaultdict(list)
        consulta_alias = select(
            InstrumentalAlias.instrumental_id, InstrumentalAlias.alias
        ).order_by(InstrumentalAlias.alias)
        for fila in await self._sesion.execute(consulta_alias):
            alias[fila.instrumental_id].append(fila.alias)

        consulta = (
            select(
                Instrumental.id,
                Instrumental.nombre,
                CategoriaInstrumental.nombre.label("categoria"),
                Instrumental.descripcion,
            )
            .join(
                CategoriaInstrumental,
                CategoriaInstrumental.id == Instrumental.categoria_id,
            )
            .order_by(Instrumental.nombre)
        )
        return [
            Instrumento(
                id=fila.id,
                nombre=fila.nombre,
                categoria=fila.categoria,
                descripcion=fila.descripcion,
                alias=tuple(alias[fila.id]),
            )
            for fila in await self._sesion.execute(consulta)
        ]
