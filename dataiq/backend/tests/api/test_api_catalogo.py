import pytest

from tests.conftest import cabeceras


@pytest.mark.anyio
async def test_el_catalogo_completo_pide_cuenta_y_trae_todo(
    cliente, usuario, instrumento, zona
):
    assert (await cliente.get("/catalogo/completo")).status_code == 401

    respuesta = await cliente.get("/catalogo/completo", headers=cabeceras(usuario))

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert set(cuerpo) == {
        "especialidades",
        "zonas",
        "categorias",
        "instrumental",
        "suturas",
        "equipos",
        "dispositivos",
        "tecnicas",
    }
    assert [i["nombre"] for i in cuerpo["instrumental"]] == ["Pinza de prueba"]
    assert [z["nombre"] for z in cuerpo["zonas"]] == ["Mesa de prueba"]
    assert respuesta.headers["cache-control"] == "private, max-age=300"
    assert respuesta.headers["etag"]


@pytest.mark.anyio
async def test_un_colaborador_no_crea_instrumental(cliente, colaborador, instrumento):
    respuesta = await cliente.post(
        "/instrumental",
        json={"nombre": "Nuevo", "categoria_id": str(instrumento.categoria_id)},
        headers=cabeceras(colaborador),
    )

    assert respuesta.status_code == 403


@pytest.mark.anyio
async def test_un_revisor_crea_y_edita_instrumental(cliente, revisor, instrumento):
    creado = await cliente.post(
        "/instrumental",
        json={"nombre": "Tijera nueva", "categoria_id": str(instrumento.categoria_id)},
        headers=cabeceras(revisor),
    )
    editado = await cliente.patch(
        f"/instrumental/{creado.json()['id']}",
        json={"descripcion": "Corta tejido"},
        headers=cabeceras(revisor),
    )

    assert creado.status_code == 201
    assert editado.status_code == 200
    assert editado.json() == {
        "id": creado.json()["id"],
        "nombre": "Tijera nueva",
        "categoria": "Categoría de prueba",
        "descripcion": "Corta tejido",
        "alias": [],
    }


@pytest.mark.anyio
async def test_no_se_repite_el_nombre_de_un_instrumento(cliente, revisor, instrumento):
    respuesta = await cliente.post(
        "/instrumental",
        json={
            "nombre": "Pinza de prueba",
            "categoria_id": str(instrumento.categoria_id),
        },
        headers=cabeceras(revisor),
    )

    assert respuesta.status_code == 409
