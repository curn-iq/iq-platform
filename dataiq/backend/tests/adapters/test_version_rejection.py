import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.adapters.outbound.persistence.models.techniques import (
    Technique,
    TechniqueVersion,
    VersionRejection,
)
from app.domain.techniques import VersionState


async def save_version_in_review(session, specialty, author) -> TechniqueVersion:
    technique = Technique(
        name="Técnica", specialty_id=specialty.id, created_by=author.id
    )
    session.add(technique)
    await session.flush()
    version = TechniqueVersion(
        technique_id=technique.id,
        number=1,
        state=VersionState.in_review,
        created_by=author.id,
    )
    session.add(version)
    await session.flush()
    return version


@pytest.mark.anyio
async def test_version_keeps_several_rejections(session, author, reviewer, specialty):
    version = await save_version_in_review(session, specialty, author)
    session.add_all(
        [
            VersionRejection(
                version_id=version.id, rejected_by=reviewer.id, reason="Falta X"
            ),
            VersionRejection(
                version_id=version.id, rejected_by=reviewer.id, reason="Falta Y"
            ),
        ]
    )
    await session.flush()

    count_ = await session.scalar(
        select(func.count())
        .select_from(VersionRejection)
        .where(VersionRejection.version_id == version.id)
    )
    assert count_ == 2


@pytest.mark.anyio
@pytest.mark.parametrize("reason", ["", "   "])
async def test_rejection_without_reason_is_not_saved(
    session, author, reviewer, specialty, reason
):
    version = await save_version_in_review(session, specialty, author)
    session.add(
        VersionRejection(version_id=version.id, rejected_by=reviewer.id, reason=reason)
    )

    with pytest.raises(IntegrityError, match="reason_not_empty"):
        await session.flush()
