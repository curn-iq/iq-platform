from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Especialidad,
    Tecnica,
    TecnicaVersion,
)
from app.dominio.tecnicas import EstadoVersion, TecnicaDetalle, TecnicaResumen


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

    async def obtener_publicada(self, tecnica_id: UUID) -> TecnicaDetalle | None:
        consulta = (
            select(
                Tecnica.id,
                Tecnica.nombre,
                Especialidad.nombre.label("especialidad"),
                TecnicaVersion.numero,
                TecnicaVersion.codigo_cups,
                TecnicaVersion.anestesia,
                TecnicaVersion.posicion_paciente,
                TecnicaVersion.ropa,
                TecnicaVersion.descripcion,
                TecnicaVersion.indicaciones,
                TecnicaVersion.complicaciones,
                TecnicaVersion.tecnica_quirurgica,
            )
            .join(Especialidad, Especialidad.id == Tecnica.especialidad_id)
            .join(TecnicaVersion, TecnicaVersion.tecnica_id == Tecnica.id)
            .where(Tecnica.id == tecnica_id)
            .where(TecnicaVersion.estado == EstadoVersion.publicada)
        )
        resultado = await self._sesion.execute(consulta)
        fila = resultado.one_or_none()
        if fila is None:
            return None
        return TecnicaDetalle(
            id=fila.id,
            nombre=fila.nombre,
            especialidad=fila.especialidad,
            numero_version=fila.numero,
            codigo_cups=fila.codigo_cups,
            anestesia=fila.anestesia,
            posicion_paciente=fila.posicion_paciente,
            ropa=fila.ropa,
            descripcion=fila.descripcion,
            indicaciones=fila.indicaciones,
            complicaciones=fila.complicaciones,
            tecnica_quirurgica=fila.tecnica_quirurgica,
        )
