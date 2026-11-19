from uuid import uuid4

import pytest

from app.adapters.outbound.persistence.repositories.classes import (
    SQLAlchemyClassRepository,
)
from app.domain.classes import ClassEntry


@pytest.mark.anyio
async def test_replace_all_leaves_the_table_equal_to_the_list(session):
    repo = SQLAlchemyClassRepository(session)
    kelly, allis, mayo = (ClassEntry(n, uuid4()) for n in ("Kelly", "Allis", "Mayo"))

    await repo.replace_all([kelly, allis])
    await repo.replace_all([allis, mayo])

    assert await repo.list_all() == sorted([allis, mayo], key=lambda e: e.label)


@pytest.mark.anyio
async def test_an_empty_table_gives_an_empty_list(session):
    assert await SQLAlchemyClassRepository(session).list_all() == []
