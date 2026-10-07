import pytest

from app.adaptadores.salida.persistencia.modelos.catalogo import (
    CategoriaInstrumental,
    Instrumental,
    InstrumentalAlias,
)
from app.adaptadores.salida.persistencia.repositorios.catalogo import (
    RepositorioCatalogoSQLAlchemy,
)
from app.dominio.catalogo import Instrumento


@pytest.mark.anyio
async def test_listar_instrumental_trae_categoria_y_alias(sesion):
    categoria = CategoriaInstrumental(nombre="Categoría de prueba")
    sesion.add(categoria)
    await sesion.flush()
    pinza = Instrumental(
        nombre="Pinza de prueba", categoria_id=categoria.id, descripcion="Sujeta"
    )
    tijera = Instrumental(nombre="Tijera de prueba", categoria_id=categoria.id)
    sesion.add_all([pinza, tijera])
    await sesion.flush()
    sesion.add_all(
        [
            InstrumentalAlias(instrumental_id=pinza.id, alias="Pinzas de prueba"),
            InstrumentalAlias(instrumental_id=pinza.id, alias="Pinza prueba"),
        ]
    )
    await sesion.flush()

    repositorio = RepositorioCatalogoSQLAlchemy(sesion)

    assert await repositorio.listar_instrumental() == [
        Instrumento(
            id=pinza.id,
            nombre="Pinza de prueba",
            categoria="Categoría de prueba",
            descripcion="Sujeta",
            alias=("Pinza prueba", "Pinzas de prueba"),
        ),
        Instrumento(
            id=tijera.id,
            nombre="Tijera de prueba",
            categoria="Categoría de prueba",
            descripcion=None,
            alias=(),
        ),
    ]
