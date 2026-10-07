from collections import defaultdict
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.catalogo import (
    DispositivoMedico,
    EquipoBiomedico,
    Instrumental,
    Sutura,
)
from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Especialidad,
    ItemTecnica,
    ItemTecnicaComponente,
    PosicionMesa,
    Tecnica,
    TecnicaVersion,
    TecnicaVersionDispositivoMedico,
    TecnicaVersionEquipoBiomedico,
    TecnicaVersionSutura,
    Zona,
)
from app.dominio.tecnicas import (
    Celda,
    ComponenteItem,
    Dispositivo,
    Equipo,
    EstadoVersion,
    ItemDetalle,
    SuturaDetalle,
    TecnicaDetalle,
    TecnicaResumen,
)


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
            .order_by(Tecnica.nombre, Especialidad.nombre)
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
        detalles = await self._detalles(Tecnica.id == tecnica_id)
        return detalles[0] if detalles else None

    async def listar_detalles_publicadas(self) -> list[TecnicaDetalle]:
        return await self._detalles()

    async def _detalles(self, *filtros) -> list[TecnicaDetalle]:
        # Las partes del detalle se piden para todas las versiones a la vez y se
        # agrupan en Python: siete consultas sin importar cuántas técnicas sean.
        consulta = (
            select(
                Tecnica.id,
                Tecnica.nombre,
                Especialidad.nombre.label("especialidad"),
                TecnicaVersion.id.label("version_id"),
                TecnicaVersion.numero,
                TecnicaVersion.codigo_cups,
                TecnicaVersion.anestesia,
                TecnicaVersion.posicion_paciente,
                TecnicaVersion.ropa,
                TecnicaVersion.descripcion,
                TecnicaVersion.indicaciones,
                TecnicaVersion.complicaciones,
                TecnicaVersion.tecnica_quirurgica,
                TecnicaVersion.fuente,
            )
            .join(Especialidad, Especialidad.id == Tecnica.especialidad_id)
            .join(TecnicaVersion, TecnicaVersion.tecnica_id == Tecnica.id)
            .where(TecnicaVersion.estado == EstadoVersion.publicada, *filtros)
            .order_by(Tecnica.nombre, Especialidad.nombre)
        )
        filas = (await self._sesion.execute(consulta)).all()
        if not filas:
            return []
        versiones = [fila.version_id for fila in filas]
        items = await self._items(versiones)
        suturas = await self._suturas(versiones)
        equipos = await self._equipos(versiones)
        dispositivos = await self._dispositivos(versiones)
        return [
            TecnicaDetalle(
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
                fuente=fila.fuente,
                items=tuple(items[fila.version_id]),
                suturas=tuple(suturas[fila.version_id]),
                equipos=tuple(equipos[fila.version_id]),
                dispositivos=tuple(dispositivos[fila.version_id]),
            )
            for fila in filas
        ]

    async def _items(self, versiones: list[UUID]) -> dict[UUID, list[ItemDetalle]]:
        componentes: dict[UUID, list[ComponenteItem]] = defaultdict(list)
        consulta_componentes = (
            select(
                ItemTecnicaComponente.item_id,
                ItemTecnicaComponente.instrumental_id,
                ItemTecnicaComponente.sutura_id,
                func.coalesce(Instrumental.nombre, Sutura.nombre).label("nombre"),
            )
            .join(ItemTecnica, ItemTecnica.id == ItemTecnicaComponente.item_id)
            .outerjoin(
                Instrumental, Instrumental.id == ItemTecnicaComponente.instrumental_id
            )
            .outerjoin(Sutura, Sutura.id == ItemTecnicaComponente.sutura_id)
            .where(ItemTecnica.version_id.in_(versiones))
            .order_by(ItemTecnicaComponente.id)
        )
        for fila in await self._sesion.execute(consulta_componentes):
            componentes[fila.item_id].append(
                ComponenteItem(
                    instrumental_id=fila.instrumental_id,
                    sutura_id=fila.sutura_id,
                    nombre=fila.nombre,
                )
            )

        celdas: dict[UUID, list[Celda]] = defaultdict(list)
        consulta_celdas = (
            select(PosicionMesa.item_id, PosicionMesa.fila, PosicionMesa.columna)
            .where(PosicionMesa.version_id.in_(versiones))
            .order_by(PosicionMesa.fila, PosicionMesa.columna)
        )
        for fila in await self._sesion.execute(consulta_celdas):
            celdas[fila.item_id].append(Celda(fila=fila.fila, columna=fila.columna))

        items: dict[UUID, list[ItemDetalle]] = defaultdict(list)
        consulta_items = (
            select(
                ItemTecnica.id,
                ItemTecnica.version_id,
                Zona.nombre.label("zona"),
                ItemTecnica.numero_leyenda,
                ItemTecnica.texto_fuente,
                ItemTecnica.id,
            )
            .outerjoin(Zona, Zona.id == ItemTecnica.zona_id)
            .where(ItemTecnica.version_id.in_(versiones))
            .order_by(
                Zona.nombre.nulls_last(),
                ItemTecnica.numero_leyenda.nulls_last(),
                ItemTecnica.texto_fuente,
                ItemTecnica.id,
            )
        )
        for fila in await self._sesion.execute(consulta_items):
            items[fila.version_id].append(
                ItemDetalle(
                    id=fila.id,
                    zona=fila.zona,
                    numero_leyenda=fila.numero_leyenda,
                    texto_fuente=fila.texto_fuente,
                    componentes=tuple(componentes[fila.id]),
                    celdas=tuple(celdas[fila.id]),
                )
            )
        return items

    async def _suturas(self, versiones: list[UUID]) -> dict[UUID, list[SuturaDetalle]]:
        suturas: dict[UUID, list[SuturaDetalle]] = defaultdict(list)
        consulta = (
            select(
                TecnicaVersionSutura.version_id,
                Sutura.id,
                Sutura.nombre,
                Sutura.calibre,
                Sutura.tipo_aguja,
                TecnicaVersionSutura.uso,
            )
            .join(TecnicaVersionSutura, TecnicaVersionSutura.sutura_id == Sutura.id)
            .where(TecnicaVersionSutura.version_id.in_(versiones))
            .order_by(Sutura.nombre, Sutura.calibre, Sutura.tipo_aguja, Sutura.id)
        )
        for fila in await self._sesion.execute(consulta):
            suturas[fila.version_id].append(
                SuturaDetalle(
                    id=fila.id,
                    nombre=fila.nombre,
                    calibre=fila.calibre,
                    tipo_aguja=fila.tipo_aguja,
                    uso=fila.uso,
                )
            )
        return suturas

    async def _equipos(self, versiones: list[UUID]) -> dict[UUID, list[Equipo]]:
        equipos: dict[UUID, list[Equipo]] = defaultdict(list)
        consulta = (
            select(
                TecnicaVersionEquipoBiomedico.version_id,
                EquipoBiomedico.id,
                EquipoBiomedico.nombre,
                EquipoBiomedico.descripcion,
            )
            .join(
                TecnicaVersionEquipoBiomedico,
                TecnicaVersionEquipoBiomedico.equipo_id == EquipoBiomedico.id,
            )
            .where(TecnicaVersionEquipoBiomedico.version_id.in_(versiones))
            .order_by(EquipoBiomedico.nombre)
        )
        for fila in await self._sesion.execute(consulta):
            equipos[fila.version_id].append(
                Equipo(id=fila.id, nombre=fila.nombre, descripcion=fila.descripcion)
            )
        return equipos

    async def _dispositivos(
        self, versiones: list[UUID]
    ) -> dict[UUID, list[Dispositivo]]:
        dispositivos: dict[UUID, list[Dispositivo]] = defaultdict(list)
        consulta = (
            select(
                TecnicaVersionDispositivoMedico.version_id,
                DispositivoMedico.id,
                DispositivoMedico.nombre,
                DispositivoMedico.descripcion,
            )
            .join(
                TecnicaVersionDispositivoMedico,
                TecnicaVersionDispositivoMedico.dispositivo_id == DispositivoMedico.id,
            )
            .where(TecnicaVersionDispositivoMedico.version_id.in_(versiones))
            .order_by(DispositivoMedico.nombre)
        )
        for fila in await self._sesion.execute(consulta):
            dispositivos[fila.version_id].append(
                Dispositivo(
                    id=fila.id, nombre=fila.nombre, descripcion=fila.descripcion
                )
            )
        return dispositivos
