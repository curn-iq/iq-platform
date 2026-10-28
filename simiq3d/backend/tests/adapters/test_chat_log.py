import csv
from datetime import UTC, datetime

import pytest

from app.adapters.inbound.cli.chat_log import COLOMBIA, parse_moment, write_csv
from app.adapters.outbound.persistence.models.chat import ChatLog
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


@pytest.mark.anyio
async def test_the_questions_of_one_session_are_exported_by_date(session):
    for question, hour in (("antes", 13), ("durante", 15), ("después", 18)):
        session.add(
            ChatLog(
                question=question,
                action=ChatAction.no_answer,
                language_model="plantillas",
                latency_ms=10,
                created_at=datetime(2026, 11, 2, hour, tzinfo=COLOMBIA),
            )
        )
    await session.flush()
    log = SQLAlchemyChatLogRepository(session)

    [entry_] = await log.list_all(
        parse_moment("2026-11-02T14:30"), parse_moment("2026-11-02T17:00", end=True)
    )
    whole_day = await log.list_all(
        parse_moment("2026-11-02"), parse_moment("2026-11-02", end=True)
    )

    assert entry_.question == "durante"
    assert entry_.created_at == datetime(2026, 11, 2, 20, tzinfo=UTC)
    assert [e.question for e in whole_day] == ["antes", "durante", "después"]


def test_the_export_has_the_colombian_date_and_time(tmp_path):
    path = tmp_path / "registro.csv"

    write_csv(
        [entry("Hola", created_at=datetime(2026, 11, 2, 20, 0, 5, tzinfo=UTC))], path
    )

    [row] = list(csv.DictReader(path.open(encoding="utf-8")))
    assert row["created_at"] == "2026-11-02T15:00:05-05:00"
