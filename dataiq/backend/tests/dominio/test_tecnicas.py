import pytest

from app.dominio.tecnicas import (
    EstadoVersion,
    PublicacionNoPermitida,
    TransicionNoPermitida,
    validar_publicacion,
    validar_transicion,
)
from app.dominio.usuarios import RolUsuario


@pytest.mark.parametrize(
    ("actual", "nuevo"),
    [
        (EstadoVersion.borrador, EstadoVersion.en_revision),
        (EstadoVersion.borrador, EstadoVersion.publicada),
        (EstadoVersion.en_revision, EstadoVersion.borrador),
        (EstadoVersion.en_revision, EstadoVersion.publicada),
        (EstadoVersion.publicada, EstadoVersion.reemplazada),
        (EstadoVersion.publicada, EstadoVersion.archivada),
    ],
)
def test_transiciones_permitidas(actual, nuevo):
    validar_transicion(actual, nuevo)


@pytest.mark.parametrize(
    ("actual", "nuevo"),
    [
        (EstadoVersion.publicada, EstadoVersion.borrador),
        (EstadoVersion.archivada, EstadoVersion.publicada),
        (EstadoVersion.reemplazada, EstadoVersion.publicada),
        (EstadoVersion.borrador, EstadoVersion.borrador),
    ],
)
def test_transiciones_prohibidas(actual, nuevo):
    with pytest.raises(TransicionNoPermitida):
        validar_transicion(actual, nuevo)


@pytest.mark.parametrize("rol", [RolUsuario.revisor, RolUsuario.admin])
def test_revisor_y_admin_pueden_publicar(rol):
    validar_publicacion(rol)


@pytest.mark.parametrize("rol", [RolUsuario.usuario, RolUsuario.colaborador])
def test_usuario_y_colaborador_no_pueden_publicar(rol):
    with pytest.raises(PublicacionNoPermitida):
        validar_publicacion(rol)
