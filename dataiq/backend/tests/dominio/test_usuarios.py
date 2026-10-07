import pytest

from app.dominio.errores import SinPermiso
from app.dominio.usuarios import RolUsuario, exigir_rol, tiene_al_menos


def test_los_roles_son_acumulativos():
    assert tiene_al_menos(RolUsuario.admin, RolUsuario.colaborador)
    assert tiene_al_menos(RolUsuario.revisor, RolUsuario.revisor)
    assert not tiene_al_menos(RolUsuario.colaborador, RolUsuario.revisor)
    assert not tiene_al_menos(RolUsuario.usuario, RolUsuario.colaborador)


def test_exigir_rol_falla_si_el_rol_no_alcanza():
    with pytest.raises(SinPermiso):
        exigir_rol(RolUsuario.usuario, RolUsuario.colaborador)
