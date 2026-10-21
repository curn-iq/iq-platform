from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.adapters.outbound.persistence.models.chat import ChatLog
from app.adapters.outbound.persistence.models.mappings import ModelMapping
from app.domain.chat import ChatAction, ClinicalField


def chat_log(**fields) -> ChatLog:
    return ChatLog(
        **{
            "question": "¿Dónde va la Kelly?",
            "action": ChatAction.highlight_instrument,
            "instrument_id": uuid4(),
            "language_model": "fake",
            "latency_ms": 120,
        }
        | fields
    )


@pytest.mark.anyio
async def test_a_chat_log_gets_its_id_and_date_from_the_database(session):
    session.add(chat_log())
    await session.flush()

    saved = await session.scalar(select(ChatLog))

    assert saved.id.version == 7
    assert saved.created_at.tzinfo is not None


@pytest.mark.anyio
@pytest.mark.parametrize(
    "fields",
    [
        {"latency_ms": -1},
        # El campo clínico va solo con show_clinical_data, y ahí es obligatorio.
        {"field": ClinicalField.indications},
        {"action": ChatAction.show_clinical_data},
    ],
    ids=["demora-negativa", "campo-sin-dato-clinico", "dato-clinico-sin-campo"],
)
async def test_the_database_rejects_inconsistent_logs(session, fields):
    session.add(chat_log(**fields))

    with pytest.raises(IntegrityError):
        await session.flush()


@pytest.mark.anyio
async def test_clinical_data_logs_carry_their_field(session):
    session.add(
        chat_log(
            action=ChatAction.show_clinical_data,
            field=ClinicalField.complications,
            instrument_id=None,
            technique_id=uuid4(),
        )
    )

    await session.flush()


@pytest.mark.anyio
async def test_an_instrument_has_a_single_3d_model(session):
    instrument_id = uuid4()
    session.add(ModelMapping(instrument_id=instrument_id, model_file="kelly.glb"))
    await session.flush()

    session.add(ModelMapping(instrument_id=instrument_id, model_file="otra.glb"))

    with pytest.raises(IntegrityError):
        await session.flush()
