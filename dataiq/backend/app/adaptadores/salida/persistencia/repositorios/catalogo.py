from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adaptadores.salida.persistencia.modelos.catalogo import (
    CategoriaInstrumental,
    DispositivoMedico,
    EquipoBiomedico,
    Instrumental,
    InstrumentalAlias,
    Sutura,
)
from app.adaptadores.salida.persistencia.modelos.tecnicas import Especialidad, Zona
from app.dominio.catalogo import (
    CambiosInstrumento,
    Instrumento,
    Referencia,
    SuturaCatalogo,
)
from app.dominio.errores import Conflicto, NoEncontrado
from app.dominio.tecnicas import Dispositivo, Equipo


class RepositorioCatalogoSQLAlchemy:
    def __init__(self, sesion: AsyncSession) -> None:
        self._sesion = sesion

    async def listar_instrumental(
        self, instrumento_id: UUID | None = None
    ) -> list[Instrumento]:
        alias: dict[UUID, list[str]] = defaultdict(list)
        consulta_alias = select(
            InstrumentalAlias.instrumental_id, InstrumentalAlias.alias
        ).order_by(InstrumentalAlias.alias)
        if instrumento_id is not None:
            consulta_alias = consulta_alias.where(
                InstrumentalAlias.instrumental_id == instrumento_id
            )
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
        if instrumento_id is not None:
            consulta = consulta.where(Instrumental.id == instrumento_id)
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

    async def obtener_instrumento(self, instrumento_id: UUID) -> Instrumento | None:
        encontrados = await self.listar_instrumental(instrumento_id)
        return encontrados[0] if encontrados else None

    async def crear_instrumento(
        self, nombre: str, categoria_id: UUID, descripcion: str | None
    ) -> Instrumento:
        await self._validar_instrumento(nombre, categoria_id)
        instrumento = Instrumental(
            nombre=nombre, categoria_id=categoria_id, descripcion=descripcion
        )
        self._sesion.add(instrumento)
        await self._sesion.flush()
        instrumento_id = instrumento.id
        await self._sesion.commit()
        return await self.obtener_instrumento(instrumento_id)

    async def editar_instrumento(
        self, instrumento_id: UUID, cambios: CambiosInstrumento
    ) -> Instrumento:
        instrumento = await self._sesion.get(
            Instrumental, instrumento_id, with_for_update=True
        )
        if instrumento is None:
            raise NoEncontrado("El instrumento no existe")
        await self._validar_instrumento(
            cambios.nombre, cambios.categoria_id, excepto=instrumento_id
        )
        if cambios.nombre is not None:
            instrumento.nombre = cambios.nombre
        if cambios.categoria_id is not None:
            instrumento.categoria_id = cambios.categoria_id
        if cambios.descripcion is not None:
            instrumento.descripcion = cambios.descripcion
        await self._sesion.flush()
        await self._sesion.commit()
        return await self.obtener_instrumento(instrumento_id)

    async def _validar_instrumento(
        self,
        nombre: str | None,
        categoria_id: UUID | None,
        excepto: UUID | None = None,
    ) -> None:
        if categoria_id is not None and not await self._sesion.get(
            CategoriaInstrumental, categoria_id
        ):
            raise NoEncontrado("La categoría no existe")
        if nombre is not None:
            consulta = select(Instrumental.id).where(Instrumental.nombre == nombre)
            if excepto is not None:
                consulta = consulta.where(Instrumental.id != excepto)
            if await self._sesion.scalar(consulta):
                raise Conflicto("Ya hay un instrumento con ese nombre")

    async def _referencias(self, modelo) -> list[Referencia]:
        filas = await self._sesion.execute(
            select(modelo.id, modelo.nombre).order_by(modelo.nombre)
        )
        return [Referencia(id=f.id, nombre=f.nombre) for f in filas]

    async def listar_especialidades(self) -> list[Referencia]:
        return await self._referencias(Especialidad)

    async def listar_zonas(self) -> list[Referencia]:
        return await self._referencias(Zona)

    async def listar_categorias(self) -> list[Referencia]:
        return await self._referencias(CategoriaInstrumental)

    async def listar_suturas(self) -> list[SuturaCatalogo]:
        filas = await self._sesion.execute(
            select(
                Sutura.id, Sutura.nombre, Sutura.calibre, Sutura.tipo_aguja
            ).order_by(Sutura.nombre, Sutura.calibre, Sutura.tipo_aguja, Sutura.id)
        )
        return [SuturaCatalogo(**f._mapping) for f in filas]

    async def listar_equipos(self) -> list[Equipo]:
        filas = await self._sesion.execute(
            select(
                EquipoBiomedico.id, EquipoBiomedico.nombre, EquipoBiomedico.descripcion
            ).order_by(EquipoBiomedico.nombre)
        )
        return [Equipo(**f._mapping) for f in filas]

    async def listar_dispositivos(self) -> list[Dispositivo]:
        filas = await self._sesion.execute(
            select(
                DispositivoMedico.id,
                DispositivoMedico.nombre,
                DispositivoMedico.descripcion,
            ).order_by(DispositivoMedico.nombre)
        )
        return [Dispositivo(**f._mapping) for f in filas]
