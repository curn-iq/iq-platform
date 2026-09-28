from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Especialidad,
    Tecnica,
    TecnicaVersion,
)
from app.dominio.tecnicas import EstadoVersion, TecnicaResumen


class RepositorioTecnicasSQLAlchemy:
    def __init__(self, sesion: AsyncSession) -> None:
        self._sesion = sesion

    async def listar_publicadas(self) -> list[TecnicaResumen]:
        consulta = (
            select(
                Tecnica.id,
                Tecnica.nombre,
                Especialidad.nombre.label("especialidad"),
                TecnicaVersion.numero,
            )
            .join(Especialidad, Especialidad.id == Tecnica.especialidad_id)
            .join(TecnicaVersion, TecnicaVersion.tecnica_id == Tecnica.id)
            .where(TecnicaVersion.estado == EstadoVersion.publicada)
            .order_by(Tecnica.nombre)
        )
        resultado = await self._sesion.execute(consulta)
        return [
            TecnicaResumen(
                id=fila.id,
                nombre=fila.nombre,
                especialidad=fila.especialidad,
                numero_version=fila.numero,
            )
            for fila in resultado
        ]
