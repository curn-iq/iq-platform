import csv
from uuid import uuid4

import pytest

from app.adapters.inbound.cli.load_classes import (
    DEFAULT_FILE,
    MappingError,
    read_rows,
    resolve,
)

INSTRUMENTS = [
    {"id": str(uuid4()), "name": "Pinza Kelly", "aliases": []},
    {"id": str(uuid4()), "name": "Pinza de Moynihan", "aliases": ["Pinza Moninjan"]},
]


def test_a_name_or_alias_without_accents_or_capitals_finds_its_instrument():
    entries = resolve(["pinza moninjan", "PINZA KELLY"], INSTRUMENTS)

    # La clase queda con el nombre del instrumento en DataIQ, no con el alias.
    assert [e.label for e in entries] == ["Pinza de Moynihan", "Pinza Kelly"]
    assert str(entries[1].instrument_id) == INSTRUMENTS[0]["id"]


def test_it_names_every_instrument_that_is_not_in_dataiq():
    with pytest.raises(MappingError) as error:
        resolve(["Pinza Kelly", "Pinza Fantasma", "Otra"], INSTRUMENTS)

    assert "Pinza Fantasma; Otra" in str(error.value)


def test_two_classes_for_the_same_instrument_are_rejected():
    with pytest.raises(MappingError, match="repetidos"):
        resolve(["Pinza Moninjan", "Pinza de Moynihan"], INSTRUMENTS)


def test_the_classes_file_has_the_19_instruments_of_the_five_tables_once():
    names = read_rows(DEFAULT_FILE)

    assert len(names) == 19 == len(set(names))
    # Las hojas de bisturí van montadas en su mango: no son clase.
    assert not any(n.startswith("Hoja de bisturí") for n in names)
    with DEFAULT_FILE.open(encoding="utf-8", newline="") as f:
        indices = [int(r["indice"]) for r in csv.DictReader(f)]
    assert indices == list(range(19))
