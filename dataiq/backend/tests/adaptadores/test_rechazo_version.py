import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.adaptadores.salida.persistencia.modelos.tecnicas import (
    RechazoVersion,
    Tecnica,
    TecnicaVersion,
)
from app.dominio.tecnicas import EstadoVersion


async def guardar_version_en_revision(sesion, especialidad, autor) -> TecnicaVersion:
    tecnica = Tecnica(
        nombre="Técnica", especialidad_id=especialidad.id, creado_por=autor.id
    )
    sesion.add(tecnica)
    await sesion.flush()
    version = TecnicaVersion(
        tecnica_id=tecnica.id,
        numero=1,
        estado=EstadoVersion.en_revision,
        creado_por=autor.id,
    )
    sesion.add(version)
    await sesion.flush()
    return version


@pytest.mark.anyio
async def test_una_version_guarda_varios_rechazos(sesion, autor, revisor, especialidad):
    version = await guardar_version_en_revision(sesion, especialidad, autor)
    sesion.add_all(
        [
            RechazoVersion(
                version_id=version.id, rechazado_por=revisor.id, motivo="Falta X"
            ),
            RechazoVersion(
                version_id=version.id, rechazado_por=revisor.id, motivo="Falta Y"
            ),
        ]
    )
    await sesion.flush()

    cantidad = await sesion.scalar(
        select(func.count())
        .select_from(RechazoVersion)
        .where(RechazoVersion.version_id == version.id)
    )
    assert cantidad == 2


@pytest.mark.anyio
@pytest.mark.parametrize("motivo", ["", "   "])
async def test_un_rechazo_sin_motivo_no_se_guarda(
    sesion, autor, revisor, especialidad, motivo
):
    version = await guardar_version_en_revision(sesion, especialidad, autor)
    sesion.add(
        RechazoVersion(version_id=version.id, rechazado_por=revisor.id, motivo=motivo)
    )

    with pytest.raises(IntegrityError, match="motivo_no_vacio"):
        await sesion.flush()
