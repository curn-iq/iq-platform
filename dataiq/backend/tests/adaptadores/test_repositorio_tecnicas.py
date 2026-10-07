import uuid
from datetime import UTC, datetime

import pytest

from app.adaptadores.salida.persistencia.modelos.catalogo import (
    CategoriaInstrumental,
    DispositivoMedico,
    EquipoBiomedico,
    Instrumental,
    Sutura,
)
from app.adaptadores.salida.persistencia.modelos.tecnicas import (
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
from app.adaptadores.salida.persistencia.repositorios.tecnicas import (
    RepositorioTecnicasSQLAlchemy,
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


async def guardar_tecnica(sesion, nombre, especialidad, autor) -> Tecnica:
    tecnica = Tecnica(
        nombre=nombre, especialidad_id=especialidad.id, creado_por=autor.id
    )
    sesion.add(tecnica)
    await sesion.flush()
    return tecnica


def version_revisada(tecnica, numero, estado, autor, revisor, **datos):
    return TecnicaVersion(
        tecnica_id=tecnica.id,
        numero=numero,
        estado=estado,
        creado_por=autor.id,
        revisado_por=revisor.id,
        fecha_revision=datetime.now(UTC),
        **datos,
    )


def version_en_borrador(tecnica, numero, autor):
    return TecnicaVersion(tecnica_id=tecnica.id, numero=numero, creado_por=autor.id)


@pytest.mark.anyio
async def test_listar_publicadas_devuelve_solo_las_publicadas(
    sesion, autor, revisor, especialidad
):
    publicada = await guardar_tecnica(sesion, "Técnica publicada", especialidad, autor)
    en_borrador = await guardar_tecnica(
        sesion, "Técnica en borrador", especialidad, autor
    )
    sesion.add_all(
        [
            version_revisada(publicada, 1, EstadoVersion.publicada, autor, revisor),
            version_en_borrador(en_borrador, 1, autor),
        ]
    )
    await sesion.flush()

    repositorio = RepositorioTecnicasSQLAlchemy(sesion)
    resultado = await repositorio.listar_publicadas()

    assert resultado == [
        TecnicaResumen(
            id=publicada.id,
            nombre="Técnica publicada",
            especialidad="Especialidad de prueba",
            numero_version=1,
        )
    ]


@pytest.mark.anyio
async def test_obtener_publicada_devuelve_la_version_publicada(
    sesion, autor, revisor, especialidad
):
    tecnica = await guardar_tecnica(sesion, "Técnica", especialidad, autor)
    sesion.add_all(
        [
            version_revisada(
                tecnica,
                1,
                EstadoVersion.reemplazada,
                autor,
                revisor,
                anestesia="Anestesia de la v1",
            ),
            version_revisada(
                tecnica,
                2,
                EstadoVersion.publicada,
                autor,
                revisor,
                codigo_cups="000000",
                anestesia="Anestesia de la v2",
            ),
            version_en_borrador(tecnica, 3, autor),
        ]
    )
    await sesion.flush()

    repositorio = RepositorioTecnicasSQLAlchemy(sesion)
    resultado = await repositorio.obtener_publicada(tecnica.id)

    assert resultado == TecnicaDetalle(
        id=tecnica.id,
        nombre="Técnica",
        especialidad="Especialidad de prueba",
        numero_version=2,
        codigo_cups="000000",
        anestesia="Anestesia de la v2",
        posicion_paciente=None,
        ropa=None,
        descripcion=None,
        indicaciones=None,
        complicaciones=None,
        tecnica_quirurgica=None,
        fuente=None,
        items=(),
        suturas=(),
        equipos=(),
        dispositivos=(),
    )


@pytest.mark.anyio
async def test_obtener_publicada_devuelve_none_si_solo_hay_borrador(
    sesion, autor, especialidad
):
    tecnica = await guardar_tecnica(sesion, "Técnica", especialidad, autor)
    sesion.add(version_en_borrador(tecnica, 1, autor))
    await sesion.flush()

    repositorio = RepositorioTecnicasSQLAlchemy(sesion)

    assert await repositorio.obtener_publicada(tecnica.id) is None


@pytest.mark.anyio
async def test_obtener_publicada_devuelve_none_si_la_tecnica_no_existe(sesion):
    repositorio = RepositorioTecnicasSQLAlchemy(sesion)

    assert await repositorio.obtener_publicada(uuid.uuid7()) is None


@pytest.mark.anyio
async def test_obtener_publicada_trae_objetos_mesas_y_elementos_de_la_version(
    sesion, autor, revisor, especialidad
):
    tecnica = await guardar_tecnica(sesion, "Técnica", especialidad, autor)
    v1 = version_revisada(tecnica, 1, EstadoVersion.reemplazada, autor, revisor)
    v2 = version_revisada(tecnica, 2, EstadoVersion.publicada, autor, revisor)
    categoria = CategoriaInstrumental(nombre="Categoría de prueba")
    mayo = Zona(nombre="Mesa de prueba")
    sesion.add_all([v1, v2, categoria, mayo])
    await sesion.flush()

    pinza = Instrumental(nombre="Pinza de prueba", categoria_id=categoria.id)
    tijera = Instrumental(nombre="Tijera de prueba", categoria_id=categoria.id)
    sutura = Sutura(nombre="Sutura de prueba", calibre="3/0")
    equipo = EquipoBiomedico(nombre="Equipo de prueba")
    dispositivo = DispositivoMedico(nombre="Dispositivo de prueba", descripcion="D")
    compuesto = ItemTecnica(
        version_id=v2.id,
        zona_id=mayo.id,
        numero_leyenda=1,
        texto_fuente="Pinza con sutura",
    )
    solo_listado = ItemTecnica(version_id=v2.id, texto_fuente="Tijera")
    de_otra_version = ItemTecnica(
        version_id=v1.id, zona_id=mayo.id, numero_leyenda=1, texto_fuente="Viejo"
    )
    sesion.add_all(
        [pinza, tijera, sutura, equipo, dispositivo, compuesto, solo_listado]
    )
    sesion.add(de_otra_version)
    await sesion.flush()

    sesion.add_all(
        [
            ItemTecnicaComponente(item_id=compuesto.id, instrumental_id=pinza.id),
            ItemTecnicaComponente(item_id=solo_listado.id, instrumental_id=tijera.id),
            ItemTecnicaComponente(item_id=de_otra_version.id, instrumental_id=pinza.id),
            PosicionMesa(
                item_id=compuesto.id,
                version_id=v2.id,
                zona_id=mayo.id,
                fila=2,
                columna=1,
            ),
            PosicionMesa(
                item_id=compuesto.id,
                version_id=v2.id,
                zona_id=mayo.id,
                fila=1,
                columna=1,
            ),
            PosicionMesa(
                item_id=de_otra_version.id,
                version_id=v1.id,
                zona_id=mayo.id,
                fila=1,
                columna=1,
            ),
            TecnicaVersionSutura(version_id=v2.id, sutura_id=sutura.id, uso="Piel"),
            TecnicaVersionEquipoBiomedico(version_id=v2.id, equipo_id=equipo.id),
            TecnicaVersionDispositivoMedico(
                version_id=v2.id, dispositivo_id=dispositivo.id
            ),
        ]
    )
    await sesion.flush()
    # El segundo componente va después del primero (los ids UUIDv7 crecen).
    sesion.add(ItemTecnicaComponente(item_id=compuesto.id, sutura_id=sutura.id))
    await sesion.flush()

    repositorio = RepositorioTecnicasSQLAlchemy(sesion)
    resultado = await repositorio.obtener_publicada(tecnica.id)

    assert resultado.items == (
        ItemDetalle(
            id=compuesto.id,
            zona="Mesa de prueba",
            numero_leyenda=1,
            texto_fuente="Pinza con sutura",
            componentes=(
                ComponenteItem(
                    instrumental_id=pinza.id, sutura_id=None, nombre="Pinza de prueba"
                ),
                ComponenteItem(
                    instrumental_id=None, sutura_id=sutura.id, nombre="Sutura de prueba"
                ),
            ),
            celdas=(Celda(fila=1, columna=1), Celda(fila=2, columna=1)),
        ),
        ItemDetalle(
            id=solo_listado.id,
            zona=None,
            numero_leyenda=None,
            texto_fuente="Tijera",
            componentes=(
                ComponenteItem(
                    instrumental_id=tijera.id, sutura_id=None, nombre="Tijera de prueba"
                ),
            ),
            celdas=(),
        ),
    )
    assert resultado.suturas == (
        SuturaDetalle(
            id=sutura.id,
            nombre="Sutura de prueba",
            calibre="3/0",
            tipo_aguja=None,
            uso="Piel",
        ),
    )
    assert resultado.equipos == (
        Equipo(id=equipo.id, nombre="Equipo de prueba", descripcion=None),
    )
    assert resultado.dispositivos == (
        Dispositivo(id=dispositivo.id, nombre="Dispositivo de prueba", descripcion="D"),
    )


@pytest.mark.anyio
async def test_listar_detalles_publicadas_reparte_los_objetos_por_tecnica(
    sesion, autor, revisor, especialidad
):
    primera = await guardar_tecnica(sesion, "A técnica", especialidad, autor)
    segunda = await guardar_tecnica(sesion, "B técnica", especialidad, autor)
    en_borrador = await guardar_tecnica(sesion, "C técnica", especialidad, autor)
    v_primera = version_revisada(primera, 1, EstadoVersion.publicada, autor, revisor)
    v_segunda = version_revisada(segunda, 1, EstadoVersion.publicada, autor, revisor)
    v_borrador = version_en_borrador(en_borrador, 1, autor)
    sesion.add_all([v_primera, v_segunda, v_borrador])
    await sesion.flush()
    sesion.add_all(
        [
            ItemTecnica(version_id=v_primera.id, texto_fuente="De la primera"),
            ItemTecnica(version_id=v_borrador.id, texto_fuente="Del borrador"),
        ]
    )
    await sesion.flush()

    repositorio = RepositorioTecnicasSQLAlchemy(sesion)
    resultado = await repositorio.listar_detalles_publicadas()

    assert [t.nombre for t in resultado] == ["A técnica", "B técnica"]
    assert [i.texto_fuente for i in resultado[0].items] == ["De la primera"]
    assert resultado[1].items == ()
    assert resultado == [
        await repositorio.obtener_publicada(primera.id),
        await repositorio.obtener_publicada(segunda.id),
    ]
