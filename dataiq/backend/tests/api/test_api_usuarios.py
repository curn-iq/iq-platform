import pytest

from tests.conftest import cabeceras


@pytest.mark.anyio
async def test_un_admin_cambia_el_rol_de_otra_cuenta(cliente, admin, usuario):
    respuesta = await cliente.patch(
        f"/usuarios/{usuario.id}/rol",
        json={"rol": "colaborador"},
        headers=cabeceras(admin),
    )
    lista = await cliente.get("/usuarios", headers=cabeceras(admin))

    assert respuesta.status_code == 200
    assert respuesta.json()["rol"] == "colaborador"
    roles = {c["email"]: c["rol"] for c in lista.json()}
    assert roles["usuaria@prueba.com"] == "colaborador"


@pytest.mark.anyio
async def test_el_rol_nuevo_vale_desde_la_siguiente_peticion(cliente, admin, usuario):
    # El token de la usuaria dice "usuario", pero el rol se lee de la BD.
    token_viejo = cabeceras(usuario)
    await cliente.patch(
        f"/usuarios/{usuario.id}/rol",
        json={"rol": "colaborador"},
        headers=cabeceras(admin),
    )

    respuesta = await cliente.get("/auth/yo", headers=token_viejo)

    assert respuesta.json()["rol"] == "colaborador"


@pytest.mark.anyio
async def test_un_admin_no_cambia_su_propio_rol(cliente, admin):
    respuesta = await cliente.patch(
        f"/usuarios/{admin.id}/rol", json={"rol": "usuario"}, headers=cabeceras(admin)
    )

    assert respuesta.status_code == 409


@pytest.mark.anyio
async def test_solo_un_admin_gestiona_roles(cliente, revisor, usuario):
    lista = await cliente.get("/usuarios", headers=cabeceras(revisor))
    cambio = await cliente.patch(
        f"/usuarios/{usuario.id}/rol",
        json={"rol": "revisor"},
        headers=cabeceras(revisor),
    )

    assert lista.status_code == 403
    assert cambio.status_code == 403
