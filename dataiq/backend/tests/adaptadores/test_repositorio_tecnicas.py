from datetime import UTC, datetime

import pytest

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Especialidad,
    Tecnica,
    TecnicaVersion,
)
from app.adaptadores.salida.persistencia.modelos.usuarios import Usuario
from app.adaptadores.salida.persistencia.repositorios.tecnicas import (
    RepositorioTecnicasSQLAlchemy,
)
from app.dominio.tecnicas import EstadoVersion, TecnicaResumen


def crear_usuario(nombre: str, email: str) -> Usuario:
    return Usuario(
        nombre=nombre,
        email=email,
        password_hash="no-importa-en-este-test",
        fecha_aceptacion_politica=datetime.now(UTC),
        version_politica="1.0",
    )


@pytest.mark.anyio
async def test_listar_publicadas_devuelve_solo_las_publicadas(sesion):
    autor = crear_usuario("Autor", "autor@prueba.com")
    revisor = crear_usuario("Revisor", "revisor@prueba.com")
    especialidad = Especialidad(nombre="Especialidad de prueba")
    sesion.add_all([autor, revisor, especialidad])
    await sesion.flush()

    publicada = Tecnica(
        nombre="Técnica publicada",
        especialidad_id=especialidad.id,
        creado_por=autor.id,
    )
    en_borrador = Tecnica(
        nombre="Técnica en borrador",
        especialidad_id=especialidad.id,
        creado_por=autor.id,
    )
    sesion.add_all([publicada, en_borrador])
    await sesion.flush()

    sesion.add_all(
        [
            TecnicaVersion(
                tecnica_id=publicada.id,
                numero=1,
                estado=EstadoVersion.publicada,
                creado_por=autor.id,
                revisado_por=revisor.id,
                fecha_revision=datetime.now(UTC),
            ),
            TecnicaVersion(
                tecnica_id=en_borrador.id,
                numero=1,
                creado_por=autor.id,
            ),
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
