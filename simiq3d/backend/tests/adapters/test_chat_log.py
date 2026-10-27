import csv

import pytest

from app.adapters.inbound.cli.chat_log import write_csv
from app.adapters.outbound.persistence.repositories.chat_log import (
    SQLAlchemyChatLogRepository,
)
from app.domain.chat import ChatAction, ClinicalField
from app.domain.chat_log import ChatLogEntry
from tests.sample import COLECISTECTOMIA


def entry(question: str, **fields) -> ChatLogEntry:
    return ChatLogEntry(
        **{
            "question": question,
            "open_technique_id": None,
            "action": ChatAction.no_answer,
            "technique_id": None,
            "instrument_id": None,
            "field": None,
            "language_model": "qwen2.5:7b",
            "latency_ms": 840,
        }
        | fields
    )


@pytest.mark.anyio
async def test_the_log_keeps_the_order_and_is_deleted_completely(session):
    log = SQLAlchemyChatLogRepository(session)
    await log.add(entry("primera"))
    await log.add(
        entry(
            "segunda",
            action=ChatAction.show_clinical_data,
            technique_id=COLECISTECTOMIA.id,
            field=ClinicalField.indications,
        )
    )

    assert [e.question for e in await log.list_all()] == ["primera", "segunda"]
    assert await log.delete_all() == 2
    assert await log.list_all() == []


def test_the_export_is_a_csv_with_one_row_per_question(tmp_path):
    path = tmp_path / "registro.csv"

    write_csv(
        [entry("¿Dónde va la Kelly?", action=ChatAction.highlight_instrument)], path
    )

    [row] = list(csv.DictReader(path.open(encoding="utf-8")))
    assert row["question"] == "¿Dónde va la Kelly?"
    assert row["action"] == "highlight_instrument"
    assert row["technique_id"] == ""
    assert row["latency_ms"] == "840"
