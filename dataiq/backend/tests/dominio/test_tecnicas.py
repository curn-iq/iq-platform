import uuid

import pytest

from app.dominio.tecnicas import (
    AutoAprobacionNoPermitida,
    EstadoVersion,
    TransicionNoPermitida,
    validar_aprobacion,
    validar_transicion,
)


@pytest.mark.parametrize(
    ("actual", "nuevo"),
    [
        (EstadoVersion.borrador, EstadoVersion.en_revision),
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
        (EstadoVersion.borrador, EstadoVersion.publicada),
        (EstadoVersion.publicada, EstadoVersion.borrador),
        (EstadoVersion.archivada, EstadoVersion.publicada),
        (EstadoVersion.reemplazada, EstadoVersion.publicada),
        (EstadoVersion.borrador, EstadoVersion.borrador),
    ],
)
def test_transiciones_prohibidas(actual, nuevo):
    with pytest.raises(TransicionNoPermitida):
        validar_transicion(actual, nuevo)


def test_no_se_puede_autoaprobar():
    ana = uuid.uuid7()
    with pytest.raises(AutoAprobacionNoPermitida):
        validar_aprobacion(creado_por=ana, revisor=ana)


def test_otro_usuario_puede_aprobar():
    ana = uuid.uuid7()
    daniel = uuid.uuid7()
    validar_aprobacion(creado_por=ana, revisor=daniel)
