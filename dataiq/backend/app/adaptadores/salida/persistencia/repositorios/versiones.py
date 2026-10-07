from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import delete, func, insert, literal, select, update
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
    RechazoVersion,
    Tecnica,
    TecnicaVersion,
    TecnicaVersionDispositivoMedico,
    TecnicaVersionEquipoBiomedico,
    TecnicaVersionSutura,
    Zona,
)
from app.adaptadores.salida.persistencia.modelos.usuarios import Usuario
from app.adaptadores.salida.persistencia.repositorios.tecnicas import armar_detalles
from app.dominio.errores import Conflicto, ContenidoInvalido, NoEncontrado
from app.dominio.tecnicas import (
    EN_CURSO,
    ContenidoVersion,
    EstadoVersion,
    Rechazo,
    VersionDetalle,
    VersionResumen,
)

CAMPOS_CLINICOS = (
    "codigo_cups",
    "anestesia",
    "posicion_paciente",
    "ropa",
    "descripcion",
    "indicaciones",
    "complicaciones",
    "tecnica_quirurgica",
    "fuente",
)


class RepositorioVersionesSQLAlchemy:
    def __init__(self, sesion: AsyncSession) -> None:
        self._sesion = sesion

    # --- Lectura ---------------------------------------------------------

    def _consulta_resumen(self):
        return (
            select(
                TecnicaVersion.id,
                TecnicaVersion.tecnica_id,
                Tecnica.nombre.label("tecnica"),
                Especialidad.nombre.label("especialidad"),
                TecnicaVersion.numero,
                TecnicaVersion.estado,
                TecnicaVersion.creado_por,
                Usuario.nombre.label("autor"),
                TecnicaVersion.fecha_actualizacion,
            )
            .join(Tecnica, Tecnica.id == TecnicaVersion.tecnica_id)
            .join(Especialidad, Especialidad.id == Tecnica.especialidad_id)
            .join(Usuario, Usuario.id == TecnicaVersion.creado_por)
        )

    async def listar(
        self, estados: Iterable[EstadoVersion], creado_por: UUID | None = None
    ) -> list[VersionResumen]:
        consulta = (
            self._consulta_resumen()
            .where(TecnicaVersion.estado.in_(list(estados)))
            .order_by(TecnicaVersion.fecha_actualizacion.desc())
        )
        if creado_por is not None:
            consulta = consulta.where(TecnicaVersion.creado_por == creado_por)
        return [
            VersionResumen(**fila._mapping)
            for fila in await self._sesion.execute(consulta)
        ]

    async def obtener_resumen(self, version_id: UUID) -> VersionResumen | None:
        consulta = self._consulta_resumen().where(TecnicaVersion.id == version_id)
        fila = (await self._sesion.execute(consulta)).one_or_none()
        return VersionResumen(**fila._mapping) if fila else None

    async def obtener(self, version_id: UUID) -> VersionDetalle | None:
        resumen = await self.obtener_resumen(version_id)
        if resumen is None:
            return None
        [contenido] = await armar_detalles(
            self._sesion, TecnicaVersion.id == version_id
        )
        consulta_rechazos = (
            select(
                RechazoVersion.motivo,
                Usuario.nombre.label("rechazado_por"),
                RechazoVersion.fecha,
            )
            .join(Usuario, Usuario.id == RechazoVersion.rechazado_por)
            .where(RechazoVersion.version_id == version_id)
            .order_by(RechazoVersion.fecha.desc())
        )
        rechazos = tuple(
            Rechazo(**fila._mapping)
            for fila in await self._sesion.execute(consulta_rechazos)
        )
        return VersionDetalle(resumen=resumen, contenido=contenido, rechazos=rechazos)

    async def obtener_publicada_de(self, tecnica_id: UUID) -> VersionResumen | None:
        consulta = self._consulta_resumen().where(
            TecnicaVersion.tecnica_id == tecnica_id,
            TecnicaVersion.estado == EstadoVersion.publicada,
        )
        fila = (await self._sesion.execute(consulta)).one_or_none()
        return VersionResumen(**fila._mapping) if fila else None

    async def tiene_version_en_curso(self, tecnica_id: UUID) -> bool:
        consulta = select(TecnicaVersion.id).where(
            TecnicaVersion.tecnica_id == tecnica_id,
            TecnicaVersion.estado.in_(EN_CURSO),
        )
        return (await self._sesion.scalar(consulta)) is not None

    # --- Crear -----------------------------------------------------------

    async def crear_tecnica(
        self, nombre: str, especialidad_id: UUID, autor_id: UUID
    ) -> UUID:
        """Crea la técnica con su versión 1 en borrador; devuelve el id de esta."""
        if await self._sesion.get(Especialidad, especialidad_id) is None:
            raise NoEncontrado("La especialidad no existe")
        repetida = await self._sesion.scalar(
            select(Tecnica.id).where(
                Tecnica.nombre == nombre, Tecnica.especialidad_id == especialidad_id
            )
        )
        if repetida:
            raise Conflicto("Ya hay una técnica con ese nombre en la especialidad")
        tecnica = Tecnica(
            nombre=nombre, especialidad_id=especialidad_id, creado_por=autor_id
        )
        self._sesion.add(tecnica)
        await self._sesion.flush()
        version = TecnicaVersion(tecnica_id=tecnica.id, numero=1, creado_por=autor_id)
        self._sesion.add(version)
        await self._sesion.flush()
        version_id = version.id
        await self._sesion.commit()
        return version_id

    async def crear_desde_publicada(self, tecnica_id: UUID, autor_id: UUID) -> UUID:
        """Copia la versión publicada en una versión nueva en borrador."""
        publicada = (
            await self._sesion.execute(
                select(TecnicaVersion)
                .where(
                    TecnicaVersion.tecnica_id == tecnica_id,
                    TecnicaVersion.estado == EstadoVersion.publicada,
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if publicada is None:
            raise NoEncontrado("La técnica no tiene una versión publicada")
        if await self.tiene_version_en_curso(tecnica_id):
            raise Conflicto("La técnica ya tiene una versión en curso")
        ultimo = await self._sesion.scalar(
            select(func.max(TecnicaVersion.numero)).where(
                TecnicaVersion.tecnica_id == tecnica_id
            )
        )
        nueva = TecnicaVersion(
            tecnica_id=tecnica_id,
            numero=ultimo + 1,
            creado_por=autor_id,
            **{campo: getattr(publicada, campo) for campo in CAMPOS_CLINICOS},
        )
        self._sesion.add(nueva)
        await self._sesion.flush()
        nueva_id = nueva.id
        await self._copiar_contenido(publicada.id, nueva_id)
        await self._sesion.commit()
        return nueva_id

    async def _copiar_contenido(self, desde: UUID, hacia: UUID) -> None:
        items = (
            await self._sesion.scalars(
                select(ItemTecnica).where(ItemTecnica.version_id == desde)
            )
        ).all()
        nuevos = {}
        for item in items:
            nuevos[item.id] = ItemTecnica(
                version_id=hacia,
                zona_id=item.zona_id,
                numero_leyenda=item.numero_leyenda,
                texto_fuente=item.texto_fuente,
            )
        self._sesion.add_all(nuevos.values())
        await self._sesion.flush()

        componentes = await self._sesion.scalars(
            select(ItemTecnicaComponente)
            .where(ItemTecnicaComponente.item_id.in_(nuevos.keys()))
            .order_by(ItemTecnicaComponente.id)
        )
        self._sesion.add_all(
            ItemTecnicaComponente(
                item_id=nuevos[c.item_id].id,
                instrumental_id=c.instrumental_id,
                sutura_id=c.sutura_id,
            )
            for c in componentes
        )
        posiciones = await self._sesion.scalars(
            select(PosicionMesa).where(PosicionMesa.version_id == desde)
        )
        self._sesion.add_all(
            PosicionMesa(
                item_id=nuevos[p.item_id].id,
                version_id=hacia,
                zona_id=p.zona_id,
                fila=p.fila,
                columna=p.columna,
            )
            for p in posiciones
        )
        for tabla, columnas in (
            (TecnicaVersionSutura, ("sutura_id", "uso")),
            (TecnicaVersionEquipoBiomedico, ("equipo_id",)),
            (TecnicaVersionDispositivoMedico, ("dispositivo_id",)),
        ):
            origen = select(
                literal(hacia, TecnicaVersion.id.type).label("version_id"),
                *(getattr(tabla, c) for c in columnas),
            ).where(tabla.version_id == desde)
            await self._sesion.execute(
                insert(tabla).from_select(["version_id", *columnas], origen)
            )
        await self._sesion.flush()

    # --- Editar un borrador ----------------------------------------------

    async def reemplazar_contenido(
        self, version_id: UUID, contenido: ContenidoVersion
    ) -> None:
        version = await self._bloquear(version_id)
        if version.estado != EstadoVersion.borrador:
            raise Conflicto("Solo se puede editar una versión en borrador")
        await self._validar_referencias(contenido)

        for campo in CAMPOS_CLINICOS:
            setattr(version, campo, getattr(contenido, campo))
        version.fecha_actualizacion = func.now()

        await self._borrar_contenido(version_id)
        items = []
        for item in contenido.items:
            fila = ItemTecnica(
                version_id=version_id,
                zona_id=item.zona_id,
                numero_leyenda=item.numero_leyenda,
                texto_fuente=item.texto_fuente,
            )
            items.append((item, fila))
        self._sesion.add_all(fila for _, fila in items)
        await self._sesion.flush()
        for item, fila in items:
            self._sesion.add_all(
                ItemTecnicaComponente(
                    item_id=fila.id,
                    instrumental_id=c.instrumental_id,
                    sutura_id=c.sutura_id,
                )
                for c in item.componentes
            )
            self._sesion.add_all(
                PosicionMesa(
                    item_id=fila.id,
                    version_id=version_id,
                    zona_id=item.zona_id,
                    fila=celda.fila,
                    columna=celda.columna,
                )
                for celda in set(item.celdas)
            )

        for sutura in contenido.suturas:
            sutura_id = await self._sutura(
                sutura.nombre, sutura.calibre, sutura.tipo_aguja
            )
            self._sesion.add(
                TecnicaVersionSutura(
                    version_id=version_id, sutura_id=sutura_id, uso=sutura.uso
                )
            )
        for nombre in contenido.equipos:
            equipo_id = await self._por_nombre(EquipoBiomedico, nombre)
            self._sesion.add(
                TecnicaVersionEquipoBiomedico(
                    version_id=version_id, equipo_id=equipo_id
                )
            )
        for nombre in contenido.dispositivos:
            dispositivo_id = await self._por_nombre(DispositivoMedico, nombre)
            self._sesion.add(
                TecnicaVersionDispositivoMedico(
                    version_id=version_id, dispositivo_id=dispositivo_id
                )
            )
        await self._sesion.flush()
        await self._sesion.commit()

    async def _validar_referencias(self, contenido: ContenidoVersion) -> None:
        problemas = []
        buscados = (
            (Zona, {i.zona_id for i in contenido.items}, "la mesa"),
            (
                Instrumental,
                {c.instrumental_id for i in contenido.items for c in i.componentes},
                "el instrumento",
            ),
            (
                Sutura,
                {c.sutura_id for i in contenido.items for c in i.componentes},
                "la sutura",
            ),
        )
        for modelo, ids, nombre in buscados:
            ids.discard(None)
            if not ids:
                continue
            existen = set(
                await self._sesion.scalars(select(modelo.id).where(modelo.id.in_(ids)))
            )
            for faltante in ids - existen:
                problemas.append(f"No existe {nombre} {faltante}")
        if problemas:
            raise ContenidoInvalido(problemas)

    async def _borrar_contenido(self, version_id: UUID) -> None:
        items = select(ItemTecnica.id).where(ItemTecnica.version_id == version_id)
        await self._sesion.execute(
            delete(PosicionMesa).where(PosicionMesa.version_id == version_id)
        )
        await self._sesion.execute(
            delete(ItemTecnicaComponente).where(
                ItemTecnicaComponente.item_id.in_(items)
            )
        )
        await self._sesion.execute(
            delete(ItemTecnica).where(ItemTecnica.version_id == version_id)
        )
        for tabla in (
            TecnicaVersionSutura,
            TecnicaVersionEquipoBiomedico,
            TecnicaVersionDispositivoMedico,
        ):
            await self._sesion.execute(
                delete(tabla).where(tabla.version_id == version_id)
            )

    async def _sutura(
        self, nombre: str, calibre: str | None, tipo_aguja: str | None
    ) -> UUID:
        existente = await self._sesion.scalar(
            select(Sutura.id).where(
                Sutura.nombre == nombre,
                Sutura.calibre.is_not_distinct_from(calibre),
                Sutura.tipo_aguja.is_not_distinct_from(tipo_aguja),
            )
        )
        if existente:
            return existente
        sutura = Sutura(nombre=nombre, calibre=calibre, tipo_aguja=tipo_aguja)
        self._sesion.add(sutura)
        await self._sesion.flush()
        return sutura.id

    async def _por_nombre(self, modelo, nombre: str) -> UUID:
        existente = await self._sesion.scalar(
            select(modelo.id).where(modelo.nombre == nombre)
        )
        if existente:
            return existente
        nuevo = modelo(nombre=nombre)
        self._sesion.add(nuevo)
        await self._sesion.flush()
        return nuevo.id

    # --- Cambios de estado -----------------------------------------------

    async def _bloquear(self, version_id: UUID) -> TecnicaVersion:
        # FOR UPDATE: si dos personas cambian la misma versión a la vez, la
        # segunda espera a la primera y luego ve el estado ya cambiado.
        version = (
            await self._sesion.execute(
                select(TecnicaVersion)
                .where(TecnicaVersion.id == version_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if version is None:
            raise NoEncontrado("La versión no existe")
        return version

    async def cambiar_estado(
        self,
        version_id: UUID,
        desde: EstadoVersion,
        hacia: EstadoVersion,
        revisor_id: UUID | None = None,
    ) -> None:
        version = await self._bloquear(version_id)
        if version.estado != desde:
            raise Conflicto(
                f"La versión ya no está en {desde}: ahora está en {version.estado}"
            )
        if hacia == EstadoVersion.publicada:
            # Primero la publicada anterior pasa a reemplazada: el índice
            # una_publicada_por_tecnica no deja dos publicadas a la vez.
            await self._sesion.execute(
                update(TecnicaVersion)
                .where(
                    TecnicaVersion.tecnica_id == version.tecnica_id,
                    TecnicaVersion.estado == EstadoVersion.publicada,
                )
                .values(
                    estado=EstadoVersion.reemplazada,
                    fecha_actualizacion=func.now(),
                )
            )
            version.revisado_por = revisor_id
            version.fecha_revision = func.now()
        version.estado = hacia
        version.fecha_actualizacion = func.now()
        await self._sesion.flush()
        await self._sesion.commit()

    async def rechazar(self, version_id: UUID, revisor_id: UUID, motivo: str) -> None:
        version = await self._bloquear(version_id)
        if version.estado != EstadoVersion.en_revision:
            raise Conflicto(
                f"La versión ya no está en revisión: ahora está en {version.estado}"
            )
        version.estado = EstadoVersion.borrador
        version.fecha_actualizacion = func.now()
        self._sesion.add(
            RechazoVersion(
                version_id=version_id, rechazado_por=revisor_id, motivo=motivo
            )
        )
        await self._sesion.flush()
        await self._sesion.commit()
