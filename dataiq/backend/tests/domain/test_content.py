import uuid

import pytest

from app.domain.errors import InvalidContent
from app.domain.techniques import (
    Cell,
    NewComponent,
    NewItem,
    NewSuture,
    NewZoneLayout,
    VersionContent,
    validate_content,
)

STAND = uuid.uuid7()
FORCEPS = NewComponent(instrument_id=uuid.uuid7(), suture_id=None)


def item(source_text="Pinza", zone=STAND, number=None, cells=(), components=(FORCEPS,)):
    return NewItem(
        zone_id=zone,
        legend_number=number,
        source_text=source_text,
        components=components,
        cells=tuple(Cell(f, c) for f, c in cells),
    )


def layout(zone=STAND, used=True, rows=8, columns=8):
    return NewZoneLayout(zone_id=zone, used=used, rows=rows, columns=columns)


def content(items=(), sutures=(), equipment=(), devices=(), zones=None):
    if zones is None:
        # Por defecto, cada mesa que usan los objetos se lleva y es de 8 x 8
        zones = [layout(z) for z in dict.fromkeys(i.zone_id for i in items) if z]
    return VersionContent(
        cups_code=None,
        anesthesia=None,
        patient_position=None,
        drapes=None,
        description=None,
        indications=None,
        complications=None,
        surgical_technique=None,
        source=None,
        zones=tuple(zones),
        items=tuple(items),
        sutures=tuple(sutures),
        equipment=tuple(equipment),
        devices=tuple(devices),
    )


def problems(c: VersionContent) -> list[str]:
    with pytest.raises(InvalidContent) as error:
        validate_content(c)
    return error.value.problems


def test_valid_content_passes():
    validate_content(
        content(
            items=[
                item("Pinza", number=1, cells=[(1, 1), (1, 2)]),
                item("Tijera", number=2, cells=[(2, 1)]),
                item("Solo del listado", zone=None),
            ],
            sutures=[NewSuture("Seda", "3/0", None, "Piel")],
            equipment=["Electrobisturí"],
        )
    )


def test_number_or_cell_without_stand_fails():
    assert problems(content([item(zone=None, number=1, cells=[(1, 1)])])) == [
        "«Pinza» tiene número pero no tiene mesa",
        "«Pinza» tiene celdas pero no tiene mesa",
    ]


def test_two_items_cannot_claim_the_same_number_or_cell():
    assert problems(
        content([item(number=1, cells=[(1, 1)]), item(number=1, cells=[(1, 1)])])
    ) == [
        "El número 1 está repetido en la misma mesa",
        "La celda (1, 1) tiene más de un objeto",
    ]


def test_same_number_on_different_stands_is_valid():
    other_stand = uuid.uuid7()
    validate_content(
        content([item(number=1, cells=[(1, 1)]), item(zone=other_stand, number=1)])
    )


def test_component_is_instrument_or_suture_never_both():
    both = NewComponent(instrument_id=uuid.uuid7(), suture_id=uuid.uuid7())
    assert problems(content([item(components=(both,))])) == [
        "Cada componente de «Pinza» es un instrumento o una sutura"
    ]


def test_sutures_equipment_and_devices_do_not_repeat():
    silk = NewSuture("Seda", "3/0", None, "Piel")
    assert problems(
        content(sutures=[silk, silk], equipment=["A", "A"], devices=["B", "B"])
    ) == [
        "Hay una sutura repetida (junta sus usos en una sola)",
        "Hay un equipo repetido",
        "Hay un dispositivo repetido",
    ]


def test_stand_needs_size_only_when_used():
    assert problems(
        content(
            zones=[
                layout(rows=None),
                layout(uuid.uuid7(), used=False, rows=3, columns=3),
            ]
        )
    ) == [
        "Una mesa que se lleva necesita filas y columnas",
        "Una mesa que no se lleva no tiene tamaño",
    ]


def test_stand_cannot_appear_twice():
    assert problems(content(zones=[layout(), layout()])) == [
        "Una mesa aparece dos veces"
    ]


def test_item_must_be_on_a_stand_the_version_uses():
    unused = layout(used=False, rows=None, columns=None)
    assert problems(content([item(number=1)], zones=[unused])) == [
        "«Pinza» está en una mesa que la versión no lleva"
    ]
    assert problems(content([item(number=1)], zones=[])) == [
        "«Pinza» está en una mesa que la versión no lleva"
    ]


def test_cell_beyond_the_stand_size_fails():
    small = layout(rows=2, columns=3)
    validate_content(content([item(cells=[(2, 3)])], zones=[small]))
    assert problems(content([item(cells=[(3, 1)])], zones=[small])) == [
        "«Pinza» tiene una celda fuera de la mesa"
    ]
