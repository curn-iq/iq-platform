from datetime import UTC, datetime

import pytest

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    Tecnica,
    TecnicaVersion,
)
from app.dominio.tecnicas import EstadoVersion


async def guardar_publicada(sesion, nombre, especialidad, autor, revisor) -> Tecnica:
    tecnica = Tecnica(
        nombre=nombre, especialidad_id=especialidad.id, creado_por=autor.id
    )
    sesion.add(tecnica)
    await sesion.flush()
    sesion.add(
        TecnicaVersion(
            tecnica_id=tecnica.id,
            numero=1,
            estado=EstadoVersion.publicada,
            creado_por=autor.id,
            revisado_por=revisor.id,
            fecha_revision=datetime.now(UTC),
        )
    )
    await sesion.flush()
    return tecnica


@pytest.mark.anyio
async def test_listar_tecnicas_devuelve_las_publicadas(
    cliente, sesion, autor, revisor, especialidad
):
    tecnica = await guardar_publicada(sesion, "Técnica", especialidad, autor, revisor)

    respuesta = await cliente.get("/tecnicas")

    assert respuesta.status_code == 200
    assert respuesta.json() == [
        {
            "id": str(tecnica.id),
            "nombre": "Técnica",
            "especialidad": "Especialidad de prueba",
            "numero_version": 1,
        }
    ]
    assert respuesta.headers["cache-control"] == "public, max-age=60"
    assert respuesta.headers["etag"]


@pytest.mark.anyio
async def test_listar_tecnicas_responde_304_si_no_cambio(
    cliente, sesion, autor, revisor, especialidad
):
    await guardar_publicada(sesion, "Técnica", especialidad, autor, revisor)
    primera = await cliente.get("/tecnicas")

    segunda = await cliente.get(
        "/tecnicas", headers={"If-None-Match": primera.headers["etag"]}
    )

    assert segunda.status_code == 304
    assert segunda.content == b""


@pytest.mark.anyio
async def test_listar_tecnicas_cambia_el_etag_si_cambian_los_datos(
    cliente, sesion, autor, revisor, especialidad
):
    await guardar_publicada(sesion, "Técnica", especialidad, autor, revisor)
    antes = await cliente.get("/tecnicas")
    await guardar_publicada(sesion, "Otra técnica", especialidad, autor, revisor)

    despues = await cliente.get(
        "/tecnicas", headers={"If-None-Match": antes.headers["etag"]}
    )

    assert despues.status_code == 200
    assert len(despues.json()) == 2
