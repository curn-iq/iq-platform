from types import SimpleNamespace
from uuid import uuid4

from seed.load import SeedItem, SeedTechnique
from seed.update_mayo import (
    MAYO,
    published_positions,
    same_positions,
    wanted_positions,
)

KELLY, FARABEUF = uuid4(), uuid4()
ZONE = uuid4()
IDS = {"Pinza Kelly": KELLY, "Separador de Farabeuf": FARABEUF}


def _seed(*items: SeedItem) -> SeedTechnique:
    return SeedTechnique(
        name="Prueba", specialty="Cirugía General", data={}, items=list(items)
    )


def _published(*components) -> SimpleNamespace:
    """Un detalle publicado mínimo: solo lo que leen las funciones."""
    return SimpleNamespace(
        items=[
            SimpleNamespace(zone_id=ZONE, legend_number=n, components=[c])
            for n, c in components
        ]
    )


def _component(instrument_id, x=None, z=None, yaw=None, more=None) -> SimpleNamespace:
    return SimpleNamespace(
        instrument_id=instrument_id,
        position_x_m=x,
        position_z_m=z,
        yaw_deg=yaw,
        additional_placements=more,
    )


def test_the_excel_positions_go_by_item_number_and_instrument():
    seed = _seed(
        SeedItem(
            MAYO,
            4,
            "",
            ["Separador de Farabeuf"],
            [(3, 2)],
            {"Separador de Farabeuf": [(0.1, -0.2, 90.0), (0.12, -0.2, -90.0)]},
        ),
        SeedItem(MAYO, 6, "", ["Pinza Kelly"], [(1, 1)]),
        SeedItem(
            "Mesa auxiliar",
            1,
            "",
            ["Pinza Kelly"],
            [(1, 1)],
            {"Pinza Kelly": [(0, 0, 0)]},
        ),
    )

    wanted = wanted_positions(seed, IDS)

    assert wanted == {
        (4, FARABEUF): (
            0.1,
            -0.2,
            90.0,
            [{"position_x_m": 0.12, "position_z_m": -0.2, "yaw_deg": -90.0}],
        )
    }


def test_a_table_published_without_positions_needs_a_new_version():
    seed = _seed(
        SeedItem(
            MAYO, 6, "", ["Pinza Kelly"], [(1, 1)], {"Pinza Kelly": [(0.05, 0.1, 0.0)]}
        )
    )
    published = _published((6, _component(KELLY)))

    assert not same_positions(
        wanted_positions(seed, IDS), published_positions(published, ZONE)
    )


def test_the_same_positions_with_database_rounding_need_nothing():
    seed = _seed(
        SeedItem(
            MAYO, 6, "", ["Pinza Kelly"], [(1, 1)], {"Pinza Kelly": [(0.05, 0.1, 0.0)]}
        )
    )
    published = _published((6, _component(KELLY, 0.0500000001, 0.1, 0.0)))

    assert same_positions(
        wanted_positions(seed, IDS), published_positions(published, ZONE)
    )
