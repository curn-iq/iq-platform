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
