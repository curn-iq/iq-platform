import uuid

import pytest

from app.dominio.errores import ContenidoInvalido
from app.dominio.tecnicas import (
    Celda,
    ComponenteNuevo,
    ContenidoVersion,
    ItemNuevo,
    SuturaNueva,
    validar_contenido,
)

MESA = uuid.uuid7()
PINZA = ComponenteNuevo(instrumental_id=uuid.uuid7(), sutura_id=None)


def item(texto="Pinza", zona=MESA, numero=None, celdas=(), componentes=(PINZA,)):
    return ItemNuevo(
        zona_id=zona,
        numero_leyenda=numero,
        texto_fuente=texto,
        componentes=componentes,
        celdas=tuple(Celda(f, c) for f, c in celdas),
    )


def contenido(items=(), suturas=(), equipos=(), dispositivos=()):
    return ContenidoVersion(
        codigo_cups=None,
        anestesia=None,
        posicion_paciente=None,
        ropa=None,
        descripcion=None,
        indicaciones=None,
        complicaciones=None,
        tecnica_quirurgica=None,
        fuente=None,
        items=tuple(items),
        suturas=tuple(suturas),
        equipos=tuple(equipos),
        dispositivos=tuple(dispositivos),
    )


def problemas(c: ContenidoVersion) -> list[str]:
    with pytest.raises(ContenidoInvalido) as error:
        validar_contenido(c)
    return error.value.problemas


def test_un_contenido_correcto_pasa():
    validar_contenido(
        contenido(
            items=[
                item("Pinza", numero=1, celdas=[(1, 1), (1, 2)]),
                item("Tijera", numero=2, celdas=[(2, 1)]),
                item("Solo del listado", zona=None),
            ],
            suturas=[SuturaNueva("Seda", "3/0", None, "Piel")],
            equipos=["Electrobisturí"],
        )
    )


def test_un_numero_o_una_celda_sin_mesa_no_pasa():
    assert problemas(contenido([item(zona=None, numero=1, celdas=[(1, 1)])])) == [
        "«Pinza» tiene número pero no tiene mesa",
        "«Pinza» tiene celdas pero no tiene mesa",
    ]


def test_dos_objetos_no_reclaman_el_mismo_numero_ni_la_misma_celda():
    assert problemas(
        contenido([item(numero=1, celdas=[(1, 1)]), item(numero=1, celdas=[(1, 1)])])
    ) == [
        "El número 1 está repetido en la misma mesa",
        "La celda (1, 1) tiene más de un objeto",
    ]


def test_el_mismo_numero_en_mesas_distintas_si_pasa():
    otra_mesa = uuid.uuid7()
    validar_contenido(
        contenido([item(numero=1, celdas=[(1, 1)]), item(zona=otra_mesa, numero=1)])
    )


def test_un_componente_es_instrumento_o_sutura_nunca_ambos():
    ambos = ComponenteNuevo(instrumental_id=uuid.uuid7(), sutura_id=uuid.uuid7())
    assert problemas(contenido([item(componentes=(ambos,))])) == [
        "Cada componente de «Pinza» es un instrumento o una sutura"
    ]


def test_suturas_equipos_y_dispositivos_no_se_repiten():
    seda = SuturaNueva("Seda", "3/0", None, "Piel")
    assert problemas(
        contenido(suturas=[seda, seda], equipos=["A", "A"], dispositivos=["B", "B"])
    ) == [
        "Hay una sutura repetida (junta sus usos en una sola)",
        "Hay un equipo repetido",
        "Hay un dispositivo repetido",
    ]
