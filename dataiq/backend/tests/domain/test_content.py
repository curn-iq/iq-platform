import uuid

import pytest

from app.domain.errors import InvalidContent
from app.domain.techniques import (
    Cell,
    NewComponent,
    NewItem,
    NewSuture,
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


def content(items=(), sutures=(), equipment=(), devices=()):
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
