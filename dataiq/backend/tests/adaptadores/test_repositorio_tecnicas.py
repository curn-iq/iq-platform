import uuid
from datetime import UTC, datetime

import pytest

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Tecnica,
    TecnicaVersion,
)
from app.adaptadores.salida.persistencia.repositorios.tecnicas import (
    RepositorioTecnicasSQLAlchemy,
)
from app.dominio.tecnicas import EstadoVersion, TecnicaDetalle, TecnicaResumen


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
