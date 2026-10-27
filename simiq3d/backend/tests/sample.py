"""Un catálogo de muestra con la forma del de DataIQ: tres técnicas de Cirugía
General y una de otra especialidad (fuera del MVP)."""

from uuid import UUID

from app.domain.catalog import MAYO, Catalog, Cell, Instrument, TableItem, Technique


def uid(n: int) -> UUID:
    return UUID(f"0199e0d4-0000-7000-8000-{n:012d}")


ALLIS = Instrument(uid(1), "Pinza de Allis", ("Allis", "Pinzas allis"), None)
KELLY = Instrument(uid(2), "Pinza Kelly", ("Pinzas Kelly", "Pinza de Kelly"), None)
KELLY_ADSON = Instrument(uid(3), "Pinza Kelly Adson", (), None)
MAYO_SCISSORS = Instrument(
    uid(4), "Tijera de Mayo", (), "Tijera recta para cortar tejidos."
)
FARABEUF = Instrument(uid(5), "Separador de Farabeuf", (), None)
LAHEY = Instrument(uid(6), "Pinza Lahey", (), None)
KOCHER = Instrument(uid(7), "Pinza Kocher", (), None)


def item(n: int, instrument: Instrument, row: int, column: int) -> TableItem:
    return TableItem(
        MAYO,
        n,
        instrument.name,
        instrument.name,
        (instrument.id,),
        (Cell(row, column),),
    )


COLECISTECTOMIA = Technique(
    uid(101),
    "Colecistectomía",
    "Cirugía General",
    description="Extirpación quirúrgica de la vesícula biliar.",
    indications="Colelitiasis sintomática.",
    complications=None,
    anesthesia="General",
    patient_position="Decúbito supino",
    items=(
        item(5, ALLIS, 1, 1),
        item(10, KELLY, 3, 4),
        item(4, MAYO_SCISSORS, 4, 3),
        item(7, FARABEUF, 4, 2),
    ),
    mayo_size=(7, 6),
)
MASTECTOMIA = Technique(
    uid(102),
    "Mastectomía",
    "Cirugía General",
    description=None,
    indications=None,
    complications=None,
    anesthesia=None,
    patient_position=None,
    items=(item(1, ALLIS, 1, 3), item(9, KELLY, 3, 4)),
    mayo_size=(6, 4),
)
TIROIDECTOMIA = Technique(
    uid(103),
    "Tiroidectomía",
    "Cirugía General",
    description=None,
    indications=None,
    complications=None,
    anesthesia=None,
    patient_position=None,
    items=(item(8, LAHEY, 1, 6), item(10, KELLY_ADSON, 2, 5)),
    mayo_size=(7, 7),
)
CESAREA = Technique(
    uid(104),
    "Cesárea",
    "Ginecología",
    description="Fuera del MVP.",
    indications=None,
    complications=None,
    anesthesia=None,
    patient_position=None,
    items=(item(1, KOCHER, 1, 1),),
    mayo_size=(1, 1),
)

CATALOG = Catalog(
    techniques=(COLECISTECTOMIA, MASTECTOMIA, TIROIDECTOMIA, CESAREA),
    instruments=(ALLIS, KELLY, KELLY_ADSON, MAYO_SCISSORS, FARABEUF, LAHEY, KOCHER),
)
